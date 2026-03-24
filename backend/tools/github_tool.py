from github import Github, GithubException
import os

BINARY_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".svg", ".ico",
    ".mp4", ".mp3", ".wav", ".avi", ".mov",
    ".pdf", ".zip", ".rar", ".7z", ".tar", ".gz",
    ".exe", ".dll", ".so", ".bin", ".dat", ".class", ".jar"
}

IGNORED_FOLDERS = [
    "node_modules/",
    ".git/",
    "dist/",
    "build/",
    "__pycache__/",
    ".next/",
    "coverage/",
]

MAX_FILE_SIZE_BYTES = 100_000  # 100 KB


def get_github_client():
    token = os.getenv("GITHUB_TOKEN")
    return Github(token) if token else Github()


def extract_repo_name(repo_url: str) -> str:
    cleaned = repo_url.strip().rstrip("/")

    if cleaned.endswith(".git"):
        cleaned = cleaned[:-4]

    parts = cleaned.split("/")
    if len(parts) < 2:
        raise ValueError("URL de repositorio inválida.")

    return f"{parts[-2]}/{parts[-1]}"


def should_ignore_path(path: str) -> bool:
    return any(folder in path for folder in IGNORED_FOLDERS)


def is_binary_file(path: str) -> bool:
    extension = os.path.splitext(path)[1].lower()
    return extension in BINARY_EXTENSIONS


def get_repo_files(repo_url: str) -> list:
    """
    Dado el URL de un repo público de GitHub,
    devuelve una lista de archivos analizables.
    """
    g = get_github_client()

    try:
        repo_name = extract_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        tree = repo.get_git_tree(repo.default_branch, recursive=True)

        files = []
        for element in tree.tree:
            if element.type != "blob":
                continue

            if should_ignore_path(element.path):
                continue

            if is_binary_file(element.path):
                continue

            name = os.path.basename(element.path)
            extension = os.path.splitext(name)[1].lower()

            files.append({
                "name": name,
                "path": element.path,
                "extension": extension
            })

        return files

    except GithubException as e:
        raise ValueError(f"No se pudo leer el repo. Verifica que sea público y exista: {e}")


def get_file_content(repo_url: str, file_path: str) -> dict:
    """
    Obtiene el contenido de un archivo del repositorio.
    Valida binarios, tamaño máximo y decodificación UTF-8.
    """
    g = get_github_client()

    try:
        repo_name = extract_repo_name(repo_url)
        repo = g.get_repo(repo_name)
        file = repo.get_contents(file_path, ref=repo.default_branch)

        if isinstance(file, list):
            raise ValueError(f"La ruta {file_path} no corresponde a un archivo válido.")

        if should_ignore_path(file_path):
            raise ValueError("Archivo dentro de una carpeta ignorada.")

        if is_binary_file(file_path):
            raise ValueError("Archivo binario no analizable.")

        if file.size and file.size > MAX_FILE_SIZE_BYTES:
            raise ValueError(f"Archivo demasiado grande para analizar ({file.size} bytes).")

        try:
            content = file.decoded_content.decode("utf-8")
        except UnicodeDecodeError:
            raise ValueError("No se pudo decodificar el archivo como texto UTF-8.")

        return {
            "path": file_path,
            "content": content,
            "size": file.size
        }

    except GithubException as e:
        raise ValueError(f"No se pudo leer el archivo {file_path}: {e}")
