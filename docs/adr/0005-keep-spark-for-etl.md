# 0005. Keep Spark for the ETL, run locally

- **Status:** Proposed
- **Date:** 2026-11-07

## Context

The ETL processes a 1.4 GB CSV (426,880 rows) on a local Spark cluster (1 master + 2 workers). The
dataset is static, so the ETL runs rarely. Spark is the core of the original Big Data project and a
skill worth showing, but any managed Spark service in the cloud would be the only paid part of the system.

## Decision

Keep PySpark for the ETL and run it **locally** only (the Compose cluster, or `local[*]` for quick
runs). Its output, the gold Parquet tables, is a build artifact that ships with the API deployment.
No cloud processing.

Transformations are refactored into pure DataFrame functions, with the Spark session, input path
and output sink injected, so they can be tested with a small synthetic fixture.

## Alternatives considered

| Option | Why not |
|---|---|
| Rewrite in DuckDB or Polars | Would handle 1.4 GB on one machine, but drops the distributed-processing story the project is built on |
| Amazon EMR / Glue | Paid, for a job that runs a few times a year |
| EMR Serverless | Paid per run; adds setup for no gain at this data size |

## Consequences

- Processing costs nothing.
- The Compose cluster stays as the demonstration of distributed execution.
- Gold tables are regenerated from the CSV, so they need no backups.
- Reproducing the data requires downloading the dataset from Kaggle (documented in the README).
