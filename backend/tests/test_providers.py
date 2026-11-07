"""Hosted LLM adapters, tested against a recorded-style fake HTTP transport (no network)."""

import json

import pytest

from ask.providers import (
    EXAMPLES,
    FakeProvider,
    FallbackProvider,
    GeminiProvider,
    GroqProvider,
    HttpResponse,
    ProviderError,
    ProviderReply,
    get_provider,
)


class FakeTransport:
    def __init__(self, *responses: HttpResponse | Exception) -> None:
        self.responses = list(responses)
        self.requests: list[dict] = []

    def __call__(self, url, headers, body, timeout):
        self.requests.append({"url": url, "headers": headers, "body": body, "timeout": timeout})
        response = self.responses.pop(0)
        if isinstance(response, Exception):
            raise response
        return response


def groq_ok(content="```sql\nSELECT 1\n```"):
    return HttpResponse(
        200,
        {
            "choices": [{"message": {"content": content}}],
            "usage": {"prompt_tokens": 410, "completion_tokens": 32},
        },
    )


def gemini_ok(text="SELECT 2"):
    return HttpResponse(
        200,
        {
            "candidates": [
                {"content": {"parts": [{"text": "thinking...", "thought": True}, {"text": text}]}}
            ],
            "usageMetadata": {"promptTokenCount": 380, "candidatesTokenCount": 12},
        },
    )


# ------------------------------------------------------------------ Groq


def test_groq_sends_a_deterministic_chat_request_and_parses_the_reply():
    transport = FakeTransport(groq_ok())
    provider = GroqProvider("key-123", "openai/gpt-oss-120b", max_tokens=900, transport=transport)

    reply = provider.generate_sql("q", "PROMPT")

    assert reply == ProviderReply(
        text="```sql\nSELECT 1\n```",
        provider="groq",
        model="openai/gpt-oss-120b",
        input_tokens=410,
        output_tokens=32,
    )
    [request] = transport.requests
    assert request["url"] == "https://api.groq.com/openai/v1/chat/completions"
    assert request["headers"]["Authorization"] == "Bearer key-123"
    body = request["body"]
    assert body["model"] == "openai/gpt-oss-120b"
    assert body["temperature"] == 0
    assert body["max_completion_tokens"] == 900
    assert body["messages"][-1] == {"role": "user", "content": "PROMPT"}
    assert body["reasoning_effort"] == "low"  # gpt-oss models reason; keep it short


def test_groq_hides_reasoning_for_qwen_models():
    transport = FakeTransport(groq_ok())
    GroqProvider("k", "qwen/qwen3.8-27b", transport=transport).generate_sql("q", "p")

    body = transport.requests[0]["body"]
    assert body["reasoning_format"] == "hidden"
    assert "reasoning_effort" not in body


@pytest.mark.parametrize(
    ("response", "code"),
    [
        (HttpResponse(429, {"error": {"message": "Rate limit reached"}}), "rate_limited"),
        (HttpResponse(401, {"error": {"message": "Invalid API Key"}}), "unauthorized"),
        (HttpResponse(503, {}), "unavailable"),
        (HttpResponse(200, {"choices": []}), "bad_response"),
        (TimeoutError("timed out"), "unavailable"),
        (OSError("connection refused"), "unavailable"),
    ],
)
def test_groq_failures_become_provider_errors(response, code):
    provider = GroqProvider("k", "m", transport=FakeTransport(response))

    with pytest.raises(ProviderError) as error:
        provider.generate_sql("q", "p")

    assert error.value.code == code


def test_groq_needs_a_key():
    with pytest.raises(ValueError):
        GroqProvider("", "m")


# ------------------------------------------------------------------ Gemini


def test_gemini_sends_the_key_in_a_header_and_skips_thought_parts():
    transport = FakeTransport(gemini_ok())
    provider = GeminiProvider("g-key", "gemini-3.8-flash", max_tokens=700, transport=transport)

    reply = provider.generate_sql("q", "PROMPT")

    assert reply == ProviderReply("SELECT 2", "gemini", "gemini-3.8-flash", 380, 12)
    [request] = transport.requests
    assert request["url"].endswith("/models/gemini-3.8-flash:generateContent")
    assert "key=" not in request["url"]  # the key never goes in a URL
    assert request["headers"]["x-goog-api-key"] == "g-key"
    assert request["body"]["contents"][0]["parts"][0]["text"] == "PROMPT"
    assert request["body"]["generationConfig"]["temperature"] == 0
    assert request["body"]["generationConfig"]["maxOutputTokens"] == 700


