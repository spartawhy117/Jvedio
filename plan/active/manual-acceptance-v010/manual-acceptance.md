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
| 列表页工具条 / 分页 | 排序回显、刷新与排序分组、统一底部分页控件 | `F-006` `F-022` `F-023` |
| 主题与浮层 | 深浅主题下的弹层 / 菜单适配 | `F-007` |
| 设置页结构收敛 | 图片设置、整理规则、播放器设置、默认排序、MetaTube 诊断 | `F-008` `F-009` `F-010` `F-011` `F-012` |
| 演员页 | 演员头像缺失 | `F-013` |
| 详情页信息与动作区 | 图片策略、播放 / 打开文件夹布局、演员卡、回退文案、首次入库时间 | `F-015` `F-016` `F-017` `F-018` `F-019` `F-020` |

## 问题簇优先级

说明：
- 先处理会影响真包启动体验、目录幂等和数据回刷一致性的高风险簇，再收敛设置、信息架构和视觉统一问题。
- 每个问题簇修复完成后，回写本文状态，再执行一轮针对性复验。

| 优先级 | 问题簇 | 关联问题 | 进入原因 |
|--------|--------|----------|----------|
| P0 | 启动 / 数据一致性 | `F-001` `F-014` `F-021` `M-001` `M-002` | 直接影响真包可用性、目录正确性和“重抓后界面是否可信”，不先收敛会污染后续人工复核样本 |
| P1 | 设置页结构收敛 | `F-008` `F-009` `F-010` `F-011` `F-012` | 涉及配置项删改、默认行为固化和设置入口语义统一，适合在数据链路稳定后成组处理 |
| P1 | 详情页信息架构 / 主动作区 | `F-015` `F-016` `F-017` `F-018` `F-019` `F-020` | 同页布局、字段和交互集中，适合一次性按详情页规范重排，避免重复改 CSS 和组件结构 |
| P2 | 列表页工具条 / 分页 / 状态表达 | `F-004` `F-005` `F-006` `F-022` `F-023` | 同属列表框架和查询工具条层，需在库状态定义清晰后统一调整 |
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

当前结论：
- 这一簇高度集中在 [VideoDetailPage.tsx](D:/study/Proj/Jvedio/tauri/src/pages/VideoDetailPage.tsx) 和路由元数据设计上，适合一次性做结构调整。
- 当前页面更多是“先能显示数据”，还没有真正按主操作优先级、信息邻接关系和共享组件复用来实现。

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

当前结论：
- 这一簇由两个子问题构成：库管理页的状态模型过粗，和查询工具条 / 分页组件的信息架构不统一。
- 真正的修复不会只是 CSS 微调，还需要补库级聚合字段和调整共享组件职责。

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

## 第五簇详细根因分析：侧栏 / 底栏 / 图标视觉统一

覆盖问题：
- `F-002` 影视库位置应贴着演员下方
- `F-003` “已连接”语义弱且缺少资源指标
- `F-024` 图标风格混乱，应统一扁平化

