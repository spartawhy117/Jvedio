## Feature Goal

- 将当前 active feature 从旧的 `Electron` 主叙事切换为轻量 planning 容器，为后续 `Tauri 2` 主线迁移文档提供稳定入口。

## Current Reality

- `electron/` 已覆盖大部分页面与流程，但现在只作为过渡实现保留。
- `Jvedio.Worker` 与 `Jvedio.Contracts` 继续保留，后续只做少量收敛。
- `doc/UI/new/` 已是唯一正式 UI 输入。
- 当前优先完成 planning 工件收敛，再输出完整版迁移方案。

## Current Artifact Set

- `plan.md`：主方案与结构决策
- `handoff.md`：当前状态与下一步
- `open-questions.md`：真实未决项
- `validation.md`：独立验证矩阵
- `plan.json`：工具元数据
- 已移除：`implementation-steps.md`、`.plan-original.md`

## Next Recommended Work

1. 在当前轻量结构上重写完整版 `Tauri 2 + React/Vue + C# Worker + Jvedio.Contracts` 迁移方案。
2. 同步清退旧 `Electron / fntv-electron` 主叙事。
3. 审查通过后，再决定最终落库文件范围。

## Blockers And Caveats

- `React / Vue` 仍待最终锁定。
- Worker 端口固定值还是动态值仍待定。
- 允许参考 `clash-verge-rev` 的局部 UI 组织方式，但只限布局与页面编排。
