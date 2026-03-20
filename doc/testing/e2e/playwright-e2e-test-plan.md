# Playwright MCP 前端验收方案

## 1. 文档目的

本文档定义 `desktop-ui-shell-refactor` Phase 10 的前端验收执行方式。

当前口径已经切换为：

- 后端数据准备与接口校验：复用 `test-data/scripts/seed-e2e-data.ps1` + `test-data/scripts/verify-backend-apis.ps1`
- 前端页面流转与交互验收：使用 Playwright MCP 在浏览器模式下执行
- 桌面外部能力：保留人工降级记录

本文件不再沿用旧的“公共电脑环境暂缓执行”假设。

## 2. 正式输入

Phase 10 的前端验收只允许以下文档作为正式输入：

- UI 流程与页面规格：`doc/UI/new/`
- Feature 基线：`plan/archive/desktop-ui-shell-refactor/plan.md`（已归档）
- Feature 验证记录：`plan/archive/desktop-ui-shell-refactor/validation.md`（已归档）
- 后端真实数据链路：`plan/archive/scrape-fail-graceful/plan.md`
- E2E 数据规范：`doc/testing/e2e/e2e-test-data-spec.md`

## 3. 执行边界

### 3.1 后端验收边界

后端验收是 Phase 10 的前置基线，不是本阶段的主体：

1. 运行 `test-data/scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause`
2. 运行 `test-data/scripts/verify-backend-apis.ps1 -NoPause`
3. 确认结果维持 `36 PASS / 2 SKIP / 0 FAIL`
4. 复用播种后写出的 `test-data/e2e/e2e-env.json`

### 3.2 前端验收边界

前端验收只关心两类问题：

- 页面是否按 `doc/UI/new/` 的正式规格完成流转、返回和动作收口
- 复用真实播种数据后，失败样本与成功样本在 UI 上是否被正确表达

本阶段不把“端点是否存在”“数据库是否写入成功”重新算作前端通过标准。

### 3.3 自动化与人工降级边界

浏览器模式可自动验收：

- 路由切换
- 列表、搜索、排序、分页
- 表单输入与弹层开关
- SSE 驱动后的页面刷新结果
- 卡片与详情页显示

浏览器模式只能人工降级记录：

- 播放器真实启动
- 打开系统文件夹
- 打开外部来源页

## 4. 环境要求

| 项目 | 要求 |
|------|------|
| .NET | `.NET 8 SDK` 可用 |
| Node | 可运行 `npm` / `vite` |
| Rust | 可构建 Tauri 壳层（用于 Release 构建与必要排查） |
| 浏览器模式 | `WorkerContext` 支持 `?workerPort=` / `?workerUrl=` |
| 日志目录 | `log/test/e2e/` 可写 |

如果当前机器缺少上述依赖，先补安装，再进入正式验收。

## 5. 数据基线

前端验收必须复用当前默认配置，不允许把样本替换成旧文档中的历史 VID：

| 类别 | 输入样本 | UI 期望 |
|------|----------|--------|
| 成功抓取 | `SNOS-037.mp4` | 有海报、标题、演员、完整 sidecar 状态 |
| 成功抓取 | `SDDE-759.mp4` | 有海报、标题、演员、完整 sidecar 状态 |
| 正常识别 | `sdde-660-c` | UI 中按 `SDDE-660-C` 展示，且归为成功抓取样本 |
| 失败抓取 | `FC2-PPV-1788676.mp4` | 保持可见，显示占位图，详情页仅部分 sidecar 成功 |

真实产物目录基线：

```text
test-data/e2e/data/test-user/cache/video/E2E-Lib-A/SNOS-037/
test-data/e2e/data/test-user/cache/video/E2E-Lib-A/SDDE-759/
test-data/e2e/data/test-user/cache/video/E2E-Lib-B/SDDE-660-C/
test-data/e2e/data/test-user/cache/video/E2E-Lib-B/FC2-PPV-1788676/
test-data/e2e/data/test-user/cache/actor-avatar/
```

## 6. 执行方式

### 6.1 当前正式方式

当前仓库**没有**正式提交的 Playwright npm 测试项目；Phase 10 采用以下组合执行：

1. PowerShell 脚本准备与拉起环境
2. Playwright MCP 打开浏览器页面
3. 通过点击、填表、截图、页面快照完成前端验收
4. 将执行结果回写到 `validation.md` 和相关文档

### 6.2 浏览器模式直连

前端通过以下 URL 直连 Worker：

```text
http://localhost:1420?workerPort={port}
```

或：

```text
http://localhost:1420?workerUrl=http://127.0.0.1:{port}
```

`{port}` 以 `test-data/e2e/e2e-env.json` 中的 `baseUrl` 为准，不手工猜端口。

### 6.3 推荐执行顺序

1. 运行 `test-data/scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause`
2. 运行 `test-data/scripts/verify-backend-apis.ps1 -NoPause`
3. 运行 `tauri/scripts/start-e2e-env.ps1`
4. 用 Playwright MCP 按 flow 执行页面验收
5. 保存截图、日志和人工降级记录到 `log/test/e2e/`
6. 执行完后运行 `tauri/scripts/stop-e2e-env.ps1`
7. 回写 `plan/archive/desktop-ui-shell-refactor/validation.md`

## 7. Flow 覆盖

前端验收以 `doc/UI/new/flow/README.md` 的 7 组正式流程为准：

| Flow | 验收重点 |
|------|---------|
| Main Shell Navigation | 主壳左侧导航稳定、影视库入口切页、右侧内容区承载正确 |
| Library Management | 库 CRUD、扫描反馈、打开单库 |
| Library Workbench | 单库结果集、单卡菜单、详情返回恢复 |
| Favorites | 收藏聚合结果、详情返回恢复 |
| Actors | 演员列表搜索/排序/分页、进入详情 |
| Actor Detail / Video Detail | 二级返回链路、关联影片下钻 |
| Settings | 6 分组、保存、恢复默认、diagnostics、`settings.changed` 回流 |

## 8. 抓取失败优雅降级补充验收

`scrape-fail-graceful` 已归档，但其前端验收必须在本阶段落实：

- `FC2-PPV-1788676` 卡片显示 `No Poster` 占位图
- 失败样本仍然出现在列表里，不会被前端过滤掉
- 失败样本可进入详情页
- 单卡菜单存在“重新抓取元数据”
- 单影片重抓后，列表页和详情页都能感知新状态
- `SDDE-660-C` 作为识别样本，在 UI 中必须表现为成功样本，而不是异常样本

## 9. 产物要求

本阶段所有前端验收产物统一写入 `log/test/e2e/`，至少包括：

- 执行日志
- 必要截图
- 人工降级结论
- 问题记录与修复后复验结论
- `tauri/scripts/start-e2e-env.ps1` 写出的 `log/test/e2e/runtime/frontend-env.json`

## 10. 通过标准

- 后端播种与 verify 基线未回归
- 7 组正式 flow 都有前端验收记录
- 失败样本和正常样本的显示预期都有明确记录
- 自动化项与人工降级项边界清楚，不混写成“全部自动通过”
- `plan/archive/desktop-ui-shell-refactor/validation.md`、`doc/testing/e2e/playwright-e2e-test-cases.md` 与真实结果一致

## 11. 关联文档

- `doc/testing/e2e/e2e-test-data-spec.md`
- `doc/testing/e2e/playwright-e2e-test-cases.md`
- `plan/archive/desktop-ui-shell-refactor/plan.md`
- `plan/archive/desktop-ui-shell-refactor/validation.md`
- `plan/archive/scrape-fail-graceful/plan.md`
