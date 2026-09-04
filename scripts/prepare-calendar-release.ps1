[CmdletBinding()]
param(
  [ValidateSet('26.08', '26.09', '26.10')]
  [string]$Release = '26.10'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$machineVersions = @{
  '26.08' = '26.8.0'
  '26.09' = '26.9.0'
  '26.10' = '26.10.0'
}
$focusScripts = @{
  '26.08' = 'verify:v26.08:input'
  '26.09' = 'verify:v26.09:runtime'
  '26.10' = 'verify:v26.10:readiness'
}

$machineVersion = $machineVersions[$Release]
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if ($null -eq $pnpmCommand) { $pnpmCommand = Get-Command pnpm -ErrorAction Stop }
$cargoCommand = Get-Command cargo -ErrorAction Stop
$pnpmPath = $pnpmCommand.Source
$cargoPath = $cargoCommand.Source

function Invoke-PnpmScript {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [string[]]$ExtraArguments = @()
  )

  Write-Host "`n==> pnpm $Name $($ExtraArguments -join ' ')" -ForegroundColor Cyan
  & $pnpmPath run $Name @ExtraArguments
  if ($LASTEXITCODE -ne 0) { throw "pnpm $Name failed with exit code $LASTEXITCODE." }
}

Push-Location $projectRoot
try {
  $currentVersion = [string](Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json).version
  if ($currentVersion -ne $machineVersion) {
    Invoke-PnpmScript -Name "version:v$Release"
  }
  else {
    Write-Host "==> Version selection skipped: package.json already identifies $Release / $machineVersion." -ForegroundColor DarkGray
  }

  Invoke-PnpmScript -Name "manual:v$Release"
  Invoke-PnpmScript -Name "references:v$Release"

  # Finish every generator that can change a packaged source input before any
  # timestamp-bound qualification report is produced. Tauri's configured
  # beforeBuildCommand performs the frontend/WASM build exactly once.
  Invoke-PnpmScript -Name 'tauri' -ExtraArguments @('build')

  Invoke-PnpmScript -Name 'test:core'
  Write-Host "`n==> cargo clippy --workspace --all-targets -- -D warnings" -ForegroundColor Cyan
  & $cargoPath clippy --workspace --all-targets -- -D warnings
  if ($LASTEXITCODE -ne 0) { throw "cargo clippy failed with exit code $LASTEXITCODE." }

  foreach ($name in @('check', 'audit:manual', 'audit:scripts', 'audit:rendering', 'audit:animation', 'audit:typography', 'verify:templates')) {
    Invoke-PnpmScript -Name $name
  }

  Invoke-PnpmScript -Name $focusScripts[$Release]
  Invoke-PnpmScript -Name "verify:v$Release"
  Invoke-PnpmScript -Name "verify:v${Release}:history"
  Invoke-PnpmScript -Name "verify:v${Release}:layout-contract"

  Invoke-PnpmScript -Name "verify:v${Release}:interactions"
  Invoke-PnpmScript -Name "qualify:v${Release}:layout"
  Invoke-PnpmScript -Name "verify:v${Release}:windows"
  Invoke-PnpmScript -Name "verify:v${Release}:headless"
  Invoke-PnpmScript -Name "benchmark:v$Release"
  Invoke-PnpmScript -Name "stability:v$Release"
  Invoke-PnpmScript -Name "security:v$Release"
  Invoke-PnpmScript -Name 'audit:repository'
  Invoke-PnpmScript -Name "audit:v$Release"
  Invoke-PnpmScript -Name "evidence:v$Release"

  $manifestPath = Join-Path $projectRoot "release-audits\evidence-v$Release\evidence-manifest.json"
  if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Evidence manifest was not created: $manifestPath" }
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.release -ne $Release -or $manifest.machineVersion -ne $machineVersion -or $manifest.localQualificationComplete -ne $true -or $manifest.localReportAuthorities.status -ne 'passed') {
    throw "Evidence manifest did not certify local $Release / $machineVersion qualification."
  }

  Write-Host "`nNova_A $Release release preparation passed. Review $manifestPath, then run pnpm release:v$Release." -ForegroundColor Green
}
finally {
  Pop-Location
}
