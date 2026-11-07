"""API contract over real gold tables: Parquet fixtures loaded by the DuckDB repository."""

import pytest
from fastapi.testclient import TestClient

import main
import services
from gold_fixtures import write_gold
from repository import GoldRepository

PRICES = [
    {"manufacturer": "ford", "model": "f-150", "year": 2010, "avg_price": 12_000.0, "count": 10},
    {"manufacturer": "ford", "model": "f-150", "year": 2020, "avg_price": 40_000.0, "count": 30},
    {"manufacturer": "ford", "model": "mustang", "year": 2015, "avg_price": 20_000.0, "count": 25},
    {"manufacturer": "ford", "model": "unknown", "year": 2015, "avg_price": 1.0, "count": 1},
    {"manufacturer": "toyota", "model": "camry", "year": 2018, "avg_price": 18_000.0, "count": 8},
    {"manufacturer": "unknown", "model": "x", "year": 2018, "avg_price": 1.0, "count": 1},
]

DATA = {
    "prices_by_model_year": PRICES,
    "market_stats": [{"total_vehicles": 54, "total_brands": 2, "avg_market_price": 25_000.0}],
    "price_volume_by_year": [
        {"year": 2020, "avg_price_year": 40_000.0, "volume_year": 30},
        {"year": 2010, "avg_price_year": 12_000.0, "volume_year": 10},
    ],
    "condition_distribution": [
        {"condition": "fair", "count": 3},
        {"condition": "good", "count": 40},
    ],
    "price_histogram": [{"price_range": 2_000, "count": 4}, {"price_range": 0, "count": 1}],
    "geo_distribution": [
        {"state": "tx", "count": 5, "avg_price": 1.0},
        {"state": "ca", "count": 9, "avg_price": 2.0},
    ],
    "top_brands": [{"manufacturer": "ford", "count": 46}, {"manufacturer": "toyota", "count": 8}],
    "mileage_points": [
        {"manufacturer": "ford", "model": "f-150", "odometer": 1_000.0, "price": 30_000},
        {"manufacturer": "ford", "model": "f-150", "odometer": 90_000.0, "price": 15_000},
        {"manufacturer": "toyota", "model": "camry", "odometer": 5_000.0, "price": 20_000},
    ],
}


def use_repository(monkeypatch: pytest.MonkeyPatch, repository: GoldRepository) -> None:
    monkeypatch.setattr(services, "get_repository", lambda: repository)
    services.MetadataService.get_models.cache_clear()


@pytest.fixture(scope="module")
def gold_repository(tmp_path_factory) -> GoldRepository:
    return GoldRepository(write_gold(tmp_path_factory.mktemp("gold"), DATA))


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch, gold_repository: GoldRepository) -> TestClient:
    use_repository(monkeypatch, gold_repository)
    return TestClient(main.app)


def test_root(client):
    assert client.get("/").json()["status"] == "online"


def test_brands_are_sorted_and_exclude_placeholders(client):
    assert client.get("/api/brands").json() == ["ford", "toyota"]


def test_models_for_a_brand_exclude_placeholders(client):
    assert client.get("/api/models/ford").json() == ["f-150", "mustang"]


def test_models_for_an_unknown_brand_are_empty(client):
    assert client.get("/api/models/lada").json() == []


def test_market_stats(client):
    assert client.get("/api/market/stats").json()["total_vehicles"] == 54


def test_market_stats_default_when_the_etl_has_not_run(monkeypatch, tmp_path):
    use_repository(monkeypatch, GoldRepository(tmp_path))  # empty folder: no gold tables

    stats = TestClient(main.app).get("/api/market/stats").json()

    assert stats == {
        "total_vehicles": 0,
        "total_brands": 0,
        "avg_market_price": 0,
        "year_range": "N/A",
    }


def test_trend_is_sorted_by_year(client):
    years = [row["year"] for row in client.get("/api/market/trend").json()]

    assert years == [2010, 2020]


def test_condition_is_sorted_by_count_desc(client):
    conditions = [row["condition"] for row in client.get("/api/market/condition").json()]

    assert conditions == ["good", "fair"]


def test_histogram_is_sorted_by_price_range(client):
    ranges = [row["price_range"] for row in client.get("/api/market/histogram").json()]

    assert ranges == [0, 2_000]


