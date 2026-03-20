# package-portable.ps1
# Post-build script: collect Tauri build artifacts and create a portable ZIP archive.
# Output: build/release/JvedioNext_<version>_x64-portable.zip

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
# Tauri 2 produces <productName>.exe in target/release/
$mainExe = Join-Path $targetRelease "JvedioNext.exe"
if (-not (Test-Path $mainExe)) {
    # Fallback: try lowercase / hyphenated variants
    $candidates = @("jvedio-next.exe", "jvedio_next.exe", "jvedionext.exe")
    foreach ($c in $candidates) {
        $p = Join-Path $targetRelease $c
        if (Test-Path $p) { $mainExe = $p; break }
    }
}
if (-not (Test-Path $mainExe)) {
    Write-Error "[package-portable] FATAL: Cannot find main exe in $targetRelease"
    exit 1
}

# ── Create a temp staging directory ───────────────────────────────────
$stageDir = Join-Path $repoRoot "build\portable-stage"
if (Test-Path $stageDir) { Remove-Item $stageDir -Recurse -Force }
New-Item -ItemType Directory -Path $stageDir -Force | Out-Null

# ── Copy artifacts ────────────────────────────────────────────────────

# 1. Main exe
Copy-Item $mainExe $stageDir -Force
Write-Host "[package-portable] Copied: $(Split-Path -Leaf $mainExe)"

# 2. WebView2Loader.dll (required by Tauri)
$webview2 = Join-Path $targetRelease "WebView2Loader.dll"
if (Test-Path $webview2) {
    Copy-Item $webview2 $stageDir -Force
    Write-Host "[package-portable] Copied: WebView2Loader.dll"
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

# 5. Any additional DLLs in release root (e.g. tauri plugins)
$extraDlls = Get-ChildItem -Path $targetRelease -Filter "*.dll" -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ne "WebView2Loader.dll" -and $_.Name -notlike "jvedio_shell*" }
foreach ($dll in $extraDlls) {
    Copy-Item $dll.FullName $stageDir -Force
    Write-Host "[package-portable] Copied: $($dll.Name)"
}

# ── Create output directory ───────────────────────────────────────────
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
}

# ── Create ZIP archive ───────────────────────────────────────────────
$archivePath = Join-Path $releaseDir $archiveName
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }
Compress-Archive -Path "$stageDir\*" -DestinationPath $archivePath -Force
Write-Host "[package-portable] Created: $archiveName -> build/release/"

# ── Cleanup staging ──────────────────────────────────────────────────
Remove-Item $stageDir -Recurse -Force
Write-Host "[package-portable] Cleaned up staging directory."
Write-Host "[package-portable] Done."
