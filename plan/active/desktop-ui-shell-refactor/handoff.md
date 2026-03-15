## Feature Goal

- 将当前唯一 active feature 正式切换为 `Electron 前端 + C# Worker + localhost API` 路线，并先完成文档体系与进度跟踪体系落地。

## Locked Decisions

- 继续使用 `desktop-ui-shell-refactor` 作为唯一 active feature slug。
- 文档冻结阶段已完成，当前已进入阶段 C 的代码实现。
- 前端参考源改为 `QiaoKes/fntv-electron`，但只参考桌面壳、导航、页面组织和桌面交互方式。
- 后端继续复用现有 C# 能力，不做远程服务化。
- 第一阶段播放能力继续沿用外部播放器/系统默认播放器模式。
- `doc/UI/old/` 保留为旧界面基线，`doc/UI/new/` 视为 WPF 线稿历史参考。

## Current Phase

- 第二批阶段 `D`、第三批“影片展示和播放”、第四批“设置页面”第一轮最小闭环和设置消费扩展均已完成实现与验证；演员页当前也已完成第二轮增强收口：Actors 路由壳、列表结果集、筛选排序、关联影片抽屉、演员详情头部消费、头像真实路径解析 / 占位策略、结果分页和扩展排序均已接通。下一步建议转入演员详情上下钻或设置页第二轮增强。

## Latest Progress

- 已重写 active feature 的核心规划文档为 Electron 路线。
- 已在 `doc/UI/desktop-ui-shell-refactor/electron/` 下建立新的稳定规格层。
- 已在 `doc/UI/desktop-ui-shell-refactor/reference/` 下补充 `fntv-electron` 参考说明。
- 已拉取本地参考仓库 `D:\study\Proj\fntv-electron`。
- 已完成基于真实源码的首轮结构审计，并新增 `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-audit.md`。
- 已确认 `fntv-electron` 更适合作为“桌面壳 + preload 注入 + 本地播放器/代理增强”参考，而不是 Jvedio 页面实现模板。
- 已拉取本地参考仓库 `D:\study\Proj\jellyfin-web`。
- 已完成 `jellyfin-web` 首轮结构审计，并新增 `doc/UI/desktop-ui-shell-refactor/reference/jellyfin-web-audit.md`。
- 已产出 `doc/UI/desktop-ui-shell-refactor/electron/frontend-page-rebuild-plan.md`，明确 `fntv-electron` 与 `jellyfin-web` 的双参考分工。
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md`，把 renderer 目录推进到文件级骨架和 feature 边界。
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/worker-api-spec.md`，细化 Worker API 的请求/响应、任务模型、错误流和 SSE 订阅模型。
- 已完成五个页面文档与 renderer 组件边界对齐，页面规格已补齐 section、页面状态、API 依赖和分批实现边界。
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/contracts-naming.md`，冻结 `bootstrap / libraries / videos / actors / settings / tasks` 六组 contracts、事件、任务 payload 和错误码前缀。
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/home-mvp-implementation-entry.md`，冻结阶段 C 的首批工程范围、落地顺序、done 定义和验证顺序。
- 已更新 `doc/UI/desktop-ui-shell-refactor/electron/backend-bridge.md` 与 `README.md`，将桥接摘要和详细规格分层整理。
- 现有根目录 UI 文档已标注 Electron 规格为当前主入口，旧 WPF 线稿不再作为默认实施路线。
- 已新增 `Jvedio-WPF/Jvedio.Contracts`，落地 `Common / App / Libraries / Tasks` 四组首批 DTO 与事件 contracts。
- 已新增 `Jvedio-WPF/Jvedio.Worker`，落地 localhost 宿主骨架、健康检查端点和 `JVEDIO_WORKER_READY` 启动信号。
- 已新增根目录 `electron/` 工程骨架，落地 `main / preload / renderer` 三段最小启动链路，并通过 IPC 向 renderer 注入 Worker base URL。
- 已完成 `Release` 构建、`npm run build` 和 `npm run smoke`，确认 Electron 能拉起 Worker 并完成 ready 健康探测。
- 已完成 `C-2` Worker 同步接口闭环：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
- Worker 已复用 WPF Release 数据目录，当前通过 `JVEDIO_APP_BASE_DIR` 与路径探测共享 `app_datas.sqlite` / `app_configs.sqlite`。
- 已完成接口级验证：
  - `bootstrap / libraries / create / delete / tasks` 全部可调用
  - 创建测试库后已成功回删
  - sqlite 当前状态已回到单库初始状态
