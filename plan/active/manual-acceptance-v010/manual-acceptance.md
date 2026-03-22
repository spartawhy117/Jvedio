# v0.1.0 人工验收与修复跟踪

## 文档目的

本文件只承载真实桌面复核中的人工项、混合项、反馈问题、分析状态和修复状态。

当前工作方式：
- 先继续收集人工问题。
- 再按问题簇逐组深挖原因。
- 最后进入逐项修复、复验和提交推送。

## 人工 / 混合验收项目与反馈映射

说明：
- 本节只保留原有人工项、混合项及其当前状态。
- `关联问题` 为已经收到的人工反馈问题编号；空白表示尚未收到直接失败反馈，仍待复核。

| Phase | 验收项 | 当前状态 | 关联问题 |
|------|--------|----------|----------|
| Phase 1 | `1.2` 首次启动 | 真包已开始反馈；启动体验存在 Worker 前台窗口问题 | `F-001` |
| Phase 1 | `1.3` Worker 自动拉起 | 自动化基线通过；桌面复核仍待完成 | `F-001` |
| Phase 1 | `1.5` 单实例控制 | 待人工复核 | — |
| Phase 7 | `7.2` 播放调用 | 功能待人工复核；主 CTA 布局已收到反馈 | `F-016` |
| Phase 7 | `7.3` 打开文件夹 | 功能待人工复核；按钮位置已收到反馈 | `F-017` |
| Phase 9 | `9.5` 重启后保持 | 待人工复核；当前未收到直接“重启后丢设置”的失败反馈 | — |
| Phase 10 | `10.5` 外部来源页 | 待人工复核 | — |

## 扩展人工反馈分组

说明：
- 下表用于承接不完全落在单一人工验收项上的桌面体验反馈。
- 后续建议按问题簇而不是按单条问题推进分析和修复。

| 区域 | 当前反馈主题 | 关联问题 |
|------|--------------|----------|
| 启动链路 / 真包运行 | Worker 前台窗口、日志与启动链路复核 | `F-001` `M-001` `M-002` |
| 侧栏 / 底栏 / 全局图标 | 影视库位置、连接状态语义、图标风格统一 | `F-002` `F-003` `F-024` |
| 库管理 / 扫描状态 | 扫描进度、已扫描数量、重复整理、重抓后回刷不一致 | `F-004` `F-005` `F-014` `F-021` |
| 列表页工具条 / 分页 | 排序回显、刷新与排序分组、统一底部分页控件、单页也显示翻页组件 | `F-006` `F-022` `F-023` `F-026` |
| 主题与浮层 | 深浅主题下的弹层 / 菜单适配 | `F-007` |
| 设置页结构收敛 | 图片设置、整理规则、播放器设置、默认排序、MetaTube 诊断 | `F-008` `F-009` `F-010` `F-011` `F-012` |
| 演员页 | 演员头像缺失 | `F-013` |
| 详情页信息与动作区 | 图片策略、播放 / 打开文件夹布局、演员卡、回退文案、首次入库时间、返回目标标题语义 | `F-015` `F-016` `F-017` `F-018` `F-019` `F-020` `F-025` |
| 扫描 / 抓取性能 | 扫描链路感知过慢、MetaTube 抓取瀑布过重 | `F-027` |

## 问题簇优先级

说明：
- 先处理会影响真包启动体验、目录幂等和数据回刷一致性的高风险簇，再收敛设置、信息架构和视觉统一问题。
- 每个问题簇修复完成后，回写本文状态，再执行一轮针对性复验。

| 优先级 | 问题簇 | 关联问题 | 进入原因 |
|--------|--------|----------|----------|
| P0 | 启动 / 数据一致性 | `F-001` `F-014` `F-021` `M-001` `M-002` | 直接影响真包可用性、目录正确性和“重抓后界面是否可信”，不先收敛会污染后续人工复核样本 |
| P1 | 设置页结构收敛 | `F-008` `F-009` `F-010` `F-011` `F-012` | 涉及配置项删改、默认行为固化和设置入口语义统一，适合在数据链路稳定后成组处理 |
| P1 | 详情页信息架构 / 主动作区 | `F-015` `F-016` `F-017` `F-018` `F-019` `F-020` `F-025` | 同页布局、字段和交互集中，适合一次性按详情页规范重排，避免重复改 CSS 和组件结构 |
| P1 | 扫描 / 抓取性能 | `F-027` | 直接影响核心主流程体感，且与库完成度按钮、真包人工复核节奏强相关，需要尽快压缩串行抓取耗时 |
| P2 | 列表页工具条 / 分页 / 状态表达 | `F-004` `F-005` `F-006` `F-022` `F-023` `F-026` | 同属列表框架和查询工具条层，需在库状态定义清晰后统一调整 |
| P2 | 侧栏 / 底栏 / 图标视觉统一 | `F-002` `F-003` `F-024` | 主要是 IA 与视觉整合，风险低于数据链路问题，但会影响最终验收观感 |
| P2 | 主题与浮层适配 | `F-007` | 范围相对独立，可在视觉统一阶段一起回归 |
| P2 | 演员链路 | `F-013` | 依赖抓取、缓存、DTO、前端卡片四层核对，但不阻塞当前真包主流程 |

## 第一簇详细根因分析：启动 / 数据一致性

覆盖问题：
- `F-001` Worker 前台窗口持续显示
- `F-014` 右键扫描 / 单项重抓导致重复子目录与重复 sidecar
- `F-021` 本地 sidecar 已更新但影片卡 / 详情页不刷新

当前结论：
- 这一簇已经不是“只有现象”的阶段，已具备代码级证据，可从“待分析”推进到“分析中”。
- `F-014` 与 `F-021` 不是孤立问题，前者会制造错误目录层级和路径漂移，后者则同时暴露出前端缓存失效规则缺口。
- 本轮已完成第一轮代码修复：壳层对子进程改为隐藏窗口创建、扫描整理增加“已在 VID 目录中”幂等判定、查询缓存前缀失效逻辑已修正。
- 自动验证已通过：`ScanOrganizeTests` 通过，`Jvedio.Worker.Tests` 全量 66 项通过；真包体验仍需人工复核。

### F-001 Worker 前台窗口持续显示

已核对证据：
- `tauri/src-tauri/src/worker.rs` 当前通过 `std::process::Command::new(&worker_path)` 直接拉起 `Jvedio.Worker.exe`，只配置了 `stdout/stderr` 管道，没有看到 Windows 隐藏窗口创建标志。
- 当前方案还依赖 stdout ready signal（`JVEDIO_WORKER_READY`）驱动壳层初始化，因此不能简单改成完全脱离管道的启动方式。

初步根因判断：
- 真包场景下，Worker 仍以控制台子进程方式被 Tauri 壳层直接创建；由于壳层未显式指定隐藏窗口，Windows 会把 Worker 控制台窗口显示出来。
- 这更像壳层进程创建参数问题，不是 Worker 本身日志或 ready 机制的问题。

受影响区域：
- `tauri/src-tauri/src/worker.rs`
- 真包启动链路：`JvedioNext.exe -> Jvedio.Worker.exe`

后续修复方向：
- 在壳层保留 `stdout/stderr` 采集的前提下，补 Windows 子进程隐藏窗口创建参数。
- 修复后需要回归真包启动、日志输出、ready 判定和异常提示，避免“窗口消失但启动失败被吞掉”。

### F-014 重复子目录与重复 sidecar

已核对证据：
- `dotnet/Jvedio.Worker/Services/LibraryScanService.cs` 的 `TryOrganize(...)` 采用 `targetDir = Path.Combine(parentDir, folderName)`。
- 当视频已经位于 `...\\OMG-019\\OMG-019.mp4` 这种“按 VID 命名的独立目录”里时，`parentDir` 已经是 `...\\OMG-019`，再次整理会把目标目录算成 `...\\OMG-019\\OMG-019`，因此天然会继续向下套一层同名目录。
- 当前提前返回条件是 `videoCount <= 1 && string.Equals(parentDir, targetDir, ...)`，但这里的 `targetDir` 是在 `parentDir` 后再追加一层 `folderName` 算出来的，生产路径下几乎不可能相等，因此无法拦住“已整理样本”的重复整理。
- `dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs` 的 `LoadCandidates(...)` 在传入 `VideoIds` 时明确“bypass NeedsScrape and ScrapeStatus check”，右键单项重抓会绕过已有完成态校验。

