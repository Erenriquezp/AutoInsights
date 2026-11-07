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
    # Market-wide odometer distribution: band width and upper limit (miles)
    MILEAGE_BUCKET_SIZE: int = 10_000
    MILEAGE_MAX_BAND: int = 300_000
    # Models with fewer listings are hidden from the selector (their data is still served).
    # 20 keeps 819 of 4,350 models and 96 % of all listings.
    MIN_MODEL_LISTINGS: int = int(os.getenv("MIN_MODEL_LISTINGS", "20"))
    # Model years with fewer listings are not used for price comparisons (too noisy)
    MIN_YEAR_LISTINGS: int = int(os.getenv("MIN_YEAR_LISTINGS", "20"))
    EXCLUDE_EMPTY_VALUES: tuple[str | None, ...] = ("unknown", None, "")

    # "Ask the data"
    # fallback: Groq, then Gemini, for whichever keys are set (offline FakeProvider if none)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "fallback")  # fallback | groq | gemini | fake
    ASK_TIMEOUT_SECONDS: float = float(os.getenv("ASK_TIMEOUT_SECONDS", "3"))
    QUESTION_MAX_LENGTH: int = 300
    ASK_PER_MINUTE: int = int(os.getenv("ASK_PER_MINUTE", "6"))  # per client address
    ASK_PER_DAY: int = int(os.getenv("ASK_PER_DAY", "500"))  # all clients, per UTC day
    # Behind CloudFront the client address comes from X-Forwarded-For; locally it must not
    TRUST_PROXY_HEADERS: bool = os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true"


settings = Settings()
