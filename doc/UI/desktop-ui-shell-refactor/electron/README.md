# Jvedio Electron 规格文档

本目录用于承载当前 Electron 路线的稳定规格文档。

阅读顺序：

1. `product-summary.md`
2. `information-architecture.md`
3. `frontend-page-rebuild-plan.md`
4. `renderer-architecture.md`
5. 页面文档
6. `backend-bridge.md`
7. `worker-api-spec.md`
8. `contracts-naming.md`
9. `home-mvp-implementation-entry.md`
10. `validation-flow.md`

目录说明：

- `product-summary.md`
  - Electron 改造目标、范围、非目标
- `information-architecture.md`
  - 主壳、左侧导航、页面职责
- `frontend-page-rebuild-plan.md`
  - 双参考源整合后的前端页面重构计划
- `renderer-architecture.md`
  - renderer 真实目录、feature 边界和组件拆分草案
- `page-home.md`
  - Home 页规格
- `page-library.md`
  - Library 页规格
- `page-actors.md`
  - Actors 页规格
- `page-video-detail.md`
  - 影片详情页规格
- `page-settings.md`
  - 设置页规格
- `backend-bridge.md`
  - Electron 与 Worker 的职责边界、接口分组和事件流
- `worker-api-spec.md`
  - Worker API 的请求/响应、任务模型、错误流和 SSE 细化草案
- `contracts-naming.md`
  - `Jvedio.Contracts` 的首批 DTO、事件、任务 payload 和错误码前缀冻结草案
- `home-mvp-implementation-entry.md`
  - 阶段 C 的首批实现入口、工程范围、落地顺序和 done 定义
- `validation-flow.md`
  - 分批验证流程

当前约束：

- 本目录优先级高于根目录旧 WPF 线稿文档。
- 本轮只做文档，不做代码实现。
- `fntv-electron` 仅作为桌面壳、导航密度和桌面交互参考，不作为代码复用来源。
- `jellyfin-web` 仅作为页面结构、列表/详情页组织和页面级数据分层参考，不作为完整工程模板。
- 具体参考边界以 `reference/fntv-electron-audit.md` 与 `reference/jellyfin-web-audit.md` 为准。
