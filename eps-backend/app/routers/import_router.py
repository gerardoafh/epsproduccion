"""
Router de importación: upload de Excel y script manual.
"""
import os, shutil
from datetime import date
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.excel_parser import parse_excel
from app.services.import_service import importar_todo
from app.models.models import ImportLog
from app.schemas.schemas import ImportLogOut
from app.config import settings

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
