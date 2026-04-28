import requests
from workspace_manager import VirtualWorkspace

class LLMTimeoutError(Exception):
    """Se lanza cuando la API externa tarda demasiado en responder."""
    pass

class LLMServiceError(Exception):
    """Se lanza cuando ocurre un error general con la API externa."""
    pass

# ==========================================
# 1. TRADUCTOR INDIVIDUAL (Para /analyze/step)
# ==========================================
def analizar_con_ia_externa(session_id: str, file_path: str, workspace: VirtualWorkspace, url_api: str, categoria: str):
    """Adaptador para consumir la API de Jorge archivo por archivo."""
    codigo_actual = workspace.get_file(session_id, file_path)
    if codigo_actual is None:
        raise LLMServiceError(f"No se encontró el archivo '{file_path}'.")

    payload_jorge = {"files": {file_path: codigo_actual}}

    try:
        respuesta = requests.post(url_api, json=payload_jorge, timeout=45)
        respuesta.raise_for_status()
        
        datos = respuesta.json()
        hallazgos_formateados = []
        vulnerabilidades = datos.get("vulnerabilities", [])

        for item in vulnerabilidades:
            hallazgos_formateados.append({
                "file_path": item.get("file_path", file_path),
                "type": categoria,
                "severity": "critical" if categoria == "security" else "warning",
                "title": f"Hallazgo de {categoria.replace('_', ' ').title()}",
                "description": item.get("explanation", "Sin explicación"),
                "recommendation": item.get("recommendation", "Sin recomendación"),
                "original_code": item.get("original_code", ""),
                "secure_code": item.get("secure_code", ""),
                "line": 0
            })
        return hallazgos_formateados
    except Exception as e:
        raise LLMServiceError(f"Error en API individual: {str(e)}")


# ==========================================
# 2. TRADUCTOR POR LOTES (Para Seguridad / Buenas Prácticas)
# ==========================================
def analizar_proyecto_completo(session_id: str, files_dict: dict, url_api: str, categoria: str):
    """Envía múltiples archivos en un solo 'Súper JSON' a la API de Jorge."""
    payload_jorge = {"files": files_dict}

    try:
        print(f"🚀 Enviando lote de {len(files_dict)} archivos a Azure ({categoria})...")
        respuesta = requests.post(url_api, json=payload_jorge, timeout=60)
        respuesta.raise_for_status()
        
        datos = respuesta.json()
        hallazgos_estandarizados = []
        vulnerabilidades = datos.get("vulnerabilities", [])

        for item in vulnerabilidades:
            hallazgos_estandarizados.append({
                "file_path": item.get("file_path", item.get("file", "Global/Multiple")), 
                "type": categoria,
                "severity": "critical" if categoria == "security" else "warning",
                "title": f"Hallazgo de {categoria.replace('_', ' ').title()}",
                "description": item.get("explanation", "Sin explicación"),
                "recommendation": item.get("recommendation", "Sin recomendación"),
                "original_code": item.get("original_code", ""),
                "secure_code": item.get("secure_code", ""),
                "line": item.get("line", 0)
            })
        return hallazgos_estandarizados
    except Exception as e:
        print(f"🛑 Error en Batch Analysis ({categoria}): {str(e)}")
        raise LLMServiceError(f"Error en comunicación por lotes: {str(e)}")


# ==========================================
# 3. TRADUCTOR DE REGLAS DE NEGOCIO (Con PDFs)
# ==========================================
def analizar_reglas_negocio(session_id: str, files_dict: dict, contexto_arquitectura: str, url_api: str):
    """Específico para Reglas de Negocio. Inyecta el texto de los documentos."""
    payload = {
        "files": files_dict,
        "architectural_rules": contexto_arquitectura
    }

    try:
        print(f"🚀 Enviando Reglas de Negocio a Azure...")
        respuesta = requests.post(url_api, json=payload, timeout=60)
        respuesta.raise_for_status()
        
        datos = respuesta.json()
        hallazgos_estandarizados = []
        lista_issues = datos.get("issues", [])

        for item in lista_issues:
            hallazgos_estandarizados.append({
                "file_path": item.get("archivo", "Global"),
                "type": "business_rules",
                "severity": "critical", 
                "title": f"Regla de Negocio: {item.get('tipo_error', 'Estilo')}",
                "description": item.get("sugerencia", "Sin descripción"),
                "recommendation": "Sigue los estándares definidos en el documento de arquitectura.",
                "original_code": item.get("codigo_original", ""),
                "secure_code": item.get("codigo_corregido", ""),
                "line": item.get("linea", 0)
            })

        return hallazgos_estandarizados
    except Exception as e:
        print(f"🛑 Error en Reglas de Negocio: {str(e)}")
        raise LLMServiceError(f"Error en Reglas de Negocio: {str(e)}")
    
# ==========================================
# 4. TRADUCTOR DE BUENAS PRÁCTICAS (clean-code)
# ==========================================
def analizar_buenas_practicas(session_id: str, files_dict: dict, url_api: str):
    """Específico para Best Practices. Maneja la estructura única de clean-code API."""
    payload = {"files": files_dict}

    try:
        print(f"🚀 Enviando Buenas Prácticas a Azure ({len(files_dict)} archivos)...")
        respuesta = requests.post(url_api, json=payload, timeout=60, verify=False)
        respuesta.raise_for_status()

        datos = respuesta.json()
        hallazgos_estandarizados = []

        for item in datos.get("issues", []):
            hallazgos_estandarizados.append({
                "file_path": item.get("file", "Global"),
                "type": "best_practices",
                "severity": "warning",
                "title": f"Buenas Prácticas: {item.get('category', 'General')}",
                "description": item.get("explanation", "Sin explicación"),
                "recommendation": item.get("recommendation", "Sin recomendación"),
                "original_code": item.get("original_code", ""),
                "secure_code": item.get("corrected_code", ""),  # ← mapeo clave
                "line": item.get("line", 0)
            })

        return hallazgos_estandarizados

    except Exception as e:
        print(f"🛑 Error en Buenas Prácticas: {str(e)}")
        raise LLMServiceError(f"Error en Buenas Prácticas: {str(e)}")