# 测试方法说明

## 测试分层

### 1. 快速验证

用途：
- 不联网
- 快速验证路径、sidecar、cache、目录规则是否回归

覆盖对象：
- `SidecarPathResolver`
- `ActorAvatarPathResolver`
- `MetaTubeCache`
- `LibraryOrganizer`
- `ScrapeResult -> Dictionary` 映射

适用场景：
- 每次修改路径、sidecar、目录整理规则后优先运行

### 2. 网络验证

用途：
- 验证 MetaTube 远程链路
- 不依赖 UI
- 验证：
  - warmup
  - movie search
  - detail
  - actor search
  - actor detail
  - test output

覆盖对象：
- `MetaTubeIntegrationTests`

适用场景：
- 每次修改 `MetaTubeClient`、`MetaTubeScraperProvider`、`MetaTubeOutputWriter`、`VideoDownLoader` 后运行

### 3. 扫描链验证

用途：
- 验证平铺影片 -> 自动整理 -> 导入/搜刮 的完整链路

覆盖对象：
- `LibraryOrganizeTests`
- `ScanImportIntegrationTests`

适用场景：
- 每次修改 `ScanTask`、`LibraryOrganizer`、sidecar 命名、skip 策略后运行

## 配置文件

### MetaTube 测试配置

文件：
- `IntegrationTests/MetaTube/meta-tube-test-config.json`

建议结构：

```json
{
  "enabled": true,
  "serverUrl": "https://metatube-server.hf.space",
  "requestTimeoutSeconds": 60,
  "warmupBeforeScrape": true,
  "clearOutputBeforeRun": true,
  "testOutputRoot": "D:\\study\\Proj\\Jvedio\\Jvedio-WPF\\Jvedio.Test\\TestOutput\\MetaTube",
  "cacheRoot": "D:\\study\\Proj\\Jvedio\\Jvedio-WPF\\Jvedio.Test\\TestOutput\\Cache",
  "logToConsole": true,
  "cases": [
    {
      "name": "movie-and-actor-basic",
      "vid": "SDDE-759",
      "expectMovieHit": true,
      "expectMovieTitleNotEmpty": true,
      "expectActorCountMin": 1,
      "expectPreviewCountMin": 1,
      "expectActorAvatarAtLeastOne": true,
      "expectTestOutputFiles": true
    }
  ]
}
```

字段说明：
- `enabled`
  - 是否启用测试
- `serverUrl`
  - MetaTube 服务地址
- `requestTimeoutSeconds`
  - 请求超时
- `warmupBeforeScrape`
  - 是否预热
- `clearOutputBeforeRun`
  - 是否清空旧测试输出
- `testOutputRoot`
  - 测试输出目录
- `cacheRoot`
  - 缓存测试目录
- `logToConsole`
  - 是否打印详细日志
- `cases`
  - 测试影片列表

### 扫描链测试配置

文件：
- `IntegrationTests/Scan/scan-test-config.json`

建议结构：

```json
{
  "enabled": true,
  "cleanOutputBeforeRun": true,
  "testRoot": "D:\\study\\Proj\\Jvedio\\Jvedio-WPF\\Jvedio.Test\\TestOutput\\Scan",
  "flatLibraryRoot": "D:\\study\\Proj\\Jvedio\\Jvedio-WPF\\Jvedio.Test\\TestData\\FlatLibrary",
  "cases": [
    {
      "name": "flat-single-video",
      "files": ["SDDE-759.mp4"],
      "expectOrganized": true,
      "expectedDirectoryName": "SDDE-759",
      "expectSubtitleMoved": false,
      "expectSkipped": false
    },
    {
      "name": "flat-video-with-subtitle",
      "files": ["MRPA-015.mp4", "MRPA-015.srt"],
      "expectOrganized": true,
      "expectedDirectoryName": "MRPA-015",
      "expectSubtitleMoved": true,
      "expectSkipped": false
    },
    {
      "name": "organize-failed-should-skip",
      "files": ["LOCK-001.mp4"],
      "expectOrganized": false,
      "expectSkipped": true
    }
  ]
}
```

字段说明：
- `enabled`
  - 是否启用
- `cleanOutputBeforeRun`
  - 是否清理旧输出
- `testRoot`
  - 扫描链测试输出目录
- `flatLibraryRoot`
  - 平铺库测试样本目录
- `cases`
  - 场景列表

## 推荐测试类

### MetaTube 集成测试

建议新增：
- `MetaTubeIntegrationTests.cs`
- `MetaTubeTestConfig.cs`

建议测试方法：
- `CanWarmupMetaTubeServer`
- `CanSearchMovieByVid`
- `CanFetchMovieDetailAndConvert`
- `CanFetchActorAvatarWhenAvailable`
- `CanWriteTestOutputFiles`

### 扫描链测试

建议新增：
- `LibraryOrganizeTests.cs`
- `ScanImportIntegrationTests.cs`

