import os
from dataclasses import dataclass, field


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    """Application settings, read from environment variables."""

    APP_VERSION: str = "2.0.0-dev"
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("MONGO_DATABASE", "autoinsights")
    CORS_ORIGINS: list[str] = field(
        default_factory=lambda: _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    )

    # Logical name -> MongoDB collection written by the ETL
    COLLECTIONS: dict[str, str] = field(
        default_factory=lambda: {
            "prices": "precios_promedio",
            "trend": "kpi_price_volume",
            "mileage": "kilometraje",
            "stats": "estadisticas_mercado",
            "condition": "distribucion_condicion",
            "histogram": "histograma_precios",
            "geo": "distribucion_geo",
            "brands": "top_brands",
        }
    )

    # Maximum points returned for the price vs. mileage scatter plot
    MILEAGE_LIMIT: int = 500
    EXCLUDE_EMPTY_VALUES: tuple[str | None, ...] = ("unknown", None, "")


settings = Settings()
