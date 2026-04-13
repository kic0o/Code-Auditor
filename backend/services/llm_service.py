import requests
from workspace_manager import VirtualWorkspace

class LLMServiceError(Exception):
    pass

def analizar_con_ia_externa(session_id: str, file_path: str, workspace: VirtualWorkspace, url_api: str, categoria: str):
    """Adaptador universal para consumir cualquier API de Jorge en Azure."""
    codigo_actual = workspace.get_file(session_id, file_path)
    payload_jorge = {"code": codigo_actual}
    
    try:
        respuesta = requests.post(url_api, json=payload_jorge, timeout=30)
        
        if respuesta.status_code == 200:
            datos = respuesta.json()
            hallazgos_formateados = []
            
            vulnerabilidades = datos.get("vulnerabilidades", datos.get("vulnerabilities", []))
            
            for item in vulnerabilidades:
                hallazgos_formateados.append({
                    "file_path": file_path,
                    "type": categoria,
                    "severity": "info" if categoria in ["best_practices", "business_rules"] else "critical",
                    "title": "Hallazgo de Auditoría",
                    "description": item.get("explanation", "Sin explicación"),
                    "recommendation": item.get("recommendation", "Sin recomendación"),
                    "original_code": item.get("original_code", ""),
                    "secure_code": item.get("secure_code", ""),
                    "line": 0
                })
            return hallazgos_formateados
        else:
            print(f"❌ Error en API de Jorge ({categoria}): {respuesta.status_code}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error de red al conectar con Azure ({categoria}): {e}")
        return []