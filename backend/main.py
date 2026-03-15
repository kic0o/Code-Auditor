from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()

app = FastAPI(title="Code Auditor API", version="1.0.0")

# Permitir conexiones desde el frontend (React en localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Modelos ---
class AnalyzeRequest(BaseModel):
    repo_url: str

class AnalyzeResponse(BaseModel):
    message: str
    repo_url: str
    status: str

# --- Endpoints ---
@app.get("/")
def root():
    return {"message": "Code Auditor API is running ✅"}

@app.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest):
    """
    Sprint 1: Recibe la URL del repo y confirma que llegó correctamente.
    Sprint 2: Aquí se llamará a la GitHub Tool para leer los archivos.
    """
    return AnalyzeResponse(
        message="Repo recibido correctamente",
        repo_url=request.repo_url,
        status="pending"
    )
