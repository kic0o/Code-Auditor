import uuid

class VirtualWorkspace:
    def __init__(self):
        # Diccionario principal que vive en la memoria RAM
        # Estructura: {"session_id": {"ruta/del/archivo.py": "contenido del código..."}}
        self.sessions = {}

    # Dentro de tu clase VirtualWorkspace
    def get_all_files(self, session_id: str):
        """Devuelve un diccionario {ruta: contenido} de toda la sesión."""
        if session_id not in self.sessions:
            return {}
        return self.sessions[session_id]
    
    def create_session(self) -> str:
        """Crea una nueva sesión vacía y devuelve un ID único."""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {}
        return session_id

    def add_file(self, session_id: str, file_path: str, content: str):
        """Agrega el código original descargado de GitHub al workspace."""
        if session_id not in self.sessions:
            raise ValueError("La sesión no existe.")
        self.sessions[session_id][file_path] = content

    def get_file(self, session_id: str, file_path: str) -> str:
        """Devuelve el código más actualizado (mutado) para enviarlo a la IA."""
        return self.sessions.get(session_id, {}).get(file_path, "")

    def apply_patch(self, session_id: str, file_path: str, original_code: str, secure_code: str) -> bool:
        """
        Busca el fragmento de código original y lo reemplaza por el corregido.
        Retorna True si la cirugía fue exitosa, False si no encontró el código.
        """
        current_code = self.get_file(session_id, file_path)
        
        if not current_code:
            return False

        # Verificamos que el código a reemplazar realmente exista en nuestro string
        if original_code in current_code:
            # Reemplazamos SOLO la primera coincidencia (para evitar cambiar cosas duplicadas)
            new_code = current_code.replace(original_code, secure_code, 1)
            
            # Guardamos el código mutado de vuelta en la memoria
            self.sessions[session_id][file_path] = new_code
            return True
        else:
            print(f"⚠️ Advertencia: No se encontró el código exacto en {file_path}")
            return False