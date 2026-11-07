"""Language-model providers that turn a question into SQL.

Every provider implements the same small interface, so the API never depends on one vendor.
`FakeProvider` is deterministic and offline: it powers tests, local development and the example
questions. Hosted free-tier providers (Groq, Gemini) plug in behind the same interface.
"""

import re
from typing import Protocol


class ProviderError(Exception):
    """The provider could not produce an answer (unavailable, rate-limited, unknown question)."""


class SqlProvider(Protocol):
    name: str

    def generate_sql(self, question: str, prompt: str) -> str:
        """Return the model's reply for `prompt` (which embeds `question`)."""
        ...


# Example questions the fake provider can answer, with the SQL a good model would write.
# They double as the example questions shown in the UI.
EXAMPLES: dict[str, str] = {
    "Which brands have the most listings?": (
        "SELECT manufacturer, count FROM top_brands ORDER BY count DESC"
    ),
    "What is the average price per model year?": (
        "SELECT year, avg_price_year FROM price_volume_by_year ORDER BY year"
    ),
    "Which states have the highest average price?": (
        "SELECT state, avg_price FROM geo_distribution ORDER BY avg_price DESC LIMIT 10"
    ),
    "How many listings are there per condition?": (
        "SELECT condition, count FROM condition_distribution ORDER BY count DESC"
    ),
    "What is the median price of a Toyota Camry?": (
        "SELECT median(price) AS median_price FROM mileage_points "
        "WHERE manufacturer = 'toyota' AND model = 'camry'"
    ),
    "Which Ford models have the most listings?": (
        "SELECT model, SUM(count) AS listings FROM prices_by_model_year "
        "WHERE manufacturer = 'ford' GROUP BY model ORDER BY listings DESC LIMIT 10"
    ),
}


def _normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9 ]", "", text.lower()).strip()


class FakeProvider:
    """Answers the example questions with fixed SQL; anything else is a ProviderError."""

    name = "fake"

    def __init__(self, answers: dict[str, str] | None = None) -> None:
        self._answers = {_normalize(q): sql for q, sql in (answers or EXAMPLES).items()}

    def generate_sql(self, question: str, prompt: str) -> str:
        try:
            return f"```sql\n{self._answers[_normalize(question)]}\n```"
        except KeyError:
            raise ProviderError(
                "The offline demo provider only answers the example questions."
            ) from None


def get_provider(name: str) -> SqlProvider:
    if name == "fake":
        return FakeProvider()
    raise ValueError(f"Unknown LLM provider '{name}'")
