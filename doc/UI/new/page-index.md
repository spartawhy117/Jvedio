# Desktop UI Page Index

本文件是当前 exe UI 页面、弹层与共享组件的总索引。

用途：
- 快速查看当前正式图片文件名
- 快速定位对应规格文档
- 用极简描述回顾每个页面承担的主要功能

## 页面索引

| 名称 | 图片 | 文档 | 极简功能说明 |
| --- | --- | --- | --- |
| `main-shell` | `main-shell.png` | `main-shell.md` | 主窗口共享壳层，负责品牌区、一级导航、智能分类入口和库导航区。 |
| `library-management-page` | `library-management-page.png` | `library-management-page.md` | 库管理首页，负责建库、开库、扫描、编辑、删除和库级任务状态查看。 |
| `library-page` | `library-page.png` | `library-page.md` | 单个媒体库内容页，负责库内影片浏览、筛选、排序、分页和进入影片详情。 |
| `favorites-page` | `favorites-page.png` | `favorites-page.md` | 喜欢影片聚合页，负责展示收藏结果集和统一结果区交互。 |
| `actors-page` | `actors-page.png` | `actors-page.md` | 演员聚合列表页，负责演员搜索、排序、分页和进入演员详情。 |
| `actor-detail-page` | `actor-detail-page.png` | `actor-detail-page.md` | 独立演员详情页，负责演员头部信息、关联影片和返回链路。 |
| `categories-page` | `categories-page.png` | `categories-page.md` | 全局类别聚合页，负责类别列表和类别内影片结果集浏览。 |
| `series-page` | `series-page.png` | `series-page.md` | 全局系列聚合页，负责系列列表和系列内影片结果集浏览。 |
| `video-detail-page` | `video-detail-page.png` | `video-detail-page.md` | 影片详情页，负责详情信息展示、播放入口和返回来源恢复。 |
| `settings-page` | `settings-page.png` | `settings-page.md` | 设置页，负责分组设置、保存、恢复默认和 MetaTube diagnostics。 |

## 弹层与共享组件索引

| 名称 | 图片 | 文档 | 极简功能说明 |
| --- | --- | --- | --- |
| `create-edit-library-dialog` | `create-edit-library-dialog.png` | `create-edit-library-dialog.md` | 新建/编辑媒体库弹层，统一库名与扫描目录输入。 |
| `delete-library-dialog` | `delete-library-dialog.png` | `delete-library-dialog.md` | 删除媒体库确认弹层，显示影响范围并执行二次确认。 |
| `task-detail-dialog` | `task-detail-dialog.png` | `task-detail-dialog.md` | 任务失败详情与重试弹层，展示状态时间线、错误原因和重试入口。 |
| `shared-components` | `shared-components.png` | `shared-components.md` | 共享组件总览，统一影片卡片、摘要条、分页、状态和通用弹层语义。 |

## 流程图索引

| 名称 | 图片 | 源文件 | 极简功能说明 |
| --- | --- | --- | --- |
| `main-shell-navigation-flow` | `flow/main-shell-navigation-flow.png` | `flow/main-shell-navigation-flow.excalidraw` | 主壳导航、智能分类和影视库入口如何切换右侧内容区。 |
| `library-management-flow` | `flow/library-management-flow.png` | `flow/library-management-flow.excalidraw` | 库管理页的建库、编辑、删除、扫描和打开单库主链路。 |
| `library-workbench-flow` | `flow/library-workbench-flow.png` | `flow/library-workbench-flow.excalidraw` | 单库页的结果集浏览、任务反馈和详情返回链路。 |
| `favorites-flow` | `flow/favorites-flow.png` | `flow/favorites-flow.excalidraw` | 喜欢页的结果集浏览和返回恢复。 |
| `actors-flow` | `flow/actors-flow.png` | `flow/actors-flow.excalidraw` | Actors 列表、演员详情、关联影片和二级返回链路。 |
| `categories-flow` | `flow/categories-flow.png` | `flow/categories-flow.excalidraw` | Categories 左右分栏和详情返回链路。 |
| `series-flow` | `flow/series-flow.png` | `flow/series-flow.excalidraw` | Series 左右分栏和详情返回链路。 |
| `video-detail-playback-flow` | `flow/video-detail-playback-flow.png` | `flow/video-detail-playback-flow.excalidraw` | 影片详情读取、播放、写回和 backTo 返回链路。 |
| `settings-flow` | `flow/settings-flow.png` | `flow/settings-flow.excalidraw` | 设置读取、保存、恢复默认、diagnostics 和事件回流。 |
| `task-failure-retry-flow` | `flow/task-failure-retry-flow.png` | `flow/task-failure-retry-flow.excalidraw` | 失败任务详情弹层与重试主链路。 |

## 命名规则

- 页面正式文件名统一使用英文 kebab-case。
- `.png`、`.excalidraw`、`.md` 使用同一基础名。
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

## 备注

- 已退役旧线框不再保留在当前正式文档目录中。
- 如果某个 UI 已经在 renderer 中实际存在，则应在本目录补齐图片和文档后再继续迭代。
