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
- 现有根目录 UI 文档已标注 Electron 规格为当前主入口，旧 WPF 线稿不再作为默认实施路线。

## Next Recommended Work

1. 拉取 `D:\study\Proj\fntv-electron` 作为本地参考仓库，并补充本地比对记录。
2. 输出 Electron 前端页面级细化文档：
   - Home
   - Library
   - Actors
   - Video Detail
   - Settings
3. 输出 Worker API 草案与前后端事件流草案。
4. 再进入第二大步：库管理能力实现。

## Validation Steps

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立描述当前状态并作为新会话入口。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档结构完整。
- Release 构建通过。

## Blockers And Caveats

- 当前尚未拉取本地 `fntv-electron` 仓库；本轮仅完成文档落地。
- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须以此为主业务来源。
- 当前根目录旧 UI 文档仍保留，用于历史参考；实施时必须优先以 `electron/` 子目录为准。
