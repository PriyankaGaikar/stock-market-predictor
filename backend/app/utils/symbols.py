import re

from app.utils.errors import InvalidRequestError

_SYMBOL_RE = re.compile(r"^[A-Z0-9&\-]{1,20}$")
_EXCHANGES = {"NSE", "BSE"}


def normalize_symbol(raw: str, exchange: str = "NSE") -> tuple[str, str]:
    """Return (SYMBOL, EXCHANGE). Accepts 'reliance', 'RELIANCE.NS', 'tcs.bo'."""
    symbol = raw.strip().upper()
    exchange = exchange.strip().upper()

    if symbol.endswith(".NS"):
        symbol, exchange = symbol[:-3], "NSE"
    elif symbol.endswith(".BO"):
        symbol, exchange = symbol[:-3], "BSE"

    if exchange not in _EXCHANGES:
        raise InvalidRequestError(f"Unsupported exchange '{exchange}'. Use NSE or BSE.")
    if not _SYMBOL_RE.match(symbol):
        raise InvalidRequestError(
            f"Invalid symbol '{raw}'. Use letters, digits, '&' or '-' (max 20 characters)."
        )
    return symbol, exchange