初步根因判断：
- 目录重复的主因是整理算法缺少“已在目标独立目录中”的幂等判断，导致再次扫描必然生成嵌套目录。
- 重抓链路又绕过 `NeedsScrape(...)`，因此在路径已经漂移的前提下仍会继续写 sidecar，放大重复内容问题。

受影响区域：
- `dotnet/Jvedio.Worker/Services/LibraryScanService.cs`
- `dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs`
- 真实样本：`D:\hx\movie\watched\ReEncode\OMG-019`

后续修复方向：
- 先把整理逻辑改成对“已位于以 VID 命名的独立目录”的样本直接视为已整理完成。
- 再给右键扫描 / 单项重抓补路径与完成态防重校验，避免在显式重抓时继续制造重复层级和重复 sidecar。
- 修复后必须拿 `OMG-019` 真实目录结构做一次回归，验证不会再产生 `VID\\VID` 目录。

### F-021 本地已更新但卡片 / 详情页未刷新

已核对证据：
- `tauri/src/pages/VideoDetailPage.tsx` 的详情查询 key 为 ``video:${videoId}``。
- `tauri/src/contexts/BootstrapContext.tsx` 在 `library.changed` 事件里调用的是 `invalidateQueries("video:")`。
- `tauri/src/hooks/useApiQuery.ts` 的失效规则是 `key === keyOrPrefix || key.startsWith(keyOrPrefix + ":")`；当传入 `video:` 时，实际只会匹配 `video::...`，不会命中 `video:123` 这种真实 key。
- `dotnet/Jvedio.Worker/Services/VideoService.cs` 的 sidecar 状态完全依赖数据库里的 `metadata.Path` 推导 sidecar 目录；而 `F-014` 已经证明扫描整理可能把真实文件层级持续改写，因此这里还存在“数据库路径与真实 sidecar 位置错位”的连带风险。

初步根因判断：
- 前端至少存在一个确定的缓存失效 bug：库变化事件不会自动让详情页 `video:${id}` 查询失效重取。
- 后端侧还存在第二个高风险因素：如果重复整理导致 `metadata.Path` 或 sidecar 实际位置不一致，`HasPoster/HasThumb` 计算会继续命中错误目录，即使本地文件已经写出来，接口仍可能返回“缺图”。
- 因此 `F-021` 很可能是“前端失效规则缺口 + 后端路径漂移”叠加，而不是单点 UI bug。

受影响区域：
- `tauri/src/contexts/BootstrapContext.tsx`
- `tauri/src/hooks/useApiQuery.ts`
- `tauri/src/pages/VideoDetailPage.tsx`
- `dotnet/Jvedio.Worker/Services/VideoService.cs`
- 真实样本：`D:\hx\movie\watched\ReEncode\SNOS-082`

后续修复方向：
- 先修正 `video` 查询失效规则，确保 `library.changed` 能真正触发详情页与相关视频查询重拉。
- 再联动检查 `SNOS-082` 对应数据库路径、重抓后的 sidecar 落点和 `BuildSidecarState(...)` 计算结果，确认是否还需要补路径矫正或重抓后的状态回写。
- 修复验证不能只看文件是否落盘，还要同时看接口返回和前端页面是否同步更新。

## 第二簇详细根因分析：设置页结构收敛

覆盖问题：
- `F-008` 图片设置项应删除并固化默认行为
- `F-009` 扫描与导入中的整理规则应删除
- `F-010` “网络”应更名为“播放器设置”
- `F-011` 默认排序应移除并固化为最近入库降序
- `F-012` MetaTube 诊断应收敛为纯连通性测试

当前结论：
- 这一簇的共同问题不是“功能做坏了”，而是“旧配置模型继续暴露到 UI，但当前产品决策已经收敛，且部分配置根本没有真实接线”。
- 适合按“删 UI + 删契约字段 / 兼容旧配置 + 固化默认行为”整体处理，而不是逐个按钮小修小补。
- 本轮已完成第二轮代码收敛：图片伪配置与整理规则设置已移除，`network` 分组已更名为播放器设置，MetaTube 诊断已收敛为纯连通性测试。
- 默认排序设置已从设置页和契约层移除，列表默认改为按 `FirstScanDate` 为主、`CreateDate` 为回退的首次入库时间倒序；相关前后端 DTO 与排序实现已打通。

### F-008 图片设置项保留了伪配置

已核对证据：
- `tauri/src/pages/SettingsPage.tsx` 仍维护 `posterPriority / cacheSizeLimitMb / autoCleanExpiredCache` 三个表单字段。
- `dotnet/Jvedio.Worker/Services/SettingsService.cs` 会读写 `PosterPriority / CacheSizeLimitMb / AutoCleanExpiredCache`。
- 但当前前端真实渲染链路中，列表卡 [VideoCard.tsx](D:/study/Proj/Jvedio/tauri/src/components/shared/VideoCard.tsx) 只看 `video.hasPoster`，详情页 [VideoDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/VideoDetailPage.tsx) 也只看 `video.sidecars.poster.exists`；全仓检索没有发现这些图片设置字段被实际消费到渲染或缓存淘汰逻辑。

初步根因判断：
- 这组设置是旧“用户可调图片策略”残留，当前 UI 与 Worker 仍保留了保存能力，但真正展示逻辑早已收敛为“有本地图片就显示，没有就占位”。
- 继续保留只会制造“看起来可调，实际上不生效”的伪能力。

受影响区域：
- `tauri/src/pages/SettingsPage.tsx`
- `dotnet/Jvedio.Worker/Services/SettingsService.cs`
- `tauri/src/api/types.ts`

后续修复方向：
- 删除图片设置 UI、DTO 字段和持久化写入。
- 将海报策略固化为本地优先，无本地海报时统一走空占位。
- 缓存策略改为不限制，并处理历史配置字段兼容读写。

### F-009 整理规则配置与实际扫描链路脱节

已核对证据：
- `SettingsPage.tsx` 仍暴露 `organizeMode`，`SettingsService.cs` 仍读写 `OrganizeMode`。
- 但当前真正执行扫描整理的是 `LibraryScanService.ScanLibraryAsync(...)`，控制入口来自请求中的 `request.OrganizeBeforeScan` 和内部 `TryOrganize(...)`，并没有消费 `OrganizeMode` 这类配置值。
- 当前全仓检索未看到 `OrganizeMode` 进入实际扫描决策链。

初步根因判断：
- “整理规则”已经退化成只保存在设置里的孤立配置，没有形成当前 Worker 扫描行为的真实控制面。
- 这说明 UI 仍在暴露历史设计，而运行时已经走向单一路径。

受影响区域：
- `tauri/src/pages/SettingsPage.tsx`
- `dotnet/Jvedio.Worker/Services/SettingsService.cs`
- `dotnet/Jvedio.Contracts/Settings/ScanImportSettingsDto.cs`

后续修复方向：
- 删除整理规则 UI 与设置契约字段。
- 将扫描整理行为统一收敛到当前唯一支持路径，并与 `F-014` 的幂等修复一起回归。

### F-010 “网络”分组名称与内容不符

已核对证据：
- `SettingsPage.tsx` 顶部注释和 `SETTING_GROUPS` 仍把该分组命名为 `network`。
- 该分组实际表单内容只有 `playerPath` 和 `useSystemDefaultFallback`，对应播放器路径与系统回退，不是网络配置。

初步根因判断：
- 设置导航命名沿用了旧信息架构，但分组内容已经转成播放器配置，名称没有同步更新。
- 这是典型的 IA 命名漂移，不涉及底层行为变更。

受影响区域：
- `tauri/src/pages/SettingsPage.tsx`
- 设置页多语言文案资源

后续修复方向：
- 统一把该分组重命名为“播放器设置”。
- 保持字段和保存逻辑不动，只修正文案、分组 key 显示和相关文档。

### F-011 默认排序设置既未接线，也不是用户想要的“最近入库”

