param(
    [switch]$CleanLogTest,
    [string[]]$TestDataDirs,
    [switch]$All,
    [switch]$NoPause
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$repoRoot = [System.IO.Path]::GetFullPath((Join-Path $scriptDir ".."))
$logTestRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "log\test"))
$testDataRoot = [System.IO.Path]::GetFullPath((Join-Path $repoRoot "test-data"))
$defaultTestDataDirs = @(
    "e2e\data",
    "e2e\videos\lib-a",
    "e2e\videos\lib-b"
)

function Pause-IfNeeded {
    if (-not $NoPause) {
        Write-Host ""
        Write-Host "Press any key to exit..."
        [void][System.Console]::ReadKey($true)
    }
}

function To-RepoRelativePath {
    param([string]$FullPath)

    $repoUri = [Uri]($repoRoot.TrimEnd("\") + "\")
    $targetUri = [Uri]$FullPath
    return [Uri]::UnescapeDataString($repoUri.MakeRelativeUri($targetUri).ToString().Replace("/", "\"))
}

function Resolve-TestDataTarget {
    param([string]$RelativePath)

    $fullPath = [System.IO.Path]::GetFullPath((Join-Path $testDataRoot $RelativePath))
    if (-not $fullPath.StartsWith($testDataRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Refusing to clean path outside test-data: $RelativePath"
    }

    return $fullPath
}

function Ensure-Directory {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Remove-DirectoryContents {
    param([string]$Path)

    Ensure-Directory -Path $Path
    Get-ChildItem -Path $Path -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction Stop
}

$selectedTestDataDirs = @()
if ($All -or ((-not $CleanLogTest) -and ($null -eq $TestDataDirs -or $TestDataDirs.Count -eq 0))) {
    $CleanLogTest = $true
    $selectedTestDataDirs = $defaultTestDataDirs
} elseif ($null -ne $TestDataDirs) {
    $selectedTestDataDirs = $TestDataDirs
}

$fullTargets = New-Object System.Collections.Generic.List[string]
if ($CleanLogTest) {
    $fullTargets.Add($logTestRoot)
}

foreach ($relativeDir in $selectedTestDataDirs) {
    $fullTargets.Add((Resolve-TestDataTarget -RelativePath $relativeDir))
}

if ($fullTargets.Count -eq 0) {
    Write-Host "Nothing selected. Use -CleanLogTest, -TestDataDirs, or -All." -ForegroundColor Yellow
    Pause-IfNeeded
    exit 0
}

$fullTargets = $fullTargets | Select-Object -Unique
$relativeTargets = $fullTargets | ForEach-Object { To-RepoRelativePath -FullPath $_ }

Write-Host "[cleanup-test-artifacts] Repo root: $repoRoot" -ForegroundColor Cyan
Write-Host "[cleanup-test-artifacts] Targets:" -ForegroundColor Cyan
$relativeTargets | ForEach-Object { Write-Host "  - $_" }

$gitAvailable = $null -ne (Get-Command git -ErrorAction SilentlyContinue)
if ($gitAvailable) {
    Push-Location $repoRoot
    try {
        & git restore --source=HEAD --worktree -- @relativeTargets
        & git clean -fd -- @relativeTargets
    } finally {
        Pop-Location
    }
} else {
    foreach ($target in $fullTargets) {
        Remove-DirectoryContents -Path $target
    }
}

if ($CleanLogTest) {
    Ensure-Directory -Path $logTestRoot
    Ensure-Directory -Path (Join-Path $logTestRoot "e2e")
    if (-not (Test-Path (Join-Path $logTestRoot "e2e\.gitkeep"))) {
        Set-Content -Path (Join-Path $logTestRoot "e2e\.gitkeep") -Value "" -Encoding ASCII
    }
}

Write-Host "[cleanup-test-artifacts] Cleanup completed." -ForegroundColor Green
Pause-IfNeeded
