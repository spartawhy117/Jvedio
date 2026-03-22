# v0.1.0 自动验收

## 文档目的

本文件只承载可自动执行或已在浏览器模式下建立基线的验收项目、执行结果和后续自动复验安排。

当前约束：
- 第一轮自动化基线已完成。
- 后续会先修人工反馈问题，再回到本文件执行一轮自动复验。

## 当前状态

| 项目 | 状态 |
|------|------|
| 自动化项总数 | 43 |
| 当前结果 | 41 通过，2 未覆盖 |
| 当前基线日期 | `2026-03-22` |
| 当前基线环境 | Playwright MCP + 浏览器模式 |
| 后续动作 | 浏览器基线已完成，Worker 自动化补充测试已回跑；等待真包交叉项复核 |

## 自动验收项目与结果

| Phase | 自动验收项 | 结果 | 备注 |
|------|------------|------|------|
| Phase 1 | `1.1` 解压 ZIP 便携版 | 通过 | 目录结构完整 |
| Phase 1 | `1.3` Worker 自动拉起（自动化基线部分） | 通过 | 仅浏览器模式基线通过，真包复核待补 |
| Phase 1 | `1.4` 主界面首次渲染 | 通过 | 左侧导航与右侧内容区正常 |
| Phase 2 | `2.1` `2.2` `2.3` | 通过 | 主壳导航切换稳定 |
| Phase 3 | `3.2` `3.3` `3.4` `3.5` | 通过 | 新建 / 编辑 / 删除确认 / 列表刷新正常 |
| Phase 3 | `3.1` 首次进入库管理空态 | 未覆盖 | 自动化基线必须预置 2 个媒体库 |
| Phase 4 | `4.1` `4.2` `4.3` `4.4` | 通过 | 扫描、整理、导入、活动条正常 |
| Phase 5 | `5.1` `5.2` `5.3` `5.4` `5.5` | 通过 | MetaTube 链路与 sidecar 写出通过 |
| Phase 6 | `6.1` `6.2` `6.3` `6.5` `6.6` | 通过 | 网格、搜索、排序、右键菜单、多选正常 |
| Phase 6 | `6.4` 分页 | 未覆盖 | 当前播种每库仅 2 条影片 |
| Phase 7 | `7.1` `7.4` `7.5` `7.6` | 通过 | 详情页、演员入口、返回链路、失败样本正常 |
| Phase 8 | `8.1` `8.2` `8.3` `8.4` `8.5` `8.6` | 通过 | 收藏、演员列表、演员详情、返回链路正常 |
| Phase 9 | `9.1` `9.2` `9.3` `9.4` | 通过 | 设置分组切换、保存、恢复默认、诊断正常 |
| Phase 10 | `10.1` `10.2` `10.3` `10.4` | 通过 | 单项重抓、批量重抓、刷新、删除回刷正常 |

## 自动化基线记录（日期：2026-03-21）

- 执行人：Codex
- 环境：Playwright MCP + 浏览器模式（`http://localhost:1420?workerUrl=http://127.0.0.1:5026`）
- 数据准备：`scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` / `scripts/verify-backend-apis.ps1 -NoPause` / `scripts/start-e2e-env.ps1 -NoPause`
- MetaTube：使用 `test-data/config/test-env.json` 中的测试地址 `https://metatube-server.hf.space`
- 结果摘要：43 个自动化项中 41 项通过，2 项因当前播种基线限制未覆盖；混合项 `1.3` 已完成自动化基线，仍待真实 `JvedioNext.exe` 复核

### 已执行 Phase

- [x] Phase 2 主壳导航
- [x] Phase 3 库管理（不含 `3.1` 空态）
- [x] Phase 4 扫描与目录整理
- [x] Phase 5 搜刮（MetaTube）
- [x] Phase 6 单库浏览（不含 `6.4` 分页）
- [x] Phase 8 收藏与演员
- [x] Phase 1 / 7 / 9 / 10 中的自动化部分

### 关键结果

- 页面流转：`设置 / 库管理 / 喜欢 / 演员` 切换正常，`Favorites → Video Detail → 返回` 与 `Actors → Actor Detail → Video Detail → 返回 → 返回` 都能恢复上一层筛选状态。
- 列表 / 搜索 / 排序 / 分页：单库搜索、排序、右键菜单、多选批量动作通过；`6.4` 分页未覆盖，因为当前播种仅 2 条/库，不足以生成第二页。
- 弹层 / 菜单 / 批量动作：新建库、编辑预填、删除确认、单卡菜单、批量重抓、批量删除入口都已走通。
- 扫描 / 搜刮 / sidecar：平铺样本整理进独立子目录；成功样本写出 `.nfo / -poster.jpg / -thumb.jpg / -fanart.jpg`，失败样本仅保留 stub NFO；失败卡片显示 `No Poster` 占位图。
- 设置保存 / diagnostics / SSE 回流：当前 5 个设置分组 `基本 / 扫描与导入 / 播放器设置 / 库 / MetaTube` 切换正常，MetaTube diagnostics 命中测试地址 `https://metatube-server.hf.space` 并返回成功。
- 失败样本表现：`FC2-PPV-1788676` 详情页可正常打开；单影片重抓、批量重抓和删除后列表回刷均通过，删除后侧边库计数也已同步修复。

