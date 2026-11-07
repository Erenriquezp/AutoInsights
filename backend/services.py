from functools import lru_cache
from typing import Any

from config import settings
from repository import get_repository


def _repo():
    return get_repository()


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
        rows = _repo().query("SELECT DISTINCT manufacturer FROM prices_by_model_year")
        return MetadataService.clean_list([row["manufacturer"] for row in rows])

    @staticmethod
    @lru_cache(maxsize=512)
    def get_models(brand: str) -> list[str]:
        rows = _repo().query(
            """
            SELECT model
            FROM prices_by_model_year
            WHERE manufacturer = ?
            GROUP BY model
            HAVING sum(count) >= ?
            """,
            [brand, settings.MIN_MODEL_LISTINGS],
        )
        return MetadataService.clean_list([row["model"] for row in rows])


class MarketService(BaseService):
    """Market-wide aggregates."""

    @staticmethod
    def get_stats() -> dict[str, Any]:
        stats = _repo().query_one("SELECT * FROM market_stats")
        return stats or {
            "total_vehicles": 0,
            "total_brands": 0,
            "avg_market_price": 0,
            "year_range": "N/A",
        }

    @staticmethod
    def get_trend() -> list[dict[str, Any]]:
        """Average price and listing volume per model year."""
        return _repo().query("SELECT * FROM price_volume_by_year ORDER BY year")

    @staticmethod
    def get_condition_distribution() -> list[dict[str, Any]]:
        return _repo().query("SELECT * FROM condition_distribution ORDER BY count DESC, condition")

    @staticmethod
    def get_price_histogram() -> list[dict[str, Any]]:
        return _repo().query("SELECT * FROM price_histogram ORDER BY price_range")

    @staticmethod
    def get_geo_data() -> list[dict[str, Any]]:
        """Listings and average price per US state."""
        return _repo().query("SELECT * FROM geo_distribution ORDER BY count DESC, state")

    @staticmethod
    def get_top_brands(limit: int = 10) -> list[dict[str, Any]]:
        return _repo().query(
            "SELECT * FROM top_brands ORDER BY count DESC, manufacturer LIMIT ?", [limit]
        )


class VehicleService(BaseService):
    """Analysis for a single brand and model."""

    @staticmethod
    def get_depreciation(brand: str, model: str) -> dict[str, Any] | None:
        history = _repo().query(
            "SELECT * FROM prices_by_model_year WHERE manufacturer = ? AND model = ? ORDER BY year",
            [brand, model],
        )
        if not history:
            return None

        total_count = sum(row["count"] for row in history)
        weighted_price = sum(row["avg_price"] * row["count"] for row in history)
        avg_price = round(weighted_price / total_count, 2) if total_count > 0 else 0
        min_listings = settings.MIN_YEAR_LISTINGS

        return {
            "vehicle": f"{brand} {model}",
            "summary": {
                "avg_price": avg_price,
                "total_samples": total_count,
                "min_year_listings": min_listings,
                "five_year_change": VehicleService._five_year_change(history, min_listings),
            },
            "history": history,
        }

    @staticmethod
    def _five_year_change(
        history: list[dict[str, Any]], min_listings: int
    ) -> dict[str, Any] | None:
        """How much less a model year five years older is listed for.

        Only model years with at least `min_listings` listings count: v1 compared the oldest and
        newest years whatever their size (e.g. against a 2022 with one listing). The newest
        reliable year is compared with the reliable year exactly five years before it; without
        such a pair there is no figure, rather than a misleading one.
        """
        reliable = {row["year"]: row for row in history if row["count"] >= min_listings}
        if not reliable:
            return None
        to_year = max(reliable)
        newer, older = reliable[to_year], reliable.get(to_year - 5)
        if older is None or newer["avg_price"] <= 0:
            return None
        return {
            "from_year": older["year"],
            "to_year": newer["year"],
            "from_price": older["avg_price"],
            "to_price": newer["avg_price"],
            "pct": round((older["avg_price"] / newer["avg_price"] - 1) * 100, 1),
        }

    @staticmethod
    def get_mileage_analysis(brand: str, model: str) -> list[dict[str, Any]]:
        """Up to MILEAGE_LIMIT price vs. odometer points for the scatter plot.

        A seeded reservoir sample: uniform over the model's listings (so the scatter reflects the
        real distribution) and the same on every request. The sample size cannot be a bound
        parameter in DuckDB, so it comes from settings as a validated int.
        """
        sample_size = int(settings.MILEAGE_LIMIT)
        return _repo().query(
            f"""
            SELECT odometer, price
            FROM (
                SELECT odometer, price
                FROM mileage_points
                WHERE manufacturer = ? AND model = ?
            )
            USING SAMPLE reservoir({sample_size} ROWS) REPEATABLE (42)
            ORDER BY odometer
            """,
            [brand, model],
        )
