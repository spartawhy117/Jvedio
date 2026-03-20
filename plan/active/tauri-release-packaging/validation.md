# Tauri Release Packaging — Validation Matrix

## Phase 0 — 去掉 WPF 启动层 + 单实例控制

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 0.1 | `tauri.conf.json` productName 已改 | `productName` 为 `"JvedioNext"` | ⬜ |
| 0.2 | `package.json` name 已改 | `name` 为 `"jvedio-next"` | ⬜ |
| 0.3 | `Cargo.toml` 包含 single-instance | `tauri-plugin-single-instance = "2"` 存在 | ⬜ |
| 0.4 | `lib.rs` 注册 single-instance 插件 | `.plugin(tauri_plugin_single_instance::init(...))` 存在 | ⬜ |
| 0.5 | `TauriShellLauncher` 已删除 | `App.xaml.cs` 中无 `TauriShellLauncher` 类 | ⬜ |
| 0.6 | `PrepareTauriShellArtifacts` 已删除 | `Jvedio.csproj` 中无此 Target | ⬜ |
| 0.7 | WPF Debug 编译仍通过 | `MSBuild Jvedio.sln -p:Configuration=Debug` 成功 | ⬜ |
| 0.8 | WPF Release 编译仍通过 | `MSBuild Jvedio.sln -p:Configuration=Release` 成功（不再触发 Tauri 打包） | ⬜ |
| 0.9 | `AGENTS.md` 已更新 | 构建命令、输出路径、启动链路反映新架构 | ⬜ |
| 0.10 | `doc/developer.md` 已更新 | 阅读顺序不再以 WPF 入口开始 | ⬜ |
| 0.11 | `doc/modules/13-tauri-shell-worker.md` 已更新 | 架构图反映 2 层链路 | ⬜ |
| 0.12 | `doc/data-directory-convention.md` 已更新 | 目录树中无 `Jvedio.exe ← WPF 主程序` | ⬜ |
| 0.13 | `doc/logging-convention.md` 已更新 | WPF 日志段落标记 Legacy 或移除 | ⬜ |

---

## Phase 1 — Worker 编译验证

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 1.1 | `prepare-worker.ps1` 执行成功 | 退出码 0，无错误输出 | ⬜ |
| 1.2 | `worker-dist/Jvedio.Worker.exe` 存在 | 文件存在且大小 > 0 | ⬜ |
| 1.3 | Worker 依赖完整 | `worker-dist/` 文件数与 `bin/Release/net8.0/` 一致（不含 log） | ⬜ |

---

## Phase 2 — 前端编译验证

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 2.1 | `npm run build` 执行成功 | 退出码 0，TS 无编译错误 | ⬜ |
| 2.2 | `dist/index.html` 存在 | 文件存在 | ⬜ |
| 2.3 | JS/CSS bundle 存在 | `dist/assets/` 下有 `.js` 和 `.css` 文件 | ⬜ |

---

## Phase 3 — Rust 壳层编译

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 3.1 | `cargo build --release` 成功 | 退出码 0，无编译错误 | ⬜ |
| 3.2 | 可执行文件生成 | `target/release/` 下有 exe 文件 | ⬜ |
| 3.3 | 编译耗时可接受 | 首次全量 < 30 分钟，增量 < 5 分钟 | ⬜ |
| 3.4 | single-instance 插件编译通过 | 无 unresolved import 或 link error | ⬜ |

---

## Phase 4 — Tauri 完整打包

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 4.1 | `npm run build:release` 成功 | 退出码 0 | ⬜ |
| 4.2 | MSI 安装包生成 | `bundle/msi/*.msi` 存在，文件名含 `JvedioNext` | ⬜ |
| 4.3 | NSIS 安装包生成 | `bundle/nsis/*-setup.exe` 存在，文件名含 `JvedioNext` | ⬜ |
| 4.4 | 安装包大小合理 | 50–150 MB 范围 | ⬜ |
| 4.5 | 打包日志已保存 | `log/dev/tauri-build-release.log` 存在 | ⬜ |

---

## Phase 5 — 安装包功能验证

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 5.1 | 安装过程无错误 | 安装向导正常完成 | ⬜ |
| 5.2 | 安装目录结构正确 | 包含 `JvedioNext.exe` + `worker/Jvedio.Worker.exe` | ⬜ |
| 5.3 | Shell 窗口正常显示 | 窗口标题 `Jvedio Next`，大小 1280×800 | ⬜ |
| 5.4 | Worker 子进程启动 | 前端页面正常加载（非连接失败状态） | ⬜ |
| 5.5 | 业务页面可访问 | Library / Actors / Settings 至少一个页面数据正常 | ⬜ |
| 5.6 | 单实例控制生效 | 第二次双击聚焦已有窗口，不开新窗口 | ⬜ |
| 5.7 | 关闭后无残留进程 | 任务管理器中无 `Jvedio.Worker.exe` 残留 | ⬜ |

---

## Phase 6 — 收口与文档

| # | 验证项 | 通过标准 | 状态 |
|---|--------|---------|------|
| 6.1 | CHANGELOG 已更新 | `doc/CHANGELOG.md` 记录首次打包 + WPF 层移除 | ⬜ |
| 6.2 | AGENTS.md 已更新 | 构建命令、启动链路反映新架构 | ⬜ |
| 6.3 | .gitignore 完整 | `worker-dist/`、`dist/`、`target/` 被忽略 | ⬜ |
| 6.4 | 打包日志已保存 | `log/dev/` 下有完整构建日志 | ⬜ |
| 6.5 | Phase 0 文档清单全部完成 | 所有 D-1 ~ D-6 文档已更新 | ⬜ |

---

## 总计

| Phase | 验证项数 | 通过 | 状态 |
|-------|---------|------|------|
| Phase 0 | 13 | 0 | ⬜ |
| Phase 1 | 3 | 0 | ⬜ |
| Phase 2 | 3 | 0 | ⬜ |
| Phase 3 | 4 | 0 | ⬜ |
| Phase 4 | 5 | 0 | ⬜ |
| Phase 5 | 7 | 0 | ⬜ |
| Phase 6 | 5 | 0 | ⬜ |
| **合计** | **40** | **0** | ⬜ |
