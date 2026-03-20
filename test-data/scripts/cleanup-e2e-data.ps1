#!/usr/bin/env pwsh
<#
.SYNOPSIS
    E2E 测试数据清理脚本 — 重置 E2E 测试环境到基线状态。

.DESCRIPTION
    自动执行以下步骤：
    1. 停止 Worker 进程（通过 e2e-env.json 中的 PID 或按名称查找）
    2. 用 git checkout 重置 test-data/e2e/ 到基线版本（撤销扫描整理）
    3. 清除 E2E 相关环境变量
    4. 可选：清除 E2E 测试日志

.PARAMETER NoPause
    加此开关跳过末尾的 "Press any key"（用于 CI/自动化）。

.PARAMETER CleanLogs
    加此开关同时清理 log/test/e2e/ 下的日志文件。

.EXAMPLE
    .\cleanup-e2e-data.ps1
    .\cleanup-e2e-data.ps1 -CleanLogs
    .\cleanup-e2e-data.ps1 -NoPause -CleanLogs
#>
param(
    [switch]$NoPause,
    [switch]$CleanLogs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# ─── 定位 repo 根目录 ───
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
Write-Host "[cleanup-e2e] Repo root: $repoRoot" -ForegroundColor Cyan

$e2eRoot = Join-Path $repoRoot "test-data\e2e"
$envJsonPath = Join-Path $e2eRoot "e2e-env.json"

# ─── Step 1: 停止 Worker ───
Write-Host "`n[cleanup-e2e] Step 1: Stopping Worker process..." -ForegroundColor Yellow

$workerStopped = $false

# 尝试从 e2e-env.json 读取 PID
if (Test-Path $envJsonPath) {
    try {
        $envData = Get-Content $envJsonPath -Raw | ConvertFrom-Json
        $workerProcessId = $envData.workerPid
        if ($workerProcessId) {
            $proc = Get-Process -Id $workerProcessId -ErrorAction SilentlyContinue
            if ($proc -and -not $proc.HasExited) {
                Stop-Process -Id $workerProcessId -Force
                Write-Host "  Stopped Worker (PID $workerProcessId from e2e-env.json)"
                $workerStopped = $true
            } else {
                Write-Host "  Worker PID $workerProcessId already exited"
                $workerStopped = $true
            }
        }
    } catch {
        Write-Host "  Could not read e2e-env.json: $_" -ForegroundColor DarkYellow
    }
}

# 备用：按进程名查找
if (-not $workerStopped) {
    $dotnetProcs = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*Jvedio.Worker*" }
    if ($dotnetProcs) {
        foreach ($p in $dotnetProcs) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  Stopped dotnet process (PID $($p.Id))"
        }
    } else {
        Write-Host "  No Worker process found (already stopped)"
    }
}

# ─── Step 2: 重置 E2E 数据 ───
Write-Host "`n[cleanup-e2e] Step 2: Resetting E2E data to baseline..." -ForegroundColor Yellow

Push-Location $repoRoot
try {
    # 重置 SQLite 数据库到 git 基线
    & git checkout -- "test-data/e2e/data/" 2>$null
    Write-Host "  Reset: test-data/e2e/data/ (SQLite databases)"

    # 清理 cache 目录（不被 git 跟踪，需要显式删除）
    $cacheDir = Join-Path $e2eRoot "data"
    Get-ChildItem -Path $cacheDir -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $userCacheDir = Join-Path $_.FullName "cache"
        if (Test-Path $userCacheDir) {
            Remove-Item $userCacheDir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Host "  Removed: data/$($_.Name)/cache/ (sidecar + avatar cache)"
        }
    }

    # 重置假视频文件到扫描前状态
    & git checkout -- "test-data/e2e/videos/" 2>$null
    Write-Host "  Reset: test-data/e2e/videos/ (undo scan organize)"

    # 删除 e2e-env.json（播种产物）
    if (Test-Path $envJsonPath) {
        Remove-Item $envJsonPath -Force
        Write-Host "  Removed: e2e-env.json"
    }

    # 删除 Worker 临时日志
    foreach ($tmpLog in @("worker-stdout.log", "worker-stderr.log")) {
        $p = Join-Path $e2eRoot $tmpLog
        if (Test-Path $p) { Remove-Item $p -Force }
    }
} finally {
    Pop-Location
}

# ─── Step 3: 清除环境变量 ───
Write-Host "`n[cleanup-e2e] Step 3: Clearing environment variables..." -ForegroundColor Yellow

Remove-Item Env:JVEDIO_APP_BASE_DIR -ErrorAction SilentlyContinue
Remove-Item Env:JVEDIO_LOG_DIR -ErrorAction SilentlyContinue
Write-Host "  Cleared: JVEDIO_APP_BASE_DIR, JVEDIO_LOG_DIR"

# ─── Step 4（可选）: 清理日志 ───
if ($CleanLogs) {
    Write-Host "`n[cleanup-e2e] Step 4: Cleaning E2E logs..." -ForegroundColor Yellow
    $e2eLogDir = Join-Path $repoRoot "log\test\e2e"
    if (Test-Path $e2eLogDir) {
        Remove-Item $e2eLogDir -Recurse -Force
        Write-Host "  Removed: log/test/e2e/"
    } else {
        Write-Host "  No E2E logs found"
    }
} else {
    Write-Host "`n[cleanup-e2e] Step 4: Skipping log cleanup (use -CleanLogs to enable)" -ForegroundColor DarkGray
}

# ─── 结果汇总 ───
Write-Host ""
Write-Host "═════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  E2E environment cleaned successfully! ✅" -ForegroundColor Green
Write-Host "═════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "To re-seed, run:" -ForegroundColor DarkGray
Write-Host "  .\scripts\seed-e2e-data.ps1" -ForegroundColor DarkGray

if (-not $NoPause -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
    Write-Host "`nPress any key to exit..."
    try {
        [void][System.Console]::ReadKey($true)
    }
    catch {
    }
}

