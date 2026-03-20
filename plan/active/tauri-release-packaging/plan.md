## 文档定位

本文件是 `tauri-release-packaging` 的**完整打包与发布方案（存活文档）**。

目标：去掉 WPF 启动器中间层，让 Tauri Shell 直接作为用户入口（重命名为 `JvedioNext.exe`），补齐单实例控制，然后完成首次完整 Release 打包，产出可分发的 Windows 安装包。

---

## 结论先行

| 维度 | 当前状态 |
|------|---------|
| Rust toolchain | `rustc 1.94.0` / `cargo 1.94.0` / `stable-x86_64-pc-windows-msvc` ✅ |
| .NET SDK | `9.0.312`（Worker 目标框架 `net8.0` 兼容） ✅ |
| Node.js | `v24.14.0` / `npm 11.9.0` ✅ |
| Tauri CLI | `tauri-cli 2.10.1` ✅ |
| 前端编译 | `tsc && vite build` → `tauri/dist/` ✅ |
| Worker 编译 | `dotnet build -c Release` → `dotnet/Jvedio.Worker/bin/Release/net8.0/` ✅ |
| Rust 壳层编译 | 有 `target/` 缓存但从未完成 Release 打包 ⚠️ |
| 完整打包 | `npm run build:release` **从未成功执行** ❌ |
| 安装包产出 | 无 ❌ |
| WPF 启动层 | **计划移除**，改为 Tauri Shell 直接入口 🔄 |
| 单实例控制 | WPF 端有 `EventWaitHandle`；Tauri 端**缺失** ❌ |

---

## 架构决策

### D-1：去掉 WPF 启动层

**旧架构（3 层）**：
```
Jvedio.exe (WPF .NET FW 4.7.2)
  → TauriShellLauncher.TryLaunch()  // 启动后 WPF 自杀
    → jvedio-shell.exe (Tauri 2 / Rust)
      → spawn_worker()
        → Jvedio.Worker.exe (.NET 8)
```

**新架构（2 层）**：
```
JvedioNext.exe (Tauri 2 / Rust)         ← 用户直接双击入口
  → spawn_worker()
    → Jvedio.Worker.exe (.NET 8)
```

**理由**：WPF 层在 Release 正常路径中唯一作用是找到 `jvedio-shell.exe` → 启动 → 自杀。初始化的 `ScreenShotManager` / `ScanManager` / `DownloadManager` 全部白费。移除后减少一层进程、一个 .NET FW 4.7.2 依赖、一套打包配置。

### D-2：不保留 WPF 回退路径

旧 WPF UI 不再作为 Tauri Shell 的回退路径。`JVEDIO_FORCE_LEGACY_WPF` 环境变量失去意义。WPF 项目代码保留在仓库中（Debug 调试和历史参考），但不再是发布产品的一部分。

### D-3：exe 名称 `JvedioNext`

`tauri.conf.json` 的 `productName` 改为 `"JvedioNext"`，打包产物为 `JvedioNext.exe`。窗口标题保持 `Jvedio Next`。

### D-4：需要单实例控制

必须在 Tauri 端补齐 `tauri-plugin-single-instance`，替代 WPF 端的 `EventWaitHandle("Jvedio")` 互斥锁。

---

## 环境基线

### 工具链

| 工具 | 版本 | 安装路径 |
|------|------|---------|
| rustc | 1.94.0 (2026-03-02) | `C:\Users\Admin\.cargo\bin\rustc.exe` |
| cargo | 1.94.0 (2026-01-15) | `C:\Users\Admin\.cargo\bin\cargo.exe` |
| rustup | stable-x86_64-pc-windows-msvc | `C:\Users\Admin\.rustup` |
| dotnet | 9.0.312 | 系统 PATH |
| node | v24.14.0 | 系统 PATH |
| npm | 11.9.0 | 系统 PATH |
| tauri-cli | 2.10.1 | `tauri/node_modules/.bin/tauri` |

### 打包流程（`npm run build:release`）

```
npm run prepare-worker          # Step 1: 编译 .NET Worker
  └─ dotnet build -c Release
  └─ 产物暂存到 tauri/worker-dist/

npm run tauri build              # Step 2: Tauri 完整打包
  └─ npm run build              # 2a: tsc + vite build → tauri/dist/
  └─ cargo build --release      # 2b: Rust 壳层编译 → src-tauri/target/release/
  └─ 打包安装程序               # 2c: MSI + NSIS installer
      └─ worker-dist/**/* → 安装包内 worker/ 子目录
      └─ dist/ → WebView 资源
```

### 预期产物（Phase 0 后更新）

