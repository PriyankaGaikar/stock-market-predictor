UNIVERSE: list[tuple[str, str]] = [
    ("RELIANCE", "Reliance Industries"),
    ("TCS", "Tata Consultancy Services"),
    ("INFY", "Infosys"),
    ("HDFCBANK", "HDFC Bank"),
    ("ICICIBANK", "ICICI Bank"),
    ("SBIN", "State Bank of India"),
    ("BHARTIARTL", "Bharti Airtel"),
    ("ITC", "ITC Limited"),
    ("LT", "Larsen & Toubro"),
    ("KOTAKBANK", "Kotak Mahindra Bank"),
    ("AXISBANK", "Axis Bank"),
    ("HINDUNILVR", "Hindustan Unilever"),
    ("WIPRO", "Wipro"),
    ("HCLTECH", "HCL Technologies"),
    ("MARUTI", "Maruti Suzuki India"),
    ("SUNPHARMA", "Sun Pharmaceutical Industries"),
    ("BAJFINANCE", "Bajaj Finance"),
    ("ASIANPAINT", "Asian Paints"),
    ("TITAN", "Titan Company"),
    ("NTPC", "NTPC"),
    ("ONGC", "Oil and Natural Gas Corporation"),
    ("POWERGRID", "Power Grid Corporation of India"),
    ("ULTRACEMCO", "UltraTech Cement"),
    ("ADANIENT", "Adani Enterprises"),
]


def find_instruments(query: str, limit: int = 10) -> list[tuple[str, str]]:
    q = query.strip().lower()
    if not q:
        return []
    matches = [(s, n) for s, n in UNIVERSE if q in s.lower() or q in n.lower()]

    def rank(item: tuple[str, str]) -> tuple[int, str]:
        s = item[0].lower()
        return (0 if s == q else 1 if s.startswith(q) else 2, s)

    return sorted(matches, key=rank)[:limit]