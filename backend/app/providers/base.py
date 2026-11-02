from abc import ABC, abstractmethod

import pandas as pd

from app.schemas.market import Quote, SymbolInfo


class MarketDataProvider(ABC):
    """The 'plug socket' every data provider must fit.

    get_history() must return a DataFrame that is:
      - indexed by a timezone-aware DatetimeIndex named 'timestamp', oldest -> newest
      - no duplicate timestamps
      - lowercase columns exactly: open, high, low, close, adj_close, volume
    """

    name: str = "base"

    @abstractmethod
    def search(self, query: str) -> list[SymbolInfo]: ...

    @abstractmethod
    def get_quote(self, symbol: str, exchange: str = "NSE") -> Quote: ...

    @abstractmethod
    def get_history(
        self, symbol: str, lookback_days: int, interval: str = "1d", exchange: str = "NSE"
    ) -> pd.DataFrame: ...