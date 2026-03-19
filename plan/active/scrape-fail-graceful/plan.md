# Feature: 抓取失败优雅降级（Jellyfin 风格）

## 文档定位

本文件是 `scrape-fail-graceful` 的活动规划文档。目标：让 MetaTube 抓取失败的影片在 UI 上仍可见、可操作，模仿 Jellyfin 对缺失元数据影片的处理策略。

---

## 问题描述

当前 Worker 对抓取失败的影片采取"静默跳过"策略：

| 现状 | 问题 |
|------|------|
| 搜索无结果 / 网络异常 → `failedCount++; continue` | 不创建 sidecar 目录、不写任何文件 |
| DB 无状态标记 | "从未抓取"与"抓取失败"**无法区分** |
| `NeedsScrape()` 隐性重试 | 用户无感知，不知道哪些片失败了 |
| 前端 VideoCard 无海报时显示 `🎬` emoji | 不美观，无"缺失海报"占位图 |
| 部分失败的任务状态仍为 `succeeded` | 用户以为全部成功 |

---

## 目标行为（对齐 Jellyfin）

1. **抓取失败仍创建 sidecar 子目录** — 确保目录结构一致
2. **写入仅含 VID 的最小 NFO** — `<movie><num>VID</num></movie>`，作为"已尝试抓取"的标记
3. **VideoCard 无海报时显示缺失海报占位图** — 替代 `🎬` emoji，使用类似 Jellyfin 的灰色占位卡
4. **VideoDetailPage 区分"未抓取"和"抓取失败"** — StatusBadge 增加"部分"状态
5. **DB 记录抓取状态** — `metadata_video` 表新增 `ScrapeStatus` 字段（`none` / `partial` / `full` / `failed`）
6. **前端可按抓取状态筛选** — 列表页可筛选"抓取失败"的影片

---

## 非目标

- 不做自动重试调度（已有隐性重试机制 + 手动重试 API）
- 不改变任务级重试逻辑（`POST /api/tasks/{id}/retry`）
- 不改变 MetaTube 配置检测逻辑（未配置 → 整体 task.failed，保持不变）
- 不做批量"重新搜刮选中影片"（本轮只做单个影片右键重新搜刮，批量可后续扩展）

---

## 修改清单

### Phase 1：Worker 后端 — 抓取失败写 stub sidecar ✅

> **已完成摘要**：`LibraryScrapeService.cs` 三处失败分支（selectedMovie null / movieInfo null / catch）均调用 `WriteStubSidecarAsync` + `PersistScrapeStatus("failed")`；成功分支调用 `PersistScrapeStatus("full")`。新增 `WriteStubSidecarAsync` 方法（创建 sidecar 目录 + 写最小 NFO）和 `PersistScrapeStatus` 静态方法。`ScrapeCandidate` record 新增第 8 参数 `ScrapeStatus`，`LoadCandidates` SQL 新增 `IFNULL(metadata_video.ScrapeStatus, 'none')`。`NeedsScrape` 对 `failed` 在 missing-only 模式下跳过。`VideoIds` 非空时无视 `NeedsScrape` 直接纳入候选。

---

### Phase 2：数据库迁移 — `metadata_video` 新增列 ✅

> **已完成摘要**：`WorkerStorageBootstrapper.cs` 新增 `EnsureColumnExists(connection, "metadata_video", "ScrapeStatus", "TEXT NOT NULL DEFAULT 'none'")`。值域：`none`（默认）/ `full` / `failed`。

---

### Phase 3：Contracts — DTO 扩展 ✅

> **已完成摘要**：`VideoListItemDto` 和 `VideoDetailDto` 均新增 `ScrapeStatus` 属性（默认 `"none"`）。`VideoService.cs` 四个查询方法（`LoadLibraryVideos`/`LoadFavoriteVideos`/`LoadVideosByGroup`/`LoadVideoDetailRecord`）SQL 和 DTO 映射新增 ScrapeStatus 列。`VideoDetailRecord` 新增第 19 参数。

---

### Phase 4：Worker API — 按抓取状态筛选 ✅

