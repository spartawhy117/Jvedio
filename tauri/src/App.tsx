import { useState } from "react";
import { useWorker } from "./contexts/WorkerContext";
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
  const { status, baseUrl } = useWorker();

  return (
    <>
      {/* Worker not ready → overlay */}
      <WorkerStatusOverlay />

      <div className="main-shell">
        {/* 左侧导航 */}
        <aside className="nav-sidebar">
          {/* 品牌区 */}
          <div className="brand-area">
            <span className="brand-icon">🎬</span>
            <span className="brand-name">Jvedio Next</span>
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

          {/* 影视库区 */}
          <div className="library-nav-section">
            <div className="section-title">影视库</div>
            <div className="section-empty">暂无媒体库</div>
          </div>

          {/* Worker 状态指示器（调试用，后续可移除） */}
          <div className="worker-indicator">
            <span
              className={`worker-dot ${status === "ready" ? "ready" : status === "error" ? "error" : "starting"}`}
            />
            <span className="worker-status-text">
              {status === "ready"
                ? "引擎已连接"
                : status === "error"
                  ? "引擎异常"
                  : "正在连接…"}
            </span>
          </div>
        </aside>

        {/* 右侧内容区 */}
        <main className="content-area">
          <PagePlaceholder page={activePage} baseUrl={baseUrl} />
        </main>
      </div>
    </>
  );
}

function PagePlaceholder({
  page,
  baseUrl,
}: {
  page: PageKey;
  baseUrl: string | null;
}) {
  const titles: Record<PageKey, string> = {
    settings: "设置",
    "library-management": "库管理",
    favorites: "喜欢",
    actors: "演员",
    library: "媒体库",
  };

  return (
    <div className="page-placeholder">
      <h2>{titles[page]}</h2>
      <p className="placeholder-hint">
        Phase 1 — MainShell Spike · 页面待实现
      </p>
      {baseUrl && (
        <p className="placeholder-hint" style={{ marginTop: 8 }}>
          Worker: <code>{baseUrl}</code>
        </p>
      )}
    </div>
  );
}

export default App;
