"""
Routers para: Partes, BOM, Inventario CW, Plan de Producción, Cambios de Molde, Dashboard KPIs
"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from app.database import get_db
from app.models.models import Parte, BOMItem, InventarioCW, PlanProduccion, CambioMolde, MaquinaCatalogo, PlanCorte
from app.schemas.schemas import (
    ParteOut, BOMItemOut, InventarioOut, InventarioUpdate,
    PlanOut, PlanPorParteOut, CambioOut, KPIOut,
    MaquinaOut, PlanCorteOut
)

# ─── PARTES ───────────────────────────────────────────────────────────────────
router_partes = APIRouter(prefix="/partes", tags=["Catálogo de Partes"])

@router_partes.get("/", response_model=list[ParteOut])
def listar_partes(
    linea: Optional[str] = None,
    busqueda: Optional[str] = None,
    skip: int = 0,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(Parte)
    if linea:
        q = q.filter(Parte.linea == linea)
    if busqueda:
        q = q.filter(
            Parte.no_parte.ilike(f"%{busqueda}%") |
            Parte.descripcion.ilike(f"%{busqueda}%") |
            Parte.modelo.ilike(f"%{busqueda}%")
        )
    return q.offset(skip).limit(limit).all()

@router_partes.get("/{no_parte}", response_model=ParteOut)
def get_parte(no_parte: str, db: Session = Depends(get_db)):
    p = db.query(Parte).filter(Parte.no_parte == no_parte).first()
    if not p:
        raise HTTPException(404, f"Parte {no_parte} no encontrada")
    return p


# ─── BOM ─────────────────────────────────────────────────────────────────────
router_bom = APIRouter(prefix="/bom", tags=["BOM / Lista de Materiales"])

@router_bom.get("/", response_model=list[BOMItemOut])
def listar_bom(
    linea: Optional[str] = None,
    modelo: Optional[str] = None,
    busqueda: Optional[str] = None,
    skip: int = 0,
    limit: int = 300,
    db: Session = Depends(get_db),
):
    q = db.query(BOMItem)
    if linea:
        q = q.filter(BOMItem.linea == linea)
    if modelo:
        q = q.filter(BOMItem.modelo.ilike(f"%{modelo}%"))
    if busqueda:
        q = q.filter(
            BOMItem.pt_desc.ilike(f"%{busqueda}%") |
            BOMItem.comp_desc.ilike(f"%{busqueda}%")
        )
    items = q.offset(skip).limit(limit).all()
    # Enriquecer con no_parte
    result = []
    for item in items:
        d = BOMItemOut.model_validate(item)
        if item.parte_terminada:
            d.pt_no_parte = item.parte_terminada.no_parte
        if item.componente:
            d.comp_no_parte = item.componente.no_parte
        result.append(d)
    return result

@router_bom.get("/lineas/", response_model=list[str])
def lineas_bom(db: Session = Depends(get_db)):
    rows = db.query(BOMItem.linea).distinct().filter(BOMItem.linea.isnot(None)).all()
    return sorted([r[0] for r in rows])


# ─── INVENTARIO CW ────────────────────────────────────────────────────────────
router_inv = APIRouter(prefix="/inventario", tags=["Inventario CW"])

def _estatus(cantidad: int, minimo: int) -> str:
    if cantidad == 0:
        return "SIN STOCK"
    if cantidad < minimo:
        return "CRÍTICO"
    if cantidad < minimo * 1.5:
        return "BAJO"
    return "OK"

@router_inv.get("/", response_model=list[InventarioOut])
def listar_inventario(
    linea: Optional[str] = None,
    estatus: Optional[str] = None,
    busqueda: Optional[str] = None,
    skip: int = 0,
    limit: int = 300,
    db: Session = Depends(get_db),
):
    q = db.query(InventarioCW).join(Parte)
    if linea:
        q = q.filter(Parte.linea == linea)
    if busqueda:
        q = q.filter(
            Parte.no_parte.ilike(f"%{busqueda}%") |
            Parte.descripcion.ilike(f"%{busqueda}%")
        )
    rows = q.offset(skip).limit(limit).all()
    result = []
    for inv in rows:
        est = _estatus(inv.cantidad, inv.cantidad_minima)
        if estatus and est != estatus:
            continue
        result.append(InventarioOut(
            id=inv.id,
            parte_id=inv.parte_id,
            no_parte=inv.parte.no_parte if inv.parte else None,
            descripcion=inv.parte.descripcion if inv.parte else None,
            linea=inv.parte.linea if inv.parte else None,
            cantidad=inv.cantidad,
            cantidad_minima=inv.cantidad_minima,
            estatus=est,
            fecha_actualizacion=inv.fecha_actualizacion,
        ))
    return result

@router_inv.patch("/{parte_id}", response_model=InventarioOut, summary="Actualiza cantidad de inventario")
def actualizar_inventario(
    parte_id: int,
    body: InventarioUpdate,
    db: Session = Depends(get_db),
):
    inv = db.query(InventarioCW).filter(InventarioCW.parte_id == parte_id).first()
    if not inv:
        raise HTTPException(404, "Registro de inventario no encontrado")
    inv.cantidad = body.cantidad
    if body.cantidad_minima is not None:
        inv.cantidad_minima = body.cantidad_minima
    if body.comentario is not None:
        inv.comentario = body.comentario
    inv.fecha_actualizacion = date.today()
    db.commit()
    db.refresh(inv)
    est = _estatus(inv.cantidad, inv.cantidad_minima)
    return InventarioOut(
        id=inv.id,
        parte_id=inv.parte_id,
        no_parte=inv.parte.no_parte if inv.parte else None,
        descripcion=inv.parte.descripcion if inv.parte else None,
        linea=inv.parte.linea if inv.parte else None,
        cantidad=inv.cantidad,
        cantidad_minima=inv.cantidad_minima,
        estatus=est,
        fecha_actualizacion=inv.fecha_actualizacion,
    )

@router_inv.get("/alertas/criticas", response_model=list[InventarioOut])
def alertas_criticas(db: Session = Depends(get_db)):
    rows = db.query(InventarioCW).join(Parte).all()
    return [
        InventarioOut(
            id=inv.id, parte_id=inv.parte_id,
            no_parte=inv.parte.no_parte, descripcion=inv.parte.descripcion,
            linea=inv.parte.linea, cantidad=inv.cantidad,
            cantidad_minima=inv.cantidad_minima,
            estatus=_estatus(inv.cantidad, inv.cantidad_minima),
            fecha_actualizacion=inv.fecha_actualizacion,
        )
        for inv in rows
        if inv.cantidad < inv.cantidad_minima and inv.cantidad_minima > 0
    ]


# ─── PLAN DE PRODUCCIÓN ───────────────────────────────────────────────────────
router_plan = APIRouter(prefix="/plan", tags=["Plan de Producción"])

@router_plan.get("/", response_model=list[PlanOut])
def listar_plan(
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    linea: Optional[str] = None,
    skip: int = 0,
    limit: int = 500,
    db: Session = Depends(get_db),
):
    q = db.query(PlanProduccion).join(Parte)
    if fecha_inicio:
        q = q.filter(PlanProduccion.fecha >= fecha_inicio)
    if fecha_fin:
        q = q.filter(PlanProduccion.fecha <= fecha_fin)
    if linea:
        q = q.filter(Parte.linea == linea)
    rows = q.order_by(PlanProduccion.fecha).offset(skip).limit(limit).all()
    return [
        PlanOut(
            id=r.id, parte_id=r.parte_id,
            no_parte=r.parte.no_parte, descripcion=r.parte.descripcion,
            linea=r.parte.linea, modelo=r.parte.modelo,
            fecha=r.fecha, cantidad_plan=r.cantidad_plan, semana=r.semana,
        )
        for r in rows
    ]

@router_plan.get("/agrupado/", response_model=list[PlanPorParteOut])
def plan_agrupado(
    fecha_inicio: date = Query(...),
    fecha_fin: date = Query(...),
    linea: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """Devuelve el plan pivoteado por parte → {fecha: cantidad}"""
    q = db.query(PlanProduccion).join(Parte).filter(
        PlanProduccion.fecha >= fecha_inicio,
        PlanProduccion.fecha <= fecha_fin,
    )
    if linea:
        q = q.filter(Parte.linea == linea)

    # Agrupar en Python
    from collections import defaultdict
    partes: dict[int, dict] = defaultdict(lambda: {"dias": {}, "total": 0})
    meta: dict[int, Parte] = {}

    for row in q.all():
        pid = row.parte_id
        partes[pid]["dias"][str(row.fecha)] = row.cantidad_plan
        partes[pid]["total"] += row.cantidad_plan
        meta[pid] = row.parte

    return [
        PlanPorParteOut(
            parte_id=pid,
            no_parte=meta[pid].no_parte,
            descripcion=meta[pid].descripcion,
            linea=meta[pid].linea,
            modelo=meta[pid].modelo,
            dias=data["dias"],
            total=data["total"],
        )
        for pid, data in partes.items()
    ]

@router_plan.get("/semanas/", response_model=list[int])
def semanas_disponibles(db: Session = Depends(get_db)):
    rows = db.query(PlanProduccion.semana).distinct().filter(
        PlanProduccion.semana.isnot(None)
    ).order_by(PlanProduccion.semana).all()
    return [r[0] for r in rows]


# ─── CAMBIOS DE MOLDE ─────────────────────────────────────────────────────────
router_cambios = APIRouter(prefix="/cambios", tags=["Cambios de Molde"])

@router_cambios.get("/", response_model=list[CambioOut])
def listar_cambios(
    fecha: Optional[date] = None,
    turno: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(CambioMolde)
    if fecha:
        q = q.filter(CambioMolde.fecha == fecha)
    if turno:
        q = q.filter(CambioMolde.turno == turno.upper())
    rows = q.order_by(CambioMolde.turno, CambioMolde.numero).all()
    result = []
    for c in rows:
        tiene_desv = False
        if c.densidad_plan and c.densidad_fisico:
            tiene_desv = abs(c.densidad_plan - c.densidad_fisico) > 0.003
        result.append(CambioOut(
            id=c.id, fecha=c.fecha, turno=c.turno, numero=c.numero,
            maquina=c.maquina, no_parte_raw=c.no_parte_raw,
            descripcion=c.descripcion, resina_plan=c.resina_plan,
            densidad_plan=c.densidad_plan, resina_fisico=c.resina_fisico,
            densidad_fisico=c.densidad_fisico, hora_cambio=c.hora_cambio,
            comentario=c.comentario, tiene_desviacion=tiene_desv,
        ))
    return result

@router_cambios.get("/desviaciones/", response_model=list[CambioOut])
def cambios_con_desviacion(
    fecha: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Solo cambios donde densidad física ≠ plan (Δ > 0.003)"""
    q = db.query(CambioMolde)
    if fecha:
        q = q.filter(CambioMolde.fecha == fecha)
    rows = q.all()
    result = []
    for c in rows:
        if c.densidad_plan and c.densidad_fisico:
            if abs(c.densidad_plan - c.densidad_fisico) > 0.003:
                result.append(CambioOut(
                    id=c.id, fecha=c.fecha, turno=c.turno, numero=c.numero,
                    maquina=c.maquina, no_parte_raw=c.no_parte_raw,
                    descripcion=c.descripcion, resina_plan=c.resina_plan,
                    densidad_plan=c.densidad_plan, resina_fisico=c.resina_fisico,
                    densidad_fisico=c.densidad_fisico, hora_cambio=c.hora_cambio,
                    comentario=c.comentario, tiene_desviacion=True,
                ))
    return result


