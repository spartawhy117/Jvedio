import { useCallback, useEffect, useRef } from "react";
import { useBootstrap } from "../contexts/BootstrapContext";
import { useWorker } from "../contexts/WorkerContext";

export const STARTUP_TIMEOUT_EVENT = "jvedio-startup-timeout";
const STARTUP_TIMEOUT_MS = 15_000;

type StartupRevealCommand = "mark_main_window_ready" | "reveal_main_window_for_error";

function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
}

export function StartupReadyBridge() {
  const { status: workerStatus } = useWorker();
  const { status: bootstrapStatus } = useBootstrap();

  const isTauri = useRef(isTauriEnvironment());
  const hasRevealedWindow = useRef(false);

  const invokeRevealCommand = useCallback(async (command: StartupRevealCommand, reason: string) => {
    if (!isTauri.current || hasRevealedWindow.current) {
      return;
    }

    hasRevealedWindow.current = true;

    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke(command);
      console.log(`[StartupReadyBridge] ${command} (${reason})`);
    } catch (error) {
      console.error(`[StartupReadyBridge] ${command} failed:`, error);
    }
  }, []);

  useEffect(() => {
    if (!isTauri.current || hasRevealedWindow.current) {
      return;
    }

    if (workerStatus === "ready" && bootstrapStatus === "ready") {
      void invokeRevealCommand("mark_main_window_ready", "ready");
      return;
    }

    if (workerStatus === "error" || (workerStatus === "ready" && bootstrapStatus === "error")) {
      void invokeRevealCommand("reveal_main_window_for_error", "error");
    }
  }, [bootstrapStatus, invokeRevealCommand, workerStatus]);

  useEffect(() => {
    if (!isTauri.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (hasRevealedWindow.current) {
        return;
      }

      window.dispatchEvent(new CustomEvent(STARTUP_TIMEOUT_EVENT));
      void invokeRevealCommand("reveal_main_window_for_error", "timeout");
    }, STARTUP_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [invokeRevealCommand]);

  return null;
}
