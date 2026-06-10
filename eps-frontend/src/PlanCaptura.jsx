import { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { useFetch } from "./App";
import "./PlanCaptura.css";

const fmt = (n) => (n != null ? Number(n).toLocaleString("es-MX") : "—");

export default function PlanCaptura() {
  // Inicializa con la fecha de hoy por defecto para el piso
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [turno, setTurno] = useState("DÍA");
  const [capturas, setCapturas] = useState({}); // Almacena { parte_id: { resultado, scrap, hrs_trabajo, ciclo_real } }
  const [notificacion, setNotificacion] = useState(null);

  // 1. Consultamos el plan del día seleccionado y los datos maestros de las máquinas
  const { data: planDia, loading: loadingPlan, error: errorPlan } = useFetch(
    `/plan/?fecha_inicio=${fecha}&fecha_fin=${fecha}`,
    [fecha]
  );
  const { data: maquinas, loading: loadingMaq } = useFetch("/maquinas/");

  // Cargar estados guardados localmente para evitar pérdidas por recargas de página
  useEffect(() => {
    const localData = localStorage.getItem(`captura_mes_${fecha}_${turno}`);
    if (localData) {
      setCapturas(JSON.parse(localData));
    } else {
      setCapturas({});
    }
  }, [fecha, turno]);

  // 2. Cruce de datos (JOIN): Combinar el Plan con los parámetros de la Máquina
  const filasOperativas = useMemo(() => {
    if (!planDia || !maquinas) return [];

    return planDia.map((item) => {
      // Buscar coincidencia en catálogo de máquinas por número de parte
      const specs = maquinas.find((m) => m.no_parte_raw === item.no_parte) || {};
      const captura = capturas[item.parte_id] || {};

      const cavidades = specs.cavidades || 2;
      const cicloTeorico = specs.ciclo_teorico || 60;
      const hrsTrabajo = captura.hrs_trabajo != null ? captura.hrs_trabajo : 12;
      const cicloReal = captura.ciclo_real != null ? captura.ciclo_real : cicloTeorico;
      const resultado = captura.resultado != null ? captura.resultado : 0;
      const scrap = captura.scrap != null ? captura.scrap : 0;

      // Cálculos matemáticos estándar del MES para EPS
      const metaHora = cicloTeorico > 0 ? Math.round((cavidades * 3600) / cicloTeorico) : 0;
      const metaTurno = Math.round(metaHora * hrsTrabajo);
      const productividad = metaTurno > 0 ? (resultado / metaTurno) * 100 : 0;
      const scrapPorcentaje = resultado + scrap > 0 ? (scrap / (resultado + scrap)) * 100 : 0;

      return {
        ...item,
        maquina: specs.maquina_nombre || "Mq. Alterna",
        cavidades,
        cicloTeorico,
        metaHora,
        metaTurno,
        hrsTrabajo,
        cicloReal,
        resultado,
        scrap,
        productividad,
        scrapPorcentaje,
        pesoSeco: specs.peso_seco || 0.1,
      };
    });
  }, [planDia, maquinas, capturas]);

  // 3. Cálculos del Panel Superior: Resumen de Producción Actual (KPIs Globales)
  const resumenGlobal = useMemo(() => {
    let totalPlan = 0;
    let totalReal = 0;
    let totalMetaTurno = 0;
    let totalScrap = 0;
    let pesoTotalKg = 0;

    filasOperativas.forEach((f) => {
      totalPlan += f.cantidad_plan || 0;
      totalReal += f.resultado || 0;
      totalMetaTurno += f.meta_turno || 0;
      totalScrap += f.scrap || 0;
      pesoTotalKg += (f.resultado + f.scrap) * f.pesoSeco;
    });

    const eficienciaGlobal = totalMetaTurno > 0 ? (totalReal / totalMetaTurno) * 100 : 0;
    const scrapGlobal = totalReal + totalScrap > 0 ? (totalScrap / (totalReal + totalScrap)) * 100 : 0;

    return { totalPlan, totalReal, eficienciaGlobal, totalScrap, scrapGlobal, pesoTotalKg };
  }, [filasOperativas]);

  // Manejador de cambios en los inputs de la tabla
  const handleInputChange = (parteId, campo, valor) => {
    const numVal = valor === "" ? "" : Number(valor);
    const nuevasCapturas = {
      ...capturas,
      [parteId]: {
        ...(capturas[parteId] || { hrs_trabajo: 12, ciclo_real: 0, resultado: 0, scrap: 0 }),
        [campo]: numVal,
      },
    };
    setCapturas(nuevasCapturas);
    localStorage.setItem(`captura_mes_${fecha}_${turno}`, JSON.stringify(nuevasCapturas));
  };

  const guardarEnBaseDatos = () => {
    // Aquí se conectará con el endpoint POST /producción/guardar en fases avanzadas
    setNotificacion("✓ Reporte de producción sincronizado localmente con éxito.");
    setTimeout(() => setNotificacion(null), 4000);
  };

  const exportarReporteExcel = () => {
    const dataExcel = filasOperativas.map((f) => ({
      Máquina: f.maquina,
      "No. Parte": f.no_parte,
      Descripción: f.descripcion || f.modelo,
      "Plan Requerido": f.cantidad_plan,
      "Horas Trabajo": f.hrsTrabajo,
      "Meta Turno": f.metaTurno,
      "Resultado Real": f.resultado,
      "Scrap (Pzas)": f.scrap,
      "Productividad %": `${f.productividad.toFixed(1)}%`,
      "Scrap %": `${f.scrapPorcentaje.toFixed(1)}%`,
    }));

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Turno_${turno}`);
    XLSX.writeFile(wb, `Reporte_R_Real_${fecha}_Turno_${turno}.xlsx`);
  };

  return (
    <div style={{ background: "var(--bg)", color: "var(--text)" }}>
      {/* Controles de Selección de Turno y Rango de Trabajo */}
      <div className="copy-panel" style={{ background: "var(--surface)", padding: "20px", borderRadius: "var(--radius)", border: "1px solid var(--border)", marginBottom: "24px", boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
          <div className="field" style={{ marginBottom: 0 }}>
            <div className="field-label" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em", marginBottom: "6px" }}>Fecha de Producción en Piso</div>
            <input type="date" className="field-input search-box" value={fecha} onChange={(e) => setFecha(e.target.value)} style={{ width: "160px", padding: "8px 12px" }} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <div className="field-label" style={{ fontSize: "10px", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em", marginBottom: "6px" }}>Turno Laboral</div>
            <select className="field-input search-box" value={turno} onChange={(e) => setTurno(e.target.value)} style={{ width: "140px", cursor: "pointer" }}>
              <option value="DÍA">🌅 TURNO DÍA</option>
              <option value="NOCHE">🌃 TURNO NOCHE</option>
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: "10px" }}>
            <button className="btn btn-primary" onClick={guardarEnBaseDatos}>💾 Guardar Turno</button>
            <button className="btn btn-ghost" onClick={exportarReporteExcel} style={{ border: "1px solid var(--border2)" }}>📥 Exportar Reporte R</button>
          </div>
        </div>
      </div>

      {notificacion && (
        <div style={{ background: "rgba(16,185,129,0.15)", color: "var(--green)", border: "1px solid var(--green)", padding: "10px", borderRadius: "3px", fontFamily: "var(--mono)", fontSize: "11px", marginBottom: "16px" }}>
          {notificacion}
        </div>
      )}

      {/* ─── RESUMEN DE PRODUCCIÓN ACTUAL (KPI BOXES) ─── */}
      <div className="section-header">
        <div className="section-title">Resumen de Producción Actual</div>
        <div className="section-line" />
      </div>
      <div className="kpi-grid" style={{ marginBottom: "20px" }}>
        <div className="kpi" style={{ "--kpi-color": "var(--accent)" }}>
          <div className="kpi-label">Demanda Planificada</div>
          <div className="kpi-value">{fmt(resumenGlobal.totalPlan)}</div>
          <div className="kpi-sub">Piezas solicitadas por clientes</div>
        </div>
        <div className="kpi" style={{ "--kpi-color": "var(--green)" }}>
          <div className="kpi-label">Total Producido Real</div>
          <div className="kpi-value" style={{ color: "var(--green)" }}>{fmt(resumenGlobal.totalReal)}</div>
          <div className="kpi-sub">Piezas logradas en inyección</div>
        </div>
        <div className="kpi" style={{ "--kpi-color": resumenGlobal.eficienciaGlobal >= 85 ? "var(--green)" : "var(--amber)" }}>
          <div className="kpi-label">Eficiencia Operativa Promedio</div>
          <div className="kpi-value" style={{ color: resumenGlobal.eficienciaGlobal >= 85 ? "var(--green)" : "var(--amber)" }}>
            {resumenGlobal.eficienciaGlobal.toFixed(1)}%
          </div>
          <div className="kpi-sub">Rendimiento contra meta standard</div>
        </div>
        <div className="kpi" style={{ "--kpi-color": resumenGlobal.scrapGlobal > 2 ? "var(--red)" : "var(--muted)" }}>
          <div className="kpi-label">Materia Prima Rechazada (Scrap)</div>
          <div className="kpi-value" style={{ color: resumenGlobal.scrapGlobal > 2 ? "var(--red)" : "var(--text)" }}>
            {fmt(resumenGlobal.totalScrap)} u
          </div>
          <div className="kpi-sub">Índice de merma: <strong style={{ color: resumenGlobal.scrapGlobal > 2 ? "var(--red)" : "var(--green)" }}>{resumenGlobal.scrapGlobal.toFixed(2)}%</strong></div>
        </div>
        <div className="kpi" style={{ "--kpi-color": "var(--purple)" }}>
          <div className="kpi-label">Consumo Estimado Resina</div>
          <div className="kpi-value" style={{ color: "var(--purple)" }}>{resumenGlobal.pesoTotalKg.toFixed(1)} kg</div>
          <div className="kpi-sub">Masa procesada en Tolva</div>
        </div>
      </div>

      {/* Tabla Operativa de Inyección */}
      <div className="section-header">
        <div className="section-title">Captura de Resultados de Inyección por Referencia</div>
        <div className="section-line" />
      </div>

      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Máquina</th>
              <th>No. Parte</th>
              <th>Descripción</th>
              <th style={{ textAlign: "right" }}>Requerido Plan</th>
              <th style={{ textAlign: "right" }}>Hrs Trabajo</th>
              <th style={{ textAlign: "right" }}>Meta Turno</th>
              <th style={{ textAlign: "right", color: "var(--green)" }}>Resultado Real</th>
              <th style={{ textAlign: "right", color: "var(--red)" }}>Scrap (Pzas)</th>
              <th style={{ textAlign: "right" }}>Productividad %</th>
              <th style={{ textAlign: "right" }}>Scrap %</th>
            </tr>
          </thead>
          <tbody>
            {loadingPlan || loadingMaq ? (
              <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--muted)", padding: "30px" }}>Cruzando referencias de planes y máquinas desde PostgreSQL...</td></tr>
            ) : errorPlan ? (
              <tr><td colSpan={10} style={{ textAlign: "center", color: "var(--red)", padding: "30px" }}>Error al conectar: {errorPlan}</td></tr>
            ) : filasOperativas.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div style={{ textAlign: "center", padding: "30px", color: "var(--muted)" }}>
                    <div style={{ fontSize: "20px", marginBottom: "4px" }}>📋</div>
                    <strong>No hay órdenes de producción programadas para esta fecha.</strong>
                    <div style={{ fontSize: "11px", marginTop: "4px" }}>Verifica en la pestaña "Plan Semanal" qué días contienen cargas válidas.</div>
                  </div>
                </td>
              </tr>
            ) : (
              filasOperativas.map((f) => (
                <tr key={f.parte_id}>
                  <td><span className="tag" style={{ background: "var(--surface3)", color: "var(--accent)" }}>{f.maquina}</span></td>
                  <td className="mono" style={{ fontSize: "11px", fontWeight: "600" }}>{f.no_parte}</td>
                  <td style={{ color: "var(--muted)", fontSize: "11px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.descripcion || f.modelo || "—"}
                  </td>
                  <td className="mono" style={{ textAlign: "right", fontWeight: "600" }}>{f.cantidad_plan?.toLocaleString("es-MX")}</td>
                  
                  {/* Input: Horas Trabajadas */}
                  <td style={{ textAlign: "right" }}>
                    <input type="number" className="mono" value={f.hrsTrabajo} onChange={(e) => handleInputChange(f.parte_id, "hrs_trabajo", e.target.value)}
                      style={{ width: "50px", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--text)", textAlign: "right", padding: "2px 4px", borderRadius: "2px" }} />
                  </td>

                  <td className="mono" style={{ textAlign: "right", color: "var(--muted)" }}>{f.metaTurno.toLocaleString("es-MX")}</td>

                  {/* Input: Resultado Real Logrado */}
                  <td style={{ textAlign: "right" }}>
                    <input type="number" className="mono" value={f.resultado || ""} placeholder="0" onChange={(e) => handleInputChange(f.parte_id, "resultado", e.target.value)}
                      style={{ width: "80px", background: "var(--surface2)", border: `1px solid ${f.resultado > 0 ? "var(--green)" : "var(--border)"}`, color: "var(--text)", textAlign: "right", padding: "2px 6px", borderRadius: "2px", fontWeight: "600" }} />
                  </td>

                  {/* Input: Scrap */}
                  <td style={{ textAlign: "right" }}>
                    <input type="number" className="mono" value={f.scrap || ""} placeholder="0" onChange={(e) => handleInputChange(f.parte_id, "scrap", e.target.value)}
                      style={{ width: "65px", background: "var(--surface2)", border: `1px solid ${f.scrap > 0 ? "var(--red)" : "var(--border)"}`, color: "var(--text)", textAlign: "right", padding: "2px 6px", borderRadius: "2px" }} />
                  </td>

                  {/* Productividad Individual */}
                  <td className="mono" style={{ textAlign: "right", fontWeight: "600", color: f.productividad >= 90 ? "var(--green)" : f.productividad >= 70 ? "var(--amber)" : "var(--text)" }}>
                    {f.productividad.toFixed(1)}%
                  </td>

                  {/* % Scrap Individual */}
                  <td className="mono" style={{ textAlign: "right", color: f.scrapPorcentaje > 3 ? "var(--red)" : "var(--muted)" }}>
                    {f.scrapPorcentaje.toFixed(1)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}