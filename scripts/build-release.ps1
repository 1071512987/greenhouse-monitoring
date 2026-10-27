param(
  [string]$PackageName = "HuanongZhikong-Windows-x64"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$releaseBase = Join-Path $projectRoot "release"
$packageDir = Join-Path $releaseBase $PackageName
$zipPath = Join-Path $releaseBase "$PackageName.zip"
$frontendDir = Join-Path $projectRoot "frontend"
$backendDir = Join-Path $projectRoot "backend"
$distDir = Join-Path $frontendDir "dist"

Push-Location $frontendDir
try {
  npm run build
  if ($LASTEXITCODE -ne 0) {
    throw "Frontend build failed with exit code $LASTEXITCODE"
  }
} finally {
  Pop-Location
}

New-Item -ItemType Directory -Path $releaseBase -Force | Out-Null

if (Test-Path -LiteralPath $packageDir) {
  $resolvedPackage = (Resolve-Path -LiteralPath $packageDir).Path
  $resolvedRelease = (Resolve-Path -LiteralPath $releaseBase).Path
  if (-not $resolvedPackage.StartsWith($resolvedRelease, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Refusing to clean a path outside the release directory: $resolvedPackage"
  }
  Remove-Item -LiteralPath $resolvedPackage -Recurse -Force
}

New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
Copy-Item -LiteralPath $distDir -Destination (Join-Path $packageDir "web") -Recurse
$launcherSource = Join-Path $projectRoot "packaging\start.bat"
$launcherDestination = Join-Path $packageDir "start.bat"
$launcherContent = (Get-Content -LiteralPath $launcherSource -Raw) -replace "`r?`n", "`r`n"
[System.IO.File]::WriteAllText($launcherDestination, $launcherContent, [System.Text.Encoding]::ASCII)
Copy-Item -LiteralPath (Join-Path $projectRoot "packaging\README.txt") -Destination $packageDir

Push-Location $backendDir
try {
  $previousGoos = $env:GOOS
  $previousGoarch = $env:GOARCH
  $previousGocache = $env:GOCACHE
  $env:GOOS = "windows"
  $env:GOARCH = "amd64"
  $env:GOCACHE = Join-Path $projectRoot ".tmp\go-build"
  go build -trimpath -ldflags "-s -w" -o (Join-Path $packageDir "greenhouse-server.exe") ./cmd/server
  if ($LASTEXITCODE -ne 0) {
    throw "Backend build failed with exit code $LASTEXITCODE"
  }
  $env:GOOS = $previousGoos
  $env:GOARCH = $previousGoarch
  $env:GOCACHE = $previousGocache
} finally {
  Pop-Location
}

if (Test-Path -LiteralPath $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -LiteralPath $packageDir -DestinationPath $zipPath -CompressionLevel Optimal

Write-Host "Release package created:"
Write-Host $zipPath
