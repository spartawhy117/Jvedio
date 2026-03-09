# MetaTube 唯一搜刮源实施计划

## 目标

- 当前唯一搜刮源改为 `MetaTube`
- 后续扩展改为“内置 scraper provider”模式，不再依赖旧 DLL 爬虫插件
- 影片元数据、海报、缩略图、背景图、NFO 写入影片目录
- JSON 缓存、演员头像、调试输出缓存写入软件 `data` 目录
- JSON 缓存永久保存，仅支持手动刷新覆盖
- 设置页新增 `MetaTube` 页签
- 图片/NFO 目录不再开放给用户设置，只保留说明
- `MetaTube` 页签中新增调试框，可输入番号执行单片测试搜刮，并输出日志，方便定位问题

## 已确认设计

- 唯一搜刮源：`MetaTube`
- 扩展方式：保留内置 provider 抽象，后续可继续接其他第三方源
- sidecar 命名：
  - `movie.nfo`
  - `poster.jpg`
  - `thumb.jpg`
  - `fanart.jpg`
- 演员头像命名：优先 `actorId`
- 第一版仅支持“无认证 + HTTP JSON API”的 MetaTube 服务
- 手动刷新时全部覆盖：
  - JSON 缓存
  - 影片 sidecar
  - 图片
  - 演员头像
  - 本地数据库
- 测试搜刮输出目录采用推荐方案：
  - `data/<user>/log/test/<番号>/`

## 状态说明

- `[ ]` 未开始
- `[~]` 进行中
- `[x]` 已完成
- `[!]` 阻塞

## 阶段 1：配置与路径基建

状态：`[x]`

目标：
- 为 MetaTube 增加独立配置
- 为全局缓存新增固定 data 路径
- 不再依赖旧插件服务源配置作为主搜刮配置

改动点：
- `Jvedio-WPF/Jvedio/Core/Config/ConfigManager.cs`
- `Jvedio-WPF/Jvedio/Core/Config/PathManager.cs`
- 新增 `Jvedio-WPF/Jvedio/Core/Config/Common/MetaTubeConfig.cs`

计划内容：
- 新增 `MetaTubeConfig`
- 字段至少包括：
  - `Enabled`
  - `ServerUrl`
  - `ManualRefreshOnly`
  - `JsonCacheEnabled`
  - `ActorAvatarCacheEnabled`
- 在 `PathManager` 新增目录：
  - `data/<user>/metatube/cache/video/`
  - `data/<user>/metatube/cache/actor/`
  - `data/<user>/metatube/avatar/`
  - `data/<user>/log/test/`
- 启动时自动创建上述目录

验证点：
- Debug/Release 均可编译
- 首次启动可自动创建 MetaTube 目录

## 阶段 2：建立内置搜刮抽象层

状态：`[x]`

目标：
- 从旧插件搜刮模型切到内置 provider 模型
- 当前只注册 MetaTube，但为后续保留扩展口

新增文件：
- `Jvedio-WPF/Jvedio/Core/Scraper/IScraperProvider.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/ScraperProviderManager.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/Models/ScrapeRequest.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/Models/ScrapeResult.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/Models/ScrapedActor.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/Models/ScrapedImages.cs`

计划内容：
- 抽象统一搜刮接口
- 当前仅实现 `MetaTubeScraperProvider`
- 后续其他源可按 provider 追加

验证点：
- provider manager 可正常返回当前唯一 provider
- 不影响现有项目编译

## 阶段 3：MetaTube 客户端、缓存与格式适配

状态：`[x]`

目标：
- 从 MetaTube 服务端拉取数据
- 缓存 JSON
- 将返回结构转换为 Jvedio 当前可消费的数据结构

新增文件：
- `Jvedio-WPF/Jvedio/Core/Scraper/MetaTube/MetaTubeClient.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/MetaTube/MetaTubeCache.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/MetaTube/MetaTubeConverter.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/MetaTube/MetaTubeModels/*.cs`
- `Jvedio-WPF/Jvedio/Core/Scraper/MetaTube/MetaTubeScraperProvider.cs`

计划内容：
- 请求 MetaTube 服务端
- 默认优先读取 JSON 缓存
- 无缓存时远程拉取
- 手动刷新时强制远程拉取并覆盖缓存
- 输出统一 `ScrapeResult`
- 将 MetaTube 字段映射为 Jvedio 现有字段

建议首批映射字段：
- `VID`
- `Title`
- `Plot`
- `ReleaseDate`
- `Studio`
- `Director`
- `Duration`
- `Rating`
- `Genres`
- `Tags`
- `Actors`
- `PosterUrl`
- `ThumbUrl`
- `FanartUrl`
- `PreviewImages`

验证点：
- 指定番号可返回结构化结果
- JSON 缓存可读写
- 缓存命中与手动刷新逻辑正常

