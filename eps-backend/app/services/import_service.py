"""
Servicio de importación: toma los datos parseados del Excel
y los guarda en PostgreSQL con lógica upsert (no duplica).
"""
import logging
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy.dialects.postgresql import insert as pg_insert
from app.models.models import (
    Parte, BOMItem, InventarioCW, PlanProduccion, 
    CambioMolde, ImportLog, MaquinaCatalogo, PlanCorte
)

logger = logging.getLogger(__name__)


def _upsert_parte(db: Session, no_parte: str, defaults: dict) -> Parte:
    """Busca parte por no_parte; la crea si no existe o actualiza vacíos."""
    if not no_parte or no_parte in ("nan", "None", ""):
        return None

    parte = db.query(Parte).filter(Parte.no_parte == no_parte).first()
    if parte:
        for k, v in defaults.items():
            if v is not None and getattr(parte, k) in (None, ""):
                setattr(parte, k, v)
    else:
        parte = Parte(no_parte=no_parte, **defaults)
        db.add(parte)
        db.flush()
    return parte


# ── IMPORTAR BOM ──────────────────────────────────────────────────────────────
def importar_bom(db: Session, registros: list[dict]) -> tuple[int, list[str]]:
    insertados = 0
    errores = []

    for r in registros:
        try:
            pt = _upsert_parte(db, r["pt_no_parte"], {
                "descripcion": r.get("pt_desc"),
                "linea": r.get("linea"),
                "modelo": r.get("modelo")
            })
            comp = _upsert_parte(db, r["comp_no_parte"], {
                "descripcion": r.get("comp_desc")
            })

            if not pt or not comp:
                continue

            item = db.query(BOMItem).filter(
                BOMItem.pt_parte_id == pt.id,
                BOMItem.comp_parte_id == comp.id
            ).first()

            if not item:
                item = BOMItem(
                    pt_parte_id=pt.id, comp_parte_id=comp.id,
                    linea=r.get("linea"), modelo=r.get("modelo"),
                    pt_desc=r.get("pt_desc"), comp_desc=r.get("comp_desc"),
                    qty_bom=r.get("qty_bom"), id1=r.get("id1")
                )
                db.add(item)
            else:
                item.qty_bom = r.get("qty_bom")
            insertados += 1
        except Exception as e:
            errores.append(f"Error BOM PT:{r.get('pt_no_parte')}: {e}")

    return insertados, errores


# ── IMPORTAR INVENTARIO ───────────────────────────────────────────────────────
def importar_inventario(db: Session, registros: list[dict]) -> tuple[int, list[str]]:
    insertados = 0
    errores = []

    for r in registros:
        try:
            parte = _upsert_parte(db, r["no_parte"], {
                "descripcion": r.get("descripcion"),
                "linea": r.get("linea"),
                "modelo": r.get("modelo"),
                "tipo": r.get("tipo"),
                "peso_kg": r.get("peso_kg")
            })
            if not parte:
                continue

            inv = db.query(InventarioCW).filter(InventarioCW.parte_id == parte.id).first()
            if not inv:
                inv = InventarioCW(
                    parte_id=parte.id, 
                    cantidad=r.get("cantidad", 0),
                    fecha_actualizacion=date.today()
                )
                db.add(inv)
            else:
                inv.cantidad = r.get("cantidad", 0)
                inv.fecha_actualizacion = date.today()
            insertados += 1
        except Exception as e:
            errores.append(f"Error INV {r.get('no_parte')}: {e}")

    return insertados, errores


# ── IMPORTAR PLAN PRODUCCIÓN ──────────────────────────────────────────────────
def importar_plan(db: Session, registros: list[dict]) -> tuple[int, list[str]]:
    insertados = 0
    errores = []

    for r in registros:
        try:
            parte = _upsert_parte(db, r["no_parte"], {})
            if not parte:
                continue

            plan = db.query(PlanProduccion).filter(
                PlanProduccion.parte_id == parte.id,
                PlanProduccion.fecha == r["fecha"]
            ).first()

            if not plan:
                plan = PlanProduccion(
                    parte_id=parte.id, fecha=r["fecha"],
                    cantidad_plan=r.get("cantidad_plan", 0),
                    semana=r.get("semana")
                )
                db.add(plan)
            else:
                plan.cantidad_plan = r.get("cantidad_plan", 0)
            insertados += 1
        except Exception as e:
            errores.append(f"Error PLAN {r.get('no_parte')}: {e}")

    return insertados, errores


