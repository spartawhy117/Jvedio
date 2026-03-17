# Desktop UI New

本目录是当前 exe UI 调整的唯一实施文档入口。

如果后续继续做界面收口、结构调整或视觉对齐，默认先看本目录；阶段、验证和技术实现背景统一回看 `plan/active/desktop-ui-shell-refactor/`。

## 当前使用方式

- 页面三件套：
  - `pages/main-shell.*`
  - `pages/library-management-page.*`
  - `pages/library-page.*`
  - `pages/favorites-page.*`
  - `pages/actors-page.*`
  - `pages/actor-detail-page.*`
  - `pages/categories-page.*`
  - `pages/series-page.*`
  - `pages/video-detail-page.*`
  - `pages/settings-page.*`
- 弹层资产：
  - `dialogs/create-edit-library-dialog.*`
  - `dialogs/delete-library-dialog.*`
  - `dialogs/video-context-menu.*`
  - `dialogs/README.md`
- 共享组件三件套：
  - `shared/shared-components.*`
- 基础实现规范：
  - `foundation/README.md`
  - `foundation/theme-and-appearance.md`
  - `foundation/localization.md`
  - `foundation/assets-icons-and-coloring.md`

- 流程图：

  - `flow/*.png`
  - `flow/*.excalidraw`
- 根目录索引与说明：
  - `README.md`
  - `page-index.md`
  - `ui-todo.md`
  - `flow/README.md`
  - `_archive/README.md`

## 后续执行默认阅读顺序

- 先看 `../../plan/active/desktop-ui-shell-refactor/handoff.md`，确认技术主线、冻结决策和下一步。
- 再看 `page-index.md`，快速定位当前页面、弹层、共享组件与基础规范。
- 进入具体页面实现前，先看对应 `pages/*.md` 与 `flow/README.md`。
- 涉及主题、多语言或图片 / 图标接线时，再进入 `foundation/` 对应规范。

## 文档边界


- 本目录负责：
  - 当前 exe UI 的页面结构、主要交互、线框和共享组件约束
  - 当前 exe UI 的页面级功能说明与共享组件约束
  - 当前 exe UI 的主链路流程图
  - 当前 exe UI 的主题、多语言与静态资源实现规范
- `../../../plan/active/desktop-ui-shell-refactor/` 负责：
  - 当前 active feature 的阶段、验证、交接和实现计划
  - 冻结为什么采用这些方案，而不是承载长期实现细则
- `../old/` 负责：
  - 旧界面基线截图

## 当前约束

- 当前 exe UI 调整优先对齐这里的线框和规格，不再依赖已退役的旧 UI 重构目录。
- 在 `doc/UI/new/` 本轮 UI 调整完成并冻结前，不启动 `desktop-ui-shell-refactor` 的真实迁移实现；此阶段只继续收口 UI 文档本身。

- 当前正式 UI 图片与流程图统一采用白色背景底图方案，不再保留深色背景版本。
- 若页面实现与本目录规格不一致，先更新本目录文档，再继续改代码。
- 当前 `库管理` 页不保留 `导入 / 恢复` 入口。
- 当前可用的是影片扫描导入；面向最终用户的库配置导入 / 数据恢复流程在现有 Electron / Worker 和旧 WPF 中都未形成完整可用产品链路。
- 每个页面规格文档后续都应按统一模板补齐：
  - `页面目的`
  - `页面范围`
  - `数据来源`
  - `元素清单`
  - `交互规则`
  - `状态定义`
  - `性能与体验约束`
  - `回归点`
- 共享组件约束统一写在 `shared/shared-components.md`，页面文档直接引用，不在每页重复发散描述。
- `library-page` 现在统一表示“单个媒体库的内容页”，不再并行保留 `library-page-content` 这一页面名称。
- 旧的库编辑样式线框已从当前正式文档集中删除，避免再与当前正式 `pages/library-page.*` 混用。
- 当前正式页面、弹层和共享组件图都要求同时具备：
  - `.png`
  - `.excalidraw`
  - `.md`
- 当前正式流程图统一收口到 `flow/`，每张流程图至少具备：
  - `.png`
  - `.excalidraw`
- 当前多语言首批只做 `zh` 与 `en`；目录结构可参考 `clash-verge-rev` 的 `locales/{lang}/index.ts + *.json` 方式组织。
- 当前图片 / 图标资源优先分为：品牌与应用资产、业务与页面图标、通用操作图标；通用图标优先走 icon library，品牌与业务图标再维护自有 SVG。
- 主题、多语言与图片 / 图标的长期实现细则统一维护在 `foundation/`；这三类内容不再只写在 `plan.md` 中。
- `flow/README.md` 是正式流程图的文字索引与流程摘要入口；如果修改了任意 `flow/*.png` 或 `flow/*.excalidraw`，必须同步更新 `flow/README.md` 中对应说明。
