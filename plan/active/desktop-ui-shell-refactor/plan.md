## 文档定位

本文件是 `desktop-ui-shell-refactor` 的**迁移与重构方案（存活文档）**。

技术主线：`Tauri 2 + React 19 + TypeScript 5.8 + Vite 7`，桌面壳与 renderer 已全新重建；业务底座 `Worker + Contracts + HTTP API + SSE` 保持不变。

---

## 结论先行

| 维度 | 当前状态 |
|------|---------|
| 桌面壳 | `tauri/` — Tauri 2 Rust 壳层，已可编译运行 |
| Renderer | `tauri/src/` — React 19 + TS，82 个源文件，7 个业务页 + 10 个共享组件 |
| 业务服务 | `Jvedio-WPF/Jvedio.Worker` — ASP.NET Core，动态端口 |
| 跨层合同 | `Jvedio-WPF/Jvedio.Contracts` — DTO / 事件 envelope / 错误模型 |
| UI 输入 | `doc/UI/new/` — 唯一正式 UI 输入，已冻结 |
| Electron | **已物理删除**，不再作为任何路径 |

---

## 目标架构

### 分层总览

```
doc/UI/new/           ← 唯一 UI 输入
  ↓
Tauri 2 壳层          ← 窗口 / 单实例 / 托盘 / Worker 拉起与关闭 / 桌面桥接
  ↓
React Renderer        ← 路由 / 页面 / 组件 / 查询缓存 / SSE 订阅 / 主题 / i18n
  ↓
Jvedio.Worker         ← 数据库 / 扫描 / 抓取 / sidecar / 任务编排 / SSE 广播
  ↓
Jvedio.Contracts      ← DTO / 事件 envelope / 错误模型（跨层真相源）
```

### 分层原则

- 壳层只做桌面能力与进程编排，不做业务决策
- Renderer 只做页面表达与状态协作，不做重业务运算
- Worker 继续做所有本地业务服务
- Contracts 是唯一合同定义，Renderer 不允许自行发散 DTO
- 事件通知继续优先使用 SSE，不退回轮询

---

## 当前工程结构

### `tauri/` 核心目录

```
tauri/
├── package.json          # jvedio-shell v5.0.0
├── vite.config.ts
├── tsconfig.json
├── index.html
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   └── src/
│       ├── main.rs       # 入口 → jvedio_shell_lib::run()
│       ├── lib.rs         # Tauri Builder / Worker 管理 / 桌面桥接
│       └── shell_log.rs   # 壳层日志（文件 + 10 天清理）
├── src/
│   ├── App.tsx            # 主壳：左侧导航 + 右侧内容区
│   ├── main.tsx
│   ├── api/
│   │   ├── client.ts      # 所有 Worker 端点的 fetch 封装
│   │   ├── events.ts      # SSE 事件总线
│   │   └── types.ts       # TS DTO（镜像 Contracts）
│   ├── hooks/
│   │   ├── useApiQuery.ts
│   │   └── useSSESubscription.ts
│   ├── contexts/
│   │   ├── BootstrapContext.tsx
│   │   └── WorkerContext.tsx
│   ├── pages/             # 7 个业务页 + PageRouter
│   ├── components/        # 10 个共享组件 + 3 个全局组件 + 1 个弹层
│   ├── theme/             # light/dark 主题
│   ├── locales/           # zh + en（i18next）
│   ├── router/
│   └── assets/
├── scripts/
│   └── prepare-worker.ps1
└── worker-dist/
```

### 依赖（极简）

```json
{
  "@tauri-apps/api": "^2",
  "@tauri-apps/plugin-opener": "^2",
  "i18next": "^25.8.18",
  "react": "^19.1.0",
  "react-dom": "^19.1.0",
  "react-i18next": "^16.5.8"
}
```

当前未引入第三方 UI 组件库，样式为手写 CSS；后续视 UI 精细化需求可按需引入。

---

## 页面与组件清单

### 业务页面（7 个）

