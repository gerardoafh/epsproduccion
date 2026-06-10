import { useState } from 'react'
import { useFetch } from './App'

const LINEA_COLOR = {
  R1: '#3B82F6',
  R2: '#10B981',
  R3: '#F59E0B',
  WP: '#8B5CF6',
  BOSCH: '#EC4899',
  EXTRA: '#6B7280'
}

// Funciones Helper para evitar bugs de zona horaria (Timezone Agnostic)
const formatearFechaLocal = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function obtenerLunesDeSemanaISO(w, y = 2026) {
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

const Tag = ({ linea }) => {
  const bg = LINEA_COLOR[linea] ? `${LINEA_COLOR[linea]}20` : '#242a38'
  const color = LINEA_COLOR[linea] || 'var(--muted)'
  return <span className="tag" style={{ background: bg, color }}>{linea}</span>
}

const ErrorBox = ({ message }) => (
  <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 4, color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 16 }}>
    ⚠ Error de Conexión: {message}
  </div>
)

const LoadingRows = ({ cols, rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} style={{ opacity: .5 }}>
        <td colSpan={cols} style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 11 }}>
          Solicitando registros de producción a PostgreSQL...
        </td>
      </tr>
    ))}
  </>
)

const fmt = n => n != null ? Number(n).toLocaleString('es-MX') : '—'

