# Playwright 端到端自动化测试方案

## 1. 文档目的

本文件定义基于 Playwright MCP 的前端 UI 自动化测试方案、执行流程和已知限制。

适用场景：
- Phase 6 端到端验证（7 张流程图对应的页面流转）
- 后续 UI 回归测试
- CI/CD 集成（预留）

## 2. 核心问题与解决方案

### 2.1 问题

Jvedio 前端运行在 Tauri 窗口中，通过 `@tauri-apps/api` 的 `invoke` / `listen` 与 Rust 壳通信，获取 Worker 的 HTTP 端口。
Playwright 浏览器中没有 Tauri IPC bridge，导致前端停在 `WorkerStatusOverlay`（"正在启动引擎…"），无法进入主界面。

### 2.2 方案：WorkerContext 浏览器模式检测

在 `WorkerContext.tsx` 中检测 `window.__TAURI_INTERNALS__` 是否存在：

| 环境 | `window.__TAURI_INTERNALS__` | Worker 连接方式 |
|------|-------------------|----------------|
| Tauri 窗口 | ✅ 存在 | 动态 `import("@tauri-apps/api/core")` → `invoke("get_worker_base_url")` + `listen("worker-ready")` |
| 浏览器（Playwright / 开发调试） | ❌ 不存在 | URL 参数 `?workerPort=53706` 或轮询 `http://127.0.0.1:{port}/api/app/bootstrap` |

**改动范围**：`tauri/src/contexts/WorkerContext.tsx` + `dotnet/Jvedio.Worker/Program.cs`（CORS）。

**额外收益**：开发时可直接用浏览器调试前端，不必每次等 Tauri 编译。

### 2.3 CORS 跨域支持

浏览器从 `localhost:1420`（Vite dev server）访问 `127.0.0.1:{port}`（Worker API）会被同源策略阻止。
解决方案：在 Worker 的 `Program.cs` 中添加 CORS 中间件。

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
// ...
app.UseCors(); // 在 UseMiddleware<ApiExceptionMiddleware>() 之前
```

**注意**：当前 CORS 配置为 `AllowAnyOrigin`，适用于开发环境。生产环境（Tauri 窗口）不经过浏览器同源策略，不受影响。

### 2.3 浏览器模式的 Worker URL 获取策略

优先级：
1. **URL 参数**：`?workerPort=53706` → `http://127.0.0.1:53706`
2. **日志文件解析**：启动脚本从 `temp/tauri-output.log` 中提取 `JVEDIO_WORKER_READY {url}`
3. **Playwright 注入**：通过 `browser_evaluate` 注入 `window.__WORKER_BASE_URL__`

自动化流程中，通过日志文件提取端口，然后使用 URL 参数方式传入。

## 3. 自动化执行流程

### 3.1 启动流程

```
1. 执行 temp/start-tauri-dev.ps1 -Timeout 120
   → 后台启动 `npm run tauri dev`
   → 等待 stdout 输出 "JVEDIO_WORKER_READY http://127.0.0.1:{port}"
   → 写入 temp/tauri-pid.txt + temp/tauri-output.log

2. 从 temp/tauri-output.log 中提取 Worker URL
   → 正则匹配 "JVEDIO_WORKER_READY (http://\S+)"
   → 得到端口号（如 53706）

3. Playwright 浏览器打开（带 workerPort 参数）
   → browser_navigate("http://localhost:1420?workerPort={port}")
   → WorkerContext 检测到非 Tauri 环境，读取 URL 参数
   → 直连 Worker HTTP API → 绕过 Tauri IPC
   → WorkerStatusOverlay 消失 → 主界面渲染
```

### 3.2 测试执行

```
4. browser_snapshot → 获取无障碍树
5. 根据 ref 执行操作：
   - browser_click(ref="xxx") — 点击按钮/链接
   - browser_type(ref="xxx", text="...") — 输入文字
   - browser_fill_form — 批量填表单
   - browser_select_option — 下拉选择
   - browser_hover — 悬停
6. 每次操作后 browser_snapshot 重新获取元素树
7. 断言：检查快照中是否出现预期元素/文字
```

### 3.3 停止流程

```
8. browser_close → 关闭 Playwright 浏览器
9. 执行 temp/stop-tauri-dev.ps1
   → taskkill /T /F 杀进程树
   → 清理 temp/ 下临时文件
```

## 4. Playwright MCP 交互方式

Playwright MCP 使用**无障碍树 + ref 引用**模式，不使用像素坐标：

### 4.1 snapshot → ref → action 三步法

