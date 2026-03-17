## 文档定位

本文件是 `desktop-ui-shell-refactor` 的**完整版迁移与重构方案（实施冻结版）**。

目标不再是继续修补当前 `Electron` 叙事，而是以一条已经冻结的正式主线推进后续实现：在不推翻既有 `Worker + Contracts + API + SSE` 底座的前提下，将桌面壳与 renderer 迁移为 `Tauri 2 + React + TypeScript` 组件化前端，并以 `doc/UI/new/` 作为唯一 UI 输入。


## 结论先行

- 新桌面主线正式切换为：`Tauri 2 + React + TypeScript + Jvedio.Worker + Jvedio.Contracts`
- `electron/` 当前视为未完成半成品，不再作为过渡壳或回退基线；新的桌面主线从全新 `MainShell` 外壳开始重写

- `Jvedio.Worker`、`Jvedio.Contracts`、`localhost API`、`SSE` 继续保留并作为真相源
- `doc/UI/new/` 已冻结为唯一正式 UI 输入，后续页面、弹层、共享组件、流程和回归口径都以这里为准

## 冻结输入与边界

### 已冻结输入

- 正式 UI 输入：`doc/UI/new/`
- 当前 active feature 入口：`plan/active/desktop-ui-shell-refactor/`
- 本地业务服务：`Jvedio-WPF/Jvedio.Worker`
- 跨层合同：`Jvedio-WPF/Jvedio.Contracts`
- 当前 Release 启动入口：`Jvedio-WPF/Jvedio/App.xaml.cs`
- 当前 Release 打包与壳产物复制入口：`Jvedio-WPF/Jvedio/Jvedio.csproj`

### 外部参考边界

允许有限参考 `clash-verge-rev` 的局部 UI 组织方式，例如：

- 左侧导航层级与收纳方式
- 设置页左右分栏的版式组织
- 桌面壳的区域切分节奏
- 桌面应用常见的主壳、子页与设置入口节奏

但这些参考**只限视觉组织与页面编排**，不继承：

- 产品信息架构
- 业务语义与页面职责定义
- 路由语义与返回链路
- 后端实现与跨层契约边界

Jvedio 的页面职责、流程链路、共享组件规则与数据来源，仍以 `doc/UI/new/` 为唯一准绳。

## 当前真实状态

### 桌面壳现状

- `electron/` 虽然已搭出部分页面、路由与 API 消费代码，但当前仍是半成品
- 现阶段**没有任何一轮完整人工全流程验证**，因此不能把它定义为可兜底的过渡产品路径
- `Jvedio.exe` 的 Release 启动已通过 `App.xaml.cs` 中的 `ElectronShellLauncher` 优先拉起 `electron-shell`
- `Jvedio.csproj` 当前在 Release 构建后会执行 `PrepareElectronShellArtifacts`，构建并复制：
  - Electron runtime
  - renderer 产物
  - `Jvedio.Worker` 输出

这说明当前仓库的真实启动主线仍然绑在旧 Electron 产物链上，但**这条链路的存在不等于它具备继续保留为回退基线的质量背书**；后续应以新的 `MainShell` 启动链替换它，而不是继续补救旧壳。

### Worker 与 Contracts 现状

已验证的代码事实：

- `Jvedio.Worker/Program.cs` 当前是本地 ASP.NET Core 宿主
- 当未显式传入 `--urls` 时，默认使用 `http://127.0.0.1:0`，即**动态端口**
- `Jvedio.Worker/Controllers/EventsController.cs` 已稳定提供 `text/event-stream` 事件流
- `Jvedio.Worker/Controllers/AppController.cs` 已提供 `/api/app/bootstrap`
- `AppBootstrapService` 当前已明确返回 `SupportsDynamicWorkerPort = true`
- `Jvedio.Contracts` 已覆盖：
  - App bootstrap 与 worker 状态
  - Libraries
  - Videos
  - Actors
  - Tasks
  - Settings
  - 通用 API envelope 与错误模型
  - Worker 事件 envelope

这说明：**新的桌面主线没有必要重写本地业务边界，核心是替换壳层与前端表达层，而不是重做服务合同。**

