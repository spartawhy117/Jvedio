## Feature Goal

- 将当前唯一 active feature 正式切换为 `Electron 前端 + C# Worker + localhost API` 路线，并先完成文档体系与进度跟踪体系落地。

## Locked Decisions

- 继续使用 `desktop-ui-shell-refactor` 作为唯一 active feature slug。
- 文档冻结阶段已完成，当前已进入阶段 C 的代码实现。
- 前端参考源改为 `QiaoKes/fntv-electron`，但只参考桌面壳、导航、页面组织和桌面交互方式。
- 后端继续复用现有 C# 能力，不做远程服务化。
- 第一阶段播放能力继续沿用外部播放器/系统默认播放器模式。
- `doc/UI/old/` 保留为旧界面基线，`doc/UI/new/` 视为 WPF 线稿历史参考。

## Current Phase

- 阶段 `C-3` 已完成：renderer Home 最小闭环已落地并通过构建、冒烟与 Release 构建验证；下一步先做 Home 聚焦回归，再进入 `C-4` 事件与错误收口。

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
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/contracts-naming.md`，冻结 `bootstrap / libraries / videos / actors / settings / tasks` 六组 contracts、事件、任务 payload 和错误码前缀。
- 已新增 `doc/UI/desktop-ui-shell-refactor/electron/home-mvp-implementation-entry.md`，冻结阶段 C 的首批工程范围、落地顺序、done 定义和验证顺序。
- 已更新 `doc/UI/desktop-ui-shell-refactor/electron/backend-bridge.md` 与 `README.md`，将桥接摘要和详细规格分层整理。
- 现有根目录 UI 文档已标注 Electron 规格为当前主入口，旧 WPF 线稿不再作为默认实施路线。
- 已新增 `Jvedio-WPF/Jvedio.Contracts`，落地 `Common / App / Libraries / Tasks` 四组首批 DTO 与事件 contracts。
- 已新增 `Jvedio-WPF/Jvedio.Worker`，落地 localhost 宿主骨架、健康检查端点和 `JVEDIO_WORKER_READY` 启动信号。
- 已新增根目录 `electron/` 工程骨架，落地 `main / preload / renderer` 三段最小启动链路，并通过 IPC 向 renderer 注入 Worker base URL。
- 已完成 `Release` 构建、`npm run build` 和 `npm run smoke`，确认 Electron 能拉起 Worker 并完成 ready 健康探测。
- 已完成 `C-2` Worker 同步接口闭环：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
- Worker 已复用 WPF Release 数据目录，当前通过 `JVEDIO_APP_BASE_DIR` 与路径探测共享 `app_datas.sqlite` / `app_configs.sqlite`。
- 已完成接口级验证：
  - `bootstrap / libraries / create / delete / tasks` 全部可调用
  - 创建测试库后已成功回删
  - sqlite 当前状态已回到单库初始状态
- `electron/` 再次通过 `npm run smoke`，确认 Electron 主进程仍可拉起 Worker 并等待 ready 健康探测。
- 已完成 `C-3` renderer Home 闭环：
  - 新增 renderer 侧 `api client / router / library nav / home controller` 最小实现
  - Home 已能加载 `bootstrap / libraries / tasks summary`
  - 新建库 / 删除库已接入 UI 对话框与反馈提示
  - 左侧导航已按真实库清单动态同步
  - `#/libraries/{libraryId}` 基础路由壳已打通
- 已完成 `C-3` 工程级验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `Jvedio-WPF/Jvedio.sln` `Release` 构建
- `C-3` 的聚焦功能回归尚未单独自动化，下一步应先完成人工走查后再进入 `C-4`。

## Next Recommended Work

### 方案路径

- 路径 A：
  - 先做 `C-3` 聚焦回归，再进入 `C-4`
  - 推荐
- 路径 B：
  - 直接继续 `C-4`，最后再集中回归
- 路径 C：
  - 先补 Electron E2E，再恢复功能开发

1. 先做 `C-3` 聚焦功能回归：
   - Home 首屏加载
   - 新建库 / 删除库
   - 左侧导航同步
   - 库路由跳转
   - 错误提示与删除后路由回退
2. 回归无阻塞后进入 `阶段 C-4`：
   - `GET /api/events`
   - `library.changed`
   - 任务摘要刷新
   - 结构化错误收口
3. `C-4` 完成后做阶段 C 整体回归：
   - 事件流
   - 错误流
   - Home MVP 端到端闭环

## Validation Steps

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立描述当前状态并作为新会话入口。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档结构完整。
- `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-audit.md` 存在且能独立说明借鉴边界。
- `doc/UI/desktop-ui-shell-refactor/reference/jellyfin-web-audit.md` 存在且能独立说明页面实现参考边界。
- `doc/UI/desktop-ui-shell-refactor/electron/frontend-page-rebuild-plan.md` 存在且能直接指导页面落地拆分。
- `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md` 存在且能直接指导 renderer 建目录。
- `doc/UI/desktop-ui-shell-refactor/electron/worker-api-spec.md` 存在且能直接指导 contracts 冻结。
- `doc/UI/desktop-ui-shell-refactor/electron/contracts-naming.md` 存在且能直接指导 `Jvedio.Contracts` 建目录。
- `doc/UI/desktop-ui-shell-refactor/electron/home-mvp-implementation-entry.md` 存在且能直接指导阶段 C 开工。
- 阶段 C 已拆为 `C-1` 到 `C-4`，并具备逐步测试策略。
- Release 构建通过。
- `Jvedio.Contracts` 与 `Jvedio.Worker` 已加入 `Jvedio-WPF/Jvedio.sln` 并可成功构建。
- `electron/` 已可通过 `npm run build` 完成 TypeScript 构建。
- `npm run smoke` 已验证 Electron 主进程可以拉起 `Jvedio.Worker` 并等待 ready 健康探测通过。
- Worker 接口人工验证通过：`GET /api/app/bootstrap`、`GET /api/libraries`、`POST /api/libraries`、`DELETE /api/libraries/{libraryId}`、`GET /api/tasks`。
- 测试库创建后已成功回删，`app_databases` 当前恢复为单条 `Jav` 记录。
- `C-3` renderer Home 闭环代码已落地，可通过 Home 页加载、库列表渲染、新建/删除对话框和 Library 路由壳串起最小 UI 链路。
- `Jvedio-WPF/Jvedio.sln` 已再次通过 `Release` 构建。

## Blockers And Caveats

- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须以此为主业务来源。
- 当前根目录旧 UI 文档仍保留，用于历史参考；实施时必须优先以 `electron/` 子目录为准。
- `fntv-electron` 的真实实现以远端页面加载和 preload 注入为主，不能误当作 Jvedio 本地页面工程模板。
- `jellyfin-web` 为大型新旧并存前端，不可整体照搬，只能按页面结构、hook 分层和视图状态建模做定向借鉴。
- Worker 端口是否固定值仍未最终冻结；renderer 侧应继续通过 preload 抽象 base URL。
- 第一阶段任务能力是否单独做任务中心页面仍保留为产品开放项。
