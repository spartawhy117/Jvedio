# Startup Splash 实施文档

## 文档目的

本文件给出当前桌面端启动体验的推荐实施方案：

- **采用原生 Splash 窗口承接启动阶段**
- **主窗口在 `Worker ready + bootstrap ready` 后再显示**
- **尽量不改动现有 Worker / Bootstrap 业务链路**

目标不是重构业务，而是把“用户在启动阶段看到什么”从 React 全屏遮罩，改成更符合桌面端预期的启动承载方式。

## 适用范围

本方案覆盖：

- `tauri/src-tauri/tauri.conf.json` 的窗口声明
- `tauri/src-tauri/src/lib.rs` 的窗口显示时机与启动桥接
- `tauri/src-tauri/src/worker.rs` 的现有握手链路复用
- `tauri/src/contexts/WorkerContext.tsx` / `BootstrapContext.tsx` 的现有 ready 状态复用
- `tauri/src/components/WorkerStatusOverlay.tsx` 的职责收缩
- `tauri/public/` 下新增的静态启动页资源

本方案**不覆盖**：

- Worker 启动方式改造
- `/api/app/bootstrap` 返回结构调整
- 页面级 skeleton 体系改造
- 多窗口业务功能扩展

## 当前现状

当前启动链路是：

1. Tauri 启动主窗口
2. Rust `spawn_worker()` 拉起 `Jvedio.Worker.exe`
3. Worker stdout 输出 `JVEDIO_WORKER_READY {baseUrl}`
4. React `WorkerContext` 变为 `ready`
5. `BootstrapContext` 拉取 `/api/app/bootstrap`
6. `WorkerStatusOverlay` 在 `worker ready + bootstrap ready` 后隐藏

当前问题：

- 主窗口会先出现，再被全屏 `WorkerStatusOverlay` 盖住
- `worker ready` 与 `bootstrap ready` 之间存在短暂过渡态，视觉上会有“出现后消失”的感受
- 用户会感觉窗口已经出来了，但主界面还不能用
- 该体验更像 Web 页面的加载遮罩，不像桌面应用的稳定启动页

## 方案结论

### 结论

采用：**静态 Splash 窗口 + 隐藏主窗口 + ready 后显示主窗口**。

具体口径：

- 应用启动时先展示 `splashscreen` 窗口
- `main` 主窗口初始为 `visible: false`
- 保持现有 `spawn_worker()`、`worker-ready`、`BootstrapContext` 不变
- 当前端确认 `worker ready && bootstrap ready` 后，通知 Rust：
  - 关闭 `splashscreen`
  - 显示 `main`
  - 聚焦 `main`
- 如果启动失败：
  - 关闭 `splashscreen`
  - 显示 `main`
  - 继续使用现有 `WorkerStatusOverlay` 作为错误态兜底

### 为什么不选 React 路由版 Splash

不推荐让 `splashscreen` 也加载同一个 React App，再通过路由判断渲染启动页。原因：

- 第二个窗口会再次跑 React 启动流程
- 容易引入双窗口重复初始化、多余日志和重复副作用
- 会让 `WorkerContext` / `BootstrapContext` 在启动阶段被额外窗口干扰
- 对“尽量不动原有逻辑”的目标不友好

因此推荐使用：

- `tauri/public/startup-splash.html`
- 必要时再配一个极小的 `startup-splash.css`

即：**Splash 是静态页，不参与业务逻辑。**

## 目标启动链路

目标链路如下：

```text
[App Launch]
   ↓
显示 Splash 窗口
隐藏 Main 窗口
   ↓
Rust spawn_worker()
   ↓
Worker 输出 JVEDIO_WORKER_READY {baseUrl}
   ↓
WorkerContext = ready
   ↓
BootstrapContext 拉取 /api/app/bootstrap
   ↓
BootstrapContext = ready
   ↓
前端 invoke Rust: mark_main_window_ready
   ↓
Rust 关闭 Splash
Rust 显示 Main
Rust 聚焦 Main
   ↓
用户看到已经可交互的主界面
```

失败链路：

```text
Worker 启动失败 / bootstrap 失败 / 启动超时
   ↓
前端 invoke Rust: reveal_main_window_for_error
   ↓
Rust 关闭 Splash
Rust 显示 Main
   ↓
Main 内保留 WorkerStatusOverlay 错误态 + Retry
```

