import logging
from datetime import datetime, timedelta, timezone

import pandas as pd
import yfinance as yf

from app.providers.base import MarketDataProvider
from app.providers.universe import find_instruments
from app.schemas.market import DataLabel, Quote, SymbolInfo
from app.utils.errors import (
    InvalidRequestError,
    MarketDataError,
    ProviderUnavailableError,
    RateLimitedError,
    SymbolNotFoundError,
)

logger = logging.getLogger(__name__)

IST = "Asia/Kolkata"
SUFFIX = {"NSE": ".NS", "BSE": ".BO"}
# Yahoo's own limits on how far back each interval goes (days, with a safety margin).
MAX_LOOKBACK_DAYS = {"5m": 59, "15m": 59, "30m": 59, "1h": 729, "1d": 3650, "1wk": 3650}
COLUMNS = ["open", "high", "low", "close", "adj_close", "volume"]
DELAY_NOTE = (
    "Yahoo Finance data for NSE/BSE is typically delayed (~15 min) and is not "
    "exchange-authorized real-time data."
)


class YFinanceProvider(MarketDataProvider):
    name = "yfinance"

    # ---- helpers -------------------------------------------------------
    def _ticker_symbol(self, symbol: str, exchange: str) -> str:
        if exchange not in SUFFIX:
            raise InvalidRequestError(f"Unsupported exchange '{exchange}'.")
        return f"{symbol}{SUFFIX[exchange]}"

    def _download(self, ticker_symbol: str, **kwargs) -> pd.DataFrame:
        try:
            raw = yf.Ticker(ticker_symbol).history(auto_adjust=False, actions=False, **kwargs)
        except Exception as exc:  # yfinance raises many exception types
            msg = str(exc)
            if "rate" in msg.lower() or "too many" in msg.lower():
                raise RateLimitedError("Yahoo Finance rate limit hit. Try again shortly.") from exc
            raise ProviderUnavailableError(f"Yahoo Finance request failed: {msg}") from exc
        return self._clean(raw)

    @staticmethod
    def _clean(raw: pd.DataFrame | None) -> pd.DataFrame:
        if raw is None or raw.empty:
            return pd.DataFrame(columns=COLUMNS)
        df = raw.rename(
            columns={
                "Open": "open", "High": "high", "Low": "low",
                "Close": "close", "Adj Close": "adj_close", "Volume": "volume",
            }
        )
        if "adj_close" not in df.columns:
            df["adj_close"] = df["close"]
        df = df[COLUMNS].copy()
        df.index = df.index.tz_localize(IST) if df.index.tz is None else df.index.tz_convert(IST)
        df.index.name = "timestamp"
        df = df[~df.index.duplicated(keep="last")].sort_index()
        before = len(df)
        df = df.dropna(subset=["open", "high", "low", "close"])
        if len(df) < before:
            logger.warning("Dropped %d rows with missing OHLC values", before - len(df))
        df["adj_close"] = df["adj_close"].fillna(df["close"])
        df["volume"] = df["volume"].fillna(0)
        return df

    # ---- interface -----------------------------------------------------
    def search(self, query: str) -> list[SymbolInfo]:
        results: list[SymbolInfo] = []
        for symbol, name in find_instruments(query):
            for exchange, suffix in SUFFIX.items():
                results.append(
                    SymbolInfo(symbol=symbol, exchange=exchange, name=name,
                               provider_symbol=f"{symbol}{suffix}")
                )
        return results

    def get_history(
        self, symbol: str, lookback_days: int, interval: str = "1d", exchange: str = "NSE"
    ) -> pd.DataFrame:
        if interval not in MAX_LOOKBACK_DAYS:
            raise InvalidRequestError(
                f"Interval '{interval}' not supported. Use one of {sorted(MAX_LOOKBACK_DAYS)}."
            )
        if lookback_days > MAX_LOOKBACK_DAYS[interval]:
            raise InvalidRequestError(
                f"Yahoo Finance allows at most {MAX_LOOKBACK_DAYS[interval]} days "
                f"of '{interval}' data."
            )
        ticker = self._ticker_symbol(symbol, exchange)
        start = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).strftime("%Y-%m-%d")
        df = self._download(ticker, start=start, interval=interval)
        if df.empty:
            raise SymbolNotFoundError(
                f"No data returned for {ticker}. The symbol may be invalid, delisted, "
                "or unavailable here, or Yahoo may be temporarily failing."
            )
        return df

    def get_quote(self, symbol: str, exchange: str = "NSE") -> Quote:
        ticker = self._ticker_symbol(symbol, exchange)
        daily = self._download(ticker, period="10d", interval="1d")
        if daily.empty:
            raise SymbolNotFoundError(
                f"No data returned for {ticker}. The symbol may be invalid or unavailable."
            )

        now = datetime.now(timezone.utc)
        try:
            intraday = self._download(ticker, period="1d", interval="5m")
        except MarketDataError:
            intraday = pd.DataFrame(columns=COLUMNS)  # degrade to daily close

        today_ist = pd.Timestamp.now(tz=IST).date()
        age_minutes = None
        if not intraday.empty:
            age_minutes = (now - intraday.index[-1].to_pydatetime()).total_seconds() / 60

        if age_minutes is not None and age_minutes <= 30:
            price = float(intraday["close"].iloc[-1])
            as_of = intraday.index[-1].to_pydatetime()
            label = DataLabel.DELAYED
            day_high = float(intraday["high"].max())
            day_low = float(intraday["low"].min())
            volume = int(intraday["volume"].sum())
            prior = daily[[d < today_ist for d in daily.index.date]]
            prev_close = float(prior["close"].iloc[-1]) if not prior.empty else None
            note = DELAY_NOTE
        else:
            last = daily.iloc[-1]
            price = float(last["close"])
            as_of = daily.index[-1].to_pydatetime()
            label = DataLabel.END_OF_DAY
            day_high, day_low, volume = float(last["high"]), float(last["low"]), int(last["volume"])
            prior = daily.iloc[:-1]
            prev_close = float(prior["close"].iloc[-1]) if not prior.empty else None
            note = f"Last available daily close ({as_of.date()}). Market may be closed. " + DELAY_NOTE

        change_pct = round((price - prev_close) / prev_close * 100, 2) if prev_close else None
        return Quote(
            symbol=symbol, exchange=exchange, price=round(price, 2),
            previous_close=round(prev_close, 2) if prev_close else None,
            change_pct=change_pct, day_high=round(day_high, 2), day_low=round(day_low, 2),
            volume=volume, as_of=as_of, fetched_at=now, label=label,
            provider=self.name, note=note,
        )