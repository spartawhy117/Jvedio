#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：拉起前端 E2E 验收环境。
.DESCRIPTION
    转发到 `tauri/scripts/start-e2e-env.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause,
    [switch]$SkipBackendVerify
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'tauri\scripts\start-e2e-env.ps1'

$arguments = @()
if ($NoPause) { $arguments += '-NoPause' }
if ($SkipBackendVerify) { $arguments += '-SkipBackendVerify' }

& $targetScript @arguments
exit $LASTEXITCODE
