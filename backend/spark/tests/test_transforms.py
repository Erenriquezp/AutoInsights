from pathlib import Path

import pytest
from pyspark.sql import DataFrame, SparkSession

import transforms

FIXTURES = Path(__file__).parent / "fixtures"


def listing(**values) -> dict:
    """A valid listing; override any column."""
    row = {name: None for name in transforms.SCHEMA.fieldNames()}
    row.update(
        id="1",
        price=15_000,
        year=2015,
        manufacturer="toyota",
        model="camry le",
        condition="good",
        odometer=80_000.0,
        state="ca",
    )
    row.update(values)
    return row


def frame(spark: SparkSession, *rows: dict) -> DataFrame:
    return spark.createDataFrame(list(rows), schema=transforms.SCHEMA)


def as_dicts(df: DataFrame) -> list[dict]:
    return [row.asDict() for row in df.collect()]


# ------------------------------------------------------------------ validation and cleaning


@pytest.mark.parametrize(
    ("field", "value", "kept"),
    [
        ("price", 500, False),  # lower bound is exclusive
        ("price", 501, True),
        ("price", 999_999, True),
        ("price", 1_000_000, False),
        ("price", 0, False),
        ("price", None, False),
        ("year", 1990, False),
        ("year", 1991, True),
        ("year", 2025, True),
        ("year", 2026, False),
        ("year", None, False),
        ("manufacturer", None, False),
        ("model", None, False),
    ],
)
def test_validate_bounds(spark, field, value, kept):
    df = frame(spark, listing(**{field: value}))

    assert (transforms.validate(df).count() == 1) is kept


def test_clean_normalizes_models_and_drops_unusable_ones(spark):
    df = frame(
        spark,
        listing(id="1", model="F-150 XLT", manufacturer="ford"),
        listing(id="2", model="", manufacturer="ford"),  # normalizes to "unknown"
        listing(id="3", model="clean title", manufacturer="mazda"),  # normalizes to "other"
        listing(id="4", model="camry", price=100),  # invalid price
    )

    result = {row["id"]: row["model"] for row in as_dicts(transforms.clean(df))}

    assert result == {"1": "f-150", "3": "other"}


def test_corrupt_state_rows(spark):
    df = frame(spark, listing(id="1", state="ca"), listing(id="2", state="california"))

    assert [row["id"] for row in as_dicts(transforms.corrupt_state_rows(df))] == ["2"]


# ------------------------------------------------------------------ aggregates


@pytest.fixture
def clean_sample(spark) -> DataFrame:
    return frame(
        spark,
        listing(id="1", manufacturer="ford", model="f-150", year=2015, price=20_000),
        listing(id="2", manufacturer="ford", model="f-150", year=2015, price=30_000),
        listing(id="3", manufacturer="ford", model="f-150", year=2018, price=40_000),
        listing(
            id="4",
            manufacturer="toyota",
            model="camry",
            year=2018,
            price=10_001,
            condition=None,
            odometer=None,
            state="tx",
        ),
        listing(
            id="5",
            manufacturer="honda",
            model="civic",
            year=2010,
            price=5_000,
            odometer=600_000.0,
            state="texas",
        ),
    )


def test_prices_by_model_year(clean_sample):
    rows = as_dicts(transforms.prices_by_model_year(clean_sample))

    assert {
        "manufacturer": "ford",
        "model": "f-150",
        "year": 2015,
        "avg_price": 25_000.0,
        "count": 2,
    } in rows
    assert len(rows) == 4


def test_price_volume_by_year_is_sorted(clean_sample):
    rows = as_dicts(transforms.price_volume_by_year(clean_sample))

    assert [row["year"] for row in rows] == [2010, 2015, 2018]
    assert rows[2] == {"year": 2018, "avg_price_year": 25_000.5, "volume_year": 2}


def test_mileage_points_drop_missing_and_implausible_odometers(clean_sample):
    rows = as_dicts(transforms.mileage_points(clean_sample))

    assert len(rows) == 3
    assert set(rows[0]) == {"manufacturer", "model", "odometer", "price"}


def test_market_stats(clean_sample):
    [stats] = as_dicts(transforms.market_stats(clean_sample))

    assert stats == {
        "total_vehicles": 5,
        "total_brands": 3,
        "total_models": 3,
        "avg_market_price": 21_000.2,
        "most_expensive": 40_000,
        "cheapest": 5_000,
        "oldest_year": 2010,
        "newest_year": 2018,
    }


def test_condition_distribution_counts_missing_as_unknown(clean_sample):
    rows = as_dicts(transforms.condition_distribution(clean_sample))

    assert rows[0] == {"condition": "good", "count": 4}
    assert {"condition": "unknown", "count": 1} in rows


def test_price_histogram_buckets(spark):
    df = frame(
        spark,
        listing(price=1_999),
        listing(price=2_000),
        listing(price=3_999),
        listing(price=150_000),  # above the histogram range
    )

    rows = as_dicts(transforms.price_histogram(df))

    assert rows == [{"price_range": 0, "count": 1}, {"price_range": 2_000, "count": 2}]


def test_geo_distribution_ignores_invalid_states(clean_sample):
    rows = as_dicts(transforms.geo_distribution(clean_sample))

    assert rows == [
        {"state": "ca", "count": 3, "avg_price": 30_000.0},
        {"state": "tx", "count": 1, "avg_price": 10_001.0},
    ]


def test_top_brands_orders_by_volume_then_name(clean_sample):
    rows = as_dicts(transforms.top_brands(clean_sample, limit=2))

    assert rows == [{"manufacturer": "ford", "count": 3}, {"manufacturer": "honda", "count": 1}]


def test_build_aggregates_uses_the_collection_names_the_api_reads(clean_sample):
    aggregates = transforms.build_aggregates(clean_sample)

    assert set(aggregates) == {
        "precios_promedio",
        "kpi_price_volume",
        "kilometraje",
        "estadisticas_mercado",
        "distribucion_condicion",
        "histograma_precios",
        "distribucion_geo",
        "top_brands",
    }


# ------------------------------------------------------------------ extract


def test_extract_parses_multiline_descriptions(spark):
    from etl_job import extract

    df = extract(spark, str(FIXTURES / "vehicles_sample.csv"))
    rows = {row["id"]: row for row in df.collect()}

    assert len(rows) == 3
    assert "\n" in rows["2"]["description"]
    assert rows["2"]["price"] == 8_500
    assert rows["3"]["odometer"] == 120_000.0
