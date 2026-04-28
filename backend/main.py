from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from datetime import datetime
import os
import requests
import json
from github import Github
from tools.github_tool import get_repo_files, get_file_content, get_repo_file_bytes
from schemas import ConsolidatedReport
from utils import consolidate_results
from services.llm_service import analizar_con_ia_externa, analizar_proyecto_completo, analizar_reglas_negocio, LLMTimeoutError, LLMServiceError
from services.document_parser import extraer_texto_por_extension, DocumentParserError
from workspace_manager import VirtualWorkspace
from sandbox import sandbox_check, SandboxViolation
from fastapi import Query
from fastapi import Request
from fastapi.responses import RedirectResponse

# 1. Cargamos el archivo .env a la memoria del sistema
load_dotenv()

# 2. Extraemos las variables de forma segura
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")

# 3. Pequeño seguro de vida por si alguien olvida crear el .env en producción
if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
    raise RuntimeError("🚨 ERROR FATAL: Faltan las credenciales de GitHub en el archivo .env")

# UNA SOLA INICIALIZACIÓN DE LA APP
app = FastAPI(title="Code Auditor API", version="5.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instanciamos nuestra memoria global
workspace = VirtualWorkspace()

URLS_IA = {
    "security": os.getenv("IA_SECURITY_URL", "https://linterlogicai.azurewebsites.net/api/security"),
    "business_rules": os.getenv("IA_RULES_URL", "https://linterlogicai.azurewebsites.net/api/analyze"),
    "software_logic": os.getenv("IA_LOGIC_URL", "https://linterlogicai.azurewebsites.net/api/logic"),
    "best_practices": os.getenv("IA_PRACTICES_URL", "https://linterlogicai.azurewebsites.net/api/clean-code")
}

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


class RepoRequest(BaseModel):
    repo_url: str
    selected_files: list[str] = Field(default_factory=list)
    selected_files_by_category: dict = Field(default_factory=dict)
    llm_mode: str = "success"


# 🧠 NUEVOS MODELOS CORREGIDOS (A prueba de balas)
class ApprovedFinding(BaseModel):
    file_path: str
    original_code: str | None = None
    secure_code: str | None = None


class ApplyPatchesRequest(BaseModel):
    session_id: str
    approved_findings: list[ApprovedFinding]
    repo_name: str = None       # 🚀 NUEVO: El repo que seleccionó el usuario
    github_token: str = None    # 🚀 NUEVO: La llave OAuth dinámica


class StepAnalyzeRequest(BaseModel):
    session_id: str
    file_paths: list[str]
    categoria: str
    repo_url: str = None


@app.get("/")
def root():
    return {"message": "Code Auditor API is running ✅"}


@app.post("/files")
def get_files(request: RepoRequest):
    try:
        files = get_repo_files(request.repo_url)
        return {
            "repo_url": request.repo_url,
            "total": len(files),
            "files": files
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/analyze", response_model=ConsolidatedReport)
def analyze(request: RepoRequest):
    if not request.selected_files:
        raise HTTPException(status_code=400, detail="Selecciona archivos.")

    session_id = workspace.create_session()
    skipped_files = []
    bundle_completo = {}

    try:
        # 1. DESCARGA Y VERIFICACIÓN (Llenamos la RAM y preparamos los textos)
        for file_path in request.selected_files:
            try:
                extension = os.path.splitext(file_path)[1].lower()

                # Documentos de Arquitectura
                if extension in [".txt", ".pdf", ".docx"]:
                    file_data = get_repo_file_bytes(request.repo_url, file_path)
                    texto_extraido = extraer_texto_por_extension(file_data["content_bytes"], extension)
                    workspace.add_file(session_id, file_path, texto_extraido)
                    bundle_completo[file_path] = texto_extraido
                
                # Código Fuente (Pasa por el Sandbox)
                else:
                    file_data = get_file_content(request.repo_url, file_path)
                    contenido_seguro = sandbox_check(file_path, file_data["content"])
                    workspace.add_file(session_id, file_path, contenido_seguro)
                    bundle_completo[file_path] = contenido_seguro

            except (DocumentParserError, SandboxViolation, ValueError) as e:
                skipped_files.append({"file_path": file_path, "reason": str(e)})
            except Exception as e:
                skipped_files.append({"file_path": file_path, "reason": str(e)})

        # 2. 🧠 ENRUTADOR INTELIGENTE POR LOTES (Batch Router)
        hallazgos_globales = []
        
        for categoria, archivos_marcados in request.selected_files_by_category.items():
            url_destino = URLS_IA.get(categoria)
            
            # Filtramos solo los archivos de ESTA categoría que sobrevivieron al Sandbox
            bundle_categoria = {
                fp: bundle_completo[fp] 
                for fp in archivos_marcados 
                if fp in bundle_completo
            }
            
            # Si hay archivos para esta categoría y la API de Jorge existe
            if bundle_categoria and url_destino:

             # CAMINO A: Reglas de Negocio (Necesita los PDFs)
             if categoria == "business_rules":
                 # Filtramos de la RAM solo los archivos que sean texto/documentos
                 docs_arquitectura = {k: v for k, v in bundle_completo.items() if k.lower().endswith(('.txt', '.pdf', '.docx'))}
                 texto_reglas = "\n\n".join(docs_arquitectura.values())
                 print(f"DEBUG REGLAS: Se enviarán {len(texto_reglas)} caracteres de reglas de arquitectura.")
                 hallazgos_cat = analizar_reglas_negocio(
                     session_id,
                     bundle_categoria,
                     texto_reglas,
                     url_destino
                 )

             # CAMINO B: Seguridad y los demás (Solo necesitan el código)
             else:
                 hallazgos_cat = analizar_proyecto_completo(
                     session_id,
                     bundle_categoria,
                     url_destino,
                     categoria
                 )

             hallazgos_globales.extend(hallazgos_cat)
             
            elif bundle_categoria and not url_destino:
                # 🚧 MOCK: Para las categorías que Jorge aún no termina
                for fp in bundle_categoria.keys():
                    hallazgos_globales.append({
                        "file_path": fp,
                        "type": categoria,
                        "severity": "info",
                        "title": f"Análisis de {categoria} Pendiente",
                        "description": "Modelo en desarrollo. Respuesta simulada.",
                        "recommendation": "Mock para mantener el flujo.",
                        "original_code": "",
                        "secure_code": "",
                        "line": 0
                    })

        # 3. EMPAQUETADO PARA TU FUNCIÓN 'consolidate_results'
        # Agrupamos los hallazgos por archivo para no romper tu lógica original
        ai_responses_dict = {fp: [] for fp in bundle_completo.keys()}
        for h in hallazgos_globales:
            fp = h.get("file_path", "Global/Multiple")
            if fp in ai_responses_dict:
                ai_responses_dict[fp].append(h)
            else:
                ai_responses_dict[fp] = [h]

        ai_responses = [
            {"analyzed": True, "file_path": fp, "findings": fnd} 
            for fp, fnd in ai_responses_dict.items()
        ]

        reporte_final = consolidate_results(
            ai_responses=ai_responses,
            total_files_requested=len(request.selected_files),
            skipped_files=skipped_files
        )

        reporte_final["session_id"] = session_id
        return reporte_final

    except Exception as e:
        print(f"🛑 ERROR CRÍTICO EN ANALYZE: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno: {str(e)}")

def normalizar_codigo(codigo: str) -> str:
    """Estandariza saltos de línea, espacios invisibles y elimina etiquetas de IA."""
    if not codigo: 
        return ""
        
    # 1. Adiós al bug de Windows vs Linux (forzamos todo a \n)
    codigo = codigo.replace("\r\n", "\n").replace("\r", "\n")
    
    lineas = codigo.split("\n")
    lineas_limpias = []
    
    for linea in lineas:
        evaluar = linea.strip().upper()
        
        # 2. Destruimos cualquier etiqueta sin importar si tiene espacios extra
        if evaluar.startswith("[INICIO_CODIGO") or \
           evaluar.startswith("[FIN_CODIGO") or \
           evaluar.startswith("```"):
            continue
            
        # 3. rstrip() borra espacios fantasmas al final, pero conserva la indentación inicial
        lineas_limpias.append(linea.rstrip())
        
    # Unimos todo en un bloque limpio
    return "\n".join(lineas_limpias).strip()

@app.post("/apply-patches")
def apply_patches(request: ApplyPatchesRequest):
    """
    1. Aplica los parches en el Virtual Workspace (RAM) limpiando la basura de la IA.
    2. Sube los cambios a una nueva rama en GitHub para disparar el PR automático.
    """
    print(f"🕵️‍♂️ EL SESSION_ID ACTUAL ES: {request.session_id}")
    
    if not request.approved_findings:
        return {"message": "No se recibieron parches para aplicar.", "archivos_actualizados": []}

    archivos_modificados = set()

    # ==========================================
    # FASE 1: ACTUALIZAR LA MEMORIA RAM (Nivel Arquitecto)
    # ==========================================
    try:
        for finding in request.approved_findings:
            if not finding.original_code or not finding.secure_code:
                continue

            try:
                codigo_actual = workspace.get_file(request.session_id, finding.file_path)
            except ValueError:
                print(f"⚠️ Archivo no encontrado en workspace: {finding.file_path}")
                continue

            # 🧼 1. Pasamos TODOS los actores por el Normalizador Universal
            ram_limpia = normalizar_codigo(codigo_actual)
            original_limpio = normalizar_codigo(finding.original_code)
            seguro_limpio = normalizar_codigo(finding.secure_code)

            # 🛡️ Protección contra falsos parches (A prueba de mayúsculas/minúsculas)
            if seguro_limpio.upper() == "# SIN CAMBIOS" or not seguro_limpio:
                print(f"⏩ Saltando {finding.file_path} porque no hay código de reemplazo real.")
                continue

            # 🔬 2. Reemplazo infalible
            if original_limpio in ram_limpia:
                # Reemplazamos sobre la RAM ya limpia, eliminando las etiquetas para siempre
                nuevo_codigo = ram_limpia.replace(original_limpio, seguro_limpio)
                workspace.add_file(request.session_id, finding.file_path, nuevo_codigo)
                archivos_modificados.add(finding.file_path)
                print(f"✅ Parche aplicado EXACTO en RAM: {finding.file_path}")
            else:
                print(f"⚠️ Fragmento no coincide en {finding.file_path}. Difiere la estructura del LLM.")

    except Exception as e:
        print(f"🛑 ERROR AL APLICAR PARCHES EN RAM: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al modificar el workspace: {str(e)}"
        )

    # ==========================================
    # FASE 2: SUBIR A GITHUB (Con Token Dinámico OAuth)
    # ==========================================
    if archivos_modificados:
        
        # 🛡️ Validación: Si no hay llave, avisamos pero no tronamos
        if not request.github_token or not request.repo_name:
            print("⚠️ Faltan credenciales OAuth. Los parches solo quedaron en la RAM.")
            return {
                "message": "Parches aplicados en RAM. Faltan permisos de GitHub para crear el Pull Request.",
                "archivos_actualizados": list(archivos_modificados)
            }

        try:
            print(f"🚀 Conectando a GitHub con el repo: {request.repo_name}...")
            
            # 🔑 MAGIA PURA: Usamos la llave dinámica, ¡adiós tokens quemados!
            g = Github(request.github_token) 
            repo = g.get_repo(request.repo_name)
            
            # Creamos la rama con el prefijo "sprint-"
            timestamp = datetime.now().strftime("%Y%m%d%H%M")
            nueva_rama = f"sprint-fixes-{timestamp}"
            
            commit_base = repo.get_branch("main").commit
            repo.create_git_ref(ref=f"refs/heads/{nueva_rama}", sha=commit_base.sha)
            
            for file_path in archivos_modificados:
                # Sacamos el código fresco de la RAM
                codigo_fresco = workspace.get_file(request.session_id, file_path)
                
                # Obtenemos el SHA del archivo original en main
                file_contents = repo.get_contents(file_path, ref="main")
                
                repo.update_file(
                    path=file_contents.path,
                    message=f"🤖 Fix de IA aplicado en {file_path}",
                    content=codigo_fresco,
                    sha=file_contents.sha,
                    branch=nueva_rama
                )
                
            print(f"🚀 ¡Archivos subidos a GitHub en la rama {nueva_rama}!")
            return {
                "message": f"¡Éxito! Parches aplicados y PR en camino desde {nueva_rama}.",
                "archivos_actualizados": list(archivos_modificados)
            }
            
        except Exception as e:
            print(f"🛑 ERROR AL SUBIR A GITHUB: {str(e)}")
            return {
                "message": "Parches aplicados en RAM, pero falló la conexión al repositorio en GitHub.",
                "archivos_actualizados": list(archivos_modificados)
            }

    return {
        "message": "No se aplicó ningún parche válido en esta ronda.",
        "archivos_actualizados": []
    }

@app.post("/upload-doc")
async def upload_doc(file: UploadFile = File(...)):
    try:
        allowed_extensions = [".pdf", ".txt", ".docx"]
        max_file_size_bytes = 5 * 1024 * 1024

        if not file.filename:
            raise HTTPException(status_code=400, detail="No se recibió ningún archivo válido.")

        original_filename = file.filename
        extension = os.path.splitext(original_filename)[1].lower()

        if extension not in allowed_extensions:
            raise HTTPException(status_code=400, detail="Tipo de archivo no permitido.")

        content = await file.read()

        if not content:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")

        if len(content) > max_file_size_bytes:
            raise HTTPException(status_code=400, detail="El archivo excede el tamaño máximo.")

        # Sprint 8: extraer texto del documento externo
        texto_extraido = extraer_texto_por_extension(content, extension)

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_filename = original_filename.replace(" ", "_")
        new_filename = f"{timestamp}_{safe_filename}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        return {
            "message": "Archivo subido correctamente",
            "filename": new_filename,
            "original_name": original_filename,
            "size_bytes": len(content),
            "content_type": file.content_type,
            "path": file_path,
            "extracted_text": texto_extraido
        }

    except DocumentParserError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al subir el archivo: {str(e)}")


@app.post("/analyze/step")
def analyze_step(request: StepAnalyzeRequest):
    """
    Analiza una lista de archivos para UNA SOLA categoría específica.
    Crea la sesión si no existe y descarga de GitHub si la RAM está vacía.
    """
    print(f"\n--- 🚀 INICIANDO ANÁLISIS DE CATEGORÍA: {request.categoria} ---")
    url_destino = URLS_IA.get(request.categoria)

    if url_destino is None:
        raise HTTPException(status_code=400, detail="Categoría no configurada.")

    # 1. SEGURIDAD DE SESIÓN: Si la sesión no existe en RAM, la creamos
    if request.session_id not in workspace.sessions:
        print(f"🆕 Registrando ID de sesión desconocido: {request.session_id}")
        workspace.sessions[request.session_id] = {}

    # 2. Mock si la URL está vacía
    if url_destino == "":
        hallazgos_mock = []
        for fp in request.file_paths:
            hallazgos_mock.append({
                "file_path": fp, "type": request.categoria, "severity": "info",
                "title": f"Análisis de {request.categoria} Pendiente",
                "description": "Modelo en desarrollo.", "recommendation": "Respuesta simulada.",
                "original_code": "", "secure_code": "", "line": 0
            })
        return {"session_id": request.session_id, "hallazgos": hallazgos_mock, "omitidos": []}

    # 3. FLUJO DE CARGA (RAM + GitHub)
    archivos_en_ram = {}
    archivos_omitidos = []

    for file_path in request.file_paths:
        try:
            # Intentamos sacar de la RAM
            codigo = workspace.get_file(request.session_id, file_path)
            if not codigo or str(codigo).strip() == "": raise ValueError("Vacío")
            archivos_en_ram[file_path] = codigo
        except ValueError:
            # Si no está o falló, descargamos de GitHub
            if request.repo_url:
                print(f"📥 Descargando {file_path} desde GitHub...")
                try:
                    file_data = get_file_content(request.repo_url, file_path)
                    codigo_fresco = sandbox_check(file_path, file_data["content"])
                    # Ahora add_file NO fallará porque aseguramos la sesión arriba
                    workspace.add_file(request.session_id, file_path, codigo_fresco)
                    archivos_en_ram[file_path] = codigo_fresco
                except Exception as e:
                    print(f"❌ Error descarga: {e}")
                    archivos_omitidos.append({"file_path": file_path, "reason": str(e)})
            else:
                archivos_omitidos.append({"file_path": file_path, "reason": "No hay URL de repo"})

    if not archivos_en_ram:
        return {"session_id": request.session_id, "hallazgos": [], "omitidos": archivos_omitidos}

    # 4. ENVÍO A AZURE
    payload = {"files": archivos_en_ram}
    print(f"📦 ENVIANDO LOTE A AZURE ({url_destino})...")
    
    try:
        respuesta = requests.post(url_destino, json=payload, timeout=90)
        respuesta.raise_for_status()
        datos_azure = respuesta.json()

        # EXTRACTOR UNIVERSAL
        hallazgos = []
        if isinstance(datos_azure, list): hallazgos = datos_azure
        elif isinstance(datos_azure, dict):
            for key in ["findings", "vulnerabilities", "issues"]:
                if key in datos_azure:
                    hallazgos = datos_azure[key]
                    break
            if not hallazgos: # Fallback
                for v in datos_azure.values():
                    if isinstance(v, list): hallazgos = v; break
        
        print(f"✅ Análisis completado: {len(hallazgos)} hallazgos.")
        
        # 🧠 6. EXTRACTOR UNIVERSAL (A prueba de cambios de Jorge/Diego)
        hallazgos_crudos = []
        
        if isinstance(datos_azure, list):
            hallazgos_crudos = datos_azure
        elif isinstance(datos_azure, dict):
            if "findings" in datos_azure:
                hallazgos_crudos = datos_azure["findings"]
            elif "vulnerabilities" in datos_azure:
                hallazgos_crudos = datos_azure["vulnerabilities"]
            elif "issues" in datos_azure:
                hallazgos_crudos = datos_azure["issues"]
            else:
                for key, value in datos_azure.items():
                    if isinstance(value, list):
                        hallazgos_crudos = value
                        break
        
        # 🛡️ 7. FILTRO ANTI-DUPLICADOS (El escudo del Backend)
        hallazgos_del_paso = []
        firmas_vistas = set()

        for hallazgo in hallazgos_crudos:
            # 1. Extraemos los datos clave para identificar si es el mismo error
            # Buscamos en las llaves que usa Joshua o las que usa Jorge
            archivo = hallazgo.get("file", hallazgo.get("file_path", "Desconocido"))
            linea = str(hallazgo.get("line", "0"))
            
            # Usamos el tipo de error (category o type) como identificador
            categoria_error = hallazgo.get("category", hallazgo.get("type", ""))
            
            # 2. Creamos una huella dactilar única para este error
            firma_unica = f"{archivo}-{linea}-{categoria_error}"
            
            # 3. Si la firma es nueva, lo guardamos. Si ya existe, la IA lo repitió y lo ignoramos.
            if firma_unica not in firmas_vistas:
                firmas_vistas.add(firma_unica)
                hallazgos_del_paso.append(hallazgo)
        
        print(f"✅ Extractor terminó: Azure mandó {len(hallazgos_crudos)}, pero filtrados quedaron {len(hallazgos_del_paso)} únicos.")

        return {
            "session_id": request.session_id,
            "categoria_analizada": request.categoria,
            "hallazgos": hallazgos_del_paso,
            "omitidos": archivos_omitidos
        }
        
    except Exception as e:
        print(f"🛑 Error Azure: {e}")
        raise HTTPException(status_code=502, detail=f"Falla en IA: {e}")
        
@app.get("/debug/workspace/{session_id}")
def inspeccionar_ram(session_id: str, file_path: str = Query(...)):
    """
    Endpoint de depuración para ver el estado actual de un archivo 
    dentro de la memoria RAM (VirtualWorkspace).
    """
    try:
        # Obtenemos el código fresco de la RAM
        codigo_actual = workspace.get_file(session_id, file_path)
        return {
            "session_id": session_id,
            "file_path": file_path,
            "content": codigo_actual
        }
    except ValueError:
        return {"error": f"El archivo {file_path} no existe en la RAM para esta sesión."}
    
@app.get("/login")
def github_login():
    """
    PASO 1: Redirige al usuario a GitHub pidiendo permisos explícitos de ESCRITURA.
    """
    # 🚀 EL FIX: Agregamos '&scope=repo' al final para poder crear ramas y PRs
    github_auth_url = f"https://github.com/login/oauth/authorize?client_id={GITHUB_CLIENT_ID}&scope=repo"
    
    return RedirectResponse(url=github_auth_url)

@app.get("/auth/callback")
def github_callback(code: str):
    """
    PASO 2: GitHub redirige al usuario de vuelta a este endpoint con un 'code' temporal.
    Lo intercambiamos por un Token de Acceso real y lo mandamos al Frontend.
    """
    token_url = "https://github.com/login/oauth/access_token"
    
    # Preparamos el maletín de intercambio
    payload = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code
    }
    
    # Le decimos a GitHub que somos civilizados y queremos la respuesta en JSON
    headers = {
        "Accept": "application/json" 
    }
    
    # Hacemos la petición POST a los servidores de GitHub por debajo del agua
    respuesta = requests.post(token_url, json=payload, headers=headers)
    datos = respuesta.json()
    
    if "access_token" not in datos:
        print("🛑 Error de GitHub:", datos)
        raise HTTPException(status_code=400, detail="No se pudo obtener el token de acceso.")
        
    access_token = datos["access_token"]
    print(f"🔑 ¡Token OAuth obtenido con éxito!: {access_token[:8]}...")
    
    # PASO 3: Devolver al usuario al Frontend de Joshua (React)
    # Mandamos el token en la URL para que React lo atrape y lo guarde
    # Ajusta el puerto (ej. 5173 o 3000) según donde corra tu React
    url_frontend = f"http://localhost:5173?github_token={access_token}"
    return RedirectResponse(url=url_frontend)


