import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("UI Caught Runtime Error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[400px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 max-w-lg">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-red-900 dark:text-red-200">
              Something went wrong displaying this view
            </h2>
            <p className="mt-2 text-xs text-red-700/80 dark:text-red-300/80">
              {this.state.error?.message || "An unexpected error occurred while rendering the chart."}
            </p>
            <button
              onClick={this.handleReset}
              className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-500"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reload View
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