> **已完成摘要**：`GetLibraryVideosRequest` 新增 `ScrapeStatus?` 可选筛选参数。`VideoService.ApplyVideoFilters` 新增 `scrapeStatus` 参数，使用 `StringComparer.OrdinalIgnoreCase` 过滤。`GetLibraryVideos` 传递 `request.ScrapeStatus`。

---

### Phase 4.5：右键「重新抓取元数据」— 接入真实搜刮 API ✅

> **已完成摘要**：前端 `types.ts` 的 `StartLibraryScrapeRequest` 从 `{ forceRescrape? }` 对齐为后端完整 5 字段接口。`LibraryPage.tsx` 和 `FavoritesPage.tsx` 的 `getContextMenuActions()` 补齐 `rescrape` 菜单项（位于 `toggleFavorite` 和 `copyVid` 之间），调用 `client.startLibraryScrape(libraryId, { videoIds: [video.videoId], mode: "all", ... })`。`BootstrapContext.tsx` 的 `library.changed` SSE 回调新增 `invalidateQueries("video:")` + `invalidateQueries("favorites")`。

---

### Phase 5：前端 — 缺失海报占位图 + 抓取状态展示 + 搜刮成功刷新 ✅

> **已完成摘要**：`VideoCard.tsx` 和 `VideoDetailPage.tsx` 无海报时从 `🎬` emoji 替换为内联 SVG 占位图（人物轮廓图标 + "No Poster" 文字）。`VideoCard.css` 更新 `.video-card-no-image` 为 flex-column + `var(--color-surface-muted)` 背景，新增 `.no-poster-placeholder`（48px, opacity 0.4）和 `.no-poster-text` 样式。`types.ts` 中 `VideoListItemDto` 和 `VideoDetailDto` 新增 `scrapeStatus: "none" | "full" | "failed"`。`locales/zh/common.json` 和 `locales/en/common.json` 新增 `rescrapeMetadata` + `scrapeStatus` 三态文案。

---

### Phase 6：单元测试 / 契约测试更新 ✅

> **已完成摘要**：新增 10 个测试（52→62，全部通过）。`SidecarPathTests.cs` +3（WriteStubSidecarAsync/PersistScrapeStatus 方法存在性 + ScrapeCandidate 字段）。`ScrapeApiTests.cs` +4（VideoIds 搜刮返回 202 + StartLibraryScrapeRequest 字段完整性 + VideoListItemDto/VideoDetailDto 含 ScrapeStatus）。`VideosApiTests.cs` +3（GetLibraryVideosRequest 含 ScrapeStatus 筛选 + 两个 DTO 默认值为 `"none"`）。

---

### Phase 7：E2E 脚本更新 ✅

> **已完成摘要**：`seed-e2e-data.ps1` Step 5.9 验证区新增成功抓取影片的 `scrapeStatus == "full"` 检查。`verify-backend-apis.ps1` 新增：影片列表/详情 DTO `scrapeStatus` 字段存在性检查、`?scrapeStatus=none` 和 `?scrapeStatus=failed` 筛选验证、`POST /api/libraries/{id}/scrape` 传入 `videoIds` 的单影片搜刮端点验证（返回 202）。

---

### Phase 8：文档更新 ✅

> **已完成摘要**：更新 7 个文档：AGENTS.md（测试数量 52→62 + ScrapeStatus 值域 + stub NFO 说明）、CHANGELOG.md（追加 scrape-fail-graceful 变更条目）、test-targets.md（新增 stub sidecar / ScrapeStatus 测试目标 + 数量更新）、test-current-suite.md（追加 10 个测试用例清单）、README.md（数量更新 52→62）、e2e-test-data-spec.md（新增 stub sidecar 场景说明）、desktop-ui-shell-refactor handoff.md（已完成区补充 scrape-fail-graceful 完成记录）。

---

### Phase 9：E2E backend verify 链路收口 — 脚本报错修复 + 产出目录对齐 ✅

