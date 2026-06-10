from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers.import_router import router as import_router
from app.routers.routers import (
    router_partes, router_bom, router_inv,
    router_plan, router_cambios, router_dashboard,
    router_maquinas, router_cortes
)

# Crea todas las tablas al arrancar (equivale a un migrate simple)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="EPS Producción API",
    description="Backend para el sistema de plan de producción EPS",
    version="1.0.0",
)

# CORS — permite que el frontend React en localhost:5173 consuma la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(import_router)
app.include_router(router_dashboard)
app.include_router(router_partes)
app.include_router(router_bom)
app.include_router(router_inv)
app.include_router(router_plan)
app.include_router(router_cambios)
app.include_router(router_maquinas)
app.include_router(router_cortes)

@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "app": "EPS Producción API v1.0"}
