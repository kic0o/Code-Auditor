from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from datetime import datetime
import os

from tools.github_tool import get_repo_files, get_file_content
from schemas import ConsolidatedReport
from utils import consolidate_results
from services.llm_service import analyze_with_llm, LLMTimeoutError, LLMServiceError
from workspace_manager import VirtualWorkspace # Tu archivo nuevo

load_dotenv()

# UNA SOLA INICIALIZACIÓN DE LA APP
app = FastAPI(title="Code Auditor API", version="5.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instanciamos nuestra memoria global
workspace = VirtualWorkspace()

UPLOAD_DIR = "uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class RepoRequest(BaseModel):
    repo_url: str
    selected_files: list[str] = Field(default_factory=list)
    # 🧠 NUEVO: Agregamos el diccionario que manda la nueva matriz de Joshua
    selected_files_by_category: dict = Field(default_factory=dict) 
    llm_mode: str = "success"  # success | timeout | error


@app.get("/")
def root():
    return {"message": "Code Auditor API is running ✅"}


@app.post("/files")
def get_files(request: RepoRequest):
    """
    Devuelve la lista de archivos analizables de un repositorio.
    Excluye carpetas irrelevantes y binarios conocidos.
    """
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
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar al menos un archivo para analizar."
        )

    MAX_FILES_PER_ANALYSIS = 10
    if len(request.selected_files) > MAX_FILES_PER_ANALYSIS:
        raise HTTPException(status_code=400, detail="Demasiados archivos.")

    ai_responses = []
    skipped_files = []
    
    # Nace la sesión del Workspace
    session_id = workspace.create_session()

    try:
        for file_path in request.selected_files:
            try:
                # 1. Descargas el archivo de GitHub
                file_data = get_file_content(request.repo_url, file_path)

                # Guardas el código original en la memoria virtual
                workspace.add_file(session_id, file_path, file_data["content"])

                # Espía en consola
                print(f"✅ Archivo {file_path} guardado en el Workspace {session_id}")
                # 🕵️‍♂️ EL ESPÍA: Imprimimos en la consola lo que se descargó
                print("\n" + "=" * 50)
                print(f"📄 ARCHIVO: {file_path}")
                print(f"📏 TAMAÑO: {len(file_data['content'])} caracteres")
                print(f"📦 CONTENIDO CRUDO (Primeros 150 caracteres):\n{file_data['content'][:150]}...")
                print("=" * 50 + "\n")

                llm_result = analyze_with_llm(
                    file_path=file_path,
                    file_content=file_data["content"],
                    mode=request.llm_mode
                )

                ai_responses.append(llm_result)

            except ValueError as file_error:
                skipped_files.append({
                    "file_path": file_path,
                    "reason": str(file_error)
                })

            except Exception as file_error:
                print(f"🛑 ERROR REAL AL CONECTAR CON JORGE: {str(file_error)}")
                skipped_files.append({
                    "file_path": file_path,
                    "reason": f"Error inesperado al procesar archivo: {str(file_error)}"
                })

        if not ai_responses and skipped_files:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Ningún archivo pudo ser analizado. "
                    "Todos fueron omitidos por ser inválidos, binarios, "
                    "demasiado grandes o no legibles."
                )
            )

        reporte_final = consolidate_results(
            ai_responses=ai_responses,
            total_files_requested=len(request.selected_files),
            skipped_files=skipped_files
        )

        return reporte_final

    except LLMTimeoutError as e:
        raise HTTPException(
            status_code=504,
            detail=f"Error de timeout al comunicarse con el LLM: {str(e)}"
        )

    except LLMServiceError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Error del servicio LLM: {str(e)}"
        )

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno durante el análisis: {str(e)}"
        )


@app.post("/upload-doc")
async def upload_doc(file: UploadFile = File(...)):
    """
    Sprint 5:
    Endpoint para recibir documentos del usuario, validarlos
    y almacenarlos en el servidor.
    """
    try:
        allowed_extensions = [".pdf", ".txt", ".docx"]
        max_file_size_bytes = 5 * 1024 * 1024  # 5 MB

        if not file.filename:
            raise HTTPException(
                status_code=400,
                detail="No se recibió ningún archivo válido."
            )

        original_filename = file.filename
        extension = os.path.splitext(original_filename)[1].lower()

        if extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail="Tipo de archivo no permitido. Solo se aceptan PDF, TXT y DOCX."
            )

        content = await file.read()

        if not content:
            raise HTTPException(
                status_code=400,
                detail="El archivo está vacío."
            )

        if len(content) > max_file_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo excede el tamaño máximo permitido de {max_file_size_bytes} bytes."
            )

        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        safe_filename = original_filename.replace(" ", "_")
        new_filename = f"{timestamp}_{safe_filename}"
        file_path = os.path.join(UPLOAD_DIR, new_filename)

        with open(file_path, "wb") as buffer:
            buffer.write(content)

        print("\n" + "=" * 50)
        print("📥 DOCUMENTO RECIBIDO")
        print(f"📄 NOMBRE ORIGINAL: {original_filename}")
        print(f"🆕 NOMBRE GUARDADO: {new_filename}")
        print(f"📏 TAMAÑO: {len(content)} bytes")
        print(f"📂 RUTA: {file_path}")
        print("=" * 50 + "\n")

        return {
            "message": "Archivo subido correctamente",
            "filename": new_filename,
            "original_name": original_filename,
            "size_bytes": len(content),
            "content_type": file.content_type,
            "path": file_path
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al subir el archivo: {str(e)}"
        )
