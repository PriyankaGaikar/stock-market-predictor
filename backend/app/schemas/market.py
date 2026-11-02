from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class DataLabel(str, Enum):
    """Freshness sticker attached to market data."""

    LIVE = "live"              # exchange-authorized real-time feed
    DELAYED = "delayed"        # intraday data, typically ~15 min behind
    END_OF_DAY = "end_of_day"  # daily bars / last available close
    DEMO = "demo"              # synthetic data, NOT real market data


class SymbolInfo(BaseModel):
    symbol: str = Field(description="Canonical symbol, e.g. RELIANCE")
    exchange: str = Field(description="NSE or BSE")
    name: str
    provider_symbol: str = Field(description="Exact symbol the provider uses, e.g. RELIANCE.NS")


class Quote(BaseModel):
    symbol: str
    exchange: str
    price: float
    previous_close: float | None = None
    change_pct: float | None = None
    day_high: float | None = None
    day_low: float | None = None
    volume: int | None = None
    as_of: datetime = Field(description="Timestamp of the price itself")
    fetched_at: datetime = Field(description="When our server retrieved it (UTC)")
    label: DataLabel
    provider: str
    from_cache: bool = False
    cache_age_seconds: int = 0
    note: str = ""


class Candle(BaseModel):
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    adj_close: float
    volume: int


class HistoryResponse(BaseModel):
    symbol: str
    exchange: str
    interval: str
    lookback_days: int
    count: int
    first_timestamp: datetime | None
    last_timestamp: datetime | None
    fetched_at: datetime
    label: DataLabel
    provider: str
    from_cache: bool = False
    cache_age_seconds: int = 0
    note: str = ""
    candles: list[Candle]