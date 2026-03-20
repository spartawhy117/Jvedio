# 变更日志

本文档记录 `D:\study\Proj\Jvedio` 这份本地仓库的维护变更。
后续每次代码或文档改动，继续在提交和推送前补充这里。

## [未发布]

### 新增
- 统一版本管理脚本 `scripts/bump-version.ps1`：一条命令更新 4 个核心版本文件（`package.json`、`tauri.conf.json`、`Cargo.toml`、`Jvedio.csproj`），保留 BOM/换行符，支持参数校验和幂等操作。

### 变更
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
