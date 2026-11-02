import json
import math
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.utils.errors import ModelNotFoundError

ARTIFACTS_DIR = Path(__file__).resolve().parents[2] / "artifacts"


def model_key(symbol: str, exchange: str, interval: str, horizon: int) -> str:
    return f"{exchange}_{symbol}_{interval}_h{horizon}".upper().replace("/", "_")


def to_jsonable(obj):
    if isinstance(obj, dict):
        return {str(k): to_jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [to_jsonable(v) for v in obj]
    if isinstance(obj, np.ndarray):
        return to_jsonable(obj.tolist())
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, (np.floating, float)):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    return obj


def save_bundle(bundle: dict, report: dict, key: str, directory: Path | None = None) -> Path:
    directory = Path(directory) if directory else ARTIFACTS_DIR
    directory.mkdir(parents=True, exist_ok=True)
    model_path = directory / f"{key}.joblib"
    joblib.dump(bundle, model_path)
    (directory / f"{key}.report.json").write_text(
        json.dumps(to_jsonable(report), indent=2), encoding="utf-8"
    )
    return model_path


def load_bundle(key: str, directory: Path | None = None) -> dict:
    path = (Path(directory) if directory else ARTIFACTS_DIR) / f"{key}.joblib"
    if not path.exists():
        raise ModelNotFoundError(f"No trained model '{key}'. Train one first.")
    return joblib.load(path)


def load_report(key: str, directory: Path | None = None) -> dict:
    path = (Path(directory) if directory else ARTIFACTS_DIR) / f"{key}.report.json"
    if not path.exists():
        raise ModelNotFoundError(f"No report for model '{key}'. Train one first.")
    return json.loads(path.read_text(encoding="utf-8"))


def list_models(directory: Path | None = None) -> list[str]:
    directory = Path(directory) if directory else ARTIFACTS_DIR
    return sorted(p.stem for p in directory.glob("*.joblib")) if directory.exists() else []