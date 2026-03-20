# 13 — Tauri Shell 与 Worker 连接

## 范围

本文档描述 Tauri Shell（Rust + React 前端壳子）与 .NET Worker（ASP.NET Core HTTP 后端）之间的连接机制，包括：

- 双进程架构总览
- Worker 子进程生命周期管理
- 动态端口发现与 stdout 握手协议
- 四种运行模式的连接差异
- 单实例控制
- 故障排查

## 架构总览

项目采用 **Shell + Worker 双进程架构**，用户双击 `JvedioNext.exe` 即可启动：

```
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│  Tauri Shell (Rust + React)      │     │  .NET Worker (ASP.NET Core)      │
│                                  │     │                                  │
│  ┌────────────┐  ┌────────────┐  │     │  ┌────────────┐  ┌───────────┐  │
│  │  WebView   │  │  Rust      │  │     │  │ Controller │  │  Service  │  │
│  │  (React)   │  │  进程管理   │──┼────►│  │  (HTTP)    │  │  (业务)   │  │
│  └──────┬─────┘  └─────┬──────┘  │     │  └────────────┘  └───────────┘  │
│         │              │         │     │  ┌────────────┐                  │
│         │    Tauri事件  │ stdout  │     │  │    SSE     │  ← 实时推送     │
│         │◄─────────────┤ 握手    │◄────┤  │ /api/events│                  │
│         │              │         │     │  └────────────┘                  │
└──────────────────────────────────┘     └──────────────────────────────────┘
         ▲                                            ▲
         │          HTTP REST API + SSE               │
         └────────────────────────────────────────────┘
              http://127.0.0.1:{动态端口}/api/...
```

- **Shell**：纯前端壳子，负责 UI 渲染，不包含业务逻辑
- **Worker**：HTTP 服务器，承载所有业务逻辑（库管理、扫描、搜刮、设置等）
- **通信**：Shell 通过 `http://127.0.0.1:{动态端口}` 调用 Worker REST API + SSE 事件流

## 连接链路

### 完整启动流程

```
[Tauri Shell 启动]
        │
   ① Rust: spawn_worker()
        │  以子进程方式启动 Jvedio.Worker.exe
        │  捕获 stdout / stderr 管道
        │
   ② .NET Worker 启动
        │  绑定 http://127.0.0.1:0  （端口 0 = OS 随机分配空闲端口）
        │  完成 DI 容器 / 数据库 / 路由初始化
        │
   ③ Worker 输出就绪信号
        │  stdout: "JVEDIO_WORKER_READY http://127.0.0.1:53706"
        │
   ④ Rust 解析 stdout
        │  检测到 READY_SIGNAL_PREFIX 前缀
        │  解析出 base_url = "http://127.0.0.1:53706"
        │  存入 WorkerState.base_url
        │  emit("worker-ready", { baseUrl })  → 发给 React 前端
        │
   ⑤ React WorkerContext 收到事件
        │  setBaseUrl("http://127.0.0.1:53706")
        │  setStatus("ready")
        │
   ⑥ React BootstrapContext 初始化
        │  createApiClient(baseUrl)
        │  GET /api/app/bootstrap  → 加载初始数据
        │  new EventSource(baseUrl + "/api/events")  → SSE 实时推送
        │
   ⑦ 应用就绪，用户可交互
        │
   [应用关闭]
        │
   ⑧ Rust: kill_worker()
        │  child.kill() + child.wait()
        │  终止 Worker 子进程
```

### 动态端口发现协议

**核心设计**：Worker 绑定 `端口 0`，由操作系统从空闲端口池中自动分配，避免端口冲突。

**协议约定**：

| 角色 | 行为 |
|------|------|
| Worker | 启动完成后，通过 `Console.Out.WriteLine("{0} {1}", "JVEDIO_WORKER_READY", baseUrl)` 向 stdout 输出就绪信号 |
| Shell (Rust) | 在 `worker-stdout` 线程中逐行读取 stdout，检测以 `JVEDIO_WORKER_READY` 开头的行，解析出 `base_url` |

**为什么不会端口冲突**：

- `端口 0` 是操作系统标准行为 — OS 保证分配的端口当前未被占用
- 每次启动端口号可能不同，但不影响，因为前端通过 stdout 握手动态获取
- 即使多开 Jvedio 实例，每个 Worker 都会拿到不同的随机端口
- 端口范围通常在 49152–65535（OS 临时端口范围）

**CORS 配置**：

Worker 配置了全开 CORS（`AllowAnyOrigin` + `AllowAnyHeader` + `AllowAnyMethod`），确保 WebView 本地页面访问 `127.0.0.1` 不会被跨域拦截。

## 四种运行模式

| 模式 | 前端加载方式 | Worker 连接方式 | 端口发现 |
|------|------------|----------------|---------|
| **Release**（正式打包） | WebView 加载内嵌的 `dist/` 静态文件 | Rust 启动 `{exe目录}/worker/Jvedio.Worker.exe` → stdout 握手 | 动态随机端口 |
| **Dev**（`tauri dev`） | WebView 加载 `http://localhost:1420`（Vite HMR） | Rust 启动 `{repo}/dotnet/.../Jvedio.Worker.exe` → stdout 握手 | 动态随机端口 |
| **纯浏览器**（Playwright / 调试） | 浏览器打开 `http://localhost:1420?workerPort=XXXXX` | 通过 URL 参数传入 Worker 地址 | 手动指定或 `window.__WORKER_BASE_URL__` 注入 |
| **集成测试**（`dotnet test`） | ❌ 不涉及前端 | `WebApplicationFactory<Program>` 内存管道 | 无需端口 |

