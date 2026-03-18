/**
 * GlobalToast — lightweight toast notification system.
 *
 * Provides a global toast queue that any component can push messages into.
 * Toasts auto-dismiss after a configurable duration.
 *
 * Usage:
 *   import { showToast } from "../components/GlobalToast";
 *   showToast({ message: "Saved!", type: "success" });
 */

import { useState, useEffect, useCallback, useRef } from "react";
import "./GlobalToast.css";

// ── Types ───────────────────────────────────────────────

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

export interface ShowToastOptions {
  message: string;
  type?: ToastType;
  /** Duration in ms (default 3000) */
  duration?: number;
}

// ── Global toast bus ────────────────────────────────────

type ToastListener = (toast: ToastMessage) => void;

let _listener: ToastListener | null = null;
let _counter = 0;

/** Push a toast from anywhere in the app */
export function showToast(options: ShowToastOptions): void {
  const toast: ToastMessage = {
    id: `toast-${++_counter}-${Date.now()}`,
    message: options.message,
    type: options.type ?? "info",
    duration: options.duration ?? 3000,
  };

  if (_listener) {
    _listener(toast);
  } else {
    console.warn("[GlobalToast] No toast provider mounted, dropping:", toast.message);
  }
}

// ── Component ───────────────────────────────────────────

const MAX_TOASTS = 5;

export function GlobalToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Register as the global listener
  useEffect(() => {
    _listener = (toast) => {
      setToasts((prev) => {
        const next = [...prev, toast];
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });
    };

    return () => {
      _listener = null;
    };
  }, []);

  // Auto-dismiss timers
  useEffect(() => {
    for (const toast of toasts) {
      if (!timersRef.current.has(toast.id)) {
        const timer = setTimeout(() => {
          dismissToast(toast.id);
        }, toast.duration);
        timersRef.current.set(toast.id, timer);
      }
    }
  }, [toasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
          onClick={() => dismissToast(toast.id)}
          role="alert"
        >
          <span className="toast-icon">
            {toast.type === "success" && "✓"}
            {toast.type === "error" && "✗"}
            {toast.type === "warning" && "⚠"}
            {toast.type === "info" && "ℹ"}
          </span>
          <span className="toast-message">{toast.message}</span>
          <button className="toast-close" onClick={() => dismissToast(toast.id)}>×</button>
        </div>
      ))}
    </div>
  );
}
