# copy-release.ps1
# Post-build script: copy NSIS installer from Tauri bundle output to build/release/
# This provides a single, easy-to-find location for the final distributable.

$ErrorActionPreference = "Stop"

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriRoot   = Split-Path -Parent $scriptDir                          # tauri/
$repoRoot    = Split-Path -Parent $tauriRoot                          # repo root
$nsisDir     = Join-Path $tauriRoot "src-tauri\target\release\bundle\nsis"
$releaseDir  = Join-Path $repoRoot "build\release"

if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
}

$installers = Get-ChildItem -Path $nsisDir -Filter "*-setup.exe" -ErrorAction SilentlyContinue
if ($installers.Count -eq 0) {
    Write-Host "[copy-release] WARNING: No NSIS installer found in $nsisDir"
    exit 0
}

foreach ($installer in $installers) {
    $dest = Join-Path $releaseDir $installer.Name
    Copy-Item $installer.FullName $dest -Force
    Write-Host "[copy-release] Copied: $($installer.Name) -> build/release/"
}

Write-Host "[copy-release] Done."