## 设计目标

### 必须满足

- 启动成功时，用户**不再看到主窗口先出现、再被覆盖、再露出的过程**
- 现有 `worker-ready` 握手协议保持不变
- 现有 `/api/app/bootstrap` 初始化流程保持不变
- 现有 `WorkerStatusOverlay` 的错误态与重试能力保留
- 对 Playwright 浏览器模式影响最小
- 单实例行为在启动中和启动后都可接受

### 不追求

- 本轮不做页面级 skeleton 体系
- 本轮不把 bootstrap 前移到 Rust
- 本轮不引入复杂启动动画框架
- 本轮不做多平台个性化启动页差异适配

## 具体改动清单

## 1. `tauri/src-tauri/tauri.conf.json`

### 目标

显式声明两个窗口：

- `main`
- `splashscreen`

并让 `main` 初始不可见。

### 建议改法

当前唯一主窗口建议改为显式带 label：

- `label: "main"`
- `visible: false`

新增 `splashscreen` 窗口：

- `label: "splashscreen"`
- `url: "startup-splash.html"`
- `visible: true`
- `decorations: false`
- `resizable: false`
- `center: true`
- `width` / `height` 采用固定值
- `alwaysOnTop: true` 可按实际体验决定是否开启
- 不需要业务权限

### 推荐窗口原则

- `main`：用户真正交互的业务窗口
- `splashscreen`：只负责承接启动等待，不负责任何业务逻辑

### 建议尺寸

建议先用保守值：

- `splashscreen.width = 520`
- `splashscreen.height = 320`

避免过小显得廉价，也避免过大像第二个主窗口。

## 2. `tauri/public/startup-splash.html`

### 目标

提供一个**纯静态启动页**，不依赖 React，不依赖 Worker，不依赖 Tauri IPC。

### 内容建议

只保留：

- 应用图标 / 品牌名 `Jvedio Next`
- 一行简洁状态文案，例如：
  - `正在启动服务...`
  - `正在准备应用数据...`
- 轻量动画（可选）
- 不显示复杂进度条
- 不显示技术术语（如 bootstrap / SSE / worker port）

### 为什么静态页最稳

- 零副作用
- 不重复启动前端状态机
- 打包简单
- 风险最小

## 3. `tauri/src-tauri/src/lib.rs`

### 目标

在 Rust 层接管：

- 主窗口何时显示
- Splash 何时关闭
- 启动失败时如何回退到主窗口错误态

### 建议新增状态

新增一个轻量启动状态，例如：

- `main_window_revealed: bool`
- `startup_finished: bool`

用途：

- 防止重复 show / close
- 区分“启动中”和“启动完成后运行时错误”

### 建议新增命令

建议新增两个命令：

- `mark_main_window_ready`
  - 前端在 `worker ready && bootstrap ready` 后调用
  - Rust 执行：
    - close splash
    - show main
    - set focus
    - 更新状态为已完成

- `reveal_main_window_for_error`
  - 前端在启动失败时调用
  - Rust 执行：
    - close splash
    - show main
    - set focus
    - 允许现有 `WorkerStatusOverlay` 展示错误信息

### 原则

Rust 只负责窗口显示时机；
**是否 ready 仍由前端现有的 `WorkerContext + BootstrapContext` 判定。**

## 4. `tauri/src-tauri/src/worker.rs`

### 目标

尽量不改。

### 保持不动的部分

- `spawn_worker()`
- `worker-ready` 事件
- `worker-error` 事件
- stdout 握手协议
- `get_worker_base_url` 命令

### 只需确认的点

- 启动失败时仍会 emit `worker-error`
- 运行中退出时仍会 emit `worker-error`

这些现有机制继续作为前端兜底依据，不需要为 Splash 方案重写握手层。

## 5. `tauri/src/contexts/WorkerContext.tsx`

### 目标

尽量不改核心逻辑。

### 保持不动

- `starting / ready / error` 三态
- Tauri 环境下监听 `worker-ready`
- 浏览器模式下通过 `workerPort / workerUrl` 连接

### 备注