| 产物 | 路径 |
|------|------|
| Tauri 可执行文件 | `tauri/src-tauri/target/release/JvedioNext.exe` |
| Worker 暂存 | `tauri/worker-dist/Jvedio.Worker.exe` + 依赖 |
| MSI 安装包 | `tauri/src-tauri/target/release/bundle/msi/JvedioNext_5.0.0_x64_en-US.msi` |
| NSIS 安装包 | `tauri/src-tauri/target/release/bundle/nsis/JvedioNext_5.0.0_x64-setup.exe` |

### 安装后目录结构（Phase 0 后更新）

```
{安装目录}/
├── JvedioNext.exe          ← 用户入口（Tauri Shell）
├── WebView2Loader.dll
└── worker/
    ├── Jvedio.Worker.exe   ← 后端服务
    └── ...（依赖 DLL）
```

---

## Phase 路线

### Phase 0 — 去掉 WPF 启动层 + 单实例控制

**目标**：移除 WPF 中间启动层，让 Tauri Shell 直接作为用户入口，补齐单实例控制。

**代码改动清单**：

| # | 文件 | 动作 | 说明 |
|---|------|------|------|
| 0.1 | `tauri/src-tauri/tauri.conf.json` | 修改 | `productName` → `"JvedioNext"` |
| 0.2 | `tauri/package.json` | 修改 | `name` → `"jvedio-next"` |
| 0.3 | `tauri/src-tauri/Cargo.toml` | 修改 | 添加 `tauri-plugin-single-instance = "2"` 依赖 |
| 0.4 | `tauri/src-tauri/src/lib.rs` | 修改 | 注册 `tauri_plugin_single_instance::init()` 插件，重复启动时聚焦已有窗口 |
| 0.5 | `dotnet/Jvedio/App.xaml.cs` | 修改 | 删除 `TauriShellLauncher` 类（`#if !DEBUG` 块），删除 `OnStartup` 中的调用 |
| 0.6 | `dotnet/Jvedio/Jvedio.csproj` | 修改 | 删除 `PrepareTauriShellArtifacts` MSBuild Target（第 914-943 行） |
| 0.7 | `tauri/src-tauri/src/worker.rs` | 检查 | 确认 Release 模式路径 `{exe_dir}/worker/Jvedio.Worker.exe` 不受影响 |

**文档更新清单**：

| # | 文件 | 动作 | 说明 |
|---|------|------|------|
| 0.8 | `AGENTS.md` | 修改 | 更新构建命令段（Release 入口改为 `npm run build:release`）；更新输出路径（`JvedioNext.exe`）；更新启动链路说明 |
| 0.9 | `doc/developer.md` | 修改 | 更新阅读顺序和启动链路说明 |
| 0.10 | `doc/modules/13-tauri-shell-worker.md` | 修改 | 更新架构图和运行模式说明，去掉 WPF 启动器描述 |
| 0.11 | `doc/data-directory-convention.md` | 修改 | 更新目录树，去掉 `Jvedio.exe ← WPF 主程序` |
| 0.12 | `doc/logging-convention.md` | 修改 | 更新 WPF 主程序日志相关段落，标记为 Legacy 或移除 |
| 0.13 | `doc/CHANGELOG.md` | 追加 | 记录去掉 WPF 启动层的变更 |

**通过标准**：
- [x] `TauriShellLauncher` 类已删除，WPF 项目 Debug + Release 均可编译
- [x] `PrepareTauriShellArtifacts` Target 已删除，WPF Release 编译不再触发 Tauri 打包
- [x] `tauri.conf.json` 的 `productName` 为 `"JvedioNext"`
- [x] `Cargo.toml` 包含 `tauri-plugin-single-instance` 依赖
- [x] `lib.rs` 注册了 single-instance 插件
- [ ] `cargo build --release` 产出 `JvedioNext.exe`（Tauri bundler 模式）（Phase 3 验证）
- [x] 所有文档已同步更新
- [x] `WorkerPathResolver` 已增加安装包 fallback（C-10）

---

### Phase 1 — Worker 编译验证

**目标**：确认 `prepare-worker.ps1` 可成功执行，`worker-dist/` 产物完整。

**步骤**：

1. 在 `tauri/` 目录下执行 `npm run prepare-worker`
2. 检查 `tauri/worker-dist/` 是否包含 `Jvedio.Worker.exe` 及所有依赖 DLL
3. 记录产物文件数量和总大小

**通过标准**：
- [x] `prepare-worker.ps1` 退出码 0
- [x] `worker-dist/Jvedio.Worker.exe` 存在
- [x] `worker-dist/` 中依赖 DLL 完整（与 `dotnet/Jvedio.Worker/bin/Release/net8.0/` 一致）

