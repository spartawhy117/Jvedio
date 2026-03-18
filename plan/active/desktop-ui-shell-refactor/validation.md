# Desktop UI Shell Refactor Validation

## 当前阶段

- **Phase 1：`MainShell` Spike 已完成** ✅
- 所有 Phase 1 必过验证项已满足，可进入 Phase 2。
- `doc/UI/new/` 本轮 UI 设计已完成并冻结；`plan.md` 提供完整冻结方案，`handoff.md` 提供实施起点，`doc/UI/new/` 提供 UI 真相源。

## 启动状态确认

当前进入 **Phase 1: `MainShell` Spike** 的前置条件已满足：

- `doc/UI/new/` 本轮 UI 调整已完成并冻结。
- 页面、弹层、共享组件、流程与 `foundation/` 规范已足以直接指导实现。
- 已明确下达启动重构指令，后续不再停留在 UI 文档迭代阶段。


## Phase 1 必过验证项


### 壳层与进程

- ✅ `tauri/` 可独立启动最小桌面壳。
- ✅ 壳层能拉起 `Jvedio.Worker`，并能感知其 ready 状态。
- ✅ 壳层能把动态 `baseUrl` 注入 renderer，而不是写死端口。
- ✅ Worker 异常退出、未就绪或启动失败时，壳层和 renderer 都有明确反馈。

### Bootstrap 与事件流

- ✅ renderer 首屏能请求 `GET /api/app/bootstrap`。
- ✅ renderer 能连接 `GET /api/events`。
- ✅ 至少完成以下事件的首轮验证：
  - `worker.ready`
  - `task.summary.changed`
  - `settings.changed`

### UI 基座

- ✅ 主壳具备左侧导航 + 右侧内容区的最小结构。
- ✅ 存在 Worker 未就绪、加载中、连接失败三类基础状态呈现。
- ✅ 页面集合和导航命名不偏离 `doc/UI/new/page-index.md`。

### 基础规范接线

- ✅ 主题层至少建立 `light / dark` 的状态与 token 骨架。
- ✅ 多语言层至少完成 `zh / en` 资源初始化骨架。
- ✅ 资源层至少明确通用 icon、单色 SVG 和业务媒体图片三类接线方式。

## Phase 1 通过标准

满足以下条件即可进入 Phase 2：

- ✅ `MainShell` Spike 能独立运行。
- ✅ Worker 拉起、bootstrap 获取、SSE 订阅三条链路打通。
- ✅ UI 基座、主题骨架、多语言骨架、资源显色骨架已具备继续扩展条件。
- ✅ 不再依赖任何 Electron 运行时才能验证新壳主线。

## 执行注意事项

- 实现始终以 `doc/UI/new/` 为准，不让代码反向改写页面职责。
- 涉及主题、多语言、图片 / 图标接线时，先对照 `foundation/` 对应文档。
- 如 Phase 1 暴露新的系统级阻塞，再回写 `open-questions.md`，不要把未冻结决策散落到聊天结论里。

## Phase 1 实施记录

### 提交历史
- `3156e69` feat(tauri): Phase 1.1 + 1.2 — Tauri shell skeleton + Worker process management
- `f7f5617` feat(tauri): Phase 1.3 — renderer connects /api/app/bootstrap and /api/events SSE
- `545ecb5` feat(tauri): Phase 1.4 — main shell layout + Worker three-state overlay
- `3dfe2d0` feat(tauri): Phase 1.5 — theme system + i18n + asset registry skeleton

### 关键文件清单
- `tauri/src-tauri/src/worker.rs` — Worker 子进程生命周期管理
- `tauri/src-tauri/src/lib.rs` — Tauri setup + Worker 集成
- `tauri/src/contexts/WorkerContext.tsx` — Worker 连接状态
- `tauri/src/contexts/BootstrapContext.tsx` — Bootstrap + SSE 状态
- `tauri/src/api/` — API client + SSE + TypeScript 类型
- `tauri/src/theme/` — 主题系统（ThemeModeProvider + tokens）
- `tauri/src/locales/` — i18n（zh + en 按模块拆分）
- `tauri/src/assets/asset-registry.ts` — 资源注册骨架

## Phase 2 必过验证项

### API 类型与客户端层（2.1）

- ✅ TypeScript 类型文件完整镜像 `Jvedio.Contracts` 所有 DTO
- ✅ ApiClient 覆盖所有 Worker 端点（库、影片、演员、任务、设置、诊断）
- ✅ WorkerApiError 提供结构化错误（statusCode, requestId, userMessage, retryable）
- ✅ 全局单例模式（createApiClient / getApiClient）

