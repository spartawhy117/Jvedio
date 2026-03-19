# E2E 测试数据规范

## 1. 文档目的

定义 Playwright E2E 测试的数据目录、假视频文件和播种流程。

关联文档：
- 数据目录总体规范（路径推断、SQLite 表结构、Sidecar 规则）：`doc/data-directory-convention.md`
- E2E 执行方案：`doc/testing/e2e/playwright-e2e-test-plan.md`
- E2E 用例清单：`doc/testing/e2e/playwright-e2e-test-cases.md`

## 1.1 数据架构与设计思路

### 为什么需要独立的 E2E 数据环境？

E2E 测试通过浏览器操作真实 UI，UI 背后会调用 Worker API，Worker 会读写 SQLite 数据库和文件系统。如果使用开发者的正式数据，测试操作（创建/删除库、扫描、收藏）会污染正式数据。因此需要一套**完全隔离的测试数据环境**。

隔离方式：通过环境变量 `JVEDIO_APP_BASE_DIR` 将 Worker 的数据根目录指向 `test-data/e2e/`，使正式数据和测试数据互不影响。

| | 正式使用 | E2E 测试 |
|---|---------|---------|
| SQLite 位置 | `data/{user}/` | `test-data/e2e/data/test-user/` |
| 影片文件 | 用户真实视频 | 假视频（1 KB，不可播放） |
| 日志位置 | `log/runtime/` | `log/test/e2e/runtime/` |
| 互相影响 | — | ❌ 完全隔离 |
| 测试后重置 | — | `git checkout` 一键还原 |

### 完整数据流

```
seed-e2e-data.ps1 播种
        │
        ├─ 创建假视频文件 ──────────────────── 文件系统（test-data/e2e/videos/）
        ├─ 启动 Worker ─────────────────────── 进程（自动在 data/test-user/ 下建表）
        ├─ API 创建库 + 触发扫描 ──────────── Worker 写入 SQLite（测试数据库）
        │       ├─ app_datas.sqlite ────────── 影片记录（VID、路径、标签等）
        │       └─ app_configs.sqlite ─────── 应用配置（媒体库定义、设置项等）
        ├─ （可选）MetaTube 抓取 ──────────── Worker 回填元数据到 SQLite + 写出文件产物
        │       ├─ data/{user}/cache/video/{LibName}/{VID}/{VID}.nfo ── sidecar（NFO/海报/缩略图/背景图）（E2E 目标路径）
        │       └─ data/{user}/cache/actor-avatar/ ─ 演员头像缓存
        └─ 写出 e2e-env.json ──────────────── 连接信息清单（端口、库 ID、PID）
                    │
                    ▼
           Playwright 跑 UI 测试
                    │
                    ├─ 读 e2e-env.json → 知道连哪个端口、操作哪个库
                    ├─ 浏览器打开页面 → 页面从 Worker 读 SQLite 渲染列表
                    ├─ 用户操作（收藏、搜索、切换库等）→ Worker 读写 SQLite
                    └─ 断言页面状态（列表数量、收藏标记、空态提示等）
                    │
                    ▼
           cleanup-e2e-data.ps1 清理
                    │
                    ├─ 停止 Worker 进程
                    ├─ git checkout test-data/e2e/data/ → 重置 SQLite 到基线
                    ├─ git checkout test-data/e2e/videos/ → 撤销扫描整理
                    └─ 清除环境变量
```

### 三类文件的职责

| 文件 | 类型 | 职责 | 谁产生 | 谁消费 |
|------|------|------|--------|--------|
| `e2e-env.json` | JSON 配置 | 传递连接信息（端口、库 ID、PID） | 播种脚本 | Playwright 测试 + 清理脚本 |
| `app_datas.sqlite` | SQLite 数据库 | 存储影片、演员、标签、收藏等业务数据 | Worker（被 API 触发） | Worker（被 UI 操作触发） |
| `app_configs.sqlite` | SQLite 数据库 | 存储媒体库定义、用户设置 | Worker（被 API 触发） | Worker（被 UI 操作触发） |
| `cache/actor-avatar/*.jpg` | 图片文件 | 演员头像缓存 | Worker（MetaTube 抓取时下载） | UI 演员页（读取展示） |
| `{VID}.nfo` / `-poster.jpg` 等 | Sidecar 文件 | 影片元数据和封面图 | Worker（MetaTube 抓取时写出） | UI 详情页（读取展示） |

