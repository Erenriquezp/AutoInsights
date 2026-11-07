"""In-memory stand-in for database.MongoDatabase with the same read methods."""

from typing import Any


def _matches(doc: dict[str, Any], query: dict[str, Any] | None) -> bool:
    return all(doc.get(key) == value for key, value in (query or {}).items())


def _project(doc: dict[str, Any], projection: dict[str, Any] | None) -> dict[str, Any]:
    included = [key for key, flag in (projection or {}).items() if flag and key != "_id"]
    return {key: doc[key] for key in included if key in doc} if included else dict(doc)


class FakeDatabase:
    def __init__(self, collections: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.collections = collections or {}

    def find_one(self, collection, query=None, projection=None):
        docs = self.find_many(collection, query, projection, limit=1)
        return docs[0] if docs else None

    def find_many(self, collection, query=None, projection=None, sort=None, limit=None):
        docs = [d for d in self.collections.get(collection, []) if _matches(d, query)]
        if sort:
            field, direction = sort
            docs = sorted(docs, key=lambda d: d[field], reverse=direction < 0)
        if limit:
            docs = docs[:limit]
        return [_project(d, projection) for d in docs]

    def distinct(self, collection, field, query=None):
        values = {d.get(field) for d in self.collections.get(collection, []) if _matches(d, query)}
        return [v for v in values if v is not None and v != ""]
