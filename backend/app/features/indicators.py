"""Technical indicators, written from scratch in pandas.

Every function is causal: the value at row t uses only rows <= t.
"""
import numpy as np
import pandas as pd


def sma(series: pd.Series, window: int) -> pd.Series:
    """Simple moving average: the plain average of the last `window` values."""
    return series.rolling(window=window, min_periods=window).mean()


def ema(series: pd.Series, span: int) -> pd.Series:
    """Exponential moving average: recent values count more than old ones."""
    return series.ewm(span=span, adjust=False, min_periods=span).mean()


def rsi(close: pd.Series, window: int = 14) -> pd.Series:
    """Relative Strength Index (Wilder). 0-100; high = recent gains dominate."""
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    avg_gain = gain.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()
    avg_loss = loss.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    out = 100.0 - 100.0 / (1.0 + rs)
    out = out.where(~((avg_loss == 0) & (avg_gain > 0)), 100.0)
    out = out.where(~((avg_loss == 0) & (avg_gain == 0)), 50.0)
    return out


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    """MACD line = fast EMA - slow EMA; signal = EMA of the line; hist = line - signal."""
    line = ema(close, fast) - ema(close, slow)
    sig = line.ewm(span=signal, adjust=False, min_periods=signal).mean()
    return pd.DataFrame({"macd": line, "macd_signal": sig, "macd_hist": line - sig})


def bollinger_bands(close: pd.Series, window: int = 20, num_std: float = 2.0) -> pd.DataFrame:
    """Bands = moving average +/- num_std standard deviations."""
    mid = sma(close, window)
    std = close.rolling(window=window, min_periods=window).std(ddof=0)
    upper = mid + num_std * std
    lower = mid - num_std * std
    band = upper - lower
    return pd.DataFrame(
        {
            "bb_mid": mid,
            "bb_upper": upper,
            "bb_lower": lower,
            "bb_pct_b": (close - lower) / band.replace(0.0, np.nan),  # 0=lower band, 1=upper band
            "bb_width": band / mid,
        }
    )


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    prev_close = close.shift(1)
    parts = pd.concat([high - low, (high - prev_close).abs(), (low - prev_close).abs()], axis=1)
    return parts.max(axis=1, skipna=False)


def atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14) -> pd.Series:
    """Average True Range: typical daily price range, a volatility gauge."""
    tr = true_range(high, low, close)
    return tr.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()


def obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """On-Balance Volume: running total of volume, added on up days, subtracted on down days."""
    direction = np.sign(close.diff()).fillna(0.0)
    return (direction * volume).cumsum()


def drawdown(close: pd.Series) -> pd.Series:
    """How far price is below its all-time high so far (0 = at the high, -0.2 = 20% below)."""
    return close / close.cummax() - 1.0