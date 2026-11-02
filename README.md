# Stock Market Predictor & Quantitative Analytics Platform

A full-stack quantitative analytics and machine-learning-driven stock trend prediction platform built for Indian equities (NSE/BSE). It features real-time delayed quotes, interactive technical indicator charts, comprehensive statistical evaluations, and an end-to-end ML training and inference pipeline with calibrated probabilities and edge-over-baseline validation.

---

## Features

- **Live Market Feed & KPI Dashboard**:
  - Live streaming price updates with configurable auto-polling (10s, 15s, 30s, 60s) and manual refresh.
  - Key performance metrics: Last Price, Daily Change (₹ and %), Day High/Low, and Volume.
  - Data freshness indicators tracking source timestamp, cache age, and server synchronization.

- **Interactive Price & Technical Visualizations**:
  - Dynamic responsive charts powered by Recharts with custom tooltips and gradient fills.
  - Multi-timeframe views: 1-Day (5-minute intraday session candles), 1-Month, 3-Month, 6-Month, and 1-Year.
  - Technical momentum gauges including RSI (14), MACD, Moving Averages (SMA/EMA), Annualized Volatility, and Maximum Drawdown.

- **Machine Learning Trend Prediction Engine**:
  - Predicts directional price movement over configurable forward horizons (e.g. 5 trading days).
  - Feature engineering: rolling momentum, normalized returns, volume trends, and volatility regimes.
  - Calibrated probability estimates with confidence intervals and warnings for market regime shifts.
  - Strict time-series validation with purged holdout splits to prevent lookahead bias.

- **Model Evaluation & Training Suite**:
  - On-demand training pipeline via FastAPI background tasks or dedicated UI workflows.
  - Detailed evaluation metrics: Balanced Accuracy, ROC-AUC, Brier score, and benchmark comparison against baseline drift.
  - Artifact tracking storing trained models (`.joblib`) and metadata audit logs (`.report.json`).

- **Modern User Experience**:
  - Built with React 19, Vite, and Tailwind CSS.
  - Full Dark/Light theme switching with persistent user preference.
  - Robust error boundaries, skeleton loaders, and responsive layout for mobile and desktop screens.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, Vite, Tailwind CSS, Recharts, Lucide Icons, Axios, React Router 7 |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, Pydantic-Settings |
| **Data & ML** | yfinance, pandas, numpy, scikit-learn, joblib, cachetools |
| **Testing** | pytest, pytest-asyncio, HTTPX |
| **Tooling** | PowerShell, Windows Batch, Oxlint |

---

## Project Structure

```
stock-market-predictor/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route handlers (stocks, ml, health, rate limits)
│   │   ├── features/        # Feature engineering, indicators, and targets
│   │   ├── ml/              # Model training, inference, and registry
│   │   ├── providers/       # Market data providers (yfinance, demo fallback)
│   │   ├── schemas/         # Pydantic schemas for requests and responses
│   │   ├── services/        # MarketDataService, indicator calculations, TTL cache
│   │   └── utils/           # Symbol normalization, custom exceptions
│   ├── artifacts/           # Trained models (.joblib) and audit reports (.json)
│   ├── tests/               # Backend test suite (phases 3, 4, 5)
│   ├── .env.example         # Template for backend environment variables
│   ├── pytest.ini          # Pytest configuration
│   └── requirements.txt     # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components (PriceChart, KpiCard, Navbar, etc.)
│   │   ├── context/         # React Contexts (StockContext, ThemeContext)
│   │   ├── hooks/           # Custom React hooks (useApi with auto-polling)
│   │   ├── pages/           # Pages (Home, Explorer, Technical, Prediction, Evaluation, About)
│   │   ├── services/        # API client configuration (axios)
│   │   └── utils/           # Currency and date/time formatters (IST timezone)
│   ├── .env.example         # Template for frontend environment variables
│   ├── package.json         # Node.js dependencies and scripts
│   └── vite.config.js       # Vite build configuration
├── start.ps1                # PowerShell launcher (launches backend + frontend)
├── start_dev.bat            # Windows batch launcher (one-click dev runner)
├── requirements.txt         # Root requirements pointer
├── .gitignore               # Git ignore rules for Python, Node, and secrets
└── README.md                # Project documentation
```

