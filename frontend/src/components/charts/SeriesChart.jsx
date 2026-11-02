import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "../../utils/chartHelpers";
import { fmtAxisDate, fmtDate } from "../../utils/format";

// A general-purpose single-series chart (used for RSI, volatility and drawdown).
export default function SeriesChart({
  data,
  dataKey,
  name,
  colorKey = "accent",
  unit = "",
  digits = 1,
  domain = ["auto", "auto"],
  ticks,
  type = "line",
  refLines = [],
  refAreas = [],
  ariaLabel,
}) {
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");
  const color = c[colorKey] ?? c.accent;
  const fmt = (v) => (v == null ? "—" : `${Number(v).toFixed(digits)}${unit}`);

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const row = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs tabular-nums shadow dark:border-slate-700 dark:bg-slate-900">
        <p className="font-medium">{fmtDate(row.timestamp)}</p>
        <p>
          {name}: {fmt(row[dataKey])}
        </p>
      </div>
    );
  };

  return (
    <div className="h-56 w-full" role="img" aria-label={ariaLabel ?? name}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          {refAreas.map((a, i) => (
            <ReferenceArea key={i} y1={a.y1} y2={a.y2} fill={c[a.colorKey ?? "band"]} fillOpacity={0.15} />
          ))}
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmtAxisDate}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            minTickGap={32}
          />
          <YAxis
            domain={domain}
            ticks={ticks}
            tickFormatter={(v) => `${Number(v).toFixed(0)}${unit}`}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            width={56}
          />
          <Tooltip content={tooltip} />
          <Legend verticalAlign="top" height={28} />
          {refLines.map((r, i) => (
            <ReferenceLine
              key={i}
              y={r.y}
              stroke={c.ref}
              strokeDasharray="4 4"
              label={{ value: r.label, position: "insideTopRight", fill: c.axis, fontSize: 11 }}
            />
          ))}
          {type === "area" ? (
            <Area
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              fill={color}
              fillOpacity={0.2}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          ) : (
            <Line
              type="monotone"
              dataKey={dataKey}
              name={name}
              stroke={color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}