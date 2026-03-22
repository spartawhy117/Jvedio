# 当前测试清单

## 1. 当前状态

当前 `Jvedio.Worker.Tests` 测试统计：
- 总测试数：72
- 全部通过：✅

执行方式：
```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet test --configuration Release
```

## 2. Bootstrap API 契约测试

文件：`ContractTests/BootstrapApiTests.cs`
数据来源：空数据库（`TestBootstrap` 自动创建），无需预配置数据。

### `GetBootstrap_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/bootstrap` 返回成功信封（`success: true`、`data` 存在）

### `GetBootstrap_WorkerInfoHasBaseUrl`
- 目标：验证 bootstrap 响应中 `data.workerInfo.baseUrl` 非空

## 3. DTO 序列化测试

文件：`ContractTests/DtoSerializationTests.cs`
数据来源：测试方法内硬编码 JSON 字符串和 DTO 对象，纯内存操作。

### `GetSettingsResponse_CanDeserializeFromJson`
- 目标：验证 `GetSettingsResponse` 能从 JSON 正确反序列化所有 6 组设置（含 `display`）

### `UpdateSettingsRequest_CanSerializePartialUpdate`
- 目标：验证 `UpdateSettingsRequest` 部分更新时序列化为 camelCase JSON

## 4. Libraries API 契约测试

文件：`ContractTests/LibrariesApiTests.cs`
数据来源：空数据库 + 测试方法内通过 API 创建/删除库，自行管理数据生命周期。

### `GetLibraries_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/libraries` 返回成功信封，`data.libraries` 为数组

### `CreateAndDeleteLibrary_RoundTrip`
- 目标：验证创建库 → 列表查看 → 删除库的完整 CRUD 往返

## 5. Settings API 契约测试

文件：`ContractTests/SettingsApiTests.cs`
数据来源：空数据库（Worker 启动时写入默认设置），通过 API 读写验证。

### `GetSettings_ReturnsSupportedGroups`
- 目标：验证 `GET /api/settings` 返回所有当前支持设置组（general/display/playback/metaTube/scanImport/library），且旧 `image` 分组已移除

### `UpdateSettings_PersistsAndReturns`
- 目标：验证 `PUT /api/settings` 能正确持久化设置并读回验证（含 `display.videoCardSize`）

### `ResetSettings_RestoresDefaults`
- 目标：验证 `PUT /api/settings` 带 `resetToDefaults: true` 能恢复默认值（含 `display.videoCardSize=small`）

### `UpdateSettings_InvalidDisplaySize_FallsBackToSmall`
- 目标：验证非法 `display.videoCardSize` 会被后端规范化回默认值 `small`

## 6. Videos API 契约测试

文件：`ContractTests/VideosApiTests.cs`
数据来源：空数据库，验证空列表场景下的返回格式。

### `GetFavorites_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/videos/favorites` 返回成功信封

### `GetCategories_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/videos/categories` 返回成功信封

### `GetSeries_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/videos/series` 返回成功信封

### `BatchFavorite_WithEmptyList_ReturnsSuccess`
- 目标：验证 `POST /api/videos/batch-favorite` 空列表时返回成功

## 7. VID 解析测试

文件：`BusinessLogicTests/VidParsingTests.cs`
数据来源：`[DataRow]` 注解中的内联字符串，纯函数测试，不碰文件系统和数据库。

通过反射调用 `LibraryScanService.ExtractVideoId` 私有静态方法。

### `ExtractVideoId_StandardVids` × 4
- 目标：标准 VID 格式（`ABP-001`、`STARS-123`、`SSIS-456`、`IPX-789`）

### `ExtractVideoId_Fc2Variants` × 4
- 目标：FC2 变体（标准 `FC2-PPV-1234567`、无分隔符、下划线、空格）

### `ExtractVideoId_WithSuffix` × 3
- 目标：带后缀的 VID（`ABP-001-A`、`STARS-123-B`、下划线后缀）

### `ExtractVideoId_CaseInsensitive` × 2
- 目标：大小写不敏感（小写 → 大写输出、混合大小写）

### `ExtractVideoId_NoHyphenSeparator` × 3
- 目标：无连字符分隔（`ABP001`、`ABP_001`、`ABP 001`）

