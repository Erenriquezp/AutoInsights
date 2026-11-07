import pytest

from ask.limits import RateLimited, RateLimiter


class Clock:
    def __init__(self, now: float = 1_700_000_000.0) -> None:  # 2023-11-14, mid-day UTC
        self.now = now

    def __call__(self) -> float:
        return self.now


def test_allows_up_to_the_per_minute_limit_per_client():
    clock = Clock()
    limiter = RateLimiter(per_minute=2, per_day=100, clock=clock)

    limiter.check("a")
    limiter.check("a")
    limiter.check("b")  # other clients are not affected
    with pytest.raises(RateLimited) as error:
        limiter.check("a")

    assert error.value.scope == "per minute"
    assert 1 <= error.value.retry_after <= 61


def test_the_window_slides():
    clock = Clock()
    limiter = RateLimiter(per_minute=1, per_day=100, clock=clock)
    limiter.check("a")

    clock.now += 60
    limiter.check("a")  # the first question left the window


def test_rejected_questions_are_not_counted():
    clock = Clock()
    limiter = RateLimiter(per_minute=1, per_day=2, clock=clock)
    limiter.check("a")
    with pytest.raises(RateLimited):
        limiter.check("a")

    limiter.check("b")  # still within the daily total of 2


def test_daily_limit_across_clients_resets_at_utc_midnight():
    clock = Clock()
    limiter = RateLimiter(per_minute=10, per_day=2, clock=clock)
    limiter.check("a")
    limiter.check("b")
    with pytest.raises(RateLimited) as error:
        limiter.check("c")
    assert error.value.scope == "daily limit"

    clock.now += 86_400
    limiter.check("c")
