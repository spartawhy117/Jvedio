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

export interface GetLibraryVideosRequest {
  keyword: string;
  missingSidecarOnly: boolean;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export interface VideoListItemDto {
  displayTitle: string;
  durationSeconds: number;
  hasFanart: boolean;
  hasMissingAssets: boolean;
  hasNfo: boolean;
  hasPoster: boolean;
  hasThumb: boolean;
  libraryId: string;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  path: string;
  rating: number;
  releaseDate: string | null;
  title: string;
  vid: string;
  videoId: string;
  viewCount: number;
}

export interface GetLibraryVideosResponse {
  availableViewModes: readonly string[];
  items: readonly VideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface GetFavoriteVideosRequest {
  keyword: string;
  missingSidecarOnly: boolean;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export interface GetFavoriteVideosResponse {
  items: readonly VideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface VideoGroupListItemDto {
  lastPlayedAt: string;
  lastScanAt: string;
  name: string;
  videoCount: number;
}

export interface GetVideoGroupsResponse {
  items: readonly VideoGroupListItemDto[];
  totalCount: number;
}

export interface GetVideoGroupVideosRequest {
  keyword: string;
  missingSidecarOnly: boolean;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export interface GetVideoGroupVideosResponse {
  items: readonly VideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface GetActorsRequest {
  keyword: string;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export interface ActorListItemDto {
  actorId: string;
  avatarPath: string | null;
  libraryCount: number;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  name: string;
  videoCount: number;
  webType: string;
  webUrl: string;
}

export interface GetActorsResponse {
  items: readonly ActorListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
}

export interface ActorDetailDto {
  actorId: string;
  avatarPath: string | null;
  libraryCount: number;
  libraryIds: readonly string[];
  libraryNames: readonly string[];
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  name: string;
  videoCount: number;
  webType: string;
  webUrl: string;
}

export interface GetActorDetailResponse {
  actor: ActorDetailDto | null;
}

export interface GetActorVideosRequest {
  keyword: string;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: string;
}

export interface ActorVideoListItemDto {
  displayTitle: string;
  durationSeconds: number;
  hasFanart: boolean;
  hasMissingAssets: boolean;
  hasNfo: boolean;
  hasPoster: boolean;
  hasThumb: boolean;
  libraryId: string;
  libraryName: string;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  path: string;
  rating: number;
  releaseDate: string | null;
  title: string;
  vid: string;
  videoId: string;
  viewCount: number;
}

export interface GetActorVideosResponse {
  items: readonly ActorVideoListItemDto[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
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

export interface GeneralSettingsDto {
  currentLanguage: string;
  debug: boolean;
}

export interface MetaTubeSettingsDto {
  requestTimeoutSeconds: number;
  serverUrl: string;
}

export interface PlaybackSettingsDto {
  playerPath: string;
  useSystemDefaultFallback: boolean;
}

export interface GetSettingsResponse {
  general: GeneralSettingsDto;
  metaTube: MetaTubeSettingsDto;
  playback: PlaybackSettingsDto;
}

export interface UpdateSettingsRequest {
  general?: GeneralSettingsDto;
  metaTube?: MetaTubeSettingsDto;
  playback?: PlaybackSettingsDto;
  resetToDefaults: boolean;
}

export interface UpdateSettingsResponse {
  resetToDefaultsApplied: boolean;
  settings: GetSettingsResponse;
  updatedAtUtc: string;
}

export interface RunMetaTubeDiagnosticsRequest {
  requestTimeoutSeconds?: number;
  serverUrl?: string;
  testVideoId?: string;
}

export interface RunMetaTubeDiagnosticsResponse {
  actorProviderCount: number;
  completedAtUtc: string;
  detailTitle: string;
  matchedMovieId: string;
  matchedProvider: string;
  movieProviderCount: number;
  searchResultCount: number;
  serverUrl: string;
  steps: readonly string[];
  success: boolean;
  summary: string;
  testVideoId: string;
  timeoutSeconds: number;
}

export interface SettingsChangedEventDto {
  action: string;
  occurredAtUtc: string;
  settings: GetSettingsResponse;
}

export interface VideoAssetStateDto {
  exists: boolean;
  path: string;
}

export interface SidecarStateDto {
  fanart: VideoAssetStateDto;
  hasMissingAssets: boolean;
  nfo: VideoAssetStateDto;
  poster: VideoAssetStateDto;
  thumb: VideoAssetStateDto;
}

export interface VideoActorDto {
  actorId: string | null;
  avatarPath: string | null;
  name: string;
}

export interface PlaybackAvailabilityDto {
  canPlay: boolean;
  playerPath: string | null;
  usesSystemDefault: boolean;
}

export interface VideoDetailDto {
  actors: readonly VideoActorDto[];
  director: string;
  displayTitle: string;
  durationSeconds: number;
  lastPlayedAt: string | null;
  lastScanAt: string | null;
  libraryId: string;
  libraryName: string;
  outline: string;
  path: string;
  playback: PlaybackAvailabilityDto;
  plot: string;
  rating: number;
  releaseDate: string | null;
  series: string;
  sidecars: SidecarStateDto;
  studio: string;
  title: string;
  vid: string;
  videoId: string;
  viewCount: number;
  webUrl: string;
}

export interface GetVideoDetailResponse {
  video: VideoDetailDto | null;
}

export interface PlayVideoRequest {
  playerProfile: string;
  resume: boolean;
}

export interface PlayVideoResponse {
  launchedAtUtc: string;
  lastPlayedAt: string | null;
  usedPlayerPath: string | null;
  usedSystemDefault: boolean;
  videoId: string;
}