## 阶段 4：同步主链接入

状态：`[x]`

目标：
- 让 MetaTube 成为当前唯一搜刮源
- 复用现有下载、图片保存、数据库写入主链

主要改动：
- `Jvedio-WPF/Jvedio/Core/Net/VideoDownLoader.cs`
- `Jvedio-WPF/Jvedio/Core/Net/DownLoadTask.cs`

计划内容：
- `VideoDownLoader` 改为通过 `ScraperProviderManager` 获取数据
- 当前不再以旧插件爬虫为主入口
- `DownLoadTask` 消费 `ScrapeResult`
- 保留当前数据库保存、图片保存的大部分逻辑

验证点：
- 单片同步成功
- 数据能进入当前数据库
- 不再依赖旧 crawler plugin 才能同步成功

## 阶段 5：影片 sidecar 与演员头像落盘

状态：`[x]`

目标：
- 影片 sidecar 固定写入影片目录
- 演员头像和全局缓存固定写入软件 data 目录

新增文件：
- `Jvedio-WPF/Jvedio/Core/Media/SidecarPathResolver.cs`
- `Jvedio-WPF/Jvedio/Core/Media/ActorAvatarPathResolver.cs`
- `Jvedio-WPF/Jvedio/Core/Nfo/VideoNfoWriter.cs`

主要改动：
- `Jvedio-WPF/Jvedio/Entity/Data/Video.cs`
- `Jvedio-WPF/Jvedio/Entity/Common/NFO.cs`
- `Jvedio-WPF/Jvedio/Entity/Common/ActorInfo.cs`
- `Jvedio-WPF/Jvedio/Core/Net/DownLoadTask.cs`

计划内容：
- 影片目录 sidecar 固定输出：
  - `movie.nfo`
  - `poster.jpg`
  - `thumb.jpg`
  - `fanart.jpg`
- 演员头像输出到：
  - `data/<user>/metatube/avatar/<actorId>.jpg`
- 若无 actorId，回退为演员名标准化 + 哈希

验证点：
- 影片目录 sidecar 文件完整
- 演员头像进入 data 目录
- 重复同步不会产生混乱路径

## 阶段 6：设置页新增 MetaTube 页签

状态：`[x]`

目标：
- 提供最小配置和调试入口
- 不再开放图片/NFO 路径给用户选择

改动文件：
- `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml`
- `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml.cs`
- `Jvedio-WPF/Jvedio/ViewModels/VieModel_Settings.cs`

UI 内容：
- `MetaTube 服务端 URL`
- `测试连接`
- `测试搜刮番号输入框`
- `搜刮测试按钮`
- `日志输出区域`
- `手动刷新当前影片缓存`
- `清理 MetaTube 缓存`
- 说明文案：
  - 影片信息、海报、NFO 保存在影片目录
  - 演员头像和 JSON 缓存在软件 data 目录
  - 缓存永久保存，仅手动刷新覆盖

同时处理：
- 原图片目录/NFO路径设置改为说明

验证点：
- 设置页可配置 URL
- 测试搜刮可执行
- 日志输出清晰
- 不再出现旧图片路径设置误导

## 阶段 7：测试搜刮模式

状态：`[x]`

目标：
- 支持在设置页输入番号测试 MetaTube 搜刮
- 便于快速验证服务、缓存、sidecar 和日志

计划内容：
- 输入一个番号
- 调用 MetaTube provider
- 将结果写入测试输出目录或对应目标目录
- 在 UI 显示：
  - 请求 URL
  - 缓存命中/未命中
  - 拉取到的关键字段
  - sidecar 写入路径
  - 演员头像写入路径
  - 错误堆栈/失败原因

建议日志路径：
- 直接并入主日志：`data/<user>/log/<yyyy-MM-dd>.log`
- 同时界面内显示最近一次测试日志摘要

验证点：
- 任意番号可单独测试
- 日志可用于排错
- 测试不影响主流程稳定性

## 阶段 8：旧插件搜刮链降级

状态：`[x]`

目标：
- 旧插件搜刮代码不再参与当前主链
- 暂保留兼容，后续逐步清理

涉及文件：
- `Jvedio-WPF/Jvedio/Core/Plugins/Crawler/CrawlerManager.cs`
- `Jvedio-WPF/Jvedio/Core/Config/Common/ServerConfig.cs`
- `Jvedio-WPF/Jvedio/ViewModels/VieModel_Settings.cs`
- `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml.cs`

计划内容：
- UI 不再暴露旧插件搜刮配置
- 运行期同步逻辑只走 `MetaTube`
- 旧代码先保留编译兼容
- 后续再决定是否彻底删除

验证点：
- 旧插件配置不存在也不影响同步
- 仅 MetaTube 可完成同步主流程