def test_geo_is_sorted_by_count_desc(client):
    states = [row["state"] for row in client.get("/api/market/geo").json()]

    assert states == ["ca", "tx"]


def test_top_brands_respects_limit(client):
    assert client.get("/api/market/brands?limit=1").json() == [
        {"manufacturer": "ford", "count": 46}
    ]


@pytest.mark.parametrize("limit", [0, 101])
def test_top_brands_rejects_out_of_range_limits(client, limit):
    assert client.get(f"/api/market/brands?limit={limit}").status_code == 422


def test_depreciation_summary_and_history(client):
    data = client.get("/api/vehicles/depreciation?brand=ford&model=f-150").json()

    assert data["vehicle"] == "ford f-150"
    assert [row["year"] for row in data["history"]] == [2010, 2020]
    # weighted average: (12,000 * 10 + 40,000 * 30) / 40
    assert data["summary"]["avg_price"] == 33_000.0
    assert data["summary"]["total_samples"] == 40
    # (40,000 - 12,000) / 40,000
    assert data["summary"]["depreciation_value"] == 70.0
    assert data["summary"]["depreciation_text"] == "70.0% historical depreciation"


def test_depreciation_with_a_single_year_has_not_enough_data(client):
    summary = client.get("/api/vehicles/depreciation?brand=ford&model=mustang").json()["summary"]

    assert summary["depreciation_value"] == 0
    assert summary["depreciation_text"] == "Not enough data"


def test_depreciation_for_an_unknown_model_is_404(client):
    response = client.get("/api/vehicles/depreciation?brand=ford&model=model-t")

    assert response.status_code == 404
    assert response.json() == {"detail": "No data found for ford model-t"}


def test_depreciation_requires_brand_and_model(client):
    assert client.get("/api/vehicles/depreciation?brand=ford").status_code == 422


def test_mileage_returns_only_price_and_odometer_for_the_model(client):
    points = client.get("/api/vehicles/mileage?brand=ford&model=f-150").json()

    assert sorted(points, key=lambda p: p["odometer"]) == [
        {"odometer": 1_000.0, "price": 30_000},
        {"odometer": 90_000.0, "price": 15_000},
    ]


def test_mileage_for_an_unknown_model_is_empty(client):
    assert client.get("/api/vehicles/mileage?brand=ford&model=model-t").json() == []


def test_zero_newest_price_is_reported_as_appreciation():
    history = [{"avg_price": 5_000.0}, {"avg_price": 0.0}]

    result = services.VehicleService._calculate_depreciation(history)

    assert result == {"text": "Value appreciation (classic)", "value": 0}


def test_mileage_sample_is_capped_deterministic_and_from_the_model(monkeypatch, tmp_path):
    points = [
        {"manufacturer": "ford", "model": "f-150", "odometer": float(i), "price": 1_000 + i}
        for i in range(1, 1_201)
    ] + [{"manufacturer": "ford", "model": "ranger", "odometer": 0.5, "price": 1}]
    use_repository(monkeypatch, GoldRepository(write_gold(tmp_path, {"mileage_points": points})))
    client = TestClient(main.app)

    first = client.get("/api/vehicles/mileage?brand=ford&model=f-150").json()
    second = client.get("/api/vehicles/mileage?brand=ford&model=f-150").json()

    assert len(first) == services.settings.MILEAGE_LIMIT
    assert first == second
    assert all(p["price"] == 1_000 + p["odometer"] for p in first)  # only f-150 rows
    assert [p["odometer"] for p in first] == sorted(p["odometer"] for p in first)


def test_model_selector_hides_models_with_few_listings(monkeypatch, tmp_path):
    rows = [
        {"manufacturer": "ford", "model": "f-150", "year": 2010, "avg_price": 1.0, "count": 15},
        {"manufacturer": "ford", "model": "f-150", "year": 2011, "avg_price": 1.0, "count": 5},
        {"manufacturer": "ford", "model": "24 ft", "year": 2010, "avg_price": 1.0, "count": 19},
    ]
    use_repository(
        monkeypatch, GoldRepository(write_gold(tmp_path, {"prices_by_model_year": rows}))
    )
    client = TestClient(main.app)

    assert client.get("/api/models/ford").json() == ["f-150"]  # 15 + 5 listings across years
    # a rare model is hidden from the selector but its data is still served
    assert client.get("/api/vehicles/depreciation?brand=ford&model=24 ft").status_code == 200
