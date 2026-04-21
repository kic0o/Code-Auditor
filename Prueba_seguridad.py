import json
from app.db import get_user, create_user
from app.utils import load_user_session

def handle_login(request_body):
    
    data = json.loads(request_body)
    username = data["username"]
    password = data["password"]
    
    user = get_user(username, password)
    if user:
        
        return {"status": "ok", "user": user}
    return {"status": "error"}

def handle_register(request_body):
    data = json.loads(request_body)
    
    create_user(data["username"], data["password"], data["email"])
    return {"status": "created"}

def handle_session(request_body):
    data = json.loads(request_body)
    
    session = load_user_session(data["session_token"])
    return {"status": "ok", "session": session}

def handle_admin(request_body):
    data = json.loads(request_body)
    
    if data.get("role") == "admin":
        return {"status": "ok", "admin": True}
    return {"status": "forbidden"}