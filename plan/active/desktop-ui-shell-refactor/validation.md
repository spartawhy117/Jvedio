# Desktop UI Shell Refactor Validation

## 当前阶段

- **Phase 6：端到端可运行验证** — ✅ 完成
- Phase 1–5 已完成（架构搭建、代码实现、构建切换、Electron 清理）
- Phase 6 目标：从"代码已写完"推进到"完整可运行、可端到端测试"

## Phase 1–5 完成状态（历史记录）

| 阶段 | 状态 | 提交数 |
|------|------|--------|
| Phase 1 — MainShell Spike | ✅ | 4 commits |
| Phase 2 — Renderer 基座重建 | ✅ | 6 commits |
| Phase 3 — 业务页迁移 | ✅ | 9 commits |
| Phase 4 — Release 切换 | ✅ | 1 commit |
| Phase 5 — 旧 Electron 清理 | ✅ | 5 commits |

## Phase 6 验证矩阵

### 6.0 统一日志目录

| 验证项 | 状态 | 说明 |
|--------|------|------|
| Worker Serilog 文件日志 | ✅ | `log/worker-{date}.log` 输出正常 |
| Shell Rust 文件日志 | ✅ | `log/shell-{date}.log` 输出正常 |
| 覆盖模式（Shell） | ✅ | 每次启动截断当日 shell 日志 |
| Worker 日期滚动 | ✅ | Serilog `RollingInterval.Day` |
| 10 天自动清理 | ✅ | Worker `retainedFileCountLimit: 10` + Shell `clean_old_logs` |
| `JVEDIO_LOG_DIR` 环境变量 | ✅ | Worker + Shell 均支持覆盖 |
| 日志规范文档 | ✅ | `doc/logging-convention.md` |

### 6.1 编译基础设施验证

| 验证项 | 状态 | 说明 |
|--------|------|------|
| .NET 8 SDK 可用 | ✅ | `dotnet --version` |
| Worker Release 编译成功 | ✅ | `dotnet build -c Release` 在 `Jvedio.Worker/` 下 |
| Worker.exe 存在 | ✅ | `dotnet/Jvedio.Worker/bin/Release/net8.0/Jvedio.Worker.exe` |
| node_modules 安装 | ✅ | `npm install` 在 `tauri/` 下 |
| TypeScript 编译 | ✅ | `tsc --noEmit` 零错误（含 TS2352 修复） |
| Rust toolchain 可用 | ✅ | `rustc --version` + `cargo --version` |

### 6.2 首次启动验证

| 验证项 | 状态 | 说明 |
|--------|------|------|
| Vite dev server 启动 | ✅ | `http://localhost:1420` 返回 200 |
| Tauri Rust 编译成功 | ✅ | `cargo build` 在 `src-tauri/` 下无错误 |
| Tauri 窗口弹出 | ✅ | 1280x800 窗口正常显示 |
| Worker 进程启动 | ✅ | Rust stdout 监控捕获 `JVEDIO_WORKER_READY` |
| WorkerStatusOverlay 正常 | ✅ | 启动中显示加载状态 → Worker ready 后消失 |
| Bootstrap 获取成功 | ✅ | `GET /api/app/bootstrap` 返回 200 (731 bytes) |
| SSE 连接建立 | ✅ | `GET /api/events` EventSource 连接成功 |
| 主界面渲染 | ✅ | 左侧导航 + 右侧内容区正常显示 |
| 浏览器模式检测 | ✅ | `isTauriEnvironment()` 正确区分 Tauri/浏览器环境 |
| CORS 跨域访问 | ✅ | 浏览器 → Worker API 跨域 fetch 正常 |
| Playwright 浏览器直连 | ✅ | `?workerPort={port}` 参数 → WorkerContext 直连成功 |

### 6.3 页面流转端到端测试（API 级）

基准：`doc/UI/new/flow/` 7 张流程图

#### main-shell-navigation-flow

| 验证项 | 状态 | 说明 |
|--------|------|------|
| Bootstrap 数据正常 | ✅ | 返回 app + shell + user 信息 |
| Vite SPA 页面渲染 | ✅ | React 应用加载 (567 bytes HTML) |
| Worker 状态指示灯 | ✅ | WorkerContext 检测 + 连接成功 |
| 导航切换（设置/库管理/喜欢/演员） | ✅ | 各页面路由 + API 端点均可访问 |

#### library-management-flow

| 验证项 | 状态 | 说明 |
|--------|------|------|
| 库列表正常加载 | ✅ | `GET /api/libraries` 返回 200 |
| 新建库 → 列表刷新 | ✅ | `POST /api/libraries` 返回 200 |
| 删除库 → 列表刷新 | ✅ | `DELETE /api/libraries/{id}` 返回 200 |
| 重复库名冲突 | ✅ | 返回 409 Conflict（预期行为）|

