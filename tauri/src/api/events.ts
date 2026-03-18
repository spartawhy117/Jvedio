import type { WorkerEventEnvelopeDto } from "./types";

export type EventCallback = (envelope: WorkerEventEnvelopeDto) => void;

export interface EventStreamOptions {
  baseUrl: string;
  topic?: string;
  onEvent: EventCallback;
  onError?: (error: Event) => void;
  onOpen?: () => void;
}

/**
 * Connect to the Worker SSE event stream (GET /api/events).
 *
 * Returns a cleanup function that closes the EventSource.
 *
 * SSE protocol from Worker:
 *   - id: <eventId>
 *   - event: <eventName>
 *   - data: <WorkerEventEnvelopeDto JSON>
 *
 * On connect, Worker immediately sends:
 *   1. worker.ready
 *   2. task.summary.changed
 */
export function connectEventStream(options: EventStreamOptions): () => void {
  const { baseUrl, topic, onEvent, onError, onOpen } = options;

  let url = `${baseUrl}/api/events`;
  if (topic) {
    url += `?topic=${encodeURIComponent(topic)}`;
  }

  console.log("[event-stream] connecting to:", url);

  const es = new EventSource(url);

  es.onopen = () => {
    console.log("[event-stream] connected");
    onOpen?.();
  };

  es.onerror = (err) => {
    console.error("[event-stream] error:", err);
    onError?.(err);
  };

  // The Worker sends named events (event: <name>).
  // We need to listen to specific event types we care about.
  // But since event names are dynamic, we use the generic onmessage
  // as a fallback won't work (named events don't trigger onmessage).
  // Instead, we listen for the known event names.

  const knownEvents = [
    "worker.ready",
    "task.summary.changed",
    "task.created",
    "task.completed",
    "task.failed",
    "task.progress",
    "library.changed",
    "settings.changed",
  ];

  const handler = (e: MessageEvent) => {
    try {
      const envelope: WorkerEventEnvelopeDto = JSON.parse(e.data);
      onEvent(envelope);
    } catch (parseError) {
      console.warn("[event-stream] failed to parse event data:", e.data, parseError);
    }
  };

  for (const eventName of knownEvents) {
    es.addEventListener(eventName, handler);
  }

  // Also listen for unnamed messages as fallback
  es.onmessage = handler;

  return () => {
    console.log("[event-stream] closing");
    es.close();
  };
}
