import { useState } from "react";
import { useFetch } from "./App";

const fmt = (n, d = 3) => (n != null ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d }) : "—");

export default function PlanDia() {
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [turno, setTurno] = useState("DÍA");

  const { data, loading } = useFetch(`/maquinas/?fecha=${fecha}&turno=${turno}`);

  return (
    <div style={{ padding: "20px", maxWidth: "1600px", margin: "0 auto" }}>
      
      {/* HEADER CONTROLS */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0, color: "var(--text-h)", fontSize: "1.4rem" }}>Plan Operativo de Máquinas (Hoja MAQ)</h2>
          <p style={{ color: "var(--muted)", margin: "4px 0 0 0", fontSize: "12px" }}>
            Visualización integral de parámetros físicos, resinas, metas de inyección y estatus de calidad.
          </p>
        </div>
        
        <div style={{ display: "flex", gap: "12px" }}>
          <input 
            type="date" 
            value={fecha} 
            onChange={e => setFecha(e.target.value)}
            style={{ padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "4px", fontSize: "13px" }}
          />
          <select 
            value={turno} 
            onChange={e => setTurno(e.target.value)}
            style={{ padding: "8px 12px", background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)", borderRadius: "4px", fontWeight: "bold", fontSize: "13px" }}
          >
            <option value="DÍA">☀️ TURNO DIA</option>
            <option value="NOCHE">🌙 TURNO NOCHE</option>
          </select>
        </div>
      </div>

      {/* TABLA INTEGRAL DE INYECCIÓN */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", textAlign: "left", whiteSpace: "nowrap" }}>
          <thead>
            <tr style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
              <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Maq. Actual</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "center" }}>Prio</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)" }}>No. Parte</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Descripción / Modelo</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Línea</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Resina (Plan/Fís)</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "right" }}>Densidad (Plan/Fís)</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "right" }}>Pesos (Hum/Sec)</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "center" }}>Cav</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "right" }}>C/T Teor</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "right" }}>Meta 1Hr</th>
              <th style={{ padding: "12px 10px", color: "var(--accent)", textAlign: "right" }}>Meta Turno</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)", textAlign: "center" }}>Calidad</th>
              <th style={{ padding: "12px 10px", color: "var(--muted)" }}>Cambio / Obs</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="14" style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>Sincronizando registros del piso de producción...</td></tr>
            ) : !data || data.length === 0 ? (
              <tr><td colSpan="14" style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>No hay plan cargado para la combinación de Fecha y Turno seleccionada.</td></tr>
            ) : (
              data.map((r, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border2)", background: "var(--bg)" }} className="hover-row">
                  {/* MAQUINA */}
                  <td style={{ padding: "10px", fontWeight: 700, color: "var(--accent)" }}>{r.actual_maq}</td>
                  
                  {/* PRIORIDAD */}
                  <td style={{ padding: "10px", textAlign: "center", fontWeight: 600 }}>{r.prioridad}</td>
                  
                  {/* NO PARTE */}
                  <td style={{ padding: "10px", fontWeight: 700, color: "var(--text-h)" }}>{r.no_parte}</td>
                  
                  {/* DESCRIPCION Y MODELO */}
                  <td style={{ padding: "10px", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <div style={{ fontWeight: 500 }}>{r.descripcion}</div>
                    <div style={{ fontSize: "9px", color: "var(--muted)", marginTop: "2px" }}>{r.modelo}</div>
                  </td>
                  
                  {/* LINEA */}
                  <td style={{ padding: "10px", fontWeight: 600 }}>{r.linea}</td>
                  
                  {/* RESINAS */}
                  <td style={{ padding: "10px", color: "var(--text)" }}>
                    <span style={{ color: "var(--muted)" }}>P:</span> {r.resin_plano} <br />
                    <span style={{ color: "var(--accent)" }}>F:</span> {r.resin_fisico}
                  </td>
                  
                  {/* DENSIDADES */}
                  <td className="mono" style={{ padding: "10px", textAlign: "right" }}>
                    <div>{fmt(r.densidad_plano, 3)}</div>
                    <div style={{ color: "var(--accent)" }}>{fmt(r.densidad_fisico, 3)}</div>
                  </td>
                  
                  {/* PESOS */}
                  <td className="mono" style={{ padding: "10px", textAlign: "right" }}>
                    <div>{fmt(r.peso_humedo, 1)}g <span style={{fontSize: "9px", color:"var(--muted)"}}>H</span></div>
                    <div>{fmt(r.peso_seco, 1)}g <span style={{fontSize: "9px", color:"var(--muted)"}}>S</span></div>
                  </td>
                  
                  {/* CAVIDADES */}
                  <td className="mono" style={{ padding: "10px", textAlign: "center", fontWeight: 600 }}>{r.cavidades}</td>
                  
                  {/* CICLO TEORICO */}
                  <td className="mono" style={{ padding: "10px", textAlign: "right", color: "var(--green)", fontWeight: 600 }}>{r.ciclo_teorico ? `${r.ciclo_teorico}s` : "—"}</td>
                  
                  {/* METAS */}
                  <td className="mono" style={{ padding: "10px", textAlign: "right" }}>{r.meta_hora ? Number(r.meta_hora).toLocaleString("es-MX") : "—"}</td>
                  <td className="mono" style={{ padding: "10px", textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{r.meta_turno ? Number(r.meta_turno).toLocaleString("es-MX") : "—"}</td>
                  
                  {/* CALIDAD */}
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <span style={{ 
                      background: r.calidad === "OK" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)", 
                      color: r.calidad === "OK" ? "var(--green)" : "var(--amber)",
                      padding: "2px 6px", borderRadius: "4px", fontWeight: "bold", fontSize: "10px"
                    }}>
                      {r.calidad}
                    </span>
                  </td>
                  
                  {/* OBSERVACIONES */}
                  <td style={{ padding: "10px", color: "var(--muted)", fontStyle: "italic", fontSize: "10px" }}>{r.cambio}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <style>{`
        .hover-row:hover { background: var(--surface2) !important; }
      `}</style>
    </div>
  );
}