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
| 前端编译 | `tsc && vite build` → `build/frontend-stage/` ✅ |
| Worker 编译 | `dotnet publish -r win-x64` → `build/worker-stage/` ✅ |
| Rust 壳层编译 | `cargo build --release` → `target/release/jvedio-shell.exe`（8.5 MB） ✅ |
| 完整打包 | `npm run build:release` → NSIS `JvedioNext_0.1.0_x64-setup.exe` ✅ |
| 安装包产出 | NSIS ✅ / MSI 暂跳过（WiX 兼容问题） |
| WPF 启动层 | **已移除**，Tauri Shell 为直接入口 ✅ |
| 单实例控制 | `tauri-plugin-single-instance` v2.4.0 ✅ |
| 构建输出目录 | **已统一到 `build/`** ✅ |
| Release Tag | **`v0.1.0`** ✅ |

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
  └─ dotnet publish -r win-x64 --self-contained false
  └─ 产物暂存到 build/worker-stage/        ← Phase 7 改（原 tauri/worker-dist/）

npm run tauri build              # Step 2: Tauri 完整打包
  └─ npm run build              # 2a: tsc + vite build → build/frontend-stage/  ← Phase 7 改（原 tauri/dist/）
  └─ cargo build --release      # 2b: Rust 壳层编译 → src-tauri/target/release/
  └─ 打包安装程序               # 2c: NSIS installer
      └─ build/worker-stage/**/* → 安装包内 worker/ 子目录
      └─ build/frontend-stage/ → WebView 资源

