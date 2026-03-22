#!/usr/bin/env pwsh
<#
.SYNOPSIS
    E2E 测试数据播种脚本 - 一键准备 Playwright E2E 测试环境。

.DESCRIPTION
    自动执行以下步骤：
    1.   创建 test-data/e2e/ 目录结构
    1.5  读取 test-data/config/test-env.json 测试配置（+ .local.json 覆盖）
    2.   从配置生成假视频文件（1 KB，不可播放，仅供 VID 解析）
    3.   设置环境变量 (JVEDIO_APP_BASE_DIR / JVEDIO_LOG_DIR)
    4.   启动 Worker 进程并等待 ready 信号
    5.   通过 API 创建媒体库 + 触发扫描
    5.5  配置 MetaTube 服务地址
    5.7  对两个媒体库触发 MetaTube 抓取
    5.8  通过任务接口等待扫描 / 抓取完成
    5.9  验证抓取结果（标题 / 演员 / sidecar / 头像 / 失败样本）
    6.   验证数据入库
    7.   输出 e2e-env.json 供后续脚本读取

    幂等可重跑：每次执行先重置 E2E 数据目录再重新播种。

.PARAMETER NoPause
    加此开关跳过末尾的 "Press any key"（用于 CI/自动化）。

.PARAMETER SkipWorkerShutdown
    播种完成后不停止 Worker（用于接着跑 verify-backend-apis.ps1）。

.PARAMETER SkipScrape
    跳过 MetaTube 抓取步骤（不联网，只做扫描播种）。
#>
param(
    [switch]$NoPause,
    [switch]$SkipWorkerShutdown,
    [switch]$SkipScrape
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Test-HasProperty {
    param(
        $Object,
        [string]$Name
    )

    return $null -ne $Object -and $Object.PSObject.Properties.Name -contains $Name
}

function Get-RequiredProperty {
    param(
        $Object,
        [string]$Name,
        [string]$Context
    )

    if (-not (Test-HasProperty $Object $Name)) {
        throw "$Context is missing property '$Name'."
    }

    $value = $Object.$Name
    if ($null -eq $value) {
        throw "$Context has null property '$Name'."
    }

    return $value
}

function Get-ApiData {
    param(
        $Response,
        [string]$Context
    )

    if (-not (Test-HasProperty $Response "success") -or -not $Response.success) {
        throw "$Context returned an unsuccessful API response."
    }

    return Get-RequiredProperty $Response "data" $Context
}

function Normalize-SeedVideoFileName {
    param([string]$FileName)

    $trimmed = $FileName.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
        throw "Seed video file name cannot be empty."
    }

    if ([string]::IsNullOrWhiteSpace([System.IO.Path]::GetExtension($trimmed))) {
        return "$trimmed.mp4"
    }

    return $trimmed
}

function Get-ExpectedVidFromSeed {
    param([string]$ConfiguredFileName)

    $normalizedFileName = Normalize-SeedVideoFileName $ConfiguredFileName
    $fileName = [System.IO.Path]::GetFileNameWithoutExtension($normalizedFileName).ToUpperInvariant()

    $fc2Match = [regex]::Match($fileName, '(?<prefix>FC2)[-_ ]?(?<middle>PPV)[-_ ]?(?<number>\d{3,8})')
    if ($fc2Match.Success) {
        return "$($fc2Match.Groups['prefix'].Value)-$($fc2Match.Groups['middle'].Value)-$($fc2Match.Groups['number'].Value)"
    }

    $generalMatch = [regex]::Match($fileName, '(?<prefix>[A-Z]{2,10})[-_ ]?(?<number>\d{2,5})(?:[-_ ]?(?<suffix>[A-Z]))?')
    if (-not $generalMatch.Success) {
        return $null
    }

    if ($generalMatch.Groups['suffix'].Success -and -not [string]::IsNullOrWhiteSpace($generalMatch.Groups['suffix'].Value)) {
        return "$($generalMatch.Groups['prefix'].Value)-$($generalMatch.Groups['number'].Value)-$($generalMatch.Groups['suffix'].Value)"
    }

    return "$($generalMatch.Groups['prefix'].Value)-$($generalMatch.Groups['number'].Value)"
}