> **已完成摘要**：先补齐执行环境并打通 Release 构建，再修复 `seed-e2e-data.ps1` / `verify-backend-apis.ps1` 对旧 `ApiResponse<T>` 字段、Settings 半包体、任务轮询和无扩展名样本的错误假设；`WorkerPathResolver.cs` 在测试环境固定落到 `test-user`。基于真实默认配置 `libA=[SNOS-037.mp4, SDDE-759.mp4]`、`libB=[sdde-660-c, FC2-PPV-1788676.mp4]` 实跑通过：`SNOS-037`、`SDDE-759`、`SDDE-660-C` 生成完整 sidecar 四件套，`FC2-PPV-1788676` 仅生成 stub NFO。真实产物路径已收敛为 `test-data/e2e/data/test-user/cache/video/E2E-Lib-A|B/{VID}/` 和 `test-data/e2e/data/test-user/cache/actor-avatar/`，`e2e-env.json` 已写出 `effectiveUserName`、`userDataRoot`、`videoCacheRoot`、`actorAvatarCacheRoot`、`libraries[].libraryId`。最终 `verify-backend-apis.ps1 -NoPause` 结果：`36 PASS / 2 SKIP / 0 FAIL`，跳过项仅为保护播种环境的删除端点。

---

## 影响面汇总

| 层级 | 修改文件 | 变更类型 |
|------|---------|---------|
| **Worker Service** | `LibraryScrapeService.cs` | 失败分支 stub sidecar + ScrapeStatus 写入 + VideoIds 强制搜刮 |
| **Worker Service** | `VideoService.cs` | SQL 查询 + DTO 映射新增 ScrapeStatus + libraryId |
| **Worker Service** | `DatabaseService.cs`（或等效） | DB 迁移 `ALTER TABLE` |
| **Contracts** | `VideoListItemDto.cs` | 新增 `ScrapeStatus` + `LibraryId` |
| **Contracts** | `VideoDetailDto.cs` | 新增 `ScrapeStatus` + `LibraryId` |
| **Contracts** | `GetLibraryVideosRequest.cs`（新建或修改） | 筛选参数 |
| **前端 Types** | `types.ts` | DTO 同步 + `StartLibraryScrapeRequest` 对齐后端 |
| **前端 API** | `client.ts` | 无需修改（`startLibraryScrape` 已接受完整 request） |
| **前端组件** | `VideoCard.tsx` + `.css` | 占位图替代 emoji（不新增 scrape-failed-badge） |
| **前端组件** | `VideoContextMenu.tsx` | 无需修改（通用组件，actions 由调用方注入） |
| **前端页面** | `VideoDetailPage.tsx` | sidecar StatusBadge 适配 stub 场景 + SSE 搜刮成功后自动刷新（不新增按钮/横幅） |
| **前端页面** | `LibraryPage.tsx` | 右键菜单补齐"重新抓取元数据"项（设计规格已定义，代码未实现）+ 接入搜刮 API |
| **前端页面** | `FavoritesPage.tsx` | 右键菜单补齐"重新抓取元数据"项（同上）+ 接入搜刮 API |
| **前端上下文** | `BootstrapContext.tsx` | SSE `library.changed` 回调增强：补充 `invalidateQueries("video:")` + `invalidateQueries("favorites")` |
| **前端资源** | `assets/image/illustration/no-poster.svg` | 新增占位图 |
| **前端 i18n** | `locales/zh/video.json`, `locales/en/video.json` | 新增 3 条文案（scrapeStatus 三态） |
| **前端 i18n** | `locales/zh/common.json`, `locales/en/common.json` | 新增 1 条文案（rescrapeMetadata） |
| **测试** | `SidecarPathTests.cs` | +3 测试 |
| **测试** | `ScrapeApiTests.cs` | +4 测试（含重新搜刮链路） |
| **测试** | `VideosApiTests.cs` | +3 测试（含重新搜刮后状态） |
| **E2E 脚本** | `seed-e2e-data.ps1` | 验证 ScrapeStatus |
| **E2E 脚本** | `verify-backend-apis.ps1` | 新增字段校验 + 单影片搜刮端点校验 |
| **E2E 脚本** | `seed-e2e-data.ps1` + `verify-backend-apis.ps1` | **Phase 9：修复 Contracts 漂移导致的脚本报错，补齐 e2e-env.json 产物定位信息** |
| **Worker Service** | `WorkerPathResolver.cs` | **Phase 9：统一测试环境用户目录 / cache/video / actor-avatar 路径口径** |
| **文档** | 7 个文档 | 同步更新（删除了对不存在的 Phase 10 的引用） |
| **文档** | `e2e-test-data-spec.md` / `data-directory-convention.md` / `test-data/config/README.md` | **Phase 9：统一播种、verify、Worker 实际产出目录说明** |

