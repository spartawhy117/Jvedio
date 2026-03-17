# Dialog Specs

本目录存放当前 exe UI 的正式弹层与上下文菜单规格。

## 当前资产

| 名称 | 图片 | 文档 | 用途 |
| --- | --- | --- | --- |
| `confirm-dialog` | `confirm-dialog.png` | `confirm-dialog.md` | 通用确认对话框骨架，复用固定 `取消 / 确认` 底部动作。 |
| `create-edit-library-dialog` | `create-edit-library-dialog.png` | `create-edit-library-dialog.md` | 新建/编辑媒体库时复用的表单弹层。 |
| `delete-library-dialog` | `delete-library-dialog.png` | `delete-library-dialog.md` | 删除媒体库前的危险确认弹层。 |
| `video-context-menu` | `video-context-menu.png` | `video-context-menu.md` | 影片卡片右键与更多按钮共用的动作菜单。 |
| `video-batch-context-menu` | `video-batch-context-menu.png` | `video-batch-context-menu.md` | 多选影片后的右键批量动作菜单。 |

## 归属关系

| 名称 | 归属页面 | 触发入口 | 说明 |
| --- | --- | --- | --- |
| `confirm-dialog` | 多页面共享 | 删除确认、退出确认、覆盖确认 | 只固定弹窗壳、正文区与 `取消 / 确认` 底部动作，具体说明文本由调用方传入。 |
| `create-edit-library-dialog` | `library-management-page` | `新建媒体库`、`编辑` | 新建与编辑共用一套白底表单弹层。 |
| `delete-library-dialog` | `library-management-page` | `删除` | 基于 `confirm-dialog` 的危险确认实例，只确认删除媒体库对象，不删除磁盘影片。 |
| `video-context-menu` | `library-page`、`favorites-page`、`actor-detail-page` | 影片卡片右键、卡片 `更多` | 所有当前影片结果页复用同一套 6 项动作，不再为单页分叉。 |
| `video-batch-context-menu` | `library-page`、`favorites-page`、`actor-detail-page` | 勾选多张影片后右键选中卡片或选中区域 | 所有当前影片结果页复用同一套批量动作菜单，不再保留顶部批量工具条。 |

## 目录规则

- 当前正式弹层统一采用白色背景底图方案。
- 每个弹层资产至少同时具备：
  - `.png`
  - `.excalidraw`
  - `.md`
- 弹层文档统一只描述当前确认方案，不保留旧 WPF 时代的备用动作集合。

## 文档边界

- 图片负责：
  - 弹层结构
  - 字段与动作的大致排布
  - 视觉层级
- `.md` 负责：
  - 页面目的
  - 页面范围
  - 数据来源
  - 元素清单
  - 交互规则
  - 状态定义
  - 性能与体验约束
  - 回归点

## 当前约束

- 标准确认弹层优先复用 `confirm-dialog`，不为每个功能重新定义 `取消 / 确认` 结构。
- 标准表单弹层优先复用共享的通用弹层语义，不为每个功能重新定义按钮顺序。
- 危险操作弹层必须明确影响范围和不影响范围。
- 影片卡片动作收口优先使用 `video-context-menu`，不再扩展额外的影片弹窗页面。
- 多选影片后的批量动作统一使用 `video-batch-context-menu`，不再单独维护结果区顶部工具条。
- 统一影片动作菜单的改动必须同步检查所有影片结果页，而不是只改某一个页面文档。
- 如果后续新增弹层，先补本目录索引，再补页面图和规格文档。
