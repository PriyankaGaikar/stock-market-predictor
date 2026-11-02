from functools import lru_cache
from pathlib import Path

from app.config import get_settings
from app.providers.registry import build_provider
from app.services.market_service import MarketService


@lru_cache
def get_market_service() -> MarketService:
    s = get_settings()
    return MarketService(
        provider=build_provider(s.data_provider),
        quote_ttl=s.cache_ttl_seconds,
        history_ttl=s.history_cache_ttl_seconds,
        allow_fallback=s.allow_demo_fallback,
    )


def get_artifacts_dir() -> Path | None:
    """None = use the default backend/artifacts folder. Tests override this."""
    return None