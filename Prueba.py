import json
from app.db import get_user, create_user
from app.utils import load_user_session

def handle_login(request_body):
    # FALLA: No hay manejo de excepciones si el JSON está mal formado
    data = json.loads(request_body)
    username = data["username"]
    password = data["password"]
    
    user = get_user(username, password)
    if user:
        # FALLA: Retornar el objeto 'user' completo suele exponer hashes de contraseñas
        return {"status": "ok", "user": user}
    return {"status": "error"}

def handle_register(request_body):
    data = json.loads(request_body)
    # FALLA: Mass Assignment - se confía ciegamente en los campos del JSON
    create_user(data["username"], data["password"], data["email"])
    return {"status": "created"}

def handle_session(request_body):
    data = json.loads(request_body)
    # FALLA: Si session_token es nulo o manipulado, puede causar errores de lógica
    session = load_user_session(data["session_token"])
    return {"status": "ok", "session": session}

def handle_admin(request_body):
    data = json.loads(request_body)
    # FALLA CRÍTICA: Broken Object Level Authorization (BOLA) / Privilege Escalation
    # El usuario puede simplemente enviar {"role": "admin"} en el cuerpo para entrar
    if data.get("role") == "admin":
        return {"status": "ok", "admin": True}
    return {"status": "forbidden"}