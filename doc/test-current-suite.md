# 当前测试清单

## 1. 当前状态

当前 `Jvedio.Test` 已实跑通过：
- 总测试数：18
- 通过数：18
- 失败数：0

测试配置目录：
- `Jvedio.Test/config/`

主日志目录：
- `Jvedio.Test/bin/Release/data/<user>/log/`

## 2. 快速验证测试

### `BasicImport`
- 目标：验证 `ScanTask` 基础导入结果对象可生成

### `SubSectionImport`
- 目标：验证分段影片扫描场景可正常完成

### `MetaTubeCacheCanSaveAndReadVideo`
- 目标：验证 `cache/video/<VID>.json` 的保存与读取

### `ScrapeResultCanBeMappedToDictionary`
- 目标：验证 `ScrapeResult -> Dictionary<string, object>` 映射

### `OrganizerShouldFallbackToFileNameWhenVidMissing`
- 目标：验证 `VID` 缺失时目录整理器回退为文件主名

### `ActorAvatarPathShouldPreferActorId`
- 目标：验证正式演员头像路径优先使用 `actorId`

### `SidecarPathShouldUseVidPrefix`
- 目标：验证正式 sidecar 使用 `VID` 前缀命名

### `LoggerShouldResetDailyLogOnStartup`
- 目标：验证程序启动时覆盖当日日志

## 3. 扫描链验证测试

### `CanOrganizeFlatVideoIntoDedicatedDirectory`
- 目标：验证平铺影片能自动整理到独立目录

### `CanMoveSiblingSubtitleTogether`
- 目标：验证同名字幕跟随影片一起移动

### `SkipsMovieWhenOrganizationFails`
- 目标：验证整理失败时影片被跳过

### `ScanTaskUsesOrganizedPathAfterMove`
- 目标：验证整理成功后 `Video.Path` 更新

### `FailedOrganizationMovieIsMarkedAsNotImport`
- 目标：验证整理失败影片进入 `ScanResult.NotImport`

## 4. 网络验证测试

### `CanWarmupMetaTubeServer`
- 目标：验证根地址与 `/v1/providers` 预热成功

### `CanSearchMovieByVid`
- 目标：验证根据 `VID` 搜索电影

### `CanFetchMovieDetailAndConvert`
- 目标：验证电影详情获取并转换为 `ScrapeResult`

### `CanFetchActorAvatarWhenAvailable`
- 目标：验证演员搜索、actor detail 与头像获取链

### `CanWriteTestOutputFiles`
- 目标：验证测试输出目录中生成：
  - `meta.json`
  - `*.nfo`
  - 海报/缩略图/背景图
  - 演员头像文件（如成功）

## 5. 当前脚本入口

### MetaTube
- `config/meta-tube/run-meta-tube-tests.ps1`

### Scan
- `config/scan/run-scan-tests.ps1`

### 全量
- `config/run-all-tests.ps1`

## 6. 当前配置文件

### MetaTube
- `config/meta-tube/meta-tube-test-config.json`

### Scan
- `config/scan/scan-test-config.json`

## 7. 当前输出位置

### MetaTube 输出（测试工程）
- `config/meta-tube/output/`

### Scan 输出（测试工程）
- `config/scan/output/`

### 测试工程主日志
- `bin/Release/data/<user>/log/<yyyy-MM-dd>.log`

### 主程序内置调试输出
- `data/<user>/log/test/<VID>/`

## 8. 当前维护规则

- 新增或删除测试时，更新本文件
- 如果测试目标边界变化，同时更新：
  - `doc/test-targets.md`
- 如果测试工程结构、脚本或配置变化，同时更新：
  - `doc/test-plan.md`
