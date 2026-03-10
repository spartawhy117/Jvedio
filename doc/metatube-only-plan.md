# MetaTube 唯一搜刮源实施计划

## 当前目标

- 当前唯一搜刮源为 `MetaTube`
- 后续扩展采用“内置 scraper provider”模式，不再依赖旧 DLL 爬虫插件
- 正式 sidecar 写入影片目录
- 正式缓存统一写入 `data/<user>/cache/`
- 测试输出统一写入 `data/<user>/log/test/<VID>/`
- 每次启动程序会覆盖当日日志文件

## 当前实现结论

### 正式运行

- 影片目录 sidecar：
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`
- 正式缓存目录：
  - `data/<user>/cache/video/<VID>.json`
  - `data/<user>/cache/actor-avatar/<actorId>.jpg`

### 测试运行

- 主日志：
  - `data/<user>/log/<yyyy-MM-dd>.log`
- 测试输出目录：
  - `data/<user>/log/test/<VID>/`
- 测试目录内：
  - `meta.json`
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`
  - `actor-*.jpg`

## 已确认设计

- 唯一搜刮源：`MetaTube`
- 扩展方式：保留内置 provider 抽象，后续可继续接其他第三方源
- 演员头像命名：优先 `actorId`，缺失时回退为演员名哈希
- 第一版服务协议：无认证 HTTP JSON API
- 搜刮前默认预热：
  - `/`
  - `/v1/providers`
- 手动刷新时全部覆盖：
  - JSON 缓存
  - 影片 sidecar
  - 图片
  - 演员头像
  - 本地数据库
- 扫描库与新增库首次扫描时会自动整理平铺影片到独立目录
- 整理失败策略：
  - 跳过当前影片
  - 不继续搜刮
  - 继续后续影片

## 状态说明

- `[ ]` 未开始
- `[~]` 进行中
- `[x]` 已完成
- `[!]` 阻塞

## 当前进度

- [x] 阶段 0：计划文档写入与归档
- [x] 阶段 1：配置与路径基建
- [x] 阶段 2：建立内置搜刮抽象层
- [x] 阶段 3：MetaTube 客户端、缓存与适配
- [x] 阶段 4：同步主链接入
- [x] 阶段 5：sidecar 与演员头像落盘
- [x] 阶段 6：设置页 MetaTube UI
- [x] 阶段 7：测试搜刮模式
- [x] 阶段 8：旧插件搜刮链降级
- [x] 阶段 9：手动刷新与覆盖更新
- [x] 阶段 10：文档、日志、测试补齐
- [x] 阶段 11：data 目录收敛与旧目录清理
- [x] 阶段 12：扫描前自动整理影片目录
- [x] 阶段 13：MetaTube 头像补拉与预热诊断

## 阶段 1：配置与路径基建

状态：`[x]`

已完成：
- 新增 `MetaTubeConfig`
- 接入 `ConfigManager`
- 建立目录：
  - `cache/video/`
  - `cache/actor-avatar/`
  - `log/test/`

关键文件：
- `Core/Config/Common/MetaTubeConfig.cs`
- `Core/Config/ConfigManager.cs`
- `Core/Config/PathManager.cs`

## 阶段 2：建立内置搜刮抽象层

状态：`[x]`

已完成：
- 新增 `IScraperProvider`
- 新增 `ScraperProviderManager`
- 新增统一模型：
  - `ScrapeRequest`
  - `ScrapeResult`
  - `ScrapedActor`
  - `ScrapedImages`
- 当前唯一 provider：`MetaTubeScraperProvider`

关键文件：
- `Core/Scraper/IScraperProvider.cs`
- `Core/Scraper/ScraperProviderManager.cs`
- `Core/Scraper/Models/*`

## 阶段 3：MetaTube 客户端、缓存与适配

状态：`[x]`

已完成：
- 新增 `MetaTubeClient`
- 新增 `MetaTubeCache`
- 新增 `MetaTubeConverter`
- 新增 MetaTube 响应模型
- 默认优先读缓存，手动刷新时强制远程拉取

关键文件：
- `Core/Scraper/MetaTube/MetaTubeClient.cs`
- `Core/Scraper/MetaTube/MetaTubeCache.cs`
- `Core/Scraper/MetaTube/MetaTubeConverter.cs`
- `Core/Scraper/MetaTube/MetaTubeApiModels.cs`

## 阶段 4：同步主链接入

