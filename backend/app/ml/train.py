import hashlib
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import sklearn
from sklearn.calibration import CalibratedClassifierCV

try:
    from sklearn.frozen import FrozenEstimator
except ImportError:  # scikit-learn < 1.6
    FrozenEstimator = None

from app.features.targets import CLASS_ORDER, class_balance
from app.ml.dataset import MIN_LABELED_ROWS, build_dataset, drop_incomplete_last_bar
from app.ml.evaluate import align_proba, classification_metrics, regression_metrics
from app.ml.models import ALL_MODELS, BASELINE, ML_MODELS, PARAM_GRID, make_classifier, make_regressor
from app.ml.registry import model_key, save_bundle
from app.ml.validation import walk_forward_splits
from app.utils.errors import InsufficientDataError, InvalidRequestError

logger = logging.getLogger(__name__)

SHOWS_EDGE_MARGIN = 0.03   # holdout balanced accuracy must beat the baseline by this much
DISCLAIMER = (
    "Educational model output, not financial advice. Probabilities describe a statistical "
    "model fitted to past prices; they are not guarantees of future outcomes."
)


def _ts(x) -> str:
    return pd.Timestamp(x).isoformat()


# ---------------------------------------------------------------- walk-forward
def _walk_forward_eval(name, params, X, y, gap, n_splits, random_state) -> dict:
    min_train = max(150, len(X) // 3)
    folds, all_true, all_pred, all_proba = [], [], [], []
    for k, (tr, te) in enumerate(walk_forward_splits(len(X), n_splits, min_train, gap), start=1):
        model = make_classifier(name, params, random_state)
        model.fit(X.iloc[tr], y.iloc[tr])
        pred = model.predict(X.iloc[te])
        proba = align_proba(model.classes_, model.predict_proba(X.iloc[te]))
        y_te = y.iloc[te].to_numpy()
        m = classification_metrics(y_te, pred, proba)
        folds.append(
            {
                "fold": k,
                "train_start": _ts(X.index[tr[0]]), "train_end": _ts(X.index[tr[-1]]),
                "test_start": _ts(X.index[te[0]]), "test_end": _ts(X.index[te[-1]]),
                "n_train": int(len(tr)), "n_test": int(len(te)),
                "accuracy": m["accuracy"], "balanced_accuracy": m["balanced_accuracy"],
                "f1_macro": m["f1_macro"],
            }
        )
        all_true.append(y_te); all_pred.append(pred); all_proba.append(proba)

    bal = [f["balanced_accuracy"] for f in folds]
    return {
        "params": params,
        "folds": folds,
        "mean_balanced_accuracy": float(np.mean(bal)),
        "std_balanced_accuracy": float(np.std(bal)),
        "mean_accuracy": float(np.mean([f["accuracy"] for f in folds])),
        "mean_f1_macro": float(np.mean([f["f1_macro"] for f in folds])),
        "pooled": classification_metrics(
            np.concatenate(all_true), np.concatenate(all_pred), np.vstack(all_proba)
        ),
    }


def _tune(name, X, y, gap, n_splits, random_state) -> dict:
    """Try each setting with walk-forward validation on DEVELOPMENT data only."""
    best = None
    for params in PARAM_GRID[name]:
        result = _walk_forward_eval(name, params, X, y, gap, n_splits, random_state)
        if best is None or result["mean_balanced_accuracy"] > best["mean_balanced_accuracy"]:
            best = result
    return best


# ------------------------------------------------------------------ calibration
def _fit_calibrated(name, params, X, y, gap, random_state, calib_frac=0.2):
    """Fit on the first ~80%, calibrate probabilities on the final ~20% (later in time).

    Returns (final_model, uncalibrated_base_model, was_calibrated).
    """
    n = len(X)
    cal_start = n - int(n * calib_frac)
    train_end = cal_start - gap
    base = make_classifier(name, params, random_state)
    base.fit(X.iloc[:train_end], y.iloc[:train_end])

    if name == BASELINE or FrozenEstimator is None:
        if FrozenEstimator is None and name != BASELINE:
            logger.warning("scikit-learn < 1.6: skipping probability calibration.")
        return base, base, False

    X_cal, y_cal = X.iloc[cal_start:], y.iloc[cal_start:]
    counts = y_cal.value_counts()
    if len(counts) == len(base.classes_) and counts.min() >= 5:
        try:
            calibrated = CalibratedClassifierCV(FrozenEstimator(base), method="sigmoid")
            calibrated.fit(X_cal, y_cal)
            return calibrated, base, True
        except Exception as exc:  # fall back rather than crash training
            logger.warning("Calibration failed (%s); using uncalibrated probabilities.", exc)
    return base, base, False


# -------------------------------------------------------------------- regression
def _evaluate_regression(X_dev, r_dev, X_hold, r_hold, gap, n_splits, random_state) -> dict:
    true, pred = [], []
    for tr, te in walk_forward_splits(len(X_dev), n_splits, max(150, len(X_dev) // 3), gap):
        m = make_regressor(random_state).fit(X_dev.iloc[tr], r_dev.iloc[tr])
        true.append(r_dev.iloc[te].to_numpy())
        pred.append(m.predict(X_dev.iloc[te]))
    t, p = np.concatenate(true), np.concatenate(pred)

    model = make_regressor(random_state).fit(X_dev, r_dev)
    hp, ht = model.predict(X_hold), r_hold.to_numpy()
    return {
        "target": "future return over the horizon (fraction, e.g. 0.01 = 1%)",
        "walk_forward": {**regression_metrics(t, p), "baseline_zero": regression_metrics(t, np.zeros_like(t))},
        "holdout": {
            **regression_metrics(ht, hp),
            "baseline_zero": regression_metrics(ht, np.zeros_like(ht)),
            "baseline_train_mean": regression_metrics(ht, np.full_like(ht, float(r_dev.mean()))),
        },
        "note": "A rough statistical estimate, not a target price. If it does not beat the "
                "'predict zero' baseline, treat it as noise.",
    }


# ------------------------------------------------------------------- main routine
def train_models(
    df: pd.DataFrame,
    *,
    symbol: str,
    exchange: str,
    interval: str = "1d",
    horizon: int = 5,
    threshold: float = 0.01,
    n_splits: int = 5,
    holdout_frac: float = 0.2,
    provider: str = "unknown",
    data_label: str = "end_of_day",
    random_state: int = 42,
) -> tuple[dict, dict]:
    """Train, validate and package models from a price DataFrame (no network here)."""
    if interval != "1d":
        raise InvalidRequestError("ML models currently support only the daily ('1d') interval.")

    ds = build_dataset(df, horizon, threshold)
    n = len(ds.X)
    if n < MIN_LABELED_ROWS:
        raise InsufficientDataError(
            f"Only {n} usable rows after indicator warm-up and the {horizon}-session horizon; "
            f"need at least {MIN_LABELED_ROWS}. Use a longer lookback (try 1825 days)."
        )
    counts = ds.y.value_counts()
    rare = [c for c in CLASS_ORDER if counts.get(c, 0) < 30]
    if len(rare) >= 2:
        raise InsufficientDataError(
            f"Class balance too lopsided ({counts.to_dict()}). Adjust the threshold: "
            "a very large threshold makes almost everything SIDEWAYS; a tiny one removes it."
        )

    warnings = [DISCLAIMER]
    if rare:
        warnings.append(f"Class {rare[0]} has fewer than 30 examples; its predictions are unreliable.")
    if data_label == "demo":
        warnings.append("DEMO DATA: trained on synthetic prices; results are meaningless for real markets.")

    # --- sealed holdout (last 20% in time) and development set, separated by a purge gap
    gap = horizon
    n_hold = int(n * holdout_frac)
    hold_start = n - n_hold
    dev_end = hold_start - gap
    X_dev, y_dev, r_dev = ds.X.iloc[:dev_end], ds.y.iloc[:dev_end], ds.fwd_return.iloc[:dev_end]
    X_hold, y_hold, r_hold = ds.X.iloc[hold_start:], ds.y.iloc[hold_start:], ds.fwd_return.iloc[hold_start:]

    # --- tune + walk-forward validate every model on development data only
    walk_forward = {name: _tune(name, X_dev, y_dev, gap, n_splits, random_state) for name in ALL_MODELS}
    best_name = max(ML_MODELS, key=lambda m: walk_forward[m]["mean_balanced_accuracy"])
    best_params = {name: walk_forward[name]["params"] for name in ALL_MODELS}

    # --- one-time look at the sealed holdout, for every model
    holdout, holdout_preds = {}, {}
    for name in ALL_MODELS:
        final, base, was_cal = _fit_calibrated(name, best_params[name], X_dev, y_dev, gap, random_state)
        pred = final.predict(X_hold)
        proba = align_proba(final.classes_, final.predict_proba(X_hold))
        m = classification_metrics(y_hold.to_numpy(), pred, proba)
        m["calibrated"] = was_cal
        m["log_loss_uncalibrated"] = classification_metrics(
            y_hold.to_numpy(), base.predict(X_hold), align_proba(base.classes_, base.predict_proba(X_hold))
        )["log_loss"]
        holdout[name] = m
        holdout_preds[name] = (pred, proba)

    regression = _evaluate_regression(X_dev, r_dev, X_hold, r_hold, gap, n_splits, random_state)

    edge = holdout[best_name]["balanced_accuracy"] - holdout[BASELINE]["balanced_accuracy"]
    shows_edge = bool(edge > SHOWS_EDGE_MARGIN)
    if not shows_edge:
        warnings.append(
            "On the sealed holdout this model showed no clear advantage over the always-predict-"
            "the-majority baseline. Treat its output as weak evidence at best."
        )

    sel_pred, sel_proba = holdout_preds[best_name]
    actual_vs_predicted = [
        {
            "timestamp": _ts(ts), "actual": str(a), "predicted": str(p),
            "future_return": float(fr),
            "p_down": float(pr[0]), "p_sideways": float(pr[1]), "p_up": float(pr[2]),
        }
        for ts, a, p, fr, pr in zip(X_hold.index, y_hold, sel_pred, r_hold, sel_proba)
    ]

    # --- deployable models: same recipe, applied to ALL labelled data
    final_clf, _, calibrated = _fit_calibrated(
        best_name, best_params[best_name], ds.X, ds.y, gap, random_state
    )
    final_reg = make_regressor(random_state).fit(ds.X, ds.fwd_return)

    trained_at = datetime.now(timezone.utc)
    fingerprint = json.dumps(
        [symbol, exchange, interval, horizon, threshold, n, _ts(ds.X.index[-1]), best_name, best_params[best_name]],
        sort_keys=True, default=str,
    )
    version = f"{trained_at:%Y%m%d%H%M%S}-{hashlib.sha1(fingerprint.encode()).hexdigest()[:8]}"

    metadata = {
        "model_version": version,
        "trained_at": trained_at.isoformat(),
        "symbol": symbol, "exchange": exchange, "interval": interval,
        "horizon": horizon, "threshold": threshold,
        "selected_model": best_name, "selected_params": best_params[best_name],
        "probabilities_calibrated": calibrated,
        "shows_edge_over_baseline": shows_edge,
        "holdout_balanced_accuracy": holdout[best_name]["balanced_accuracy"],
        "n_samples": n,
        "training_start": _ts(ds.X.index[0]), "training_end": _ts(ds.X.index[-1]),
        "last_data_timestamp": _ts(df.index[-1]),
        "provider": provider, "data_label": data_label,
        "random_state": random_state, "sklearn_version": sklearn.__version__,
        "feature_names": list(ds.X.columns), "classes": CLASS_ORDER,
        "warnings": warnings,
    }
    report = {
        "metadata": metadata,
        "class_balance": {c: int(counts.get(c, 0)) for c in CLASS_ORDER},
        "splits": {
            "development_start": _ts(X_dev.index[0]), "development_end": _ts(X_dev.index[-1]),
            "holdout_start": _ts(X_hold.index[0]), "holdout_end": _ts(X_hold.index[-1]),
            "purge_gap_sessions": gap,
        },
        "walk_forward": walk_forward,
        "holdout": holdout,
        "selection": {
            "selected_model": best_name,
            "selected_by": "highest mean walk-forward balanced accuracy on development data",
            "holdout_balanced_accuracy": holdout[best_name]["balanced_accuracy"],
            "baseline_holdout_balanced_accuracy": holdout[BASELINE]["balanced_accuracy"],
            "edge_over_baseline": edge,
            "shows_edge": shows_edge,
            "note": "The holdout has only a few hundred, partly overlapping labels, so differences "
                    "of a few percentage points are within noise.",
        },
        "regression": regression,
        "actual_vs_predicted_holdout": actual_vs_predicted,
        "why_history_can_mislead": [
            "Markets change regime: patterns from one period often vanish in the next.",
            "Choosing among many models/settings overfits to the past even with careful validation.",
            "Labels of consecutive days overlap, so the effective sample size is smaller than it looks.",
            "Real trading adds costs, slippage and delays that accuracy ignores.",
        ],
    }
    bundle = {
        "classifier": final_clf, "regressor": final_reg,
        "feature_names": list(ds.X.columns), "classes": CLASS_ORDER, "metadata": metadata,
    }
    return bundle, report


def train_for_symbol(
    service, symbol: str, exchange: str = "NSE", interval: str = "1d",
    lookback_days: int = 1825, horizon: int = 5, threshold: float = 0.01,
    n_splits: int = 5, artifacts_dir: Path | None = None,
) -> tuple[dict, dict, Path]:
    """Fetch data via MarketService, train, and save to the artifacts folder."""
    res = service.get_history_frame(symbol, lookback_days, interval, exchange)
    df, dropped = drop_incomplete_last_bar(res.df)
    bundle, report = train_models(
        df, symbol=res.symbol, exchange=res.exchange, interval=interval,
        horizon=horizon, threshold=threshold, n_splits=n_splits,
        provider=res.provider, data_label=res.label.value,
    )
    if dropped:
        bundle["metadata"]["warnings"].append("Today's incomplete daily bar was excluded from training.")
    path = save_bundle(bundle, report, model_key(res.symbol, res.exchange, interval, horizon), artifacts_dir)
    return bundle, report, path