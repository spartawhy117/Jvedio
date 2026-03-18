/**
 * App — Main Shell component.
 *
 * Spec: doc/UI/new/pages/main-shell.md
 *
 * Structure:
 * - Left sidebar: brand, primary nav, library nav section, task summary, worker indicator
 * - Right content: PageRouter
 */

import { useTranslation } from "react-i18next";
import { useRouter } from "./router";
import { useWorker } from "./contexts/WorkerContext";
import { useBootstrap } from "./contexts/BootstrapContext";
import { useOnLibraryChanged } from "./hooks/useSSESubscription";
import { WorkerStatusOverlay } from "./components/WorkerStatusOverlay";
import { PageRouter } from "./pages/PageRouter";
import type { PageKey } from "./router";
import "./App.css";

function App() {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const { currentPage, params, navigate } = useRouter();
  const { status: workerStatus } = useWorker();
  const { libraries, taskSummary, sseConnected } = useBootstrap();

  // Auto-refresh libraries on SSE library.changed
  useOnLibraryChanged(() => {
    // Libraries are already refreshed in BootstrapContext; this is a placeholder
    // for any additional main-shell reactions to library changes.
  });

  // ── Navigation handlers ────────────────────────────
  const handleNavClick = (page: PageKey) => {
    navigate(page, {}, { replace: true });
  };

  const handleLibraryClick = (libraryId: string) => {
    navigate("library", { libraryId }, { replace: true });
  };

  // ── Active state helpers ───────────────────────────
  const isPrimaryActive = (page: PageKey) => {
    // For library-management, also highlight when viewing a specific library
    if (page === "library-management") {
      return currentPage === "library-management";
    }
    return currentPage === page;
  };

  const isLibraryActive = (libraryId: string) => {
    return (
      currentPage === "library" && params.libraryId === libraryId
    );
  };

  return (
    <>
      <WorkerStatusOverlay />

      <div className="main-shell">
        {/* ──── Left sidebar (main-shell) ──── */}
        <aside className="nav-sidebar">
          {/* Brand area */}
          <div className="brand-area">
            <span className="brand-icon">🎬</span>
            <span className="brand-name">{tc("appName")}</span>
          </div>

          {/* Primary navigation */}
          <nav className="primary-nav">
            <NavButton
              icon="⚙"
              label={t("settings")}
              active={isPrimaryActive("settings")}
              onClick={() => handleNavClick("settings")}
            />
            <NavButton
              icon="📁"
              label={t("libraryManagement")}
              active={isPrimaryActive("library-management")}
              onClick={() => handleNavClick("library-management")}
            />
            <NavButton
              icon="❤"
              label={t("favorites")}
              active={isPrimaryActive("favorites")}
              onClick={() => handleNavClick("favorites")}
            />
            <NavButton
              icon="👤"
              label={t("actors")}
              active={isPrimaryActive("actors")}
              onClick={() => handleNavClick("actors")}
            />
          </nav>

          {/* Library navigation section */}
          <div className="library-nav-section">
            <div className="section-title">{t("libraries")}</div>
            {libraries.length === 0 ? (
              <div className="section-empty">{t("noLibraries")}</div>
            ) : (
              <div className="library-list">
                {libraries.map((lib) => (
                  <button
                    key={lib.libraryId}
                    className={`nav-item library-item ${
                      isLibraryActive(lib.libraryId) ? "active" : ""
                    }`}
                    onClick={() => handleLibraryClick(lib.libraryId)}
                    title={lib.path}
                  >
                    <span className="nav-icon">📀</span>
                    <span className="nav-label">{lib.name}</span>
                    <span className="library-count">{lib.videoCount}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task summary bar */}
          {taskSummary && (
            <div className="task-summary-bar">
              <span className="task-badge" title={tc("tasks.running")}>
                ▶ {taskSummary.runningCount}
              </span>
              <span className="task-badge" title={tc("tasks.queued")}>
                ⏳ {taskSummary.queuedCount}
              </span>
              <span className="task-badge" title={tc("tasks.completedToday")}>
                ✅ {taskSummary.completedTodayCount}
              </span>
              {taskSummary.failedCount > 0 && (
                <span className="task-badge failed" title={tc("tasks.failed")}>
                  ❌ {taskSummary.failedCount}
                </span>
              )}
            </div>
          )}

          {/* Worker status indicator */}
          <div className="worker-indicator">
            <span
              className={`worker-dot ${
                workerStatus === "ready"
                  ? sseConnected
                    ? "ready"
                    : "warning"
                  : workerStatus === "error"
                    ? "error"
                    : "starting"
              }`}
            />
            <span className="worker-status-text">
              {workerStatus === "ready"
                ? sseConnected
                  ? tc("connected")
                  : "SSE ✗"
                : workerStatus === "error"
                  ? tc("status.error")
                  : tc("status.starting")}
            </span>
          </div>
        </aside>

        {/* ──── Right content area ──── */}
        <main className="content-area">
          <PageRouter />
        </main>
      </div>
    </>
  );
}

// ── NavButton ───────────────────────────────────────────

function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="nav-icon">{icon}</span>
      <span className="nav-label">{label}</span>
    </button>
  );
}

export default App;
