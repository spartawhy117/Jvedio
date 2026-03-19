# test-data/config/ — 测试环境配置

## 快速上手

### 两种测试场景

| 场景 | 说明 | 需要配置 | 需要联网 |
|------|------|:--------:|:--------:|
| **Worker 契约测试**（62 个） | `dotnet test` 直接跑，全自给自足 | ❌ | ❌ |
| **E2E 播种 + 后端验收** | 启动 Worker → 创建库 → 扫描 → 抓取 → verify | ✅ | 抓取部分需要 |

### 场景 1：Worker 契约测试（零配置）

62 个测试不需要任何配置，直接运行：

```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet test --configuration Release
```

### 场景 2：E2E 播种 + 后端验收

#### 第一步：检查默认配置

默认配置文件 [test-env.json](test-data/config/test-env.json) 已在仓库中提供：

```json
{
  "metaTube": {
    "serverUrl": "https://metatube-server.hf.space",
    "requestTimeoutSeconds": 60
  },
  "seedVideos": {
    "libA": ["SNOS-037.mp4", "SDDE-759.mp4"],
    "libB": ["sdde-660-c", "FC2-PPV-1788676.mp4"]
  },
  "scrapeableVids": ["SNOS-037", "SDDE-759"]
}
```

当前默认样本分三类：

- 成功抓取样本：`SNOS-037`、`SDDE-759`
- 正常识别样本：`sdde-660-c`，实际会识别为 `SDDE-660-C`
- 失败抓取样本：`FC2-PPV-1788676`

#### 第二步：（可选）创建本地覆盖

```powershell
cp test-data/config/test-env.local.json.example test-data/config/test-env.local.json
```

示例 `.local.json`：

```json
{
  "metaTube": {
    "serverUrl": "https://your-self-hosted-metatube.example.com"
  },
  "seedVideos": {
    "libA": ["YOUR-VID-001.mp4"],
    "libB": ["YOUR-VID-002.mp4"]
  },
  "scrapeableVids": ["YOUR-VID-001"]
}
```

#### 第三步：运行播种脚本

```powershell
.\test-data\scripts\seed-e2e-data.ps1
.\test-data\scripts\seed-e2e-data.ps1 -SkipScrape
.\test-data\scripts\seed-e2e-data.ps1 -SkipWorkerShutdown
.\test-data\scripts\seed-e2e-data.ps1 -NoPause
```

播种脚本会自动执行：

1. 创建 `test-data/e2e/videos/lib-a/` 和 `lib-b/`。
2. 根据配置生成测试文件；无扩展名样本会被规范化为可扫描文件名。
3. 启动 Worker 并等待 ready。
4. 通过 API 创建两个媒体库、触发两次扫描。
5. 配置 MetaTube、触发两库抓取，并通过 `/api/tasks/{id}` 等待任务结束。
6. 写出 `test-data/e2e/e2e-env.json`，包含 `effectiveUserName`、`userDataRoot`、`videoCacheRoot`、`actorAvatarCacheRoot`、`libraries[].libraryId`。
7. 验证默认样本的真实结果：
   - `SNOS-037`、`SDDE-759`：标题、`scrapeStatus=full`、演员信息、sidecar 四件套
   - `sdde-660-c`：被识别为 `SDDE-660-C` 并成功抓取
   - `FC2-PPV-1788676`：仅生成 stub `.nfo`，不生成 `poster` / `thumb` / `fanart`
8. 验证演员头像缓存已写入 `test-data/e2e/data/test-user/cache/actor-avatar/`

#### 第四步：运行后端 verify

```powershell
.\test-data\scripts\verify-backend-apis.ps1 -NoPause
```

当前默认配置的真实结果：

- `seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` 已跑通
- `verify-backend-apis.ps1 -NoPause` 实跑结果：`36 PASS / 2 SKIP / 0 FAIL`
- skip 项仅为保护播种环境而保留的删除端点

#### 第五步：清理环境

```powershell
.\test-data\scripts\cleanup-e2e-data.ps1
.\test-data\scripts\cleanup-e2e-data.ps1 -CleanLogs
```

## 真实产物路径

默认配置真实跑通后，`test-user` 下的关键产物路径如下：

