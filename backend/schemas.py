from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class Finding(BaseModel):
    severity: Literal["critical", "warning", "info"] = Field(
        ...,
        description="Nivel de severidad"
    )
    type: str = Field(
        ...,
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
        ...,
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


class ErrorResponse(BaseModel):
    detail: str
    error_type: Optional[str] = None
