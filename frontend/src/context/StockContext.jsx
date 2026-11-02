import { createContext, useContext, useEffect, useMemo, useState } from "react";

const StockContext = createContext(null);
const DEFAULT_STOCK = { symbol: "RELIANCE", exchange: "NSE" };

function initialStock() {
  try {
    const saved = JSON.parse(localStorage.getItem("stock"));
    if (saved?.symbol && (saved.exchange === "NSE" || saved.exchange === "BSE")) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_STOCK;
}

export function StockProvider({ children }) {
  const [stock, setStock] = useState(initialStock);

  useEffect(() => {
    try {
      localStorage.setItem("stock", JSON.stringify(stock));
    } catch {
      /* ignore */
    }
  }, [stock]);

  const value = useMemo(() => ({ stock, setStock }), [stock]);
  return <StockContext.Provider value={value}>{children}</StockContext.Provider>;
}

export function useStock() {
  const ctx = useContext(StockContext);
  if (!ctx) throw new Error("useStock must be used inside <StockProvider>");
  return ctx;
}