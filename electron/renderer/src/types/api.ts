export interface ApiErrorDto {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
  details?: unknown;
  logPath?: string | null;
}

export interface ApiResponse<TData> {
  success: boolean;
  requestId: string;
  timestamp: string;
  data: TData | null;
  error: ApiErrorDto | null;
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

export interface LibraryListItemDto {
  libraryId: string;
  name: string;
  path: string;
  scanPaths: readonly string[];
  videoCount: number;
  lastScanAt: string | null;
  lastScrapeAt: string | null;
  hasRunningTask: boolean;
}

export interface TaskSummaryDto {
  runningCount: number;
  queuedCount: number;
  failedCount: number;
  completedTodayCount: number;
  lastUpdatedUtc: string;
}

export interface LibraryChangedEventDto {
  action: string;
  library: LibraryListItemDto;
  occurredAtUtc: string;
}

export interface TaskSummaryChangedEventDto {
  occurredAtUtc: string;
  summary: TaskSummaryDto;
}

export interface WorkerEventEnvelopeDto<TData = unknown> {
  data: TData;
  eventId: string;
  eventName: string;
  occurredAtUtc: string;
  topic: string;
}

export interface GetBootstrapResponse {
  app: AppInfoDto;
  shell: ShellBootstrapDto;
  libraries: readonly LibraryListItemDto[];
  taskSummary: TaskSummaryDto;
  worker: WorkerStatusDto;
}

export interface GetLibrariesResponse {
  libraries: readonly LibraryListItemDto[];
  totalCount: number;
}

export interface CreateLibraryRequest {
  name: string;
  path?: string;
  scanPaths: readonly string[];
}

export interface CreateLibraryResponse {
  library: LibraryListItemDto;
  createdAtUtc: string;
}

export interface UpdateLibraryRequest {
  name?: string;
  scanPaths: readonly string[];
}

export interface UpdateLibraryResponse {
  library: LibraryListItemDto;
  updatedAtUtc: string;
}

export interface DeleteLibraryResponse {
  libraryId: string;
  deletedAtUtc: string;
}

export interface StartLibraryScanRequest {
  forceRescan: boolean;
  organizeBeforeScan: boolean;
  paths: readonly string[];
}

export interface StartLibraryScrapeRequest {
  downloadActorAvatars: boolean;
  forceRefreshMetadata: boolean;
  mode: string;
  videoIds: readonly string[];
  writeSidecars: boolean;
}

export interface WorkerTaskDto {
  completedAtUtc: string | null;
  createdAtUtc: string;
  errorMessage: string | null;
  id: string;
  libraryId: string | null;
  libraryName: string | null;
  percent: number;
  progressCurrent: number;
  progressTotal: number;
  stage: string;
  startedAtUtc: string | null;
  status: string;
  summary: string;
  type: string;
  updatedAtUtc: string;
}

export interface StartLibraryScanResponse {
  acceptedAtUtc: string;
  task: WorkerTaskDto;
}

export interface StartLibraryScrapeResponse {
  acceptedAtUtc: string;
  task: WorkerTaskDto;
}

export interface GetTasksResponse {
  summary: TaskSummaryDto;
  tasks: readonly WorkerTaskDto[];
}
