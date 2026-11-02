import numpy as np
import pandas as pd

from app.utils.errors import InvalidRequestError

# Alphabetical order on purpose: it matches scikit-learn's `classes_` ordering.
CLASS_ORDER = ["DOWN", "SIDEWAYS", "UP"]


def forward_return(price: pd.Series, horizon: int) -> pd.Series:
    """Return from today's close to the close `horizon` sessions later.

    This deliberately looks into the FUTURE: it is the answer key, never a feature.
    The last `horizon` rows are NaN (the future hasn't happened yet).
    """
    if horizon < 1:
        raise InvalidRequestError("horizon must be at least 1 trading session.")
    return price.shift(-horizon) / price - 1.0


def label_direction(fwd_return: pd.Series, threshold: float) -> pd.Series:
    """UP if return > +threshold, DOWN if < -threshold, otherwise SIDEWAYS."""
    if threshold <= 0:
        raise InvalidRequestError("threshold must be positive (e.g. 0.01 means 1%).")
    labels = pd.Series(
        np.where(fwd_return > threshold, "UP", np.where(fwd_return < -threshold, "DOWN", "SIDEWAYS")),
        index=fwd_return.index,
        dtype="object",
        name="direction",
    )
    labels[fwd_return.isna()] = np.nan
    return labels


def class_balance(fwd_return: pd.Series, thresholds: list[float]) -> dict[float, dict[str, float]]:
    """Share of DOWN/SIDEWAYS/UP for each candidate threshold (to help you choose one)."""
    fwd = fwd_return.dropna()
    out = {}
    for t in thresholds:
        shares = label_direction(fwd, t).value_counts(normalize=True)
        out[t] = shares.reindex(CLASS_ORDER).fillna(0.0).round(3).to_dict()
    return out