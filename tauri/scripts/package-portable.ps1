# package-portable.ps1
# Post-build script: collect Tauri build artifacts and create a portable ZIP archive.
# Output: build/release/JvedioNext_<version>_x64-portable.zip
#
# When bundle.targets is empty, Tauri only compiles the Rust binary (named after
# the Cargo crate, e.g. jvedio-shell.exe) without renaming it to the productName.
# This script renames it to JvedioNext.exe for the end user.

$ErrorActionPreference = "Stop"

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Path
$tauriRoot   = Split-Path -Parent $scriptDir                          # tauri/
$repoRoot    = Split-Path -Parent $tauriRoot                          # repo root
$releaseDir  = Join-Path $repoRoot "build\release"

# Read version from tauri.conf.json
$tauriConf   = Get-Content (Join-Path $tauriRoot "src-tauri\tauri.conf.json") -Raw | ConvertFrom-Json
$version     = $tauriConf.version
$archiveName = "JvedioNext_${version}_x64-portable.zip"

# Tauri build output root
$targetRelease = Join-Path $tauriRoot "src-tauri\target\release"

# ── Locate the main exe ──────────────────────────────────────────────
# With empty bundle.targets, Tauri outputs the Cargo binary name (jvedio-shell.exe).
$mainExe = $null
$candidates = @("JvedioNext.exe", "jvedio-shell.exe", "jvedio_shell.exe", "jvedionext.exe")
foreach ($c in $candidates) {
    $p = Join-Path $targetRelease $c
    if (Test-Path $p) { $mainExe = $p; break }
}
if (-not $mainExe) {
    Write-Error "[package-portable] FATAL: Cannot find main exe in $targetRelease"
    exit 1
}
Write-Host "[package-portable] Found main exe: $(Split-Path -Leaf $mainExe)"

# ── Create a temp staging directory ───────────────────────────────────
$stageDir = Join-Path $repoRoot "build\portable-stage"
if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

# ── Copy artifacts ────────────────────────────────────────────────────

# 1. Main exe (rename to JvedioNext.exe if needed)
$destExeName = "JvedioNext.exe"
Copy-Item $mainExe (Join-Path $stageDir $destExeName) -Force
Write-Host "[package-portable] Copied: $(Split-Path -Leaf $mainExe) -> $destExeName"

# 2. All DLLs in release root (WebView2Loader.dll, plugin libs, etc.)
$dlls = Get-ChildItem -Path $targetRelease -Filter "*.dll" -File -ErrorAction SilentlyContinue
foreach ($dll in $dlls) {
    Copy-Item $dll.FullName $stageDir -Force
    Write-Host "[package-portable] Copied: $($dll.Name)"
}

# 3. resources/ directory (icons etc.)
$resourcesDir = Join-Path $targetRelease "resources"
if (Test-Path $resourcesDir) {
    Copy-Item $resourcesDir (Join-Path $stageDir "resources") -Recurse -Force
    Write-Host "[package-portable] Copied: resources/"
}

# 4. worker/ directory (Jvedio.Worker + dependencies)
$workerDir = Join-Path $targetRelease "worker"
if (Test-Path $workerDir) {
    Copy-Item $workerDir (Join-Path $stageDir "worker") -Recurse -Force
    Write-Host "[package-portable] Copied: worker/"
}

# ── Create output directory ───────────────────────────────────────────
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
}

# ── Create ZIP archive ───────────────────────────────────────────────
$archivePath = Join-Path $releaseDir $archiveName
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
Compress-Archive -Path "$stageDir\*" -DestinationPath $archivePath -Force

$sizeMB = [math]::Round((Get-Item $archivePath).Length / 1MB, 2)
Write-Host "[package-portable] Created: $archiveName ($sizeMB MB) -> build/release/"

# ── Cleanup staging ──────────────────────────────────────────────────
Remove-Item $stageDir -Recurse -Force
Write-Host "[package-portable] Cleaned up staging directory."
Write-Host "[package-portable] Done."
