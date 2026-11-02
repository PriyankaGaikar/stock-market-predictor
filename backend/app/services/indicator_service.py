import numpy as np
import pandas as pd

from app.features.engineering import adjust_ohlc
from app.features.indicators import atr, bollinger_bands, drawdown, ema, macd, obv, rsi, sma
from app.schemas.analysis import (
    HistogramBin,
    IndicatorPoint,
    IndicatorsResponse,
    IndicatorSummary,
    ReturnsStats,
)
from app.services.market_service import HistoryResult
from app.utils.errors import InsufficientDataError

MIN_ROWS = 30
PERIODS_PER_YEAR = {"1d": 252, "1wk": 52}
POINT_FIELDS = [f for f in IndicatorPoint.model_fields if f != "timestamp"]

INDICATOR_GUIDE = {
    "sma": {
        "name": "Simple Moving Average (SMA)",
        "what": "The plain average closing price over the last N periods, like your average speed over the last N kilometres. It smooths out day-to-day noise.",
        "limitation": "It lags behind price (it reports the past) and gives false signals when prices move sideways.",
    },
    "ema": {
        "name": "Exponential Moving Average (EMA)",
        "what": "Like an SMA, but recent days count more, so it reacts faster to new moves.",
        "limitation": "Reacting faster also means more false alarms in choppy markets.",
    },
    "rsi": {
        "name": "Relative Strength Index (RSI)",
        "what": "A 0-100 speedometer for recent buying versus selling pressure. Above 70 is conventionally called 'overbought', below 30 'oversold'.",
        "limitation": "In a strong trend RSI can stay above 70 or below 30 for weeks. It describes momentum; it does not predict reversals.",
    },
    "macd": {
        "name": "MACD",
        "what": "Two moving averages (fast and slow) racing each other. The gap between them is the MACD line; its own average is the signal line. A widening gap suggests growing momentum.",
        "limitation": "Built from moving averages, so it lags and often crosses back and forth in sideways markets.",
    },
    "bollinger": {
        "name": "Bollinger Bands",
        "what": "A corridor around the 20-period average, two standard deviations wide. The corridor widens when prices are jumpy and narrows when calm.",
        "limitation": "Touching a band is not a signal by itself. In strong trends price can 'walk' along a band.",
    },
    "atr": {
        "name": "Average True Range (ATR)",
        "what": "The typical size of one period's price swing, including gaps. A bigger ATR means a more volatile stock.",
        "limitation": "It measures size of movement, not direction, and is in price units, so compare across stocks as a percent of price.",
    },
    "obv": {
        "name": "On-Balance Volume (OBV)",
        "what": "A running tally of volume: add the day's volume on up days, subtract on down days. Rising OBV means volume is flowing in on up days.",
        "limitation": "Only the sign of the price change counts, not its size, and the absolute level is arbitrary. Look at its trend.",
    },
    "volatility": {
        "name": "Rolling volatility",
        "what": "How much daily returns have been bouncing around over the last 20 periods, scaled to a yearly figure. Higher means a bumpier ride.",
        "limitation": "It looks backwards. Calm periods can end suddenly, and it ignores the direction of moves.",
    },
    "drawdown": {
        "name": "Drawdown",
        "what": "How far the price is below its highest point so far. -20% means 20% under the peak.",
        "limitation": "It depends on the period you choose, so a short window can hide past big falls.",
    },
    "returns_distribution": {
        "name": "Returns distribution",
        "what": "A histogram of daily percentage changes. A tall, narrow middle means mostly small moves; fat tails mean occasional big ones.",
        "limitation": "Past returns do not tell you the size of future extremes. Real markets have bigger surprises than a bell curve suggests.",
    },
}


def _num(x, nd: int = 2):
    if x is None:
        return None
    try:
        v = float(x)
    except (TypeError, ValueError):
        return None
    return None if (np.isnan(v) or np.isinf(v)) else round(v, nd)


def compute_indicator_frame(df: pd.DataFrame, interval: str = "1d") -> pd.DataFrame:
    """All indicators, computed on split/dividend-adjusted prices."""
    px = adjust_ohlc(df)
    c = px["close"]
    out = px[["open", "high", "low", "close", "volume"]].copy()
    out["sma_20"] = sma(c, 20)
    out["sma_50"] = sma(c, 50)
    out["ema_12"] = ema(c, 12)
    out["ema_26"] = ema(c, 26)
    out["rsi_14"] = rsi(c, 14)
    out = out.join(macd(c))
    bb = bollinger_bands(c, 20)
    for col in ("bb_upper", "bb_mid", "bb_lower", "bb_pct_b"):
        out[col] = bb[col]
    out["atr_14"] = atr(px["high"], px["low"], c, 14)
    out["obv"] = obv(c, px["volume"])
    out["daily_return"] = c / c.shift(1) - 1.0
    out["volatility_20"] = out["daily_return"].rolling(20, min_periods=20).std() * np.sqrt(
        PERIODS_PER_YEAR.get(interval, 252)
    )
    out["drawdown"] = drawdown(c)
    return out


