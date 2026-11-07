"""The repository loads gold tables and keeps queries away from files and settings."""

import duckdb
import pytest

from gold_fixtures import write_gold
from repository import GOLD_TABLES, GoldRepository


@pytest.fixture
def repository(tmp_path) -> GoldRepository:
    return GoldRepository(write_gold(tmp_path, {"market_stats": [{"total_vehicles": 3}]}))


def test_loads_only_tables_that_exist(repository):
    assert repository.loaded_tables == ["market_stats"]
    assert repository.query_one("SELECT total_vehicles FROM market_stats") == {"total_vehicles": 3}


def test_missing_table_returns_no_rows(repository):
    assert repository.query("SELECT * FROM top_brands") == []
    assert repository.query_one("SELECT * FROM top_brands") is None


def test_parameters_are_bound_not_interpolated(repository):
    rows = repository.query("SELECT ? AS value", ["x' OR '1'='1"])

    assert rows == [{"value": "x' OR '1'='1"}]


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT * FROM read_csv('/etc/passwd')",
        "SELECT * FROM read_parquet('/tmp/anything.parquet')",
        "COPY market_stats TO '/tmp/out.csv'",
        "ATTACH '/tmp/other.duckdb' AS other",
    ],
)
def test_file_access_is_disabled(repository, sql):
    with pytest.raises(duckdb.PermissionException):
        repository.query(sql)


def test_configuration_is_locked(repository):
    with pytest.raises(duckdb.InvalidInputException):
        repository.query("SET enable_external_access = true")


def test_gold_table_names_match_the_etl():
    assert GOLD_TABLES == (
        "prices_by_model_year",
        "price_volume_by_year",
        "mileage_points",
        "market_stats",
        "condition_distribution",
        "price_histogram",
        "geo_distribution",
        "top_brands",
    )
