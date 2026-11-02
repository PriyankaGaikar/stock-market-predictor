import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import Card from "../components/Card";
import ReturnsHistogram from "../components/charts/ReturnsHistogram";
import SeriesChart from "../components/charts/SeriesChart";
import { BollingerChart, MacdChart } from "../components/charts/TechnicalCharts";
import DataFreshness from "../components/DataFreshness";
import ErrorBanner from "../components/ErrorBanner";
import Segmented from "../components/Segmented";
import Skeleton from "../components/Skeleton";
import Stat from "../components/Stat";
import { useStock } from "../context/StockContext";
import { useApi } from "../hooks/useApi";
import { getIndicators } from "../services/api";
import { fmtNum, fmtPct, fmtPrice } from "../utils/format";

const LOOKBACKS = [
  { value: 90, label: "3M" },
  { value: 180, label: "6M" },
  { value: 365, label: "1Y" },
  { value: 730, label: "2Y" },
];

function bandPosition(p) {
  if (p == null) return "—";
  if (p > 1) return "Above the upper band";
  if (p < 0) return "Below the lower band";
  return `${Math.round(p * 100)}% of the way from lower to upper band`;
}

function ChartCard({ title, caption, loading, skeletonClass, children }) {
  return (
    <Card title={title}>
      {loading ? <Skeleton className={`${skeletonClass} w-full`} /> : children}
      {caption && !loading && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{caption}</p>}
    </Card>
  );
}

