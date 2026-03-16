# Video Detail Page Spec

## 页面目的

- `Video Detail Page` 是统一的影片详情页。
- 它负责展示影片主信息、sidecar 状态、演员入口、播放入口和来源返回链路。

## 页面范围

- 本页负责：
  - 展示影片详情主信息
  - 展示 sidecar / 图片资源状态
  - 展示演员入口
  - 提供播放按钮
  - 提供外部来源页入口
  - 根据来源页返回上一结果页
- 本页不负责：
  - 媒体库管理
  - 演员详情完整内容
  - 影片元数据编辑

## 数据来源

- 影片详情：
  - `GET /api/videos/{videoId}`
- 播放调用：
  - `POST /api/videos/{videoId}/play`
- 相关演员：
  - `GET /api/videos/{videoId}` 返回的 `actors`

## 布局

- 本页复用 `main-shell.md` 定义的共享壳层。
- 当前线框只表达右侧内容区。
- 内容区采用左右分栏：
  - 左侧为主海报、VID、资源状态、播放按钮
  - 右侧为标题、元数据、演员、简介与路径信息
- 顶部右侧保留返回按钮。

## 元素清单

| 元素 | 类型 | 常显 | 行为 | 数据来源 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 页面标题 | 静态标题 | 是 | 无 | 固定文案 | 文案为 `影片详情 / Video Detail` |
| 返回按钮 | 次按钮 | 是 | 返回来源页 | 当前 `backTo` | 恢复来源页状态 |
| 海报区 | 内容块 | 是 | 无 | `GET /api/videos/{videoId}` | 展示 Poster / 占位 |
| VID 标识 | 状态标识 | 是 | 无 | `GET /api/videos/{videoId}` | 展示当前影片主编号 |
| 资源状态标签 | badge 组 | 是 | 无 | `sidecars` | 展示 NFO/Poster/Thumb/Fanart |
| 播放按钮 | 主按钮 | 是 | 调用播放接口 | `POST /api/videos/{videoId}/play` | 成功后写回播放状态 |
| 标题与元数据区 | 信息块 | 是 | 无 | `GET /api/videos/{videoId}` | 展示标题、库、系列、厂商、评分等 |
| 演员标签 | 标签区 | 条件 | 跳转演员详情 | `actors` | 第一轮至少支持进入演员详情 |
| 简介区 | 文本块 | 条件 | 无 | `plot` / `outline` | 多行内容区 |
| 文件路径 | 文本块 | 是 | 无 | `path` | 展示原始文件路径 |
| 外部来源页 | 链接 | 条件 | 打开来源页 | `webUrl` | 无值时隐藏 |

## 交互规则

- 可从 `library-page`、`favorites-page`、`categories-page`、`series-page`、`actor-detail-page` 进入本页。
- 顶部返回按钮必须基于 `backTo` 返回来源页，而不是固定返回某个页面。
- 点击 `播放影片` 后调用播放接口，并触发播放写回。
- 点击演员标签后进入演员详情页。

## 状态定义

### Loading

- 首次进入本页时显示影片详情 loading。

### Error

- 详情拉取失败时显示错误提示与刷新入口。

### Play Pending

- 播放调用进行中时禁用重复点击。

## 性能与体验约束

- 左右分栏保持清晰：左侧放播放与资源状态，右侧放元数据与说明。
- 返回按钮必须始终在首屏可见。
- 页面图只表达结构与控件，不写说明性长文案。

## 回归点

- 能从不同来源页进入影片详情。
- 返回按钮能恢复到正确来源页。
- 详情信息能正确显示。
- 播放调用可触发。
- 演员入口可进入演员详情页。

## 相关文档

- 库内容页：`library-page.md`
- 喜欢页：`favorites-page.md`
- 类别页：`categories-page.md`
- 系列页：`series-page.md`
- 演员详情页：`actor-detail-page.md`
