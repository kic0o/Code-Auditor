from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from tools.github_tool import get_repo_files
from schemas import ConsolidatedReport
from utils import consolidate_results
from services.llm_service import analyze_with_llm, LLMTimeoutError, LLMServiceError

load_dotenv()

app = FastAPI(title="Code Auditor API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos ---
class RepoRequest(BaseModel):
    repo_url: str
    selected_files: list[str] = Field(default_factory=list)
    llm_mode: str = "success"  # success | timeout | error


# --- Endpoints ---
@app.get("/")
def root():
    return {"message": "Code Auditor API is running ✅"}


@app.post("/analyze", response_model=ConsolidatedReport)
def analyze(request: RepoRequest):
    """
    Sprint 3:
    Simula el análisis mediante un LLM y maneja errores si el LLM no responde.

    llm_mode:
    - success: el LLM responde correctamente
    - timeout: el LLM no responde a tiempo
    - error: el servicio LLM falla
    """
    if not request.selected_files:
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar al menos un archivo para analizar."
        )

    ai_responses = []

    try:
        for file_path in request.selected_files:
            # Por ahora el contenido del archivo es simulado.
            # Más adelante aquí se podrá leer el contenido real desde GitHub.
            simulated_content = f"Contenido simulado del archivo {file_path}"

            llm_result = analyze_with_llm(
                file_path=file_path,
                file_content=simulated_content,
                mode=request.llm_mode
            )

            ai_responses.append(llm_result)

        reporte_final = consolidate_results(ai_responses, len(request.selected_files))
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

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno durante el análisis: {str(e)}"
        )


@app.post("/files")
def get_files(request: RepoRequest):
    """
    Sprint 2:
    Recibe la URL del repo y devuelve la lista de archivos usando GitHub API.
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
