import { useState, useEffect } from 'react';

// Cambiamos la llave para guardar el token real
const GITHUB_TOKEN_STORAGE_KEY = 'code-auditor-github-token';

export function useGithubAuth() {
  const [showPrivateRepoAuth, setShowPrivateRepoAuth] = useState(false);
  const [githubAuthorized, setGithubAuthorized] = useState(false);
  const [repoAccessMessage, setRepoAccessMessage] = useState('');
  const [userGithubToken, setUserGithubToken] = useState(null);

  // --- NUEVA FUNCIÓN DE LOGOUT ---
  const logout = () => {
    window.localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
    setUserGithubToken(null);
    setGithubAuthorized(false);
    setRepoAccessMessage('');
    // Opcional: recargar la página para limpiar todo el estado de la app
    window.location.reload(); 
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('github_token');
    
    // 1. Revisamos si ya teníamos un token guardado de antes
    const persistedToken = window.localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY);

    // Si viene un token nuevo en la URL (Acaba de iniciar sesión)
    if (tokenFromUrl) {
      setUserGithubToken(tokenFromUrl);
      setGithubAuthorized(true);
      setShowPrivateRepoAuth(true);
      setRepoAccessMessage('Tu cuenta de GitHub ha sido vinculada. Ahora podemos crear PRs y leer repositorios privados.');
      
      // 🔥 LA CORRECCIÓN: Guardamos el token real en localStorage
      window.localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, tokenFromUrl);
      
      // Limpiamos la URL por seguridad
      window.history.replaceState({}, document.title, window.location.pathname);
    } 
    // Si no hay URL nueva, pero ya teníamos el token guardado en el navegador
    else if (persistedToken) {
      setUserGithubToken(persistedToken);
      setGithubAuthorized(true);
    }
  }, []);

  const shouldShowPrivateRepoAuth = (statusCode, payload) => {
    const detail = typeof payload === 'string' ? payload : payload?.detail || payload?.message || '';
    const normalized = detail.toLowerCase();
    if (statusCode === 401 || statusCode === 403) return true;
    return normalized.includes('privado') || normalized.includes('private') || normalized.includes('token');
  };

  return {
    showPrivateRepoAuth,
    setShowPrivateRepoAuth,
    githubAuthorized,
    setGithubAuthorized,
    repoAccessMessage,
    setRepoAccessMessage,
    userGithubToken,
    setUserGithubToken,
    shouldShowPrivateRepoAuth,
    logout
  };
}