import uuid
from datetime import datetime

# Base de datos temporal en memoria (para sprint)
sessions_db = {}


def create_session(repo_url: str, selected_files: list):
    session_id = str(uuid.uuid4())

    session = {
        "session_id": session_id,
        "repo_url": repo_url,
        "selected_files": selected_files,
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "result": None
    }

    sessions_db[session_id] = session
    return session


def get_session(session_id: str):
    return sessions_db.get(session_id)


def update_session_result(session_id: str, result: dict):
    if session_id in sessions_db:
        sessions_db[session_id]["result"] = result
        sessions_db[session_id]["status"] = "completed"


def list_sessions():
    return list(sessions_db.values())
