import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { StockProvider } from "./context/StockContext.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <StockProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StockProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);