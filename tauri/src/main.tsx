import React from "react";
import ReactDOM from "react-dom/client";
import { WorkerProvider } from "./contexts/WorkerContext";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <WorkerProvider>
      <App />
    </WorkerProvider>
  </React.StrictMode>,
);