不要把“显示主窗口”的职责塞进 `WorkerContext`。它只负责连接状态，不负责窗口编排。

## 6. `tauri/src/contexts/BootstrapContext.tsx`

### 目标

继续复用当前 `idle / loading / ready / error` 状态机。

### 保持不动

- `doFetchBootstrap()`
- `createApiClient()`
- SSE 连接
- `retry()`

### 需要补的桥接逻辑

建议新增一个单独的 bridge 组件或 hook，而不是把 Rust `invoke` 逻辑硬塞进 `BootstrapContext` 主体。

例如：

- `tauri/src/components/StartupReadyBridge.tsx`
- 或 `tauri/src/hooks/useStartupWindowBridge.ts`

职责：

- 监听 `workerStatus` 和 `bsStatus`
- 当两者都 ready 时调用 `mark_main_window_ready`
- 当任一进入 error 时调用 `reveal_main_window_for_error`
- 只在 Tauri 环境执行；浏览器模式直接跳过

这样可避免：

- 把窗口编排逻辑污染到数据 context
- 增大 `BootstrapContext` 的职责边界

## 7. `tauri/src/components/WorkerStatusOverlay.tsx`

### 目标

把它从“正常启动遮罩”收缩为“错误态 / 异常兜底层”。

### 建议调整

正常启动成功路径下：

- Splash 负责承接等待
- `WorkerStatusOverlay` 不再承担启动 loading 的主要视觉责任

因此建议改成：

- **显示错误态**：保留
- **显示 retry**：保留
- **正常 loading 全屏覆盖**：弱化或移除

### 最小改法

本轮先不彻底删掉 `WorkerStatusOverlay`，而是：

- `workerStatus === "error"` 时继续显示
- `workerStatus === "ready" && bsStatus === "error"` 时继续显示
- `starting / loading / idle` 的成功路径优先由 Splash 承接

这样可以最小化对前端页面的影响，并保留原来的错误恢复能力。

## 8. `tauri/src/App.tsx`

### 目标

只接入 bridge，不在这里堆启动判定细节。

### 建议

在根组件中追加：

- `StartupReadyBridge`

其余结构保持不动。

原则：

- `App.tsx` 继续负责主壳层渲染
- 启动桥接组件只做副作用，不渲染业务 UI

## 9. 单实例行为

### 当前现状

现在 `single_instance` 插件在第二次启动时会聚焦 `main` 窗口。

### Splash 方案下要处理的问题

如果应用还在启动阶段：

- `main` 可能还没显示
- 用户再次双击时，应该优先把 `splashscreen` 聚焦到前面

### 建议改法

在 `lib.rs` 的单实例回调中按顺序处理：

1. 若 `main` 已显示，聚焦 `main`
2. 否则若 `splashscreen` 存在，聚焦 `splashscreen`
3. 兜底再尝试 `main`

这样可以避免：

- 第二次双击时看起来“没有反应”
- 启动阶段焦点丢失

## 10. 启动超时与故障回退

### 为什么要加超时

如果 Worker 卡住、stdout 握手失败、bootstrap 接口迟迟不返回，Splash 会一直停留，用户无法得知发生了什么。

### 建议策略

前端 bridge 增加一个启动超时，例如：

- **15 秒**：首次建议值

超时后执行：

- 调用 `reveal_main_window_for_error`
- 主窗口显示现有 `WorkerStatusOverlay` 错误信息
- 允许用户重试或查看日志

### 原则

- 正常路径不要暴露复杂技术细节
- 异常路径必须可见、可重试、可排查

## 11. 对浏览器模式与测试的影响

### 浏览器模式

浏览器模式没有原生窗口：

- 不会有 Splash
- 不会 hide/show main window
- `StartupReadyBridge` 在非 Tauri 环境直接 no-op

因此：

- Playwright 浏览器模式仍可继续使用
- 现有 E2E 自动化无需围绕 Splash 重写

### 人工验收

需要新增或调整的人工关注点：

- 启动时先出现 Splash，而不是直接出现主窗口
- Worker / bootstrap 成功后 Splash 消失，主窗口直接进入可交互状态
- 启动失败时，Splash 退出并落到主窗口错误态
- 启动中再次双击 exe 时，焦点行为符合预期

