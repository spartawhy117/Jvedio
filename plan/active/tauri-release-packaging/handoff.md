# Tauri Release Packaging Handoff

## Feature Goal

- **去掉 WPF 启动器中间层**，让 Tauri Shell 直接作为用户入口（`JvedioNext.exe`）。
- 补齐 **单实例控制**（`tauri-plugin-single-instance`）。
- 完成 Tauri 桌面应用的**首次完整 Release 打包**，产出可安装的 Windows 桌面应用。
- 验证 Shell + Worker + 前端 的完整启动链路在安装包中正常工作。

## Frozen Decisions

| # | 决策 | 说明 |
|---|------|------|
| D-1 | 去掉 WPF 启动层 | WPF `Jvedio.exe` 不再作为发布产品入口，Tauri Shell 直接面向用户 |
| D-2 | 不保留 WPF 回退 | 旧 WPF UI 不作为 Tauri 的回退路径；`JVEDIO_FORCE_LEGACY_WPF` 移除 |
| D-3 | exe 名称 `JvedioNext` | `tauri.conf.json` 的 `productName` 改为 `"JvedioNext"`，产出 `JvedioNext.exe` |
| D-4 | 需要单实例控制 | Tauri 端加 `tauri-plugin-single-instance`，重复启动聚焦已有窗口 |
| D-5 | 打包目标 Windows x64 | MSI + NSIS 双格式 |
| D-6 | Worker 打包方式 | `prepare-worker.ps1` → `worker-dist/` → `bundle.resources` 捆绑到 `worker/` |
| D-7 | 不做代码签名 | 个人使用，后续可选 |
| D-8 | 版本 5.0.0 | 首次打包保持 5.0.0，无自动更新 |

## 环境确认

| 工具 | 版本 | 状态 |
|------|------|------|
| Rust | 1.94.0 stable-x86_64-pc-windows-msvc | ✅ 已安装 |
| .NET SDK | 9.0.312 | ✅ 已安装 |
| Node.js | v24.14.0 | ✅ 已安装 |
| Tauri CLI | 2.10.1 | ✅ 已安装 |
| VS 2022 Build Tools | Community 版 | ✅ 已安装（MSBuild 可用） |

## 当前真实状态

### 已完成

- `desktop-ui-shell-refactor` 已归档，10 个 Phase 全部完成。
- 所有工具链已安装就绪，无缺失。
- `tauri/src-tauri/target/` 有之前的编译缓存（4914 个文件），增量编译可利用。
- `prepare-worker.ps1` 脚本已存在，逻辑完整。
- 架构决策已确认：去掉 WPF 启动层、exe 名 `JvedioNext`、需要单实例控制。

### 未完成

- Phase 0 代码改动尚未执行（删除 `TauriShellLauncher`、添加 single-instance 等）。
- 从未执行过 `npm run build:release`，不确定是否一次成功。
- 从未产出过 MSI / NSIS 安装包。
- 安装后的启动链路从未在安装包环境下验证。

## Start Here Now

当前默认先读：

1. `plan/active/tauri-release-packaging/plan.md`（看完整改动清单）
2. `plan/active/tauri-release-packaging/validation.md`

然后从 **Phase 0（去掉 WPF 启动层 + 单实例控制）** 开始执行。

## 预期完成范围

完成后应有：

1. WPF 启动层已移除（代码 + 构建配置）
2. Tauri Shell 单实例控制已补齐
3. 一个可运行的 `JvedioNext_5.0.0_x64-setup.exe` 或 `JvedioNext_5.0.0_x64_en-US.msi`
4. 安装后启动链路验证通过（含单实例测试）
5. 打包流程和已知问题已文档化
6. `doc/CHANGELOG.md` + `AGENTS.md` + 相关文档已更新

## 代码改动全清单速查

### 核心改动（Phase 0）

| 文件 | 动作 |
|------|------|
| `tauri/src-tauri/tauri.conf.json` | `productName` → `"JvedioNext"` |
| `tauri/package.json` | `name` → `"jvedio-next"` |
| `tauri/src-tauri/Cargo.toml` | + `tauri-plugin-single-instance = "2"` |
| `tauri/src-tauri/src/lib.rs` | 注册 single-instance 插件 |
| `dotnet/Jvedio/App.xaml.cs` | 删除 `TauriShellLauncher` 类 + 调用 |
| `dotnet/Jvedio/Jvedio.csproj` | 删除 `PrepareTauriShellArtifacts` Target |

### 文档更新（Phase 0 + Phase 6）

| 文件 | 动作 |
|------|------|
| `AGENTS.md` | 更新构建命令、输出路径、启动链路 |
| `doc/developer.md` | 更新阅读顺序 |
| `doc/modules/13-tauri-shell-worker.md` | 更新架构图和运行模式 |
| `doc/data-directory-convention.md` | 更新目录树 |
| `doc/logging-convention.md` | 更新 WPF 日志段落 |
| `doc/CHANGELOG.md` | 追加变更记录 |