### Worker 可执行文件路径

| 模式 | 路径 |
|------|------|
| Dev（`cfg(debug_assertions)`） | `{repo}/dotnet/Jvedio.Worker/bin/Release/net8.0/Jvedio.Worker.exe` |
| Release（打包后） | `{exe所在目录}/worker/Jvedio.Worker.exe` |

Release 打包时，`tauri.conf.json` 的 `bundle.resources` 将 `build/worker-stage/` 目录映射为安装目录下的 `worker/` 子目录：

```json
"bundle": {
    "resources": {
        "../../build/worker-stage/**/*": "worker/"
    }
}
```

### 纯浏览器模式的 URL 传参

`WorkerContext.tsx` 在非 Tauri 环境下支持三种方式传入 Worker 地址：

1. `?workerPort=53706` → 拼接为 `http://127.0.0.1:53706`
2. `?workerUrl=http://127.0.0.1:53706` → 直接使用
3. `window.__WORKER_BASE_URL__` → Playwright 通过 `browser_evaluate` 注入

### 集成测试模式

`WebApplicationFactory<Program>` 在内存中启动 Worker，不占用网络端口。测试通过内存管道直接调用 API，验证的是同一套 Controller / Service / DTO 代码，因此测试通过 = API 行为正确 = 前端能正常渲染。

## 关键源文件

| 区域 | 文件 | 职责 |
|------|------|------|
| Rust 进程管理 | `tauri/src-tauri/src/worker.rs` | `spawn_worker()` / `kill_worker()` / `resolve_worker_path()` / stdout 监听 |
| Rust 入口 | `tauri/src-tauri/src/lib.rs` | setup 钩子中调用 `spawn_worker()` |
| Worker 启动 | `dotnet/Jvedio.Worker/Program.cs` | `UseUrls("http://127.0.0.1:0")` / 日志 / DI |
| 就绪信号 | `dotnet/Jvedio.Worker/Hosting/WorkerReadySignalHostedService.cs` | stdout 输出 `JVEDIO_WORKER_READY {baseUrl}` |
| 前端上下文 | `tauri/src/contexts/WorkerContext.tsx` | 监听 `worker-ready` 事件、浏览器模式 URL 解析 |
| 前端引导 | `tauri/src/contexts/BootstrapContext.tsx` | `createApiClient(baseUrl)` / 初始化数据加载 |
| API 客户端 | `tauri/src/api/client.ts` | 所有 HTTP 请求拼接 `baseUrl` |
| SSE 事件流 | `tauri/src/api/events.ts` | `EventSource(baseUrl + "/api/events")` |
| 构建脚本 | `tauri/scripts/prepare-worker.ps1` | 编译 Worker 并复制到 `build/worker-stage/` |
| 打包配置 | `tauri/src-tauri/tauri.conf.json` | `bundle.resources` 映射 `build/worker-stage/` → `worker/` |

## Tauri 事件清单

| 事件名 | 方向 | 载荷 | 触发时机 |
|--------|------|------|---------|
| `worker-ready` | Rust → React | `{ baseUrl: string }` | Worker stdout 输出就绪信号 |
| `worker-error` | Rust → React | `{ message: string, phase: string }` | Worker 找不到 / 启动失败 / 进程退出 |
| `worker-log` | Rust → React | `{ line: string }` | Worker 每一行 stdout / stderr 输出 |

`phase` 字段值：`"resolve"`（找不到 exe）、`"spawn"`（启动失败）、`"runtime"`（运行中退出）。

## 单实例控制

`JvedioNext.exe` 通过 `tauri-plugin-single-instance` 实现单实例控制：

- 第一个实例正常启动
- 第二个实例检测到已有实例后，向第一个实例发送信号
- 第一个实例收到信号后取消最小化并聚焦窗口
- 第二个实例自动退出

注册代码位于 `lib.rs`：

```rust
.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}))
```

> 旧 WPF 端使用 `EventWaitHandle("Jvedio")` 实现互斥锁，已随 WPF 启动层移除而不再生效。

## 故障排查

| 现象 | 排查方向 |
|------|---------|
| Shell 启动后白屏 | 检查 Worker 是否启动：`worker.rs` 的 `resolve_worker_path()` 路径是否正确 |
| 控制台报 "Worker executable not found" | Dev 模式需先编译 Worker：`dotnet build dotnet/Jvedio.Worker -c Release` |
| 页面显示 "Worker starting..." 一直转 | stdout 管道可能被阻塞，检查 Worker 是否成功输出就绪信号 |
| API 请求全部 Failed to fetch | 检查 Worker 日志 `log/runtime/worker-*.log`，确认 Worker 未崩溃 |
| 浏览器模式无法连接 | URL 是否带了 `?workerPort=XXXXX`？Worker 是否已手动启动？ |
| SSE 连接断开 | Worker 进程可能已退出，检查 `worker-error` 事件和 Worker 日志 |
