import { useWorker } from "../contexts/WorkerContext";
import "./WorkerStatusOverlay.css";

/**
 * Full-screen overlay shown when Worker is not yet ready.
 * Renders nothing when status === "ready".
 */
export function WorkerStatusOverlay() {
  const { status, error } = useWorker();

  if (status === "ready") {
    return null;
  }

  return (
    <div className="worker-overlay">
      <div className="worker-overlay-card">
        {status === "starting" && (
          <>
            <div className="worker-spinner" />
            <h2>正在启动引擎…</h2>
            <p className="worker-hint">Jvedio Worker 正在初始化，请稍候</p>
          </>
        )}
        {status === "error" && (
          <>
            <div className="worker-error-icon">⚠</div>
            <h2>引擎启动失败</h2>
            <p className="worker-error-msg">{error}</p>
            <p className="worker-hint">请检查 Worker 是否可用后重启应用</p>
          </>
        )}
      </div>
    </div>
  );
}
