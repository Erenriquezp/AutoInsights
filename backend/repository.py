"""Read-only access to the gold tables written by the ETL, through an in-memory DuckDB.

At startup every `<gold_path>/<table>/*.parquet` is loaded into an in-memory table. Then file and
network access is disabled and the configuration is locked, so no query (including the SQL that
the "Ask the data" feature will generate) can read files or change settings.
"""

import logging
import threading
from functools import lru_cache
from pathlib import Path
from typing import Any

import duckdb

from config import settings

logger = logging.getLogger(__name__)

GOLD_TABLES = (
    "prices_by_model_year",
    "price_volume_by_year",
    "mileage_points",
    "market_stats",
    "condition_distribution",
    "price_histogram",
    "geo_distribution",
    "top_brands",
)


class GoldRepository:
    def __init__(self, gold_path: Path) -> None:
        self._con = duckdb.connect(":memory:")
        self.loaded_tables: list[str] = []
        for table in GOLD_TABLES:
            files = sorted((gold_path / table).glob("*.parquet"))
            if not files:
                logger.warning("Gold table '%s' not found under %s", table, gold_path)
                continue
            # Table names come from the constant above, never from user input
            self._con.execute(
                f'CREATE TABLE "{table}" AS SELECT * FROM read_parquet(?)',
                [[str(f) for f in files]],
            )
            self.loaded_tables.append(table)
        self._con.execute("SET enable_external_access = false")
        self._con.execute("SET lock_configuration = true")
        logger.info("Loaded %d gold tables from %s", len(self.loaded_tables), gold_path)

    def query(self, sql: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
        """Run a read query; a table missing because the ETL has not run yields no rows."""
        cursor = self._con.cursor()  # one cursor per call: safe across request threads
        try:
            result = cursor.execute(sql, params or [])
        except duckdb.CatalogException:
            logger.warning("Query on a missing gold table: %s", sql)
            return []
        columns = [column[0] for column in result.description]
        return [dict(zip(columns, row, strict=True)) for row in result.fetchall()]

    def query_one(self, sql: str, params: list[Any] | None = None) -> dict[str, Any] | None:
        rows = self.query(sql, params)
        return rows[0] if rows else None

    def run_untrusted(self, sql: str, timeout_seconds: float) -> tuple[list[str], list[tuple]]:
        """Run validated, model-generated SQL with a time limit. Returns (columns, rows).

        Raises QueryTimeout when the limit is hit and QueryFailed for any database error.
        """
        cursor = self._con.cursor()
        timer = threading.Timer(timeout_seconds, cursor.interrupt)
        timer.start()
        try:
            result = cursor.execute(sql)
            return [column[0] for column in result.description], result.fetchall()
        except duckdb.InterruptException as error:
            raise QueryTimeout(f"The query took longer than {timeout_seconds:g}s.") from error
        except duckdb.Error as error:
            # First line only: DuckDB messages name columns and tables, nothing secret
            raise QueryFailed(str(error).splitlines()[0][:300]) from error
        finally:
            timer.cancel()
            cursor.close()

    def describe(self) -> dict[str, list[tuple[str, str]]]:
        """Column names and types of every loaded gold table."""
        return {
            table: [
                (row[0], row[1])
                for row in self._con.cursor().execute(f'DESCRIBE "{table}"').fetchall()
            ]
            for table in self.loaded_tables
        }


class QueryTimeout(Exception):
    pass


class QueryFailed(Exception):
    pass


@lru_cache(maxsize=1)
def get_repository() -> GoldRepository:
    return GoldRepository(Path(settings.GOLD_PATH))
