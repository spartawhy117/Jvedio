# E2E 测试数据规范

## 1. 文档目的

本文件定义 Playwright E2E 测试的数据目录结构、假视频文件要求、播种脚本流程和测试后清理规则。

关联文档：
- 数据目录总体规范：`doc/data-directory-convention.md`
- E2E 执行方案：`doc/testing/e2e/playwright-e2e-test-plan.md`
- E2E 用例清单：`doc/testing/e2e/playwright-e2e-test-cases.md`
- 后端测试路径隔离：`doc/testing/backend/test-plan.md` §5

## 2. 测试数据根目录

### 2.1 目录结构

```
{系统临时目录}/jvedio-e2e-{timestamp}/     ← E2E 测试数据根目录
├── data/
│   └── test-user/                          ← 模拟用户目录（JVEDIO_APP_BASE_DIR 指向上级）
│       ├── app_datas.sqlite                ← 影片/媒体库/演员数据（Worker 自动建表）
│       ├── app_configs.sqlite              ← 用户设置配置（Worker 自动建表）
│       └── cache/
│           └── actor-avatar/               ← 演员头像缓存（空目录，无需预置）
├── videos/                                 ← 假视频文件存放根目录
│   ├── lib-a/                              ← 媒体库 A 的扫描目录
│   │   ├── ABP-001.mp4                     ← 假视频（≥ 1 KB）
│   │   ├── STARS-123.mkv
│   │   └── IPX-456.mp4
│   └── lib-b/                              ← 媒体库 B 的扫描目录
│       ├── FC2-PPV-1234567.mp4
│       └── SSIS-789.mp4
└── log/
    └── test/
        └── e2e/                            ← E2E 测试日志（JVEDIO_LOG_DIR 指向此处）
```

### 2.2 为什么是临时目录而非 repo 内固定目录

1. **隔离性**：每次测试运行生成独立目录，不会与上次残留数据冲突
2. **安全性**：临时目录不进入版本控制，不会把测试数据泄露到 git
3. **幂等性**：播种脚本先创建目录再填充，无需清理上次的状态
4. **与后端测试一致**：`TestBootstrap.cs` 也使用 `Path.GetTempPath() + GUID` 方案

### 2.3 与 Release 版 / 后端测试的数据目录对比

| 维度 | Release 正式版 | 后端测试 | E2E 测试 |
|------|---------------|---------|---------|
| **数据根目录** | `{exe探测}/Jvedio/bin/Release` | `{TempDir}/jvedio-test-{guid}` | `{TempDir}/jvedio-e2e/` |
| **路径注入方式** | `WorkerPathResolver` 自动探测 | `JVEDIO_APP_BASE_DIR` 环境变量 | `JVEDIO_APP_BASE_DIR` 环境变量 |
| **用户目录** | `data/{Windows用户名}/` | `data/test-user/` | `data/test-user/` |
| **SQLite 数据库** | `Mode=ReadWriteCreate` 自动建表 | 空文件 → Worker 自动建表 | 空文件 → Worker 自动建表 |
| **视频扫描目录** | 用户在 UI 中手动指定 | 不涉及（API 测试不扫描文件） | 播种脚本创建 `videos/lib-a/`、`videos/lib-b/` |
| **扫描整理后** | 按 VID 创建子目录 | — | 同机制，`videos/lib-a/ABP-001/ABP-001.mp4` |
| **Sidecar 文件** | 视频同目录 | — | 同位置（E2E 扫描步骤不触发搜刮，不生成 sidecar） |
| **演员头像缓存** | `data/{用户名}/cache/actor-avatar/` | 空目录 | 空目录 |
| **日志目录** | `{repo}/log/runtime/` | 临时目录，测试后清理 | 临时目录，测试后清理 |
| **Worker 端口** | `127.0.0.1:0`（OS 随机分配） | WebApplicationFactory 内存管道 | 同正式版随机端口，通过 stdout 握手获取 |
| **生命周期** | 用户手动关闭 | `[AssemblyCleanup]` 自动清理 | 脚本自动清理整个临时目录 |

