# 0004. Text-to-SQL behind a validator, not a chatbot

- **Status:** Proposed
- **Date:** 2026-11-07

## Context

v2 adds a way to ask the data questions in natural language. A free-form chatbot gives answers that
cannot be checked and can invent numbers. Executing model-generated SQL without checks opens the
door to prompt injection that reads files or runs unintended statements. The feature must also run
at $0, so the LLM has to come from a free tier.

## Decision

The model only proposes SQL. Code validates it and runs it; the UI shows the SQL next to the result.

- **Provider interface** with interchangeable adapters:
  - `FakeProvider`: deterministic, for tests and offline development.
  - **Groq** free tier (OpenAI-compatible API) as the default hosted provider.
  - **Gemini API** free tier as the fallback when Groq is rate-limited or unavailable.
  - The model is pinned by configuration, never hard-coded.
- **SQL guard** (parsed with `sqlglot`): accepts only a single `SELECT` over allow-listed gold tables,
  enforces a `LIMIT`, and rejects DuckDB file, network and extension functions (`read_csv`,
  `read_parquet` on arbitrary paths, `COPY`, `ATTACH`, `INSTALL`, `LOAD`, ...).
- **Execution:** DuckDB read-only, external access disabled, with a query timeout.
- **Quality:** a 30-question eval set with hand-computed answers reports accuracy and rejection rate.

## Alternatives considered

| Option | Why not |
|---|---|
| Amazon Bedrock | No free tier; pay per token. Can be added later as another adapter |
| Self-hosted open model (Ollama) | Free locally, but no free way to host it in the cloud |
| Chatbot that answers in prose | Not verifiable; can hallucinate figures |
| LLM with a tool per endpoint | Safe but limited to questions the dashboard already answers |
| Trust the model's SQL, rely on a read-only DB | Read-only does not stop file-reading functions or runaway queries |

## Consequences

- Every answer is auditable by reading the SQL.
- The guard is the security boundary and gets 100 % branch coverage.
- Free tiers have tight per-minute token limits and can change without notice: the prompt must stay
  compact (schema only, no data), and a fallback provider plus clear "try again later" messages are required.
- Free-tier terms may allow the provider to use prompts to improve its models. Questions contain no
  personal data, and the UI says that questions are sent to a third-party model.
- Maps to OWASP Top 10 for LLM applications (prompt injection, improper output handling), documented
  in `docs/security.md`.

## Open questions

- Which Groq and Gemini models: chosen by eval-set accuracy, with limits checked on the day.
