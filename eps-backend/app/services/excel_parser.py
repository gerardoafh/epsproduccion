"""
Servicio de parseo del archivo Excel EPS.
Soporta .xlsb (vía pyxlsb) y .xlsx (vía openpyxl/pandas).
Extrae: BOM, CW INV., Multi-Planes (Oven, WP, BOSCH, etc.), CAMBIOS, MAQ y CORTES
"""
import pandas as pd
from datetime import date, timedelta
from typing import Optional
import logging
import re

logger = logging.getLogger(__name__)

def _read_sheet(path: str, sheet: str, engine: str) -> Optional[pd.DataFrame]:
    try:
        df = pd.read_excel(path, sheet_name=sheet, header=None, engine=engine)
        return df
    except Exception as e:
        logger.warning(f"No se pudo leer hoja '{sheet}': {e}")
        return None

def _engine_for(path: str) -> str:
    return "pyxlsb" if path.lower().endswith(".xlsb") else "openpyxl"

def _semana_iso(d: date) -> int:
    return d.isocalendar()[1]

# ─── BOM ──────────────────────────────────────────────────────────────────────
def parse_bom(path: str) -> list[dict]:
    engine = _engine_for(path)
    df = _read_sheet(path, "BOM", engine)
    if df is None: return []

    header_row = None
    for i, row in df.iterrows():
        vals = [str(v).strip().upper() for v in row if pd.notna(v)]
        if "LINE" in vals and "MODEL" in vals:
            header_row = i
            break

    if header_row is None: return []

    df.columns = range(len(df.columns))
    df = df.iloc[header_row + 1:].reset_index(drop=True)
    registros = []
    
    for _, row in df.iterrows():
        try:
            linea       = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None
            modelo      = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
            pt_parte    = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None
            pt_desc     = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else None
            comp_parte  = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
            comp_desc   = str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else None
            qty         = float(row.iloc[7]) if pd.notna(row.iloc[7]) else 1.0
            id1         = str(row.iloc[8]).strip() if len(row) > 8 and pd.notna(row.iloc[8]) else None

            if not pt_parte or not comp_parte or linea in (None, "LINE", "nan"): continue
            
            registros.append({
                "linea": linea, "modelo": modelo, "pt_no_parte": pt_parte,
                "pt_desc": pt_desc, "comp_no_parte": comp_parte, "comp_desc": comp_desc,
                "qty_bom": qty, "id1": id1,
            })
        except Exception: continue
    return registros

# ─── INVENTARIO CW ────────────────────────────────────────────────────────────
def parse_inventario(path: str) -> list[dict]:
    engine = _engine_for(path)
    df = _read_sheet(path, "CW INV.", engine)
    if df is None: return []

    header_row = None
    for i, row in df.iterrows():
        vals = [str(v).strip().upper() for v in row if pd.notna(v)]
        if "LINE" in vals and "INVENTARIO" in vals:
            header_row = i
            break
            
    if header_row is None: return []

    df = df.iloc[header_row + 2:].reset_index(drop=True)
    registros = []
    for _, row in df.iterrows():
        try:
            linea    = str(row.iloc[1]).strip() if pd.notna(row.iloc[1]) else None
            modelo   = str(row.iloc[2]).strip() if pd.notna(row.iloc[2]) else None
            no_parte = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None
            desc     = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else None
            id1      = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
            peso     = float(row.iloc[7]) if pd.notna(row.iloc[7]) else None
            inv      = int(float(row.iloc[8])) if pd.notna(row.iloc[8]) else 0

            if not no_parte or linea in (None, "LINE", "nan"): continue
            if no_parte in ("nan", "품번", "NO. PARTE"): continue

            registros.append({
                "no_parte": no_parte, "descripcion": desc, "linea": linea,
                "modelo": modelo, "tipo": id1, "peso_kg": peso, "cantidad": inv,
            })
        except Exception: continue
    return registros

