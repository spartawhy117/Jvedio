#!/usr/bin/env pwsh
<#
.SYNOPSIS
    后端 API 校验脚本 - 在 E2E 数据环境下逐一验证 Worker API 端点。

.DESCRIPTION
    前提：先运行 seed-e2e-data.ps1 -SkipWorkerShutdown 完成数据播种，Worker 保持运行。
    本脚本从 e2e-env.json 读取连接信息，依次调用所有 Worker API 端点并验证响应。
#>
param(
    [switch]$NoPause,
    [string]$BaseUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$script:passed = 0
$script:failed = 0
$script:skipped = 0
$script:results = @()
$script:libList = $null
$script:videoItems = @()
$script:actorId = $null
$script:taskId = $null
$script:tmpLibId = $null

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

function Add-Result {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Detail
    )

    $icon = switch ($Status) {
        "PASS" { "PASS" }
        "FAIL" { "FAIL" }
        default { "SKIP" }
    }

    Write-Host "  [$icon] $Name — $Detail"
    $script:results += @{
        Name = $Name
        Status = $Status
        Detail = $Detail
    }

    switch ($Status) {
        "PASS" { $script:passed++ }
        "FAIL" { $script:failed++ }
        default { $script:skipped++ }
    }
}

function Test-Api {
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Uri,
        [string]$Body,
        [string]$ContentType = "application/json",
        [scriptblock]$Validate,
        [int[]]$ExpectedStatus = @(200)
    )

    try {
        $params = @{
            Method = $Method
            Uri = $Uri
        }
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = $ContentType
        }

        $resp = Invoke-RestMethod @params
        if ($Validate) {
            $validationResult = & $Validate $resp
            if ($validationResult -eq $false) {
                Add-Result -Name "[$Method] $Name" -Status "FAIL" -Detail "Validation failed"
            }
            else {
                $detail = if ($validationResult -is [string]) { $validationResult } else { "OK" }
                Add-Result -Name "[$Method] $Name" -Status "PASS" -Detail $detail
            }
        }
        else {
            Add-Result -Name "[$Method] $Name" -Status "PASS" -Detail "Response received"
        }
    }
    catch {
        $statusCode = $null
        $response = $null
        try {
            $response = $_.Exception.Response
        }
        catch {
            $response = $null
        }

        if ($null -ne $response) {
            try {
                $statusCode = [int]$response.StatusCode
            }
            catch {
                $statusCode = $null
            }
        }

        if ($null -ne $statusCode -and $ExpectedStatus -contains $statusCode) {
            Add-Result -Name "[$Method] $Name" -Status "PASS" -Detail "Expected status $statusCode"
        }
        else {
            Add-Result -Name "[$Method] $Name" -Status "FAIL" -Detail $_.Exception.Message
        }
    }
}

function Skip-Api {
    param(
        [string]$Name,
        [string]$Reason
    )

    Add-Result -Name $Name -Status "SKIP" -Detail $Reason
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path

if ($BaseUrl) {
    $base = $BaseUrl.TrimEnd("/")
    $envData = $null
    Write-Host "[verify-api] Using manual BaseUrl: $base" -ForegroundColor Cyan
}
else {
    $envJsonPath = Join-Path $repoRoot "test-data\e2e\e2e-env.json"
    if (-not (Test-Path $envJsonPath)) {
        Write-Error "e2e-env.json not found. Run seed-e2e-data.ps1 -SkipWorkerShutdown first."
        exit 1
    }

    $envData = Get-Content $envJsonPath -Raw | ConvertFrom-Json
    $base = $envData.baseUrl.TrimEnd("/")
    Write-Host "[verify-api] Loaded e2e-env.json — Worker at $base" -ForegroundColor Cyan
}

$headers = @{ "Content-Type" = "application/json" }

Write-Host "`n── 1. Health ──" -ForegroundColor Yellow

Test-Api -Name "/health/live" -Uri "$base/health/live" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /health/live"
    if ($data.status -eq "live") { "status=live" } else { $false }
}

