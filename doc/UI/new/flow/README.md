# Desktop UI Flow Index

本目录存放当前 exe UI 的正式流程图资产。

规则：
- 每张流程图都同时保留：
  - `.png`
  - `.excalidraw`
- 流程图只表达当前已确认 UI 的主链路、返回链路、数据读取和提交关系。
- 不在流程图中新增当前线框里不存在的 UI 元素或新产品能力。

## 当前流程图

| 名称 | 文件 | 用途 |
| --- | --- | --- |
| `main-shell-navigation-flow` | `main-shell-navigation-flow.png` / `main-shell-navigation-flow.excalidraw` | 表达主壳左侧导航、智能分类、影视库入口与右侧内容区之间的切换关系。 |
| `library-management-flow` | `library-management-flow.png` / `library-management-flow.excalidraw` | 表达库管理页的建库、编辑、删除、扫描和打开单库主链路。 |
| `library-workbench-flow` | `library-workbench-flow.png` / `library-workbench-flow.excalidraw` | 表达单库内容页的结果集浏览、筛选排序、任务反馈和详情返回链路。 |
| `favorites-flow` | `favorites-flow.png` / `favorites-flow.excalidraw` | 表达 Favorites 聚合结果集、空态/错误态和影片详情返回链路。 |
| `actors-flow` | `actors-flow.png` / `actors-flow.excalidraw` | 表达 Actors 列表、演员详情、关联影片和二级返回链路。 |
| `categories-flow` | `categories-flow.png` / `categories-flow.excalidraw` | 表达 Categories 聚合页的左侧类别列表、右侧结果区和详情返回链路。 |
| `series-flow` | `series-flow.png` / `series-flow.excalidraw` | 表达 Series 聚合页的左侧系列列表、右侧结果区和详情返回链路。 |
| `video-detail-playback-flow` | `video-detail-playback-flow.png` / `video-detail-playback-flow.excalidraw` | 表达影片详情读取、播放调用、播放写回、演员入口和来源返回链路。 |
| `settings-flow` | `settings-flow.png` / `settings-flow.excalidraw` | 表达设置读取、分组切换、保存、恢复默认、MetaTube diagnostics 与 `settings.changed` 回流。 |
| `task-failure-retry-flow` | `task-failure-retry-flow.png` / `task-failure-retry-flow.excalidraw` | 表达失败任务入口、详情弹层、重试和回流正常任务反馈链路。 |

## 当前边界

- 任务相关流程只保留一个独立图：
  - `task-failure-retry-flow`
- 其它弹层优先并入所属页面主流程，不再拆成大量碎片图。
- 如果后续页面结构调整，优先更新页面文档和正式线框，再同步更新本目录流程图。
