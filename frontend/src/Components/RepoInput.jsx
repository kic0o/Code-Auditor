import { useState } from "react";

function RepoInput({ onAnalyze, loading }) {
  const [url, setUrl] = useState("");

  const handleSubmit = () => {
    if (!url.trim()) return;
    onAnalyze(url.trim());
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="repo-input-card">
      <label className="input-label">URL del Repositorio</label>
      <div className="input-row">
        <input
          className="repo-input"
          type="text"
          placeholder="https://github.com/usuario/repositorio"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <button
          className={`analyze-btn ${loading ? "loading" : ""}`}
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analizando...
            </>
          ) : (
            "Analizar →"
          )}
        </button>
      </div>
      <p className="input-hint">
        Soporta repositorios públicos de GitHub
      </p>
    </div>
  );
}

export default RepoInput;