| 页面 | 文件 | 职责 |
|------|------|------|
| LibraryManagementPage | `pages/LibraryManagementPage.tsx` | 建库 / 编辑 / 删除 / 扫描 |
| LibraryPage | `pages/LibraryPage.tsx` | 单库影片列表 / 筛选 / 排序 / 分页 |
| VideoDetailPage | `pages/VideoDetailPage.tsx` | 影片详情 / 播放 / sidecar 状态 |
| FavoritesPage | `pages/FavoritesPage.tsx` | 收藏列表浏览与详情往返 |
| ActorsPage | `pages/ActorsPage.tsx` | 演员列表 |
| ActorDetailPage | `pages/ActorDetailPage.tsx` | 演员详情与关联影片 |
| SettingsPage | `pages/SettingsPage.tsx` | 设置读写 / 恢复默认 / MetaTube 诊断 |

### 共享组件（10 个）

ActionStrip / ActorCard / ConfirmDialog / Pagination / QueryToolbar / ResultState / ResultSummary / StatusBadge / VideoCard / VideoContextMenu

### 全局组件

ErrorBoundary / GlobalToast / WorkerStatusOverlay / CreateEditLibraryDialog

---

## 端口与进程策略

### Worker 端口

- **正式策略：动态端口**
- `Program.cs` 默认 `http://127.0.0.1:0`（未传 `--urls` 时）
- `AppBootstrapService` 返回 `SupportsDynamicWorkerPort = true`
- Tauri 壳层启动 Worker 后从 stdout 读取实际端口，注入 Renderer

### 进程编排

- 壳层负责拉起与关闭 Worker
- Renderer 不直接管理子进程
- `Worker ready` 是 Renderer 可交互的门槛
- Worker 未就绪时展示明确状态覆盖层（`WorkerStatusOverlay`）

---

## 状态策略

| 类别 | 方案 |
|------|------|
| 远端状态（Worker API） | `useApiQuery` 查询缓存，失效刷新 + 局部更新 |
| 事件状态 | SSE（`useSSESubscription`），任务/设置变更事件驱动 |
| 本地 UI 状态 | 路由参数 / 筛选草稿 / 弹层开关 / backTo / loading·error |

---

## 主题、多语言与资源

| 维度 | 方案 |
|------|------|
| 主题 | `light` / `dark`，CSS Variables，`theme/theme-tokens.ts` |
| 多语言 | `i18next + react-i18next`，`zh` + `en`，按模块拆分 JSON |
| 图标 | 通用操作图标走 icon package，品牌/导航图标自有 SVG |

长期实施细则收口于 `doc/UI/new/foundation/` 下对应文档。

---

## 阶段路线与完成状态

### Phase 0–5：✅ 已全部完成

| Phase | 内容 | 状态 |
|-------|------|------|
| 0 | 方案冻结与审查 | ✅ |
| 1 | MainShell Spike（窗口 + Worker 拉起 + Bootstrap + SSE） | ✅ |
| 2 | Renderer 基座（路由 / API client / 查询层 / SSE / 主题 / i18n） | ✅ |
| 3 | 业务页迁移（7 个页面 + 共享组件） | ✅ |
| 4 | Release 切换（`TauriShellLauncher` + `PrepareTauriShellArtifacts`） | ✅ |
| 5 | Electron 物理删除与文档清退 | ✅ |

### Phase 6：端到端验证（API 级）— ✅ 已全部通过

- 6.0 统一日志 ✅
- 6.1 编译基础设施 ✅
- 6.2 首次启动验证 ✅
- 6.3 页面流转 API 级测试（7 张流程图，验证"调 API → 正确响应 → 页面可渲染"链路）✅
- 6.4 Bug 修复（7 个 bug 已修复）✅

> Phase 6 覆盖的是 API 数据链路通畅性，不覆盖 UI 交互完整性。

### Phase 7：UI 交互完整性补全（✅ 已完成）

补完 Phase 6 未覆盖的 UI 交互层缺口。以下为经核实的真实待办项（已剔除过期条目）：

#### 7.1 Settings 占位子组补全 ✅

3 个子组已从 "Coming Soon" 占位升级为真实表单：

