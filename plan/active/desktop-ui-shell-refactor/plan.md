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

### Phase 0–5：✅ 已全部完成

| Phase | 内容 | 状态 |
|-------|------|------|
| 0 | 方案冻结与审查 | ✅ |
| 1 | MainShell Spike（窗口 + Worker 拉起 + Bootstrap + SSE） | ✅ |
| 2 | Renderer 基座（路由 / API client / 查询层 / SSE / 主题 / i18n） | ✅ |
| 3 | 业务页迁移（7 个页面 + 共享组件） | ✅ |
| 4 | Release 切换（`TauriShellLauncher` + `PrepareTauriShellArtifacts`） | ✅ |
| 5 | Electron 物理删除与文档清退 | ✅ |

### Phase 6：端到端验证（API 级）— ✅ 已完成

6.0 统一日志、6.1 编译基础设施、6.2 首次启动验证、6.3 页面流转 API 级测试（7 张流程图）、6.4 Bug 修复（7 个 bug）。覆盖 API 数据链路通畅性，不覆盖 UI 交互完整性。

### Phase 7：UI 交互完整性补全 — ✅ 已完成

- 7.1 Settings 3 个占位子组补全（image / scanImport / library → 真实表单）
- 7.2 视频多选 / 批量操作（后端 4 API + 前端多选 + 批量操作栏 + 右键菜单 + 收藏心形 + i18n）
- VideoDetail "打开文件夹"接入 `revealItemInDir`、`VideoContextMenu` 组件已在 LibraryPage + FavoritesPage 接入

### Phase 8：后端测试工程迁移 — ✅ 已完成

新建 `Jvedio.Worker.Tests`（.NET 8 SDK-style / MSTest / `WebApplicationFactory<Program>`），不依赖 WPF 主程序。迁移旧测试逻辑 + 新增 Worker API 契约测试，44 个测试全部通过。旧测试工程 `Jvedio.Test/` 已物理删除。

### Phase 8.5：`Jvedio-WPF/` → `dotnet/` 目录更名 — ✅ 已完成

`git mv` 物理更名 + 修改 4 个源码文件（Program.cs、worker.rs、shell_log.rs、prepare-worker.ps1）+ 批量替换 29 个文档 171 处引用，全局零残留。

### Phase 9：日志目录统一 — ✅ 已完成

`log/` 从平铺改为 `runtime/` + `test/` + `dev/` 分层子目录。Worker 和 Shell 运行日志写入 `log/runtime/`，测试日志指向 `log/test/worker-tests/`，`JVEDIO_LOG_DIR` 自动追加 `runtime/`。`doc/logging-convention.md` 已重写为分层结构。

---

### Phase 9.5：测试数据目录统一到项目根目录 — 🔲 待执行

**前提**：Phase 8 后端测试迁移 + Phase 9 日志统一全部完成。

**已完成** ✅ — commit `adf2c29`

改造 `TestBootstrap.cs`，数据目录从 `%TEMP%/jvedio-test-{GUID}/` 改为 `{repo}/test-data/worker/`（每次清空重建，测试后保留现场），日志改为 `{repo}/log/test/worker-tests/`。新增 `FindRepoRoot()` 方法。创建 `test-data/e2e/` 目录结构和 5 个假视频文件（5 KB），提交到 git。重写 `e2e-test-data-spec.md`（215→133 行），新增"E2E 测试数据配置指南"可执行步骤章节。同步更新 `.gitignore`（E2E 跟踪 / worker 忽略）、`data-directory-convention.md` §6 对比表、`test-plan.md` §6 TestBootstrap、`logging-convention.md` §2.5、`AGENTS.md`。44 个后端测试全部通过。

---

### Phase 9.6：数据层流程测试完善（MetaTube 抓取 + Actor 测试覆盖）— 🔲 待执行

**前提**：Phase 9.5 测试数据目录统一已完成。