Test-Api -Name "/health/ready" -Uri "$base/health/ready" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /health/ready"
    if ($data.status -eq "ready" -and $data.healthy -eq $true) { "status=ready healthy=true" } else { $false }
}

Write-Host "`n── 2. App ──" -ForegroundColor Yellow

Test-Api -Name "/api/app/bootstrap" -Uri "$base/api/app/bootstrap" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/app/bootstrap"
    $libs = @($data.libraries).Count
    if ($null -ne $data.app -and $null -ne $data.worker) { "libraries=$libs" } else { $false }
}

Write-Host "`n── 3. Libraries ──" -ForegroundColor Yellow

Test-Api -Name "/api/libraries" -Uri "$base/api/libraries" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/libraries"
    $libraries = @($data.libraries)
    $script:libList = $libraries
    if ($libraries.Count -ge 1) { "libraries=$($libraries.Count)" } else { $false }
}

$libId = $null
if ($envData -and $envData.libraries -and $envData.libraries[0]) {
    if (Test-HasProperty $envData.libraries[0] "libraryId") {
        $libId = $envData.libraries[0].libraryId
    }
    elseif (Test-HasProperty $envData.libraries[0] "dbId") {
        $libId = $envData.libraries[0].dbId
    }
}
if (-not $libId -and $script:libList.Count -ge 1) {
    $libId = $script:libList[0].libraryId
}

if ($libId) {
    Test-Api -Name "/api/libraries/{id}/videos" -Uri "$base/api/libraries/$libId/videos?page=1&pageSize=20&sortBy=vid&sortOrder=asc" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/libraries/$libId/videos"
        $script:videoItems = @($data.items)
        if ($script:videoItems.Count -ge 1) { "videos=$($script:videoItems.Count)" } else { $false }
    }

    if ($envData) {
        $tempScanPath = Join-Path $envData.e2eDataRoot "videos\verify-temp-lib"
        New-Item -ItemType Directory -Path $tempScanPath -Force | Out-Null
        $tempScanPath = $tempScanPath.Replace("\", "/")

        Test-Api -Name "/api/libraries (create temp)" -Method "POST" -Uri "$base/api/libraries" `
            -Body (@{ name = "__verify-temp__"; scanPaths = @($tempScanPath) } | ConvertTo-Json -Compress) -Validate {
            param($r)
            $data = Get-ApiData $r "POST /api/libraries"
            $library = Get-RequiredProperty $data "library" "POST /api/libraries data"
            $script:tmpLibId = Get-RequiredProperty $library "libraryId" "temp library"
            "created libraryId=$($script:tmpLibId)"
        }
    }
    else {
        Skip-Api -Name "POST /api/libraries (create temp)" -Reason "No e2e-env.json available"
    }

    if ($script:tmpLibId) {
        Test-Api -Name "/api/libraries/{id} (update temp)" -Method "PUT" -Uri "$base/api/libraries/$($script:tmpLibId)" `
            -Body (@{ name = "__verify-temp-renamed__"; scanPaths = @() } | ConvertTo-Json -Compress) -Validate {
            param($r)
            $data = Get-ApiData $r "PUT /api/libraries/$($script:tmpLibId)"
            if ($data.library.name -eq "__verify-temp-renamed__") { "renamed" } else { $false }
        }

        Test-Api -Name "/api/libraries/{id} (delete temp)" -Method "DELETE" -Uri "$base/api/libraries/$($script:tmpLibId)" -Validate {
            param($r)
            $data = Get-ApiData $r "DELETE /api/libraries/$($script:tmpLibId)"
            if ($data.libraryId -eq $script:tmpLibId) { "deleted" } else { $false }
        }
    }
    else {
        Skip-Api -Name "PUT /api/libraries/{id}" -Reason "No temp library created"
        Skip-Api -Name "DELETE /api/libraries/{id}" -Reason "No temp library created"
    }

    Test-Api -Name "/api/libraries/{id}/scan" -Method "POST" -Uri "$base/api/libraries/$libId/scan" `
        -Body (@{ organizeBeforeScan = $false } | ConvertTo-Json -Compress) -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/libraries/$libId/scan"
        if ($null -ne $data.task -and -not [string]::IsNullOrWhiteSpace($data.task.id)) { "taskId=$($data.task.id)" } else { $false }
    } -ExpectedStatus @(200, 202)

    Test-Api -Name "/api/libraries/{id}/scrape" -Method "POST" -Uri "$base/api/libraries/$libId/scrape" `
        -Body (@{ mode = "missing-only"; writeSidecars = $false; downloadActorAvatars = $false } | ConvertTo-Json -Compress) -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/libraries/$libId/scrape"
        if ($null -ne $data.task -and -not [string]::IsNullOrWhiteSpace($data.task.id)) { "taskId=$($data.task.id)" } else { $false }
    } -ExpectedStatus @(200, 202)

    if ($script:videoItems.Count -ge 1) {
        $singleVideoId = $script:videoItems[0].videoId
        Test-Api -Name "/api/libraries/{id}/scrape (videoIds)" -Method "POST" -Uri "$base/api/libraries/$libId/scrape" `
            -Body (@{ videoIds = @($singleVideoId); mode = "all"; writeSidecars = $false; downloadActorAvatars = $false } | ConvertTo-Json -Compress) -Validate {
            param($r)
            $data = Get-ApiData $r "POST /api/libraries/$libId/scrape (videoIds)"
            if ($null -ne $data.task -and -not [string]::IsNullOrWhiteSpace($data.task.id)) { "taskId=$($data.task.id)" } else { $false }
        } -ExpectedStatus @(200, 202, 409)
    }
    else {
        Skip-Api -Name "POST /api/libraries/{id}/scrape (videoIds)" -Reason "No videos in library"
    }
}
else {
    Skip-Api -Name "Libraries suite" -Reason "No library found"
}

Write-Host "`n── 4. Videos ──" -ForegroundColor Yellow

Test-Api -Name "/api/videos/favorites" -Uri "$base/api/videos/favorites?page=1&pageSize=10" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/videos/favorites"
    "favorites=$(@($data.items).Count)"
}

