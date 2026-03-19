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
// Mirrors: Jvedio.Contracts.Libraries.*

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

export interface GetLibrariesResponse {
  libraries: LibraryListItemDto[];
  totalCount: number;
}

export interface CreateLibraryRequest {
  name: string;
  scanPaths: string[];
}

export interface CreateLibraryResponse {
  libraryId: string;
  name: string;
}

export interface UpdateLibraryRequest {
  name?: string;
  scanPaths?: string[];
}

export interface UpdateLibraryResponse {
  libraryId: string;
  name: string;
}

export interface DeleteLibraryResponse {
  libraryId: string;
  deleted: boolean;
}

export interface StartLibraryScanRequest {
  forceRescan?: boolean;
}

export interface StartLibraryScanResponse {
  taskId: string;
  libraryId: string;
}

export interface StartLibraryScrapeRequest {
  videoIds?: string[];
  mode?: "missing-only" | "all";
  forceRefreshMetadata?: boolean;
  writeSidecars?: boolean;
  downloadActorAvatars?: boolean;
}

export interface StartLibraryScrapeResponse {
  taskId: string;
  libraryId: string;
}

// ── Videos ──────────────────────────────────────────────
// Mirrors: Jvedio.Contracts.Videos.*

export interface VideoListItemDto {
  videoId: string;
  vid: string;
  title: string;
  displayTitle: string;
  path: string;
  libraryId: string;
  scrapeStatus: "none" | "full" | "failed";
  releaseDate: string | null;
  durationSeconds: number;
  rating: number;
  viewCount: number;
  isFavorite: boolean;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  hasPoster: boolean;
  hasThumb: boolean;
  hasFanart: boolean;
  hasNfo: boolean;
  hasMissingAssets: boolean;
}

export interface GetLibraryVideosRequest {
  keyword: string;
  sortBy: string;
  sortOrder: string;
  pageIndex: number;
  pageSize: number;
  missingSidecarOnly?: boolean;
  scrapeStatus?: string;
}

export interface GetLibraryVideosResponse {
  items: VideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  availableViewModes: string[];
}

export interface GetFavoriteVideosRequest {
  keyword: string;
  sortBy: string;
  sortOrder: string;
  pageIndex: number;
  pageSize: number;
  missingSidecarOnly?: boolean;
}

