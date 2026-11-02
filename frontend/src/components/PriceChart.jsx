import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../context/ThemeContext";
import { fmtAxisDate, fmtDate, fmtDateTime, fmtPrice, fmtTime } from "../utils/format";

function ChartTooltip({ active, payload, is1D }) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow dark:border-slate-700 dark:bg-slate-900">
      <p className="font-medium">{is1D ? fmtDateTime(p.timestamp) : fmtDate(p.timestamp)}</p>
      <p className="tabular-nums">Price: ₹{fmtPrice(p.close)}</p>
    </div>
  );
}

export default function PriceChart({ data = [], positive = true, is1D = false }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const line = positive ? (dark ? "#34d399" : "#059669") : dark ? "#f87171" : "#dc2626";
  const grid = dark ? "#1e293b" : "#e2e8f0";
  const axis = dark ? "#94a3b8" : "#64748b";

  if (!data || data.length === 0) {
    return (
      <div className="flex h-72 w-full items-center justify-center text-sm text-slate-500 dark:text-slate-400">
        No price data to show.
      </div>
    );
  }

  return (
    <div className="h-72 w-full" role="img" aria-label="Price area chart">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={line} stopOpacity={0.3} />
              <stop offset="100%" stopColor={line} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={is1D ? fmtTime : fmtAxisDate}
            stroke={axis}
            tick={{ fontSize: 12 }}
            minTickGap={32}
          />
          <YAxis
            domain={[
              (min) => (Number.isFinite(min) ? Math.floor(min * 0.99) : "auto"),
              (max) => (Number.isFinite(max) ? Math.ceil(max * 1.01) : "auto"),
            ]}
            tickFormatter={(v) => fmtPrice(v)}
            stroke={axis}
            tick={{ fontSize: 12 }}
            width={70}
          />
          <Tooltip content={(props) => <ChartTooltip {...props} is1D={is1D} />} />
          <Legend verticalAlign="top" height={28} />
          <Area
            type="monotone"
            dataKey="close"
            name={is1D ? "Intraday price (₹)" : "Adjusted close (₹)"}
            stroke={line}
            strokeWidth={2}
            fill="url(#priceFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}