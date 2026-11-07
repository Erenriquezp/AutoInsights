import logging

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from config import settings
from services import MarketService, MetadataService, VehicleService

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("autoinsights")

app = FastAPI(
    title="AutoInsights API",
    version=settings.APP_VERSION,
    description="Used-car market analytics",
)

# Read-only public API without cookies or auth headers, so no credentials are allowed.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
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


# ---------------------------------------------------------------- errors
@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})