### `ExtractVideoId_NoMatch_ReturnsEmpty`
- 目标：纯数字文件名返回空字符串

### `ExtractVideoId_SingleCharPrefix_ReturnsEmpty`
- 目标：单字符前缀不匹配（前缀最少 2 字符）

## 8. Sidecar 路径测试

文件：`BusinessLogicTests/SidecarPathTests.cs`
数据来源：硬编码路径字符串（文件不需要真实存在），纯函数测试。

通过反射调用 `LibraryScrapeService` 和 `VideoService` 的私有静态路径方法。

### `ScrapeService_SidecarPaths_UseVidPrefix`
- 目标：验证 NFO/poster/thumb/fanart 路径以 VID 为前缀命名

### `VideoService_NormalizeSidecarPrefix_UsesVidWhenPresent`
- 目标：有 VID 时使用 VID 作为前缀

### `VideoService_NormalizeSidecarPrefix_FallsBackToFileName`
- 目标：VID 为空时回退到文件名

### `VideoService_NormalizeSidecarPrefix_NullVid_FallsBackToFileName`
- 目标：VID 为空白字符串时回退到文件名

### `VideoService_NormalizeSidecarPrefix_EmptyBoth_ReturnsFallback`
- 目标：VID 和文件名都为空时回退到 "video"

### `ScrapeService_SidecarPaths_ConsistentWithVideoService`
- 目标：验证写入路径（ScrapeService）与读取路径（VideoService）一致

## 9. 扫描整理测试

文件：`BusinessLogicTests/ScanOrganizeTests.cs`
数据来源：`[TestInitialize]` 在系统临时目录创建 GUID 目录，测试方法内用 `File.WriteAllText` 创建假视频文件（几字节文本），`[TestCleanup]` 自动删除。

通过反射调用 `LibraryScanService.TryOrganize` 私有静态方法，操作临时文件系统。

### `TryOrganize_MovesVideoToVidSubdirectory`
- 目标：平铺目录中多个视频文件时，按 VID 创建子目录并移动

### `TryOrganize_FallsBackToFileName_WhenVidEmpty`
- 目标：VID 为空时使用文件名作为目录名

### `TryOrganize_FailsGracefully_WhenTargetFileExists`
- 目标：目标位置已有同名文件时，整理失败但不抛异常

### `TryOrganize_SingleFileNonVidDir_StillOrganizes`
- 目标：单个视频在非 VID 目录中仍会整理到 VID 子目录

### `TryOrganize_MovesMatchingSubtitles`
- 目标：同名字幕文件（.srt/.ass）随视频一起移动

## 10. 扫描导入 API 集成测试

文件：`BusinessLogicTests/ScanImportApiTests.cs`
数据来源：测试方法内在临时目录创建 1024 字节假视频文件，通过 API 创建库并触发扫描，等待异步完成后验证导入结果，最后 API 删除库。

通过 Worker API 端到端测试扫描导入流程。

### `ScanLibrary_ImportsVideos_WithExtractedVids`
- 目标：创建库 → 放入假视频 → 触发扫描 → 验证视频被导入

### `ScanLibrary_EmptyDirectory_ImportsNothing`
- 目标：空目录扫描不导入任何视频

## 11. Actor API 契约测试

文件：`ContractTests/ActorApiTests.cs`
数据来源：空数据库（`TestBootstrap` 自动创建），演员列表为空，验证空态响应格式和无效 ID 的 404 行为。

### `GetActors_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/actors` 返回成功信封，`data.items` 为数组，`data.totalCount` 存在

### `GetActors_SupportsPagination`
- 目标：验证 `GET /api/actors?page=1&pageSize=10` 分页参数正确处理

### `GetActors_SearchByKeyword_ReturnsSuccessEnvelope`
- 目标：验证 `GET /api/actors?keyword=nonexistent` 搜索不存在关键词返回空结果

### `GetActorDetail_InvalidId_ReturnsNotFound`
- 目标：验证 `GET /api/actors/{invalidId}` 返回 404

### `GetActorVideos_InvalidId_ReturnsNotFound`
- 目标：验证 `GET /api/actors/{invalidId}/videos` 返回 404

