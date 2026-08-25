[CmdletBinding()]
param(
  [switch]$SkipDependencyRestore,
  [switch]$SkipNativeBuild,
  [switch]$SkipLayout,
  [switch]$SkipOnlineAdvisoryAudit
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseVersion = '5.0.1'
$commands = [System.Collections.Generic.List[object]]::new()

function Invoke-ReleaseCommand {
  param([string]$Name, [string]$Program, [string[]]$Arguments)
  $started = [DateTime]::UtcNow
  & $Program @Arguments
  $exit = $LASTEXITCODE
  $commands.Add([ordered]@{ name = $Name; program = $Program; arguments = @($Arguments); startedAt = $started.ToString('o'); finishedAt = [DateTime]::UtcNow.ToString('o'); exitCode = $exit })
  if ($exit -ne 0) { throw "$Name failed with exit code $exit" }
}

Push-Location $projectRoot
try {
  if (-not $SkipDependencyRestore) { Invoke-ReleaseCommand 'Pinned offline dependency restore' 'pnpm' @('install', '--frozen-lockfile', '--offline') }
  Invoke-ReleaseCommand 'Generate v5.0.1 references' 'pnpm' @('run', 'references:v5.0.1')
  Invoke-ReleaseCommand 'Complete BLD/PKG/HLT/regression catalog' 'pnpm' @('run', 'audit')
  if (-not $SkipOnlineAdvisoryAudit) { Invoke-ReleaseCommand 'Dependency vulnerability advisory scan' 'pnpm' @('run', 'security:v5.0.1') }
  Invoke-ReleaseCommand 'Rust formatting' 'cargo' @('fmt', '--all', '--', '--check')
  Invoke-ReleaseCommand 'Rust lint' 'cargo' @('clippy', '--workspace', '--all-targets', '--', '-D', 'warnings')
  Invoke-ReleaseCommand 'Rust tests' 'cargo' @('test', '--workspace', '--all-targets')
  Invoke-ReleaseCommand 'Web/WASM production build' 'pnpm' @('build')
  if (-not $SkipLayout) { Invoke-ReleaseCommand 'Pinned Chromium layout qualification' 'pnpm' @('run', 'qualify:v5.0.1:layout') }
  if (-not $SkipNativeBuild) {
    Invoke-ReleaseCommand 'Windows native installers' 'pnpm' @('tauri', 'build')
    Invoke-ReleaseCommand 'Windows isolated startup' 'pnpm' @('run', 'verify:v5.0.1:windows')
  }
  Invoke-ReleaseCommand 'All reference projects on Tier-1 targets' 'pnpm' @('run', 'references:verify:v5.0.1')
  Invoke-ReleaseCommand 'Ten consecutive clean Tier-1 payload builds' 'pnpm' @('run', 'reproducibility:v5.0.1')
  Invoke-ReleaseCommand 'Pinned performance baselines' 'pnpm' @('run', 'benchmark:v5.0.1')
  Invoke-ReleaseCommand 'Bounded stability/fault smoke' 'pnpm' @('run', 'stability:v5.0.1')
  Invoke-ReleaseCommand 'Structured release evidence' 'pnpm' @('run', 'evidence:v5.0.1')
  Invoke-ReleaseCommand 'Exact eleven-file package' 'powershell' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'package-release.ps1'), '-Version', $releaseVersion)
  Invoke-ReleaseCommand 'Packaged release verification' 'powershell' @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'verify-release-package.ps1'), '-Version', $releaseVersion)
}
finally {
  Pop-Location
  $auditDirectory = Join-Path $projectRoot 'release-audits'
  New-Item -ItemType Directory -Path $auditDirectory -Force | Out-Null
  $status = if ($commands.Count -gt 0 -and @($commands | Where-Object exitCode -ne 0).Count -eq 0) { 'passed-local' } else { 'failed' }
  $report = [ordered]@{
    format = 'nova-v5.0.1-release-pipeline-run'; version = 1; engineVersion = $releaseVersion
    generatedAt = [DateTime]::UtcNow.ToString('o'); status = $status; stages = @($commands)
    externalGates = @('minimum 14-day release-candidate observation', '72-hour soak', 'two-machine reproducibility', 'clean-machine install lifecycle', 'publisher signing/notarization', 'external browser/hardware matrix', 'independent verifier')
  } | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText((Join-Path $auditDirectory 'v5.0.1-release-pipeline-run.json'), "$report`n", [Text.UTF8Encoding]::new($false))
}

