import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.deps import get_market_service  # noqa: E402
from app.features.targets import class_balance, forward_return  # noqa: E402
from app.ml.train import train_for_symbol  # noqa: E402

p = argparse.ArgumentParser(description="Train models for one stock.")
p.add_argument("--symbol", default="RELIANCE")
p.add_argument("--exchange", default="NSE", choices=["NSE", "BSE"])
p.add_argument("--horizon", type=int, default=5, help="trading sessions ahead")
p.add_argument("--threshold", type=float, default=0.01, help="0.01 = 1%%")
p.add_argument("--lookback-days", type=int, default=1825)
p.add_argument("--folds", type=int, default=5)
p.add_argument("--show-balance", action="store_true", help="only show class balance per threshold")
a = p.parse_args()

service = get_market_service()

if a.show_balance:
    res = service.get_history_frame(a.symbol, a.lookback_days, "1d", a.exchange)
    fwd = forward_return(res.df["adj_close"], a.horizon)
    print(f"Class balance for {a.symbol}, horizon={a.horizon} sessions ({res.label.value} data)")
    for t, shares in class_balance(fwd, [0.005, 0.01, 0.02, 0.03]).items():
        print(f"  threshold {t:>5.1%}: {shares}")
    sys.exit(0)

bundle, report, path = train_for_symbol(
    service, a.symbol, a.exchange, "1d", a.lookback_days, a.horizon, a.threshold, a.folds
)
meta, sel = bundle["metadata"], report["selection"]
print(f"\nSaved model: {path}")
print(f"Version: {meta['model_version']}  | data: {meta['provider']} ({meta['data_label']})")
print(f"Rows: {meta['n_samples']}  | period: {meta['training_start'][:10]} -> {meta['training_end'][:10]}")
print(f"Class balance: {report['class_balance']}")
print(f"\n{'model':<22}{'WF bal.acc':>16}{'hold acc':>10}{'hold bal.acc':>14}{'hold F1':>9}")
for name, wf in report["walk_forward"].items():
    h = report["holdout"][name]
    print(f"{name:<22}{wf['mean_balanced_accuracy']:>9.3f} ±{wf['std_balanced_accuracy']:.3f}"
          f"{h['accuracy']:>10.3f}{h['balanced_accuracy']:>14.3f}{h['f1_macro']:>9.3f}")
print(f"\nSelected: {sel['selected_model']}  | calibrated: {meta['probabilities_calibrated']}")
print(f"Edge over baseline (holdout balanced accuracy): {sel['edge_over_baseline']:+.3f}"
      f"  -> shows_edge = {sel['shows_edge']}")
reg = report["regression"]["holdout"]
print(f"Regression holdout MAE: {reg['mae']:.4f} vs predict-zero {reg['baseline_zero']['mae']:.4f}")
for w in meta["warnings"]:
    print("WARNING:", w)