"""
sandbox.py — Módulo de seguridad para Code Auditor
===================================================
Dos protecciones independientes que se aplican antes de mandar
cualquier contenido al LLM:

  1. CodeExecutionGuard  → detecta patrones que podrían ejecutar código
                           en el servidor si alguien los llamara accidentalmente.
  2. LLMSanitizer        → limpia y envuelve el contenido para prevenir
                           prompt injection hacia la API de IA.

Uso en main.py:
    from sandbox import sandbox_check

    contenido_seguro = sandbox_check(file_path, file_data["content"])
    # Si lanza SandboxViolation, el archivo se agrega a skipped_files.
    # Si pasa, `contenido_seguro` ya está listo para mandarse al LLM.
"""

import re
import unicodedata
from typing import Optional


# ─────────────────────────────────────────────
# Excepción personalizada
# ─────────────────────────────────────────────

class SandboxViolation(Exception):
    """Se lanza cuando el contenido no pasa la revisión del sandbox."""
    pass


# ─────────────────────────────────────────────
# 1. PROTECCIÓN: Ejecución de código
# ─────────────────────────────────────────────

# Patrones que NO deben ejecutarse en el proceso del servidor.
# El análisis de código los detecta como texto, no los ejecuta,
# pero validamos que el pipeline nunca los invoque accidentalmente.
_PATRONES_EJECUCION_PELIGROSA = [
    # Python
    r"\bexec\s*\(",
    r"\beval\s*\(",
    r"\bcompile\s*\(",
    r"__import__\s*\(",
    r"\bimportlib\.import_module\s*\(",
    # Sistema operativo
    r"\bos\.system\s*\(",
    r"\bos\.popen\s*\(",
    r"\bos\.execv\s*\(",
    r"\bsubprocess\.(run|call|Popen|check_output)\s*\(",
    # Shell injection
    r"\bshlex\.split\s*\(",
    # Serialización peligrosa
    r"\bpickle\.(loads|load)\s*\(",
    r"\byaml\.load\s*\([^)]*Loader\s*=\s*None",  # yaml sin Loader seguro
    # Acceso a archivos del sistema operativo fuera del proyecto
    r"open\s*\(\s*['\"]\/etc\/",
    r"open\s*\(\s*['\"]\/root\/",
    r"open\s*\(\s*['\"]C:\\\\Windows",
]

_RE_EJECUCION = [re.compile(p, re.IGNORECASE) for p in _PATRONES_EJECUCION_PELIGROSA]

# Tamaño máximo de archivo que acepta el sandbox (caracteres)
MAX_CHARS = 50_000


def verificar_ejecucion(file_path: str, contenido: str) -> None:
    """
    Recorre el contenido buscando patrones de ejecución peligrosa.
    Lanza SandboxViolation si encuentra alguno.

    No bloquea el análisis legítimo de código que *contiene* esas
    funciones — el archivo sigue mandándose al LLM como texto.
    Lo que detecta es si el BACKEND mismo intentara llamarlas.
    """
    if len(contenido) > MAX_CHARS:
        raise SandboxViolation(
            f"Archivo demasiado grande para el sandbox: "
            f"{len(contenido)} caracteres (máximo {MAX_CHARS})."
        )

    for patron in _RE_EJECUCION:
        match = patron.search(contenido)
        if match:
            # Solo loguea la línea donde ocurre, no el contenido completo
            linea_num = contenido[: match.start()].count("\n") + 1
            print(
                f"🛡️  [SANDBOX] Patrón bloqueado en '{file_path}' "
                f"línea {linea_num}: {match.group()!r}"
            )
            raise SandboxViolation(
                f"El archivo '{file_path}' contiene un patrón de ejecución "
                f"no permitido en el pipeline del servidor: '{match.group()}' "
                f"(línea {linea_num}). El archivo fue omitido por seguridad."
            )


# ─────────────────────────────────────────────
# 2. PROTECCIÓN: Prompt injection hacia el LLM
# ─────────────────────────────────────────────