@pytest.mark.parametrize(
    ("response", "code"),
    [
        (HttpResponse(429, {"error": {"status": "RESOURCE_EXHAUSTED"}}), "rate_limited"),
        (HttpResponse(403, {"error": {"status": "PERMISSION_DENIED"}}), "unauthorized"),
        (HttpResponse(500, {}), "unavailable"),
        (HttpResponse(200, {"candidates": [{"content": {"parts": []}}]}), "bad_response"),
        (HttpResponse(200, {"promptFeedback": {"blockReason": "SAFETY"}}), "bad_response"),
    ],
)
def test_gemini_failures_become_provider_errors(response, code):
    provider = GeminiProvider("k", "m", transport=FakeTransport(response))

    with pytest.raises(ProviderError) as error:
        provider.generate_sql("q", "p")

    assert error.value.code == code


def test_gemini_needs_a_key():
    with pytest.raises(ValueError):
        GeminiProvider("", "m")


# ------------------------------------------------------------------ fallback and factory


def test_fallback_uses_the_next_provider_when_the_first_is_rate_limited():
    groq = GroqProvider("k", "g-model", transport=FakeTransport(HttpResponse(429, {})))
    gemini = GeminiProvider("k", "gem-model", transport=FakeTransport(gemini_ok("SELECT 3")))

    reply = FallbackProvider([groq, gemini]).generate_sql("q", "p")

    assert (reply.provider, reply.model, reply.text) == ("gemini", "gem-model", "SELECT 3")


def test_fallback_raises_the_last_error_when_every_provider_fails():
    groq = GroqProvider("k", "m", transport=FakeTransport(HttpResponse(429, {})))
    gemini = GeminiProvider("k", "m", transport=FakeTransport(HttpResponse(503, {})))

    with pytest.raises(ProviderError) as error:
        FallbackProvider([groq, gemini]).generate_sql("q", "p")

    assert error.value.code == "unavailable"


def test_fallback_needs_providers():
    with pytest.raises(ValueError):
        FallbackProvider([])


def test_fake_provider_reply():
    reply = FakeProvider().generate_sql(next(iter(EXAMPLES)), "p")

    assert (reply.provider, reply.model, reply.input_tokens) == ("fake", "examples", 0)


def test_get_provider_builds_each_kind():
    env = {"GROQ_API_KEY": "a", "GEMINI_API_KEY": "b"}

    assert isinstance(get_provider("fake", env), FakeProvider)
    assert isinstance(get_provider("groq", env), GroqProvider)
    assert isinstance(get_provider("gemini", env), GeminiProvider)
    fallback = get_provider("fallback", env)
    assert isinstance(fallback, FallbackProvider)
    assert [p.name for p in fallback.providers] == ["groq", "gemini"]
    with pytest.raises(ValueError):
        get_provider("nope", env)


def test_get_provider_fallback_without_keys_works_offline():
    assert isinstance(get_provider("fallback", {}), FakeProvider)


def test_get_provider_fallback_skips_providers_without_a_key():
    fallback = get_provider("fallback", {"GEMINI_API_KEY": "b"})

    assert [p.name for p in fallback.providers] == ["gemini"]


def test_http_response_json_is_plain_data():
    assert json.loads(json.dumps(HttpResponse(200, {"a": 1}).body)) == {"a": 1}


def test_empty_model_variables_fall_back_to_the_defaults():
    env = {
        "GROQ_API_KEY": "a",
        "GROQ_MODEL": "",
        "GEMINI_API_KEY": "b",
        "GEMINI_MODEL": "",
        "LLM_MAX_OUTPUT_TOKENS": "",
    }

    assert get_provider("groq", env).model == "openai/gpt-oss-20b"
    assert get_provider("gemini", env).model == "gemini-3.5-flash-lite"
