import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { chartColors, fmtCompact, tooltipStyle } from "../../utils/chartHelpers";
import { fmtAxisDate, fmtDate, fmtInt } from "../../utils/format";

export default function VolumeChart({ data }) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const c = chartColors(dark);

  return (
    <div
      className="h-48 w-full"
      role="img"
      aria-label="Bar chart of trading volume per period. Green bars are up periods, red bars are down periods."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmtAxisDate}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            minTickGap={32}
          />
          <YAxis tickFormatter={fmtCompact} stroke={c.axis} tick={{ fontSize: 12 }} width={72} />
          <Tooltip
            contentStyle={tooltipStyle(dark)}
            labelFormatter={(l) => fmtDate(l)}
            formatter={(v) => [fmtInt(v), "Volume (shares)"]}
            cursor={{ fill: c.grid, opacity: 0.4 }}
          />
          <Bar dataKey="volume" name="Volume" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.timestamp} fill={d.close >= d.open ? c.up : c.down} fillOpacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}