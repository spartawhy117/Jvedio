/**
 * useSSESubscription — per-event SSE subscription hook.
 *
 * Allows individual pages/components to subscribe to specific SSE events
 * with typed callbacks. Subscriptions are automatically cleaned up on unmount.
 *
 * Usage:
 *   useSSESubscription("library.changed", (data) => {
 *     // handle library change
 *   });
 *
 * The event bus is a singleton shared across the app:
 *   - BootstrapProvider dispatches events into the bus
 *   - Any component can subscribe via useSSESubscription
 */

import { useEffect, useRef } from "react";
import type { WorkerEventEnvelopeDto } from "../api/types";

// ── Event bus (singleton) ───────────────────────────────

type EventHandler = (envelope: WorkerEventEnvelopeDto) => void;

const eventBus = new Map<string, Set<EventHandler>>();

/** Subscribe to a specific SSE event name */
function subscribe(eventName: string, handler: EventHandler): () => void {
  if (!eventBus.has(eventName)) {
    eventBus.set(eventName, new Set());
  }
  const handlers = eventBus.get(eventName)!;
  handlers.add(handler);

  return () => {
    handlers.delete(handler);
    if (handlers.size === 0) {
      eventBus.delete(eventName);
    }
  };
}

/** Subscribe to all events (wildcard) */
function subscribeAll(handler: EventHandler): () => void {
  return subscribe("*", handler);
}

/**
 * Dispatch an SSE event into the bus.
 * Called by BootstrapProvider when it receives SSE events.
 */
export function dispatchSSEEvent(envelope: WorkerEventEnvelopeDto): void {
  // Notify specific event subscribers
  const handlers = eventBus.get(envelope.eventName);
  if (handlers) {
    handlers.forEach((h) => {
      try {
        h(envelope);
      } catch (err) {
        console.error(`[SSE-bus] handler error for ${envelope.eventName}:`, err);
      }
    });
  }

  // Notify wildcard subscribers
  const wildcardHandlers = eventBus.get("*");
  if (wildcardHandlers) {
    wildcardHandlers.forEach((h) => {
      try {
        h(envelope);
      } catch (err) {
        console.error("[SSE-bus] wildcard handler error:", err);
      }
    });
  }
}

// ── Hook ────────────────────────────────────────────────

/**
 * Subscribe to a specific SSE event.
 * The handler is automatically unsubscribed on unmount.
 *
 * @param eventName  The SSE event name to subscribe to (e.g. "library.changed").
 *                   Pass "*" to receive all events.
 * @param handler    Callback receiving the full WorkerEventEnvelopeDto.
 * @param enabled    Optional flag to enable/disable the subscription (default true).
 */
export function useSSESubscription(
  eventName: string,
  handler: (envelope: WorkerEventEnvelopeDto) => void,
  enabled: boolean = true
): void {
  // Use ref to keep handler stable across renders without re-subscribing
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const stableHandler: EventHandler = (envelope) => {
      handlerRef.current(envelope);
    };

    const cleanup = eventName === "*"
      ? subscribeAll(stableHandler)
      : subscribe(eventName, stableHandler);

    return cleanup;
  }, [eventName, enabled]);
}

// ── Convenience hooks for common events ─────────────────

/**
 * Subscribe to library.changed events.
 * Typically used to refresh the library list or re-query library data.
 */
export function useOnLibraryChanged(
  handler: (envelope: WorkerEventEnvelopeDto) => void,
  enabled: boolean = true
): void {
  useSSESubscription("library.changed", handler, enabled);
}

/**
 * Subscribe to settings.changed events.
 * Typically used to re-read settings and update UI (theme, language, etc.).
 */
export function useOnSettingsChanged(
  handler: (envelope: WorkerEventEnvelopeDto) => void,
  enabled: boolean = true
): void {
  useSSESubscription("settings.changed", handler, enabled);
}

/**
 * Subscribe to all task-related events:
 *  task.created, task.completed, task.failed, task.progress, task.summary.changed
 */
export function useOnTaskEvent(
  handler: (envelope: WorkerEventEnvelopeDto) => void,
  enabled: boolean = true
): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const stableHandler: EventHandler = (envelope) => {
      handlerRef.current(envelope);
    };

    const taskEvents = [
      "task.created",
      "task.completed",
      "task.failed",
      "task.progress",
      "task.summary.changed",
    ];

    const cleanups = taskEvents.map((name) => subscribe(name, stableHandler));

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [enabled]);
}
