#!/usr/bin/env pwsh
param(
    [switch]$NoPause
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$runtimeDir = Join-Path $repoRoot "log\test\e2e\runtime"
$statePath = Join-Path $runtimeDir "frontend-env.json"
$e2eEnvPath = Join-Path $repoRoot "test-data\e2e\e2e-env.json"
$viteCommandPatterns = @(
    '*vite --host 127.0.0.1 --port 1420*',
    '*npm-cli.js" run dev -- --host 127.0.0.1 --port 1420*',
    '*npm.cmd run dev -- --host 127.0.0.1 --port 1420*'
)

function Stop-ProcessTreeIfExists {
    param([int]$TargetProcessId)

    if ($TargetProcessId -le 0) {
        return
    }

    try {
        taskkill /PID $TargetProcessId /T /F | Out-Null
    }
    catch {
    }
}

function Stop-ProcessIfExists {
    param([int]$TargetProcessId)

    if ($TargetProcessId -le 0) {
        return
    }

    try {
        $process = Get-Process -Id $TargetProcessId -ErrorAction SilentlyContinue
        if ($null -ne $process) {
            Stop-Process -Id $TargetProcessId -Force -ErrorAction SilentlyContinue
        }
    }
    catch {
    }
}

function Get-FallbackViteProcessIds {
    $matches = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        $commandLine = $_.CommandLine
        if ([string]::IsNullOrWhiteSpace($commandLine)) {
            return $false
        }

        foreach ($pattern in $viteCommandPatterns) {
            if ($commandLine -like $pattern) {
                return $true
            }
        }

        return $false
    }

    return @($matches | Select-Object -ExpandProperty ProcessId -Unique)
}

$state = $null
if (Test-Path $statePath) {
    $state = Get-Content $statePath -Raw | ConvertFrom-Json
}

$workerPid = 0
$vitePid = 0

if ($null -ne $state) {
    if ($state.PSObject.Properties.Name -contains "workerPid") {
        $workerPid = [int]$state.workerPid
    }
    if ($state.PSObject.Properties.Name -contains "vitePid") {
        $vitePid = [int]$state.vitePid
    }
}
elseif (Test-Path $e2eEnvPath) {
    $e2eEnv = Get-Content $e2eEnvPath -Raw | ConvertFrom-Json
    if ($e2eEnv.PSObject.Properties.Name -contains "workerPid") {
        $workerPid = [int]$e2eEnv.workerPid
    }
}

Write-Host "[stop-e2e-env] Stopping frontend acceptance environment..." -ForegroundColor Cyan
Stop-ProcessTreeIfExists -TargetProcessId $vitePid
Stop-ProcessIfExists -TargetProcessId $workerPid

if ($vitePid -le 0) {
    foreach ($fallbackProcessId in (Get-FallbackViteProcessIds)) {
        Stop-ProcessTreeIfExists -TargetProcessId ([int]$fallbackProcessId)
    }
}

if (Test-Path $statePath) {
    Remove-Item $statePath -Force
}

Write-Host "[stop-e2e-env] Environment stopped." -ForegroundColor Green

if (-not $NoPause) {
    Write-Host "Press any key to exit..."
    [void][System.Console]::ReadKey($true)
}
