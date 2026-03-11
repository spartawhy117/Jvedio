param(
    [switch]$NoPause
)

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$msbuild = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
$vstest = "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TestWindow\vstest.console.exe"

Push-Location $root
& $msbuild ".\Jvedio.Test.csproj" -target:Build -property:Configuration=Release -maxcpucount
& $vstest ".\bin\Release\Jvedio.Test.dll" /Tests:CanWarmupMetaTubeServer,CanSearchMovieByVid,CanFetchMovieDetailAndConvert,CanFetchActorAvatarWhenAvailable,CanWriteTestOutputFiles
Pop-Location

if (-not $NoPause -and -not $env:JVEDIO_TEST_NO_PAUSE) {
    Read-Host "Done. Press Enter to exit"
}
