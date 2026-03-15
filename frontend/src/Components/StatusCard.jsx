function StatusCard({ result }) {
  const statusColor = {
    pending: "#f0a500",
    done: "#22c55e",
    error: "#ef4444",
  };

  return (
    <div className="status-card">
      <div className="status-header">
        <span
          className="status-dot"
          style={{ background: statusColor[result.status] || "#aaa" }}
        />
        <span className="status-label">{result.message}</span>
      </div>
      <div className="status-body">
        <div className="status-row">
          <span className="status-key">Repositorio</span>
          <a
            className="status-value link"
            href={result.repo_url}
            target="_blank"
            rel="noreferrer"
          >
            {result.repo_url}
          </a>
        </div>
        <div className="status-row">
          <span className="status-key">Estado</span>
          <span className="status-value">{result.status}</span>
        </div>
      </div>
      <p className="status-note">
        ✦ Sprint 2: aquí aparecerá la lista de archivos del repositorio
      </p>
    </div>
  );
}

export default StatusCard;
