# Run only integration tests (API contract tests, requires Worker startup)
# Usage:
#   .\run-integration-tests.ps1          # Interactive
#   .\run-integration-tests.ps1 -NoPause # CI mode

param([switch]$NoPause)

$ErrorActionPreference = 'Stop'
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectDir = Split-Path -Parent $scriptDir
$csproj = Join-Path $projectDir 'Jvedio.Worker.Tests.csproj'

Write-Host "=== Jvedio.Worker.Tests — Integration Tests ===" -ForegroundColor Cyan
Write-Host "Project: $csproj"
Write-Host ""

try {
    dotnet test $csproj --configuration Release --verbosity normal --filter "FullyQualifiedName~ContractTests" --logger "console;verbosity=detailed"
    $exitCode = $LASTEXITCODE
}
catch {
    Write-Host "ERROR: $($_.Exception.Message)" -ForegroundColor Red
    $exitCode = 1
}

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "INTEGRATION TESTS PASSED" -ForegroundColor Green
}
else {
    Write-Host "INTEGRATION TESTS FAILED (exit code: $exitCode)" -ForegroundColor Red
}

if (-not $NoPause -and -not $env:JVEDIO_TEST_NO_PAUSE -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    try {
        $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
    }
    catch {
    }
}


exit $exitCode
