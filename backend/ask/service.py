"""Question -> prompt -> provider -> SQL guard -> DuckDB -> rows and a chart suggestion."""

import logging
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from ask.guard import SqlRejected, extract_sql, validate_sql
from ask.prompt import build_prompt
from ask.providers import ProviderError, SqlProvider
from repository import GoldRepository, QueryFailed, QueryTimeout

logger = logging.getLogger(__name__)

NUMERIC_TYPES = (int, float, Decimal)


class AskError(Exception):
    """A failure the client can act on. `code` is stable; `status` is the HTTP status."""

    def __init__(self, code: str, message: str, status: int) -> None:
        super().__init__(message)
        self.code = code
        self.status = status


@dataclass(frozen=True)
class Chart:
    type: str  # "number", "line", "bar" or "table"
    x: str | None = None
    y: str | None = None


@dataclass(frozen=True)
class Answer:
    question: str
    sql: str
    columns: list[str]
    rows: list[list[Any]]
    chart: Chart
    provider: str


def suggest_chart(columns: list[str], rows: list[tuple]) -> Chart:
    """A simple, predictable chart choice from the shape of the result."""
    if not rows:
        return Chart("table")
    first = rows[0]
    if len(columns) == 1 and len(rows) == 1 and isinstance(first[0], NUMERIC_TYPES):
        return Chart("number", y=columns[0])
    if len(columns) == 2 and isinstance(first[1], NUMERIC_TYPES):
        kind = "line" if columns[0].lower() in {"year", "model_year"} else "bar"
        return Chart(kind, x=columns[0], y=columns[1])
    return Chart("table")


class AskService:
    def __init__(
        self, repository: GoldRepository, provider: SqlProvider, timeout_seconds: float
    ) -> None:
        self._repository = repository
        self._provider = provider
        self._timeout = timeout_seconds

    def ask(self, question: str) -> Answer:
        started = time.perf_counter()
        outcome = "error"
        try:
            prompt = build_prompt(question, self._repository.describe())
            try:
                reply = self._provider.generate_sql(question, prompt)
            except ProviderError as error:
                raise AskError("provider_unavailable", str(error), 503) from error

            try:
                sql = validate_sql(extract_sql(reply))
            except SqlRejected as error:
                raise AskError(f"rejected_{error.code}", str(error), 422) from error

            try:
                columns, rows = self._repository.run_untrusted(sql, self._timeout)
            except QueryTimeout as error:
                raise AskError("query_timeout", str(error), 504) from error
            except QueryFailed as error:
                raise AskError("query_failed", str(error), 422) from error

            outcome = "ok"
            return Answer(
                question=question,
                sql=sql,
                columns=columns,
                rows=[list(row) for row in rows],
                chart=suggest_chart(columns, rows),
                provider=self._provider.name,
            )
        except AskError as error:
            outcome = error.code
            raise
        finally:
            # Structured, privacy-light log: no question text, only its length and the outcome
            logger.info(
                "ask provider=%s outcome=%s question_chars=%d latency_ms=%.0f",
                self._provider.name,
                outcome,
                len(question),
                (time.perf_counter() - started) * 1000,
            )
