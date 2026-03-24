from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class Finding(BaseModel):
    severity: Literal["critical", "warning", "info"] = Field(..., description="Nivel de severidad")
    type: str = Field(..., description="Categoría del problema")
    file_path: str = Field(..., description="Ruta del archivo analizado")
    line: int = Field(default=0, description="Línea del hallazgo")
    title: str = Field(..., description="Título corto del problema")
    description: str = Field(..., description="Explicación detallada")
    recommendation: str = Field(..., description="Cómo solucionarlo")


class ConsolidatedReport(BaseModel):
    total_score: int = Field(..., description="Calificación global")
    files_analyzed: int = Field(..., description="Cantidad de archivos analizados")
    critical_issues: int = Field(default=0)
    warnings: int = Field(default=0)
    info_suggestions: int = Field(default=0)
    findings: List[Finding] = Field(default_factory=list)


class ErrorResponse(BaseModel):
    detail: str
    error_type: Optional[str] = None
