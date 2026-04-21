from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from datetime import datetime
import os
import requests

from tools.github_tool import get_repo_files, get_file_content, get_repo_file_bytes
from schemas import ConsolidatedReport
from utils import consolidate_results
from services.llm_service import analizar_con_ia_externa, LLMTimeoutError, LLMServiceError
from services.document_parser import extraer_texto_por_extension, DocumentParserError
from workspace_manager import VirtualWorkspace
from sandbox import sandbox_check, SandboxViolation

load_dotenv()

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
    "business_rules": os.getenv("IA_RULES_URL", ""),
    "software_logic": os.getenv("IA_LOGIC_URL", ""),
    "best_practices": os.getenv("IA_PRACTICES_URL", "")
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


class StepAnalyzeRequest(BaseModel):
    session_id: str
    file_paths: list[str]
    categoria: str


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

    ai_responses = []
    skipped_files = []
    session_id = workspace.create_session()

    try:
        for file_path in request.selected_files:
            try:
                extension = os.path.splitext(file_path)[1].lower()

                # ─────────────────────────────────────────────
                # Sprint 8: documentos internos del repo
                # ─────────────────────────────────────────────
                if extension in [".txt", ".pdf", ".docx"]:
                    file_data = get_repo_file_bytes(request.repo_url, file_path)
                    texto_extraido = extraer_texto_por_extension(
                        file_data["content_bytes"],
                        extension
                    )

                    # Los documentos NO pasan por sandbox de código
                    workspace.add_file(session_id, file_path, texto_extraido)

                # ─────────────────────────────────────────────
                # Flujo normal para código y texto plano
                # ─────────────────────────────────────────────
                else:
                    file_data = get_file_content(request.repo_url, file_path)
                    contenido_seguro = sandbox_check(file_path, file_data["content"])
                    workspace.add_file(session_id, file_path, contenido_seguro)

                findings_del_archivo = []

                # 🧠 ENRUTADOR INTELIGENTE
                for categoria, archivos_marcados in request.selected_files_by_category.items():
                    if file_path in archivos_marcados:
                        url_destino = URLS_IA.get(categoria)

                        if url_destino:
                            hallazgos = analizar_con_ia_externa(
                                session_id,
                                file_path,
                                workspace,
                                url_destino,
                                categoria
                            )
                            findings_del_archivo.extend(hallazgos)
                        else:
                            findings_del_archivo.append({
                                "file_path": file_path,
                                "type": categoria,
                                "severity": "info",
                                "title": f"Análisis de {categoria} Pendiente",
                                "description": "Modelo en desarrollo.",
                                "recommendation": "Respuesta simulada para pruebas.",
                                "original_code": "",
                                "secure_code": "",
                                "line": 0
                            })

                ai_responses.append({
                    "analyzed": True,
                    "file_path": file_path,
                    "findings": findings_del_archivo
                })

            except (DocumentParserError, SandboxViolation, ValueError, LLMTimeoutError, LLMServiceError) as e:
                skipped_files.append({
                    "file_path": file_path,
                    "reason": str(e)
                })

            except Exception as e:
                skipped_files.append({
                    "file_path": file_path,
                    "reason": str(e)
                })

        reporte_final = consolidate_results(
            ai_responses=ai_responses,
            total_files_requested=len(request.selected_files),
            skipped_files=skipped_files
        )

        reporte_final["session_id"] = session_id

        return reporte_final

    except Exception as e:
        print(f"🛑 ERROR CRÍTICO EN CONSOLIDACIÓN: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al armar el reporte: {str(e)}")


@app.post("/apply-patches")
def apply_patches(request: ApplyPatchesRequest):
    """
    Recibe los hallazgos que el usuario aprobó en el Frontend y
    los aplica directamente en el Virtual Workspace.
    """
    if not request.approved_findings:
        return {"message": "No se recibieron parches para aplicar.", "archivos_actualizados": []}

    archivos_modificados = set()

    try:
        for finding in request.approved_findings:
            if not finding.original_code or not finding.secure_code:
                continue

            try:
                codigo_actual = workspace.get_file(request.session_id, finding.file_path)
            except ValueError:
                print(f"⚠️ Archivo no encontrado en workspace: {finding.file_path}")
                continue

            if finding.original_code in codigo_actual:
                nuevo_codigo = codigo_actual.replace(finding.original_code, finding.secure_code)

                workspace.add_file(request.session_id, finding.file_path, nuevo_codigo)
                archivos_modificados.add(finding.file_path)

                print(f"✅ Parche aplicado con éxito en: {finding.file_path}")
            else:
                print(f"⚠️ No se pudo aplicar el parche en {finding.file_path}. El fragmento original no coincide.")

        return {
            "message": "Parches aplicados correctamente en el entorno virtual.",
            "archivos_actualizados": list(archivos_modificados)
        }

    except Exception as e:
        print(f"🛑 ERROR AL APLICAR PARCHES: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al modificar el workspace: {str(e)}"
        )


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
    Ideal para flujos de revisión secuencial (Wizard).
    """
    url_destino = URLS_IA.get(request.categoria)

    if url_destino is None:
        raise HTTPException(
            status_code=400,
            detail=f"Categoría '{request.categoria}' no es válida o no está configurada."
        )

    hallazgos_del_paso = []
    archivos_omitidos = []

    try:
        for file_path in request.file_paths:
            try:
                codigo_en_ram = workspace.get_file(request.session_id, file_path)

                if url_destino == "":
                    print(f"🚧 {request.categoria} en construcción. Mockeando: {file_path}")
                    hallazgos_del_paso.append({
                        "file_path": file_path,
                        "type": request.categoria,
                        "severity": "info",
                        "title": f"Análisis de {request.categoria} Pendiente",
                        "description": "El modelo de IA para esta etapa aún está en desarrollo por el equipo.",
                        "recommendation": "Respuesta simulada para mantener el flujo del sistema.",
                        "original_code": "# Código actual...",
                        "secure_code": "# Código actual...",
                        "line": 0
                    })
                else:
                    print(f"🚀 Disparando IA ({request.categoria}) para: {file_path}")
                    nuevos_hallazgos = analizar_con_ia_externa(
                        request.session_id,
                        file_path,
                        workspace,
                        url_destino,
                        request.categoria
                    )
                    hallazgos_del_paso.extend(nuevos_hallazgos)

            except ValueError:
                archivos_omitidos.append({
                    "file_path": file_path,
                    "reason": "El archivo no está cargado en el Virtual Workspace de esta sesión."
                })
            except Exception as e:
                archivos_omitidos.append({
                    "file_path": file_path,
                    "reason": f"Error al procesar: {str(e)}"
                })

        return {
            "session_id": request.session_id,
            "categoria_analizada": request.categoria,
            "hallazgos": hallazgos_del_paso,
            "omitidos": archivos_omitidos
        }

    except Exception as e:
        print(f"🛑 ERROR EN /analyze/step: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno durante el análisis del paso: {str(e)}"
        )
