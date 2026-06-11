import React, { useState, useEffect } from "react";
import BomInternoUpload from "./BomInternoUpload";

const API = "http://localhost:8000";

// Helper para formato numérico de precisión
const fmt = (n, decimals = 3) => 
  (n != null ? Number(n).toLocaleString("es-MX", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : "—");

export default function BOM() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [lineaFiltro, setLineaFiltro] = useState(""); // Estado para el filtro de línea
  const [refreshKey, setRefreshKey] = useState(0);
  const [expandedRows, setExpandedRows] = useState([]); // Controla qué filas están abiertas
  const [lineasDisponibles, setLineasDisponibles] = useState([]); // Ahora dinámico

  // Efecto para cargar las líneas directamente de la base de datos
  useEffect(() => {
    const fetchLineas = async () => {
      try {
        const res = await fetch(`${API}/bom/lineas/`);
        if (!res.ok) throw new Error("Error al cargar líneas");
        const data = await res.json();
        setLineasDisponibles(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchLineas();
  }, [refreshKey]); // Se recarga si subes un nuevo archivo

  // Efecto para buscar los datos. Usamos debounce (setTimeout) para no saturar el server al escribir
  useEffect(() => {
    const fetchBOM = async () => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (busqueda) query.append("busqueda", busqueda);
        if (lineaFiltro) query.append("linea", lineaFiltro);

        const res = await fetch(`${API}/bom/?${query.toString()}`);
        if (!res.ok) throw new Error("Error al cargar el BOM");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const delay = setTimeout(fetchBOM, 300);
    return () => clearTimeout(delay);
  }, [busqueda, lineaFiltro, refreshKey]);

  // Función para abrir/cerrar filas
  const toggleRow = (id) => {
    setExpandedRows(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // Función para exportar TODO a CSV
  const exportarCSV = () => {
    if (!data || data.length === 0) return;

    const headers = [
      "Línea", "Modelo", "Componente EPS", "Descripción", "Cliente", "ID1", "ID2",
      "Producto Padre", "Qty", "Resina", "Densidad", "Molde", 
      "Cavidades", "Ciclo (s)", "Peso Seco (kg)", "Peso Humedo (kg)", "Material $", "Total $", "Tipo"
    ];

    let csvContent = "\uFEFF" + headers.join(",") + "\n";

    data.forEach(row => {
      const valores = [
        row.linea || "—",
        row.modelo || "—",
        row.comp_no_parte || "—",
        `"${(row.comp_desc || "—").replace(/"/g, '""')}"`,
        row.cliente || "—",
        row.id1 || "—",
        row.id2 || "—",
        row.pt_no_parte || "—",
        row.qty_bom || "1",
        row.resina || "—",
        row.densidad || "—",
        row.molde || "—",
        row.cavidades || "—",
        row.ciclo || "—",
        row.peso_seco || "—",
        row.peso_humedo || "—",
        row.material_usd || "—",
        row.total_usd || "—",
        row.equipo_type || "—"
      ];
      csvContent += valores.join(",") + "\n";
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `BOMCW_Maestro_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: "20px", maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* ─── CABECERA ─── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "20px" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--text)" }}>Catálogo Maestro & Fichas Técnicas (BOMCW)</h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: "4px" }}>
            Haz clic en una pieza para ver su ficha técnica completa.
          </p>
          
          <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
            {/* Buscador */}
            <input
              type="text"
              placeholder="Buscar por No. Parte..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ 
                padding: "8px 12px", width: "280px", borderRadius: "4px", 
                border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)" 
              }}
            />

            {/* Filtro por Línea */}
            <select
              value={lineaFiltro}
              onChange={(e) => setLineaFiltro(e.target.value)}
              style={{ 
                padding: "8px 12px", borderRadius: "4px", border: "1px solid var(--border)", 
                background: "var(--surface)", color: "var(--text)", cursor: "pointer" 
              }}
            >
              <option value="">Todas las Líneas</option>
              {lineasDisponibles.map(l => <option key={l} value={l}>{l}</option>)}
            </select>

            {/* Botón Exportar */}
            <button 
              onClick={exportarCSV}
              style={{
                padding: "8px 16px", background: "var(--surface3)", border: "1px solid var(--border)",
                borderRadius: "4px", cursor: "pointer", fontWeight: "600", color: "var(--text)",
                display: "flex", alignItems: "center", gap: "6px"
              }}
            >
              📥 Exportar a Excel
            </button>
          </div>
        </div>

        <div>
          <BomInternoUpload onSuccess={() => setRefreshKey(k => k + 1)} />
        </div>
      </div>

      {/* ─── TABLA MINIMALISTA CON DESPLEGABLE ─── */}
      <div style={{ overflowX: "auto", background: "var(--surface)", borderRadius: "8px", border: "1px solid var(--border)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
          <thead style={{ background: "var(--surface2)", borderBottom: "1px solid var(--border)" }}>
            <tr>
              <th style={{ padding: "12px", width: "40px" }}></th>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 600 }}>Componente EPS</th>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 600 }}>Línea</th>
              <th style={{ padding: "12px", color: "var(--muted)", fontWeight: 600 }}>Modelo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>Cargando datos maestros...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan="4" style={{ padding: "30px", textAlign: "center", color: "var(--muted)" }}>No se encontraron registros en el sistema</td></tr>
            ) : (
              data.map((row) => {
                const isExpanded = expandedRows.includes(row.id);

                return (
                  <React.Fragment key={row.id}>
                    {/* Fila Principal Visible */}
                    <tr 
                      onClick={() => toggleRow(row.id)}
                      className="hover-row"
                      style={{ 
                        borderBottom: isExpanded ? "none" : "1px solid var(--border2)", 
                        cursor: "pointer", background: isExpanded ? "var(--surface2)" : "transparent",
                        transition: "background 0.2s"
                      }}
                    >
                      <td style={{ padding: "12px", textAlign: "center", color: "var(--muted)" }}>
                        {isExpanded ? "▼" : "▶"}
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ fontWeight: 700, color: "var(--accent)" }}>{row.comp_no_parte}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{row.comp_desc}</div>
                      </td>
                      <td style={{ padding: "12px", fontWeight: 600, color: "var(--text)" }}>{row.linea || "—"}</td>
                      <td style={{ padding: "12px", color: "var(--text)" }}>{row.modelo || "—"}</td>
                    </tr>

                    {/* Área Desplegable (Detalles Técnicos) */}
                    {isExpanded && (
                      <tr style={{ borderBottom: "1px solid var(--border2)", background: "var(--surface2)" }}>
                        <td colSpan="4" style={{ padding: "0 20px 20px 40px" }}>
                          
                          <div style={{ 
                            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", 
                            gap: "16px", background: "var(--surface)", padding: "16px", 
                            borderRadius: "6px", border: "1px dashed var(--border)"
                          }}>
                            {/* Bloque Ficha Técnica */}
                            <div>
                              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Resina / Densidad</span>
                              <div style={{ fontWeight: 600, marginTop: "4px" }}>
                                {row.resina && row.resina !== "nan" ? row.resina : "—"} <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.densidad ? fmt(row.densidad, 3) : "—"}
                              </div>
                            </div>
                            
                            <div>
                              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Molde / Cavidades</span>
                              <div style={{ fontWeight: 600, marginTop: "4px" }}>
                                {row.molde && row.molde !== "nan" ? row.molde : "—"} <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.cavidades || "—"} cavs.
                              </div>
                            </div>

                            <div>
                              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Ciclo / Peso</span>
                              <div style={{ fontWeight: 600, marginTop: "4px" }}>
                                <span style={{color: "var(--green)"}}>{row.ciclo ? `${fmt(row.ciclo, 1)}s` : "—"}</span> <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.peso_kg ? `${fmt(row.peso_kg, 4)}kg` : "—"}
                              </div>
                            </div>

                            {/* Bloque Financiero y Pesos */}
                            <div>
                              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Pesos (Seco / Húmedo)</span>
                              <div style={{ fontWeight: 600, marginTop: "4px" }}>
                                {row.peso_seco ? `${fmt(row.peso_seco, 4)}kg` : "—"} <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.peso_humedo ? `${fmt(row.peso_humedo, 4)}kg` : "—"}
                              </div>
                              <div style={{ marginTop: "12px" }}>
                                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Costos (Material / Total)</span>
                                <div style={{ fontWeight: 600, marginTop: "4px", color: "var(--amber)" }}>
                                  {row.material_usd ? `$${fmt(row.material_usd, 4)}` : "—"} <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.total_usd ? `$${fmt(row.total_usd, 4)}` : "—"}
                                </div>
                              </div>
                            </div>

                            {/* Bloque Identificadores y Cliente */}
                            <div>
                               <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Cliente / Tipo de Equipo</span>
                               <div style={{ fontWeight: 600, marginTop: "4px", color: "var(--accent)" }}>
                                  {row.cliente || "—"} <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.equipo_type || "—"}
                               </div>
                               <div style={{ marginTop: "12px" }}>
                                 <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Asignación de ID (ID1 / ID2)</span>
                                 <div style={{ fontWeight: 600, marginTop: "4px" }}>
                                    {row.id1 || "—"} <span style={{color: "var(--muted)", fontWeight: "normal"}}>|</span> {row.id2 || "—"}
                                 </div>
                               </div>
                            </div>

                            {/* Bloque Relación Cliente */}
                            <div style={{ borderLeft: "2px solid var(--border2)", paddingLeft: "16px" }}>
                              <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase" }}>Asignación de Padre</span>
                              <div style={{ marginTop: "4px" }}>
                                {row.pt_no_parte === "SIN PADRE" ? (
                                  <span style={{ fontSize: "11px", color: "var(--muted)", fontStyle: "italic" }}>Sin ensamble registrado</span>
                                ) : (
                                  <>
                                    <div style={{ fontWeight: 600 }}>{row.pt_no_parte}</div>
                                    <div style={{ fontSize: "10px", color: "var(--muted)" }}>Lleva: {row.qty_bom} pzas.</div>
                                  </>
                                )}
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
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