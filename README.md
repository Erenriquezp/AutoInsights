# AutoInsights

[![CI](https://github.com/Erenriquezp/AutoInsights/actions/workflows/ci.yml/badge.svg?branch=release%2Fv2-cloud-platform)](https://github.com/Erenriquezp/AutoInsights/actions/workflows/ci.yml)

**Used-car market analytics at scale.** A distributed Apache Spark ETL cleans and aggregates 420K+ used-car listings into Parquet gold tables, a FastAPI service serves them with DuckDB, and a React dashboard turns them into price, depreciation, mileage and geographic insights.

> Academic team project (Big Data course, Universidad Central del Ecuador, 2026).

![AutoInsights dashboard](docs/assets/dashboard.webp)

## Highlights

- **Distributed processing:** Spark 3.5 cluster (1 master + 2 workers) running in Docker Compose.
- **Data quality first:** explicit schema, multi-line CSV parsing, range validation and model-name normalization. **426,880 raw listings → 354,649 clean records.**
- **Pre-aggregated serving layer:** the ETL writes 8 gold tables as Parquet (2.9 MB), loaded into an in-memory DuckDB by the API, with no database server to run. See the [data model](docs/data-model.md).
- **Dashboard:** React 19 + TypeScript with a collapsible side menu, English and Spanish, shareable vehicle links and a self-contained US tile map. Pages: market overview, vehicle analysis (price by model year, five-year value change, price vs. mileage), geography, Ask the data and about. Every chart can be shown as a table.

## Architecture

```mermaid
flowchart LR
    CSV[(vehicles.csv<br/>427K listings)] --> ETL
    subgraph Spark cluster
        ETL[ETL job<br/>extract · validate · normalize · aggregate]
    end
    ETL -->|8 gold tables| GOLD[(Parquet)]
    GOLD --> API[FastAPI + DuckDB<br/>11 endpoints]
    API --> UI[React + TypeScript<br/>dashboard]
```

| Layer | Tech | Where |
|---|---|---|
| Processing | Apache Spark 3.5 (PySpark) | `backend/spark/jobs/` |
| Storage | Parquet gold tables | `backend/data/gold/` (generated) |
| API | FastAPI, DuckDB | `backend/main.py`, `backend/services.py`, `backend/repository.py` |
| Frontend | React 19, TypeScript, Vite, React Router, Recharts, Vitest | `frontend/` |
| Exploration | Jupyter + PySpark | `backend/notebooks/ETL_Process.ipynb` |

## Data pipeline

1. **Extract:** reads the CSV with a predefined 26-column schema and multi-line parsing (listing descriptions contain line breaks).
2. **Validate:** keeps price $500–$1M, model years 1990–2025, odometer ≤ 500,000 and 2-letter US state codes. Corrupt rows are reported before they are filtered.
3. **Normalize:** maps free-text model names to a catalog of 16 brands, with spelling fixes (`f150`, `f 350` → `f-150`, `f-350`) and removal of model years and noise words (`clean title`, `4x4`, trims…).
4. **Aggregate and load:** writes average prices, the price/volume trend, mileage, market stats, condition distribution, the price histogram, geographic distribution and the top brands as Parquet gold tables.

## API

| Endpoint | Returns |
|---|---|
| `GET /api/brands` · `GET /api/models/{brand}` | Selector metadata |
| `GET /api/market/stats` | Global market KPIs |
| `GET /api/market/trend` | Average price vs. volume per year |
| `GET /api/market/condition` | Vehicles by condition |
| `GET /api/market/histogram` | Price distribution |
| `GET /api/market/geo` | Listings by US state (heat map) |
| `GET /api/market/brands?limit=10` | Top brands by volume |
| `GET /api/vehicles/depreciation?brand=&model=` | Depreciation curve for a model |
| `GET /api/vehicles/mileage?brand=&model=` | Price vs. mileage scatter |
| `POST /api/ask` · `GET /api/ask/examples` | Ask the data: a question in plain English answered with validated, visible SQL ([security](docs/security.md)) |

Interactive docs at `http://localhost:8000/docs`.

## Run it

Requirements: Docker and Docker Compose.

```bash
git clone https://github.com/Erenriquezp/AutoInsights.git
cd AutoInsights

# 1. Put the dataset at backend/data/vehicles.csv (not versioned)
# 2. Start the Spark cluster, the API and the dashboard
docker compose up -d --build

# 3. Run the ETL on the cluster, then reload the API
docker exec -it spark-master /opt/spark/bin/spark-submit /app/etl_job.py
docker compose restart backend
```

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| API + docs | http://localhost:8000/docs |
| Spark master UI | http://localhost:8080 |
| Spark workers | http://localhost:8081 · http://localhost:8082 |

## Data

[Used Cars Dataset](https://www.kaggle.com/datasets/austinreese/craigslist-carstrucks-data) by Austin Reese: Craigslist US vehicle listings, published on Kaggle under CC0 (public domain). Download `vehicles.csv` from Kaggle; it is not stored in this repository.

## Team

Built by Edison Enríquez, Ariel Elizalde and Mariel Milán.