## 12. MetaTube 抓取集成测试

文件：`ContractTests/ScrapeApiTests.cs`
数据来源：测试方法内通过 API 创建临时库，触发 scrape 后清理；diagnostics 测试使用不可达地址验证 API 契约。

### `ScrapeLibrary_InvalidId_ReturnsNotFound`
- 目标：验证 `POST /api/libraries/{invalidId}/scrape` 返回 404

### `ScrapeLibrary_ValidLibrary_ReturnsAccepted`
- 目标：创建临时库 → 触发 scrape → 验证返回 202 Accepted + `data.acceptedAtUtc` 存在 → 清理库

### `MetaTubeDiagnostics_ReturnsResponseEnvelope`
- 目标：验证 `POST /api/settings/meta-tube/diagnostics` 返回成功信封，`data.steps` 为数组，`data.summary` 和 `data.serverUrl` 存在（使用不可达地址，不依赖真实 MetaTube 服务）

### `ScrapeLibrary_WithVideoIds_ReturnsAccepted`
- 目标：创建临时库 → 传入 `videoIds` 触发单影片搜刮 → 验证返回 202 Accepted → 清理库

### `StartLibraryScrapeRequest_HasAllRequiredFields`
- 目标：验证 `StartLibraryScrapeRequest` Contract 包含 `VideoIds`、`Mode`、`ForceRefreshMetadata`、`WriteSidecars`、`DownloadActorAvatars` 五个字段

### `VideoListItemDto_HasScrapeStatusField`
- 目标：验证 `VideoListItemDto` 包含 `ScrapeStatus` 属性

### `VideoDetailDto_HasScrapeStatusField`
- 目标：验证 `VideoDetailDto` 包含 `ScrapeStatus` 属性

## 13. Sidecar 路径测试（scrape-fail-graceful 扩展）

文件：`BusinessLogicTests/SidecarPathTests.cs`（追加 3 个测试）

### `WriteStubSidecarAsync_MethodExists`
- 目标：验证 `LibraryScrapeService` 包含 `WriteStubSidecarAsync` 方法（stub sidecar 写入能力）

### `PersistScrapeStatus_MethodExists`
- 目标：验证 `LibraryScrapeService` 包含 `PersistScrapeStatus` 方法（ScrapeStatus 持久化能力）

### `ScrapeCandidate_HasScrapeStatusField`
- 目标：验证 `ScrapeCandidate` record 包含 `ScrapeStatus` 字段

## 14. Videos API 契约测试（scrape-fail-graceful 扩展）

文件：`ContractTests/VideosApiTests.cs`（追加 3 个测试）

### `GetLibraryVideosRequest_HasScrapeStatusFilter`
- 目标：验证 `GetLibraryVideosRequest` 包含 `ScrapeStatus` 可选筛选属性

### `VideoListItemDto_ScrapeStatus_DefaultsToNone`
- 目标：验证 `VideoListItemDto.ScrapeStatus` 默认值为 `"none"`

### `VideoDetailDto_ScrapeStatus_DefaultsToNone`
- 目标：验证 `VideoDetailDto.ScrapeStatus` 默认值为 `"none"`

## 15. 删除目录清理与显示设置扩展测试

文件：`BusinessLogicTests/SidecarPathTests.cs`（追加 3 个测试）
数据来源：硬编码路径字符串与内存 DTO，纯业务逻辑反射测试。

### `VideoService_DeleteCleanupHelpers_Exist`
- 目标：验证删除后目录清理安全辅助方法存在，避免保护逻辑被无意移除

### `VideoService_IsSafeToDeleteDirectory_RejectsLibraryRoot`
- 目标：验证删除清理绝不会删除媒体库根目录

### `VideoService_IsSafeToDeleteDirectory_AllowsNestedVideoFolder`
- 目标：验证删除清理允许移除已空的影片子目录

## 16. 当前维护规则

- 新增或删除测试时，更新本文件
- 如果测试目标边界变化，同时更新：
  - `doc/testing/backend/test-targets.md`
- 如果测试工程结构、脚本或配置变化，同时更新：
  - `doc/testing/backend/test-plan.md`
