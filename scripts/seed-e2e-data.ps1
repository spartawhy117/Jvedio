#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：E2E 测试数据播种。
.DESCRIPTION
    转发到 `test-data/scripts/seed-e2e-data.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause,
    [switch]$SkipWorkerShutdown,
    [switch]$SkipScrape
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'test-data\scripts\seed-e2e-data.ps1'

$arguments = @()
if ($NoPause) { $arguments += '-NoPause' }
if ($SkipWorkerShutdown) { $arguments += '-SkipWorkerShutdown' }
if ($SkipScrape) { $arguments += '-SkipScrape' }

& $targetScript @arguments
exit $LASTEXITCODE
