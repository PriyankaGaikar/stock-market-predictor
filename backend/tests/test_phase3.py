import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_market_service
from app.main import app
from app.providers.base import MarketDataProvider
from app.providers.demo_provider import DemoProvider
from app.providers.yfinance_provider import YFinanceProvider
from app.schemas.market import DataLabel
from app.services.market_service import MarketService
from app.utils.errors import InvalidRequestError, ProviderUnavailableError
from app.utils.symbols import normalize_symbol


@pytest.fixture()
def client():
    service = MarketService(DemoProvider(), quote_ttl=60, history_ttl=60)
    app.dependency_overrides[get_market_service] = lambda: service
    yield TestClient(app)
    app.dependency_overrides.clear()


class BrokenProvider(MarketDataProvider):
    name = "broken"

    def search(self, query):
        return []

    def get_quote(self, symbol, exchange="NSE"):
        raise ProviderUnavailableError("down")

    def get_history(self, symbol, lookback_days, interval="1d", exchange="NSE"):
        raise ProviderUnavailableError("down")


# ---- symbols ----------------------------------------------------------
def test_normalize_symbol_variants():
    assert normalize_symbol("reliance") == ("RELIANCE", "NSE")
    assert normalize_symbol("tcs.bo") == ("TCS", "BSE")
    assert normalize_symbol("infy.ns", "BSE") == ("INFY", "NSE")


@pytest.mark.parametrize("bad", ["BAD SYM", "", "A" * 30, "DROP;TABLE"])
def test_normalize_symbol_rejects_bad_input(bad):
    with pytest.raises(InvalidRequestError):
        normalize_symbol(bad)


# ---- data contract ----------------------------------------------------
def test_demo_history_meets_provider_contract():
    df = DemoProvider().get_history("RELIANCE", 365, "1d", "NSE")
    assert list(df.columns) == ["open", "high", "low", "close", "adj_close", "volume"]
    assert df.index.tz is not None
    assert df.index.is_monotonic_increasing
    assert not df.index.has_duplicates
    assert (df["high"] >= df[["open", "close"]].max(axis=1)).all()
    assert (df["low"] <= df[["open", "close"]].min(axis=1)).all()


def test_demo_history_is_deterministic():
    a = DemoProvider().get_history("TCS", 100, "1d", "NSE")
    b = DemoProvider().get_history("TCS", 100, "1d", "NSE")
    assert a.equals(b)


# ---- provider mapping (no network) -----------------------------------
def test_yfinance_symbol_mapping_and_validation():
    p = YFinanceProvider()
    assert p._ticker_symbol("RELIANCE", "NSE") == "RELIANCE.NS"
    assert p._ticker_symbol("RELIANCE", "BSE") == "RELIANCE.BO"
    with pytest.raises(InvalidRequestError):
        p.get_history("TCS", 100, "3m")
    with pytest.raises(InvalidRequestError):
        p.get_history("TCS", 200, "5m")  # beyond Yahoo's intraday window


# ---- service policy ---------------------------------------------------
def test_no_silent_fallback_by_default():
    with pytest.raises(ProviderUnavailableError):
        MarketService(BrokenProvider()).get_quote("TCS")


def test_explicit_fallback_is_loudly_labelled():
    quote = MarketService(BrokenProvider(), allow_fallback=True).get_quote("TCS")
    assert quote.label == DataLabel.DEMO
    assert "demo" in quote.note.lower()


# ---- API --------------------------------------------------------------
def test_quote_endpoint_and_cache_flag(client):
    first = client.get("/api/stocks/RELIANCE/quote").json()
    assert first["label"] == "demo" and first["provider"] == "demo"
    assert first["from_cache"] is False
    second = client.get("/api/stocks/RELIANCE/quote").json()
    assert second["from_cache"] is True


def test_history_endpoint_shape(client):
    body = client.get("/api/stocks/TCS/history?lookback_days=30").json()
    assert body["count"] == len(body["candles"]) > 0
    stamps = [c["timestamp"] for c in body["candles"]]
    assert stamps == sorted(stamps)
    assert body["label"] == "demo"


def test_search_endpoint(client):
    results = client.get("/api/stocks/search?q=tata").json()
    assert results and all("provider_symbol" in r for r in results)


def test_invalid_symbol_uses_consistent_error_shape(client):
    resp = client.get("/api/stocks/BAD%20SYM/quote")
    assert resp.status_code == 422
    assert resp.json()["error"]["type"] == "InvalidRequestError"


def test_invalid_interval_and_lookback_are_rejected(client):
    r1 = client.get("/api/stocks/TCS/history?interval=3m")
    r2 = client.get("/api/stocks/TCS/history?lookback_days=1")
    assert r1.status_code == r2.status_code == 422
    assert r1.json()["error"]["type"] == "ValidationError"


def test_demo_rejects_intraday(client):
    resp = client.get("/api/stocks/TCS/history?interval=5m&lookback_days=10")
    assert resp.status_code == 422