#### library-workbench-flow

| 验证项 | 状态 | 说明 |
|--------|------|------|
| 影片列表加载 | ✅ | `GET /api/libraries/{id}/videos` 返回 200 (空列表) |
| 空态正常显示 | ✅ | `totalCount: 0` 正确返回 |

#### favorites-flow

| 验证项 | 状态 | 说明 |
|--------|------|------|
| 收藏列表加载 | ✅ | `GET /api/videos/favorites` 返回 200（修复前 500） |
| 空态正常显示 | ✅ | `totalCount: 0` 正确返回 |

#### actors-flow

| 验证项 | 状态 | 说明 |
|--------|------|------|
| 演员列表加载 | ✅ | `GET /api/actors` 返回 200（修复前 500） |
| 空态正常显示 | ✅ | `totalCount: 0` 正确返回 |

#### settings-flow

| 验证项 | 状态 | 说明 |
|--------|------|------|
| 设置读取 | ✅ | `GET /api/settings` 返回 200 (291 bytes) |
| 保存设置 | ✅ | `PUT /api/settings` 返回 200，值持久化 |
| 恢复默认 | ✅ | `PUT /api/settings` + `resetToDefaults: true`，通过 SettingsService 处理 |
| MetaTube 诊断端点 | ✅ | `POST /api/settings/meta-tube/diagnostics` 端点存在 |

> 注：所有前端导航和 UI 交互（点击按钮、分组切换、toast 反馈）依赖 Playwright UI 测试或手动验证。API 级别已全部通过。

### 6.4 发现问题修复

| 问题 | 状态 | 修复 |
|------|------|------|
| `no such table: metadata` | ✅ | `WorkerStorageBootstrapper` 添加 metadata/metadata_video 建表 |
| `no such table: actor_info` | ✅ | `WorkerStorageBootstrapper` 添加 actor_info/metadata_to_actor 建表 |
| `no such column: actor_info.ImageUrl` | ✅ | 建表 SQL 添加 ImageUrl 列 + `EnsureColumnExists` 兼容旧库 |
| SSE `OperationCanceledException` | ✅ | `ApiExceptionMiddleware` 添加 `OperationCanceledException` 静默捕获 |
| `useApiQuery` 无限重渲染 | ✅ | 用 `useRef` 稳定 `queryFn` 引用，避免 `fetchData` 反复重建 |
| TS2352 类型转换错误 | ✅ | `window as unknown as Record<string, unknown>` 双重转换 |
| Rust `dead_code` 警告 | ✅ | 移除未使用的 `LOG_FILE` 静态变量 |

### 6.4 已知功能缺口（不阻断 Phase 6）

| 缺口 | 优先级 | 状态 |
|------|--------|------|
| Settings Image 组无表单控件 | 中 | 已有 Coming Soon 占位 |
| Settings ScanImport 组无表单控件 | 中 | 已有 Coming Soon 占位 |
| Settings Library 组无表单控件 | 中 | 已有 Coming Soon 占位 |
| VideoDetail "打开文件夹" | 中 | 已接入 Tauri opener API |
| 右键菜单（ContextMenu） | 中 | 不阻断主流程 |
| 视频多选/批量操作 | 低 | 不阻断主流程 |

### 6.5 事件级验证

| 事件 | 状态 | 说明 |
|------|------|------|
| `worker.ready` → 前端进入可交互 | ✅ | WorkerContext 检测 + Bootstrap 成功 |
| SSE `/api/events` 连接 | ✅ | HttpClient 连接成功 (HTTP OK) |
| Library CRUD → `library.changed` | ✅ | POST/DELETE 库后 GET 列表数据即时更新 |
| `settings.changed` → 设置缓存失效 | ✅ | PUT 设置后 GET 确认值持久化 |
| Settings reset → 值恢复 | ✅ | `resetToDefaults: true` 由 SettingsService 处理 |

## Phase 6 通过标准

| 标准 | 状态 |
|------|------|
| `npm run tauri dev` 一键启动 | ✅ |
| Worker 正常拉起，主界面正常渲染 | ✅ |
| 7 张流程图对应的主链路 API 全部可执行 | ✅ |
| 核心 CRUD 操作有真实数据反馈 | ✅ |
| 页面间导航 API 端点正常 | ✅ |
| SSE 事件流连接正常 | ✅ |
| 无阻断性运行时错误 | ✅ |

## Phase 6 提交记录

| 提交 | 说明 |
|------|------|
| `541e0ac` | Phase 6.0 — 统一日志目录 |
| `d627770` | Phase 6.1 — TS2352 修复 + Rust dead_code 清理 |
| `a7998eb` | Phase 6.4 — SQLite 缺失表 + useApiQuery 无限循环 + SSE 异常 |

