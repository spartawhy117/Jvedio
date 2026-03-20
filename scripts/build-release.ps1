#!/usr/bin/env pwsh
<#
.SYNOPSIS
    一键构建 JvedioNext 便携版 ZIP。
.DESCRIPTION
    等价于 cd tauri && npm run build:release，
    但可以从仓库根目录直接执行。
#>
param(
    [switch]$SkipWorker   # 跳过 Worker 编译（适合只改了前端/Rust 时加速）
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot/tauri

try {
    if (-not $SkipWorker) {
        Write-Host "`n[1/3] prepare-worker ..." -ForegroundColor Cyan
        npm run prepare-worker
        if ($LASTEXITCODE -ne 0) { throw "prepare-worker failed" }
    } else {
        Write-Host "`n[1/3] prepare-worker ... SKIPPED (-SkipWorker)" -ForegroundColor Yellow
    }

    Write-Host "`n[2/3] tauri build ..." -ForegroundColor Cyan
    npx tauri build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed" }

    Write-Host "`n[3/3] package-portable ..." -ForegroundColor Cyan
    pwsh -ExecutionPolicy Bypass -File scripts/package-portable.ps1
    if ($LASTEXITCODE -ne 0) { throw "package-portable failed" }

    Write-Host "`n✅ Build complete!" -ForegroundColor Green
    $zip = Get-ChildItem "$RepoRoot/build/release/*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($zip) {
        Write-Host "   $($zip.FullName)  ($([math]::Round($zip.Length/1MB,2)) MB)"
    }
} finally {
    Pop-Location
}
