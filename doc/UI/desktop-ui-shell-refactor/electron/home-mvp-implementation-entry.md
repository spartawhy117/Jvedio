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

### 第 1 轮：静态验证

- Contracts 类型能在 renderer / Worker 两侧编译通过
- Electron 壳层能启动主窗口并拉起 Worker

### 第 2 轮：同步接口验证

- `GET /api/app/bootstrap`
- `GET /api/libraries`
- `POST /api/libraries`
- `DELETE /api/libraries/{libraryId}`
- `GET /api/tasks`

### 第 3 轮：页面闭环验证

- Home 首屏加载
- 新建库
- 删除库
- 左侧导航同步
- 打开库路由跳转

### 第 4 轮：事件与错误验证

- `library.changed` 事件能被 Home 消费
- 任务摘要更新能被 Home 消费
- Worker 未就绪时错误提示正确

## 当前风险

- `WindowStartUp` 的既有库管理逻辑可能夹带 UI 依赖，迁移为 Worker 服务时需要先拆纯业务层。
- 如果先把 `GET /api/events` 接得太早，容易在 Home MVP 阶段增加排障成本。
- Worker 端口仍未最终冻结，因此 base URL 必须继续通过 preload 注入。
