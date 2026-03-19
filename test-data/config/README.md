# test-data/config/ — 测试环境配置

## 快速上手

### 两种测试场景

| 场景 | 说明 | 需要配置 | 需要联网 |
|------|------|:--------:|:--------:|
| **Worker 契约测试**（52 个） | `dotnet test` 直接跑，全自给自足 | ❌ | ❌ |
| **E2E 播种测试** | 启动 Worker → 创建库 → 扫描 → 可选 MetaTube 抓取 | ✅ | 抓取部分需要 |

### 场景 1：Worker 契约测试（零配置）

52 个测试不需要任何配置，直接运行：

```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet test --configuration Release
```

测试会自动创建临时数据库、临时目录，测完清理，不依赖外部服务。

### 场景 2：E2E 播种测试

#### 第一步：检查默认配置

默认配置文件 `test-env.json` 已在仓库中提供：

```json
{
  "metaTube": {
    "serverUrl": "https://metatube-server.hf.space",
    "requestTimeoutSeconds": 30
  },
  "seedVideos": {
    "libA": ["JUR-293-C.mp4", "SNOS-037.mp4", "ABP-001.mp4"],
    "libB": ["SONE-100.mp4", "MIDV-200.mp4"]
  },
  "scrapeableVids": ["JUR-293-C", "SNOS-037"]
}
```

如果不需要修改默认值，可以直接跳到第三步。

#### 第二步：（可选）创建本地覆盖

如果你有**自部署的 MetaTube 服务**或想换不同的测试视频：

```powershell
# 复制模板
cp test-data/config/test-env.local.json.example test-data/config/test-env.local.json

# 编辑 test-env.local.json，填入你的配置
```

示例 `.local.json`（只需写你想覆盖的字段）：

```json
{
  "metaTube": {
    "serverUrl": "https://your-self-hosted-metatube.example.com"
  },
  "seedVideos": {
    "libA": ["YOUR-VID-001.mp4", "YOUR-VID-002.mp4"],
    "libB": ["ANOTHER-VID.mp4"]
  },
  "scrapeableVids": ["YOUR-VID-001"]
}
```

> ⚠️ `.local.json` 已在 `.gitignore` 中排除，不会提交到仓库。

#### 第三步：运行播种脚本

```powershell
# 完整播种（含 MetaTube 抓取）
.\test-data\scripts\seed-e2e-data.ps1

# 跳过 MetaTube 抓取（不需要联网）
.\test-data\scripts\seed-e2e-data.ps1 -SkipScrape

# 播种后不停 Worker（方便接着手动测试或跑 Playwright）
.\test-data\scripts\seed-e2e-data.ps1 -SkipWorkerShutdown

# CI / 自动化场景（不等按键）
.\test-data\scripts\seed-e2e-data.ps1 -NoPause

# 可组合使用
.\test-data\scripts\seed-e2e-data.ps1 -SkipScrape -NoPause
```

播种脚本会自动执行：

1. 创建 `test-data/e2e/videos/lib-a/` 和 `lib-b/` 目录
2. 根据配置生成 1KB 假视频文件（不可播放，仅供 VID 解析）
3. 启动 Worker 进程并等待 ready
4. 通过 API 创建两个媒体库 → 触发扫描
5. （可选）配置 MetaTube → 触发抓取 → 等待完成 → 验证结果
   - 抓取成功后产物：
     - **Sidecar 文件**（NFO + 海报 + 缩略图 + 背景图）→ E2E 目标：`test-data/e2e/data/{UserName}/cache/video/{LibName}/{VID}/`
     - **演员头像缓存** → 写入 `test-data/e2e/data/{UserName}/cache/actor-avatar/`
     - **演员记录** → 回填到 `app_datas.sqlite` 中的 `actor_info` 表
6. 验证数据入库（视频数量、SQLite、日志）
7. 输出 `test-data/e2e/e2e-env.json`（供后续 Playwright 使用）

#### 第四步：清理环境

```powershell
# 基本清理（停 Worker + 重置数据到基线）
.\test-data\scripts\cleanup-e2e-data.ps1

# 连日志一起清理
.\test-data\scripts\cleanup-e2e-data.ps1 -CleanLogs
```

---

## 自定义测试数据常见场景

