#!/usr/bin/env python3
"""
Script de importación por línea de comandos.
Uso:
    python scripts/importar_excel.py ruta/al/archivo.xlsb
    python scripts/importar_excel.py ruta/al/archivo.xlsb --fecha 2026-05-04
    python scripts/importar_excel.py --carpeta ./uploads  (importa todos los .xlsb/.xlsx nuevos)
"""
import sys
import os
import argparse
from datetime import date, datetime

# Agrega el directorio raíz al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine, Base
from app.models.models import ImportLog
from app.services.excel_parser import parse_excel
from app.services.import_service import importar_todo

Base.metadata.create_all(bind=engine)


def importar_archivo(path: str, fecha_plan: date):
    print(f"\n{'='*60}")
    print(f"  Importando: {os.path.basename(path)}")
    print(f"  Fecha plan: {fecha_plan}")
    print(f"{'='*60}")

    db = SessionLocal()
    try:
        print("  Parseando Excel...", end=" ", flush=True)
        parsed = parse_excel(path, fecha_plan)
        print("OK")
        print(f"    BOM:       {len(parsed['bom'])} registros")
        print(f"    Inventario:{len(parsed['inventario'])} registros")
        print(f"    Plan:      {len(parsed['plan'])} registros")
        print(f"    Cambios:   {len(parsed['cambios'])} registros")

        print("  Guardando en PostgreSQL...", end=" ", flush=True)
        log = importar_todo(db, parsed, os.path.basename(path))
        print("OK")
        print(f"\n  Resultado: [{log.status.upper()}]")
        print(f"    BOM insertado:       {log.filas_bom}")
        print(f"    Inventario:          {log.filas_inventario}")
        print(f"    Plan:                {log.filas_plan}")
        print(f"    Cambios de molde:    {log.filas_cambios}")

        if log.errores:
            print(f"\n  Advertencias ({log.status}):")
            for linea in (log.errores or "").split("\n")[:10]:
                print(f"    - {linea}")

        return log.status

    except Exception as e:
        print(f"ERROR: {e}")
        return "error"
    finally:
        db.close()


def importar_carpeta(carpeta: str, fecha_plan: date):
    archivos = [
        os.path.join(carpeta, f)
        for f in os.listdir(carpeta)
        if f.lower().endswith((".xlsb", ".xlsx")) and not f.startswith("~")
    ]
    if not archivos:
        print(f"No se encontraron archivos Excel en '{carpeta}'")
        return

    db = SessionLocal()
    importados_hoy = {
        log.nombre_archivo
        for log in db.query(ImportLog)
        .filter(ImportLog.status.in_(["ok", "parcial"]))
        .all()
    }
    db.close()

    nuevos = [a for a in archivos if os.path.basename(a) not in importados_hoy]
    if not nuevos:
        print(f"Todos los archivos ya fueron importados. ({len(archivos)} encontrados)")
        return

    print(f"Archivos nuevos a importar: {len(nuevos)}")
    for arch in nuevos:
        importar_archivo(arch, fecha_plan)


def main():
    parser = argparse.ArgumentParser(description="Importa Excel EPS a PostgreSQL")
    parser.add_argument("archivo", nargs="?", help="Ruta al archivo .xlsb o .xlsx")
    parser.add_argument("--fecha", type=str, default=None,
                        help="Fecha del plan en formato YYYY-MM-DD (default: hoy)")
    parser.add_argument("--carpeta", type=str, default=None,
                        help="Carpeta a escanear para importar archivos nuevos")
    args = parser.parse_args()

    fecha_plan = date.fromisoformat(args.fecha) if args.fecha else date.today()

    if args.carpeta:
        importar_carpeta(args.carpeta, fecha_plan)
    elif args.archivo:
        status = importar_archivo(args.archivo, fecha_plan)
        sys.exit(0 if status in ("ok", "parcial") else 1)
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