- `electron/` 再次通过 `npm run smoke`，确认 Electron 主进程仍可拉起 Worker 并等待 ready 健康探测。
- 已完成 `C-3` renderer Home 闭环：
  - 新增 renderer 侧 `api client / router / library nav / home controller` 最小实现
  - Home 已能加载 `bootstrap / libraries / tasks summary`
  - 新建库 / 删除库已接入 UI 对话框与反馈提示
  - 左侧导航已按真实库清单动态同步
  - `#/libraries/{libraryId}` 基础路由壳已打通
- 已完成 `C-3` 工程级验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `Jvedio-WPF/Jvedio.sln` `Release` 构建
- 已完成 `C-3` 自动聚焦回归：
  - 新增 `electron/` `npm run regression:c3`
  - 使用临时 sqlite 副本自动验证 Home 首屏加载、新建库、删除库、左侧导航同步、库路由跳转
  - 首轮回归发现 renderer 原生 ES module 缺失 `.js` 扩展导致页面空白，已修复并通过二次回归
- 已完成 `C-4` 事件与错误收口：
  - Worker 新增 `GET /api/events` SSE 端点与事件流 broker
  - Worker 已发布 `worker.ready`、`library.changed`、`task.summary.changed`
  - Home renderer 已建立全局单 `EventSource` 连接，并消费库变更与任务摘要更新
  - `apiClient` 已将 Worker 未就绪、网络失败与请求失败统一映射为更明确的用户提示
  - SSE 断开时已展示 warning banner，避免静默失联
- 已完成阶段 C 聚焦回归增强：
  - `electron/` `npm run regression:c3`
  - 新增校验 `library.changed` 事件驱动同步
  - 新增校验任务摘要刷新
  - 新增校验 Worker 未就绪错误反馈
- 已完成最新工程验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:c3`
  - `Jvedio-WPF/Jvedio.sln` `Release` 构建
- 已完成 `阶段 D` 首轮代码落地：
  - Worker 新增 `PUT /api/libraries/{libraryId}`、`POST /api/libraries/{libraryId}/scan`、`POST /api/libraries/{libraryId}/scrape`、`GET /api/tasks/{taskId}`
  - Worker 已新增内存任务注册表、扫描编排服务、MetaTube 抓取服务、sidecar/NFO/演员头像写出能力
  - Library 页面已从路由壳升级为库工作台，支持扫描目录保存、触发扫描、触发抓取、查看当前库任务状态
  - 已新增 `electron/` `npm run regression:d` 与 `electron/main/testing/dRegression.ts`，用于阶段 D 的聚焦回归
- 已完成阶段 D 当前静态验证：
  - `dotnet build Jvedio-WPF/Jvedio.Worker/Jvedio.Worker.csproj`
  - `electron/` `npm run build`
- 已完成第三批“影片展示和播放”：
  - Worker 新增 `GET /api/libraries/{libraryId}/videos`
  - Worker 新增 `GET /api/videos/{videoId}` 与 `POST /api/videos/{videoId}/play`
  - Worker 新增 `VideoService`，支持库内影片查询、详情、外部播放器调用和播放写回
  - Library 页面已支持影片结果集展示、关键字筛选、排序、刷新、详情跳转
  - Video Detail 路由壳已接通，并可触发基础播放调用
  - 已新增 `electron/` `npm run regression:batch3` 与 `electron/main/testing/batch3Regression.ts`
- 已完成最新验证：
  - `dotnet build Jvedio-WPF/Jvedio.Worker/Jvedio.Worker.csproj -c Release`
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:d`
  - `electron/` `npm run regression:batch3`
