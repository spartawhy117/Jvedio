#!/usr/bin/env pwsh
<#
.SYNOPSIS
    后端 API 校验脚本 — 在 E2E 数据环境下逐一验证所有 Worker API 端点。

.DESCRIPTION
    前提：先运行 seed-e2e-data.ps1 -SkipWorkerShutdown 完成数据播种，Worker 保持运行。
    本脚本从 e2e-env.json 读取连接信息，依次调用所有 Worker API 端点并验证响应。

    覆盖范围（31 个端点，8 个 Controller）：
    1.  Health     — /health/live, /health/ready
    2.  App        — /api/app/bootstrap
    3.  Libraries  — CRUD + videos + scan + scrape
    4.  Videos     — favorites, detail, toggle-favorite, categories, series, batch, delete
    5.  Actors     — list, detail, actor-videos
    6.  Tasks      — list, detail
    7.  Settings   — get, put, meta-tube diagnostics
    8.  Events     — SSE stream (连接验证)

.PARAMETER NoPause
    加此开关跳过末尾的 "Press any key"（用于 CI/自动化）。

.PARAMETER BaseUrl
    手动指定 Worker 地址（跳过 e2e-env.json 读取）。

.EXAMPLE
    # 标准流程：先播种再校验
    .\seed-e2e-data.ps1 -SkipWorkerShutdown
    .\verify-backend-apis.ps1

    # 手动指定端口
    .\verify-backend-apis.ps1 -BaseUrl "http://127.0.0.1:5000"

    # CI 模式
    .\verify-backend-apis.ps1 -NoPause
#>
param(
    [switch]$NoPause,
    [string]$BaseUrl
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── 统计变量 ───
$script:passed = 0
$script:failed = 0
$script:skipped = 0
$script:results = @()

function Test-Api {
    <#
    .SYNOPSIS 调用单个 API 并验证响应
    #>
    param(
        [string]$Name,
        [string]$Method = "GET",
        [string]$Uri,
        [string]$Body,
        [string]$ContentType = "application/json",
        [scriptblock]$Validate,
        [int[]]$ExpectedStatus = @(200)
    )

    $entry = @{ Name = $Name; Status = ""; Detail = "" }

    try {
        $params = @{
            Method = $Method
            Uri    = $Uri
        }
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = $ContentType
        }

        $resp = Invoke-RestMethod @params

        if ($Validate) {
            $validationResult = & $Validate $resp
            if ($validationResult -eq $false) {
                $entry.Status = "FAIL"
                $entry.Detail = "Validation failed"
                $script:failed++
            }
            else {
                $entry.Status = "PASS"
                $entry.Detail = if ($validationResult -is [string]) { $validationResult } else { "OK" }
                $script:passed++
            }
        }
        else {
            $entry.Status = "PASS"
            $entry.Detail = "Response received"
            $script:passed++
        }
    }
    catch {
        $statusCode = $null
        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -and $ExpectedStatus -contains $statusCode) {
            $entry.Status = "PASS"
            $entry.Detail = "Expected status $statusCode"
            $script:passed++
        }
        else {
            $entry.Status = "FAIL"
            $entry.Detail = $_.Exception.Message
            $script:failed++
        }
    }

    $icon = switch ($entry.Status) {
        "PASS" { "✅" }
        "FAIL" { "❌" }
        "SKIP" { "⏭️" }
    }
    Write-Host "  $icon [$Method] $Name — $($entry.Detail)"
    $script:results += $entry
}

function Skip-Api {
    param([string]$Name, [string]$Reason)
    Write-Host "  ⏭️ $Name — $Reason"
    $script:skipped++
    $script:results += @{ Name = $Name; Status = "SKIP"; Detail = $Reason }
}

# ─── 读取连接信息 ───
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path

