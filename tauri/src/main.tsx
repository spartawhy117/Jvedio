import React from "react";
import ReactDOM from "react-dom/client";

// i18n must be imported before any component that uses translations
import "./locales/i18n";

import { ErrorBoundary } from "./components/ErrorBoundary";
import "./components/ErrorBoundary.css";
import { GlobalToast } from "./components/GlobalToast";
import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import { WorkerProvider } from "./contexts/WorkerContext";
import { BootstrapProvider } from "./contexts/BootstrapContext";
import { RouterProvider } from "./router";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeModeProvider>
        <WorkerProvider>
          <BootstrapProvider>
            <RouterProvider defaultPage="library-management">
              <App />
              <GlobalToast />
            </RouterProvider>
          </BootstrapProvider>
        </WorkerProvider>
      </ThemeModeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
