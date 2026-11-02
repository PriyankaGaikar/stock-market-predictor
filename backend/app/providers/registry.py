from app.providers.base import MarketDataProvider
from app.providers.demo_provider import DemoProvider
from app.providers.yfinance_provider import YFinanceProvider


def build_provider(name: str) -> MarketDataProvider:
    name = name.strip().lower()
    if name == "yfinance":
        return YFinanceProvider()
    if name == "demo":
        return DemoProvider()
    raise ValueError(f"Unknown DATA_PROVIDER '{name}'. Supported: yfinance, demo")