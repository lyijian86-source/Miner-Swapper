param(
  [string]$OutputDir = ".\release"
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$resolvedOutput = Join-Path $projectRoot $OutputDir
$stagingDir = Join-Path $resolvedOutput "Velvet-Mines"
$zipPath = Join-Path $resolvedOutput "Velvet-Mines-windows.zip"

if (Test-Path $stagingDir) {
  Remove-Item -Recurse -Force $stagingDir
}

if (Test-Path $zipPath) {
  Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $stagingDir "assets") | Out-Null

Copy-Item (Join-Path $projectRoot "index.html") $stagingDir
Copy-Item (Join-Path $projectRoot "styles.css") $stagingDir
Copy-Item (Join-Path $projectRoot "app.js") $stagingDir
Copy-Item (Join-Path $projectRoot "README.md") $stagingDir
Copy-Item (Join-Path $projectRoot "Launch-Velvet-Mines.bat") $stagingDir
Copy-Item (Join-Path $projectRoot "assets\icon.svg") (Join-Path $stagingDir "assets")

Compress-Archive -Path (Join-Path $stagingDir "*") -DestinationPath $zipPath

Write-Host "Packaged release created at: $zipPath"
