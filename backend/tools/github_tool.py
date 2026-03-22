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
    """
    token = os.getenv("GITHUB_TOKEN")
    
    # Si no hay token, Github() funciona como anónimo, pero con límite más estricto
    g = Github(token) if token else Github()

    try:
        parts = repo_url.rstrip("/").split("/")
        repo_name = f"{parts[-2]}/{parts[-1]}"

        repo = g.get_repo(repo_name)
        
        # TRUCO NINJA: Usar get_git_tree para obtener todo en 1 sola llamada
        # recursive=True hace que nos devuelva todas las subcarpetas de golpe
        tree = repo.get_git_tree(repo.default_branch, recursive=True)

        files = []
        for element in tree.tree:
            # 'blob' significa archivo en la terminología de Git (los 'tree' son carpetas)
            if element.type == "blob":
                name = os.path.basename(element.path)
                extension = os.path.splitext(name)[1]
                
                # Ignoramos archivos gigantes o innecesarios como imágenes o .git
                if extension not in ['.png', '.jpg', '.jpeg', '.gif', '.mp4', '.svg', '.ico']:
                    files.append({
                        "name": name,
                        "path": element.path,
                        "extension": extension
                    })

        return files

    except GithubException as e:
        print(f"❌ Error de GitHub API: {e}")
        raise ValueError(f"No se pudo leer el repo. Verifica que sea público y exista: {e}")