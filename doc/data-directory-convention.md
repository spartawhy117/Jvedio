# 数据目录规范

## 1. 文档目的

本文件定义 Jvedio 在不同运行模式下的数据目录结构、路径推断规则和环境变量覆盖机制。

适用场景：
- Release 正式版目录结构参考
- 后端测试 / E2E 测试的路径隔离设计依据
- 新增模块时确认文件应该放在哪里

## 2. Release 正式版目录结构

### 2.1 完整目录树

```
{SharedAppBaseDirectory}/                        ← dotnet/Jvedio/bin/Release（或 JVEDIO_APP_BASE_DIR）
├── Jvedio.exe                                   ← WPF 主程序 / AppBootstrapService 读取版本号
├── data/
│   └── {Windows用户名}/                          ← CurrentUserFolder
│       ├── app_datas.sqlite                     ← 业务数据库（5 张表）
│       ├── app_configs.sqlite                   ← 配置数据库（1 张表）
│       └── cache/
│           └── actor-avatar/                    ← 演员头像缓存
│               ├── {actorId}.jpg
│               └── {sha1-hash}.jpg
│
{repo}/log/runtime/                              ← 日志目录（或 JVEDIO_LOG_DIR/runtime/）
    ├── worker-{yyyy-MM-dd}.log                  ← Worker Serilog 每日滚动，保留 10 天
    └── shell-{yyyy-MM-dd}.log                   ← Tauri Shell 日志，启动时截断
```

视频文件和 Sidecar 文件**不在**上述目录中，它们在用户指定的媒体库扫描路径下（见 §4）。

### 2.2 SQLite 数据库表结构

#### `app_datas.sqlite`（5 张表）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `app_databases` | 媒体库注册信息 | DBId, Name, ScanPaths |
| `metadata` | 视频元数据 | DataID(PK), DBId(=libraryId), Path, Hash(MD5 of path), Size, FirstScanDate, LastScanDate |
| `metadata_video` | 视频扩展信息 | MVID(PK), DataID(FK), VID, Title, Studio, Director, Plot 等 |
| `actor_info` | 演员信息 | ActorId, Name, ImageUrl |
| `metadata_to_actor` | 视频-演员多对多关联 | DataID(FK), ActorId(FK) |

#### `app_configs.sqlite`（1 张表）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `app_configs` | 用户设置键值对 | ConfigId(PK), ConfigName(UNIQUE), ConfigValue, CreateDate, UpdateDate |

所有表由 `WorkerStorageBootstrapper.EnsureInitialized()` 在 Worker 启动时自动创建（`CREATE TABLE IF NOT EXISTS`）。

### 2.3 缓存目录

| 缓存类型 | 路径 | 命名规则 | 写入时机 |
|---------|------|---------|---------|
| 演员头像 | `data/{用户名}/cache/actor-avatar/` | `{actorId}.jpg` 或 `{SHA1(name)}.jpg` | MetaTube 搜刮下载 |

> **注意**：旧版 WPF `PathManager.cs` 中定义了 `cache/video/` 和 `cache/library-image/`，但当前 Worker 端不使用这两个路径。

## 3. 路径推断规则

### 3.1 SharedAppBaseDirectory（数据根目录）

由 `WorkerPathResolver.ResolveSharedAppBaseDirectory()` 推断：

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | `JVEDIO_APP_BASE_DIR` 环境变量 | 必须是已存在的目录 |
| 2 | 从 exe 向上探测 | 向上 3~4 层查找 `Jvedio/bin/Release` 或 `Jvedio/bin/Debug` |
| — | 全部失败 | 抛出 `InvalidOperationException` |

Release 模式下，Worker exe 位于 `{repo}/dotnet/Jvedio.Worker/bin/Release/net8.0/`，向上 4 层到 `{repo}/dotnet/`，拼 `Jvedio/bin/Release` → `SharedAppBaseDirectory` = `{repo}/dotnet/Jvedio/bin/Release`。

### 3.2 CurrentUserFolder（用户目录）

```
{SharedAppBaseDirectory}/data/{Environment.UserName}
```

如果创建失败（权限等原因），fallback 到 `{SharedAppBaseDirectory}/data/`。

### 3.3 日志目录

由 `Program.cs:ResolveLogDirectory()` 推断：

| 优先级 | 来源 | 说明 |
|--------|------|------|
| 1 | `JVEDIO_LOG_DIR` 环境变量 | 自动追加 `runtime/` 子目录 |
| 2 | 从 exe 向上找 repo 根目录 | 查找同时包含 `dotnet/` 和 `tauri/` 的目录 → `{repo}/log/runtime/` |
| 3 | exe 同级目录 | `{exe-dir}/log/runtime/` |

## 4. 视频文件与 Sidecar 目录

### 4.1 扫描目录

用户在 UI 中创建媒体库时指定扫描路径（`scanPaths`），可以是任意本地目录。

### 4.2 扫描整理

默认 `OrganizeBeforeScan = true`，扫描时会把平铺的视频文件整理到以 VID 命名的独立子目录：

```
整理前：                           整理后：
videos/                           videos/
├── ABP-001.mp4                   ├── ABP-001/
├── STARS-123.mkv                 │   └── ABP-001.mp4
└── IPX-456.mp4                   ├── STARS-123/
                                  │   └── STARS-123.mkv
                                  └── IPX-456/
                                      └── IPX-456.mp4
```