# Frases que intentan manipular al LLM para que ignore su sistema de instrucciones.
_PATRONES_INJECTION = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
    r"ignora\s+(todas?\s+)?(las\s+)?(instrucciones|reglas)\s+(anteriores|previas)",
    r"forget\s+(everything|all)\s+(you|i|we)",
    r"olvida\s+(todo|tus\s+instrucciones)",
    r"you\s+are\s+now\s+a\s+(different|new|evil|jailbreak)",
    r"ahora\s+eres\s+un",
    r"act\s+as\s+(if\s+you\s+are|a)\s+",
    r"actúa\s+como\s+si",
    r"(reveal|show|print|expose)\s+(your|the)\s+(system\s+prompt|api\s+key|secret)",
    r"(muestra|revela|imprime)\s+(tu\s+)?(prompt|clave|api\s*key)",
    r"DAN\s*(mode|prompt|jailbreak)",
    r"jailbreak",
    r"<\s*system\s*>",           # Intentos de inyectar etiquetas de sistema
    r"\[INST\]",                  # Formato Llama/Mistral
    r"<\|im_start\|>",           # Formato ChatML
    r"###\s*instruction",
    r"IGNORE ABOVE",
]

_RE_INJECTION = [re.compile(p, re.IGNORECASE) for p in _PATRONES_INJECTION]

# Caracteres de control que no deben viajar al LLM
_CTRL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Longitud máxima del contenido que se manda al LLM
MAX_CHARS_LLM = 40_000


def sanitizar_para_llm(file_path: str, contenido: str) -> str:
    """
    Limpia y envuelve el contenido antes de mandarlo al LLM.

    Pasos:
      1. Normaliza unicode para evitar caracteres invisibles.
      2. Elimina caracteres de control.
      3. Trunca al máximo permitido.
      4. Detecta intentos de prompt injection.
      5. Envuelve el código en delimitadores explícitos para que el LLM
         lo trate siempre como código a analizar, nunca como instrucción.

    Retorna el contenido listo para mandar al LLM.
    """
    # 1. Normalizar unicode (convierte caracteres raros a su equivalente normal)
    contenido = unicodedata.normalize("NFKC", contenido)

    # 2. Eliminar caracteres de control (excepto \n, \r, \t que son válidos)
    contenido = _CTRL_CHARS.sub("", contenido)

    # 3. Truncar
    if len(contenido) > MAX_CHARS_LLM:
        contenido = contenido[:MAX_CHARS_LLM]
        contenido += "\n\n[SANDBOX: contenido truncado por exceder el límite de seguridad]"
        print(f"⚠️  [SANDBOX] '{file_path}' truncado a {MAX_CHARS_LLM} caracteres.")

    # 4. Detectar prompt injection
    for patron in _RE_INJECTION:
        match = patron.search(contenido)
        if match:
            linea_num = contenido[: match.start()].count("\n") + 1
            print(
                f"🚨 [SANDBOX] Posible prompt injection en '{file_path}' "
                f"línea {linea_num}: {match.group()!r}"
            )
            raise SandboxViolation(
                f"El archivo '{file_path}' contiene texto que podría manipular "
                f"al modelo de IA: '{match.group()}' (línea {linea_num}). "
                f"El archivo fue omitido por seguridad."
            )

    # 5. Envolver en delimitadores claros para el LLM
    contenido_envuelto = (
        f"[INICIO_CODIGO archivo='{file_path}']\n"
        f"{contenido}\n"
        f"[FIN_CODIGO archivo='{file_path}']"
    )

    return contenido_envuelto


# ─────────────────────────────────────────────
# Función principal — punto de entrada único
# ─────────────────────────────────────────────

def sandbox_check(file_path: str, contenido: str) -> str:
    """
    Ejecuta las dos protecciones en orden y retorna el contenido
    listo para el LLM si todo está bien.

    Uso:
        from sandbox import sandbox_check, SandboxViolation

        try:
            contenido_seguro = sandbox_check(file_path, raw_content)
        except SandboxViolation as e:
            # tratar como archivo omitido
            skipped_files.append({"file_path": file_path, "reason": str(e)})
            continue

    Lanza SandboxViolation si el contenido no pasa alguna de las revisiones.
    """
    print(f"🛡️  [SANDBOX] Verificando: {file_path}")

    # Protección 1: ejecución peligrosa
    verificar_ejecucion(file_path, contenido)

    # Protección 2: sanitización y anti-injection
    contenido_seguro = sanitizar_para_llm(file_path, contenido)

    print(f"✅ [SANDBOX] '{file_path}' pasó todas las verificaciones.")
    return contenido_seguro
