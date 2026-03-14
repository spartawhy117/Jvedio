# 变更日志

本文档记录 `D:\study\Proj\Jvedio` 这份本地仓库的维护变更。
后续每次代码或文档改动，继续在提交和推送前补充这里。

## [未发布]

### 已变更
- 完成桌面 UI 首批线稿产出：生成 Home、Favorites、Actors、Settings 和导航/图标语义图，并将 `.png` 与 `.excalidraw` 文件统一导出到 `doc/UI/new/`，便于后续直接截图评审和继续微调。
- 更新 `AGENTS.md` 的收尾校验规则：如果本轮仅为文档/纯内容调整，且不涉及 MetaTube 抓取链、扫描导入链、测试脚本或相关实现代码，则允许跳过 `Jvedio.Test` 集成测试，但仍需完成 Release 构建并说明原因。
- 收紧 `doc/UI/desktop-ui-shell-refactor/` 的绘图约束，补齐首页/设置页线稿说明、设置页分组展示规则、主题 token 使用规则，以及首批输出命名与验证要求，降低后续线稿图生成歧义。
- 将 `plan/active/unit-test-refactor/` 迁移归档到 `plan/archive/unit-test-refactor/`，并把该 feature 状态更新为 `completed`，作为单元测试改造完成后的历史记录保留。
- 完成 `doc/metatube-only-plan.md` 的历史归档迁移：将正文快照收敛到 `plan/archive/metatube-only-plan/original.md`，同步更新索引与 legacy 说明，并删除 `doc/` 下的旧计划文档。
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
- 完成 MetaTube 计划阶段 5：新增影片 sidecar 路径解析器、演员头像路径解析器和 `VideoNfoWriter`，并将海报、缩略图、背景图、NFO、演员头像落盘逻辑切换到影片目录 / data 目录的固定规则。
- 完成 MetaTube 计划阶段 6：设置页已新增 `MetaTube` 页签，并将服务端 URL、测试番号、连接测试、搜刮测试和日志输出集中到该页签中，同时把旧图片/NFO 目录设置改为说明型 UI。
- 完成 MetaTube 计划阶段 7：新增测试搜刮模式，可将指定番号的结果写入 `data/<user>/metatube/test/<番号>/`，并输出界面日志和文件日志。
- 完成 MetaTube 计划阶段 8：旧插件搜刮链已彻底退出运行主入口，当前仅保留兼容代码，不再作为用户可见流程。
- 完成 MetaTube 计划阶段 9：详情页已新增手动刷新入口，可强制忽略缓存并覆盖当前影片的数据库、图片和 NFO。
- 优化 MetaTube 调试日志：补充请求 URL、响应码、缓存命中状态、命中影片、演员搜索、缓存写入和完整异常输出，并将超时错误明确显示为 `MetaTube 请求超时（30 秒）`。
- 调整 MetaTube 测试输出策略：测试日志已并入主日志流，测试产生的 `json / nfo / 图片 / 演员头像` 统一写入 `data/<user>/log/test/<番号>/`，不再单独区分测试日志目录和头像目录。
- 优化 MetaTube 连接诊断：将连接测试拆分为根地址和 providers 接口检查，为请求增加更细的耗时日志，并将默认超时提升到 60 秒，更贴合当前 `hf.space` 服务的响应时间。
- 增强 MetaTube 头像链路：参考 Jellyfin 的处理方式，为演员搜索增加 detail 兜底查询，并在正式搜刮和测试搜刮前统一增加服务预热步骤，同时补充演员搜索结果数、命中详情和头像 URL 相关日志。
- 修正 MetaTube 演员搜索 query 编码为标准 UTF-8 URL 编码，并进一步增强预热成功日志、演员命中日志和演员详情失败日志，避免日文演员名搜索误返回 404。
- 新增 `doc/test-refactor-plan.md` 与 `doc/test-strategy.md`，细化 `Jvedio.Test` 的重构方案、JSON 配置驱动的 MetaTube/扫描链测试结构，以及快速验证、网络验证、扫描链验证的详细执行步骤。
- 开始执行 data 目录收敛阶段：移除自动备份功能、删除设置页中的备份选项，并停止创建和清理 `backup/` 目录。
- 完成 data 目录收敛阶段步骤 2：移除 `olddata/` 目录用法，并将旧版本迁移后的历史文件改为直接清理，不再保留到 `data/<user>/olddata/`。
- 完成 data 目录收敛阶段步骤 3：将 MetaTube 正式缓存迁移到通用 `cache/` 目录，影片 JSON 使用 `cache/video/`，演员头像使用 `cache/actor-avatar/`，旧 `metatube/` 目录不再继续使用。
- 完成 data 目录收敛阶段步骤 4：移除 `image/` 目录用法，将库封面缓存统一迁移到 `cache/library-image/`，旧 `image/library` 目录不再继续使用。
- 完成 data 目录收敛阶段步骤 5：停止创建和使用 `pic/` 目录，旧图片路径设置退化为说明文本，正式图片、预览图、截图、GIF 和演员头像读取统一切到影片目录与 `cache/` 结构。
- 完成 data 目录收敛阶段收尾：默认配置中的自动备份已关闭，并完成 `Release/data/<user>/` 目录实测清理，当前仅保留数据库、主日志和统一 cache 结构。
- 新增扫描前自动目录整理：扫描库与新增库首次扫描时，会自动将平铺影片整理到独立目录后再继续导入；整理失败的影片会直接跳过，不再继续执行搜刮。
- 开始执行测试工程改造阶段 1：将旧的 UI 测试壳和旧 crawler 空壳测试从 `Jvedio.Test` 编译清单中移除，先收敛测试入口，为后续 MetaTube 与扫描链测试重写做准备。
- 完成测试工程改造阶段 2~5：新增 JSON 配置驱动的 MetaTube 集成测试、扫描链测试、核心单元测试骨架，并为日志增加“启动覆盖旧内容”的重置逻辑及对应测试。
- `Jvedio.Test` 的 Release 测试已实跑通过，当前 18 个测试全部通过，说明 MetaTube 集成测试、扫描链测试、单元测试和日志覆盖测试已经从“骨架”进入可运行状态。
- 在 `doc/test-strategy.md` 中补充当前已跑通的 18 个测试项目清单，明确每个测试的验证目标与所属分类，方便后续持续维护测试体系。
- 将 `Jvedio.Test` 的测试配置文件统一收敛到 `Jvedio.Test/config/`，后续新增测试配置统一放在该目录中，便于持续维护和执行。
- 继续细化测试配置目录：将 MetaTube 与扫描链配置进一步拆到 `config/meta-tube/` 和 `config/scan/` 子目录下，并新增可双击执行的 PowerShell 脚本，测试输出统一落在对应 `output/` 子目录中，主日志仍保留在 `bin/Release/data/<user>/log/`。
- 修复测试脚本与配置细节：调整 PowerShell 脚本的工程相对路径和 `-NoPause` 支持，修正扫描链配置样本，并验证 MetaTube 脚本与扫描链脚本均可直接执行通过。
- 调整测试输出根目录：MetaTube 与扫描链测试现在直接把业务输出写入各自 `config/<suite>/output/` 根目录，避免用户进入 `output/` 后看不到实际结果文件。
- 新增仓库根目录 `AGENTS.md`，收敛当前主程序、测试、sidecar、cache、日志与文档更新的高频规则，作为后续 agent 进入仓库时的统一入口说明。
- 清洗 `doc/metatube-only-plan.md` 中的历史阶段描述，使其与当前已经完成的 sidecar 命名、cache 目录、测试输出、自动整理和预热诊断实现保持一致。
- 将旧的 `doc/test-refactor-plan.md` 和 `doc/test-strategy.md` 收敛迁移为三份职责更清晰的新文档：`doc/test-targets.md`、`doc/test-plan.md`、`doc/test-current-suite.md`，并同步更新 `developer.md` 与 `AGENTS.md` 的文档索引。
- 继续压缩并重写 `doc/test-targets.md` 与 `doc/test-plan.md`，明确区分快速功能测试目标、正式运行测试目标，以及正式问题回灌到自动化测试的规则与工程流程。
- 修正测试文档中的输出路径表述，明确区分 `Jvedio.Test` 的 suite 输出目录（`config/<suite>/output/`）与主程序 `Jvedio.exe` 的内置调试输出目录（`data/<user>/log/test/<VID>/`）。
- 已删除旧的 `doc/test-refactor-plan.md` 和 `doc/test-strategy.md`，当前测试文档统一以 `test-targets.md`、`test-plan.md`、`test-current-suite.md` 为准。

## [2026-03-07]

### 已变更
- 修复 `Jvedio-WPF/Jvedio/Jvedio.csproj` 的预构建步骤，使本地 WPF 构建不再依赖私有 `D:\SuperStudio\...` 路径。
- 在复制前补齐输出目录创建逻辑，恢复本地干净环境下的构建能力。
- 将 `Jvedio-WPF` 与 `Jvedio.Test` 统一为 `x86`，关闭过时的 ClickOnce 清单生成，并修正仓库内 DLL 引用路径。
- 更新 `Jvedio-WPF/Jvedio/Upgrade/Jvedio4ToJvedio5.cs`，显式丢弃 fire-and-forget 任务返回值，清理剩余异步警告。
- 验证 `Jvedio-WPF/Jvedio.sln` 的 `Debug` 构建可在本地达到 `0 warning / 0 error`。
