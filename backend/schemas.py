from pydantic import BaseModel, Field
from typing import List

class Finding(BaseModel):
    severity: str = Field(..., description="critical, warning, o info")
    type: str = Field(..., description="Categoría: Seguridad, Estilo, Rendimiento, Lógica") # <--- NUEVO
    file_path: str = Field(..., description="Ruta del archivo analizado")
    line: int = Field(default=0, description="Línea del error")
    title: str = Field(..., description="Título corto del problema")
    description: str = Field(..., description="Explicación detallada")
    recommendation: str = Field(..., description="Cómo solucionarlo")

class ConsolidatedReport(BaseModel):
    total_score: int = Field(..., description="Calificación global")
    files_analyzed: int = Field(..., description="Cantidad de archivos")
    critical_issues: int = Field(default=0)
    warnings: int = Field(default=0)
    info_suggestions: int = Field(default=0)
    findings: List[Finding] = []