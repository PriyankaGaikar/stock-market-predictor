import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Clock,
  IndianRupee,
  Layers,
  Pause,
  Play,
  Radio,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import Card from "../components/Card";
import DataFreshness from "../components/DataFreshness";
import ErrorBanner from "../components/ErrorBanner";
import KpiCard from "../components/KpiCard";
import PriceChart from "../components/PriceChart";
import Skeleton from "../components/Skeleton";
import { useStock } from "../context/StockContext";
import { useApi } from "../hooks/useApi";
import { getHealth, getHistory, getIndicators, getQuote } from "../services/api";
import { fmtDateTime, fmtInt, fmtNum, fmtPct, fmtPrice } from "../utils/format";

const RANGES = [
  { key: "1D", label: "1D" },
  { key: "1M", label: "1M", points: 21 },
  { key: "3M", label: "3M", points: 63 },
  { key: "6M", label: "6M", points: 126 },
  { key: "1Y", label: "1Y", points: null },
];

const INTERVAL_OPTIONS = [
  { value: 10, label: "10s" },
  { value: 15, label: "15s" },
  { value: 30, label: "30s" },
  { value: 60, label: "60s" },
];

const TREND = {
  upward: {
    text: "Upward-leaning",
    icon: TrendingUp,
    cls: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800",
  },
  downward: {
    text: "Downward-leaning",
    icon: TrendingDown,
    cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200 border border-red-300 dark:border-red-800",
  },
  mixed: {
    text: "Mixed signals",
    icon: Activity,
    cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200 border border-amber-300 dark:border-amber-800",
  },
  insufficient_data: {
    text: "Not enough data",
    icon: Activity,
    cls: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  },
};

