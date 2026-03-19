# Run only unit tests (non-network, fast)
# Usage:
#   .\run-unit-tests.ps1          # Interactive
#   .\run-unit-tests.ps1 -NoPause # CI mode

param([switch]$NoPause)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectDir = Split-Path -Parent $scriptDir
$csproj = Join-Path $projectDir 'Jvedio.Worker.Tests.csproj'

Write-Host "=== Jvedio.Worker.Tests — Unit Tests ===" -ForegroundColor Cyan
Write-Host "Project: $csproj"
Write-Host ""

try {
    dotnet test $csproj --configuration Release --verbosity normal --filter "FullyQualifiedName~DtoSerializationTests" --logger "console;verbosity=detailed"
    $exitCode = $LASTEXITCODE
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "UNIT TESTS PASSED" -ForegroundColor Green
}
else {
    Write-Host "UNIT TESTS FAILED (exit code: $exitCode)" -ForegroundColor Red
}

if (-not $NoPause -and -not $env:JVEDIO_TEST_NO_PAUSE) {
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
}

exit $exitCode
