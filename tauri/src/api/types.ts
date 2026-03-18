// ── API Response Envelope ───────────────────────────────
// Mirrors: Jvedio.Contracts.Common.ApiResponse<T>

export interface ApiResponse<T> {
  success: boolean;
  requestId: string;
  timestamp: string;
  data: T | null;
  error: ApiErrorDto | null;
}

export interface ApiErrorDto {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  details: unknown;
  logPath: string | null;
}

// ── Bootstrap ───────────────────────────────────────────
// Mirrors: Jvedio.Contracts.App.GetBootstrapResponse

export interface GetBootstrapResponse {
  app: AppInfoDto;
  shell: ShellBootstrapDto;
  libraries: LibraryListItemDto[];
  taskSummary: TaskSummaryDto;
  worker: WorkerStatusDto;
}

export interface AppInfoDto {
  name: string;
  version: string;
}

export interface ShellBootstrapDto {
  startRoute: string;
  supportsDynamicWorkerPort: boolean;
  theme: string;
  taskDrawerEnabled: boolean;
}

export interface WorkerStatusDto {
  status: string;
  baseUrl: string;
  startedAtUtc: string;
  healthy: boolean;
  eventStreamPath: string;
}

// ── Libraries ───────────────────────────────────────────
// Mirrors: Jvedio.Contracts.Libraries.LibraryListItemDto

export interface LibraryListItemDto {
  libraryId: string;
  name: string;
  path: string;
  scanPaths: string[];
  videoCount: number;
  lastScanAt: string | null;
  lastScrapeAt: string | null;
  hasRunningTask: boolean;
}

// ── Tasks ───────────────────────────────────────────────
// Mirrors: Jvedio.Contracts.Tasks.TaskSummaryDto

export interface TaskSummaryDto {
  runningCount: number;
  queuedCount: number;
  failedCount: number;
  completedTodayCount: number;
  lastUpdatedUtc: string;
}

export interface TaskSummaryChangedEvent {
  occurredAtUtc: string;
  summary: TaskSummaryDto;
}

// ── Worker Event Envelope ───────────────────────────────
// Mirrors: Jvedio.Contracts.Common.WorkerEventEnvelopeDto

export interface WorkerEventEnvelopeDto {
  data: unknown;
  eventId: string;
  eventName: string;
  occurredAtUtc: string;
  topic: string;
}
