"""Language-model providers that turn a question into SQL.

Every provider implements one small interface and returns a ProviderReply, so the API never
depends on one vendor:

- FakeProvider: deterministic and offline (tests, local development, example questions)
- GroqProvider: Groq's OpenAI-compatible chat API, free tier (default hosted provider)
- GeminiProvider: Google's Gemini API, free tier (fallback)
- FallbackProvider: tries providers in order; a rate-limited or failing one hands over

HTTP goes through the standard library and an injectable transport, so the adapters are tested
without network access and add no dependencies. Keys are sent in headers, never in URLs, and
never logged.
"""

import json
import os
import re
import urllib.error
import urllib.request
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol


class ProviderError(Exception):
    """The provider could not produce an answer. `code`: rate_limited, unauthorized,
    unavailable, bad_response or unknown_question."""

    def __init__(self, message: str, code: str = "unavailable") -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True)
class ProviderReply:
    text: str
    provider: str
    model: str
    input_tokens: int = 0
    output_tokens: int = 0


class SqlProvider(Protocol):
    name: str

    def generate_sql(self, question: str, prompt: str) -> ProviderReply:
        """Return the model's reply for `prompt` (which embeds `question`)."""
        ...


# ---------------------------------------------------------------- HTTP


@dataclass(frozen=True)
class HttpResponse:
    status: int
    body: dict[str, Any]


Transport = Callable[[str, dict[str, str], dict[str, Any], float], HttpResponse]


def urllib_transport(
    url: str, headers: dict[str, str], body: dict[str, Any], timeout: float
) -> HttpResponse:
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "AutoInsights/2.0", **headers},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:  # noqa: S310 (fixed hosts)
            return HttpResponse(response.status, json.loads(response.read() or b"{}"))
    except urllib.error.HTTPError as error:
        try:
            payload = json.loads(error.read() or b"{}")
        except ValueError:
            payload = {}
        return HttpResponse(error.code, payload)


def _check_status(status: int, provider: str) -> None:
    if status == 429:
        raise ProviderError(f"{provider} rate limit reached", "rate_limited")
    if status in (401, 403):
        raise ProviderError(f"{provider} rejected the API key", "unauthorized")
    if status >= 400:
        raise ProviderError(f"{provider} returned HTTP {status}", "unavailable")


def _post(
    transport: Transport,
    url: str,
    headers: dict[str, str],
    body: dict[str, Any],
    timeout: float,
    provider: str,
) -> dict[str, Any]:
    try:
        response = transport(url, headers, body, timeout)
    except (TimeoutError, OSError) as error:
        raise ProviderError(f"{provider} could not be reached", "unavailable") from error
    _check_status(response.status, provider)
    return response.body


SYSTEM_PROMPT = (
    "You write DuckDB SQL for a fixed set of tables. Reply with one SELECT in a ```sql block."
)


# ---------------------------------------------------------------- hosted providers


class GroqProvider:
    name = "groq"
    URL = "https://api.groq.com/openai/v1/chat/completions"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        max_tokens: int = 1024,
        timeout: float = 20.0,
        transport: Transport = urllib_transport,
    ) -> None:
        if not api_key:
            raise ValueError("GROQ_API_KEY is not set")
        self._key, self.model, self._max_tokens, self._timeout, self._transport = (
            api_key,
            model,
            max_tokens,
            timeout,
            transport,
        )

    def generate_sql(self, question: str, prompt: str) -> ProviderReply:
        body: dict[str, Any] = {
            "model": self.model,
            "temperature": 0,
            "max_completion_tokens": self._max_tokens,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        }
        if self.model.startswith("openai/gpt-oss"):
            body["reasoning_effort"] = (
                "low"  # reasoning models: short thinking, same answer quality
            )
        elif self.model.startswith("qwen/"):
            body["reasoning_format"] = "hidden"
        data = _post(
            self._transport,
            self.URL,
            {"Authorization": f"Bearer {self._key}"},
            body,
            self._timeout,
            "Groq",
        )
        try:
            text = data["choices"][0]["message"]["content"] or ""
        except (KeyError, IndexError, TypeError) as error:
            raise ProviderError("Groq returned an unexpected response", "bad_response") from error
        if not text.strip():
            raise ProviderError("Groq returned an empty answer", "bad_response")
        usage = data.get("usage") or {}
        return ProviderReply(
            text,
            self.name,
            self.model,
            usage.get("prompt_tokens", 0),
            usage.get("completion_tokens", 0),
        )


