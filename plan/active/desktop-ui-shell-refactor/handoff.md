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

## Phase 6 回顾（已完成）

- 端到端可运行验证 ✅
- 7 个 bug 修复 ✅
- 日志目录统一（Worker + Shell → `log/`）✅
- Playwright 方案验证 ✅

## Phase 7 回顾（已完成）

| 子项 | 状态 | 概要 |
|------|------|------|
| 7.1 Settings 占位补全 | ✅ | Image/ScanImport/Library 三组真实表单替换 Coming Soon |
| 7.2 视频操作 API | ✅ | toggle-favorite + delete + batch-favorite + batch-delete 四端点 |
| 7.2b 前端多选与批量操作 | ✅ | LibraryPage + FavoritesPage 多选态 + 批量操作栏 + 右键菜单扩展 |

## Phase 8 回顾（已完成）

| 子项 | 状态 | 概要 |
|------|------|------|
| 8.1 新建测试工程 | ✅ | `Jvedio.Worker.Tests` .NET 8 SDK-style csproj + MSTest 3.x |
| 8.2 配置项目引用 | ✅ | 引用 Worker + Contracts，不引用 WPF 主程序 |
| 8.3 重建测试基础设施 | ✅ | `TestBootstrap.cs` 使用 `WebApplicationFactory<Program>` |
| 8.4 旧测试迁移评估 | ✅ | 0 个可直接迁移，5 个高价值已重写到 BusinessLogicTests/ |
| 8.5 Worker API 契约测试 | ✅ | 44 个测试覆盖 9 个维度（Bootstrap/Libraries/Settings/Videos/DTO/VidParsing/SidecarPath/ScanOrganize/ScanImportApi） |
| 8.6 新建测试脚本 | ✅ | 3 个 PS1 脚本（all/unit/integration） |
| 8.7 更新解决方案 | ✅ | sln 添加 Worker.Tests，移除旧 Jvedio.Test 引用 |
| 8.8 删除旧测试工程 | ✅ | `dotnet/Jvedio.Test/` 已物理删除 |
| 8.9 关联文档更新 | ✅ | AGENTS.md + testing/README + test-plan + test-targets + test-current-suite + developer.md + CHANGELOG |

## Phase 8.5 回顾（已完成）

| 子项 | 状态 | 概要 |
|------|------|------|
| 目录更名 | ✅ | `Jvedio-WPF/` → `dotnet/`，`git mv` + 4 个源码文件 + 29 个文档 171 处替换 |

## Phase 9 回顾（已完成）

| 子项 | 状态 | 概要 |
|------|------|------|
| 日志分层 | ✅ | `log/` 从平铺改为 `runtime/` + `test/` + `dev/` 分层结构 |
| Worker 日志 | ✅ | `ResolveLogDirectory()` → `log/runtime/`，`JVEDIO_LOG_DIR` 自动追加 `runtime/` |
| Shell 日志 | ✅ | `resolve_log_dir()` → `log/runtime/`，同样自动追加 |
| 测试日志 | ✅ | `TestBootstrap.cs` 指向 `log/test/worker-tests/` |
| 日志规范 | ✅ | `doc/logging-convention.md` 重写为分层结构 |
| 关联文档 | ✅ | AGENTS.md + testing/README + handoff.md + .gitignore + CHANGELOG |

## Phase 9.6 回顾（已完成）— 数据层流程测试完善

| 子项 | 状态 | 概要 |
|------|------|------|
| 9.6.0 测试环境配置基础设施 | ✅ | `test-data/config/test-env.json` + `.local.json` 覆盖机制 + `.gitignore` 更新 |
| 9.6.1 播种脚本改造 | ✅ | `seed-e2e-data.ps1` 从 `test-env.json` 读取 + MetaTube 抓取步骤（Step 5.5-5.9） |
| 9.6.2 Actor API 契约测试 | ✅ | `ActorApiTests.cs` — 5 个用例（列表/分页/搜索/详情404/关联影片404） |
| 9.6.3 MetaTube 抓取集成测试 | ✅ | `ScrapeApiTests.cs` — 3 个用例（无效库404/有效库202/diagnostics 契约） |
| 9.6.4 测试文档更新 | ✅ | test-targets + test-current-suite + test-plan + README + AGENTS + CHANGELOG 全部同步 |
| 9.6.5 后端 API 校验脚本 | ✅ | `verify-backend-apis.ps1` — 31 个端点 / 8 个 Controller，播种后一键校验 |

