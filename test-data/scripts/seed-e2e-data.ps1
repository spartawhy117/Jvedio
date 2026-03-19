#!/usr/bin/env pwsh
<#
.SYNOPSIS
    E2E 测试数据播种脚本 — 一键准备 Playwright E2E 测试环境。

.DESCRIPTION
    自动执行以下步骤：
    1. 创建 test-data/e2e/ 目录结构
    2. 生成假视频文件（1 KB，不可播放，仅供 VID 解析）
    3. 设置环境变量 (JVEDIO_APP_BASE_DIR / JVEDIO_LOG_DIR)
    4. 启动 Worker 进程并等待 ready 信号
    5. 通过 API 创建媒体库 + 触发扫描
    6. 验证数据入库
    7. 输出 e2e-env.json 供 Playwright 读取

    幂等可重跑：每次执行先重置 E2E 数据目录再重新播种。

.PARAMETER NoPause
    加此开关跳过末尾的 "Press any key"（用于 CI/自动化）。

.PARAMETER SkipWorkerShutdown
    播种完成后不停止 Worker（用于接着跑 Playwright）。

.EXAMPLE
    .\seed-e2e-data.ps1
    .\seed-e2e-data.ps1 -NoPause
    .\seed-e2e-data.ps1 -SkipWorkerShutdown
