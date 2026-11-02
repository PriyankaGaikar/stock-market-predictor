export function chartColors(dark) {
  return {
    grid: dark ? "#1e293b" : "#e2e8f0",
    axis: dark ? "#94a3b8" : "#64748b",
    up: dark ? "#34d399" : "#059669",
    down: dark ? "#f87171" : "#dc2626",
    price: dark ? "#e2e8f0" : "#0f172a",
    sma20: dark ? "#fbbf24" : "#d97706",
    sma50: dark ? "#a78bfa" : "#7c3aed",
    ema12: dark ? "#38bdf8" : "#0284c7",
    ema26: dark ? "#f472b6" : "#db2777",
    accent: dark ? "#818cf8" : "#4f46e5",
    band: dark ? "#64748b" : "#94a3b8",
    ref: dark ? "#94a3b8" : "#64748b",
  };
}

export function tooltipStyle(dark) {
  return {
    background: dark ? "#0f172a" : "#ffffff",
    border: `1px solid ${dark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 8,
    fontSize: 12,
    color: dark ? "#e2e8f0" : "#0f172a",
  };
}

// Indian-style compact numbers: 1.25 Cr (crore), 3.40 L (lakh)
export function fmtCompact(v) {
  if (v == null || Number.isNaN(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1e7) return `${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${(v / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)} K`;
  return v.toFixed(0);
}