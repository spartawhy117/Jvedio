## 用户需求

- 功能目标：
  - 将当前 UI 重构规划从 WPF 线稿路线切换为 `Electron 前端 + C# Worker + localhost API` 路线。
  - 首轮先完成方案文档、进度跟踪文档、验证流程和参考说明落地，当前已进入阶段 C 的代码实现。
  - 让后续新会话优先读取 `handoff.md` 即可恢复上下文，减少 token 消耗。
- 前端方向：
  - 参考 `QiaoKes/fntv-electron` 的桌面壳、导航、页面内容组织与桌面交互方式。
  - 不把多账户、远程访问、MPV 深度能力作为第一阶段目标。
  - 保留 `Actors` 作为左侧一级导航重点页面。
- 后端方向：
  - 保留当前 C# 业务能力，未来拆成 `Jvedio.Core`、`Jvedio.Worker`、`Jvedio.Contracts`。
- 当前阶段：
  - 已进入阶段 C 代码实现。
  - `C-1`、`C-2`、`C-3`、`C-4` 已完成，且阶段 C 聚焦回归已通过，当前准备进入阶段 D。

## 文档结构决策

- `plan/active/desktop-ui-shell-refactor/`
  - 管进度、阶段、决策、验证矩阵、会话接力。
- `doc/UI/desktop-ui-shell-refactor/electron/`
  - 管 Electron 稳定规格。
- `doc/UI/desktop-ui-shell-refactor/reference/`
  - 管参考项目说明和借鉴边界。
- `doc/UI/old/`
  - 保留为旧界面基线。
- `doc/UI/new/`
  - 作为 WPF 线稿历史参考保留，不再作为默认实施输入。

## 产品定义

### 前端目标

- 使用 Electron 构建新的桌面主壳。
- 主壳采用固定左导航 + 自适应右内容区。
- 左侧导航第一阶段固定为：
  - Home
  - Favorites
  - Actors
  - 智能分类
    - 类别
    - 系列
  - Libraries
- 设置作为壳层入口，不作为内容区常驻一级页面。
- Home 承接旧 `WindowStartUp` 的库管理能力。
- Library 承接库内容浏览、扫描和抓取入口。
- Video Detail 承接影片详情和播放入口。
- Settings 承接现有配置能力。

### `fntv-electron` 参考边界

- 参考：
  - 桌面主壳风格
  - 页面内容密度
  - Web 前端页面组织
  - 桌面交互感
- 不参考：
  - 多账户管理
  - 远程访问
  - MPV 深度增强
  - 弹幕、智能跳过、硬解专项能力
  - 跨平台分发目标
  - 任何代码、图像、品牌资产的直接复用

### 后端目标

- 保留当前实现来源：
  - MetaTube 抓取
  - 扫描和整理
  - SQLite
  - sidecar 输出
  - 图片与演员头像缓存
  - 设置读写
  - 播放记录写回
  - 外部播放器调用
- 后续拆分方向：
  - `Jvedio.Core`
  - `Jvedio.Worker`
  - `Jvedio.Contracts`
- 通信模型：
  - Electron 主进程后台拉起 Worker
  - Worker 仅监听 `127.0.0.1`
  - 前端通过 localhost API + `SSE` 获取数据和任务状态
  - 不做远程服务化

### 播放能力定义

- 第三批验证中的播放能力继续沿用当前模式：
  - 优先使用已配置的视频播放器路径
  - 未配置时回退系统默认播放器
  - 播放成功后写回观看时间或最近播放状态
- 本期不定义内嵌播放器。

## 分阶段路线图

### 阶段 A：方案文档与参考资产落地

- 重写 active feature 文档为 Electron 路线。
- 建立 `electron/` 子目录文档层。
- 建立 `reference/` 参考说明层。
- 统一标记旧 WPF 线稿为历史参考。

### 阶段 B：前端页面与 Worker API 草案

- 细化页面规格：
  - Home
  - Library
  - Actors
  - Video Detail
  - Settings
- 输出 renderer 真实目录、组件拆分、Worker API 草案与事件流说明。
- 输出 Electron E2E 与 Worker 集成测试草案。

