import numpy as np
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    log_loss,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    recall_score,
    roc_auc_score,
)

from app.features.targets import CLASS_ORDER


def align_proba(model_classes, proba: np.ndarray) -> np.ndarray:
    """Arrange probability columns as DOWN, SIDEWAYS, UP (zeros for classes the model never saw)."""
    out = np.zeros((proba.shape[0], len(CLASS_ORDER)))
    for j, cls in enumerate(model_classes):
        out[:, CLASS_ORDER.index(str(cls))] = proba[:, j]
    return out


def classification_metrics(y_true, y_pred, proba: np.ndarray | None = None) -> dict:
    y_true, y_pred = np.asarray(y_true), np.asarray(y_pred)
    m = {
        "n": int(len(y_true)),
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "precision_macro": float(precision_score(y_true, y_pred, labels=CLASS_ORDER, average="macro", zero_division=0)),
        "recall_macro": float(recall_score(y_true, y_pred, labels=CLASS_ORDER, average="macro", zero_division=0)),
        "f1_macro": float(f1_score(y_true, y_pred, labels=CLASS_ORDER, average="macro", zero_division=0)),
        "f1_weighted": float(f1_score(y_true, y_pred, labels=CLASS_ORDER, average="weighted", zero_division=0)),
        "labels": CLASS_ORDER,
        "confusion_matrix": confusion_matrix(y_true, y_pred, labels=CLASS_ORDER).tolist(),
        "support": {c: int((y_true == c).sum()) for c in CLASS_ORDER},
        "roc_auc_ovr": None,
        "log_loss": None,
    }
    if proba is not None:
        try:
            m["roc_auc_ovr"] = float(
                roc_auc_score(y_true, proba, multi_class="ovr", average="macro", labels=CLASS_ORDER)
            )
        except ValueError:  # e.g. a class is missing from y_true
            pass
        try:
            m["log_loss"] = float(log_loss(y_true, proba, labels=CLASS_ORDER))
        except ValueError:
            pass
    return m


def regression_metrics(y_true, y_pred) -> dict:
    y_true, y_pred = np.asarray(y_true, dtype=float), np.asarray(y_pred, dtype=float)
    return {
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
    }