整理逻辑（`LibraryScanService.TryOrganize()`）：
1. VID 非空 → 子目录名 = `SanitizeFileName(VID)`；VID 为空 → 子目录名 = 文件名（不含扩展名）
2. 目标目录 = `{视频所在父目录}/{子目录名}/`
3. 如果父目录中只有 ≤1 个视频且已在同名子目录中 → 跳过不动
4. 移动视频文件 + 匹配的字幕文件（`.srt`、`.ass`、`.ssa`、`.sub`、`.vtt`）
5. 目标已有同名文件 → 整理失败，跳过该影片，继续处理后续

### 4.3 Sidecar 文件

搜刮完成后，Sidecar 文件写入视频同目录：

```
ABP-001/
├── ABP-001.mp4              ← 视频文件
├── ABP-001.nfo              ← NFO 元数据（XML）
├── ABP-001-poster.jpg       ← 海报
├── ABP-001-thumb.jpg        ← 缩略图
└── ABP-001-fanart.jpg       ← 背景图
```

命名规则：`{SanitizeFileName(VID)}-{类型}.jpg`，前缀优先级：VID > 文件名 > `"video"`。

### 4.4 VID 解析规则

文件名必须能被 `ExtractVideoId()` 正则解析出合法 VID：

| 正则 | 格式要求 | 示例 |
|------|---------|------|
| **FC2 格式** | `FC2[-_ ]?PPV[-_ ]?\d{3,8}` + 视频扩展名 | `FC2-PPV-1234567.mp4` |
| **通用格式** | `[A-Z]{2,10}[-_ ]?\d{2,5}([-_ ]?[A-Z])?` + 视频扩展名 | `ABP-001.mp4`、`STARS-123.mkv` |

前缀要求 **2~10 个字母**，数字部分 **2~5 位**，可选后缀单字母（如 `-A`）。大小写不敏感。

### 4.5 视频文件扫描要求

| 要求 | 说明 |
|------|------|
| **扩展名** | 必须是 68 种支持的视频扩展名之一（常用 `.mp4`、`.mkv`、`.avi`） |
| **最小大小** | 由 `ScanConfig.MinFileSize` 控制（单位 MB），新建数据库默认值为 0 MB（不过滤） |
| **文件名** | 不含 Windows 非法文件名字符；VID 中的分隔符建议用 `-` |

## 5. 环境变量汇总

| 变量 | 读取位置 | 作用 | 默认 fallback |
|------|---------|------|---------------|
| `JVEDIO_APP_BASE_DIR` | `WorkerPathResolver` | 覆盖数据根目录 | 从 exe 向上探测 `Jvedio/bin/Release` 或 `Debug` |
| `JVEDIO_LOG_DIR` | `Program.cs` | 覆盖日志根目录（自动追加 `runtime/`） | 从 exe 向上找 repo 根 → `{repo}/log/runtime/` |

## 6. 不同运行模式对比

| 维度 | Release 正式版 | 后端测试 | E2E 测试 |
|------|---------------|---------|---------|
| **数据根目录** | `{exe向上探测}/Jvedio/bin/Release` | `{TempDir}/jvedio-test-{guid}` | `{TempDir}/jvedio-e2e/` |
| **路径注入** | 自动探测 | `JVEDIO_APP_BASE_DIR` 环境变量 | `JVEDIO_APP_BASE_DIR` 环境变量 |
| **用户目录** | `data/{Windows用户名}/` | `data/test-user/` | `data/test-user/` |
| **SQLite** | 同上 + `Mode=ReadWriteCreate` | 空文件 → Worker 自动建表 | 空文件 → Worker 自动建表 |
| **日志** | `{repo}/log/runtime/` | 临时目录下，测试后清理 | 临时目录下，测试后清理 |
| **生命周期** | 用户手动关闭 | `[AssemblyCleanup]` 自动清理 | 脚本自动清理 |

> 详细的后端测试数据隔离方案见 `doc/testing/backend/test-plan.md` §5；E2E 测试数据规范见 `doc/testing/e2e/e2e-test-data-spec.md`。

## 7. 关联文档

| 文档 | 位置 |
|------|------|
| 日志规范 | `doc/logging-convention.md` |
| 后端测试计划 | `doc/testing/backend/test-plan.md` |
| E2E 测试数据规范 | `doc/testing/e2e/e2e-test-data-spec.md` |
| 开发总览 | `doc/developer.md` |

## 8. 关键源文件索引

| 文件 | 职责 |
|------|------|
| `dotnet/Jvedio.Worker/Services/WorkerPathResolver.cs` | 数据目录路径推断 |
| `dotnet/Jvedio.Worker/Services/WorkerStorageBootstrapper.cs` | SQLite 建表 |
| `dotnet/Jvedio.Worker/Services/SqliteConnectionFactory.cs` | 数据库连接（`Mode=ReadWriteCreate`） |
| `dotnet/Jvedio.Worker/Program.cs` | 日志目录推断 |
| `dotnet/Jvedio.Worker/Services/LibraryScanService.cs` | 扫描整理逻辑 |
| `dotnet/Jvedio.Worker.Tests/TestBootstrap.cs` | 测试路径隔离 |
