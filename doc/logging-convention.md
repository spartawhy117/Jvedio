# 统一日志规范

## 1. 目录结构

所有运行日志统一写入项目根目录 `log/` 的分层子目录：

```
{repo-root}/log/
├── runtime/                         ← 正式运行日志
│   ├── worker-2026-03-19.log            ← Worker (.NET) — Serilog
│   └── shell-2026-03-19.log             ← Tauri Shell (Rust)
├── test/                            ← 测试日志与输出
│   ├── worker-tests/                    ← 后端测试工程运行日志
│   │   └── runtime/                     ← Worker 在测试模式下的日志
│   │       └── worker-2026-03-19.log
│   ├── e2e/                             ← Playwright 产物（Phase 10 使用）
│   │   ├── traces/
│   │   ├── screenshots/
│   │   └── reports/
│   └── test-output.txt              ← 静态测试输出参考
├── dev/                             ← 开发流程日志（可选，按需启用）
└── .gitkeep
```

> 前端 (React/TypeScript) 日志通过浏览器 `console.*` 输出，Tauri 窗口中通过 `worker-log` 事件转发到 Shell 日志。

## 2. 各组件日志配置

### 2.1 Worker (.NET 8 / ASP.NET Core)

| 项目 | 值 |
|------|---|
| 日志框架 | Serilog (`Serilog.AspNetCore` + `Serilog.Sinks.File`) |
| 文件路径 | `{repo}/log/runtime/worker-{yyyy-MM-dd}.log` |
| 输出格式 | `{Timestamp:HH:mm:ss.fff} [{Level:u3}] {Message}{NewLine}{Exception}` |
| 滚动策略 | 按天滚动 (`RollingInterval.Day`) |
| 保留天数 | 10 天 (`retainedFileCountLimit: 10`) |
| 覆盖模式 | Serilog 每日滚动文件天然按天新建；无需手动覆盖 |
| Console 输出 | 保留（Tauri Shell 通过 stdout 捕获 Worker 日志） |
| 路径解析 | `ResolveLogDirectory()` — 优先读 `JVEDIO_LOG_DIR` 环境变量（自动追加 `runtime/`），再尝试从 exe 路径向上查找 repo 根目录 → `log/runtime/` |

### 2.2 Tauri Shell (Rust)

| 项目 | 值 |
|------|---|
| 日志模块 | `src-tauri/src/shell_log.rs` — 自建轻量文件日志 |
| 文件路径 | `{repo}/log/runtime/shell-{yyyy-MM-dd}.log` |
| 输出格式 | `{HH:mm:ss.fff} {message}` |
| 覆盖模式 | 每次启动调用 `reset_shell_log()` 截断当日文件 |
| 保留天数 | 10 天（启动时自动清理过期文件） |
| Console 输出 | 保留 `println!`/`eprintln!`（Debug 模式可见，Release 下因 `windows_subsystem = "windows"` 不可见） |
| 路径解析 | 编译时 `CARGO_MANIFEST_DIR` → 向上 2 级到 repo 根目录 → `log/runtime/`；`JVEDIO_LOG_DIR` 环境变量覆盖（自动追加 `runtime/`） |

### 2.3 前端 (React/TypeScript)

| 项目 | 值 |
|------|---|
| 日志方式 | `console.log` / `console.error` / `console.warn` |
| 标签约定 | 所有调用使用 `[模块名]` 前缀，如 `[WorkerProvider]`、`[event-stream]`、`[api-client]` |
| 文件持久化 | 无（浏览器端不直接写文件） |
| 转发机制 | Tauri Shell 通过 `worker-log` 事件将 Worker stdout/stderr 转发给前端；前端 DevTools 可查看 |

### 2.4 WPF 主程序 (Legacy)

| 项目 | 值 |
|------|---|
| 日志框架 | 自建 `Logger` 类（继承 `SuperUtils.Framework.Logger.AbstractLogger`） |
| 文件路径 | `data/{username}/log/{yyyy-MM-dd}.log` |
| 覆盖模式 | 每次启动调用 `ResetCurrentLog()` 清空当日文件 |
| 保留天数 | 10 天（`ClearLogBefore(-10, ...)` 删除过期文件） |
| 备注 | WPF 主程序在 Release 模式下优先启动 Tauri Shell，自身日志主要用于 fallback 场景；此路径不在统一 `log/` 目录下 |

### 2.5 测试工程

| 项目 | 值 |
|------|---|
| 工程 | `dotnet/Jvedio.Worker.Tests` |
| 日志路径 | `{repo}/log/test/worker-tests/runtime/` |
| 环境变量 | `JVEDIO_LOG_DIR` = `{repo}/log/test/worker-tests` |
| 生命周期 | 持久化，不自动清理（多次运行按日滚动覆盖） |
| git 同步 | `log/test/` 目录参与 git 跟踪（`.gitignore` 中有例外规则） |
| 备注 | Worker 的 `ResolveLogDirectory()` 会在 `JVEDIO_LOG_DIR` 上追加 `runtime/` 子目录 |

## 3. 环境变量

| 变量 | 作用 |
|------|------|
| `JVEDIO_LOG_DIR` | 覆盖日志根目录路径（Worker 和 Shell 均读取，自动追加 `runtime/` 子目录） |
| `JVEDIO_APP_BASE_DIR` | Worker 数据目录根路径覆盖 |

## 4. .gitignore 规则

```gitignore
# 默认规则已忽略 [Ll]og/ 和 *.log
# 以下例外确保 log/ 目录结构被 Git 跟踪
!/log/
!/log/.gitkeep
!/log/**/
!/log/**/.gitkeep
!/log/test/test-output.txt
```

## 5. 调试指南

### 5.1 查看实时日志

```powershell
# 实时查看 Worker 日志
Get-Content -Path log/runtime/worker-*.log -Wait -Tail 50

# 实时查看 Shell 日志
Get-Content -Path log/runtime/shell-*.log -Wait -Tail 50

# 同时查看两个
Get-Content -Path log/runtime/*.log -Wait -Tail 50
```

### 5.2 Playwright 自动化测试

Playwright 测试期间，通过查看 `log/runtime/` 目录即可诊断所有后端和 Shell 问题：
- API 错误 → `runtime/worker-{date}.log` 中搜索 `[ERR]` 或 `[WRN]`
- Worker 启动失败 → `runtime/shell-{date}.log` 中搜索 `ERROR`
- Worker stdout 捕获问题 → `runtime/shell-{date}.log` 中搜索 `[Worker:stdout]`
- 测试产物 → `log/test/e2e/` 目录下查看 traces / screenshots / reports

### 5.3 生产环境

Release 模式下日志文件位于 Worker/Shell 可执行文件旁边的 `log/runtime/` 目录（或通过 `JVEDIO_LOG_DIR` 指定，自动追加 `runtime/`）。
