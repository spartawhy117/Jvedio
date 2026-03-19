# 测试目标文档

## 1. 文档目的

本文件只定义三件事：

- 当前项目**要保障什么能力**
- 这些能力的**通过标准是什么**
- 当正式运行暴露新问题时，应该如何把问题**回灌成自动化测试**

本文件不负责描述测试工程目录结构、脚本位置、配置字段和执行顺序；这些内容统一放在：

- `doc/testing/backend/test-plan.md`

## 2. Worker API 契约测试目标

Worker API 契约测试指：
- 通过 `WebApplicationFactory<Program>` 在进程内启动 Worker
- 验证 HTTP 端点的请求/响应格式与业务行为
- 不依赖外部网络或 WPF 上下文

### 2.1 目标范围

- Bootstrap API（`/api/bootstrap`）— 返回 Worker 状态与基础信息
- Libraries API（`/api/libraries`）— 库 CRUD 操作
- Settings API（`/api/settings`）— 设置读写、恢复默认
- Videos API（`/api/videos`）— 收藏列表、类别列表、系列列表、批量操作
- Actor API（`/api/actors`）— 演员列表、分页、搜索、详情、关联影片
- Scrape API（`/api/libraries/{id}/scrape`、`/api/settings/meta-tube/diagnostics`）— 抓取触发与 MetaTube 诊断
- DTO 序列化 — Contracts DTO 与 JSON 的正确转换

### 2.2 当前要求

- 所有端点返回统一 `ApiResponse<T>` 信封（`success`、`data`、`requestId`、`timestamp`）
- 设置更新需要 `general`、`playback`、`metaTube` 三个必填组
- 库创建返回嵌套 `data.library.libraryId`
- JSON 序列化使用 camelCase 命名

### 2.3 强断言

- Bootstrap 返回成功信封且包含 `workerInfo.baseUrl`
- 库 CRUD 往返正确（创建 → 查列表 → 删除）
- 设置读写持久化正确
- 恢复默认值后设置回到初始状态
- DTO 序列化/反序列化字段不丢失

## 3. 业务逻辑测试目标

业务逻辑测试指：
- 不依赖真实网络或外部服务
- 不依赖 WPF 上下文
- 通过反射调用 Worker 私有静态方法或通过 API 端到端验证
- 用最短时间验证核心业务规则不回归

### 3.1 目标范围

- ✅ VID 解析规则（`ExtractVideoId`）— 17 个数据驱动用例
- ✅ Sidecar 命名规则（`NormalizeSidecarPrefix`、`GetMovieNfoPath` 等）— 6 个用例
- ✅ 扫描整理规则（`TryOrganize`）— 5 个文件系统用例
- ✅ 扫描导入端到端（API 创建库 → 触发扫描 → 验证导入）— 2 个用例
- ✅ MetaTube 抓取集成测试（`ScrapeApiTests`）— 3 个用例（触发/有效库/诊断端点）

### 3.2 当前要求

