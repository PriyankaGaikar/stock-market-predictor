import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  LineChart,
  Lock,
  Scale,
  Server,
  Shield,
  Sliders,
  Workflow,
} from "lucide-react";
import Card from "../components/Card";

export default function About() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-semibold">About the Project</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Architecture, quantitative methodology, data integrity, and ethical principles.
        </p>
      </header>

      {/* Mission / Executive Summary */}
      <Card>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="h-5 w-5" />
            <h2 className="text-base font-semibold">Educational & Scientific Objective</h2>
          </div>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            This application is designed as an end-to-end, full-stack Data Science and Quantitative Machine Learning system.
            Its primary mission is to demonstrate <strong>realistic, defensible, and leak-free financial machine learning</strong>.
            Unlike simplistic tutorials that report misleadingly high accuracies (often 80–90% due to lookahead data leakage),
            this project implements strict chronological validation, compares models honestly against trivial baselines,
            and highlights when statistical edge does not exist.
          </p>
        </div>
      </Card>

      {/* Architecture Diagram & Tech Stack */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="System Architecture">
          <div className="space-y-3 pt-1">
            {/* Layer 1 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Layers className="h-4 w-4" /> Presentation Layer (Frontend)
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                React 19 + Vite + Tailwind CSS + Recharts + Lucide Icons. Provides real-time interactive technical charts,
                probabilistic gauge meters, confusion matrices, and dark/light theme switching.
              </p>
            </div>

            {/* Layer 2 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Server className="h-4 w-4" /> Application & API Gateway (FastAPI)
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Uvicorn asynchronous server exposing OpenAPI documented endpoints (`/api/stocks`, `/api/indicators`, `/api/predict`, `/api/models/train`).
                Includes rate limiting, concurrency locks, and unified error handling.
              </p>
            </div>

            {/* Layer 3 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Workflow className="h-4 w-4" /> Quantitative Feature Engineering
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Calculates technical features (SMA, EMA, RSI, MACD, Bollinger Bands, ATR, rolling volatility, multi-horizon returns)
                using strictly past information at timestamp <em>t</em>. Future values are never leaked into the feature matrix.
              </p>
            </div>

            {/* Layer 4 */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-2 font-semibold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                <Cpu className="h-4 w-4" /> Machine Learning Engine
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                Scikit-learn pipeline featuring Logistic Regression (L2 regularized baseline), Random Forest Classifier,
                and HistGradientBoostingClassifier. Implements probability calibration via Platt scaling / Isotonic regression.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Data Sourcing & Provider Abstraction">
          <div className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Database className="h-4 w-4 text-indigo-500" />
                Current Provider: Yahoo Finance (yfinance)
              </h3>
              <p className="mt-1 leading-relaxed">
                By default, the backend fetches historical OHLCV data using Yahoo Finance. For Indian equities, tickers are automatically mapped to NSE (e.g., <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">RELIANCE.NS</code>)
                or BSE (e.g., <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">RELIANCE.BO</code>).
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-600" />
                <p>
                  <strong>Important Notice on Live Data: </strong>
                  Yahoo Finance provides delayed, end-of-day, or unverified quotes for educational exploration.
                  It is not an exchange-authorized real-time feed. Data freshness stamps are clearly shown on every view.
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Sliders className="h-4 w-4 text-indigo-500" />
                Production Broker API Integration
              </h3>
              <p className="mt-1 leading-relaxed">
                The backend is built around a pluggable <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">MarketDataProvider</code> abstract class.
                To integrate authorized Indian broker APIs such as <strong>Upstox API</strong> or <strong>Angel One SmartAPI</strong>,
                implement a concrete provider adhering to the interface and set the corresponding API keys in your <code className="rounded bg-slate-100 px-1 py-0.5 dark:bg-slate-800">.env</code> file.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Methodological Rigor & Data Leakage Prevention */}
      <Card title="Methodological Rigor: Why No Data Leakage">
        <div className="grid gap-6 md:grid-cols-3 text-xs leading-relaxed">
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Chronological Splits Only
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Standard K-Fold cross validation shuffles data randomly, which allows future prices to predict past prices.
              Here, data is partitioned strictly chronologically with an embargo gap equal to the forecast horizon to avoid label overlap.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Walk-Forward Cross Validation
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Models are evaluated across expanding chronological windows. In each fold, features and preprocessors are fit only on past data,
              mimicking how a quantitative model would be trained and deployed in the real world.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm text-slate-900 dark:text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Calibrated Probabilities
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              Raw softmax outputs from trees and gradient boosting do not represent true probabilities.
              The pipeline uses calibration (Isotonic / Sigmoid) on separate validation folds so that reported percentages reflect empirical frequencies.
            </p>
          </div>
        </div>
      </Card>

      {/* Financial Reality & Limitations */}
      <Card title="Quantitative Reality: Why Predicting Stock Direction is Difficult">
        <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            In liquid financial markets, prices approximate a random walk or martingale difference sequence with a tiny, time-varying drift:
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Low Signal-to-Noise Ratio: </strong>
              Over daily horizons, idiosyncratic news, macroeconomic events, and liquidity flows dwarf technical patterns.
            </li>
            <li>
              <strong>Non-Stationarity & Regime Shifts: </strong>
              A pattern or moving average crossover that appeared profitable during a 2-year bull market will frequently lose money when the market transitions to sideways or bear regimes.
            </li>
            <li>
              <strong>Transaction Costs & Slippage: </strong>
              Even if a classifier scores 54% accuracy, brokerage fees, securities transaction tax (STT), exchange turnover charges, and bid-ask slippage can turn statistical edges negative.
            </li>
            <li>
              <strong>Selection Bias / Data Snooping: </strong>
              Testing hundreds of technical indicators and picking the ones with highest past return overfits historical noise.
            </li>
          </ul>
        </div>
      </Card>

      {/* Statutory Legal Disclaimer */}
      <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 text-xs text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-200">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 flex-shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
          <div className="space-y-1.5">
            <h3 className="font-semibold text-sm">Statutory Disclaimer</h3>
            <p className="leading-relaxed opacity-90">
              This application is developed strictly for educational, scientific, and research purposes.
              None of the content, probabilities, technical charts, or regression outputs constitute investment advice, financial consultation,
              or a recommendation to buy, sell, or hold any security.
            </p>
            <p className="leading-relaxed opacity-90">
              Trading stocks and derivatives involves substantial risk of financial loss. Past performance, backtests,
              and historical models are not indicative of future results.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
