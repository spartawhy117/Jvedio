## Feature Goal

- 以已冻结路线开始实施 `desktop-ui-shell-refactor`，正式主线为 `Tauri 2 + React + TypeScript + Jvedio.Worker + Jvedio.Contracts`。

## Frozen Decisions

- `React + TypeScript` 是唯一默认 renderer 路线，不再继续评估并行前端主线。
- Worker 正式继续采用**动态端口**。
- 新桌面壳目录正式冻结为 `tauri/`。
- `doc/UI/new/` 是唯一正式 UI 输入；主题、多语言、图片 / 图标长期规范统一看 `doc/UI/new/foundation/`。
- `electron/` 只保留为历史参考，不再作为产品路径或回退基线。
- 当前项目以个人使用为主；第三方图片资源保留最小来源备注即可，不引入重型合规流程。

## Start Here

回到实现阶段时，默认先读：

1. `plan/active/desktop-ui-shell-refactor/validation.md`
2. `doc/UI/new/README.md`
3. `doc/UI/new/page-index.md`
4. `doc/UI/new/flow/README.md`
5. `doc/UI/new/foundation/README.md`

## Immediate Next Work

1. 在 `tauri/` 建立最小可运行的 `MainShell` Spike。
2. 从壳层拉起 `Jvedio.Worker`，并把动态 `baseUrl` 注入 renderer。
3. 打通 `/api/app/bootstrap` 与 `/api/events`，确认首屏 bootstrap + SSE 能工作。
4. 先落主壳基础结构：左侧导航、右侧内容区、全局任务 / 提示入口。
5. 同步建立主题 token、多语言初始化与资源显色接线骨架，但只做最小可运行版本。

## Current Blockers

- 当前**无阻塞未决项**。
- 如 Phase 1 发现动态端口注入、Worker 生命周期或壳层打包存在新的系统级障碍，再回写 `open-questions.md`。
