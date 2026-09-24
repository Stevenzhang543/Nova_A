# 日历版本发布准备：选择明确资格计划并按顺序执行所需验证。
[CmdletBinding()]
param(
  [ValidatePattern('^\d{2}\.\d{2}$')]
  [string]$Release = '26.10',
  [string]$FocusScript = '',
  [string]$QualificationPlan = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'release-policy.ps1')
$releaseInfo = Get-CalendarReleaseInfo -Label $Release
if ($releaseInfo.Year -lt 26) { throw 'Release preparation requires year 26 or later.' }
$focusScripts = @{
  '26.08' = 'verify:v26.08:input'
  '26.09' = 'verify:v26.09:runtime'
  '26.10' = 'verify:v26.10:readiness'
}

$machineVersion = $releaseInfo.MachineVersion
if ([string]::IsNullOrWhiteSpace($FocusScript)) { $FocusScript = if ($focusScripts.ContainsKey($Release)) { $focusScripts[$Release] } else { "verify:v${Release}:focus" } }
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
if ($releaseInfo.Year -gt 26 -or $releaseInfo.Sequence -ge 12) {
  if ([string]::IsNullOrWhiteSpace($QualificationPlan)) { throw 'Release 26.12 and later require -QualificationPlan with explicit actual commands/report schemas. Finalize the version, authored manual/references/docs and freeze source first. No authority was changed.' }
  $plan = Get-Content -LiteralPath $QualificationPlan -Raw | ConvertFrom-Json
  if ($plan.release -ne $Release -or $plan.machineVersion -ne $machineVersion) { throw 'Qualification plan identifies another release.' }
  & node (Join-Path $PSScriptRoot 'release-qualification.mjs') "--root=$projectRoot" "--plan=$QualificationPlan"
  if ($LASTEXITCODE -ne 0) { throw 'Qualification failed or was context-blocked; inspect the recorded run directory. No evidence pass was claimed.' }
  return
}
$pnpmCommand = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
if ($null -eq $pnpmCommand) { $pnpmCommand = Get-Command pnpm -ErrorAction Stop }
$cargoCommand = Get-Command cargo -ErrorAction Stop
$pnpmPath = $pnpmCommand.Source
$cargoPath = $cargoCommand.Source

# 调用指定项目脚本并在非零退出码时立即报错。
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
  # Validate every required command before a version setter or generator runs.
  $package = Get-Content -LiteralPath 'package.json' -Raw | ConvertFrom-Json
  $requiredScripts = @('tauri','test:core','check','audit:manual','audit:scripts','audit:rendering','audit:animation','audit:typography','verify:templates','audit:repository',$FocusScript,"version:v$Release","manual:v$Release","references:v$Release","verify:v$Release","verify:v${Release}:history","verify:v${Release}:layout-contract","verify:v${Release}:interactions","qualify:v${Release}:layout","verify:v${Release}:windows","verify:v${Release}:headless","benchmark:v$Release","stability:v$Release","security:v$Release","audit:v$Release","evidence:v$Release")
  $missingScripts = @($requiredScripts | Where-Object <# 按条件 $_ -notin $package.scripts.psobject.Properties.Name 筛选当前条目。 #> { $_ -notin $package.scripts.psobject.Properties.Name })
  if ($missingScripts.Count -gt 0) { throw "Release $Release has no complete qualification command plan: $($missingScripts -join ', '). No version authority or generated source was changed." }
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

  Invoke-PnpmScript -Name $FocusScript
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