## 阶段 9：手动刷新与覆盖更新

状态：`[x]`

目标：
- 满足“永久缓存 + 手动刷新全部覆盖”

计划内容：
- 在详情页增加：
  - `从 MetaTube 刷新当前影片`
- 刷新时覆盖：
  - JSON 缓存
  - sidecar NFO
  - 海报 / 缩略图 / 背景图
  - 演员头像
  - 数据库内容

验证点：
- 手动刷新确实覆盖旧数据
- 默认同步仍优先读取缓存

## 阶段 10：文档、日志、测试补齐

状态：`[x]`

目标：
- 保证后续可持续维护和多日分段推进

需要更新：
- `doc/modules/02-config-persistence.md`
- `doc/modules/05-sync-plugin.md`
- `doc/modules/06-media-maintenance.md`
- `doc/developer.md`
- `doc/CHANGELOG.md`

建议新增测试：
- provider 解析测试
- JSON 缓存读写测试
- sidecar 路径规则测试
- actorId 头像命名测试
- 手动刷新覆盖测试

## 提交建议

- 提交 1：配置与路径基建
- 提交 2：MetaTube client / cache / model
- 提交 3：搜刮主链接入
- 提交 4：sidecar / actor avatar 落盘
- 提交 5：设置页 `MetaTube` UI + 测试搜刮框 + 日志输出
- 提交 6：旧插件降级 + 文档补齐

## 每日执行规则

- 每天只推进 plan 中明确的一小步
- 完成后立即更新本文件的状态标记
- 同步更新相关模块文档的“当前性能 / Bug 问题”
- 同步更新 `doc/CHANGELOG.md`
- 编译验证通过后再提交推送

## 当前进度

- [x] 方案确认完成
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
- [~] 阶段 11：data 目录收敛与旧目录清理

## 阶段 11：data 目录收敛与旧目录清理

状态：`[~]`

目标：
- 将 `data/<user>/` 收敛为配置数据库、业务数据库、主日志、测试输出、正式缓存几个核心区域
- 删除 `backup`、`olddata`、`image`、`metatube`，并最终清理 `pic`

目标结构：
- `app_configs.sqlite`
- `app_datas.sqlite`
- `log/<yyyy-MM-dd>.log`
- `log/test/<VID>/`
- `cache/video/<VID>.json`
- `cache/actor-avatar/<actorId>.jpg`

正式运行：
- 影片目录：
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`
- `data` 目录：
  - `cache/video/`
  - `cache/actor-avatar/`

测试运行：
- `log/test/<VID>/`
  - `meta.json`
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`
  - `actor-*.jpg`

计划删除：
- `backup/`
- `olddata/`
- `image/`
- `metatube/`
- `pic/`（最后处理）

执行顺序：
1. 删除备份功能和 `backup/` `[x]`
2. 删除 `olddata/`
3. 将 `metatube/cache/video` 和 `metatube/avatar` 迁移到 `cache/`
4. 清理 `image/`
5. 完成 `pic/` 依赖替换后删除 `pic/`

前置条件：
- `Video.GetBigImage()` / `GetSmallImage()` 已完全切到新规则
- 演员头像读取不再依赖 `pic/`
- 设置页旧图片路径逻辑已移除
- 详情页、列表页、编辑页不再使用旧图片目录

## 阶段 11 执行记录

- 已确认目录收敛目标：
  - 保留 `log/` 和 `cache/`
  - 删除 `backup/`、`olddata/`、`image/`、`metatube/`
  - `pic/` 作为最后一批清理目标
- 已完成步骤 1：删除备份功能和 `backup/` 目录用法

## 阶段 10 执行记录

- 已补充并持续更新以下文档：
  - `doc/modules/02-config-persistence.md`
  - `doc/modules/05-sync-plugin.md`
  - `doc/modules/06-media-maintenance.md`
  - `doc/CHANGELOG.md`
- 已将 MetaTube 测试日志并入主日志流，并统一测试输出到 `data/<user>/log/test/<番号>/`
- 已增加更细的超时、请求 URL、响应码、缓存命中、详情获取等诊断日志
- 已将连接测试拆分为根地址与 providers 接口诊断，降低“服务可达但搜刮超时”时的误判

## 阶段 6 执行记录

- 已在 `Window_Settings` 中新增 `MetaTube` 页签
- 已新增配置项：
  - 服务端 URL
  - 启用开关
  - 测试番号输入
  - 日志输出区域
- 已将影片 sidecar / 演员头像 / 日志目录策略以说明文本方式写入设置页
- 已隐藏图片/NFO 的自由路径设置入口，避免与固定 sidecar/data 规则冲突

## 阶段 7 执行记录

