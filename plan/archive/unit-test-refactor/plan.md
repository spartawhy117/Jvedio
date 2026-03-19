## 用户需求

- 功能目标：建立一个新的 active feature plan，用于收敛 `Jvedio.Test` 的 unit test 结构与维护方式。
- 业务背景：当前测试工程已经形成可运行的测试体系，但目录分层、遗留测试、命名一致性、空壳文件与 helper 复用仍有不统一之处。
- 约束条件：
  - 本轮只做 planning，不执行修改。
  - 实施范围限制在 `Jvedio.Test` 内部，避免扩展到生产代码重构。
  - 必须保持当前运行时目录规则与测试输出规则不被破坏。
  - 文档更新需要与测试结构同步。

## 完成状态

- 当前状态：`completed`
- 完成结论：单元测试改造相关功能检测已完成，当前 plan 从“已批准待执行”切换为“已完成”
- 完成范围：
  - `Jvedio.Test` 的 unit / integration 边界收敛
  - scan 配置与执行流简化
  - 相关测试文档同步
- 当前处理方式：保留本目录作为已完成 feature 的执行记录，待后续切换新 active feature 时再决定是否归档迁移

## 核心需求分析

- 目标范围：
  - 统一 `Jvedio.Test` 下 unit test 与 integration test 的边界。
  - 识别并清理遗留、漂浮、空壳或未纳入工程的测试文件。
  - 规范测试目录、命名、bootstrap 与临时目录处理方式。
  - 为后续 build 模式提供最小 handoff。
- 非目标：
  - 不在本 feature 中扩展到生产代码的大规模可测试性改造。
  - 不重新设计测试框架，不替换 MSTest。
  - 不改动既有 MetaTube 主线业务规则。
- 受影响区域：
  - `dotnet/Jvedio.Test/Jvedio.Test.csproj`
  - `dotnet/Jvedio.Test/UnitTests/`
  - `dotnet/Jvedio.Test/IntegrationTests/`
  - `dotnet/Jvedio.Test/ScanTest/`
  - `dotnet/Jvedio.Test/TestBootstrap.cs`
  - `doc/test-targets.md`
  - `doc/test-plan.md`
  - `doc/test-current-suite.md`

## 技术方案

- 现有系统关系：
  - 当前 `UnitTests/` 中已有 media / scraper / scan / logs 四类单测。
  - `IntegrationTests/` 中已有 MetaTube 与 Scan 测试。
  - 旧的 `ScanTest/ImportTest.cs` 当前已不在仓库中，相关扫描导入覆盖已由 `UnitTests/Core/Scan/ScanTaskImportTests.cs` 承接。
  - 先前提到的 `UnitTests/Core/Crawler/CrawlerServer.cs` 当前也不在仓库中，且 `Jvedio.Test.csproj` 没有相关编译项。
- 关键实现思路：
  - 先确认 unit / integration 的边界定义，并据此整理目录与命名。
  - 将遗留测试迁移到统一结构，或在第一阶段明确保留但标记为待迁移。
  - 清理未纳管和空壳测试文件，避免误导后续维护。
  - 抽取统一测试辅助约定，集中处理 WPF bootstrap、临时目录、静态路径恢复。
  - 保持当前 suite 输出与主程序调试输出规则不变。
- 数据流或模块协作：
  - `TestBootstrap` 负责 WPF 环境准备。
  - Unit tests 应优先使用临时目录和独立路径，不污染 `config/<suite>/output/`。
  - Integration tests 继续使用 `config/meta-tube/output/` 与 `config/scan/output/`。
  - 文档负责记录边界、目录、执行方式与当前 suite。

## 当前发现

- `dotnet/Jvedio.Test/ScanTest/` 目录当前为空，说明旧的 `ImportTest.cs` 已不再是现存阻塞项。
- `dotnet/Jvedio.Test/UnitTests/Core/Scan/ScanTaskImportTests.cs` 已承接基础导入与分段导入这类快速验证测试。
- `dotnet/Jvedio.Test/IntegrationTests/Scan/ScanImportIntegrationTests.cs` 已承接扫描整理后的路径更新与失败回落验证。
- 先前规划里提到的 `UnitTests/Core/Crawler/CrawlerServer.cs` 在当前仓库中不存在，也未被 `Jvedio.Test.csproj` 引用。
- 部分 unit test 直接写全局静态路径，缺少统一恢复策略。
- 当前运行时目录与路径规则已在代码与文档中持久化，不需要在本 feature 中重定义。