当前结论：
- 这一簇主要集中在主壳层 [App.tsx](D:/study/Proj/Jvedio/tauri/src/App.tsx) 和 [App.css](D:/study/Proj/Jvedio/tauri/src/App.css)。
- 当前主壳层实现明显偏“先把元素摆上去”，没有完成最终 IA 分组和图标体系收敛。

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
- 当前浮层不是完全没接主题，而是“部分组件用了 token，部分组件仍写死错误 token 或亮色 fallback”，导致深色模式下出现局部白板。

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
- 当前演员头像问题不是单层显示 bug，而是“抓取写缓存、演员信息入库、缓存命名、详情 / 列表读取”四层之间存在键不一致。

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
| F-002 | 人工验收 | 左侧“影视库”区块应紧贴“演员”导航项下方显示，但当前被放到了侧栏更靠下的位置，与设计图预期不一致 | 当前侧栏很可能在导航区与库区之间插入了多余留白、拉伸占位或错误的垂直分布策略，导致“影视库”被向下推离导航区，而不是作为同一信息组的延续内容紧跟在“演员”下方 | 后续对照正式 UI 文档与当前侧栏 DOM / 样式结构，确认“演员”与“影视库”之间的目标间距后，再检查容器 `justify`、间隔 token 和自适应高度逻辑 | 分析中 |
| F-003 | 人工验收 | 左下角仅显示“已连接”，语义不清；希望右侧同步展示当前应用的 CPU、内存等运行指标，类似资源面板 | 当前底栏状态区只承载 Worker/SSE 连接状态，文案来自连接态枚举，对用户缺少可理解的业务含义；同时壳层尚未接入应用进程资源采样，因此没有 CPU / 内存等实时指标可展示 | 后续先明确底栏信息架构：保留但重命名连接状态，还是改为更可理解的运行状态提示；再评估通过 Tauri/Rust 或 Worker 采集当前应用与子进程资源占用，并确认刷新频率、性能开销和展示样式 | 分析中 |
| F-004 | 人工验收 | 点击“扫描”后，希望把目录整理与元数据获取的总体完成度以百分比展示出来；当库内内容已全部扫描且数据完整时，扫描按钮应切换为红色提示态，表达“当前无需继续扫描” | 当前库管理页对扫描状态的表达过于粗，只区分 `扫描中 / 已同步`，行内动作也只有固定“扫描”按钮；前端缺少分阶段进度聚合，后端返回结构里看起来也没有面向库级“整理 + 搜刮完成率 / 完整率”的直接字段，因此无法准确驱动百分比和“无需继续扫描”的按钮状态 | 后续先拆清业务语义：百分比是按文件数、任务数还是阶段权重计算；“全部正常”是指已扫描且搜刮成功，还是允许失败样本进入稳定态。然后再检查 Worker 任务事件、库 DTO 和行按钮状态机是否需要补字段与新状态颜色规范 | 分析中 |
| F-005 | 人工验收 | 库管理表格中的“最近扫描”和“状态”两列不够有用，希望改成“已扫描数量”，明确表示当前库内已完成全部同步且数据成功的影片数量 | 当前列表列定义偏向任务过程视角，用 `lastScanAt + synced/scanning` 描述最近动作，但用户更关心库内容完成度；同时库 DTO 目前暴露的是 `videoCount / lastScanAt / hasRunningTask` 这类字段，缺少“已完整同步成功影片数”的直接统计，所以界面只能展示时间和粗状态 | 后续先定义“已扫描数量”的口径，是仅统计 `ScrapeStatus=full` 且 sidecar 完整的影片，还是还要包含目录整理完成但搜刮失败的稳定样本；随后检查库列表接口、聚合查询和表头设计是否需要一起调整 | 分析中 |
| F-006 | 人工验收 | 排序通用组件触发按钮只显示固定“排序”，没有直接展示当前选中的排序规则名称，使用时不够直观 | 当前排序组件大概率只把“排序”当作静态入口文案，选中值只在下拉列表内部高亮，没有把当前 `value` 对应的 `label` 回显到触发按钮上；这会让用户在关闭菜单后失去当前排序上下文 | 后续检查通用排序组件的 props 设计与各页面接入方式，确认是否统一改为“按钮主文案 = 当前规则名称”，同时保留图标 / 下拉箭头和移动端截断策略 | 分析中 |
| F-007 | 人工验收 | 弹窗 / 菜单类对话层没有随深色 / 浅色主题正确适配，当前在深色页面里仍出现明显浅色面板，视觉割裂 | 当前弹层组件很可能还写死了浅色背景、边框或阴影，或者没有完全接入统一主题 token，导致页面级主题切换已生效，但浮层、右键菜单、确认框等覆盖层仍沿用默认亮色样式 | 后续检查共享弹层组件、右键菜单和对话框样式来源，确认是否统一改为消费主题变量，并补一轮深浅主题下的对比回归，避免只修一个菜单遗漏其他弹层 | 分析中 |
| F-008 | 人工验收 | 图片设置中的“海报显示”两项和“缓存策略”控制都没有保留必要，希望删除对应设置项与逻辑；海报固定为本地优先，本地没有则显示空占位图；缓存默认不限制 | 当前图片设置仍暴露了 `posterPriority / cacheSizeLimitMb / autoCleanExpiredCache` 这类可配置项，说明前后端还按“用户可调策略”设计；但当前产品决策已经收敛为单一路径，继续保留这些开关只会增加理解和维护成本 | 后续按“删除设置入口 + 固化默认行为 + 清理配置持久化字段 + 回归占位图与缓存行为”处理，并确认历史配置文件里遗留字段不会影响升级后的运行结果 | 分析中 |
| F-009 | 人工验收 | “扫描与导入”设置中的“整理规则”不再需要保留，希望删除对应 UI 和实现逻辑 | 当前扫描设置仍把整理模式作为可选配置项，说明前后端还支持多种整理策略；但如果产品决定不再让用户控制整理规则，这部分配置会变成无效复杂度，并增加扫描行为理解成本 | 后续按“移除设置项 + 固化默认整理行为 + 清理配置读写与兼容逻辑”处理，同时确认现有扫描导入链路在删掉该选项后不会改变已接受的整理结果 | 分析中 |
| F-010 | 人工验收 | 设置侧栏中的“网络”分组名称不准确，希望改为“播放器设置”，但分组里的具体内容暂不调整 | 当前该分组实际承载的是播放器路径与回退策略，而不是网络配置，说明导航命名仍沿用旧分类，已和页面内容脱节 | 后续检查设置页分组 key、文案资源和相关文档，把“网络”统一重命名为“播放器设置”，同时确认不影响已有保存逻辑和自动化用例定位 | 分析中 |
| F-011 | 人工验收 | “库”设置中的“默认排序”不再需要保留，希望删除对应 UI 和逻辑；列表默认按最近加入库时间降序排序 | 当前设置与排序链路仍围绕 `defaultSortBy / defaultSortOrder` 工作，且支持的默认字段是 `releaseDate / title / lastPlayedAt / lastScanAt`；底层存储里虽然已经有 `metadata.CreateDate / FirstScanDate` 这类可用于表达入库时间的数据，但当前视频 DTO 与排序接口没有把“入库时间”作为正式排序字段贯通出来 | 后续按两步处理：先确认“最近加入库时间”最终以 `CreateDate` 还是 `FirstScanDate` 作为唯一口径；再删除默认排序设置项，并把库内默认排序固化为该字段的降序，同时补排序接口、DTO 映射和兼容逻辑 | 分析中 |
| F-012 | 人工验收 | MetaTube 的“运行诊断”点击后无明显反应；当前界面也没有让用户填写抓取内容，因此这里不应表现成完整抓取诊断，而应只做服务连通性测试并明确反馈结果 | 当前诊断入口的命名、返回预期和实际能力不一致，用户会自然理解为“模拟抓取/完整验证”，但界面既没有输入样本内容，也没有清晰的结果反馈；这使得按钮表现像失效，而不是“只做连通性检查” | 后续把诊断能力收敛为纯连通性测试，检查按钮 loading、成功/失败反馈文案和结果展示区域，同时避免要求用户提供额外抓取参数 | 分析中 |
| F-013 | 人工验收 | 抓取完成后，演员分类页里没有显示对应演员头像，仍然是默认占位图 | 当前演员链路可能只完成了演员名称关联，没有把头像 URL 正确落到本地缓存或映射到演员列表 DTO；也可能是前端演员卡片未正确解析/拼接头像资源路径，导致即使后台已有头像也没有展示出来 | 后续检查 MetaTube 抓取结果里的演员头像字段、Worker 的演员缓存写入流程，以及演员列表页的图片 URL 生成逻辑，确认问题出在“没抓到 / 没落盘 / 没返回 / 没显示”哪一层 | 分析中 |
| F-014 | 人工验收 | 对已抓取影片执行右键扫描或单项“重新获取元数据”后，会再次创建同名子目录并生成重复 sidecar；当前目录 `D:\\hx\\movie\\watched\\ReEncode\\OMG-019` 已出现根目录一套 sidecar + 子目录 `OMG-019\\OMG-019` 内另一套 sidecar 和视频文件的重复结构 | `LibraryScanService.TryOrganize(...)` 把目标目录固定算成 `parentDir\\VID`，对“已经在 `VID` 目录内”的样本会继续算出 `VID\\VID`；同时 `LibraryScrapeService.LoadCandidates(...)` 在单项重抓时绕过 `NeedsScrape` 与 `ScrapeStatus` 检查，导致重复写 sidecar | 已补“父目录名已匹配 VID 时视为已整理”判定，并新增回归测试锁定不再创建 `VID\\VID` 目录；下一步用真实样本目录复核 | 已修复待复验 |
| F-015 | 人工验收 | 通用影片卡默认应展示 `xxx-poster.jpg`，详情页主图默认应展示 `xxx-thumb.jpg`；当前两处图片选择策略不符合这个分工 | 当前列表卡片与详情页很可能复用了同一套资源选择逻辑，或者默认优先级顺序混乱，导致 `poster / thumb` 的使用场景没有按页面职责分开：列表卡应该优先封面图，详情页则应优先更适合竖向展示的缩略图 | 后续检查前端视频卡组件、详情页图片组件以及后端返回的 `HasPoster / HasThumb` 与本地资源 URL 生成规则，确认分别固化为“列表=poster 优先”“详情=thumb 优先”，并补占位图回退策略 | 分析中 |
| F-016 | 人工验收 | 详情页“播放”按钮应移动到文件路径区域上方，并放大后在右侧内容区更居中地展示，当前主操作入口位置过低、存在感不足 | 当前详情页把播放按钮放在左侧图片区下方，与文件路径、来源页等信息分离，导致主操作不在用户阅读流主线上；布局层级更像附属动作，而不是页面核心 CTA | 后续对照详情页布局结构，把“播放”提升到右侧信息区主操作位，确认与“打开文件夹”等次级动作的主次关系，同时检查桌面宽度和窄屏下的换行与居中表现 | 分析中 |
| F-017 | 人工验收 | 详情页“打开文件夹”按钮应调整到“文件路径”描述栏右侧，而不是继续放在左侧图片区下方 | 当前“打开文件夹”与它操作的目标信息（文件路径）分离太远，空间语义不一致；用户在查看路径时无法就近执行相关动作，导致信息和操作之间的映射偏弱 | 后续在详情页文件路径行内或同一信息块右侧放置“打开文件夹”动作，并检查长路径截断、按钮宽度和窄屏换行时的布局稳定性 | 分析中 |
| F-018 | 人工验收 | 详情页“关联演员”应改为使用通用演员页面那套演员卡展示，至少包含头像和名字，而不是当前仅用一个弱化标签呈现 | 当前详情页里的演员区展示形式过轻，可能只是把演员作为普通标签渲染，没有复用演员列表已有的卡片组件或统一展示规范，导致信息密度和识别度都不够 | 后续检查演员页通用卡组件是否可直接复用到详情页关联演员区，并确认缩略尺寸、点击跳转和无头像占位表现，避免再次做一套独立样式 | 分析中 |
| F-019 | 人工验收 | 导航回退组件箭头后面的名字应表示“将回退到的页面或分组”，而不是当前内容标题；现在详情页把超长当前标题放到回退条里，信息明显超标 | 当前回退组件很可能直接复用了当前页面标题或当前实体名，没有把它当成“返回目标提示”来设计，因此在详情页这类长标题场景下会出现文案过长且语义反了的问题 | 后续检查路由返回栈与回退组件的 label 来源，改为优先展示上一层页面/分组名称，并补长文案截断与无返回标签时的降级策略 | 分析中 |
| F-020 | 人工验收 | 详情页信息区需要增加“首次入库时间”字段展示 | 底层存储已经有 `CreateDate / FirstScanDate` 这类可表达首次入库的信息，但当前详情页展示链路大概率只返回了发布日期、最后扫描等字段，没有把首次入库时间作为正式 DTO 字段透出到前端 | 后续先统一“首次入库时间”的口径，确认是用 `CreateDate` 还是 `FirstScanDate`，再补详情接口映射、前端字段展示和时间格式化规则 | 分析中 |
| F-021 | 人工验收 | 对 `D:\\hx\\movie\\watched\\ReEncode\\SNOS-082` 点击“重新拉取元数据”后，本地 `nfo/poster/thumb` 已经生成，但通用影片卡和详情页仍未更新，依然显示缺图或旧状态 | 前端存在确定的失效漏洞：`BootstrapContext` 用 `invalidateQueries(\"video:\")` 试图刷新 `video:${id}` 查询，但当前缓存实现会把前缀再补一个冒号，实际不会命中详情 key；同时 `VideoService.BuildSidecarState(...)` 又依赖数据库路径推导 sidecar 目录，因此若前面发生重复整理，接口也可能继续算出旧状态 | 已修正查询失效前缀匹配逻辑，并通过 `F-014` 的路径幂等修复降低路径漂移风险；下一步用 `SNOS-082` 真样本复核列表卡和详情页是否随重抓同步刷新 | 已修复待复验 |
| F-022 | 人工验收 | 顶部搜索栏后的刷新按钮应紧邻排序按钮，而不是像现在这样与排序分散在两端，工具栏显得割裂 | 当前顶部工具栏很可能按左右两端分布或用了过大的拉伸间距，把“搜索/刷新”和“排序”拆成两个视觉组；但这几个控件本质上都属于同一查询工具条，分开太远会削弱关联性 | 后续检查查询工具栏布局容器和间距策略，把刷新与排序收拢为同一操作组，同时兼顾结果数显示的位置和不同宽度下的换行规则 | 分析中 |
| F-023 | 人工验收 | 演员页、喜欢页、库页顶部显示的总数量应去掉，改为在右下角使用设计图里的通用分页控件（`<`、`1 / 24`、`>`、`跳转`）承载分页信息与操作 | 当前列表页把“总数”单独放在顶部工具栏，分页信息和翻页交互没有统一沉到底部，导致同一类列表页面的信息架构不一致；总数占据顶部空间，也会和搜索/排序工具条互相竞争视觉层级 | 后续检查演员页、喜欢页、库页的列表骨架与现有分页实现，统一替换为设计图这套右下角通用分页控件，并把页码、总页数和跳转能力都收敛进去，同时移除顶部独立总数字样 | 分析中 |
| F-024 | 人工验收 | 全软件图标应尽量统一为 `D:\\study\\Proj\\clash-verge` 那套扁平化图标风格；必要时可将需要的图标拷贝到本项目根目录新建的 `icon/` 目录中管理，同时清理本项目里现有散乱的图标资源和引用位置 | 当前项目图标风格混杂，存在 emoji、拟物和彩色程度不一致的问题，且图标资源与引用位置可能已经分散；而 `clash-verge` 已有一套较成熟的扁平化 SVG 资源（如 `src\\assets\\image\\itemicon\\*.svg`），可以作为统一视觉参考或局部资源来源 | 后续先梳理当前主导航、状态、动作区图标清单以及仓库内已有散乱图标资源，定义“优先复用 / 必要时拷贝到仓库 `icon/` 目录”的规则，并同步清理旧资源、旧引用与来源备注，避免一边替换一边继续混用 emoji 和历史图标 | 分析中 |

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