| 你想做什么 | 怎么改 |
|-----------|--------|
| 换用自己的 MetaTube 服务 | `.local.json` 中覆盖 `metaTube.serverUrl` |
| 增加 / 减少测试视频 | `.local.json` 中覆盖 `seedVideos.libA` / `libB` 数组 |
| 不做 MetaTube 抓取 | 运行时加 `-SkipScrape`，或把 `scrapeableVids` 设为 `[]` |
| 验证不同 VID 的抓取 | 在 `scrapeableVids` 中填入想验证的 VID（必须同时出现在 `seedVideos` 中） |
| 增加请求超时时间 | `.local.json` 中覆盖 `metaTube.requestTimeoutSeconds` |

---

## 文件说明

| 文件 | 用途 | 提交到仓库 |
|------|------|-----------|
| `test-env.json` | 主配置文件，包含所有测试脚本的默认值 | ✅ 是 |
| `test-env.local.json` | 本地覆盖（个人自部署地址等），不提交仓库 | ❌ 否 |
| `test-env.local.json.example` | `.local.json` 的模板，复制后修改即可 | ✅ 是 |

## 配置项详解

### `metaTube`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `serverUrl` | string | `https://metatube-server.hf.space` | MetaTube 服务地址 |
| `requestTimeoutSeconds` | number | `30` | 单次 HTTP 请求超时秒数 |

### `seedVideos`

播种脚本 (`seed-e2e-data.ps1`) 用于创建假视频文件的文件名列表。

| 字段 | 说明 |
|------|------|
| `libA` | 媒体库 A 的假视频文件名数组（`{VID}.{ext}` 格式） |
| `libB` | 媒体库 B 的假视频文件名数组 |

播种脚本根据这些文件名在 `test-data/e2e/videos/lib-a/` 和 `lib-b/` 下创建 1KB 占位文件。

### `scrapeableVids`

MetaTube 上已确认可查到的 VID 列表。

- 抓取验证只检查这些 VID 是否回填了标题、演员等元数据
- 这些 VID 必须出现在 `seedVideos` 的某个库文件名中（否则库里没有该影片，抓取无效果）
- 如果为空数组 `[]`，播种脚本跳过抓取验证步骤

## 覆盖机制

脚本加载顺序：

1. 读取 `test-env.json`（仓库默认值）
2. 如果存在 `test-env.local.json`，合并覆盖（标量字段直接覆盖，数组字段整体替换）
3. 最终得到有效配置

> 💡 **合并规则**：标量字段（如 `serverUrl`）逐个覆盖；数组字段（如 `libA`、`scrapeableVids`）整体替换。你只需写想改的字段，未覆盖的字段保持默认值。

## 关键文件一览

```
test-data/
├─ config/
│  ├─ test-env.json              ← 主配置（提交到仓库）
│  ├─ test-env.local.json        ← 你的本地覆盖（不提交）
│  ├─ test-env.local.json.example← 模板
│  └─ README.md                  ← 本文件
├─ scripts/
│  ├─ seed-e2e-data.ps1          ← 播种脚本
│  └─ cleanup-e2e-data.ps1       ← 清理脚本
└─ e2e/                          ← 播种产物（运行时生成）
   ├─ videos/lib-a/              ← 假视频文件
   ├─ videos/lib-b/
   ├─ data/{UserName}/
   │  ├─ *.sqlite                ← SQLite 数据库
   │  └─ cache/
   │     ├─ video/{LibName}/{VID}/  ← E2E 目标：sidecar 缓存（NFO/海报等）
   │     └─ actor-avatar/        ← 演员头像缓存（抓取时自动下载）
   └─ e2e-env.json               ← Playwright 环境信息
```

> **注**：`test-data/**/cache/` 已在 `.gitignore` 中排除，sidecar 缓存和演员头像缓存都不会提交到仓库。E2E 目标路径下 sidecar 从影片目录迁移到 `data/{UserName}/cache/video/{LibName}/{VID}/`（当前 Release 代码仍写入影片目录，后续 Phase 4 适配）。

## 消费者

| 消费者 | 消费方式 | 读取字段 |
|--------|---------|---------|
| `seed-e2e-data.ps1` | `Get-Content ... \| ConvertFrom-Json` | 全部字段 |
| `ScrapeApiTests.cs` | `JsonSerializer.Deserialize()` | `metaTube.*` + `scrapeableVids` |
| Playwright E2E | 通过 `e2e-env.json` 间接消费 | 不直接读取 |
