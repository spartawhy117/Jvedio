## 文档定位

本文件是 `desktop-ui-shell-refactor` 的**迁移与重构方案（存活文档）**。

技术主线：`Tauri 2 + React 19 + TypeScript 5.8 + Vite 7`，桌面壳与 renderer 已全新重建；业务底座 `Worker + Contracts + HTTP API + SSE` 保持不变。

---

## 结论先行

| 维度 | 当前状态 |
|------|---------|
| 桌面壳 | `tauri/` — Tauri 2 Rust 壳层，已可编译运行 |
| Renderer | `tauri/src/` — React 19 + TS，82 个源文件，7 个业务页 + 10 个共享组件 |
| 业务服务 | `dotnet/Jvedio.Worker` — ASP.NET Core，动态端口 |
| 跨层合同 | `dotnet/Jvedio.Contracts` — DTO / 事件 envelope / 错误模型 |
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

### Phase 0–9.6：✅ 已全部完成

| Phase | 摘要 |
|-------|------|
| 0–5 | 方案冻结 → MainShell Spike → Renderer 基座 → 7 页迁移 → Release 切换 → Electron 删除 |
| 6 | 端到端 API 验证（日志统一 + 编译基建 + 首次启动 + 7 张流程图 + 7 bug 修复） |
| 7 | UI 补全（Settings 真实表单 + 视频多选/批量操作 + 右键菜单 + 收藏心形） |
| 8 | 后端测试迁移：新建 `Jvedio.Worker.Tests`（44 测试），删除旧 `Jvedio.Test/` |
| 8.5 | `Jvedio-WPF/` → `dotnet/` 目录更名，4 源文件 + 29 文档 171 处引用同步 |
| 9 | 日志目录统一：`log/` → `runtime/` + `test/` + `dev/` 分层 |
| 9.5 | 测试数据目录统一到 `test-data/`，E2E 假视频 5 个提交到 git |
| 9.6 | 数据层测试完善：`test-env.json` 配置 + MetaTube 抓取 + Actor/Scrape 测试，44→52 全通过 + `verify-backend-apis.ps1`（31 端点校验） |

---

### Phase 10：E2E 自动化测试（暂缓）

**前提**：Phase 7 UI 补全 + Phase 8 后端测试迁移 + Phase 9 日志统一 + Phase 9.5 测试数据目录统一 + **Phase 9.6 数据层流程测试完善**全部完成。

> ⚠️ **敏感性说明**：当前为公共电脑环境，E2E 自动化涉及的测试数据模拟（视频文件、媒体库、播种脚本等）可能产生敏感内容痕迹，暂缓执行，待环境条件合适时再启动。

#### 10.1 环境准备

| 项目 | 说明 |
|------|------|
| Playwright 安装 | `npx playwright install chromium`（仅需 Chromium） |
| WorkerContext 浏览器模式 | 确认 `?workerPort=xxx` URL 参数传递正常（Phase 6.2 已验证） |
| Worker CORS | 确认 `AllowAnyOrigin` 中间件仍启用（供 Playwright `localhost:1420` 跨域） |
| 启停脚本 | 新建 `tauri/scripts/start-e2e-env.ps1`：启动 Worker → 等待 ready → 启动 Vite dev → 返回端口 |

#### 10.2 测试数据与环境

> 详细的测试数据目录结构、假视频文件要求、播种脚本流程见 [`doc/testing/e2e/e2e-test-data-spec.md`](../../../doc/testing/e2e/e2e-test-data-spec.md)。
> Release 版与测试版数据目录对比、路径推断规则、环境变量机制见 [`doc/data-directory-convention.md`](../../../doc/data-directory-convention.md)。

**核心策略**：E2E 测试数据统一放在 `{repo}/test-data/e2e/`（Phase 9.5 已建立目录结构），假视频文件和基线 SQLite 直接提交到 git，多台电脑 `git pull` 即可用，无需重新播种。

**播种概要**（脚本位于 `test-data/scripts/seed-e2e-data.ps1`）：
1. （可选）重置 SQLite 为基线版本（`git checkout test-data/e2e/data/`）
2. 启动 Worker（`JVEDIO_APP_BASE_DIR={repo}/test-data/e2e`）
3. API 播种（创建 2 个媒体库 → 触发扫描 → 收藏 2 部影片）
4. 输出 `e2e-env.json` 供 Playwright 读取
5. （可选）运行 `verify-backend-apis.ps1` 校验全部 31 个 API 端点

> 假视频文件（5 个，约 5 KB）已在 Phase 9.5 提交到 `test-data/e2e/videos/`，无需脚本创建。

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

#### 10.4 测试后清理

> 详细清理流程见 `doc/testing/e2e/e2e-test-data-spec.md` §6。

概要：关闭 Playwright → 停止 Vite dev → 停止 Worker → （可选）`git checkout test-data/e2e/data/` 重置 SQLite 到基线。

#### 通过标准

- 44 个可自动化用例全部绿色
- 4 个降级用例有手动验证记录
- `{repo}/log/test/e2e/reports/` 生成可读的 HTML 测试报告
- 失败截图自动保存到 `{repo}/log/test/e2e/screenshots/`

#### 关联文档更新

| 文档 | 更新内容 |
|------|---------|
| `doc/data-directory-convention.md` | ✅ 已完成 — Release / 测试 / E2E 数据目录规范 |
| `doc/testing/e2e/e2e-test-data-spec.md` | ✅ 已完成 — E2E 测试数据规范（目录、假文件、播种、清理） |
| `doc/testing/e2e/playwright-e2e-test-plan.md` | 更新启停脚本路径、测试产物输出路径、数据播种流程 |
| `doc/testing/e2e/playwright-e2e-test-cases.md` | 标注实际执行结果（通过/失败/跳过） |
| `doc/testing/README.md` | 前端 E2E 章节移除"暂缓"标注，更新为实际状态 |
| `AGENTS.md` | 新增 E2E 测试脚本入口、测试数据播种说明 |
| `doc/developer.md` | 新增 E2E 环境搭建 / 运行指南、数据目录规范链接 |
| `doc/CHANGELOG.md` | 追加 Phase 10 变更条目 |
| `plan/active/desktop-ui-shell-refactor/handoff.md` | 更新 Phase 10 完成状态 |
| `plan/active/desktop-ui-shell-refactor/validation.md` | 新增 Phase 10 验证记录（测试报告摘要） |

---

## 验证矩阵（Phase 6 已覆盖）

✅ 架构级（Tauri→Worker→SSE→DTO 全链路）、页面级（7 页全覆盖）、事件级（8 类 SSE 事件）均已通过。

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
| 本地业务服务 | `dotnet/Jvedio.Worker` |
| 跨层合同 | `dotnet/Jvedio.Contracts` |
| 启动入口 | `dotnet/Jvedio/App.xaml.cs`（`TauriShellLauncher`） |
| 打包入口 | `dotnet/Jvedio/Jvedio.csproj`（`PrepareTauriShellArtifacts`） |

### 外部参考

允许有限参考 `clash-verge-rev` 的视觉组织与页面编排方式，但不继承其产品架构、业务语义、路由语义或后端实现。