**关键区别**：`e2e-env.json` 是播种脚本和 Playwright 之间的"交接清单"——告诉测试"去哪连、操作什么"；SQLite 才是真正的"测试数据库"——存储所有业务数据，E2E 测试全程都在读写它。

### 与 Worker 后端测试的关系

| 维度 | Worker 测试（52 个） | E2E 测试（48 个，计划中） |
|------|---------------------|------------------------|
| 测试层 | API 层 + 业务逻辑层 | UI 层（浏览器操作） |
| 执行方式 | MSTest 内存 HTTP（`WebApplicationFactory`） | Playwright 浏览器自动化 |
| 验证什么 | API 响应格式、VID 解析算法、文件整理逻辑 | 页面切换、弹层交互、表单、状态恢复 |
| 数据库 | 内存临时 SQLite（测试后自动清理） | 文件 SQLite（`test-data/e2e/data/`） |
| 前端 | ❌ 不涉及 | ✅ 核心覆盖 |
| 关系 | 验证 API 契约正确性 | 验证 UI + API 端到端集成 |

两者是**互补关系**：Worker 测试保证 API 层可靠，E2E 测试保证用户能通过 UI 正确使用这些 API。E2E 播种步骤（创建库→扫描）和 Worker 测试中的 `ScanImportApiTests` 做的事类似，但这种重叠是合理的——E2E 播种只是前置准备（setup），不是被测对象。

## 2. 目录结构

E2E 测试数据统一放在 `{repo}/test-data/e2e/`，直接提交到 git：

```
{repo}/test-data/e2e/
├── data/
│   └── {UserName}/                ← Worker 用户目录（JVEDIO_APP_BASE_DIR 指向上级 e2e/）
│       ├── app_datas.sqlite       ← Worker 自动建表（影片、演员等业务数据）
│       ├── app_configs.sqlite     ← Worker 自动建表（媒体库定义、设置项）
│       └── cache/
│           ├── video/             ← E2E 目标：影片 sidecar 缓存（按库名分子目录）
│           │   ├── lib-a/{VID}/   ← NFO + 海报 + 缩略图 + 背景图
│           │   └── lib-b/{VID}/
│           └── actor-avatar/      ← 演员头像缓存（MetaTube 抓取时自动下载）
│               └── *.jpg          ← 以 actorId 或 SHA1(name) 命名
└── videos/
    ├── lib-a/                     ← 媒体库 A
    │   ├── ABP-001.mp4
    │   ├── STARS-123.mkv
    │   └── IPX-456.mp4
    └── lib-b/                     ← 媒体库 B
        ├── FC2-PPV-1234567.mp4
        └── SSIS-789.mp4
```

> 多台电脑 `git pull` 后即可直接使用，无需重新播种。
> `cache/` 目录已在 `.gitignore` 中排除（规则 `test-data/**/cache/`），抓取产生的头像文件和 sidecar 缓存不会被跟踪。

## 3. 假视频文件清单

| 文件名 | 所属库 | 预期 VID | 大小 | 用途 |
|--------|--------|---------|------|------|
| `ABP-001.mp4` | lib-a | `ABP-001` | 1 KB | 标准 VID |
| `STARS-123.mkv` | lib-a | `STARS-123` | 1 KB | 不同扩展名 |
| `IPX-456.mp4` | lib-a | `IPX-456` | 1 KB | 收藏操作目标 |
| `FC2-PPV-1234567.mp4` | lib-b | `FC2-PPV-1234567` | 1 KB | FC2 格式 VID |
| `SSIS-789.mp4` | lib-b | `SSIS-789` | 1 KB | 收藏操作目标 |

文件要求：
- 内容为任意二进制（`new byte[1024]` 即可），不需要可播放
- 扩展名必须是支持的视频格式（`.mp4`、`.mkv` 等）
- 文件名必须能被 `ExtractVideoId()` 解析出合法 VID（规则见 `data-directory-convention.md` §4.4）