# ─── PLAN DE PRODUCCIÓN MULTI-HOJA ───────────────────────────────────────────
def parse_plan(path: str, fecha_plan: Optional[date] = None) -> list[dict]:
    engine = _engine_for(path)
    if fecha_plan is None: fecha_plan = date.today()

    hojas_de_plan = [
        "Ref.PLAN", 
        "CW PLAN", 
        "Oven PLAN", 
        "WP Plan", 
        "BOSCH Plan", 
        "Extra Plan", 
        "EMB PLAN"
    ]
    plan_unificado = {}
    
    for hoja in hojas_de_plan:
        df = _read_sheet(path, hoja, engine)
        if df is None: continue
            
        header_row_idx = None
        col_no_parte_idx = None
        
        for i, row in df.iterrows():
            for c_idx, val in enumerate(row):
                v_str = str(val).strip().upper()
                if v_str in ("NO. PARTE", "NO.PARTE", "P/NO"):
                    header_row_idx = i
                    col_no_parte_idx = c_idx
                    break
            if header_row_idx is not None: break
                
        if header_row_idx is None or col_no_parte_idx is None: continue

        header = list(df.iloc[header_row_idx])
        fechas_idx = []
        dias_encontrados = 0
        
        for i, val in enumerate(header):
            if pd.isna(val) or i <= col_no_parte_idx: continue
            val_str = str(val).strip().upper()
            if "TOTAL" in val_str: continue 
                
            fecha_detectada = None
            if hasattr(val, 'date') and callable(val.date):
                fecha_detectada = val.date()
            elif isinstance(val, pd.Timestamp):
                fecha_detectada = val.date()
            elif isinstance(val, (int, float)) and 40000 < val < 50000:
                try: fecha_detectada = pd.to_datetime(val, unit='D', origin='1899-12-30').date()
                except Exception: pass
            elif isinstance(val, str):
                if re.match(r"\d{4}-\d{2}-\d{2}", val):
                    fecha_detectada = date.fromisoformat(val[:10])
                elif len(val_str) <= 10 and any(c.isdigit() for c in val_str) and "INV" not in val_str:
                    fecha_detectada = fecha_plan + timedelta(days=dias_encontrados)
            
            if fecha_detectada:
                fechas_idx.append((i, fecha_detectada))
                dias_encontrados += 1

        for _, row in df.iloc[header_row_idx + 1:].iterrows():
            no_parte = str(row.iloc[col_no_parte_idx]).strip() if pd.notna(row.iloc[col_no_parte_idx]) else None
            if not no_parte or no_parte in ("nan", "P/No", "NO. PARTE", "None"): continue
                
            for col_i, fecha in fechas_idx:
                try:
                    qty_raw = row.iloc[col_i]
                    if pd.isna(qty_raw): continue
                    qty_str = str(qty_raw).strip()
                    if qty_str == "" or qty_str == "-": continue
                    qty = int(float(qty_raw))
                    if qty > 0:
                        llave = (no_parte, fecha)
                        if llave not in plan_unificado:
                            plan_unificado[llave] = {
                                "no_parte": no_parte, "fecha": fecha,
                                "cantidad_plan": qty, "semana": _semana_iso(fecha),
                                "año": fecha.year,
                            }
                        else:
                            plan_unificado[llave]["cantidad_plan"] += qty
                except Exception: continue

    logger.info(f"PLAN CONSOLIDADO: {len(plan_unificado.values())} registros extraídos.")
    return list(plan_unificado.values())

