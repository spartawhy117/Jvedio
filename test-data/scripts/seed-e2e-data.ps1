#!/usr/bin/env pwsh
<#
.SYNOPSIS
    E2E 测试数据播种脚本 — 一键准备 Playwright E2E 测试环境。

.DESCRIPTION
    自动执行以下步骤：
    1.   创建 test-data/e2e/ 目录结构
    1.5  读取 test-data/config/test-env.json 测试配置（+ .local.json 覆盖）
    2.   从配置生成假视频文件（1 KB，不可播放，仅供 VID 解析）
    3.   设置环境变量 (JVEDIO_APP_BASE_DIR / JVEDIO_LOG_DIR)
    4.   启动 Worker 进程并等待 ready 信号
    5.   通过 API 创建媒体库 + 触发扫描
    5.5  配置 MetaTube 服务地址
    5.7  触发 MetaTube 抓取（如果 scrapeableVids 非空）
    5.8  等待抓取完成
    5.9  验证抓取结果（标题 / 演员 / sidecar / 头像）
    6.   验证数据入库
    7.   输出 e2e-env.json 供 Playwright 读取

    幂等可重跑：每次执行先重置 E2E 数据目录再重新播种。

.PARAMETER NoPause
    加此开关跳过末尾的 "Press any key"（用于 CI/自动化）。

.PARAMETER SkipWorkerShutdown
    播种完成后不停止 Worker（用于接着跑 Playwright）。

.PARAMETER SkipScrape
    跳过 MetaTube 抓取步骤（不联网，只做扫描播种）。

.EXAMPLE
    .\seed-e2e-data.ps1
    .\seed-e2e-data.ps1 -NoPause
    .\seed-e2e-data.ps1 -SkipWorkerShutdown
    .\seed-e2e-data.ps1 -SkipScrape