npm run copy-release            # Step 3: copy 安装包到 build/release/  ← Phase 7 新增
```

### 预期产物（Phase 7 后更新）

| 产物 | 当前路径 | Phase 7 后路径 |
|------|---------|---------------|
| Tauri 可执行文件 | `tauri/src-tauri/target/release/jvedio-shell.exe` | 不变（Cargo 产物） |
| Worker 暂存 | ~~`tauri/worker-dist/`~~ | `build/worker-stage/` |
| 前端暂存 | ~~`tauri/dist/`~~ | `build/frontend-stage/` |
| NSIS 安装包 | `tauri/.../bundle/nsis/` (深层) | **`build/release/`**（copy 过来） |
| MSI 安装包 | 暂跳过（WiX 兼容问题） | — |

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

### Phase 0 — 去掉 WPF 启动层 + 单实例控制 ✅

删除 `TauriShellLauncher` 类和 `PrepareTauriShellArtifacts` MSBuild Target（C-1~C-6）；Tauri Shell 重命名为 `JvedioNext`（`tauri.conf.json` productName）；添加 `tauri-plugin-single-instance` v2.4.0（C-3/C-4）；`WorkerPathResolver` 增加 `worker/` 安装包 fallback（C-10）；关联代码检查（C-7~C-9）无需改动；6 份文档同步更新（D-1~D-6）。提交 `802647a`。

---

### Phase 1 — Worker 编译验证 ✅

`npm run prepare-worker` 退出码 0；`worker-dist/` 产物完整（含 `Jvedio.Worker.exe` + 全部依赖 DLL）。提交 `fa1705e`。

---

### Phase 2 — 前端编译验证 ✅

`npm run build` 退出码 0，`tsc && vite build` 产出 127 个模块（612ms）；`dist/index.html` + `dist/assets/` 齐全。提交 `fa1705e`。

---

### Phase 3 — Rust 壳层编译 ✅

`cargo build --release` 成功（57s）；产出 `target/release/jvedio-shell.exe`（8.5 MB）；`tauri-plugin-single-instance v2.4.0` 编译通过。提交 `fa1705e`。

---

### Phase 4 — Tauri 完整打包 ✅

NSIS 安装包 `JvedioNext_5.0.0_x64-setup.exe`（9.8 MB）成功产出。MSI 因 WiX `light.exe` 失败暂跳过，`bundle.targets` 改为 `["nsis"]`。构建日志存于 `log/dev/`。提交 `fa1705e`。

---

### Phase 5 — 安装包功能验证 ✅

静默安装成功；启动后 `jvedio-shell.exe`（24 MB）+ `Jvedio.Worker.exe`（63 MB）双进程运行；单实例控制生效（第二次启动聚焦已有窗口）。首次安装因 SQLite native DLL 丢失导致 Worker 崩溃 → 修复 `prepare-worker.ps1` 改用 `dotnet publish -r win-x64 --self-contained false` → 重新打包后验证通过。安装后 exe 名为 `jvedio-shell.exe`（由 `Cargo.toml` crate name 决定），安装包名为 `JvedioNext_5.0.0_x64-setup.exe`。提交 `1b3022c`。

---

### Phase 6 — 收口与文档 ✅

**目标**：更新文档，记录打包流程和已知问题。

**步骤**：

1. 更新 `doc/CHANGELOG.md`，记录首次 Tauri Release 打包里程碑 + WPF 启动层移除
2. 更新 `AGENTS.md` 打包命令段落
3. 将打包日志存入 `log/dev/`
4. 确认 `.gitignore` 覆盖了 `worker-dist/`、`dist/`、`target/` 等打包产物
5. 确认 Phase 0 文档更新清单已全部完成

**通过标准**：
- [x] `doc/CHANGELOG.md` 已更新
- [x] `AGENTS.md` 已更新
- [x] 打包日志已保存（构建日志通过 `*.log` 规则被 gitignore，不入库）
- [x] `.gitignore` 无遗漏（`worker-dist/`、`worker-publish/`、`dist/`、`target/` 均覆盖）
- [x] Phase 0 文档更新清单全部完成

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

### Phase 7 — 统一构建输出目录 ✅

构建产物从散落的 `tauri/worker-dist/`、`tauri/dist/`、`bundle/nsis/` 统一收归到仓库根 `build/` 目录。Step 0 清理旧散落产物（worker-dist 26 files 2.83 MB + dist 4 files + 旧名 NSIS + MSI 残留）；7.1~7.2 更新 `.gitignore`（根添加 `/build/`，tauri 移除旧规则）；7.3 重写 `prepare-worker.ps1` 直接 publish 到 `build/worker-stage/`；7.4~7.6 修改 `tauri.conf.json`（bundle.resources + frontendDist）和 `vite.config.ts`（outDir）；7.7~7.8 新建 `copy-release.ps1` + 更新 `build:release` 脚本；7.14~7.21 同步更新 AGENTS.md、data-directory-convention.md、13-tauri-shell-worker.md、CHANGELOG、handoff.md、open-questions.md、validation.md。`npm run build:release` 验证通过，安装包产出 `build/release/JvedioNext_*_x64-setup.exe`。提交 `a2b39a6`~`39f69b4`。

---

### Phase 8 — Release Tag 版本管理 ✅

版本号从 `5.0.0` 统一重设为 `0.1.0`（4 个核心文件：`package.json`、`tauri.conf.json`、`Cargo.toml`、`Jvedio.csproj`）。Tauri 架构全新重写，采用 SemVer `0.x.y` 起步。`npm install` 同步 `package-lock.json`。`npm run build:release` 验证产出 `JvedioNext_0.1.0_x64-setup.exe`（2.99 MB）。CHANGELOG 切割 `[未发布]` → `[0.1.0]` 区块。AGENTS.md 新增版本管理约定。handoff.md D-8 更新、OQ-3 关闭。Git tag `v0.1.0`。

---

## Feature 入口

| 维度 | 路径 |
|------|------|
| Feature 入口 | `plan/active/tauri-release-packaging/` |
| 交接文档 | `plan/active/tauri-release-packaging/handoff.md` |
| 验证矩阵 | `plan/active/tauri-release-packaging/validation.md` |
| 待决问题 | `plan/active/tauri-release-packaging/open-questions.md` |
| 构建日志 | `log/dev/tauri-build-release.log`（执行后生成） |
