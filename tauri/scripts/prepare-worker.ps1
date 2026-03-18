# prepare-worker.ps1
# Pre-build script: compile Jvedio.Worker and stage output into tauri/worker-dist/
# This directory is referenced by tauri.conf.json bundle.resources so the
# Worker gets included in the final installer (msi / nsis).

param(
    [string]$Configuration = "Release"
)

$ErrorActionPreference = "Stop"

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriRoot   = Split-Path -Parent $scriptDir                          # tauri/
$repoRoot    = Split-Path -Parent $tauriRoot                          # repo root
$workerProj  = Join-Path $repoRoot "Jvedio-WPF\Jvedio.Worker\Jvedio.Worker.csproj"
$workerOut   = Join-Path $repoRoot "Jvedio-WPF\Jvedio.Worker\bin\$Configuration\net8.0"
$workerDist  = Join-Path $tauriRoot "worker-dist"

Write-Host "[prepare-worker] Building Jvedio.Worker ($Configuration)..."
dotnet build $workerProj -c $Configuration
if ($LASTEXITCODE -ne 0) { throw "Worker build failed" }

Write-Host "[prepare-worker] Staging Worker artifacts to $workerDist ..."
if (Test-Path $workerDist) { Remove-Item -Recurse -Force $workerDist }
New-Item -ItemType Directory -Path $workerDist -Force | Out-Null

# Copy all files except logs
Get-ChildItem -Path $workerOut -Recurse -File | Where-Object { $_.Extension -ne ".log" } | ForEach-Object {
    $relativePath = $_.FullName.Substring($workerOut.Length + 1)
    $destPath = Join-Path $workerDist $relativePath
    $destDir = Split-Path -Parent $destPath
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $_.FullName $destPath -Force
}

Write-Host "[prepare-worker] Done. Worker staged at: $workerDist"
