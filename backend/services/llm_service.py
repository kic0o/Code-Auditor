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
    """
    Adaptador universal para consumir cualquier API de auditoría en Azure.
    Obtiene el código desde el workspace, lo envía a la API externa
    y regresa los hallazgos en formato estandarizado.
    """
    codigo_actual = workspace.get_file(session_id, file_path)

    if codigo_actual is None:
        raise LLMServiceError(
            f"No se encontró el archivo '{file_path}' en el workspace para la sesión '{session_id}'."
        )

    payload_jorge = {
        "code": codigo_actual
    }

    try:
        respuesta = requests.post(url_api, json=payload_jorge, timeout=30)

        if respuesta.status_code == 200:
            try:
                datos = respuesta.json()
            except ValueError:
                raise LLMServiceError(
                    f"La API de Azure devolvió una respuesta no válida en formato JSON para la categoría '{categoria}'."
                )

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
            f"La API de Azure respondió con error {respuesta.status_code} para la categoría '{categoria}'."
        )

    except requests.exceptions.Timeout as e:
        raise LLMTimeoutError(
            f"La API de Azure excedió el tiempo de espera para la categoría '{categoria}'."
        ) from e

    except requests.exceptions.RequestException as e:
        raise LLMServiceError(
            f"Error de red al conectar con Azure para la categoría '{categoria}': {str(e)}"
        ) from e