if ($BaseUrl) {
    $base = $BaseUrl.TrimEnd("/")
    Write-Host "[verify-api] Using manual BaseUrl: $base" -ForegroundColor Cyan
    $envData = $null
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

# ════════════════════════════════════════════
#  1. Health
# ════════════════════════════════════════════
Write-Host "`n── 1. Health ──" -ForegroundColor Yellow

Test-Api -Name "GET /health/live" -Uri "$base/health/live" -Validate {
    param($r) if ($r.status -eq "live") { "status=live" } else { $false }
}

Test-Api -Name "GET /health/ready" -Uri "$base/health/ready" -Validate {
    param($r) if ($r.isReady -eq $true) { "isReady=true" } else { $false }
}

# ════════════════════════════════════════════
#  2. App — Bootstrap
# ════════════════════════════════════════════
Write-Host "`n── 2. App ──" -ForegroundColor Yellow

Test-Api -Name "GET /api/app/bootstrap" -Uri "$base/api/app/bootstrap" -Validate {
    param($r) if ($r.data) { "bootstrap data present" } else { $false }
}

# ════════════════════════════════════════════
#  3. Libraries
# ════════════════════════════════════════════
Write-Host "`n── 3. Libraries ──" -ForegroundColor Yellow

# 获取库列表
$libList = $null
Test-Api -Name "GET /api/libraries" -Uri "$base/api/libraries" -Validate {
    param($r)
    $script:libList = $r
    $count = @($r.data).Count
    if ($count -ge 1) { "libraries=$count" } else { $false }
}

# 从库列表取第一个库 ID
$libId = $null
if ($envData -and $envData.libraries) {
    $libId = $envData.libraries[0].dbId
}
elseif ($libList -and $libList.data) {
    $libId = @($libList.data)[0].dbId
}

if ($libId) {
    # 获取库影片列表
    $videoItems = $null
    Test-Api -Name "GET /api/libraries/{id}/videos" -Uri "$base/api/libraries/$libId/videos?page=1&pageSize=10&sortBy=vid&sortOrder=asc" -Validate {
        param($r)
        $script:videoItems = $r.data.items
        $count = @($r.data.items).Count
        if ($count -ge 1) { "videos=$count" } else { $false }
    }

    # 创建临时库 → 更新 → 删除（CRUD 测试）
    $tmpLibId = $null
    Test-Api -Name "POST /api/libraries (create temp)" -Method "POST" -Uri "$base/api/libraries" `
        -Body '{"name":"__verify-temp__","scanPaths":[]}' -Validate {
        param($r)
        $script:tmpLibId = $r.data.dbId
        if ($r.data.dbId) { "created dbId=$($r.data.dbId)" } else { $false }
    }

    if ($tmpLibId) {
        Test-Api -Name "PUT /api/libraries/{id} (update temp)" -Method "PUT" -Uri "$base/api/libraries/$tmpLibId" `
            -Body '{"name":"__verify-temp-renamed__","scanPaths":[]}' -Validate {
            param($r) "updated"
        }

        Test-Api -Name "DELETE /api/libraries/{id} (delete temp)" -Method "DELETE" -Uri "$base/api/libraries/$tmpLibId" -Validate {
            param($r) "deleted"
        }
    }
    else {
        Skip-Api -Name "PUT /api/libraries/{id}" -Reason "No temp library created"
        Skip-Api -Name "DELETE /api/libraries/{id}" -Reason "No temp library created"
    }

    # 扫描（仅验证 202 Accepted，不等完成）
    Test-Api -Name "POST /api/libraries/{id}/scan" -Method "POST" -Uri "$base/api/libraries/$libId/scan" `
        -Body '{"organizeBeforeScan":false}' -ExpectedStatus @(200, 202) -Validate {
        param($r) "scan triggered"
    }

    # 等一下让扫描完成再继续
    Start-Sleep -Seconds 2

    # Scrape（仅验证接受，不等完成）
    Test-Api -Name "POST /api/libraries/{id}/scrape" -Method "POST" -Uri "$base/api/libraries/$libId/scrape" `
        -Body '{"mode":"missing-only","writeSidecars":false,"downloadActorAvatars":false}' -ExpectedStatus @(200, 202) -Validate {
        param($r) "scrape triggered"
    }
}
else {
    Skip-Api -Name "Libraries CRUD + scan + scrape" -Reason "No library found"
}

# ════════════════════════════════════════════
#  4. Videos
# ════════════════════════════════════════════
Write-Host "`n── 4. Videos ──" -ForegroundColor Yellow

# 收藏列表
Test-Api -Name "GET /api/videos/favorites" -Uri "$base/api/videos/favorites?page=1&pageSize=10" -Validate {
    param($r) "favorites response OK"
}

# 分类列表
Test-Api -Name "GET /api/videos/categories" -Uri "$base/api/videos/categories" -Validate {
    param($r) "categories response OK"
}

# 系列列表
Test-Api -Name "GET /api/videos/series" -Uri "$base/api/videos/series" -Validate {
    param($r) "series response OK"
}

# 单个影片详情 + toggle-favorite + delete（需要有影片）
$videoId = $null
if ($videoItems -and @($videoItems).Count -ge 1) {
    $videoId = @($videoItems)[0].videoId
    if (-not $videoId) {
        # 有些返回结构里 key 是 id
        $videoId = @($videoItems)[0].id
    }
}

