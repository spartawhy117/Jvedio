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
  - `dialogs/task-detail-dialog.*`
- 共享组件三件套：
  - `shared/shared-components.*`
- 流程图：
  - `flow/*.png`
  - `flow/*.excalidraw`
- 根目录索引与说明：
  - `README.md`
  - `page-index.md`
  - `ui-todo.md`
  - `flow/README.md`
  - `_archive/README.md`

## 文档边界

- 本目录负责：
  - 当前 exe UI 的页面结构、主要交互、线框和共享组件约束
  - 当前 exe UI 的页面级功能说明与共享组件约束
  - 当前 exe UI 的主链路流程图
- `../../../plan/active/desktop-ui-shell-refactor/` 负责：
  - 当前 active feature 的阶段、验证、交接和实现计划
- `../old/` 负责：
  - 旧界面基线截图

## 当前约束

- 当前 exe UI 调整优先对齐这里的线框和规格，不再依赖已退役的旧 UI 重构目录。
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