# ─── CAMBIOS DE MOLDE ─────────────────────────────────────────────────────────
def parse_cambios(path: str, fecha_plan: date) -> list[dict]:
    engine = _engine_for(path)
    df = _read_sheet(path, "CAMBIO", engine)
    if df is None: return []

    registros = []
    turno_actual = None

    for _, row in df.iterrows():
        vals = [str(v).strip() if pd.notna(v) else "" for v in row]
        dia_noche = next((v for v in vals if v.upper() in ("DÍA", "DIA", "NOCHE")), None)
        
        if dia_noche and "NO." in vals:
            turno_actual = "DÍA" if "IA" in dia_noche.upper() else "NOCHE"
            continue

        if turno_actual is None: continue

        try:
            no       = row.iloc[2]
            maquina  = str(row.iloc[3]).strip() if pd.notna(row.iloc[3]) else None
            no_parte = str(row.iloc[4]).strip() if pd.notna(row.iloc[4]) else None
            desc     = str(row.iloc[5]).strip() if pd.notna(row.iloc[5]) else None
            r_plan   = str(row.iloc[6]).strip() if pd.notna(row.iloc[6]) else None
            d_plan   = float(row.iloc[7]) if pd.notna(row.iloc[7]) else None
            r_fis    = str(row.iloc[8]).strip() if pd.notna(row.iloc[8]) else None
            d_fis    = float(row.iloc[9]) if pd.notna(row.iloc[9]) else None
            hora     = str(row.iloc[10]).strip() if pd.notna(row.iloc[10]) else None
            coment   = str(row.iloc[11]).strip() if pd.notna(row.iloc[11]) else None

            if not maquina or maquina in ("nan", "MAQ."): continue
            if not pd.notna(no) or str(no).strip() in ("nan", "NO."): continue

            registros.append({
                "fecha": fecha_plan, "turno": turno_actual,
                "numero": int(float(no)) if pd.notna(no) else None,
                "maquina": maquina, "no_parte_raw": no_parte, "descripcion": desc,
                "resina_plan": r_plan, "densidad_plan": d_plan, "resina_fisico": r_fis,
                "densidad_fisico": d_fis, "hora_cambio": hora,
                "comentario": coment if coment != "nan" else None,
            })
        except Exception: continue
    return registros


# ─── NUEVO: PARSE MAQUINAS (MAQ) ──────────────────────────────────────────────
def parse_maquinas(path: str) -> list[dict]:
    """Busca los parámetros teóricos de inyección y capacidades de las máquinas."""
    engine = _engine_for(path)
    df = _read_sheet(path, "MAQ", engine)
    if df is None: return []

    header_idx = None
    for i, row in df.iterrows():
        vals = [str(v).strip().upper().replace('\n', ' ') for v in row if pd.notna(v)]
        if any("NO. DE PARTE" in v or "NO. PARTE" in v for v in vals) and any("MAQ" in v for v in vals):
            header_idx = i
            break

    if header_idx is None: return []

    header = [str(v).strip().upper().replace('\n', ' ') for v in df.iloc[header_idx]]
    
    def get_idx(keywords):
        for i, col in enumerate(header):
            if any(k in col for k in keywords): return i
        return -1

    idx_parte = get_idx(["NO. DE PARTE", "NO. PARTE"])
    idx_maq = get_idx(["ACTUAL MAQ", "MAQ.", "MAQ"])
    idx_cav = get_idx(["CAV"])
    idx_ct = get_idx(["C/T TEORICO", "C/T"])
    idx_metah = get_idx(["META X HR", "META HR"])
    idx_metat = get_idx(["META X 12", "META TURNO"])
    idx_pesoh = get_idx(["PESO HUMEDO"])
    idx_pesos = get_idx(["PESO SECO"])

    registros = []
    for _, row in df.iloc[header_idx + 1:].iterrows():
        if idx_parte == -1: continue
        no_parte = str(row.iloc[idx_parte]).strip()
        if not no_parte or no_parte in ("nan", "None", ""): continue

        try:
            registros.append({
                "maquina_nombre": str(row.iloc[idx_maq]).strip() if idx_maq != -1 and pd.notna(row.iloc[idx_maq]) else None,
                "no_parte_raw": no_parte,
                "cavidades": int(float(row.iloc[idx_cav])) if idx_cav != -1 and pd.notna(row.iloc[idx_cav]) else None,
                "ciclo_teorico": float(row.iloc[idx_ct]) if idx_ct != -1 and pd.notna(row.iloc[idx_ct]) else None,
                "meta_hora": int(float(row.iloc[idx_metah])) if idx_metah != -1 and pd.notna(row.iloc[idx_metah]) else None,
                "meta_turno": int(float(row.iloc[idx_metat])) if idx_metat != -1 and pd.notna(row.iloc[idx_metat]) else None,
                "peso_humedo": float(row.iloc[idx_pesoh]) if idx_pesoh != -1 and pd.notna(row.iloc[idx_pesoh]) else None,
                "peso_seco": float(row.iloc[idx_pesos]) if idx_pesos != -1 and pd.notna(row.iloc[idx_pesos]) else None,
            })
        except Exception as e:
            continue

    logger.info(f"MAQ: {len(registros)} parámetros de máquina extraídos.")
    return registros


