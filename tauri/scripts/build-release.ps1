#!/usr/bin/env pwsh
<#
.SYNOPSIS
    构建 JvedioNext 便携版 ZIP（tauri 目录入口）。
.DESCRIPTION
    统一封装 prepare-worker → tauri build → package-portable，
    并在 rustup 已安装但 cargo 未进入 PATH 时自动补齐标准路径。
#>
param(
    [switch]$SkipWorker
)

$ErrorActionPreference = 'Stop'

function Ensure-CargoOnPath {
    $cargoCommand = Get-Command cargo -ErrorAction SilentlyContinue
    if ($cargoCommand) {
        return
    }

    $cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
    $cargoExe = Join-Path $cargoBin 'cargo.exe'
    if (Test-Path $cargoExe) {
        $env:PATH = "$cargoBin;$env:PATH"
        Write-Host "[build-release] Added cargo to PATH from $cargoBin" -ForegroundColor Yellow
        return
    }

    throw "cargo not found. Install Rust via rustup or add cargo to PATH."
}

$tauriRoot = Split-Path $PSScriptRoot -Parent
Push-Location $tauriRoot

try {
    Ensure-CargoOnPath

    if (-not $SkipWorker) {
        Write-Host "`n[1/3] prepare-worker ..." -ForegroundColor Cyan
        npm run prepare-worker
        if ($LASTEXITCODE -ne 0) { throw "prepare-worker failed" }
    } else {
        Write-Host "`n[1/3] prepare-worker ... SKIPPED (-SkipWorker)" -ForegroundColor Yellow
    }

    Write-Host "`n[2/3] tauri build ..." -ForegroundColor Cyan
    npm run tauri build
    if ($LASTEXITCODE -ne 0) { throw "tauri build failed" }

    Write-Host "`n[3/3] package-portable ..." -ForegroundColor Cyan
    pwsh -ExecutionPolicy Bypass -File scripts/package-portable.ps1
    if ($LASTEXITCODE -ne 0) { throw "package-portable failed" }
} finally {
    Pop-Location
}