> **核心差异**：E2E 测试通过 `JVEDIO_APP_BASE_DIR` 环境变量将数据根目录重定向到临时隔离目录，与后端单元测试（`TestBootstrap.cs`）使用完全相同的隔离策略。正式版不设置此变量，由 `WorkerPathResolver` 从 exe 路径自动推断。

## 3. 假视频文件要求

### 3.1 文件名命名规则

文件名必须能被 `ExtractVideoId()` 正则解析出合法 VID。完整的 VID 解析规则见 `doc/data-directory-convention.md` §4.4。

常用格式速查：

| 格式 | 命名要求 | 示例 |
|------|---------|------|
| **通用** | `[A-Z]{2,10}[-]\d{2,5}` + 视频扩展名 | `ABP-001.mp4`、`STARS-123.mkv` |
| **FC2** | `FC2-PPV-\d{3,8}` + 视频扩展名 | `FC2-PPV-1234567.mp4` |

### 3.2 文件内容与大小

| 要求 | 说明 |
|------|------|
| **内容** | 任意二进制，不需要是真正可播放的视频（`new byte[1024]` 即可） |
| **最小大小** | ≥ 1 KB；`ScanConfig.MinFileSize` 默认值为 0 MB，即不过滤 |
| **扩展名** | 必须是 68 种支持的视频扩展名之一（常用 `.mp4`、`.mkv`、`.avi`） |
| **路径** | 不含 Windows 非法文件名字符；VID 中的分隔符建议用 `-`（最规范） |

### 3.3 播种文件清单（5 个假视频）

| 文件名 | 所属库 | 预期 VID | 格式 | 用途 |
|--------|--------|---------|------|------|
| `ABP-001.mp4` | lib-a | `ABP-001` | 通用 | 标准 VID 解析 + 库 A 基础数据 |
| `STARS-123.mkv` | lib-a | `STARS-123` | 通用 | 不同扩展名 + 库 A 多影片 |
| `IPX-456.mp4` | lib-a | `IPX-456` | 通用 | 库 A 收藏操作目标 |
| `FC2-PPV-1234567.mp4` | lib-b | `FC2-PPV-1234567` | FC2 | FC2 格式 VID 解析 |
| `SSIS-789.mp4` | lib-b | `SSIS-789` | 通用 | 库 B 收藏操作目标 |

## 4. 扫描后数据位置

### 4.1 扫描整理前后的目录变化

默认 `OrganizeBeforeScan = true`，扫描时会把平铺的视频文件整理到以 VID 命名的独立子目录：

```
扫描前（播种状态）：              扫描后（整理完成）：
videos/lib-a/                    videos/lib-a/
├── ABP-001.mp4                  ├── ABP-001/
├── STARS-123.mkv                │   └── ABP-001.mp4
└── IPX-456.mp4                  ├── STARS-123/
                                 │   └── STARS-123.mkv
                                 └── IPX-456/
                                     └── IPX-456.mp4

videos/lib-b/                    videos/lib-b/
├── FC2-PPV-1234567.mp4          ├── FC2-PPV-1234567/
└── SSIS-789.mp4                 │   └── FC2-PPV-1234567.mp4
                                 └── SSIS-789/
                                     └── SSIS-789.mp4
```

整理逻辑细节见 `doc/data-directory-convention.md` §4.2。

### 4.2 单个影片的数据记录

扫描入库后，每部影片对应 SQLite 中两条记录：

| 表 | 关键字段 | 说明 |
|----|---------|------|
| `metadata` | `DataID`(PK), `DBId`(=libraryId), `Path`(整理后路径), `Hash`, `Size`, `FirstScanDate`, `LastScanDate` | 通用元数据 |
| `metadata_video` | `MVID`(PK), `DataID`(FK), `VID`(如 `ABP-001`) | 视频专用字段（搜刮前 Title/Studio/Plot 等为空） |

查询路径：`GET /api/libraries/{id}/videos?page=1&pageSize=50` → 返回 `VideoListItemDto[]`