def _summarize(frame: pd.DataFrame, interval: str) -> IndicatorSummary:
    c = frame["close"]
    r = frame["daily_return"].dropna()
    ppy = PERIODS_PER_YEAR.get(interval, 252)
    last = frame.iloc[-1]

    rsi_latest = _num(last["rsi_14"])
    if rsi_latest is None:
        rsi_state = "Not enough data for RSI."
    elif rsi_latest >= 70:
        rsi_state = "RSI is in the conventional 'overbought' zone (70+). Strong trends can stay there for a long time."
    elif rsi_latest <= 30:
        rsi_state = "RSI is in the conventional 'oversold' zone (30 or below). Falling prices can keep falling."
    else:
        rsi_state = "RSI is in the neutral zone (30-70)."

    if pd.isna(last["macd"]) or pd.isna(last["macd_signal"]):
        macd_state = "Not enough data for MACD."
    elif last["macd"] > last["macd_signal"]:
        macd_state = "MACD line is above its signal line: recent momentum leans upward."
    else:
        macd_state = "MACD line is below its signal line: recent momentum leans downward."

    s20, s50 = last["sma_20"], last["sma_50"]
    if pd.isna(s20) or pd.isna(s50):
        trend_label, trend_summary = "insufficient_data", "Not enough history for the 20- and 50-period averages."
    elif last["close"] > s50 and s20 > s50:
        trend_label = "upward"
        trend_summary = ("Price is above its 50-period average and the 20-period average is above the "
                         "50-period average: an upward-leaning trend by this simple measure.")
    elif last["close"] < s50 and s20 < s50:
        trend_label = "downward"
        trend_summary = ("Price is below its 50-period average and the 20-period average is below the "
                         "50-period average: a downward-leaning trend by this simple measure.")
    else:
        trend_label = "mixed"
        trend_summary = "Signals are mixed: price and the two moving averages do not agree on a direction."

    avg_volume = float(frame["volume"].mean())
    stats = ReturnsStats(
        mean_pct=_num(r.mean() * 100, 3) if len(r) else None,
        std_pct=_num(r.std() * 100, 3) if len(r) > 1 else None,
        skew=_num(r.skew(), 3) if len(r) > 2 else None,
        excess_kurtosis=_num(r.kurt(), 3) if len(r) > 3 else None,
        best_day_pct=_num(r.max() * 100) if len(r) else None,
        worst_day_pct=_num(r.min() * 100) if len(r) else None,
    )
    return IndicatorSummary(
        latest_close=round(float(c.iloc[-1]), 2),
        period_return_pct=round(float((c.iloc[-1] / c.iloc[0] - 1) * 100), 2),
        annualized_volatility_pct=_num(r.std() * np.sqrt(ppy) * 100) if len(r) > 2 else None,
        max_drawdown_pct=round(float(frame["drawdown"].min() * 100), 2),
        avg_volume=round(avg_volume, 0),
        latest_volume_vs_avg=_num(last["volume"] / avg_volume) if avg_volume > 0 else None,
        rsi_latest=rsi_latest,
        rsi_state=rsi_state,
        macd_state=macd_state,
        trend_label=trend_label,
        trend_summary=trend_summary,
        returns_stats=stats,
    )


def _histogram(frame: pd.DataFrame, bins: int = 20) -> list[HistogramBin]:
    r = frame["daily_return"].dropna() * 100
    if len(r) < 2:
        return []
    counts, edges = np.histogram(r, bins=bins)
    return [
        HistogramBin(bin_start=round(float(edges[i]), 3), bin_end=round(float(edges[i + 1]), 3), count=int(counts[i]))
        for i in range(len(counts))
    ]


def build_indicators_response(res: HistoryResult) -> IndicatorsResponse:
    if len(res.df) < MIN_ROWS:
        raise InsufficientDataError(
            f"Only {len(res.df)} candles available; need at least {MIN_ROWS}. Use a longer lookback."
        )
    frame = compute_indicator_frame(res.df, res.interval)
    series = [
        IndicatorPoint(timestamp=ts.to_pydatetime(), **{f: _num(row[f], 6) for f in POINT_FIELDS})
        for ts, row in frame.iterrows()
    ]
    return IndicatorsResponse(
        symbol=res.symbol, exchange=res.exchange, interval=res.interval,
        lookback_days=res.lookback_days, count=len(series),
        first_timestamp=series[0].timestamp, last_timestamp=series[-1].timestamp,
        price_basis="Prices and indicators use split/dividend-adjusted values so they line up consistently.",
        fetched_at=res.fetched_at, label=res.label, provider=res.provider,
        from_cache=res.from_cache, cache_age_seconds=res.cache_age_seconds, note=res.note,
        summary=_summarize(frame, res.interval),
        returns_histogram=_histogram(frame),
        guide=INDICATOR_GUIDE,
        series=series,
    )