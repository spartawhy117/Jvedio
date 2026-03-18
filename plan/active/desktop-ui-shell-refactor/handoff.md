## Feature Goal

- 将 `desktop-ui-shell-refactor` 从"代码已写完"推进到"完整可运行、可端到端测试"的状态。
- 目标：`npm run tauri dev` 能启动完整程序，Worker 联通，所有页面流转和业务操作可执行。

## Frozen Decisions

- `React + TypeScript` 是唯一默认 renderer 路线。
- Worker 正式继续采用**动态端口**。
- 新桌面壳目录正式冻结为 `tauri/`。
- `doc/UI/new/` 是唯一正式 UI 输入；主题、多语言、图片 / 图标长期规范统一看 `doc/UI/new/foundation/`。
- `electron/` 已物理删除，不再存在于仓库中。

## Phase 1–5 回顾（已完成）

| 阶段 | 状态 | 概要 |
|------|------|------|
| Phase 0 — 方案冻结 | ✅ | 技术主线、目录、端口策略全部冻结 |
| Phase 1 — MainShell Spike | ✅ | Tauri 壳层 + Worker 拉起 + SSE 连接 |
| Phase 2 — Renderer 基座重建 | ✅ | API client + 路由 + 共享组件 + Query 缓存 + SSE 总线 |
| Phase 3 — 业务页迁移 | ✅ | 7 个页面完整实现 + 9 个共享组件 |
| Phase 4 — Release 切换 | ✅ | TauriShellLauncher + PrepareTauriShellArtifacts |
| Phase 5 — 旧 Electron 清理 | ✅ | electron/ 物理删除 + 文档清退 |

## 当前真实状态（Phase 6 起点）

### 已完成

- 前端代码 4000+ 行 TSX/TS，7 个完整业务页面 + 9 个共享组件
- API Client 完整覆盖所有 Worker 端点（真实 fetch，非 mock）
- 所有页面间导航跳转已连线（onClick → navigate）
- SSE 事件总线 + Query cache invalidation 完整
- Rust 端 Worker 进程管理（spawn/monitor/kill）完整
- 主题 (light/dark/system) + 国际化 (zh/en) 完整
- TypeScript 编译零错误（`tsc --noEmit` 通过）

### 未验证 / 已知缺口

| 缺口 | 严重度 | 说明 |
|------|--------|------|
| **Worker.exe 未编译** | 🔴 阻断 | `Jvedio.Worker.exe` 不存在，需 `dotnet build -c Release` |
| **node_modules 不存在** | 🔴 阻断 | 需重新 `npm install` |
| **Tauri Rust 端从未 debug 编译** | 🔴 阻断 | `target/debug/` 不存在，首次 `tauri dev` 需编译 |
| **Settings 3 个子组只有占位** | 🟡 功能缺陷 | Image / ScanImport / Library 设置组没有表单控件 |
| **VideoDetail "打开文件夹" 空函数** | 🟡 功能缺陷 | `onClick: () => {}` 需接入 Tauri shell API |
| **右键菜单未实现** | 🟡 功能缺陷 | 文档定义了但代码中未实现 |
| **worker-dist 目录不存在** | 🟡 构建 | prepare-worker.ps1 从未执行过 |

### 启动链路（dev 模式）

```
npm run tauri dev
  ├─ Vite dev server → http://localhost:1420
  ├─ cargo build (debug) → Tauri 壳 exe
  ├─ Rust spawn_worker() → resolve_worker_path()
  │   └─ dev 模式: {repo}/Jvedio-WPF/Jvedio.Worker/bin/Release/net8.0/Jvedio.Worker.exe
  ├─ Worker stdout → "JVEDIO_WORKER_READY http://127.0.0.1:{port}"
  ├─ Rust emit "worker-ready" → 前端 WorkerContext
  └─ 前端 fetchBootstrap → createApiClient → connectSSE → 渲染主界面
```

## Phase 6：端到端可运行验证

### 目标

从当前"代码已写完但从未真正运行"的状态，推进到**完整可执行的端到端流程**：

1. `npm run tauri dev` 一键启动
2. Worker 正常拉起并联通
3. 主界面正常渲染
4. 所有页面导航流转正常
5. 核心业务操作可执行（CRUD、播放、收藏、设置保存等）

### 6.1 编译基础设施

- [ ] `dotnet build -c Release` 编译 Jvedio.Worker
- [ ] 确认 Worker.exe 生成在 `Jvedio-WPF/Jvedio.Worker/bin/Release/net8.0/`
- [ ] `npm install` 安装前端依赖
- [ ] `tsc --noEmit` 验证 TypeScript 编译

### 6.2 首次启动验证

- [ ] `npm run tauri dev` 能成功启动（Rust 编译 + Vite + Worker）
- [ ] WorkerStatusOverlay 正常显示启动状态
- [ ] Worker ready 后主界面渲染
- [ ] 确认 bootstrap 数据正常获取
- [ ] 确认 SSE 连接建立

### 6.3 页面流转端到端测试

以 `doc/UI/new/flow/` 7 张流程图为测试基准：

- [ ] `main-shell-navigation-flow` — 所有导航切换正常
- [ ] `library-management-flow` — 建库/编辑/删除/扫描/打开单库
- [ ] `library-workbench-flow` — 影片列表/排序/分页/进详情/返回恢复状态
- [ ] `favorites-flow` — 收藏列表/进详情/返回
- [ ] `actors-flow` — 演员列表/演员详情/关联影片/二级返回
- [ ] `video-detail-playback-flow` — 详情渲染/播放/演员入口/返回
- [ ] `settings-flow` — 设置读取/保存/恢复默认/MetaTube 诊断

### 6.4 发现问题修复

修复启动和运行过程中发现的所有阻断性问题。可能包括：

- Worker 路径解析问题
- API 端点不匹配（前端类型 vs Worker 实际响应）
- SSE 事件格式不匹配
- CSS 样式问题
- 功能缺口补全（Settings 表单、打开文件夹、右键菜单等）

## Start Here Now

当前默认先读：

1. `plan/active/desktop-ui-shell-refactor/handoff.md`（本文件）
2. `plan/active/desktop-ui-shell-refactor/validation.md`
3. `doc/UI/new/flow/README.md`

## Recommended Kickoff Command

> Phase 1–5 代码实现已完成。当前进入 Phase 6：端到端可运行验证。先编译 Worker，再 `npm run tauri dev` 启动，按 7 张流程图逐一验证所有页面流转和业务操作。

## Current Blockers

- **Worker.exe 未编译** — 需要 .NET 8 SDK + `dotnet build -c Release`
- **node_modules 缺失** — 需要 `npm install`
- **Tauri Rust 端未编译 debug** — 首次 `tauri dev` 需等待 Rust 编译（2-5 分钟）
