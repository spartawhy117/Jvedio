# Desktop UI Shell Refactor Handoff

## Feature Goal

- 将 `desktop-ui-shell-refactor` 从“后端与数据层已验证”推进到“前端 E2E 自动化验收完成”的状态。
- 当前已完成 `plan.md` 中的 **Phase 10**，前端 E2E 验收、测试产物沉淀和相关文档收口均已落地。

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

- 当前 feature 主体实现与 Phase 10 验收已经完成。
- 若继续接手，优先看 `validation.md`、E2E 文档和本轮产物，再决定是否归档当前 feature 或转入下一项 UI 收口工作。

## Start Here Now

当前默认先读：

1. `plan/active/desktop-ui-shell-refactor/plan.md`
2. `plan/active/desktop-ui-shell-refactor/validation.md`
3. `doc/testing/e2e/playwright-e2e-test-plan.md`
4. `doc/testing/e2e/playwright-e2e-test-cases.md`

## Recommended Kickoff Command

> 当前默认先检查 `plan.md`、`validation.md` 和 `doc/testing/e2e/` 的最终记录；如需复验，再按 `test-data/scripts/seed-e2e-data.ps1` + `tauri/scripts/start-e2e-env.ps1` 重放本轮环境。

## Current Focus

- 本轮最终结论：7 组 flow 与抓取失败优雅降级前端链路均已有真实验收记录。
- 代码侧本轮补了 `ActorDetailPage` 的关联影片菜单 / 多选能力，以及 Settings 的 MetaTube diagnostics 合同对齐显示。
- 文档与截图产物已同步完成，可直接作为 Phase 10 结案依据。

## Current Blockers

- 当前唯一阻断项是本机缺少 Rust `cargo`，导致主解决方案 Release 打包步骤中的 `npm run tauri build` 无法在本机完成。
- 除该本机环境问题外，本轮前端验收、前端编译和 Worker 测试均已通过。
