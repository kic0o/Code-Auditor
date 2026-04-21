import requests
from workspace_manager import VirtualWorkspace


class LLMTimeoutError(Exception):
    """Se lanza cuando la API externa tarda demasiado en responder."""
    pass


class LLMServiceError(Exception):
    """Se lanza cuando ocurre un error general con la API externa."""
    pass


def analizar_con_ia_externa(
    session_id: str,
    file_path: str,
    workspace: VirtualWorkspace,
    url_api: str,
    categoria: str
):
    """Adaptador universal para consumir cualquier API de Jorge en Azure."""
    codigo_actual = workspace.get_file(session_id, file_path)

    if codigo_actual is None:
        raise LLMServiceError(
            f"No se encontró el archivo '{file_path}' en el workspace para la sesión '{session_id}'."
        )

    payload_jorge = {"code": codigo_actual}

    try:
        # Configuramos un timeout de 30 segundos
        respuesta = requests.post(url_api, json=payload_jorge, timeout=30)

        if respuesta.status_code == 200:
            try:
                datos = respuesta.json()
            except ValueError as e:
                raise LLMServiceError(
                    f"La API devolvió JSON inválido para la categoría '{categoria}'."
                ) from e

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

        raise LLMServiceError(
            f"Error en API de Azure ({categoria}): {respuesta.status_code}"
        )

    except requests.exceptions.Timeout as e:
        raise LLMTimeoutError(
            f"Timeout al conectar con Azure para la categoría '{categoria}'."
        ) from e

    except requests.exceptions.RequestException as e:
        raise LLMServiceError(
            f"Error de red al conectar con Azure ({categoria}): {str(e)}"
        ) from e