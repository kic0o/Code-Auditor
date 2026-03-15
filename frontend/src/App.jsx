// Archivo: frontend/src/App.jsx
// Actualizado en Sprint 2: agrega llamada al endpoint /files y muestra FileList

import { useState } from "react";
import RepoInput from "./components/RepoInput";
import StatusCard from "./components/StatusCard";
import FileList from "./components/FileList";
import "./App.css";

function App() {
  const [result, setResult] = useState(null);
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async (repoUrl) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setFileData(null);

    try {
      // Sprint 1 — confirmar que llegó el repo
      const analyzeRes = await fetch("http://localhost:8000/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      if (!analyzeRes.ok) throw new Error("Error al conectar con el servidor");
      const analyzeData = await analyzeRes.json();
      setResult(analyzeData);

      // Sprint 2 — obtener lista de archivos del repo
      const filesRes = await fetch("http://localhost:8000/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_url: repoUrl }),
      });
      if (!filesRes.ok) throw new Error("Error al obtener los archivos del repositorio");
      const filesData = await filesRes.json();
      setFileData(filesData);

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
        {fileData && <FileList data={fileData} />}
      </main>
    </div>
  );
}

export default App;
