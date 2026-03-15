"""
GitHub Tool — Sprint 2
Archivo: backend/tools/github_tool.py

Responsabilidad: conectarse a GitHub API, leer archivos de un repo.
No usa LLM.
"""
from github import Github
from github import GithubException
import os


def get_repo_files(repo_url: str) -> list:
    """
    Dado el URL de un repo público de GitHub,
    devuelve una lista de archivos con su nombre, path y extensión.

    Ejemplo de retorno:
    [
        { "name": "main.py", "path": "src/main.py", "extension": ".py" },
        ...
    ]
    """
    token = os.getenv("GITHUB_TOKEN")
    g = Github(token)

    # Extraer owner/repo del URL
    # Ejemplo: https://github.com/usuario/repo -> usuario/repo
    parts = repo_url.rstrip("/").split("/")
    repo_name = f"{parts[-2]}/{parts[-1]}"

    repo = g.get_repo(repo_name)
    contents = repo.get_contents("")

    files = []
    while contents:
        file = contents.pop(0)
        if file.type == "dir":
            contents.extend(repo.get_contents(file.path))
        else:
            name = file.name
            extension = os.path.splitext(name)[1]
            files.append({
                "name": name,
                "path": file.path,
                "extension": extension
            })

    return files
