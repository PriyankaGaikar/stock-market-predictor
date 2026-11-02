import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.deps import get_market_service  # noqa: E402
from app.ml.predict import predict_for_symbol  # noqa: E402

p = argparse.ArgumentParser()
p.add_argument("--symbol", default="RELIANCE")
p.add_argument("--exchange", default="NSE")
p.add_argument("--horizon", type=int, default=5)
a = p.parse_args()

print(json.dumps(predict_for_symbol(get_market_service(), a.symbol, a.exchange, "1d", a.horizon), indent=2))