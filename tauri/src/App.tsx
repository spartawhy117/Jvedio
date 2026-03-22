/**
 * App — Main Shell component.
 *
 * Spec: doc/UI/new/pages/main-shell.md
 *
 * Structure:
 * - Left sidebar: brand, primary nav, library nav section, task summary, worker indicator
 * - Right content: PageRouter
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "./router";
import { useWorker } from "./contexts/WorkerContext";
import { useBootstrap } from "./contexts/BootstrapContext";
import { useOnLibraryChanged } from "./hooks/useSSESubscription";
import { StartupReadyBridge } from "./components/StartupReadyBridge";
import { WorkerStatusOverlay } from "./components/WorkerStatusOverlay";
import { PageRouter } from "./pages/PageRouter";
import { AppIcon, type AppIconName } from "./components/shared/AppIcon";
import type { PageKey } from "./router";
import "./App.css";

interface RuntimeMetrics {
  workerRunning: boolean;
  shellCpuPercent: number;
  workerCpuPercent: number;
  totalCpuPercent: number;
  shellMemoryMb: number;
  workerMemoryMb: number;
  totalMemoryMb: number;
}

function formatCpu(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function formatMemory(value?: number) {
  if (value === undefined || Number.isNaN(value)) {
    return "--";
  }

  return `${Math.round(value)} MB`;
}

function App() {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const { currentPage, params, navigate } = useRouter();
  const { status: workerStatus } = useWorker();
  const { libraries, taskSummary, sseConnected } = useBootstrap();
  const [metrics, setMetrics] = useState<RuntimeMetrics | null>(null);

  useOnLibraryChanged(() => {
    // Libraries are already refreshed in BootstrapContext.
  });

  useEffect(() => {
    if (typeof window === "undefined" || !(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__) {
      setMetrics(null);
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;

    const loadMetrics = async () => {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        const nextMetrics = await invoke<RuntimeMetrics>("get_runtime_metrics");
        if (!cancelled) {
          setMetrics(nextMetrics);
        }
      } catch {
        if (!cancelled) {
          setMetrics(null);
        }
      }
    };

    void loadMetrics();
    intervalId = window.setInterval(() => {
      void loadMetrics();
    }, 5000);

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [workerStatus]);

  const handleNavClick = (page: PageKey) => {
    navigate(page, {}, { replace: true });
  };

  const handleLibraryClick = (libraryId: string) => {
    navigate("library", { libraryId }, { replace: true });
  };

  const isPrimaryActive = (page: PageKey) => {
    if (page === "library-management") {
      return currentPage === "library-management";
    }
    return currentPage === page;
  };

  const isLibraryActive = (libraryId: string) => {
    return currentPage === "library" && params.libraryId === libraryId;
  };

  const workerTone =
    workerStatus === "ready"
      ? sseConnected
        ? "ready"
        : "warning"
      : workerStatus === "error"
        ? "error"
        : "starting";

  const workerHeadline =
    workerStatus === "ready"
      ? "工作服务运行中"
      : workerStatus === "error"
        ? tc("status.error")
        : tc("status.starting");

  const workerSubline =
    workerStatus === "ready"
      ? sseConnected
        ? "事件同步正常"
        : "事件同步断开"
      : "等待 Worker 初始化";

  return (
    <>
      <StartupReadyBridge />
      <WorkerStatusOverlay />

      <div className="main-shell">
        <aside className="nav-sidebar">
          <div className="brand-area">
            <span className="brand-icon"><AppIcon name="brand" size={18} /></span>
            <span className="brand-name">{tc("appName")}</span>
          </div>

          <nav className="primary-nav">
            <NavButton
              icon="settings"
              label={t("settings")}
              active={isPrimaryActive("settings")}
              onClick={() => handleNavClick("settings")}
            />
            <NavButton
              icon="library-management"
              label={t("libraryManagement")}
              active={isPrimaryActive("library-management")}
              onClick={() => handleNavClick("library-management")}
            />
            <NavButton
              icon="favorites"
              label={t("favorites")}
              active={isPrimaryActive("favorites")}
              onClick={() => handleNavClick("favorites")}
            />
            <NavButton
              icon="actors"
              label={t("actors")}
              active={isPrimaryActive("actors")}
              onClick={() => handleNavClick("actors")}
            />
          </nav>

          <div className="library-nav-section">
            <div className="section-title">{t("libraries")}</div>
            {libraries.length === 0 ? (
              <div className="section-empty">{t("noLibraries")}</div>
            ) : (
              <div className="library-list">
                {libraries.map((lib) => (
                  <button
                    key={lib.libraryId}
                    className={`nav-item library-item ${isLibraryActive(lib.libraryId) ? "active" : ""}`}
                    onClick={() => handleLibraryClick(lib.libraryId)}
                    title={lib.path}
                  >
                    <span className="nav-icon"><AppIcon name="library" size={15} /></span>
                    <span className="nav-label">{lib.name}</span>
                    <span className="library-count">{lib.videoCount}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            {taskSummary && (
              <div className="task-summary-panel">
                <div className="sidebar-footer-title">任务概况</div>
                <div className="task-summary-grid">
                  <TaskMetric icon="running" label={tc("tasks.running")} value={taskSummary.runningCount} tone="running" />
                  <TaskMetric icon="queued" label={tc("tasks.queued")} value={taskSummary.queuedCount} tone="neutral" />
                  <TaskMetric icon="completed" label={tc("tasks.completedToday")} value={taskSummary.completedTodayCount} tone="success" />
                  <TaskMetric icon="failed" label={tc("tasks.failed")} value={taskSummary.failedCount} tone={taskSummary.failedCount > 0 ? "failed" : "neutral"} />
                </div>
              </div>
            )}

            <div className="sidebar-status-panel">
              <div className="worker-status-block">
                <div className="sidebar-footer-title">运行状态</div>
                <div className="worker-indicator">
                  <span className={`worker-dot ${workerTone}`} />
                  <div className="worker-status-copy">
                    <span className="worker-status-text">{workerHeadline}</span>
                    <span className="worker-status-subtext">{workerSubline}</span>
                  </div>
                </div>
              </div>
              <div className="resource-metrics">
                <div className="resource-metric">
                  <span className="resource-metric-label"><AppIcon name="cpu" size={14} /> CPU</span>
                  <strong>{formatCpu(metrics?.totalCpuPercent)}</strong>
                </div>
                <div className="resource-metric">
                  <span className="resource-metric-label"><AppIcon name="memory" size={14} /> Memory</span>
                  <strong>{formatMemory(metrics?.totalMemoryMb)}</strong>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="content-area">
          <PageRouter />
        </main>
      </div>
    </>
  );
}

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: AppIconName;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-icon"><AppIcon name={icon} size={15} /></span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

function TaskMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: AppIconName;
  label: string;
  value: number;
  tone: "running" | "success" | "failed" | "neutral";
}) {
  return (
    <div className={`task-metric-card task-metric-card-${tone}`} title={label}>
      <span className="task-metric-label">
        <AppIcon name={icon} size={13} />
        {label}
      </span>
      <strong className="task-metric-value">{value}</strong>
    </div>
  );
}

export default App;
