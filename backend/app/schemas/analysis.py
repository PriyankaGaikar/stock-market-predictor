from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.schemas.market import DataLabel


class IndicatorPoint(BaseModel):
    timestamp: datetime
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float | None = None
    volume: float | None = None
    sma_20: float | None = None
    sma_50: float | None = None
    ema_12: float | None = None
    ema_26: float | None = None
    rsi_14: float | None = None
    macd: float | None = None
    macd_signal: float | None = None
    macd_hist: float | None = None
    bb_upper: float | None = None
    bb_mid: float | None = None
    bb_lower: float | None = None
    bb_pct_b: float | None = None
    atr_14: float | None = None
    obv: float | None = None
    daily_return: float | None = None
    volatility_20: float | None = None   # annualized, as a fraction
    drawdown: float | None = None        # fraction below the running high (<= 0)


class ReturnsStats(BaseModel):
    mean_pct: float | None = None
    std_pct: float | None = None
    skew: float | None = None
    excess_kurtosis: float | None = None
    best_day_pct: float | None = None
    worst_day_pct: float | None = None


class IndicatorSummary(BaseModel):
    latest_close: float
    period_return_pct: float
    annualized_volatility_pct: float | None = None
    max_drawdown_pct: float
    avg_volume: float
    latest_volume_vs_avg: float | None = None
    rsi_latest: float | None = None
    rsi_state: str
    macd_state: str
    trend_label: Literal["upward", "downward", "mixed", "insufficient_data"]
    trend_summary: str
    returns_stats: ReturnsStats


class HistogramBin(BaseModel):
    bin_start: float
    bin_end: float
    count: int


class IndicatorsResponse(BaseModel):
    symbol: str
    exchange: str
    interval: str
    lookback_days: int
    count: int
    first_timestamp: datetime | None
    last_timestamp: datetime | None
    price_basis: str
    fetched_at: datetime
    label: DataLabel
    provider: str
    from_cache: bool
    cache_age_seconds: int
    note: str
    summary: IndicatorSummary
    returns_histogram: list[HistogramBin]
    guide: dict[str, dict[str, str]]
    series: list[IndicatorPoint]