# ── IMPORTAR CAMBIOS ──────────────────────────────────────────────────────────
def importar_cambios(db: Session, registros: list[dict]) -> tuple[int, list[str]]:
    insertados = 0
    errores = []

    for r in registros:
        try:
            parte = _upsert_parte(db, r["no_parte_raw"], {"descripcion": r.get("descripcion")})
            
            cambio = db.query(CambioMolde).filter(
                CambioMolde.fecha == r["fecha"],
                CambioMolde.turno == r["turno"],
                CambioMolde.numero == r["numero"],
                CambioMolde.maquina == r["maquina"]
            ).first()

            if not cambio:
                cambio = CambioMolde(parte_id=parte.id if parte else None, **r)
                db.add(cambio)
            else:
                for k, v in r.items():
                    setattr(cambio, k, v)
                cambio.parte_id = parte.id if parte else None
            insertados += 1
        except Exception as e:
            errores.append(f"Error CAMBIO {r.get('maquina')}: {e}")

    return insertados, errores


# ── IMPORTAR MAQUINAS (NUEVO) ─────────────────────────────────────────────────
def importar_maquinas(db: Session, registros: list[dict]) -> tuple[int, list[str]]:
    insertados = 0
    errores = []

    for r in registros:
        try:
            parte = _upsert_parte(db, r["no_parte_raw"], {})
            
            maq = db.query(MaquinaCatalogo).filter(
                MaquinaCatalogo.no_parte_raw == r["no_parte_raw"],
                MaquinaCatalogo.maquina_nombre == r["maquina_nombre"]
            ).first()

            if not maq:
                maq = MaquinaCatalogo(parte_id=parte.id if parte else None, **r)
                db.add(maq)
            else:
                for k, v in r.items():
                    setattr(maq, k, v)
                maq.parte_id = parte.id if parte else None
            insertados += 1
        except Exception as e:
            errores.append(f"Error MAQUINA {r.get('maquina_nombre')}: {e}")

    return insertados, errores


# ── IMPORTAR PLAN DE CORTES (NUEVO) ───────────────────────────────────────────
def importar_cortes(db: Session, registros: list[dict]) -> tuple[int, list[str]]:
    insertados = 0
    errores = []

    for r in registros:
        try:
            parte = _upsert_parte(db, r["no_parte_raw"], {"densidad": r.get("densidad")})
            
            corte = db.query(PlanCorte).filter(
                PlanCorte.fecha == r["fecha"],
                PlanCorte.no_parte_raw == r["no_parte_raw"]
            ).first()

            if not corte:
                corte = PlanCorte(parte_id=parte.id if parte else None, **r)
                db.add(corte)
            else:
                for k, v in r.items():
                    setattr(corte, k, v)
                corte.parte_id = parte.id if parte else None
            insertados += 1
        except Exception as e:
            errores.append(f"Error CORTE {r.get('no_parte_raw')}: {e}")

    return insertados, errores


# ── ORQUESTADOR PRINCIPAL ────────────────────────────────────────────────────
def importar_todo(db: Session, parsed: dict, nombre_archivo: str) -> ImportLog:
    """Importa todo y registra en import_log. Hace rollback si hay error crítico."""
    log = ImportLog(nombre_archivo=nombre_archivo)
    todos_errores = []

    try:
        # Secciones originales
        n_bom, err = importar_bom(db, parsed.get("bom", []))
        log.filas_bom = n_bom
        todos_errores.extend(err)

        n_inv, err = importar_inventario(db, parsed.get("inventario", []))
        log.filas_inventario = n_inv
        todos_errores.extend(err)

        n_plan, err = importar_plan(db, parsed.get("plan", []))
        log.filas_plan = n_plan
        todos_errores.extend(err)

        n_cam, err = importar_cambios(db, parsed.get("cambios", []))
        log.filas_cambios = n_cam
        todos_errores.extend(err)

        # Nuevas secciones
        n_maq, err = importar_maquinas(db, parsed.get("maquinas", []))
        log.filas_maquinas = n_maq
        todos_errores.extend(err)

        n_cortes, err = importar_cortes(db, parsed.get("cortes", []))
        log.filas_cortes = n_cortes
        todos_errores.extend(err)

        # Estatus y Logs
        if todos_errores:
            log.errores = "\n".join(todos_errores[:50])  # máx 50 errores en log para no saturar DB
            log.status = "parcial"
        else:
            log.status = "ok"

        db.add(log)
        db.commit()
        db.refresh(log)
        
        logger.info(f"Importación {nombre_archivo}: BOM={n_bom}, INV={n_inv}, PLAN={n_plan}, CAM={n_cam}, MAQ={n_maq}, CORTES={n_cortes}")

    except Exception as e:
        db.rollback()
        logger.error(f"Error crítico en importación: {e}")
        log.errores = str(e)
        log.status = "error"
        db.add(log)
        db.commit()
        raise e

    return log