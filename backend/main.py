from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from tools.github_tool import get_repo_files, get_file_content
from schemas import ConsolidatedReport
from utils import consolidate_results
from services.llm_service import analyze_with_llm, LLMTimeoutError, LLMServiceError

load_dotenv()

app = FastAPI(title="Code Auditor API", version="4.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RepoRequest(BaseModel):
    repo_url: str
    selected_files: list[str] = Field(default_factory=list)
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
    """
    Sprint 4:
    Manejo de errores y casos edge:
    - repos grandes
    - archivos binarios
    - archivos demasiado grandes
    - errores parciales por archivo
    - error/timeout del LLM simulado
    """
    if not request.selected_files:
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar al menos un archivo para analizar."
        )

    MAX_FILES_PER_ANALYSIS = 10

    if len(request.selected_files) > MAX_FILES_PER_ANALYSIS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Has seleccionado demasiados archivos. "
                f"El máximo permitido por análisis es {MAX_FILES_PER_ANALYSIS}."
            )
        )

    ai_responses = []
    skipped_files = []

    try:
        for file_path in request.selected_files:
            try:
                file_data = get_file_content(request.repo_url, file_path)
                # 🕵️‍♂️ EL ESPÍA: Imprimimos en la consola lo que se descargó
                print("\n" + "="*50)
                print(f"📄 ARCHIVO: {file_path}")
                print(f"📏 TAMAÑO: {len(file_data['content'])} caracteres")
                print(f"📦 CONTENIDO CRUDO (Primeros 150 caracteres):\n{file_data['content'][:150]}...")
                print("="*50 + "\n")
                
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
