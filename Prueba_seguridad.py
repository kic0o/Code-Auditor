import json
from app.db import get_user, create_user
from app.utils import load_user_session

def handle_login(request_body):

    try:
        data = json.loads(request_body)
        username = data.get("username")
        password = data.get("password")
        if not isinstance(username, str) or not isinstance(password, str):
            raise ValueError
        if not username or not password:
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        return {"status": "error", "message": "Invalid input"}
    user = get_user(username, password)
    if user:

        # Return only non-sensitive user info
        return {"status": "ok", "user": {"id": user.get('id'), "username": user.get('username')}}
    return {"status": "error"}

def handle_register(request_body):
    try:
        data = json.loads(request_body)
        username = data.get("username")
        password = data.get("password")
        email = data.get("email")
        if not all(isinstance(v, str) for v in (username, password, email)):
            raise ValueError
        if not username or not password or not email:
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        return {"status": "error", "message": "Invalid input"}
    create_user(username, password, email)
    return {"status": "created"}

def handle_session(request_body):
    try:
        data = json.loads(request_body)
        token = data.get("session_token")
        if not isinstance(token, str) or not token:
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        return {"status": "error", "message": "Invalid session token"}
    session = load_user_session(token)
    return {"status": "ok", "session": session}

def handle_admin(request_body):
    try:
        data = json.loads(request_body)
        token = data.get("session_token")
        if not token:
            raise ValueError
    except (json.JSONDecodeError, ValueError):
        return {"status": "forbidden"}
    user = load_user_session(token)
    if user and user.get("role") == "admin":
        return {"status": "ok", "admin": True}
    return {"status": "forbidden"}