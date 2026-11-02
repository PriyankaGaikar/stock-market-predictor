import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  HelpCircle,
  Info,
  Loader2,
  MoveHorizontal,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Card from "../components/Card";
import DataFreshness from "../components/DataFreshness";
import ErrorBanner from "../components/ErrorBanner";
import Segmented from "../components/Segmented";
import Skeleton from "../components/Skeleton";
import Stat from "../components/Stat";
import { useStock } from "../context/StockContext";
import { getModels, predict, trainModel } from "../services/api";
import { fmtDateTime, fmtNum, fmtPct, fmtPrice } from "../utils/format";

const HORIZONS = [
  { value: 1, label: "1 Day (Next Session)" },
  { value: 5, label: "5 Days (1 Week)" },
  { value: 10, label: "10 Days (2 Weeks)" },
  { value: 20, label: "20 Days (1 Month)" },
];

const DIRECTION_CONFIG = {
  UP: {
    label: "UP",
    icon: ArrowUpRight,
    bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-400",
    badge: "bg-emerald-500 text-white",
    desc: "Expected positive return exceeding threshold over horizon",
  },
  DOWN: {
    label: "DOWN",
    icon: ArrowDownRight,
    bg: "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:bg-rose-500/20 dark:text-rose-400",
    badge: "bg-rose-500 text-white",
    desc: "Expected negative return exceeding threshold over horizon",
  },
  SIDEWAYS: {
    label: "SIDEWAYS",
    icon: MoveHorizontal,
    bg: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400",
    badge: "bg-amber-500 text-white",
    desc: "Expected price movement within neutral threshold band",
  },
};