---

### Phase 2 — 前端编译验证

**目标**：确认 `tsc && vite build` 可成功产出 `tauri/dist/`。

**步骤**：

1. 在 `tauri/` 目录下执行 `npm run build`
2. 检查 `tauri/dist/` 产物结构
3. 确认 `index.html` + JS/CSS bundle 齐全

**通过标准**：
- [x] `npm run build` 退出码 0，无 TS 编译错误
- [x] `dist/index.html` 存在
- [x] `dist/assets/` 下有 `.js` 和 `.css` 文件

---

### Phase 3 — Rust 壳层编译

**目标**：确认 Rust 壳层可独立编译通过（含新增的 single-instance 插件）。

**步骤**：

1. 在 `tauri/src-tauri/` 下执行 `cargo build --release`
2. 观察编译输出，记录警告和耗时
3. 确认产出的可执行文件名（Tauri bundler 使用 `productName`，cargo 使用 crate name）

**通过标准**：
- [x] `cargo build --release` 成功（退出码 0）
- [x] 可执行文件存在（`target/release/jvedio-shell.exe`，8.5 MB）
- [x] 无编译错误（warnings 可接受）
- [x] single-instance 插件编译通过（`tauri-plugin-single-instance v2.4.0`）

---

### Phase 4 — Tauri 完整打包

**目标**：执行 `npm run build:release`，产出 MSI / NSIS 安装包。

**步骤**：

1. 确保 Phase 0-3 全部通过
2. 清理 `worker-dist/` 和 `dist/`（确保干净构建）
3. 执行 `npm run build:release`
4. 记录完整输出日志到 `log/dev/tauri-build-release.log`
5. 检查 `src-tauri/target/release/bundle/` 下的安装包

**通过标准**：
- [x] `npm run build:release` 退出码 0（需先单独 `npm run prepare-worker`）
- [ ] `bundle/msi/` 下有 `.msi` 文件（WiX `light.exe` 失败，暂跳过 MSI 格式）
- [x] `bundle/nsis/` 下有 `JvedioNext_5.0.0_x64-setup.exe`（9.8 MB）
- [x] 安装包大小合理（9.8 MB）

**实际执行说明**：
- MSI 格式因 `light.exe` 运行失败（WiX Tools 314 版本问题）暂跳过，`bundle.targets` 改为 `["nsis"]`
- NSIS 格式成功产出 `JvedioNext_5.0.0_x64-setup.exe`

---

### Phase 5 — 安装包功能验证

**目标**：安装后验证完整启动链路。

**步骤**：

1. 在测试目录安装 MSI 或 NSIS 安装包
2. 验证安装目录结构：
   - `JvedioNext.exe`（用户入口）
   - `worker/Jvedio.Worker.exe`
   - WebView 资源
3. 启动应用，验证：
   - Shell 窗口正常出现
   - Worker 子进程成功启动
   - 前端页面加载正常
   - SSE 连接建立
   - Library / Actors / Settings 基础页面可访问
4. 测试单实例控制：再次双击 `JvedioNext.exe`，应聚焦已有窗口而非打开第二个
5. 关闭应用，确认 Worker 进程正常退出

**通过标准**：
- [ ] 安装过程无错误
- [ ] 启动后窗口显示 `Jvedio Next` 标题
- [ ] Worker 启动成功（前端显示正常而非 Worker 连接失败）
- [ ] 至少一个业务页面数据正常加载
- [ ] 单实例控制生效（第二次启动聚焦已有窗口）
- [ ] 关闭后无残留进程

---

### Phase 6 — 收口与文档

**目标**：更新文档，记录打包流程和已知问题。

**步骤**：

1. 更新 `doc/CHANGELOG.md`，记录首次 Tauri Release 打包里程碑 + WPF 启动层移除
2. 更新 `AGENTS.md` 打包命令段落
3. 将打包日志存入 `log/dev/`
4. 确认 `.gitignore` 覆盖了 `worker-dist/`、`dist/`、`target/` 等打包产物
5. 确认 Phase 0 文档更新清单已全部完成

**通过标准**：
- [ ] `doc/CHANGELOG.md` 已更新
- [ ] `AGENTS.md` 已更新
- [ ] 打包日志已保存
- [ ] `.gitignore` 无遗漏
- [ ] Phase 0 文档更新清单全部完成

---

