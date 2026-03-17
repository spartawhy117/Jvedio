# Desktop UI Shell Refactor Validation

## 工件结构收敛

- active feature 当前仅保留：`plan.md`、`handoff.md`、`open-questions.md`、`validation.md` 和 `plan.json`。
- `implementation-steps.md` 已移除。
- `.plan-original.md` 已移除。
- `plan.json` 已降级为工具元数据，不再承载正文叙事。
- `handoff.md` 明显短于 `plan.md`，且不再复制大段阶段历史。

## 文档边界

- `plan.md` 当前只承载结构决策、冻结事实和完整版迁移文档的预留边界。
- `doc/UI/new/` 继续作为唯一正式 UI 输入。
- `clash-verge-rev` 仅作为局部 UI 组织参考，不作为产品或架构来源。
- `electron/` 在当前文档口径中只作为过渡实现，而非长期主线。

## 完整版迁移文档前置检查

- `open-questions.md` 只保留真实未决项。
- `AGENTS.md` 已同步到轻量 planning 结构。
- `plan/templates/` 已去除 `.plan-original.md` 默认模板，并把 `plan.json` 改成元数据模板。
- `doc/UI/new/ui-todo.md` 不再把 `implementation-steps.md` 视为当前活跃工件。
- 当前仅做文档结构重写，不涉及 `Worker` / `Contracts` / `electron` 实现代码。

## 本轮验证说明

- 本轮为纯文档结构调整。
- 不跑 `Jvedio.Test` 集成测试。
- 按仓库规则至少完成一次 `Release` 构建。