export default function Prediction() {
  const { stock } = useStock();
  const [horizon, setHorizon] = useState(5);
  const [threshold, setThreshold] = useState(0.01);

  // Available models list
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Prediction state
  const [prediction, setPrediction] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictError, setPredictError] = useState(null);

  // Training state
  const [training, setTraining] = useState(false);
  const [trainStatus, setTrainStatus] = useState(null);
  const [trainError, setTrainError] = useState(null);

  // Fetch available models
  const loadAvailableModels = async () => {
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
    loadAvailableModels();
  }, [stock.symbol, stock.exchange]);

  // Check if a model exists for the current symbol, exchange and horizon
  const matchingModel = models.find(
    (m) =>
      m.symbol.toUpperCase() === stock.symbol.toUpperCase() &&
      m.exchange.toUpperCase() === stock.exchange.toUpperCase() &&
      m.horizon === horizon,
  );

  // Run prediction
  const handlePredict = async () => {
    setPredicting(true);
    setPredictError(null);
    try {
      const res = await predict({
        symbol: stock.symbol,
        exchange: stock.exchange,
        horizon: horizon,
        interval: "1d",
      });
      setPrediction(res);
    } catch (err) {
      setPrediction(null);
      setPredictError(err);
    } finally {
      setPredicting(false);
    }
  };

  // Trigger training
  const handleTrain = async () => {
    setTraining(true);
    setTrainError(null);
    setTrainStatus("Training models (Logistic Regression, Random Forest, Gradient Boosting) using walk-forward validation. This may take 30–60 seconds...");
    try {
      const res = await trainModel({
        symbol: stock.symbol,
        exchange: stock.exchange,
        horizon: horizon,
        threshold: threshold,
        lookback_days: 1825,
        n_splits: 5,
        interval: "1d",
      });
      setTrainStatus(`Training complete! Selected: ${res.summary.selected_model.replace('_', ' ')}.`);
      await loadAvailableModels();
      // Auto run prediction after training finishes
      const pred = await predict({
        symbol: stock.symbol,
        exchange: stock.exchange,
        horizon: horizon,
        interval: "1d",
      });
      setPrediction(pred);
    } catch (err) {
      setTrainError(err);
      setTrainStatus(null);
    } finally {
      setTraining(false);
    }
  };

  // Run predict automatically if model exists and stock/horizon changes
  useEffect(() => {
    if (matchingModel) {
      handlePredict();
    } else {
      setPrediction(null);
      setPredictError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingModel?.key, stock.symbol, stock.exchange, horizon]);

  const dirCfg = prediction?.predicted_direction ? DIRECTION_CONFIG[prediction.predicted_direction] : null;
  const DirIcon = dirCfg?.icon || Brain;

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Machine Learning Prediction{" "}
            <span className="text-base font-normal text-slate-500 dark:text-slate-400">
              {stock.symbol} · {stock.exchange}
            </span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Multi-class direction probability (UP / DOWN / SIDEWAYS) with strict time-series validation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadAvailableModels();
              if (matchingModel) handlePredict();
            }}
            disabled={predicting || training}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${predicting ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      {/* Horizon & Settings Selector */}
      <Card title="Prediction Parameters">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Target Forecast Horizon
            </label>
            <Segmented
              label="Horizon"
              options={HORIZONS}
              value={horizon}
              onChange={(v) => setHorizon(v)}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
              Movement Threshold: <strong>±{(threshold * 100).toFixed(1)}%</strong>
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 dark:bg-slate-800">
              Interval: <strong>Daily (1d)</strong>
            </span>
          </div>
        </div>
      </Card>

      {/* Model status alert / Training trigger */}
      {!loadingModels && !matchingModel && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900/60 dark:bg-amber-950/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-400" />
              <div>
                <h3 className="font-semibold text-amber-900 dark:text-amber-200">
                  No trained model found for {stock.symbol} ({horizon}-day horizon)
                </h3>
                <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-300/80">
                  Train a new model suite (Logistic Regression, Random Forest, HistGradientBoosting) with 5-fold walk-forward validation on 5 years of historical data.
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
                  <Brain className="h-4 w-4" />
                  Train Model Now
                </>
              )}
            </button>
          </div>

          {trainStatus && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-100/80 px-3 py-2 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              <Loader2 className={`h-3.5 w-3.5 ${training ? "animate-spin" : ""}`} />
              <span>{trainStatus}</span>
            </div>
          )}

          {trainError && (
            <div className="mt-3">
              <ErrorBanner error={trainError} onRetry={handleTrain} />
            </div>
          )}
        </div>
      )}

      {/* Errors */}
      {predictError && <ErrorBanner error={predictError} onRetry={handlePredict} />}

      {/* Loading state */}
      {predicting && !prediction && (
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              Computing model features and running inference...
            </p>
          </div>
        </Card>
      )}

      {/* Prediction Output */}
      {prediction && (
        <div className="space-y-6">
          {/* Main Direction Banner */}
          <div className={`rounded-xl border p-6 transition-all ${dirCfg?.bg}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${dirCfg?.badge} shadow-md`}>
                  <DirIcon className="h-8 w-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Forecasted Direction ({horizon} Trading Sessions)
                    </span>
                    <span className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-medium backdrop-blur dark:bg-slate-900/60">
                      ±{(prediction.threshold * 100).toFixed(1)}% threshold
                    </span>
                  </div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    {prediction.predicted_direction}
                  </h2>
                  <p className="mt-1 text-xs opacity-90">{dirCfg?.desc}</p>
                </div>
              </div>

              <div className="rounded-xl bg-white/80 p-4 text-right backdrop-blur dark:bg-slate-900/80 sm:min-w-[180px]">
                <span className="text-xs text-slate-500 dark:text-slate-400">Last Close Reference</span>
                <p className="text-xl font-bold tabular-nums">₹{fmtPrice(prediction.last_close)}</p>
                <span className="text-[11px] text-slate-400">
                  As of {fmtDateTime(prediction.data_as_of)}
                </span>
              </div>
            </div>
          </div>

          {/* Probabilities and Secondary Return Estimation */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Class Probabilities Card */}
            <Card title="Calibrated Class Probabilities">
              <div className="space-y-4 pt-1">
                {/* UP */}
                <div>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <ArrowUpRight className="h-3.5 w-3.5" /> UP (&gt; +{(prediction.threshold * 100).toFixed(1)}%)
                    </span>
                    <span className="tabular-nums font-bold">
                      {fmtPct(prediction.probabilities.UP * 100, 1).replace("+", "")}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.max(prediction.probabilities.UP * 100, 2)}%` }}
                    />
                  </div>
                </div>

                {/* SIDEWAYS */}
                <div>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                      <MoveHorizontal className="h-3.5 w-3.5" /> SIDEWAYS (±{(prediction.threshold * 100).toFixed(1)}%)
                    </span>
                    <span className="tabular-nums font-bold">
                      {fmtPct(prediction.probabilities.SIDEWAYS * 100, 1).replace("+", "")}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${Math.max(prediction.probabilities.SIDEWAYS * 100, 2)}%` }}
                    />
                  </div>
                </div>

                {/* DOWN */}
                <div>
                  <div className="mb-1 flex justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                      <ArrowDownRight className="h-3.5 w-3.5" /> DOWN (&lt; -{(prediction.threshold * 100).toFixed(1)}%)
                    </span>
                    <span className="tabular-nums font-bold">
                      {fmtPct(prediction.probabilities.DOWN * 100, 1).replace("+", "")}
                    </span>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-rose-500 transition-all duration-500"
                      style={{ width: `${Math.max(prediction.probabilities.DOWN * 100, 2)}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500" />
                    Calibration: {prediction.probabilities_calibrated ? "Calibrated via Platt/Isotonic scaling" : "Raw model softmax"}
                  </span>
                  <span>Sum: 100%</span>
                </div>
              </div>
            </Card>

            {/* Price & Return Estimation (Secondary Regressor) */}
            <Card title="Secondary Price Estimation (Regression)">
              <div className="flex flex-col justify-between h-full space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Estimated Return</span>
                    <p className={`text-2xl font-bold tabular-nums ${
                      prediction.estimated_return_pct > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : prediction.estimated_return_pct < 0
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}>
                      {fmtPct(prediction.estimated_return_pct)}
                    </p>
                    <span className="text-[11px] text-slate-400">over {horizon} sessions</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Estimated Price</span>
                    <p className="text-2xl font-bold tabular-nums">
                      ₹{fmtPrice(prediction.estimated_price)}
                    </p>
                    <span className="text-[11px] text-slate-400">from ₹{fmtPrice(prediction.last_close)}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-100/80 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <p className="font-medium text-slate-700 dark:text-slate-200 mb-1">
                    About this price estimation:
                  </p>
                  <p>{prediction.estimate_note}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Model Transparency & Edge Warning */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Model Metadata */}
            <Card title="Model Specifications & Audit Trail">
              <dl className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                <Stat label="Selected Model" value={prediction.model_name.replace("_", " ").toUpperCase()} />
                <Stat label="Model Version" value={prediction.model_version} />
                <Stat label="Model Trained At" value={fmtDateTime(prediction.model_trained_at)} />
                <Stat
                  label="Training Data Span"
                  value={
                    prediction.training_period?.length === 2
                      ? `${prediction.training_period[0].slice(0, 10)} to ${prediction.training_period[1].slice(0, 10)}`
                      : "—"
                  }
                />
                <Stat
                  label="Holdout Balanced Accuracy"
                  value={
                    prediction.holdout_balanced_accuracy != null
                      ? fmtPct(prediction.holdout_balanced_accuracy * 100, 1).replace("+", "")
                      : "—"
                  }
                />
                <Stat label="Data Provider" value={`${prediction.provider} (${prediction.data_label})`} />
              </dl>
            </Card>

            {/* Edge Warning & Honest Assessment */}
            <Card title="Validation & Edge Assessment">
              <div className="space-y-3">
                <div
                  className={`rounded-xl border p-4 ${
                    prediction.shows_edge_over_baseline
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                      : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div>
                      <h4 className="font-semibold text-sm">
                        {prediction.shows_edge_over_baseline
                          ? "Demonstrates Modest Edge Over Baseline"
                          : "No Demonstrated Edge Over Baseline"}
                      </h4>
                      <p className="mt-1 text-xs opacity-90 leading-relaxed">
                        {prediction.shows_edge_over_baseline
                          ? "Model balanced accuracy on sealed holdout exceeded the baseline majority class."
                          : "On the sealed historical holdout, this model showed no statistical advantage over an always-predict-the-majority baseline (33.3%). Real market prices are dominated by noise."}
                      </p>
                    </div>
                  </div>
                </div>

                {prediction.warnings?.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      System Warnings
                    </span>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                      {prediction.warnings.map((w, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-amber-500">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Statutory Disclaimer */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              <p className="leading-relaxed">
                <strong>Disclaimer: </strong>
                {prediction.disclaimer}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
