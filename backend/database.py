from pymongo import MongoClient
from bson import ObjectId
from config import settings
from typing import List, Dict, Any, Optional
import json

class MongoDatabase:
    """Manejo centralizado de MongoDB con patrón singleton"""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance
    
    def _initialize(self):
        try:
            self.client = MongoClient(settings.MONGO_URI)
            self.db = self.client[settings.DATABASE_NAME]
            
            # Precargamos las colecciones
            self.collections = {
                name: self.db[coll_name]
                for name, coll_name in settings.COLLECTIONS.items()
            }
            print("✅ Conexión a MongoDB exitosa")
        except Exception as e:
            print(f"❌ Error conectando a MongoDB: {e}")
            raise
    
    def get_collection(self, name: str):
        """Acceso seguro a colecciones"""
        if name not in self.collections:
            raise ValueError(f"Colección '{name}' no existe")
        return self.collections[name]
    
    @staticmethod
    def _clean_document(doc: Dict) -> Dict:
        """Elimina _id y convierte ObjectId a string"""
        if not doc:
            return doc
        
        # Crear copia para no modificar original
        cleaned = dict(doc)
        
        # Siempre eliminar _id
        cleaned.pop("_id", None)
        
        return cleaned
    
    @staticmethod
    def _clean_documents(docs: List[Dict]) -> List[Dict]:
        """Limpia lista de documentos"""
        return [MongoDatabase._clean_document(doc) for doc in docs]
    
    def find_one(self, collection: str, query: Dict = None, projection: Dict = None) -> Optional[Dict]:
        """Consulta genérica - un documento"""
        try:
            result = self.get_collection(collection).find_one(
                query or {},
                projection or {"_id": 0}
            )
            return self._clean_document(result) if result else None
        except Exception as e:
            print(f"❌ Error en find_one({collection}): {e}")
            return None
    
    def find_many(self, collection: str, query: Dict = None, projection: Dict = None, 
                  sort: tuple = None, limit: int = None) -> List[Dict]:
        """Consulta genérica - múltiples documentos"""
        try:
            cursor = self.get_collection(collection).find(
                query or {},
                projection or {"_id": 0}
            )
            
            if sort:
                cursor = cursor.sort(*sort)
            if limit:
                cursor = cursor.limit(limit)
            
            results = list(cursor)
            return self._clean_documents(results)
        except Exception as e:
            print(f"❌ Error en find_many({collection}): {e}")
            return []
    
    def distinct(self, collection: str, field: str, query: Dict = None) -> List:
        """Obtiene valores únicos de un campo"""
        try:
            results = self.get_collection(collection).distinct(
                field, 
                query or {}
            )
            # Filtrar None y strings vacíos
            return [r for r in results if r is not None and r != ""]
        except Exception as e:
            print(f"❌ Error en distinct({collection}, {field}): {e}")
            # NO retornes lista vacía si hay error de conexión, mejor falla ruidosamente
            # para evitar cachear datos erróneos.
            raise e

# Instancia global
db = MongoDatabase()