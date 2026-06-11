"""
Router de importación: upload de Excel y script manual.
"""
import os, shutil
from datetime import date
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.excel_parser import parse_excel
from app.services.import_service import importar_todo, importar_bom_interno
from app.models.models import ImportLog
from app.schemas.schemas import ImportLogOut
from app.config import settings
import io

router = APIRouter(prefix="/import", tags=["Importación"])


@router.post("/upload", response_model=ImportLogOut, summary="Sube un archivo Excel y lo importa")
async def upload_excel(
    file: UploadFile = File(...),
    fecha_plan: str = Form(default=None),
    db: Session = Depends(get_db),
):
    """
    Acepta .xlsb o .xlsx.
    Parsea BOM, CW INV., Ref.PLAN y CAMBIO, luego los guarda en PostgreSQL.
    """
    if not file.filename.lower().endswith((".xlsb", ".xlsx")):
        raise HTTPException(400, "Solo se aceptan archivos .xlsb o .xlsx")

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    dest = os.path.join(settings.UPLOAD_DIR, file.filename)

    with open(dest, "wb") as f:
        shutil.copyfileobj(file.file, f)

    fp = date.fromisoformat(fecha_plan) if fecha_plan else date.today()

    try:
        parsed = parse_excel(dest, fp)
        log = importar_todo(db, parsed, file.filename)
    except Exception as e:
        raise HTTPException(500, f"Error al procesar el archivo: {e}")

    return log


@router.get("/logs", response_model=list[ImportLogOut], summary="Historial de importaciones")
def get_logs(limit: int = 20, db: Session = Depends(get_db)):
    return db.query(ImportLog).order_by(ImportLog.fecha_import.desc()).limit(limit).all()


@router.post("/bom-interno", summary="Sube y procesa el BOM Interno (Ficha Técnica)")
async def upload_bom_interno(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db)
):
    """
    Acepta un archivo Excel/CSV con la Ficha Técnica de manufactura (BOMCW).
    - Salta la segunda fila de cabeceras (Coreano).
    - Actualiza el catálogo de `partes` con datos de `resina`, `peso`, `molde`, `cavidades` y `ciclo`.
    - Crea las partes si no existen.
    """
    if not file.filename.lower().endswith((".xlsx", ".xls", ".csv")):
        raise HTTPException(400, "Solo se aceptan archivos Excel (.xlsx, .xls) o .csv")
        
    contents = await file.read()
    file_bytes = io.BytesIO(contents)
    
    try:
        resultado = importar_bom_interno(db, file_bytes)
        return resultado
    except Exception as e:
        raise HTTPException(500, f"Error al procesar el archivo de BOM Interno: {e}")
