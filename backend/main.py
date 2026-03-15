from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from tools.github_tool import get_repo_files
import os

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

# --- Endpoints ---
@app.get("/")
def root():
    return {"message": "Code Auditor API is running ✅"}

# Sprint 1 — sigue funcionando
@app.post("/analyze")
def analyze(request: RepoRequest):
    return {
        "message": "Repo recibido correctamente",
        "repo_url": request.repo_url,
        "status": "pending"
    }

# Sprint 2 — nuevo endpoint
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
