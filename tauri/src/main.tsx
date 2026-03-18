import React from "react";
import ReactDOM from "react-dom/client";

// i18n must be imported before any component that uses translations
import "./locales/i18n";

import { ThemeModeProvider } from "./theme/ThemeModeProvider";
import { WorkerProvider } from "./contexts/WorkerContext";
import { BootstrapProvider } from "./contexts/BootstrapContext";
import { RouterProvider } from "./router";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <WorkerProvider>
        <BootstrapProvider>
          <RouterProvider defaultPage="library-management">
            <App />
          </RouterProvider>
        </BootstrapProvider>
      </WorkerProvider>
    </ThemeModeProvider>
  </React.StrictMode>
);
