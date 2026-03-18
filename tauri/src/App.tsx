import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorker } from "./contexts/WorkerContext";
import { useBootstrap } from "./contexts/BootstrapContext";
import { useTheme } from "./theme/ThemeModeProvider";
import { changeLanguage } from "./locales/i18n";
import { WorkerStatusOverlay } from "./components/WorkerStatusOverlay";
import type { ThemeMode } from "./theme/theme-mode-store";
import "./App.css";

// ── Page keys — 1:1 with doc/UI/new/page-index.md ──────

type PageKey =
  | "settings"
  | "library-management"
  | "library"
  | "favorites"
  | "actors"
  | "actor-detail"
  | "video-detail";

function App() {
  const { t } = useTranslation("navigation");
  const [activePage, setActivePage] = useState<PageKey>("library-management");
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);
  const { status: workerStatus } = useWorker();
  const {
    bootstrap,
    taskSummary,
    libraries,
    sseConnected,
    status: bsStatus,
    error: bsError,
  } = useBootstrap();

  const handleNavClick = (key: PageKey) => {
    setActivePage(key);
    if (key !== "library") {
      setActiveLibraryId(null);
    }
  };

  const handleLibraryClick = (libraryId: string) => {
    setActivePage("library");
    setActiveLibraryId(libraryId);
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
            <span className="brand-name">Jvedio Next</span>
          </div>

          {/* 一级导航 */}
          <nav className="primary-nav">
            <NavButton
              icon="⚙"
              label={t("settings")}
              active={activePage === "settings"}
              onClick={() => handleNavClick("settings")}
            />
            <NavButton
              icon="📁"
              label={t("libraryManagement")}
              active={activePage === "library-management"}
              onClick={() => handleNavClick("library-management")}
            />
            <NavButton
              icon="❤"
              label={t("favorites")}
              active={activePage === "favorites"}
              onClick={() => handleNavClick("favorites")}
            />
            <NavButton
              icon="👤"
              label={t("actors")}
              active={activePage === "actors"}
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
                    className={`nav-item library-item ${activePage === "library" && activeLibraryId === lib.libraryId ? "active" : ""}`}
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
              className={`worker-dot ${workerStatus === "ready" ? (sseConnected ? "ready" : "warning") : workerStatus === "error" ? "error" : "starting"}`}
            />
            <span className="worker-status-text">
              {workerStatus === "ready"
                ? sseConnected
                  ? t("../common:connected", { ns: "common" })
                  : "SSE ✗"
                : workerStatus === "error"
                  ? t("../common:status.error", { ns: "common" })
                  : t("../common:status.starting", { ns: "common" })}
            </span>
          </div>
        </aside>

        {/* ──── 右侧内容区 ──── */}
        <main className="content-area">
          <PageRouter
            page={activePage}
            libraryId={activeLibraryId}
            libraries={libraries}
            bootstrap={bootstrap}
            bsStatus={bsStatus}
            bsError={bsError}
          />
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

// ── Page Router ─────────────────────────────────────────

function PageRouter(props: {
  page: PageKey;
  libraryId: string | null;
  libraries: ReturnType<typeof useBootstrap>["libraries"];
  bootstrap: ReturnType<typeof useBootstrap>["bootstrap"];
  bsStatus: string;
  bsError: string | null;
}) {
  const { page, libraryId, libraries } = props;

  switch (page) {
    case "settings":
      return <SettingsPagePlaceholder />;
    case "library-management":
      return <LibraryManagementPagePlaceholder libraries={libraries} />;
    case "library":
      return <LibraryPagePlaceholder libraryId={libraryId} libraries={libraries} />;
    case "favorites":
      return <FavoritesPagePlaceholder />;
    case "actors":
      return <ActorsPagePlaceholder />;
    case "actor-detail":
      return <ActorDetailPagePlaceholder />;
    case "video-detail":
      return <VideoDetailPagePlaceholder />;
    default:
      return <PlaceholderPage title="Unknown" />;
  }
}

// ── Placeholder Pages ───────────────────────────────────

function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-placeholder">
      <h2>{title}</h2>
      <p className="placeholder-hint">{subtitle || "Phase 2 — coming soon"}</p>
    </div>
  );
}

