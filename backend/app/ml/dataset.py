from dataclasses import dataclass

import pandas as pd

from app.features.engineering import build_features
from app.features.targets import forward_return, label_direction
from app.utils.errors import InvalidRequestError

IST = "Asia/Kolkata"
MIN_LABELED_ROWS = 500
MAX_HORIZON = 20


@dataclass
class Dataset:
    X: pd.DataFrame               # features for rows that also have an answer key
    y: pd.Series                  # UP / DOWN / SIDEWAYS
    fwd_return: pd.Series         # the raw future return behind each label
    latest_features: pd.Series | None  # features for the newest row (no answer yet)
    horizon: int
    threshold: float


def drop_incomplete_last_bar(df: pd.DataFrame, now: pd.Timestamp | None = None) -> tuple[pd.DataFrame, bool]:
    """If today's daily bar is still forming (before ~15:45 IST), remove it."""
    now = now if now is not None else pd.Timestamp.now(tz=IST)
    if df.empty:
        return df, False
    last = df.index[-1]
    if last.date() == now.date() and (now.hour, now.minute) < (15, 45):
        return df.iloc[:-1], True
    return df, False


def build_dataset(df: pd.DataFrame, horizon: int, threshold: float) -> Dataset:
    if not 1 <= horizon <= MAX_HORIZON:
        raise InvalidRequestError(f"horizon must be between 1 and {MAX_HORIZON} sessions.")
    if not 0 < threshold <= 0.2:
        raise InvalidRequestError("threshold must be between 0 and 0.2 (e.g. 0.01 = 1%).")

    feats = build_features(df)
    fwd = forward_return(df["adj_close"], horizon)
    labels = label_direction(fwd, threshold)

    mask = feats.notna().all(axis=1) & fwd.notna()
    latest = feats.iloc[-1] if len(feats) and feats.iloc[-1].notna().all() else None
    return Dataset(
        X=feats[mask],
        y=labels[mask],
        fwd_return=fwd[mask],
        latest_features=latest,
        horizon=horizon,
        threshold=threshold,
    )