- 已新增设置页中的 `测试连接` 按钮
- 已新增 `搜刮测试` 按钮
- 已新增 `MetaTubeOutputWriter`
- 测试搜刮会将结果写入：
  - `data/<user>/log/test/<番号>/meta.json`
  - `movie.nfo`
  - `poster.jpg`
  - `thumb.jpg`
  - `fanart.jpg`
- 演员头像同时写入同一个 `test/<番号>/` 目录
- 已新增界面日志输出，并已并入主日志流

## 阶段 8 执行记录

- 旧插件搜刮链已经退出运行主链
- `VideoDownLoader` 当前仅通过 `ScraperProviderManager` 使用当前唯一内置 provider
- 设置页中的旧插件搜刮配置仍保留兼容代码，但不再作为主流程入口

## 阶段 9 执行记录

- 已新增详情页入口：`从 MetaTube 刷新`
- 已新增 `DownLoadTask.RefreshVideo(Video video)`
- 手动刷新会强制忽略 MetaTube 缓存并覆盖当前影片的数据库、图片和 NFO

## 阶段 5 执行记录

- 已新增 `SidecarPathResolver`，统一影片目录 sidecar 路径：
  - `movie.nfo`
  - `poster.jpg`
  - `thumb.jpg`
  - `fanart.jpg`
- 已新增 `ActorAvatarPathResolver`，统一演员头像缓存到 `data/<user>/metatube/avatar/`
- 已新增 `VideoNfoWriter`，封装影片 sidecar NFO 输出
- 已将 `DownLoadTask` 改为：
  - 海报图输出到 `fanart.jpg`
  - 海报/缩略图分别输出到 `poster.jpg` / `thumb.jpg`
  - 演员头像输出到全局 data 缓存目录
- 已将 `Video.SaveNfo()` 切换到 sidecar 规则
- 已将 `Video.GetBigImage()` / `GetSmallImage()` 切换为优先返回影片目录下的 sidecar 图片
- 已验证 `Release` 编译通过

## 阶段 4 执行记录

- 已将 `VideoDownLoader.GetInfo()` 从旧插件服务器源调度切换为通过 `ScraperProviderManager` 获取当前唯一内置 provider
- 已将 `ScrapeResult` 转换为现有下载链可消费的 `Dictionary<string, object>`，保持 `DownLoadTask` 主流程暂时不大改
- 已兼容现有关键字段：
  - `Title`
  - `Plot`
  - `ReleaseDate`
  - `Studio`
  - `Director`
  - `Duration`
  - `Rating`
  - `Genre`
  - `Series`
  - `Label`
  - `ActorNames`
  - `ActressImageUrl`
  - `BigImageUrl`
  - `SmallImageUrl`
  - `ExtraImageUrl`
  - `WebType`
  - `DataCode`
  - `WebUrl`
- 已保留 `PluginID` 兼容字段，避免下游现有日志与流程立即失效
- 已验证 `Release` 编译通过

## 阶段 3 执行记录

- 已新增 `MetaTubeClient`，按 Jellyfin/MetaTube API 风格封装 `/v1/movies/search`、`/v1/movies/{provider}/{id}`、`/v1/actors/search` 请求
- 已新增 `MetaTubeApiModels`，定义 MetaTube 的响应包装和电影/演员 DTO
- 已新增 `MetaTubeCache`，实现以 `VID` 为键的永久 JSON 缓存
- 已新增 `MetaTubeConverter`，将 MetaTube 电影与演员结果转换为统一 `ScrapeResult`
- 已补全 `MetaTubeScraperProvider`：
  - 支持缓存命中/未命中
  - 支持根据番号搜索影片
  - 支持补充演员头像搜索结果
  - 支持输出统一 `ScrapeResult`
- 已验证 `Release` 编译通过

## 阶段 2 执行记录

- 已新增内置搜刮抽象接口：`IScraperProvider`
- 已新增内置搜刮器注册入口：`ScraperProviderManager`
- 已新增统一模型：
  - `ScrapeRequest`
  - `ScrapeResult`
  - `ScrapedActor`
  - `ScrapedImages`
- 已新增 `MetaTubeScraperProvider` 骨架，并作为当前唯一内置 provider 注册
- 已将以上新文件纳入 `Jvedio.csproj`
- 已验证 `Release` 编译通过

## 阶段 1 执行记录

- 已新增 `Jvedio-WPF/Jvedio/Core/Config/Common/MetaTubeConfig.cs`
- 已在 `ConfigManager` 中注册并纳入统一保存链
- 已在 `PathManager` 中新增 MetaTube 固定目录：
  - `data/<user>/metatube/cache/video/`
  - `data/<user>/metatube/cache/actor/`
  - `data/<user>/metatube/avatar/`
  - `data/<user>/log/test/`
- 已验证 `Release` 编译通过