已核对证据：
- `SettingsPage.tsx` 和 `SettingsService.cs` 仍维护 `defaultSortBy / defaultSortOrder`。
- 但当前实际列表页默认排序并不读取该设置：`LibraryPage.tsx` 默认 `vid_asc`，`FavoritesPage.tsx` 默认 `vid_asc`，`ActorsPage.tsx` 默认 `name_asc`。
- 前端排序项里还使用了 `importTime` 这样的值，但 Worker 侧 `VideoService.SortVideos(...)` 并不支持 `importTime`，未知字段会回落到 `LastScanAt`。
- 数据层已存在 `metadata.FirstScanDate / CreateDate` 字段，但当前 `VideoService` 和 `VideoDetailDto` 都没有把“首次入库时间”正式贯通到 API。

初步根因判断：
- 当前“默认排序”是保存在设置中的孤立参数，既没有驱动页面默认排序，也没有提供用户期望的“最近加入库时间降序”。
- 同时“入库时间”概念在前后端尚未正式选定口径，导致排序名称、字段和真实行为三者分离。

受影响区域：
- `tauri/src/pages/SettingsPage.tsx`
- `tauri/src/pages/LibraryPage.tsx`
- `tauri/src/pages/FavoritesPage.tsx`
- `dotnet/Jvedio.Worker/Services/SettingsService.cs`
- `dotnet/Jvedio.Worker/Services/VideoService.cs`
- `dotnet/Jvedio.Worker/Services/WorkerStorageBootstrapper.cs`

后续修复方向：
- 删除默认排序 UI 与相关设置字段。
- 明确“最近加入库时间”最终口径是 `FirstScanDate` 还是 `CreateDate`。
- 把库内默认排序固化为该字段的降序，并同步修正前端 `importTime` 命名与 Worker 排序支持。

### F-012 MetaTube 诊断实际做的是“最小抓取链路”，不是连通性测试

已核对证据：
- `SettingsService.RunMetaTubeDiagnosticsAsync(...)` 不仅探测根地址和 providers，还会用默认 `IPX-001` 执行 `SearchMovieAsync(...)`，并继续调用 `GetMovieInfoAsync(...)` 读详情。
- `SettingsPage.tsx` 的 UI 只有服务器地址和超时，没有让用户输入测试番号或明确说明将使用默认样本。

初步根因判断：
- 后端诊断能力被实现成“轻量抓取演练”，但前端把它呈现为无输入的“运行诊断”按钮，用户自然会期待纯连通性结果。
- 能力边界和 UI 预期不一致，才会表现成“点击后没反应或行为不透明”。

受影响区域：
- `dotnet/Jvedio.Worker/Services/SettingsService.cs`
- `tauri/src/pages/SettingsPage.tsx`
- `dotnet/Jvedio.Contracts/Settings/RunMetaTubeDiagnosticsRequest.cs`

后续修复方向：
- 将诊断能力收敛为“服务连通性 + providers 可访问性”即可，避免隐式依赖默认番号。
- 明确按钮文案、loading、成功/失败反馈和结果面板，使用户能看懂这是连通性测试而不是抓取验证。

## 第三簇详细根因分析：详情页信息架构 / 主动作区

覆盖问题：
- `F-015` 列表卡与详情页图片职责分工错误
- `F-016` 播放按钮位置和层级不对
- `F-017` 打开文件夹按钮未贴近文件路径
- `F-018` 关联演员未复用通用演员卡
- `F-019` 回退标签语义错误
- `F-020` 缺少首次入库时间
- `F-025` 返回按钮应优先显示“将返回到的页面标题 / 库标题”，而不是过长的当前内容文本

当前结论：
- 这一簇高度集中在 [VideoDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/VideoDetailPage.tsx) 和路由元数据设计上，适合一次性做结构调整。
- 当前页面更多是“先能显示数据”，还没有真正按主操作优先级、信息邻接关系和共享组件复用来实现。
- 本轮已完成第三簇代码收口：详情页主图改为 `thumb -> poster -> 占位`，播放按钮提升到右栏主 CTA，打开文件夹贴近文件路径，关联演员改复用紧凑演员卡，回退链路切到统一 `BackNavigation`，详情 DTO 已补 `firstAddedAt`。
- 第二轮已继续收口回退标签：`BackNavigation` 现已补按目标 page 的标题兜底，并收紧详情页头部的返回文案宽度。
- 仍需真包复核的重点只剩布局观感、跨页面回退标签语义和真实样本图片显示。

### F-015 列表卡 / 详情页共用 poster 通道

已核对证据：
- 列表卡 [VideoCard.tsx](D:/study/Proj/Jvedio/tauri/src/components/shared/VideoCard.tsx) 通过 `/api/videos/{id}/poster` 展示 `poster`。
- 详情页 [VideoDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/VideoDetailPage.tsx) 同样只走 `/api/videos/{id}/poster`。
- 后端 [VideosController.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Controllers/VideosController.cs) 目前只暴露了 `/poster` 图片端点，没有对应 thumb 读取接口。

初步根因判断：
- 前后端都把“视频主图”简化成单一 poster 通道，导致页面无法按“列表=poster，详情=thumb”分工。
- 这不是单纯前端条件判断缺失，而是接口层就没有给详情页 thumb 专用能力。

受影响区域：
- `tauri/src/components/shared/VideoCard.tsx`
- `tauri/src/pages/VideoDetailPage.tsx`
- `dotnet/Jvedio.Worker/Controllers/VideosController.cs`
- `dotnet/Jvedio.Worker/Services/VideoService.cs`

后续修复方向：
- 保持列表卡默认使用 poster。
- 为详情页补 thumb 读取链路和前端优先级策略，缺失时再回退到 poster 或占位图。

### F-016 / F-017 主动作区与信息邻接关系错误

已核对证据：
- 当前详情页布局把主图、VID、sidecar 状态和 `ActionStrip` 都放在左栏；播放和打开文件夹两个动作同属左栏图片区下方。
- 文件路径展示在右栏底部，与“打开文件夹”操作不相邻。

初步根因判断：
- 当前布局按“图片区块附带动作”来组织，而不是按“右侧信息流中的主 CTA + 信息相关动作”来组织。
- 导致播放按钮存在感不足，“打开文件夹”也没有跟路径形成邻接。

受影响区域：
- `tauri/src/pages/VideoDetailPage.tsx`
- `tauri/src/pages/pages.css`
- `tauri/src/components/shared/ActionStrip.tsx`

后续修复方向：
- 将播放提升为右侧主信息区的主 CTA。
- 将“打开文件夹”贴到文件路径信息块右侧或同行位置，并重排窄屏换行策略。

### F-018 关联演员没有复用 ActorCard

已核对证据：
- 详情页当前把演员渲染为 `.actor-tag` 按钮，仅展示名字。
- 项目里已经存在通用演员卡 [ActorCard.tsx](D:/study/Proj/Jvedio/tauri/src/components/shared/ActorCard.tsx)，演员页 [ActorsPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/ActorsPage.tsx) 已在使用。
- 后端 `VideoActorDto` 虽然带有 `AvatarPath` 字段，但 [VideoService.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/VideoService.cs) 的 `LoadActors(...)` 当前始终写入 `AvatarPath = null`。

初步根因判断：
- 详情页没有复用既有演员卡组件，同时详情接口也没有把演员头像透出，导致这里只能退化成纯文本标签。
- 这是共享组件复用缺失和 DTO 不完整同时造成的结果。

受影响区域：
- `tauri/src/pages/VideoDetailPage.tsx`
- `tauri/src/components/shared/ActorCard.tsx`
- `dotnet/Jvedio.Worker/Services/VideoService.cs`
- `dotnet/Jvedio.Contracts/Videos/VideoActorDto.cs`

后续修复方向：
- 让详情接口返回演员头像路径。
- 详情页改为复用通用演员卡或其紧凑变体，保证头像、名字和跳转行为一致。

### F-019 回退标签语义和渲染链都不完整

已核对证据：
- 路由层 [RouterProvider.tsx](D:/study/Proj/Jvedio/tauri/src/router/RouterProvider.tsx) 支持在历史项中保存 `label`。
- 但当前各详情页只渲染一个纯箭头返回按钮，没有使用该 label。
- 同时多处 `navigate(..., { label })` 会把当前实体名带进去，例如从详情页跳演员时传 `video?.vid`，这更接近“当前内容标题”，不是“返回目标名称”。

初步根因判断：
- 路由层已经有返回标签概念，但 UI 没有把它渲染出来，且 label 的语义也没有统一成“上一层页面/分组名”。
- 所以一旦后续把标签展示出来，当前写法会直接暴露出“显示的是当前内容名而不是回退目标”的问题。

