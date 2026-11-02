import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.providers.yfinance_provider import YFinanceProvider  # noqa: E402

provider = YFinanceProvider()

for sym in ["RELIANCE", "TCS"]:
    print(f"\n=== {sym} (NSE) ===")
    quote = provider.get_quote(sym, "NSE")
    print(quote.model_dump_json(indent=2))
    df = provider.get_history(sym, 30, "1d", "NSE")
    print(f"\nHistory rows: {len(df)}")
    print(df.tail(3))