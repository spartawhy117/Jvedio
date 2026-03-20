#!/usr/bin/env pwsh
<#
.SYNOPSIS
    一键构建 JvedioNext 便携版 ZIP。
.DESCRIPTION
    仓库根目录入口，委托 tauri/scripts/build-release.ps1 执行实际构建逻辑。
#>
param(
    [switch]$SkipWorker   # 跳过 Worker 编译（适合只改了前端/Rust 时加速）
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $RepoRoot/tauri

try {
    $args = @()
    if ($SkipWorker) {
        $args += '-SkipWorker'
    }

    pwsh -ExecutionPolicy Bypass -File scripts/build-release.ps1 @args
    if ($LASTEXITCODE -ne 0) { throw "build-release failed" }

    Write-Host "`n✅ Build complete!" -ForegroundColor Green
    $zip = Get-ChildItem "$RepoRoot/build/release/*.zip" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($zip) {
        Write-Host "   $($zip.FullName)  ($([math]::Round($zip.Length/1MB,2)) MB)"
    }
} finally {
    Pop-Location
}