| 子组 | 状态 | 已实现 |
|------|------|--------|
| **image**（图片） | ✅ 已完成 | 海报优先来源（remote/local）、缓存大小上限、自动清理开关 |
| **scanImport**（扫描与导入） | ✅ 已完成 | 递归深度、排除规则、整理模式（none/byVid/byActor） |
| **library**（库） | ✅ 已完成 | 默认自动扫描开关、默认排序字段、默认排序方向 |

> **已确认完整**的子组：general（主题/语言/调试）、network（播放器路径）、metaTube（URL/超时/诊断）。
>
> Settings 读写机制（`useApiQuery` + `useApiMutation` + SSE 刷新 + dirty 状态）已通，补全只需添加表单控件和对应的 Worker API 字段。

**前置依赖**：确认 Worker `SettingsController` 是否已暴露 image/scanImport/library 的 API 字段；如果未暴露，需在 Worker + Contracts 同步新增。

#### 7.2 视频多选 / 批量操作 ✅

| 项目 | 状态 | 说明 |
|------|------|------|
| 后端 API | ✅ 已完成 | toggle-favorite、delete-video、batch-favorite、batch-delete 四个端点 |
| Contracts DTO | ✅ 已完成 | ToggleFavoriteResponse、DeleteVideoResponse、BatchOperationRequest/Response |
| isFavorite 字段 | ✅ 已完成 | VideoListItemDto + VideoDetailDto 均已添加 |
| 前端 API 客户端 | ✅ 已完成 | client.ts 新增 4 个方法 + types.ts 同步 |
| 多选交互 | ✅ 已完成 | LibraryPage + FavoritesPage 均接入 selectedIds 状态，VideoCard checkbox 联动 |
| 批量操作栏 | ✅ 已完成 | 选中 ≥1 时显示批量操作条（收藏/取消收藏/删除 + 全选/取消选择） |
| 右键菜单扩展 | ✅ 已完成 | 新增 toggleFavorite + deleteVideo 动作（含 danger 样式） |
| 收藏心形标识 | ✅ 已完成 | VideoCard VID 行前显示 ❤ 图标 |
| i18n | ✅ 已完成 | zh/en common.json 新增 20 个键 |

#### 已完成项（不再列为待办）

| 项目 | 状态 | 说明 |
|------|------|------|
| VideoDetail "打开文件夹" | ✅ 已完成 | 已接入 `@tauri-apps/plugin-opener` 的 `revealItemInDir`，带错误 toast |
| 右键菜单 | ✅ 已完成 | `VideoContextMenu` 组件 + CSS 已实现，已在 LibraryPage 和 FavoritesPage 接入 |

#### 通过标准

- 所有页面的可交互控件均有实际响应，不存在空函数或 "Coming Soon" 占位
- 对照 `doc/UI/new/pages/settings-page.md` 的元素清单，Settings 无遗漏的交互项
- 对照 `doc/UI/new/dialogs/video-batch-context-menu.*`，批量操作菜单与规格一致
- 代码中搜索 "Coming Soon" / "placeholder-hint" 确认无残留占位

#### 关联文档更新

| 文档 | 更新内容 |
|------|---------|
| `plan/active/desktop-ui-shell-refactor/handoff.md` | 更新 Phase 7 完成状态，移除"打开文件夹"和"右键菜单"的遗留标注 |
| `plan/active/desktop-ui-shell-refactor/validation.md` | 新增 Phase 7 验证记录（每个子组的测试截图/操作确认） |
| `doc/UI/new/ui-todo.md` | 标记已完成的 UI 项，更新剩余待办 |
| `doc/CHANGELOG.md` | 追加 Phase 7 变更条目 |
| `doc/testing/backend/test-targets.md` | 如新增了 Worker API 字段，同步更新测试目标 |

---

### Phase 8：后端测试工程迁移

#### 当前问题

