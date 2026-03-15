# Home MVP 实现入口

## 目标

- 为阶段 C 的第一批实现提供直接开工入口。
- 把 Electron main / preload / renderer / Worker / Contracts 的首批范围固定下来。
- 约束本轮实现只做 Home 页库管理最小闭环，不提前扩散到扫描、抓取和详情页。

## 本批闭环定义

### 要完成的用户路径

1. 启动桌面壳后，Home 页能加载库列表与任务摘要。
2. 用户可以新建库，并在 Home 列表与左侧导航中立即看到结果。
3. 用户可以删除库，并在 Home 列表与左侧导航中立即看到结果。
4. 用户点击库后，能进入对应的 Library 路由壳。
5. 错误场景下，前端能展示结构化错误提示。

### 明确不做

- 扫描
- 抓取
- 扫描路径编辑细节
- 影片详情
- Settings 接线
- 内嵌播放器
- 任务中心独立页面

## 首批工程范围

### Electron main

建议目录：

```text
electron/
  main/
    app/
      bootstrap.ts
      createMainWindow.ts
      appLifecycle.ts
    worker/
      workerProcess.ts
      workerHealth.ts
    shell/
      tray.ts
      windowState.ts
```

本批职责：

- 启动应用主窗口
- 管理窗口生命周期
- 后台拉起 Worker 宿主
- 获取 Worker base URL 并传给 preload
- 处理应用退出时的 Worker 清理

本批不做：

- 托盘高级能力
- 自动更新
- 多窗口
- 复杂窗口偏好持久化

### Electron preload

建议目录：

```text
electron/
  preload/
    index.ts
    bridge/
      appBridge.ts
      workerBridge.ts
```

本批职责：

- 仅暴露 renderer 需要的最小桥接：
  - `getWorkerBaseUrl()`
  - `getAppVersion()`
- 不注入业务 DOM
- 不承接业务请求转发

### renderer

本批真正落地的目录范围：

```text
renderer/src/
  app/
    bootstrap/
    layout/
    navigation/
    providers/
    routes/
  api/
    client/
    app/
    libraries/
    tasks/
  features/
    home/
    tasks/
  components/
    shell/
    entities/
    feedback/
    tasks/
  hooks/
  types/
  utils/
```

本批职责：

- 建立路由壳与 `AppShell`
- Home 页展示库列表与任务摘要
- 新建库 / 删除库对话框
- 左侧动态库导航
- 统一错误状态和空状态
- 建立全局单 SSE 连接壳，但本批只消费 Home 需要的事件

本批不做：

- Actors / Video Detail / Settings 页接线
- Library 页完整结果集
- 全量任务抽屉

### Worker 宿主

建议首批工程方向：

```text
Jvedio.Worker/
  Hosting/
  Controllers/
  Services/
  Contracts/
```

本批接口范围：

- `GET /api/app/bootstrap`
- `GET /api/libraries`
- `POST /api/libraries`
- `DELETE /api/libraries/{libraryId}`
- `GET /api/tasks`
- `GET /api/events`

本批职责：

- 提供 Home 所需读取能力
- 提供新建 / 删除库能力
- 输出库变更事件
- 输出任务摘要事件

本批不做：

- 扫描任务执行
- 抓取任务执行
- 视频详情查询
- Settings 写回

### Jvedio.Contracts

本批优先落地文件：

```text
Jvedio.Contracts/
  Common/
    ApiResponse.cs
    ApiErrorDto.cs
    PagedResult.cs
  App/
    GetBootstrapResponse.cs
    AppInfoDto.cs
    ShellBootstrapDto.cs
    WorkerStatusDto.cs
  Libraries/
    GetLibrariesResponse.cs
    LibraryListItemDto.cs
    CreateLibraryRequest.cs
    CreateLibraryResponse.cs
    DeleteLibraryResponse.cs
    LibraryChangedEvent.cs
  Tasks/
    GetTasksResponse.cs
    TaskSummaryDto.cs
    TaskCreatedEvent.cs
    TaskCompletedEvent.cs
    TaskFailedEvent.cs
```

## 首批落地顺序

### 顺序 1：Contracts 先落地

- 先建 `Jvedio.Contracts`
- 落首批 DTO：
  - bootstrap
  - libraries
  - tasks
- 先不建扫描、抓取、视频详情 contracts

原因：

- 这样 renderer 和 Worker 能围绕同一套 DTO 开工
- 最容易控制命名漂移

### 顺序 2：Worker 最小接口

- 先完成：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
- 再补：
  - `GET /api/events`

原因：

- 先把同步读写打通，再接事件流，调试成本更低

### 顺序 3：Electron 壳层

