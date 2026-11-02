import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const client = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

// Turn every failure into the same shape: { type, message, status?, details?, canceled? }
function normalizeError(err) {
  if (axios.isCancel(err)) return { canceled: true, type: "Canceled", message: "Request cancelled." };
  if (err.response) {
    const e = err.response.data?.error;
    return {
      status: err.response.status,
      type: e?.type || "HttpError",
      message: e?.message || `Request failed with status ${err.response.status}.`,
      details: e?.details,
    };
  }
  if (err.code === "ECONNABORTED") {
    return { type: "Timeout", message: "The server took too long to respond." };
  }
  return {
    type: "NetworkError",
    message: `Cannot reach the API at ${API_BASE_URL}. Is the backend running?`,
  };
}

client.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(normalizeError(err)),
);

const get = (url, params, signal) => client.get(url, { params, signal }).then((r) => r.data);
const enc = encodeURIComponent;

export const getHealth = (signal) => get("/api/health", undefined, signal);

export const searchStocks = (q, signal) => get("/api/stocks/search", { q }, signal);

export const getQuote = (symbol, exchange = "NSE", signal) =>
  get(`/api/stocks/${enc(symbol)}/quote`, { exchange }, signal);

export const getHistory = (symbol, { lookbackDays = 365, interval = "1d", exchange = "NSE" } = {}, signal) =>
  get(`/api/stocks/${enc(symbol)}/history`, { lookback_days: lookbackDays, interval, exchange }, signal);

export const getIndicators = (symbol, { lookbackDays = 365, interval = "1d", exchange = "NSE" } = {}, signal) =>
  get(`/api/stocks/${enc(symbol)}/indicators`, { lookback_days: lookbackDays, interval, exchange }, signal);

export const getModels = (signal) => get("/api/models", undefined, signal);

export const getModelMetrics = ({ symbol, exchange = "NSE", horizon = 5 }, signal) =>
  get("/api/models/metrics", { symbol, exchange, horizon }, signal);

export const predict = (body, signal) =>
  client.post("/api/predict", body, { signal }).then((r) => r.data);

// Training can take a minute or more, so it gets a long timeout.
export const trainModel = (body, signal) =>
  client.post("/api/models/train", body, { signal, timeout: 600000 }).then((r) => r.data);