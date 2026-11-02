import numpy as np
import pandas as pd
import pytest

from app.features.engineering import FEATURE_COLUMNS, build_features
from app.features.indicators import atr, bollinger_bands, ema, macd, rsi, sma
from app.features.targets import CLASS_ORDER, class_balance, forward_return, label_direction
from app.ml.dataset import build_dataset, drop_incomplete_last_bar
from app.ml.predict import predict_from_frame
from app.ml.registry import load_bundle, load_report, model_key, save_bundle
from app.ml.train import train_models
from app.ml.validation import walk_forward_splits
from app.providers.demo_provider import DemoProvider
from app.utils.errors import InsufficientDataError, InvalidRequestError, ModelNotFoundError

FAR_FUTURE = pd.Timestamp("2035-01-01", tz="Asia/Kolkata")


@pytest.fixture(scope="module")
def demo_df():
    return DemoProvider().get_history("RELIANCE", 2200, "1d", "NSE")


# ------------------------------------------------------------------ indicators
def test_sma_known_values():
    out = sma(pd.Series([1.0, 2, 3, 4, 5]), 3)
    assert out.isna().sum() == 2
    assert out.iloc[2:].tolist() == [2.0, 3.0, 4.0]


def test_ema_and_macd_shapes(demo_df):
    assert ema(demo_df["close"], 12).iloc[-1] > 0
    m = macd(demo_df["close"])
    assert list(m.columns) == ["macd", "macd_signal", "macd_hist"]
    assert np.allclose((m["macd"] - m["macd_signal"]).dropna(), m["macd_hist"].dropna())


def test_rsi_bounds_and_extreme():
    assert rsi(pd.Series(np.arange(1.0, 100.0))).iloc[-1] == 100.0   # only gains
    assert rsi(pd.Series(np.arange(100.0, 1.0, -1.0))).iloc[-1] == 0.0  # only losses
    r = rsi(DemoProvider().get_history("TCS", 800, "1d", "NSE")["close"]).dropna()
    assert ((r >= 0) & (r <= 100)).all()


def test_bollinger_and_atr(demo_df):
    bb = bollinger_bands(demo_df["close"]).dropna()
    assert (bb["bb_upper"] >= bb["bb_mid"]).all() and (bb["bb_mid"] >= bb["bb_lower"]).all()
    assert (atr(demo_df["high"], demo_df["low"], demo_df["close"]).dropna() > 0).all()
    flat = bollinger_bands(pd.Series([100.0] * 40))  # zero-width bands must not crash
    assert flat["bb_pct_b"].isna().all()


# --------------------------------------------------------------------- targets
def test_forward_return_and_labels():
    fwd = forward_return(pd.Series([100.0, 110.0, 121.0]), 1)
    assert fwd.iloc[:2].round(4).tolist() == [0.1, 0.1]
    assert np.isnan(fwd.iloc[-1])
    labels = label_direction(pd.Series([0.05, -0.05, 0.001, np.nan]), 0.01)
    assert labels.iloc[:3].tolist() == ["UP", "DOWN", "SIDEWAYS"]
    assert pd.isna(labels.iloc[3])


def test_last_horizon_rows_are_unlabelled(demo_df):
    assert forward_return(demo_df["adj_close"], 5).iloc[-5:].isna().all()


def test_invalid_target_settings():
    with pytest.raises(InvalidRequestError):
        forward_return(pd.Series([1.0, 2.0]), 0)
    with pytest.raises(InvalidRequestError):
        label_direction(pd.Series([0.1]), 0)


def test_bigger_threshold_means_more_sideways(demo_df):
    fwd = forward_return(demo_df["adj_close"], 5)
    bal = class_balance(fwd, [0.005, 0.03])
    assert bal[0.005]["SIDEWAYS"] < bal[0.03]["SIDEWAYS"]


# --------------------------------------------------------- leakage / dataset
def test_features_do_not_use_future_data(demo_df):
    full = build_features(demo_df)
    k = 400
    pd.testing.assert_frame_equal(
        full.iloc[:k], build_features(demo_df.iloc[:k]), check_exact=False, rtol=1e-9, atol=1e-12
    )
    mutated = demo_df.copy()
    mutated.iloc[k:] = mutated.iloc[k:] * 3  # wildly change the future
    pd.testing.assert_frame_equal(
        full.iloc[:k], build_features(mutated).iloc[:k], check_exact=False, rtol=1e-9, atol=1e-12
    )


