#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：清理 E2E 测试环境。
.DESCRIPTION
    转发到 `test-data/scripts/cleanup-e2e-data.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause,
    [switch]$CleanLogs
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'test-data\scripts\cleanup-e2e-data.ps1'

$arguments = @()
if ($NoPause) { $arguments += '-NoPause' }
if ($CleanLogs) { $arguments += '-CleanLogs' }

& $targetScript @arguments
exit $LASTEXITCODE
