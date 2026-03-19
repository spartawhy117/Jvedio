# AGENTS.md

## 仓库概览
- 仓库根目录：`D:\study\Proj\Jvedio`
- 主解决方案：`dotnet/Jvedio.sln`
- 主程序项目：`dotnet/Jvedio/Jvedio.csproj`
- 测试工程：`dotnet/Jvedio.Worker.Tests/Jvedio.Worker.Tests.csproj`（.NET 8 / MSTest / `dotnet test`）
- 旧测试工程：`dotnet/Jvedio.Test/`（已物理删除）
- 当前主线：WPF 桌面端 + MetaTube 唯一搜刮源

## 构建命令

### 主程序 Debug
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" Jvedio.sln -target:Build -property:Configuration=Debug -maxcpucount
```

### 主程序 Release
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" Jvedio.sln -target:Build -property:Configuration=Release -maxcpucount
```

主程序输出：
- `dotnet/Jvedio/bin/Release/Jvedio.exe`

### 测试工程编译
```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet build --configuration Release
```

### 跑全量测试
```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet test --configuration Release
```

### 跑单个测试
```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet test --configuration Release --filter "FullyQualifiedName~GetBootstrap_ReturnsSuccessEnvelope"
```

## 测试脚本入口
- 全量：`dotnet/Jvedio.Worker.Tests/scripts/run-all-tests.ps1`
- 单元测试：`dotnet/Jvedio.Worker.Tests/scripts/run-unit-tests.ps1`
- 集成测试：`dotnet/Jvedio.Worker.Tests/scripts/run-integration-tests.ps1`
- E2E 播种：`test-data/scripts/seed-e2e-data.ps1`
- E2E 清理：`test-data/scripts/cleanup-e2e-data.ps1`
- 后端 API 校验：`test-data/scripts/verify-backend-apis.ps1`

支持：
- 双击运行
- 命令行运行时加 `-NoPause`

## 测试配置目录
- `dotnet/Jvedio.Worker.Tests/ContractTests/` — Worker API 契约测试

## 测试日志与输出
测试日志：
- WebApplicationFactory 内置日志（临时目录 `{TempPath}/jvedio-test-{guid}/log/test/worker-tests/runtime/`，测试后自动清理）

当前测试规模：
- 62 个测试（Bootstrap 2 + DTO 2 + Libraries 2 + Settings 3 + Videos 7 + Actor 5 + Scrape 7 + VidParsing 18 + SidecarPath 9 + ScanOrganize 5 + ScanImportApi 2）
- 全部通过

