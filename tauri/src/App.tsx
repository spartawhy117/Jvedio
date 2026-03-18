import { useTranslation } from "react-i18next";
import { useRouter } from "./router";
import { useWorker } from "./contexts/WorkerContext";
import { useBootstrap } from "./contexts/BootstrapContext";
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

  const handleNavClick = (page: PageKey) => {
    navigate(page, {}, { replace: true });
  };

  const handleLibraryClick = (libraryId: string) => {
    navigate("library", { libraryId }, { replace: true });
  };

  return (
    <>
      <WorkerStatusOverlay />

      <div className="main-shell">
        {/* ──── 左侧导航（main-shell） ──── */}
        <aside className="nav-sidebar">
          {/* 品牌区 */}
          <div className="brand-area">
            <span className="brand-icon">🎬</span>
            <span className="brand-name">{tc("appName")}</span>
          </div>

          {/* 一级导航 */}
          <nav className="primary-nav">
            <NavButton
              icon="⚙"
              label={t("settings")}
              active={currentPage === "settings"}
              onClick={() => handleNavClick("settings")}
            />
            <NavButton
              icon="📁"
              label={t("libraryManagement")}
              active={currentPage === "library-management"}
              onClick={() => handleNavClick("library-management")}
            />
            <NavButton
              icon="❤"
              label={t("favorites")}
              active={currentPage === "favorites"}
              onClick={() => handleNavClick("favorites")}
            />
            <NavButton
              icon="👤"
              label={t("actors")}
              active={currentPage === "actors"}
              onClick={() => handleNavClick("actors")}
            />
          </nav>

          {/* 影视库区 */}
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
                      currentPage === "library" &&
                      params.libraryId === lib.libraryId
                        ? "active"
                        : ""
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

          {/* 任务摘要 */}
          {taskSummary && (
            <div className="task-summary-bar">
              <span className="task-badge" title="Running">
                ▶ {taskSummary.runningCount}
              </span>
              <span className="task-badge" title="Queued">
                ⏳ {taskSummary.queuedCount}
              </span>
              <span className="task-badge" title="Completed today">
                ✅ {taskSummary.completedTodayCount}
              </span>
              {taskSummary.failedCount > 0 && (
                <span className="task-badge failed" title="Failed">
                  ❌ {taskSummary.failedCount}
                </span>
              )}
            </div>
          )}

          {/* Worker 状态指示器 */}
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

        {/* ──── 右侧内容区 ──── */}
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
