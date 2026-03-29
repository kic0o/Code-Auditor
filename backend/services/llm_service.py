import time
import httpx
import os

class LLMTimeoutError(Exception):
    """Se lanza cuando el LLM tarda demasiado en responder."""
    pass

class LLMServiceError(Exception):
    """Se lanza cuando el servicio LLM falla."""
    pass

# URL de la Azure Function del equipo de IA (Jorge Luis)
IA_API_URL = os.getenv("IA_API_URL", "http://localhost:7071/api/security")

def analyze_with_llm(file_path: str, file_content: str, mode: str = "success") -> dict:
    """
    Realiza el análisis de un archivo conectándose al LLM real y 
    traduce las llaves en español de la IA al esquema en inglés del sistema.
    """
    time.sleep(0.5)

    # --- SIMULACIÓN DE CASOS EDGE (SPRINT 4) ---
    if mode == "timeout":
        time.sleep(2)
        raise LLMTimeoutError("El LLM no respondió dentro del tiempo esperado.")

    if mode == "error":
        raise LLMServiceError("El servicio LLM no está disponible en este momento.")

    # --- LLAMADA REAL Y TRADUCTOR ---
    try:
        with httpx.Client() as client:
            payload = {
                "code": file_content  # Ojo: Confirma con Jorge si su llave es "code" o "codigo"
            }
            
            response = client.post(IA_API_URL, json=payload, timeout=30.0)
            
            if response.status_code != 200:
                # 👇 ESTA ES LA LÍNEA MÁGICA 👇
                print(f"🚨 MENSAJE SECRETO DE JORGE: {response.text}") 
                raise LLMServiceError(f"El servicio LLM devolvió un error HTTP {response.status_code}")

            raw_data = response.json()
            
            # Buscamos la lista de problemas. Si Jorge no usa una llave, asumimos que manda la lista directo.
            lista_cruda = raw_data.get("vulnerabilidades", raw_data.get("vulnerabilities", [])) if isinstance(raw_data, dict) else raw_data
            
            # Por si acaso la IA manda un solo objeto en lugar de una lista
            if not isinstance(lista_cruda, list):
                lista_cruda = [lista_cruda] if lista_cruda else []

            findings_traducidos = []

            # 🧩 EL TRADUCTOR: De español (IA) a inglés (Esquema/Frontend)
            for item in lista_cruda:
                if not isinstance(item, dict):
                    continue # Saltamos si la IA alucinó texto en vez de JSON
                
                hallazgo = {
                    "severity": "info", 
                    "type": "Buenas Prácticas",
                    "title": "Sugerencia de Mejora",
                    "line": 0,
                    "file_path": file_path,
                    
                    # 🧩 AHORA USAMOS LAS LLAVES REALES DEL PROMPT DE JORGE
                    "description": item.get("explanation", "Sin explicación."),
                    "recommendation": item.get("recommendation", "Revisar bloque."),
                    "original_code": item.get("original_code", ""),
                    "secure_code": item.get("secure_code", "")
                }
                findings_traducidos.append(hallazgo)

            return {
                "analyzed": True,
                "file_path": file_path,
                "findings": findings_traducidos
            }

    except httpx.TimeoutException:
        raise LLMTimeoutError(f"Timeout real al intentar conectar con el LLM para {file_path}")
    except Exception as e:
        if not isinstance(e, (LLMTimeoutError, LLMServiceError)):
            raise LLMServiceError(f"Error de conexión con la API de IA: {str(e)}")
        raise e