class GeminiProvider:
    name = "gemini"
    BASE = "https://generativelanguage.googleapis.com/v1beta/models"

    def __init__(
        self,
        api_key: str,
        model: str,
        *,
        max_tokens: int = 1024,
        timeout: float = 20.0,
        transport: Transport = urllib_transport,
    ) -> None:
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not set")
        self._key, self.model, self._max_tokens, self._timeout, self._transport = (
            api_key,
            model,
            max_tokens,
            timeout,
            transport,
        )

    def generate_sql(self, question: str, prompt: str) -> ProviderReply:
        body = {
            "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0, "maxOutputTokens": self._max_tokens},
        }
        url = f"{self.BASE}/{self.model}:generateContent"
        data = _post(
            self._transport, url, {"x-goog-api-key": self._key}, body, self._timeout, "Gemini"
        )
        try:
            parts = data["candidates"][0]["content"]["parts"]
        except (KeyError, IndexError, TypeError) as error:
            raise ProviderError("Gemini returned no answer", "bad_response") from error
        text = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        if not text.strip():
            raise ProviderError("Gemini returned an empty answer", "bad_response")
        usage = data.get("usageMetadata") or {}
        return ProviderReply(
            text,
            self.name,
            self.model,
            usage.get("promptTokenCount", 0),
            usage.get("candidatesTokenCount", 0),
        )


class FallbackProvider:
    """Ask each provider in order; any ProviderError moves on to the next one."""

    name = "fallback"

    def __init__(self, providers: list[SqlProvider]) -> None:
        if not providers:
            raise ValueError(
                "FallbackProvider needs at least one provider (set GROQ_API_KEY or GEMINI_API_KEY)"
            )
        self.providers = providers

    def generate_sql(self, question: str, prompt: str) -> ProviderReply:
        last: ProviderError | None = None
        for provider in self.providers:
            try:
                return provider.generate_sql(question, prompt)
            except ProviderError as error:
                last = error
        assert last is not None
        raise last


# ---------------------------------------------------------------- offline provider

# Example questions the fake provider can answer, with the SQL a good model would write.
# They double as the example questions shown in the UI.
EXAMPLES: dict[str, str] = {
    "Which brands have the most listings?": (
        "SELECT manufacturer, count FROM top_brands ORDER BY count DESC"
    ),
    "What is the average price per model year?": (
        "SELECT year, avg_price_year FROM price_volume_by_year ORDER BY year"
    ),
    "Which ten states have the highest average price?": (
        "SELECT state, avg_price FROM geo_distribution ORDER BY avg_price DESC LIMIT 10"
    ),
    "How many listings are there per condition?": (
        "SELECT condition, count FROM condition_distribution ORDER BY count DESC"
    ),
    "What is the median price of a Toyota Camry?": (
        "SELECT median(price) AS median_price FROM mileage_points "
        "WHERE manufacturer = 'toyota' AND model = 'camry'"
    ),
    "Which ten Ford models have the most listings?": (
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

    def generate_sql(self, question: str, prompt: str) -> ProviderReply:
        try:
            sql = self._answers[_normalize(question)]
        except KeyError:
            raise ProviderError(
                "The offline demo provider only answers the example questions.", "unknown_question"
            ) from None
        return ProviderReply(f"```sql\n{sql}\n```", self.name, "examples")


# ---------------------------------------------------------------- factory

DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b"  # chosen with the eval set: docs/evaluation.md
DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite"


def get_provider(name: str, env: Mapping[str, str] | None = None) -> SqlProvider:
    """Build the provider named by LLM_PROVIDER from environment variables."""
    env = os.environ if env is None else env
    # Compose passes unset variables as empty strings: treat "" as "use the default"
    max_tokens = int(env.get("LLM_MAX_OUTPUT_TOKENS") or "1024")

    def groq() -> GroqProvider:
        return GroqProvider(
            env.get("GROQ_API_KEY", ""),
            env.get("GROQ_MODEL") or DEFAULT_GROQ_MODEL,
            max_tokens=max_tokens,
        )

    def gemini() -> GeminiProvider:
        return GeminiProvider(
            env.get("GEMINI_API_KEY", ""),
            env.get("GEMINI_MODEL") or DEFAULT_GEMINI_MODEL,
            max_tokens=max_tokens,
        )

    if name == "fake":
        return FakeProvider()
    if name == "groq":
        return groq()
    if name == "gemini":
        return gemini()
    if name == "fallback":
        chain: list[SqlProvider] = []
        if env.get("GROQ_API_KEY"):
            chain.append(groq())
        if env.get("GEMINI_API_KEY"):
            chain.append(gemini())
        # no keys (a fresh clone): keep the demo working offline instead of failing
        return FallbackProvider(chain) if chain else FakeProvider()
    raise ValueError(f"Unknown LLM provider '{name}'")