### Renderer 现状

已验证的代码事实：

- `electron/renderer/src/api/client/apiClient.ts` 已稳定消费 Worker API
- API 客户端已覆盖：库、影片、演员、分类、系列、设置、任务、播放、MetaTube diagnostics 等主链路
- `electron/renderer/src/features/home/useHomePageData.ts` 已通过 `EventSource` 订阅：
  - `library.changed`
  - `settings.changed`
  - `task.summary.changed`
  - `task.created`
  - `task.completed`
  - `task.failed`
  - `task.progress`
- `electron/renderer/src/app/routes/router.ts` 已证明现有页面集合与路由语义基本可承接：
  - home
  - library
  - favorites
  - categories
  - series
  - actors
  - actor detail
  - settings
  - video detail

这说明：**当前 Electron 代码只证明页面范围、API 消费面和事件流模型已经有可参考样本，不等于它适合作为新架构的继续演进基线。**

## 迁移目标

### 目标一：替换桌面壳，但不替换业务底座

用 `Tauri 2` 替换当前 `Electron main + preload + runtime packaging` 这层职责；保留 `Worker + Contracts + HTTP API + SSE` 这条业务主链。

### 目标二：重建 renderer，但不重定产品范围

后续前端页面、弹层、共享组件、流程图、交互规则和回归点全部以 `doc/UI/new/` 为准，不再让实现代码倒逼产品结构。

### 目标三：把迁移变成可审查、可切换、可回退的阶段方案

本次方案必须同时给出：

- 明确技术主线
- 明确阶段路线
- 验证矩阵
- 发布切换点
- 失败时的回退方式
- Electron 废弃与清理策略

## 非目标

本轮迁移方案**不做**以下事情：

- 不把 `Jvedio.Worker` 全量迁入 Rust
- 不把现有 HTTP API 全量改写成 Tauri command
- 不在壳层内重新实现扫描、抓取、sidecar、数据库逻辑
- 不重做产品页面范围
- 不推翻 `doc/UI/new/` 已冻结的页面职责与流程关系
- 不再为当前 Electron 半成品补测试、补发布链或继续演进为正式产品壳

## 目标架构

### 总体分层

- `doc/UI/new/`
  - 唯一 UI 输入
  - 定义页面职责、弹层、共享组件、流程与回归口径
- `Tauri 2` 壳层
  - 窗口生命周期
  - 单实例
  - 文件对话框 / 菜单 / 托盘 / 更新 / 深链接等桌面能力
  - Worker 拉起与关闭
  - 少量桌面桥接能力
- 组件化 Renderer（React 主线）
  - 路由

  - 页面布局
  - 表单与交互
  - 查询缓存
  - SSE 订阅
  - 局部状态
- `Jvedio.Worker`
  - 数据库、扫描、抓取、播放、sidecar、配置、任务编排
- `Jvedio.Contracts`
  - DTO
  - 事件 envelope
  - 错误模型
  - 跨层合同真相源

### 分层原则

- 壳层只做桌面能力与进程编排，不做业务决策
- renderer 只做页面表达与状态协作，不做重业务运算
- `Worker` 继续做所有本地业务服务
- `Contracts` 是唯一合同定义，不允许 renderer 自行发散 DTO
- 事件通知继续优先使用 SSE，不退回到轮询主导

## 技术路线

### `Tauri 2 + React + TypeScript`

#### 适用性

- 更适合复杂列表页、筛选、分页、局部刷新和详情联动
- 更适合 settings 左右分栏、任务反馈、上下文返回链路
- 更利于 AI 协作下快速拆分组件、hooks、状态层与回归点

#### 优点

- 组件边界清晰，适合长期维护
- 对大页面和共享组件复用更稳
- 查询缓存、虚拟列表、局部刷新等常见策略更成熟
- 与现有 TypeScript API 客户端和测试心智更连续

#### 风险

- 需要完整重建 renderer 结构，不能平移当前大控制器
- 迁移初期需要额外做组件边界与状态约束，否则容易出现“React 外壳下继续写大控制器”

#### 当前冻结路线

