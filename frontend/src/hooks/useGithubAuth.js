import { useState, useEffect } from 'react';

export function useGithubAuth() {
  const [showPrivateRepoAuth, setShowPrivateRepoAuth] = useState(false);
  const [githubAuthorized, setGithubAuthorized] = useState(false);
  const [repoAccessMessage, setRepoAccessMessage] = useState('');
  const [userGithubToken, setUserGithubToken] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('github_token');
    if (token) {
      setUserGithubToken(token);
      setGithubAuthorized(true);
      setShowPrivateRepoAuth(true);
      setRepoAccessMessage('Tu cuenta de GitHub ha sido vinculada. Ahora podemos crear PRs y leer repositorios privados.');
      window.history.replaceState({}, document.title, window.location.pathname);
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
    repoAccessMessage,
    userGithubToken,
    shouldShowPrivateRepoAuth,
  };
}
