from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Stock Trend Predictor API"
    app_version: str = "0.3.0"
    data_provider: str = "yfinance"          # "yfinance" or "demo"
    cors_origins: str = "http://localhost:5173"
    cache_ttl_seconds: int = 15              # quotes (short TTL for live polling)
    history_cache_ttl_seconds: int = 900     # historical candles
    allow_demo_fallback: bool = False        # never silently on
    upstox_access_token: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()