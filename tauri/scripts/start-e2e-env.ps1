#!/usr/bin/env pwsh
param(
    [switch]$NoPause,
    [switch]$SkipBackendVerify
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$runtimeDir = Join-Path $repoRoot "log\test\e2e\runtime"
$statePath = Join-Path $runtimeDir "frontend-env.json"
$seedScript = Join-Path $repoRoot "test-data\scripts\seed-e2e-data.ps1"
$verifyScript = Join-Path $repoRoot "test-data\scripts\verify-backend-apis.ps1"
$stopScript = Join-Path $scriptDir "stop-e2e-env.ps1"
$e2eEnvPath = Join-Path $repoRoot "test-data\e2e\e2e-env.json"
$viteStdoutPath = Join-Path $runtimeDir "vite-stdout.log"
$viteStderrPath = Join-Path $runtimeDir "vite-stderr.log"

function Read-LogTail {
    param(
        [string]$Path,
        [int]$Tail = 40
    )

    if (-not (Test-Path $Path)) {
        return "(missing)"
    }

    $lines = Get-Content $Path -Tail $Tail -ErrorAction SilentlyContinue
    if ($null -eq $lines -or $lines.Count -eq 0) {
        return "(empty)"
    }

    return ($lines -join [Environment]::NewLine)
}

function Wait-HttpReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 60
    )

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return
            }
        }
        catch {
            Start-Sleep -Milliseconds 500
        }
    }

    throw "Timed out waiting for HTTP service: $Url"
}

New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null

Write-Host "[start-e2e-env] Resetting previous E2E environment..." -ForegroundColor Cyan
& $stopScript -NoPause

if (Test-Path $viteStdoutPath) {
    Remove-Item $viteStdoutPath -Force
}

if (Test-Path $viteStderrPath) {
    Remove-Item $viteStderrPath -Force
}

Write-Host "[start-e2e-env] Seeding backend data..." -ForegroundColor Cyan
& $seedScript -SkipWorkerShutdown -NoPause
if ($LASTEXITCODE -ne 0) {
    throw "seed-e2e-data.ps1 failed with exit code $LASTEXITCODE."
}

if (-not $SkipBackendVerify) {
    Write-Host "[start-e2e-env] Verifying backend APIs..." -ForegroundColor Cyan
    & $verifyScript -NoPause
    if ($LASTEXITCODE -ne 0) {
        throw "verify-backend-apis.ps1 failed with exit code $LASTEXITCODE."
    }
}

if (-not (Test-Path $e2eEnvPath)) {
    throw "Missing e2e env file: $e2eEnvPath"
}

$e2eEnv = Get-Content $e2eEnvPath -Raw | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace($e2eEnv.baseUrl)) {
    throw "e2e-env.json does not contain baseUrl."
}

$workerUri = [Uri]$e2eEnv.baseUrl
$viteUrl = "http://127.0.0.1:1420"
$browserUrl = "${viteUrl}?workerPort=$($workerUri.Port)"

Write-Host "[start-e2e-env] Starting Vite dev server..." -ForegroundColor Cyan
$viteProcess = Start-Process `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "1420") `
    -WorkingDirectory (Join-Path $repoRoot "tauri") `
    -PassThru `
    -RedirectStandardOutput $viteStdoutPath `
    -RedirectStandardError $viteStderrPath

try {
    Wait-HttpReady -Url $viteUrl -TimeoutSeconds 60
}
catch {
    try {
        taskkill /PID $viteProcess.Id /T /F | Out-Null
    }
    catch {
    }

    $stdoutTail = Read-LogTail -Path $viteStdoutPath
    $stderrTail = Read-LogTail -Path $viteStderrPath
    throw "Failed to start Vite dev server. stdout:`n$stdoutTail`n`nstderr:`n$stderrTail"
}

$state = @{
    createdAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    backendVerified = (-not $SkipBackendVerify)
    workerBaseUrl = $e2eEnv.baseUrl
    workerPid = $e2eEnv.workerPid
    workerPort = $workerUri.Port
    vitePid = $viteProcess.Id
    viteUrl = $viteUrl
    browserUrl = $browserUrl
    runtimeDir = $runtimeDir
    logs = @{
        viteStdout = $viteStdoutPath
        viteStderr = $viteStderrPath
    }
} | ConvertTo-Json -Depth 5

Set-Content -Path $statePath -Value $state -Encoding UTF8

Write-Host ""
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  Phase 10 frontend environment ready" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host "  Worker:  $($e2eEnv.baseUrl)"
Write-Host "  Browser: $browserUrl"
Write-Host "  State:   $statePath"
Write-Host ""

if (-not $NoPause) {
    Write-Host "Press any key to exit..."
    [void][System.Console]::ReadKey($true)
}