- 正式 renderer 路线固定为 **React + TypeScript**。
- 后续落库与实施默认继续沿 React 路线推进，不再并行保留多套前端主线评估。


## UI 组织策略

### 页面组织原则

新的 renderer 页面组织应直接对应 `doc/UI/new/page-index.md` 中已经冻结的页面集合，而不是继续围绕旧实现习惯拆页面。

建议的页面组织粒度：

- `AppShell`
  - 品牌区
  - 左侧一级导航
  - 智能分类入口
  - 媒体库导航区
  - 全局任务/提示入口
- `LibraryManagementPage`
- `LibraryPage`
- `FavoritesPage`
- `ActorsPage`
- `ActorDetailPage`
- `CategoriesPage`
- `SeriesPage`
- `VideoDetailPage`
- `SettingsPage`

### 布局策略

可以有限借鉴 `clash-verge-rev` 的桌面组织感，但必须映射到 Jvedio 自己的页面职责：

- 主壳采用稳定左侧导航 + 右侧内容区结构
- 设置页采用左侧分组导航 + 右侧表单区结构
- 聚合页与单页详情保持一致的返回与状态反馈方式
- 页面间的返回链路、筛选状态与分页状态严格跟随 `doc/UI/new/flow/*`

### 状态策略

- 远端状态（这里指本地 Worker 返回的服务状态）
  - 使用查询缓存管理
  - 以失效刷新和局部更新为主
- 事件状态
  - 继续走 SSE
  - 任务和设置变更优先事件驱动
- 本地 UI 状态
  - 路由参数
  - 当前页筛选草稿
  - 弹层开关
  - 返回来源 `backTo`
  - 局部 loading/submitting/error 状态

## 主题、多语言与图片资源策略

### 主题策略

- 当前实现层明确支持 `light` 与 `dark` 两套主题。
- `doc/UI/new/` 中的线框图、流程图和共享组件图仍只保留白色背景正式图；暗色主题属于实现层能力，不额外派生第二套暗色文档资产。
- 主题实现框架参考 `clash-verge-rev` 的分层方式：
  - preload 阶段先解析配置中的 theme mode
  - renderer 侧用全局 theme state 持有当前 mode
  - 设计 token 输出到 CSS variables
  - 组件层再接各自的 theme adapter / component theme
- 如实施成本可控，可预留 `system` 跟随系统主题的兼容位；但当前审查口径先锁 `light / dark`。

### 多语言策略

- 多语言实现参考 `clash-verge-rev` 的 `src/locales/{lang}/index.ts + *.json` 结构。
- 当前首批只落 `zh` 与 `en` 两套语言包。
- 建议初始化顺序：
  1. 本地缓存语言
  2. 用户设置中的语言
  3. 系统 / 浏览器语言
  4. fallback 语言
- 建议 fallback 语言当前优先使用 `zh`。
- 文案 key 按页面 / 模块拆分，不把全部文案堆进单个大文件。
- 如果新壳采用 React，优先采用 `i18next + react-i18next` 或等价方案，保持与参考项目接近的懒加载、缓存和 fallback 心智。

### 图片与图标资源策略

- 图片与图标资源建议拆成三层：
  - 品牌与应用资产：`logo`、应用 icon、tray icon
  - 业务与页面图标：导航图标、页面专属 SVG
  - 通用操作图标：新增、编辑、删除、返回、设置、播放等基础动作图标
- `clash-verge-rev` 当前实现中：
  - 通用功能图标大量使用 `@mui/icons-material`
  - 品牌与部分导航图标使用自定义 SVG
  - 整体风格更接近 `Material Symbols Rounded / MUI Icons`，不是 Fluent 风格
- 当前阶段建议：
  - 通用操作图标优先直接使用组件库 / icon package，不手工拷贝大量 SVG
  - 品牌图、导航图和业务特有图标再单独绘制或维护自有 SVG
  - 新壳目录建议预留：`assets/image/brand`、`assets/image/itemicon`、`assets/image/component` 与 `src-tauri/icons`
