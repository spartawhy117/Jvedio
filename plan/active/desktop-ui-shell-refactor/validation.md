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
