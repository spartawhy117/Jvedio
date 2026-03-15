# Jvedio Electron 规格文档

本目录用于承载当前 Electron 路线的稳定规格文档。

阅读顺序：

1. `product-summary.md`
2. `information-architecture.md`
3. 页面文档
4. `backend-bridge.md`
5. `validation-flow.md`

目录说明：

- `product-summary.md`
  - Electron 改造目标、范围、非目标
- `information-architecture.md`
  - 主壳、左侧导航、页面职责
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
- `validation-flow.md`
  - 分批验证流程

当前约束：

- 本目录优先级高于根目录旧 WPF 线稿文档。
- 本轮只做文档，不做代码实现。
- `fntv-electron` 仅作为壳与页面参考，不作为代码复用来源。