- 已完成第四批“设置页面”第一轮最小闭环：
  - Worker 新增 `GET /api/settings` 与 `PUT /api/settings`
  - Worker 新增 `SettingsService`，冻结首轮真落库项：
    - `General.CurrentLanguage`
    - `General.Debug`
    - `MetaTube.ServerUrl`
    - `MetaTube.RequestTimeoutSeconds`
    - `Playback.PlayerPath`
    - `Playback.UseSystemDefaultFallback`
  - Electron renderer 已新增 Settings 路由壳、分组切换、表单态、保存反馈与恢复默认
  - 播放链已消费 `Playback.UseSystemDefaultFallback`
  - 已新增 `electron/` `npm run regression:settings`
- 已完成设置线补充收口：
  - Worker 已新增 `POST /api/settings/meta-tube/diagnostics`
  - Settings 页已新增 MetaTube diagnostics 面板，可直接诊断当前表单中的服务地址与超时值
  - renderer 已消费 `settings.changed`，外部设置更新时可同步快照并保留当前未保存草稿
  - `electron/` `npm run regression:settings` 已覆盖读取、保存、MetaTube diagnostics、`settings.changed` 和恢复默认
- 已完成演员线 Worker 查询接口第一轮：
  - Worker 已新增 `GET /api/actors`、`GET /api/actors/{actorId}`、`GET /api/actors/{actorId}/videos`
  - 已新增 `Jvedio.Contracts/Actors` 下的演员列表、详情、关联影片 DTO
  - 已新增 `Jvedio.Worker/Services/ActorService.cs` 与 `Controllers/ActorsController.cs`
  - 当前 `GET /api/actors` 已支持关键字筛选、分页、详情读取、关联影片查询，以及 `name / actorId / videoCount / libraryCount / webType / lastPlayedAt / lastScanAt` 排序
- 已完成演员页 renderer 第二轮闭环：
  - renderer 已新增 `#/actors` 路由、Actors 导航入口与查询参数同步
  - Actors 页已支持演员结果集展示、关键字筛选、排序、刷新和关联影片抽屉
  - Actors 抽屉已消费 `GET /api/actors/{actorId}` 与 `GET /api/actors/{actorId}/videos`，展示演员头部信息、关联库和影片列表
  - Worker 已补齐演员头像真实路径解析：优先 `actor_info.ImageUrl`，再回退 `data/<user>/cache/actor-avatar/<ActorID>.*` 与演员名哈希缓存
  - renderer 已补齐演员头像占位策略：有头像显示本地图片，无头像显示 initials 占位块
  - Actors 页已补齐结果分页、页大小切换、页码摘要、上一页/下一页翻页，以及 `actorId / webType` 扩展排序项
  - 已新增 `electron/` `npm run regression:actors` 与 `electron/main/testing/actorsRegression.ts`
  - `regression:actors` 当前通过扫描三部样例影片后向隔离 sqlite 副本注入演员映射和头像缓存，稳定覆盖路由壳、结果集、头像 / 占位策略、筛选排序、分页翻页、扩展排序和抽屉详情消费

## Next Recommended Work

1. 继续收口演员页：
   - 评估是否增加演员详情到影片详情的上下钻增强，以及是否补独立演员详情页
   - 若要继续提升完整度，可再补演员详情专页而不只停留在抽屉
2. 若切回设置线做增强：
   - 评估补 General 主题项、Data 只读信息区
   - 再决定是否扩为完整 Settings 分组