- 对 `clash-verge-rev` 图片的复用策略：
  - 可以优先复用其**组织方式与风格判断**
  - 当前项目以个人使用为主，如需直接复用原始图片，至少保留最小来源备注，不额外引入重型流程
  - 若来源不明或后续准备公开分发，再优先自绘或替换为本项目自有 SVG
- 上述主题、多语言与图片 / 图标的长期实施细则，不再继续堆在 `plan.md` 中；统一收口到：
  - `doc/UI/new/foundation/theme-and-appearance.md`
  - `doc/UI/new/foundation/localization.md`
  - `doc/UI/new/foundation/assets-icons-and-coloring.md`


## Worker 与 Contracts 保留边界

### 必须保留的 Worker 职责

- 库管理与库扫描
- 影片抓取与写回
- Sidecar 输出
- 图片与缓存路径管理
- 外部播放器调用
- 设置读写
- 任务队列与任务摘要
- SSE 事件广播
- Bootstrap 与健康检查

### 不建议迁移到壳层或前端的职责

- SQLite 查询与数据整形逻辑
- 扫描导入 IO 主链
- MetaTube 抓取逻辑
- sidecar 与图片落盘
- 任务编排与失败重试

### Contracts 的后续要求

- 所有前端 API 类型继续从 `Jvedio.Contracts` 对齐生成或镜像
- 不允许 renderer 自己新增与 Contracts 脱节的“临时 DTO”
- 若 Tauri 壳层需要桥接少量桌面能力，也不得绕开 `Worker` 合同去承担业务合同真相源角色

## 目录与工程建议

### 当前阶段的推荐目录方向

当前审查阶段不强行冻结最终目录树，但建议按以下方向收口：

- 新桌面壳目录：建议优先考虑 `tauri/`
- renderer 代码：作为 `tauri/` 内部前端工程，或与壳层共仓组织
- `electron/`：从当前起停止作为活跃实现基线；待新壳启动链替换完成后再统一归档或删除
- `Jvedio.Worker`、`Jvedio.Contracts`：继续保留在 `Jvedio-WPF/` 现有位置
- `Jvedio` WPF 主项目：短期内仅作为现有启动链改造入口；若后续确认不再需要，可再决定是否退出

### 为什么当前不立即冻结全部目录名

因为真正需要先冻结的是：

- 架构边界
- 技术路线
- UI 输入
- 阶段切换点

而不是在审查通过前把所有目录命名一次写死，导致后续在落库时反复返工。

## 阶段路线

### 阶段 0：方案冻结与审查通过

目标：

- 确认 React 主线的接受范围
- 确认 Worker 端口策略写法
- 确认新壳目录名
- 确认 Electron 废弃边界与清理时机

产出：

- 审查通过版 `plan.md`
- 更新后的 `handoff.md`
- 收敛后的 `open-questions.md`
- 可执行验证矩阵

### 阶段 1：`MainShell` 壳层 Spike

目标：

- 建立最小可运行的新 `MainShell`
- 验证窗口启动、单实例与基础菜单能力
- 验证从壳层拉起 `Jvedio.Worker`
- 验证将 worker baseUrl 注入 renderer
- 验证 renderer 能连接 `/api/app/bootstrap` 与 `/api/events`

通过标准：

- 能显示主壳空页面
- 能读到 bootstrap
- 能收到至少 `worker.ready` 与 `task.summary.changed` 事件
- 不依赖任何 Electron 运行时或回退逻辑即可独立启动

### 阶段 2：Renderer 基座重建

目标：

- 建立路由、页面骨架、共享组件骨架
- 建立 API client、query 层、SSE 订阅层
- 建立全局 shell、左侧导航、设置页两栏基础布局
- 建立错误提示、worker 未就绪提示和基础空态

通过标准：

- 页面集合与 `doc/UI/new/page-index.md` 一一对应
- 路由、返回链路和 settings group 结构与当前文档一致
- 主壳、设置页和任务反馈基础结构可见

### 阶段 3：业务页按优先级迁移

建议迁移顺序：

1. `main-shell`
2. `library-management-page`
3. `library-page`
4. `video-detail-page`
5. `favorites-page`
6. `actors-page`
7. `actor-detail-page`
8. `categories-page`
9. `series-page`
10. `settings-page`