| 问题 | 表现 |
|------|------|
| 引用 WPF 主程序 | `ProjectReference` → `Jvedio.csproj`（WPF exe），非独立 Core 库 |
| 强制 WPF 上下文 | `EnsureWpfContext()` → `new Application()` + `Jvedio.App.Init()` |
| 框架版本不兼容 | 测试 .NET Framework 4.7.2 vs Worker .NET 8 |
| Worker / Contracts 零覆盖 | 无任何对 Worker API 或 Contracts DTO 的测试 |
| 旧式 csproj | 非 SDK-style，`packages.config`，不兼容 `dotnet test` |
| 测试脚本硬编码路径 | 3 个 PS1 硬编码 VS 2022 Community 的 MSBuild / vstest 路径 |
| Appium / Selenium 残留 | csproj 引用了 Appium 4.4.5 + Selenium 3.141，实际未使用 |

#### 迁移计划

**步骤 1：新建测试工程**

- 在 `Jvedio-WPF/` 下新建 `Jvedio.Worker.Tests/Jvedio.Worker.Tests.csproj`
- .NET 8 SDK-style，`<TargetFramework>net8.0</TargetFramework>`
- 测试框架：MSTest（`Microsoft.NET.Test.Sdk` + `MSTest.TestAdapter` + `MSTest.TestFramework`）
- Mock 库：Moq（沿用旧工程选择）
- JSON 库：`System.Text.Json`（与 Worker 统一，不再用 Newtonsoft）

**步骤 2：配置项目引用**

- `ProjectReference` 指向：
  - `Jvedio.Worker/Jvedio.Worker.csproj`
  - `Jvedio.Contracts/Jvedio.Contracts.csproj`
- **不引用** `Jvedio.csproj`（WPF 主程序）
- 如 Worker 中有核心逻辑未从主程序剥离（PathManager 等），需先抽取到 Worker 或新建 `Jvedio.Core` 共享库

**步骤 3：重建测试基础设施**

- 新建 `TestBootstrap.cs`：纯服务初始化（DI 容器 / 配置加载 / 日志），不依赖 WPF Application
- 测试配置迁移：`config/` 目录结构保持，JSON 配置文件内容评估是否需更新路径
- 测试输出目录：暂写入 `config/{suite}/output/`（Phase 9 再统一到 `log/`）

**步骤 4：迁移有价值的测试逻辑（16 → 新工程）**

| 原测试 | 类型 | 迁移注意 |
|--------|------|---------|
| SidecarPathResolverTests (3) | Unit | 纯逻辑，需解除 PathManager 静态依赖 |
| ActorAvatarPathResolverTests (1) | Unit | 同上 |
| LibraryOrganizerRuleTests (1) | Unit | 纯逻辑，直接迁移 |
| ScanTaskImportTests (2) | Unit | 涉及 DB 初始化，需改用 DI 注入 |
| MetaTubeCacheTests (1) | Unit | 文件 I/O，需更新缓存路径配置 |
| ScrapeResultMappingTests (1) | Unit | 纯映射逻辑，直接迁移 |
| LoggerInitializationTests (1) | Unit | 改用 Serilog 验证（与 Worker 统一） |
| ScanImportIntegrationTests (1) | Integration | 需 Worker 的扫描服务 DI 初始化 |
| LibraryOrganizeTests (2) | Integration | 需文件系统 + DB |
| MetaTubeIntegrationTests (5) | Integration | 需网络，连接真实 MetaTube 服务 |

> 反射调用私有方法的 2 个测试（`TestBootstrap.OverridePathManagerPath`）需重新评估，如无法消除反射则标记为技术债。

**步骤 5：新增 Worker API 契约层测试**

- 启动 `Jvedio.Worker` 进程（`WebApplicationFactory<T>` 或手动启动）
- 测试关键 HTTP 端点：`/api/bootstrap`、`/api/libraries`、`/api/videos`、`/api/settings`
- 测试 SSE 端点：`/api/events` 事件格式与 Contracts 定义一致
- 验证 DTO 序列化/反序列化与 `Jvedio.Contracts` 类型匹配

**步骤 6：新建测试脚本**

- 新建 `Jvedio.Worker.Tests/scripts/run-all-tests.ps1`
- 改用 `dotnet test` 命令（不再硬编码 VS 路径）
- 保留 `-NoPause` 参数兼容
- 分 suite 脚本：`run-unit-tests.ps1`、`run-integration-tests.ps1`、`run-metatube-tests.ps1`

**步骤 7：更新解决方案**

