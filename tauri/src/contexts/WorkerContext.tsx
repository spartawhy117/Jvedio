import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// ── Types ───────────────────────────────────────────────

export type WorkerStatus = "starting" | "ready" | "error";

interface WorkerReadyPayload {
  baseUrl: string;
}

interface WorkerErrorPayload {
  message: string;
  phase: string;
}

interface WorkerContextValue {
  status: WorkerStatus;
  baseUrl: string | null;
  error: string | null;
}

// ── Context ─────────────────────────────────────────────

const WorkerContext = createContext<WorkerContextValue>({
  status: "starting",
  baseUrl: null,
  error: null,
});

export function useWorker(): WorkerContextValue {
  return useContext(WorkerContext);
}

// ── Provider ────────────────────────────────────────────

export function WorkerProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WorkerStatus>("starting");
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Worker is already ready (e.g. fast startup before React mount).
    invoke<string | null>("get_worker_base_url").then((url) => {
      if (url) {
        setBaseUrl(url);
        setStatus("ready");
      }
    });

    // Listen for worker-ready event from Rust.
    const unlistenReady = listen<WorkerReadyPayload>("worker-ready", (event) => {
      console.log("[WorkerProvider] worker-ready:", event.payload);
      setBaseUrl(event.payload.baseUrl);
      setStatus("ready");
      setError(null);
    });

    // Listen for worker-error event from Rust.
    const unlistenError = listen<WorkerErrorPayload>("worker-error", (event) => {
      console.error("[WorkerProvider] worker-error:", event.payload);
      setError(event.payload.message);
      setStatus("error");
    });

    return () => {
      unlistenReady.then((f) => f());
      unlistenError.then((f) => f());
    };
  }, []);

  return (
    <WorkerContext.Provider value={{ status, baseUrl, error }}>
      {children}
    </WorkerContext.Provider>
  );
}
