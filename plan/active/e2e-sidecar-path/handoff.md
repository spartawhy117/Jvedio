## Feature Goal

将 E2E 测试环境下的 sidecar 文件路径从影片目录迁移到用户数据缓存目录（方案 B），只改文档，不改 Release 代码。

## Frozen Decisions

- **只改测试环境**：Release 工程的 sidecar 写入路径（影片目录）保持不动
- **方案 B**：`data/{UserName}/cache/video/{LibName}/{VID}/` — 按库名分子目录
- **本次只改文档**：播种脚本和 Worker 代码的实际路径适配留到后续 Phase 4

## Current Status

Phase 1-3 已全部完成（Phase 1 按策略跳过，Phase 2 更新 5 个文档，Phase 3 一致性验证通过）。
剩余 Phase 4（Worker 测试环境路径适配）为后续工作，本次不执行。

## Start Here Now

如需继续，读 `plan/active/e2e-sidecar-path/plan.md` Phase 4，开始 Worker 代码适配。

## Scope

### 已完成

1. ✅ `doc/testing/e2e/e2e-test-data-spec.md` — 数据流图、目录结构树、抓取后产物、播种步骤
2. ✅ `doc/testing/backend/test-targets.md` — E2E 路径对照表、播种测试路径
3. ✅ `test-data/config/README.md` — 关键文件一览、播种产物描述
4. ✅ `AGENTS.md` — 关键目录规则新增 E2E sidecar 说明
5. ✅ `doc/data-directory-convention.md` — Sidecar 章节新增 E2E 目标路径

### 不改的内容

- 所有 `dotnet/` 下的 `.cs` 源码文件
- `test-data/scripts/seed-e2e-data.ps1`（脚本逻辑留后续）
- `dotnet/Jvedio.Worker.Tests/` 下的测试代码

## Current Blockers

无阻断项。Phase 4 需要 Worker 代码配合，暂不执行。
