import docx
from io import BytesIO
from fastapi import UploadFile

async def extraer_texto_docx(archivo: UploadFile) -> str:
    """
    Recibe un archivo DOCX subido por el usuario y extrae todo su texto.
    """
    try:
        # 1. Leemos los bytes del archivo directamente de la memoria
        contenido_bytes = await archivo.read()
        
        # 2. Convertimos los bytes en un formato que python-docx entienda
        flujo_memoria = BytesIO(contenido_bytes)
        documento = docx.Document(flujo_memoria)
        
        # 3. Recorremos el documento y guardamos el texto
        texto_extraido = []
        for parrafo in documento.paragraphs:
            texto_limpio = parrafo.text.strip()
            if texto_limpio:  # Ignoramos los párrafos que solo son saltos de línea
                texto_extraido.append(texto_limpio)
                
        # 4. Unimos todo con saltos de línea y lo devolvemos
        return "\n".join(texto_extraido)
        
    except Exception as e:
        print(f"🛑 Error al procesar el DOCX: {str(e)}")
        raise ValueError("El archivo no es un documento Word válido o está corrupto.")