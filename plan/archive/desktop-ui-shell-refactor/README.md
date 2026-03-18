# Desktop UI Shell Refactor — 归档

本 feature 已于 2026-03-19 全部完成并归档。

## 完成状态

| 阶段 | 状态 |
|------|------|
| Phase 0 — 方案冻结 | ✅ |
| Phase 1 — MainShell Spike | ✅ |
| Phase 2 — Renderer 基座重建 | ✅ |
| Phase 3 — 业务页按优先级迁移 | ✅ |
| Phase 4 — Release 切换 | ✅ |
| Phase 5 — 旧 Electron 清理 | ✅ |

## 最终结果

- 桌面壳：`tauri/`（Tauri 2 + React + TypeScript）
- 旧壳：`electron/` 已物理删除
- 业务底座：`Jvedio.Worker` + `Jvedio.Contracts` 继续保留
- UI 文档：`doc/UI/new/` 是唯一正式 UI 输入
- 构建链：`Jvedio.csproj` → `PrepareTauriShellArtifacts`
- 启动链：`App.xaml.cs` → `TauriShellLauncher`

## 文件说明

- `plan.md` — 完整版迁移与重构方案（实施冻结版）
- `handoff.md` — 阶段交接文档
- `validation.md` — 验证矩阵与实施记录
- `open-questions.md` — 未决项（全部已关闭）
- `plan.json` — 工具元数据
