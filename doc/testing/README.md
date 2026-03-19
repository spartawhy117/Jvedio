# 测试文档索引

本目录收拢项目所有测试相关文档，按测试层次分为两个子目录。

## 技术方案概览

### 后端测试（C# / MSTest / .NET 8）

- **工程**：`dotnet/Jvedio.Worker.Tests/Jvedio.Worker.Tests.csproj`
- **框架**：MSTest 3.x + `dotnet test`
- **测试引擎**：`WebApplicationFactory<Program>` 启动内存 Worker 实例
- **测试分层**：
  - 契约测试（BootstrapApi、LibrariesApi、SettingsApi、VideosApi、ActorApi、ScrapeApi）
  - DTO 序列化测试
  - 业务逻辑测试（VID 解析、Sidecar 路径、扫描整理、扫描导入）
- **执行方式**：`dotnet test` 或 PowerShell 脚本（双击运行或 `-NoPause`）
- **当前规模**：62 个测试用例（全部通过）
- **日志输出**：`{repo}/log/test/worker-tests/runtime/`（保留现场，不自动清理）

> ℹ️ **旧测试工程**：`dotnet/Jvedio.Test/` 已物理删除。旧工程中 5 个高价值业务测试（VID 解析、Sidecar 路径、扫描整理、扫描导入）已以新架构重写到 `BusinessLogicTests/` 目录。MetaTube 网络集成测试暂未迁移（需外部服务）。

### 前端 E2E 测试（Playwright MCP / 浏览器模式）

- **框架**：Playwright MCP（通过浏览器直连 Vite dev server）
- **测试对象**：React SPA（`tauri/src/`）
- **当前范围**：以 7 张正式流程图 + 抓取失败优雅降级专项为主
- **状态**：Phase 10 进行中，前端验收复用真实播种数据执行

#### Tauri 壳层与 Playwright 的关系

Playwright MCP 在当前仓库中以浏览器模式执行，**不会直接 attach 到 Tauri 窗口**（Tauri 使用系统 WebView2，不暴露 CDP 端口）。

项目的解决方案是利用架构分离的优势：

```
Tauri 壳层 → 加载 React SPA → HTTP 调用 Worker API
                ↑
Playwright MCP → 直连 Vite dev server（同一个 SPA）
```

`WorkerContext.tsx` 检测 `window.__TAURI_INTERNALS__` 是否存在：
- **Tauri 窗口**：通过 IPC 获取 Worker 端口
- **浏览器 / Playwright**：通过 URL 参数 `?workerPort=xxx` 或轮询获取

这样 Playwright MCP 可以测到除 Tauri 原生桌面能力外的大部分前端行为：

| 可测（浏览器模式） | 不可测（需 Tauri 原生环境） |
|-------------------|--------------------------|
| 页面导航、列表、筛选、分页 | 系统文件对话框 |
| API 调用、数据展示 | 系统托盘 / 原生菜单 |
| SSE 事件接收与 UI 更新 | 单实例检测 |
| 主题切换、多语言 | "打开文件夹"等 shell API |
| 表单交互、弹层 | 窗口最小化/最大化/关闭行为 |

不可测的部分通过手动验证覆盖。

## 目录结构

```
doc/testing/
├── README.md                          ← 本文件（索引入口）
├── backend/                           ← 后端测试（Jvedio.Worker.Tests C# 工程）
│   ├── test-plan.md                   ← 测试工程组织方式、配置、脚本、执行流程
│   ├── test-targets.md                ← 测试目标与通过标准（强/弱断言）
│   └── test-current-suite.md          ← 当前已实现的 62 个测试清单
└── e2e/                               ← 前端 E2E 自动化（Playwright MCP）
    ├── e2e-test-data-spec.md          ← E2E 数据架构、隔离设计、播种/清理流程
    ├── playwright-e2e-test-plan.md    ← Playwright MCP 执行方案、边界、已知限制
    └── playwright-e2e-test-cases.md   ← Phase 10 前端验收用例组
```

## 快速上手

如果你想自己配置并运行测试，参考以下入口：

| 我想… | 操作 |
|--------|------|
| 跑 62 个 Worker 契约测试 | `cd dotnet/Jvedio.Worker.Tests && dotnet test --configuration Release`（零配置） |
| 跑 E2E 播种（含 MetaTube 抓取） | 查看 [`test-data/config/README.md`](../../test-data/config/README.md) 配置说明，然后运行 `.\test-data\scripts\seed-e2e-data.ps1` |
| 播种后校验全部后端 API | `.\test-data\scripts\seed-e2e-data.ps1 -SkipWorkerShutdown` 然后 `.\test-data\scripts\verify-backend-apis.ps1`（当前结果 `36 PASS / 2 SKIP / 0 FAIL`） |
| 自定义 MetaTube 地址 / 测试视频 | 复制 `test-data/config/test-env.local.json.example` → `.local.json`，填入你的配置 |
| 清理 E2E 测试环境 | `.\test-data\scripts\cleanup-e2e-data.ps1` |

> 📖 完整配置指南见 [`test-data/config/README.md`](../../test-data/config/README.md)

## 阅读顺序

### 了解后端测试体系

1. `backend/test-targets.md` — 先了解**要测什么**
2. `backend/test-plan.md` — 再了解**怎么测**（工程结构、配置、脚本）
3. `backend/test-current-suite.md` — 最后查看**当前测了什么**

### 了解前端 E2E 测试

1. `e2e/e2e-test-data-spec.md` — 先了解**数据架构与隔离设计**（§1.1）和播种/清理流程
2. `e2e/playwright-e2e-test-plan.md` — 再了解**执行方案与环境搭建**
3. `e2e/playwright-e2e-test-cases.md` — 最后查看 Phase 10 前端验收用例组

## 关联文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 数据目录规范 | `doc/data-directory-convention.md` | Release / 测试 / E2E 数据目录结构与路径推断 |
| 验证矩阵 | `plan/active/desktop-ui-shell-refactor/validation.md` | Phase 10 当前验证基线与执行记录 |
| 日志规范 | `doc/logging-convention.md` | Worker + Shell 日志配置 |
| 流程图索引 | `doc/UI/new/flow/README.md` | E2E 用例的流程图来源 |
| 测试工程 | `dotnet/Jvedio.Worker.Tests/` | .NET 8 Worker API 契约测试 |
| 开发总览 | `doc/developer.md` | 项目入口文档 |

## 维护规则

- 新增测试文档时，先判断属于 `backend/` 还是 `e2e/`，放到对应子目录
- 新增文档后，更新本 README 的目录结构和阅读顺序
- 如果新增第三类测试层（如性能测试），在本目录下新建对应子目录
