# 变更日志

本文档记录 `D:\study\Proj\Jvedio` 这份本地仓库的维护变更。
后续每次代码或文档改动，继续在提交和推送前补充这里。

## [未发布]

## [0.2.6] - 2026-03-23

### 修复
- 修复真包播放真实影片时的系统默认播放器回执误判：Windows shell 已成功接管媒体文件但未返回进程句柄时，不再误报 `HTTP 500`。
- 修复影片详情页最终布局与已确认线框不一致的问题：顶部现统一为 fanart 背景板，标题 / sidecar / 播放按钮同层横向铺开，演员条、文件路径与来源块改为独立纵向模块，并在窗口拉伸时保持稳定间距。

### 变更
- 重绘 `doc/UI/new/pages/video-detail-page.excalidraw` 与 `doc/UI/new/pages/video-detail-page.png`，并同步更新详情页规格文档与流程索引说明。
- `Jvedio.Worker.Tests` 新增 3 个播放 shell handoff 判定测试，当前测试规模更新为 `78` 项。

## [0.2.4] - 2026-03-22

### 修复
- 修复播放接口契约漂移问题，`/api/videos/{id}/play` 现已统一返回 `played` / `playerUsed`，并补充播放失败时的详细 Worker 诊断日志。
- 修复详情页宽屏布局，顶部主视觉改为 fanart 背景层，sidecar 状态 badge 已移动到标题区下方横向展示。
- 修复设置页底部动作区在高分辨率下无法锚定右下角的问题，动作按钮现已接入全宽 footer。
- 修复运行状态 CPU / 内存统计口径，现按逻辑 CPU 数归一化并聚合前端进程树与 Worker 进程树的总用量。
- 修复演员头像缓存命名与复用策略，缓存现优先使用规范化演员名命名，并兼容迁移旧缓存路径。

### 变更
- 更新 `plan/active/manual-acceptance-v010/` 下人工验收与自动验收文档，将 `F-038` 至 `F-042` 收口并记录本轮复验结论。
- 更新 `doc/testing/backend/test-current-suite.md`，同步 `Jvedio.Worker.Tests` 扩充到 `75` 项并补充播放契约与演员头像缓存测试说明。
- 自动化复验结果更新为：`verify-backend-apis.ps1` `36 PASS / 2 SKIP / 0 FAIL`、`Jvedio.Worker.Tests` `75 / 75 PASS`、`npm run build` 通过、`cargo check` 通过。

## [0.2.0] - 2026-03-22

### 新增
- 设置页新增“显示”分组，支持影片卡 `small / medium / large` 三档海报显示密度配置，并统一作用于媒体库、喜欢和演员关联影片页面。
- 新增显示设置与删除目录清理的 Worker 自动化测试，`Jvedio.Worker.Tests` 扩充至 `72` 项。

### 修复
- 修复右侧活动页共享布局过窄的问题，媒体库、喜欢、演员、详情和设置页现在会随窗口尺寸正常伸缩。
- 修复通用返回条和详情页头部结构，返回入口保留纯箭头，不再在详情页后方展示长文本。
- 修复通用排序条仍保留刷新按钮的问题，排序选择后直接生效。
- 修复通用分页组件漂移问题，分页条统一固定在活动页右下角，单页结果也会显示。
- 修复“库管理”命名漂移，左侧导航和页面标题统一收敛为“媒体库”。
- 修复媒体库管理列表首列职责过载问题，名称列现只展示库名。
- 修复媒体库同步 `100%` 后按钮、进度条和完成状态没有及时切换的问题。
- 修复演员详情页仍展示演员 ID 和来源页的问题。
- 修复删除影片仍使用原生确认框且默认不删除原片的问题，现统一改为通用确认框并默认删除原片与搜刮数据，同时清理空目录。

