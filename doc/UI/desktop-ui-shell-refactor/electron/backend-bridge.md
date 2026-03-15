# Electron 与 Worker 桥接草案

## 目标

- 前端只负责 UI 和交互。
- C# Worker 负责本地能力。
- 两者通过 localhost API 与 `SSE` 通信。
- 详细 contracts 以 `worker-api-spec.md` 为准。

## 进程关系

- Electron main
  - 启动主窗口
  - 后台拉起 Worker
  - 管理生命周期
- Electron renderer
  - 页面 UI
  - 调用 API
  - 订阅任务事件
- C# Worker
  - 扫描
  - 抓取
  - SQLite
  - sidecar 输出
  - 设置读写
  - 播放调用

## API 分组草案

- `/api/app/bootstrap`
- `/api/libraries`
- `/api/libraries/{id}/scan-paths`
- `/api/libraries/{id}/scan`
- `/api/libraries/{id}/scrape`
- `/api/videos`
- `/api/videos/{id}`
- `/api/videos/{id}/play`
- `/api/videos/{id}/refresh-metadata`
- `/api/videos/{id}/open-folder`
- `/api/actors`
- `/api/actors/{id}`
- `/api/actors/{id}/videos`
- `/api/settings`
- `/api/tasks`
- `/api/events`

## 通信约定

- renderer 不直接硬编码 Worker 端口
- Electron main / preload 负责提供 base URL
- 查询类接口优先同步返回
- 长耗时动作统一走：
  - `HTTP 202`
  - task ticket
  - `SSE` 事件回推

## 任务模型草案

- 第一阶段任务类型：
  - `library.scan`
  - `library.scrape`
  - `video.refresh-metadata`
  - `video.play`
  - `settings.save`
- 状态：
  - `queued`
  - `running`
  - `succeeded`
  - `failed`
  - `cancelled`
  - `partial`

## 事件流草案

- `worker.ready`
- `task.created`
- `task.progress`
- `task.completed`
- `task.failed`
- `task.cancelled`
- `library.changed`
- `video.changed`
- `settings.changed`

## 错误流草案

- 同步校验失败：
  - `400`
  - `404`
  - `409`
  - `422`
- Worker 内部异常：
  - `500`
- Worker 未就绪：
  - `503`
- 异步任务失败不回退成同步错误，而是通过：
  - `task.failed`
  - `GET /api/tasks/{id}`
  - 结构化错误对象

## renderer 对接要求

- renderer 只保留一个全局 SSE 连接
- 页面组件不直接管理 EventSource 生命周期
- 共享组件不直接发 API 请求
- 长任务入口统一展示任务摘要，不在按钮点击后自行轮询

## 本期边界

- Worker 仅监听 `127.0.0.1`
- 不提供远程访问能力
- 不在前端直连 SQLite