#>
param(
    [switch]$NoPause,
    [switch]$SkipWorkerShutdown
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── 定位 repo 根目录 ───
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
Write-Host "[seed-e2e] Repo root: $repoRoot" -ForegroundColor Cyan

# ─── Step 1: 创建目录结构 ───
Write-Host "`n[seed-e2e] Step 1: Creating directory structure..." -ForegroundColor Yellow

$e2eRoot = Join-Path $repoRoot "test-data\e2e"
$dirs = @(
    (Join-Path $e2eRoot "videos\lib-a"),
    (Join-Path $e2eRoot "videos\lib-b"),
    (Join-Path $e2eRoot "data\test-user")
)

# 重置 videos 和 data 目录（保留 e2e/ 本身）
foreach ($subDir in @("videos", "data")) {
    $target = Join-Path $e2eRoot $subDir
    if (Test-Path $target) {
        Remove-Item $target -Recurse -Force
        Write-Host "  Cleaned: $subDir/"
    }
}

foreach ($d in $dirs) {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}
Write-Host "  Created: videos/lib-a, videos/lib-b, data/test-user"

# ─── Step 2: 生成假视频文件 ───
Write-Host "`n[seed-e2e] Step 2: Creating fake video files (1 KB each)..." -ForegroundColor Yellow

$fakeFiles = @{
    "videos\lib-a" = @("ABP-001.mp4", "STARS-123.mkv", "IPX-456.mp4")
    "videos\lib-b" = @("FC2-PPV-1234567.mp4", "SSIS-789.mp4")
}

$fileCount = 0
foreach ($relDir in $fakeFiles.Keys) {
    foreach ($fileName in $fakeFiles[$relDir]) {
        $filePath = Join-Path $e2eRoot (Join-Path $relDir $fileName)
        [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
        $fileCount++
    }
}
Write-Host "  Created $fileCount fake video files"

# ─── Step 3: 设置环境变量 ───
Write-Host "`n[seed-e2e] Step 3: Setting environment variables..." -ForegroundColor Yellow

$env:JVEDIO_APP_BASE_DIR = $e2eRoot
$logDir = Join-Path $repoRoot "log\test\e2e"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$env:JVEDIO_LOG_DIR = $logDir

Write-Host "  JVEDIO_APP_BASE_DIR = $env:JVEDIO_APP_BASE_DIR"
Write-Host "  JVEDIO_LOG_DIR      = $env:JVEDIO_LOG_DIR"

# ─── Step 4: 启动 Worker ───
Write-Host "`n[seed-e2e] Step 4: Starting Worker..." -ForegroundColor Yellow

$workerDir = Join-Path $repoRoot "dotnet\Jvedio.Worker"
if (-not (Test-Path (Join-Path $workerDir "Jvedio.Worker.csproj"))) {
    Write-Error "Worker project not found at $workerDir"
    exit 1
}

# 启动 Worker 进程，捕获 stdout
$workerProcess = Start-Process -FilePath "dotnet" `
    -ArgumentList "run", "--configuration", "Release" `
    -WorkingDirectory $workerDir `
    -PassThru `
    -RedirectStandardOutput (Join-Path $e2eRoot "worker-stdout.log") `
    -RedirectStandardError  (Join-Path $e2eRoot "worker-stderr.log") `
    -NoNewWindow

Write-Host "  Worker PID: $($workerProcess.Id)"

# 等待 Worker ready（最多 60 秒）
$timeout = 60
$elapsed = 0
$baseUrl = $null
$stdoutLog = Join-Path $e2eRoot "worker-stdout.log"

while ($elapsed -lt $timeout) {
    Start-Sleep -Seconds 1
    $elapsed++

    if ($workerProcess.HasExited) {
        $stderr = Get-Content (Join-Path $e2eRoot "worker-stderr.log") -Raw -ErrorAction SilentlyContinue
        Write-Error "Worker exited prematurely (exit code: $($workerProcess.ExitCode)). Stderr:`n$stderr"
        exit 1
    }

    if (Test-Path $stdoutLog) {
        $content = Get-Content $stdoutLog -Raw -ErrorAction SilentlyContinue
        if ($content -match "JVEDIO_WORKER_READY\s+(http\S+)") {
            $baseUrl = $Matches[1]
            break
        }
    }
}

if (-not $baseUrl) {
    Write-Error "Worker did not become ready within ${timeout}s. Check $stdoutLog"
    Stop-Process -Id $workerProcess.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-Host "  Worker ready at: $baseUrl" -ForegroundColor Green

# ─── Step 5: API 播种 ───
Write-Host "`n[seed-e2e] Step 5: Seeding data via API..." -ForegroundColor Yellow

$headers = @{ "Content-Type" = "application/json" }

# 创建媒体库 A
$libAPath = (Join-Path $e2eRoot "videos\lib-a").Replace("\", "/")
$bodyA = @{
    name      = "E2E-Lib-A"
    scanPaths = @($libAPath)
} | ConvertTo-Json -Compress

$respA = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" `
    -Headers $headers -Body $bodyA
$libAId = $respA.data.dbId
Write-Host "  Created library A (dbId=$libAId)"

# 创建媒体库 B
$libBPath = (Join-Path $e2eRoot "videos\lib-b").Replace("\", "/")
$bodyB = @{
    name      = "E2E-Lib-B"
    scanPaths = @($libBPath)
} | ConvertTo-Json -Compress

$respB = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" `
    -Headers $headers -Body $bodyB
$libBId = $respB.data.dbId
Write-Host "  Created library B (dbId=$libBId)"

# 触发扫描 A
$scanBody = '{"organizeBeforeScan":true}'
Write-Host "  Scanning library A..."
Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$libAId/scan" `
    -Headers $headers -Body $scanBody | Out-Null
Start-Sleep -Seconds 5

# 触发扫描 B
Write-Host "  Scanning library B..."
Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$libBId/scan" `
    -Headers $headers -Body $scanBody | Out-Null
Start-Sleep -Seconds 5

# ─── Step 6: 验证 ───
Write-Host "`n[seed-e2e] Step 6: Verifying..." -ForegroundColor Yellow

$videosA = Invoke-RestMethod "$baseUrl/api/libraries/$libAId/videos?page=1&pageSize=50"
$countA = $videosA.data.items.Count
$videosB = Invoke-RestMethod "$baseUrl/api/libraries/$libBId/videos?page=1&pageSize=50"
$countB = $videosB.data.items.Count

$sqliteFiles = Get-ChildItem (Join-Path $e2eRoot "data\test-user\*.sqlite") -ErrorAction SilentlyContinue
$logFiles = Get-ChildItem (Join-Path $logDir "runtime\worker-*.log") -ErrorAction SilentlyContinue

$allPass = $true
$checks = @(
    @{ Name = "Library A videos (expect 3)"; Pass = ($countA -eq 3); Actual = $countA },
    @{ Name = "Library B videos (expect 2)"; Pass = ($countB -eq 2); Actual = $countB },
    @{ Name = "SQLite files exist";          Pass = ($sqliteFiles.Count -ge 2); Actual = $sqliteFiles.Count },
    @{ Name = "Log files exist";             Pass = ($logFiles.Count -ge 1); Actual = $logFiles.Count }
)

foreach ($chk in $checks) {
    $icon = if ($chk.Pass) { "✅" } else { "❌"; $allPass = $false }
    Write-Host "  $icon $($chk.Name) — got $($chk.Actual)"
}

# ─── Step 7: 输出 e2e-env.json ───
Write-Host "`n[seed-e2e] Step 7: Writing e2e-env.json..." -ForegroundColor Yellow

$envJson = @{
    baseUrl        = $baseUrl
    workerPid      = $workerProcess.Id
    repoRoot       = $repoRoot
    e2eDataRoot    = $e2eRoot
    logDir         = $logDir
    libraries      = @(
        @{ name = "E2E-Lib-A"; dbId = $libAId; videoCount = $countA },
        @{ name = "E2E-Lib-B"; dbId = $libBId; videoCount = $countB }
    )
    seededAt       = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
} | ConvertTo-Json -Depth 3

$envJsonPath = Join-Path $e2eRoot "e2e-env.json"
Set-Content -Path $envJsonPath -Value $envJson -Encoding UTF8
Write-Host "  Saved: $envJsonPath"

# ─── 可选：停止 Worker ───
if (-not $SkipWorkerShutdown) {
    Write-Host "`n[seed-e2e] Stopping Worker (PID $($workerProcess.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $workerProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  Worker stopped"
}

# ─── 结果汇总 ───
Write-Host ""
if ($allPass) {
    Write-Host "═══════════════════════════════════════" -ForegroundColor Green
    Write-Host "  E2E data seeded successfully! ✅" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════" -ForegroundColor Green
} else {
    Write-Host "═══════════════════════════════════════" -ForegroundColor Red
    Write-Host "  E2E seeding completed with errors ❌" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════" -ForegroundColor Red
}

# 清理临时 stdout/stderr 日志
Remove-Item (Join-Path $e2eRoot "worker-stdout.log") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $e2eRoot "worker-stderr.log") -ErrorAction SilentlyContinue

if (-not $NoPause) {
    Write-Host "`nPress any key to exit..."
    [void][System.Console]::ReadKey($true)
}

exit ([int](-not $allPass))
