# Worker API 细化草案

## 目标

- 把现有“端点清单”推进到“可开始定义 contracts”的粒度。
- 先固定请求/响应、异步任务、错误流和事件订阅模型，再进入代码实现。
- 保持 Worker 只服务本机 Electron renderer，不引入远程服务语义。
- 具体 DTO 命名与错误码前缀以 `contracts-naming.md` 为准。

## 通信约束

- Worker 只监听 `127.0.0.1`
- renderer 只访问 `/api/*` 相对路径，不在前端硬编码端口
- Electron main / preload 负责把实际 base URL 暴露给 renderer
- 长耗时命令统一走：
  - `HTTP 202 + task ticket`
  - `SSE task events`

## 统一响应结构

```json
{
  "requestId": "req_20260315_001",
  "timestamp": "2026-03-15T12:00:00+08:00",
  "data": {},
  "error": null
}
```

### 错误结构

```json
{
  "requestId": "req_20260315_002",
  "timestamp": "2026-03-15T12:00:02+08:00",
  "data": null,
  "error": {
    "code": "library.scan_path_missing",
    "message": "当前媒体库未配置扫描目录。",
    "userMessage": "请先为媒体库配置扫描目录。",
    "retryable": false,
    "details": {
      "libraryId": "library-1"
    }
  }
}
```

## 统一任务模型

```json
{
  "id": "task_01HQY9M6K9E5",
  "type": "library.scan",
  "status": "running",
  "scope": {
    "libraryId": "library-1",
    "videoId": null
  },
  "stage": "organizing",
  "progress": {
    "current": 14,
    "total": 120,
    "percent": 11
  },
  "summary": "正在整理目录并扫描文件",
  "createdAt": "2026-03-15T12:00:05+08:00",
  "updatedAt": "2026-03-15T12:00:18+08:00",
  "error": null
}
```

### 任务状态

- `queued`
- `running`
- `succeeded`
- `failed`
- `cancelled`
- `partial`

### 第一阶段任务类型

- `library.scan`
- `library.scrape`
- `video.refresh-metadata`
- `video.play`
- `settings.save`
- `system.bootstrap`

## API 分组与端点

### `GET /api/app/bootstrap`

用途：

- renderer 首屏初始化
- 获取导航、基础设置、当前任务摘要和 Worker 健康状态

返回 `data` 建议字段：

```json
{
  "app": {
    "name": "Jvedio",
    "version": "6"
  },
  "shell": {
    "theme": "system",
    "taskDrawerEnabled": true
  },
  "libraries": [],
  "taskSummary": {
    "runningCount": 0,
    "failedCount": 0
  },
  "worker": {
    "healthy": true,
    "eventStreamPath": "/api/events"
  }
}
```

### `GET /api/libraries`

用途：

- Home 页库列表
- 左侧动态库导航

返回项建议包含：

- `id`
- `name`
- `scanPaths`
- `videoCount`
- `lastScanAt`
- `lastScrapeAt`
- `hasRunningTask`

### `POST /api/libraries`

用途：

- 新建库

请求体：

```json
{
  "name": "主媒体库",
  "scanPaths": [
    "D:\\Media\\JAV"
  ]
}
```

### `PUT /api/libraries/{libraryId}`

用途：

- 编辑库名称
- 调整扫描目录

### `DELETE /api/libraries/{libraryId}`

用途：

- 删除库
- 只删除库配置和关联映射，不直接删除磁盘影片文件

### `GET /api/libraries/{libraryId}/videos`

用途：

- Library 页结果集

查询参数建议：

- `keyword`
- `sortBy`
- `sortOrder`
- `viewMode`
- `pageIndex`
- `pageSize`
- `genre`
- `series`
- `actor`
- `favoriteOnly`
- `missingSidecarOnly`

返回 `data` 建议结构：

```json
{
  "items": [],
  "pageIndex": 0,
  "pageSize": 60,
  "totalCount": 0,
  "availableViewModes": [
    "grid",
    "list"
  ]
}
```

### `POST /api/libraries/{libraryId}/scan`

用途：

- 启动扫描
- 可选先做目录整理

请求体：

```json
{
  "organizeBeforeScan": true,
  "forceRescan": false,
  "paths": []
}
```

响应：

- `202 Accepted`
- `data.task` 返回任务票据

### `POST /api/libraries/{libraryId}/scrape`

用途：

- 对库内影片发起抓取

请求体：

```json
{
  "mode": "missing-only",
  "videoIds": [],
  "forceRefreshMetadata": false,
  "writeSidecars": true,
  "downloadActorAvatars": true
}
```

### `GET /api/videos/{videoId}`

用途：

- Video Detail 页详情

返回项建议包含：

- 基础信息
- 系列 / 类别 / 标签
- 文件路径
- poster / thumb / fanart 状态
- NFO 状态
- 关联演员
- 最近播放信息

### `POST /api/videos/{videoId}/play`

用途：

- 外部播放器调用

请求体：

```json
{
  "playerProfile": "default",
  "resume": true
}
```

说明：

- 即便只是拉起本地播放器，也统一返回任务票据
- renderer 通过任务事件感知成功 / 失败

### `POST /api/videos/{videoId}/refresh-metadata`

用途：

- 手动刷新当前影片元数据

请求体：

