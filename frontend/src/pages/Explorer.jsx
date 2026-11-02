import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import Card from "../components/Card";
import CandlestickChart from "../components/charts/CandlestickChart";
import VolumeChart from "../components/charts/VolumeChart";
import DataFreshness from "../components/DataFreshness";
import ErrorBanner from "../components/ErrorBanner";
import Segmented from "../components/Segmented";
import Skeleton from "../components/Skeleton";
import Stat from "../components/Stat";
import { useStock } from "../context/StockContext";
import { useTheme } from "../context/ThemeContext";
import { useApi } from "../hooks/useApi";
import { getIndicators } from "../services/api";
import { chartColors } from "../utils/chartHelpers";
import { fmtInt, fmtNum, fmtPct, fmtPrice } from "../utils/format";

const LOOKBACKS = [
  { value: 90, label: "3M" },
  { value: 180, label: "6M" },
  { value: 365, label: "1Y" },
  { value: 730, label: "2Y" },
  { value: 1825, label: "5Y" },
];
const INTERVALS = [
  { value: "1d", label: "Daily" },
  { value: "1wk", label: "Weekly" },
];
const CHART_TYPES = [
  { value: "candles", label: "Candles" },
  { value: "line", label: "Line" },
];

export default function Explorer() {
  const { stock } = useStock();
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");

  const [lookback, setLookback] = useState(365);
  const [interval, setIntervalValue] = useState("1d");
  const [mode, setMode] = useState("candles");
  const [active, setActive] = useState({ sma_20: true, sma_50: true, ema_12: false, ema_26: false });

  // Weekly candles need at least ~30 weeks of history, so use at least 1 year.
  const effectiveDays = interval === "1wk" ? Math.max(lookback, 365) : lookback;

  const ind = useApi(
    (signal) =>
      getIndicators(stock.symbol, { lookbackDays: effectiveDays, interval, exchange: stock.exchange }, signal),
    [stock.symbol, stock.exchange, effectiveDays, interval],
  );

  const overlayDefs = [
    { key: "sma_20", name: "SMA 20", color: c.sma20 },
    { key: "sma_50", name: "SMA 50", color: c.sma50 },
    { key: "ema_12", name: "EMA 12", color: c.ema12 },
    { key: "ema_26", name: "EMA 26", color: c.ema26 },
  ];
  const overlays = overlayDefs.filter((o) => active[o.key]);

  const rows = useMemo(
    () =>
      (ind.data?.series ?? [])
        .filter((p) => p.open != null && p.high != null && p.low != null && p.close != null)
        .map((p) => ({ ...p, range: [p.low, p.high] })),
    [ind.data],
  );

  const summary = ind.data?.summary;
  const rs = summary?.returns_stats;
  const unit = interval === "1wk" ? "week" : "day";
  const periodHigh = rows.length ? Math.max(...rows.map((r) => r.high)) : null;
  const periodLow = rows.length ? Math.min(...rows.map((r) => r.low)) : null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Stock Explorer{" "}
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              {stock.symbol} · {stock.exchange}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Prices in ₹, adjusted for splits and dividends.
          </p>
        </div>
        <button
          onClick={ind.reload}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Refresh
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented label="Lookback period" options={LOOKBACKS} value={lookback} onChange={setLookback} />
        <Segmented label="Candle interval" options={INTERVALS} value={interval} onChange={setIntervalValue} />
        <Segmented label="Chart type" options={CHART_TYPES} value={mode} onChange={setMode} />
      </div>
      {interval === "1wk" && lookback < 365 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Weekly view needs more history, so it uses at least 1 year.
        </p>
      )}

      {ind.error && <ErrorBanner error={ind.error} onRetry={ind.reload} />}

      <Card title="Price chart">
        {ind.loading ? (
          <Skeleton className="h-80 w-full" />
        ) : rows.length === 0 ? (
          !ind.error && <p className="py-16 text-center text-sm text-slate-500">No price data to show.</p>
        ) : (
          <>
            <fieldset className="mb-3 flex flex-wrap items-center gap-4 text-sm">
              <legend className="sr-only">Moving-average overlays</legend>
              {overlayDefs.map((o) => (
                <label key={o.key} className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!active[o.key]}
                    onChange={() => setActive((a) => ({ ...a, [o.key]: !a[o.key] }))}
                    className="h-4 w-4 accent-indigo-600"
                  />
                  <span
                    className="inline-block w-5 rounded"
                    style={{ backgroundColor: o.color, height: 3 }}
                    aria-hidden="true"
                  />
                  {o.name}
                </label>
              ))}
            </fieldset>
            <CandlestickChart data={rows} mode={mode} overlays={overlays} />
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {mode === "candles" && "Green candle: closed above its open. Red candle: closed below its open. "}
              Moving averages start later on the chart because they need that many periods of history first. SMA
              is a plain average; EMA gives recent prices more weight.
            </p>
          </>
        )}
      </Card>

      <Card title="Volume (shares traded)">
        {ind.loading ? <Skeleton className="h-48 w-full" /> : rows.length > 0 && <VolumeChart data={rows} />}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Stock statistics">
          {ind.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : summary ? (
            <dl>
              <Stat label="Latest close" value={`₹${fmtPrice(summary.latest_close)}`} />
              <Stat label="Period high" value={`₹${fmtPrice(periodHigh)}`} />
              <Stat label="Period low" value={`₹${fmtPrice(periodLow)}`} />
              <Stat label={`Return over ${ind.data.count} periods`} value={fmtPct(summary.period_return_pct)} />
              <Stat label="Maximum drawdown" value={fmtPct(summary.max_drawdown_pct)} />
            </dl>
          ) : null}
        </Card>

        <Card title="Volatility and returns">
          {ind.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : rs ? (
            <dl>
              <Stat label="Annualized volatility" value={fmtPct(summary.annualized_volatility_pct)} />
              <Stat label={`Average ${unit}ly return`} value={fmtPct(rs.mean_pct, 3)} />
              <Stat label={`Std. deviation per ${unit}`} value={fmtPct(rs.std_pct, 3)} />
              <Stat label={`Best ${unit}`} value={fmtPct(rs.best_day_pct)} />
              <Stat label={`Worst ${unit}`} value={fmtPct(rs.worst_day_pct)} />
            </dl>
          ) : null}
        </Card>

        <Card title="Volume and data">
          {ind.loading ? (
            <Skeleton className="h-40 w-full" />
          ) : summary ? (
            <>
              <dl>
                <Stat label="Average volume" value={fmtInt(summary.avg_volume)} />
                <Stat
                  label="Latest vs average"
                  value={summary.latest_volume_vs_avg != null ? `${fmtNum(summary.latest_volume_vs_avg)}×` : "—"}
                />
                <Stat label="Candles loaded" value={fmtInt(ind.data.count)} />
              </dl>
              <div className="mt-4">
                <DataFreshness title="Data" data={ind.data} asOf={ind.data.last_timestamp} />
              </div>
            </>
          ) : null}
        </Card>
      </div>
    </div>
  );
}