## 4. E2E 测试数据配置指南

**目标**：按以下步骤操作，开发者不看其他文档也能完成 E2E 测试数据的配置。

### 步骤 1：确认假视频文件就位

```powershell
# 在 repo 根目录执行
ls test-data/e2e/videos/lib-a/   # 应看到 ABP-001.mp4、STARS-123.mkv、IPX-456.mp4
ls test-data/e2e/videos/lib-b/   # 应看到 FC2-PPV-1234567.mp4、SSIS-789.mp4
```

如果文件不存在，手动创建（每个 1024 字节即可）：

```powershell
$dirs = @("test-data/e2e/videos/lib-a", "test-data/e2e/videos/lib-b", "test-data/e2e/data/test-user")
$dirs | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force }

$libA = @("ABP-001.mp4", "STARS-123.mkv", "IPX-456.mp4")
$libB = @("FC2-PPV-1234567.mp4", "SSIS-789.mp4")
$libA | ForEach-Object { [System.IO.File]::WriteAllBytes("test-data/e2e/videos/lib-a/$_", [byte[]]::new(1024)) }
$libB | ForEach-Object { [System.IO.File]::WriteAllBytes("test-data/e2e/videos/lib-b/$_", [byte[]]::new(1024)) }
```

### 步骤 2：设置环境变量

启动 Worker 前设置两个环境变量，将数据和日志重定向到测试目录：

```powershell
$repoRoot = (Get-Location).Path                            # 确保在 repo 根目录
$env:JVEDIO_APP_BASE_DIR = "$repoRoot\test-data\e2e"       # 数据根目录
$env:JVEDIO_LOG_DIR = "$repoRoot\log\test\e2e"             # 日志根目录
```

| 变量 | 指向 | 作用 |
|------|------|------|
| `JVEDIO_APP_BASE_DIR` | `{repo}/test-data/e2e` | Worker 从此路径读写 `data/test-user/*.sqlite` |
| `JVEDIO_LOG_DIR` | `{repo}/log/test/e2e` | Worker 日志写入此处（自动追加 `runtime/` 子目录） |

### 步骤 3：启动 Worker

```powershell
cd dotnet/Jvedio.Worker
dotnet run --configuration Release
# 等待 stdout 输出 "JVEDIO_WORKER_READY http://127.0.0.1:{port}"
```

Worker 启动时 `StorageBootstrapper` 会在 `test-data/e2e/data/test-user/` 下自动建表。

### 步骤 4：通过 API 播种数据

```powershell
$baseUrl = "http://127.0.0.1:{port}"   # 替换为实际端口

# 创建媒体库 A
$libA = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" `
  -ContentType "application/json" `
  -Body '{"name":"E2E-Lib-A","scanPaths":["REPO_ROOT/test-data/e2e/videos/lib-a"]}'

# 创建媒体库 B
$libB = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" `
  -ContentType "application/json" `
  -Body '{"name":"E2E-Lib-B","scanPaths":["REPO_ROOT/test-data/e2e/videos/lib-b"]}'

# 触发扫描（会自动整理到 VID 子目录）
Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$($libA.data.dbId)/scan" `
  -ContentType "application/json" -Body '{"organizeBeforeScan":true}'
Start-Sleep -Seconds 5

Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$($libB.data.dbId)/scan" `
  -ContentType "application/json" -Body '{"organizeBeforeScan":true}'
Start-Sleep -Seconds 5
```

> 将上面的 `REPO_ROOT` 替换为你的实际 repo 绝对路径。

### 步骤 5：验证配置成功

```powershell
# 检查影片入库
$videosA = Invoke-RestMethod "$baseUrl/api/libraries/$($libA.data.dbId)/videos?page=1&pageSize=50"
Write-Host "库 A 影片数: $($videosA.data.items.Count)"   # 应为 3

$videosB = Invoke-RestMethod "$baseUrl/api/libraries/$($libB.data.dbId)/videos?page=1&pageSize=50"
Write-Host "库 B 影片数: $($videosB.data.items.Count)"   # 应为 2

