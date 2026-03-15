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

- 阶段 B：renderer / 页面规格 / contracts 冻结收尾。

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
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md`，把 renderer 目录推进到文件级骨架和 feature 边界。
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/worker-api-spec.md`，细化 Worker API 的请求/响应、任务模型、错误流和 SSE 订阅模型。
- 已完成五个页面文档与 renderer 组件边界对齐，页面规格已补齐 section、页面状态、API 依赖和分批实现边界。
- 已更新 `doc/UI/desktop-ui-shell-refactor/electron/backend-bridge.md` 与 `README.md`，将桥接摘要和详细规格分层整理。
- 现有根目录 UI 文档已标注 Electron 规格为当前主入口，旧 WPF 线稿不再作为默认实施路线。

## Next Recommended Work

### 方案路径

- 路径 A：
  - 先补齐页面文档与 contracts，再进入第一批实现
  - 推荐
- 路径 B：
  - 直接开始 Home 最小实现，缺什么补什么
- 路径 C：
  - 先做 Electron 壳层与 localhost 通路 Spike

1. 执行路径 A 的第 2 步，基于 `worker-api-spec.md` 冻结 contracts 目录和 DTO 命名规则：
   - bootstrap
   - libraries
   - videos
   - actors
   - settings
   - tasks
2. 页面规格与 contracts 同步完成后，再进入阶段 C 的 Home 库管理最小闭环实现。

## Validation Steps

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立描述当前状态并作为新会话入口。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档结构完整。
- `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-audit.md` 存在且能独立说明借鉴边界。
- `doc/UI/desktop-ui-shell-refactor/reference/jellyfin-web-audit.md` 存在且能独立说明页面实现参考边界。
- `doc/UI/desktop-ui-shell-refactor/electron/frontend-page-rebuild-plan.md` 存在且能直接指导页面落地拆分。
- `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md` 存在且能直接指导 renderer 建目录。
- `doc/UI/desktop-ui-shell-refactor/electron/worker-api-spec.md` 存在且能直接指导 contracts 冻结。
- Release 构建通过。

## Blockers And Caveats

- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须以此为主业务来源。
- 当前根目录旧 UI 文档仍保留，用于历史参考；实施时必须优先以 `electron/` 子目录为准。
- `fntv-electron` 的真实实现以远端页面加载和 preload 注入为主，不能误当作 Jvedio 本地页面工程模板。
- `jellyfin-web` 为大型新旧并存前端，不可整体照搬，只能按页面结构、hook 分层和视图状态建模做定向借鉴。
- Worker 端口是否固定值仍未最终冻结；renderer 侧应继续通过 preload 抽象 base URL。
- 第一阶段任务能力是否单独做任务中心页面仍保留为产品开放项。