- VID 解析支持：标准 `XX-123`、FC2 `FC2-PPV-123456`、后缀 `-A`、无分隔符、大小写不敏感
- Sidecar 必须统一使用 VID 前缀：
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`
- VID 为空时回退到文件名，文件名也为空时回退到 `"video"`
- 写入路径（LibraryScrapeService）与读取路径（VideoService）必须一致
- 扫描整理：多视频平铺目录 → 按 VID 创建子目录 → 移动视频和字幕
- 扫描整理冲突：目标位置已有同名文件时不移动，标记失败

### 3.3 强断言

- ✅ VID 解析正确（标准/FC2/后缀/无分隔/大小写）
- ✅ Sidecar 路径命名正确
- ✅ 写入/读取路径一致
- ✅ 扫描整理文件移动正确
- ✅ 整理冲突时不丢文件
- ✅ 字幕文件随视频移动
- `ScrapeResult` 映射字段不丢失
- 日志覆盖逻辑可工作

## 4. 正式运行测试目标

正式运行测试指：
- 依赖真实远程服务或真实文件系统输出
- 用来验证当前主业务链在接近真实运行条件下可用

### 4.1 MetaTube 正式运行目标

- 远程服务根地址可达
- `/v1/providers` 可达
- 影片搜索可命中结果
- 影片详情可转换成统一 `ScrapeResult`
- actor search 与 actor detail 可工作
- 至少一个演员头像可成功获取（弱断言）
- 测试输出目录能写出：
  - `meta.json`
  - `*.nfo`
  - 海报/缩略图/背景图

### 4.2 扫描链正式运行目标

- 输入目录中的平铺影片若能命中 MetaTube，则整理到输出目录中的独立子目录
- 未命中的影片保留在输入目录
- 生成 JSON/TXT 结果报告，明确列出已整理与未命中的影片
- 整理成功后 `Video.Path` 正确更新

### 3.3 正式运行的 sidecar 与缓存目标

正式 sidecar：
- 写入影片目录
- 使用 `VID` 前缀命名

正式缓存：
- `cache/video/` 仅保留一份当前有效影片缓存
- `cache/actor-avatar/` 保存正式演员头像缓存

E2E 测试环境（播种脚本运行时）的路径对照：

| 产物 | 正式运行路径 | E2E 测试路径（目标） |
|------|-------------|-------------------|
| Sidecar（NFO/海报等） | 影片所在目录 | `test-data/e2e/data/{UserName}/cache/video/{LibName}/{VID}/` |
| 演员头像缓存 | `data/{user}/cache/actor-avatar/` | `test-data/e2e/data/{UserName}/cache/actor-avatar/` |
| 影片 JSON 缓存 | `data/{user}/cache/video/` | `test-data/e2e/data/{UserName}/cache/video/` |

> **E2E sidecar 目标路径变更**：E2E 环境下 sidecar 从影片目录迁移到 `data/{UserName}/cache/video/{LibName}/{VID}/`（方案 B：按库名分子目录），与演员头像缓存路径统一管理。当前 Release 代码仍写入影片目录，此目标路径将在后续 Worker 测试环境路径适配时实现。
>
> E2E 测试通过 `JVEDIO_APP_BASE_DIR=test-data/e2e` 实现路径隔离，Worker 的 `WorkerPathResolver` 自动计算出测试环境下的缓存目录。`.gitignore` 中 `test-data/**/cache/` 规则确保这些缓存不被提交。

主程序内置调试输出：
- 只写入 `log/test/<VID>/`
- 不污染正式缓存

### 3.4 测试工程输出目标

**Worker 契约测试**（`Jvedio.Worker.Tests`，52 个）：
- 数据目录：`test-data/worker/`（每次清空重建，测试后保留现场）
- 日志目录：`log/test/worker-tests/runtime/`

**E2E 播种测试**（`seed-e2e-data.ps1`）：
- 数据目录：`test-data/e2e/data/{UserName}/`（含 SQLite + 演员头像缓存）
- 影片 sidecar（E2E 目标）：`test-data/e2e/data/{UserName}/cache/video/{LibName}/{VID}/`
- 日志目录：`log/test/e2e/runtime/`

这两类测试使用独立的数据目录，互不影响，也不污染主程序正式 `data/` 目录。

### 4.5 日志目标

- 主日志在每次启动时覆盖旧内容
- MetaTube 测试日志并入主日志流
- `[Library-Organize]` 日志足以定位整理失败原因
- 测试输出和主日志都足以定位问题

## 5. 强断言与弱断言

### 5.1 强断言

以下行为必须稳定通过：

- 根地址可达
- providers 可达
- 电影搜索有结果
- 详情可返回
- 测试输出目录可写
- 自动整理成功时目录结构正确
- 自动整理失败时影片被跳过

### 5.2 弱断言

以下行为不建议定义为"必须全部成功"：

- 每个演员都必须有头像
- 每张图片都必须下载成功
- 每个 provider 返回字段完全一致

### 5.3 当前推荐

- 演员头像采用：**至少一个演员头像成功**
- 图片文件采用：**主文件存在即认为本轮输出可接受**，403/限流问题另行记录

## 6. 正式问题回灌到测试的流程

当正式运行出现新问题时，不应只修代码，应先判断问题属于哪一类，再决定补什么测试。

### 6.1 纯本地规则问题

例如：
- sidecar 命名错误
- actor-avatar 路径错误
- cache 读写异常
- 日志覆盖失效

优先补：
- 单元测试 / 业务逻辑测试

对应位置：
- `Jvedio.Worker.Tests/BusinessLogicTests/`（VID 解析、Sidecar 路径、扫描整理等）

### 6.2 MetaTube 远程链问题

例如：
- warmup 失败
- movie search 无结果
- actor search 404
- actor detail 为空
- 测试输出目录缺少文件

优先补：
- MetaTube 集成测试

对应位置：
- `Jvedio.Worker.Tests/ContractTests/ScrapeApiTests.cs`

### 6.3 扫描链问题

例如：
- 平铺影片未整理
- 未命中影片没有保留原位
- 结果报告未列出未命中影片
- 整理成功但路径未更新

优先补：
- 扫描链测试

对应位置：
- `Jvedio.Worker.Tests/BusinessLogicTests/ScanOrganizeTests.cs`（文件系统整理规则）
- `Jvedio.Worker.Tests/ContractTests/`（API 端到端扫描导入，如 `ScanImportApiTests.cs`）

补充说明：
- 需要真实文件系统整理结果与导入后路径变更验证的场景，优先放在 `BusinessLogicTests/`。
- 仅验证扫描导入基础状态或 API 格式的场景，优先放在 `ContractTests/`。

### 6.4 UI 层问题

例如：
- 设置页按钮失效
- 文本框内容未保存
- 菜单入口显示异常

处理建议：
- 优先判断是否能下沉为非 UI 测试
- 仅当问题纯粹属于 UI 行为时，才考虑单独补 UI 自动化

## 7. 当前未完全覆盖的目标

虽然当前 52 个测试已经通过，但以下目标仍建议后续逐步补强：

- 多分段视频整理
- actor detail 与别名匹配增强
- 图片下载失败与 403 容错
- 正式扫描链与 MetaTube 主链联动验证
- 正式 sidecar 输出后的读取一致性验证

## 8. 文档更新规则

当测试目标发生变化时，必须更新本文件。

需要更新的情况包括：

- 新功能带来新的测试目标
- 老功能新增新的验收边界
- 强断言 / 弱断言策略变化
- 正式运行中发现新问题并形成新的覆盖目标
