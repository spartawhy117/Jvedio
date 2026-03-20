# Desktop UI Shell Refactor Validation

## 当前阶段

- **Phase 6：端到端可运行验证** — ✅ 完成
- **Phase 10：E2E 自动化测试** — ⏳ 当前进行阶段
- Phase 1–9.6 已完成；当前目标是补齐前端 UI 自动化验收和测试产物记录

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

## Phase 10 验证基线

> 当前 Phase 10 先复用已跑通的后端播种链路，再补齐前端流程验收。以下清单是执行记录模板，不再写“旧计划假设”。

### 10.1 数据准备基线

- [ ] `test-data/config/test-env.json` 仍为默认样本配置
- [ ] `seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` 跑通
- [ ] `verify-backend-apis.ps1 -NoPause` 维持 `36 PASS / 2 SKIP / 0 FAIL`
- [ ] `test-data/e2e/e2e-env.json` 已写出 `effectiveUserName`、`videoCacheRoot`、`actorAvatarCacheRoot`
- [ ] `test-data/e2e/data/test-user/cache/video/E2E-Lib-A/` 与 `E2E-Lib-B/` 真实产物路径存在

### 10.2 前端环境基线

- [ ] `tauri/scripts/start-e2e-env.ps1` 可用
- [ ] 浏览器模式可通过 `?workerPort=` 或 `?workerUrl=` 连上 Worker
- [ ] Vite 页面正常渲染，`WorkerStatusOverlay` 消失
- [ ] `log/test/e2e/` 目录可接收本轮执行产物

### 10.3 Flow 验收记录

- [x] Main Shell Navigation
- [x] Library Management
- [x] Library Workbench
- [x] Favorites
- [x] Actors
- [x] Actor Detail / Video Detail 返回链路
- [x] Settings

### 10.3.1 已完成记录（2026-03-20）

#### Main Shell Navigation

- 通过：左侧稳定显示 `设置 / 库管理 / 喜欢 / 演员` 和 `E2E-Lib-A / E2E-Lib-B` 两个库入口。
- 通过：一级导航与库入口切换后，右侧内容区可稳定切页，未再出现 `App.tsx` 中 `libraries.length` 崩溃。
- 通过：本轮失败样本单影片重抓、批量重抓后，`library.changed` 回流仅触发列表刷新，不再进入 `ErrorBoundary`。

#### Library Management

- 通过：库管理页正常加载 `E2E-Lib-A`、`E2E-Lib-B`，行内包含名称、影片数、最近扫描、状态和操作区。
- 通过：新建 / 编辑复用同一弹层，固定展示 3 条扫描目录输入，提交按钮文案为 `保存媒体库`。
- 通过：删除确认弹层已补齐库摘要块，现可显示名称、路径、影片数，并保留“不删除磁盘影片文件”说明。
- 通过：点击 `扫描` 后有 toast 和任务计数反馈；本轮环境下未观察到同库扫描按钮无限重复触发。

#### Library Workbench

- 通过：`E2E-Lib-B` 单库页可稳定显示 `FC2-PPV-1788676` 与 `SDDE-660-C`，查询栏包含搜索、刷新、排序。
- 通过：输入 `SDDE` 后进入 `SDDE-660-C` 详情，再返回时仍保留搜索条件。
- 通过：单卡右键菜单包含 `查看详情 / 播放 / 打开文件夹 / 收藏 / 重新抓取元数据 / 复制 VID / 删除影片`，失败样本卡片保持 `No Poster` 占位。
- 通过：多选态现已补齐 `批量收藏 / 批量取消收藏 / 批量重抓 / 批量删除 / 取消选择`；批量重抓已触发任务和列表回刷。
- 保留差异：多选动作当前承载形态仍是顶部动作条，不是 `video-batch-context-menu` 规格要求的右键批量菜单，留待后续子任务继续收口。

#### Favorites

- 通过：从 `E2E-Lib-B` 将 `SDDE-660-C` 加入收藏后，Favorites 页稳定显示 1 条结果，查询栏与单库页保持同构。
- 通过：Favorites 单卡右键菜单包含 `查看详情 / 播放 / 打开文件夹 / 取消收藏 / 重新抓取元数据 / 复制 VID / 删除影片`，与单库页能力保持一致。
- 通过：多选态可正常出现 `批量取消收藏 / 重新抓取元数据 / 批量删除 / 取消选择`；取消选择后卡片恢复普通点击行为。
- 通过：从 Favorites 进入 `SDDE-660-C` 详情再返回，结果集与当前页上下文保持稳定，未出现空白页或路由跳错。

