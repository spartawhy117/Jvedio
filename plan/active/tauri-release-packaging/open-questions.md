# Tauri Release Packaging — Open Questions

## 待决问题

### OQ-1：NSIS / WiX 工具是否需要手动安装？

**背景**：Tauri 2 打包 MSI 需要 WiX Toolset v3，NSIS 需要 NSIS 3.x。Tauri CLI 在某些环境下会自动下载，但也可能需要手动安装。

**影响**：如果缺失，Phase 4 打包会失败。

**缓解**：Phase 4 执行时优先观察报错，按需安装。

**状态**：⏳ 待 Phase 4 验证

---

### OQ-2：安装包是否需要包含 WPF 入口 `Jvedio.exe`？

**背景**：当前 `tauri.conf.json` 只打包 Tauri Shell + Worker。旧架构中 `Jvedio.exe`（WPF）是主入口，会拉起 Tauri Shell。

**决策结果**：
- 不包含 WPF 入口
- 不保留 WPF 回退路径
- Tauri Shell 直接作为用户入口，exe 名改为 `JvedioNext.exe`

**状态**：✅ 已决定 — 不包含 WPF 入口，不保留回退

---

### OQ-3：安装包版本号与自动更新

**背景**：当前 `tauri.conf.json` 版本为 `5.0.0`，`package.json` 也是 `5.0.0`。

**当前结论**：首次打包保持 `5.0.0`。自动更新不在本期范围。

**状态**：✅ 已决定 — 保持 5.0.0，不配置自动更新

---

### OQ-4：代码签名

**背景**：Windows 安装包如果未签名，安装时会弹出 SmartScreen 警告。

**当前结论**：个人使用，不做代码签名。

**状态**：✅ 已决定 — 不签名

---

### OQ-5：打包产物的 .gitignore 覆盖

**背景**：`worker-dist/`、`dist/`、`target/` 等目录不应提交到 git。Phase 7 后统一到 `build/` 目录。

**当前状态**：根 `.gitignore` 已添加 `/build/` 规则；`tauri/.gitignore` 已移除旧 `worker-dist/`、`worker-publish/`、`dist` 规则。

**状态**：✅ 已验证 — Phase 7 完成

---

### OQ-6：MSI vs NSIS 选择

**背景**：`tauri.conf.json` 配置 `targets: "all"` 会同时生成 MSI 和 NSIS 安装包。

**当前结论**：首次打包保持 `all`，两种都生成。

**状态**：✅ 已决定 — 保持 all

---

### OQ-7：Worker `SharedAppBaseDirectory` 在安装包目录下的推断

**背景**：当前 Worker 的 `WorkerPathResolver.ResolveSharedAppBaseDirectory()` 会从 exe 向上探测 `Jvedio/bin/Release` 或 `Jvedio/bin/Debug` 目录。去掉 WPF 层后，Worker 位于 Tauri 安装目录的 `worker/` 子目录下，向上探测逻辑会**失败**。

**影响**：Worker 无法正确定位数据目录（`data/<user>/`）和日志目录。

**候选方案**：
1. **Shell 注入环境变量**：Tauri Shell 在 `spawn_worker()` 时注入 `JVEDIO_APP_BASE_DIR` 指向安装根目录
2. **调整 WorkerPathResolver fallback**：安装包场景下以 `{exe_dir}/../` 作为 AppBaseDirectory
3. **两者结合**：优先读环境变量，fallback 用目录探测

**状态**：⏳ 待 Phase 0 执行时确认

---

### OQ-8：`tauri-plugin-single-instance` 与 Tauri 2 的版本兼容

**背景**：需要确认 `tauri-plugin-single-instance = "2"` 在 `tauri = "2"` 下可正常编译和运行。

**影响**：如果版本不兼容，Phase 3 Rust 编译会失败。

**缓解**：Phase 0 执行时先 `cargo check` 验证编译。

**状态**：⏳ 待 Phase 0 / Phase 3 验证