```json
{
  "forceRefreshMetadata": true,
  "writeSidecars": true,
  "downloadActorAvatars": true
}
```

### `POST /api/videos/{videoId}/open-folder`

用途：

- 打开影片所在目录

说明：

- 这是短操作，可直接 `200 OK`
- 不需要单独建任务

### `GET /api/actors`

用途：

- Actors 页聚合列表

查询参数建议：

- `keyword`
- `sortBy`
- `sortOrder`
- `alphabet`
- `pageIndex`
- `pageSize`

返回项建议包含：

- `actorId`
- `name`
- `avatarPath`
- `videoCount`
- `libraryCount`
- `lastPlayedAt`
- `lastScanAt`
- `webType`
- `webUrl`

### `GET /api/actors/{actorId}`

用途：

- 获取演员详情头部信息
- 返回演员所属库统计与基础资料

返回项建议包含：

- `actorId`
- `name`
- `avatarPath`
- `videoCount`
- `libraryCount`
- `libraryIds`
- `libraryNames`
- `lastPlayedAt`
- `lastScanAt`
- `webType`
- `webUrl`

### `GET /api/actors/{actorId}/videos`

用途：

- 演员关联影片列表
- 为抽屉或二级结果区服务

查询参数建议：

- `keyword`
- `sortBy`
- `sortOrder`
- `pageIndex`
- `pageSize`

### `GET /api/settings`

用途：

- Settings 首次加载

返回建议按分组输出：

- `general`
- `libraries`
- `metaTube`
- `playback`
- `data`

### `PUT /api/settings`

用途：

- 保存设置

说明：

- 若保存涉及磁盘写入或连通性校验，允许返回 `202 + task`
- 纯内存 / 轻量写回可直接 `200`

### `POST /api/settings/meta-tube/diagnostics`

用途：

- MetaTube 连接测试与诊断

请求体：

```json
{
  "testVideoId": "ABP-123",
  "warmup": true
}
```

### `GET /api/tasks`

用途：

- 任务抽屉 / 任务中心数据源

查询参数建议：

- `status`
- `type`
- `libraryId`
- `pageIndex`
- `pageSize`

### `GET /api/tasks/{taskId}`

用途：

- 查看单任务详情
- 打开失败原因、阶段日志和结果摘要

### `POST /api/tasks/{taskId}/cancel`

用途：

- 取消仍可取消的任务

## SSE 事件订阅

### `GET /api/events`

用途：

- 全局任务流
- 资源变更通知

查询参数建议：

- `topic`
- `libraryId`
- `taskId`

建议事件名：

- `worker.ready`
- `task.created`
- `task.progress`
- `task.completed`
- `task.failed`
- `task.cancelled`
- `library.changed`
- `video.changed`
- `settings.changed`

### 事件载荷

```json
{
  "eventId": "evt_01HQY9QG5V5B",
  "topic": "library:library-1",
  "occurredAt": "2026-03-15T12:03:10+08:00",
  "task": {
    "id": "task_01HQY9M6K9E5",
    "type": "library.scan",
    "status": "running",
    "stage": "scraping",
    "progress": {
      "current": 26,
      "total": 120,
      "percent": 21
    },
    "summary": "正在抓取影片元数据"
  },
  "resource": {
    "kind": "library",
    "id": "library-1"
  }
}
```

## 错误流约定

### 同步错误

- `400`
  - 请求体非法
- `404`
  - 资源不存在
- `409`
  - 当前状态不允许操作
  - 例如同一库已有扫描任务在跑
- `422`
  - 业务校验失败
  - 例如扫描目录为空
- `500`
  - Worker 内部异常
- `503`
  - Worker 未就绪或已断连

### 异步任务错误

- 启动成功但执行失败时：
  - `POST` 仍返回 `202`
  - 失败通过 `task.failed` 事件和 `GET /api/tasks/{taskId}` 暴露
- 错误对象应补齐：
  - `code`
  - `message`
  - `userMessage`
  - `retryable`
  - `details`
  - `logPath`

## 页面与 API 对应关系

- Home
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `GET /api/tasks`
- Library
  - `GET /api/libraries/{libraryId}/videos`
  - `POST /api/libraries/{libraryId}/scan`
  - `POST /api/libraries/{libraryId}/scrape`
- Actors
  - `GET /api/actors`
  - `GET /api/actors/{actorId}`
  - `GET /api/actors/{actorId}/videos`
- Video Detail
  - `GET /api/videos/{videoId}`
  - `POST /api/videos/{videoId}/play`
  - `POST /api/videos/{videoId}/refresh-metadata`
  - `POST /api/videos/{videoId}/open-folder`
- Settings
  - `GET /api/settings`
  - `PUT /api/settings`
  - `POST /api/settings/meta-tube/diagnostics`

## 第一阶段建议冻结项

- 统一 envelope 结构
- 长任务统一 `202 + task + SSE`
- renderer 只保留一个全局 SSE 连接
- `open-folder` 这类短操作不做任务化
- Settings 诊断接口单独成端点，不混进通用保存接口
- DTO、任务 payload 和错误码前缀已单独冻结到 `contracts-naming.md`

## 仍保留的开放问题

- Worker 端口最终采用固定值还是运行期分配
- 第一阶段是否单独上线任务中心页面，还是仅保留全局任务抽屉
