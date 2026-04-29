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

    # Verify the request is associated with an authenticated session
    session = load_user_session(data.get("session_token"))
    if not session:
        return {"status": "unauthorized"}

    # Retrieve the user's stored role from a trusted source (e.g., database)
    user = get_user(session.get("username"), None)  # Adjust get_user to fetch by username only
    if user and user.get("role") == "admin":
        return {"status": "ok", "admin": True}
    return {"status": "forbidden"}