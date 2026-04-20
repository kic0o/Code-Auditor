from io import BytesIO
from fastapi import UploadFile
from pypdf import PdfReader
import docx


class DocumentParserError(Exception):
    """Se lanza cuando no se puede extraer texto de un documento."""
    pass


def extraer_texto_txt_bytes(contenido_bytes: bytes) -> str:
    """
    Extrae texto de un archivo TXT a partir de bytes.
    """
    try:
        texto = contenido_bytes.decode("utf-8").strip()
        if not texto:
            raise DocumentParserError("El archivo TXT está vacío.")
        return texto
    except UnicodeDecodeError:
        raise DocumentParserError("No se pudo decodificar el archivo TXT como UTF-8.")


def extraer_texto_docx_bytes(contenido_bytes: bytes) -> str:
    """
    Extrae texto de un archivo DOCX a partir de bytes.
    """
    try:
        flujo_memoria = BytesIO(contenido_bytes)
        documento = docx.Document(flujo_memoria)

        texto_extraido = []
        for parrafo in documento.paragraphs:
            texto_limpio = parrafo.text.strip()
            if texto_limpio:
                texto_extraido.append(texto_limpio)

        texto_final = "\n".join(texto_extraido).strip()

        if not texto_final:
            raise DocumentParserError("El archivo DOCX no contiene texto legible.")

        return texto_final

    except DocumentParserError:
        raise
    except Exception as e:
        print(f"🛑 Error al procesar el DOCX: {str(e)}")
        raise DocumentParserError("El archivo no es un documento Word válido o está corrupto.")


def extraer_texto_pdf_bytes(contenido_bytes: bytes) -> str:
    """
    Extrae texto de un archivo PDF a partir de bytes.
    """
    try:
        flujo_memoria = BytesIO(contenido_bytes)
        lector = PdfReader(flujo_memoria)

        paginas_texto = []
        for pagina in lector.pages:
            texto_pagina = pagina.extract_text()
            if texto_pagina:
                paginas_texto.append(texto_pagina.strip())

        texto_final = "\n".join(paginas_texto).strip()

        if not texto_final:
            raise DocumentParserError("El PDF no contiene texto extraíble o está vacío.")

        return texto_final

    except DocumentParserError:
        raise
    except Exception as e:
        print(f"🛑 Error al procesar el PDF: {str(e)}")
        raise DocumentParserError("No se pudo procesar el archivo PDF.")


def extraer_texto_por_extension(contenido_bytes: bytes, extension: str) -> str:
    """
    Selecciona el parser correcto según la extensión del archivo.
    """
    extension = extension.lower()

    if extension == ".txt":
        return extraer_texto_txt_bytes(contenido_bytes)
    elif extension == ".docx":
        return extraer_texto_docx_bytes(contenido_bytes)
    elif extension == ".pdf":
        return extraer_texto_pdf_bytes(contenido_bytes)
    else:
        raise DocumentParserError(f"Formato no soportado para extracción de texto: {extension}")


async def extraer_texto_upload(archivo: UploadFile) -> str:
    """
    Extrae texto de un UploadFile (documento externo subido por el usuario).
    """
    if not archivo.filename:
        raise DocumentParserError("El archivo no tiene nombre.")

    extension = ""
    if "." in archivo.filename:
        extension = "." + archivo.filename.split(".")[-1].lower()

    contenido_bytes = await archivo.read()

    if not contenido_bytes:
        raise DocumentParserError("El archivo está vacío.")

    return extraer_texto_por_extension(contenido_bytes, extension)
