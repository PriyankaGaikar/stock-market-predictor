import Skeleton from "./Skeleton";
import { fmtDate, fmtDateTime } from "../utils/format";

const LABELS = {
  live: {
    text: "Live",
    cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  delayed: {
    text: "Delayed (~15 min)",
    cls: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  },
  end_of_day: {
    text: "End-of-day close",
    cls: "bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200",
  },
  demo: {
    text: "DEMO DATA (synthetic)",
    cls: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200",
  },
};

export default function DataFreshness({ title, data, asOf, loading }) {
  const heading = (
    <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
  );

  if (loading) {
    return (
      <div>
        {heading}
        <Skeleton className="mt-2 h-6 w-40" />
        <Skeleton className="mt-2 h-4 w-56" />
      </div>
    );
  }
  if (!data) {
    return (
      <div>
        {heading}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No data loaded.</p>
      </div>
    );
  }

  const badge = LABELS[data.label] ?? { text: data.label, cls: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" };
  const dateOnly = data.label === "end_of_day" || data.label === "demo";
  const asOfText = dateOnly ? fmtDate(asOf) : fmtDateTime(asOf);

  return (
    <div>
      {heading}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badge.cls}`}>{badge.text}</span>
        {data.from_cache && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Cached ({data.cache_age_seconds}s old)
          </span>
        )}
      </div>
      <dl className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-400">
        <div>
          <dt className="inline font-medium">Data as of: </dt>
          <dd className="inline">{asOfText}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Last updated: </dt>
          <dd className="inline">{fmtDateTime(data.fetched_at)}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Provider: </dt>
          <dd className="inline">{data.provider}</dd>
        </div>
      </dl>
      {data.note && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{data.note}</p>}
    </div>
  );
}