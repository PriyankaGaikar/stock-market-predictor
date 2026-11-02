import logging
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.ml import router as ml_router
from app.api.stocks import router as stocks_router
from app.config import get_settings
from app.utils.errors import MarketDataError

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("stock_api")

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "Educational stock analytics API. Predictions are uncertain model outputs, "
        "not financial advice and not guaranteed outcomes."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(stocks_router)
app.include_router(ml_router)


@app.exception_handler(MarketDataError)
async def market_data_error_handler(request: Request, exc: MarketDataError):
    logger.warning("%s on %s: %s", type(exc).__name__, request.url.path, exc.message)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"type": type(exc).__name__, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "type": "ValidationError",
                "message": "Invalid request parameters.",
                "details": jsonable_encoder(exc.errors()),
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={"error": {"type": "InternalServerError",
                           "message": "Unexpected server error. Check the server logs."}},
    )


@app.get("/", include_in_schema=False)
def root():
    return RedirectResponse("/docs")


@app.get("/api/health", tags=["system"])
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
        "data_provider": settings.data_provider,
        "demo_fallback_enabled": settings.allow_demo_fallback,
        "server_time_utc": datetime.now(timezone.utc).isoformat(),
    }