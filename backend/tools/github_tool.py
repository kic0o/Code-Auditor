"""
GitHub Tool — Sprint 2
Responsabilidad: clonar repo, leer archivos, crear Pull Requests.
No usa LLM.
"""
from github import Github
import os


def get_repo_files(repo_url: str) -> list:
    """
    Dado el URL de un repo público de GitHub,
    devuelve una lista de archivos con su nombre, path y contenido.

    Ejemplo de retorno:
    [
        { "name": "main.py", "path": "src/main.py", "content": "..." },
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
            try:
                files.append({
                    "name": file.name,
                    "path": file.path,
                    "content": file.decoded_content.decode("utf-8")
                })
            except Exception:
                # Ignorar archivos binarios
                pass

    return files
