## Feature Goal

- 将当前唯一 active feature 正式切换为 `Electron 前端 + C# Worker + localhost API` 路线，并先完成文档体系与进度跟踪体系落地。

## Locked Decisions

- 继续使用 `desktop-ui-shell-refactor` 作为唯一 active feature slug。
- 本轮只做文档，不进入代码改造。
- 前端参考源改为 `QiaoKes/fntv-electron`，但只参考桌面壳、导航、页面组织和桌面交互方式。
- 后端继续复用现有 C# 能力，不做远程服务化。
- 第一阶段播放能力继续沿用外部播放器/系统默认播放器模式。
- `doc/UI/old/` 保留为旧界面基线，`doc/UI/new/` 视为 WPF 线稿历史参考。

## Current Phase

- 阶段 A：方案文档与参考资产落地。

## Latest Progress

- 已重写 active feature 的核心规划文档为 Electron 路线。
- 已在 `doc/UI/desktop-ui-shell-refactor/electron/` 下建立新的稳定规格层。
- 已在 `doc/UI/desktop-ui-shell-refactor/reference/` 下补充 `fntv-electron` 参考说明。
- 已拉取本地参考仓库 `D:\study\Proj\fntv-electron`。
- 已完成基于真实源码的首轮结构审计，并新增 `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-audit.md`。
- 已确认 `fntv-electron` 更适合作为“桌面壳 + preload 注入 + 本地播放器/代理增强”参考，而不是 Jvedio 页面实现模板。
- 已拉取本地参考仓库 `D:\study\Proj\jellyfin-web`。
- 已完成 `jellyfin-web` 首轮结构审计，并新增 `doc/UI/desktop-ui-shell-refactor/reference/jellyfin-web-audit.md`。
- 已产出 `doc/UI/desktop-ui-shell-refactor/electron/frontend-page-rebuild-plan.md`，明确 `fntv-electron` 与 `jellyfin-web` 的双参考分工。
- 现有根目录 UI 文档已标注 Electron 规格为当前主入口，旧 WPF 线稿不再作为默认实施路线。

## Next Recommended Work

1. 基于新的双参考策略，补齐 renderer 真实目录与组件拆分草案：
   - app
   - features
   - components
   - hooks
2. 对照当前规格再检查 Electron 前端页面级文档是否需要补充：
   - Home
   - Library
   - Actors
   - Video Detail
   - Settings
3. 细化 Worker API 草案与前后端事件流草案，补足更具体的任务模型、错误流和任务订阅模型。
4. 再进入第二大步：库管理能力实现。

## Validation Steps

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立描述当前状态并作为新会话入口。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档结构完整。
- `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-audit.md` 存在且能独立说明借鉴边界。
- `doc/UI/desktop-ui-shell-refactor/reference/jellyfin-web-audit.md` 存在且能独立说明页面实现参考边界。
- `doc/UI/desktop-ui-shell-refactor/electron/frontend-page-rebuild-plan.md` 存在且能直接指导页面落地拆分。
- Release 构建通过。

## Blockers And Caveats

- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须以此为主业务来源。
- 当前根目录旧 UI 文档仍保留，用于历史参考；实施时必须优先以 `electron/` 子目录为准。
- `fntv-electron` 的真实实现以远端页面加载和 preload 注入为主，不能误当作 Jvedio 本地页面工程模板。
- `jellyfin-web` 为大型新旧并存前端，不可整体照搬，只能按页面结构、hook 分层和视图状态建模做定向借鉴。
