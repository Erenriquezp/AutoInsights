from database import db
from config import settings
from typing import Dict, List, Any, Optional
from functools import lru_cache

class BaseService:
    """Clase base con funcionalidad común"""
    
    @staticmethod
    def clean_list(items: List[str]) -> List[str]:
        """Filtra valores vacíos, None, y duplicados"""
        return sorted(set(
            item for item in items 
            if item and item not in settings.EXCLUDE_EMPTY_VALUES
        ))

class MetadataService(BaseService):
    """Gestiona dropdowns y metadatos"""
    
    @staticmethod
    # @lru_cache(maxsize=128) #
    def get_brands() -> List[str]:
        """Retorna marcas únicas limpias"""
        brands = db.distinct("prices", "manufacturer")
        return MetadataService.clean_list(brands)
    
    @staticmethod
    @lru_cache(maxsize=512)
    def get_models(brand: str) -> List[str]:
        """Retorna modelos para una marca"""
        models = db.distinct("prices", "model", {"manufacturer": brand})
        return MetadataService.clean_list(models)

class MarketService(BaseService):
    """Análisis general del mercado"""
    
    @staticmethod
    def get_stats() -> Dict:
        """Retorna estadísticas globales"""
        stats = db.find_one("stats")
        return stats or {
            "total_vehicles": 0,
            "total_brands": 0,
            "avg_market_price": 0,
            "year_range": "N/A"
        }
    
    @staticmethod
    def get_trend() -> List[Dict]:
        """Precio y volumen histórico por año"""
        return db.find_many("trend", sort=("year", 1))
    
    @staticmethod
    def get_condition_distribution() -> List[Dict]:
        """Distribución por condición"""
        return db.find_many("condition", sort=("count", -1))
    
    @staticmethod
    def get_price_histogram() -> List[Dict]:
        """Histograma de precios"""
        return db.find_many("histogram", sort=("price_range", 1))
    
    @staticmethod
    def get_geo_data() -> List[Dict]:
        """Datos geográficos para el mapa"""
        return db.find_many("geo", sort=("count", -1))
    
    @staticmethod
    def get_top_brands(limit: int = 10) -> List[Dict]:
        """Top N marcas por volumen"""
        return db.find_many("brands", limit=limit)

class VehicleService(BaseService):
    """Análisis específico de vehículos"""
    
    @staticmethod
    def get_depreciation(brand: str, model: str) -> Dict:
        """Análisis de depreciación con historial"""
        data = db.find_many(
            "prices",
            query={"manufacturer": brand, "model": model},
            sort=("year", 1)
        )
        
        if not data:
            return None
        
        # Cálculos agregados
        total_weighted_price = sum(d["avg_price"] * d["count"] for d in data)
        total_count = sum(d["count"] for d in data)
        avg_price = round(total_weighted_price / total_count, 2) if total_count > 0 else 0
        
        # Depreciación
        depreciation = VehicleService._calculate_depreciation(data)
        
        return {
            "vehicle": f"{brand} {model}",
            "summary": {
                "avg_price": avg_price,
                "total_samples": total_count,
                "depreciation_text": depreciation["text"],
                "depreciation_value": depreciation["value"]
            },
            "history": data
        }
    
    @staticmethod
    def _calculate_depreciation(history: List[Dict]) -> Dict:
        """Helper privado para depreciación"""
        if len(history) < 2:
            return {"text": "Datos insuficientes", "value": 0}
        
        price_new = history[-1]["avg_price"]
        price_old = history[0]["avg_price"]
        
        if price_new > 0:
            drop_pct = ((price_new - price_old) / price_new) * 100
            return {
                "text": f"{drop_pct:.1f}% de depreciación histórica",
                "value": round(drop_pct, 2)
            }
        
        return {
            "text": "Apreciación de valor (Clásico)",
            "value": 0
        }
    
    @staticmethod
    def get_mileage_analysis(brand: str, model: str) -> List[Dict]:
        """Scatter plot: Precio vs Kilometraje"""
        return db.find_many(
            "mileage",
            query={"manufacturer": brand, "model": model},
            projection={"odometer": 1, "price": 1},
            limit=settings.MILEAGE_LIMIT
        )