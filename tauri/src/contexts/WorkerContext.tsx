import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from "react";

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

// ── Environment detection ───────────────────────────────

/**
 * Returns true when running inside a real Tauri window (IPC bridge available).
 * In a plain browser (Playwright, Chrome dev, etc.) this returns false.
 */
function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
}

/**
 * In browser mode, try to resolve Worker base URL from multiple sources:
 *  1. URL search param  ?workerPort=53706  → http://127.0.0.1:53706
 *  2. URL search param  ?workerUrl=http://127.0.0.1:53706
 *  3. window.__WORKER_BASE_URL__  (injected via Playwright browser_evaluate)
 */
function resolveWorkerUrlFromBrowser(): string | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);

  // ?workerUrl=http://...
  const workerUrl = params.get("workerUrl");
  if (workerUrl) return workerUrl.replace(/\/$/, "");

  // ?workerPort=53706
  const workerPort = params.get("workerPort");
  if (workerPort) return `http://127.0.0.1:${workerPort}`;

  // Injected by test scripts
  const injected = (window as unknown as Record<string, unknown>).__WORKER_BASE_URL__;
  if (typeof injected === "string" && injected) return injected.replace(/\/$/, "");

  return null;
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
  const isTauri = useRef(isTauriEnvironment());

  useEffect(() => {
    // ── Branch A: Real Tauri window ──────────────────
    if (isTauri.current) {
      // Dynamic import so the module is never loaded in plain browsers
      // (avoids "Cannot read properties of undefined" on missing __TAURI_INTERNALS__)
      Promise.all([
        import("@tauri-apps/api/core"),
        import("@tauri-apps/api/event"),
      ])
        .then(([{ invoke }, { listen }]) => {
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

          // Store cleanup functions
          return () => {
            unlistenReady.then((f) => f());
            unlistenError.then((f) => f());
          };
        })
        .catch((err) => {
          console.error("[WorkerProvider] Failed to load Tauri API:", err);
          setError(`Tauri API load failed: ${err instanceof Error ? err.message : String(err)}`);
          setStatus("error");
        });

      return; // cleanup handled above
    }

    // ── Branch B: Browser mode (Playwright / dev browser) ──
    console.log("[WorkerProvider] Browser mode detected (no Tauri IPC)");

    const resolved = resolveWorkerUrlFromBrowser();
    if (resolved) {
      console.log("[WorkerProvider] Worker URL from params/inject:", resolved);
      // Validate by hitting the bootstrap endpoint
      fetch(`${resolved}/api/app/bootstrap`, { headers: { Accept: "application/json" } })
        .then((res) => {
          if (res.ok) {
            console.log("[WorkerProvider] Worker is reachable at", resolved);
            setBaseUrl(resolved);
            setStatus("ready");
          } else {
            throw new Error(`HTTP ${res.status}`);
          }
        })
        .catch((err) => {
          console.error("[WorkerProvider] Worker unreachable at", resolved, err);
          setError(`Worker unreachable: ${err instanceof Error ? err.message : String(err)}`);
          setStatus("error");
        });
      return;
    }

    // No URL provided — try auto-discovery by polling common ports
    console.log("[WorkerProvider] No workerPort/workerUrl param, starting auto-discovery...");
    let cancelled = false;
    const POLL_INTERVAL = 2000; // ms
    const MAX_ATTEMPTS = 30; // 60 seconds total
    let attempt = 0;

    // Try a range of likely ports — Worker uses dynamic port but often lands in 50000–60000
    const tryDiscover = async () => {
      while (!cancelled && attempt < MAX_ATTEMPTS) {
        attempt++;
        // Try the last known port from tauri-output.log (would be set via window.__WORKER_BASE_URL__)
        const injected = resolveWorkerUrlFromBrowser();
        if (injected) {
          try {
            const res = await fetch(`${injected}/api/app/bootstrap`, {
              headers: { Accept: "application/json" },
            });
            if (res.ok) {
              setBaseUrl(injected);
              setStatus("ready");
              return;
            }
          } catch {
            // retry
          }
        }
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
      }
      if (!cancelled) {
        setError("Browser mode: no workerPort param and auto-discovery timed out. Add ?workerPort=XXXXX to the URL.");
        setStatus("error");
      }
    };
    tryDiscover();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WorkerContext.Provider value={{ status, baseUrl, error }}>
      {children}
    </WorkerContext.Provider>
  );
}