受影响区域：
- `tauri/src/router/RouterProvider.tsx`
- `tauri/src/pages/LibraryPage.tsx`
- `tauri/src/pages/FavoritesPage.tsx`
- `tauri/src/pages/ActorsPage.tsx`
- `tauri/src/pages/VideoDetailPage.tsx`
- `tauri/src/pages/ActorDetailPage.tsx`

后续修复方向：
- 明确 `label` 只表示“返回目标页面 / 分组”。
- 新增统一回退组件时优先消费上一层 label，并对长文案做截断。

### F-025 返回按钮仍会显示过长文本，且没有稳定收敛到“目标页标题”

已核对证据：
- [BackNavigation.tsx](D:/study/Proj/Jvedio/tauri/src/components/shared/BackNavigation.tsx) 当前直接读取 `history[history.length - 1]?.label ?? fallbackLabel`，没有对 `history` 项的 `page` 做标题回退，也没有对异常长 label 做语义修正。
- 路由历史项 [RouterProvider.tsx](D:/study/Proj/Jvedio/tauri/src/router/RouterProvider.tsx) 只保存了 `label` 字段，没有“目标页标题”和“实体展示标题”的区分；一旦调用方传错，回退组件就只能原样显示。
- [VideoDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/VideoDetailPage.tsx) 与 [ActorDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/ActorDetailPage.tsx) 都把 `fallbackLabel` 固定传成 `back`，因此当历史项缺 label 或 label 不可信时，组件不会自动回退到“影视库 / 演员 / 喜欢 / 库管理”这类目标标题。
- 现有样式 [BackNavigation.css](D:/study/Proj/Jvedio/tauri/src/components/shared/BackNavigation.css) 虽然有 `text-overflow: ellipsis`，但 `max-width: min(360px, 100%)` 仍偏宽，详情页头部会被长文案明显侵占。

初步根因判断：
- 第一层问题不是“有没有回退标签”，而是回退标签数据模型过于单薄，只要某个入口把当前实体名误当作 label 传进来，组件就会把它当成返回目标。
- 第二层问题是组件没有“按历史 page 推导默认标题”的兜底机制，导致 label 缺失或异常时只能退回通用 `返回`，而不是更符合语义的页面 / 库标题。
- 第三层问题是 UI 长度控制偏宽，即使语义正确，详情页头部也容易被过长返回文本压缩。

受影响区域：
- `tauri/src/components/shared/BackNavigation.tsx`
- `tauri/src/components/shared/BackNavigation.css`
- `tauri/src/router/RouterProvider.tsx`
- `tauri/src/pages/VideoDetailPage.tsx`
- `tauri/src/pages/ActorDetailPage.tsx`

后续修复方向：
- 让回退组件优先显示历史项显式 label，但在缺失时自动按目标 page 回退到稳定标题。
- 收紧返回按钮文案宽度，并保留 tooltip 承载完整标题。
- 继续核对全部 `navigate(..., { label })` 调用点，确保 label 只表达“返回目标名称”。

### F-020 首次入库时间缺失

已核对证据：
- 数据表 schema 中已有 `metadata.FirstScanDate` 和 `metadata.CreateDate`。
- 但当前 [VideoDetailDto.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Contracts/Videos/VideoDetailDto.cs) 没有首次入库字段。
- [VideoService.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/VideoService.cs) 的详情查询也没有读取这两个字段。

初步根因判断：
- 首次入库时间不是没有底层数据，而是 Worker DTO 和详情页展示链路没有把它纳入正式字段。
- 这与 `F-011` 的“最近加入库时间排序口径”是同一条数据治理问题。

受影响区域：
- `dotnet/Jvedio.Worker/Services/VideoService.cs`
- `dotnet/Jvedio.Contracts/Videos/VideoDetailDto.cs`
- `tauri/src/pages/VideoDetailPage.tsx`

后续修复方向：
- 统一首次入库时间口径。
- 扩展详情 DTO、接口查询和前端展示格式化。

## 第四簇详细根因分析：列表页工具条 / 分页 / 状态表达

覆盖问题：
- `F-004` 扫描百分比与“无需继续扫描”状态缺失
- `F-005` “最近扫描 / 状态”应改为“已扫描数量”
- `F-006` 排序组件未回显当前规则
- `F-022` 刷新与排序被工具栏拉散
- `F-023` 顶部总数应去掉，底部分页承担状态表达
- `F-026` 只有 1 页时右下角也必须显示通用分页控件

当前结论：
- 这一簇已完成第一轮代码收口：库 DTO 已补 `syncedVideoCount / completionPercent / isFullySynced`，扫描按钮已切到“扫描即整理+补抓取”的完整同步链路。
- 库管理页现已改为展示“已扫描数量 + 完成度 + 进行中摘要”，并在全部完成时切换为红色“无需扫描”按钮态。
- `QueryToolbar` 已回显当前排序规则名称，刷新与排序已收拢到同一操作组。
- `ActorsPage / FavoritesPage / LibraryPage / ActorDetailPage` 顶部 `ResultSummary` 已移除，底部分页控件已补“跳转”表达。
- 第二轮人工反馈说明，分页组件虽然已经统一到底部，但页面仍把“是否显示分页”错误绑定到了 `totalCount > PAGE_SIZE`，单页结果没有真正复用统一控件。

### F-004 / F-005 库管理页缺少完成度模型

已核对证据：
- `LibraryManagementPage.tsx` 的表头固定为“名称 / 视频数 / 最近扫描 / 状态 / 操作”。
- 行内状态只使用 `lib.hasRunningTask ? scanning : synced`，扫描按钮也只是“是否正在运行”二值状态。
- 后端 [LibraryListItemDto.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Contracts/Libraries/LibraryListItemDto.cs) 只有 `VideoCount / LastScanAt / LastScrapeAt / HasRunningTask`，没有“已完整同步数量”“扫描完成率”“当前阶段进度”等字段。
- Worker 扫描和抓取虽然内部会 `ReportProgress(...)`，但这些进度没有被聚合回库行 DTO。

初步根因判断：
- 库管理页现在只有“任务是否在跑”的过程态，没有“库内容完成度”的结果态，因此既无法展示百分比，也无法表达“已全部同步完，无需继续扫描”。
- “最近扫描”和“状态”会显得无效，是因为当前 DTO 站在任务视角，而不是用户关心的资产完成度视角。

受影响区域：
- `tauri/src/pages/LibraryManagementPage.tsx`
- `dotnet/Jvedio.Contracts/Libraries/LibraryListItemDto.cs`
- `dotnet/Jvedio.Worker/Services/LibraryService.cs`
- `dotnet/Jvedio.Worker/Services/LibraryScanService.cs`
- `dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs`

后续修复方向：
- 为库 DTO 补“已完成同步数量”“总待处理数量 / 完成率”“稳定完成态”等聚合字段。
- 再基于这些字段重构库管理页列定义、按钮状态和颜色规则。

### F-006 / F-022 QueryToolbar 组件职责过弱

已核对证据：
- [QueryToolbar.tsx](D:/study/Proj/Jvedio/tauri/src/components/shared/QueryToolbar.tsx) 的排序触发按钮固定显示 `t("sortBy")`，没有回显当前 `currentSort` 对应的 label。
- 组件中插入了一个 `toolbar-spacer`，把搜索和刷新固定在左侧、排序推到最右侧。
- 对应样式在 [pages.css](D:/study/Proj/Jvedio/tauri/src/pages/pages.css) 中使用 `.toolbar-spacer { flex: 1; }`，因此刷新与排序天然被拉开。

初步根因判断：
- 当前通用工具条把“查询输入”和“排序菜单”视为两个分离区域，没有把刷新、排序视为同一操作组。
- 排序按钮又没有当前规则回显，导致用户既看不到当前排序状态，也感知不到刷新和排序之间的关联。

受影响区域：
- `tauri/src/components/shared/QueryToolbar.tsx`
- `tauri/src/components/shared/QueryToolbar.css`
- `tauri/src/pages/pages.css`

后续修复方向：
- 让排序按钮直接显示当前规则名称。
- 调整工具条布局，把刷新和排序收拢到同一操作组，移除导致分裂的弹性占位策略。

### F-023 顶部总数与底部分页职责冲突