```
browser_snapshot
  → 返回: button "设置" [ref=s1e3], link "库管理" [ref=s1e5], ...
browser_click(ref="s1e3")
  → 点击"设置"按钮
browser_snapshot
  → 获取新页面的元素树
```

### 4.2 常用操作 API

| 操作 | 工具 | 关键参数 |
|------|------|----------|
| 点击 | `browser_click` | `ref` |
| 输入 | `browser_type` | `ref`, `text` |
| 悬停 | `browser_hover` | `ref` |
| 填表 | `browser_fill_form` | `fields[]` (name, type, ref, value) |
| 下拉 | `browser_select_option` | `ref`, value |
| 等待 | `browser_wait_for` | `text`, `state` ("attached"/"detached") |
| 截图 | `browser_take_screenshot` | — |
| JS 注入 | `browser_evaluate` | `expression` |

### 4.3 优势

- 不依赖像素坐标，窗口大小变化不影响
- 语义化操作，可读性强
- 天然支持无障碍

## 5. 测试矩阵

对应 `validation.md` 中 Phase 6.3 的 7 张流程图：

| 流程 | 验证项数 | 自动化覆盖度 |
|------|---------|-------------|
| main-shell-navigation-flow | 8 | 全部可自动化 |
| library-management-flow | 7 | 全部可自动化 |
| library-workbench-flow | 8 | 全部可自动化 |
| favorites-flow | 5 | 全部可自动化 |
| actors-flow | 6 | 全部可自动化 |
| video-detail-playback-flow | 5 | 4/5（播放按钮需 Tauri shell API） |
| settings-flow | 8 | 7/8（主题切换需额外验证暗色 CSS） |

## 6. 临时脚本与文件

### 6.1 文件清单

| 文件 | 用途 | 位置 |
|------|------|------|
| `start-tauri-dev.ps1` | 后台启动 tauri dev + 等待 Worker ready | `temp/` |
| `stop-tauri-dev.ps1` | 杀进程树 + 清理 | `temp/` |
| `tauri-pid.txt` | 主进程 PID（运行时生成） | `temp/` |
| `tauri-output.log` | stdout/stderr 输出（运行时生成） | `temp/` |

### 6.2 目录规则

- `temp/` 已加入 `.gitignore`，不进入版本控制
- 项目完成后统一删除 `temp/` 目录

## 7. 已知限制

| 限制 | 影响 | 应对 |
|------|------|------|
| Tauri shell API 不可用 | "打开文件夹"、"用播放器打开" 无法测试 | 验证 API 调用即可，跳过系统动作 |
| Worker 动态端口 | 每次启动端口不同 | 从日志文件自动提取 |
| SSE 断开日志噪音 | `OperationCanceledException` | 不影响测试，后续修复 |
| favicon.ico 404 | 控制台无害警告 | 忽略 |

## 8. 代码改动清单

| 文件 | 改动 |
|------|------|
| `tauri/src/contexts/WorkerContext.tsx` | 检测 `window.__TAURI_INTERNALS__`，非 Tauri 时从 URL 参数获取 workerPort 直连；Tauri API 改为动态 `import()` 避免浏览器加载报错 |
| `dotnet/Jvedio.Worker/Program.cs` | 添加 `AddCors` + `UseCors` 中间件，解决浏览器跨域访问 Worker API |

WorkerContext 改动约 100 行（含环境检测 + 自动发现），Program.cs 改动约 10 行。均不影响 Tauri 窗口中的正常运行。

## 9. 已知问题

| 问题 | 影响 | 状态 |
|------|------|------|
| SettingsPage `useApiQuery` 无限重渲染 | 点击"设置"后 `Maximum update depth exceeded`，疯狂轮询 `/api/settings` | 🟡 已有 bug，非本次引入，不阻碍自动化流程 |
| Worker SSE 断开时 `OperationCanceledException` | 浏览器关闭时 Worker 日志记录无害 error | 🟡 不影响功能 |

## 10. 文档关联

- 数据目录规范：`doc/data-directory-convention.md`
- E2E 测试数据规范：`doc/testing/e2e/e2e-test-data-spec.md`
- 验证矩阵：`plan/active/desktop-ui-shell-refactor/validation.md`
- 后端测试计划：`doc/testing/backend/test-plan.md`
- 后端测试清单：`doc/testing/backend/test-current-suite.md`
- 测试目标：`doc/testing/backend/test-targets.md`
- E2E 用例清单：`doc/testing/e2e/playwright-e2e-test-cases.md`
- 工作日志：`.codebuddy/memory/2026-03-19.md`
