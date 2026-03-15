# Contracts 命名冻结草案

## 目标

- 为未来 `Jvedio.Contracts` 提供第一批稳定命名。
- 在代码实现前冻结 request / response / task payload / event payload / 错误码前缀。
- 保证 renderer、Worker、后续测试工程使用同一套术语。

## 总体命名规则

### 目录建议

```text
Jvedio.Contracts/
  Common/
  App/
  Libraries/
  Videos/
  Actors/
  Settings/
  Tasks/
```

### 类型命名规则

- 请求 DTO
  - `GetBootstrapResponse`
  - `CreateLibraryRequest`
  - `UpdateSettingsRequest`
- 查询参数 DTO
  - `GetLibraryVideosRequest`
  - `GetActorsRequest`
- 响应 DTO
  - `GetLibrariesResponse`
  - `GetVideoDetailResponse`
- 任务票据 DTO
  - `TaskTicketDto`
- 任务详情 DTO
  - `TaskDetailDto`
- 事件载荷 DTO
  - `TaskProgressEvent`
  - `LibraryChangedEvent`

### 通用类型命名

- 通用 envelope
  - `ApiResponse<TData>`
- 通用错误对象
  - `ApiErrorDto`
- 分页结果
  - `PagedResult<TItem>`
- 选择项 / 简表
  - `LibraryListItemDto`
  - `ActorListItemDto`
  - `VideoListItemDto`

### 枚举命名

- `TaskType`
- `TaskStatus`
- `TaskStage`
- `LibrarySortBy`
- `ActorSortBy`
- `VideoViewMode`
- `AppTheme`

## Common

### 通用 DTO

- `ApiResponse<TData>`
- `ApiErrorDto`
- `TaskTicketDto`
- `TaskProgressDto`
- `PagedResult<TItem>`
- `ResourceRefDto`

### 错误码前缀

- `common.`
- `validation.`
- `system.`

## App / Bootstrap

### DTO 冻结

- `GetBootstrapResponse`
- `AppInfoDto`
- `ShellBootstrapDto`
- `TaskSummaryDto`
- `WorkerStatusDto`

### 返回结构对应

- `GetBootstrapResponse`
  - `AppInfoDto App`
  - `ShellBootstrapDto Shell`
  - `IReadOnlyList<LibraryListItemDto> Libraries`
  - `TaskSummaryDto TaskSummary`
  - `WorkerStatusDto Worker`

### 事件载荷

- `WorkerReadyEvent`
- `WorkerStatusChangedEvent`

### 错误码前缀

- `app.bootstrap.`
- `worker.`

## Libraries

### DTO 冻结

- `GetLibrariesResponse`
- `LibraryListItemDto`
- `LibraryDetailDto`
- `CreateLibraryRequest`
- `CreateLibraryResponse`
- `UpdateLibraryRequest`
- `DeleteLibraryResponse`
- `GetLibraryVideosRequest`
- `GetLibraryVideosResponse`
- `StartLibraryScanRequest`
- `StartLibraryScanResponse`
- `StartLibraryScrapeRequest`
- `StartLibraryScrapeResponse`
- `LibrarySummaryDto`
- `LibraryScanPathDto`

### 任务 payload

- `LibraryScanTaskPayload`
- `LibraryScrapeTaskPayload`

### 事件载荷

- `LibraryChangedEvent`
- `LibraryScanProgressEvent`
- `LibraryScrapeProgressEvent`
- `LibraryTaskSummaryChangedEvent`

### 错误码前缀

- `library.create.`
- `library.update.`
- `library.delete.`
- `library.scan.`
- `library.scrape.`
- `library.video-query.`

## Videos

### DTO 冻结

- `GetVideoDetailResponse`
- `VideoDetailDto`
- `VideoAssetStateDto`
- `VideoActorDto`
- `PlayVideoRequest`
- `PlayVideoResponse`
- `RefreshVideoMetadataRequest`
- `RefreshVideoMetadataResponse`
- `OpenVideoFolderRequest`
- `OpenVideoFolderResponse`
- `PlaybackAvailabilityDto`
- `SidecarStateDto`

### 任务 payload

- `VideoPlayTaskPayload`
- `VideoRefreshMetadataTaskPayload`

### 事件载荷

- `VideoChangedEvent`
- `VideoPlaybackCompletedEvent`
- `VideoPlaybackFailedEvent`
- `VideoMetadataRefreshedEvent`

### 错误码前缀

- `video.detail.`
- `video.play.`
- `video.refresh.`
- `video.open-folder.`

## Actors

### DTO 冻结

- `GetActorsRequest`
- `GetActorsResponse`
- `ActorListItemDto`
- `GetActorDetailResponse`
- `ActorDetailDto`
- `GetActorVideosRequest`
- `GetActorVideosResponse`
- `ActorVideoListItemDto`

