from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_market_service
from app.schemas.analysis import IndicatorsResponse
from app.schemas.market import HistoryResponse, Quote, SymbolInfo
from app.services.indicator_service import build_indicators_response
from app.services.market_service import MarketService

router = APIRouter(prefix="/api/stocks", tags=["stocks"])


@router.get("/search", response_model=list[SymbolInfo])
def search_stocks(
    q: str = Query(..., min_length=1, max_length=50, description="Symbol or company name"),
    service: MarketService = Depends(get_market_service),
):
    return service.search(q)


@router.get("/{symbol}/quote", response_model=Quote)
def get_quote(
    symbol: str,
    exchange: Literal["NSE", "BSE"] = "NSE",
    service: MarketService = Depends(get_market_service),
):
    return service.get_quote(symbol, exchange)


@router.get("/{symbol}/history", response_model=HistoryResponse)
def get_history(
    symbol: str,
    lookback_days: int = Query(365, ge=5, le=3650),
    interval: Literal["5m", "15m", "30m", "1h", "1d", "1wk"] = "1d",
    exchange: Literal["NSE", "BSE"] = "NSE",
    service: MarketService = Depends(get_market_service),
):
    return service.get_history(symbol, lookback_days, interval, exchange)


@router.get("/{symbol}/indicators", response_model=IndicatorsResponse)
def get_indicators(
    symbol: str,
    lookback_days: int = Query(365, ge=60, le=3650),
    interval: Literal["1d", "1wk"] = "1d",
    exchange: Literal["NSE", "BSE"] = "NSE",
    service: MarketService = Depends(get_market_service),
):
    """Technical indicators, summary stats, returns histogram and plain-language guide."""
    return build_indicators_response(service.get_history_frame(symbol, lookback_days, interval, exchange))