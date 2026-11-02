import threading
import time
from collections import defaultdict, deque

from fastapi import Request

from app.utils.errors import RateLimitedError


class RateLimiter:
    """Allow at most `max_calls` per `window_seconds` for each client IP (in-memory)."""

    def __init__(self, max_calls: int, window_seconds: int, name: str):
        self.max_calls = max_calls
        self.window = window_seconds
        self.name = name
        self._hits: dict[str, deque] = defaultdict(deque)
        self._lock = threading.Lock()

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()

    def __call__(self, request: Request) -> None:
        key = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            hits = self._hits[key]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.max_calls:
                retry = int(self.window - (now - hits[0])) + 1
                raise RateLimitedError(f"Too many {self.name} requests. Try again in about {retry} seconds.")
            hits.append(now)


train_limiter = RateLimiter(max_calls=3, window_seconds=600, name="training")
predict_limiter = RateLimiter(max_calls=30, window_seconds=60, name="prediction")