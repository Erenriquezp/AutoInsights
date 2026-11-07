# 0001. Serve gold tables as Parquet with DuckDB instead of MongoDB

- **Status:** Accepted
- **Date:** 2026-11-07

## Context

In v1 the ETL writes 8 pre-aggregated collections to MongoDB and the API reads them. Every dashboard
query is a read-only lookup or aggregate over small, pre-computed tables; nothing is written at
request time. In the cloud, MongoDB means a server that is always on (a cost) or a free tier with
limits. v2 also adds text-to-SQL, which needs a SQL engine and a schema the model can read.

## Decision

The ETL writes gold tables as Parquet files (a few MB, shipped with the API deployment). The API
queries them with DuckDB, embedded in the API process, behind a repository interface that keeps the
current response shapes.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep MongoDB (Atlas free tier) | Always-on dependency, connection limits, and no SQL for the text-to-SQL feature |
| PostgreSQL (RDS / Aurora Serverless) | Pays for an idle database to serve a few MB of read-only data |
| Amazon Athena over the same Parquet | Per-query cost and seconds of latency for every dashboard widget |
| Pre-rendered JSON files on S3 | Cheapest, but no ad-hoc queries, so no text-to-SQL |

## Consequences

- Near-zero storage and serving cost; no database to operate.
- Gold tables become the single schema for both the dashboard and the LLM prompt.
- DuckDB adds to the Lambda package size; check against the zip limit (see ADR-0003).
- The repository interface lets the API be tested against in-memory data.
- Data refresh means re-running the ETL and uploading files; acceptable for a static dataset.

- **MongoDB is retired** from the stack once the API returns the same data from DuckDB. The v1
  MongoDB version stays available at the `v1.0.0` tag.
