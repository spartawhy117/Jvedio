import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("dialogs");
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
            <h2>{t("worker.starting")}</h2>
            <p className="worker-hint">{t("worker.startingHint")}</p>
          </>
        )}

        {/* State 2: Worker error */}
        {workerStatus === "error" && (
          <>
            <div className="worker-error-icon">⚠</div>
            <h2>{t("worker.startFailed")}</h2>
            <p className="worker-error-msg">{workerError}</p>
            <p className="worker-hint">{t("worker.startFailedHint")}</p>
          </>
        )}

        {/* State 3: Worker ready, bootstrap loading */}
        {workerStatus === "ready" && bsStatus === "loading" && (
          <>
            <div className="worker-spinner" />
            <h2>{t("worker.loadingData")}</h2>
            <p className="worker-hint">{t("worker.loadingDataHint")}</p>
          </>
        )}

        {/* State 4: Worker ready, bootstrap error */}
        {workerStatus === "ready" && bsStatus === "error" && (
          <>
            <div className="worker-error-icon">⚠</div>
            <h2>{t("worker.loadFailed")}</h2>
            <p className="worker-error-msg">{bsError}</p>
            <button className="retry-button" onClick={retry}>
              {t("../common:retry", { ns: "common" })}
            </button>
          </>
        )}

        {/* State 5: Worker ready, bootstrap idle (brief flash) */}
        {workerStatus === "ready" && bsStatus === "idle" && (
          <>
            <div className="worker-spinner" />
            <h2>{t("worker.preparing")}</h2>
          </>
        )}
      </div>
    </div>
  );
}