- 先建：
  - main window
  - preload bridge
  - worker process lifecycle
- 再把 base URL 注入 renderer

原因：

- renderer 不应自己猜 Worker 地址

### 顺序 4：renderer Home MVP

- 先建：
  - `AppShell`
  - `HomePage`
  - `useHomePageData`
  - `useLibraryNavItems`
- 再建：
  - `CreateLibraryDialog`
  - `DeleteLibraryDialog`
  - `RecentTaskList`

原因：

- 先把读路径跑通，再补写路径和对话框

## 阶段 C 分步

### C-1：Contracts 与工程骨架

- 先建：
  - `Jvedio.Contracts`
  - `Jvedio.Worker`
  - Electron main / preload / renderer 最小骨架
- 本步结束要求：
  - 工程能编译
  - Electron 能拉起 Worker

#### C-1 当前结果

- 已新增：
  - `Jvedio-WPF/Jvedio.Contracts`
  - `Jvedio-WPF/Jvedio.Worker`
  - 根目录 `electron/`
- 已完成验证：
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`
  - `npm run build`
  - `npm run smoke`
- 当前结论：
  - `C-1` 已完成，可进入 `C-2` Worker 同步接口实现。

### C-2：Worker 同步接口

- 先接：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
- 本步结束要求：
  - 接口可单独验证
  - create / delete 持久化正确

#### C-2 当前结果

- 已落地：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
- 已补齐：
  - 统一 envelope 的时间戳与结构化错误字段
  - Worker 侧 sqlite 读写服务
  - 共享 WPF Release 数据目录的路径解析
  - Electron 启动 Worker 时的 `JVEDIO_APP_BASE_DIR` 注入
- 已完成验证：
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`
  - Worker 接口人工验证
  - 创建测试库后已成功回删，sqlite 恢复原状
  - `npm run smoke`
- 当前结论：
  - `C-2` 已完成代码落地与工程级验证。
  - 下一步进入 `C-3`。

### C-3：renderer Home 闭环

- 先接：
  - `AppShell`
  - `HomePage`
  - `useHomePageData`
  - `CreateLibraryDialog`
  - `DeleteLibraryDialog`
  - `useLibraryNavItems`
- 本步结束要求：
  - 新建 / 删除库可从 UI 走通
  - 左侧导航同步
- 当前结果：
  - 已落地 `apiClient`、hash 路由、动态左侧库导航和 `HomePageController`
  - 已落地 Home 指标卡、库列表、新建库对话框、删除库对话框和 Library 路由壳
  - 已接入基于 `WorkerApiError` 的错误提示与操作完成反馈