**定位**：这是 E2E 自动化测试（Phase 10）的**必要前置**。当前播种脚本只覆盖"扫描→入库"，但 E2E 用例中的演员列表页（`TC-ACT-01~06`）、影片详情页的元数据展示（标题/封面/演员关联）、MetaTube 诊断（`TC-SET-07`）都**依赖抓取后的数据**。没有这一层，E2E 测试数据不完整，大量用例会跑在空态上。

#### 背景：当前依赖链死锁

```
播种脚本缺少 MetaTube 抓取步骤
       ↓
SQLite 中无标题/封面/演员数据
       ↓
Actor API 契约测试无数据可验证（44 个现有测试不含 Actor）
       ↓
E2E 演员页面用例（TC-ACT-01~06）无法执行
       ↓
E2E 影片详情用例只能验证空态
```

#### 当前实现状态

| 组件 | 状态 | 说明 |
|------|------|------|
| `LibraryScrapeService`（573 行） | ✅ 已实现 | VID→搜索→详情→演员→持久化→Sidecar 全流程 |
| `MetaTubeWorkerClient`（203 行） | ✅ 已实现 | 基于 System.Text.Json 的 Worker 层 HTTP 客户端 |
| `POST /api/libraries/{id}/scrape` | ✅ 已实现 | 支持 mode/writeSidecars/downloadActorAvators/videoIds 参数 |
| `POST /api/settings/meta-tube/diagnostics` | ✅ 已实现 | 分步诊断（连通性/providers/搜索/详情） |
| Actor API（列表/详情/关联影片） | ✅ 已实现 | `ActorsController` + `ActorService`（534 行） |
| Actor API 契约测试 | ❌ **未覆盖** | 44 个现有测试不含任何 Actor 端点 |
| MetaTube 抓取集成测试 | ❌ **未覆盖** | `test-plan.md` 标记为 P0 技术债 |
| 演员测试目标文档 | ❌ **不存在** | `test-targets.md` 未提及 Actor 端点 |
| 播种脚本 MetaTube 步骤 | ❌ **未实现** | `seed-e2e-data.ps1` 停在扫描后 |

#### 9.6.0 测试环境配置基础设施（MetaTube 地址可配置化）

**问题**：MetaTube 服务地址（`metatube-server.hf.space`）之前散落在计划文档和 E2E 用例文档中，硬编码不可变。用户已自部署修复了 bug 的 MetaTube 后端，需要测试流程统一读取用户配置的地址。

**已有的后端支持**：`LibraryScrapeService` 已支持两级地址读取（优先级从高到低）：
1. 环境变量 `JVEDIO_METATUBE_SERVER_URL`
2. SQLite 配置 `MetaTubeConfig.ServerUrl`（通过 `PUT /api/settings` 写入）

**方案**：新建统一测试环境配置文件 `test-data/config/test-env.json`，所有测试脚本（播种 / 集成测试 / E2E）从此文件读取可变的外部依赖配置，**不再硬编码地址**。

##### 配置文件结构

文件路径：`test-data/config/test-env.json`

```json
{
  "_comment": "测试环境配置 — 所有可变的外部依赖地址统一配置在此",
  "metaTube": {
    "serverUrl": "https://your-self-hosted-metatube.example.com",
    "requestTimeoutSeconds": 30
  },
  "seedVideos": {
    "libA": ["JUR-293-C.mp4", "SNOS-037.mp4", "ABP-001.mp4"],
    "libB": ["SONE-100.mp4", "MIDV-200.mp4"]
  },
  "scrapeableVids": ["JUR-293-C", "SNOS-037"]
}
```

**字段说明**：

| 字段 | 含义 |
|------|------|
| `metaTube.serverUrl` | MetaTube 服务地址，修改为自己部署的地址即可 |
| `metaTube.requestTimeoutSeconds` | 单次请求超时秒数 |
| `seedVideos.libA` / `libB` | 播种脚本创建的假视频文件名（`{VID}.{ext}`），取代之前脚本中硬编码的文件列表 |
| `scrapeableVids` | MetaTube 上已确认可查到的 VID 列表，抓取验证只检查这些 VID 的元数据是否回填 |