---

## 实际验收结果

### 后端验收

- 已完成运行环境补齐并成功生成 Release 构建。
- `seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` 按真实配置跑通，`e2e-env.json` 已写出当前 worker 地址、库 ID、`test-user` 根目录和缓存路径。
- 默认测试样本实跑结果：成功抓取 `SNOS-037`、`SDDE-759`；`sdde-660-c` 被正常识别为 `SDDE-660-C` 并完成抓取；`FC2-PPV-1788676` 抓取失败但保留影片并写出 stub NFO。
- 真实产物路径为：

```text
test-data/e2e/data/test-user/cache/video/E2E-Lib-A/SNOS-037/
test-data/e2e/data/test-user/cache/video/E2E-Lib-A/SDDE-759/
test-data/e2e/data/test-user/cache/video/E2E-Lib-B/SDDE-660-C/
test-data/e2e/data/test-user/cache/video/E2E-Lib-B/FC2-PPV-1788676/
test-data/e2e/data/test-user/cache/actor-avatar/
```

- 成功样本具备标题、`scrapeStatus=full`、演员信息和 sidecar 四件套；失败样本 `FC2-PPV-1788676` 仅保留 stub `.nfo`，不生成 `poster` / `thumb` / `fanart`。
- `verify-backend-apis.ps1 -NoPause` 实际结果为 `36 PASS / 2 SKIP / 0 FAIL`；skip 仅为保护播种环境而保留的删除端点。

### 前端验收

- 本轮 `ps1` 脚本执行范围仅覆盖后端验收。
- 前端相关改动只做到 Release 构建打通，不把 UI 表现项计入本轮脚本通过标准。

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| DB 迁移对现有数据的影响 | `DEFAULT 'none'` 保证向后兼容，现有影片默认 `none` |
| stub NFO 被 `NeedsScrape()` 误判为"已有完整 sidecar" | `NeedsScrape()` 同时检查 poster/thumb/fanart 是否存在，stub 只写 NFO 不写图片，仍会被选中（`mode=all` 时）；`mode=missing-only` 时依赖 `ScrapeStatus` 字段跳过 `failed` |
| 占位图在不同主题下的可见性 | SVG 使用 `currentColor` 或 CSS Variables 适配 light/dark |
| 右键重新搜刮与正在进行的全库搜刮任务冲突 | 后端 `HasRunningTask(libraryId, "library.scrape")` 检查已存在，重复请求会返回 409 Conflict；前端 catch 后可在菜单项层面禁用或显示 pending 状态（按设计规格走行内反馈，不使用 Toast） |
| `VideoIds` 单影片搜刮走的仍是全库搜刮端点，任务名显示为"库搜刮" | 可接受（本轮不改任务命名），后续可优化为"单片搜刮"任务类型 |
| 前端 `StartLibraryScrapeRequest` 字段对齐可能影响其他调用方 | 所有新增字段都是 optional + 有后端默认值，不影响已有调用 |
| FavoritesPage 右键重新搜刮需要知道影片的 `libraryId` | DTO 新增 `libraryId` 字段（Phase 3 + 5.2），API 层面已经可查 |
| E2E 脚本继续读取旧返回字段导致播种或 verify 在 StrictMode 下中断 | Phase 9 统一按当前 Contracts 重写关键响应读取，并增加字段存在性保护 |
| 测试环境目录同时出现 `test-user` 和实际 Windows 用户名，导致 sidecar / SQLite / 头像检查路径漂移 | Phase 9 明确测试环境有效用户目录规则，并把该值写入 `e2e-env.json` 供 verify 复用 |
