#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：停止前端 E2E 验收环境。
.DESCRIPTION
    转发到 `tauri/scripts/stop-e2e-env.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'tauri\scripts\stop-e2e-env.ps1'

$invokeArgs = @{}
if ($NoPause) { $invokeArgs.NoPause = $true }

& $targetScript @invokeArgs
exit $LASTEXITCODE
