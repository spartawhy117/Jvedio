import { useWorker } from "../contexts/WorkerContext";
import { useBootstrap } from "../contexts/BootstrapContext";
import "./WorkerStatusOverlay.css";

/**
 * Full-screen overlay covering three pre-ready states:
 *
 * 1. Worker starting (process not yet ready)
 * 2. Bootstrap loading (Worker ready, fetching /api/app/bootstrap)
 * 3. Error (Worker failed to start, OR bootstrap fetch failed)
 *
 * Auto-hides when Worker is ready AND bootstrap is loaded.
 */
export function WorkerStatusOverlay() {
  const { status: workerStatus, error: workerError } = useWorker();
  const { status: bsStatus, error: bsError, retry } = useBootstrap();

  // Fully ready — hide overlay
  if (workerStatus === "ready" && bsStatus === "ready") {
    return null;
  }

  return (
    <div className="worker-overlay">
      <div className="worker-overlay-card">
        {/* State 1: Worker starting */}
        {workerStatus === "starting" && (
          <>
            <div className="worker-spinner" />
            <h2>正在启动引擎…</h2>
            <p className="worker-hint">Jvedio Worker 正在初始化，请稍候</p>
          </>
        )}

        {/* State 2: Worker error */}
        {workerStatus === "error" && (
          <>
            <div className="worker-error-icon">⚠</div>
            <h2>引擎启动失败</h2>
            <p className="worker-error-msg">{workerError}</p>
            <p className="worker-hint">请检查 Worker 是否可用后重启应用</p>
          </>
        )}

        {/* State 3: Worker ready, bootstrap loading */}
        {workerStatus === "ready" && bsStatus === "loading" && (
          <>
            <div className="worker-spinner" />
            <h2>正在加载数据…</h2>
            <p className="worker-hint">正在获取应用配置与媒体库信息</p>
          </>
        )}

        {/* State 4: Worker ready, bootstrap error */}
        {workerStatus === "ready" && bsStatus === "error" && (
          <>
            <div className="worker-error-icon">⚠</div>
            <h2>数据加载失败</h2>
            <p className="worker-error-msg">{bsError}</p>
            <button className="retry-button" onClick={retry}>
              重试
            </button>
          </>
        )}

        {/* State 5: Worker ready, bootstrap idle (brief flash) */}
        {workerStatus === "ready" && bsStatus === "idle" && (
          <>
            <div className="worker-spinner" />
            <h2>正在准备…</h2>
          </>
        )}
      </div>
    </div>
  );
}
