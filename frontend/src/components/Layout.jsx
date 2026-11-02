import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Activity, Brain, FlaskConical, Info, LayoutDashboard, Menu, Search, X } from "lucide-react";
import { useStock } from "../context/StockContext";
import StockSearch from "./StockSearch";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/explorer", label: "Stock Explorer", icon: Search },
  { to: "/technical", label: "Technical Analysis", icon: Activity },
  { to: "/prediction", label: "ML Prediction", icon: Brain },
  { to: "/evaluation", label: "Model Evaluation", icon: FlaskConical },
  { to: "/about", label: "About Project", icon: Info },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-indigo-600 text-white"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
  }`;

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { stock } = useStock();

  return (
    <div className="min-h-screen">
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
      )}

      <aside
        aria-label="Primary"
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-slate-200 bg-white p-4 transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-base font-bold tracking-tight">📈 Stock Trend Predictor</span>
          <button
            className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <nav className="mt-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass} onClick={() => setOpen(false)}>
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="absolute bottom-4 left-4 right-4 text-xs text-slate-500 dark:text-slate-400">
          Educational use only. Not financial advice.
        </p>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <button
            className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <StockSearch />
          <span className="hidden whitespace-nowrap rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-200 sm:inline-block">
            {stock.symbol} · {stock.exchange}
          </span>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </main>

        <footer className="border-t border-slate-200 px-4 py-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 sm:px-6">
          Educational and research purposes only. Predictions are uncertain model outputs, not financial advice
          and not guaranteed outcomes. Data from Yahoo Finance is unofficial and may be delayed.
        </footer>
      </div>
    </div>
  );
}