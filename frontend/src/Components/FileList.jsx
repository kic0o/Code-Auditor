// Archivo: frontend/src/components/FileList.jsx
// Muestra la lista de archivos obtenidos del repositorio

const EXTENSION_COLORS = {
  ".py":   { bg: "#3b82f620", border: "#3b82f6", label: "PY" },
  ".js":   { bg: "#f59e0b20", border: "#f59e0b", label: "JS" },
  ".jsx":  { bg: "#06b6d420", border: "#06b6d4", label: "JSX" },
  ".ts":   { bg: "#3b82f620", border: "#3b82f6", label: "TS" },
  ".tsx":  { bg: "#06b6d420", border: "#06b6d4", label: "TSX" },
  ".css":  { bg: "#a855f720", border: "#a855f7", label: "CSS" },
  ".html": { bg: "#f97316 20", border: "#f97316", label: "HTML" },
  ".json": { bg: "#22c55e20", border: "#22c55e", label: "JSON" },
  ".md":   { bg: "#6b708020", border: "#6b7080", label: "MD" },
};

const DEFAULT_COLOR = { bg: "#6b708020", border: "#6b7080", label: "FILE" };

function FileTag({ extension }) {
  const color = EXTENSION_COLORS[extension] || DEFAULT_COLOR;
  return (
    <span
      className="file-tag"
      style={{ background: color.bg, border: `1px solid ${color.border}`, color: color.border }}
    >
      {color.label}
    </span>
  );
}

function FileList({ data }) {
  if (!data) return null;

  return (
    <div className="filelist-card">
      <div className="filelist-header">
        <span className="filelist-title">Archivos del repositorio</span>
        <span className="filelist-count">{data.total} archivos</span>
      </div>

      <div className="filelist-scroll">
        {data.files.map((file, index) => (
          <div
            key={file.path}
            className="file-row"
            style={{ animationDelay: `${index * 0.03}s` }}
          >
            <FileTag extension={file.extension} />
            <span className="file-path">{file.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FileList;
