import numpy as np

from app.utils.errors import InsufficientDataError


def walk_forward_splits(
    n_samples: int, n_splits: int = 5, min_train_size: int = 200, gap: int = 0
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Expanding-window splits. Training always ends `gap` rows before testing starts.

    Fold 1: train [0, a)  test [a+gap, ...)
    Fold 2: train [0, b)  test [b+gap, ...)   (training set keeps growing)
    """
    if n_splits < 1:
        raise InsufficientDataError("n_splits must be at least 1.")
    test_size = (n_samples - min_train_size) // n_splits
    if test_size < 20:
        raise InsufficientDataError(
            f"Not enough rows ({n_samples}) for {n_splits} walk-forward folds. "
            "Use a longer lookback or fewer folds."
        )
    splits = []
    for i in range(n_splits):
        test_start = min_train_size + i * test_size
        test_end = n_samples if i == n_splits - 1 else test_start + test_size
        train_end = test_start - gap
        if train_end < 50:
            raise InsufficientDataError("Training window too small after the purge gap.")
        splits.append((np.arange(0, train_end), np.arange(test_start, test_end)))
    return splits