import sys
from pathlib import Path

import pytest

# The backend modules are flat (main.py, services.py...), so make them importable from tests/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


@pytest.fixture(autouse=True)
def fresh_rate_limiter():
    """Each test starts with empty request counters."""
    import main

    main.get_rate_limiter.cache_clear()
    yield
    main.get_rate_limiter.cache_clear()


@pytest.fixture(autouse=True)
def no_llm_keys(monkeypatch):
    """Tests never reach a hosted model, even when the shell running them has API keys."""
    for name in ("GROQ_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY_PARAM", "GEMINI_API_KEY_PARAM"):
        monkeypatch.delenv(name, raising=False)
