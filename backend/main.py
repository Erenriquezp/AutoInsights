from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import os

app = FastAPI(title="AutoInsights API", version="1.0.0")

# ==========================================
# 1. CONFIGURACIÓN E INFRAESTRUCTURA
# ==========================================

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Conexión a MongoDB
# Usamos variables de entorno para facilitar el despliegue
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")

try:
    client = MongoClient(MONGO_URI)
    db = client["autoinsights"]
    
    # Definimos las colecciones (Mapeo directo con lo que generó Spark)
    coll_prices = db["precios_promedio"]       # Detalle por auto
    coll_global_trend = db["kpi_price_volume"] # KPI Global Anual
    coll_mileage = db["kilometraje"]           # Scatter Plot
    coll_stats = db["estadisticas_mercado"]    # Resumen Ejecutivo (1 doc)
    # Mapeo de nuevas colecciones
    coll_condition = db["distribucion_condicion"]
    coll_histogram = db["histograma_precios"]   
    coll_geo = db["distribucion_geo"]

    print("✅ Conexión a MongoDB exitosa.")
except Exception as e:
    print(f"❌ Error conectando a MongoDB: {e}")

@app.get("/")
def read_root():
    return {"status": "API Online", "service": "AutoInsights Backend"}

# ==========================================
# 2. ENDPOINTS DE METADATA (DROPDOWNS)
# ==========================================

@app.get("/api/brands")
def get_brands():
    """Obtiene lista limpia de marcas."""
    brands = coll_prices.distinct("manufacturer")
    return sorted([b for b in brands if b])

@app.get("/api/models/{brand}")
def get_models(brand: str):
    """Obtiene modelos para una marca."""
    models = coll_prices.distinct("model", {"manufacturer": brand})
    return sorted([m for m in models if m])

# ==========================================
# 3. ENDPOINTS DE DASHBOARD (KPIS GENERALES)
# ==========================================

@app.get("/api/market/stats")
def get_market_stats():
    """
    Retorna los 'Big Numbers' del mercado completo.
    Fuente: Colección 'estadisticas_mercado' (Generada por Spark)
    """
    stats = coll_stats.find_one({}, {"_id": 0})
    if not stats:
        return {
            "total_vehicles": 0,
            "total_brands": 0,
            "avg_market_price": 0,
            "year_range": "N/A"
        }
    return stats

@app.get("/api/market/trend")
def get_market_trend():
    """
    Retorna la tendencia histórica GLOBAL de precio vs volumen.
    Fuente: Colección 'kpi_price_volume'
    """
    cursor = coll_global_trend.find({}, {"_id": 0}).sort("year", 1)
    return list(cursor)

# ==========================================
# 4. ENDPOINTS DE ANÁLISIS (POR VEHÍCULO)
# ==========================================

@app.get("/api/analysis")
def get_analysis(brand: str, model: str):
    """
    Devuelve datos de depreciación para un vehículo específico.
    Calcula la caída de valor desde el año más reciente al más antiguo.
    """
    # Buscamos ordenado por año
    cursor = coll_prices.find(
        {"manufacturer": brand, "model": model},
        {"_id": 0}
    ).sort("year", 1)
    
    data = list(cursor)

    if not data:
        raise HTTPException(status_code=404, detail="Vehículo no encontrado")

    # Cálculos en tiempo real (ligeros gracias al pre-proceso de Spark)
    total_weighted_price = sum(d["avg_price"] * d["count"] for d in data)
    total_count = sum(d["count"] for d in data)
    avg_price = total_weighted_price / total_count if total_count > 0 else 0

    # Cálculo de Depreciación (Trend)
    trend_msg = "Datos insuficientes"
    trend_value = 0
    
    if len(data) >= 2:
        # data[-1] es el año más reciente (ej. 2024), data[0] el más viejo (ej. 2000)
        price_new = data[-1]["avg_price"]
        price_old = data[0]["avg_price"]
        
        # Evitar división por cero
        if price_new > 0:
            # Cuánto valor perdió desde nuevo (aprox) hasta viejo
            drop_pct = ((price_new - price_old) / price_new) * 100
            trend_value = drop_pct
            trend_msg = f"{drop_pct:.1f}% de depreciación histórica"
        elif price_old > price_new:
             # Caso raro donde el viejo es más caro (clásicos), pero manejo básico
             trend_msg = "Apreciación de valor (Clásico)"

    return {
        "vehicle": f"{brand} {model}",
        "summary": {
            "avg_price": round(avg_price, 2),
            "total_samples": total_count,
            "depreciation_text": trend_msg,
            "depreciation_value": round(trend_value, 2)
        },
        "history": data
    }

# --- ENDPOINT 5: Kilometraje ---
@app.get("/api/mileage")
def get_mileage(brand: str, model: str):
    """
    Datos para Scatter Plot: Precio vs Kilometraje.
    Limitado a 500 puntos para mantener el frontend fluido.
    """
    cursor = coll_mileage.find(
        {"manufacturer": brand, "model": model},
        {"_id": 0, "odometer": 1, "price": 1}
    ).limit(500) # Performance limit

    data = list(cursor)
    if not data:
         # Retornamos lista vacía en vez de 404 para que la gráfica simplemente se muestre vacía
         return [] 
    
    return data

# --- ENDPOINT 6: CONDICIÓN (PASTEL) ---
@app.get("/api/market/condition")
def get_market_condition():
    """Retorna la cantidad de vehículos por estado (clean, salvage, etc)"""
    # Excluimos condiciones vacías o 'unknown' si quieres limpiar la gráfica
    data = list(coll_condition.find(
        {"condition": {"$nin": ["unknown", None]}}, 
        {"_id": 0}
    ))
    return data

# --- ENDPOINT 7: HISTOGRAMA (BARRAS) ---
@app.get("/api/market/histogram")
def get_price_histogram():
    """Retorna la distribución de precios en rangos de $2k"""
    data = list(coll_histogram.find({}, {"_id": 0}).sort("price_range", 1))
    return data

# --- ENDPOINT 7: MAPA (GEO) ---
@app.get("/api/market/map")
def get_geo_data():
    """Retorna datos de todos los estados para el mapa de calor"""
    data = list(coll_geo.find({}, {"_id": 0}))
    return data