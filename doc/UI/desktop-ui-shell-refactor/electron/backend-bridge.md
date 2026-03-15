# Electron 与 Worker 桥接草案

## 目标

- 前端只负责 UI 和交互。
- C# Worker 负责本地能力。
- 两者通过 localhost API 与 `SSE` 通信。

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
- `/api/libraries/{id}/scan-path`
- `/api/libraries/{id}/scan`
- `/api/libraries/{id}/scrape`
- `/api/videos`
- `/api/videos/{id}`
- `/api/videos/{id}/play`
- `/api/actors`
- `/api/settings`
- `/api/tasks`
- `/api/events`

## 事件流草案

- 扫描开始
- 扫描进度更新
- 命中/未命中结果
- 抓取开始
- 抓取完成
- sidecar 输出完成
- 播放调用结果
- 设置保存结果

## 本期边界

- Worker 仅监听 `127.0.0.1`
- 不提供远程访问能力
- 不在前端直连 SQLite
