import logging
import threading
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_artifacts_dir, get_market_service
from app.api.limits import predict_limiter, train_limiter
from app.ml.predict import predict_for_symbol
from app.ml.registry import list_models, load_report, model_key
from app.ml.train import train_for_symbol
from app.schemas.ml import (
    ModelReportResponse,
    ModelSummary,
    PredictionResponse,
    PredictRequest,
    TrainRequest,
    TrainResponse,
)
from app.services.market_service import MarketService
from app.utils.errors import TrainingInProgressError
from app.utils.symbols import normalize_symbol

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["ml"])

_in_progress: set[str] = set()   # the 'kitchen busy' sign
_guard = threading.Lock()


def _summary(key: str, meta: dict) -> ModelSummary:
    return ModelSummary(
        key=key, symbol=meta["symbol"], exchange=meta["exchange"], interval=meta["interval"],
        horizon=meta["horizon"], threshold=meta["threshold"], selected_model=meta["selected_model"],
        model_version=meta["model_version"], trained_at=meta["trained_at"],
        training_start=meta["training_start"], training_end=meta["training_end"],
        n_samples=meta["n_samples"], provider=meta["provider"], data_label=meta["data_label"],
        probabilities_calibrated=meta["probabilities_calibrated"],
        shows_edge_over_baseline=meta["shows_edge_over_baseline"],
        holdout_balanced_accuracy=meta.get("holdout_balanced_accuracy"),
        warnings=meta["warnings"],
    )


@router.post("/predict", response_model=PredictionResponse, dependencies=[Depends(predict_limiter)])
def predict(
    req: PredictRequest,
    service: MarketService = Depends(get_market_service),
    artifacts_dir: Path | None = Depends(get_artifacts_dir),
):
    """Serve a prediction from an already-trained model. Never retrains."""
    sym, exch = normalize_symbol(req.symbol, req.exchange)
    return predict_for_symbol(service, sym, exch, req.interval, req.horizon, artifacts_dir=artifacts_dir)


@router.post("/models/train", response_model=TrainResponse, dependencies=[Depends(train_limiter)])
def train(
    req: TrainRequest,
    service: MarketService = Depends(get_market_service),
    artifacts_dir: Path | None = Depends(get_artifacts_dir),
):
    """Train, validate and save models for one stock. Can take 30-90 seconds."""
    sym, exch = normalize_symbol(req.symbol, req.exchange)
    key = model_key(sym, exch, req.interval, req.horizon)
    with _guard:
        if key in _in_progress:
            raise TrainingInProgressError(f"Training for {key} is already running.")
        _in_progress.add(key)
    try:
        logger.info("Training started: %s", key)
        bundle, report, _ = train_for_symbol(
            service, sym, exch, req.interval, req.lookback_days, req.horizon,
            req.threshold, req.n_splits, artifacts_dir,
        )
        logger.info("Training finished: %s (%s)", key, bundle["metadata"]["model_version"])
    finally:
        with _guard:
            _in_progress.discard(key)
    return TrainResponse(
        summary=_summary(key, bundle["metadata"]),
        selection=report["selection"],
        class_balance=report["class_balance"],
        message="Model trained and saved. Evaluation figures are historical and do not guarantee future results.",
    )


@router.get("/models", response_model=list[ModelSummary])
def available_models(artifacts_dir: Path | None = Depends(get_artifacts_dir)):
    """List every trained model."""
    out = []
    for key in list_models(artifacts_dir):
        out.append(_summary(key, load_report(key, artifacts_dir)["metadata"]))
    return out


@router.get("/models/metrics", response_model=ModelReportResponse)
def model_metrics(
    symbol: str = Query(..., min_length=1, max_length=25),
    exchange: Literal["NSE", "BSE"] = "NSE",
    interval: Literal["1d"] = "1d",
    horizon: int = Query(5, ge=1, le=20),
    artifacts_dir: Path | None = Depends(get_artifacts_dir),
):
    """Full evaluation report: baseline vs models, walk-forward folds, confusion matrices..."""
    sym, exch = normalize_symbol(symbol, exchange)
    return load_report(model_key(sym, exch, interval, horizon), artifacts_dir)