def analizar_con_azure(session_id: str, url_azure: str):
    """
    Extrae los archivos, construye el payload y tiene RAYOS X 
    para ver exactamente qué se envía y qué se recibe.
    """
    try:
        # 1. Recuperar archivos
        archivos_en_ram = workspace.get_all_files(session_id) 
        
        if not archivos_en_ram:
            print(f"⚠️ ALERTA: La RAM está vacía para la sesión {session_id}")
            raise ValueError("No hay archivos cargados en la sesión actual.")

        # 2. Construir el payload
        payload = {
            "files": archivos_en_ram
        }

        # 🔬 RAYOS X - LO QUE ENVIAMOS (Limitado a 500 caracteres para no saturar)
        print(f"\n📦 ENVIANDO A AZURE ({url_azure}):")
        payload_str = json.dumps(payload, indent=2)
        print(payload_str[:500] + "\n... [CÓDIGO TRUNCADO]") 

        # 3. Enviar a Azure
        respuesta = requests.post(url_azure, json=payload, timeout=60)
        
        # 🔬 RAYOS X - LO QUE RESPONDE AZURE
        print(f"\n🤖 RESPUESTA CRUDA DE AZURE (Status {respuesta.status_code}):")
        raw_response = respuesta.text
        print(raw_response[:800] + "\n... [RESPUESTA TRUNCADA]\n")

        respuesta.raise_for_status() 
        return respuesta.json()

    except requests.exceptions.RequestException as e:
        print(f"🛑 Error de red al contactar a Azure: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Error al contactar a la IA: {str(e)}")
    except Exception as e:
        print(f"🛑 Error interno: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))