function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export default function Home() {
  const { stock } = useStock();
  const { symbol, exchange } = stock;
  const [range, setRange] = useState("3M");

  // Auto-refresh states (active by default!)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [intervalSec, setIntervalSec] = useState(15);
  const [now, setNow] = useState(Date.now());

  // Polling interval in ms
  const pollMs = autoRefresh ? intervalSec * 1000 : 0;

  // Use enhanced useApi with background auto-polling
  const health = useApi((signal) => getHealth(signal), [], { pollInterval: pollMs > 0 ? pollMs * 2 : 0 });
  const quote = useApi((signal) => getQuote(symbol, exchange, signal), [symbol, exchange], {
    pollInterval: pollMs,
  });
  const ind = useApi(
    (signal) => getIndicators(symbol, { lookbackDays: 365, exchange }, signal),
    [symbol, exchange],
    { pollInterval: pollMs },
  );
  const intraday = useApi(
    (signal) => getHistory(symbol, { lookbackDays: 5, interval: "5m", exchange }, signal),
    [symbol, exchange],
    { pollInterval: pollMs, enabled: range === "1D" },
  );

  // Local 1-second ticker to update "seconds ago" and countdown timer
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const chartData = useMemo(() => {
    if (range === "1D") {
      const candles = intraday.data?.candles ?? [];
      if (!candles.length) return [];
      const latestDate = String(candles[candles.length - 1].timestamp).slice(0, 10);
      return candles
        .filter((c) => String(c.timestamp).slice(0, 10) === latestDate)
        .map((c) => ({ timestamp: c.timestamp, close: c.close }));
    }

    if (!ind.data) return [];
    const all = ind.data.series.map((p) => ({ timestamp: p.timestamp, close: p.close }));
    const points = RANGES.find((r) => r.key === range)?.points;
    return points ? all.slice(-points) : all;
  }, [range, intraday.data, ind.data]);

  const isRefreshing = quote.isRefreshing || ind.isRefreshing || (range === "1D" && intraday.isRefreshing);
  const isChartLoading =
    range === "1D"
      ? intraday.loading || (!intraday.data && !intraday.error)
      : ind.loading || (!ind.data && !ind.error);
  const chartError = range === "1D" ? intraday.error : ind.error;

  const refresh = () => {
    health.reload();
    quote.reload();
    ind.reload();
    if (range === "1D") intraday.reload();
  };

  const q = quote.data;
  const diff = q && q.previous_close != null ? q.price - q.previous_close : null;
  const tone = q?.change_pct > 0 ? "up" : q?.change_pct < 0 ? "down" : "neutral";
  const positive =
    chartData.length > 1 && chartData[0]?.close != null && chartData[chartData.length - 1]?.close != null
      ? chartData[chartData.length - 1].close >= chartData[0].close
      : true;
  const summary = ind.data?.summary;
  const trend = summary ? TREND[summary.trend_label] : null;

  // Compute time since last quote update & countdown
  const lastUpdated = quote.lastUpdated;
  const secondsAgo = lastUpdated ? Math.max(0, Math.floor((now - lastUpdated.getTime()) / 1000)) : null;
  const nextUpdateIn = autoRefresh && secondsAgo != null ? Math.max(0, intervalSec - (secondsAgo % intervalSec)) : null;

  return (
    <div className="space-y-6">
      {/* Top Header with Live Controls */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">
              {symbol} <span className="text-base font-normal text-slate-500 dark:text-slate-400">{exchange}</span>
            </h1>

            {/* Live Indicator Badge */}
            {autoRefresh ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                LIVE STREAM
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                PAUSED
              </span>
            )}
          </div>

          <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>Prices in ₹</span>
            {secondsAgo != null && (
              <>
                <span>•</span>
                <span>
                  Updated {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
                  {autoRefresh && nextUpdateIn != null && ` (next in ${nextUpdateIn}s)`}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Live Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Pause / Resume Live Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
              autoRefresh
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-sm hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {autoRefresh ? (
              <>
                <Pause className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Live: Auto-Updating
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 text-slate-500" />
                Resume Live Feed
              </>
            )}
          </button>

          {/* Interval Selector */}
          {autoRefresh && (
            <div
              className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900"
              role="group"
              aria-label="Live refresh interval"
            >
              {INTERVAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setIntervalSec(opt.value)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    intervalSec === opt.value
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Manual Refresh Button */}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-indigo-600" : ""}`} />
            {isRefreshing ? "Updating..." : "Refresh"}
          </button>
        </div>
      </header>

      {quote.error && <ErrorBanner error={quote.error} onRetry={quote.reload} />}

      {/* Top Cards: Status and Freshness */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Market-data status">
          {health.loading ? (
            <Skeleton className="h-20 w-full" />
          ) : health.error ? (
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
                API offline
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{health.error.message}</p>
            </div>
          ) : (
            <dl>
              <Stat
                label="API Status"
                value={
                  <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                    Online & Connected
                  </span>
                }
              />
              <Stat label="Data provider" value={health.data.data_provider} />
              <Stat label="Auto-polling" value={autoRefresh ? `Active (every ${intervalSec}s)` : "Paused"} />
              <Stat label="Server time" value={fmtDateTime(health.data.server_time_utc)} />
            </dl>
          )}
        </Card>

        <Card title="Data freshness & Live Status" className="lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <DataFreshness
              title="Latest quote"
              loading={quote.loading}
              data={q}
              asOf={q?.as_of}
            />
            <DataFreshness
              title="Chart and indicators"
              loading={ind.loading}
              data={ind.data}
              asOf={ind.data?.last_timestamp}
            />
          </div>
        </Card>
      </div>

      {/* Real-time KPI Cards (with subtle highlight animations on update) */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Last price"
          icon={IndianRupee}
          loading={quote.loading}
          highlightOnChange={true}
          value={q ? `₹${fmtPrice(q.price)}` : "—"}
          sub={q ? `Previous close ₹${fmtPrice(q.previous_close)}` : undefined}
        />
        <KpiCard
          label="Daily change"
          icon={tone === "down" ? TrendingDown : TrendingUp}
          tone={tone}
          loading={quote.loading}
          highlightOnChange={true}
          value={q ? fmtPct(q.change_pct) : "—"}
          sub={diff != null ? `${diff >= 0 ? "+" : "−"}₹${fmtPrice(Math.abs(diff))}` : undefined}
        />
        <KpiCard
          label="Day high"
          icon={ArrowUp}
          loading={quote.loading}
          highlightOnChange={true}
          value={q ? `₹${fmtPrice(q.day_high)}` : "—"}
        />
        <KpiCard
          label="Day low"
          icon={ArrowDown}
          loading={quote.loading}
          highlightOnChange={true}
          value={q ? `₹${fmtPrice(q.day_low)}` : "—"}
        />
        <KpiCard
          label="Volume"
          icon={Layers}
          loading={quote.loading}
          highlightOnChange={true}
          value={q ? fmtInt(q.volume) : "—"}
        />
      </div>

      {/* Dynamic Price Chart */}
      <Card
        title="Recent price chart"
        action={
          <div className="flex items-center gap-3">
            {isRefreshing && (
              <span className="flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400">
                <RefreshCw className="h-3 w-3 animate-spin" />
                Syncing...
              </span>
            )}
            <div className="flex gap-1" role="group" aria-label="Chart range">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    range === r.key
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  {r.key}
                </button>
              ))}
            </div>
          </div>
        }
      >
        {isChartLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : chartError ? (
          <ErrorBanner error={chartError} onRetry={range === "1D" ? intraday.reload : ind.reload} />
        ) : chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-500 dark:text-slate-400">
            {range === "1D" ? "No intraday session candles available for today yet." : "No price data to show."}
          </p>
        ) : (
          <>
            <PriceChart data={chartData} positive={positive} is1D={range === "1D"} />
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {range === "1D"
                  ? "5-minute intraday real-time prices for today's session"
                  : ind.data?.price_basis}
              </span>
              {autoRefresh && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Live chart feed active
                </span>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Live Market Trend Summary */}
      <Card
        title="Live Market Trend & Momentum"
        action={
          autoRefresh && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Trend Engine
            </span>
          )
        }
      >
        {ind.loading ? (
          <Skeleton className="h-32 w-full" />
        ) : ind.error ? (
          <ErrorBanner error={ind.error} onRetry={ind.reload} />
        ) : summary ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${trend.cls}`}>
                  <trend.icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {trend.text}
                </span>
                {isRefreshing && (
                  <span className="text-xs text-indigo-500 flex items-center gap-1">
                    <RefreshCw className="h-3 w-3 animate-spin" /> Evaluating...
                  </span>
                )}
              </div>
              <p className="font-medium text-slate-800 dark:text-slate-100">{summary.trend_summary}</p>
              <p className="text-slate-600 dark:text-slate-300">{summary.rsi_state}</p>
              <p className="text-slate-600 dark:text-slate-300">{summary.macd_state}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Live quantitative momentum gauges calculated on rolling windows. Descriptive past statistics, not financial advice.
              </p>
            </div>
            <dl>
              <Stat label={`Return over ${ind.data.count} sessions`} value={fmtPct(summary.period_return_pct)} />
              <Stat label="Annualized volatility" value={fmtPct(summary.annualized_volatility_pct)} />
              <Stat label="Maximum drawdown" value={fmtPct(summary.max_drawdown_pct)} />
              <Stat label="RSI (14)" value={fmtNum(summary.rsi_latest, 1)} />
              <Stat
                label="Latest volume vs average"
                value={summary.latest_volume_vs_avg != null ? `${fmtNum(summary.latest_volume_vs_avg)}×` : "—"}
              />
            </dl>
          </div>
        ) : null}
      </Card>
    </div>
  );
}