- 已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`
- 已完成聚焦回归：
  - `electron/` `npm run regression:c3`
  - Home 首屏加载
  - 新建库
  - 删除库
  - 左侧导航同步
  - 库路由跳转
  - 删除当前库后的路由回退与提示消息
- 已修复问题：
  - renderer 原生 ES module 导入缺失 `.js` 扩展，导致 Electron 文件页空白

### C-4：事件与错误收口

- 最后接：
  - `GET /api/events`
  - `library.changed`
  - 任务摘要刷新
  - Worker 未就绪错误反馈
- 本步结束要求：
  - Home MVP 端到端闭环完成
- 当前结果：
  - Worker 已新增 `GET /api/events` SSE 端点
  - Worker 已发布 `worker.ready`、`library.changed`、`task.summary.changed`
  - renderer 已建立全局单 `EventSource` 连接
  - Home 已消费 `library.changed` 并后台刷新 bootstrap / libraries
  - Home 已消费 `task.summary.changed` 并局部刷新任务摘要
  - `apiClient` 已统一收口 Worker 未就绪、网络失败与请求失败的错误提示
  - SSE 断开时已展示 warning banner，避免 UI 静默失联
- 已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:c3`
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`
- 当前结论：
  - 阶段 C 已完成，Home MVP 闭环可作为后续扫描与抓取能力的壳层基础。

## Home MVP 的 Done 定义

### 功能完成标准

- 首屏成功拉取 bootstrap、libraries、tasks summary
- Home 页能显示：
  - 库总数
  - 库列表
  - 最近任务摘要
- 新建库成功后：
  - Home 列表刷新
  - 左侧导航刷新
  - 无需重启应用
- 删除库成功后：
  - Home 列表刷新
  - 左侧导航刷新
  - 路由状态不残留已删除库
- Worker 未就绪或请求失败时：
  - 页面能显示明确错误
  - 不吞异常

### 技术完成标准

- renderer 只保留一个全局 SSE 连接
- renderer 通过 preload 获取 Worker base URL
- Worker 只监听 `127.0.0.1`
- contracts 不再在 renderer 和 Worker 内部重复定义
- 日志具备语义前缀：
  - `[Electron-HomeMvp]`
  - `[Worker-HomeMvp]`

## 验证顺序

## 测试策略建议

- 不建议等整个阶段 C 全部实现完成后，再开始按功能模块测试。
- 推荐按 `C-1` 到 `C-4` 逐步测试：
  - `C-1`
    - 构建测试
    - 进程启动测试
  - `C-2`
    - Worker 接口测试
    - 新建 / 删除库持久化测试
  - `C-3`
    - Home 页面交互测试
    - 导航同步测试
  - `C-4`
    - SSE 事件测试
    - 错误流测试
    - 阶段 C 整体回归
- 推荐节奏：
  - 每完成一个子步骤，立刻跑该子步骤对应测试
  - `C-4` 完成后，再补一次阶段 C 全链路回归

原因：

- 如果等全部写完再测，问题会跨 contracts、Worker、Electron、renderer 四层叠在一起，定位成本过高。
- 逐步测试更符合当前 Home MVP 的最小闭环推进方式。

### 第 1 轮：静态验证

- Contracts 类型能在 renderer / Worker 两侧编译通过
- Electron 壳层能启动主窗口并拉起 Worker

### 第 2 轮：同步接口验证

- `GET /api/app/bootstrap`
- `GET /api/libraries`
- `POST /api/libraries`
- `DELETE /api/libraries/{libraryId}`
- `GET /api/tasks`
- 创建测试库后应回删，并确认 `app_databases` / `WindowConfig.Main.CurrentDBId` / `WindowConfig.Settings.DefaultDBID` 状态恢复。

### 第 3 轮：页面闭环验证

- Home 首屏加载
- 新建库
- 删除库
- 左侧导航同步
- 打开库路由跳转
- 当前状态：
  - 已通过 `electron/` `npm run regression:c3` 自动验证

### 第 4 轮：事件与错误验证

- `library.changed` 事件能被 Home 消费
- 任务摘要更新能被 Home 消费
- Worker 未就绪时错误提示正确
- 当前状态：
  - 已通过 `electron/` `npm run regression:c3` 自动验证
  - 当前回归额外覆盖：
    - `library.changed` 事件驱动同步
    - 任务摘要刷新
    - Worker 未就绪 warning banner 反馈

### D：扫描与抓取最小闭环

- 本步目标：
  - 库默认扫描目录读取与保存
  - 触发扫描
  - 扫描任务状态回传
  - MetaTube 抓取与 sidecar 最小闭环
- 当前结果：
  - Worker 已新增库更新接口、扫描接口、抓取接口和单任务查询接口
  - Worker 已新增内存任务注册表、库扫描服务、MetaTube 抓取服务和 sidecar 写出能力
  - Library 路由已升级为库工作台，支持扫描目录保存、触发扫描、触发抓取和当前库任务列表
  - 已新增 `electron/` `npm run regression:d`，使用临时 sqlite 副本和临时媒体目录验证阶段 D 主链路
- 当前待验证：
  - 已通过 `dotnet build Jvedio-WPF/Jvedio.Worker/Jvedio.Worker.csproj`
  - 已通过 `electron/` `npm run build`
  - 已通过 `MSBuild.exe Jvedio.sln -property:Configuration=Release`
  - 已通过 `electron/` `npm run regression:d`

### 第三批：影片展示和播放

- 本步目标：
  - `GET /api/libraries/{libraryId}/videos`
  - Library 页影片结果集展示
  - 基础筛选、排序、刷新
  - 视频详情路由壳
  - 播放调用
  - 播放写回
- 当前结果：
  - Worker 已新增 `LibrariesController.GetLibraryVideos()`、`VideosController` 与 `VideoService`
  - Worker 已能返回库内影片结果集、视频详情并执行基础播放调用与播放写回
  - Library 路由已支持影片结果集、筛选、排序、刷新和详情跳转
  - Video Detail 路由壳已支持播放按钮和播放反馈
  - 已新增 `electron/` `npm run regression:batch3`
- 当前验证：
  - 已通过 `dotnet build Jvedio-WPF/Jvedio.Worker/Jvedio.Worker.csproj -c Release`
  - 已通过 `electron/` `npm run build`
  - 已通过 `electron/` `npm run smoke`
  - 已通过 `electron/` `npm run regression:batch3`

## 当前风险

- `WindowStartUp` 的既有库管理逻辑可能夹带 UI 依赖，迁移为 Worker 服务时需要先拆纯业务层。
- 如果先把 `GET /api/events` 接得太早，容易在 Home MVP 阶段增加排障成本。
- Worker 端口仍未最终冻结，因此 base URL 必须继续通过 preload 注入。
