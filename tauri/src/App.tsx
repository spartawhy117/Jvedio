import { useState } from "react";
import { useWorker } from "./contexts/WorkerContext";
import { useBootstrap } from "./contexts/BootstrapContext";
import { WorkerStatusOverlay } from "./components/WorkerStatusOverlay";
import "./App.css";

// ── Page keys — 1:1 with doc/UI/new/page-index.md ──────
// main-shell is the container itself, not a routable page.
// actor-detail-page and video-detail-page are detail views
// reached by navigation from list pages.

type PageKey =
  | "settings"
  | "library-management"
  | "library"
  | "favorites"
  | "actors"
  | "actor-detail"
  | "video-detail";

interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
}

// 一级导航（对齐 main-shell.md 规格）
const PRIMARY_NAV: NavItem[] = [
  { key: "settings", label: "设置", icon: "⚙" },
  { key: "library-management", label: "库管理", icon: "📁" },
  { key: "favorites", label: "喜欢", icon: "❤" },
  { key: "actors", label: "演员", icon: "👤" },
];

function App() {
  const [activePage, setActivePage] = useState<PageKey>("library-management");
  const [activeLibraryId, setActiveLibraryId] = useState<string | null>(null);
  const { status: workerStatus } = useWorker();
  const {
    bootstrap,
    taskSummary,
    libraries,
    sseConnected,
    recentEvents,
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
            {PRIMARY_NAV.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${activePage === item.key ? "active" : ""}`}
                onClick={() => handleNavClick(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* 影视库区 */}
          <div className="library-nav-section">
            <div className="section-title">影视库</div>
            {libraries.length === 0 ? (
              <div className="section-empty">暂无媒体库</div>
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

          {/* 任务摘要（底部） */}
          {taskSummary && (
            <div className="task-summary-bar">
              <span className="task-badge" title="运行中">
                ▶ {taskSummary.runningCount}
              </span>
              <span className="task-badge" title="队列中">
                ⏳ {taskSummary.queuedCount}
              </span>
              <span className="task-badge" title="今日完成">
                ✅ {taskSummary.completedTodayCount}
              </span>
              {taskSummary.failedCount > 0 && (
                <span className="task-badge failed" title="失败">
                  ❌ {taskSummary.failedCount}
                </span>
              )}
            </div>
          )}

          {/* Worker + SSE 状态指示器 */}
          <div className="worker-indicator">
            <span
              className={`worker-dot ${workerStatus === "ready" ? (sseConnected ? "ready" : "warning") : workerStatus === "error" ? "error" : "starting"}`}
            />
            <span className="worker-status-text">
              {workerStatus === "ready"
                ? sseConnected
                  ? "已连接"
                  : "SSE 断开"
                : workerStatus === "error"
                  ? "引擎异常"
                  : "正在连接…"}
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
            taskSummary={taskSummary}
            sseConnected={sseConnected}
            recentEvents={recentEvents}
          />
        </main>
      </div>
    </>
  );
}

// ── Page Router (Phase 1 placeholder pages) ─────────────

function PageRouter(props: {
  page: PageKey;
  libraryId: string | null;
  libraries: ReturnType<typeof useBootstrap>["libraries"];
  bootstrap: ReturnType<typeof useBootstrap>["bootstrap"];
  bsStatus: string;
  bsError: string | null;
  taskSummary: ReturnType<typeof useBootstrap>["taskSummary"];
  sseConnected: boolean;
  recentEvents: ReturnType<typeof useBootstrap>["recentEvents"];
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
      return <PlaceholderPage title="未知页面" />;
  }
}

// ── Placeholder Pages ───────────────────────────────────
// These will be replaced with real implementations in Phase 2+.

function PlaceholderPage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="page-placeholder">
      <h2>{title}</h2>
      <p className="placeholder-hint">{subtitle || "Phase 1 — 页面待实现"}</p>
    </div>
  );
}

function SettingsPagePlaceholder() {
  return (
    <div className="page-placeholder">
      <h2>设置</h2>
      <p className="placeholder-hint">Phase 2 — 设置页（左侧分组导航 + 右侧表单区）</p>
      <p className="placeholder-hint">分组：常规 · 媒体库 · 搜刮 · 播放 · 高级 · 关于</p>
    </div>
  );
}

function LibraryManagementPagePlaceholder({
  libraries,
}: {
  libraries: ReturnType<typeof useBootstrap>["libraries"];
}) {
  return (
    <div className="page-content-section">
      <h2 className="page-title">库管理</h2>
      <p className="page-subtitle">
        管理媒体库 · {libraries.length} 个库
      </p>
      {libraries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <p>还没有媒体库</p>
          <p className="placeholder-hint">点击"新建"创建第一个媒体库</p>
        </div>
      ) : (
        <div className="library-cards">
          {libraries.map((lib) => (
            <div key={lib.libraryId} className="library-card">
              <div className="library-card-name">{lib.name}</div>
              <div className="library-card-path" title={lib.path}>{lib.path}</div>
              <div className="library-card-stats">
                <span>{lib.videoCount} 部影片</span>
                {lib.hasRunningTask && <span className="running-badge">扫描中</span>}
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
  const lib = libraries.find((l) => l.libraryId === libraryId);
  return (
    <div className="page-placeholder">
      <h2>{lib?.name || "媒体库"}</h2>
      <p className="placeholder-hint">
        Phase 2 — 单库内容页（筛选 · 排序 · 分页 · 影片卡片）
      </p>
      {lib && (
        <p className="placeholder-hint">
          {lib.videoCount} 部影片 · {lib.path}
        </p>
      )}
    </div>
  );
}

function FavoritesPagePlaceholder() {
  return (
    <PlaceholderPage
      title="喜欢"
      subtitle="Phase 2 — 收藏影片聚合页（统一结果区交互）"
    />
  );
}

function ActorsPagePlaceholder() {
  return (
    <PlaceholderPage
      title="演员"
      subtitle="Phase 2 — 演员聚合列表页（搜索 · 排序 · 分页）"
    />
  );
}

function ActorDetailPagePlaceholder() {
  return (
    <PlaceholderPage
      title="演员详情"
      subtitle="Phase 2 — 演员详情页（头部信息 · 关联影片 · 返回链路）"
    />
  );
}

function VideoDetailPagePlaceholder() {
  return (
    <PlaceholderPage
      title="影片详情"
      subtitle="Phase 2 — 影片详情页（详情信息 · 播放入口 · 返回恢复）"
    />
  );
}

export default App;