```text
test-data/e2e/data/test-user/
├─ app_datas.sqlite
├─ app_configs.sqlite
└─ cache/
   ├─ video/
   │  ├─ E2E-Lib-A/
   │  │  ├─ SNOS-037/
   │  │  │  ├─ SNOS-037.nfo
   │  │  │  ├─ SNOS-037-poster.jpg
   │  │  │  ├─ SNOS-037-thumb.jpg
   │  │  │  └─ SNOS-037-fanart.jpg
   │  │  └─ SDDE-759/
   │  │     ├─ SDDE-759.nfo
   │  │     ├─ SDDE-759-poster.jpg
   │  │     ├─ SDDE-759-thumb.jpg
   │  │     └─ SDDE-759-fanart.jpg
   │  └─ E2E-Lib-B/
   │     ├─ SDDE-660-C/
   │     │  ├─ SDDE-660-C.nfo
   │     │  ├─ SDDE-660-C-poster.jpg
   │     │  ├─ SDDE-660-C-thumb.jpg
   │     │  └─ SDDE-660-C-fanart.jpg
   │     └─ FC2-PPV-1788676/
   │        └─ FC2-PPV-1788676.nfo
   └─ actor-avatar/
      └─ *.jpg
```

## 自定义测试数据常见场景

| 你想做什么 | 怎么改 |
|-----------|--------|
| 换用自己的 MetaTube 服务 | `.local.json` 中覆盖 `metaTube.serverUrl` |
| 增加 / 减少测试视频 | `.local.json` 中覆盖 `seedVideos.libA` / `libB` |
| 不做 MetaTube 抓取 | 运行时加 `-SkipScrape`，或把 `scrapeableVids` 设为 `[]` |
| 验证不同远程可抓取样本 | 在 `scrapeableVids` 中填入远程已确认可命中的 VID |
| 验证文件名识别能力 | 在 `seedVideos` 中加入无扩展名或大小写变体样本 |
| 增加请求超时时间 | `.local.json` 中覆盖 `metaTube.requestTimeoutSeconds` |

## 配置项详解

### `metaTube`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `serverUrl` | string | `https://metatube-server.hf.space` | MetaTube 服务地址 |
| `requestTimeoutSeconds` | number | `60` | 单次 HTTP 请求超时秒数 |

### `seedVideos`

播种脚本用它生成测试文件，再由扫描链去识别 VID。

| 字段 | 说明 |
|------|------|
| `libA` | 媒体库 A 的测试文件名数组 |
| `libB` | 媒体库 B 的测试文件名数组 |

说明：

- 支持直接写 `{VID}.{ext}`，例如 `SNOS-037.mp4`
- 也支持无扩展名输入作为识别样本，例如 `sdde-660-c`
- 最终验证看的是扫描与抓取后的真实 VID，不是原始输入字符串

### `scrapeableVids`

这里放的是“远端已确认可稳定抓取成功”的样本。

- 当前默认值只包含 `SNOS-037`、`SDDE-759`
- `sdde-660-c` 不在这个列表里，但仍会在播种链路中验证它能被正确识别并完成抓取
- 如果为空数组 `[]`，播种脚本跳过抓取验证

## 覆盖机制

1. 读取 `test-env.json`
2. 如存在 `test-env.local.json`，则按字段覆盖
3. 生成最终有效配置

## 关键文件一览

```text
test-data/
├─ config/
│  ├─ test-env.json
│  ├─ test-env.local.json
│  ├─ test-env.local.json.example
│  └─ README.md
├─ scripts/
│  ├─ seed-e2e-data.ps1
│  ├─ verify-backend-apis.ps1
│  └─ cleanup-e2e-data.ps1
└─ e2e/
   ├─ videos/
   │  ├─ lib-a/
   │  └─ lib-b/
   ├─ data/test-user/
   │  ├─ *.sqlite
   │  └─ cache/
   │     ├─ video/{LibraryName}/{VID}/
   │     └─ actor-avatar/
   └─ e2e-env.json
```

## 消费者

| 消费者 | 消费方式 | 读取字段 |
|--------|---------|---------|
| `seed-e2e-data.ps1` | 直接读取 `test-env.json` / `.local.json` | 全部字段 |
| `verify-backend-apis.ps1` | 读取 `e2e-env.json` | `baseUrl`、`libraries`、`effectiveUserName`、`userDataRoot`、`videoCacheRoot`、`actorAvatarCacheRoot` |
| `ScrapeApiTests.cs` | 反序列化配置 | `metaTube.*`、`scrapeableVids` |
| Playwright E2E | 间接读取 `e2e-env.json` | 不直接读取配置文件 |
