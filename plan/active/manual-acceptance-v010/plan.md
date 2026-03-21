# v0.1.0 验收总索引

## 目标

将当前验收工作拆成两份长期维护文档：

- 自动验收文档：记录自动验收项目、当前结果和后续自动复验安排。
- 人工验收文档：记录人工 / 混合验收项、人工反馈问题、分析状态和修复状态。

这样可以支持当前先修人工问题，修完后再独立执行一轮自动验收复核。

## 文档分工

| 文档 | 作用 | 当前用途 |
|------|------|----------|
| `plan.md` | 总索引 | 说明文档分工、当前阶段和下一步 |
| `auto-acceptance.md` | 自动验收项目与结果 | 修完人工问题后回跑自动验收 |
| `manual-acceptance.md` | 人工验收与修复跟踪 | 当前主工作文档 |

## 当前阶段

| 阶段 | 状态 | 说明 |
|------|------|------|
| 自动化基线 | 已完成 | 首轮自动验收已建立 41/43 基线 |
| 人工问题收集 | 已完成一轮 | 当前已沉淀 `F-001` 至 `F-024` |
| 人工问题深挖与修复 | 下一步 | 先按问题簇分析，再逐项修复 |
| 自动化复验 | 待执行 | 人工问题修复后回到自动验收文档执行 |

## 验收环境

| 项目 | 要求 |
|------|------|
| 发布包 | `build/release/JvedioNext_0.1.0_x64-portable.zip` |
| 运行环境 | Windows 10/11 x64 |
| 前置条件 | 无需手动启动 Worker（Tauri Shell 自动拉起） |
| 测试数据 | 准备 4+ 个真实影片文件用于扫描导入 |
| MetaTube | 需要可用的 MetaTube 实例 |

## 顶部速览

| 类型 | 数量 | 当前状态 |
|------|------|----------|
| 自动化项 | 43 | 41 通过，2 未覆盖 |
| 人工项 | 5 | 待真包逐项复核 |
| 混合项 | 1 | 自动化基线已过，待桌面复核 |

## 当前建议

1. 当前主要工作文档切换为 [manual-acceptance.md](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/manual-acceptance.md)。
2. 人工问题修复完成后，再切回 [auto-acceptance.md](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/auto-acceptance.md) 执行自动复验。
3. `plan.md` 只保留总览，不再继续堆叠详细问题池和自动化执行记录。

## 快速链接

- [自动验收文档](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/auto-acceptance.md)
- [人工验收文档](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/manual-acceptance.md)
- [handoff.md](/D:/study/Proj/Jvedio/plan/active/manual-acceptance-v010/handoff.md)

## 保留背景

- Phase 10 自动化 E2E 已跑通 7 组 flow（Playwright MCP + 浏览器模式）
- 65 个后端测试全部通过
- 当前已完成第一轮自动化基线，正在推进人工问题分析与修复
- 人工问题修复完成后，仍需执行一次自动验收校验