**设计决策**：不再维护两套独立的 VID 列表（播种脚本硬编码 + `verifiedVids`），改为 `seedVideos`（控制假视频文件创建和库分配）+ `scrapeableVids`（标记哪些 VID 在 MetaTube 上可查到）。两者通过 VID 关联——`scrapeableVids` 中的 VID 必须出现在某个 `seedVideos.libX` 的文件名中，否则抓取不会有效果（库里没有该影片）。

**播种脚本新行为**：
1. Step 2 不再硬编码文件列表，改为读取 `seedVideos.libA` / `seedVideos.libB` 来创建假视频文件
2. Step 5.9 验证抓取时，只检查 `scrapeableVids` 中列出的 VID 是否有标题/演员数据
3. 如果 `scrapeableVids` 为空数组，跳过抓取验证步骤

**演员头像目录**：测试环境中，`JVEDIO_APP_BASE_DIR` 设置为 `test-data/e2e/`，Worker 的 `WorkerPathResolver` 会自动计算演员头像缓存目录为 `test-data/e2e/data/{UserName}/cache/actor-avatar/`——与扫描目录 `test-data/e2e/videos/lib-a/` 同级，无需额外配置。`.gitignore` 中已有 `test-data/**/cache/` 排除规则，抓取产生的头像文件不会被跟踪。

测试环境完整目录结构：
```
test-data/e2e/
├── videos/
│   ├── lib-a/              ← 媒体库 A 扫描目录
│   │   ├── JUR-293-C/      ← 整理后的 VID 子目录
│   │   │   ├── JUR-293-C.mp4
│   │   │   ├── JUR-293-C.nfo          ← sidecar
│   │   │   ├── JUR-293-C-poster.jpg   ← sidecar
│   │   │   ├── JUR-293-C-thumb.jpg    ← sidecar
│   │   │   └── JUR-293-C-fanart.jpg   ← sidecar
│   │   ├── SNOS-037/
│   │   └── ABP-001/
│   └── lib-b/              ← 媒体库 B 扫描目录
│       ├── SONE-100/
│       └── MIDV-200/
├── data/
│   └── {UserName}/
│       ├── app_datas.sqlite
│       ├── app_configs.sqlite
│       └── cache/
│           └── actor-avatar/   ← 演员头像缓存（自动创建）
│               ├── {actorId}.jpg
│               └── {sha1-hash}.jpg
└── e2e-env.json            ← 输出给 Playwright
```

##### 消费方式

| 消费者 | 如何读取 | 消费哪些字段 |
|--------|---------|-------------|
| `seed-e2e-data.ps1`（9.6.1） | `Get-Content test-data/config/test-env.json \| ConvertFrom-Json` | `metaTube.serverUrl`（传给 Worker）、`seedVideos`（创建假视频文件）、`scrapeableVids`（验证抓取结果） |
| `ScrapeApiTests.cs`（9.6.3） | `File.ReadAllText()` + `JsonSerializer.Deserialize()` | `metaTube.serverUrl`（集成测试目标地址）、`scrapeableVids`（选取测试 VID） |
| Playwright E2E（Phase 10） | 通过 `e2e-env.json` 间接消费（播种脚本写入） | 不直接读 test-env.json |

##### 执行内容

- [x] 新建 `test-data/config/test-env.json`（方案 B 平铺结构）
- [x] 新建 `test-data/config/README.md`（简要说明配置项含义和修改方式）
- [x] 更新 `plan.md` / `validation.md` / `playwright-e2e-test-cases.md` 中所有硬编码的 `metatube-server.hf.space` → 引用配置文件
- [x] 更新 `seed-e2e-data.ps1` Step 2 从 `seedVideos` 读取文件列表（不再硬编码）→ 在 9.6.1 执行
- [x] 将 `test-env.local.json` 加入 `.gitignore`（配置文件本身已提交，`.local.json` 不提交）
- [x] 新建 `test-data/config/test-env.local.json.example`（模板文件）

