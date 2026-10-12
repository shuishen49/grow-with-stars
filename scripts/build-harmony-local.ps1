param(
  [ValidateSet('debug', 'release')]
  [string]$BuildMode = 'debug'
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ToolsRoot = if ($env:HARMONY_TOOLS_ROOT) { $env:HARMONY_TOOLS_ROOT } else { 'D:\harmony-tools\command-line-tools' }
$JavaHome = if ($env:JAVA_HOME) { $env:JAVA_HOME } else {
  $jdk = Get-ChildItem 'D:\harmony-tools\jdk17' -Directory -ErrorAction SilentlyContinue |
    Where-Object { Test-Path (Join-Path $_.FullName 'bin\java.exe') } | Select-Object -First 1
  if ($jdk) { $jdk.FullName } else { $null }
}

if (-not $JavaHome -or -not (Test-Path (Join-Path $JavaHome 'bin\java.exe'))) {
  throw '未找到 JDK。请确认 JDK 位于 D:\harmony-tools\jdk17，或设置 JAVA_HOME。'
}
$env:JAVA_HOME = $JavaHome
$env:Path = (Join-Path $JavaHome 'bin') + ';' + $env:Path

$Hvigor = @(
  (Join-Path $ToolsRoot 'bin\hvigorw.bat'),
  (Join-Path $ToolsRoot 'hvigor\bin\hvigorw.bat'),
  (Join-Path $ToolsRoot 'command-line-tools\bin\hvigorw.bat')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$Ohpm = @(
  (Join-Path $ToolsRoot 'bin\ohpm.bat'),
  (Join-Path $ToolsRoot 'ohpm\bin\ohpm.bat'),
  (Join-Path $ToolsRoot 'command-line-tools\bin\ohpm.bat')
) | Where-Object { Test-Path $_ } | Select-Object -First 1
$Sdk = Get-ChildItem $ToolsRoot -Directory -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -in @('sdk', 'Sdk') } | Select-Object -First 1

if (-not $Hvigor) { throw "未找到 hvigorw.bat。请把华为 Command Line Tools 解压到 $ToolsRoot。" }
if (-not $Ohpm) { throw "未找到 ohpm.bat。请把华为 Command Line Tools 解压到 $ToolsRoot。" }
if (-not $Sdk) { throw "未找到 HarmonyOS SDK。请使用包含 SDK 的 Command Line Tools 压缩包。" }
$env:DEVECO_SDK_HOME = $Sdk.FullName

Set-Location $ProjectRoot
npm ci
npm run build
$Rawfile = Join-Path $ProjectRoot 'harmony\entry\src\main\resources\rawfile'
if (Test-Path $Rawfile) { Remove-Item $Rawfile -Recurse -Force }
New-Item -ItemType Directory -Force $Rawfile | Out-Null
Copy-Item (Join-Path $ProjectRoot 'dist\*') $Rawfile -Recurse -Force
$Index = Join-Path $Rawfile 'index.html'
(Get-Content $Index -Raw).Replace('href="/', 'href="').Replace('src="/', 'src="') | Set-Content $Index -NoNewline

Set-Location (Join-Path $ProjectRoot 'harmony')
& $Ohpm install
& $Hvigor --mode module -p product=default -p module=entry@default -p buildMode=$BuildMode assembleHap
if ($LASTEXITCODE -ne 0) { throw "HarmonyOS $BuildMode 构建失败，退出码 $LASTEXITCODE。" }

Write-Host "构建完成：$ProjectRoot\harmony\entry\build" -ForegroundColor Green
