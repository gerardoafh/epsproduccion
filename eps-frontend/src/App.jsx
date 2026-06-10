import { useState, useEffect, useCallback, useRef } from "react";
import PlanCaptura from "./PlanCaptura";
import PlanSemanal from "./PlanSemanal";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const API = "http://localhost:8000";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => (n != null ? Number(n).toLocaleString("es-MX") : "—");
const LINEA_COLOR = {
  R1: "#3B82F6", R2: "#8B5CF6", R3: "#06B6D4",
  WP: "#10B981", BOSCH: "#F59E0B", EXTRA: "#EF4444",
  OVEN: "#F97316", SVC: "#6B7280", PT: "#94A3B8",
};

// ─── API HOOKS ────────────────────────────────────────────────────────────────
export function useFetch(url, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}${url}`);
      if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
      setData(await res.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => { load(); }, [load, ...deps]);
  return { data, loading, error, refetch: load };
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #09090b; --surface: #18181b; --surface2: #27272a;
    --border: #27272a; --border2: #3f3f46;
    --text: #f4f4f5; --muted: #a1a1aa;
    --accent: #3b82f6; --accent-hover: #2563eb;
    --green: #10b981; --amber: #f59e0b; --red: #ef4444; --purple: #8b5cf6;
    --mono: 'IBM Plex Mono', monospace; --sans: 'IBM Plex Sans', sans-serif;
    --radius: 8px;
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2);
  }

  /* SCROLLBAR */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: var(--bg); }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  body { background: var(--bg); color: var(--text); font-family: var(--sans); font-size: 13px; }
  .app { display: flex; height: 100vh; overflow: hidden; }

  /* SIDEBAR */
  .sidebar { width: 220px; min-width: 220px; background: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; }
  .sidebar-logo { padding: 24px 20px 20px; border-bottom: 1px solid var(--border); }
  .logo-tag { font-family: var(--mono); font-size: 9px; color: var(--muted); letter-spacing: .12em; text-transform: uppercase; }
  .logo-name { font-family: var(--mono); font-size: 18px; font-weight: 600; color: var(--text); margin-top: 2px; }
  .logo-sub { font-size: 10px; color: var(--muted); margin-top: 2px; }
  .nav { flex: 1; padding: 16px 0; display: flex; flex-direction: column; gap: 4px; }
  .nav-item { display: flex; align-items: center; gap: 12px; margin: 0 12px; padding: 10px 12px; border-radius: 6px; cursor: pointer; color: var(--muted); font-size: 12px; font-weight: 500; transition: all .2s ease; letter-spacing: .02em; }
  .nav-item:hover { color: var(--text); background: var(--surface2); }
  .nav-item.active { color: #fff; background: var(--accent); box-shadow: 0 2px 4px rgba(59,130,246,.25); }
  .nav-icon { font-size: 14px; width: 16px; text-align: center; opacity: 0.8; }
  .nav-item.active .nav-icon { opacity: 1; }
  .sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--border); }
  .sidebar-date { font-family: var(--mono); font-size: 9px; color: var(--muted); }

  /* MAIN */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar { height: 60px; min-height: 60px; background: rgba(24, 24, 27, 0.8); backdrop-filter: blur(8px); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 12px; z-index: 10; }
  .topbar-title { font-family: var(--mono); font-size: 13px; font-weight: 600; flex: 1; }
  .topbar-badge { font-family: var(--mono); font-size: 9px; padding: 4px 10px; border: 1px solid var(--border2); border-radius: 20px; color: var(--muted); letter-spacing: .08em; background: var(--surface); }
  .badge-live { border-color: var(--green); color: var(--green); }
  .badge-warn { border-color: var(--amber); color: var(--amber); }
  .content { flex: 1; overflow-y: auto; padding: 32px; background: var(--bg); }

  /* CARDS / KPI */
  .kpi-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
  .kpi { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; position: relative; overflow: hidden; box-shadow: var(--shadow); transition: transform 0.2s ease; }
  .kpi:hover { transform: translateY(-2px); border-color: var(--border2); }
  .kpi::before { content:''; position: absolute; top:0; left:0; right:0; height: 2px; background: var(--kpi-color, var(--accent)); }
  .kpi-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; font-family: var(--mono); }
  .kpi-value { font-family: var(--mono); font-size: 26px; font-weight: 600; color: var(--text); margin: 6px 0 2px; line-height: 1; }
  .kpi-sub { font-size: 10px; color: var(--muted); }
  .kpi-icon { position: absolute; right: 14px; top: 14px; font-size: 20px; opacity: .15; }

  /* SECTION */
  .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .section-title { font-family: var(--mono); font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: .1em; color: var(--text); white-space: nowrap; }
  .section-line { flex:1; height:1px; background: var(--border); }
  .section-count { font-family: var(--mono); font-size: 10px; color: var(--muted); }

  /* TABLE */
  .table-wrap { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; margin-bottom: 24px; box-shadow: var(--shadow); }
  .tbl { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
  .tbl th { background: var(--surface2); padding: 12px 16px; font-family: var(--mono); font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .1em; border-bottom: 1px solid var(--border); font-weight: 600; }
  .tbl td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text); transition: background .15s; }
  .tbl tr:last-child td { border-bottom: none; }
  .tbl tr:hover td { background: rgba(255,255,255,.02); }
  .mono { font-family: var(--mono); font-size: 11px; }
  .num { font-family: var(--mono); text-align: right; }

  /* TAGS */
  .tag { display: inline-block; padding: 1px 6px; border-radius: 2px; font-family: var(--mono); font-size: 9px; font-weight: 600; letter-spacing: .06em; }

  /* PLAN GRID */
  .plan-scroll { overflow-x: auto; }
  .plan-tbl { border-collapse: collapse; font-size: 11px; min-width: 900px; width: 100%; }
  .plan-tbl th { background: var(--surface2); padding: 8px 10px; font-family: var(--mono); font-size: 9px; color: var(--muted); text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid var(--border); white-space: nowrap; }
  .plan-tbl td { padding: 6px 10px; border-bottom: 1px solid var(--border); color: var(--text); white-space: nowrap; }
  .plan-tbl tr:last-child td { border-bottom: none; }
  .plan-tbl tr:hover td { background: rgba(255,255,255,.02); }
  .day-cell { font-family: var(--mono); text-align: right; min-width: 72px; }
  .day-zero { color: var(--muted); }
  .total-cell { font-family: var(--mono); font-weight: 600; color: var(--accent); text-align: right; }

  /* INV BAR */
  .inv-bar { height: 4px; border-radius: 2px; background: var(--border); overflow: hidden; margin-top: 4px; }
  .inv-fill { height: 100%; border-radius: 2px; transition: width .3s; }

  /* ALERTS */
  .alert { display: flex; align-items: flex-start; gap: 12px; padding: 16px; border-radius: var(--radius); margin-bottom: 12px; border: 1px solid; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
  .alert-red { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.25); }
  .alert-amber { background: rgba(245,158,11,.08); border-color: rgba(245,158,11,.25); }
  .alert-green { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.25); }
  .alert-blue { background: rgba(59,130,246,.08); border-color: rgba(59,130,246,.25); }
  .alert-icon { font-size: 14px; margin-top: 1px; }
  .alert-text { font-size: 12px; flex: 1; }
  .alert-title { font-weight: 600; margin-bottom: 2px; }
  .alert-sub { color: var(--muted); font-size: 11px; }

  /* FILTER BAR */
  .filter-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .filter-btn { padding: 6px 14px; border-radius: 20px; border: 1px solid var(--border); background: var(--surface); color: var(--muted); font-family: var(--mono); font-size: 10px; font-weight: 500; cursor: pointer; letter-spacing: .06em; transition: all .2s; }
  .filter-btn:hover { border-color: var(--border2); color: var(--text); background: var(--surface2); }
  .filter-btn.active { background: var(--accent); border-color: var(--accent); color: #fff; box-shadow: 0 2px 4px rgba(59,130,246,.3); }

  /* TABS */
  .tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); margin-bottom: 20px; }
  .tab { padding: 12px 20px; cursor: pointer; font-family: var(--mono); font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); border-bottom: 2px solid transparent; transition: all .2s; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--accent); border-bottom-color: var(--accent); }

  /* SEARCH */
  .search-box { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 8px 14px; color: var(--text); font-family: var(--mono); font-size: 11px; outline: none; width: 260px; transition: border .2s; }
  .search-box:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(59,130,246,.2); }
  .search-box::placeholder { color: var(--muted); }

  /* SKELETON */
  .skeleton { background: var(--border); border-radius: 4px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:.9} }

  /* UPLOAD ZONE */
  .upload-zone { border: 2px dashed var(--border); border-radius: var(--radius); padding: 40px; text-align: center; cursor: pointer; transition: all .2s; background: var(--surface); }
  .upload-zone:hover, .upload-zone.drag { border-color: var(--accent); background: rgba(59,130,246,.08); }
  .upload-zone-icon { font-size: 32px; margin-bottom: 10px; opacity: .5; }
  .upload-zone-text { font-size: 13px; color: var(--muted); }
  .upload-zone-sub { font-size: 11px; color: var(--muted); margin-top: 4px; opacity: .7; }
  
  /* BUTTONS */
  .btn { padding: 8px 16px; border-radius: 6px; border: none; font-family: var(--mono); font-size: 11px; font-weight: 500; cursor: pointer; transition: all .2s ease; letter-spacing: .04em; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
  .btn-primary { background: var(--accent); color: #fff; box-shadow: 0 2px 4px rgba(59,130,246,.3); }
  .btn-primary:hover:not(:disabled) { background: var(--accent-hover); transform: translateY(-1px); box-shadow: 0 4px 6px rgba(59,130,246,.4); }
  .btn-primary:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
  .btn-ghost { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
  .btn-ghost:hover { background: var(--surface2); border-color: var(--border2); }

  /* PROGRESS BAR */
  .progress-bar { height: 3px; background: var(--border); border-radius: 2px; overflow: hidden; margin: 8px 0; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width .3s; }

  /* SPARK */
  .spark { display: inline-flex; align-items: flex-end; gap: 2px; height: 20px; }
  .spark-bar { width: 5px; border-radius: 1px; background: var(--accent); min-height: 2px; }

  /* STATE MESSAGES */
  .state-box { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; color: var(--muted); gap: 10px; }
  .state-icon { font-size: 28px; opacity: .4; }
  .state-text { font-size: 13px; }
  .state-sub { font-size: 11px; opacity: .7; }
  .error-box { background: rgba(239,68,68,.08); border: 1px solid rgba(239,68,68,.2); border-radius: var(--radius); padding: 16px; color: #f87171; font-size: 12px; margin-bottom: 16px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 4px rgba(239,68,68,.05); }
`;

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
export function Tag({ linea }) {
  const color = LINEA_COLOR[linea] || "#6B7280";
  return <span className="tag" style={{ background: color + "22", color }}>{linea}</span>;
}