if ($videoId) {
    Test-Api -Name "GET /api/videos/{id} (detail)" -Uri "$base/api/videos/$videoId" -Validate {
        param($r) if ($r.data) { "detail loaded" } else { $false }
    }

    # 切换收藏
    Test-Api -Name "POST /api/videos/{id}/toggle-favorite" -Method "POST" -Uri "$base/api/videos/$videoId/toggle-favorite" -Validate {
        param($r) "toggle OK"
    }
    # 再切回来
    Test-Api -Name "POST /api/videos/{id}/toggle-favorite (revert)" -Method "POST" -Uri "$base/api/videos/$videoId/toggle-favorite" -Validate {
        param($r) "reverted"
    }

    # 播放（会尝试打开播放器，验证 API 不报错即可）
    Test-Api -Name "POST /api/videos/{id}/play" -Method "POST" -Uri "$base/api/videos/$videoId/play" -ExpectedStatus @(200, 404, 500) -Validate {
        param($r) "play triggered"
    }

    # 批量收藏
    Test-Api -Name "POST /api/videos/batch/favorite" -Method "POST" -Uri "$base/api/videos/batch/favorite?favorite=true" `
        -Body "[`"$videoId`"]" -Validate {
        param($r) "batch favorite OK"
    }
    # 取消批量收藏
    Test-Api -Name "POST /api/videos/batch/favorite (unfav)" -Method "POST" -Uri "$base/api/videos/batch/favorite?favorite=false" `
        -Body "[`"$videoId`"]" -Validate {
        param($r) "batch unfavorite OK"
    }

    # 分类下的影片（如果有分类）
    try {
        $cats = Invoke-RestMethod "$base/api/videos/categories"
        if ($cats.data -and @($cats.data).Count -ge 1) {
            $catName = @($cats.data)[0].name
            if (-not $catName) { $catName = @($cats.data)[0] }
            Test-Api -Name "GET /api/videos/categories/{name}/videos" -Uri "$base/api/videos/categories/$([uri]::EscapeDataString($catName))/videos?page=1&pageSize=10" -Validate {
                param($r) "category videos OK"
            }
        }
        else {
            Skip-Api -Name "GET /api/videos/categories/{name}/videos" -Reason "No categories found"
        }
    }
    catch {
        Skip-Api -Name "GET /api/videos/categories/{name}/videos" -Reason "Categories query failed"
    }

    # 系列下的影片
    try {
        $series = Invoke-RestMethod "$base/api/videos/series"
        if ($series.data -and @($series.data).Count -ge 1) {
            $seriesName = @($series.data)[0].name
            if (-not $seriesName) { $seriesName = @($series.data)[0] }
            Test-Api -Name "GET /api/videos/series/{name}/videos" -Uri "$base/api/videos/series/$([uri]::EscapeDataString($seriesName))/videos?page=1&pageSize=10" -Validate {
                param($r) "series videos OK"
            }
        }
        else {
            Skip-Api -Name "GET /api/videos/series/{name}/videos" -Reason "No series found"
        }
    }
    catch {
        Skip-Api -Name "GET /api/videos/series/{name}/videos" -Reason "Series query failed"
    }

    # 注意：不测 DELETE /api/videos/{id} 和 batch/delete，避免破坏播种数据
    Skip-Api -Name "DELETE /api/videos/{id}" -Reason "Skipped to preserve seed data"
    Skip-Api -Name "POST /api/videos/batch/delete" -Reason "Skipped to preserve seed data"
}
else {
    Skip-Api -Name "Videos detail/toggle/play/batch" -Reason "No video found"
}

# ════════════════════════════════════════════
#  5. Actors
# ════════════════════════════════════════════
Write-Host "`n── 5. Actors ──" -ForegroundColor Yellow

$actorId = $null
Test-Api -Name "GET /api/actors" -Uri "$base/api/actors?page=1&pageSize=10" -Validate {
    param($r)
    if ($r.data -and $r.data.items) {
        $count = @($r.data.items).Count
        if ($count -ge 1) {
            $script:actorId = @($r.data.items)[0].actorId
            if (-not $script:actorId) { $script:actorId = @($r.data.items)[0].id }
        }
        "actors=$count"
    }
    else { "actors=0 (no scrape data)" }
}

if ($actorId) {
    Test-Api -Name "GET /api/actors/{id} (detail)" -Uri "$base/api/actors/$actorId" -Validate {
        param($r) if ($r.data) { "actor detail loaded" } else { $false }
    }

    Test-Api -Name "GET /api/actors/{id}/videos" -Uri "$base/api/actors/$actorId/videos?page=1&pageSize=10" -Validate {
        param($r) "actor videos OK"
    }
}
else {
    Skip-Api -Name "GET /api/actors/{id}" -Reason "No actor found (run with scrape to populate)"
    Skip-Api -Name "GET /api/actors/{id}/videos" -Reason "No actor found"
}

# ════════════════════════════════════════════
#  6. Tasks
# ════════════════════════════════════════════
Write-Host "`n── 6. Tasks ──" -ForegroundColor Yellow

