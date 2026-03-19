# test-data/config/ — 测试环境配置

## 文件说明

| 文件 | 用途 | 提交到仓库 |
|------|------|-----------|
| `test-env.json` | 主配置文件，包含所有测试脚本的默认值 | ✅ 是 |
| `test-env.local.json` | 本地覆盖（个人自部署地址等），不提交仓库 | ❌ 否 |
| `test-env.local.json.example` | `.local.json` 的模板，复制后修改即可 | ✅ 是 |

## 配置项

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

### 使用方式

```powershell
# 复制模板
cp test-data/config/test-env.local.json.example test-data/config/test-env.local.json

# 编辑 test-env.local.json，填入你的 MetaTube 地址
```

## 消费者

| 消费者 | 消费方式 | 读取字段 |
|--------|---------|---------|
| `seed-e2e-data.ps1` | `Get-Content ... \| ConvertFrom-Json` | 全部字段 |
| `ScrapeApiTests.cs` | `JsonSerializer.Deserialize()` | `metaTube.*` + `scrapeableVids` |
| Playwright E2E | 通过 `e2e-env.json` 间接消费 | 不直接读取 |
