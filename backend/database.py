import logging
from typing import Any

from pymongo import MongoClient
from pymongo.collection import Collection

from config import settings

logger = logging.getLogger(__name__)


class MongoDatabase:
    """Single shared MongoDB client with helpers for read-only queries."""

    _instance: "MongoDatabase | None" = None

    def __new__(cls) -> "MongoDatabase":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self) -> None:
        # MongoClient connects lazily: errors surface on the first query, not here.
        self.client: MongoClient = MongoClient(settings.MONGO_URI)
        self.db = self.client[settings.DATABASE_NAME]
        self.collections: dict[str, Collection] = {
            name: self.db[collection_name] for name, collection_name in settings.COLLECTIONS.items()
        }
        logger.info("MongoDB client created for database '%s'", settings.DATABASE_NAME)

    def get_collection(self, name: str) -> Collection:
        if name not in self.collections:
            raise ValueError(f"Unknown collection '{name}'")
        return self.collections[name]

    @staticmethod
    def _clean_document(doc: dict[str, Any]) -> dict[str, Any]:
        """Return a copy of the document without Mongo's `_id`."""
        cleaned = dict(doc)
        cleaned.pop("_id", None)
        return cleaned

    def find_one(
        self,
        collection: str,
        query: dict[str, Any] | None = None,
        projection: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        try:
            result = self.get_collection(collection).find_one(query or {}, projection or {"_id": 0})
        except Exception:
            logger.exception("find_one failed on '%s'", collection)
            return None
        return self._clean_document(result) if result else None

    def find_many(
        self,
        collection: str,
        query: dict[str, Any] | None = None,
        projection: dict[str, Any] | None = None,
        sort: tuple[str, int] | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        try:
            cursor = self.get_collection(collection).find(query or {}, projection or {"_id": 0})
            if sort:
                cursor = cursor.sort(*sort)
            if limit:
                cursor = cursor.limit(limit)
            return [self._clean_document(doc) for doc in cursor]
        except Exception:
            logger.exception("find_many failed on '%s'", collection)
            return []

    def distinct(
        self, collection: str, field: str, query: dict[str, Any] | None = None
    ) -> list[Any]:
        """Distinct non-empty values of a field.

        Errors are re-raised on purpose so callers that cache results never cache an
        empty list caused by a connection failure.
        """
        try:
            results = self.get_collection(collection).distinct(field, query or {})
        except Exception:
            logger.exception("distinct failed on '%s.%s'", collection, field)
            raise
        return [value for value in results if value is not None and value != ""]


db = MongoDatabase()
