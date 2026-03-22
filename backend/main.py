from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from tools.github_tool import get_repo_files
import os

# Importamos las herramientas que acabas de crear
from schemas import ConsolidatedReport
from utils import consolidate_results

load_dotenv()

app = FastAPI(title="Code Auditor API", version="2.0.0")

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
    selected_files: list[str] = [] # Añadimos esto para saber qué archivos seleccionó el usuario en el frontend

# --- Endpoints ---
@app.get("/")
def root():
    return {"message": "Code Auditor API is running ✅"}

# Sprint 3 y 4 — Endpoint actualizado con el consolidador
@app.post("/analyze", response_model=ConsolidatedReport)
def analyze(request: RepoRequest):
    """
    Simula el análisis de la IA basado en los nuevos criterios:
    Crítico = Arquitectura | Advertencia = Errores | Sugerencia = Prácticas
    """
    mock_ai_data = [
        {
            "findings": [
                {
                    "severity": "critical",
                    "type": "Arquitectura",
                    "file_path": "backend/services/user_service.py",
                    "line": 45,
                    "title": "Violación de Regla de Negocio #4",
                    "description": "El documento de arquitectura exige que toda validación de usuario use el decorador @validate_auth. Esta función accede a la BD directamente.",
                    "recommendation": "Implementar el decorador @validate_auth según el estándar del PDF."
                },
                {
                    "severity": "warning",
                    "type": "Lógica / Seguridad",
                    "file_path": "backend/main.py",
                    "line": 89,
                    "title": "Bloque Try-Except demasiado genérico",
                    "description": "Se detectó un except genérico que podría capturar y ocultar errores críticos de conexión, dificultando el debug.",
                    "recommendation": "Capturar excepciones específicas como 'HTTPException' o 'ConnectionError'."
                },
                {
                    "severity": "info",
                    "type": "Buenas Prácticas",
                    "file_path": "frontend/src/components/Header.jsx",
                    "line": 12,
                    "title": "Componente Sobrecargado",
                    "description": "El componente Header excede las 100 líneas. Esto viola el principio de responsabilidad única del Clean Code.",
                    "recommendation": "Extraer la lógica de navegación a un subcomponente 'Navbar.jsx'."
                }
            ]
        }
    ]
    
    # Calculamos el reporte usando tu función consolidada
    total_archivos = len(request.selected_files) if request.selected_files else 3
    reporte_final = consolidate_results(mock_ai_data, total_archivos)
    
    return reporte_final

# Sprint 2 — sigue funcionando intacto
@app.post("/files")
def get_files(request: RepoRequest):
    """
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