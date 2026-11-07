import os
from dataclasses import dataclass, field
from pathlib import Path


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    """Application settings, read from environment variables."""

    APP_VERSION: str = "2.0.0-dev"
    # Folder with the gold tables written by the ETL: <GOLD_PATH>/<table>/*.parquet
    GOLD_PATH: str = os.getenv("GOLD_PATH", str(Path(__file__).resolve().parent / "data" / "gold"))
    CORS_ORIGINS: list[str] = field(
        default_factory=lambda: _split_csv(os.getenv("CORS_ORIGINS", "http://localhost:5173"))
    )

    # Maximum points returned for the price vs. mileage scatter plot
    MILEAGE_LIMIT: int = 500
    EXCLUDE_EMPTY_VALUES: tuple[str | None, ...] = ("unknown", None, "")


settings = Settings()
