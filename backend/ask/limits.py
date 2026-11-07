"""Request limits for "Ask the data", so the free LLM tiers are not exhausted by one visitor.

In memory and per process: on Lambda each warm instance keeps its own counters, which is fine
together with the function's small concurrency and API-side throttling (ADR-0003).
"""

import threading
import time
from collections import deque
from collections.abc import Callable
from datetime import UTC, datetime


class RateLimited(Exception):
    def __init__(self, scope: str, retry_after: int) -> None:
        super().__init__(f"Too many questions ({scope}). Try again in {retry_after} s.")
        self.scope = scope
        self.retry_after = retry_after


class RateLimiter:
    """At most `per_minute` questions per client in any 60 s window, and `per_day` in total
    per UTC day."""

    def __init__(
        self, per_minute: int, per_day: int, clock: Callable[[], float] = time.time
    ) -> None:
        self.per_minute = per_minute
        self.per_day = per_day
        self._clock = clock
        self._lock = threading.Lock()
        self._recent: dict[str, deque[float]] = {}
        self._day = ""
        self._today = 0

    def check(self, client: str) -> None:
        """Count one question for `client`, or raise RateLimited without counting it."""
        now = self._clock()
        day = datetime.fromtimestamp(now, UTC).strftime("%Y-%m-%d")
        with self._lock:
            if day != self._day:
                self._day, self._today = day, 0
                self._recent.clear()
            if self._today >= self.per_day:
                midnight = (
                    datetime.strptime(day, "%Y-%m-%d").replace(tzinfo=UTC).timestamp() + 86_400
                )
                raise RateLimited("daily limit", int(midnight - now) + 1)
            window = self._recent.setdefault(client, deque())
            while window and now - window[0] >= 60:
                window.popleft()
            if len(window) >= self.per_minute:
                raise RateLimited("per minute", int(60 - (now - window[0])) + 1)
            window.append(now)
            self._today += 1