测试总数：44 → 52，全部通过。MetaTube P0 技术债已消除。

## 当前真实状态（Phase 6 起点）

### 已完成

- 前端代码 4000+ 行 TSX/TS，7 个完整业务页面 + 9 个共享组件
- API Client 完整覆盖所有 Worker 端点（真实 fetch，非 mock）
- 所有页面间导航跳转已连线（onClick → navigate）
- SSE 事件总线 + Query cache invalidation 完整
- Rust 端 Worker 进程管理（spawn/monitor/kill）完整
- 主题 (light/dark/system) + 国际化 (zh/en) 完整
- TypeScript 编译零错误（`tsc --noEmit` 通过）
- scrape-fail-graceful（抓取失败优雅降级）已完成：DB 新增 `ScrapeStatus` 列、stub sidecar 机制、右键"重新抓取元数据"接入 API、VideoCard 占位图替换、SSE 刷新增强、+10 测试（52→62）

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
  │   └─ dev 模式: {repo}/dotnet/Jvedio.Worker/bin/Release/net8.0/Jvedio.Worker.exe
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

### 6.0 统一日志目录

- [x] Worker 添加 Serilog 文件日志 → `log/runtime/worker-{date}.log`
- [x] Tauri Shell 添加 `shell_log.rs` 文件日志 → `log/runtime/shell-{date}.log`
- [x] 覆盖模式：Shell 每次启动截断当日日志；Worker Serilog 按天滚动
- [x] 10 天自动清理（Worker `retainedFileCountLimit`、Shell `clean_old_logs`）
- [x] `JVEDIO_LOG_DIR` 环境变量支持路径覆盖（自动追加 `runtime/` 子目录）
- [x] `.gitignore` 添加 `!/log/` + 子目录例外
- [x] 日志规范文档：`doc/logging-convention.md`

### 6.1 编译基础设施

- [ ] `dotnet build -c Release` 编译 Jvedio.Worker
- [ ] 确认 Worker.exe 生成在 `dotnet/Jvedio.Worker/bin/Release/net8.0/`
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

- ~~**Worker.exe 未编译**~~ ✅ 已解决 — `dotnet build -c Release` 编译通过
- ~~**node_modules 缺失**~~ ✅ 已解决 — `npm install` 安装完成
- ~~**Tauri Rust 端未编译 debug**~~ ✅ 已解决 — 首次 `tauri dev` 编译成功
- ~~**Playwright 浏览器无法绕过 Tauri IPC**~~ ✅ 已解决 — WorkerContext 浏览器模式检测 + URL 参数传递 Worker 端口
- ~~**CORS 跨域阻止**~~ ✅ 已解决 — Worker Program.cs 添加 CORS 中间件
- **SettingsPage useApiQuery 无限重渲染** — `Maximum update depth exceeded`，需修复 hook 依赖（已有 bug，不阻断主流程）

## Playwright 自动化测试方案

详见 `doc/playwright-e2e-test-plan.md`。

核心改动：
- `tauri/src/contexts/WorkerContext.tsx` — 浏览器模式检测（`window.__TAURI_INTERNALS__`）+ 动态 import Tauri API + URL 参数直连 Worker
- `dotnet/Jvedio.Worker/Program.cs` — 添加 CORS 中间件支持浏览器跨域访问

已验证通过：
- Playwright 浏览器打开 `localhost:1420?workerPort={port}` → 主界面完整渲染
- 导航点击（设置按钮）→ 设置页加载、API 数据正常返回
- 脚本自动化（start/stop-tauri-dev.ps1）→ 进程管理可靠