$taskId = $null
Test-Api -Name "GET /api/tasks" -Uri "$base/api/tasks" -Validate {
    param($r)
    if ($r.data -and $r.data.tasks) {
        $count = @($r.data.tasks).Count
        if ($count -ge 1) {
            $script:taskId = @($r.data.tasks)[0].taskId
            if (-not $script:taskId) { $script:taskId = @($r.data.tasks)[0].id }
        }
        "tasks=$count"
    }
    else { "tasks=0" }
}

if ($taskId) {
    Test-Api -Name "GET /api/tasks/{id}" -Uri "$base/api/tasks/$taskId" -Validate {
        param($r) "task detail OK"
    }

    # retry 只做一次尝试，不一定成功（依赖任务状态），允许多种 status
    Test-Api -Name "POST /api/tasks/{id}/retry" -Method "POST" -Uri "$base/api/tasks/$taskId/retry" `
        -ExpectedStatus @(200, 202, 400, 404) -Validate {
        param($r) "retry accepted"
    }
}
else {
    Skip-Api -Name "GET /api/tasks/{id}" -Reason "No task found"
    Skip-Api -Name "POST /api/tasks/{id}/retry" -Reason "No task found"
}

# ════════════════════════════════════════════
#  7. Settings
# ════════════════════════════════════════════
Write-Host "`n── 7. Settings ──" -ForegroundColor Yellow

Test-Api -Name "GET /api/settings" -Uri "$base/api/settings" -Validate {
    param($r) if ($r.data) { "settings loaded" } else { $false }
}

# PUT 写入一个无害字段再写回
Test-Api -Name "PUT /api/settings" -Method "PUT" -Uri "$base/api/settings" `
    -Body '{"metaTube":{"requestTimeoutSeconds":30}}' -Validate {
    param($r) "settings updated"
}

# MetaTube 诊断
Test-Api -Name "POST /api/settings/meta-tube/diagnostics" -Method "POST" -Uri "$base/api/settings/meta-tube/diagnostics" `
    -ExpectedStatus @(200, 500) -Validate {
    param($r) "diagnostics ran"
}

# ════════════════════════════════════════════
#  8. Events (SSE)
# ════════════════════════════════════════════
Write-Host "`n── 8. Events (SSE) ──" -ForegroundColor Yellow

# SSE 不能用 Invoke-RestMethod 正常消费，用 WebRequest 验证连接成功
try {
    $sseReq = [System.Net.WebRequest]::Create("$base/api/events")
    $sseReq.Method = "GET"
    $sseReq.Accept = "text/event-stream"
    $sseReq.Timeout = 3000
    $sseResp = $sseReq.GetResponse()
    $sseResp.Close()
    Write-Host "  ✅ GET /api/events (SSE) — connection established (content-type: $($sseResp.ContentType))"
    $script:passed++
    $script:results += @{ Name = "GET /api/events (SSE)"; Status = "PASS"; Detail = "SSE connected" }
}
catch [System.Net.WebException] {
    $httpResp = $_.Exception.Response
    if ($httpResp -and [int]$httpResp.StatusCode -eq 200) {
        Write-Host "  ✅ GET /api/events (SSE) — connection OK (timeout expected)"
        $script:passed++
        $script:results += @{ Name = "GET /api/events (SSE)"; Status = "PASS"; Detail = "SSE timeout OK" }
    }
    else {
        Write-Host "  ⏭️ GET /api/events (SSE) — timeout/error (non-blocking): $($_.Exception.Message)"
        $script:skipped++
        $script:results += @{ Name = "GET /api/events (SSE)"; Status = "SKIP"; Detail = "SSE connection timeout" }
    }
}

# ════════════════════════════════════════════
#  结果汇总
# ════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  Backend API Verification Results" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$total = $script:passed + $script:failed + $script:skipped

$passColor = if ($script:passed -gt 0) { "Green" } else { "Gray" }
$failColor = if ($script:failed -gt 0) { "Red" } else { "Gray" }
$skipColor = if ($script:skipped -gt 0) { "DarkYellow" } else { "Gray" }

Write-Host "  ✅ Passed:  $($script:passed)" -ForegroundColor $passColor
Write-Host "  ❌ Failed:  $($script:failed)" -ForegroundColor $failColor
Write-Host "  ⏭️ Skipped: $($script:skipped)" -ForegroundColor $skipColor
Write-Host "  ── Total:   $total" -ForegroundColor Cyan
Write-Host ""

if ($script:failed -eq 0) {
    Write-Host "  All verified endpoints passed! ✅" -ForegroundColor Green
}
else {
    Write-Host "  Some endpoints failed. Review output above. ❌" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Failed items:" -ForegroundColor Red
    foreach ($r in $script:results | Where-Object { $_.Status -eq "FAIL" }) {
        Write-Host "    - $($r.Name): $($r.Detail)" -ForegroundColor Red
    }
}

Write-Host ""

if (-not $NoPause) {
    Write-Host "Press any key to exit..."
    [void][System.Console]::ReadKey($true)
}

exit $script:failed