- `Jvedio.sln` 添加 `Jvedio.Worker.Tests` 项目
- `Jvedio.sln` 移除 `Jvedio.Test` 项目引用

**步骤 8：删除旧测试工程**

- 物理删除整个 `Jvedio-WPF/Jvedio.Test/` 目录（项目文件、代码、配置、脚本、输出、`测试记录/` Excel）
- 确认 `Jvedio.sln` 中无残留引用

#### 通过标准

- `dotnet test Jvedio.Worker.Tests.csproj` 可独立编译运行
- 迁移的测试用例全部通过（16 个 → 绿色）
- Worker API 契约测试覆盖 ≥4 个关键端点
- 旧测试工程完全删除，无残留文件
- `dotnet build Jvedio.sln` 不报错

#### 关联文档更新

| 文档 | 更新内容 |
|------|---------|
| `AGENTS.md` | 更新测试工程路径（`Jvedio.Worker.Tests`）、构建命令（`dotnet test`）、测试脚本入口、测试配置目录 |
| `doc/testing/README.md` | 后端测试章节改为新工程描述，移除迁移待办警告，更新目录结构 |
| `doc/testing/backend/test-plan.md` | 重写：新工程结构、`dotnet test` 执行方式、DI 初始化、配置文件 |
| `doc/testing/backend/test-targets.md` | 新增 Worker API 契约测试目标 |
| `doc/testing/backend/test-current-suite.md` | 更新为新工程的测试清单 |
| `doc/developer.md` | 更新测试相关入口路径 |
| `doc/CHANGELOG.md` | 追加 Phase 8 变更条目 |
| `plan/active/desktop-ui-shell-refactor/handoff.md` | 更新 Phase 8 完成状态 |
| `plan/active/desktop-ui-shell-refactor/validation.md` | 新增 Phase 8 验证记录 |

---

### Phase 9：日志目录统一

**执行前提**：Phase 8 完成后，先重新收集整理当前所有组件的日志输出实际路径，再确定最终目录结构和具体改动项。

#### 启动时收集清单

执行前必须确认以下信息（Phase 8 可能已改变现状）：

| 收集项 | 查看方式 |
|--------|---------|
| Worker 运行日志实际路径 | 读 `Program.cs` 的 `ResolveLogDirectory()` |
| Shell 运行日志实际路径 | 读 `shell_log.rs` 的 `resolve_log_dir()` |
| 新测试工程日志输出路径 | 读 `Jvedio.Worker.Tests` 的测试配置 / Bootstrap |
| 新测试工程 suite 输出路径 | 读各 suite 的 JSON 配置文件 |
| WPF Legacy 日志路径 | 读 `PathManager.cs`（确认是否还在使用） |
| `.gitignore` 当前日志规则 | 读 `.gitignore` 搜索 `log` 相关行 |
| `doc/logging-convention.md` 当前内容 | 与实际路径交叉验证 |

#### 目标结构（初步方案，启动时根据实际情况调整）

```
{repo}/log/
├── runtime/                         ← 正式运行日志
│   ├── worker-{yyyy-MM-dd}.log          ← Worker (.NET) — Serilog
│   └── shell-{yyyy-MM-dd}.log          ← Tauri Shell (Rust)
├── test/                            ← 测试日志与输出
│   ├── worker-tests/                    ← 后端测试工程运行日志
│   │   ├── {yyyy-MM-dd}.log
│   │   ├── meta-tube/                   ← MetaTube suite 输出
│   │   └── scan/                        ← 扫描链 suite 输出
│   └── e2e/                             ← Playwright 产物（Phase 10 使用）
│       ├── traces/
│       ├── screenshots/
│       └── reports/
├── dev/                             ← 开发流程日志（可选，按需启用）
└── .gitkeep
```

#### 涉及代码改动（预估）

