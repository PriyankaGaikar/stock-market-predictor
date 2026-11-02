import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart2,
  Check,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  HelpCircle,
  Info,
  Loader2,
  RefreshCw,
  Scale,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import Card from "../components/Card";
import ConfusionMatrix from "../components/ConfusionMatrix";
import ErrorBanner from "../components/ErrorBanner";
import Segmented from "../components/Segmented";
import Skeleton from "../components/Skeleton";
import Stat from "../components/Stat";
import { useStock } from "../context/StockContext";
import { getModelMetrics, getModels, trainModel } from "../services/api";
import { fmtDate, fmtDateTime, fmtNum, fmtPct, fmtPrice } from "../utils/format";

const HORIZONS = [
  { value: 1, label: "1 Day" },
  { value: 5, label: "5 Days" },
  { value: 10, label: "10 Days" },
  { value: 20, label: "20 Days" },
];

const MODEL_NAMES = {
  baseline_majority: "Baseline (Majority Class)",
  logistic_regression: "Logistic Regression",
  random_forest: "Random Forest",
  gradient_boosting: "HistGradientBoosting",
};

export default function Evaluation() {
  const { stock } = useStock();
  const [horizon, setHorizon] = useState(5);
  const [activeModelKey, setActiveModelKey] = useState("gradient_boosting");

  // Models list
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Metrics report
  const [report, setReport] = useState(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState(null);

  // Training
  const [training, setTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState(null);

  const loadModelsList = async () => {
    try {
      setLoadingModels(true);
      const list = await getModels();
      setModels(list || []);
    } catch {
      setModels([]);
    } finally {
      setLoadingModels(false);
    }
  };

  useEffect(() => {
    loadModelsList();
  }, [stock.symbol, stock.exchange]);

  const loadMetrics = async () => {
    setLoadingMetrics(true);
    setMetricsError(null);
    try {
      const data = await getModelMetrics({
        symbol: stock.symbol,
        exchange: stock.exchange,
        horizon: horizon,
      });
      setReport(data);
      if (data?.selection?.selected_model) {
        setActiveModelKey(data.selection.selected_model);
      }
    } catch (err) {
      setReport(null);
      setMetricsError(err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stock.symbol, stock.exchange, horizon]);

  const handleTrain = async () => {
    setTraining(true);
    setTrainStatus("Training models with walk-forward validation (30–60s)...");
    try {
      await trainModel({
        symbol: stock.symbol,
        exchange: stock.exchange,
        horizon: horizon,
        threshold: 0.01,
        lookback_days: 1825,
        n_splits: 5,
        interval: "1d",
      });
      setTrainStatus("Training complete! Loading metrics...");
      await loadModelsList();
      await loadMetrics();
    } catch (err) {
      setMetricsError(err);
    } finally {
      setTraining(false);
      setTrainStatus(null);
    }
  };

  const sel = report?.selection;
  const holdout = report?.holdout || {};
  const walkForward = report?.walk_forward || {};
  const regression = report?.regression || {};
  const activeMetrics = holdout[activeModelKey];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Model Evaluation & Validation{" "}
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              {stock.symbol} · {stock.exchange}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Honest benchmark comparison against trivial baselines on sealed holdout data.
          </p>
        </div>

        <button
          onClick={() => {
            loadModelsList();
            loadMetrics();
          }}
          disabled={loadingMetrics || training}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RefreshCw className={`h-4 w-4 ${loadingMetrics ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Horizon selector */}
      <Card title="Evaluation Horizon">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Segmented
            label="Horizon"
            options={HORIZONS}
            value={horizon}
            onChange={(v) => setHorizon(v)}
          />
          {report && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Trained at {fmtDateTime(report.metadata.trained_at)} · {report.metadata.n_samples} total samples
            </span>
          )}
        </div>
      </Card>

      {/* No model / Training CTA */}
      {metricsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  No evaluation report found for {stock.symbol} ({horizon}-day horizon)
                </h3>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
                  Run full walk-forward model training and sealed holdout evaluation for this instrument.
                </p>
              </div>
            </div>

            <button
              onClick={handleTrain}
              disabled={training}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
            >
              {training ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Training Models...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Train & Evaluate Now
                </>
              )}
            </button>
          </div>

          {trainStatus && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100/80 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{trainStatus}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loadingMetrics && !report && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              Loading model evaluation metrics and confusion matrices...
            </p>
          </div>
        </Card>
      )}

      {/* Main Report Content */}
      {report && (
        <div className="space-y-6">
          {/* Winner & Selection Summary */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Award className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Selected Production Model
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {MODEL_NAMES[sel?.selected_model] || sel?.selected_model}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    <strong>Selection Criterion: </strong>
                    {sel?.selected_by}
                  </p>
                  <p className="pt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                    {sel?.note}
                  </p>
                </div>
              </div>
            </Card>

            <Card>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Holdout Edge Status
              </span>
              <div className="mt-2 space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Model Balanced Acc:</span>
                  <span className="font-bold tabular-nums">
                    {fmtPct((sel?.holdout_balanced_accuracy || 0) * 100, 1).replace("+", "")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Baseline Majority Acc:</span>
                  <span className="font-bold tabular-nums">
                    {fmtPct((sel?.baseline_holdout_balanced_accuracy || 0) * 100, 1).replace("+", "")}
                  </span>
                </div>
                <div className="flex items-baseline justify-between border-t border-slate-100 pt-1 dark:border-slate-800">
                  <span className="text-xs font-medium">Edge Over Baseline:</span>
                  <span className={`font-bold tabular-nums ${sel?.shows_edge ? "text-emerald-600" : "text-slate-500"}`}>
                    {fmtPct((sel?.edge_over_baseline || 0) * 100, 1)}
                  </span>
                </div>

                <div className={`mt-2 rounded-lg p-2 text-center text-xs font-medium ${
                  sel?.shows_edge
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}>
                  {sel?.shows_edge ? "Statistically Positive Edge" : "No Demonstrated Edge Over Baseline"}
                </div>
              </div>
            </Card>
          </div>

          {/* Model Comparison Table */}
          <Card title="Side-by-Side Holdout Performance vs Baseline">
            <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
              Evaluated on the sealed chronological holdout set ({report.holdout?.gradient_boosting?.n || 0} samples).
              All preprocessors and scalers were fit strictly on preceding training data.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-4">Model Candidate</th>
                    <th className="px-3 py-2.5 text-right">Accuracy</th>
                    <th className="px-3 py-2.5 text-right">Balanced Acc</th>
                    <th className="px-3 py-2.5 text-right">Precision (Macro)</th>
                    <th className="px-3 py-2.5 text-right">Recall (Macro)</th>
                    <th className="px-3 py-2.5 text-right">F1 (Macro)</th>
                    <th className="px-3 py-2.5 text-right">ROC-AUC (OVR)</th>
                    <th className="px-3 py-2.5 text-right">Log Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(holdout).map(([key, m]) => {
                    const isSelected = key === sel?.selected_model;
                    const isBaseline = key === "baseline_majority";

                    return (
                      <tr
                        key={key}
                        className={`transition-colors ${
                          isSelected
                            ? "bg-indigo-50/50 dark:bg-indigo-950/20 font-medium"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span>{MODEL_NAMES[key] || key}</span>
                            {isSelected && (
                              <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                Selected
                              </span>
                            )}
                            {isBaseline && (
                              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                Benchmark
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {fmtPct((m.accuracy || 0) * 100, 1).replace("+", "")}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums font-semibold">
                          {fmtPct((m.balanced_accuracy || 0) * 100, 1).replace("+", "")}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {fmtPct((m.precision_macro || 0) * 100, 1).replace("+", "")}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {fmtPct((m.recall_macro || 0) * 100, 1).replace("+", "")}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {fmtPct((m.f1_macro || 0) * 100, 1).replace("+", "")}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {m.roc_auc_ovr != null ? fmtNum(m.roc_auc_ovr, 3) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right tabular-nums">
                          {m.log_loss != null ? fmtNum(m.log_loss, 3) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Confusion Matrix and Holdout Inspection */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Confusion Matrix Card */}
            <Card
              title="Holdout Confusion Matrix"
              action={
                <div className="flex gap-1 text-xs">
                  {Object.keys(holdout).map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveModelKey(key)}
                      className={`rounded px-2 py-1 font-medium ${
                        activeModelKey === key
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {key.split("_")[0]}
                    </button>
                  ))}
                </div>
              }
            >
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Showing holdout classification matrix for:{" "}
                  <strong>{MODEL_NAMES[activeModelKey] || activeModelKey}</strong>
                </p>
                {activeMetrics?.confusion_matrix && (
                  <ConfusionMatrix
                    matrix={activeMetrics.confusion_matrix}
                    labels={activeMetrics.labels || ["DOWN", "SIDEWAYS", "UP"]}
                    support={activeMetrics.support}
                  />
                )}
              </div>
            </Card>

            {/* Regression Model Evaluation */}
            <Card title="Secondary Return Regressor Evaluation">
              <div className="space-y-4 text-sm">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Evaluates the secondary regressor tasked with estimating continuous future percentage returns.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500">Holdout Model MAE</span>
                    <p className="text-lg font-bold tabular-nums">
                      {fmtPct((regression?.holdout?.mae || 0) * 100, 2)}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Baseline (Predict 0): {fmtPct((regression?.holdout?.baseline_zero?.mae || 0) * 100, 2)}
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500">Holdout Model RMSE</span>
                    <p className="text-lg font-bold tabular-nums">
                      {fmtPct((regression?.holdout?.rmse || 0) * 100, 2)}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Baseline (Predict 0): {fmtPct((regression?.holdout?.baseline_zero?.rmse || 0) * 100, 2)}
                    </span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-100/80 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300 leading-relaxed">
                  <strong>Econometric Insight: </strong>
                  {regression?.note || "A statistical estimate, not a target price. If the model does not beat the 'predict zero' baseline, future returns are within noise."}
                </div>
              </div>
            </Card>
          </div>

          {/* Holdout Actual vs Predicted Sample Table */}
          {report.actual_vs_predicted_holdout?.length > 0 && (
            <Card title={`Recent Holdout Predictions Log (${report.actual_vs_predicted_holdout.length} Samples)`}>
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-500">
                    <tr>
                      <th className="py-2">Date</th>
                      <th className="py-2 text-right">Close Price</th>
                      <th className="py-2 text-right">Actual Return</th>
                      <th className="py-2 text-center">Actual Label</th>
                      <th className="py-2 text-center">Predicted Label</th>
                      <th className="py-2 text-right">P(UP)</th>
                      <th className="py-2 text-right">P(DOWN)</th>
                      <th className="py-2 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.actual_vs_predicted_holdout.slice(-15).reverse().map((row, i) => {
                      const match = row.actual === row.predicted;
                      return (
                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2 font-medium">{fmtDate(row.timestamp)}</td>
                          <td className="py-2 text-right tabular-nums">₹{fmtPrice(row.close)}</td>
                          <td className={`py-2 text-right tabular-nums font-semibold ${
                            row.actual_return_pct > 0 ? "text-emerald-600" : row.actual_return_pct < 0 ? "text-rose-600" : ""
                          }`}>
                            {fmtPct(row.actual_return_pct)}
                          </td>
                          <td className="py-2 text-center">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">
                              {row.actual}
                            </span>
                          </td>
                          <td className="py-2 text-center">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">
                              {row.predicted}
                            </span>
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {fmtPct(row.p_up * 100, 1).replace("+", "")}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {fmtPct(row.p_down * 100, 1).replace("+", "")}
                          </td>
                          <td className="py-2 text-center">
                            {match ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                                <Check className="h-3.5 w-3.5" /> Hit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-rose-500 font-medium">
                                <X className="h-3.5 w-3.5" /> Miss
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Educational Section: Why History Can Mislead */}
          {report.why_history_can_mislead?.length > 0 && (
            <Card title="Why History Can Mislead in Financial Machine Learning">
              <div className="space-y-3">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Critical principles of quantitative finance and data science that every practitioner should understand:
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {report.why_history_can_mislead.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/30"
                    >
                      <div className="flex items-start gap-2.5">
                        <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-indigo-500" />
                        <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                          {item}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
