import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import pandas as pd

from app.providers.base import MarketDataProvider
from app.providers.demo_provider import DemoProvider
from app.schemas.market import Candle, DataLabel, HistoryResponse, Quote, SymbolInfo
from app.services.cache import TTLStore
from app.utils.errors import (
    InsufficientDataError,
    InvalidRequestError,
    MarketDataError,
    SymbolNotFoundError,
)
from app.utils.symbols import normalize_symbol

logger = logging.getLogger(__name__)
DAILY_INTERVALS = {"1d", "1wk"}


@dataclass
class HistoryResult:
    df: pd.DataFrame
    symbol: str
    exchange: str
    interval: str
    lookback_days: int
    label: DataLabel
    provider: str
    fetched_at: datetime
    from_cache: bool
    cache_age_seconds: int
    note: str


class MarketService:
    def __init__(
        self,
        provider: MarketDataProvider,
        quote_ttl: int = 300,
        history_ttl: int = 900,
        allow_fallback: bool = False,
    ):
        self.provider = provider
        self._fallback = DemoProvider() if (allow_fallback and provider.name != "demo") else None
        self._quotes = TTLStore(quote_ttl)
        self._history = TTLStore(history_ttl)

    def _call(self, method: str, *args):
        """Call the real provider. Fall back to DEMO only if explicitly enabled."""
        try:
            return getattr(self.provider, method)(*args), self.provider
        except (SymbolNotFoundError, InvalidRequestError, InsufficientDataError):
            raise  # the user's input is the problem; a fake fallback wouldn't help
        except MarketDataError as exc:
            if self._fallback is None:
                raise
            logger.warning("Provider %s failed (%s); using DEMO fallback", self.provider.name, exc.message)
            return getattr(self._fallback, method)(*args), self._fallback

    def search(self, query: str) -> list[SymbolInfo]:
        return self.provider.search(query)

    def get_quote(self, symbol: str, exchange: str = "NSE") -> Quote:
        sym, exch = normalize_symbol(symbol, exchange)
        (quote, used), hit, age = self._quotes.get_or_fetch(
            f"q:{exch}:{sym}", lambda: self._call("get_quote", sym, exch)
        )
        note = quote.note
        if used is not self.provider:
            note = f"PRIMARY PROVIDER FAILED - showing DEMO data. {note}"
        return quote.model_copy(
            update={"from_cache": hit, "cache_age_seconds": round(age), "note": note}
        )

    def get_history_frame(
        self, symbol: str, lookback_days: int, interval: str = "1d", exchange: str = "NSE"
    ) -> HistoryResult:
        sym, exch = normalize_symbol(symbol, exchange)
        (df, used), hit, age = self._history.get_or_fetch(
            f"h:{exch}:{sym}:{interval}:{lookback_days}",
            lambda: self._call("get_history", sym, lookback_days, interval, exch),
        )
        if used.name == "demo":
            label = DataLabel.DEMO
            note = "DEMO DATA: synthetic prices, NOT real market data."
            if used is not self.provider:
                note = "PRIMARY PROVIDER FAILED - " + note
        elif interval in DAILY_INTERVALS:
            label = DataLabel.END_OF_DAY
            note = "Daily bars. If the market is open, the latest bar may be incomplete."
        else:
            label = DataLabel.DELAYED
            note = "Intraday bars from Yahoo Finance are typically delayed (~15 min)."
        return HistoryResult(
            df=df, symbol=sym, exchange=exch, interval=interval, lookback_days=lookback_days,
            label=label, provider=used.name,
            fetched_at=datetime.now(timezone.utc) - timedelta(seconds=age),
            from_cache=hit, cache_age_seconds=round(age), note=note,
        )

    def get_history(
        self, symbol: str, lookback_days: int, interval: str = "1d", exchange: str = "NSE"
    ) -> HistoryResponse:
        r = self.get_history_frame(symbol, lookback_days, interval, exchange)
        candles = [
            Candle(
                timestamp=ts.to_pydatetime(), open=float(row.open), high=float(row.high),
                low=float(row.low), close=float(row.close), adj_close=float(row.adj_close),
                volume=int(row.volume),
            )
            for ts, row in zip(r.df.index, r.df.itertuples(index=False))
        ]
        return HistoryResponse(
            symbol=r.symbol, exchange=r.exchange, interval=r.interval,
            lookback_days=r.lookback_days, count=len(candles),
            first_timestamp=candles[0].timestamp if candles else None,
            last_timestamp=candles[-1].timestamp if candles else None,
            fetched_at=r.fetched_at, label=r.label, provider=r.provider,
            from_cache=r.from_cache, cache_age_seconds=r.cache_age_seconds,
            note=r.note, candles=candles,
        )