### 事件载荷

- `ActorChangedEvent`

### 错误码前缀

- `actor.query.`
- `actor.detail.`
- `actor.video-query.`

## Settings

### DTO 冻结

- `GetSettingsResponse`
- `SettingsGroupsDto`
- `GeneralSettingsDto`
- `LibrarySettingsDto`
- `MetaTubeSettingsDto`
- `PlaybackSettingsDto`
- `DataSettingsDto`
- `UpdateSettingsRequest`
- `UpdateSettingsResponse`
- `RunMetaTubeDiagnosticsRequest`
- `RunMetaTubeDiagnosticsResponse`
- `MetaTubeDiagnosticsResultDto`

### 任务 payload

- `SettingsSaveTaskPayload`
- `MetaTubeDiagnosticsTaskPayload`

### 事件载荷

- `SettingsChangedEvent`
- `SettingsSaveCompletedEvent`
- `MetaTubeDiagnosticsCompletedEvent`

### 错误码前缀

- `settings.load.`
- `settings.save.`
- `settings.meta-tube.diagnostics.`

## Tasks

### DTO 冻结

- `GetTasksRequest`
- `GetTasksResponse`
- `GetTaskDetailResponse`
- `CancelTaskRequest`
- `CancelTaskResponse`
- `TaskListItemDto`
- `TaskDetailDto`
- `TaskErrorDto`
- `TaskScopeDto`
- `TaskEventEnvelopeDto`

### 事件载荷

- `TaskCreatedEvent`
- `TaskProgressEvent`
- `TaskCompletedEvent`
- `TaskFailedEvent`
- `TaskCancelledEvent`

### 错误码前缀

- `task.query.`
- `task.detail.`
- `task.cancel.`

## 路由与 contracts 对照

- `GET /api/app/bootstrap`
  - `GetBootstrapResponse`
- `GET /api/libraries`
  - `GetLibrariesResponse`
- `POST /api/libraries`
  - `CreateLibraryRequest`
  - `CreateLibraryResponse`
- `PUT /api/libraries/{libraryId}`
  - `UpdateLibraryRequest`
- `DELETE /api/libraries/{libraryId}`
  - `DeleteLibraryResponse`
- `GET /api/libraries/{libraryId}/videos`
  - `GetLibraryVideosRequest`
  - `GetLibraryVideosResponse`
- `POST /api/libraries/{libraryId}/scan`
  - `StartLibraryScanRequest`
  - `StartLibraryScanResponse`
- `POST /api/libraries/{libraryId}/scrape`
  - `StartLibraryScrapeRequest`
  - `StartLibraryScrapeResponse`
- `GET /api/videos/{videoId}`
  - `GetVideoDetailResponse`
- `POST /api/videos/{videoId}/play`
  - `PlayVideoRequest`
  - `PlayVideoResponse`
- `POST /api/videos/{videoId}/refresh-metadata`
  - `RefreshVideoMetadataRequest`
  - `RefreshVideoMetadataResponse`
- `POST /api/videos/{videoId}/open-folder`
  - `OpenVideoFolderRequest`
  - `OpenVideoFolderResponse`
- `GET /api/actors`
  - `GetActorsRequest`
  - `GetActorsResponse`
- `GET /api/actors/{actorId}`
  - `GetActorDetailResponse`
- `GET /api/actors/{actorId}/videos`
  - `GetActorVideosRequest`
  - `GetActorVideosResponse`
- `GET /api/settings`
  - `GetSettingsResponse`
- `PUT /api/settings`
  - `UpdateSettingsRequest`
  - `UpdateSettingsResponse`
- `POST /api/settings/meta-tube/diagnostics`
  - `RunMetaTubeDiagnosticsRequest`
  - `RunMetaTubeDiagnosticsResponse`
- `GET /api/tasks`
  - `GetTasksRequest`
  - `GetTasksResponse`
- `GET /api/tasks/{taskId}`
  - `GetTaskDetailResponse`
- `POST /api/tasks/{taskId}/cancel`
  - `CancelTaskRequest`
  - `CancelTaskResponse`

## 第一批实现必须先用到的 contracts

- `GetBootstrapResponse`
- `GetLibrariesResponse`
- `CreateLibraryRequest`
- `CreateLibraryResponse`
- `DeleteLibraryResponse`
- `GetTasksResponse`
- `TaskSummaryDto`
- `LibraryChangedEvent`
- `TaskCreatedEvent`
- `TaskCompletedEvent`
- `TaskFailedEvent`

## 当前仍保留的开放项

- `TaskStage` 的枚举值是否在第一批就全部冻结，还是先按字符串过渡
- `OpenVideoFolderRequest` 是否需要完全省略请求体，只保留路径参数
- Settings 诊断是否直接复用任务体系，还是允许同步返回轻量结果
