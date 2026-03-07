# 变更日志

本文档记录 `D:\study\Proj\Jvedio` 这份本地仓库的维护变更。
后续每次代码或文档改动，继续在提交和推送前补充这里。

## [未发布]

### 已变更
- 将仓库收敛为仅维护 `Jvedio-WPF`，移除了 `Jvedio-Vue`、`Jvedio-Android`、`Jvedio-Linux`。
- 更新 `README.md`、`README_EN.md`、`README_JP.md`，明确仓库当前只维护 `Jvedio-WPF`。
- 将原开发者 Wiki 重写为 `Jvedio-WPF/Document/Wiki/5.0/developer.md`，补充面向当前 WPF 架构的模块说明、维护路径与调试建议。
- 删除 `Jvedio-WPF/Document/Wiki/4.6`、`Jvedio-WPF/Document/皮肤插件示例` 和遗留 `Jvedio-WPF/Document/Document.md` 等过时文档。
- 将维护中的文档统一收敛到 `doc/`，把开发文档迁移到 `doc/developer.md`，把变更日志迁移到 `doc/CHANGELOG.md`，并删除其余旧用户文档和历史 Wiki。
- 联机调研后安装 `Mermaid CLI (mmdc)`，用于在开发文档中生成结构图和流程图。
- 将 `doc/developer.md` 精简为总览索引，并新增 `doc/modules/` 模块文档与 `doc/assets/diagrams/` 图示资源。
- 将维护中的开发文档统一改为中文，新增 `doc/modules/07-database-schema.md` 与 `doc/modules/08-entity-relations.md`。
- 修复 `Jvedio-WPF/Jvedio/WindowStartUp.xaml.cs` 的空判断问题、`Jvedio-WPF/Jvedio/Windows/Window_Details.xaml.cs` 的刷新比较问题、`Jvedio-WPF/Jvedio/Windows/Window_DataBase.xaml.cs` 的扫描路径清理逻辑，以及 `Jvedio-WPF/Jvedio/Core/Media/ImageCache.cs` 的缓存清理行为。
- 优化 `03-main-ui`：为 `VieModel_VideoList` 增加页级关联数据预加载，减少列表渲染阶段的逐条关联查询；修复 `Genre` 搜索候选词未应用当前库和过滤条件的问题。
- 优化 `04-scan-import`：为扫描导入建立 `VID`、`Hash`、路径和现存文件索引，减少重复遍历与重复 `File.Exists`，并复用索引优化 NFO 导入判定。
- 优化 `05-sync-plugin`：爬虫插件加载时优先选择与插件目录名或元数据 JSON 匹配的 DLL，降低误加载依赖 DLL 的风险，并补强缺失插件目录时的初始化处理。
- 优化 `06-media-maintenance`：移除缓存清理中的强制 GC，去掉数据库清理任务中的固定等待，并补齐截图任务在找不到视频记录时的结束路径。
- 优化 `01-bootstrap-startup`：补强启动页在 VM 尚未准备好时的退出保护，移除启动阶段重复的服务器配置读取，并简化插件搬运、删除和备份路径中的无意义短延迟。
- 优化 `02-config-persistence`：增强 `EnsurePicPaths()` 的兼容处理，在 `PicPathJson` 缺失、损坏或字段不完整时自动回退并补齐默认配置。
- 优化 `07-database-schema`：为 `metadata (DBId,DataType,ViewCount)` 增加索引，并同时加入建表 SQL 与增量 SQL，改善按播放次数排序时的数据库支撑能力。
- 优化 `08-entity-relations`：收紧 `Video.Equals()` 的比较规则，仅在有效 `DataID` / `MVID` 存在时判等，避免未落库实体因默认值相同而被误判相等。
- 补齐剩余未完全独立的文档模块，新增：`doc/modules/09-dialogs.md`、`doc/modules/10-utils-extern.md`、`doc/modules/11-style-theme.md`、`doc/modules/12-avalonedit.md`。
- 优化 `09-dialogs`：修复 `Jvedio-WPF/Jvedio/WindowsDialog/Dialog_LoadPage.xaml.cs` 在网站列表为空时的空引用风险，并统一站点列表的增删与去空白处理。
- 优化 `10-utils-extern`：为 `Jvedio-WPF/Jvedio/Utils/Extern/JvedioLib.cs` 补齐 DLL、类型和方法缺失时的空保护，并修正 `Jvedio-WPF/Jvedio/Utils/Common/Converter.cs` 中的布尔空判断写法。
- 优化 `11-style-theme`：将 `Jvedio-WPF/Jvedio/CustomStyle/StyleManager.cs` 中的高亮资源访问改为延迟读取，避免静态初始化阶段在资源未就绪时直接取主题资源导致异常。
- 优化 `12-avalonedit`：为 `Jvedio-WPF/Jvedio/AvalonEdit/AvalonEditManager.cs` 补齐高亮目录为空时的保护，并在 `Jvedio-WPF/Jvedio/AvalonEdit/Utils.cs` 中为焦点边框资源缺失提供透明回退。
- 修复搜索历史增量 SQL 的表名错误，将 `common_search_history` 更正为当前实际使用的 `common_search_histories`，避免新环境启动时记录 SQL 逻辑错误。
- 优化启动插件迁移流程：当 `plugins/temp` 不存在时直接跳过，不再把正常的“无待迁移插件”场景记录为错误。
- 优化本地服务状态探测：为 `localhost:9527` 的状态检查增加端口预检，未启动本地服务时不再先触发一次失败请求日志。
- 精简初始选择库页面，移除 `WindowStartUp.xaml` 左下角的设置按钮入口。
- 继续精简初始选择库页面，移除 `WindowStartUp.xaml` 顶部搜索框以及 `WindowStartUp.xaml.cs`、`VieModel_StartUp.cs` 中对应的搜索筛选逻辑。
- 将程序集版本从 `5.4` 提升为 `6`，当前 `App.GetLocalVersion()` 返回值将显示为 `6`。
- 开始收敛设置页 UI：移除插件 Tab 的页面显示，仅保留现有插件功能代码与接口；同时删除若干废弃或低价值的隐藏设置项，并精简部分显示类开关。
- 继续收敛设置页：隐藏重命名页和视频处理页，删除青少年模式入口并在运行期强制关闭；显示页选项统一回归默认开启。
- 同步收敛相关功能入口：移除主界面列表中的重命名、生成截图、生成 GIF、批量生成截图入口，并隐藏详情页的截图视图切换和截图/GIF 菜单项。
- 进一步简化网络设置：移除“标题为空才同步信息”开关，保留“强制覆盖信息”作为更直接的同步覆盖入口。
- 继续压缩扫描导入设置：隐藏 NFO 细项设置和 NFO 规则映射区，不再允许用户配置 `id` 字段，相关 NFO 导入默认值改由代码统一控制。
- 隐藏显示页签，显示类功能开关继续统一保持默认开启。
- 继续清理设置页失效逻辑：删除 `Window_Settings.xaml` 中已隐藏的显示页、视频处理页、重命名页，并同步移除 `Window_Settings.xaml.cs` 中对应的初始化、保存和重置逻辑。
- 新增 `doc/metatube-only-plan.md`，固化 MetaTube 唯一搜刮源的实施步骤、阶段目标、每日执行规则、测试搜刮框与日志输出要求，后续严格按该计划推进。
- 完成 MetaTube 计划阶段 1：新增 `MetaTubeConfig`，并在 `PathManager` 中建立 `metatube/cache/video`、`metatube/cache/actor`、`metatube/avatar`、`metatube/test`、`metatube/log` 等固定目录，为后续唯一搜刮源改造打基础。
- 完成 MetaTube 计划阶段 2：新增内置搜刮抽象层 `IScraperProvider`、`ScraperProviderManager` 及统一 `Scrape*` 模型，并注册 `MetaTubeScraperProvider` 骨架作为当前唯一 provider。
- 完成 MetaTube 计划阶段 3：新增 `MetaTubeClient`、`MetaTubeCache`、`MetaTubeConverter` 和 MetaTube 响应模型，当前 provider 已支持番号搜索、影片详情拉取、演员头像检索和永久 JSON 缓存。
- 完成 MetaTube 计划阶段 4：`VideoDownLoader` 已改为通过 `ScraperProviderManager` 使用当前唯一内置 provider，并将 `ScrapeResult` 转换为兼容现有 `DownLoadTask` 的字典结构，正式切出旧插件搜刮主链。

## [2026-03-07]

### 已变更
- 修复 `Jvedio-WPF/Jvedio/Jvedio.csproj` 的预构建步骤，使本地 WPF 构建不再依赖私有 `D:\SuperStudio\...` 路径。
- 在复制前补齐输出目录创建逻辑，恢复本地干净环境下的构建能力。
- 将 `Jvedio-WPF` 与 `Jvedio.Test` 统一为 `x86`，关闭过时的 ClickOnce 清单生成，并修正仓库内 DLL 引用路径。
- 更新 `Jvedio-WPF/Jvedio/Upgrade/Jvedio4ToJvedio5.cs`，显式丢弃 fire-and-forget 任务返回值，清理剩余异步警告。
- 验证 `Jvedio-WPF/Jvedio.sln` 的 `Debug` 构建可在本地达到 `0 warning / 0 error`。