function Wait-WorkerTask {
    param(
        [string]$BaseUrl,
        [string]$TaskId,
        [string]$Label,
        [int]$TimeoutSeconds = 180
    )

    $elapsed = 0
    while ($elapsed -lt $TimeoutSeconds) {
        Start-Sleep -Seconds 2
        $elapsed += 2

        try {
            $taskResp = Invoke-RestMethod "$BaseUrl/api/tasks/$TaskId"
            $taskData = Get-ApiData $taskResp "GET /api/tasks/$TaskId"
            $task = Get-RequiredProperty $taskData "task" "GET /api/tasks/$TaskId data"
            if ($null -eq $task) {
                continue
            }

            $status = (Get-RequiredProperty $task "status" "task $TaskId").ToString().ToLowerInvariant()
            $stage = if (Test-HasProperty $task "stage") { $task.stage } else { "" }
            Write-Host "  $Label status: $status/$stage (${elapsed}s)" -NoNewline
            Write-Host "`r" -NoNewline

            if ($status -in @("succeeded", "failed", "canceled")) {
                Write-Host ""
                return $task
            }
        }
        catch {
            # transient poll errors should not abort the whole seeding flow
        }
    }

    throw "$Label did not complete within ${TimeoutSeconds}s."
}

function Find-VideoByVid {
    param(
        [object[]]$Items,
        [string]$Vid
    )

    $normalizedVid = $Vid.ToUpperInvariant()
    return @($Items | Where-Object { $_.vid -and $_.vid.ToUpperInvariant() -eq $normalizedVid }) | Select-Object -First 1
}

function Get-LibraryVideoItems {
    param(
        [string]$BaseUrl,
        [string]$LibraryId
    )

    $resp = Invoke-RestMethod "$BaseUrl/api/libraries/$LibraryId/videos?page=1&pageSize=200&sortBy=vid&sortOrder=asc"
    $data = Get-ApiData $resp "GET /api/libraries/$LibraryId/videos"
    return @((Get-RequiredProperty $data "items" "library $LibraryId videos data"))
}

function Get-VideoDetail {
    param(
        [string]$BaseUrl,
        [string]$VideoId
    )

    $resp = Invoke-RestMethod "$BaseUrl/api/videos/$VideoId"
    $data = Get-ApiData $resp "GET /api/videos/$VideoId"
    return Get-RequiredProperty $data "video" "GET /api/videos/$VideoId data"
}

function Add-ValidationResult {
    param(
        [ref]$Results,
        [string]$Name,
        [bool]$Pass,
        [string]$Detail
    )

    $Results.Value += [pscustomobject]@{
        Name = $Name
        Pass = $Pass
        Detail = $Detail
    }
}

# --- 定位 repo 根目录 ---
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
Write-Host "[seed-e2e] Repo root: $repoRoot" -ForegroundColor Cyan

# --- Step 1: 创建目录结构 ---
Write-Host "`n[seed-e2e] Step 1: Creating directory structure..." -ForegroundColor Yellow

$e2eRoot = Join-Path $repoRoot "test-data\e2e"
$effectiveUserName = "test-user"
$userDataRoot = Join-Path $e2eRoot "data\$effectiveUserName"
$videoCacheRoot = Join-Path $userDataRoot "cache\video"
$actorAvatarCacheRoot = Join-Path $userDataRoot "cache\actor-avatar"

$dirs = @(
    (Join-Path $e2eRoot "videos\lib-a"),
    (Join-Path $e2eRoot "videos\lib-b"),
    $userDataRoot
)

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
Write-Host "  Created: videos/lib-a, videos/lib-b, data/$effectiveUserName"

# --- Step 1.5: 读取测试配置 ---
Write-Host "`n[seed-e2e] Step 1.5: Loading test config..." -ForegroundColor Yellow

$testEnvPath = Join-Path $repoRoot "test-data\config\test-env.json"
if (-not (Test-Path $testEnvPath)) {
    Write-Error "Test config not found: $testEnvPath"
    exit 1
}

$testEnv = Get-Content $testEnvPath -Raw | ConvertFrom-Json
Write-Host "  Loaded: $testEnvPath"

