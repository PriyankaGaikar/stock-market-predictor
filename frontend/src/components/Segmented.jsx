export default function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-md px-3 py-1 text-xs font-medium ${
            value === o.value
              ? "bg-indigo-600 text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}