### 4.3 Sidecar 文件位置（搜刮后才生成）

E2E 扫描步骤只做导入，不触发 MetaTube 搜刮。如果后续测试需要验证搜刮产物，sidecar 文件位于视频同目录：

```
videos/lib-a/ABP-001/
├── ABP-001.mp4              ← 视频文件
├── ABP-001.nfo              ← NFO 元数据（XML）
├── ABP-001-poster.jpg       ← 海报
├── ABP-001-thumb.jpg        ← 缩略图
└── ABP-001-fanart.jpg       ← 背景图
```

Sidecar 命名规则见 `doc/data-directory-convention.md` §4.3。

## 5. 播种脚本

**脚本位置**：`tauri/scripts/seed-e2e-data.ps1`（幂等可重跑）

### 5.1 详细步骤

```
步骤 1: 清空并创建测试数据根目录
  → $testRoot = Join-Path $env:TEMP "jvedio-e2e"
  → 如果 $testRoot 已存在 → Remove-Item -Recurse -Force
  → 创建 data/test-user/、videos/lib-a/、videos/lib-b/、log/test/e2e/

步骤 2: 预创建空 SQLite 文件
  → data/test-user/app_datas.sqlite（空文件，Worker 启动时 StorageBootstrapper 自动建表）
  → data/test-user/app_configs.sqlite（同上）

步骤 3: 创建 5 个假视频文件
  → 每个文件写入 1024 字节随机数据
  → ABP-001.mp4、STARS-123.mkv、IPX-456.mp4 → videos/lib-a/
  → FC2-PPV-1234567.mp4、SSIS-789.mp4 → videos/lib-b/

步骤 4: 设置环境变量并启动 Worker
  → $env:JVEDIO_APP_BASE_DIR = $testRoot
  → $env:JVEDIO_LOG_DIR = "$testRoot/log/test/e2e"
  → 启动 Worker 进程，等待 stdout 输出 "JVEDIO_WORKER_READY http://127.0.0.1:{port}"
  → 提取 baseUrl

步骤 5: 创建媒体库 A
  → POST /api/libraries { name: "E2E-Lib-A", scanPaths: ["$testRoot/videos/lib-a"] }
  → 记录 libraryIdA

步骤 6: 创建媒体库 B
  → POST /api/libraries { name: "E2E-Lib-B", scanPaths: ["$testRoot/videos/lib-b"] }
  → 记录 libraryIdB

步骤 7: 触发媒体库 A 扫描
  → POST /api/libraries/{libraryIdA}/scan { organizeBeforeScan: true }
  → 等待 3-5 秒（异步任务）
  → GET /api/libraries/{libraryIdA}/videos → 验证 3 部影片入库

步骤 8: 触发媒体库 B 扫描
  → POST /api/libraries/{libraryIdB}/scan { organizeBeforeScan: true }
  → 等待 3-5 秒
  → GET /api/libraries/{libraryIdB}/videos → 验证 2 部影片入库

步骤 9: 收藏 2 部影片
  → PUT /api/videos/{dataId}/favorite（IPX-456、SSIS-789）
  → GET /api/favorites → 验证收藏列表有 2 部

步骤 10: 输出测试环境信息
  → 打印 testRoot 路径、Worker baseUrl、libraryIdA/B、Vite dev URL
  → 写入 $testRoot/e2e-env.json 供 Playwright 读取
```

## 6. 测试后清理

```
1. 关闭 Playwright 浏览器
2. 停止 Vite dev server
3. 停止 Worker 进程（kill 进程树）
4. 删除整个 $testRoot 临时目录（包含 data/ + videos/ + log/）
5. 取消环境变量 JVEDIO_APP_BASE_DIR、JVEDIO_LOG_DIR
```

## 7. 维护规则

- 假视频文件清单变化时，同步更新 §3.3 播种文件清单和 §4.1 目录变化图
- 播种脚本步骤变化时，同步更新 §5.1
- 数据目录结构变化时，先更新 `doc/data-directory-convention.md`，再更新本文件 §2.3 对比表