### 路由与页面骨架（2.2）

- ✅ 轻量路由系统，PageKey 与 `page-index.md` 一一对应（7 页）
- ✅ 返回导航支持 history stack + query state 恢复（keyword, sortBy, pageIndex）
- ✅ navigate / goBack / setQuery / replace 四种导航操作
- ✅ 7 个页面骨架全部创建：settings, library-management, library, favorites, actors, actor-detail, video-detail

### 共享组件骨架（2.3）

- ✅ VideoCard — 16:9 缩略图 + 状态指示 + VID + 日期
- ✅ ActorCard — 圆形头像 + 名字 + 影片数
- ✅ QueryToolbar — 搜索框 + 刷新 + 排序下拉
- ✅ Pagination — ‹ [page/total] › [Go] + 编辑跳转
- ✅ ConfirmDialog — 模态弹层 + 危险模式 + loading
- ✅ ResultState — Loading / Empty / Error 三态

### SSE 订阅层 + Query 缓存层（2.4）

- ✅ 全局 SSE 事件总线（dispatchSSEEvent）支持按事件名订阅
- ✅ useSSESubscription hook + 便捷 hooks（useOnLibraryChanged, useOnSettingsChanged, useOnTaskEvent）
- ✅ BootstrapContext 集成事件总线分发
- ✅ library.changed → 刷新 library 列表 + 失效缓存
- ✅ settings.changed → 失效设置缓存
- ✅ task.* → 失效任务缓存
- ✅ useApiQuery — 基于 key 的查询缓存、loading/error/data 状态、refetch、invalidateQueries
- ✅ useApiMutation — 变更操作 + onSuccess/onError 回调

### Settings 页面基础结构（2.5）

- ✅ 左右分栏布局 + 6 组导航（基本、图片、扫描与导入、网络、库、MetaTube）
- ✅ 接入 useApiQuery 读取 Worker 设置
- ✅ 接入 useApiMutation 保存设置 + 恢复默认
- ✅ MetaTube 诊断功能接入
- ✅ SSE settings.changed 自动刷新
- ✅ 表单脏状态追踪 + 保存/失败反馈

### Error Boundary + 全局 Toast（2.6）

- ✅ ErrorBoundary — class component，捕获渲染错误，显示 fallback + retry
- ✅ GlobalToast — 全局 toast 通知（info/success/warning/error），自动消失
- ✅ showToast() 函数可在任意组件中调用
- ✅ ErrorBoundary 包裹整个 App
- ✅ GlobalToast 渲染在最顶层

## Phase 2 通过标准

满足以下条件即可进入 Phase 3：

- ✅ API client + 类型层完整覆盖 Worker 端点
- ✅ 路由系统 + 返回链路 + 页面骨架就绪
- ✅ 共享组件骨架可复用于后续业务页面
- ✅ SSE 事件总线 + Query 缓存层就绪
- ✅ Settings 页面具备完整读写骨架
- ✅ 错误边界 + 全局 toast 就绪
- ✅ 所有代码通过 TypeScript 编译 + Vite 构建

## Phase 2 实施记录

### 提交历史
- `0fc0336` Phase 2.1 — complete API types + API client layer
- `8945004` Phase 2.2 — router system + page skeletons + back navigation
- `26ce2f9` Phase 2.3 — shared UI component skeletons
- `685061f` Phase 2.4 — SSE subscription layer and query cache hooks
- `89b0cfe` Phase 2.5 — settings page full structure with read/write skeleton
- `0473924` Phase 2.6 — ErrorBoundary + GlobalToast integration

### 关键文件清单
- `tauri/src/api/types.ts` — 全量 DTO 类型（~440 行）
- `tauri/src/api/client.ts` — ApiClient 全端点覆盖（~385 行）
- `tauri/src/router/RouterProvider.tsx` — 轻量路由 + 历史栈
- `tauri/src/pages/` — 7 个页面骨架
- `tauri/src/components/shared/` — 6 个共享组件 + barrel export
- `tauri/src/hooks/useApiQuery.ts` — Query 缓存层
- `tauri/src/hooks/useSSESubscription.ts` — SSE 事件总线 + 订阅 hooks
- `tauri/src/components/ErrorBoundary.tsx` — 错误边界
- `tauri/src/components/GlobalToast.tsx` — 全局 toast

## Phase 3 必过验证项

### 业务页迁移（3.1–3.8）

