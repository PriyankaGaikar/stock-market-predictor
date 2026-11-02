class MarketDataError(Exception):
    """Base class for all market-data problems."""

    status_code = 502

    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidRequestError(MarketDataError):
    status_code = 422


class SymbolNotFoundError(MarketDataError):
    status_code = 404


class InsufficientDataError(MarketDataError):
    status_code = 422


class RateLimitedError(MarketDataError):
    status_code = 429


class ProviderUnavailableError(MarketDataError):
    status_code = 503

class ModelNotFoundError(MarketDataError):
    status_code = 404

class TrainingInProgressError(MarketDataError):
    status_code = 409