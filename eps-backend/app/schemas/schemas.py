from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

# ── Parte ──────────────────────────────────────────────────────────────────
class ParteBase(BaseModel):
    no_parte: str
    descripcion: Optional[str] = None
    linea: Optional[str] = None
    modelo: Optional[str] = None
    tipo: Optional[str] = None
    peso_kg: Optional[float] = None
    resina: Optional[str] = None
    densidad: Optional[float] = None

class ParteCreate(ParteBase):
    pass

class ParteOut(ParteBase):
    id: int
    creado_en: Optional[datetime] = None
    class Config:
        from_attributes = True

# ── BOM ────────────────────────────────────────────────────────────────────
class BOMItemOut(BaseModel):
    id: int
    linea: Optional[str] = None
    modelo: Optional[str] = None
    pt_parte_id: Optional[int] = None
    pt_desc: Optional[str] = None
    comp_parte_id: Optional[int] = None
    comp_desc: Optional[str] = None
    qty_bom: float
    id1: Optional[str] = None
    pt_no_parte: Optional[str] = None
    comp_no_parte: Optional[str] = None
    
    # --- NUEVOS CAMPOS DE FICHA TÉCNICA (Desde Parte) ---
    molde: Optional[str] = None
    ciclo: Optional[float] = None
    cavidades: Optional[int] = None
    peso_kg: Optional[float] = None
    resina: Optional[str] = None
    densidad: Optional[float] = None
    
    # ─── ¡NUEVOS CAMPOS A EXPORTAR! ───
    cliente: Optional[str] = None
    id2: Optional[str] = None
    peso_seco: Optional[float] = None
    peso_humedo: Optional[float] = None
    material_usd: Optional[float] = None
    total_usd: Optional[float] = None
    equipo_type: Optional[str] = None

    class Config:
        from_attributes = True

# ── Inventario ─────────────────────────────────────────────────────────────
class InventarioOut(BaseModel):
    id: int
    parte_id: int
    no_parte: Optional[str] = None
    descripcion: Optional[str] = None
    linea: Optional[str] = None
    cantidad: int
    cantidad_minima: int
    estatus: Optional[str] = None
    fecha_actualizacion: Optional[date] = None
    class Config:
        from_attributes = True

class InventarioUpdate(BaseModel):
    cantidad: int
    cantidad_minima: Optional[int] = None
    comentario: Optional[str] = None

# ── Plan ───────────────────────────────────────────────────────────────────
class PlanOut(BaseModel):
    id: int
    parte_id: int
    no_parte: str
    descripcion: Optional[str]
    linea: Optional[str]
    modelo: Optional[str]
    fecha: date
    cantidad_plan: int
    semana: Optional[int]
    class Config:
        from_attributes = True

class PlanPorParteOut(BaseModel):
    parte_id: int
    no_parte: str
    descripcion: Optional[str]
    linea: Optional[str]
    modelo: Optional[str]
    dias: dict  # {"2026-04-27": 1500, ...}
    total: int

# ── Cambios ────────────────────────────────────────────────────────────────
class CambioOut(BaseModel):
    id: int
    fecha: date
    turno: str
    numero: Optional[int]
    maquina: Optional[str]
    no_parte_raw: Optional[str]
    descripcion: Optional[str]
    resina_plan: Optional[str]
    densidad_plan: Optional[float]
    resina_fisico: Optional[str]
    densidad_fisico: Optional[float]
    hora_cambio: Optional[str]
    comentario: Optional[str]
    tiene_desviacion: Optional[bool] = None
    class Config:
        from_attributes = True

# ── NUEVOS: Máquinas y Cortes ──────────────────────────────────────────────
class MaquinaOut(BaseModel):
    id: int
    maquina_nombre: Optional[str]
    no_parte_raw: Optional[str]
    cavidades: Optional[int]
    ciclo_teorico: Optional[float]
    meta_hora: Optional[int]
    meta_turno: Optional[int]
    peso_humedo: Optional[float]
    peso_seco: Optional[float]
    class Config:
        from_attributes = True

class PlanCorteOut(BaseModel):
    id: int
    fecha: date
    prioridad: Optional[int]
    no_parte_raw: Optional[str]
    densidad: Optional[float]
    piezas_plan: Optional[int]
    horas_trabajo: Optional[float]
    class Config:
        from_attributes = True

# ── Import Log ─────────────────────────────────────────────────────────────
class ImportLogOut(BaseModel):
    id: int
    nombre_archivo: str
    fecha_import: datetime
    filas_bom: int
    filas_inventario: int
    filas_plan: int
    filas_cambios: int
    filas_maquinas: int
    filas_cortes: int
    errores: Optional[str]
    status: str
    class Config:
        from_attributes = True

# ── Dashboard KPIs ─────────────────────────────────────────────────────────
class KPIOut(BaseModel):
    total_partes: int
    total_inventario: int
    partes_criticas: int
    partes_bajo_minimo: int
    total_bom_items: int
    cambios_hoy_dia: int
    cambios_hoy_noche: int
    cambios_con_desviacion: int
    plan_hoy_total: int
    ultima_importacion: Optional[datetime] = None