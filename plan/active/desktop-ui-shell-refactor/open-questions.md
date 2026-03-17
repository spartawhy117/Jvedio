# Open Questions

当前 `desktop-ui-shell-refactor` **无阻塞未决项**。

本轮已冻结：

- 新壳目录：`tauri/`
- renderer 主线：`React + TypeScript`
- Worker 策略：动态端口
- UI 输入：`doc/UI/new/`
- 主题 / 多语言 / 图片显色长期规范：`doc/UI/new/foundation/`
- Electron：不再作为产品路径或回退基线

仅当以下情况出现时，再重新打开本文件：

- Phase 1 无法稳定把 Worker `baseUrl` 注入 renderer
- Tauri 壳层无法满足当前桌面能力边界
- 新的系统级约束迫使目录、技术路线或发布策略改写
