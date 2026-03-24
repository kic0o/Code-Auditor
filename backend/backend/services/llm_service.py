import time


class LLMTimeoutError(Exception):
    """Se lanza cuando el LLM tarda demasiado en responder."""
    pass


class LLMServiceError(Exception):
    """Se lanza cuando el LLM falla de forma general."""
    pass


def analyze_with_llm(file_path: str, file_content: str, mode: str = "success") -> dict:
    """
    Simula el análisis de un archivo por un LLM.

    mode:
    - success: responde correctamente
    - timeout: simula que no responde a tiempo
    - error: simula error general del servicio
    """

    # Simulación de latencia
    time.sleep(1)

    if mode == "timeout":
        raise LLMTimeoutError("El LLM no respondió dentro del tiempo esperado.")

    if mode == "error":
        raise LLMServiceError("El servicio LLM no está disponible en este momento.")

    # Respuesta simulada, como si viniera del modelo
    return {
        "findings": [
            {
                "severity": "warning",
                "type": "Lógica / Seguridad",
                "file_path": file_path,
                "line": 10,
                "title": "Bloque try-except demasiado genérico",
                "description": "Se detectó un manejo de excepciones muy amplio que puede ocultar errores específicos.",
                "recommendation": "Captura excepciones concretas para mejorar el control y la depuración."
            },
            {
                "severity": "info",
                "type": "Buenas Prácticas",
                "file_path": file_path,
                "line": 25,
                "title": "Función extensa",
                "description": "La función contiene demasiadas responsabilidades en un solo bloque.",
                "recommendation": "Divide la función en métodos más pequeños con responsabilidad única."
            }
        ]
    }