| 组件 | 文件 | 改动 |
|------|------|------|
| Worker | `Program.cs` | `ResolveLogDirectory()` 返回 `{repo}/log/runtime/` |
| Shell | `shell_log.rs` | `resolve_log_dir()` 返回 `{repo}/log/runtime/` |
| Shell | `shell_log.rs` | `clean_old_logs()` 清理范围适配新子目录 |
| 新测试工程 | Bootstrap / 配置 | 日志输出 → `{repo}/log/test/worker-tests/` |
| 新测试工程 | suite JSON 配置 | `testOutputRoot` / `cacheRoot` 指向新路径 |
| 环境变量 | `JVEDIO_LOG_DIR` | 评估是否需要支持 `JVEDIO_LOG_DIR/runtime/` 自动补全 |
| .gitignore | 根 `.gitignore` | 添加 `!/log/runtime/`、`!/log/test/`、`!/log/dev/` 等例外规则 |

#### 通过标准

- Worker 运行日志写入 `log/runtime/worker-*.log`
- Shell 运行日志写入 `log/runtime/shell-*.log`
- 新测试工程日志写入 `log/test/worker-tests/`
- 旧路径（`log/worker-*.log`、`data/{user}/log/`）无新日志产生
- 10 天自动清理策略在新子目录下正常工作
- `JVEDIO_LOG_DIR` 环境变量覆盖功能正常
- `doc/logging-convention.md` 与实际路径完全一致

#### 关联文档更新

| 文档 | 更新内容 |
|------|---------|
| `doc/logging-convention.md` | 重写目录结构、更新各组件路径、更新调试指南命令 |
| `AGENTS.md` | 更新测试日志与输出路径段落 |
| `doc/testing/README.md` | 更新日志输出位置说明 |
| `doc/testing/backend/test-plan.md` | 更新测试输出目录描述 |
| `.gitignore` | 更新日志目录例外规则 |
| `doc/CHANGELOG.md` | 追加 Phase 9 变更条目 |
| `plan/active/desktop-ui-shell-refactor/handoff.md` | 更新 Phase 9 完成状态 |

---

### Phase 10：E2E 自动化测试（暂缓）

**前提**：Phase 7 UI 补全 + Phase 8 后端测试迁移 + Phase 9 日志统一全部完成。

> ⚠️ **敏感性说明**：当前为公共电脑环境，E2E 自动化涉及的测试数据模拟（视频文件、媒体库、播种脚本等）可能产生敏感内容痕迹，暂缓执行，待环境条件合适时再启动。

#### 10.1 环境准备

| 项目 | 说明 |
|------|------|
| Playwright 安装 | `npx playwright install chromium`（仅需 Chromium） |
| WorkerContext 浏览器模式 | 确认 `?workerPort=xxx` URL 参数传递正常（Phase 6.2 已验证） |
| Worker CORS | 确认 `AllowAnyOrigin` 中间件仍启用（供 Playwright `localhost:5173` 跨域） |
| 启停脚本 | 新建 `tauri/scripts/start-e2e-env.ps1`：启动 Worker → 等待 ready → 启动 Vite dev → 返回端口 |

#### 10.2 测试数据播种

- 创建 5 个假视频文件（空 mp4，带合规文件名）
- 通过 Worker API 创建 2 个媒体库，指向假视频目录
- 触发扫描导入，确认 5 部影片入库
- 收藏其中 2 部，关联 2 位演员
- **播种脚本**：`tauri/scripts/seed-e2e-data.ps1`（10 步，幂等可重跑）

#### 10.3 用例执行

- 48 个用例（44 全自动 + 4 降级为手动），覆盖 7 张流程图
- 详细用例清单见 `doc/testing/e2e/playwright-e2e-test-cases.md`
- 测试产物写入 `{repo}/log/test/e2e/`（traces / screenshots / reports）

| Flow | 用例数 | 可自动化 | 降级 |
|------|--------|---------|------|
| Main Shell Navigation | 8 | 8 | 0 |
| Library Management | 8 | 8 | 0 |
| Library Workbench | 8 | 6 | 2 |
| Favorites | 5 | 5 | 0 |
| Actors | 6 | 6 | 0 |
| Video Detail Playback | 5 | 3 | 2 |
| Settings | 8 | 8 | 0 |

> 降级用例（播放/打开文件夹/外链）因 Tauri shell API 在浏览器环境不可用，通过手动验证覆盖。

#### 通过标准