export default function Technical() {
  const { stock } = useStock();
  const [lookback, setLookback] = useState(365);

  const ind = useApi(
    (signal) => getIndicators(stock.symbol, { lookbackDays: lookback, exchange: stock.exchange }, signal),
    [stock.symbol, stock.exchange, lookback],
  );

  const rows = useMemo(
    () =>
      (ind.data?.series ?? []).map((p) => ({
        ...p,
        vol_pct: p.volatility_20 != null ? p.volatility_20 * 100 : null,
        dd_pct: p.drawdown != null ? p.drawdown * 100 : null,
      })),
    [ind.data],
  );

  const summary = ind.data?.summary;
  const rs = summary?.returns_stats;
  const last = rows.length ? rows[rows.length - 1] : null;
  const atrPct = last?.atr_14 != null && last.close ? (last.atr_14 / last.close) * 100 : null;
  const loading = ind.loading;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Technical Analysis{" "}
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              {stock.symbol} · {stock.exchange}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gauges describing the past. None of them predicts the future.
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

      <Segmented label="Lookback period" options={LOOKBACKS} value={lookback} onChange={setLookback} />

      {ind.error && <ErrorBanner error={ind.error} onRetry={ind.reload} />}

      {!ind.error && (
        <>
          <Card title="Current readings, in plain words">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : summary && last ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ul className="list-disc space-y-2 pl-5 text-sm">
                  <li>{summary.trend_summary}</li>
                  <li>{summary.rsi_state}</li>
                  <li>{summary.macd_state}</li>
                  <li className="list-none pl-0 text-xs text-slate-500 dark:text-slate-400">
                    These describe what already happened. They are not predictions or advice.
                  </li>
                </ul>
                <dl>
                  <Stat label="RSI (14)" value={fmtNum(summary.rsi_latest, 1)} />
                  <Stat label="MACD histogram" value={fmtNum(last.macd_hist, 2)} />
                  <Stat label="Position in Bollinger Bands" value={bandPosition(last.bb_pct_b)} />
                  <Stat
                    label="ATR (14)"
                    value={
                      last.atr_14 != null ? `₹${fmtPrice(last.atr_14)} (${fmtNum(atrPct)}% of price)` : "—"
                    }
                  />
                  <Stat label="Volatility (20, annualized)" value={fmtPct(last.vol_pct)} />
                  <Stat label="Current drawdown" value={fmtPct(last.dd_pct)} />
                  <Stat label="Maximum drawdown" value={fmtPct(summary.max_drawdown_pct)} />
                </dl>
              </div>
            ) : null}
          </Card>

          <ChartCard
            title="Bollinger Bands"
            loading={loading}
            skeletonClass="h-80"
            caption="The bands sit two standard deviations either side of the 20-period average. They widen when prices are jumpy and narrow when calm. Touching a band is not a signal by itself."
          >
            {rows.length > 0 && <BollingerChart data={rows} />}
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="RSI (14)"
              loading={loading}
              skeletonClass="h-56"
              caption="Shaded zones mark 70+ ('overbought') and 30 or below ('oversold'). In strong trends RSI can stay in a zone for weeks."
            >
              {rows.length > 0 && (
                <SeriesChart
                  data={rows}
                  dataKey="rsi_14"
                  name="RSI (14)"
                  colorKey="accent"
                  digits={1}
                  domain={[0, 100]}
                  ticks={[0, 30, 50, 70, 100]}
                  refLines={[
                    { y: 70, label: "70" },
                    { y: 30, label: "30" },
                  ]}
                  refAreas={[
                    { y1: 70, y2: 100 },
                    { y1: 0, y2: 30 },
                  ]}
                />
              )}
            </ChartCard>

            <ChartCard
              title="MACD (12, 26, 9)"
              loading={loading}
              skeletonClass="h-56"
              caption="Bars show the gap between the MACD line and its signal line: green above zero, red below. A widening gap means momentum is growing."
            >
              {rows.length > 0 && <MacdChart data={rows} />}
            </ChartCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard
              title="Rolling volatility (20 periods, annualized)"
              loading={loading}
              skeletonClass="h-56"
              caption="How bumpy the ride has been, expressed as a yearly percentage. Calm stretches can end suddenly."
            >
              {rows.length > 0 && (
                <SeriesChart
                  data={rows}
                  dataKey="vol_pct"
                  name="Volatility"
                  colorKey="sma50"
                  unit="%"
                  digits={1}
                  domain={[0, "auto"]}
                />
              )}
            </ChartCard>

            <ChartCard
              title="Drawdown from the running high"
              loading={loading}
              skeletonClass="h-56"
              caption="How far the price sits below its highest point so far in this window. 0% means at a new high."
            >
              {rows.length > 0 && (
                <SeriesChart
                  data={rows}
                  dataKey="dd_pct"
                  name="Drawdown"
                  colorKey="down"
                  unit="%"
                  digits={1}
                  type="area"
                  domain={[(min) => Math.floor(min - 1), 0]}
                />
              )}
            </ChartCard>
          </div>

          <Card title="Returns distribution (daily % change)">
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : ind.data && rs ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ReturnsHistogram bins={ind.data.returns_histogram} />
                <div>
                  <dl>
                    <Stat label="Average daily return" value={fmtPct(rs.mean_pct, 3)} />
                    <Stat label="Standard deviation" value={fmtPct(rs.std_pct, 3)} />
                    <Stat label="Best day" value={fmtPct(rs.best_day_pct)} />
                    <Stat label="Worst day" value={fmtPct(rs.worst_day_pct)} />
                    <Stat label="Skew" value={fmtNum(rs.skew, 2)} />
                    <Stat label="Excess kurtosis" value={fmtNum(rs.excess_kurtosis, 2)} />
                  </dl>
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Skew below 0 means the big moves have tended to be drops; above 0, rises. Excess kurtosis above
                    0 means more extreme days than a bell curve would predict. Past extremes do not set a limit on
                    future ones.
                  </p>
                </div>
              </div>
            ) : null}
          </Card>

          {ind.data && (
            <Card title="Indicator guide: what each one means and where it fails">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(ind.data.guide).map(([key, g]) => (
                  <details key={key} className="py-2">
                    <summary className="cursor-pointer text-sm font-medium">{g.name}</summary>
                    <p className="mt-2 text-sm">
                      <span className="font-medium">What it is: </span>
                      {g.what}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">Limitation: </span>
                      {g.limitation}
                    </p>
                  </details>
                ))}
              </div>
            </Card>
          )}

          <Card title="Data">
            <DataFreshness title="Indicators" loading={loading} data={ind.data} asOf={ind.data?.last_timestamp} />
            {ind.data && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{ind.data.price_basis}</p>}
          </Card>
        </>
      )}
    </div>
  );
}