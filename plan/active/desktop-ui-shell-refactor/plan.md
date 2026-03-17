## 当前目标

- 将 `plan/active/desktop-ui-shell-refactor/` 从旧的重工件规划模式收敛为轻量结构，为后续完整版迁移文档让路。
- 当前文件只保留结构决策、冻结事实和下一步写作边界；不再重复 handoff、执行步骤和验证矩阵。
- 完整版方案将在下一步以 `Tauri 2 + React/Vue + C# Worker + Jvedio.Contracts` 为审查对象重写。

## 当前事实

- 项目仍处于旧桌面实现向新桌面实现迁移阶段。
- 现有 `electron/` 已覆盖大部分页面和主流程，但现在只视为过渡壳，不再作为长期文档主线。
- `Jvedio.Worker` 与 `Jvedio.Contracts` 已基本成型，后续主要是少量收敛，而不是推倒重来。
- `doc/UI/new/` 已是唯一正式 UI 输入，后续页面、弹层、共享组件和流程均以这里为准。
- 可以有限参考 `clash-verge-rev` 的局部 UI 组织形式，例如左侧导航层级、设置页左右分栏和壳层布局节奏；但不继承其产品信息架构、业务流转、后端实现或契约边界。

## 轻量工件结构

- `plan.md`
  - 用途：唯一的人类可读主方案文档。
  - 承载：项目现状、结构决策、完整版迁移文档正文，以及后续阶段路线与落库边界。
- `handoff.md`
  - 用途：新会话恢复入口。
  - 承载：当前真实状态、最近结论、下一步建议和关键约束。
- `open-questions.md`
  - 用途：只记录真实未冻结、会影响方案或实现边界的问题。
  - 规则：若无真实未决项，可继续删除，不再为了流程完整性强行保留。
- `validation.md`
  - 用途：保留独立验证矩阵。
  - 原因：当前 feature 的回归面较大，仍值得独立维护。
- `plan.json`
  - 用途：工具元数据。
  - 规则：不再承载正文叙事，不再要求与 `plan.md` / `handoff.md` 做逐段内容镜像。

## 本轮结构收敛决策

- 删除 `implementation-steps.md`；后续阶段路线统一并入完整版 `plan.md`。
- 删除 `.plan-original.md`；不再为 active feature 维护基线快照。
- `handoff.md` 控制为短摘要，不再膨胀成第二份 `plan.md`。
- 当前不新增额外的 `reference-notes`、`execution-steps` 或类似平级工件。
- `validation.md` 作为可选工件在本 feature 中继续保留，但它只负责验证，不再承担主叙事。

## 完整版迁移文档的预留边界

- 新主线：`Tauri 2 + React/Vue + C# Worker + Jvedio.Contracts`
- 保留：`Worker + Contracts + localhost API + SSE`
- 替换：`Electron` 壳层与当前手写 renderer 主实现
- 清理：所有把 `fntv-electron` 当作后续主线参考的文档叙事
- 说明：完整版迁移文档会吸收必要的阶段路线、验证矩阵与回退策略，但不再拆出单独的 `implementation-steps.md`

## 当前非目标

- 本轮不直接展开完整版迁移与重构方案正文。
- 本轮不继续扩写 `Electron` 主线叙事。
- 本轮不改写 `doc/UI/new/` 的页面规格正文。
- 本轮不触碰 `Worker` / `Contracts` / `electron` 实现代码。

## 下一步

1. 在当前轻量结构上重写完整版迁移与重构方案正文。
2. 冻结 `React / Vue`、Worker 端口策略与新壳目录命名等未决项。
3. 审查通过后，再同步改写仓库内其他规划和说明文档。
