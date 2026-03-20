# Release 发布格式改造 Handoff

## 当前状态

- **Feature**: `tauri-release-packaging`
- **阶段**: 执行中
- **位置**: `plan/active/tauri-release-packaging/`

## 上下文

将 Release 发布格式从 NSIS 安装包改为 ZIP 便携版。

变更文件清单：
1. `tauri/src-tauri/tauri.conf.json` — `bundle.targets` 改为空数组
2. `tauri/scripts/copy-release.ps1` → 删除
3. `tauri/scripts/package-portable.ps1` — 新增 ZIP 打包脚本
4. `tauri/package.json` — `build:release` 脚本更新
5. `AGENTS.md` — 构建命令和产出说明更新
6. `plan/active/manual-acceptance-v010/plan.md` — 验收环境更新
7. `plan/active/manual-acceptance-v010/handoff.md` — 对应更新

## 完成标准

- `npm run build:release` 产出 ZIP 便携版
- 不再产出 NSIS 安装包
- 所有文档已同步更新
