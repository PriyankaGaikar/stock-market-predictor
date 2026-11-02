from datetime import datetime, timezone

import pandas as pd

from app.features.engineering import build_features
from app.ml.dataset import drop_incomplete_last_bar
from app.ml.evaluate import align_proba
from app.ml.registry import load_bundle, model_key
from app.features.targets import CLASS_ORDER
from app.utils.errors import InsufficientDataError

MODEL_MAX_AGE_DAYS = 30
DATA_MAX_AGE_DAYS = 5
DISCLAIMER = (
    "Educational analytics only, not financial advice or a buy/sell signal. "
    "Probabilities are model estimates and are not guaranteed outcomes."
)


def predict_from_frame(bundle: dict, df: pd.DataFrame, now: pd.Timestamp | None = None) -> dict:
    meta = bundle["metadata"]
    df, dropped = drop_incomplete_last_bar(df, now)
    feats = build_features(df)
    if feats.empty or feats.iloc[-1].isna().any():
        raise InsufficientDataError("Not enough recent history to compute all features. Fetch a longer history.")
    X = feats.iloc[[-1]][bundle["feature_names"]]

    clf = bundle["classifier"]
    proba = align_proba(clf.classes_, clf.predict_proba(X))[0]
    predicted = CLASS_ORDER[int(proba.argmax())]
    est_return = float(bundle["regressor"].predict(X)[0])

    last_ts = df.index[-1]
    last_close = float(df["close"].iloc[-1])
    ref_now = now if now is not None else pd.Timestamp.now(tz=last_ts.tz)

    warnings = list(meta["warnings"])
    if dropped:
        warnings.append("Today's session is still in progress; the prediction uses the previous completed close.")
    if (ref_now - last_ts).days > DATA_MAX_AGE_DAYS:
        warnings.append(f"Latest price data is more than {DATA_MAX_AGE_DAYS} days old.")
    trained_at = datetime.fromisoformat(meta["trained_at"])
    if (datetime.now(timezone.utc) - trained_at).days > MODEL_MAX_AGE_DAYS:
        warnings.append(f"Model is older than {MODEL_MAX_AGE_DAYS} days; consider retraining.")
    if not meta["probabilities_calibrated"]:
        warnings.append("Probabilities are NOT calibrated; treat them as rough scores.")

    return {
        "symbol": meta["symbol"], "exchange": meta["exchange"],
        "horizon_sessions": meta["horizon"], "threshold": meta["threshold"],
        "predicted_direction": predicted,
        "probabilities": {c: float(p) for c, p in zip(CLASS_ORDER, proba)},
        "probabilities_calibrated": meta["probabilities_calibrated"],
        "estimated_return_pct": round(est_return * 100, 3),
        "estimated_price": round(last_close * (1 + est_return), 2),
        "estimate_note": "Rough model estimate, not a price target.",
        "last_close": round(last_close, 2),
        "data_as_of": last_ts.isoformat(),
        "data_label": meta["data_label"], "provider": meta["provider"],
        "model_name": meta["selected_model"], "model_version": meta["model_version"],
        "model_trained_at": meta["trained_at"],
        "training_period": [meta["training_start"], meta["training_end"]],
        "holdout_balanced_accuracy": meta["holdout_balanced_accuracy"],
        "shows_edge_over_baseline": meta["shows_edge_over_baseline"],
        "warnings": warnings, "disclaimer": DISCLAIMER,
    }


def predict_for_symbol(service, symbol, exchange="NSE", interval="1d", horizon=5,
                       lookback_days=500, artifacts_dir=None) -> dict:
    sym = symbol.strip().upper()
    bundle = load_bundle(model_key(sym, exchange, interval, horizon), artifacts_dir)
    res = service.get_history_frame(sym, lookback_days, interval, exchange)
    result = predict_from_frame(bundle, res.df)
    result["data_label"] = res.label.value
    result["data_from_cache"] = res.from_cache
    trained_on = bundle["metadata"]["provider"]
    if res.provider != trained_on:
        result["warnings"].append(
            f"Model was trained on '{trained_on}' data but this prediction used '{res.provider}' data. "
            "Treat the output with extreme caution."
        )
    return result