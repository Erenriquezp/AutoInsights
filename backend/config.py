import os
from dataclasses import dataclass

@dataclass
class Settings:
    """Configuración centralizada"""
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
    DATABASE_NAME: str = "autoinsights"
    
    # Colecciones MongoDB
    COLLECTIONS = {
        "prices": "precios_promedio",
        "trend": "kpi_price_volume",
        "mileage": "kilometraje",
        "stats": "estadisticas_mercado",
        "condition": "distribucion_condicion",
        "histogram": "histograma_precios",
        "geo": "distribucion_geo",
        "brands": "top_brands"
    }
    
    # Parámetros de performance
    MILEAGE_LIMIT = 500
    EXCLUDE_EMPTY_VALUES = ["unknown", None, ""]

settings = Settings()