# 检查 SQLite 文件
ls test-data/e2e/data/test-user/*.sqlite                   # 应有 2 个文件

# 检查日志
ls log/test/e2e/runtime/                                   # 应有 worker-*.log
```

验证通过的标志：
- ✅ 库 A 有 3 部影片、库 B 有 2 部影片
- ✅ `test-data/e2e/data/test-user/` 下有 `app_datas.sqlite` 和 `app_configs.sqlite`
- ✅ `log/test/e2e/runtime/` 下有日志文件
- ✅ 假视频已被整理到 VID 子目录（如 `lib-a/ABP-001/ABP-001.mp4`）

## 5. 扫描后目录变化

扫描时 `OrganizeBeforeScan = true` 会自动整理：

```
扫描前：                              扫描后：
videos/lib-a/                        videos/lib-a/
├── ABP-001.mp4                      ├── ABP-001/ABP-001.mp4
├── STARS-123.mkv                    ├── STARS-123/STARS-123.mkv
└── IPX-456.mp4                      └── IPX-456/IPX-456.mp4
```

整理逻辑细节见 `doc/data-directory-convention.md` §4.2。

### 5.1 抓取后目录变化

如果播种时未使用 `-SkipScrape`，MetaTube 抓取完成后会产生额外文件：

> ⚠️ **当前状态 vs E2E 目标路径**：当前 Release 代码仍将 sidecar 写入影片目录（`videos/lib-a/{VID}/`）。下方展示的是 E2E 目标路径（`data/{UserName}/cache/video/{LibName}/{VID}/`），将在后续 Phase 4（Worker 测试环境路径适配）实现。

```
抓取后新增产物（E2E 目标路径）：

data/{UserName}/
├── app_datas.sqlite               ← 影片元数据 + 演员关联已回填
└── cache/
    ├── video/                     ← E2E 目标：sidecar 按库名分子目录
    │   └── lib-a/
    │       └── JUR-293-C/
    │           ├── JUR-293-C.nfo          ← NFO sidecar（元数据）
    │           ├── JUR-293-C-poster.jpg   ← 海报
    │           ├── JUR-293-C-thumb.jpg    ← 缩略图
    │           └── JUR-293-C-fanart.jpg   ← 背景图
    └── actor-avatar/              ← 演员头像缓存目录（自动创建）
        ├── {actorId}.jpg           ← 演员头像（按 actorId 命名）
        └── {SHA1(name)}.jpg        ← 或按演员名哈希命名
```

**产物说明**：

| 产物类型 | 当前写入位置 | E2E 目标写入位置 | 命名规则 | 谁产生 |
|---------|-------------|-----------------|---------|--------|
| NFO sidecar | `videos/lib-a/{VID}/` | `data/{UserName}/cache/video/lib-a/{VID}/` | `{VID}.nfo` | `LibraryScrapeService` |
| 海报 | `videos/lib-a/{VID}/` | `data/{UserName}/cache/video/lib-a/{VID}/` | `{VID}-poster.jpg` | `LibraryScrapeService` |
| 缩略图 | `videos/lib-a/{VID}/` | `data/{UserName}/cache/video/lib-a/{VID}/` | `{VID}-thumb.jpg` | `LibraryScrapeService` |
| 背景图 | `videos/lib-a/{VID}/` | `data/{UserName}/cache/video/lib-a/{VID}/` | `{VID}-fanart.jpg` | `LibraryScrapeService` |
| 演员头像 | `data/{UserName}/cache/actor-avatar/` | `data/{UserName}/cache/actor-avatar/` | `{actorId}.jpg` 或 `{SHA1(name)}.jpg` | `LibraryScrapeService` |
| 演员记录 | `app_datas.sqlite` 中 `actor_info` 表 | 同左 | — | `LibraryScrapeService` |

> ⚠️ E2E 目标路径下，sidecar 和演员头像都在 `data/{UserName}/cache/` 下，统一管理。
> `.gitignore` 中 `test-data/**/cache/` 规则确保 sidecar 缓存和演员头像都不会被提交到仓库。

## 6. 播种脚本（自动化）

**脚本位置**：`test-data/scripts/seed-e2e-data.ps1`（幂等可重跑）

脚本一键完成以下全部步骤：

| 步骤 | 动作 |
|------|------|
| 1 | 创建 `test-data/e2e/` 目录结构（每次先清空 `videos/` 和 `data/`） |
| 1.5 | 从 `test-data/config/test-env.json`（+ `.local.json` 覆盖）读取配置 |
| 2 | 根据 `seedVideos` 配置生成假视频文件（各 1 KB） |
| 3 | 设置 `JVEDIO_APP_BASE_DIR` / `JVEDIO_LOG_DIR` 环境变量 |
| 4 | 启动 Worker 并等待 `JVEDIO_WORKER_READY` 信号（超时 60s） |
| 5 | 通过 API 创建 2 个媒体库 + 触发扫描 |
| 5.5 | （可选）通过 `PUT /api/settings` 配置 MetaTube 地址 |
| 5.7 | （可选）触发 `POST /api/libraries/{id}/scrape`（`missing-only` + sidecar + 头像下载） |
| 5.8 | （可选）轮询等待抓取完成（超时 120s） |
| 5.9 | （可选）验证抓取结果：影片标题、演员数量、sidecar 文件、演员头像缓存 |
| 6 | 验证数据入库（视频数量、SQLite、日志） |
| 7 | 输出 `test-data/e2e/e2e-env.json`（含 baseUrl、PID、库 ID 等）供 Playwright 读取 |

```powershell
# 基本用法（播种后停止 Worker）
.\test-data\scripts\seed-e2e-data.ps1

