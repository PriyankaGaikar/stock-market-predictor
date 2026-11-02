from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Exchange = Literal["NSE", "BSE"]


class TrainRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=25, examples=["RELIANCE"])
    exchange: Exchange = "NSE"
    interval: Literal["1d"] = "1d"
    horizon: int = Field(5, ge=1, le=20, description="Trading sessions ahead")
    threshold: float = Field(0.01, ge=0.002, le=0.1, description="0.01 = 1% move defines UP/DOWN")
    lookback_days: int = Field(1825, ge=730, le=3650)
    n_splits: int = Field(5, ge=3, le=8, description="Walk-forward folds")


class PredictRequest(BaseModel):
    symbol: str = Field(min_length=1, max_length=25, examples=["RELIANCE"])
    exchange: Exchange = "NSE"
    interval: Literal["1d"] = "1d"
    horizon: int = Field(5, ge=1, le=20)


class ClassProbabilities(BaseModel):
    DOWN: float
    SIDEWAYS: float
    UP: float


class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    symbol: str
    exchange: str
    horizon_sessions: int
    threshold: float
    predicted_direction: Literal["UP", "DOWN", "SIDEWAYS"]
    probabilities: ClassProbabilities
    probabilities_calibrated: bool
    estimated_return_pct: float
    estimated_price: float
    estimate_note: str
    last_close: float
    data_as_of: str
    data_label: str
    provider: str
    data_from_cache: bool = False
    model_name: str
    model_version: str
    model_trained_at: str
    training_period: list[str]
    holdout_balanced_accuracy: float | None = None
    shows_edge_over_baseline: bool
    warnings: list[str]
    disclaimer: str


class ModelSummary(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    key: str
    symbol: str
    exchange: str
    interval: str
    horizon: int
    threshold: float
    selected_model: str
    model_version: str
    trained_at: str
    training_start: str
    training_end: str
    n_samples: int
    provider: str
    data_label: str
    probabilities_calibrated: bool
    shows_edge_over_baseline: bool
    holdout_balanced_accuracy: float | None = None
    warnings: list[str]


class TrainResponse(BaseModel):
    summary: ModelSummary
    selection: dict[str, Any]
    class_balance: dict[str, int]
    message: str


class ModelReportResponse(BaseModel):
    metadata: dict[str, Any]
    class_balance: dict[str, Any]
    splits: dict[str, Any]
    walk_forward: dict[str, Any]
    holdout: dict[str, Any]
    selection: dict[str, Any]
    regression: dict[str, Any]
    actual_vs_predicted_holdout: list[dict[str, Any]]
    why_history_can_mislead: list[str]