export interface GetFavoriteVideosResponse {
  items: VideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface VideoDetailDto {
  videoId: string;
  vid: string;
  title: string;
  displayTitle: string;
  path: string;
  libraryId: string;
  libraryName: string;
  scrapeStatus: "none" | "full" | "failed";
  releaseDate: string | null;
  durationSeconds: number;
  rating: number;
  viewCount: number;
  isFavorite: boolean;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  director: string;
  studio: string;
  series: string;
  outline: string;
  plot: string;
  webUrl: string;
  actors: VideoActorDto[];
  playback: PlaybackAvailabilityDto;
  sidecars: SidecarStateDto;
}

export interface VideoActorDto {
  actorId: string;
  name: string;
  avatarPath: string | null;
}

export interface PlaybackAvailabilityDto {
  canPlay: boolean;
  playerPath: string;
  useSystemDefault: boolean;
  reason: string;
}

export interface VideoAssetStateDto {
  exists: boolean;
  path: string;
}

export interface SidecarStateDto {
  hasMissingAssets: boolean;
  nfo: VideoAssetStateDto;
  poster: VideoAssetStateDto;
  thumb: VideoAssetStateDto;
  fanart: VideoAssetStateDto;
}

export interface GetVideoDetailResponse {
  video: VideoDetailDto | null;
}

export interface PlayVideoRequest {
  playerPath?: string;
}

export interface PlayVideoResponse {
  played: boolean;
  playerUsed: string;
}

export interface ToggleFavoriteResponse {
  videoId: string;
  isFavorite: boolean;
  favoriteCount: number;
}

export interface DeleteVideoResponse {
  videoId: string;
  deleted: boolean;
  fileDeleted: boolean;
}

export interface BatchOperationRequest {
  videoIds: string[];
}

export interface BatchOperationResponse {
  successCount: number;
  failedCount: number;
  failedVideoIds: string[];
}

// ── Video Groups (Categories / Series) ──────────────────

export interface VideoGroupDto {
  name: string;
  videoCount: number;
}

export type GetVideoGroupsResponse = VideoGroupDto[];

export interface GetVideoGroupVideosRequest {
  keyword: string;
  sortBy: string;
  sortOrder: string;
  pageIndex: number;
  pageSize: number;
  missingSidecarOnly?: boolean;
}

export interface GetVideoGroupVideosResponse {
  items: VideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

// ── Actors ──────────────────────────────────────────────
// Mirrors: Jvedio.Contracts.Actors.*

export interface ActorListItemDto {
  actorId: string;
  name: string;
  avatarPath: string | null;
  videoCount: number;
  libraryCount: number;
  webType: string;
  webUrl: string;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
}

export interface GetActorsRequest {
  keyword: string;
  sortBy: string;
  sortOrder: string;
  pageIndex: number;
  pageSize: number;
}

export interface GetActorsResponse {
  items: ActorListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface ActorDetailDto {
  actorId: string;
  name: string;
  avatarPath: string | null;
  videoCount: number;
  libraryCount: number;
  libraryIds: string[];
  libraryNames: string[];
  webType: string;
  webUrl: string;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
}

export interface GetActorDetailResponse {
  actor: ActorDetailDto | null;
}

export interface ActorVideoListItemDto {
  videoId: string;
  vid: string;
  title: string;
  displayTitle: string;
  path: string;
  libraryId: string;
  libraryName: string;
  releaseDate: string | null;
  durationSeconds: number;
  rating: number;
  viewCount: number;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  hasPoster: boolean;
  hasThumb: boolean;
  hasFanart: boolean;
  hasNfo: boolean;
  hasMissingAssets: boolean;
}

export interface GetActorVideosRequest {
  keyword: string;
  sortBy: string;
  sortOrder: string;
  pageIndex: number;
  pageSize: number;
}

export interface GetActorVideosResponse {
  items: ActorVideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

// ── Tasks ───────────────────────────────────────────────
// Mirrors: Jvedio.Contracts.Tasks.*

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

export interface TaskItemDto {
  taskId: string;
  taskType: string;
  status: string;
  libraryId: string;
  libraryName: string;
  progress: number;
  message: string;
  createdAtUtc: string;
  startedAtUtc: string | null;
  completedAtUtc: string | null;
  failedAtUtc: string | null;
  errorMessage: string | null;
}

export type GetTasksResponse = TaskItemDto[];

export interface RetryTaskResponse {
  taskId: string;
  retried: boolean;
}

// ── Settings ────────────────────────────────────────────
// Mirrors: Jvedio.Contracts.Settings.*

export interface GeneralSettingsDto {
  currentLanguage: string;
  debug: boolean;
}

export interface ImageSettingsDto {
  posterPriority: string; // "remote" | "local"
  cacheSizeLimitMb: number;
  autoCleanExpiredCache: boolean;
}

export interface ScanImportSettingsDto {
  scanDepth: number;
  excludePatterns: string;
  organizeMode: string; // "none" | "byVid" | "byActor"
}

export interface MetaTubeSettingsDto {
  serverUrl: string;
  requestTimeoutSeconds: number;
}

export interface PlaybackSettingsDto {
  playerPath: string;
  useSystemDefaultFallback: boolean;
}

export interface LibrarySettingsDto {
  defaultAutoScan: boolean;
  defaultSortBy: string;
  defaultSortOrder: string;
}

export interface GetSettingsResponse {
  general: GeneralSettingsDto;
  image: ImageSettingsDto;
  scanImport: ScanImportSettingsDto;
  playback: PlaybackSettingsDto;
  library: LibrarySettingsDto;
  metaTube: MetaTubeSettingsDto;
}

export interface UpdateSettingsRequest {
  general?: GeneralSettingsDto;
  image?: ImageSettingsDto;
  scanImport?: ScanImportSettingsDto;
  playback?: PlaybackSettingsDto;
  library?: LibrarySettingsDto;
  metaTube?: MetaTubeSettingsDto;
  resetToDefaults?: boolean;
}

export interface UpdateSettingsResponse {
  settings: GetSettingsResponse;
  updatedAtUtc: string;
  resetToDefaultsApplied: boolean;
}

export interface SettingsChangedEvent {
  action: string;
  settings: GetSettingsResponse;
  occurredAtUtc: string;
}

export interface RunMetaTubeDiagnosticsRequest {
  serverUrl?: string;
  timeoutSeconds?: number;
}

export interface RunMetaTubeDiagnosticsResponse {
  success: boolean;
  serverUrl: string;
  responseTimeMs: number;
  errorMessage: string | null;
  details: unknown;
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