# ─── NUEVO: PARSE PLAN DE CORTES ──────────────────────────────────────────────
def parse_cortes(path: str, fecha_plan: date) -> list[dict]:
    """Busca el plan diario para el área de bloques y corte de hilo caliente."""
    engine = _engine_for(path)
    df = _read_sheet(path, "PLAN DE CORTES", engine)
    if df is None: return []

    header_idx = None
    for i, row in df.iterrows():
        vals = [str(v).strip().upper() for v in row if pd.notna(v)]
        if "PRIORIDAD" in vals and any("NO.PARTE" in v.replace(' ', '') for v in vals):
            header_idx = i
            break

    if header_idx is None: return []

    header = [str(v).strip().upper() for v in df.iloc[header_idx]]
    
    def get_idx(keywords):
        for i, col in enumerate(header):
            if any(k in col.replace(' ', '') for k in keywords): return i
        return -1

    idx_prio = get_idx(["PRIORIDAD"])
    idx_parte = get_idx(["NO.PARTE"])
    idx_den = get_idx(["DENSIDAD"])
    idx_piezas = get_idx(["PIEZAS"]) 
    idx_hrs = get_idx(["HORADETRABAJO", "HORA DE TRABAJO"])

    registros = []
    for _, row in df.iloc[header_idx + 1:].iterrows():
        if idx_parte == -1: continue
        no_parte = str(row.iloc[idx_parte]).strip()
        if not no_parte or no_parte in ("nan", "None", ""): continue

        try:
            registros.append({
                "fecha": fecha_plan,
                "prioridad": int(float(row.iloc[idx_prio])) if idx_prio != -1 and pd.notna(row.iloc[idx_prio]) else None,
                "no_parte_raw": no_parte,
                "densidad": float(row.iloc[idx_den]) if idx_den != -1 and pd.notna(row.iloc[idx_den]) else None,
                "piezas_plan": int(float(row.iloc[idx_piezas])) if idx_piezas != -1 and pd.notna(row.iloc[idx_piezas]) else 0,
                "horas_trabajo": float(row.iloc[idx_hrs]) if idx_hrs != -1 and pd.notna(row.iloc[idx_hrs]) else None,
            })
        except Exception:
            continue

    logger.info(f"PLAN DE CORTES: {len(registros)} registros extraídos.")
    return registros