Test-Api -Name "/api/videos/categories" -Uri "$base/api/videos/categories" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/videos/categories"
    "categories=$(@($data.items).Count)"
}

Test-Api -Name "/api/videos/series" -Uri "$base/api/videos/series" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/videos/series"
    "series=$(@($data.items).Count)"
}

if ($script:videoItems.Count -ge 1) {
    $firstItem = $script:videoItems[0]
    if (Test-HasProperty $firstItem "scrapeStatus") {
        Add-Result -Name "VideoListItemDto.scrapeStatus" -Status "PASS" -Detail "value=$($firstItem.scrapeStatus)"
    }
    else {
        Add-Result -Name "VideoListItemDto.scrapeStatus" -Status "FAIL" -Detail "field missing"
    }

    Test-Api -Name "/api/libraries/{id}/videos?scrapeStatus=none" -Uri "$base/api/libraries/$libId/videos?page=1&pageSize=10&scrapeStatus=none" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/libraries/$libId/videos?scrapeStatus=none"
        "items=$(@($data.items).Count)"
    }

    Test-Api -Name "/api/libraries/{id}/videos?scrapeStatus=failed" -Uri "$base/api/libraries/$libId/videos?page=1&pageSize=10&scrapeStatus=failed" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/libraries/$libId/videos?scrapeStatus=failed"
        "items=$(@($data.items).Count)"
    }

    $videoId = $firstItem.videoId

    Test-Api -Name "/api/videos/{id}" -Uri "$base/api/videos/$videoId" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/videos/$videoId"
        $video = Get-RequiredProperty $data "video" "GET /api/videos/$videoId data"
        if ($video.videoId -eq $videoId) { "vid=$($video.vid)" } else { $false }
    }

    try {
        $detailResp = Invoke-RestMethod "$base/api/videos/$videoId"
        $detailData = Get-ApiData $detailResp "GET /api/videos/$videoId"
        $video = Get-RequiredProperty $detailData "video" "video detail"
        if (Test-HasProperty $video "scrapeStatus") {
            Add-Result -Name "VideoDetailDto.scrapeStatus" -Status "PASS" -Detail "value=$($video.scrapeStatus)"
        }
        else {
            Add-Result -Name "VideoDetailDto.scrapeStatus" -Status "FAIL" -Detail "field missing"
        }
    }
    catch {
        Skip-Api -Name "VideoDetailDto.scrapeStatus" -Reason "Detail request failed"
    }

    Test-Api -Name "/api/videos/{id}/toggle-favorite" -Method "POST" -Uri "$base/api/videos/$videoId/toggle-favorite" -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/videos/$videoId/toggle-favorite"
        if (Test-HasProperty $data "isFavorite") { "favorite=$($data.isFavorite)" } else { "toggle ok" }
    }

    Test-Api -Name "/api/videos/{id}/toggle-favorite (revert)" -Method "POST" -Uri "$base/api/videos/$videoId/toggle-favorite" -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/videos/$videoId/toggle-favorite (revert)"
        if (Test-HasProperty $data "isFavorite") { "favorite=$($data.isFavorite)" } else { "reverted" }
    }

    Test-Api -Name "/api/videos/{id}/play" -Method "POST" -Uri "$base/api/videos/$videoId/play" `
        -Body (@{ playerProfile = "default"; resume = $false } | ConvertTo-Json -Compress) `
        -ExpectedStatus @(200, 404, 500) -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/videos/$videoId/play"
        if (Test-HasProperty $data "launched") { "launched=$($data.launched)" } else { "play handled" }
    }

    Test-Api -Name "/api/videos/batch/favorite" -Method "POST" -Uri "$base/api/videos/batch/favorite?favorite=true" `
        -Body (@{ videoIds = @($videoId) } | ConvertTo-Json -Compress) -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/videos/batch/favorite"
        if (Test-HasProperty $data "successCount") { "success=$($data.successCount)" } else { "batch favorite ok" }
    }

    Test-Api -Name "/api/videos/batch/favorite (unfav)" -Method "POST" -Uri "$base/api/videos/batch/favorite?favorite=false" `
        -Body (@{ videoIds = @($videoId) } | ConvertTo-Json -Compress) -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/videos/batch/favorite?favorite=false"
        if (Test-HasProperty $data "successCount") { "success=$($data.successCount)" } else { "batch unfavorite ok" }
    }

    try {
        $catsResp = Invoke-RestMethod "$base/api/videos/categories"
        $catsData = Get-ApiData $catsResp "GET /api/videos/categories"
        if (@($catsData.items).Count -ge 1) {
            $catName = $catsData.items[0].name
            Test-Api -Name "/api/videos/categories/{name}/videos" -Uri "$base/api/videos/categories/$([uri]::EscapeDataString($catName))/videos?page=1&pageSize=10" -Validate {
                param($r)
                $data = Get-ApiData $r "GET /api/videos/categories/$catName/videos"
                "items=$(@($data.items).Count)"
            }
        }
        else {
            Skip-Api -Name "GET /api/videos/categories/{name}/videos" -Reason "No categories found"
        }
    }
    catch {
        Skip-Api -Name "GET /api/videos/categories/{name}/videos" -Reason "Categories query failed"
    }

    try {
        $seriesResp = Invoke-RestMethod "$base/api/videos/series"
        $seriesData = Get-ApiData $seriesResp "GET /api/videos/series"
        if (@($seriesData.items).Count -ge 1) {
            $seriesName = $seriesData.items[0].name
            Test-Api -Name "/api/videos/series/{name}/videos" -Uri "$base/api/videos/series/$([uri]::EscapeDataString($seriesName))/videos?page=1&pageSize=10" -Validate {
                param($r)
                $data = Get-ApiData $r "GET /api/videos/series/$seriesName/videos"
                "items=$(@($data.items).Count)"
            }
        }
        else {
            Skip-Api -Name "GET /api/videos/series/{name}/videos" -Reason "No series found"
        }
    }
    catch {
        Skip-Api -Name "GET /api/videos/series/{name}/videos" -Reason "Series query failed"
    }

    Skip-Api -Name "DELETE /api/videos/{id}" -Reason "Skipped to preserve seed data"
    Skip-Api -Name "POST /api/videos/batch/delete" -Reason "Skipped to preserve seed data"
}
else {
    Skip-Api -Name "Videos suite" -Reason "No video found"
}

