# E2E 测试数据规范

## 1. 文档目的

定义 Playwright E2E 测试的数据目录、假视频文件和播种流程。

关联文档：
- 数据目录总体规范（路径推断、SQLite 表结构、Sidecar 规则）：`doc/data-directory-convention.md`
- E2E 执行方案：`doc/testing/e2e/playwright-e2e-test-plan.md`
- E2E 用例清单：`doc/testing/e2e/playwright-e2e-test-cases.md`

## 2. 目录结构

E2E 测试数据统一放在 `{repo}/test-data/e2e/`，直接提交到 git：

```
{repo}/test-data/e2e/
├── data/
│   └── test-user/                 ← Worker 用户目录（JVEDIO_APP_BASE_DIR 指向上级 e2e/）
│       ├── app_datas.sqlite       ← Worker 自动建表
│       └── app_configs.sqlite     ← Worker 自动建表
└── videos/
    ├── lib-a/                     ← 媒体库 A
    │   ├── ABP-001.mp4
    │   ├── STARS-123.mkv
    │   └── IPX-456.mp4
    └── lib-b/                     ← 媒体库 B
        ├── FC2-PPV-1234567.mp4
        └── SSIS-789.mp4
```

> 多台电脑 `git pull` 后即可直接使用，无需重新播种。

## 3. 假视频文件清单

| 文件名 | 所属库 | 预期 VID | 大小 | 用途 |
|--------|--------|---------|------|------|
| `ABP-001.mp4` | lib-a | `ABP-001` | 1 KB | 标准 VID |
| `STARS-123.mkv` | lib-a | `STARS-123` | 1 KB | 不同扩展名 |
| `IPX-456.mp4` | lib-a | `IPX-456` | 1 KB | 收藏操作目标 |
| `FC2-PPV-1234567.mp4` | lib-b | `FC2-PPV-1234567` | 1 KB | FC2 格式 VID |
| `SSIS-789.mp4` | lib-b | `SSIS-789` | 1 KB | 收藏操作目标 |

文件要求：
- 内容为任意二进制（`new byte[1024]` 即可），不需要可播放
- 扩展名必须是支持的视频格式（`.mp4`、`.mkv` 等）
- 文件名必须能被 `ExtractVideoId()` 解析出合法 VID（规则见 `data-directory-convention.md` §4.4）

## 4. E2E 测试数据配置指南

**目标**：按以下步骤操作，开发者不看其他文档也能完成 E2E 测试数据的配置。

### 步骤 1：确认假视频文件就位

```powershell
# 在 repo 根目录执行
ls test-data/e2e/videos/lib-a/   # 应看到 ABP-001.mp4、STARS-123.mkv、IPX-456.mp4
ls test-data/e2e/videos/lib-b/   # 应看到 FC2-PPV-1234567.mp4、SSIS-789.mp4
```

如果文件不存在，手动创建（每个 1024 字节即可）：

```powershell
$dirs = @("test-data/e2e/videos/lib-a", "test-data/e2e/videos/lib-b", "test-data/e2e/data/test-user")
$dirs | ForEach-Object { New-Item -ItemType Directory -Path $_ -Force }

$libA = @("ABP-001.mp4", "STARS-123.mkv", "IPX-456.mp4")
$libB = @("FC2-PPV-1234567.mp4", "SSIS-789.mp4")
$libA | ForEach-Object { [System.IO.File]::WriteAllBytes("test-data/e2e/videos/lib-a/$_", [byte[]]::new(1024)) }
$libB | ForEach-Object { [System.IO.File]::WriteAllBytes("test-data/e2e/videos/lib-b/$_", [byte[]]::new(1024)) }
```

### 步骤 2：设置环境变量

启动 Worker 前设置两个环境变量，将数据和日志重定向到测试目录：

```powershell
$repoRoot = (Get-Location).Path                            # 确保在 repo 根目录
$env:JVEDIO_APP_BASE_DIR = "$repoRoot\test-data\e2e"       # 数据根目录
$env:JVEDIO_LOG_DIR = "$repoRoot\log\test\e2e"             # 日志根目录
```

| 变量 | 指向 | 作用 |
|------|------|------|
| `JVEDIO_APP_BASE_DIR` | `{repo}/test-data/e2e` | Worker 从此路径读写 `data/test-user/*.sqlite` |
| `JVEDIO_LOG_DIR` | `{repo}/log/test/e2e` | Worker 日志写入此处（自动追加 `runtime/` 子目录） |

### 步骤 3：启动 Worker

```powershell
cd dotnet/Jvedio.Worker
dotnet run --configuration Release
# 等待 stdout 输出 "JVEDIO_WORKER_READY http://127.0.0.1:{port}"
```

Worker 启动时 `StorageBootstrapper` 会在 `test-data/e2e/data/test-user/` 下自动建表。

### 步骤 4：通过 API 播种数据