建议测试方法：
- `CanOrganizeFlatVideoIntoDedicatedDirectory`
- `CanMoveSiblingSubtitleTogether`
- `SkipsMovieWhenOrganizationFails`
- `ScanTaskUsesOrganizedPathAfterMove`

### 纯单元测试

建议新增：
- `SidecarPathResolverTests.cs`
- `ActorAvatarPathResolverTests.cs`
- `MetaTubeCacheTests.cs`
- `ScrapeResultMappingTests.cs`
- `LibraryOrganizerRuleTests.cs`

## 执行步骤

### 快速验证执行步骤

1. 编译测试工程
2. 运行纯单元测试：
   - `SidecarPathResolverTests`
   - `ActorAvatarPathResolverTests`
   - `MetaTubeCacheTests`
   - `LibraryOrganizerRuleTests`
3. 检查：
   - sidecar 路径
   - actor-avatar 路径
   - cache 命中逻辑
   - 自动整理规则
4. 如果失败，先修纯逻辑，再进入网络测试

成功标准：
- 不依赖网络
- 1 分钟内跑完
- 纯逻辑不回归

### 网络验证执行步骤

1. 检查 `meta-tube-test-config.json`
2. 清理旧测试输出目录
3. 运行：
   - `CanWarmupMetaTubeServer`
   - `CanSearchMovieByVid`
   - `CanFetchMovieDetailAndConvert`
   - `CanFetchActorAvatarWhenAvailable`
   - `CanWriteTestOutputFiles`
4. 检查测试输出目录和日志

成功标准：
- 根地址和 providers 可达
- 电影搜索成功
- 详情成功
- 至少一个演员头像成功
- 测试输出完整

### 扫描链验证执行步骤

1. 检查 `scan-test-config.json`
2. 准备平铺测试目录样本
3. 运行：
   - `LibraryOrganizeTests`
   - `ScanImportIntegrationTests`
4. 检查：
   - 是否创建独立目录
   - 视频是否移动
   - 字幕是否移动
   - 整理失败是否跳过
   - 整理成功后是否继续导入

成功标准：
- 平铺目录整理正常
- 跳过策略符合预期
- 路径更新正确

## 断言策略

### 强断言
- 根地址可达
- providers 可达
- 电影搜索有结果
- 详情可返回
- 输出目录可写
- sidecar 文件存在

### 弱断言
- 每个演员都必须有头像（不建议做强断言）
- 每张预览图都必须下载成功（不建议做强断言）

推荐头像断言：
- 至少一个演员头像成功

## 推荐执行顺序

1. 快速验证
2. 网络验证
3. 扫描链验证

只有快速验证通过后，再跑网络验证。

## 当前已跑通的 18 个测试项目

### 快速验证

1. `BasicImport`
   - 验证 `ScanTask` 基础导入结果对象可生成
2. `SubSectionImport`
   - 验证分段影片扫描场景可正常完成
3. `MetaTubeCacheCanSaveAndReadVideo`
   - 验证 `cache/video/<VID>.json` 的保存与读取
4. `ScrapeResultCanBeMappedToDictionary`
   - 验证 `ScrapeResult -> Dictionary<string, object>` 映射
5. `OrganizerShouldFallbackToFileNameWhenVidMissing`
   - 验证 `VID` 缺失时目录整理器回退到文件主名
6. `ActorAvatarPathShouldPreferActorId`
   - 验证正式演员头像路径优先使用 `actorId`
7. `SidecarPathShouldUseVidPrefix`
   - 验证正式 sidecar 使用 `VID` 前缀命名
8. `LoggerShouldResetDailyLogOnStartup`
   - 验证程序启动时会覆盖当日日志文件

### 扫描链验证

9. `CanOrganizeFlatVideoIntoDedicatedDirectory`
   - 验证平铺影片能自动整理到独立目录
10. `CanMoveSiblingSubtitleTogether`
   - 验证同名字幕会跟随影片一起移动
11. `SkipsMovieWhenOrganizationFails`
   - 验证整理失败的影片会被跳过
12. `ScanTaskUsesOrganizedPathAfterMove`
   - 验证整理成功后 `Video.Path` 会更新为新路径
13. `FailedOrganizationMovieIsMarkedAsNotImport`
   - 验证整理失败影片会进入 `ScanResult.NotImport`

### 网络验证

14. `CanWarmupMetaTubeServer`
   - 验证根地址与 `/v1/providers` 预热成功
15. `CanSearchMovieByVid`
   - 验证根据 `VID` 执行 MetaTube 电影搜索成功
16. `CanFetchMovieDetailAndConvert`
   - 验证电影详情获取并转换为 `ScrapeResult`
17. `CanFetchActorAvatarWhenAvailable`
   - 验证演员搜索、actor detail 与头像获取链路
18. `CanWriteTestOutputFiles`
   - 验证测试输出目录中生成 `meta.json / nfo / 图片` 文件

## 建议维护规则

- 每次新增测试后，同步更新本节的测试清单
- 如果测试名称、断言范围或分类发生变化，也同步更新本节
- 当某个测试被废弃或替换时，明确记录替代测试项