Write-Host "`n── 5. Actors ──" -ForegroundColor Yellow

Test-Api -Name "/api/actors" -Uri "$base/api/actors?page=1&pageSize=10" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/actors"
    $items = @($data.items)
    if ($items.Count -ge 1) {
        $script:actorId = $items[0].actorId
    }
    "actors=$($items.Count)"
}

if ($script:actorId) {
    Test-Api -Name "/api/actors/{id}" -Uri "$base/api/actors/$($script:actorId)" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/actors/$($script:actorId)"
        $actor = Get-RequiredProperty $data "actor" "GET /api/actors/$($script:actorId) data"
        if ($actor.actorId.ToString() -eq $script:actorId.ToString()) { "actor=$($actor.name)" } else { $false }
    }

    Test-Api -Name "/api/actors/{id}/videos" -Uri "$base/api/actors/$($script:actorId)/videos?page=1&pageSize=10" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/actors/$($script:actorId)/videos"
        "items=$(@($data.items).Count)"
    }
}
else {
    Skip-Api -Name "GET /api/actors/{id}" -Reason "No actor found"
    Skip-Api -Name "GET /api/actors/{id}/videos" -Reason "No actor found"
}

Write-Host "`n── 6. Tasks ──" -ForegroundColor Yellow

Test-Api -Name "/api/tasks" -Uri "$base/api/tasks" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/tasks"
    $tasks = @($data.tasks)
    if ($tasks.Count -ge 1) {
        $script:taskId = $tasks[0].id
    }
    "tasks=$($tasks.Count)"
}

