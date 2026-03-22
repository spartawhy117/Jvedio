import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorker } from "../contexts/WorkerContext";
import { useBootstrap } from "../contexts/BootstrapContext";
import { STARTUP_TIMEOUT_EVENT } from "./StartupReadyBridge";
import { AppIcon } from "./shared/AppIcon";
import "./WorkerStatusOverlay.css";

/**
 * Error-first startup overlay.
 *
 * Normal successful startup is now carried by the native splash window.
 * This overlay stays in the React tree only for:
 * 1. Worker startup errors
 * 2. Bootstrap fetch errors
 * 3. Startup timeout fallback after the main window is force-revealed
 */
export function WorkerStatusOverlay() {
  const { t } = useTranslation("dialogs");
  const { status: workerStatus, error: workerError } = useWorker();
  const { status: bsStatus, error: bsError, retry } = useBootstrap();
  const [startupTimedOut, setStartupTimedOut] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleTimeout = () => {
      setStartupTimedOut(true);
    };

    window.addEventListener(STARTUP_TIMEOUT_EVENT, handleTimeout);
    return () => {
      window.removeEventListener(STARTUP_TIMEOUT_EVENT, handleTimeout);
    };
  }, []);

  useEffect(() => {
    if (workerStatus === "ready" && bsStatus === "ready") {
      setStartupTimedOut(false);
    }
  }, [bsStatus, workerStatus]);

  const showWorkerError = workerStatus === "error";
  const showBootstrapError = workerStatus === "ready" && bsStatus === "error";
  const showTimeoutFallback = startupTimedOut && !showWorkerError && !showBootstrapError;

  if (!showWorkerError && !showBootstrapError && !showTimeoutFallback) {
    return null;
  }

  return (
    <div className="worker-overlay">
      <div className="worker-overlay-card">
        {showWorkerError && (
          <>
            <div className="worker-error-icon"><AppIcon name="failed" size={28} /></div>
            <h2>{t("worker.startFailed")}</h2>
            <p className="worker-error-msg">{workerError}</p>
            <p className="worker-hint">{t("worker.startFailedHint")}</p>
          </>
        )}

        {showBootstrapError && (
          <>
            <div className="worker-error-icon"><AppIcon name="failed" size={28} /></div>
            <h2>{t("worker.loadFailed")}</h2>
            <p className="worker-error-msg">{bsError}</p>
            <button className="retry-button" onClick={retry}>
              {t("../common:retry", { ns: "common" })}
            </button>
          </>
        )}

        {showTimeoutFallback && (
          <>
            <div className="worker-error-icon"><AppIcon name="failed" size={28} /></div>
            <h2>{t("worker.startTimeout")}</h2>
            <p className="worker-hint">{t("worker.startTimeoutHint")}</p>
          </>
        )}
      </div>
    </div>
  );
}