# CI / 自动化（跳过 "Press any key"）
.\test-data\scripts\seed-e2e-data.ps1 -NoPause

# 播种后保持 Worker 运行（接着跑 Playwright）
.\test-data\scripts\seed-e2e-data.ps1 -SkipWorkerShutdown
```

## 6.5 后端 API 校验（可选）

**脚本位置**：`test-data/scripts/verify-backend-apis.ps1`

播种完成后、跑 Playwright E2E 之前，可先通过此脚本校验 Worker 全部 31 个 API 端点是否正常工作：

```powershell
# 播种后 Worker 仍在运行（-SkipWorkerShutdown），直接校验
.\test-data\scripts\verify-backend-apis.ps1

# 或手动指定 Worker 地址
.\test-data\scripts\verify-backend-apis.ps1 -BaseUrl http://127.0.0.1:12345

# CI / 自动化
.\test-data\scripts\verify-backend-apis.ps1 -NoPause
```

校验覆盖 8 个 Controller（Health / App / Libraries / Videos / Actors / Tasks / Settings / Events），每个端点断言 HTTP 状态码和关键响应字段。脚本退出码等于失败数（0 = 全通过）。

> ⚠️ 为保护播种数据，脚本跳过 `DELETE /api/videos/{videoId}` 和批量删除端点。库 CRUD 校验使用临时库（创建 → 更新 → 删除）。

## 7. 测试后清理

**脚本位置**：`test-data/scripts/cleanup-e2e-data.ps1`

清理脚本自动执行：

| 步骤 | 动作 |
|------|------|
| 1 | 停止 Worker 进程（从 `e2e-env.json` 读 PID，或按进程名查找） |
| 2 | `git checkout` 重置 `test-data/e2e/data/` 和 `videos/`（撤销扫描整理） |
| 3 | 清除 `JVEDIO_APP_BASE_DIR` / `JVEDIO_LOG_DIR` 环境变量 |
| 4 | （可选）清理 `log/test/e2e/` 日志 |

```powershell
# 基本用法
.\test-data\scripts\cleanup-e2e-data.ps1

# 同时清理日志
.\test-data\scripts\cleanup-e2e-data.ps1 -CleanLogs

# CI / 自动化
.\test-data\scripts\cleanup-e2e-data.ps1 -NoPause -CleanLogs
```

## 8. 维护规则

- 假视频文件清单变化时，同步更新 §3 和 §5
- 播种脚本变化时，同步更新 §6
- API 校验脚本变化时（新增/删除端点），同步更新 §6.5
- 目录结构变化时，先更新 `data-directory-convention.md`，再更新本文件 §2