### 变更
- 更新 `plan/active/manual-acceptance-v010/` 下人工验收与自动验收文档，将 `F-028` 至 `F-037` 标记为已实现并补充本轮自动化复验结果。
- 更新 `doc/testing/backend/test-current-suite.md`，同步新的测试规模与新增覆盖点。

## [0.1.7] - 2026-03-22

### 变更
- 重绘 `doc/UI/new/pages/video-detail-page.excalidraw` 与 `doc/UI/new/pages/video-detail-page.png`，将详情页线框调整为当前讨论中的扁平简洁方向。
- 详情页线框现已收敛为纯箭头返回、四个等尺寸元数据块、头像在上名字在下的演员卡，以及去除简介后的紧凑信息流。

## [0.1.6] - 2026-03-22

### 修复
- 详情页返回按钮现在优先显示目标页面标题或库标题，不再把当前影片等长文本直接塞进返回文案，并收紧了按钮宽度。
- 列表页统一分页控件改为“有结果即显示”，单页结果也会在右下角展示 `1 / 1` 分页状态。
- 优化扫描后的 MetaTube 抓取性能：图片下载改为复用共享 `HttpClient`，单影片内演员补全与演员头像下载改为并发执行，并增加同轮抓取的演员查询缓存。

### 变更
- 扩充 `plan/active/manual-acceptance-v010/manual-acceptance.md`，补充 `F-025`、`F-026`、`F-027` 的详细根因分析、修复方向和当前复验状态。

## [0.1.5] - 2026-03-22

### 新增
- 统一版本管理脚本 `scripts/bump-version.ps1`：一条命令更新 4 个核心版本文件（`package.json`、`tauri.conf.json`、`Cargo.toml`、`Jvedio.csproj`），保留 BOM/换行符，支持参数校验和幂等操作。

### 修复
- 修复 `test-data/scripts/seed-e2e-data.ps1` 与当前 Worker 链路不一致的问题：现在会在扫描前写入 MetaTube 测试地址，并按“扫描即含抓取”的现实现状完成播种。
- 修复 `test-data/scripts/verify-backend-apis.ps1` 仍依赖旧版 Settings 契约的问题，去掉已删除的 `image` 分组假设，并将 MetaTube diagnostics 校验对齐为当前连通性测试接口。

### 变更
- 完成 `manual-acceptance-v010` 自动复验：后端基线恢复为 `36 PASS / 2 SKIP / 0 FAIL`，前端自动验收维持 `41 通过 / 2 未覆盖`。
- 同步更新自动验收、Phase 10 验证记录和前端 E2E 用例文档，修正当前设置页为 5 个分组的正式口径，并补充 2026-03-22 的复验结果与产物记录。
- Release 发布格式切换为 ZIP 便携版（`build/release/JvedioNext_*_x64-portable.zip`），移除 NSIS 安装包产物和 `copy-release.ps1` 流程。
- `scripts/build-release.ps1` 与 `tauri/scripts/build-release.ps1` 现在会在 rustup 已安装时自动补齐 `cargo` 路径，避免 Tauri 构建因环境变量缺失失败。

## [0.1.0] - 2026-03-20

### 新增
- Tauri 2 桌面壳层（`JvedioNext.exe`），作为用户双击入口
- .NET 8 Worker 后端（`Jvedio.Worker.exe`），承载所有业务逻辑
- NSIS 安装包打包（`JvedioNext_0.1.0_x64-setup.exe`）
- 统一构建输出目录（`build/release/`、`build/worker-stage/`、`build/frontend-stage/`）
- `tauri-plugin-single-instance` 单实例控制
- 语义化版本管理（`v0.1.0` 起步）
- MetaTube 唯一搜刮源（搜索、详情、演员头像、Sidecar 写出）
- 扫描前自动目录整理（平铺影片整理到独立目录）
- 62 个后端测试（Bootstrap、DTO、Libraries、Settings、Videos、Actor、Scrape、VidParsing、SidecarPath、ScanOrganize、ScanImportApi）
- 完整 UI 页面：Home、Library Management、Library Workbench、Favorites、Actors、Categories、Series、Video Detail、Settings
- SSE 事件流（`library.changed`、`task.summary.changed`、`settings.changed`）
- 任务失败详情与重试机制
- 全局活动条（跨页面任务状态反馈）

