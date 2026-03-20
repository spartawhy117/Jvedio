# prepare-worker.ps1
# Pre-build script: compile Jvedio.Worker and stage output into build/worker-stage/
# This directory is referenced by tauri.conf.json bundle.resources so the
# Worker gets included in the final installer (msi / nsis).
#
# Uses `dotnet publish` (not `dotnet build`) so that all runtime-specific native
# libraries (e.g. e_sqlite3.dll) are resolved and placed flat in the output
# directory.  This avoids the runtimes/{rid}/native/ subdirectory structure that
# Tauri's bundle.resources flattening would break.

param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriRoot   = Split-Path -Parent $scriptDir                          # tauri/
$repoRoot    = Split-Path -Parent $tauriRoot                          # repo root
$workerProj  = Join-Path $repoRoot "dotnet\Jvedio.Worker\Jvedio.Worker.csproj"
$workerStage = Join-Path $repoRoot "build\worker-stage"

Write-Host "[prepare-worker] Publishing Jvedio.Worker ($Configuration, win-x64)..."
dotnet publish $workerProj -c $Configuration -r win-x64 --self-contained false -o $workerStage
if ($LASTEXITCODE -ne 0) { throw "Worker publish failed" }

Write-Host "[prepare-worker] Done. Worker staged at: $workerStage"