状态：`[x]`

已完成：
- `VideoDownLoader` 改为通过 `ScraperProviderManager` 获取数据
- 旧插件搜刮链退出运行主入口
- `ScrapeResult` 转换为兼容现有 `DownLoadTask` 的 `Dictionary<string, object>`

关键文件：
- `Core/Net/VideoDownLoader.cs`
- `Core/Net/DownLoadTask.cs`

## 阶段 5：sidecar 与演员头像落盘

状态：`[x]`

已完成：
- sidecar 路径统一由解析器管理
- 正式 sidecar 命名统一为 `VID` 前缀
- 正式演员头像缓存统一写到 `cache/actor-avatar/`

关键文件：
- `Core/Media/SidecarPathResolver.cs`
- `Core/Media/ActorAvatarPathResolver.cs`
- `Core/Nfo/VideoNfoWriter.cs`
- `Entity/Data/Video.cs`

## 阶段 6：设置页 MetaTube UI

状态：`[x]`

已完成：
- 设置页新增 `MetaTube` 页签
- 可配置：
  - 服务端 URL
  - 测试连接
  - 测试番号
  - 搜刮测试
  - 清理缓存
- 图片/NFO 路径改为说明型 UI

关键文件：
- `Windows/Window_Settings.xaml`
- `Windows/Window_Settings.xaml.cs`
- `ViewModels/VieModel_Settings.cs`

## 阶段 7：测试搜刮模式

状态：`[x]`

已完成：
- 测试搜刮支持单片番号验证
- 测试输出统一到：
  - `data/<user>/log/test/<VID>/`
- 已支持输出：
  - `meta.json`
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`
  - `actor-*.jpg`

关键文件：
- `Core/Scraper/MetaTube/MetaTubeOutputWriter.cs`
- `Windows/Window_Settings.xaml.cs`

## 阶段 8：旧插件搜刮链降级

状态：`[x]`

已完成：
- 旧插件搜刮代码不再参与主链
- 设置页中旧插件搜刮配置不再作为用户主流程入口

## 阶段 9：手动刷新与覆盖更新

状态：`[x]`

已完成：
- 详情页新增：`从 MetaTube 刷新`
- `DownLoadTask.RefreshVideo(Video video)` 已实现

## 阶段 10：文档、日志、测试补齐

状态：`[x]`

已完成：
- 补齐开发文档
- 补齐测试文档
- MetaTube 测试日志并入主日志流
- 启动时覆盖当日日志

## 阶段 11：data 目录收敛与旧目录清理

状态：`[x]`

已完成：
- 删除：
  - `backup/`
  - `olddata/`
  - `image/`
  - `metatube/`
  - `pic/`
- 正式目录收敛为：
  - `app_configs.sqlite`
  - `app_datas.sqlite`
  - `log/`
  - `cache/`

## 阶段 12：扫描前自动整理影片目录

状态：`[x]`

已完成：
- 扫描库与新增库首次扫描时自动整理平铺影片
- 目录名优先使用 `VID`
- 自动移动：
  - 视频文件
  - 同名字幕文件
- 整理失败即跳过当前影片，不继续搜刮

关键文件：
- `Core/Scan/LibraryOrganizer.cs`
- `Core/Scan/LibraryOrganizeResult.cs`
- `Core/Scan/ScanTask.cs`

## 阶段 13：MetaTube 头像补拉与预热诊断

状态：`[x]`

已完成：
- 增加 `WarmupAsync()`
- 测试搜刮与正式搜刮前都先预热服务
- 增加 `GetActorInfoAsync()` 作为 actor detail 兜底查询
- 修正演员搜索 query 为标准 UTF-8 URL 编码
- 增强日志：
  - 预热结果
  - 电影搜索结果
  - 演员搜索结果数
  - actor detail 结果
  - 图片数量

关键文件：
- `Core/Scraper/MetaTube/MetaTubeClient.cs`
- `Core/Scraper/MetaTube/MetaTubeScraperProvider.cs`

## 当前测试与验证状态

- `Jvedio.Test` Release 测试已通过
- 当前已跑通 18 个测试
- 测试清单详见：`doc/test-strategy.md`

## 后续建议

- 持续使用 `Jvedio.Test` 做：
  - 快速验证
  - 网络验证
  - 扫描链验证
- 后续若继续扩展 provider，只需在当前 provider 抽象层和测试配置中扩展即可