## 风险项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Rust 编译首次下载大量 crates | 耗时长（10-30 分钟） | 已有 `target/` 缓存，增量编译 |
| Tauri 2 + MSVC linker 配置问题 | 编译失败 | 确认 VS 2022 Build Tools 已安装 |
| `tauri.conf.json` 的 `bundle.resources` 路径问题 | 安装包缺少 Worker | 验证 `worker-dist/` 产物完整性 |
| Worker `.NET 8` 与 `dotnet 9 SDK` 兼容性 | 编译 targeting 错误 | 已在测试中验证 `dotnet build` 正常 |
| NSIS/WiX 工具未安装 | MSI/NSIS 打包失败 | Tauri CLI 通常自带或按需下载 |
| 安装后 Worker 端口被占用或防火墙拦截 | 启动链路中断 | Worker 使用动态端口，碰撞概率低 |
| `tauri-plugin-single-instance` 与 Tauri 2 版本兼容 | 编译失败 | 确认版本匹配后再添加 |
| Worker 的 `SharedAppBaseDirectory` 在安装包目录下推断失败 | 数据目录定位错误 | 安装包场景下由 Shell 注入 `JVEDIO_APP_BASE_DIR` 环境变量，或调整 `WorkerPathResolver` fallback |
| `productName` 改名导致旧安装残留 | 用户困惑 | 首次打包，无旧安装残留问题 |

---

## 代码与文档改动全清单（三轮迭代结果）

### 第一轮：核心代码改动

| # | 文件 | 类型 | 动作 |
|---|------|------|------|
| C-1 | `tauri/src-tauri/tauri.conf.json` | 配置 | `productName` → `"JvedioNext"` |
| C-2 | `tauri/package.json` | 配置 | `name` → `"jvedio-next"` |
| C-3 | `tauri/src-tauri/Cargo.toml` | 配置 | 添加 `tauri-plugin-single-instance = "2"` |
| C-4 | `tauri/src-tauri/src/lib.rs` | Rust | 注册 single-instance 插件 |
| C-5 | `dotnet/Jvedio/App.xaml.cs` | C# | 删除 `TauriShellLauncher` 类 + `OnStartup` 中的调用 |
| C-6 | `dotnet/Jvedio/Jvedio.csproj` | MSBuild | 删除 `PrepareTauriShellArtifacts` Target |

### 第二轮：关联代码检查

| # | 文件 | 类型 | 动作 |
|---|------|------|------|
| C-7 | `tauri/src-tauri/src/worker.rs` | Rust | **检查** Release 路径 `{exe_dir}/worker/` 是否仍正确（预期无需改动） |
| C-8 | `tauri/src-tauri/src/shell_log.rs` | Rust | **检查** 日志目录推断在新 exe 名下是否正确（预期无需改动） |
| C-9 | `tauri/src-tauri/src/main.rs` | Rust | **检查** `windows_subsystem = "windows"` 保留（预期无需改动） |
| C-10 | Worker `WorkerPathResolver` | C# | **检查** `SharedAppBaseDirectory` 在安装包场景的 fallback，可能需要 Shell 注入 `JVEDIO_APP_BASE_DIR` 环境变量 |

### 第三轮：文档同步

| # | 文件 | 类型 | 动作 |
|---|------|------|------|
| D-1 | `AGENTS.md` | 文档 | 更新构建命令、输出路径、启动链路说明 |
| D-2 | `doc/developer.md` | 文档 | 更新阅读顺序（去掉 WPF 入口描述） |
| D-3 | `doc/modules/13-tauri-shell-worker.md` | 文档 | 更新架构图、运行模式、去掉 WPF 启动器描述 |
| D-4 | `doc/data-directory-convention.md` | 文档 | 更新目录树结构 |
| D-5 | `doc/logging-convention.md` | 文档 | 更新 WPF 日志段落 |
| D-6 | `doc/CHANGELOG.md` | 文档 | 追加 WPF 启动层移除 + 单实例控制变更记录 |
| D-7 | `plan/active/.../handoff.md` | 文档 | 更新冻结决策和改动清单 |
| D-8 | `plan/active/.../open-questions.md` | 文档 | 关闭 OQ-2，新增 OQ-7 |
| D-9 | `plan/active/.../validation.md` | 文档 | 新增 Phase 0 验证项 |

---

## Feature 入口

| 维度 | 路径 |
|------|------|
| Feature 入口 | `plan/active/tauri-release-packaging/` |
| 交接文档 | `plan/active/tauri-release-packaging/handoff.md` |
| 验证矩阵 | `plan/active/tauri-release-packaging/validation.md` |
| 待决问题 | `plan/active/tauri-release-packaging/open-questions.md` |
| 构建日志 | `log/dev/tauri-build-release.log`（执行后生成） |
