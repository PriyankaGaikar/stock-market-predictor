export default function Stat({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-1.5 text-sm last:border-0 dark:border-slate-800">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}