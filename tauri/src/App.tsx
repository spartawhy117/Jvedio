import { useState } from "react";
import { useWorker } from "./contexts/WorkerContext";
import { useBootstrap } from "./contexts/BootstrapContext";
import { WorkerStatusOverlay } from "./components/WorkerStatusOverlay";
import "./App.css";

type PageKey =
  | "settings"
  | "library-management"
  | "favorites"
  | "actors"
  | "library";

interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "settings", label: "设置", icon: "⚙" },
  { key: "library-management", label: "库管理", icon: "📁" },
  { key: "favorites", label: "喜欢", icon: "❤" },
  { key: "actors", label: "演员", icon: "👤" },
];

function App() {
  const [activePage, setActivePage] = useState<PageKey>("library-management");
  const { status: workerStatus } = useWorker();
  const { bootstrap, taskSummary, libraries, sseConnected, recentEvents, status: bsStatus, error: bsError } = useBootstrap();

  return (
    <>
      <WorkerStatusOverlay />

      <div className="main-shell">
        {/* 左侧导航 */}
        <aside className="nav-sidebar">
          {/* 品牌区 */}
          <div className="brand-area">
            <span className="brand-icon">🎬</span>
            <span className="brand-name">
              {bootstrap?.app.name || "Jvedio"}{" "}
              {bootstrap?.app.version ? `v${bootstrap.app.version}` : ""}
            </span>
          </div>

          {/* 一级导航 */}
          <nav className="primary-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                className={`nav-item ${activePage === item.key ? "active" : ""}`}
                onClick={() => setActivePage(item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* 影视库区 — 从 bootstrap 填充 */}
          <div className="library-nav-section">
            <div className="section-title">影视库</div>
            {libraries.length === 0 ? (
              <div className="section-empty">暂无媒体库</div>
            ) : (
              <div className="library-list">
                {libraries.map((lib) => (
                  <button
                    key={lib.libraryId}
                    className={`nav-item library-item ${activePage === "library" ? "active" : ""}`}
                    onClick={() => setActivePage("library")}
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
              <span className="task-badge" title="运行中">▶ {taskSummary.runningCount}</span>
              <span className="task-badge" title="队列中">⏳ {taskSummary.queuedCount}</span>
              <span className="task-badge" title="今日完成">✅ {taskSummary.completedTodayCount}</span>
              {taskSummary.failedCount > 0 && (
                <span className="task-badge failed" title="失败">❌ {taskSummary.failedCount}</span>
              )}
            </div>
          )}

          {/* Worker + SSE 状态指示器 */}
          <div className="worker-indicator">
            <span
              className={`worker-dot ${workerStatus === "ready" ? "ready" : workerStatus === "error" ? "error" : "starting"}`}
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

        {/* 右侧内容区 */}
        <main className="content-area">
          <PageContent
            page={activePage}
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

// ── Page content (Phase 1 debug view) ───────────────────

function PageContent({
  page,
  bootstrap,
  bsStatus,
  bsError,
  taskSummary,
  sseConnected,
  recentEvents,
}: {
  page: PageKey;
  bootstrap: ReturnType<typeof useBootstrap>["bootstrap"];
  bsStatus: string;
  bsError: string | null;
  taskSummary: ReturnType<typeof useBootstrap>["taskSummary"];
  sseConnected: boolean;
  recentEvents: ReturnType<typeof useBootstrap>["recentEvents"];
}) {
  const titles: Record<PageKey, string> = {
    settings: "设置",
    "library-management": "库管理",
    favorites: "喜欢",
    actors: "演员",
    library: "媒体库",
  };

  return (
    <div className="page-content-debug">
      <h2 className="page-title">{titles[page]}</h2>
      <p className="page-subtitle">Phase 1.3 — Bootstrap + SSE 验证</p>

      {/* Bootstrap status */}
      <section className="debug-section">
        <h3>Bootstrap</h3>
        <div className="debug-grid">
          <DebugField label="状态" value={bsStatus} />
          {bsError && <DebugField label="错误" value={bsError} error />}
          {bootstrap && (
            <>
              <DebugField label="应用" value={`${bootstrap.app.name} v${bootstrap.app.version}`} />
              <DebugField label="主题" value={bootstrap.shell.theme} />
              <DebugField label="起始路由" value={bootstrap.shell.startRoute} />
              <DebugField label="动态端口" value={bootstrap.shell.supportsDynamicWorkerPort ? "✅" : "❌"} />
              <DebugField label="Worker 状态" value={`${bootstrap.worker.status} (healthy: ${bootstrap.worker.healthy})`} />
              <DebugField label="Worker URL" value={bootstrap.worker.baseUrl} />
              <DebugField label="媒体库数量" value={String(bootstrap.libraries.length)} />
            </>
          )}
        </div>
      </section>

      {/* Task summary (live via SSE) */}
      <section className="debug-section">
        <h3>任务摘要 <span className="live-badge">{sseConnected ? "🟢 LIVE" : "⚪ OFFLINE"}</span></h3>
        {taskSummary ? (
          <div className="debug-grid">
            <DebugField label="运行中" value={String(taskSummary.runningCount)} />
            <DebugField label="队列中" value={String(taskSummary.queuedCount)} />
            <DebugField label="今日完成" value={String(taskSummary.completedTodayCount)} />
            <DebugField label="失败" value={String(taskSummary.failedCount)} />
          </div>
        ) : (
          <p className="debug-empty">等待数据…</p>
        )}
      </section>

      {/* Recent SSE events */}
      <section className="debug-section">
        <h3>最近 SSE 事件 ({recentEvents.length})</h3>
        {recentEvents.length === 0 ? (
          <p className="debug-empty">暂无事件</p>
        ) : (
          <div className="event-log">
            {recentEvents.slice(0, 20).map((evt) => (
              <div key={evt.eventId} className="event-row">
                <span className="event-name">{evt.eventName}</span>
                <span className="event-topic">{evt.topic}</span>
                <span className="event-time">
                  {new Date(evt.occurredAtUtc).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DebugField({ label, value, error }: { label: string; value: string; error?: boolean }) {
  return (
    <div className="debug-field">
      <span className="debug-label">{label}</span>
      <span className={`debug-value ${error ? "debug-error" : ""}`}>{value}</span>
    </div>
  );
}

export default App;
