# Release 发布格式改造：NSIS → ZIP 便携版

## 目标

移除 NSIS 安装包发布模式，改为**仅发布 ZIP 便携版**（解压即用），降低构建复杂度，同时给用户提供更灵活的升级和迁移体验。

## 背景

| 项目 | 说明 |
|------|------|
| 当前发布格式 | NSIS 安装包（`JvedioNext_*-setup.exe`） |
| 问题 | 个人工具型应用不需要注册表/服务/开机启动；安装包不方便迁移、多版本共存 |
| 目标格式 | ZIP 便携版（`JvedioNext_<version>_x64-portable.zip`），解压即用 |

### 应用特点适合便携版

- 个人工具，不需要注册表或系统服务
- 数据目录（`data/`）使用相对路径，随程序目录走
- Worker 是 .NET 8 框架依赖部署，不需要安装 runtime（用户机器需有 .NET 8 Runtime）
- 用户偏技术型，习惯自行管理软件
- 升级 = 解压新版本覆盖；迁移 = 整个文件夹复制

## 改造范围

### Phase 1–4：已完成 ✅

配置改造（`tauri.conf.json` targets=[]）、打包脚本改造（删 `copy-release.ps1`，新增 `package-portable.ps1`）、npm 脚本更新、文档更新（AGENTS.md + 验收计划）。提交 `ef47856`。

**发现**：`bundle.targets=[]` 时 Tauri 只编译 Cargo binary（`jvedio-shell.exe`），不会重命名为 productName。打包脚本已处理：自动查找并重命名为 `JvedioNext.exe`。

## 验证结果

1. ✅ `npm run build:release` 完整跑通（Worker publish → Tauri build → ZIP 打包）
2. ✅ `build/release/JvedioNext_0.1.0_x64-portable.zip`（5.95 MB）
3. ⬜ 解压 ZIP 后双击 `JvedioNext.exe` 能正常启动（待人工验收）
4. ✅ Worker 被正确包含在 ZIP 内（29 个文件）
5. ✅ 不再产出 NSIS 安装包

ZIP 包含：`JvedioNext.exe` + `jvedio_shell_lib.dll` + `resources/icon.ico` + `worker/`（29 文件）

## 关联文档

- 构建总览：`AGENTS.md` → 构建命令
- 验收计划：`plan/active/manual-acceptance-v010/plan.md`
- Worker 发布脚本：`tauri/scripts/prepare-worker.ps1`
