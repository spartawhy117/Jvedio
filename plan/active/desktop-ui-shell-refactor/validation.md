# Desktop UI Shell Refactor Validation

## 当前阶段

- **Phase 6：端到端可运行验证** — 进行中
- Phase 1–5 已完成（架构搭建、代码实现、构建切换、Electron 清理）
- Phase 6 目标：从"代码已写完"推进到"完整可运行、可端到端测试"

## Phase 1–5 完成状态（历史记录）

| 阶段 | 状态 | 提交数 |
|------|------|--------|
| Phase 1 — MainShell Spike | ✅ | 4 commits |
| Phase 2 — Renderer 基座重建 | ✅ | 6 commits |
| Phase 3 — 业务页迁移 | ✅ | 9 commits |
| Phase 4 — Release 切换 | ✅ | 1 commit |
| Phase 5 — 旧 Electron 清理 | ✅ | 5 commits |

## Phase 6 验证矩阵

### 6.1 编译基础设施验证

| 验证项 | 状态 | 说明 |
|--------|------|------|
| .NET 8 SDK 可用 | ⬜ | `dotnet --version` |
| Worker Release 编译成功 | ⬜ | `dotnet build -c Release` 在 `Jvedio.Worker/` 下 |
| Worker.exe 存在 | ⬜ | `Jvedio-WPF/Jvedio.Worker/bin/Release/net8.0/Jvedio.Worker.exe` |
| node_modules 安装 | ⬜ | `npm install` 在 `tauri/` 下 |
| TypeScript 编译 | ⬜ | `tsc --noEmit` 零错误 |
| Rust toolchain 可用 | ⬜ | `rustc --version` + `cargo --version` |

### 6.2 首次启动验证

| 验证项 | 状态 | 说明 |
|--------|------|------|
| Vite dev server 启动 | ⬜ | `http://localhost:1420` 可访问 |
| Tauri Rust 编译成功 | ⬜ | `cargo build` 在 `src-tauri/` 下无错误 |
| Tauri 窗口弹出 | ⬜ | 1280x800 窗口正常显示 |
| Worker 进程启动 | ⬜ | Rust stdout 监控捕获 `JVEDIO_WORKER_READY` |
| WorkerStatusOverlay 正常 | ⬜ | 启动中显示加载状态 → Worker ready 后消失 |
| Bootstrap 获取成功 | ⬜ | `GET /api/app/bootstrap` 返回 200 |
| SSE 连接建立 | ⬜ | `GET /api/events` EventSource 连接 |
| 主界面渲染 | ⬜ | 左侧导航 + 右侧内容区正常显示 |

### 6.3 页面流转端到端测试

基准：`doc/UI/new/flow/` 7 张流程图

#### main-shell-navigation-flow

| 验证项 | 状态 |
|--------|------|
| 点击"设置" → 显示设置页 | ⬜ |
| 点击"库管理" → 显示库管理页 | ⬜ |
| 点击"喜欢" → 显示收藏页 | ⬜ |
| 点击"演员" → 显示演员页 | ⬜ |
| 库列表正常加载 | ⬜ |
| 点击库名 → 进入对应单库页 | ⬜ |
| 任务摘要正常显示 | ⬜ |
| Worker 状态指示灯正常 | ⬜ |

#### library-management-flow

| 验证项 | 状态 |
|--------|------|
| 库列表正常加载 | ⬜ |
| 新建库弹窗 → 保存 → 列表刷新 | ⬜ |
| 编辑库弹窗 → 保存 → 列表刷新 | ⬜ |
| 删除库确认 → 删除 → 列表刷新 | ⬜ |
| 扫描按钮 → 触发扫描任务 | ⬜ |
| 打开单库 → 跳转 LibraryPage | ⬜ |
| StatusBadge 正确反映状态 | ⬜ |

#### library-workbench-flow

| 验证项 | 状态 |
|--------|------|
| 影片列表加载 | ⬜ |
| 搜索过滤 | ⬜ |
| 排序切换（6 种） | ⬜ |
| 分页切换 | ⬜ |
| 点击影片卡片 → 进入详情 | ⬜ |
| 从详情返回 → 恢复排序/分页状态 | ⬜ |
| SSE library.changed → 自动刷新 | ⬜ |
| ResultSummary 显示正确 | ⬜ |

#### favorites-flow

| 验证项 | 状态 |
|--------|------|
| 收藏列表加载 | ⬜ |
| 排序/分页 | ⬜ |
| 点击卡片 → 进入详情 | ⬜ |
| 从详情返回 → 恢复状态 | ⬜ |
| 空态正常显示 | ⬜ |

#### actors-flow

| 验证项 | 状态 |
|--------|------|
| 演员列表加载 | ⬜ |
| 搜索/排序/分页 | ⬜ |
| 点击演员卡片 → 进入 ActorDetail | ⬜ |
| 演员详情 + 关联影片加载 | ⬜ |
| 点击关联影片 → 进入 VideoDetail | ⬜ |
| 返回链路：VideoDetail → ActorDetail → Actors | ⬜ |

#### video-detail-playback-flow

| 验证项 | 状态 |
|--------|------|
| 影片详情加载（海报/VID/元数据） | ⬜ |
| 播放按钮 → 调用 play API | ⬜ |
| Sidecar badge 状态显示 | ⬜ |
| 演员标签可点击 → 跳转 ActorDetail | ⬜ |
| 返回来源页 → 恢复状态 | ⬜ |

#### settings-flow

| 验证项 | 状态 |
|--------|------|
| 设置读取 (`GET /api/settings`) | ⬜ |
| 分组切换（6 组） | ⬜ |
| 主题切换 (light/dark) | ⬜ |
| 语言切换 (zh/en) | ⬜ |
| 保存设置 → toast 反馈 | ⬜ |
| 恢复默认 → 确认弹窗 → toast | ⬜ |
| MetaTube 诊断 | ⬜ |
| settings.changed SSE 回流 | ⬜ |

### 6.4 已知功能缺口

| 缺口 | 优先级 | Phase 6 是否必修 |
|------|--------|-----------------|
| Settings Image 组无表单控件 | 中 | 否（不阻断主流程） |
| Settings ScanImport 组无表单控件 | 中 | 否 |
| Settings Library 组无表单控件 | 中 | 否 |
| VideoDetail "打开文件夹" 空函数 | 中 | 是（接入 Tauri shell API） |
| 右键菜单（ContextMenu）未实现 | 中 | 否（不阻断主流程） |
| 视频多选/批量操作 | 低 | 否 |

### 6.5 事件级验证

| 事件 | 状态 |
|------|------|
| `worker.ready` → 前端进入可交互 | ⬜ |
| `library.changed` → 库列表刷新 | ⬜ |
| `settings.changed` → 设置缓存失效 | ⬜ |
| `task.summary.changed` → 任务摘要更新 | ⬜ |
| `task.created` / `task.completed` / `task.failed` | ⬜ |

## Phase 6 通过标准

满足以下条件即可标记 Phase 6 完成：

1. ✅ `npm run tauri dev` 一键启动，无手动干预
2. ✅ Worker 正常拉起，主界面正常渲染
3. ✅ 7 张流程图对应的主链路全部可执行
4. ✅ 核心 CRUD 操作（库管理、设置保存）有真实数据反馈
5. ✅ 页面间导航和返回链路正常，状态恢复正确
6. ✅ SSE 事件驱动的自动刷新正常工作
7. ✅ 无阻断性运行时错误（控制台无未捕获异常）
