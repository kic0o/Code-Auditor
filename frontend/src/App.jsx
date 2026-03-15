import { useState } from "react";
import RepoInput from "./components/RepoInput";
import StatusCard from "./components/StatusCard";
import "./App.css";

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (repoUrl) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });

      if (!response.ok) throw new Error("Error al conectar con el servidor");

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-badge">IA</div>
        <h1 className="app-title">Auditor de Código</h1>
        <p className="app-subtitle">
          Analiza la calidad, seguridad y arquitectura de tu repositorio
        </p>
      </header>

      <main className="app-main">
        <RepoInput onAnalyze={handleAnalyze} loading={loading} />
        {error && <div className="error-banner">⚠ {error}</div>}
        {result && <StatusCard result={result} />}
      </main>
    </div>
  );
}

export default App;
