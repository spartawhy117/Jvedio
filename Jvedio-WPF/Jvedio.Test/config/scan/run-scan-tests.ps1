$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$msbuild = "C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe"
$vstest = "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TestWindow\vstest.console.exe"

Push-Location $root
& $msbuild "Jvedio.Test\Jvedio.Test.csproj" -target:Build -property:Configuration=Release -maxcpucount
& $vstest "Jvedio.Test\bin\Release\Jvedio.Test.dll" /Tests:CanOrganizeFlatVideoIntoDedicatedDirectory,CanMoveSiblingSubtitleTogether,SkipsMovieWhenOrganizationFails,ScanTaskUsesOrganizedPathAfterMove,FailedOrganizationMovieIsMarkedAsNotImport
Pop-Location

Read-Host "测试完成，按回车退出"