- ✅ MainShell — 导航交互优化 + SSE library.changed 刷新 + 任务摘要 i18n
- ✅ LibraryManagementPage — 真实 API CRUD + CreateEditLibraryDialog + ConfirmDialog + scan
- ✅ LibraryPage — video grid + useApiQuery + 6 种排序 + 分页 + SSE 自动刷新
- ✅ VideoDetailPage — poster + VID + sidecar badge + play mutation + metadata grid + actors
- ✅ FavoritesPage — 收藏影片网格 + QueryToolbar + 分页
- ✅ ActorsPage — 演员卡片网格 + search + sort + 分页
- ✅ ActorDetailPage — 演员详情头部 + 关联视频网格 + QueryToolbar + 分页
- ✅ SettingsPage — showToast 反馈 + 占位文案用户化 + settings-hint-text 样式

### 共享组件补齐

- ✅ ResultSummary — 统一结果摘要条，替换 4 个页面中的内联 page-count
- ✅ ActionStrip — 统一行内操作按钮组（browse/execute/edit/danger 四种变体）
- ✅ StatusBadge — 统一状态标签（pending/running/synced/failed + label/dot 两种展示模式）

## Phase 3 通过标准

- ✅ 所有 8 个业务页已接入真实 API 数据
- ✅ 9 个共享组件全部独立实现并替换内联写法
- ✅ tsc --noEmit 零错误通过

## Phase 3 实施记录

### 提交历史
- `da6b121` Phase 3.1 — MainShell navigation refinement + i18n expansion
- `687758c` Phase 3.2 — LibraryManagement real API CRUD + dialogs + scan
- `8402fe2` Phase 3.3 — LibraryPage video grid + query + sort + pagination
- `9b53650` Phase 3.4 — VideoDetailPage detail + play + sidecar + actors
- `4b3acd8` Phase 3.5 — FavoritesPage real API video grid + pagination
- `bcda5fa` Phase 3.6 — ActorsPage real API actor grid + pagination
- `dfbea32` Phase 3.7 — ActorDetailPage real API actor detail + associated videos grid
- `7397a8c` Phase 3.8 — SettingsPage toast feedback + i18n polish + hint text styling
- `e16690d` shared-components — add ResultSummary, ActionStrip, StatusBadge + replace inline usages

## Phase 4 必过验证项

### Launcher 切换

- ✅ `App.xaml.cs` — `ElectronShellLauncher` 类已替换为 `TauriShellLauncher`
- ✅ Release 模式下 `OnStartup` 优先尝试启动 Tauri 壳，失败时 fallback 到 WPF
- ✅ `JVEDIO_FORCE_LEGACY_WPF` 环境变量继续可用

### 构建目标切换

- ✅ `Jvedio.csproj` — `PrepareElectronShellArtifacts` Target 已替换为 `PrepareTauriShellArtifacts`
- ✅ 新 Target 构建 Worker + 调用 `npm run tauri build` + 复制产物到 `tauri-shell/` 和 `worker/`
- ✅ 不再依赖 `electron/node_modules/electron/dist/electron.exe`

### Tauri Bundle 配置

- ✅ `tauri.conf.json` — `bundle.resources` 将 `worker-dist/` 映射到安装包内 `worker/`
- ✅ `tauri/scripts/prepare-worker.ps1` — 独立 Worker 预构建脚本
- ✅ `tauri/package.json` — `build:release` 命令串联 Worker 预构建 + Tauri 构建

### Electron 废弃

- ✅ `electron/README.md` 更新为 DEPRECATED 标记，注明废弃原因与 Phase 5 清理时机
- ✅ 旧 Electron 构建目标、runtime 检查、产物复制已全部移除

## Phase 4 通过标准

- ✅ Launcher 切换为 Tauri（`TauriShellLauncher`）
- ✅ 构建目标切换为 Tauri（`PrepareTauriShellArtifacts`）
- ✅ Tauri bundle 能打包 Worker（通过 `bundle.resources` 配置）
- ✅ `electron/` 标记为 deprecated
- ✅ 旧 Electron 构建链已不再是默认产品路径

## Phase 4 实施记录

### 关键文件变更
- `Jvedio-WPF/Jvedio/App.xaml.cs` — `ElectronShellLauncher` → `TauriShellLauncher`
- `Jvedio-WPF/Jvedio/Jvedio.csproj` — `PrepareElectronShellArtifacts` → `PrepareTauriShellArtifacts`
- `tauri/src-tauri/tauri.conf.json` — 添加 `bundle.resources` 配置
- `tauri/scripts/prepare-worker.ps1` — 新增 Worker 预构建脚本
- `tauri/package.json` — 新增 `prepare-worker` + `build:release` 脚本
- `tauri/.gitignore` — 添加 `worker-dist` 忽略规则
- `electron/README.md` — 标记为 DEPRECATED
