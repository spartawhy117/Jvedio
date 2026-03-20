#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：后端 API 校验。
.DESCRIPTION
    转发到 `test-data/scripts/verify-backend-apis.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause,
    [string]$BaseUrl
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'test-data\scripts\verify-backend-apis.ps1'

$arguments = @()
if ($NoPause) { $arguments += '-NoPause' }
if (-not [string]::IsNullOrWhiteSpace($BaseUrl)) {
    $arguments += '-BaseUrl'
    $arguments += $BaseUrl
}

& $targetScript @arguments
exit $LASTEXITCODE
