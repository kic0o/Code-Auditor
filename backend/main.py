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
    Recibe la URL y los archivos seleccionados.
    Simula el análisis de la IA y devuelve el JSON consolidado.
    """
    # 1. Datos simulados (Mock) fingiendo que Gemini ya analizó el código
    mock_ai_data = [
        {
            "findings": [
                {
                    "severity": "critical", 
                    "file_path": "backend/main.py", 
                    "line": 15, 
                    "title": "CORS demasiado permisivo", 
                    "description": "El uso de allow_origins=['*'] en producción es vulnerable a ataques.", 
                    "recommendation": "Definir dominios específicos en la lista de origins."
                },
                {
                    "severity": "warning", 
                    "file_path": "frontend/src/App.jsx", 
                    "line": 42, 
                    "title": "Variable sin usar", 
                    "description": "Se importó 'useEffect' pero no se está utilizando en el componente.", 
                    "recommendation": "Eliminar la importación para mantener el código limpio."
                },
                {
                    "severity": "info", 
                    "file_path": "README.md", 
                    "line": 0, 
                    "title": "Falta documentación", 
                    "description": "No hay instrucciones de cómo correr el entorno local.", 
                    "recommendation": "Agregar una sección de 'Pasos para instalación'."
                }
            ]
        }
    ]
    
    # 2. Determinamos cuántos archivos se están "analizando"
    total_archivos = len(request.selected_files) if request.selected_files else 3
    
    # 3. Llamamos a TU función consolidadora
    reporte_final = consolidate_results(mock_ai_data, total_archivos)
    
    # 4. FastAPI valida automáticamente que cumpla con ConsolidatedReport y lo devuelve al frontend
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