## Validation Steps

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立描述当前状态并作为新会话入口。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档结构完整。
- `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-audit.md` 存在且能独立说明借鉴边界。
- `doc/UI/desktop-ui-shell-refactor/reference/jellyfin-web-audit.md` 存在且能独立说明页面实现参考边界。
- `doc/UI/desktop-ui-shell-refactor/electron/frontend-page-rebuild-plan.md` 存在且能直接指导页面落地拆分。
- `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md` 存在且能直接指导 renderer 建目录。
- `doc/UI/desktop-ui-shell-refactor/electron/worker-api-spec.md` 存在且能直接指导 contracts 冻结。
- `doc/UI/desktop-ui-shell-refactor/electron/contracts-naming.md` 存在且能直接指导 `Jvedio.Contracts` 建目录。
- `doc/UI/desktop-ui-shell-refactor/electron/home-mvp-implementation-entry.md` 存在且能直接指导阶段 C 开工。
- 阶段 C 已拆为 `C-1` 到 `C-4`，并具备逐步测试策略。
- Release 构建通过。
- `Jvedio.Contracts` 与 `Jvedio.Worker` 已加入 `Jvedio-WPF/Jvedio.sln` 并可成功构建。
- `electron/` 已可通过 `npm run build` 完成 TypeScript 构建。
- `npm run smoke` 已验证 Electron 主进程可以拉起 `Jvedio.Worker` 并等待 ready 健康探测通过。
- Worker 接口人工验证通过：`GET /api/app/bootstrap`、`GET /api/libraries`、`POST /api/libraries`、`DELETE /api/libraries/{libraryId}`、`GET /api/tasks`。
- 测试库创建后已成功回删，`app_databases` 当前恢复为单条 `Jav` 记录。
- `C-3` renderer Home 闭环代码已落地，可通过 Home 页加载、库列表渲染、新建/删除对话框和 Library 路由壳串起最小 UI 链路。
- `Jvedio-WPF/Jvedio.sln` 已再次通过 `Release` 构建。
- `electron/` `npm run regression:c3` 已通过，覆盖 Home 首屏加载、新建库、删除库、左侧导航同步、库路由跳转、`library.changed` 事件驱动同步、任务摘要刷新与 Worker 未就绪错误反馈。
- `electron/` `npm run regression:d` 已通过，覆盖：
  - 库默认扫描目录读取与保存
  - 扫描触发
  - 扫描任务状态回传
  - MetaTube 抓取与 sidecar 输出
- `electron/` `npm run regression:batch3` 已通过，覆盖：
  - 库内影片结果集展示
  - 基础筛选、排序、刷新
  - 视频详情路由壳
  - 播放调用
  - 播放写回
- `electron/` `npm run regression:settings` 已通过，覆盖：
  - 设置读取
  - 设置保存
  - 恢复默认
- `Jvedio.Worker` 已补齐 `GET /api/actors`、`GET /api/actors/{actorId}`、`GET /api/actors/{actorId}/videos`，并完成 Release 构建。
- `electron/` `npm run regression:actors` 已通过，覆盖：
  - Actors 路由壳
  - 演员结果集展示
  - 关键字筛选、扩展排序与分页翻页
  - 关联影片抽屉
  - 演员详情头部消费

## Blockers And Caveats

- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须以此为主业务来源。
- 当前根目录旧 UI 文档仍保留，用于历史参考；实施时必须优先以 `electron/` 子目录为准。
- `fntv-electron` 的真实实现以远端页面加载和 preload 注入为主，不能误当作 Jvedio 本地页面工程模板。
- `jellyfin-web` 为大型新旧并存前端，不可整体照搬，只能按页面结构、hook 分层和视图状态建模做定向借鉴。
- Worker 端口是否固定值仍未最终冻结；renderer 侧应继续通过 preload 抽象 base URL。
- 第一阶段任务能力是否单独做任务中心页面仍保留为产品开放项。