- 44 个可自动化用例全部绿色
- 4 个降级用例有手动验证记录
- `log/test/e2e/reports/` 生成可读的 HTML 测试报告
- 失败截图自动保存到 `log/test/e2e/screenshots/`

#### 关联文档更新

| 文档 | 更新内容 |
|------|---------|
| `doc/testing/e2e/playwright-e2e-test-plan.md` | 更新启停脚本路径、测试产物输出路径 |
| `doc/testing/e2e/playwright-e2e-test-cases.md` | 标注实际执行结果（通过/失败/跳过） |
| `doc/testing/README.md` | 前端 E2E 章节移除"暂缓"标注，更新为实际状态 |
| `AGENTS.md` | 新增 E2E 测试脚本入口、测试数据播种说明 |
| `doc/developer.md` | 新增 E2E 环境搭建 / 运行指南 |
| `doc/CHANGELOG.md` | 追加 Phase 10 变更条目 |
| `plan/active/desktop-ui-shell-refactor/handoff.md` | 更新 Phase 10 完成状态 |
| `plan/active/desktop-ui-shell-refactor/validation.md` | 新增 Phase 10 验证记录（测试报告摘要） |

---

## 验证矩阵（Phase 6 已覆盖）

### 架构级

- ✅ Tauri 拉起 Worker
- ✅ Renderer 获取 Bootstrap
- ✅ Renderer 连接 SSE
- ✅ DTO 与事件在前端正确消费

### 页面级

- ✅ 主壳导航切换
- ✅ 库管理 CRUD + 扫描
- ✅ 单库筛选 / 排序 / 分页
- ✅ 收藏列表与详情往返
- ✅ 演员列表与演员详情
- ✅ 影片详情
- ✅ 设置读写 / 恢复默认 / MetaTube 诊断

### 事件级

- ✅ `worker.ready` / `library.changed` / `settings.changed`
- ✅ `task.summary.changed` / `task.created` / `task.completed` / `task.failed` / `task.progress`

---

## 非目标

- 不把 Worker 全量迁入 Rust
- 不把 HTTP API 全量改写成 Tauri command
- 不在壳层重新实现扫描、抓取、sidecar、数据库逻辑
- 不重做产品页面范围
- 不推翻 `doc/UI/new/` 已冻结的页面职责与流程

---

## Worker 与 Contracts 保留边界

### Worker 职责（不迁移到壳层或前端）

库管理 / 库扫描 / 影片抓取与写回 / Sidecar 输出 / 图片与缓存 / 外部播放器 / 设置读写 / 任务队列 / SSE 广播 / Bootstrap / 健康检查 / SQLite 查询 / MetaTube 逻辑

### Contracts 要求

- 所有前端 API 类型从 `Jvedio.Contracts` 对齐
- Renderer 不允许新增脱节的"临时 DTO"
- Tauri 壳层桥接能力不得绕开 Worker 合同

---

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 页面逻辑堆回超大单文件 | 按页面/区域/组件/查询层/事件层拆分 |
| UI 文档与实现分叉 | 所有页面先对照 `doc/UI/new/`；新需求先改文档再改实现 |
| 端口与启动链不稳定 | Phase 1 Spike + Phase 6 端到端验证已覆盖 |

---

## 回退策略

- 任一阶段出现阻断问题，回退到**上一阶段已验证的新架构里程碑**
- 不再回退到任何旧架构路径

---

## 冻结输入与边界

| 输入 | 路径 |
|------|------|
| 正式 UI 输入 | `doc/UI/new/` |
| Feature 入口 | `plan/active/desktop-ui-shell-refactor/` |
| 本地业务服务 | `Jvedio-WPF/Jvedio.Worker` |
| 跨层合同 | `Jvedio-WPF/Jvedio.Contracts` |
| 启动入口 | `Jvedio-WPF/Jvedio/App.xaml.cs`（`TauriShellLauncher`） |
| 打包入口 | `Jvedio-WPF/Jvedio/Jvedio.csproj`（`PrepareTauriShellArtifacts`） |

### 外部参考

允许有限参考 `clash-verge-rev` 的视觉组织与页面编排方式，但不继承其产品架构、业务语义、路由语义或后端实现。