---

## Getting Started

### Prerequisites

- **Python**: 3.10 or 3.11 (Python 3.11 recommended)
- **Node.js**: v18 or later (v20+ recommended)
- **npm** or **pnpm** / **yarn**

---

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/<your-username>/stock-market-predictor.git
cd stock-market-predictor
```

#### 2. Backend Setup
```bash
cd backend

# Create a virtual environment
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Windows (CMD):
.\.venv\Scripts\activate.bat
# Linux / macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
copy .env.example .env     # On Windows (or 'cp .env.example .env' on Unix)
```

#### 3. Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Configure environment variables
copy .env.example .env     # On Windows (or 'cp .env.example .env' on Unix)
```

---

## Running the Application

### One-Click Launch (Windows)

You can launch both the backend API and frontend dev server simultaneously:

- **Using PowerShell**:
  ```powershell
  .\start.ps1
  ```
- **Using Command Prompt / Double-Click**:
  ```cmd
  start_dev.bat
  ```

The launcher will clear any stale processes on ports `8000` & `5173`, launch the FastAPI server in a dedicated window, and launch the Vite React server in a second window.

### Running Manually in Separate Terminals

#### Terminal 1 — Backend (FastAPI):
```bash
cd backend
# Windows:
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
# Linux/macOS:
python -m uvicorn app.main:app --reload --port 8000
```
- **API Base URL**: `http://127.0.0.1:8000`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **OpenAPI Schema**: `http://127.0.0.1:8000/openapi.json`

#### Terminal 2 — Frontend (Vite + React):
```bash
cd frontend
npm run dev
```
- **Frontend App**: `http://localhost:5173`

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check, data provider status, and server UTC time |
| `GET` | `/api/stocks/{symbol}/quote` | Current price, change %, day high/low, and volume |
| `GET` | `/api/stocks/{symbol}/history` | Historical OHLCV candle series with customizable interval & lookback |
| `GET` | `/api/stocks/{symbol}/indicators` | Technical indicator dataset (RSI, MACD, volatility, drawdown) |
| `GET` | `/api/stocks/search` | Symbol auto-complete and search |
| `GET` | `/api/models` | List all available trained ML models and metadata |
| `GET` | `/api/models/metrics` | Fetch evaluation metrics for a specific symbol & horizon |
| `POST` | `/api/models/train` | Trigger an asynchronous model training pipeline |
| `POST` | `/api/predict` | Generate directional trend inference for a stock |

---

## Testing

Run the automated test suite in the backend virtual environment:

```bash
cd backend
.\.venv\Scripts\python.exe -m pytest -v
```

The test suite covers:
- Data fetching, TTL caching, and error resilience.
- Feature extraction, target generation, and indicator computations.
- ML model training, probability calibration, and inference endpoints.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `DATA_PROVIDER` | `yfinance` | Provider to fetch market data (`yfinance` or `demo`) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed frontend origins (comma-separated) |
| `CACHE_TTL_SECONDS` | `15` | Cache duration for quote requests |
| `HISTORY_CACHE_TTL_SECONDS` | `900` | Cache duration for historical candle bars |
| `ALLOW_DEMO_FALLBACK` | `false` | Fall back to synthetic data if provider is unreachable |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://127.0.0.1:8000` | URL of the backend FastAPI service |

---

## Disclaimer

This software is for **educational and research purposes only**. All market predictions and indicators generated by this platform are probabilistic estimates from historical models and do not constitute financial advice, investment recommendations, or guarantees of future performance. Yahoo Finance quotes for Indian exchanges (NSE/BSE) may be delayed by approximately 15 minutes. Always conduct independent due diligence before making investment decisions.

---

## License

This project is open-source under the [MIT License](LICENSE).
