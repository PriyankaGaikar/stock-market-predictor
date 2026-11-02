import threading
import time
from typing import Callable, TypeVar

from cachetools import TTLCache

T = TypeVar("T")


class TTLStore:
    """A tiny 'fridge': remembers results until they expire. Failures are never cached."""

    def __init__(self, ttl_seconds: int, maxsize: int = 256):
        self._cache: TTLCache = TTLCache(maxsize=maxsize, ttl=ttl_seconds)
        self._lock = threading.Lock()

    def get_or_fetch(self, key: str, fetch: Callable[[], T]) -> tuple[T, bool, float]:
        """Return (value, from_cache, age_in_seconds)."""
        with self._lock:
            entry = self._cache.get(key)
        if entry is not None:
            value, stored_at = entry
            return value, True, time.time() - stored_at
        value = fetch()
        with self._lock:
            self._cache[key] = (value, time.time())
        return value, False, 0.0