原因：

- 先打通主壳和库主链路
- 再打通详情与返回链路
- 最后收口聚合页、演员页与设置页的复杂边界

每页迁移都必须满足：

- UI 与 `doc/UI/new/` 一致
- API 只走现有 Worker 合同
- 事件更新不退化为全量轮询
- 返回态、分页态、筛选态可恢复

### 阶段 4：Release 切换与旧启动链替换

目标：

- 让新壳成为唯一继续建设的桌面入口
- 在 `Jvedio.exe` 启动链或替代发布入口中接入新壳
- 调整 `Jvedio.csproj` 或新的构建脚本，把产物复制链从 Electron 切到新壳
- 停止 `PrepareElectronShellArtifacts` / `ElectronShellLauncher` 继续作为默认产品路径

建议切换策略：

- 先让 `MainShell` 具备最小可运行 Release 产物
- 再切启动器或发布入口，使其指向新壳
- 旧 Electron 代码可以继续留在仓库里作对照，但不再承担发布回退
- 启动链切换完成后，尽快开始清理 Electron 相关构建脚本与文档叙事

### 阶段 5：旧 Electron 清理

清理前提：

- 所有 `doc/UI/new/` 页面和弹层已在新壳下完成接线
- Worker 启动、任务反馈、设置保存、播放链路验证通过
- Release 构建、打包、启动链已稳定指向新壳
- 关键回归项通过至少一轮完整验证

清理动作：

- 删除或归档 `electron/` 目录
- 清退文档中残留的 Electron 主叙事
- 调整 `Jvedio.csproj` 或替代构建入口，不再准备 Electron 壳产物
- 删除 `App.xaml.cs` 中仅服务于旧 Electron 的启动逻辑；如仍保留 WPF 启动桥，则同步切到新壳

## 端口与进程策略

### Worker 端口策略建议

当前推荐：**继续采用动态端口作为正式主线**。

理由：

- 现有 `Program.cs` 默认已支持动态端口
- `AppBootstrapService` 已明确声明 `SupportsDynamicWorkerPort = true`
- 现有 Electron 代码中已经实现“启动前分配可用端口并等待 Worker ready signal”的逻辑，可作为协议参考，但不能视为经过交付验证的正式链路
- 动态端口更适合避免用户机器上端口冲突

需要收敛的点：

- Tauri 壳层如何把 `baseUrl` 稳定传给 renderer
- Release 模式下日志与诊断如何暴露当前 `baseUrl`
- 测试与自动化如何读取当前 worker 地址

### 进程策略建议

- 壳层负责拉起与关闭 `Worker`
- renderer 不直接负责启动子进程
- `Worker ready` 作为渲染层可进入可交互状态的重要门槛
- renderer 在 worker 未就绪时必须展示明确提示，而不是静默失败

## 构建与发布策略

### 当前现实

`Jvedio.csproj` 当前已绑定 Electron 产物构建与复制，因此迁移不只是“前端换框架”，还涉及 Release 打包主链切换。

### 目标策略

- 为新 `MainShell` 建立独立可验证构建链
- 尽快切断对 Electron runtime、renderer 打包和启动器逻辑的依赖
- 如短期仍保留 `Jvedio` WPF 主项目，只把它当作启动链改造入口，不再当 Electron 容器
- 在新壳最小 Release 产物跑通后，立即把发布主线切到新壳

### 不建议的切换方式

- 继续投入时间给 Electron 半成品补测试、补壳层和补发布链
- 继续把 Electron 写成可兜底的过渡产品路径
- 在没有新 `MainShell` 最小可运行产物前，直接把所有旧启动链物理删空，导致当前分支完全无法启动

## 验证矩阵

### 架构级验证

- Tauri 能拉起 `Jvedio.Worker`
- renderer 能获取 bootstrap
- renderer 能连接 SSE
- `WorkerStatusDto` 和事件 envelope 在新前端中被正确消费

### 页面级验证

