"""Builds gold-table fixtures in the layout the ETL produces."""

from pathlib import Path
from typing import Any

import duckdb


def write_gold(root: Path, tables: dict[str, list[dict[str, Any]]]) -> Path:
    """Write each table as <root>/<table>/part-0.parquet, the layout the ETL produces."""
    con = duckdb.connect()
    for table, rows in tables.items():
        folder = root / table
        folder.mkdir(parents=True)
        columns = list(rows[0])
        values = ", ".join(
            "(" + ", ".join(repr(row[c]) if row[c] is not None else "NULL" for c in columns) + ")"
            for row in rows
        )
        quoted = ", ".join(f'"{c}"' for c in columns)
        con.execute(
            f"COPY (SELECT * FROM (VALUES {values}) AS t({quoted})) "
            f"TO '{(folder / 'part-0.parquet').as_posix()}' (FORMAT parquet)"
        )
    con.close()
    return root
