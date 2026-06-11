import { useState, useMemo } from 'react';
import { useFetch } from './App';

const LINEA_COLOR = {
  R1: '#3B82F6', R2: '#10B981', R3: '#F59E0B',
  WP: '#8B5CF6', BOSCH: '#EC4899', OVEN: '#F97316', 
  SVC: '#6B7280', EXT: '#ef4444'
};

const formatearFechaLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function obtenerLunesDeSemanaISO(w, y = new Date().getFullYear()) {
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) {
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return formatearFechaLocal(ISOweekStart);
}

const fmt = (n) => (n != null ? Number(n).toLocaleString("es-MX") : "—");

export default function PlanSemanal() {
  const currentWeek = 18; // Puedes hacerlo dinámico después
  const [semana, setSemana] = useState(currentWeek);
  const [filtroLinea, setFiltroLinea] = useState("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const lunes = obtenerLunesDeSemanaISO(semana);
  const dLunes = new Date(lunes + "T00:00:00");
  const domingo = new Date(dLunes);
  domingo.setDate(dLunes.getDate() + 6);
  const strDomingo = formatearFechaLocal(domingo);

  const query = new URLSearchParams({
    fecha_inicio: lunes,
    fecha_fin: strDomingo
  });
  if (filtroLinea !== "TODOS") query.append("linea", filtroLinea);

  const { data: planRaw, loading } = useFetch(`/plan/agrupado/?${query.toString()}`);
  const { data: lineasDisponibles } = useFetch("/bom/lineas/");

  // Generamos los 7 días de la semana actual
  const fechas = useMemo(() => {
    const f = [];
    const cur = new Date(dLunes);
    for (let i = 0; i < 7; i++) {
      f.push(formatearFechaLocal(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return f;
  }, [lunes]);

  // Filtrado local por búsqueda
  const filtrado = useMemo(() => {
    if (!planRaw) return [];
    return planRaw.filter(r => 
      busqueda === "" ||
      r.no_parte?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.modelo?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [planRaw, busqueda]);

  // EXTRACCIÓN DINÁMICA DE LÍNEAS BASADA EN BOMCW
  const lineas = useMemo(() => {
    if (!filtrado) return [];
    // Recolectamos todas las líneas únicas resultantes
    const lineasUnicas = [...new Set(filtrado.map(r => r.linea || 'EXT'))];
    return lineasUnicas.sort();
  }, [filtrado]);

  const lineasLista = lineasDisponibles && lineasDisponibles.length > 0 
    ? lineasDisponibles 
    : ["R1", "R2", "R3", "WP", "BOSCH", "OVEN", "SVC", "EXT"];

  return (
    <div className="wrap">
      <div className="topbar">
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-h)' }}>Plan de Inyección</h2>
          <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>
            Semana {semana} ({lunes} al {strDomingo}) | <span style={{color: "var(--accent)"}}>Líneas según Ficha Técnica (BOMCW)</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setSemana(s => s - 1)}>◀ Ant</button>
          <button className="btn btn-primary" onClick={() => setSemana(currentWeek)}>Semana Actual</button>
          <button className="btn btn-ghost" onClick={() => setSemana(s => s + 1)}>Sig ▶</button>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div style={{ display: "flex", gap: 12, marginTop: 20, marginBottom: 16, flexWrap: "wrap" }}>
        <select
          value={filtroLinea}
          onChange={(e) => setFiltroLinea(e.target.value)}
          style={{ 
            padding: "8px 12px", borderRadius: "4px", border: "1px solid var(--border)", 
            background: "var(--surface)", color: "var(--text)", cursor: "pointer" 
          }}
        >
          <option value="TODOS">Todas las Líneas</option>
          {lineasLista.map(ln => <option key={ln} value={ln}>{ln}</option>)}
        </select>
        <input 
          className="search-box" 
          placeholder="Buscar por No. Parte o Descripción..." 
          value={busqueda} 
          onChange={e => setBusqueda(e.target.value)} 
        />
      </div>

      <div style={{ background: 'var(--surface)', borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
          <thead style={{ background: 'var(--surface2)', borderBottom: '1px solid var(--border)' }}>
            <tr>
              <th style={{ padding: '12px 16px', color: 'var(--muted)' }}>Línea</th>
              <th style={{ padding: '12px 16px', color: 'var(--muted)' }}>No. Parte</th>
              <th style={{ padding: '12px 16px', color: 'var(--muted)' }}>Descripción</th>
              {fechas.map(f => (
                <th key={f} style={{ padding: '12px 16px', color: 'var(--muted)', textAlign: 'right' }}>
                  {f.slice(5)} {/* Muestra MM-DD */}
                </th>
              ))}
              <th style={{ padding: '12px 16px', color: 'var(--accent)', textAlign: 'right' }}>Total Sem.</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>Cargando plan de la semana...</td></tr>
            ) : (!filtrado || filtrado.length === 0) ? (
              <tr><td colSpan={11} style={{ padding: 30, textAlign: 'center', color: 'var(--muted)' }}>No hay programación en la pestaña CW PLAN para esta semana.</td></tr>
            ) : (
              lineas.map(ln => {
                const piezasDeLinea = filtrado.filter(r => (r.linea || 'EXT') === ln);
                return piezasDeLinea.map((r, idx) => (
                  <tr key={`${ln}-${r.parte_id}`} style={{ borderBottom: '1px solid var(--border2)', background: 'var(--bg)' }}>
                    
                    {/* Renderizamos la línea solo en la primera fila del grupo para que se vea como un bloque */}
                    {idx === 0 ? (
                      <td rowSpan={piezasDeLinea.length} style={{ padding: '12px 16px', borderRight: '1px solid var(--border2)', verticalAlign: 'top', background: 'var(--surface)' }}>
                        <span style={{ 
                          background: `${LINEA_COLOR[ln] || '#6B7280'}20`, 
                          color: LINEA_COLOR[ln] || '#fff', 
                          padding: '4px 8px', borderRadius: 4, fontWeight: 600, fontSize: 11 
                        }}>
                          {ln}
                        </span>
                      </td>
                    ) : null}

                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-h)' }}>{r.no_parte}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text)', fontSize: 11 }}>{r.descripcion || r.modelo || '—'}</td>
                    
                    {/* Renderizamos las cantidades diarias */}
                    {fechas.map(f => {
                      const v = r.dias?.[f] || 0;
                      return (
                        <td key={f} className="mono" style={{ padding: '12px 16px', textAlign: 'right', color: v === 0 ? 'var(--muted)' : 'var(--text)' }}>
                          {v === 0 ? '—' : fmt(v)}
                        </td>
                      );
                    })}
                    <td className="mono" style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>
                      {fmt(r.total)}
                    </td>
                  </tr>
                ));
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}