function SettingsPagePlaceholder() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { themeMode, setThemeMode } = useTheme();
  const { i18n } = useTranslation();

  return (
    <div className="page-content-section">
      <h2 className="page-title">{t("title")}</h2>
      <p className="page-subtitle">{t("groups")}</p>

      {/* Theme switcher (Phase 1 minimal) */}
      <section className="settings-group">
        <h3>{t("theme.label")}</h3>
        <div className="settings-row">
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
            <button
              key={mode}
              className={`settings-chip ${themeMode === mode ? "active" : ""}`}
              onClick={() => setThemeMode(mode)}
            >
              {t(`theme.${mode}`)}
            </button>
          ))}
        </div>
      </section>

      {/* Language switcher (Phase 1 minimal) */}
      <section className="settings-group">
        <h3>{t("language.label")}</h3>
        <div className="settings-row">
          {(["zh", "en"] as const).map((lang) => (
            <button
              key={lang}
              className={`settings-chip ${i18n.language === lang ? "active" : ""}`}
              onClick={() => changeLanguage(lang)}
            >
              {t(`language.${lang}`)}
            </button>
          ))}
        </div>
      </section>

      <p className="placeholder-hint" style={{ marginTop: 24 }}>
        Phase 2 — {tc("loading")}
      </p>
    </div>
  );
}

function LibraryManagementPagePlaceholder({
  libraries,
}: {
  libraries: ReturnType<typeof useBootstrap>["libraries"];
}) {
  const { t } = useTranslation("library");

  return (
    <div className="page-content-section">
      <h2 className="page-title">{t("management.title")}</h2>
      <p className="page-subtitle">
        {libraries.length} libraries
      </p>
      {libraries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <p>{t("management.noLibrary")}</p>
          <p className="placeholder-hint">{t("management.createFirst")}</p>
        </div>
      ) : (
        <div className="library-cards">
          {libraries.map((lib) => (
            <div key={lib.libraryId} className="library-card">
              <div className="library-card-name">{lib.name}</div>
              <div className="library-card-path" title={lib.path}>{lib.path}</div>
              <div className="library-card-stats">
                <span>{lib.videoCount} videos</span>
                {lib.hasRunningTask && (
                  <span className="running-badge">{t("management.scanning")}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LibraryPagePlaceholder({
  libraryId,
  libraries,
}: {
  libraryId: string | null;
  libraries: ReturnType<typeof useBootstrap>["libraries"];
}) {
  const { t } = useTranslation("library");
  const lib = libraries.find((l) => l.libraryId === libraryId);
  return (
    <div className="page-placeholder">
      <h2>{lib?.name || "Library"}</h2>
      <p className="placeholder-hint">{t("page.filterPlaceholder")}</p>
      {lib && (
        <p className="placeholder-hint">
          {lib.videoCount} videos · {lib.path}
        </p>
      )}
    </div>
  );
}

function FavoritesPagePlaceholder() {
  const { t } = useTranslation("navigation");
  return <PlaceholderPage title={t("favorites")} subtitle="Phase 2 — favorites aggregation page" />;
}

function ActorsPagePlaceholder() {
  const { t } = useTranslation("navigation");
  return <PlaceholderPage title={t("actors")} subtitle="Phase 2 — actors list page" />;
}

function ActorDetailPagePlaceholder() {
  return <PlaceholderPage title="Actor Detail" subtitle="Phase 2 — actor detail page" />;
}

function VideoDetailPagePlaceholder() {
  return <PlaceholderPage title="Video Detail" subtitle="Phase 2 — video detail page" />;
}

export default App;
