from functools import lru_cache
from typing import Any

from config import settings
from database import db


class BaseService:
    @staticmethod
    def clean_list(items: list[str]) -> list[str]:
        """Sorted unique values without empty or placeholder entries."""
        return sorted(
            {item for item in items if item and item not in settings.EXCLUDE_EMPTY_VALUES}
        )


class MetadataService(BaseService):
    """Values for the brand and model selectors."""

    @staticmethod
    def get_brands() -> list[str]:
        brands = db.distinct("prices", "manufacturer")
        return MetadataService.clean_list(brands)

    @staticmethod
    @lru_cache(maxsize=512)
    def get_models(brand: str) -> list[str]:
        models = db.distinct("prices", "model", {"manufacturer": brand})
        return MetadataService.clean_list(models)


class MarketService(BaseService):
    """Market-wide aggregates."""

    @staticmethod
    def get_stats() -> dict[str, Any]:
        stats = db.find_one("stats")
        return stats or {
            "total_vehicles": 0,
            "total_brands": 0,
            "avg_market_price": 0,
            "year_range": "N/A",
        }

    @staticmethod
    def get_trend() -> list[dict[str, Any]]:
        """Average price and listing volume per model year."""
        return db.find_many("trend", sort=("year", 1))

    @staticmethod
    def get_condition_distribution() -> list[dict[str, Any]]:
        return db.find_many("condition", sort=("count", -1))

    @staticmethod
    def get_price_histogram() -> list[dict[str, Any]]:
        return db.find_many("histogram", sort=("price_range", 1))

    @staticmethod
    def get_geo_data() -> list[dict[str, Any]]:
        """Listings and average price per US state."""
        return db.find_many("geo", sort=("count", -1))

    @staticmethod
    def get_top_brands(limit: int = 10) -> list[dict[str, Any]]:
        return db.find_many("brands", limit=limit)


class VehicleService(BaseService):
    """Analysis for a single brand and model."""

    @staticmethod
    def get_depreciation(brand: str, model: str) -> dict[str, Any] | None:
        history = db.find_many(
            "prices",
            query={"manufacturer": brand, "model": model},
            sort=("year", 1),
        )
        if not history:
            return None

        total_count = sum(row["count"] for row in history)
        weighted_price = sum(row["avg_price"] * row["count"] for row in history)
        avg_price = round(weighted_price / total_count, 2) if total_count > 0 else 0
        depreciation = VehicleService._calculate_depreciation(history)

        return {
            "vehicle": f"{brand} {model}",
            "summary": {
                "avg_price": avg_price,
                "total_samples": total_count,
                "depreciation_text": depreciation["text"],
                "depreciation_value": depreciation["value"],
            },
            "history": history,
        }

    @staticmethod
    def _calculate_depreciation(history: list[dict[str, Any]]) -> dict[str, Any]:
        """Percentage drop from the newest model year's price to the oldest one's.

        `history` is sorted by year ascending, so the last row is the newest model year.
        """
        if len(history) < 2:
            return {"text": "Not enough data", "value": 0}

        price_newest = history[-1]["avg_price"]
        price_oldest = history[0]["avg_price"]

        if price_newest > 0:
            drop_pct = ((price_newest - price_oldest) / price_newest) * 100
            return {
                "text": f"{drop_pct:.1f}% historical depreciation",
                "value": round(drop_pct, 2),
            }

        return {"text": "Value appreciation (classic)", "value": 0}

    @staticmethod
    def get_mileage_analysis(brand: str, model: str) -> list[dict[str, Any]]:
        """Price vs. odometer points for the scatter plot."""
        return db.find_many(
            "mileage",
            query={"manufacturer": brand, "model": model},
            projection={"_id": 0, "odometer": 1, "price": 1},
            limit=settings.MILEAGE_LIMIT,
        )
