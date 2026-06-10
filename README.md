# EPS Producción — Backend (FastAPI + PostgreSQL)

Sistema backend para el plan de producción EPS.  
Importa archivos `.xlsb` / `.xlsx` y expone una API REST que el frontend React consume.

---

## Estructura del proyecto

```
eps-backend/
├── app/
│   ├── main.py              ← Punto de entrada FastAPI
│   ├── config.py            ← Settings (.env)
│   ├── database.py          ← Conexión SQLAlchemy
│   ├── models/
│   │   └── models.py        ← Tablas PostgreSQL
│   ├── schemas/
│   │   └── schemas.py       ← Pydantic (request/response)
│   ├── services/
│   │   ├── excel_parser.py  ← Lee el .xlsb y extrae datos
│   │   └── import_service.py← Guarda en DB con upsert
│   └── routers/
│       ├── import_router.py ← POST /import/upload
│       └── routers.py       ← Todos los demás endpoints
├── scripts/
│   └── importar_excel.py    ← CLI para importar desde terminal
├── uploads/                 ← Archivos Excel subidos
├── requirements.txt
└── .env.example
```

---

## 1. Requisitos previos

- Python 3.11+
- PostgreSQL 14+ corriendo en localhost

---

## 2. Instalar dependencias

```bash
cd eps-backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac / Linux
source venv/bin/activate

pip install -r requirements.txt
```

---

## 3. Crear la base de datos en PostgreSQL

```sql
-- En psql o pgAdmin:
CREATE DATABASE eps_produccion;
```

---

## 4. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:
```
DATABASE_URL=postgresql://postgres:TU_PASSWORD@localhost:5432/eps_produccion
UPLOAD_DIR=./uploads
```

---

## 5. Arrancar el servidor

```bash
uvicorn app.main:app --reload --port 8000
```

Las tablas se crean automáticamente al arrancar.

Abre: http://localhost:8000/docs → Swagger UI con todos los endpoints.

---

## 6. Importar un archivo Excel

### Opción A — Desde el navegador (React)
El frontend tiene un botón de upload. Sube el `.xlsb` o `.xlsx` y llama a:
```
POST /import/upload
```

### Opción B — Desde la terminal
```bash
# Un archivo específico
python scripts/importar_excel.py Plan_de_EPS_04-MAY_D.xlsb --fecha 2026-05-04

# Escanear carpeta completa (solo importa archivos nuevos)
python scripts/importar_excel.py --carpeta ./uploads --fecha 2026-05-04
```

---

## 7. Endpoints principales

| Método | URL | Descripción |
|--------|-----|-------------|
| `POST` | `/import/upload` | Sube Excel e importa todo |
| `GET`  | `/import/logs` | Historial de importaciones |
| `GET`  | `/dashboard/kpis` | KPIs para el dashboard |
| `GET`  | `/partes/` | Catálogo de partes (filtros: linea, busqueda) |
| `GET`  | `/bom/` | Lista de materiales |
| `GET`  | `/inventario/` | Inventario CW |
| `PATCH`| `/inventario/{parte_id}` | Actualiza cantidad manualmente |
| `GET`  | `/inventario/alertas/criticas` | Partes bajo mínimo |
| `GET`  | `/plan/agrupado/?fecha_inicio=&fecha_fin=` | Plan pivoteado por parte |
| `GET`  | `/cambios/?fecha=2026-05-04` | Cambios de molde del día |
| `GET`  | `/cambios/desviaciones/` | Solo cambios con Δ densidad |

---

## 8. Conectar el frontend React

En tu app React, cambia los datos hardcodeados por llamadas a la API:

```js
// Ejemplo: cargar KPIs
const res = await fetch("http://localhost:8000/dashboard/kpis");
const kpis = await res.json();

// Ejemplo: subir Excel
const form = new FormData();
form.append("file", archivoExcel);
form.append("fecha_plan", "2026-05-04");
await fetch("http://localhost:8000/import/upload", {
  method: "POST",
  body: form,
});

// Ejemplo: plan agrupado semana
const plan = await fetch(
  "http://localhost:8000/plan/agrupado/?fecha_inicio=2026-04-27&fecha_fin=2026-05-03"
).then(r => r.json());
```

---

## Tablas creadas en PostgreSQL

| Tabla | Descripción |
|-------|-------------|
| `partes` | Catálogo maestro de todas las partes EPS |
| `bom` | Lista de materiales (PT → componentes) |
| `inventario_cw` | Stock actual en almacén CW |
| `plan_produccion` | Cantidades diarias planificadas por parte |
| `cambios_molde` | Registro de cambios por turno y máquina |
| `import_log` | Historial de cada importación Excel |
