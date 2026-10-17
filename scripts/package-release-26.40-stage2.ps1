# Assemble the remaining 26.40 release artifacts from real outputs.
[CmdletBinding()]
param([string]$Version = '26.40')
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root "releases/v$Version"
$stage = Join-Path $root ".cache/stage-$Version"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-Zip([string]$Source, [string]$Target) {
  if (Test-Path $Target) { Remove-Item $Target -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($Source, $Target, [System.IO.Compression.CompressionLevel]::Optimal, $false)
  '{0}  {1:N1} MB' -f (Split-Path -Leaf $Target), ((Get-Item $Target).Length / 1MB)
}

if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null

# Reference projects exactly as shipped in the repository.
New-Zip (Join-Path $root 'reference-projects') (Join-Path $release "Nova_A-v$Version-reference-projects.zip")

# Evidence: this round's real browser captures and machine-readable verifier reports.
$evidence = Join-Path $stage 'evidence'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
Copy-Item (Join-Path $root 'release-audits/*.png') $evidence -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path (Join-Path $evidence 'reports') | Out-Null
Copy-Item (Join-Path $root 'reports/phase2/*.json') (Join-Path $evidence 'reports') -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root "releases/v$Version/RELEASE_NOTES.md") $evidence -Force
New-Zip $evidence (Join-Path $release "Nova_A-v$Version-release-evidence.zip")

# Windows binaries from the real Tauri release build.
$bin = Join-Path $root 'src-tauri/target/release'
Copy-Item (Join-Path $bin 'nova_a.exe') (Join-Path $release "Nova_A-v$Version-windows-x64-portable.exe") -Force
# The bundle folders accumulate every historical installer, so match the exact engine version.
$engine = "$Version.0"
$nsis = Get-ChildItem (Join-Path $bin 'bundle/nsis') -Filter "*$engine*-setup.exe" | Select-Object -First 1
$msi = Get-ChildItem (Join-Path $bin 'bundle/msi') -Filter "*$engine*.msi" | Select-Object -First 1
if (-not $nsis) { throw 'NSIS installer missing' }
if (-not $msi) { throw 'MSI installer missing' }
Copy-Item $nsis.FullName (Join-Path $release "Nova_A-v$Version-windows-x64-setup.exe") -Force
Copy-Item $msi.FullName (Join-Path $release "Nova_A-v$Version-windows-x64.msi") -Force

$lines = Get-ChildItem $release -File | Where-Object { $_.Name -ne 'SHA256SUMS.txt' } | Sort-Object Name | ForEach-Object {
  "$((Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)"
}
Set-Content -Path (Join-Path $release 'SHA256SUMS.txt') -Value ($lines -join "`n") -Encoding ASCII
Remove-Item $stage -Recurse -Force
Get-ChildItem $release | Sort-Object Name | ForEach-Object { '{0}  {1:N2} MB' -f $_.Name, ($_.Length / 1MB) }
