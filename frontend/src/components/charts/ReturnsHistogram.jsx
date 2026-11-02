import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "../../utils/chartHelpers";

export default function ReturnsHistogram({ bins }) {
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");
  const data = bins.map((b) => ({
    mid: (b.bin_start + b.bin_end) / 2,
    start: b.bin_start,
    end: b.bin_end,
    count: b.count,
  }));

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs tabular-nums shadow dark:border-slate-700 dark:bg-slate-900">
        <p className="font-medium">
          {d.start.toFixed(2)}% to {d.end.toFixed(2)}%
        </p>
        <p>{d.count} periods</p>
      </div>
    );
  };

  return (
    <div
      className="h-64 w-full"
      role="img"
      aria-label="Histogram of daily percentage returns. Green bars are gains, red bars are losses."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="mid"
            tickFormatter={(v) => `${Number(v).toFixed(1)}%`}
            stroke={c.axis}
            tick={{ fontSize: 11 }}
            interval={2}
            label={{ value: "Daily return", position: "insideBottom", offset: -8, fill: c.axis, fontSize: 12 }}
          />
          <YAxis
            allowDecimals={false}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            width={40}
            label={{ value: "Count", angle: -90, position: "insideLeft", fill: c.axis, fontSize: 12 }}
          />
          <Tooltip content={tooltip} cursor={{ fill: c.grid, opacity: 0.4 }} />
          <Bar dataKey="count" name="Number of periods" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.start} fill={d.mid >= 0 ? c.up : c.down} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}