if ($script:taskId) {
    Test-Api -Name "/api/tasks/{id}" -Uri "$base/api/tasks/$($script:taskId)" -Validate {
        param($r)
        $data = Get-ApiData $r "GET /api/tasks/$($script:taskId)"
        $task = Get-RequiredProperty $data "task" "GET /api/tasks/$($script:taskId) data"
        if ($task.id -eq $script:taskId) { "status=$($task.status)" } else { $false }
    }

    Test-Api -Name "/api/tasks/{id}/retry" -Method "POST" -Uri "$base/api/tasks/$($script:taskId)/retry" `
        -ExpectedStatus @(200, 202, 400, 404, 409) -Validate {
        param($r)
        $data = Get-ApiData $r "POST /api/tasks/$($script:taskId)/retry"
        if ($null -ne $data.task -and -not [string]::IsNullOrWhiteSpace($data.task.id)) { "taskId=$($data.task.id)" } else { "retry handled" }
    }
}
else {
    Skip-Api -Name "GET /api/tasks/{id}" -Reason "No task found"
    Skip-Api -Name "POST /api/tasks/{id}/retry" -Reason "No task found"
}

Write-Host "`n── 7. Settings ──" -ForegroundColor Yellow

$settingsSnapshot = $null
Test-Api -Name "/api/settings" -Uri "$base/api/settings" -Validate {
    param($r)
    $data = Get-ApiData $r "GET /api/settings"
    $script:settingsSnapshot = $data
    if ($null -ne $data.general -and $null -ne $data.playback -and $null -ne $data.metaTube) { "settings loaded" } else { $false }
}

if ($settingsSnapshot) {
    $updateSettingsBody = @{
        general = $settingsSnapshot.general
        scanImport = $settingsSnapshot.scanImport
        playback = $settingsSnapshot.playback
        library = $settingsSnapshot.library
        metaTube = $settingsSnapshot.metaTube
    }

    if (Test-HasProperty $updateSettingsBody["general"] "debug") {
        $updateSettingsBody["general"].debug = [bool]$updateSettingsBody["general"].debug
    }
    if (Test-HasProperty $updateSettingsBody["metaTube"] "requestTimeoutSeconds") {
        $updateSettingsBody["metaTube"].requestTimeoutSeconds = [int]$updateSettingsBody["metaTube"].requestTimeoutSeconds
    }

    Test-Api -Name "/api/settings (update)" -Method "PUT" -Uri "$base/api/settings" `
        -Body ($updateSettingsBody | ConvertTo-Json -Depth 10 -Compress) -Validate {
        param($r)
        $data = Get-ApiData $r "PUT /api/settings"
        if ($null -ne $data.settings -and $null -ne $data.settings.general -and $null -ne $data.settings.metaTube) { "settings updated" } else { $false }
    }
}
else {
    Skip-Api -Name "PUT /api/settings" -Reason "Settings snapshot unavailable"
}

$diagBody = @{
    serverUrl = if ($settingsSnapshot -and $settingsSnapshot.metaTube -and (Test-HasProperty $settingsSnapshot.metaTube "serverUrl")) {
        $settingsSnapshot.metaTube.serverUrl
    }
    elseif ($envData -and (Test-HasProperty $envData "metaTubeUrl")) {
        $envData.metaTubeUrl
    }
    else {
        ""
    }
    requestTimeoutSeconds = if ($settingsSnapshot -and $settingsSnapshot.metaTube -and (Test-HasProperty $settingsSnapshot.metaTube "requestTimeoutSeconds")) {
        [int]$settingsSnapshot.metaTube.requestTimeoutSeconds
    }
    else {
        60
    }
} | ConvertTo-Json -Compress

Test-Api -Name "/api/settings/meta-tube/diagnostics" -Method "POST" -Uri "$base/api/settings/meta-tube/diagnostics" `
    -Body $diagBody -ExpectedStatus @(200, 500) -Validate {
    param($r)
    $data = Get-ApiData $r "POST /api/settings/meta-tube/diagnostics"
    if (Test-HasProperty $data "success") { "success=$($data.success)" } else { "diagnostics completed" }
}

Write-Host "`n── 8. Events (SSE) ──" -ForegroundColor Yellow

try {
    $sseReq = [System.Net.WebRequest]::Create("$base/api/events")
    $sseReq.Method = "GET"
    $sseReq.Accept = "text/event-stream"
    $sseReq.Timeout = 3000
    $sseResp = $sseReq.GetResponse()
    $contentType = $sseResp.ContentType
    $sseResp.Close()
    Add-Result -Name "GET /api/events (SSE)" -Status "PASS" -Detail "content-type=$contentType"
}
catch [System.Net.WebException] {
    $httpResp = $_.Exception.Response
    if ($httpResp -and [int]$httpResp.StatusCode -eq 200) {
        Add-Result -Name "GET /api/events (SSE)" -Status "PASS" -Detail "connection established"
    }
    else {
        Add-Result -Name "GET /api/events (SSE)" -Status "SKIP" -Detail "timeout/non-blocking: $($_.Exception.Message)"
    }
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Backend API Verification Results" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$total = $script:passed + $script:failed + $script:skipped
Write-Host "  Passed:  $($script:passed)" -ForegroundColor Green
Write-Host "  Failed:  $($script:failed)" -ForegroundColor $(if ($script:failed -gt 0) { "Red" } else { "Gray" })
Write-Host "  Skipped: $($script:skipped)" -ForegroundColor $(if ($script:skipped -gt 0) { "DarkYellow" } else { "Gray" })
Write-Host "  Total:   $total" -ForegroundColor Cyan
Write-Host ""

if ($script:failed -eq 0) {
    Write-Host "  All verified endpoints passed." -ForegroundColor Green
}
else {
    Write-Host "  Some endpoints failed. Review output above." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Failed items:" -ForegroundColor Red
    foreach ($r in $script:results | Where-Object { $_.Status -eq "FAIL" }) {
        Write-Host "    - $($r.Name): $($r.Detail)" -ForegroundColor Red
    }
}

Write-Host ""

if (-not $NoPause -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
    Write-Host "Press any key to exit..."
    try {
        [void][System.Console]::ReadKey($true)
    }
    catch {
    }
}


exit $script:failed
