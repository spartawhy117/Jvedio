# Desktop UI Shell Refactor Validation Matrix

## 阶段 A：方案与参考资产落地

- 确认 `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- 确认 `handoff.md` 能独立说明当前状态。
- 确认 `doc/UI/desktop-ui-shell-refactor/electron/` 已包含：
  - `README.md`
  - `product-summary.md`
  - `information-architecture.md`
  - `page-home.md`
  - `page-library.md`
  - `page-actors.md`
  - `page-video-detail.md`
  - `page-settings.md`
  - `backend-bridge.md`
  - `validation-flow.md`
- 确认 `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-notes.md` 已明确：
  - 借鉴范围
  - 非目标范围
  - 许可证与复用约束
- 确认 `doc/UI/old/` 未被覆盖。
- 确认 `doc/UI/new/` 被明确标记为 WPF 线稿历史参考。

## 第一批：库的新建和删除

- Home 页能创建新库。
- Home 页能删除库。
- 左侧库导航随增删即时同步。
- Home 列表随增删即时同步。
- 数据库记录变化正确。
- 错误场景有可见反馈且日志可定位。

## 第二批：库默认扫描目录、扫描和拉取能力

- 能为库设置默认扫描目录。
- 保存后重新进入页面能正确回读。
- 能启动扫描任务。
- 命中影片时完成整理、MetaTube 抓取和 sidecar 输出。
- 未命中影片保持原位并进入报告。
- 库页内联任务状态显示进度、成功数、失败数和失败原因。
- 全局活动条能在任务运行时提示当前库与进度。
- Home 摘要能反映任务总数与最近状态。
- 库页刷新后能看到新结果。

## 第三批：影片展示和播放能力

- 库页能展示影片列表或卡片。
- 影片详情页能展示基础信息、演员、图片和路径。
- 点击播放后走当前播放链。
- 已配置播放器路径时使用指定播放器。
- 未配置时回退系统默认播放器。
- 播放写回能力正常。

## 第四批：设置页面功能完好

- 从主壳打开设置成功。
- 各页签页面可访问，且数量与当前既有设置页一致。
- 当前第二轮应对齐为 6 个页签：`Basic / Picture / Scan & Import / Network / Library / MetaTube`。
- 当前值显示正确。
- 保存、应用、恢复默认正常。
- 视频播放器路径、MetaTube 配置可被业务实际消费。
- 当前既有开关 / 输入项都能在对应页签中找到承载。
- 本轮允许样式与布局保持粗粒度一致，不要求细致打磨。

## 第五批：演员详情独立页

- Actors 列表点击后进入 `#/actors/{actorId}`，不再依赖抽屉。
- 演员详情页能展示头部信息、媒体库聚合信息和关联影片。
- 从演员详情进入影片详情时会写入稳定返回态。
- 影片详情页能返回演员详情，同时保留返回媒体库入口。
- 列表筛选、排序和分页状态在演员详情往返过程中不丢失。

## Build validation

- 运行受影响的 Electron 聚焦回归。
- Release build succeeds after code and documentation changes.
- 本轮未跑 `Jvedio.Test` 集成测试；当前改动集中在 Electron renderer / regression 与文档。
