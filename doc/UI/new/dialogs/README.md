# Dialog Specs

本目录存放当前 exe UI 的正式弹层与上下文菜单规格。

## 当前资产

| 名称 | 图片 | 文档 | 用途 |
| --- | --- | --- | --- |
| `create-edit-library-dialog` | `create-edit-library-dialog.png` | `create-edit-library-dialog.md` | 新建/编辑媒体库时复用的表单弹层。 |
| `delete-library-dialog` | `delete-library-dialog.png` | `delete-library-dialog.md` | 删除媒体库前的危险确认弹层。 |
| `video-context-menu` | `video-context-menu.png` | `video-context-menu.md` | 影片卡片右键与更多按钮共用的动作菜单。 |

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

- 标准表单弹层优先复用共享的通用弹层语义，不为每个功能重新定义按钮顺序。
- 危险操作弹层必须明确影响范围和不影响范围。
- 影片卡片动作收口优先使用 `video-context-menu`，不再扩展额外的影片弹窗页面。
- 如果后续新增弹层，先补本目录索引，再补页面图和规格文档。