### 阶段 C：实现第一批

- 目标：
  - 库的新建和删除。
- 重点：
  - Home 页库管理最小闭环
  - 左侧库导航联动
  - 数据持久化与错误反馈

#### 阶段 C-1：Contracts 与工程骨架

- 目标：
  - 建立 `Jvedio.Contracts`、`Jvedio.Worker`、Electron main / preload / renderer 的最小工程骨架
- 范围：
  - `bootstrap`
  - `libraries`
  - `tasks summary`
- 完成标准：
  - Contracts 可被 Worker 与 renderer 同时引用
  - Electron 主窗口能启动
  - Worker 宿主能被 Electron 拉起

#### 阶段 C-1 当前结果

- 已落地：
  - `Jvedio-WPF/Jvedio.Contracts`
  - `Jvedio-WPF/Jvedio.Worker`
  - 根目录 `electron/` main / preload / renderer 骨架
- 已完成验证：
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
  - `electron/` `npm run build` 通过
  - `electron/` `npm run smoke` 通过
- 下一步：
  - 进入 `C-2`，实现 `bootstrap / libraries / tasks summary` 的同步读写接口

#### 阶段 C-2：Worker 同步接口闭环

- 目标：
  - 先打通 Home 所需的同步读写接口
- 范围：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
- 完成标准：
  - 接口可独立调用
  - 新建 / 删除库数据持久化正确
  - 错误返回满足 `contracts-naming.md`

#### 阶段 C-2 当前结果

- 已落地：
  - `Jvedio.Worker` 的 `App / Libraries / Tasks` 三组同步控制器
  - 共享 WPF Release 数据目录的路径解析与 sqlite 连接工厂
  - `app_configs` / `app_databases` 的 Worker 侧读写服务
  - Home MVP 所需的 bootstrap、库列表、建库、删库、任务摘要接口
- 已完成验证：
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
  - Worker 接口人工验证通过：
    - `GET /api/app/bootstrap`
    - `GET /api/libraries`
    - `POST /api/libraries`
    - `DELETE /api/libraries/{libraryId}`
    - `GET /api/tasks`
  - 创建测试库后已成功回删，sqlite 当前恢复为单库初始状态
  - `electron/` `npm run smoke` 再次通过
- 下一步：
  - 进入 `C-3`，打通 renderer Home 页面、对话框和左侧库导航联动

#### 阶段 C-3：renderer Home 闭环

- 目标：
  - 完成 Home 页、左侧导航和基础路由壳联动
- 范围：
  - `AppShell`
  - `HomePage`
  - `CreateLibraryDialog`
  - `DeleteLibraryDialog`
  - `useHomePageData`
  - `useLibraryNavItems`
- 完成标准：
  - 首页可加载
  - 新建 / 删除库可从 UI 走通
  - 左侧导航实时同步
  - 打开库可进入 Library 路由壳

#### 阶段 C-3 当前结果

- 已落地：
  - renderer 侧 `api/client`、`app/routes`、`app/navigation`、`features/home`、`types/api` 首批实现
  - `HomePageController`、新建库对话框、删除库对话框与库列表卡片
  - 动态左侧库导航、`#/home` 与 `#/libraries/{libraryId}` 路由壳
  - 基于 `WorkerApiError` 的 UI 错误提示与操作完成反馈
- 已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
- 已完成聚焦回归：
  - `electron/` `npm run regression:c3`
  - Home 首屏加载
  - 新建库
  - 删除库
  - 左侧导航同步
  - 库路由跳转
- 已修复首轮回归问题：
  - renderer 原生 ES module 导入缺少 `.js` 扩展，导致 Electron 文件页空白
- 下一步：
  - 进入阶段 D 的扫描与抓取闭环

#### 阶段 C-4：事件与错误收口

- 目标：
  - 补齐 Home MVP 所需的最小事件流和错误反馈
- 范围：
  - `GET /api/events`
  - `library.changed`
  - 任务摘要更新
  - Worker 未就绪错误处理
- 完成标准：
  - Home 能消费库变更事件
  - Home 能消费任务摘要更新
  - 错误提示明确且不吞异常

