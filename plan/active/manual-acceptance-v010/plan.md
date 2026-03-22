# v0.1.0 验收总索引

## 目标

将当前验收工作拆成两份长期维护文档：

- 自动验收文档：记录自动验收项目、当前结果和后续自动复验安排。
- 人工验收文档：记录人工 / 混合验收项、人工反馈问题、完成摘要和未完成项。

## 文档分工

| 文档 | 作用 | 当前用途 |
|------|------|----------|
| `plan.md` | 总索引 | 只保留当前阶段、文档分工和下一步 |
| `auto-acceptance.md` | 自动验收项目与结果 | 当前自动化基线与下一轮复验入口 |
| `manual-acceptance.md` | 人工验收与修复跟踪 | 当前主工作文档 |

## 当前阶段

| 阶段 | 状态 | 说明 |
|------|------|------|
| 自动化基线 | 已完成 | 已形成当前自动验收基线，后续在人工问题收口后回跑 |
| 历史人工问题收口 | 已完成 | `F-001` 至 `F-027`、`M-001`、`M-002` 默认视为已完成，并已压缩进人工验收摘要 |
| 当前人工问题 | 已完成收口 | `F-038` 至 `F-042` 已完成实现，并已压缩进人工验收收口摘要 |
| 自动化复验 | 已完成 | 已回跑后端 API 校验、Worker 自动化测试和前端 / Rust 构建校验 |

## 当前聚焦

| 类别 | 内容 |
|------|------|
| 当前活跃问题 | 当前无阻断发布的活跃问题；历史 `F-001` 至 `F-042` 与 `M-001`、`M-002` 已压缩归档 |
| 当前主文档 | [manual-acceptance.md](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/manual-acceptance.md) |
| 下一个动作 | 生成 `0.2.4` 发布包并进行真包人工抽检；后续新增问题继续回写人工验收文档 |

## 快速链接

- [自动验收文档](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/auto-acceptance.md)
- [人工验收文档](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/manual-acceptance.md)
- [handoff.md](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/handoff.md)

## 保留背景

- 当前发布包准备推进到 `0.2.4`。
- 人工验收文档已进一步压缩为“历史完成摘要 + 最新收口摘要”结构。
- 后续如果新增人工反馈，继续在 `manual-acceptance.md` 中增量登记，并按新的问题编号继续维护。