# ─── NUEVO: PARSE BOM INTERNO (FICHA TÉCNICA) ─────────────────────────────────
def parse_bom_interno(file_path_or_bytes):
    try:
        df = pd.read_excel(file_path_or_bytes, dtype=str)
    except Exception:
        if hasattr(file_path_or_bytes, 'seek'): file_path_or_bytes.seek(0)
        df = pd.read_csv(file_path_or_bytes, dtype=str)

    if df.empty: 
        return []

    # 1. Normalizamos cabeceras: todo a mayúsculas y sin espacios ocultos a los lados
    df.columns = [str(c).strip().upper() for c in df.columns]

    # 2. Búsqueda dinámica tipo "Cazador" (Si la columna cambia un poco, la encuentra igual)
    col_parte   = next((c for c in df.columns if 'PARTE' in c or '품번' in c), 'NO. PARTE')
    col_desc    = next((c for c in df.columns if 'DESC' in c or '품명' in c), 'DESCRIPCION')
    col_line    = next((c for c in df.columns if 'LINE' in c), 'LINE')
    col_model   = next((c for c in df.columns if 'MODEL' in c), 'MODEL')
    col_cliente = next((c for c in df.columns if 'CLIENT' in c), 'CLIENTE')
    col_id1     = next((c for c in df.columns if 'ID1' in c), 'ID1')
    col_id2     = next((c for c in df.columns if 'ID2' in c), 'ID2')
    col_resina  = next((c for c in df.columns if 'RESIN' in c), 'RESIN GRADE')
    col_dens    = next((c for c in df.columns if 'DENSIDAD' in c or '비중' in c), 'DENSIDAD')
    col_seco    = next((c for c in df.columns if 'SECO' in c), 'PESO SECO(KG)')
    col_humedo  = next((c for c in df.columns if 'HUMEDO' in c or 'HÚMEDO' in c), 'PESO HUMEDO(KG)')
    col_mat     = next((c for c in df.columns if 'MATERIAL' in c), 'MATERIAL $')
    col_tot     = next((c for c in df.columns if 'TOTAL' in c), 'TOTAL $')
    col_type    = next((c for c in df.columns if 'TYPE' in c or 'TIPO' in c), 'TYPE')
    col_mold    = next((c for c in df.columns if 'MOLD' in c), 'MOLD')
    col_cav     = next((c for c in df.columns if 'CAV' in c), 'CAV.')
    col_ciclo   = next((c for c in df.columns if 'CICLO' in c or 'C/T' in c), 'CICLO')

    partes_ficha_tecnica = []
    
    def safe_float(val):
        try: return float(str(val).replace(',', '')) if pd.notna(val) and str(val).strip() not in ("", "nan", "None") else 0.0
        except: return 0.0

    def safe_int(val):
        try: return int(float(str(val).replace(',', ''))) if pd.notna(val) and str(val).strip() not in ("", "nan", "None") else 0
        except: return 0
    
    for index, row in df.iterrows():
        raw_parte = row.get(col_parte, '')
        if pd.isna(raw_parte): continue
        
        no_parte = str(raw_parte).strip()
        # Reparar bug de decimales de Pandas (ej. 1234.0 -> 1234)
        if no_parte.endswith('.0'): no_parte = no_parte[:-2]
            
        # Omitimos filas vacías o la fila de cabeceras coreanas
        if not no_parte or no_parte.lower() in ('nan', 'none', '') or 'PARTE' in no_parte or '품번' in no_parte:
            continue
            
        parte_data = {
            "parte_id": no_parte,
            "descripcion": str(row.get(col_desc, '')).strip(),
            "linea": str(row.get(col_line, '')).strip(),
            "modelo": str(row.get(col_model, '')).strip(),
            "cliente": str(row.get(col_cliente, '')).strip(),
            "id1": str(row.get(col_id1, '')).strip(),
            "id2": str(row.get(col_id2, '')).strip(),
            "resina": str(row.get(col_resina, '')).strip(),
            "densidad": safe_float(row.get(col_dens)),
            "peso_seco": safe_float(row.get(col_seco)),
            "peso_humedo": safe_float(row.get(col_humedo)),
            "material_usd": safe_float(row.get(col_mat)),
            "total_usd": safe_float(row.get(col_tot)),
            "equipo_type": str(row.get(col_type, '')).strip(),
            "molde": str(row.get(col_mold, '')).strip(),
            "cavidades": safe_int(row.get(col_cav)),
            "ciclo": safe_float(row.get(col_ciclo))
        }
        
        # Limpieza final de celdas vacías
        for key in parte_data:
            if str(parte_data[key]).lower() in ("nan", "none", ""):
                parte_data[key] = None

        partes_ficha_tecnica.append(parte_data)
        
    return partes_ficha_tecnica


# ─── ENTRY POINT ─────────────────────────────────────────────────────────────
def parse_excel(path: str, fecha_plan: Optional[date] = None) -> dict:
    """Parsea todas las hojas del Excel y devuelve un dict completo."""
    if fecha_plan is None:
        fecha_plan = date.today()
    return {
        "bom":        parse_bom(path),
        "inventario": parse_inventario(path),
        "plan":       parse_plan(path, fecha_plan),
        "cambios":    parse_cambios(path, fecha_plan),
        "maquinas":   parse_maquinas(path),                  # <--- Integrado
        "cortes":     parse_cortes(path, fecha_plan),        # <--- Integrado
    }