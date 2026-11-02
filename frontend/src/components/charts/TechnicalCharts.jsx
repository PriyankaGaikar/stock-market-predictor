import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "../../utils/chartHelpers";
import { fmtAxisDate, fmtDate, fmtPrice } from "../../utils/format";

function TipBox({ title, lines }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs tabular-nums shadow dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-medium">{title}</p>
      {lines.map((l) => (
        <p key={l}>{l}</p>
      ))}
    </div>
  );
}

const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 };

export function BollingerChart({ data }) {
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <TipBox
        title={fmtDate(d.timestamp)}
        lines={[
          `Close ₹${fmtPrice(d.close)}`,
          `Upper band ₹${fmtPrice(d.bb_upper)}`,
          `Middle (20-period average) ₹${fmtPrice(d.bb_mid)}`,
          `Lower band ₹${fmtPrice(d.bb_lower)}`,
        ]}
      />
    );
  };

  return (
    <div
      className="h-80 w-full"
      role="img"
      aria-label="Line chart of adjusted close with Bollinger upper, middle and lower bands"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={MARGIN}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={fmtAxisDate} stroke={c.axis} tick={{ fontSize: 12 }} minTickGap={32} />
          <YAxis
            domain={[(min) => Math.floor(min * 0.97), (max) => Math.ceil(max * 1.03)]}
            tickFormatter={(v) => fmtPrice(v)}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            width={72}
          />
          <Tooltip content={tooltip} />
          <Legend verticalAlign="top" height={28} />
          <Line dataKey="bb_upper" name="Upper band" stroke={c.band} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="bb_mid" name="Middle (SMA 20)" stroke={c.sma20} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="bb_lower" name="Lower band" stroke={c.band} strokeDasharray="5 4" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="close" name="Adjusted close" stroke={c.price} strokeWidth={2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MacdChart({ data }) {
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");

  const tooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const f = (v) => (v == null ? "—" : Number(v).toFixed(2));
    return (
      <TipBox
        title={fmtDate(d.timestamp)}
        lines={[`MACD line ${f(d.macd)}`, `Signal line ${f(d.macd_signal)}`, `Histogram ${f(d.macd_hist)}`]}
      />
    );
  };

  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label="MACD chart with MACD line, signal line and histogram bars"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={MARGIN}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={fmtAxisDate} stroke={c.axis} tick={{ fontSize: 12 }} minTickGap={32} />
          <YAxis tickFormatter={(v) => Number(v).toFixed(1)} stroke={c.axis} tick={{ fontSize: 12 }} width={56} />
          <Tooltip content={tooltip} />
          <Legend verticalAlign="top" height={28} />
          <ReferenceLine y={0} stroke={c.ref} />
          <Bar dataKey="macd_hist" name="Histogram" isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.timestamp} fill={d.macd_hist >= 0 ? c.up : c.down} fillOpacity={0.6} />
            ))}
          </Bar>
          <Line dataKey="macd" name="MACD line" stroke={c.ema12} strokeWidth={1.5} dot={false} isAnimationActive={false} />
          <Line dataKey="macd_signal" name="Signal line" stroke={c.sma20} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}