#>
param(
    [switch]$NoPause,
    [switch]$SkipWorkerShutdown,
    [switch]$SkipScrape
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

# ─── Step 1.5: 读取测试配置 ───
Write-Host "`n[seed-e2e] Step 1.5: Loading test config..." -ForegroundColor Yellow

$testEnvPath = Join-Path $repoRoot "test-data\config\test-env.json"
if (-not (Test-Path $testEnvPath)) {
    Write-Error "Test config not found: $testEnvPath. Run 9.6.0 first."
    exit 1
}
$testEnv = Get-Content $testEnvPath -Raw | ConvertFrom-Json
Write-Host "  Loaded: $testEnvPath"

# .local.json 覆盖（如果存在）
$localPath = Join-Path $repoRoot "test-data\config\test-env.local.json"
if (Test-Path $localPath) {
    $localEnv = Get-Content $localPath -Raw | ConvertFrom-Json
    # 合并覆盖标量字段
    if ($localEnv.PSObject.Properties["metaTube"]) {
        if ($localEnv.metaTube.PSObject.Properties["serverUrl"]) {
            $testEnv.metaTube.serverUrl = $localEnv.metaTube.serverUrl
        }
        if ($localEnv.metaTube.PSObject.Properties["requestTimeoutSeconds"]) {
            $testEnv.metaTube.requestTimeoutSeconds = $localEnv.metaTube.requestTimeoutSeconds
        }
    }
    # 合并覆盖数组字段（整体替换）
    if ($localEnv.PSObject.Properties["seedVideos"]) {
        $testEnv.seedVideos = $localEnv.seedVideos
    }
    if ($localEnv.PSObject.Properties["scrapeableVids"]) {
        $testEnv.scrapeableVids = $localEnv.scrapeableVids
    }
    Write-Host "  Merged local overrides from: $localPath"
}

$metaTubeUrl = $testEnv.metaTube.serverUrl
$scrapeableVids = @($testEnv.scrapeableVids)
Write-Host "  MetaTube URL: $metaTubeUrl"
Write-Host "  Scrapeable VIDs: $($scrapeableVids -join ', ')"

# ─── Step 2: 从配置生成假视频文件 ───
Write-Host "`n[seed-e2e] Step 2: Creating fake video files (1 KB each) from config..." -ForegroundColor Yellow

$fileCount = 0
foreach ($fileName in $testEnv.seedVideos.libA) {
    $filePath = Join-Path $e2eRoot "videos\lib-a\$fileName"
    [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
    $fileCount++
    Write-Host "  Created: videos/lib-a/$fileName"
}
foreach ($fileName in $testEnv.seedVideos.libB) {
    $filePath = Join-Path $e2eRoot "videos\lib-b\$fileName"
    [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
    $fileCount++
    Write-Host "  Created: videos/lib-b/$fileName"
}
Write-Host "  Total: $fileCount fake video files"

$expectedCountA = @($testEnv.seedVideos.libA).Count
$expectedCountB = @($testEnv.seedVideos.libB).Count

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

# ─── Step 5.5: 配置 MetaTube ───
$scrapeSucceeded = $false

if (-not $SkipScrape -and $scrapeableVids.Count -gt 0) {
    Write-Host "`n[seed-e2e] Step 5.5: Configuring MetaTube..." -ForegroundColor Yellow

    # 通过环境变量传递（Worker 启动前已设置不了，改用 Settings API）
    $settingsBody = @{
        metaTube = @{
            serverUrl             = $metaTubeUrl
            requestTimeoutSeconds = $testEnv.metaTube.requestTimeoutSeconds
        }
    } | ConvertTo-Json -Compress

    try {
        Invoke-RestMethod -Method PUT -Uri "$baseUrl/api/settings" `
            -Headers $headers -Body $settingsBody | Out-Null
        Write-Host "  MetaTube configured: $metaTubeUrl"
    }
    catch {
        Write-Host "  ⚠️ Failed to configure MetaTube: $_" -ForegroundColor DarkYellow
        Write-Host "  Skipping scrape steps." -ForegroundColor DarkYellow
        $SkipScrape = $true
    }

    # ─── Step 5.7: 触发抓取 ───
    if (-not $SkipScrape) {
        Write-Host "`n[seed-e2e] Step 5.7: Triggering MetaTube scrape for library A..." -ForegroundColor Yellow

        $scrapeBody = @{
            mode                 = "missing-only"
            writeSidecars        = $true
            downloadActorAvatars = $true
        } | ConvertTo-Json -Compress

        try {
            Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$libAId/scrape" `
                -Headers $headers -Body $scrapeBody | Out-Null
            Write-Host "  Scrape triggered for library A"

            # ─── Step 5.8: 等待抓取完成 ───
            Write-Host "`n[seed-e2e] Step 5.8: Waiting for scrape to complete (timeout 120s)..." -ForegroundColor Yellow

            $scrapeTimeout = 120
            $scrapeElapsed = 0
            $scrapeComplete = $false

            while ($scrapeElapsed -lt $scrapeTimeout) {
                Start-Sleep -Seconds 3
                $scrapeElapsed += 3

                try {
                    $libStatus = Invoke-RestMethod "$baseUrl/api/libraries/$libAId"
                    $taskStatus = $libStatus.data.taskStatus
                    if ($taskStatus -eq "idle" -or $null -eq $taskStatus) {
                        $scrapeComplete = $true
                        break
                    }
                    Write-Host "  Status: $taskStatus ($scrapeElapsed s)" -NoNewline
                    Write-Host "`r" -NoNewline
                }
                catch {
                    # 轮询出错不终止，继续等待
                }
            }

            if ($scrapeComplete) {
                Write-Host "  Scrape completed in ${scrapeElapsed}s" -ForegroundColor Green

                # ─── Step 5.9: 验证抓取结果 ───
                Write-Host "`n[seed-e2e] Step 5.9: Verifying scrape results..." -ForegroundColor Yellow

                $scrapeSucceeded = $true
                $videosResp = Invoke-RestMethod "$baseUrl/api/libraries/$libAId/videos?page=1&pageSize=50"
                $videos = $videosResp.data.items

                foreach ($vid in $scrapeableVids) {
                    $matched = $videos | Where-Object { $_.vid -eq $vid }
                    if ($matched -and $matched.title) {
                        Write-Host "  ✅ $vid — title: $($matched.title)" -ForegroundColor Green

                        # 验证 scrapeStatus 字段
                        $ss = $matched.scrapeStatus
                        if ($ss -eq "full") {
                            Write-Host "  ✅ $vid — scrapeStatus: full" -ForegroundColor Green
                        }
                        else {
                            Write-Host "  ⚠️ $vid — scrapeStatus: $ss (expected 'full')" -ForegroundColor DarkYellow
                        }
                    }
                    else {
                        Write-Host "  ⚠️ $vid — no title after scrape" -ForegroundColor DarkYellow
                        $scrapeSucceeded = $false
                    }
                }

                # 验证演员
                try {
                    $actorsResp = Invoke-RestMethod "$baseUrl/api/actors?page=1&pageSize=50"
                    $actorCount = $actorsResp.data.items.Count
                    if ($actorCount -ge 1) {
                        Write-Host "  ✅ Actors created: $actorCount" -ForegroundColor Green
                    }
                    else {
                        Write-Host "  ⚠️ No actors found after scrape" -ForegroundColor DarkYellow
                    }
                }
                catch {
                    Write-Host "  ⚠️ Failed to query actors: $_" -ForegroundColor DarkYellow
                }

                # 验证 sidecar 文件（E2E 模式下写入 cache/video/{LibName}/{VID}/）
                foreach ($vid in $scrapeableVids) {
                    $sidecarDir = Join-Path $e2eRoot "data\$env:USERNAME\cache\video\E2E-Lib-A\$vid"
                    $nfoPath = Join-Path $sidecarDir "$vid.nfo"
                    if (Test-Path $nfoPath) {
                        Write-Host "  ✅ Sidecar: $vid.nfo (cache/video/E2E-Lib-A/$vid/)" -ForegroundColor Green
                    }
                    else {
                        # Fallback: check legacy path (video directory) in case Worker hasn't been updated
                        $legacyNfo = Get-ChildItem -Path (Join-Path $e2eRoot "videos\lib-a") -Recurse -Filter "$vid.nfo" -ErrorAction SilentlyContinue
                        if ($legacyNfo) {
                            Write-Host "  ⚠️ Sidecar found at legacy path: $($legacyNfo.FullName)" -ForegroundColor DarkYellow
                        }
                        else {
                            Write-Host "  ⚠️ Sidecar not found: $vid.nfo" -ForegroundColor DarkYellow
                        }
                    }
                }

                # 验证演员头像缓存
                $avatarDir = Join-Path $e2eRoot "data\$env:USERNAME\cache\actor-avatar"
                if (Test-Path $avatarDir) {
                    $avatarFiles = Get-ChildItem $avatarDir -File -ErrorAction SilentlyContinue
                    $avatarCount = if ($avatarFiles) { $avatarFiles.Count } else { 0 }
                    if ($avatarCount -ge 1) {
                        Write-Host "  ✅ Actor avatars cached: $avatarCount" -ForegroundColor Green
                    }
                    else {
                        Write-Host "  ⚠️ No actor avatar files found (weak check)" -ForegroundColor DarkYellow
                    }
                }
                else {
                    Write-Host "  ⚠️ Actor avatar cache dir not created" -ForegroundColor DarkYellow
                }
            }
            else {
                Write-Host "  ⚠️ Scrape did not complete within ${scrapeTimeout}s" -ForegroundColor DarkYellow
            }
        }
        catch {
            Write-Host "  ⚠️ Failed to trigger scrape: $_" -ForegroundColor DarkYellow
            Write-Host "  Continuing without scrape results." -ForegroundColor DarkYellow
        }
    }
}
else {
    if ($SkipScrape) {
        Write-Host "`n[seed-e2e] Skipping MetaTube scrape (-SkipScrape)" -ForegroundColor DarkYellow
    }
    else {
        Write-Host "`n[seed-e2e] Skipping MetaTube scrape (scrapeableVids is empty)" -ForegroundColor DarkYellow
    }
}

# ─── Step 6: 验证 ───
Write-Host "`n[seed-e2e] Step 6: Verifying..." -ForegroundColor Yellow

$videosA = Invoke-RestMethod "$baseUrl/api/libraries/$libAId/videos?page=1&pageSize=50"
$countA = $videosA.data.items.Count
$videosB = Invoke-RestMethod "$baseUrl/api/libraries/$libBId/videos?page=1&pageSize=50"
$countB = $videosB.data.items.Count

$sqliteFiles = Get-ChildItem (Join-Path $e2eRoot "data\*\*.sqlite") -ErrorAction SilentlyContinue
$logFiles = Get-ChildItem (Join-Path $logDir "runtime\worker-*.log") -ErrorAction SilentlyContinue

$allPass = $true
$checks = @(
    @{ Name = "Library A videos (expect $expectedCountA)"; Pass = ($countA -eq $expectedCountA); Actual = $countA },
    @{ Name = "Library B videos (expect $expectedCountB)"; Pass = ($countB -eq $expectedCountB); Actual = $countB },
    @{ Name = "SQLite files exist";                        Pass = ($sqliteFiles.Count -ge 2);     Actual = $sqliteFiles.Count },
    @{ Name = "Log files exist";                           Pass = ($logFiles.Count -ge 1);        Actual = $logFiles.Count }
)

foreach ($chk in $checks) {
    $icon = if ($chk.Pass) { "✅" } else { "❌"; $allPass = $false }
    Write-Host "  $icon $($chk.Name) — got $($chk.Actual)"
}

# ─── Step 7: 输出 e2e-env.json ───
Write-Host "`n[seed-e2e] Step 7: Writing e2e-env.json..." -ForegroundColor Yellow

$envJson = @{
    baseUrl          = $baseUrl
    workerPid        = $workerProcess.Id
    repoRoot         = $repoRoot
    e2eDataRoot      = $e2eRoot
    logDir           = $logDir
    metaTubeUrl      = $metaTubeUrl
    scrapeSucceeded  = $scrapeSucceeded
    libraries        = @(
        @{ name = "E2E-Lib-A"; dbId = $libAId; videoCount = $countA },
        @{ name = "E2E-Lib-B"; dbId = $libBId; videoCount = $countB }
    )
    seededAt         = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
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
    if ($scrapeSucceeded) {
        Write-Host "  MetaTube scrape: ✅ succeeded" -ForegroundColor Green
    }
    elseif (-not $SkipScrape -and $scrapeableVids.Count -gt 0) {
        Write-Host "  MetaTube scrape: ⚠️ partial/failed" -ForegroundColor DarkYellow
    }
    else {
        Write-Host "  MetaTube scrape: ⏭️ skipped" -ForegroundColor DarkYellow
    }
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