已核对证据：
- `ActorsPage.tsx`、`FavoritesPage.tsx`、`LibraryPage.tsx`、`ActorDetailPage.tsx` 都会在标题区或区块标题旁渲染 `ResultSummary totalCount`。
- 同时这些页面底部已经挂载通用 `Pagination` 组件。
- 当前 `Pagination.tsx` 只承担翻页，不承担“总页数 / 跳转 / 页面状态是主信息”的完整表达；顶部总数因此继续占用工具条视觉空间。

初步根因判断：
- 项目现在同时保留了“顶部总数提示”和“底部分页控件”两套状态表达，但没有确定谁是主承载点。
- 这让顶部工具栏过重，分页控件反而像附属功能，而不是结果页主导航。

受影响区域：
- `tauri/src/pages/ActorsPage.tsx`
- `tauri/src/pages/FavoritesPage.tsx`
- `tauri/src/pages/LibraryPage.tsx`
- `tauri/src/components/shared/Pagination.tsx`
- `tauri/src/components/shared/ResultSummary.tsx`

后续修复方向：
- 将分页信息和跳转操作正式收拢到底部统一分页控件。
- 顶部总数从演员页、喜欢页、库页等列表主页面移除，只在确有必要的局部区块保留。

### F-026 单页结果没有显示统一分页控件

已核对证据：
- 通用分页组件 [Pagination.tsx](D:/study/Proj/Jvedio/tauri/src/components/shared/Pagination.tsx) 内部已经把 `totalPages` 至少钳制为 `1`，说明组件本身允许展示 `1 / 1`。
- 但 [LibraryPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/LibraryPage.tsx)、[FavoritesPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/FavoritesPage.tsx)、[ActorsPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/ActorsPage.tsx)、[ActorDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/ActorDetailPage.tsx) 仍然用 `totalCount > PAGE_SIZE` 作为是否渲染分页组件的条件。
- [pages.css](D:/study/Proj/Jvedio/tauri/src/pages/pages.css) 已经把 `.pagination-bar` 放在右下对齐，因此当前“单页不显示”不是样式缺陷，而是页面层的条件渲染拦掉了组件。

初步根因判断：
- 当前列表页把分页组件当成“多页时才需要的功能控件”，而不是“列表状态统一出口”。
- 因此虽然组件本身已经支持 `1 / 1`，但页面层继续用老条件判断把它裁掉，导致设计上要求的统一分页出口没有真正落地。

受影响区域：
- `tauri/src/components/shared/Pagination.tsx`
- `tauri/src/pages/LibraryPage.tsx`
- `tauri/src/pages/FavoritesPage.tsx`
- `tauri/src/pages/ActorsPage.tsx`
- `tauri/src/pages/ActorDetailPage.tsx`

后续修复方向：
- 将分页渲染条件收敛为“列表存在结果就显示分页组件”，不再依赖 `totalCount > PAGE_SIZE`。
- 保持空结果页仍走 `ResultState`，避免在 `0` 条时额外渲染无意义的分页条。

## 第五簇详细根因分析：侧栏 / 底栏 / 图标视觉统一

覆盖问题：
- `F-002` 影视库位置应贴着演员下方
- `F-003` “已连接”语义弱且缺少资源指标
- `F-024` 图标风格混乱，应统一扁平化

当前结论：
- 这一簇已在主壳层完成第一轮收口：影视库区块已回到“演员”导航下方，底部区块改成任务概况 + 运行状态 + 资源指标面板。
- Shell 侧已补运行时资源采样命令，前端每 5 秒轮询 CPU / 内存并显示总占用。
- 常用导航、菜单、批量操作、空态、Toast、异常浮层已替换为统一的扁平化 SVG 图标入口，不再继续使用 emoji 占位。

### F-002 影视库被 CSS 主动压到了底部

已核对证据：
- `App.tsx` 中主导航和“影视库”区块是两个独立段落。
- `App.css` 中 `.library-nav-section { margin-top: auto; }`，这会把整个库区块推到侧栏底部。

初步根因判断：
- 这不是偶发间距问题，而是布局策略本身把库区块定义成“底部附加区”，因此必然不会贴着“演员”导航项。
- 当前 IA 实现与设计预期“导航组后紧跟影视库组”相反。

受影响区域：
- `tauri/src/App.tsx`
- `tauri/src/App.css`

后续修复方向：
- 调整侧栏结构或去掉 `margin-top: auto`，把库区块并回主导航信息流。
- 再按设计稿统一导航组、库组和底部状态区的间距层级。

### F-003 当前底栏只承载连接态，没有运行态信息架构

已核对证据：
- `App.tsx` 底部 `worker-indicator` 只根据 `workerStatus + sseConnected` 展示圆点和 `已连接 / SSE ✗ / 启动中 / 错误`。
- 当前 Bootstrap / Worker 契约里没有 CPU、内存等资源采样字段，也没有专门的进程运行状态 DTO。
- `task-summary-bar` 提供的只是任务数量，不是应用资源指标。

初步根因判断：
- 当前底部状态区的设计目标仍停留在“技术连接状态提示”，没有升级为“用户可理解的运行面板”。
- 资源指标之所以不存在，不是 UI 漏显示，而是后端 / 壳层压根没有采样和传输链路。

受影响区域：
- `tauri/src/App.tsx`
- `tauri/src/App.css`
- `tauri/src/contexts/BootstrapContext.tsx`
- Shell / Worker 运行状态契约

后续修复方向：
- 先明确底栏信息架构，决定连接状态是否保留、如何重命名。
- 再补应用 CPU / 内存采样与定时刷新链路，并控制刷新频率和开销。

### F-024 图标体系与资源治理都没有收敛

已核对证据：
- [asset-registry.ts](D:/study/Proj/Jvedio/tauri/src/assets/asset-registry.ts) 文档化约定已经写明“常规操作图标优先使用 icon library”，但 `assetRegistry` 仍为空。
- 当前主导航、任务条、空状态、右键菜单、批量操作、详情页动作等广泛直接使用 emoji，如 `🎬 / ⚙ / 📁 / 👤 / 🔄 / 🗑`。
- 项目中尚未看到统一的 `icon/` 目录或稳定的扁平化资源引用入口。

初步根因判断：
- 资源规范已经立了，但实现层仍停留在占位 emoji 和分散图标引用阶段，缺少一次完整的图标迁移和资产收口。
- 因此会同时出现风格混杂、来源分散、后续难维护三类问题。

受影响区域：
- `tauri/src/App.tsx`
- `tauri/src/pages/*.tsx`
- `tauri/src/components/shared/*.tsx`
- `tauri/src/assets/asset-registry.ts`

后续修复方向：
- 先梳理当前所有常用图标清单。
- 统一决定哪些用 icon library，哪些从 `clash-verge` 风格资产迁入新 `icon/` 目录。
- 同步清理 emoji 和历史散落引用，建立统一入口。

## 第六簇详细根因分析：主题与浮层适配

覆盖问题：
- `F-007` 弹窗 / 菜单类浮层没有完整随深浅主题适配

当前结论：
- 本轮已统一库管理弹窗、确认框与右键菜单的浮层 token 使用，深色模式下不再回退到亮色白板。
- 仍需真包复核的重点只剩不同主题下的实际观感和对比度，而不是功能层面的 token 缺失。

### F-007 浮层组件使用的 token 不统一

已核对证据：
- [ConfirmDialog.css](D:/study/Proj/Jvedio/tauri/src/components/shared/ConfirmDialog.css) 基本使用了 `--dialog-overlay / --color-bg-app / --color-border` 等主题 token。
- 但 [VideoContextMenu.css](D:/study/Proj/Jvedio/tauri/src/components/shared/VideoContextMenu.css) 使用的是 `var(--color-bg-main, #fff)`，而当前主题 token 并没有定义 `--color-bg-main`，深浅主题下会回退到白色。
- [CreateEditLibraryDialog.css](D:/study/Proj/Jvedio/tauri/src/components/dialogs/CreateEditLibraryDialog.css) 的 overlay 仍直接写死 `rgba(0, 0, 0, 0.4)`，也没有完全统一到 `--dialog-overlay`。
- 项目中还有多处 badge / 反馈色仍带硬编码亮色 fallback。

初步根因判断：
- 主题系统和浮层组件之间缺少统一约束，导致不同组件各自选用变量名或 fallback，最后在深色模式下表现不一致。
- 这不是单个弹窗的 bug，而是共享浮层样式规范没有彻底落地。

