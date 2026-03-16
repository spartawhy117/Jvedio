# Desktop UI New

本目录是当前 exe UI 调整的唯一实施文档入口。

如果后续继续做界面收口、结构调整或视觉对齐，默认先看本目录，再决定是否需要回看 `../desktop-ui-shell-refactor/electron/` 下的架构说明。

## 当前使用方式

- 页面线框：
  - `main-shell.*`
  - `library-management-page.*`
  - `library-page.*`
  - `favorites-page.*`
  - `actors-page.*`
  - `actor-detail-page.*`
  - `categories-page.*`
  - `series-page.*`
  - `video-detail-page.*`
  - `settings-page.*`
  - `create-edit-library-dialog.*`
  - `delete-library-dialog.*`
  - `task-detail-dialog.*`
  - `shared-components.*`
  - `page-index.md`
  - `ui-todo.md`
- 对应规格：
  - `main-shell.md`
  - `library-management-page.md`
  - `library-page.md`
  - `favorites-page.md`
  - `actors-page.md`
  - `actor-detail-page.md`
  - `categories-page.md`
  - `series-page.md`
  - `video-detail-page.md`
  - `settings-page.md`
  - `create-edit-library-dialog.md`
  - `delete-library-dialog.md`
  - `task-detail-dialog.md`
  - `shared-components.md`

## 文档边界

- 本目录负责：
  - 当前 exe UI 的页面结构、主要交互、线框和图标语义
  - 当前 exe UI 的页面级功能说明与共享组件约束
- `../desktop-ui-shell-refactor/electron/` 负责：
  - Electron 路线的架构、桥接、API、阶段规划
- `../old/` 负责：
  - 旧界面基线截图

## 当前约束

- 当前 exe UI 调整优先对齐这里的线框和规格，不再以 `desktop-ui-shell-refactor` 根目录旧说明文档作为实施依据。
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
- 共享组件约束统一写在 `shared-components.md`，页面文档直接引用，不在每页重复发散描述。
- `library-page` 现在统一表示“单个媒体库的内容页”，不再并行保留 `library-page-content` 这一页面名称。
- 旧的库编辑样式线框已从当前正式文档集中删除，避免再与当前正式 `library-page.*` 混用。
- 当前正式页面、弹层和共享组件图都要求同时具备：
  - `.png`
  - `.excalidraw`
  - `.md`
