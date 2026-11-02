from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.api import ml as ml_api
from app.api.deps import get_artifacts_dir, get_market_service
from app.api.limits import RateLimiter, predict_limiter, train_limiter
from app.main import app
from app.ml.registry import model_key
from app.providers.demo_provider import DemoProvider
from app.services.market_service import MarketService
from app.utils.errors import RateLimitedError


@pytest.fixture(scope="module")
def api(tmp_path_factory):
    artifacts = tmp_path_factory.mktemp("artifacts")
    service = MarketService(DemoProvider(), quote_ttl=60, history_ttl=60)
    app.dependency_overrides[get_market_service] = lambda: service
    app.dependency_overrides[get_artifacts_dir] = lambda: artifacts
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _reset_limiters():
    train_limiter.clear()
    predict_limiter.clear()


# ------------------------------------------------------------- indicators
def test_indicators_endpoint_shape(api):
    r = api.get("/api/stocks/RELIANCE/indicators?lookback_days=365")
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == len(body["series"]) > 100
    assert body["label"] == "demo" and body["provider"] == "demo"
    last = body["series"][-1]
    assert 0 <= last["rsi_14"] <= 100
    assert last["bb_lower"] <= last["bb_mid"] <= last["bb_upper"]
    assert body["summary"]["latest_close"] == pytest.approx(last["close"], abs=0.01)
    assert body["summary"]["trend_label"] in {"upward", "downward", "mixed"}
    assert {"sma", "ema", "rsi", "macd", "bollinger", "atr"} <= set(body["guide"])
    assert sum(b["count"] for b in body["returns_histogram"]) == body["count"] - 1
    stamps = [p["timestamp"] for p in body["series"]]
    assert stamps == sorted(stamps)


def test_indicators_validation(api):
    assert api.get("/api/stocks/TCS/indicators?lookback_days=30").status_code == 422
    assert api.get("/api/stocks/TCS/indicators?interval=5m").status_code == 422
    r = api.get("/api/stocks/BAD%20SYM/indicators")
    assert r.status_code == 422 and r.json()["error"]["type"] == "InvalidRequestError"


# ---------------------------------------------------------------- ml errors
def test_predict_without_trained_model_is_404(api):
    r = api.post("/api/predict", json={"symbol": "TCS"})
    assert r.status_code == 404
    assert r.json()["error"]["type"] == "ModelNotFoundError"


def test_predict_and_train_validation(api):
    assert api.post("/api/predict", json={"symbol": "TCS", "horizon": 99}).status_code == 422
    assert api.post("/api/predict", json={"symbol": "TCS", "exchange": "NYSE"}).status_code == 422
    r = api.post("/api/models/train", json={"symbol": "TCS", "threshold": 0.9})
    assert r.status_code == 422 and r.json()["error"]["type"] == "ValidationError"
    assert api.post("/api/models/train", json={"symbol": "TCS", "lookback_days": 100}).status_code == 422


def test_metrics_for_unknown_model_is_404(api):
    r = api.get("/api/models/metrics?symbol=WIPRO&horizon=5")
    assert r.status_code == 404


def test_concurrent_training_is_rejected(api):
    key = model_key("INFY", "NSE", "1d", 5)
    ml_api._in_progress.add(key)
    try:
        r = api.post("/api/models/train", json={"symbol": "INFY"})
    finally:
        ml_api._in_progress.discard(key)
    assert r.status_code == 409
    assert r.json()["error"]["type"] == "TrainingInProgressError"


def test_rate_limiter_blocks_after_limit():
    limiter = RateLimiter(2, 60, "test")
    req = SimpleNamespace(client=SimpleNamespace(host="1.2.3.4"))
    limiter(req)
    limiter(req)
    with pytest.raises(RateLimitedError):
        limiter(req)
    limiter(SimpleNamespace(client=SimpleNamespace(host="5.6.7.8")))  # different client is fine


# ------------------------------------------------------------- full workflow
def test_train_predict_metrics_flow(api):
    r = api.post(
        "/api/models/train",
        json={"symbol": "RELIANCE", "horizon": 5, "threshold": 0.01, "lookback_days": 1825, "n_splits": 3},
    )
    assert r.status_code == 200, r.text
    trained = r.json()
    assert trained["summary"]["selected_model"] in {"logistic_regression", "random_forest", "gradient_boosting"}
    assert trained["summary"]["data_label"] == "demo"
    assert sum(trained["class_balance"].values()) > 500

    p = api.post("/api/predict", json={"symbol": "reliance", "horizon": 5})
    assert p.status_code == 200, p.text
    pred = p.json()
    assert pred["predicted_direction"] in {"UP", "DOWN", "SIDEWAYS"}
    assert sum(pred["probabilities"].values()) == pytest.approx(1.0, abs=1e-6)
    assert pred["model_version"] == trained["summary"]["model_version"]
    assert "not financial advice" in pred["disclaimer"].lower()
    assert any("DEMO" in w for w in pred["warnings"])

    m = api.get("/api/models/metrics?symbol=RELIANCE&horizon=5")
    assert m.status_code == 200
    report = m.json()
    assert set(report["holdout"]) == {"baseline_majority", "logistic_regression", "random_forest", "gradient_boosting"}
    assert len(report["actual_vs_predicted_holdout"]) > 50
    assert report["why_history_can_mislead"]

    listing = api.get("/api/models").json()
    assert [x["key"] for x in listing] == [model_key("RELIANCE", "NSE", "1d", 5)]


def test_openapi_lists_all_endpoints(api):
    paths = api.get("/openapi.json").json()["paths"]
    for p in ["/api/health", "/api/stocks/search", "/api/stocks/{symbol}/quote",
              "/api/stocks/{symbol}/history", "/api/stocks/{symbol}/indicators",
              "/api/predict", "/api/models", "/api/models/metrics", "/api/models/train"]:
        assert p in paths