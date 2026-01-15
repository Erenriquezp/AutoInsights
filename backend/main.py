from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
import os

app = FastAPI()

# 1. Configuración de CORS
# Permite que el Frontend (puerto 5173) hable con este Backend (puerto 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción esto se restringe, para el taller "*" está bien
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Conexión a MongoDB
# Leemos la URI de las variables de entorno de Docker
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
client = MongoClient(MONGO_URI)
db = client["autoinsights"]
collection = db["precios_promedio"]

@app.get("/")
def read_root():
    return {"status": "API Online", "db_connected": True}

# --- ENDPOINT 1: OBTENER MARCAS ---
@app.get("/api/brands")
def get_brands():
    """Devuelve la lista única de marcas para el dropdown"""
    brands = collection.distinct("manufacturer")
    # Filtramos nulos y ordenamos
    clean_brands = sorted([b for b in brands if b is not None])
    return clean_brands

# --- ENDPOINT 2: OBTENER MODELOS POR MARCA ---
@app.get("/api/models/{brand}")
def get_models(brand: str):
    """Devuelve los modelos disponibles para una marca específica"""
    models = collection.distinct("model", {"manufacturer": brand})
    clean_models = sorted([m for m in models if m is not None])
    return clean_models

# --- ENDPOINT 3: ANÁLISIS DE DATOS (EL NÚCLEO) ---
@app.get("/api/analysis")
def get_analysis(brand: str, model: str):
    """
    Devuelve los datos para las gráficas:
    - Curva de depreciación (Precio vs Año)
    - KPIs (Precio promedio total, depreciación estimada)
    """
    # 1. Buscar en Mongo todos los años para esa marca/modelo
    cursor = collection.find({
        "manufacturer": brand, 
        "model": model
    }).sort("year", 1) # Ordenado por año ascendente
    
    data = list(cursor)

    if not data:
        raise HTTPException(status_code=404, detail="No hay datos para este vehículo")

    # 2. Formatear para el Frontend
    chart_data = []
    total_price = 0
    total_count = 0

    for doc in data:
        # Mongo devuelve ObjectId que no es serializable, lo ignoramos
        chart_data.append({
            "year": doc["year"],
            "price": doc["avg_price"],
            "count": doc["count"]
        })
        total_price += (doc["avg_price"] * doc["count"])
        total_count += doc["count"]

    # 3. Calcular KPIs simples
    avg_market_price = total_price / total_count if total_count > 0 else 0
    
    # Cálculo simple de depreciación (Último año vs Primer año disponible)
    # Nota: Esto es una aproximación para el demo
    depreciation_msg = "Datos insuficientes"
    if len(chart_data) >= 2:
        price_new = chart_data[-1]["price"] # Año más reciente
        price_old = chart_data[0]["price"]  # Año más antiguo
        if price_new > 0:
            drop = ((price_new - price_old) / price_new) * 100
            depreciation_msg = f"{drop:.1f}% de caída histórica"

    return {
        "vehicle": f"{brand} {model}",
        "kpis": {
            "avg_price": round(avg_market_price, 2),
            "total_samples": total_count,
            "trend": depreciation_msg
        },
        "history": chart_data
    }

    # --- ENDPOINT 4: VOLUMEN DE MERCADO POR MARCA ---
@app.get("/api/kpi/brand-volume")
def get_brand_volume():
    """
    Devuelve el volumen total de vehículos por marca
    """
    pipeline = [
        {
            "$group": {
                "_id": "$manufacturer",
                "total": {"$sum": "$count"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "brand": "$_id",
                "total": 1
            }
        },
        {
            "$sort": {"total": -1}
        }
    ]

    data = list(collection.aggregate(pipeline))
    return data
