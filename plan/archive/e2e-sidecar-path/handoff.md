## Feature Goal

将 E2E 测试环境下的 sidecar 文件路径从影片目录迁移到用户数据缓存目录（方案 B：按库名分子目录）。

## Frozen Decisions

- **方案 B**：`data/{UserName}/cache/video/{LibName}/{VID}/` — 按库名分子目录
- **环境判断**：通过 `JVEDIO_APP_BASE_DIR` 环境变量区分 E2E / 正式模式
- **正式模式不变**：Release 运行时 sidecar 仍写入影片所在目录

## Current Status

**全部完成** — Phase 1-4 均已完成并提交。

## Scope

### 已完成

1. ✅ Phase 2：文档更新（5 个文档统一 E2E sidecar 路径描述） — `d8912da`
2. ✅ Phase 3：文档一致性验证通过
3. ✅ Phase 4：Worker 代码 + 测试 + 脚本适配 — `6db3941`
   - `WorkerPathResolver.cs` — `VideoCacheFolder` + `IsTestEnvironment`
   - `LibraryScrapeService.cs` — `ResolveSidecarDirectory()` + 路径路由
   - `VideoService.cs` — `BuildSidecarState` / `DeleteVideo` 路径路由
   - `SidecarPathTests.cs` — +3 测试（总计 55 个，全部通过）
   - `seed-e2e-data.ps1` — Step 5.9 验证改为 cache/video 路径
   - `cleanup-e2e-data.ps1` — cache 目录显式清理

## Current Blockers

无。Feature 已完成，可归档至 `plan/archive/`。
