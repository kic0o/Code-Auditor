// Archivo: frontend/src/components/RepoInput.jsx

import { useState, useRef } from "react";

function RepoInput({ onAnalyze, loading }) {
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(
      (f) => f.name.endsWith(".pdf") || f.name.endsWith(".docx")
    );
    setFiles((prev) => [...prev, ...valid]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => setDragging(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!url.trim()) return;
    onAnalyze(url.trim(), files);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="form-card">

      {/* Título */}
      <h2 className="form-title">Auditor de Código</h2>
      <p className="form-subtitle">
        Ingresa tu repositorio y opcionalmente sube documentos de arquitectura.
      </p>

      {/* URL del repositorio */}
      <label className="form-label">URL del repositorio</label>
      <input
        className="form-input"
        type="text"
        placeholder="https://github.com/usuario/repositorio"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />

      {/* Documentos de arquitectura */}
      <label className="form-label">
        Documentos de arquitectura{" "}
        <span className="form-label-optional">(opcional)</span>
      </label>

      <div
        className={`dropzone ${dragging ? "dropzone-active" : ""}`}
        onClick={() => inputRef.current.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx"
          multiple
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="dropzone-text">
          Arrastra tus archivos aquí o{" "}
          <span className="dropzone-link">haz clic para seleccionar</span>
        </p>
        <p className="dropzone-hint">PDF o DOCX</p>
      </div>

      {/* Lista de archivos subidos */}
      {files.length > 0 && (
        <div className="file-list">
          {files.map((file, index) => {
            const ext = file.name.split(".").pop().toUpperCase();
            return (
              <div key={index} className="file-item">
                <span className="file-ext-badge">{ext}</span>
                <span className="file-name">{file.name}</span>
                <button
                  className="file-remove"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Botón */}
      <button
        className={`submit-btn ${loading ? "loading" : ""}`}
        onClick={handleSubmit}
        disabled={loading || !url.trim()}
      >
        {loading ? (
          <>
            <span className="spinner" />
            Analizando...
          </>
        ) : (
          "Iniciar Auditoría"
        )}
      </button>

    </div>
  );
}

export default RepoInput;
