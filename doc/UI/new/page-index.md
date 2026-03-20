# Desktop UI Page Index

本文件是当前 exe UI 页面、弹层、共享组件与基础实现规范的总索引。

用途：
- 快速查看当前正式图片文件名
- 快速定位对应规格文档
- 快速定位主题、多语言和图片 / 图标规范入口
- 用极简描述回顾每个页面承担的主要功能

## 页面索引

| 名称 | 图片 | 文档 | 极简功能说明 |
| --- | --- | --- | --- |
| `main-shell` | `pages/main-shell.png` | `pages/main-shell.md` | 主窗口共享壳层，负责品牌区、一级导航和库导航区。 |
| `library-management-page` | `pages/library-management-page.png` | `pages/library-management-page.md` | 库管理首页，负责建库、开库、扫描、编辑、删除和库级任务状态查看。 |
| `library-page` | `pages/library-page.png` | `pages/library-page.md` | 单个媒体库内容页，负责库内影片浏览、筛选、排序、分页和进入影片详情。 |
| `favorites-page` | `pages/favorites-page.png` | `pages/favorites-page.md` | 喜欢影片聚合页，负责展示收藏结果集和统一结果区交互。 |
| `actors-page` | `pages/actors-page.png` | `pages/actors-page.md` | 演员聚合列表页，负责演员搜索、排序、分页和进入演员详情。 |
| `actor-detail-page` | `pages/actor-detail-page.png` | `pages/actor-detail-page.md` | 独立演员详情页，负责演员头部信息、关联影片和返回链路。 |
| `video-detail-page` | `pages/video-detail-page.png` | `pages/video-detail-page.md` | 影片详情页，负责详情信息展示、播放入口和返回来源恢复。 |
| `settings-page` | `pages/settings-page.png` | `pages/settings-page.md` | 设置页，负责分组设置、保存、恢复默认和 MetaTube diagnostics。 |

## 弹层与共享组件索引

| 名称 | 图片 | 文档 | 极简功能说明 |
| --- | --- | --- | --- |
| `confirm-dialog` | `dialogs/confirm-dialog.png` | `dialogs/confirm-dialog.md` | 通用确认对话框骨架，固定 `取消 / 确认`，正文说明由调用方传入。 |
| `create-edit-library-dialog` | `dialogs/create-edit-library-dialog.png` | `dialogs/create-edit-library-dialog.md` | 新建/编辑媒体库弹层，统一库名与扫描目录输入。 |
| `delete-library-dialog` | `dialogs/delete-library-dialog.png` | `dialogs/delete-library-dialog.md` | 删除媒体库确认弹层，显示影响范围并执行二次确认。 |
| `video-context-menu` | `dialogs/video-context-menu.png` | `dialogs/video-context-menu.md` | 影片卡片右键与更多按钮共用动作菜单，固定收口 6 个高频动作，含删除原片危险项。 |
| `video-batch-context-menu` | `dialogs/video-batch-context-menu.png` | `dialogs/video-batch-context-menu.md` | 多选影片后的右键批量动作菜单，统一收口收藏、重抓、取消选择与删除。 |
| `shared-components` | `shared/shared-components.png` | `shared/shared-components.md` | 共享组件总览，统一影片卡片、摘要条、分页、状态和通用确认对话框骨架。 |

## 基础实现规范索引

| 名称 | 文档 | 极简功能说明 |
| --- | --- | --- |
| `foundation-overview` | `foundation/README.md` | 主题、多语言、图片 / 图标规范的总入口与维护规则。 |
| `theme-and-appearance` | `foundation/theme-and-appearance.md` | `light / dark` 双主题的状态分层、token 与切换流程。 |
| `localization` | `foundation/localization.md` | `zh / en` 的目录结构、初始化顺序和 key 组织。 |
| `assets-icons-and-coloring` | `foundation/assets-icons-and-coloring.md` | 图片 / 图标分类、显色策略、目录约定与接入流程。 |
| `startup-splash-implementation` | `foundation/startup-splash-implementation.md` | 启动期 Splash 承载、主窗口延迟显示与错误回退实施方案。 |



## 流程图索引


| 名称 | 图片 | 源文件 | 极简功能说明 |
| --- | --- | --- | --- |
| `main-shell-navigation-flow` | `flow/main-shell-navigation-flow.png` | `flow/main-shell-navigation-flow.excalidraw` | 主壳一级导航和影视库入口如何切换右侧内容区。 |
| `library-management-flow` | `flow/library-management-flow.png` | `flow/library-management-flow.excalidraw` | 库管理页的建库、编辑、删除、扫描和打开单库主链路。 |
| `library-workbench-flow` | `flow/library-workbench-flow.png` | `flow/library-workbench-flow.excalidraw` | 单库页的结果集浏览、影片右键动作菜单、删除原片链路、任务反馈和详情返回链路。 |
| `favorites-flow` | `flow/favorites-flow.png` | `flow/favorites-flow.excalidraw` | 喜欢页的结果集浏览和返回恢复。 |
| `actors-flow` | `flow/actors-flow.png` | `flow/actors-flow.excalidraw` | Actors 列表、演员详情、关联影片和二级返回链路。 |
| `video-detail-playback-flow` | `flow/video-detail-playback-flow.png` | `flow/video-detail-playback-flow.excalidraw` | 影片详情读取、播放、写回和 backTo 返回链路。 |
| `settings-flow` | `flow/settings-flow.png` | `flow/settings-flow.excalidraw` | 设置读取、保存、恢复默认、diagnostics 和事件回流。 |

## 命名规则

- 页面正式文件名统一使用英文 kebab-case。
- `.png`、`.excalidraw`、`.md` 使用同一基础名。
- 页面统一放在 `pages/`，弹层统一放在 `dialogs/`，共享组件统一放在 `shared/`。
- `library-page` 只表示单个媒体库内容页。
- `library-page-content` 不再作为独立页面名使用。

## 当前文档边界

- 本目录页面图只负责：
  - 页面结构
  - 信息层级
  - 主要控件布局
- 页面文档负责：
  - 功能说明
  - 数据来源
  - 状态定义
  - 交互规则
  - 回归点
- 流程图负责：
  - 页面进入关系
  - 页面内主链路动作
  - 返回链路
  - 数据读取与提交关系
- 基础实现规范负责：
  - 双主题状态分层与 token 规则
  - 中英多语言目录结构与初始化顺序
  - 图片 / 图标目录、显色与接入流程

## 备注

- 已退役旧线框不再保留在当前正式文档目录中。
- 如果某个 UI 已经在 renderer 中实际存在，则应在本目录补齐图片和文档后再继续迭代。
