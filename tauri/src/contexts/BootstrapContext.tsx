import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useWorker } from "./WorkerContext";
import { fetchBootstrap, createApiClient, getApiClient } from "../api/client";
import { connectEventStream } from "../api/events";
import { dispatchSSEEvent } from "../hooks/useSSESubscription";
import { invalidateQueries } from "../hooks/useApiQuery";
import type {
  GetBootstrapResponse,
  TaskSummaryDto,
  TaskSummaryChangedEvent,
  LibraryListItemDto,
  WorkerEventEnvelopeDto,
} from "../api/types";

// ── Types ───────────────────────────────────────────────

export type BootstrapStatus = "idle" | "loading" | "ready" | "error";

interface BootstrapContextValue {
  /** Bootstrap loading/ready state */
  status: BootstrapStatus;
  /** Full bootstrap response from Worker */
  bootstrap: GetBootstrapResponse | null;
  /** Live task summary (updated via SSE) */
  taskSummary: TaskSummaryDto | null;
  /** Live library list (updated via SSE) */
  libraries: LibraryListItemDto[];
  /** SSE connection status */
  sseConnected: boolean;
  /** Latest SSE events log (for debugging) */
  recentEvents: WorkerEventEnvelopeDto[];
  /** Error message if bootstrap fetch failed */
  error: string | null;
  /** Manually retry bootstrap fetch */
  retry: () => void;
}

// ── Context ─────────────────────────────────────────────

const BootstrapContext = createContext<BootstrapContextValue>({
  status: "idle",
  bootstrap: null,
  taskSummary: null,
  libraries: [],
  sseConnected: false,
  recentEvents: [],
  error: null,
  retry: () => {},
});

export function useBootstrap(): BootstrapContextValue {
  return useContext(BootstrapContext);
}

// ── Provider ────────────────────────────────────────────

const MAX_RECENT_EVENTS = 50;

export function BootstrapProvider({ children }: { children: ReactNode }) {
  const { status: workerStatus, baseUrl } = useWorker();

  const [status, setStatus] = useState<BootstrapStatus>("idle");
  const [bootstrap, setBootstrap] = useState<GetBootstrapResponse | null>(null);
  const [taskSummary, setTaskSummary] = useState<TaskSummaryDto | null>(null);
  const [libraries, setLibraries] = useState<LibraryListItemDto[]>([]);
  const [sseConnected, setSseConnected] = useState(false);
  const [recentEvents, setRecentEvents] = useState<WorkerEventEnvelopeDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sseCleanupRef = useRef<(() => void) | null>(null);

  // ── Fetch bootstrap ─────────────────────────────────
  const doFetchBootstrap = useCallback(async (url: string) => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchBootstrap(url);
      console.log("[BootstrapProvider] bootstrap data:", data);
      // Initialize the global API client singleton
      createApiClient(url);
      setBootstrap(data);
      setTaskSummary(data.taskSummary);
      setLibraries(data.libraries);
      setStatus("ready");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[BootstrapProvider] bootstrap fetch failed:", msg);
      setError(msg);
      setStatus("error");
    }
  }, []);

  // ── SSE event handler ───────────────────────────────
  const handleEvent = useCallback((envelope: WorkerEventEnvelopeDto) => {
    console.log("[BootstrapProvider] SSE event:", envelope.eventName, envelope);

    // Dispatch to global event bus (allows per-page subscriptions via useSSESubscription)
    dispatchSSEEvent(envelope);

    // Append to recent events (ring buffer)
    setRecentEvents((prev) => {
      const next = [envelope, ...prev];
      return next.length > MAX_RECENT_EVENTS ? next.slice(0, MAX_RECENT_EVENTS) : next;
    });

    // Update live state based on event type
    switch (envelope.eventName) {
      case "task.summary.changed": {
        const payload = envelope.data as TaskSummaryChangedEvent | null;
        if (payload?.summary) {
          setTaskSummary(payload.summary);
        }
        break;
      }
      case "library.changed": {
        // Refresh library list from API
        const client = getApiClient();
        if (client) {
          client.getLibraries().then((libs) => {
            setLibraries(libs);
          }).catch((err) => {
            console.error("[BootstrapProvider] failed to refresh libraries:", err);
          });
        }
        // Invalidate all library-related query caches
        invalidateQueries("libraries");
        break;
      }
      case "settings.changed": {
        // Invalidate settings-related query caches so pages auto-refetch
        invalidateQueries("settings");
        break;
      }
      default:
        // task.created, task.completed, task.failed, task.progress, worker.ready, etc.
        // Invalidate task caches
        if (envelope.eventName.startsWith("task.")) {
          invalidateQueries("tasks");
        }
        break;
    }
  }, []);

  // ── When Worker becomes ready, fetch bootstrap + connect SSE ──
  useEffect(() => {
    if (workerStatus !== "ready" || !baseUrl) {
      return;
    }

    doFetchBootstrap(baseUrl);

    // Connect SSE
    const cleanup = connectEventStream({
      baseUrl,
      onEvent: handleEvent,
      onOpen: () => setSseConnected(true),
      onError: () => setSseConnected(false),
    });
    sseCleanupRef.current = cleanup;

    return () => {
      cleanup();
      sseCleanupRef.current = null;
      setSseConnected(false);
    };
  }, [workerStatus, baseUrl, doFetchBootstrap, handleEvent]);

  // ── Retry handler ───────────────────────────────────
  const retry = useCallback(() => {
    if (baseUrl) {
      doFetchBootstrap(baseUrl);
    }
  }, [baseUrl, doFetchBootstrap]);

  return (
    <BootstrapContext.Provider
      value={{
        status,
        bootstrap,
        taskSummary,
        libraries,
        sseConnected,
        recentEvents,
        error,
        retry,
      }}
    >
      {children}
    </BootstrapContext.Provider>
  );
}