##### .local 覆盖机制（可选）

支持 `test-data/config/test-env.local.json` 覆盖主配置（`.local.json` 加入 `.gitignore`）。脚本加载逻辑：
1. 先读 `test-env.json`（仓库默认值）
2. 如果存在 `test-env.local.json`，合并覆盖
3. 最终得到有效配置

这样仓库里保留一份通用默认地址，个人自部署地址写在 `.local.json` 里不提交。

---

#### 9.6.1 播种脚本改造

**前置依赖**：9.6.0 配置文件已就绪。

##### 改造现有步骤（Step 2：假视频文件创建）

当前 `seed-e2e-data.ps1` Step 2 硬编码了 `$fakeFiles` 字典。改造后从 `test-env.json` 的 `seedVideos` 字段读取：

```powershell
# 读取测试配置
$testEnvPath = Join-Path $repoRoot "test-data\config\test-env.json"
$testEnv = Get-Content $testEnvPath -Raw | ConvertFrom-Json

# .local.json 覆盖（如果存在）
$localPath = Join-Path $repoRoot "test-data\config\test-env.local.json"
if (Test-Path $localPath) {
    $localEnv = Get-Content $localPath -Raw | ConvertFrom-Json
    # 合并覆盖（serverUrl 等标量字段）
    ...
}

# Step 2: 从配置创建假视频文件
foreach ($fileName in $testEnv.seedVideos.libA) {
    $filePath = Join-Path $e2eRoot "videos\lib-a\$fileName"
    [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
}
foreach ($fileName in $testEnv.seedVideos.libB) {
    $filePath = Join-Path $e2eRoot "videos\lib-b\$fileName"
    [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
}
```

##### 新增步骤（Step 5.5→5.9：MetaTube 抓取）

在 Step 5（扫描验证）和 Step 7（输出 env.json）之间插入：

| 新步骤 | API | 说明 |
|--------|-----|------|
| Step 5.5: 读取 MetaTube 配置 | 读文件 | 从 `test-env.json`（+ `.local.json` 覆盖）读取 `metaTube.serverUrl` + `scrapeableVids` |
| Step 5.6: 配置 MetaTube | `PUT /api/settings` 或 `$env:JVEDIO_METATUBE_SERVER_URL` | 将读取到的 serverUrl 传递给 Worker |
| Step 5.7: 触发抓取 | `POST /api/libraries/{libAId}/scrape` | `mode:"missing-only"` + `writeSidecars:true` + `downloadActorAvatars:true` |
| Step 5.8: 等待抓取完成 | 轮询 `GET /api/libraries/{id}` | 检查 `taskStatus` 变为 `idle`，超时 120s |
| Step 5.9: 验证抓取结果 | `GET /api/libraries/{id}/videos` + `GET /api/actors` | 仅检查 `scrapeableVids` 中的 VID 有 title、演员列表非空、sidecar 文件存在 |

**VID 选择**：抓取验证只检查 `test-env.json` 中 `scrapeableVids` 列表内的 VID。如果 `scrapeableVids` 为空数组，跳过抓取验证步骤。默认值为 `["JUR-293-C", "SNOS-037"]`——这两个 VID 已确认在 MetaTube 上可查到。

**网络依赖降级**：MetaTube 是外部服务，可能超时/不可用。脚本需**优雅降级**：
- 抓取失败 → 打印 ⚠️ 警告但不终止播种
- `e2e-env.json` 增加 `scrapeSucceeded: true/false` 字段
- Playwright 用例可根据此字段跳过依赖抓取数据的断言

**数据就绪后预期状态**（扩展当前的"扫描后"状态）：