## 当前关键目录规则
正式 sidecar：
- 写入影片目录
- 命名规则：
  - `<VID>.nfo`（完整抓取：含标题/演员等元数据；抓取失败：仅含 `<movie><num>VID</num></movie>` 最小内容）
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`

`metadata_video.ScrapeStatus` 字段值域：
- `none` — 从未抓取（默认值）
- `full` — 抓取成功（Title + WebUrl + 4 sidecar 全齐）
- `failed` — 抓取尝试过但失败（stub NFO 已写入，无图片文件）

正式缓存：
- `data/<user>/cache/video/`
- `data/<user>/cache/actor-avatar/`

E2E 测试 sidecar（目标路径，后续 Worker 适配后生效）：
- `test-data/e2e/data/<user>/cache/video/<LibName>/<VID>/` — 按库名分子目录
- 与正式 sidecar（写入影片目录）路径独立，Release 代码不受影响
- `.gitignore` 中 `test-data/**/cache/` 规则覆盖

统一日志目录：
- `log/runtime/` — Worker + Shell 运行日志
- `log/test/` — 测试日志与输出
- `log/test/worker-tests/` — 后端测试工程（持久化，不自动清理）
- `log/test/e2e/` — Playwright 产物（Phase 10 使用）
- `log/dev/` — 开发流程日志（可选）
- 详见 `doc/logging-convention.md`

测试输出：
- `data/<user>/log/test/<VID>/`（WPF Legacy 调试输出）

扫描整理：
- 平铺影片会自动整理到独立目录
- 整理失败的影片：
  - 跳过
  - 不继续搜刮
  - 继续后续影片

## 代码风格
- 保持当前 WPF + code-behind + ViewModel 混合风格
- 命名：
  - 类/方法/属性：PascalCase
  - 局部变量：camelCase
- 强类型优先，边界层可做兼容字典转换
- 不引入无用 using
- 变更尽量最小化，不做无关重构
- 错误不要吞掉，关键流程必须写日志
- 多步骤链路日志建议带语义前缀：
  - `[MetaTube-Test]`
  - `[Library-Organize]`

## 修改后必须执行
1. 更新相关文档
2. 重新生成 Release
3. 运行受影响测试
4. 必要时跑全量测试
5. 确认输出目录/日志符合预期
6. 再提交和推送

补充规则：
- 如果本轮只修改文档、说明文字、规划内容或其他纯内容文件，且不涉及 MetaTube 抓取链、扫描导入链、测试脚本或相关实现代码，则最后可以不跑 `Jvedio.Worker.Tests` 的集成测试。
- 上述纯内容修改场景下，仍需至少完成 Release 构建，并在提交说明里明确“未跑集成测试”的原因。
- 如果用户口头要求“提交”，默认包含两个动作：先 `commit`，再 `push`；只有在用户明确说明“只本地提交 / 不推送”时，才只做本地提交。


## 文档索引
- 开发总览：`doc/developer.md`
- MetaTube 历史计划归档：`plan/archive/metatube-only-plan/README.md`
- 测试文档索引：`doc/testing/README.md`
- 测试目标文档：`doc/testing/backend/test-targets.md`
- 测试计划文档：`doc/testing/backend/test-plan.md`
- 当前测试清单：`doc/testing/backend/test-current-suite.md`
- Playwright 执行方案：`doc/testing/e2e/playwright-e2e-test-plan.md`
- E2E 用例清单：`doc/testing/e2e/playwright-e2e-test-cases.md`
- 变更日志：`doc/CHANGELOG.md`

## UI 文档规则
- 当前 exe UI 实施文档统一以 `doc/UI/new/` 为准。
- 当前项目所有正式 UI 线框图、弹层图、共享组件图、流程图统一采用白色背景底图方案，不再输出深色底图或暗色画布版本。
- 线框图只负责表达布局、层级和主要视觉关系，不承担完整功能说明。
- 每个页面规格文档至少应包含以下章节：
  - `页面目的`
  - `页面范围`
  - `数据来源`
  - `元素清单`
  - `交互规则`
  - `状态定义`
  - `性能与体验约束`
  - `回归点`
- 共享组件、通用弹窗、行内动作条、状态 badge 等通用规则优先收敛到共享文档，不要在每个页面文档里重复写散。
- `doc/UI/new/foundation/` 是当前主题、多语言、图片 / 图标等实现级共享规范入口；这类长期规则优先写在这里，不要只散落在 `plan.md` 或聊天结论里。
- `doc/UI/new/flow/README.md` 是当前正式流程图的文字索引与流程摘要入口；流程图不只要有图片，还要有对应的文字流程说明。
- 如果修改了 `doc/UI/new/flow/` 下任意正式流程图（`.png` 或 `.excalidraw`），必须同步更新 `flow/README.md` 中对应条目的流程说明；如果流程变化影响页面职责或返回链路，还要继续同步对应页面文档。
- 每次修改任一正式 UI 图片或线框源后，必须检查对应页面文档以及 `doc/UI/new/flow/` 下相关流程图是否需要同步调整；如果确认不需要改，也要先完成这一步检查再继续。
- 多语言实现当前优先支持 `zh` 与 `en`，目录结构可参考 `clash-verge-rev` 的 `locales/{lang}/index.ts + *.json` 组织方式，不要把所有文案堆进单个大文件。
- 图片 / 图标资源当前优先按三层管理：品牌与应用资产、业务与页面图标、通用操作图标；通用图标优先走 icon library，品牌与业务图标再维护自有 SVG。
- 如果修改了主题模式、token 结构、语言包目录、图片 / 图标目录、显色策略或主题资源切换流程，必须同步更新 `doc/UI/new/foundation/` 下对应文档。
- 参考 `clash-verge-rev` 时，可以借鉴其资源分类方式和整体风格；当前项目以个人使用为主，如需直接复用第三方图片，至少保留最小来源备注，不要求额外重型流程，但也不要零记录直接拷贝。
- 如果某功能当前没有稳定实现链路，不要只因为旧图或旧方案存在，就继续在新 UI 文档里画成可点击主入口；应在文档中明确标注为“当前不保留”或“暂不接线”。

## 增强规划工作流
- 复杂功能、跨模块修改、架构调整优先使用 `plan-todo` 模式。
- 项目级 planning 结构统一放在 `plan/` 目录。
- 当前 active feature 默认采用轻量工件结构：
  - `plan/active/<feature>/plan.md`
  - `plan/active/<feature>/handoff.md`
- 可选工件：
  - `plan/active/<feature>/open-questions.md`
  - `plan/active/<feature>/validation.md`
- `plan/active/<feature>/plan.json` 仅作为工具元数据，不承载正文叙事；只有工具确有需要时才维护。
- build 模式默认优先读取当前 feature 的 `handoff.md`；需要更多背景时再读取 `plan.md`；涉及未决项或回归范围时再读 `open-questions.md` / `validation.md`。
- 旧的计划或进度文档完成迁移后应收敛到 `plan/archive/` 或 `doc/_legacy/`，避免继续占用 `doc/` 主索引位置。
- 同一时间只维护一个 active feature；切换 feature 时优先恢复已有 plan，而不是新建重复计划。
- 如果存在多个可行方案，必须输出单独的 `方案路径` 区块，并在用户明确确认前保持规划状态。
- **Plan 已完成内容简化**：每当一个 Phase / 步骤被标记为已完成并提交后，必须回到对应的 `plan.md`，将该 Phase 的详细执行步骤、子任务表格、通过标准、关联文档更新等内容压缩为 2-5 行摘要（保留"做了什么 + 关键数字"），删除冗余的执行细节。目的是让 plan.md 保持精简，未完成的 Phase 保留完整细节，已完成的只留结论。
