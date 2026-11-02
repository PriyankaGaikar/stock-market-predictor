import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "../../utils/chartHelpers";
import { fmtAxisDate, fmtDate, fmtInt, fmtPrice } from "../../utils/format";

// Draws one candle: a thin wick from low to high, and a box from open to close.
function CandleShape(props) {
  const { x, y, width, height, upColor, downColor } = props;
  const d = props.payload && props.payload.open != null ? props.payload : props;
  const { open, high, low, close } = d;
  if (open == null || high == null || low == null || close == null) return null;

  const color = close >= open ? upColor : downColor;
  const top = Math.min(y, y + height);
  const h = Math.abs(height);
  const range = high - low;
  const cx = x + width / 2;

  if (!(range > 0) || !(h > 0)) {
    return <line x1={x} x2={x + width} y1={top} y2={top} stroke={color} strokeWidth={1.5} />;
  }
  const scale = h / range; // pixels per rupee
  const yOpen = top + (high - open) * scale;
  const yClose = top + (high - close) * scale;
  const bodyTop = Math.min(yOpen, yClose);
  const bodyH = Math.max(Math.abs(yOpen - yClose), 1);
  const bodyW = Math.max(width * 0.7, 1);

  return (
    <g>
      <line x1={cx} x2={cx} y1={top} y2={top + h} stroke={color} strokeWidth={1} />
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} stroke={color} />
    </g>
  );
}

function PriceTooltip({ active, payload, overlays }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs tabular-nums shadow dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-medium">{fmtDate(d.timestamp)}</p>
      <p>
        Open ₹{fmtPrice(d.open)} · High ₹{fmtPrice(d.high)}
      </p>
      <p>
        Low ₹{fmtPrice(d.low)} · Close ₹{fmtPrice(d.close)}
      </p>
      <p>Volume {fmtInt(d.volume)}</p>
      {overlays.map(
        (o) =>
          d[o.key] != null && (
            <p key={o.key} style={{ color: o.color }}>
              {o.name}: ₹{fmtPrice(d[o.key])}
            </p>
          ),
      )}
    </div>
  );
}

export default function CandlestickChart({ data, mode = "candles", overlays = [] }) {
  const { theme } = useTheme();
  const c = chartColors(theme === "dark");

  return (
    <div
      className="h-80 w-full"
      role="img"
      aria-label="Price chart with open, high, low and close, plus optional moving averages"
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="timestamp"
            tickFormatter={fmtAxisDate}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            minTickGap={32}
          />
          <YAxis
            domain={[(min) => Math.floor(min * 0.98), (max) => Math.ceil(max * 1.02)]}
            tickFormatter={(v) => fmtPrice(v)}
            stroke={c.axis}
            tick={{ fontSize: 12 }}
            width={72}
          />
          <Tooltip content={<PriceTooltip overlays={overlays} />} />
          {mode === "candles" ? (
            <Bar
              dataKey="range"
              isAnimationActive={false}
              shape={(p) => <CandleShape {...p} upColor={c.up} downColor={c.down} />}
            />
          ) : (
            <Line
              type="monotone"
              dataKey="close"
              name="Adjusted close"
              stroke={c.price}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          )}
          {overlays.map((o) => (
            <Line
              key={o.key}
              type="monotone"
              dataKey={o.key}
              name={o.name}
              stroke={o.color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}