| 数据类型 | 数量 | 来源 |
|---------|------|------|
| 媒体库 | 2 个 | Step 5 创建 |
| 影片记录 | `seedVideos.libA.length` + `seedVideos.libB.length` 部（默认 3 + 2 = 5） | Step 2 创建假文件 → Step 5 扫描导入 |
| 已抓取元数据 | ≥ `scrapeableVids.length` 部（默认 2，即 `JUR-293-C` + `SNOS-037`） | Step 5.7 MetaTube 抓取 |
| 演员关联 | ≥ 2 位 | Step 5.7 抓取时自动写入 |
| 演员头像 | ≥ 1 个（弱断言） | Step 5.7 抓取时下载 |
| Sidecar 文件 | ≥ `scrapeableVids.length` 套（NFO + poster + thumb + fanart） | Step 5.7 writeSidecars |
| 已收藏影片 | 2 部 | 后续 Step（可选） |

#### 9.6.2 补充 Actor API 契约测试

新建 `ContractTests/ActorApiTests.cs`，测试依赖播种后的数据（`TestBootstrap` + 预播种扫描+抓取，或使用 Mock 数据）。

**方案选择**：
- **方案 A：真实 MetaTube 集成测试**（依赖网络）— 在 `TestBootstrap` 中执行扫描+抓取后测试 Actor API
- **方案 B：预置 SQLite 基线测试**（不依赖网络）— 提前在 `test-data/worker/` 放入一份含演员数据的 SQLite 基线
- **推荐方案 B**：不依赖外部服务，测试稳定可重复

测试用例（预计 3-5 个）：

| 测试 | 端点 | 验证 |
|------|------|------|
| `GetActors_ReturnsSuccessEnvelope` | `GET /api/actors` | 返回成功信封，`data.items` 为数组 |
| `GetActors_SupportsPagination` | `GET /api/actors?page=1&pageSize=10` | 分页参数正确处理 |
| `GetActor_ById_ReturnsDetail` | `GET /api/actors/{id}` | 单个演员详情，含 name/imageUrl |
| `GetActorVideos_ReturnsLinkedVideos` | `GET /api/actors/{id}/videos` | 演员关联影片列表 |
| `GetActors_SearchByName` | `GET /api/actors?search=xxx` | 搜索过滤有效 |

#### 9.6.3 补充 MetaTube 抓取集成测试（消除 P0 技术债）

新建 `ContractTests/ScrapeApiTests.cs`，验证抓取触发与结果。

**方案选择**：
- **方案 A：真实 MetaTube 联网测试** — 从 `test-data/config/test-env.json` 读取 serverUrl，需要目标服务可达，不稳定
- **方案 B：Mock MetaTube 服务** — 在 `TestBootstrap` 中注入一个 fake HTTP handler，返回预定义 JSON
- **推荐方案 A（条件执行）**：用 `[TestCategory("RequiresNetwork")]` 标记，日常跑测试可跳过，CI/手动时显式包含。地址从 `test-env.json`（或 `.local.json` 覆盖）读取

测试用例（预计 3-4 个）：

| 测试 | 验证 |
|------|------|
| `ScrapeLibrary_TriggerReturnsAccepted` | `POST /api/libraries/{id}/scrape` 返回成功 |
| `ScrapeLibrary_PopulatesMetadata` | 抓取后影片 title/releaseDate 不为空 |
| `ScrapeLibrary_CreatesActors` | 抓取后 `GET /api/actors` 返回非空列表 |
| `MetaTubeDiagnostics_ReturnsSteps` | `POST /api/settings/meta-tube/diagnostics` 返回诊断步骤 |

#### 9.6.4 补充测试文档 ✅