export default function PlanSemanal() {
  const [lunes, setLunes] = useState(() => {
    const today = new Date();
    const day = today.getDay() || 7;
    const diff = today.getDate() - day + 1;
    const date = new Date(today.setDate(diff));
    return formatearFechaLocal(date);
  });

  const [filtroLinea, setFiltroLinea] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Consultar semanas dinámicas con datos en el servidor
  const { data: semanasDisponibles } = useFetch('/plan/semanas/');

  const d = new Date(lunes + 'T12:00:00');
  const fin = new Date(d);
  fin.setDate(d.getDate() + 6);
  const fechaFinStr = formatearFechaLocal(fin);

  const labelSemana = `Semana del ${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })} al ${fin.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const url = `/plan/agrupado/?fecha_inicio=${lunes}&fecha_fin=${fechaFinStr}${filtroLinea !== 'TODOS' ? `&linea=${filtroLinea}` : ''}`;
  const { data: planRaw, loading, error, refetch } = useFetch(url, [lunes, filtroLinea]);

  // Generar el arreglo de las columnas de días
  const fechas = [];
  const curr = new Date(d);
  while (curr <= fin) {
    fechas.push(formatearFechaLocal(curr));
    curr.setDate(curr.getDate() + 1);
  }

  const diaLabel = (iso) => {
    const [ , , dd] = iso.split('-');
    const d = new Date(iso + 'T12:00:00');
    return `${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()]} ${dd}`;
  };

  const moverSemana = (dias) => {
    const nueva = new Date(lunes + 'T12:00:00');
    nueva.setDate(nueva.getDate() + dias);
    setLunes(formatearFechaLocal(nueva));
  };

  const filtrado = (planRaw || []).filter(r =>
    busqueda === '' ||
    r.no_parte?.toLowerCase().includes(busqueda.toLowerCase()) ||
    r.modelo?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const lineas = ['R1', 'R2', 'R3', 'WP', 'BOSCH', 'EXTRA'];

  return (
    <div>
      {/* Barra de Navegación y Filtros de Tiempo */}
      <div className="tabs" style={{ alignItems: 'center', gap: 16, paddingBottom: 12, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => moverSemana(-7)}>◀ Ant.</button>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{labelSemana}</span>
        <button className="btn btn-ghost btn-sm" onClick={() => moverSemana(7)}>Sig. ▶</button>
        
        {/* Selector de semanas con datos reales */}
        {semanasDisponibles && semanasDisponibles.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 12 }}>
            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Saltar a:</span>
            <select 
              className="field-input" 
              style={{ padding: '4px 8px', fontSize: 11, width: 'auto', cursor: 'pointer', height: '28px' }}
              onChange={(e) => {
                if (e.target.value) {
                  setLunes(obtenerLunesDeSemanaISO(parseInt(e.target.value)));
                }
              }}
              defaultValue=""
            >
              <option value="" disabled>— Semanas con registros —</option>
              {semanasDisponibles.map(sem => (
                <option key={sem} value={sem}>Semana W{String(sem).padStart(2, '0')}</option>
              ))}
            </select>
          </div>
        )}

        <input
          type="date"
          value={lunes}
          onChange={e => {
            if (!e.target.value) return;
            const date = new Date(e.target.value + 'T12:00:00');
            const day = date.getDay() || 7;
            date.setDate(date.getDate() - day + 1);
            setLunes(formatearFechaLocal(date));
          }}
          style={{ marginLeft: 16, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 3, padding: '5px 10px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 11, outline: 'none', cursor: 'pointer', height: '28px' }}
        />
        <button className="btn btn-primary btn-sm" onClick={refetch} style={{ marginLeft: 'auto' }}>↻ Actualizar</button>
      </div>

      {/* Caja de Búsqueda y Filtros por Línea */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div className="filter-bar" style={{ marginBottom: 0 }}>
          {['TODOS', 'R1', 'R2', 'R3', 'WP', 'BOSCH', 'EXTRA'].map(ln => (
            <button key={ln} className={`filter-btn ${filtroLinea === ln ? 'active' : ''}`} onClick={() => setFiltroLinea(ln)}>{ln}</button>
          ))}
        </div>
        <input className="search-box" placeholder="Buscar parte o modelo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
      </div>

      {error && <ErrorBox message={error} />}

      {/* Tabla Principal — Cambiada a className="tbl" para heredar estilos CSS */}
      <div className="table-wrap" style={{ overflowX: 'auto' }}>
        <table className="tbl" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th>Línea</th>
              <th style={{ minWidth: 120 }}>No. Parte</th>
              <th style={{ minWidth: 160 }}>Modelo / Descripción</th>
              {fechas.map(f => <th key={f} style={{ textAlign: 'right' }}>{diaLabel(f)}</th>)}
              <th style={{ textAlign: 'right', color: 'var(--accent)' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <LoadingRows cols={4 + fechas.length} rows={6} />
            ) : filtrado.length === 0 ? (
                <tr>
                  <td colSpan={4 + fechas.length}>
                    <div style={{ textAlign: 'center', padding: '40px 24px', color: 'var(--muted)' }}>
                      <div style={{ fontSize: 24, marginBottom: 8, opacity: .3 }}>▤</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Sin datos de plan para esta semana</div>
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7, marginBottom: 14 }}>
                        El rango visualizado no coincide con las fechas asignadas durante la importación del Excel.
                      </div>
                      
                      {semanasDisponibles && semanasDisponibles.length > 0 && (
                        <div style={{ background: 'var(--surface2)', padding: 12, borderRadius: 4, display: 'inline-block', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: 11, display: 'block', marginBottom: 8, color: 'var(--text)' }}>
                            Selecciona una semana con datos válidos en PostgreSQL:
                          </span>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {semanasDisponibles.map(sem => (
                              <button 
                                key={sem} 
                                className="btn btn-primary btn-sm"
                                onClick={() => setLunes(obtenerLunesDeSemanaISO(sem))}
                              >
                                Abrir Semana W{String(sem).padStart(2, '0')}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filtrado.map(r => (
                  <tr key={r.parte_id}>
                    <td><Tag linea={r.linea || '—'} /></td>
                    <td className="mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{r.no_parte}</td>
                    <td style={{ color: 'var(--text)', fontSize: 11 }}>{r.descripcion || r.modelo || '—'}</td>
                    {fechas.map(f => {
                      const v = r.dias?.[f] || 0;
                      return <td key={f} className="mono" style={{ textAlign: 'right', color: v === 0 ? 'var(--muted)' : 'var(--text)', opacity: v === 0 ? 0.4 : 1 }}>{v === 0 ? '—' : fmt(v)}</td>;
                    })}
                    <td className="mono" style={{ textAlign: 'right', fontWeight: 600, color: 'var(--accent)' }}>{fmt(r.total)}</td>
                  </tr>
                ))
              )}
          </tbody>
        </table>
      </div>

      {/* Resumen de Carga por Línea inferior */}
      {!loading && planRaw && planRaw.length > 0 && (
        <div className="kpi-grid" style={{ marginTop: 16 }}>
          {lineas.map(ln => {
            const rows = planRaw.filter(r => r.linea === ln);
            const total = rows.reduce((a, r) => a + r.total, 0);
            return (
              <div key={ln} className="kpi" style={{ '--kpi-color': LINEA_COLOR[ln] || '#6B7280' }}>
                <div className="kpi-label">Línea {ln}</div>
                <div className="kpi-value" style={{ color: LINEA_COLOR[ln] }}>{(total / 1000).toFixed(1)}K</div>
                <div className="kpi-sub">{rows.length} referencias</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}