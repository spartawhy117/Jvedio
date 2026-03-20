<#
.SYNOPSIS
    一次性更新仓库内 4 个核心文件的版本号。

.DESCRIPTION
    修改以下文件中的版本号，确保全仓版本一致：
      1. tauri/package.json              — "version": "x.y.z"
      2. tauri/src-tauri/tauri.conf.json — "version": "x.y.z"
      3. tauri/src-tauri/Cargo.toml      — version = "x.y.z"
      4. dotnet/Jvedio/Jvedio.csproj     — <ApplicationVersion>x.y.z.0</ApplicationVersion>

    脚本会保留每个文件原有的 BOM 和换行符（LF / CRLF）。

.PARAMETER Version
    语义化版本号，格式 MAJOR.MINOR.PATCH（如 0.2.0）。

.EXAMPLE
    pwsh scripts/bump-version.ps1 -Version 0.2.0
#>
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^\d+\.\d+\.\d+$')]
    [string]$Version
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Bump version -> $Version" -ForegroundColor Cyan
Write-Host "  Repo root: $repoRoot" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# ---- Helper: 读取文件并保留 BOM 和换行符信息 ----
function Read-FilePreserving {
    param([string]$Path)
    $bytes = [System.IO.File]::ReadAllBytes($Path)
    $hasBom = $false
    $offset = 0
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $hasBom = $true
        $offset = 3
    }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes, $offset, $bytes.Length - $offset)
    return @{ Text = $text; HasBom = $hasBom }
}

# ---- Helper: 写回文件，保留原始 BOM ----
function Write-FilePreserving {
    param([string]$Path, [string]$Text, [bool]$HasBom)
    $enc = [System.Text.UTF8Encoding]::new($HasBom)
    [System.IO.File]::WriteAllBytes($Path, $enc.GetPreamble() + $enc.GetBytes($Text))
}

$changed = 0

# ---------- 通用替换函数 ----------
function Update-VersionInFile {
    param(
        [string]$FilePath,
        [string]$DisplayName,
        [string]$Pattern,
        [string]$Replacement
    )
    if (-not (Test-Path $FilePath)) {
        Write-Host "[WARN] $DisplayName not found" -ForegroundColor Red
        return $false
    }
    $info = Read-FilePreserving -Path $FilePath
    $newText = [regex]::Replace($info.Text, $Pattern, $Replacement)
    if ($newText -ne $info.Text) {
        Write-FilePreserving -Path $FilePath -Text $newText -HasBom $info.HasBom
        Write-Host "[OK] $DisplayName" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[SKIP] $DisplayName (already up-to-date or pattern not found)" -ForegroundColor Yellow
        return $false
    }
}

# ---------- 1. tauri/package.json ----------
$file1 = Join-Path $repoRoot "tauri\package.json"
if (Update-VersionInFile -FilePath $file1 -DisplayName "tauri/package.json" `
    -Pattern '("version"\s*:\s*")\d+\.\d+\.\d+"' `
    -Replacement "`${1}${Version}`"") {
    $changed++
}

# ---------- 2. tauri/src-tauri/tauri.conf.json ----------
$file2 = Join-Path $repoRoot "tauri\src-tauri\tauri.conf.json"
if (Update-VersionInFile -FilePath $file2 -DisplayName "tauri/src-tauri/tauri.conf.json" `
    -Pattern '("version"\s*:\s*")\d+\.\d+\.\d+"' `
    -Replacement "`${1}${Version}`"") {
    $changed++
}

# ---------- 3. tauri/src-tauri/Cargo.toml ----------
$file3 = Join-Path $repoRoot "tauri\src-tauri\Cargo.toml"
if (Update-VersionInFile -FilePath $file3 -DisplayName "tauri/src-tauri/Cargo.toml" `
    -Pattern '(?m)(^version\s*=\s*")\d+\.\d+\.\d+"' `
    -Replacement "`${1}${Version}`"") {
    $changed++
}

# ---------- 4. dotnet/Jvedio/Jvedio.csproj ----------
$file4 = Join-Path $repoRoot "dotnet\Jvedio\Jvedio.csproj"
$version4 = "$Version.0"
if (Update-VersionInFile -FilePath $file4 -DisplayName "dotnet/Jvedio/Jvedio.csproj" `
    -Pattern '(<ApplicationVersion>)\d+\.\d+\.\d+\.\d+(</ApplicationVersion>)' `
    -Replacement "`${1}${version4}`${2}") {
    $changed++
}

# ---------- Summary ----------
Write-Host ""
if ($changed -gt 0) {
    Write-Host "Done: $changed file(s) updated to $Version" -ForegroundColor Green
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. git diff  (review changes)"
    Write-Host "  2. git add -A && git commit -m `"chore: bump version to $Version`""
    Write-Host "  3. git tag -a v$Version -m `"Release $Version`""
    Write-Host "  4. git push && git push --tags"
} else {
    Write-Host "No files changed (all already at $Version)" -ForegroundColor Yellow
}
