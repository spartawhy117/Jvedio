# Desktop UI Shell Refactor Validation

## 当前阶段

- 当前已完成文档审查与冻结，下一步直接进入 **Phase 1: `MainShell` Spike**。
- `plan.md` 提供完整冻结方案，`handoff.md` 提供执行起点，`doc/UI/new/` 提供 UI 真相源。

## Phase 1 必过验证项

### 壳层与进程

- `tauri/` 可独立启动最小桌面壳。
- 壳层能拉起 `Jvedio.Worker`，并能感知其 ready 状态。
- 壳层能把动态 `baseUrl` 注入 renderer，而不是写死端口。
- Worker 异常退出、未就绪或启动失败时，壳层和 renderer 都有明确反馈。

### Bootstrap 与事件流

- renderer 首屏能请求 `GET /api/app/bootstrap`。
- renderer 能连接 `GET /api/events`。
- 至少完成以下事件的首轮验证：
  - `worker.ready`
  - `task.summary.changed`
  - `settings.changed`

### UI 基座

- 主壳具备左侧导航 + 右侧内容区的最小结构。
- 存在 Worker 未就绪、加载中、连接失败三类基础状态呈现。
- 页面集合和导航命名不偏离 `doc/UI/new/page-index.md`。

### 基础规范接线

- 主题层至少建立 `light / dark` 的状态与 token 骨架。
- 多语言层至少完成 `zh / en` 资源初始化骨架。
- 资源层至少明确通用 icon、单色 SVG 和业务媒体图片三类接线方式。

## Phase 1 通过标准

满足以下条件即可进入 Phase 2：

- `MainShell` Spike 能独立运行。
- Worker 拉起、bootstrap 获取、SSE 订阅三条链路打通。
- UI 基座、主题骨架、多语言骨架、资源显色骨架已具备继续扩展条件。
- 不再依赖任何 Electron 运行时才能验证新壳主线。

## 执行注意事项

- 实现始终以 `doc/UI/new/` 为准，不让代码反向改写页面职责。
- 涉及主题、多语言、图片 / 图标接线时，先对照 `foundation/` 对应文档。
- 如 Phase 1 暴露新的系统级阻塞，再回写 `open-questions.md`，不要把未冻结决策散落到聊天结论里。

## 本轮说明

- 本轮仅更新文档，不涉及实现代码。
- 按仓库规则，本轮不要求运行 `Jvedio.Test` 集成测试；但提交前仍需完成 Release 构建。