function Spark({ values = [] }) {
  const max = Math.max(...values, 1);
  return (
    <span className="spark">
      {values.map((v, i) => (
        <span key={i} className="spark-bar" style={{ height: `${Math.max(2, (v / max) * 20)}px`, opacity: v === 0 ? 0.15 : 0.7 }} />
      ))}
    </span>
  );
}

export function LoadingRows({ cols = 5, rows = 6 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j}><div className="skeleton" style={{ height: 12, width: `${50 + Math.random() * 40}%` }} /></td>
      ))}
    </tr>
  ));
}

export function ErrorBox({ message }) {
  return (
    <div className="error-box">
      ⚠ No se pudo conectar con el backend: <strong>{message}</strong>
      <br /><span style={{ opacity: .7 }}>Verifica que el servidor corre en {API}</span>
    </div>
  );
}

function EmptyState({ icon = "◫", text = "Sin datos", sub }) {
  return (
    <div className="state-box">
      <div className="state-icon">{icon}</div>
      <div className="state-text">{text}</div>
      {sub && <div className="state-sub">{sub}</div>}
    </div>
  );
}

// ─── UPLOAD PANEL ─────────────────────────────────────────────────────────────
function UploadPanel({ onSuccess }) {
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [fechaPlan, setFechaPlan] = useState(new Date().toISOString().split("T")[0]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!/\.(xlsb|xlsx)$/i.test(f.name)) { setError("Solo se aceptan archivos .xlsb o .xlsx"); return; }
    setFile(f); setError(null); setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true); setError(null); setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("fecha_plan", fechaPlan);
      const res = await fetch(`${API}/import/upload`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setResult(data);
      onSuccess?.();
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
        <div className="upload-zone-icon">📂</div>
        {file
          ? <><div className="upload-zone-text" style={{ color: "var(--text)" }}>📄 {file.name}</div><div className="upload-zone-sub">{(file.size / 1024).toFixed(0)} KB</div></>
          : <><div className="upload-zone-text">Arrastra tu archivo Excel aquí</div><div className="upload-zone-sub">.xlsb o .xlsx — Plan_de_EPS_*.xlsb</div></>
        }
        <input ref={inputRef} type="file" accept=".xlsb,.xlsx" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>Fecha del plan</label>
          <input type="date" value={fechaPlan} onChange={e => setFechaPlan(e.target.value)}
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3, padding: "6px 10px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }} />
        </div>
        <button className="btn btn-primary" disabled={!file || uploading} onClick={handleUpload} style={{ marginTop: 18 }}>
          {uploading ? "Importando..." : "Importar al servidor"}
        </button>
        {file && <button className="btn btn-ghost" onClick={() => { setFile(null); setResult(null); }} style={{ marginTop: 18 }}>Cancelar</button>}
      </div>

      {uploading && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>Procesando archivo...</div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: "60%" }} /></div>
        </div>
      )}

      {error && <div className="error-box" style={{ marginTop: 12 }}>⚠ {error}</div>}

      {result && (
        <div className="alert alert-green" style={{ marginTop: 14 }}>
          <div className="alert-icon" style={{ color: "var(--green)" }}>✓</div>
          <div className="alert-text">
            <div className="alert-title" style={{ color: "var(--green)" }}>Importación {result.status.toUpperCase()} — {result.nombre_archivo}</div>
            <div className="alert-sub">
              BOM: {result.filas_bom} · Inventario: {result.filas_inventario} · Plan: {result.filas_plan} · Cambios: {result.filas_cambios}
              {result.errores && <div style={{ marginTop: 4, color: "var(--amber)" }}>⚠ Advertencias: {result.errores.split("\n").length} filas con problemas</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ onRefresh }) {
  const [showUpload, setShowUpload] = useState(false);
  const { data: kpis, loading, error, refetch } = useFetch("/dashboard/kpis");
  const { data: alertas } = useFetch("/inventario/alertas/criticas");
  const { data: desviaciones } = useFetch(`/cambios/desviaciones/?fecha=${new Date().toISOString().split("T")[0]}`);
  const { data: logs } = useFetch("/import/logs?limit=3");

  const handleImportSuccess = () => { refetch(); onRefresh?.(); setShowUpload(false); };

  return (
    <div>
      {/* UPLOAD TOGGLE */}
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 8 }}>
        <button className="btn btn-ghost" onClick={refetch}>↻ Actualizar</button>
        <button className="btn btn-primary" onClick={() => setShowUpload(v => !v)}>
          {showUpload ? "✕ Cerrar" : "↑ Importar Excel"}
        </button>
      </div>

      {showUpload && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: 20, marginBottom: 24 }}>
          <div className="section-header"><div className="section-title">Importar archivo Excel</div><div className="section-line" /></div>
          <UploadPanel onSuccess={handleImportSuccess} />
        </div>
      )}

      {error && <ErrorBox message={error} />}

      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi" style={{ "--kpi-color": "#3B82F6" }}>
          <div className="kpi-label">Partes en catálogo</div>
          <div className="kpi-value">{loading ? <div className="skeleton" style={{height:26,width:60}} /> : fmt(kpis?.total_partes)}</div>
          <div className="kpi-sub">BOM: {fmt(kpis?.total_bom_items)} items</div>
          <div className="kpi-icon">📦</div>
        </div>
        <div className="kpi" style={{ "--kpi-color": "#10B981" }}>
          <div className="kpi-label">Inventario CW</div>
          <div className="kpi-value">{loading ? <div className="skeleton" style={{height:26,width:70}} /> : `${((kpis?.total_inventario || 0)/1000).toFixed(1)}K`}</div>
          <div className="kpi-sub">piezas en almacén</div>
          <div className="kpi-icon">🗃️</div>
        </div>
        <div className="kpi" style={{ "--kpi-color": (kpis?.partes_criticas || 0) > 0 ? "#EF4444" : "#10B981" }}>
          <div className="kpi-label">Alertas inventario</div>
          <div className="kpi-value" style={{ color: (kpis?.partes_criticas || 0) > 0 ? "var(--red)" : "var(--green)" }}>
            {loading ? <div className="skeleton" style={{height:26,width:40}} /> : (kpis?.partes_criticas || 0) + (kpis?.partes_bajo_minimo || 0)}
          </div>
          <div className="kpi-sub">críticas: {kpis?.partes_criticas || 0} · bajas: {kpis?.partes_bajo_minimo || 0}</div>
          <div className="kpi-icon">⚠️</div>
        </div>
        <div className="kpi" style={{ "--kpi-color": "#8B5CF6" }}>
          <div className="kpi-label">Cambios de molde hoy</div>
          <div className="kpi-value">{loading ? <div className="skeleton" style={{height:26,width:40}} /> : (kpis?.cambios_hoy_dia || 0) + (kpis?.cambios_hoy_noche || 0)}</div>
          <div className="kpi-sub">día: {kpis?.cambios_hoy_dia || 0} · noche: {kpis?.cambios_hoy_noche || 0}</div>
          <div className="kpi-icon">🔧</div>
        </div>
      </div>

      {/* ALERTAS CRITICAS */}
      <div className="section-header">
        <div className="section-title">Alertas de inventario crítico</div>
        <div className="section-line" />
        <div className="section-count">{alertas?.length || 0} partes</div>
      </div>

      {!alertas || alertas.length === 0
        ? <div className="alert alert-green"><div className="alert-icon" style={{color:"var(--green)"}}>✓</div><div className="alert-text"><div className="alert-title" style={{color:"var(--green)"}}>Sin alertas críticas de inventario</div><div className="alert-sub">Todas las partes están por encima del mínimo</div></div></div>
        : alertas.map(r => (
          <div key={r.id} className="alert alert-red">
            <div className="alert-icon" style={{color:"var(--red)"}}>▼</div>
            <div className="alert-text">
              <div className="alert-title" style={{color:"var(--red)"}}>Stock crítico — {r.no_parte}</div>
              <div className="alert-sub">{r.descripcion} · Línea {r.linea} · Stock: {fmt(r.cantidad)} pzas / Mínimo: {fmt(r.cantidad_minima)}</div>
            </div>
          </div>
        ))
      }

      {/* DESVIACIONES DENSIDAD */}
      {desviaciones && desviaciones.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 20 }}>
            <div className="section-title">Desviaciones de densidad hoy</div>
            <div className="section-line" />
            <div className="section-count">{desviaciones.length}</div>
          </div>
          {desviaciones.map(c => (
            <div key={c.id} className="alert alert-amber">
              <div className="alert-icon" style={{color:"var(--amber)"}}>!</div>
              <div className="alert-text">
                <div className="alert-title" style={{color:"var(--amber)"}}>Maq. {c.maquina} — {c.descripcion}</div>
                <div className="alert-sub">Turno {c.turno} · Plan: {c.densidad_plan} → Físico: {c.densidad_fisico} · Δ = {Math.abs((c.densidad_plan - c.densidad_fisico)).toFixed(3)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ÚLTIMAS IMPORTACIONES */}
      {logs && logs.length > 0 && (
        <>
          <div className="section-header" style={{ marginTop: 20 }}>
            <div className="section-title">Últimas importaciones</div>
            <div className="section-line" />
          </div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Archivo</th><th>Fecha</th><th>BOM</th><th>Inventario</th><th>Plan</th><th>Cambios</th><th>Status</th></tr></thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td className="mono" style={{fontSize:10}}>{l.nombre_archivo}</td>
                    <td className="mono" style={{fontSize:10}}>{new Date(l.fecha_import).toLocaleString("es-MX")}</td>
                    <td className="num">{fmt(l.filas_bom)}</td>
                    <td className="num">{fmt(l.filas_inventario)}</td>
                    <td className="num">{fmt(l.filas_plan)}</td>
                    <td className="num">{fmt(l.filas_cambios)}</td>
                    <td><span className="tag" style={{ background: l.status === "ok" ? "rgba(16,185,129,.2)" : "rgba(245,158,11,.2)", color: l.status === "ok" ? "var(--green)" : "var(--amber)" }}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ─── INVENTARIO ───────────────────────────────────────────────────────────────
function Inventario() {
  const [filtroLinea, setFiltroLinea] = useState("TODOS");
  const [filtroEst, setFiltroEst] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null); // { parte_id, cantidad, minimo }
  const [saving, setSaving] = useState(false);

  const params = new URLSearchParams();
  if (filtroLinea !== "TODOS") params.set("linea", filtroLinea);
  if (filtroEst !== "TODOS") params.set("estatus", filtroEst);
  if (busqueda) params.set("busqueda", busqueda);
  params.set("limit", "300");

  const { data, loading, error, refetch } = useFetch(`/inventario/?${params}`, [filtroLinea, filtroEst, busqueda]);

  const handleSave = async () => {
    if (!editando) return;
    setSaving(true);
    try {
      await fetch(`${API}/inventario/${editando.parte_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cantidad: editando.cantidad, cantidad_minima: editando.minimo }),
      });
      setEditando(null);
      refetch();
    } finally { setSaving(false); }
  };

  const estatusColor = { OK: "var(--green)", BAJO: "var(--amber)", CRÍTICO: "var(--red)", "SIN STOCK": "var(--muted)" };
  const totalInv = (data || []).reduce((a, r) => a + r.cantidad, 0);

  return (
    <div>
      <div className="kpi-grid">
        {["OK","BAJO","CRÍTICO"].map(est => {
          const count = (data || []).filter(r => r.estatus === est).length;
          const colors = { OK: "#10B981", BAJO: "#F59E0B", CRÍTICO: "#EF4444" };
          return (
            <div key={est} className="kpi" style={{ "--kpi-color": colors[est] }}>
              <div className="kpi-label">Estatus {est}</div>
              <div className="kpi-value" style={{ color: colors[est] }}>{loading ? "—" : count}</div>
              <div className="kpi-sub">partes</div>
            </div>
          );
        })}
        <div className="kpi" style={{ "--kpi-color": "#3B82F6" }}>
          <div className="kpi-label">Total visible</div>
          <div className="kpi-value">{loading ? "—" : `${(totalInv / 1000).toFixed(1)}K`}</div>
          <div className="kpi-sub">piezas en CW</div>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {["TODOS","R1","R2","R3","WP","BOSCH","OVEN"].map(ln => (
            <button key={ln} className={`filter-btn ${filtroLinea === ln ? "active" : ""}`} onClick={() => setFiltroLinea(ln)}>{ln}</button>
          ))}
        </div>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {["TODOS","OK","BAJO","CRÍTICO","SIN STOCK"].map(e => (
            <button key={e} className={`filter-btn ${filtroEst === e ? "active" : ""}`} onClick={() => setFiltroEst(e)}>{e}</button>
          ))}
        </div>
        <input className="search-box" placeholder="Buscar parte o descripción..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {/* Modal edición */}
      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border2)", borderRadius: 6, padding: 24, width: 340 }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Editar inventario — {editando.no_parte}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[["Cantidad actual", "cantidad"], ["Mínimo requerido", "minimo"]].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</label>
                  <input type="number" value={editando[key]} onChange={e => setEditando(v => ({ ...v, [key]: parseInt(e.target.value) || 0 }))}
                    style={{ display: "block", width: "100%", marginTop: 4, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3, padding: "7px 10px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 13, outline: "none" }} />
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "Guardando..." : "Guardar"}</button>
                <button className="btn btn-ghost" onClick={() => setEditando(null)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>No. Parte</th><th>Descripción</th><th>Línea</th>
              <th style={{textAlign:"right"}}>Inventario</th><th style={{textAlign:"right"}}>Mínimo</th>
              <th style={{minWidth:120}}>Nivel</th><th>Estatus</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <LoadingRows cols={8} rows={8} />
              : !data || data.length === 0
                ? <tr><td colSpan={8}><EmptyState icon="◫" text="Sin inventario" sub="Importa un Excel para cargar el inventario CW" /></td></tr>
                : data.map(r => {
                  const color = estatusColor[r.estatus] || "var(--muted)";
                  const pctVal = Math.min(100, r.cantidad_minima > 0 ? Math.round((r.cantidad / (r.cantidad_minima * 2)) * 100) : 100);
                  return (
                    <tr key={r.id}>
                      <td className="mono" style={{fontSize:10}}>{r.no_parte}</td>
                      <td style={{color:"var(--muted)",fontSize:11}}>{r.descripcion}</td>
                      <td><Tag linea={r.linea || "—"} /></td>
                      <td className="num" style={{color, fontWeight:600}}>{fmt(r.cantidad)}</td>
                      <td className="num" style={{color:"var(--muted)"}}>{fmt(r.cantidad_minima)}</td>
                      <td><div className="inv-bar"><div className="inv-fill" style={{width:`${pctVal}%`, background: color}} /></div></td>
                      <td><span className="tag" style={{background: color+"22", color}}>{r.estatus}</span></td>
                      <td>
                        <button className="btn btn-ghost" style={{padding:"3px 8px",fontSize:10}}
                          onClick={() => setEditando({ parte_id: r.parte_id, no_parte: r.no_parte, cantidad: r.cantidad, minimo: r.cantidad_minima })}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── CAMBIOS DE MOLDE ─────────────────────────────────────────────────────────
function CambiosMolde() {
  const [turno, setTurno] = useState("DÍA");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);

  const { data, loading, error } = useFetch(`/cambios/?fecha=${fecha}&turno=${encodeURIComponent(turno)}`, [fecha, turno]);
  const { data: desv } = useFetch(`/cambios/desviaciones/?fecha=${fecha}`, [fecha]);

  const getDesv = (c) => c.tiene_desviacion ? (Math.abs((c.densidad_plan || 0) - (c.densidad_fisico || 0)) > 0.005 ? "crit" : "warn") : "ok";
  const desColor = { ok: "var(--green)", warn: "var(--amber)", crit: "var(--red)" };

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <div>
          <label style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".08em" }}>Fecha</label>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
            style={{ display: "block", marginTop: 4, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 3, padding: "6px 10px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: 12, outline: "none" }} />
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi" style={{"--kpi-color":"#F59E0B"}}>
          <div className="kpi-label">Cambios turno día</div>
          <div className="kpi-value">{loading ? "—" : (data?.filter(c=>c.turno==="DÍA").length ?? 0)}</div>
          <div className="kpi-sub">{fecha}</div>
        </div>
        <div className="kpi" style={{"--kpi-color":"#8B5CF6"}}>
          <div className="kpi-label">Cambios turno noche</div>
          <div className="kpi-value">{loading ? "—" : (data?.filter(c=>c.turno==="NOCHE").length ?? 0)}</div>
          <div className="kpi-sub">{fecha}</div>
        </div>
        <div className="kpi" style={{"--kpi-color":"#EF4444"}}>
          <div className="kpi-label">Desviaciones densidad</div>
          <div className="kpi-value" style={{color:"var(--red)"}}>{desv?.length ?? 0}</div>
          <div className="kpi-sub">fuera de especificación</div>
        </div>
        <div className="kpi" style={{"--kpi-color":"#3B82F6"}}>
          <div className="kpi-label">Máquinas activas</div>
          <div className="kpi-value">{loading ? "—" : new Set(data?.map(c => c.maquina) || []).size}</div>
          <div className="kpi-sub">en el día</div>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="tabs">
        {["DÍA","NOCHE"].map(t => <div key={t} className={`tab ${turno === t ? "active" : ""}`} onClick={() => setTurno(t)}>Turno {t}</div>)}
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th><th>Máquina</th><th>No. Parte</th><th>Descripción</th>
              <th>Resina Plan</th><th>Resina Físico</th>
              <th style={{textAlign:"right"}}>Dens. Plan</th><th style={{textAlign:"right"}}>Dens. Físico</th>
              <th>Δ</th><th>Hora</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <LoadingRows cols={10} rows={7} />
              : !data || data.length === 0
                ? <tr><td colSpan={10}><EmptyState icon="⟳" text={`Sin cambios de molde — turno ${turno}`} sub="Importa un Excel para ver los cambios del día" /></td></tr>
                : data.map(c => {
                  const d = getDesv(c);
                  const delta = c.densidad_plan != null && c.densidad_fisico != null
                    ? (c.densidad_fisico - c.densidad_plan).toFixed(3)
                    : "—";
                  return (
                    <tr key={c.id}>
                      <td className="mono">{c.numero}</td>
                      <td className="mono" style={{color:"var(--accent)"}}>{c.maquina}</td>
                      <td className="mono" style={{fontSize:10}}>{c.no_parte_raw}</td>
                      <td style={{color:"var(--muted)",fontSize:11}}>{c.descripcion}</td>
                      <td className="mono">{c.resina_plan}</td>
                      <td className="mono">{c.resina_fisico}</td>
                      <td className="num">{c.densidad_plan?.toFixed(3) ?? "—"}</td>
                      <td className="num">{c.densidad_fisico?.toFixed(3) ?? "—"}</td>
                      <td><span className="mono" style={{color: desColor[d], fontSize:11}}>{d === "ok" ? "✓ OK" : delta}</span></td>
                      <td style={{color:"var(--muted)",fontSize:11}}>{c.hora_cambio}</td>
                    </tr>
                  );
                })
            }
          </tbody>
        </table>
      </div>

      {desv && desv.length > 0 && (
        <>
          <div className="section-header"><div className="section-title">Alertas de especificación</div><div className="section-line" /></div>
          {desv.map(c => (
            <div key={c.id} className={`alert ${getDesv(c) === "crit" ? "alert-red" : "alert-amber"}`}>
              <div className="alert-icon" style={{color: getDesv(c) === "crit" ? "var(--red)" : "var(--amber)"}}>!</div>
              <div className="alert-text">
                <div className="alert-title" style={{color: getDesv(c) === "crit" ? "var(--red)" : "var(--amber)"}}>Maq. {c.maquina} — {c.descripcion}</div>
                <div className="alert-sub">Turno {c.turno} · Plan: {c.densidad_plan?.toFixed(3)} → Físico: {c.densidad_fisico?.toFixed(3)} · Δ = {Math.abs((c.densidad_plan||0)-(c.densidad_fisico||0)).toFixed(3)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ─── BOM ─────────────────────────────────────────────────────────────────────
function BOM() {
  const [filtroLinea, setFiltroLinea] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const params = new URLSearchParams({ limit: "300" });
  if (filtroLinea !== "TODOS") params.set("linea", filtroLinea);
  if (busqueda) params.set("busqueda", busqueda);

  const { data, loading, error } = useFetch(`/bom/?${params}`, [filtroLinea, busqueda]);
  const { data: lineas } = useFetch("/bom/lineas/");

  const ptUnicos = new Set((data || []).map(r => r.pt_parte_id)).size;
  const compUnicos = new Set((data || []).map(r => r.comp_parte_id)).size;
  const lineaUnicos = new Set((data || []).map(r => r.linea).filter(Boolean)).size;

  return (
    <div>
      <div className="kpi-grid">
        <div className="kpi" style={{"--kpi-color":"#3B82F6"}}>
          <div className="kpi-label">Partes terminadas</div>
          <div className="kpi-value">{loading ? "—" : ptUnicos}</div>
          <div className="kpi-sub">productos únicos PT</div>
        </div>
        <div className="kpi" style={{"--kpi-color":"#10B981"}}>
          <div className="kpi-label">Componentes EPS</div>
          <div className="kpi-value">{loading ? "—" : compUnicos}</div>
          <div className="kpi-sub">componentes únicos</div>
        </div>
        <div className="kpi" style={{"--kpi-color":"#8B5CF6"}}>
          <div className="kpi-label">Líneas en BOM</div>
          <div className="kpi-value">{loading ? "—" : lineaUnicos}</div>
          <div className="kpi-sub">R1, R2, WP, OVEN, SVC...</div>
        </div>
        <div className="kpi" style={{"--kpi-color":"#F59E0B"}}>
          <div className="kpi-label">Registros totales</div>
          <div className="kpi-value">{loading ? "—" : (data?.length ?? 0)}</div>
          <div className="kpi-sub">en BOM activo</div>
        </div>
      </div>

      {error && <ErrorBox message={error} />}

      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {["TODOS", ...(lineas || [])].map(ln => (
            <button key={ln} className={`filter-btn ${filtroLinea === ln ? "active" : ""}`} onClick={() => setFiltroLinea(ln)}>{ln}</button>
          ))}
        </div>
        <input className="search-box" placeholder="Buscar parte, descripción o modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Línea</th><th>Modelo</th><th>No. Parte PT</th><th>Descripción PT</th>
              <th>No. Parte Comp.</th><th>Descripción Comp.</th>
              <th style={{textAlign:"right"}}>Qty</th><th>Tipo</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? <LoadingRows cols={8} rows={8} />
              : !data || data.length === 0
                ? <tr><td colSpan={8}><EmptyState icon="≡" text="Sin datos de BOM" sub="Importa un Excel para cargar la lista de materiales" /></td></tr>
                : data.map((r, i) => (
                  <tr key={i}>
                    <td><Tag linea={r.linea || "—"} /></td>
                    <td style={{color:"var(--muted)",fontSize:11}}>{r.modelo || "—"}</td>
                    <td className="mono" style={{fontSize:10}}>{r.pt_no_parte || r.pt_parte_id}</td>
                    <td style={{fontSize:11}}>{r.pt_desc}</td>
                    <td className="mono" style={{fontSize:10,color:"var(--accent)"}}>{r.comp_no_parte || r.comp_parte_id}</td>
                    <td style={{fontSize:11}}>{r.comp_desc}</td>
                    <td className="num">{r.qty_bom}</td>
                    <td><span className="tag" style={{background:"rgba(139,92,246,.15)",color:"#A78BFA"}}>{r.id1 || "EPS"}</span></td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── COMPONENTE: CATÁLOGO DE MÁQUINAS (MAQ) ──────────────────────────────────
function MaquinasView() {
  const { data: maquinas, loading, error } = useFetch("/maquinas/");

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div className="section-title">Parámetros de Inyección por Máquina</div>
        <div className="section-line" />
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Máquina</th>
              <th>No. Parte</th>
              <th style={{ textAlign: "center" }}>Cavidades</th>
              <th style={{ textAlign: "right" }}>C/T Teórico (s)</th>
              <th style={{ textAlign: "right" }}>Meta x Hr</th>
              <th style={{ textAlign: "right" }}>Meta Turno</th>
              <th style={{ textAlign: "right" }}>Peso Húmedo</th>
              <th style={{ textAlign: "right" }}>Peso Seco</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>Cargando catálogo de máquinas...</td></tr>
            ) : error ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--red)" }}>{error}</td></tr>
            ) : !maquinas || maquinas.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>Sin registros de máquinas.</td></tr>
            ) : (
              maquinas.map(m => (
                <tr key={m.id}>
                  <td><span className="tag" style={{ background: "var(--surface2)", color: "var(--accent)" }}>{m.maquina_nombre || "—"}</span></td>
                  <td className="mono" style={{ fontWeight: 500 }}>{m.no_parte_raw}</td>
                  <td className="mono" style={{ textAlign: "center" }}>{m.cavidades || "—"}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--amber)" }}>{m.ciclo_teorico ? `${m.ciclo_teorico}s` : "—"}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{m.meta_hora ? m.meta_hora.toLocaleString("es-MX") : "—"}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{m.meta_turno ? m.meta_turno.toLocaleString("es-MX") : "—"}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>{m.peso_humedo || "—"}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>{m.peso_seco || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── COMPONENTE: PLAN DE CORTES ──────────────────────────────────────────────
function CortesView() {
  const { data: cortes, loading, error } = useFetch("/cortes/");

  return (
    <div>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <div className="section-title">Programa de Área de Cortes (Hilo Caliente)</div>
        <div className="section-line" />
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Prioridad</th>
              <th>Fecha Plan</th>
              <th>No. Parte</th>
              <th style={{ textAlign: "right" }}>Densidad</th>
              <th style={{ textAlign: "right" }}>Piezas a Cortar</th>
              <th style={{ textAlign: "right" }}>Horas Trabajo Estimadas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>Cargando plan de cortes...</td></tr>
            ) : error ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--red)" }}>{error}</td></tr>
            ) : !cortes || cortes.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--muted)" }}>Sin plan de cortes registrado.</td></tr>
            ) : (
              cortes.map(c => (
                <tr key={c.id}>
                  <td style={{ textAlign: "center" }}>
                    <span className="tag" style={{ background: c.prioridad === 1 ? "rgba(239,68,68,0.15)" : "var(--surface2)", color: c.prioridad === 1 ? "var(--red)" : "var(--text)" }}>
                      {c.prioridad || "—"}
                    </span>
                  </td>
                  <td className="mono" style={{ color: "var(--muted)", fontSize: 11 }}>{c.fecha}</td>
                  <td className="mono" style={{ fontWeight: 500, color: "var(--accent)" }}>{c.no_parte_raw}</td>
                  <td className="mono" style={{ textAlign: "right" }}>{c.densidad || "—"}</td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: 600 }}>{c.piezas_plan ? c.piezas_plan.toLocaleString("es-MX") : "0"}</td>
                  <td className="mono" style={{ textAlign: "right", color: "var(--amber)" }}>{c.horas_trabajo ? `${c.horas_trabajo} hrs` : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
const NAVS = [
  { id: "dashboard", icon: "▦", label: "Dashboard" },
  { id: "plan",      icon: "▤", label: "Plan Semanal" }, // Existing Plan Semanal (view only)
  { id: "captura_plan", icon: "✎", label: "Captura Plan" }, // New Capture Plan (input)
  { id: "inventario",icon: "◫", label: "Inventario CW" },
  { id: "cambios",   icon: "⟳", label: "Cambios de Molde" },
  { id: "bom",       icon: "≡", label: "BOM / Materiales" },
  { id: "maquinas",  icon: "⚙️", label: "Máquinas (MAQ)" },
  { id: "cortes",    icon: "🔪", label: "Plan Cortes" },
];

const PAGE_TITLES = {
  dashboard:  "Dashboard · KPIs & Alertas",
  plan:       "Plan de Producción Semanal",
  captura_plan: "Captura y Gestión de Plan Diario", // Add title for the new page
  inventario: "Gestión de Inventario CW",
  cambios:    "Registro de Cambios de Molde",
  bom:        "Lista de Materiales (BOM)",
  maquinas:   "Catálogo de Máquinas",
  cortes:     "Programa de Área de Cortes",
};

export default function App() {
  const [pagina, setPagina] = useState("dashboard");
  const [refreshKey, setRefreshKey] = useState(0);
  const now = new Date();
  const fechaStr = `${String(now.getDate()).padStart(2,"0")}·${["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"][now.getMonth()]}·${now.getFullYear()}`;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="logo-tag">Sistema EPS</div>
            <div className="logo-name">PRODPLAN</div>
            <div className="logo-sub">Planta de manufactura</div>
          </div>
          <nav className="nav">
            {NAVS.map(n => (
              <div key={n.id} className={`nav-item ${pagina === n.id ? "active" : ""}`} onClick={() => setPagina(n.id)}>
                <span className="nav-icon">{n.icon}</span>
                {n.label}
              </div>
            ))}
          </nav>
          <div className="sidebar-footer">
            <div className="sidebar-date">{fechaStr}</div>
            <div style={{fontSize:10,color:"var(--muted)",marginTop:4}}>
              API: <span style={{color:"var(--accent)"}}>{API}</span>
            </div>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="topbar-title">{PAGE_TITLES[pagina]}</div>
            <span className="topbar-badge badge-live">● EN LÍNEA</span>
            <span className="topbar-badge">{fechaStr}</span>
          </div>
          <div className="content">
            {pagina === "dashboard"    && <Dashboard onRefresh={() => setRefreshKey(k => k + 1)} key={refreshKey} />}
            {pagina === "plan"         && <PlanSemanal />}
            {pagina === "captura_plan" && <PlanCaptura />} {/* Render the PlanCaptura component here */}
            {pagina === "inventario"   && <Inventario />}
            {pagina === "cambios"      && <CambiosMolde />}
            {pagina === "bom"          && <BOM />}
            {pagina === "maquinas"     && <MaquinasView />}
            {pagina === "cortes"       && <CortesView />}
          </div>
        </main>
      </div>
    </>
  );
}