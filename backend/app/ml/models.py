from sklearn.dummy import DummyClassifier
from sklearn.ensemble import (
    HistGradientBoostingClassifier,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

BASELINE = "baseline_majority"
ML_MODELS = ["logistic_regression", "random_forest", "gradient_boosting"]
ALL_MODELS = [BASELINE] + ML_MODELS

# Small grids, ordered simple -> complex. Tuned ONLY with walk-forward on development data.
PARAM_GRID = {
    BASELINE: [{}],
    "logistic_regression": [{"C": 0.01}, {"C": 0.1}, {"C": 1.0}],
    "random_forest": [
        {"max_depth": 3, "min_samples_leaf": 20},
        {"max_depth": 5, "min_samples_leaf": 10},
        {"max_depth": 8, "min_samples_leaf": 5},
    ],
    "gradient_boosting": [
        {"max_depth": 2, "learning_rate": 0.05, "max_iter": 100},
        {"max_depth": 3, "learning_rate": 0.05, "max_iter": 200},
        {"max_depth": 3, "learning_rate": 0.03, "max_iter": 300},
    ],
}


def make_classifier(name: str, params: dict | None = None, random_state: int = 42):
    p = params or PARAM_GRID[name][0]
    if name == BASELINE:
        # "prior": always predicts the most common class, probabilities = class frequencies
        return DummyClassifier(strategy="prior")
    if name == "logistic_regression":
        # The scaler lives INSIDE the pipeline, so it is fit on training rows only.
        return Pipeline(
            [
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(C=p["C"], max_iter=2000, class_weight="balanced")),
            ]
        )
    if name == "random_forest":
        return RandomForestClassifier(
            n_estimators=200,
            max_depth=p["max_depth"],
            min_samples_leaf=p["min_samples_leaf"],
            class_weight="balanced_subsample",
            n_jobs=-1,
            random_state=random_state,
        )
    if name == "gradient_boosting":
        return HistGradientBoostingClassifier(
            max_depth=p["max_depth"],
            learning_rate=p["learning_rate"],
            max_iter=p["max_iter"],
            l2_regularization=1.0,
            min_samples_leaf=20,
            class_weight="balanced",
            early_stopping=False,
            random_state=random_state,
        )
    raise ValueError(f"Unknown model '{name}'")


def make_regressor(random_state: int = 42) -> RandomForestRegressor:
    return RandomForestRegressor(
        n_estimators=200, max_depth=5, min_samples_leaf=10, n_jobs=-1, random_state=random_state
    )