受影响区域：
- `tauri/src/components/shared/ConfirmDialog.css`
- `tauri/src/components/dialogs/CreateEditLibraryDialog.css`
- `tauri/src/components/shared/VideoContextMenu.css`
- `tauri/src/theme/theme-tokens.ts`

后续修复方向：
- 统一浮层组件只消费正式 theme token。
- 清理无效 token 名和硬编码亮色 fallback，再做一轮深浅主题回归。

## 第七簇详细根因分析：演员链路

覆盖问题：
- `F-013` 演员页没有头像显示

当前结论：
- 当前头像链路已完成第一轮修复：抓取阶段会回写 `actor_info.ImageUrl / WebType / WebUrl`，既有演员也会在命中新头像时同步更新。
- 头像缓存命名已改为优先使用头像 URL 文件名，再回退 provider actor id 和名字 hash，与读取侧查找策略保持一致。

### F-013 抓到了头像，不代表演员页一定能找到头像

已核对证据：
- 抓取阶段 [LibraryScrapeService.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs) 会在 `downloadActorAvatars=true` 时下载演员头像到 `cache/actor-avatar/`。
- 下载文件名使用 `BuildActorAvatarKey(actor.ActorId, actor.Name)`；如果有 provider actor id，就优先用 provider id 作为缓存键。
- 但演员入库时 `EnsureActor(...)` 只保证 `ActorName / WebType / WebUrl`，并没有把头像 URL 写入 `actor_info.ImageUrl`，而且对已存在演员也不会更新这些信息。
- 读取阶段 [ActorService.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/ActorService.cs) 会尝试按“数据库 ActorID / ImageUrl 文件名 / WebUrl 文件名 / 名字 hash”去找缓存文件；如果下载时用了 provider actor id，而读取侧没有持久化对应 `ImageUrl` 或可解析 key，就可能找不到刚刚下载的头像。
- 详情页关联演员链路里，`VideoService.LoadActors(...)` 甚至直接把 `AvatarPath = null`，进一步说明演员头像数据没有统一透传。

初步根因判断：
- 当前头像缓存键策略和演员信息持久化策略没有对齐，导致“文件已下载，但演员页无法稳定命中缓存”。
- 对既有演员记录缺少更新逻辑，也会让老数据长期停留在无头像状态。

受影响区域：
- `dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs`
- `dotnet/Jvedio.Worker/Services/ActorService.cs`
- `dotnet/Jvedio.Worker/Services/VideoService.cs`
- `tauri/src/components/shared/ActorCard.tsx`
- `tauri/src/pages/ActorsPage.tsx`

后续修复方向：
- 统一演员头像缓存键与 `actor_info` 持久化字段。
- 对已存在演员补更新逻辑，保证头像 URL / WebUrl / provider 信息能回写。
- 详情页与演员页共用同一套头像解析策略。

## 第八簇详细根因分析：扫描 / 抓取性能

覆盖问题：
- `F-027` 相比 Jellyfin + MetaTube 体验，当前“扫描后自动拉取元数据”链路体感明显偏慢

当前结论：
- 当前仓库里没有单独的本地 `jellyfin-metatube` 插件源码可直接逐行对比，现阶段判断主要基于 Jvedio 自身 Worker 链路的代码证据。
- 已能确认当前慢感并不是单点 I/O，而是“扫描任务串联抓取 + 单影片串行瀑布请求 + 图片下载连接复用不足”叠加出来的总耗时。
- 本轮已完成低风险性能收口：图片下载已改为复用长生命周期 `HttpClient`，单影片内演员补全与演员头像下载已并发化，并增加了同轮抓取的演员查询缓存。
- 后续仍需通过真实样本库观察总时长变化，再决定是否继续调整任务阶段表达或跨影片并发度。

### F-027 扫描后自动抓取的链路存在明显串行瀑布

已核对证据：
- [LibraryTaskOrchestratorService.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/LibraryTaskOrchestratorService.cs) 的 `StartScanTaskCore(...)` 会在 `ScanLibraryAsync(...)` 完成后，同一任务内立即继续执行 `ScrapeLibraryAsync(...)`，所以用户感知到的“扫描”其实包含了后续整段抓取。
- [LibraryScrapeService.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs) 当前按 `candidates` 逐条顺序抓取；每部影片至少会经历“影片搜索 -> 影片详情 -> 多个演员搜索 -> 多个演员详情 -> poster/thumb/fanart 下载 -> 演员头像下载”的顺序链路。
- 同文件中演员补全使用 `foreach` 串行执行 `SearchActorAsync(...)` 和 `GetActorInfoAsync(...)`，同一影片演员越多，等待时间越线性增长。
- 同文件 `DownloadFileAsync(...)` 每次下载图片都会 `new HttpClient()`，poster / thumb / fanart 和演员头像都会重复创建连接，无法复用连接池。
- [MetaTubeWorkerClient.cs](D:/study/Proj/Jvedio/dotnet/Jvedio.Worker/Services/MetaTubeWorkerClient.cs) 虽然为 API 请求维护了一个 `HttpClient`，但下载侧完全绕开了这个复用能力。
- 本地仅找到 `D:/study/Proj/jellyfin-web`，未发现独立 `jellyfin-metatube` 插件源码，因此“Jellyfin 更快”的对照结论当前只能作为体验参照，不能写成逐实现差异比对。

初步根因判断：
- 第一层慢感来自任务编排：用户点击一次“扫描”，实际上要等待“发现文件 + 入库 + 元数据抓取 + 图片下载”整条链路跑完。
- 第二层慢感来自抓取实现：单影片内部存在明显的串行网络瀑布，尤其演员搜索 / 详情补全是典型 N 次顺序请求。
- 第三层慢感来自资源下载：图片下载没有复用 `HttpClient`，在大量 sidecar 与演员头像场景下会引入额外连接建立成本。
- 第四层隐性成本是重复 actor 查询：跨多部影片出现同名演员时，当前链路没有做 run-level 缓存，会重复命中同一批 MetaTube 接口。

受影响区域：
- `dotnet/Jvedio.Worker/Services/LibraryTaskOrchestratorService.cs`
- `dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs`
- `dotnet/Jvedio.Worker/Services/MetaTubeWorkerClient.cs`

后续修复方向：
- 优先把图片下载改为复用长生命周期 `HttpClient`，去掉每张图都新建连接的做法。
- 将单影片内部的演员补全改为受控并发，并为同一次抓取任务增加演员查询缓存。
- 在不破坏当前任务模型和 MetaTube 压力边界的前提下，先压缩单影片耗时，再评估是否需要进一步调整任务阶段表达。

## 问题反馈池（待逐项深挖）

状态规则：
- `待分析`：刚收到反馈，只有现象和初步猜测。
- `分析中`：已开始看日志、代码或复现链路。
- `待修复`：根因基本确认，但还没改代码。
- `修复中`：已经进入实现阶段。
- `已修复待复验`：代码已落地，等待真包或桌面复核。
- `已完成`：修复和复验都通过。