### 未覆盖项

- `3.1` 首次进入库管理空态：当前自动化基线必须预置 2 个媒体库，无法同时验证空态。
- `6.4` 分页：当前每库仅 2 条影片，未形成第二页数据。

## 自动复验记录（日期：2026-03-22）

- 执行顺序：`scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` → `scripts/verify-backend-apis.ps1 -NoPause` → `scripts/start-e2e-env.ps1 -NoPause` → Playwright MCP 浏览器模式复验。
- 数据准备：播种脚本已对齐“扫描即含抓取”的现实现状，成功写出 `test-data/e2e/e2e-env.json`、`cache/video/*` sidecar 和 `cache/actor-avatar/*`。
- 后端基线：`verify-backend-apis.ps1` 恢复到 `36 PASS / 2 SKIP / 0 FAIL`。
- 浏览器复验：主壳导航、库管理弹层、单库搜索与返回恢复、Favorites 详情返回、Actors 搜索与返回恢复、MetaTube 连通性诊断、失败样本详情页均复验通过。
- 控制台与前端日志：未发现新的阻断性前端错误；唯一浏览器错误为 `favicon.ico` 404，不影响验收结果。

## Worker 自动化补充记录（日期：2026-03-22）

- 本轮针对人工问题修复补充了 4 个 `Jvedio.Worker.Tests` 自动化用例，覆盖显示设置持久化 / 默认回退和删除目录清理安全规则。
- 当前 `Jvedio.Worker.Tests` 已回跑通过：`72 / 72 PASS`。
- 本轮执行命令：
  - `dotnet test dotnet/Jvedio.Worker.Tests/Jvedio.Worker.Tests.csproj --configuration Release`
  - `npm run build`

## 自动化问题与基线修复

| 编号 | Phase | 严重度 | 类型 | 描述 | 复现步骤 | 状态 |
|------|-------|--------|------|------|----------|------|
| A-001 | 基线脚本 | P1-严重 | 自动化 | 根目录脚本包装器按位置转发开关，导致 `-NoPause` / `-SkipWorkerShutdown` 失效，自动化基线无法稳定串行执行。 | 运行 `scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` 或 `scripts/verify-backend-apis.ps1 -NoPause` | 已修复（`26b74bf`） |
| A-002 | Phase 6 | P1-严重 | 自动化 | QueryToolbar 搜索仅在按 Enter 后才生效，不满足“输入即过滤”的验收口径。 | 单库页输入 `SDDE` 或 `SNOS`，不按 Enter 观察结果不变 | 已修复（`ee58d19`） |
| A-003 | Phase 10 | P2-一般 | 自动化 | 删除影片后主列表已回刷，但左侧库徽标计数未同步，列表与导航状态不一致。 | 在单库页通过右键菜单删除影片，观察右侧总数与左侧库计数 | 已修复（`34f956a`） |
| A-004 | 基线脚本 | P1-严重 | 自动化 | 扫描任务现已内含抓取，但播种脚本仍在扫描后才配置 MetaTube，导致首次扫描直接以 `MetaTube server url is empty` 失败。 | 运行 `scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause` | 已修复（本轮） |
| A-005 | 基线脚本 | P1-严重 | 自动化 | `verify-backend-apis.ps1` 仍按旧 Settings 契约读取 `image` 分组并向 diagnostics 发送旧字段，导致设置校验阶段中断。 | 运行 `scripts/verify-backend-apis.ps1 -NoPause` | 已修复（本轮） |

## 与人工验收的交叉项

| 编号 | 类型 | 说明 | 当前状态 |
|------|------|------|----------|
| `1.3` | 混合项 | 自动化基线已过，仍需真包复核 | 待人工复核 |
| M-001 | 人工修复影响自动化复核 | 真包日志目录与路径已修复 | 待真包复核 |
| M-002 | 人工修复影响自动化复核 | MetaTube 重抓 UTF-8 问题已修复 | 待真包复核 |

## 下一轮自动复验计划

下一轮自动验收应在新的 UI / Worker 变更或真包复核前执行，目标是确认：

1. 现有自动化通过项未回归。
2. 当前未覆盖项是否因数据或组件调整而变得可覆盖。
3. 人工问题修复没有破坏搜索、排序、分页、详情页、设置页和重抓链路。

建议复验顺序：

1. `scripts/seed-e2e-data.ps1 -SkipWorkerShutdown -NoPause`
2. `scripts/verify-backend-apis.ps1 -NoPause`
3. `scripts/start-e2e-env.ps1 -NoPause`
4. 回跑 Phase 2 / 3 / 4 / 5 / 6 / 8 与 Phase 1 / 7 / 9 / 10 的自动化部分
5. 记录新的通过率、未覆盖项和新增回归问题