已完成。更新了以下文档：
- `test-targets.md`：新增 Actor API 和 Scrape API 目标范围
- `test-current-suite.md`：新增 §11 Actor API（5 个）+ §12 Scrape API（3 个），总数 44→52
- `test-plan.md`：目录结构新增两个文件、数据策略表扩展、MetaTube P0 技术债标记已解决
- `e2e-test-data-spec.md`：Worker 测试数量更新
- `README.md`：测试规模和分层描述更新
- `AGENTS.md`：测试规模数字更新
- `CHANGELOG.md`：追加 Phase 9.6 变更条目

#### 9.6.5 执行顺序

```
9.6.0 测试环境配置基础设施  ← 最先执行：创建 test-env.json + .local 覆盖机制
  ↓
9.6.1 播种脚本改造          ← 从 test-env.json 读取 MetaTube 地址
  ↓
9.6.2 Actor API 契约测试    ← 依赖 9.6.1 验证 VID 可查性，或用预置 SQLite
  ↓
9.6.3 MetaTube 抓取测试     ← 从 test-env.json 读取地址，依赖 9.6.1 确认服务可达
  ↓
9.6.4 文档更新              ← 最后统一更新（含清除硬编码地址）
```

#### 通过标准

- [ ] `test-data/config/test-env.json` 已存在且结构正确
- [ ] `test-data/config/test-env.local.json` 覆盖机制可用（`.local.json` 已加入 `.gitignore`）
- [ ] `seed-e2e-data.ps1 -SkipWorkerShutdown` 跑完后，库 A 中至少 2 部影片有 title
- [ ] `GET /api/actors` 返回 ≥ 2 个演员
- [ ] `test-data/e2e/videos/lib-a/` 下存在至少 1 套 sidecar（`.nfo` + `-poster.jpg`）
- [ ] Actor API 契约测试（3-5 个）全部通过
- [ ] MetaTube 抓取测试（3-4 个，标记 `RequiresNetwork`）在联网环境全部通过
- [ ] 全量测试（`dotnet test`）不退化，原 44 个测试仍全部通过
- [ ] 测试文档（test-targets / test-current-suite / test-plan）已同步更新
- [ ] 计划文档和 E2E 文档中不再存在硬编码的 `metatube-server.hf.space`

#### 关联文档更新

| 文档 | 更新内容 |
|------|---------|
| `doc/testing/backend/test-targets.md` | 新增 Actor + MetaTube 抓取测试目标 |
| `doc/testing/backend/test-current-suite.md` | 新增测试用例清单 |
| `doc/testing/backend/test-plan.md` | P0 技术债状态更新 |
| `doc/testing/e2e/e2e-test-data-spec.md` | 播种流程更新 |
| `doc/testing/e2e/playwright-e2e-test-cases.md` | MetaTube 地址引用改为配置文件 |
| `plan/active/.../validation.md` | MetaTube 地址引用改为配置文件 |
| `doc/testing/README.md` | 阅读指引更新 |
| `AGENTS.md` | 测试规模数字更新 |
| `doc/CHANGELOG.md` | 追加 Phase 9.6 变更条目 |

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

**播种概要**（简化，脚本位于 `tauri/scripts/seed-e2e-data.ps1`）：
1. （可选）重置 SQLite 为基线版本（`git checkout test-data/e2e/data/`）
2. 启动 Worker（`JVEDIO_APP_BASE_DIR={repo}/test-data/e2e`）
3. API 播种（创建 2 个媒体库 → 触发扫描 → 收藏 2 部影片）
4. 输出 `e2e-env.json` 供 Playwright 读取

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
| 本地业务服务 | `dotnet/Jvedio.Worker` |
| 跨层合同 | `dotnet/Jvedio.Contracts` |
| 启动入口 | `dotnet/Jvedio/App.xaml.cs`（`TauriShellLauncher`） |
| 打包入口 | `dotnet/Jvedio/Jvedio.csproj`（`PrepareTauriShellArtifacts`） |

### 外部参考

允许有限参考 `clash-verge-rev` 的视觉组织与页面编排方式，但不继承其产品架构、业务语义、路由语义或后端实现。
