# Electron 路线验证流程

## 阶段 A：方案与参考资产落地

- 确认 active feature 仍只有 `desktop-ui-shell-refactor`
- 确认 handoff 文档可独立恢复上下文
- 确认 Electron 文档层和 reference 文档层完整

## 阶段 B：页面规格与 contracts 冻结

- 五个页面文档已和 `renderer-architecture.md` 对齐
- Worker API 已细化到 request / response / task / event 粒度
- `contracts-naming.md` 已冻结首批 DTO、event、task payload 与错误码前缀
- 已明确推荐方案路径，并冻结本轮推荐为“先补文档再进入实现”
- `plan.md`、`plan.json`、`handoff.md` 的下一步状态一致

## 第一批：库的新建和删除

- 先确认 `home-mvp-implementation-entry.md` 已冻结首批工程范围
- 先确认 Home MVP 仅覆盖：
  - bootstrap
  - libraries
  - tasks summary
- 建议按子步骤验证，而不是等全部实现后一次性联调：
  - `C-1`
    - 工程骨架与进程拉起
  - `C-2`
    - Worker 同步接口
  - `C-3`
    - Home UI 闭环
  - `C-4`
    - 事件与错误收口
- `C-1` 当前已完成验证：
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
  - `electron/` `npm run build` 通过
  - `electron/` `npm run smoke` 通过，Electron 已确认可拉起 Worker 并等待 ready 健康探测
- `C-2` 当前已完成验证：
  - `GET /api/app/bootstrap`
  - `GET /api/libraries`
  - `POST /api/libraries`
  - `DELETE /api/libraries/{libraryId}`
  - `GET /api/tasks`
  - 创建测试库后已成功回删，sqlite 当前恢复原状
- `C-3` 当前已完成实现与工程级验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
- `C-3` 自动聚焦回归已通过：
  - `electron/` `npm run regression:c3`
  - Home 页新建库
  - Home 页删除库
  - 左侧导航同步
  - 库路由跳转
  - 删除当前库后的路由回退与提示消息
- `C-3` 回归首轮发现并修复：
  - renderer 原生 ES module 导入缺少 `.js` 扩展，导致 Electron 文件页空白
- `C-4` 当前已完成实现与工程级验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `Jvedio-WPF/Jvedio.sln` Release 构建通过
- `C-4` 与阶段 C 聚焦回归已通过：
  - `electron/` `npm run regression:c3`
  - `GET /api/events` SSE 订阅链路
  - `library.changed` 事件驱动同步
  - 任务摘要刷新
  - Worker 未就绪错误反馈

## 第二批：扫描路径、扫描和拉取

- 配置默认扫描目录
- 触发扫描
- 整理与 MetaTube 抓取闭环
- sidecar 输出正确
- 任务状态可见
- 当前已完成代码接线：
  - Worker 已接入库扫描目录保存、扫描任务编排、MetaTube 抓取与 sidecar 写出
  - Library 页面已支持扫描目录编辑、触发扫描、触发抓取和当前库任务状态回传
  - 已新增 `electron/` `npm run regression:d` 聚焦回归入口
- 当前已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:d`
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`

## 第三批：影片展示和播放

- Library 页展示影片
- Detail 页展示详情
- 播放调用成功
- 播放写回成功
- 当前已完成代码接线：
  - Worker 已接入 `GET /api/libraries/{libraryId}/videos`
  - Worker 已接入 `GET /api/videos/{videoId}` 与 `POST /api/videos/{videoId}/play`
  - Library 页已支持影片结果集展示、关键字筛选、排序、刷新和详情跳转
  - Video Detail 路由壳已支持基础播放调用与播放写回反馈
  - 已新增 `electron/` `npm run regression:batch3`
- 当前已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:batch3`
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`

## 第四批：设置页面

- 设置入口可用
- 设置值展示正确
- 保存、应用、恢复默认正确
- 配置能被业务消费
- 当前第一轮已冻结真实落库项：
  - `General.CurrentLanguage`
  - `General.Debug`
  - `MetaTube.ServerUrl`
  - `MetaTube.RequestTimeoutSeconds`
  - `Playback.PlayerPath`
  - `Playback.UseSystemDefaultFallback`
- 当前已完成代码接线：
  - Worker 已接入 `GET /api/settings` 与 `PUT /api/settings`
  - Settings 路由壳已支持分组切换、表单态、保存反馈和恢复默认
  - 播放链已消费 `UseSystemDefaultFallback`
  - 已新增 `electron/` `npm run regression:settings`
- 当前已完成验证：
  - `electron/` `npm run build`
  - `electron/` `npm run smoke`
  - `electron/` `npm run regression:d`
  - `electron/` `npm run regression:batch3`
  - `electron/` `npm run regression:settings`
  - `MSBuild.exe Jvedio.sln -property:Configuration=Release`

## 验证方式建议

- Worker 单元测试
- Worker 集成测试
- Electron E2E
- 阶段化人工验证清单
