## Feature Goal

- `doc/UI/new/` 本轮 UI 设计已完成并冻结，当前开始实施 `desktop-ui-shell-refactor`；正式主线为 `Tauri 2 + React + TypeScript + Jvedio.Worker + Jvedio.Contracts`。


## Frozen Decisions


- `React + TypeScript` 是唯一默认 renderer 路线，不再继续评估并行前端主线。
- Worker 正式继续采用**动态端口**。
- 新桌面壳目录正式冻结为 `tauri/`。
- `doc/UI/new/` 是唯一正式 UI 输入；主题、多语言、图片 / 图标长期规范统一看 `doc/UI/new/foundation/`。
- `electron/` 只保留为历史参考，不再作为产品路径或回退基线。
- 当前项目以个人使用为主；第三方图片资源保留最小来源备注即可，不引入重型合规流程。

## Activation Status

当前启动门槛已满足，`desktop-ui-shell-refactor` 可正式进入迁移实现：

1. `doc/UI/new/` 本轮 UI 调整已完成。
2. 页面、弹层、共享组件、流程和 `foundation/` 规范已达到可直接指导实现的状态。
3. 已明确发出“现在开始 `desktop-ui-shell-refactor`”的启动指令。

从现在起，不再停留在 UI 文档收口阶段；默认进入 `tauri/` 的 Phase 1 实现落库。

## Start Here Now

当前默认先读：

1. `plan/active/desktop-ui-shell-refactor/validation.md`
2. `doc/UI/new/README.md`
3. `doc/UI/new/page-index.md`
4. `doc/UI/new/flow/README.md`
5. `doc/UI/new/foundation/README.md`

## Recommended Kickoff Command

当前已完成 Phase 1 ~ Phase 4，后续恢复上下文时的标准口令：

> `doc/UI/new/` 已完成冻结，请按 `plan/active/desktop-ui-shell-refactor/handoff.md` 和 `validation.md` 继续推进 `desktop-ui-shell-refactor`，当前处于 Phase 5 的旧 Electron 清理阶段。


## Immediate Next Work After Kickoff

Phase 1 已全部完成 ✅，以下为已完成的实施范围：

1. ✅ `tauri/` 工程初始化与最小窗口启动
2. ✅ 壳层拉起 `Jvedio.Worker` 并注入动态 `baseUrl`
3. ✅ renderer 接通 `/api/app/bootstrap` 与 `/api/events`
4. ✅ 主壳基础布局与 Worker 未就绪 / 加载中 / 连接失败三类基础状态
5. ✅ `light / dark`、`zh / en` 与资源接线骨架的最小实现

Phase 2 已全部完成 ✅，以下为已完成的实施范围：

1. ✅ 完整 API Types + API Client 层（types.ts ~440 行, client.ts ~385 行）
2. ✅ 轻量路由系统 + 7 个页面骨架 + 返回导航 + query state 恢复
3. ✅ 6 个共享组件骨架：VideoCard, ActorCard, QueryToolbar, Pagination, ConfirmDialog, ResultState
4. ✅ SSE 事件总线 + useSSESubscription hooks + library.changed/settings.changed 自动刷新
5. ✅ Query 缓存层：useApiQuery + useApiMutation + invalidateQueries
6. ✅ Settings 页面完整读写骨架（左右分栏 + 6 组 + API 读写 + MetaTube 诊断）
7. ✅ ErrorBoundary（渲染错误兜底）+ GlobalToast（全局通知）

Phase 3 已全部完成 ✅，以下为已完成的实施范围：

1. ✅ MainShell — 导航交互优化 + SSE library.changed 刷新 + 任务摘要 i18n
2. ✅ LibraryManagementPage — 真实 API CRUD + CreateEditLibraryDialog + ConfirmDialog + scan
3. ✅ LibraryPage — video grid + useApiQuery + 6 种排序 + 分页 + SSE 自动刷新
4. ✅ VideoDetailPage — poster + VID + sidecar badge + play mutation + metadata grid + actors
5. ✅ FavoritesPage — 收藏影片网格 + QueryToolbar + 分页
6. ✅ ActorsPage — 演员卡片网格 + search + sort + 分页
7. ✅ ActorDetailPage — 演员详情头部 + 关联视频网格 + QueryToolbar + 分页
8. ✅ SettingsPage — showToast 反馈 + 占位文案用户化 + settings-hint-text 样式

共享组件补齐 ✅：
- ✅ ResultSummary — 统一结果摘要条，替换 4 个页面中的内联 page-count
- ✅ ActionStrip — 统一行内操作按钮组（browse/execute/edit/danger 四种变体）
- ✅ StatusBadge — 统一状态标签（pending/running/synced/failed + label/dot 两种展示模式）

Phase 4 已全部完成 ✅，以下为已完成的实施范围：

1. ✅ `App.xaml.cs` — `ElectronShellLauncher` 替换为 `TauriShellLauncher`
2. ✅ `Jvedio.csproj` — `PrepareElectronShellArtifacts` 替换为 `PrepareTauriShellArtifacts`
3. ✅ Tauri bundle 配置 — `bundle.resources` 将 Worker 打包进安装包的 `worker/` 目录
4. ✅ 构建脚本 — `tauri/scripts/prepare-worker.ps1` + `npm run build:release` 全流程
5. ✅ `electron/` 标记为 deprecated，README 明确注明废弃原因与清理时机

下一步进入 **Phase 5：旧 Electron 清理**（最终阶段），参见 `plan.md` 阶段 5 定义。

清理前提（须全部满足）：
1. 所有 `doc/UI/new/` 页面和弹层已在新壳下完成接线
2. Worker 启动、任务反馈、设置保存、播放链路验证通过
3. Release 构建、打包、启动链已稳定指向新壳
4. 关键回归项通过至少一轮完整验证

## Current Blockers

- 当前**无阻塞项**，可直接进入 Phase 5 的旧 Electron 清理。
- Phase 4 中未发现新的系统级障碍。
- Phase 5 清理前需确保上述 4 项前提全部满足。