- 主壳导航切换
- 库管理页建库 / 编辑 / 删除 / 扫描 / 打开单库
- 单库页筛选 / 排序 / 分页 / 右键动作 / 返回恢复
- 喜欢页结果集浏览与详情往返
- Actors 列表、演员详情与关联影片返回
- Categories / Series 左右分栏与详情返回
- 影片详情读取、播放、返回和 sidecar 状态显示
- 设置读取、保存、恢复默认与 MetaTube diagnostics

### 事件级验证

- `worker.ready`
- `library.changed`
- `settings.changed`
- `task.summary.changed`
- `task.created`
- `task.completed`
- `task.failed`
- `task.progress`

### 发布级验证

- Debug / Release 构建
- 启动器或替代发布入口能正确拉起新壳
- Worker 启停正常
- 旧 Electron 启动链已不再是默认产品路径
- 日志可定位壳层、renderer、worker 启动问题

## 风险与缓解

### 风险一：重新写成“新外壳下的旧控制器”

表现：

- 虽然切到 React，但依旧把页面逻辑堆回单个超大文件

缓解：

- 强制按页面、区域、共享组件、查询层、事件层拆分
- 将状态管理和事件订阅从页面展示层剥离

### 风险二：UI 文档与实现再次分叉

表现：

- 实现过程中重新发明页面职责或新增未冻结入口

缓解：

- 所有页面实现先对照 `doc/UI/new/`
- 新需求先改 UI 文档，再改实现

### 风险三：端口与启动链不稳定

表现：

- Tauri 启动了，但 renderer 拿不到 worker baseUrl
- Worker ready 与页面首屏加载节奏错位

缓解：

- 先完成阶段 1 Spike
- 把 worker ready、health check、baseUrl 注入、异常提示做成单独验证点

### 风险四：旧启动链切断时机错误

表现：

- 在新 `MainShell` 尚未跑通最小 Release 前就贸然删空旧 Electron 启动链，导致当前分支暂时不可交付

缓解：

- 先完成阶段 1 的 `MainShell` Spike 与最小 Release 产物
- 再替换启动链与构建脚本
- `electron/` 可以先冻结不用，再在启动链切换后做物理清理

## 回退策略

- 本方案中的“回退”不再指回退到 Electron 产品壳
- 任一阶段如果出现：
  - Worker 无法稳定拉起
  - 页面主链未打通
  - 新壳 Release 打包不可交付
  - 关键回归失败
  则回退到**上一阶段已验证的新架构里程碑**，而不是恢复 Electron 为正式产品路径
- 如确需保留旧代码，仅作为历史参考或对照样本，不作为继续交付路径

## 本轮已冻结结论

以下结论本轮已默认执行并冻结：

- **`Tauri 2 + React + TypeScript`** 作为唯一主线
- **动态端口** 作为 Worker 正式主线策略
- `doc/UI/new/` 继续作为唯一 UI 输入，不让实现反向修改文档边界
- **直接废弃当前 Electron 半成品作为产品路径与回退基线**
- 新壳目录正式命名为 `tauri/`

## 当前执行起点

回到实现阶段时，默认按以下顺序落库：

- 先读 `handoff.md`，按冻结决策进入 Phase 1
- 读 `validation.md`，按 `MainShell` Spike 的通过标准推进
- 在 `tauri/` 建立最小壳层、renderer 基座与 Worker 注入链
- 以 `doc/UI/new/` 和 `foundation/` 为唯一 UI 与实现规范输入
- 继续保留 `electron/` 仅作历史对照，直到新壳启动链替换完成后再清理


## 当前结论

这次迁移本质上不是“把 Electron 换成另一个壳”这么简单，而是：

- 用 `Tauri 2` 重建桌面壳
- 从全新的 `MainShell` 外壳开始搭建新的前端结构
- 继续依托 `Worker + Contracts + API + SSE` 作为稳定底座
- 让 `doc/UI/new/` 成为后续实现与回归的唯一 UI 真相源

在这个前提下，**React 主线 + 动态端口 + 从全新 `MainShell` 开始重写 + 直接废弃 Electron 半成品作为产品路径**，是当前更符合仓库现实、也更干净的方案。
