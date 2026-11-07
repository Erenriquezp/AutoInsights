# Architecture decision records

Each ADR records one decision: the context, what was decided, the alternatives rejected and the
consequences. ADRs are not rewritten after acceptance; a later ADR supersedes an earlier one.

Status values: `Proposed` -> `Accepted` -> (`Superseded by NNNN` | `Deprecated`).

| ADR | Title | Status |
|---|---|---|
| [0001](0001-parquet-duckdb-serving-layer.md) | Serve gold tables as Parquet with DuckDB instead of MongoDB | Accepted |
| [0002](0002-terraform-for-infrastructure.md) | Terraform for infrastructure as code | Accepted |
| [0003](0003-serverless-hosting.md) | Serverless hosting on AWS within always-free limits | Accepted |
| [0004](0004-guarded-text-to-sql.md) | Text-to-SQL behind a validator, not a chatbot | Accepted |
| [0005](0005-keep-spark-for-etl.md) | Keep Spark for the ETL, run locally | Accepted |

New ADR: copy [`template.md`](template.md) to `NNNN-short-title.md`.
