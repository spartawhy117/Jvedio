# v0.1.0 人工验收 Handoff

## 当前状态

- **Feature**: `manual-acceptance-v010`
- **阶段**: 计划已创建，待执行
- **位置**: `plan/active/manual-acceptance-v010/`

## 上下文

v0.1.0 已完成：
- Tauri 2 桌面壳层 + .NET 8 Worker 后端
- 65 个后端测试全部通过
- Phase 10 自动化 E2E 7 组 flow 跑通（浏览器模式）
- ZIP 便携版已打包（`JvedioNext_0.1.0_x64-portable.zip`）

**缺口**：尚未在正式发布包环境下做过完整的人工端到端验证。

## 执行指南

### 准备工作

1. 确认便携版 ZIP 存在：`build/release/JvedioNext_0.1.0_x64-portable.zip`
2. 解压到任意目录
3. 准备 4+ 个真实影片文件（含可被 MetaTube 搜刮到的和搜刮不到的）
4. 确认 MetaTube 实例可用（在设置 → MetaTube 中配置地址）

### 执行流程

按 `plan.md` 中 Phase 1–10 顺序执行，每完成一个 Phase：
1. 在 `plan.md` 中标记状态（⬜ → ✅ 或 ❌）
2. 发现问题记录到"发现问题记录"表格
3. P0/P1 问题优先修复后再继续下一个 Phase

### 问题修复流程

1. 记录问题到 `plan.md` 的发现问题表格
2. 修复代码 → 跑受影响测试
3. 重新打包（如果修复了代码）：`cd tauri && npm run build:release`（产出 ZIP 便携版）
4. 在 `plan.md` 中标记问题状态为"已修复"并复验

## 完成标准

- `plan.md` 中所有 Phase 的验收项都有明确的 ✅ 或 ❌ 标记
- 所有发现的问题都已记录和分级
- P0/P1 问题已修复并复验
- 验收结论已写入

## 下一步

验收完成后：
1. 归档本 plan 到 `plan/archive/manual-acceptance-v010/`
2. 根据验收结果决定是否需要发布补丁版本
3. 启动 v0.2.0 功能规划