## 文件级实施顺序

### Phase A：窗口承载层

1. 修改 `tauri/src-tauri/tauri.conf.json`
2. 新增 `tauri/public/startup-splash.html`
3. 如有必要，新增 `tauri/public/startup-splash.css`

### Phase B：Rust 窗口编排

1. 在 `tauri/src-tauri/src/lib.rs` 中新增启动窗口桥接命令
2. 增加轻量启动状态，避免重复 reveal
3. 调整单实例回调，优先聚焦合适窗口

### Phase C：前端 ready 桥接

1. 新增 `StartupReadyBridge`
2. 在 `App.tsx` 挂载 bridge
3. 在 bridge 中接入：
   - success → `mark_main_window_ready`
   - error → `reveal_main_window_for_error`
   - timeout → `reveal_main_window_for_error`

### Phase D：错误态收缩

1. 收缩 `WorkerStatusOverlay` 的职责
2. 保留 error / retry
3. 删除或弱化正常启动的全屏 loading 覆盖

## 建议的最小代码边界

### Rust 侧必改文件

- `tauri/src-tauri/tauri.conf.json`
- `tauri/src-tauri/src/lib.rs`

### Rust 侧可不改文件

- `tauri/src-tauri/src/worker.rs`

### 前端必改文件

- `tauri/src/App.tsx`
- 新增 `tauri/src/components/StartupReadyBridge.tsx` 或等价 hook
- `tauri/src/components/WorkerStatusOverlay.tsx`

### 前端尽量不改文件

- `tauri/src/contexts/WorkerContext.tsx`
- `tauri/src/contexts/BootstrapContext.tsx`

## 回归点

### 功能回归

- 应用启动后，Splash 先显示，主窗口不提前暴露
- Worker ready + bootstrap ready 后，主窗口首次出现即处于可交互状态
- 启动失败时仍能看到错误信息与 retry
- 第二次启动时单实例聚焦正常
- 关闭主窗口仍会 kill Worker

### 非功能回归

- 冷启动感知更稳定，不再出现“闪一下”
- Splash 不应引入明显额外启动耗时
- 浏览器模式下不应出现新异常
- Release 打包后 `startup-splash.html` 能正确进入产物

## 验证建议

### 自动化可覆盖

- `build-release.ps1` 打包后产物包含 splash 静态资源
- 浏览器模式依旧可用（bridge 在非 Tauri 环境 no-op）
- Worker 单元 / 集成测试不受影响

### 需要人工验证

- 双击 exe 时先看到 Splash
- Splash 到主窗口切换是否平滑
- 启动失败回退到主窗口错误态是否自然
- 启动阶段再次双击 exe 的聚焦行为

## 风险与注意事项

### 风险 1：主窗口永远不显示

原因：

- 忘记在 ready 后调用 Rust 命令
- 启动超时分支未做 reveal

规避：

- success / error / timeout 三条路径都必须能 reveal 主窗口
- Rust 侧对重复 reveal 做幂等保护

### 风险 2：Splash 也触发业务逻辑

原因：

- 使用 React 路由页而不是静态 HTML

规避：

- 明确采用 `tauri/public/startup-splash.html`
- Splash 不挂业务脚本

### 风险 3：单实例焦点丢失

原因：

- 回调仍只聚焦 `main`

规避：

- 启动中优先聚焦 `splashscreen`

## 回滚策略

如果本方案上线后出现阻断问题，允许快速回滚到现有方案：

1. `tauri.conf.json` 去掉 `splashscreen`
2. `main.visible` 恢复为 `true`
3. 去掉 `StartupReadyBridge`
4. 恢复 `WorkerStatusOverlay` 为启动阶段主承载层

此回滚不需要改 Worker 握手、bootstrap API 或业务页面。

## 推荐实施结论

如果目标是：

- **明显改善启动观感**
- **尽量不改现有业务链路**
- **控制改动面在可回滚范围内**

那么本方案就是当前仓库最合适的第一选择。

推荐落地顺序：

1. 先做 **静态 Splash + 主窗口延迟显示**
2. 再做 **错误态回退与单实例聚焦完善**
3. 最后再决定是否继续收缩 `WorkerStatusOverlay` 的 loading 部分
