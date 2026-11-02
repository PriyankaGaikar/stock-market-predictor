import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useStock } from "../context/StockContext";
import { searchStocks } from "../services/api";

function parseTyped(text, fallbackExchange) {
  let symbol = text.trim().toUpperCase();
  let exchange = fallbackExchange;
  if (symbol.endsWith(".NS")) {
    symbol = symbol.slice(0, -3);
    exchange = "NSE";
  } else if (symbol.endsWith(".BO")) {
    symbol = symbol.slice(0, -3);
    exchange = "BSE";
  }
  return { symbol, exchange };
}

export default function StockSearch() {
  const { stock, setStock } = useStock();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const boxRef = useRef(null);

  // Wait 300 ms after typing stops, then search (cancelling any older request).
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchStocks(q, controller.signal)
        .then((r) => {
          setResults(r);
          setSearchError(null);
        })
        .catch((e) => {
          if (!e.canceled) setSearchError(e.message);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function choose(symbol, exchange) {
    setStock({ symbol, exchange });
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function onKeyDown(e) {
    if (e.key === "Escape") setOpen(false);
    if (e.key === "Enter" && query.trim()) {
      const typed = parseTyped(query, stock.exchange);
      choose(typed.symbol, typed.exchange);
    }
  }

  const typed = query.trim() ? parseTyped(query, stock.exchange) : null;

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <label htmlFor="stock-search" className="sr-only">
        Search stocks by symbol or company name
      </label>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        id="stock-search"
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search symbol or company (e.g. TCS)"
        autoComplete="off"
        className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-900"
      />

      {open && typed && (
        <ul
          className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
          aria-label="Search results"
        >
          <li>
            <button
              onClick={() => choose(typed.symbol, typed.exchange)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Use “{typed.symbol}” on {typed.exchange} directly{" "}
              <span className="text-xs text-slate-500">(Enter)</span>
            </button>
          </li>
          {results.map((r) => (
            <li key={`${r.exchange}:${r.symbol}`}>
              <button
                onClick={() => choose(r.symbol, r.exchange)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <span>
                  <span className="font-medium">{r.symbol}</span>
                  <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{r.name}</span>
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{r.exchange}</span>
              </button>
            </li>
          ))}
          {searchError && <li className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{searchError}</li>}
        </ul>
      )}
    </div>
  );
}