## 任务拆解

1. 明确测试边界：
   - 定义哪些测试属于 unit test，哪些属于 integration test。
   - 标出当前不符合边界的遗留测试文件。
2. 规划结构清理：
   - 统一目录结构、命名风格、测试类职责。
   - 清理 `ScanTest/` 这类空目录或遗留占位结构，并避免文档继续引用已不存在的测试文件。
   - 再次核对空壳文件和未纳管文件是否仍存在于仓库或 csproj 中。
3. 规划辅助层收敛：
   - 统一 `TestBootstrap`、临时目录、静态路径恢复规则。
   - 减少复制式初始化逻辑。
4. 规划文档同步：
   - 更新 `doc/test-plan.md` 中的结构描述。
   - 更新 `doc/test-current-suite.md` 中的当前测试归类。
   - 如边界定义有变化，同步更新 `doc/test-targets.md`。
5. 简化 scan 配置与执行流：
   - 将 `scan-test-config.json` 收敛为输入目录、输出目录、报告设置和少量开关。
   - 测试时只需把待测影片放进输入目录，调用 PS 脚本后验证输出目录与报告文件。
   - 当前 scan 测试只覆盖查询命中、创建目录、迁移影片和未命中汇总，不覆盖完整搜刮下载链。
6. 生成 build handoff：
   - 为 build 模式输出最小可执行上下文。

## 验证方式

- 功能验证：
  - `Jvedio.Test` 目录结构与 `Jvedio.Test.csproj` 编译项一致。
  - unit / integration 分类清晰，空壳或漂浮文件处理明确。
  - 当前既有运行时路径规则不被破坏。
  - scan 测试可在仅配置输入目录、输出目录和少量开关的前提下完成运行。
  - 命中影片会被整理到输出目录子目录，未命中影片保持原位，并生成简易 JSON/TXT 报告。
- 测试或构建验证：
  - 受影响测试可继续通过。
  - `Jvedio.Test.csproj` 无失效 compile/include 项。
  - 文档与目录结构保持一致。

## 风险与未决问题

- 风险：
  - 如果一次性迁移测试目录过多，可能导致 csproj、文档和脚本描述短期不同步。
  - 若清理遗留目录时未区分“历史占位”与“仍会被人工流程依赖”，可能造成文档与认知错位。
  - 仅验证整理能力并不能完全覆盖主程序真实搜刮链路，因此仍需配合后续单影片与扫描目录手测。
- 未决问题：
  - 当前两项历史未决点已通过仓库复核收敛：`ScanTest/ImportTest.cs` 与 `UnitTests/Core/Crawler/CrawlerServer.cs` 在当前仓库中均不存在，不再作为实施阻塞项。
  - 用户已确认采用路径 A：在 build 阶段顺手删除空的 `ScanTest/` 目录，并同步文档中的历史描述。
  - scan 配置改造已收敛为最简模型：输入目录、输出目录、少量开关、结果报告；不再维持 case 级复杂断言字段。

## 方案路径

### 路径 A
- 适用场景：仅希望整理 `Jvedio.Test`，不扩大到生产代码。
- 优点：
  - 风险低
  - 范围明确
  - 验证成本小
- 代价：
  - 一些深层 testability 问题以后再处理
- 风险：
  - 反射与全局静态依赖可能暂时保留
- 对 todo / 实施流影响：
  - 优先整理目录、命名、helper、csproj、文档

### 路径 B
- 适用场景：允许顺带改生产代码可测试性边界
- 优点：
  - 长期收益更高
- 代价：
  - 范围扩大
  - 回归压力增加
- 风险：
  - 偏离“unit test refactor”单一 feature
- 对 todo / 实施流影响：
  - 需要新增生产代码改造与回归验证任务

推荐路径：路径 A

## 用户确认状态

- 当前状态：completed
- 是否批准执行：true
- 已确认 feature slug：`unit-test-refactor`
- 已确认方案路径：A
- 已确认收尾策略：删除空 `ScanTest/` 目录并同步文档表述
- 已确认 scan 测试策略：仅验证查询命中、目录整理、未命中保留和结果报告
- 当前 planning 结论：单元测试改造功能检测已完成，本 feature 进入完成态并保留现有 handoff 作为结果记录
