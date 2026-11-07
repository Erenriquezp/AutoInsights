import logging
from dataclasses import asdict
from functools import lru_cache
from typing import Any

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator

from ask.limits import RateLimited, RateLimiter
from ask.providers import EXAMPLES, get_provider
from ask.service import AskError, AskService
from config import settings
from repository import get_repository
from services import MarketService, MetadataService, VehicleService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("autoinsights")

app = FastAPI(
    title="AutoInsights API",
    version=settings.APP_VERSION,
    description="Used-car market analytics",
)

# Public API without cookies or auth headers, so no credentials are allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# ---------------------------------------------------------------- health
@app.get("/", tags=["Health"])
def read_root() -> dict[str, str]:
    return {"status": "online", "service": "AutoInsights API"}


@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    return {"status": "healthy", "version": settings.APP_VERSION}


# ---------------------------------------------------------------- metadata
@app.get("/api/brands", tags=["Metadata"])
def get_brands():
    """Available brands."""
    return MetadataService.get_brands()


@app.get("/api/models/{brand}", tags=["Metadata"])
def get_models(brand: str):
    """Models available for a brand."""
    return MetadataService.get_models(brand)


# ---------------------------------------------------------------- market
@app.get("/api/market/stats", tags=["Market"])
def get_market_stats():
    """Global market KPIs."""
    return MarketService.get_stats()


@app.get("/api/market/trend", tags=["Market"])
def get_market_trend():
    """Average price vs. listing volume per model year."""
    return MarketService.get_trend()


@app.get("/api/market/condition", tags=["Market"])
def get_market_condition():
    """Listings by reported condition."""
    return MarketService.get_condition_distribution()


@app.get("/api/market/histogram", tags=["Market"])
def get_price_histogram():
    """Price distribution in fixed-size buckets."""
    return MarketService.get_price_histogram()


@app.get("/api/market/geo", tags=["Market"])
def get_geo_data():
    """Listings and average price per US state."""
    return MarketService.get_geo_data()


@app.get("/api/market/mileage", tags=["Market"])
def get_mileage_distribution():
    """Listings per 10,000-mile odometer band across all models, and the median odometer."""
    return MarketService.get_mileage_distribution()


@app.get("/api/market/brands", tags=["Market"])
def get_top_brands(limit: int = Query(10, ge=1, le=100)):
    """Top brands by listing volume."""
    return MarketService.get_top_brands(limit)


# ---------------------------------------------------------------- vehicle
@app.get("/api/vehicles/depreciation", tags=["Vehicle"])
def get_depreciation(
    brand: str = Query(..., min_length=1),
    model: str = Query(..., min_length=1),
):
    """Average price per model year and the historical depreciation of one model."""
    data = VehicleService.get_depreciation(brand, model)
    if not data:
        raise HTTPException(status_code=404, detail=f"No data found for {brand} {model}")
    return data


@app.get("/api/vehicles/mileage", tags=["Vehicle"])
def get_mileage_analysis(
    brand: str = Query(..., min_length=1),
    model: str = Query(..., min_length=1),
):
    """Price vs. odometer points for one model."""
    return VehicleService.get_mileage_analysis(brand, model)


# ---------------------------------------------------------------- ask the data
class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=settings.QUESTION_MAX_LENGTH)

    @field_validator("question")
    @classmethod
    def strip_question(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 3:
            raise ValueError("The question is too short.")
        return value


class ChartSuggestion(BaseModel):
    type: str
    x: str | None = None
    y: str | None = None


class AskResponse(BaseModel):
    question: str
    sql: str
    columns: list[str]
    rows: list[list[Any]]
    chart: ChartSuggestion
    provider: str
    model: str


@lru_cache(maxsize=1)
def get_ask_service() -> AskService:
    return AskService(
        get_repository(), get_provider(settings.LLM_PROVIDER), settings.ASK_TIMEOUT_SECONDS
    )


@lru_cache(maxsize=1)
def get_rate_limiter() -> RateLimiter:
    return RateLimiter(settings.ASK_PER_MINUTE, settings.ASK_PER_DAY)


def client_address(request: Request, trust_proxy: bool) -> str:
    """The visitor's address for rate limiting. X-Forwarded-For is only trusted behind a
    known proxy (CloudFront); otherwise anyone could pick their own limit bucket."""
    forwarded = request.headers.get("x-forwarded-for", "")
    if trust_proxy and forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@app.post("/api/ask", tags=["Ask the data"], response_model=AskResponse)
def ask_the_data(body: AskRequest, request: Request):
    """Answer a question in plain English with validated, visible SQL over the gold tables."""
    try:
        get_rate_limiter().check(client_address(request, settings.TRUST_PROXY_HEADERS))
    except RateLimited as error:
        return JSONResponse(
            status_code=429,
            content={"detail": {"code": "rate_limited", "message": str(error)}},
            headers={"Retry-After": str(error.retry_after)},
        )
    return asdict(get_ask_service().ask(body.question))


@app.get("/api/ask/examples", tags=["Ask the data"])
def ask_examples() -> list[str]:
    """Example questions for the UI."""
    return list(EXAMPLES)


# ---------------------------------------------------------------- errors
@app.exception_handler(AskError)
async def ask_error_handler(request: Request, exc: AskError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status, content={"detail": {"code": exc.code, "message": str(exc)}}
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
