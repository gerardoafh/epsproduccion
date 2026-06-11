import { useState, useRef } from "react";

const API = "http://localhost:8000";

export default function BomInternoUpload({ onSuccess }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) {
      setError("Solo se aceptan archivos .csv, .xlsx o .xls");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API}/import/bom-interno`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);

      setResult(data);
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        className={`upload-zone ${drag ? "drag" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]); }}
      >
        <div className="upload-zone-icon">📋</div>
        {file ? (
          <>
            <div className="upload-zone-text" style={{ color: "var(--text)" }}>📄 {file.name}</div>
            <div className="upload-zone-sub">{(file.size / 1024).toFixed(0)} KB</div>
          </>
        ) : (
          <>
            <div className="upload-zone-text">Arrastra la Ficha Técnica aquí</div>
            <div className="upload-zone-sub">.xlsx o .csv — BOMCW</div>
          </>
        )}
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <button className="btn btn-primary" disabled={!file || uploading} onClick={handleUpload}>
          {uploading ? "Procesando..." : "Subir Ficha Técnica"}
        </button>
        {file && (
          <button className="btn btn-ghost" onClick={() => { setFile(null); setResult(null); }}>
            Cancelar
          </button>
        )}
      </div>

      {uploading && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Procesando en base de datos...</div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: "60%" }} /></div>
        </div>
      )}

      {error && <div className="error-box" style={{ marginTop: 12 }}>⚠ {error}</div>}
    </div>
  );
}