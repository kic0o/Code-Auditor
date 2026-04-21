from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class Finding(BaseModel):
    severity: Literal["critical", "warning", "info"] = Field(
        default="warning", # ✅ Valor por defecto si Jorge no lo manda
        description="Nivel de severidad"
    )
    type: str = Field(
        default="General", # ✅ Valor por defecto
        description="Categoría del problema"
    )
    file_path: str = Field(
        ...,
        description="Ruta del archivo analizado"
    )
    line: int = Field(
        default=0,
        description="Línea del hallazgo"
    )
    title: str = Field(
        default="Hallazgo detectado", # ✅ Valor por defectofcedfdfdfdf
        description="Título corto del problema"
    )
    description: str = Field(
        ...,
        description="Explicación detallada"
    )
    recommendation: str = Field(
        ...,
        description="Cómo solucionarlo"
    )
    original_code: str = Field(
        default="",
        description="Código vulnerable original"
    )
    secure_code: str = Field(
        default="",
        description="Sugerencia de código seguro"
    )


class SkippedFile(BaseModel):
    file_path: str = Field(
        ...,
        description="Ruta del archivo que fue omitido"
    )
    reason: str = Field(
        ...,
        description="Razón por la que el archivo no fue analizado"
    )


class ConsolidatedReport(BaseModel):
    total_score: int = Field(
        ...,
        description="Calificación global del análisis"
    )
    files_analyzed: int = Field(
        ...,
        description="Cantidad de archivos realmente analizados"
    )
    critical_issues: int = Field(
        default=0,
        description="Cantidad de hallazgos críticos"
    )
    warnings: int = Field(
        default=0,
        description="Cantidad de advertencias"
    )
    info_suggestions: int = Field(
        default=0,
        description="Cantidad de sugerencias informativas"
    )
    findings: List[Finding] = Field(
        default_factory=list,
        description="Lista de hallazgos encontrados"
    )
    skipped_files: List[SkippedFile] = Field(
        default_factory=list,
        description="Archivos omitidos durante el análisis"
    )
    analyzed_files_requested: int = Field(
        default=0,
        description="Cantidad de archivos solicitados para analizar"
    )
    session_id: str | None = None


class ErrorResponse(BaseModel):
    detail: str
    error_type: Optional[str] = None