```powershell
$baseUrl = "http://127.0.0.1:{port}"   # 替换为实际端口

# 创建媒体库 A
$libA = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" `
  -ContentType "application/json" `
  -Body '{"name":"E2E-Lib-A","scanPaths":["REPO_ROOT/test-data/e2e/videos/lib-a"]}'

# 创建媒体库 B
$libB = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" `
  -ContentType "application/json" `
  -Body '{"name":"E2E-Lib-B","scanPaths":["REPO_ROOT/test-data/e2e/videos/lib-b"]}'

# 触发扫描（会自动整理到 VID 子目录）
Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$($libA.data.dbId)/scan" `
  -ContentType "application/json" -Body '{"organizeBeforeScan":true}'
Start-Sleep -Seconds 5

Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$($libB.data.dbId)/scan" `
  -ContentType "application/json" -Body '{"organizeBeforeScan":true}'
Start-Sleep -Seconds 5
```

> 将上面的 `REPO_ROOT` 替换为你的实际 repo 绝对路径。

### 步骤 5：验证配置成功

```powershell
# 检查影片入库
$videosA = Invoke-RestMethod "$baseUrl/api/libraries/$($libA.data.dbId)/videos?page=1&pageSize=50"
Write-Host "库 A 影片数: $($videosA.data.items.Count)"   # 应为 3

$videosB = Invoke-RestMethod "$baseUrl/api/libraries/$($libB.data.dbId)/videos?page=1&pageSize=50"
Write-Host "库 B 影片数: $($videosB.data.items.Count)"   # 应为 2

# 检查 SQLite 文件
ls test-data/e2e/data/test-user/*.sqlite                   # 应有 2 个文件

# 检查日志
ls log/test/e2e/runtime/                                   # 应有 worker-*.log
```

验证通过的标志：
- ✅ 库 A 有 3 部影片、库 B 有 2 部影片
- ✅ `test-data/e2e/data/test-user/` 下有 `app_datas.sqlite` 和 `app_configs.sqlite`
- ✅ `log/test/e2e/runtime/` 下有日志文件
- ✅ 假视频已被整理到 VID 子目录（如 `lib-a/ABP-001/ABP-001.mp4`）

## 5. 扫描后目录变化

扫描时 `OrganizeBeforeScan = true` 会自动整理：

```
扫描前：                              扫描后：
videos/lib-a/                        videos/lib-a/
├── ABP-001.mp4                      ├── ABP-001/ABP-001.mp4
├── STARS-123.mkv                    ├── STARS-123/STARS-123.mkv
└── IPX-456.mp4                      └── IPX-456/IPX-456.mp4
```

整理逻辑细节见 `doc/data-directory-convention.md` §4.2。

## 6. 播种脚本（自动化）

**脚本位置**：`test-data/scripts/seed-e2e-data.ps1`（幂等可重跑）

脚本一键完成以下全部步骤：

| 步骤 | 动作 |
|------|------|
| 1 | 创建 `test-data/e2e/` 目录结构（每次先清空 `videos/` 和 `data/`） |
| 2 | 生成 5 个假视频文件（各 1 KB） |
| 3 | 设置 `JVEDIO_APP_BASE_DIR` / `JVEDIO_LOG_DIR` 环境变量 |
| 4 | 启动 Worker 并等待 `JVEDIO_WORKER_READY` 信号（超时 60s） |
| 5 | 通过 API 创建 2 个媒体库 + 触发扫描 |
| 6 | 验证数据入库（库 A=3 部、库 B=2 部、SQLite 存在、日志存在） |
| 7 | 输出 `test-data/e2e/e2e-env.json`（含 baseUrl、PID、库 ID 等）供 Playwright 读取 |

```powershell
# 基本用法（播种后停止 Worker）
.\test-data\scripts\seed-e2e-data.ps1

# CI / 自动化（跳过 "Press any key"）
.\test-data\scripts\seed-e2e-data.ps1 -NoPause

# 播种后保持 Worker 运行（接着跑 Playwright）
.\test-data\scripts\seed-e2e-data.ps1 -SkipWorkerShutdown
```

## 7. 测试后清理

**脚本位置**：`test-data/scripts/cleanup-e2e-data.ps1`

清理脚本自动执行：

| 步骤 | 动作 |
|------|------|
| 1 | 停止 Worker 进程（从 `e2e-env.json` 读 PID，或按进程名查找） |
| 2 | `git checkout` 重置 `test-data/e2e/data/` 和 `videos/`（撤销扫描整理） |
| 3 | 清除 `JVEDIO_APP_BASE_DIR` / `JVEDIO_LOG_DIR` 环境变量 |
| 4 | （可选）清理 `log/test/e2e/` 日志 |

```powershell
# 基本用法
.\test-data\scripts\cleanup-e2e-data.ps1

# 同时清理日志
.\test-data\scripts\cleanup-e2e-data.ps1 -CleanLogs

# CI / 自动化
.\test-data\scripts\cleanup-e2e-data.ps1 -NoPause -CleanLogs
```

## 8. 维护规则

- 假视频文件清单变化时，同步更新 §3 和 §5
- 播种脚本变化时，同步更新 §6
- 目录结构变化时，先更新 `data-directory-convention.md`，再更新本文件 §2
