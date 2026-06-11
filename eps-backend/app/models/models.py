from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Parte(Base):
    """Catálogo maestro de partes EPS."""
    __tablename__ = "partes"

    id = Column(Integer, primary_key=True, index=True)
    no_parte = Column(String(50), unique=True, nullable=False, index=True)
    descripcion = Column(String(200))
    linea = Column(String(20), index=True)       # R1, R2, R3, WP, BOSCH, OVEN, SVC
    modelo = Column(String(100))
    tipo = Column(String(20))                    # EPS, Assy, SVC
    peso_kg = Column(Float, nullable=True)
    resina = Column(String(30), nullable=True)   # 350, 450, ANTIFLAMA, etc.
    densidad = Column(Float, nullable=True)
    molde = Column(String(100), nullable=True)
    cavidades = Column(Integer, nullable=True)
    ciclo = Column(Float, nullable=True)
    
    # ─── ¡NUEVOS CAMPOS DEL BOMCW! ───
    cliente = Column(String(50), nullable=True)
    id1 = Column(String(50), nullable=True)
    id2 = Column(String(50), nullable=True)
    peso_seco = Column(Float, nullable=True)
    peso_humedo = Column(Float, nullable=True)
    material_usd = Column(Float, nullable=True)
    total_usd = Column(Float, nullable=True)
    equipo_type = Column(String(50), nullable=True)
    # ──────────────────────────────────
    
    creado_en = Column(DateTime, server_default=func.now())
    actualizado_en = Column(DateTime, server_default=func.now(), onupdate=func.now())

    inventario = relationship("InventarioCW", back_populates="parte", uselist=False)
    bom_componentes = relationship("BOMItem", foreign_keys="BOMItem.comp_parte_id", back_populates="componente")
    bom_pt = relationship("BOMItem", foreign_keys="BOMItem.pt_parte_id", back_populates="parte_terminada")


class BOMItem(Base):
    """Lista de materiales (Bill of Materials) - relación P.T. a Componente."""
    __tablename__ = "bom"

    id = Column(Integer, primary_key=True, index=True)
    linea = Column(String(20), index=True)
    modelo = Column(String(100))
    pt_parte_id = Column(Integer, ForeignKey("partes.id"), nullable=False)
    pt_desc = Column(String(200))
    comp_parte_id = Column(Integer, ForeignKey("partes.id"), nullable=False)
    comp_desc = Column(String(200))
    pt_no_parte = Column(String(50), index=True, nullable=True)
    comp_no_parte = Column(String(50), index=True, nullable=True)
    qty_bom = Column(Float, nullable=False, default=1.0)
    id1 = Column(String(20))
    creado_en = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint('pt_parte_id', 'comp_parte_id', name='uq_bom_pt_comp'),)

    parte_terminada = relationship("Parte", foreign_keys=[pt_parte_id], back_populates="bom_pt")
    componente = relationship("Parte", foreign_keys=[comp_parte_id], back_populates="bom_componentes")


class InventarioCW(Base):
    """Inventario en almacén CW."""
    __tablename__ = "inventario_cw"

    id = Column(Integer, primary_key=True, index=True)
    parte_id = Column(Integer, ForeignKey("partes.id"), unique=True, nullable=False)
    cantidad = Column(Integer, default=0)
    cantidad_minima = Column(Integer, default=0)
    comentario = Column(Text, nullable=True)
    fecha_actualizacion = Column(Date, default=func.current_date())

    parte = relationship("Parte", back_populates="inventario")


class PlanProduccion(Base):
    """Plan de producción unificado (Extrae datos de WP, Oven, BOSCH, Extra, etc.)."""
    __tablename__ = "plan_produccion"

    id = Column(Integer, primary_key=True, index=True)
    parte_id = Column(Integer, ForeignKey("partes.id"), nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    cantidad_plan = Column(Integer, nullable=False, default=0)
    semana = Column(Integer)
    creado_en = Column(DateTime, server_default=func.now())

    __table_args__ = (UniqueConstraint('parte_id', 'fecha', name='uq_plan_parte_fecha'),)
    parte = relationship("Parte")


class CambioMolde(Base):
    """Registro de cambios de molde por turno."""
    __tablename__ = "cambios_molde"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False, index=True)
    turno = Column(String(10), nullable=False)    # DÍA | NOCHE
    numero = Column(Integer)
    maquina = Column(String(30))
    parte_id = Column(Integer, ForeignKey("partes.id"), nullable=True)
    no_parte_raw = Column(String(50))             
    descripcion = Column(String(200))
    resina_plan = Column(String(30))
    densidad_plan = Column(Float, nullable=True)
    resina_fisico = Column(String(30))
    densidad_fisico = Column(Float, nullable=True)
    hora_cambio = Column(String(30))
    comentario = Column(Text, nullable=True)
    creado_en = Column(DateTime, server_default=func.now())

    parte = relationship("Parte")


# ─── NUEVAS TABLAS PARA EL MES ────────────────────────────────────────────────

class MaquinaCatalogo(Base):
    """Parámetros de inyección y capacidades extraídos de la pestaña MAQ."""
    __tablename__ = "maquinas_catalogo"

    id = Column(Integer, primary_key=True, index=True)
    maquina_nombre = Column(String(50), index=True) # Ej: #2400-13
    parte_id = Column(Integer, ForeignKey("partes.id"), nullable=True)
    no_parte_raw = Column(String(50), index=True)
    cavidades = Column(Integer, nullable=True)
    ciclo_teorico = Column(Float, nullable=True)    # C/T Teorico en Segundos
    meta_hora = Column(Integer, nullable=True)      # Meta x Hr
    meta_turno = Column(Integer, nullable=True)     # Meta x 12Hrs
    peso_humedo = Column(Float, nullable=True)
    peso_seco = Column(Float, nullable=True)
    creado_en = Column(DateTime, server_default=func.now())

    parte = relationship("Parte")


class PlanCorte(Base):
    """Plan diario para el área de Cortes de Block (PLAN DE CORTES)."""
    __tablename__ = "plan_cortes"

    id = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, index=True, nullable=False)
    prioridad = Column(Integer, nullable=True)
    parte_id = Column(Integer, ForeignKey("partes.id"), nullable=True)
    no_parte_raw = Column(String(50), index=True)
    densidad = Column(Float, nullable=True)
    piezas_plan = Column(Integer, default=0)
    horas_trabajo = Column(Float, nullable=True)
    creado_en = Column(DateTime, server_default=func.now())

    parte = relationship("Parte")


class ImportLog(Base):
    """Log de cada importación de archivo Excel."""
    __tablename__ = "import_log"

    id = Column(Integer, primary_key=True, index=True)
    nombre_archivo = Column(String(255))
    fecha_import = Column(DateTime, server_default=func.now())
    filas_bom = Column(Integer, default=0)
    filas_inventario = Column(Integer, default=0)
    filas_plan = Column(Integer, default=0)
    filas_cambios = Column(Integer, default=0)
    filas_maquinas = Column(Integer, default=0) # Nuevo contador
    filas_cortes = Column(Integer, default=0)   # Nuevo contador
    filas_ficha_tecnica = Column(Integer, default=0)
    errores = Column(Text, nullable=True)
    status = Column(String(20), default="ok")   # ok, error, parcial