### 0.1.0 之前的重构历程（已压缩）

> 以下是从旧 WPF 架构演进到 Tauri 2 + .NET 8 Worker 的完整重构过程摘要。
> 详细的每步变更记录已归档，此处仅保留关键里程碑。

**仓库收敛与基础设施**
- 移除 `Jvedio-Vue`、`Jvedio-Android`、`Jvedio-Linux`，仅保留 `dotnet`
- 文档统一收敛到 `doc/`，新增 12 个模块文档（`doc/modules/01~12`）
- 新增 `AGENTS.md` 作为仓库级规则入口
- data 目录收敛：移除 `backup/`、`olddata/`、`image/`、`pic/`，统一到 `cache/` 结构

**WPF Legacy 修复与优化**
- 修复启动页空判断、详情页刷新比较、扫描路径清理、缓存清理等多处 bug
- 优化 12 个模块：启动、配置、主 UI、扫描导入、插件加载、媒体维护、数据库索引、实体比较、对话框、外部工具、主题样式、编辑器
- 收敛设置页 UI：移除插件页、重命名页、视频处理页、青少年模式等废弃功能入口

**MetaTube 唯一搜刮源（9 个阶段）**
- 新增 `MetaTubeClient`、`MetaTubeCache`、`MetaTubeConverter`，完成搜索 → 详情 → 头像 → sidecar 写出全链路
- 旧插件搜刮链彻底退出运行主入口；设置页新增 MetaTube 页签与连接诊断
- 优化演员头像链路（detail 兜底 + 服务预热）、日志增强、UTF-8 编码修正

**桌面 UI 壳层重构（desktop-ui-shell-refactor）**
- 参考 `fntv-electron` 和 `jellyfin-web`，完成 UI 规格冻结与 Contracts DTO 命名
- 新增 `Jvedio.Contracts` + `Jvedio.Worker`（.NET 8），实现 31 个 Worker API 端点（8 个 Controller）
- 前端 Electron renderer 落地 9 个一级页面：Home、Library Management、Library Workbench、Favorites、Actors、Actor Detail、Categories、Series、Video Detail、Settings
- SSE 事件流（`library.changed`、`task.summary.changed`、`settings.changed`）
- 任务失败详情与重试机制、全局活动条
- 抓取失败优雅降级（stub sidecar + `ScrapeStatus` 字段）
- 多选与批量操作（收藏/删除）、右键菜单
- Settings 6 页签、MetaTube diagnostics
- `doc/UI/new/` 线框图与流程图（10 张流程图 + 页面/弹层/共享组件规格）

**测试工程**
- 旧 `Jvedio.Test` 物理删除，新建 `Jvedio.Worker.Tests`（.NET 8 / MSTest / WebApplicationFactory）
- 测试从 0 增长到 62 个，覆盖 Bootstrap、DTO、Libraries、Settings、Videos、Actor、Scrape、VidParsing、SidecarPath、ScanOrganize、ScanImportApi
- E2E 验收 7 组 flow 全部跑通

**Tauri Release 打包与发布准备**
- 统一构建输出到 `build/`（`worker-stage/`、`frontend-stage/`、`release/`）
- 版本号从 `5.0.0` 重设为 `0.1.0`，首个 git tag `v0.1.0`
- 去掉 WPF 启动层，Tauri Shell 直接面向用户（`JvedioNext.exe`）
- 补齐单实例控制、Worker 路径解析增强、SQLite native DLL 修复
- 首次完成 NSIS 安装包打包（`JvedioNext_0.1.0_x64-setup.exe`）
