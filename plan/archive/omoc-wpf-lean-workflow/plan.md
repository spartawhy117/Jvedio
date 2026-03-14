## 用户需求

- 目标：给出一个用于 Oh My OpenCode 的极简使用方案，服务于 WPF 项目的测试与 UI 重构。
- 特殊约束：用户只有一个 LLM 订阅，因此需要尽量减少 agent 数量、调度次数和迭代轮数。
- 交付要求：产出完整 markdown 文档，并自行进行两轮内容迭代。
- 额外要求：用户原始期望是保存到桌面；但当前 planning 模式只允许写入 `plan/` 结构内，需要暂时改为保存到 active plan 目录。

## 核心需求分析

- 目标范围：
  - 输出一套可直接使用的低成本 agent 配置与工作流约束。
  - 覆盖 WPF UI 重构与测试工作的拆分方式。
  - 给出 token 节流、调度上限、feature 切分、验证顺序与提示词模板。
  - 结合当前 `Jvedio` 仓库的入口文件与测试结构做针对性建议。
- 非目标：
  - 本轮不实施任何业务代码改造。
  - 本轮不运行构建、测试、安装或桌面导出动作。
  - 本轮不设计多 agent 并行体系或复杂自动化流水线。
- 受影响区域：
  - `plan/active/omoc-wpf-lean-workflow/guide.md`
  - `plan/active/omoc-wpf-lean-workflow/plan.json`
  - `plan/active/omoc-wpf-lean-workflow/plan.md`
  - `plan/active/omoc-wpf-lean-workflow/.plan-original.md`
  - `plan/active/omoc-wpf-lean-workflow/handoff.md`

## 技术方案

- 仓库调研结论：
  - WPF 主窗口入口集中在 `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml` 与 `Window_Main.xaml.cs`。
  - 主界面状态与行为集中在 `Jvedio-WPF/Jvedio/ViewModels/VieModel_Main.cs`。
  - 样式桥接入口在 `Jvedio-WPF/Jvedio/CustomStyle/StyleManager.cs`，适合作为 UI 风格统一的锚点。
  - 测试工程已拆分为 `UnitTests` 与 `IntegrationTests`，其中 `MetaTube` 集成测试成本高于本地逻辑测试。
- 关键实现思路：
  - 推荐单 agent 严格串行路径，默认不保留常驻子 agent。
  - 将测试改造与 UI 重构拆为不同 feature，避免大上下文混杂。
  - 将 UI 重构按窗口/控件块切片，将测试按 unit / scan / network 分层切片。
  - 用固定的调度上限与轮次上限，防止单订阅场景下 token 失控。
  - 通过提示词模板和 AGENTS.md 规则降低后续重复组织成本。

## 当前发现

- `Window_Main.xaml` 体量很大，属于典型上下文膨胀源，不适合与多个大文件同时进入同一轮上下文。
- `VieModel_Main.cs` 和 `Window_Main.xaml.cs` 承载了较多主界面行为，适合在 UI feature 中和主窗口成组处理。
- `Jvedio.Test` 已有可用单测与集成测试结构，因此最划算的策略是先强化现有测试，再决定是否补 UI 自动化。
- 样式与主题逻辑已通过 `StyleManager` 和 `SuperControls` 承接，说明 UI 重构更适合先做结构与风格统一，而不是先做全控件重写。

## 任务拆解

1. 切换 active feature：
   - 将原 `unit-test-refactor` active plan 归档保留。
   - 建立新 feature `omoc-wpf-lean-workflow` 的 planning 工件。
2. 完成仓库调研：
   - 确认主窗口、主 VM、样式入口、测试入口。
   - 确认适合单订阅的低成本切分方式。
3. 输出方案文档：
   - 写出推荐拓扑、调度限制、验证策略、AGENTS.md 模板、提示词模板。
   - 提供 `方案路径` 对比并给出推荐。
4. 做两轮自迭代：
   - 第一轮补齐调度与轮次约束。
   - 第二轮补齐与 `Jvedio` 仓库的映射和落地顺序。
5. 保持待确认状态：
   - 等待用户确认是走单 agent 推荐路径还是保留双 agent 轻协作路径。

## 验证方式

- 文档验证：
  - 文档必须同时覆盖 agent 数量、调度限制、feature 切分、验证方式、提示词模板。
  - 文档必须结合当前仓库，而不是空泛模板。
  - 文档必须明确说明桌面导出当前受限。
- 规划验证：
  - `plan.json`、`plan.md`、`.plan-original.md`、`handoff.md` 齐备。
  - `plan.json` 状态保持为 `ready`，不进入 `approved`。
  - `方案路径` 区块明确，且推荐路径未被默认视为用户确认。

## 风险与未决问题

- 风险：
  - 如果后续执行时仍把 `Window_Main`、`VideoList`、`Window_Settings` 同时塞进一次上下文，仍会超出单订阅的舒适成本。
  - 如果过早扩展到 UI 自动化测试，收益未必覆盖 token 与验证成本。
- 未决问题：
  - 用户是否接受推荐的“单 agent 严格串行”路径。
  - 用户是否在未来切换到非 planning 模式后，仍需要把最终文档导出到桌面。

## 方案路径

### 路径 A
- 适用场景：单订阅、强调省 token、强调最少编排。
- 优点：
  - 配置最简单
  - 上下文连续性最好
  - 最适合 WPF 大 XAML 和混合 code-behind 结构
- 代价：
  - 搜索速度略慢
- 风险：
  - feature 切得不够小仍会膨胀
- 对 todo / 实施流影响：
  - 固定 1 个主 agent；测试和 UI 拆成不同 feature；每个 feature 最多 1 次 explore

### 路径 B
- 适用场景：确实频繁需要仓库级搜索，且愿意承担略高 token 成本。
- 优点：
  - 搜索效率更高
  - 主上下文更干净
- 代价：
  - token 增加
  - 需要额外汇总与回收信息
- 风险：
  - 子 agent 重复读仓库，成本容易失控
- 对 todo / 实施流影响：
  - 引入 1 个轻量 explore agent，但仍需严格限制调用次数

推荐路径：路径 A

## 用户确认状态

- 当前状态：ready
- 是否批准执行：false
- 已确认 feature slug：`omoc-wpf-lean-workflow`
- 已确认方案路径：待用户确认
- 桌面导出：待后续非 planning 模式处理
