# prepare-worker.ps1
# Pre-build script: compile Jvedio.Worker and stage output into tauri/worker-dist/
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
$publishOut  = Join-Path $tauriRoot "worker-publish"
$workerDist  = Join-Path $tauriRoot "worker-dist"

Write-Host "[prepare-worker] Publishing Jvedio.Worker ($Configuration, win-x64)..."
dotnet publish $workerProj -c $Configuration -r win-x64 --self-contained false -o $publishOut
if ($LASTEXITCODE -ne 0) { throw "Worker publish failed" }

Write-Host "[prepare-worker] Staging Worker artifacts to $workerDist ..."
if (Test-Path $workerDist) { Remove-Item -Recurse -Force $workerDist }
New-Item -ItemType Directory -Path $workerDist -Force | Out-Null

# Copy all files except logs (publish output is already flat, no runtimes/ subdir)
Get-ChildItem -Path $publishOut -Recurse -File | Where-Object { $_.Extension -ne ".log" } | ForEach-Object {
    $relativePath = $_.FullName.Substring($publishOut.Length + 1)
    $destPath = Join-Path $workerDist $relativePath
    $destDir = Split-Path -Parent $destPath
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $_.FullName $destPath -Force
}

# Clean up intermediate publish directory
Remove-Item -Recurse -Force $publishOut -ErrorAction SilentlyContinue

Write-Host "[prepare-worker] Done. Worker staged at: $workerDist"
