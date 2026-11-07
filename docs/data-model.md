# Data model: gold tables

The ETL (`backend/spark/jobs/`) reads the 426,880 raw listings, keeps the 354,649 that pass
validation, and writes eight **gold tables** as Parquet to `backend/data/gold/<table>/`
(2.9 MB in total). The API loads them into an in-memory DuckDB at startup and serves every
endpoint from them. The same tables are the schema the "Ask the data" feature exposes to the LLM.

## Cleaning rules

| Rule | Value |
|---|---|
| Price | strictly between $500 and $1,000,000 |
| Model year | 1991 to 2025 |
| Brand and model | both present; model normalized to a catalog name or a short cleaned name |
| Odometer (mileage table only) | strictly between 0 and 500,000 |
| State (geo table only) | 2-letter US code |

Model normalization (`normalize.py`) lowercases the text, strips a leading model year, fixes
known spellings (`f150`, `f 350` -> `f-150`, `f-350`), matches a per-brand catalog (longest name
first), and otherwise drops the brand and anything from the first trim/noise word on, keeping
the first two tokens. Rows that normalize to `unknown` are dropped; `other` is kept.

## Tables

### `prices_by_model_year` (16,007 rows)
Average asking price per brand, model and model year. Source of depreciation curves and of the
brand and model selectors.

| Column | Type | Notes |
|---|---|---|
| `manufacturer` | VARCHAR | lowercase brand, e.g. `ford` |
| `model` | VARCHAR | normalized model, e.g. `f-150` |
| `year` | INTEGER | model year |
| `avg_price` | DOUBLE | USD, rounded to cents |
| `count` | BIGINT | listings behind the average |

### `price_volume_by_year` (32 rows)
| Column | Type | Notes |
|---|---|---|
| `year` | INTEGER | model year |
| `avg_price_year` | DOUBLE | USD |
| `volume_year` | BIGINT | listings |

### `mileage_points` (351,503 rows)
One row per listing with a plausible odometer. The API returns a seeded 500-point sample per model.

| Column | Type | Notes |
|---|---|---|
| `manufacturer` | VARCHAR | |
| `model` | VARCHAR | |
| `odometer` | DOUBLE | miles |
| `price` | INTEGER | USD |

### `market_stats` (1 row)
| Column | Type |
|---|---|
| `total_vehicles`, `total_brands`, `total_models` | BIGINT |
| `avg_market_price` | DOUBLE |
| `most_expensive`, `cheapest` | INTEGER |
| `oldest_year`, `newest_year` | INTEGER |

### `condition_distribution` (7 rows)
`condition` VARCHAR (`excellent`, `good`, `like new`, `fair`, `new`, `salvage`, `unknown`),
`count` BIGINT.

### `price_histogram` (50 rows)
`price_range` BIGINT (lower bound of a $2,000 bucket, below $100,000), `count` BIGINT.

### `geo_distribution` (51 rows)
`state` VARCHAR (lowercase 2-letter code), `count` BIGINT, `avg_price` DOUBLE.

### `top_brands` (10 rows)
`manufacturer` VARCHAR, `count` BIGINT.

## Regenerating

```bash
docker compose up -d --build
docker exec -it spark-master /opt/spark/bin/spark-submit /app/etl_job.py
docker compose restart backend   # reload the tables
```