# ─── DASHBOARD KPIs ───────────────────────────────────────────────────────────
router_dashboard = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router_dashboard.get("/kpis", response_model=KPIOut)
def get_kpis(db: Session = Depends(get_db)):
    from app.models.models import ImportLog
    hoy = date.today()

    total_partes = db.query(func.count(Parte.id)).scalar()
    total_inv = db.query(func.sum(InventarioCW.cantidad)).scalar() or 0

    inv_rows = db.query(InventarioCW).all()
    criticas = sum(1 for r in inv_rows if r.cantidad == 0 and r.cantidad_minima > 0)
    bajo_min = sum(1 for r in inv_rows if 0 < r.cantidad < r.cantidad_minima)

    total_bom = db.query(func.count(BOMItem.id)).scalar()

    cambios_dia = db.query(func.count(CambioMolde.id)).filter(
        CambioMolde.fecha == hoy, CambioMolde.turno == "DÍA"
    ).scalar()
    cambios_noche = db.query(func.count(CambioMolde.id)).filter(
        CambioMolde.fecha == hoy, CambioMolde.turno == "NOCHE"
    ).scalar()

    cambios_hoy = db.query(CambioMolde).filter(CambioMolde.fecha == hoy).all()
    desv = sum(
        1 for c in cambios_hoy
        if c.densidad_plan and c.densidad_fisico
        and abs(c.densidad_plan - c.densidad_fisico) > 0.003
    )

    plan_hoy = db.query(func.sum(PlanProduccion.cantidad_plan)).filter(
        PlanProduccion.fecha == hoy
    ).scalar() or 0

    last_import = db.query(ImportLog).order_by(ImportLog.fecha_import.desc()).first()

    return KPIOut(
        total_partes=total_partes or 0,
        total_inventario=int(total_inv),
        partes_criticas=criticas,
        partes_bajo_minimo=bajo_min,
        total_bom_items=total_bom or 0,
        cambios_hoy_dia=cambios_dia or 0,
        cambios_hoy_noche=cambios_noche or 0,
        cambios_con_desviacion=desv,
        plan_hoy_total=int(plan_hoy),
        ultima_importacion=last_import.fecha_import if last_import else None,
    )

# ─── CATÁLOGO DE MÁQUINAS ─────────────────────────────────────────────────────
router_maquinas = APIRouter(prefix="/maquinas", tags=["Catálogo de Máquinas"])

@router_maquinas.get("/", response_model=list[MaquinaOut])
def listar_maquinas(db: Session = Depends(get_db)):
    return db.query(MaquinaCatalogo).all()

# ─── PLAN DE CORTES ───────────────────────────────────────────────────────────
router_cortes = APIRouter(prefix="/cortes", tags=["Plan de Cortes"])

@router_cortes.get("/", response_model=list[PlanCorteOut])
def listar_cortes(fecha: Optional[date] = None, db: Session = Depends(get_db)):
    q = db.query(PlanCorte)
    if fecha:
        q = q.filter(PlanCorte.fecha == fecha)
    return q.all()
