from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from services import MetadataService, MarketService, VehicleService
from config import settings

app = FastAPI(
    title="AutoInsights API",
    version="1.0.0",
    description="Análisis integral del mercado automotor"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# HEALTH CHECK
# ==========================================
@app.get("/")
def read_root():
    return {"status": "API Online", "service": "AutoInsights Backend"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "1.0.0"}

# ==========================================
# METADATA (DROPDOWNS)
# ==========================================
@app.get("/api/brands", tags=["Metadata"])
def get_brands():
    """Obtiene lista de marcas disponibles"""
    return MetadataService.get_brands()

@app.get("/api/models/{brand}", tags=["Metadata"])
def get_models(brand: str):
    """Obtiene modelos para una marca específica"""
    return MetadataService.get_models(brand)

# ==========================================
# MARKET ANALYTICS
# ==========================================
@app.get("/api/market/stats", tags=["Market"])
def get_market_stats():
    """Estadísticas globales del mercado"""
    return MarketService.get_stats()

@app.get("/api/market/trend", tags=["Market"])
def get_market_trend():
    """Tendencia histórica: Precio vs Volumen anual"""
    return MarketService.get_trend()

@app.get("/api/market/condition", tags=["Market"])
def get_market_condition():
    """Distribución de vehículos por condición"""
    return MarketService.get_condition_distribution()

@app.get("/api/market/histogram", tags=["Market"])
def get_price_histogram():
    """Histograma de distribución de precios"""
    return MarketService.get_price_histogram()

@app.get("/api/market/geo", tags=["Market"])
def get_geo_data():
    """Datos geográficos para mapa de calor"""
    return MarketService.get_geo_data()

@app.get("/api/market/brands", tags=["Market"])
def get_top_brands(limit: int = Query(10, ge=1, le=100)):
    """Top N marcas por volumen de ventas"""
    return MarketService.get_top_brands(limit)

# ==========================================
# VEHICLE ANALYSIS
# ==========================================
@app.get("/api/vehicles/depreciation", tags=["Vehicle"])
def get_depreciation(
    brand: str = Query(..., min_length=1),
    model: str = Query(..., min_length=1)
):
    """Análisis de depreciación para un vehículo específico"""
    data = VehicleService.get_depreciation(brand, model)
    
    if not data:
        raise HTTPException(
            status_code=404,
            detail=f"No se encontraron datos para {brand} {model}"
        )
    
    return data

@app.get("/api/vehicles/mileage", tags=["Vehicle"])
def get_mileage_analysis(
    brand: str = Query(..., min_length=1),
    model: str = Query(..., min_length=1)
):
    """Scatter plot: Precio vs Kilometraje"""
    data = VehicleService.get_mileage_analysis(brand, model)
    return data if data else []

# ==========================================
# ERROR HANDLERS
# ==========================================
@app.exception_handler(ValueError)
async def value_error_handler(request, exc):
    return {"error": str(exc), "status": 400}

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return {"error": "Error interno del servidor", "status": 500}