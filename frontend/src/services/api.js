const BASE_URL = 'https://code-auditor-backend.onrender.com';

export const getRepoFiles = async (repoUrl) => {
  const response = await fetch(`${BASE_URL}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_url: repoUrl, selected_files: [] }),
  });
  if (!response.ok) {
    const errorPayload = await response.json().catch(() => response.text());
    const error = new Error(`Error ${response.status}`);
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }
  return response.json();
};

export const analyzeStep = async (sessionId, filePaths, categoria, repoUrl, docs = []) => {
  const formData = new FormData();
  
  // Agregar datos de texto
  formData.append('session_id', sessionId || 'sesion-' + Date.now());
  formData.append('categoria', categoria);
  formData.append('repo_url', repoUrl);
  
  // Convertir el arreglo a string JSON para que FastAPI lo lea con json.loads()
  formData.append('file_paths', JSON.stringify(filePaths));

  // Iterar sobre los documentos y agregarlos al payload
  docs.forEach((docObj) => {
    // Verificamos que contenga el archivo binario real
    if (docObj.file) {
      formData.append('docs', docObj.file); // 'docs' debe coincidir con el nombre en FastAPI
    }
  });

  const response = await fetch(`${BASE_URL}/analyze/step`, {
    method: 'POST',
    // Fetch añade automáticamente el Content-Type: multipart/form-data
    body: formData,
  });

  if (!response.ok) throw new Error(`Error en análisis de ${categoria}`);
  return response.json();
};

export const applyPatches = async (sessionId, approvedFindings, repoPath) => {
  // 1. Recuperamos el token usando la llave exacta que encontraste
  const token = localStorage.getItem('code-auditor-github-token');

  const response = await fetch(`${BASE_URL}/apply-patches`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      // 🛡️ El token viaja seguro en la cabecera
      'Authorization': `Bearer ${token}` 
    },
    body: JSON.stringify({
      session_id: sessionId || 'sesion-actual',
      approved_findings: approvedFindings,
      repo_name: repoPath,
    }),
  });
  
  if (!response.ok) throw new Error('Error aplicando parches');
  return response.json();
};