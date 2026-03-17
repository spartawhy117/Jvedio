# Desktop UI Flow Index

本目录存放当前 exe UI 的正式流程图资产，也是当前流程图的**文字索引与流程摘要入口**。

## 维护规则

- 每张流程图都同时保留：
  - `.png`
  - `.excalidraw`
- `flow/README.md` 必须同步维护每张正式流程图的：
  - 用途
  - 主入口
  - 主链路
  - 返回链路 / 状态保持
- 流程图只表达当前已确认 UI 的主链路、返回链路、数据读取和提交关系。
- 不在流程图中新增当前线框里不存在的 UI 元素或新产品能力。
- **如果修改了 `flow/` 目录下任意正式流程图（`.png` 或 `.excalidraw`），必须同步更新本 README 中对应流程说明。**
- 如果流程图变化已经影响页面职责、返回链路或交互规则，还必须继续同步对应页面文档与索引文档，而不是只改图片。

## 当前流程图

| 名称 | 文件 | 用途 |
| --- | --- | --- |
| `main-shell-navigation-flow` | `main-shell-navigation-flow.png` / `main-shell-navigation-flow.excalidraw` | 表达主壳左侧一级导航、影视库入口与右侧内容区之间的切换关系。 |
| `library-management-flow` | `library-management-flow.png` / `library-management-flow.excalidraw` | 表达库管理页的建库、编辑、删除、扫描和打开单库主链路。 |
| `library-workbench-flow` | `library-workbench-flow.png` / `library-workbench-flow.excalidraw` | 表达单库内容页的结果集浏览、影片右键动作菜单、删除原片链路、任务反馈和详情返回链路。 |
| `favorites-flow` | `favorites-flow.png` / `favorites-flow.excalidraw` | 表达 Favorites 聚合结果集、空态/错误态和影片详情返回链路。 |
| `actors-flow` | `actors-flow.png` / `actors-flow.excalidraw` | 表达 Actors 列表、演员详情、关联影片和二级返回链路。 |
| `video-detail-playback-flow` | `video-detail-playback-flow.png` / `video-detail-playback-flow.excalidraw` | 表达影片详情读取、播放调用、播放写回、演员入口和来源返回链路。 |
| `settings-flow` | `settings-flow.png` / `settings-flow.excalidraw` | 表达设置读取、分组切换、保存、恢复默认、MetaTube diagnostics 与 `settings.changed` 回流。 |

## 流程文字摘要

### `main-shell-navigation-flow`

- **主入口**：`App Boot` 进入主壳层。
- **稳定结构**：左侧导航稳定呈现 `设置 / 库管理 / 喜欢 / 演员`。
- **单库入口**：影视库列表按库切换右侧内容区。
- **内容承载**：点击任一入口后，右侧内容区渲染对应页面，并保持当前上下文。
- **承载页面**：一级内容页统一落在主壳右侧内容区，包括：
  - `设置页`
  - `库管理页`
  - `单库页`
  - `喜欢页`
  - `演员页`
  - `详情页`

### `library-management-flow`

- **主入口**：进入库管理页后先请求 `GET /api/libraries`。
- **初始呈现**：渲染媒体库列表，展示状态、影片数和最近扫描信息。
- **新建 / 编辑**：通过新建或编辑弹层保存库名与扫描目录。
- **保存后动作**：保存后立即启动扫描任务，并在库内状态与全局活动条中反馈任务进度。
- **删除链路**：点击库名菜单可执行 `打开 / 删除确认 / 删除保留库文件`，删除操作需要二次确认。
- **打开单库**：从库管理页进入 `Library Workbench`。
- **刷新规则**：返回库管理页后恢复上下文，局部刷新当前行；必要时再整页刷新。

### `library-workbench-flow`

