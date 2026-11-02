export default function ConfusionMatrix({ matrix, labels = ["DOWN", "SIDEWAYS", "UP"], support }) {
  if (!matrix || !matrix.length) return null;

  // Calculate totals
  const total = matrix.reduce((acc, row) => acc + row.reduce((r, val) => r + val, 0), 0);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[420px]">
        <div className="mb-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Rows: <strong className="font-semibold text-slate-700 dark:text-slate-200">Actual outcome</strong></span>
          <span>Columns: <strong className="font-semibold text-slate-700 dark:text-slate-200">Predicted outcome</strong></span>
        </div>

        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-medium text-slate-400">Actual \ Predicted</th>
              {labels.map((lbl) => (
                <th key={lbl} className="p-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                  {lbl}
                </th>
              ))}
              <th className="p-2 text-xs font-medium text-slate-400">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIdx) => {
              const actualLabel = labels[rowIdx];
              const rowTotal = row.reduce((a, b) => a + b, 0);

              return (
                <tr key={actualLabel} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="p-2 text-left text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {actualLabel}
                  </td>
                  {row.map((count, colIdx) => {
                    const isDiagonal = rowIdx === colIdx;
                    const pctOfRow = rowTotal > 0 ? (count / rowTotal) * 100 : 0;
                    
                    let bgCls = "bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-300";
                    if (isDiagonal && count > 0) {
                      bgCls = "bg-emerald-100/80 text-emerald-900 font-semibold dark:bg-emerald-950/50 dark:text-emerald-300";
                    } else if (count > 0) {
                      bgCls = "bg-rose-50/60 text-rose-800 dark:bg-rose-950/30 dark:text-rose-300";
                    }

                    return (
                      <td key={colIdx} className="p-1.5">
                        <div className={`rounded-lg p-2.5 transition-colors ${bgCls}`}>
                          <div className="text-base tabular-nums">{count}</div>
                          <div className="text-[11px] opacity-75 tabular-nums">
                            {pctOfRow.toFixed(1)}%
                          </div>
                        </div>
                      </td>
                    );
                  })}
                  <td className="p-2 text-xs font-medium text-slate-500 tabular-nums dark:text-slate-400">
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-emerald-500"></span> Correct predictions (diagonal)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded bg-rose-400"></span> Misclassifications
            </span>
          </div>
          <span>Total holdout samples: <strong>{total}</strong></span>
        </div>
      </div>
    </div>
  );
}
