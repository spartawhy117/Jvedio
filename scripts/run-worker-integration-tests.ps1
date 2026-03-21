#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：运行 Worker 集成测试。
.DESCRIPTION
    转发到 `dotnet/Jvedio.Worker.Tests/scripts/run-integration-tests.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'dotnet\Jvedio.Worker.Tests\scripts\run-integration-tests.ps1'

$invokeArgs = @{}
if ($NoPause) { $invokeArgs.NoPause = $true }

& $targetScript @invokeArgs
exit $LASTEXITCODE
