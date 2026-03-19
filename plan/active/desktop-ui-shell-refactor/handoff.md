# Desktop UI Shell Refactor Handoff

## Feature Goal

- 将 `desktop-ui-shell-refactor` 从“后端与数据层已验证”推进到“前端 E2E 自动化验收完成”的状态。
- 当前主任务：执行 `plan.md` 中的 **Phase 10**，完成 Playwright 驱动的前端验收、测试产物沉淀和相关文档收口。

## Frozen Decisions

- `React + TypeScript` 是唯一默认 renderer 路线。
- Worker 正式继续采用**动态端口**。
- 新桌面壳目录正式冻结为 `tauri/`。
- `doc/UI/new/` 是唯一正式 UI 输入；主题、多语言、图片 / 图标长期规范统一看 `doc/UI/new/foundation/`。
- `electron/` 已物理删除，不再存在于仓库中。

## Phase 0–9.6 回顾（已完成）

| 阶段 | 状态 | 概要 |
|------|------|------|
| Phase 0 — 方案冻结 | ✅ | 技术主线、目录、端口策略全部冻结 |
| Phase 1 — MainShell Spike | ✅ | Tauri 壳层 + Worker 拉起 + SSE 连接 |
| Phase 2 — Renderer 基座重建 | ✅ | API client + 路由 + 共享组件 + Query 缓存 + SSE 总线 |
| Phase 3 — 业务页迁移 | ✅ | 7 个页面完整实现 + 共享组件落地 |
| Phase 4 — Release 切换 | ✅ | `TauriShellLauncher` + `PrepareTauriShellArtifacts` |
| Phase 5 — 旧 Electron 清理 | ✅ | `electron/` 物理删除 + 文档清退 |
| Phase 6 — 端到端可运行验证 | ✅ | 首次启动、日志统一、API/SSE 连通、阻断 bug 修复 |
| Phase 7 — UI 补全 | ✅ | Settings 真实表单 + 视频多选/批量操作 + 右键菜单 + 收藏心形 |
| Phase 8 — 后端测试迁移 | ✅ | 新建 `Jvedio.Worker.Tests`，旧测试工程移除 |
| Phase 8.5 — 目录更名 | ✅ | `Jvedio-WPF/` → `dotnet/` |
| Phase 9 — 日志与测试数据规范 | ✅ | 日志目录分层 + `test-data/` 目录统一 |
| Phase 9.6 — 数据层流程测试完善 | ✅ | `test-env.json` + 播种/抓取/verify 链路打通，后端数据验证完成 |

## 当前真实状态

### 已完成

- `tauri/` 壳层、`tauri/src/` renderer、`dotnet/Jvedio.Worker`、`dotnet/Jvedio.Contracts` 全链路已可编译运行。
- 后端数据验证 feature 已完成，默认测试配置与 `seed-e2e-data.ps1` / `verify-backend-apis.ps1` 已跑通。
- `scrape-fail-graceful` 的前端验收点已收口进 [plan.md](plan/active/desktop-ui-shell-refactor/plan.md) 的 Phase 10。
- 当前 active feature 只剩 `desktop-ui-shell-refactor`，目标已收敛到前端 E2E 自动化与验收。

### 当前工作重心

- 进入 **Phase 10：E2E 自动化测试**。
- 基于 `test-data/e2e/` 的真实播种环境执行 Playwright UI 验收。
- 把 7 组 flow 和“抓取失败优雅降级”前端链路纳入验收记录。
- 完成报告、截图、validation 和测试文档回写。

## Start Here Now

当前默认先读：

1. `plan/active/desktop-ui-shell-refactor/plan.md`
2. `plan/active/desktop-ui-shell-refactor/validation.md`
3. `doc/testing/e2e/playwright-e2e-test-plan.md`
4. `doc/testing/e2e/playwright-e2e-test-cases.md`

## Recommended Kickoff Command

> 当前进入 Phase 10。先按 `test-data/scripts/seed-e2e-data.ps1` 准备数据环境，再拉起 Playwright 所需的 Worker + Vite，围绕 7 张 flow 图和抓取失败优雅降级前端链路执行 E2E 验收，并把结果写回 validation 与相关测试文档。

## Current Focus

- 先复用 `test-data/scripts/seed-e2e-data.ps1` 和 `test-data/scripts/verify-backend-apis.ps1` 的真实数据准备链路，不再另造 Phase 10 假数据。
- Phase 10 当前主线是前端验收：按 `doc/UI/new/flow/README.md` 的 7 组 flow 做页面流转、返回链路和固定动作集合验证。
- `scrape-fail-graceful` 的前端点位已并入当前 feature，需要重点验证失败样本占位图、失败样本可见性、单影片重抓与页面回刷。

## Current Blockers

- 仓库当前没有正式提交的 Playwright 项目与统一 E2E 启停脚本，Phase 10 需要先补齐执行入口。
- 现有 `doc/testing/e2e/` 文档仍保留旧样本、旧数量和部分错误假设，执行前必须先回写到“真实代码 + 真实数据”口径。
- 前端实现与 UI 文档之间存在漂移风险，执行时要先用真实页面核对固定菜单项、批量操作承载位置和返回链路。
