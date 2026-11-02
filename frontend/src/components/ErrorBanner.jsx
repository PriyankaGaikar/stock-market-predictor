import { ShieldAlert } from "lucide-react";

const HINTS = {
  NetworkError: "Start the backend: open a terminal in the backend folder and run: uvicorn app.main:app --reload",
  Timeout: "The server took too long. Try again in a moment.",
  SymbolNotFoundError:
    "Check the symbol, or try the other exchange (NSE/BSE). Yahoo Finance may also be temporarily unavailable.",
  InvalidRequestError: "That symbol or setting is not valid.",
  RateLimitedError: "Too many requests. Wait a minute and try again.",
  ProviderUnavailableError: "The data provider is unavailable right now. Try again later.",
  ModelNotFoundError: "No trained model yet. Train one on the ML Prediction page.",
  TrainingInProgressError: "A training run for this stock is already in progress.",
};

export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  const hint = HINTS[error.type];
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
    >
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="flex-1">
        <p className="font-medium">{error.message}</p>
        {hint && <p className="mt-1 opacity-90">{hint}</p>}
        <p className="mt-1 text-xs opacity-70">
          {error.type}
          {error.status ? ` · HTTP ${error.status}` : ""}
        </p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100 dark:border-red-800 dark:hover:bg-red-900/40"
        >
          Retry
        </button>
      )}
    </div>
  );
}