$localPath = Join-Path $repoRoot "test-data\config\test-env.local.json"
if (Test-Path $localPath) {
    $localEnv = Get-Content $localPath -Raw | ConvertFrom-Json
    if ($localEnv.PSObject.Properties["metaTube"]) {
        if ($localEnv.metaTube.PSObject.Properties["serverUrl"]) {
            $testEnv.metaTube.serverUrl = $localEnv.metaTube.serverUrl
        }
        if ($localEnv.metaTube.PSObject.Properties["requestTimeoutSeconds"]) {
            $testEnv.metaTube.requestTimeoutSeconds = $localEnv.metaTube.requestTimeoutSeconds
        }
    }
    if ($localEnv.PSObject.Properties["seedVideos"]) {
        $testEnv.seedVideos = $localEnv.seedVideos
    }
    if ($localEnv.PSObject.Properties["scrapeableVids"]) {
        $testEnv.scrapeableVids = $localEnv.scrapeableVids
    }
    Write-Host "  Merged local overrides from: $localPath"
}

$metaTubeUrl = $testEnv.metaTube.serverUrl
$scrapeableVids = @($testEnv.scrapeableVids | ForEach-Object { $_.Trim().ToUpperInvariant() })
$libASeeds = @($testEnv.seedVideos.libA | ForEach-Object {
    [pscustomobject]@{
        ConfiguredName = $_
        FileName = Normalize-SeedVideoFileName $_
        ExpectedVid = Get-ExpectedVidFromSeed $_
    }
})
$libBSeeds = @($testEnv.seedVideos.libB | ForEach-Object {
    [pscustomobject]@{
        ConfiguredName = $_
        FileName = Normalize-SeedVideoFileName $_
        ExpectedVid = Get-ExpectedVidFromSeed $_
    }
})
$allSeedExpectations = @($libASeeds + $libBSeeds)
$failureExpectation = @($allSeedExpectations | Where-Object { $_.ExpectedVid -like 'FC2-PPV-*' }) | Select-Object -First 1
$recognizedExpectation = @($allSeedExpectations | Where-Object { $_.ExpectedVid -eq 'SDDE-660-C' }) | Select-Object -First 1

Write-Host "  MetaTube URL: $metaTubeUrl"
Write-Host "  Scrapeable VIDs: $($scrapeableVids -join ', ')"

# --- Step 2: 从配置生成假视频文件 ---
Write-Host "`n[seed-e2e] Step 2: Creating fake video files (1 KB each) from config..." -ForegroundColor Yellow

