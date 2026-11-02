import { useEffect, useRef, useState } from "react";
import Skeleton from "./Skeleton";

const TONES = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  neutral: "text-slate-900 dark:text-slate-100",
};

export default function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
  loading = false,
  highlightOnChange = false,
}) {
  const [flash, setFlash] = useState(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (highlightOnChange && prevValue.current != null && value !== prevValue.current && !loading && value !== "—") {
      setFlash(tone === "down" ? "down" : "up");
      const timer = setTimeout(() => setFlash(null), 1200);
      return () => clearTimeout(timer);
    }
    prevValue.current = value;
  }, [value, highlightOnChange, loading, tone]);

  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm transition-all duration-500 dark:bg-slate-900 ${
        flash === "up"
          ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-950/30"
          : flash === "down"
          ? "border-red-400 bg-red-50/60 dark:border-red-600 dark:bg-red-950/30"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
        <span>{label}</span>
        {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-28" />
      ) : (
        <p className={`mt-2 text-2xl font-semibold tabular-nums transition-colors ${TONES[tone]}`}>
          {value}
        </p>
      )}
      {sub && !loading && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
    </div>
  );
}