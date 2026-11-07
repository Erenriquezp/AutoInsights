"""Builds gold-table fixtures in the layout the ETL produces."""

from pathlib import Path
from typing import Any

import duckdb

# Python type -> DuckDB type, close to what Spark writes (floats are DOUBLE, counts BIGINT)
_TYPES = {bool: "BOOLEAN", int: "BIGINT", float: "DOUBLE", str: "VARCHAR"}


def _column_type(values: list[Any]) -> str:
    kinds = {type(v) for v in values if v is not None}
    if kinds == {int, float}:
        return "DOUBLE"
    return _TYPES[kinds.pop()] if len(kinds) == 1 else "VARCHAR"


def write_gold(root: Path, tables: dict[str, list[dict[str, Any]]]) -> Path:
    """Write each table as <root>/<table>/part-0.parquet. Values are bound, never interpolated."""
    con = duckdb.connect()
    for table, rows in tables.items():
        folder = root / table
        folder.mkdir(parents=True)
        columns = list(rows[0])
        types = {c: _column_type([row[c] for row in rows]) for c in columns}
        con.execute(f"CREATE TABLE t ({', '.join(f'"{c}" {types[c]}' for c in columns)})")
        con.executemany(
            f"INSERT INTO t VALUES ({', '.join('?' for _ in columns)})",
            [[row[c] for c in columns] for row in rows],
        )
        con.execute(f"COPY t TO '{(folder / 'part-0.parquet').as_posix()}' (FORMAT parquet)")
        con.execute("DROP TABLE t")
    con.close()
    return root
