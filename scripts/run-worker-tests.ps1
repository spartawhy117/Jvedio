#!/usr/bin/env pwsh
<#
.SYNOPSIS
    根目录统一入口：运行 Worker 全量测试。
.DESCRIPTION
    转发到 `dotnet/Jvedio.Worker.Tests/scripts/run-all-tests.ps1`，保留原有实现位置。
#>
param(
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path $PSScriptRoot -Parent
$targetScript = Join-Path $repoRoot 'dotnet\Jvedio.Worker.Tests\scripts\run-all-tests.ps1'

$arguments = @()
if ($NoPause) { $arguments += '-NoPause' }

& $targetScript @arguments
exit $LASTEXITCODE