#### 阶段 C-4 当前结果

- 已落地：
  - `Jvedio.Worker` 新增 `GET /api/events` SSE 端点
  - Worker 新增事件流 broker，并发布：
    - `worker.ready`
    - `library.changed`
    - `task.summary.changed`
  - Home renderer 建立全局单 `EventSource` 连接
  - Home 已消费 `library.changed` 做后台 bootstrap 刷新
  - Home 已消费 `task.summary.changed` 做任务摘要局部刷新
  - `apiClient` 已统一收口 Worker 未就绪、网络失败和请求失败的错误消息
  - SSE 断开时已展示非阻塞 warning banner，保留最近一次成功状态
- 已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:c3`
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
- 已完成阶段 C 聚焦回归：
  - Home 首屏加载
  - 新建库
  - 删除库
  - 左侧导航同步
  - 库路由跳转
  - `library.changed` 事件驱动同步
  - 任务摘要刷新
  - Worker 未就绪错误反馈
- 当前结论：
  - Home MVP 的阶段 C 闭环已完成，可进入阶段 D 的扫描与抓取实现。

### 阶段 D：实现第二批

- 目标：
  - 库默认扫描目录、扫描和抓取闭环。
- 重点：
  - 扫描路径保存
  - MetaTube 命中和整理
  - sidecar 和任务状态反馈

### 阶段 E：实现第三批

- 目标：
  - 影片展示和播放。
- 重点：
  - 库页、详情页、Actors 聚合页
  - 外部播放器链路
  - 播放状态写回

### 阶段 F：实现第四批

- 目标：
  - 设置页面功能完好。
- 重点：
  - 设置入口
  - 现有设置能力接入
  - 配置保存、回读、恢复默认

## 方案路径

### 路径 A：先冻结页面文档与 contracts，再进入第一批实现

- 适用场景：
  - 希望下一轮开始就能直接建工程骨架，不再反复改目录和接口名
- 执行顺序：
  - 对齐五个页面文档与 renderer 组件命名
  - 冻结 Worker contracts / DTO 命名
  - 再进入 Home 最小闭环实现
- 优点：
  - 返工最少
  - 便于后续拆分 `Jvedio.Contracts`
  - 便于多人或跨会话并行推进
- 风险：
  - 会再多花一轮文档收敛时间
- 结论：
  - 推荐

### 路径 B：直接开始 Home 页最小实现，边写边修规格

- 适用场景：
  - 目标是尽快看到 Electron 壳层和 Home 页初版跑起来
- 执行顺序：
  - 直接建 renderer / Electron / Worker 空工程
  - 只围绕 Home 页建最小接口
  - 缺什么再补文档
- 优点：
  - 见效快
  - 更容易验证技术链路
- 风险：
  - 目录和 contracts 容易在第二批扫描闭环时返工
  - 页面文档与实现命名可能继续漂移

### 路径 C：先做技术 Spike，只验证壳层与 localhost 通路

- 适用场景：
  - 主要担心 Electron main / preload / Worker 生命周期与 localhost 通讯稳定性
- 执行顺序：
  - 先建壳层
  - 只打通 `/api/app/bootstrap` 与 `/api/events`
  - 业务页面后置
- 优点：
  - 能最快验证技术可行性
- 风险：
  - 不能直接沉淀业务页面闭环
  - 会把 Home / Library 的业务问题继续后移

## 推荐下一步

- 当前推荐先执行阶段 D 的验证，而不是继续扩页面范围。
- 原因：
  - 阶段 D 的 Worker、renderer 和聚焦回归入口都已落地，最短路径是先做 Release 构建和聚焦回归，把扫描/抓取闭环稳定下来。
  - 在阶段 D 验证结果明确前，不适合继续扩散到影片列表、播放链路或 Settings 深化实现。

## 下一步执行方案

### 第 1 步：进入阶段 D 的扫描与抓取闭环

- 目标：
  - 从 Home MVP 扩展到库默认扫描目录、扫描任务与 MetaTube 抓取最小闭环
- 覆盖范围：
  - 库扫描目录读取与保存
  - 触发扫描
  - 扫描任务状态回传
  - 抓取结果与 sidecar 输出

### 第 2 步：补阶段 D 的聚焦回归

- 目标：
  - 在扫描和抓取链路落地后，补一轮围绕库扫描闭环的自动回归
- 覆盖范围：
  - 扫描目录配置
  - 扫描触发
  - 任务状态刷新
  - sidecar 产物校验
- 当前状态：
  - 已新增 `electron/` `npm run regression:d`
  - 当前待开始执行构建与聚焦回归验证

## 阶段 C 当前推荐动作

- `C-1`、`C-2`、`C-3`、`C-4` 已完成，不再回头调整 Home MVP 骨架、同步接口、事件流或基础路由壳范围。
- 阶段 C 聚焦回归已通过，当前直接进入阶段 D。
- 阶段 D 之前，仍不提前扩散到 Settings / Video Detail / Actors 深化页面实现。

## 阶段 C 测试策略

- 不建议等阶段 C 全部实现完成后，才开始按功能模块测试。
- 推荐策略：
  - `C-1` 完成后，先做工程级静态验证：
    - 构建
    - 引用关系
    - 进程拉起
  - `C-2` 完成后，先做 Worker 接口测试：
    - bootstrap
    - libraries
    - create/delete
    - tasks summary
  - `C-3` 完成后，先做 Home 页面闭环测试：
    - 首屏加载
    - 新建库
    - 删除库
    - 左侧导航同步
    - 路由跳转
  - `C-4` 完成后，已补阶段 C 的整体回归：
    - 事件流
    - 错误流
    - Home MVP 端到端闭环
- 原因：
  - Home MVP 横跨 contracts、Worker、Electron 和 renderer 四层，若等全部完成后再测，定位问题会明显变慢。
  - 先按子步骤测试，能尽早发现 DTO 漂移、生命周期问题和 UI 状态回填问题。

## 下一步完成标准

- `C-3` 聚焦回归已完成，Home 首屏、建库、删库、导航同步和路由跳转结果明确。
- `C-4` 已补齐 `GET /api/events`、`library.changed`、任务摘要刷新和 Worker 未就绪错误处理。
- 阶段 C 聚焦回归已补齐事件流和错误流校验，Home MVP 端到端闭环结果明确。
- 阶段 D 的代码与回归入口已落地，当前进入验证前状态：
  - Library 工作台已支持扫描目录保存、触发扫描、触发抓取与任务状态显示
  - Worker 已支持扫描任务和 MetaTube 抓取任务
  - `regression:d` 已准备验证扫描目录、扫描触发、任务状态与 sidecar 产物
- `handoff.md`、`plan.md`、`plan.json` 与验证文档中的阶段状态保持一致。
- 阶段 D 的进入条件和首批回归范围已收敛清楚。

## 风险与约束

- 当前根目录旧 UI 文档仍存在，后续实施时必须明确以 `electron/` 子目录为准。
- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须依赖现有实现梳理。
- 参考项目 `fntv-electron` 与 `jellyfin-web` 已拉取到本地，但只能按既定边界做结构参考，不能误当现成工程模板。
- 当前已完成 `C-2` 的 Worker 接口实现；后续 renderer 接线必须继续复用同一套 contracts 和共享 sqlite 数据目录。

## 验证要求

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立说明当前状态。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档完整。
- `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md` 与 `worker-api-spec.md` 存在。
- `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-notes.md` 明确区分借鉴与非目标。
- Release 构建通过。
- 本轮仅文档变更，不跑 `Jvedio.Test` 集成测试。

## 用户确认状态

- 当前状态：approved
- 是否批准执行：true
- 已确认 feature slug：`desktop-ui-shell-refactor`
- 已确认前端参考源：`QiaoKes/fntv-electron`
- 已确认文档组织：`plan + doc` 双层结构
- 已确认 `Actors` 为左侧一级导航重点页面
- 已确认播放策略：继续沿用外部播放器
- 已确认当前阶段：进入阶段 C 代码实现，当前完成 `C-1`