#### Actors

- 通过：Actors 页稳定加载 6 位演员，包含搜索、刷新、排序；输入 `凛音` 后结果可收敛为 `凛音とうか` 单条记录。
- 通过：从过滤后的 Actors 列表进入演员详情再返回后，搜索词仍保留在列表页，说明查询状态恢复链路正常。
- 通过：演员详情页现已展示 `演员 ID`、影片数、所属库、来源页和关联影片列表，不再缺少核心身份字段。

#### Actor Detail / Video Detail 返回链路

- 通过：演员详情关联影片卡片具备单卡右键菜单，菜单项覆盖 `查看详情 / 播放 / 打开文件夹 / 收藏 / 重新抓取元数据 / 复制 VID / 删除影片`。
- 通过：演员详情关联影片多选态可显示 `批量收藏 / 重新抓取元数据 / 批量删除 / 取消选择`，本轮功能入口均可见。
- 通过：`Actors -> Actor Detail -> Video Detail -> 返回 -> 返回` 已真实跑通，第一次返回回到 Actor Detail，第二次返回回到 Actors。
- 修复：`ActorDetailPage` 本轮消除了关联影片上下文菜单 / 多选改造后引入的运行时崩溃，未再复现变量初始化顺序错误。

#### Settings

- 通过：设置页 6 个分组 `基本 / 图片 / 扫描与导入 / 网络 / 库 / MetaTube` 均能切换，右侧表单区随分组正常变化。
- 通过：在 MetaTube 分组将请求超时从 `60` 改为 `61` 后保存，页面收到 `设置已保存` toast，并观察到 `settings.changed` SSE 回流后的重新取值。
- 通过：点击 `恢复默认` 后，MetaTube 服务地址与超时值回到默认态，并收到 `已恢复默认设置` toast。
- 通过：MetaTube diagnostics 已真实返回成功结果，前端现在展示摘要文本，不再出现 `连接成功 (undefinedms)` 的错误文案。

### 10.4 抓取失败优雅降级记录

- [x] `FC2-PPV-1788676` 卡片显示 `No Poster` 占位图
- [x] `FC2-PPV-1788676` 在列表中保持可见且可进详情
- [ ] 列表单卡菜单存在“重新抓取元数据”
- [ ] 单影片重抓调用口径正确
- [x] 重抓后列表页状态已刷新
- [ ] 重抓后详情页状态已刷新或已记录缺口
- [x] `SDDE-660-C` 作为正常识别样本在 UI 中展示为成功抓取影片

### 10.4.1 当前专项结论

- 通过：`FC2-PPV-1788676` 在单库页保持可见，卡片展示 `No Poster`，且单卡菜单可再次触发 `重新抓取元数据`。
- 通过：单影片重抓和批量重抓都会调用 `POST /api/libraries/{id}/scrape` + `videoIds` 路径，未退化成全库重抓。
- 通过：重抓完成后列表页通过 `library.changed` 自动回刷，当前不再复现 `Cannot read properties of undefined (reading 'length')`。
- 通过：`SDDE-660-C` 以成功抓取影片展示，具备海报、详情信息和演员入口。

### 10.5 人工降级项

- [ ] 播放器真实启动
- [ ] 打开系统文件夹
- [ ] 打开外部来源页

### 10.6 产物

- [x] 执行日志写入 `log/test/e2e/`
- [x] 必要截图已保存
- [x] `validation.md`、`doc/testing/e2e/playwright-e2e-test-cases.md` 已按真实结果回写

### 10.6.1 当前已落地产物

- 日志：`log/test/e2e/runtime/phase10-subtask2.log`
- 截图：`log/test/e2e/runtime/phase10-subtask2-library-batch-actions.png`
- 截图：`log/test/e2e/runtime/phase10-subtask2-delete-library-dialog.png`
- 日志：`log/test/e2e/runtime/phase10-subtask3.log`
- 截图：`log/test/e2e/runtime/phase10-subtask3-actor-detail.png`
- 截图：`log/test/e2e/runtime/phase10-subtask4-settings.png`
