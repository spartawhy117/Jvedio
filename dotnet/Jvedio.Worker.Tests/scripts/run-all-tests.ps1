# Run all Jvedio.Worker.Tests
# Usage:
#   .\run-all-tests.ps1          # Interactive (pauses at end)
#   .\run-all-tests.ps1 -NoPause # CI mode (no pause)

param([switch]$NoPause)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectDir = Split-Path -Parent $scriptDir
$csproj = Join-Path $projectDir 'Jvedio.Worker.Tests.csproj'

Write-Host "=== Jvedio.Worker.Tests — All Tests ===" -ForegroundColor Cyan
Write-Host "Project: $csproj"
Write-Host ""

try {
    dotnet test $csproj --configuration Release --verbosity normal --logger "console;verbosity=detailed"
    $exitCode = $LASTEXITCODE
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "ALL TESTS PASSED" -ForegroundColor Green
}
else {
    Write-Host "TESTS FAILED (exit code: $exitCode)" -ForegroundColor Red
}

if (-not $NoPause -and -not $env:JVEDIO_TEST_NO_PAUSE) {
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
}

exit $exitCode