$fileCount = 0
foreach ($seed in $libASeeds) {
    $filePath = Join-Path $e2eRoot "videos\lib-a\$($seed.FileName)"
    [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
    $fileCount++
    Write-Host "  Created: videos/lib-a/$($seed.FileName)"
}
foreach ($seed in $libBSeeds) {
    $filePath = Join-Path $e2eRoot "videos\lib-b\$($seed.FileName)"
    [System.IO.File]::WriteAllBytes($filePath, [byte[]]::new(1024))
    $fileCount++
    Write-Host "  Created: videos/lib-b/$($seed.FileName)"
}
Write-Host "  Total: $fileCount fake video files"

$expectedCountA = $libASeeds.Count
$expectedCountB = $libBSeeds.Count

# --- Step 3: 设置环境变量 ---
Write-Host "`n[seed-e2e] Step 3: Setting environment variables..." -ForegroundColor Yellow

$env:JVEDIO_APP_BASE_DIR = $e2eRoot
$logDir = Join-Path $repoRoot "log\test\e2e"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$env:JVEDIO_LOG_DIR = $logDir
$env:JVEDIO_METATUBE_SERVER_URL = $metaTubeUrl

Write-Host "  JVEDIO_APP_BASE_DIR = $env:JVEDIO_APP_BASE_DIR"
Write-Host "  JVEDIO_LOG_DIR      = $env:JVEDIO_LOG_DIR"
Write-Host "  JVEDIO_METATUBE_SERVER_URL = $env:JVEDIO_METATUBE_SERVER_URL"

# --- Step 4: 启动 Worker ---
Write-Host "`n[seed-e2e] Step 4: Starting Worker..." -ForegroundColor Yellow

$workerDir = Join-Path $repoRoot "dotnet\Jvedio.Worker"
if (-not (Test-Path (Join-Path $workerDir "Jvedio.Worker.csproj"))) {
    Write-Error "Worker project not found at $workerDir"
    exit 1
}

$workerProcess = Start-Process -FilePath "dotnet" `
    -ArgumentList "run", "--configuration", "Release" `
    -WorkingDirectory $workerDir `
    -PassThru `
    -RedirectStandardOutput (Join-Path $e2eRoot "worker-stdout.log") `
    -RedirectStandardError (Join-Path $e2eRoot "worker-stderr.log") `
    -NoNewWindow

Write-Host "  Worker PID: $($workerProcess.Id)"

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

# --- Step 4.5: 配置 MetaTube（当前扫描任务已内含抓取） ---
if (-not $SkipScrape -and $scrapeableVids.Count -gt 0) {
    Write-Host "`n[seed-e2e] Step 4.5: Configuring MetaTube..." -ForegroundColor Yellow

    try {
        $settingsResp = Invoke-RestMethod "$baseUrl/api/settings"
        $settingsData = Get-ApiData $settingsResp "GET /api/settings"
        $settingsBody = @{
            general = $settingsData.general
            scanImport = $settingsData.scanImport
            playback = $settingsData.playback
            library = $settingsData.library
            metaTube = @{
                serverUrl = $metaTubeUrl
                requestTimeoutSeconds = [int]$testEnv.metaTube.requestTimeoutSeconds
            }
        } | ConvertTo-Json -Depth 10 -Compress

        Invoke-RestMethod -Method PUT -Uri "$baseUrl/api/settings" -Headers @{ "Content-Type" = "application/json" } -Body $settingsBody | Out-Null
        Write-Host "  MetaTube configured: $metaTubeUrl"
    }
    catch {
        Write-Host "  Failed to configure MetaTube: $_" -ForegroundColor Red
        throw
    }
}

# --- Step 5: API 播种 ---
Write-Host "`n[seed-e2e] Step 5: Seeding data via API..." -ForegroundColor Yellow

$headers = @{ "Content-Type" = "application/json" }

$libAPath = (Join-Path $e2eRoot "videos\lib-a").Replace("\", "/")
$libBPath = (Join-Path $e2eRoot "videos\lib-b").Replace("\", "/")

$bodyA = @{
    name = "E2E-Lib-A"
    scanPaths = @($libAPath)
} | ConvertTo-Json -Compress

$respA = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" -Headers $headers -Body $bodyA
$dataA = Get-ApiData $respA "POST /api/libraries (A)"
$libA = Get-RequiredProperty $dataA "library" "POST /api/libraries (A) data"
$libAId = Get-RequiredProperty $libA "libraryId" "library A"
Write-Host "  Created library A (libraryId=$libAId)"

$bodyB = @{
    name = "E2E-Lib-B"
    scanPaths = @($libBPath)
} | ConvertTo-Json -Compress

$respB = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries" -Headers $headers -Body $bodyB
$dataB = Get-ApiData $respB "POST /api/libraries (B)"
$libB = Get-RequiredProperty $dataB "library" "POST /api/libraries (B) data"
$libBId = Get-RequiredProperty $libB "libraryId" "library B"
Write-Host "  Created library B (libraryId=$libBId)"

$scanBody = @{ organizeBeforeScan = $true } | ConvertTo-Json -Compress
$libraries = @(
    @{ Name = "E2E-Lib-A"; Id = $libAId; Path = $libAPath },
    @{ Name = "E2E-Lib-B"; Id = $libBId; Path = $libBPath }
)

foreach ($library in $libraries) {
    Write-Host "  Scanning $($library.Name)..."
    $scanResp = Invoke-RestMethod -Method POST -Uri "$baseUrl/api/libraries/$($library.Id)/scan" -Headers $headers -Body $scanBody
    $scanData = Get-ApiData $scanResp "POST /api/libraries/$($library.Id)/scan"
    $scanTask = Get-RequiredProperty $scanData "task" "scan data for $($library.Name)"
    $scanTaskId = Get-RequiredProperty $scanTask "id" "scan task for $($library.Name)"
    $scanResult = Wait-WorkerTask -BaseUrl $baseUrl -TaskId $scanTaskId -Label "$($library.Name) scan" -TimeoutSeconds 180
    $scanStatus = $scanResult.status.ToLowerInvariant()
    if ($scanStatus -ne "succeeded") {
        $errorMessage = if (Test-HasProperty $scanResult "errorMessage") { $scanResult.errorMessage } else { "" }
        throw "$($library.Name) scan failed with status '$scanStatus'. $errorMessage"
    }
}

$scrapeSucceeded = $false
$validationResults = @()
$actorsFound = 0

if (-not $SkipScrape -and $scrapeableVids.Count -gt 0) {
    Write-Host "`n[seed-e2e] Step 5.5: Verifying scrape results..." -ForegroundColor Yellow

    $videosAItems = Get-LibraryVideoItems -BaseUrl $baseUrl -LibraryId $libAId
    $videosBItems = Get-LibraryVideoItems -BaseUrl $baseUrl -LibraryId $libBId
    $allVideos = @($videosAItems + $videosBItems)
    $libraryNamesById = @{
        $libAId = "E2E-Lib-A"
        $libBId = "E2E-Lib-B"
    }

    $expectedSuccessfulDetails = @()

    foreach ($vid in $scrapeableVids) {
        $item = Find-VideoByVid -Items $allVideos -Vid $vid
        if ($null -eq $item) {
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Scrape success sample $vid exists" -Pass $false -Detail "video not found"
            continue
        }

        $hasTitle = -not [string]::IsNullOrWhiteSpace($item.title)
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Scrape success sample $vid has title" -Pass $hasTitle -Detail "title='$($item.title)'"

        $isFull = $item.scrapeStatus -eq "full"
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Scrape success sample $vid status" -Pass $isFull -Detail "scrapeStatus='$($item.scrapeStatus)'"

        $detail = Get-VideoDetail -BaseUrl $baseUrl -VideoId $item.videoId
        $actors = @($detail.actors)
        $hasActors = $actors.Count -ge 1
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Scrape success sample $vid actors" -Pass $hasActors -Detail "actors=$($actors.Count)"

        $expectedSuccessfulDetails += [pscustomobject]@{
            Vid = $vid
            Detail = $detail
            Item = $item
        }

        $sidecarDir = Join-Path (Join-Path $videoCacheRoot $libraryNamesById[$item.libraryId]) $vid
        foreach ($suffix in @(".nfo", "-poster.jpg", "-thumb.jpg", "-fanart.jpg")) {
            $assetPath = Join-Path $sidecarDir "$vid$suffix"
            $exists = Test-Path $assetPath
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Scrape success sample $vid asset $suffix" -Pass $exists -Detail $assetPath
        }
    }

    if ($null -ne $recognizedExpectation -and -not [string]::IsNullOrWhiteSpace($recognizedExpectation.ExpectedVid)) {
        $recognizedVid = $recognizedExpectation.ExpectedVid
        $item = Find-VideoByVid -Items $allVideos -Vid $recognizedVid
        $exists = $null -ne $item
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Recognized sample $recognizedVid exists" -Pass $exists -Detail "configured='$($recognizedExpectation.ConfiguredName)'"

        if ($exists) {
            $isFull = $item.scrapeStatus -eq "full"
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Recognized sample $recognizedVid status" -Pass $isFull -Detail "scrapeStatus='$($item.scrapeStatus)'"

            $detail = Get-VideoDetail -BaseUrl $baseUrl -VideoId $item.videoId
            $hasTitle = -not [string]::IsNullOrWhiteSpace($detail.title)
            $actors = @($detail.actors)
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Recognized sample $recognizedVid title" -Pass $hasTitle -Detail "title='$($detail.title)'"
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Recognized sample $recognizedVid actors" -Pass ($actors.Count -ge 1) -Detail "actors=$($actors.Count)"

            $sidecarDir = Join-Path (Join-Path $videoCacheRoot $libraryNamesById[$item.libraryId]) $recognizedVid
            foreach ($suffix in @(".nfo", "-poster.jpg", "-thumb.jpg", "-fanart.jpg")) {
                $assetPath = Join-Path $sidecarDir "$recognizedVid$suffix"
                $exists = Test-Path $assetPath
                Add-ValidationResult -Results ([ref]$validationResults) -Name "Recognized sample $recognizedVid asset $suffix" -Pass $exists -Detail $assetPath
            }
        }
    }

    if ($null -ne $failureExpectation -and -not [string]::IsNullOrWhiteSpace($failureExpectation.ExpectedVid)) {
        $failureVid = $failureExpectation.ExpectedVid
        $failureItem = Find-VideoByVid -Items $allVideos -Vid $failureVid
        $exists = $null -ne $failureItem
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Failure sample $failureVid exists" -Pass $exists -Detail "configured='$($failureExpectation.ConfiguredName)'"

        if ($exists) {
            $isFailed = $failureItem.scrapeStatus -eq "failed"
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Failure sample $failureVid status" -Pass $isFailed -Detail "scrapeStatus='$($failureItem.scrapeStatus)'"

            $failureSidecarDir = Join-Path (Join-Path $videoCacheRoot $libraryNamesById[$failureItem.libraryId]) $failureVid
            $stubNfoPath = Join-Path $failureSidecarDir "$failureVid.nfo"
            $stubExists = Test-Path $stubNfoPath
            Add-ValidationResult -Results ([ref]$validationResults) -Name "Failure sample $failureVid stub nfo" -Pass $stubExists -Detail $stubNfoPath

            foreach ($suffix in @("-poster.jpg", "-thumb.jpg", "-fanart.jpg")) {
                $assetPath = Join-Path $failureSidecarDir "$failureVid$suffix"
                $missing = -not (Test-Path $assetPath)
                Add-ValidationResult -Results ([ref]$validationResults) -Name "Failure sample $failureVid missing $suffix" -Pass $missing -Detail $assetPath
            }
        }
    }

    try {
        $actorsResp = Invoke-RestMethod "$baseUrl/api/actors?page=1&pageSize=100"
        $actorsData = Get-ApiData $actorsResp "GET /api/actors"
        $actorsFound = @($actorsData.items).Count
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Actors list populated" -Pass ($actorsFound -ge 1) -Detail "actors=$actorsFound"
    }
    catch {
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Actors list populated" -Pass $false -Detail $_.Exception.Message
    }

    if (Test-Path $actorAvatarCacheRoot) {
        $avatarFiles = @(Get-ChildItem $actorAvatarCacheRoot -File -ErrorAction SilentlyContinue)
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Actor avatar cache populated" -Pass ($avatarFiles.Count -ge 1) -Detail "files=$($avatarFiles.Count)"
    }
    else {
        Add-ValidationResult -Results ([ref]$validationResults) -Name "Actor avatar cache populated" -Pass $false -Detail "directory missing: $actorAvatarCacheRoot"
    }

    $scrapeSucceeded = @($validationResults | Where-Object { -not $_.Pass }).Count -eq 0
}
else {
    if ($SkipScrape) {
        Write-Host "`n[seed-e2e] Skipping MetaTube scrape (-SkipScrape)" -ForegroundColor DarkYellow
    }
    else {
        Write-Host "`n[seed-e2e] Skipping MetaTube scrape (scrapeableVids is empty)" -ForegroundColor DarkYellow
    }
}

# --- Step 6: 验证 ---
Write-Host "`n[seed-e2e] Step 6: Verifying..." -ForegroundColor Yellow

$videosAItems = Get-LibraryVideoItems -BaseUrl $baseUrl -LibraryId $libAId
$videosBItems = Get-LibraryVideoItems -BaseUrl $baseUrl -LibraryId $libBId
$countA = $videosAItems.Count
$countB = $videosBItems.Count

$sqlitePaths = @(
    (Join-Path $userDataRoot "app_datas.sqlite"),
    (Join-Path $userDataRoot "app_configs.sqlite")
)
$sqliteExisting = @($sqlitePaths | Where-Object { Test-Path $_ })
$logFiles = @(Get-ChildItem -Path $logDir -Recurse -Filter "*.log" -ErrorAction SilentlyContinue)

$allPass = $true
$checks = @(
    @{ Name = "Library A videos (expect $expectedCountA)"; Pass = ($countA -eq $expectedCountA); Actual = $countA },
    @{ Name = "Library B videos (expect $expectedCountB)"; Pass = ($countB -eq $expectedCountB); Actual = $countB },
    @{ Name = "SQLite files exist"; Pass = ($sqliteExisting.Count -eq $sqlitePaths.Count); Actual = $sqliteExisting.Count },
    @{ Name = "Log files exist"; Pass = ($logFiles.Count -ge 1); Actual = $logFiles.Count }
)

foreach ($chk in $checks) {
    $icon = if ($chk.Pass) { "PASS" } else { "FAIL"; $allPass = $false }
    Write-Host "  [$icon] $($chk.Name) — got $($chk.Actual)"
}

foreach ($result in $validationResults) {
    $icon = if ($result.Pass) { "PASS" } else { "FAIL"; $allPass = $false }
    Write-Host "  [$icon] $($result.Name) — $($result.Detail)"
}

# --- Step 7: 输出 e2e-env.json ---
Write-Host "`n[seed-e2e] Step 7: Writing e2e-env.json..." -ForegroundColor Yellow

$envJson = @{
    baseUrl = $baseUrl
    workerPid = $workerProcess.Id
    repoRoot = $repoRoot
    e2eDataRoot = $e2eRoot
    logDir = $logDir
    metaTubeUrl = $metaTubeUrl
    scrapeSucceeded = $scrapeSucceeded
    effectiveUserName = $effectiveUserName
    userDataRoot = $userDataRoot
    videoCacheRoot = $videoCacheRoot
    actorAvatarCacheRoot = $actorAvatarCacheRoot
    libraries = @(
        @{
            name = "E2E-Lib-A"
            libraryId = $libAId
            dbId = $libAId
            scanPath = $libAPath
            videoCount = $countA
        },
        @{
            name = "E2E-Lib-B"
            libraryId = $libBId
            dbId = $libBId
            scanPath = $libBPath
            videoCount = $countB
        }
    )
    expectedVids = @{
        scrapeSuccess = $scrapeableVids
        recognized = if ($null -ne $recognizedExpectation) { $recognizedExpectation.ExpectedVid } else { $null }
        expectedFailure = if ($null -ne $failureExpectation) { $failureExpectation.ExpectedVid } else { $null }
    }
    seededAt = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 10

$envJsonPath = Join-Path $e2eRoot "e2e-env.json"
Set-Content -Path $envJsonPath -Value $envJson -Encoding UTF8
Write-Host "  Saved: $envJsonPath"

if (-not $SkipWorkerShutdown) {
    Write-Host "`n[seed-e2e] Stopping Worker (PID $($workerProcess.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $workerProcess.Id -Force -ErrorAction SilentlyContinue
    Write-Host "  Worker stopped"
}

Write-Host ""
if ($allPass) {
    Write-Host "=======================================" -ForegroundColor Green
    Write-Host "  E2E data seeded successfully" -ForegroundColor Green
    if ($scrapeSucceeded) {
        Write-Host "  MetaTube scrape: succeeded" -ForegroundColor Green
    }
    elseif (-not $SkipScrape -and $scrapeableVids.Count -gt 0) {
        Write-Host "  MetaTube scrape: partial/failed" -ForegroundColor DarkYellow
    }
    else {
        Write-Host "  MetaTube scrape: skipped" -ForegroundColor DarkYellow
    }
    Write-Host "=======================================" -ForegroundColor Green
}
else {
    Write-Host "=======================================" -ForegroundColor Red
    Write-Host "  E2E seeding completed with errors" -ForegroundColor Red
    Write-Host "=======================================" -ForegroundColor Red
}

Remove-Item (Join-Path $e2eRoot "worker-stdout.log") -ErrorAction SilentlyContinue
Remove-Item (Join-Path $e2eRoot "worker-stderr.log") -ErrorAction SilentlyContinue

if (-not $NoPause -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
    Write-Host "`nPress any key to exit..."
    try {
        [void][System.Console]::ReadKey($true)
    }
    catch {
    }
}


exit ([int](-not $allPass))