| 编号 | 来源 | 现象 | 初步判断 | 下一步 | 状态 |
|------|------|------|----------|--------|------|
| F-001 | 人工验收 | 启动真包后，原本应后台运行的 Worker 控制台窗口持续显示在前台，桌面体验割裂 | `tauri/src-tauri/src/worker.rs` 直接 `Command::new(...).spawn()` 拉起 `Jvedio.Worker.exe`，仅配置管道采集，没有 Windows 隐藏窗口创建标志；真包下会把控制台子进程直接暴露出来 | 已补 Windows `CREATE_NO_WINDOW` 创建参数；下一步用真实便携包复核 Worker 是否仍可正常输出日志并完成 ready 握手 | 已修复待复验 |
| F-002 | 人工验收 | 左侧“影视库”区块应紧贴“演员”导航项下方显示，但当前被放到了侧栏更靠下的位置，与设计图预期不一致 | 当前侧栏很可能在导航区与库区之间插入了多余留白、拉伸占位或错误的垂直分布策略，导致“影视库”被向下推离导航区，而不是作为同一信息组的延续内容紧跟在“演员”下方 | 已移除 `.library-nav-section` 的底部吸附策略，并把底栏状态区独立收口到 `sidebar-footer`；下一步用真包复核最终间距观感 | 已修复待复验 |
| F-003 | 人工验收 | 左下角仅显示“已连接”，语义不清；希望右侧同步展示当前应用的 CPU、内存等运行指标，类似资源面板 | 当前底栏状态区只承载 Worker/SSE 连接状态，文案来自连接态枚举，对用户缺少可理解的业务含义；同时壳层尚未接入应用进程资源采样，因此没有 CPU / 内存等实时指标可展示 | 已把底栏改成“工作服务运行中 / 事件同步正常”等可理解文案，并通过 Tauri `get_runtime_metrics` 命令补 CPU / 内存采样；下一步做真包观感复核 | 已修复待复验 |
| F-004 | 人工验收 | 点击“扫描”后，希望把目录整理与元数据获取的总体完成度以百分比展示出来；当库内内容已全部扫描且数据完整时，扫描按钮应切换为红色提示态，表达“当前无需继续扫描” | 当前库管理页对扫描状态的表达过于粗，只区分 `扫描中 / 已同步`，行内动作也只有固定“扫描”按钮；前端缺少分阶段进度聚合，后端返回结构里看起来也没有面向库级“整理 + 搜刮完成率 / 完整率”的直接字段，因此无法准确驱动百分比和“无需继续扫描”的按钮状态 | 已补库级完成度聚合字段，并把扫描入口切到“扫描后自动抓取”完整链路；库管理页现已显示百分比和红色“无需扫描”按钮态，下一步做真包复核 | 已修复待复验 |
| F-005 | 人工验收 | 库管理表格中的“最近扫描”和“状态”两列不够有用，希望改成“已扫描数量”，明确表示当前库内已完成全部同步且数据成功的影片数量 | 当前列表列定义偏向任务过程视角，用 `lastScanAt + synced/scanning` 描述最近动作，但用户更关心库内容完成度；同时库 DTO 目前暴露的是 `videoCount / lastScanAt / hasRunningTask` 这类字段，缺少“已完整同步成功影片数”的直接统计，所以界面只能展示时间和粗状态 | 已把表格列改成“已扫描数量 + 完成度”，并以 `ScrapeStatus=full` 聚合 `syncedVideoCount`；下一步结合真实库校验统计口径 | 已修复待复验 |
| F-006 | 人工验收 | 排序通用组件触发按钮只显示固定“排序”，没有直接展示当前选中的排序规则名称，使用时不够直观 | 当前排序组件大概率只把“排序”当作静态入口文案，选中值只在下拉列表内部高亮，没有把当前 `value` 对应的 `label` 回显到触发按钮上；这会让用户在关闭菜单后失去当前排序上下文 | 已让排序按钮直接显示当前规则名称，并改成统一图标 + 文案触发样式；下一步确认不同页面的长文案截断表现 | 已修复待复验 |
| F-007 | 人工验收 | 弹窗 / 菜单类对话层没有随深色 / 浅色主题正确适配，当前在深色页面里仍出现明显浅色面板，视觉割裂 | 当前弹层组件很可能还写死了浅色背景、边框或阴影，或者没有完全接入统一主题 token，导致页面级主题切换已生效，但浮层、右键菜单、确认框等覆盖层仍沿用默认亮色样式 | 已统一 `VideoContextMenu` 与 `CreateEditLibraryDialog` 的主题 token 使用，并收敛浮层背景 / overlay 变量；下一步做深浅主题真包回归 | 已修复待复验 |
| F-008 | 人工验收 | 图片设置中的“海报显示”两项和“缓存策略”控制都没有保留必要，希望删除对应设置项与逻辑；海报固定为本地优先，本地没有则显示空占位图；缓存默认不限制 | 当前图片设置仍暴露了 `posterPriority / cacheSizeLimitMb / autoCleanExpiredCache` 这类可配置项，说明前后端还按“用户可调策略”设计；但当前产品决策已经收敛为单一路径，继续保留这些开关只会增加理解和维护成本 | 已删除图片设置 UI、契约字段和持久化写入；下一步用真包确认本地无海报时仍回落占位图，且升级后历史配置不影响运行 | 已修复待复验 |
| F-009 | 人工验收 | “扫描与导入”设置中的“整理规则”不再需要保留，希望删除对应 UI 和实现逻辑 | 当前扫描设置仍把整理模式作为可选配置项，说明前后端还支持多种整理策略；但如果产品决定不再让用户控制整理规则，这部分配置会变成无效复杂度，并增加扫描行为理解成本 | 已移除整理规则 UI、契约字段与配置写入；下一步结合真实扫描样本确认扫描行为保持现有唯一整理路径 | 已修复待复验 |
| F-010 | 人工验收 | 设置侧栏中的“网络”分组名称不准确，希望改为“播放器设置”，但分组里的具体内容暂不调整 | 当前该分组实际承载的是播放器路径与回退策略，而不是网络配置，说明导航命名仍沿用旧分类，已和页面内容脱节 | 已将设置分组统一改名为“播放器设置”，并同步多语言与规格文档；下一步用真包复核分组切换与保存行为 | 已修复待复验 |
| F-011 | 人工验收 | “库”设置中的“默认排序”不再需要保留，希望删除对应 UI 和逻辑；列表默认按最近加入库时间降序排序 | 当前设置与排序链路仍围绕 `defaultSortBy / defaultSortOrder` 工作，且支持的默认字段是 `releaseDate / title / lastPlayedAt / lastScanAt`；底层存储里虽然已经有 `metadata.CreateDate / FirstScanDate` 这类可用于表达入库时间的数据，但当前视频 DTO 与排序接口没有把“入库时间”作为正式排序字段贯通出来 | 已删除默认排序 UI 与契约字段，并把列表默认排序固化为 `FirstScanDate` 优先、`CreateDate` 回退的首次入库时间倒序；下一步用真实库复核默认排序结果 | 已修复待复验 |
| F-012 | 人工验收 | MetaTube 的“运行诊断”点击后无明显反应；当前界面也没有让用户填写抓取内容，因此这里不应表现成完整抓取诊断，而应只做服务连通性测试并明确反馈结果 | 当前诊断入口的命名、返回预期和实际能力不一致，用户会自然理解为“模拟抓取/完整验证”，但界面既没有输入样本内容，也没有清晰的结果反馈；这使得按钮表现像失效，而不是“只做连通性检查” | 已将诊断收敛为根地址与 providers 的连通性测试，并补充按钮文案与提示说明；下一步用测试 MetaTube 地址复核成功/失败反馈 | 已修复待复验 |
| F-013 | 人工验收 | 抓取完成后，演员分类页里没有显示对应演员头像，仍然是默认占位图 | 当前演员链路可能只完成了演员名称关联，没有把头像 URL 正确落到本地缓存或映射到演员列表 DTO；也可能是前端演员卡片未正确解析/拼接头像资源路径，导致即使后台已有头像也没有展示出来 | 已统一头像缓存键、补齐 `actor_info.ImageUrl` 回写和既有演员更新逻辑；下一步用真实抓取样本验证演员页与详情页头像都能命中缓存 | 已修复待复验 |
| F-014 | 人工验收 | 对已抓取影片执行右键扫描或单项“重新获取元数据”后，会再次创建同名子目录并生成重复 sidecar；当前目录 `D:\\hx\\movie\\watched\\ReEncode\\OMG-019` 已出现根目录一套 sidecar + 子目录 `OMG-019\\OMG-019` 内另一套 sidecar 和视频文件的重复结构 | `LibraryScanService.TryOrganize(...)` 把目标目录固定算成 `parentDir\\VID`，对“已经在 `VID` 目录内”的样本会继续算出 `VID\\VID`；同时 `LibraryScrapeService.LoadCandidates(...)` 在单项重抓时绕过 `NeedsScrape` 与 `ScrapeStatus` 检查，导致重复写 sidecar | 已补“父目录名已匹配 VID 时视为已整理”判定，并新增回归测试锁定不再创建 `VID\\VID` 目录；下一步用真实样本目录复核 | 已修复待复验 |
| F-015 | 人工验收 | 通用影片卡默认应展示 `xxx-poster.jpg`，详情页主图默认应展示 `xxx-thumb.jpg`；当前两处图片选择策略不符合这个分工 | 当前列表卡片与详情页很可能复用了同一套资源选择逻辑，或者默认优先级顺序混乱，导致 `poster / thumb` 的使用场景没有按页面职责分开：列表卡应该优先封面图，详情页则应优先更适合竖向展示的缩略图 | 已为详情页补 `thumb` 读取端点与 `thumb -> poster -> 占位` 回退策略，列表卡继续固定使用 `poster`；下一步用真样本确认主图切换正确 | 已修复待复验 |
| F-016 | 人工验收 | 详情页“播放”按钮应移动到文件路径区域上方，并放大后在右侧内容区更居中地展示，当前主操作入口位置过低、存在感不足 | 当前详情页把播放按钮放在左侧图片区下方，与文件路径、来源页等信息分离，导致主操作不在用户阅读流主线上；布局层级更像附属动作，而不是页面核心 CTA | 已将播放按钮提升到右侧内容区主 CTA，并补禁用原因提示；下一步做真包布局复核和窄屏检查 | 已修复待复验 |
| F-017 | 人工验收 | 详情页“打开文件夹”按钮应调整到“文件路径”描述栏右侧，而不是继续放在左侧图片区下方 | 当前“打开文件夹”与它操作的目标信息（文件路径）分离太远，空间语义不一致；用户在查看路径时无法就近执行相关动作，导致信息和操作之间的映射偏弱 | 已将“打开文件夹”并入文件路径标题行右侧，并补窄屏换行样式；下一步结合长路径样本复核 | 已修复待复验 |
| F-018 | 人工验收 | 详情页“关联演员”应改为使用通用演员页面那套演员卡展示，至少包含头像和名字，而不是当前仅用一个弱化标签呈现 | 当前详情页里的演员区展示形式过轻，可能只是把演员作为普通标签渲染，没有复用演员列表已有的卡片组件或统一展示规范，导致信息密度和识别度都不够 | 已让详情接口返回演员头像路径，并复用 `ActorCard` 紧凑变体展示头像和名字；下一步用真实头像样本复核 | 已修复待复验 |
| F-019 | 人工验收 | 导航回退组件箭头后面的名字应表示“将回退到的页面或分组”，而不是当前内容标题；现在详情页把超长当前标题放到回退条里，信息明显超标 | 当前回退组件很可能直接复用了当前页面标题或当前实体名，没有把它当成“返回目标提示”来设计，因此在详情页这类长标题场景下会出现文案过长且语义反了的问题 | 已新增统一 `BackNavigation`，并把详情链路 label 语义改为“返回目标页/分组名”；下一步检查不同入口的回退文案是否都符合预期 | 已修复待复验 |
| F-020 | 人工验收 | 详情页信息区需要增加“首次入库时间”字段展示 | 底层存储已经有 `CreateDate / FirstScanDate` 这类可表达首次入库的信息，但当前详情页展示链路大概率只返回了发布日期、最后扫描等字段，没有把首次入库时间作为正式 DTO 字段透出到前端 | 已把 `firstAddedAt` 贯通到详情 DTO 和页面信息区，当前沿用 `FirstScanDate` 优先、`CreateDate` 回退口径；下一步校验真实样本显示格式 | 已修复待复验 |
| F-021 | 人工验收 | 对 `D:\\hx\\movie\\watched\\ReEncode\\SNOS-082` 点击“重新拉取元数据”后，本地 `nfo/poster/thumb` 已经生成，但通用影片卡和详情页仍未更新，依然显示缺图或旧状态 | 前端存在确定的失效漏洞：`BootstrapContext` 用 `invalidateQueries(\"video:\")` 试图刷新 `video:${id}` 查询，但当前缓存实现会把前缀再补一个冒号，实际不会命中详情 key；同时 `VideoService.BuildSidecarState(...)` 又依赖数据库路径推导 sidecar 目录，因此若前面发生重复整理，接口也可能继续算出旧状态 | 已修正查询失效前缀匹配逻辑，并通过 `F-014` 的路径幂等修复降低路径漂移风险；下一步用 `SNOS-082` 真样本复核列表卡和详情页是否随重抓同步刷新 | 已修复待复验 |
| F-022 | 人工验收 | 顶部搜索栏后的刷新按钮应紧邻排序按钮，而不是像现在这样与排序分散在两端，工具栏显得割裂 | 当前顶部工具栏很可能按左右两端分布或用了过大的拉伸间距，把“搜索/刷新”和“排序”拆成两个视觉组；但这几个控件本质上都属于同一查询工具条，分开太远会削弱关联性 | 已将刷新与排序收拢为右侧同一操作组，下一步结合真包检查不同宽度下的换行和触达体验 | 已修复待复验 |
| F-023 | 人工验收 | 演员页、喜欢页、库页顶部显示的总数量应去掉，改为在右下角使用设计图里的通用分页控件（`<`、`1 / 24`、`>`、`跳转`）承载分页信息与操作 | 当前列表页把“总数”单独放在顶部工具栏，分页信息和翻页交互没有统一沉到底部，导致同一类列表页面的信息架构不一致；总数占据顶部空间，也会和搜索/排序工具条互相竞争视觉层级 | 已移除相关页面顶部 `ResultSummary`，并把“跳转”收拢到底部分页控件；下一步做真包观感复核 | 已修复待复验 |
| F-024 | 人工验收 | 全软件图标应尽量统一为 `D:\\study\\Proj\\clash-verge` 那套扁平化图标风格；必要时可将需要的图标拷贝到本项目根目录新建的 `icon/` 目录中管理，同时清理本项目里现有散乱的图标资源和引用位置 | 当前项目图标风格混杂，存在 emoji、拟物和彩色程度不一致的问题，且图标资源与引用位置可能已经分散；而 `clash-verge` 已有一套较成熟的扁平化 SVG 资源（如 `src\\assets\\image\\itemicon\\*.svg`），可以作为统一视觉参考或局部资源来源 | 已新增统一 `AppIcon` 入口并替换主导航、上下文菜单、批量操作、Toast、异常浮层、空态等高频图标；下一步再评估是否需要额外迁入外部 SVG 资产 | 已修复待复验 |
| F-025 | 人工验收 | 详情页顶部返回按钮的文本仍然过长，希望固定表达“将返回到的页面标题或库标题”，不要出现当前内容文本 | 当前 `BackNavigation` 只消费历史项 `label`，没有按目标页兜底标题，也没有把“页面标题”和“实体展示名”分层；只要某个入口 label 不稳定，就会把错误或过长文本直接显示到返回按钮上 | 已补“显式 label 优先、目标页标题兜底”的解析逻辑，并收紧返回按钮宽度；下一步结合不同入口做真包语义复核 | 已修复待复验 |
| F-026 | 人工验收 | 右下角通用分页组件仍未完全落地，只有 1 页时也必须显示 `1 / 1` 和分页外观 | 通用 `Pagination` 组件本身支持单页显示，但各页面仍用 `totalCount > PAGE_SIZE` 条件判断把它拦掉，导致单页结果没有统一分页出口 | 已将相关页面分页条件改为“有结果就显示”；下一步做真包观感复核，确认 `1 / 1` 与空态边界都正常 | 已修复待复验 |
| F-027 | 人工验收 | 相比 Jellyfin + MetaTube 的库扫描体验，当前扫描后自动拉取元数据明显偏慢，希望查清原因并压缩主流程耗时 | 当前“扫描”任务实际串联了后续抓取；抓取内部又按影片、演员、图片下载多层串行执行，且下载没有复用 `HttpClient`，会叠加出明显慢感 | 已完成首轮性能收口：下载复用共享 `HttpClient`，演员补全与演员头像下载并发化，并增加同轮 actor 查询缓存；下一步用真实样本库复测整体耗时 | 已修复待复验 |

## 已修复待真包复核

| 编号 | 严重度 | 描述 | 状态 |
|------|--------|------|------|
| M-001 | P1-严重 | 便携包日志目录与壳层 / Worker 日志落点不统一 | 已修复，待真包复核 |
| M-002 | P1-严重 | MetaTube 重抓时 UTF-8 输出导致壳层误判 Worker 退出 | 已修复，待真包复核 |

## 后续修复方式

1. 先按问题簇补做复现、日志、代码定位，把 `状态` 从“待分析”推进到“待修复”。
2. 每完成一个可独立闭环的问题簇，就更新本文档状态，并按用户要求提交、推送代码。
3. 修复顺序优先考虑真实使用风险，再处理布局与视觉统一问题。
4. 人工问题修复阶段结束后，再回到 [auto-acceptance.md](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/auto-acceptance.md) 执行自动复验。
