## Feature Goal

- 在 `doc/UI/new/` 本轮 UI 调整完成并冻结后，再开始实施 `desktop-ui-shell-refactor`；正式主线为 `Tauri 2 + React + TypeScript + Jvedio.Worker + Jvedio.Contracts`。


## Frozen Decisions

- `React + TypeScript` 是唯一默认 renderer 路线，不再继续评估并行前端主线。
- Worker 正式继续采用**动态端口**。
- 新桌面壳目录正式冻结为 `tauri/`。
- `doc/UI/new/` 是唯一正式 UI 输入；主题、多语言、图片 / 图标长期规范统一看 `doc/UI/new/foundation/`。
- `electron/` 只保留为历史参考，不再作为产品路径或回退基线。
- 当前项目以个人使用为主；第三方图片资源保留最小来源备注即可，不引入重型合规流程。

## Activation Gate

只有在以下条件全部满足后，才正式启动迁移实现：

1. `doc/UI/new/` 本轮 UI 调整已完成。
2. 页面、弹层、共享组件、流程和 `foundation/` 规范已达到可直接指导实现的状态。
3. 你明确发出“现在开始 `desktop-ui-shell-refactor`”的启动指令。

在上述条件满足前，当前 feature 只允许继续做 UI 文档收口、命名调整和规格冻结，不进入 `tauri/` 实现落库。

## Start Here After UI Freeze

当 UI 调整完成并准备正式启动迁移时，默认先读：

1. `plan/active/desktop-ui-shell-refactor/validation.md`
2. `doc/UI/new/README.md`
3. `doc/UI/new/page-index.md`
4. `doc/UI/new/flow/README.md`
5. `doc/UI/new/foundation/README.md`

## Recommended Kickoff Command

当你准备启动本重构时，直接使用这句：

> 我已完成 `doc/UI/new/` 的本轮 UI 调整并冻结，请按 `plan/active/desktop-ui-shell-refactor/handoff.md` 和 `validation.md` 启动 `desktop-ui-shell-refactor`，从 Phase 1 的 `MainShell` Spike 开始实施。

## Immediate Next Work After Kickoff

1. 在 `tauri/` 建立最小可运行的 `MainShell` Spike。
2. 从壳层拉起 `Jvedio.Worker`，并把动态 `baseUrl` 注入 renderer。
3. 打通 `/api/app/bootstrap` 与 `/api/events`，确认首屏 bootstrap + SSE 能工作。
4. 先落主壳基础结构：左侧导航、右侧内容区、全局任务 / 提示入口。
5. 同步建立主题 token、多语言初始化与资源显色接线骨架，但只做最小可运行版本。

## Current Blockers

- 当前唯一启动门槛是：`doc/UI/new/` 的本轮 UI 调整尚未完成前，不启动迁移实现。
- 如 UI 已冻结但 Phase 1 发现动态端口注入、Worker 生命周期或壳层打包存在新的系统级障碍，再回写 `open-questions.md`。

