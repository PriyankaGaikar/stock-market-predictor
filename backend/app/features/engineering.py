import numpy as np
import pandas as pd

from app.features.indicators import atr, bollinger_bands, macd, rsi, sma

FEATURE_COLUMNS = [
    "ret_1", "ret_2", "ret_5", "ret_10", "ret_20",
    "vol_5", "vol_10", "vol_20",
    "close_vs_sma_10", "close_vs_sma_20", "close_vs_sma_50", "sma_10_vs_50",
    "macd_norm", "macd_signal_norm", "macd_hist_norm",
    "rsi_14", "bb_pct_b", "bb_width", "atr_pct_14",
    "volume_ratio_20", "volume_chg_1",
    "range_pct", "gap_pct", "drawdown_60",
]


def adjust_ohlc(df: pd.DataFrame) -> pd.DataFrame:
    """Put open/high/low/close on the same dividend- and split-adjusted scale as adj_close."""
    factor = (df["adj_close"] / df["close"]).replace([np.inf, -np.inf], np.nan).fillna(1.0)
    out = pd.DataFrame(index=df.index)
    out["open"] = df["open"] * factor
    out["high"] = df["high"] * factor
    out["low"] = df["low"] * factor
    out["close"] = df["adj_close"]
    out["volume"] = df["volume"].astype(float)
    return out


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Features for every row, using ONLY information available at that row's close.

    All inputs are ratios or percentages, so a 200-rupee stock and a 3000-rupee
    stock produce comparable numbers. Early rows are NaN (indicator warm-up).
    """
    px = adjust_ohlc(df)
    o, h, l, c, v = px["open"], px["high"], px["low"], px["close"], px["volume"]
    log_ret = np.log(c).diff()

    f = pd.DataFrame(index=px.index)
    for n in (1, 2, 5, 10, 20):
        f[f"ret_{n}"] = c / c.shift(n) - 1.0
    for n in (5, 10, 20):
        f[f"vol_{n}"] = log_ret.rolling(n, min_periods=n).std()
    for n in (10, 20, 50):
        f[f"close_vs_sma_{n}"] = c / sma(c, n) - 1.0
    f["sma_10_vs_50"] = sma(c, 10) / sma(c, 50) - 1.0

    m = macd(c)
    f["macd_norm"] = m["macd"] / c
    f["macd_signal_norm"] = m["macd_signal"] / c
    f["macd_hist_norm"] = m["macd_hist"] / c

    f["rsi_14"] = rsi(c, 14)
    bb = bollinger_bands(c, 20)
    f["bb_pct_b"] = bb["bb_pct_b"]
    f["bb_width"] = bb["bb_width"]
    f["atr_pct_14"] = atr(h, l, c, 14) / c

    v_pos = v.replace(0.0, np.nan)
    f["volume_ratio_20"] = v / v.rolling(20, min_periods=20).mean().replace(0.0, np.nan)
    f["volume_chg_1"] = np.log(v_pos).diff()

    f["range_pct"] = (h - l) / c
    f["gap_pct"] = o / c.shift(1) - 1.0
    f["drawdown_60"] = c / c.rolling(60, min_periods=60).max() - 1.0

    return f[FEATURE_COLUMNS].replace([np.inf, -np.inf], np.nan)