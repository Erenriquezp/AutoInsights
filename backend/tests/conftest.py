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