def test_no_target_columns_among_features():
    assert not any("fwd" in c or "future" in c or "target" in c for c in FEATURE_COLUMNS)


def test_dataset_alignment(demo_df):
    ds = build_dataset(demo_df, horizon=5, threshold=0.01)
    assert ds.X.notna().all().all()
    assert len(ds.X) == len(ds.y) == len(ds.fwd_return)
    assert ds.X.index.is_monotonic_increasing
    assert ds.X.index[-1] == demo_df.index[-6]
    assert ds.latest_features is not None


def test_drop_incomplete_bar():
    idx = pd.date_range("2030-01-01", periods=3, freq="D", tz="Asia/Kolkata")
    df = pd.DataFrame({"close": [1, 2, 3]}, index=idx)
    morning = pd.Timestamp("2030-01-03 10:00", tz="Asia/Kolkata")
    evening = pd.Timestamp("2030-01-03 18:00", tz="Asia/Kolkata")
    assert drop_incomplete_last_bar(df, morning)[1] is True
    assert len(drop_incomplete_last_bar(df, morning)[0]) == 2
    assert drop_incomplete_last_bar(df, evening)[1] is False


# ----------------------------------------------------------- chronological split
def test_walk_forward_is_chronological_with_gap():
    gap = 5
    splits = walk_forward_splits(1000, n_splits=5, min_train_size=200, gap=gap)
    prev_train = 0
    for i, (tr, te) in enumerate(splits):
        assert tr.max() + gap < te.min()
        assert len(tr) > prev_train
        prev_train = len(tr)
        if i + 1 < len(splits):
            assert te.max() + 1 == splits[i + 1][1].min()
    assert splits[-1][1].max() == 999


def test_walk_forward_rejects_tiny_data():
    with pytest.raises(InsufficientDataError):
        walk_forward_splits(210, n_splits=5, min_train_size=200)


# ------------------------------------------------------------- training pipeline
@pytest.fixture(scope="module")
def trained(demo_df):
    return train_models(
        demo_df, symbol="RELIANCE", exchange="NSE", interval="1d", horizon=5,
        threshold=0.01, n_splits=3, provider="demo", data_label="demo",
    )


def test_insufficient_data_is_rejected(demo_df):
    with pytest.raises(InsufficientDataError):
        train_models(demo_df.iloc[:200], symbol="X", exchange="NSE")


def test_invalid_training_settings(demo_df):
    with pytest.raises(InvalidRequestError):
        train_models(demo_df, symbol="X", exchange="NSE", horizon=99)
    with pytest.raises(InvalidRequestError):
        train_models(demo_df, symbol="X", exchange="NSE", interval="5m")


def test_report_structure_and_metrics(trained):
    bundle, report = trained
    assert set(report["holdout"]) == {"baseline_majority", "logistic_regression", "random_forest", "gradient_boosting"}
    for m in report["holdout"].values():
        assert 0 <= m["accuracy"] <= 1 and 0 <= m["balanced_accuracy"] <= 1
        assert np.array(m["confusion_matrix"]).shape == (3, 3)
    assert report["splits"]["development_end"] < report["splits"]["holdout_start"]
    assert bundle["metadata"]["selected_model"] != "baseline_majority"
    assert len(report["walk_forward"]["random_forest"]["folds"]) == 3
    assert "mae" in report["regression"]["holdout"]
    assert isinstance(bundle["metadata"]["probabilities_calibrated"], bool)
    assert any("DEMO" in w for w in bundle["metadata"]["warnings"])


def test_prediction_output(trained, demo_df):
    bundle, _ = trained
    out = predict_from_frame(bundle, demo_df, now=FAR_FUTURE)
    assert out["predicted_direction"] in CLASS_ORDER
    assert abs(sum(out["probabilities"].values()) - 1.0) < 1e-6
    assert out["model_version"] == bundle["metadata"]["model_version"]
    assert "not financial advice" in out["disclaimer"].lower()


def test_registry_roundtrip(trained, tmp_path):
    bundle, report = trained
    key = model_key("RELIANCE", "NSE", "1d", 5)
    save_bundle(bundle, report, key, tmp_path)
    assert load_bundle(key, tmp_path)["metadata"]["model_version"] == bundle["metadata"]["model_version"]
    assert load_report(key, tmp_path)["metadata"]["symbol"] == "RELIANCE"
    with pytest.raises(ModelNotFoundError):
        load_bundle("NOPE", tmp_path)