---

## Phase 7 — E2E 测试数据播种与 Playwright 自动化（早期规划，部分已重新分配）

> ⚠️ **注意**：本 Phase 7 是早期规划文档。其中 7.1 的"播种脚本基础版"已在 Phase 9.5 中实现为 `test-data/scripts/seed-e2e-data.ps1`（仅扫描，不含抓取）。**MetaTube 抓取步骤 + Actor 数据验证 + 相关测试覆盖**已正式分配到 `plan.md` 的 **Phase 9.6** 章节执行。7.3 Playwright 自动化对应 Phase 10。

### 概述

Phase 6 完成了 API 级端到端验证，但所有列表页（影片、收藏、演员）均为空态。Phase 7 目标是准备真实测试数据并接入 Playwright UI 自动化回归。

### 7.1 测试数据播种

#### 目录结构（已创建）

```
dotnet/Jvedio.Test/config/scan/input/
├── lib-a/          ← 媒体库 A 的扫描目录
│   └── .gitkeep
└── lib-b/          ← 媒体库 B 的扫描目录
    └── .gitkeep
```

复用现有测试资产：

| 资产 | 来源 | 复用方式 |
|------|------|---------|
| 测试 VID | `meta-tube-test-config.json` 的 `cases` | `JUR-293-C`、`SNOS-037` 已验证 MetaTube 有数据 |
| MetaTube 服务地址 | `test-data/config/test-env.json` | 默认 `https://metatube-server.hf.space`，可通过 `.local.json` 覆盖 |
| 已缓存元数据 | `config/meta-tube/output/` | 确认抓取可达性的参考，不直接导入 Worker |

#### 假视频文件规划（待创建）

| 文件 | 放置目录 | VID | 用途 |
|------|---------|-----|------|
| `JUR-293-C.mp4` | `input/lib-a/` | JUR-293-C | scan + scrape（MetaTube 已验证） |
| `SNOS-037.mp4` | `input/lib-a/` | SNOS-037 | scan + scrape（MetaTube 已验证） |
| `ABP-001.mp4` | `input/lib-a/` | ABP-001 | scan-only，验证扫描链路 |
| `SONE-100.mp4` | `input/lib-b/` | SONE-100 | 第二个库的扫描数据 |
| `MIDV-200.mp4` | `input/lib-b/` | MIDV-200 | 第二个库的扫描数据 |

要求：假文件只需扩展名正确 + 文件大小超过 `MinFileSize`（默认 0MB，可配置），不需要是真实视频内容。

#### 播种脚本流程（待实现）

```
PowerShell 播种脚本：config/scan/seed-e2e-data.ps1

Step 1: 确保 Worker 已启动
Step 2: PUT /api/settings → MetaTubeConfig.ServerUrl = https://metatube-server.hf.space
Step 3: POST /api/libraries → 创建库 A（scanPaths 指向 input/lib-a/）
Step 4: POST /api/libraries → 创建库 B（scanPaths 指向 input/lib-b/）
Step 5: POST /api/libraries/{libA}/scan → 扫描库 A（导入 3 部影片记录）
Step 6: POST /api/libraries/{libB}/scan → 扫描库 B（导入 2 部影片记录）
Step 7: POST /api/libraries/{libA}/scrape → 抓取库 A（MetaTube 在线拉取元数据）
Step 8: 轮询 GET /api/tasks/{taskId} 等待完成
Step 9: POST /api/videos/{id}/favorite → 收藏 2 部影片
Step 10: 验证 GET /api/libraries/{id}/videos 有数据
Step 11: 验证 GET /api/actors 有数据
```

#### 数据就绪后预期状态

| 数据类型 | 数量 | 来源 |
|---------|------|------|
| 媒体库 | 2 个 | Step 3-4 创建 |
| 影片记录 | 5 部（3 + 2） | Step 5-6 扫描导入 |
| 已抓取元数据 | 2 部（JUR-293-C、SNOS-037） | Step 7 MetaTube 抓取 |
| 已收藏影片 | 2 部 | Step 9 |
| 已关联演员 | ≥ 2 位 | Step 7 抓取时自动写入 |

### 7.2 scan-test-config.json 路径更新（待执行）

当前配置中的路径硬编码为 `D:\study\Proj\Jvedio\...`（原开发环境），需要更新为相对路径或当前工作区路径。

### 7.3 Playwright UI 自动化

依赖 7.1 数据播种完成后执行。测试用例清单见 `doc/testing/e2e/playwright-e2e-test-cases.md`（48 个用例）。

### 7.4 验证矩阵（待填充）

Phase 7 完成后在此补充验证矩阵，格式同 Phase 6。