- **主入口**：进入单库页时请求 `GET /api/libraries/{id}/videos`。
- **上下文保持**：页面保存当前单库的 `筛选 / 排序 / 刷新` 状态。
- **结果呈现**：影片卡片网格按分页承载结果上下文。
- **右键动作**：右键 / 更多菜单集中承载卡片动作，执行后统一收口。
- **查看详情**：可进入影片详情页，返回时恢复筛选 / 排序 / 分页状态。
- **播放链路**：可直接触发播放，调用默认播放器。
- **收藏动作**：支持收藏 / 取消收藏，结果即时写回。
- **重新抓取**：可重新抓取元数据，并触发任务与状态回刷。
- **打开文件夹**：可打开所在文件夹，调用系统外部能力。
- **删除原片**：删除原片时同步处理影片、`sidecar` 与子目录；删除后回刷列表。
- **联动刷新**：演员关联信息、计数和结果摘要会跟随删除回刷。
- **任务反馈**：任务状态回刷会同步到行内摘要与全局活动反馈。

### `favorites-flow`

- **主入口**：从左侧导航进入喜欢页，请求 `GET /api/videos/favorites`。
- **上下文保持**：喜欢页只保留最小排序与分页状态，保持聚合结果上下文。
- **结果呈现**：统一使用影片卡片网格展示收藏结果。
- **进入详情**：点击卡片打开影片详情，并写入 `backTo=Favorites`。
- **空态 / 错误**：无结果或请求失败时展示空态 / 错误提示，并提供刷新入口。
- **返回链路**：从详情返回 Favorites 时恢复原排序与分页状态。

### `actors-flow`

- **主入口**：进入演员列表页，请求 `GET /api/actors`。
- **上下文保持**：列表页保存搜索、排序和分页状态。
- **结果呈现**：演员卡片网格展示真实头像或占位头像。
- **进入详情**：点击演员卡片进入演员详情页，请求 `GET /api/actors/{id}`。
- **关联影片**：演员详情页继续加载作品集与关联影片，请求 `GET /api/actors/{id}/videos`。
- **二级跳转**：点击关联影片后可继续进入影片详情，同时保留二级返回链路。
- **返回规则**：
  - `Video Detail -> Actor Detail`
  - `Actor Detail -> Actors`

### `video-detail-playback-flow`

- **主入口**：从结果页进入影片详情，请求 `GET /api/videos/{id}`。
- **详情渲染**：页面渲染海报、元数据、演员入口，并记录 `backTo` 来源页。
- **播放动作**：点击播放按钮后调用 `POST /api/videos/{id}/play`。
- **播放写回**：写回成功后更新最近播放状态。
- **演员入口**：点击演员标签可进入 `Actor Detail`。
- **外链能力**：可打开外部来源，不丢失当前详情状态。
- **返回链路**：返回来源页时恢复原筛选 / 排序 / 分页状态，并保持 `backTo`。

### `settings-flow`

- **主入口**：进入设置页，请求 `GET /api/settings`。
- **分组结构**：左侧固定 6 个分组：
  - `基本`
  - `外观`
  - `网络`
  - `库`
  - `扫描`
  - `MetaTube`
- **表单状态**：右侧表单维护保存前的 `Dirty` 状态。
- **保存动作**：保存设置时调用 `PUT /api/settings`。
- **恢复默认**：恢复默认时调用 `POST /api/settings/reset`。
- **诊断能力**：在 `MetaTube` 分组中支持 `POST /api/settings/meta-tube/diagnostics`。
- **事件回流**：设置更新后消费 `settings.changed`，刷新持久化值并保护草稿。

## 当前边界

- 任务反馈统一并入：
  - `library-management-flow`
  - `library-workbench-flow`
  - `main-shell-navigation-flow`
- 其它弹层优先并入所属页面主流程，不再拆成大量碎片图。
- 如果后续页面结构调整，优先更新页面文档和正式线框，再同步更新本目录流程图。
- 如果后续修改了任意正式流程图，必须同步更新本 README 的对应流程摘要，确保图片和文字说明保持一致。
