# Nova_A 26.40 packaging: assemble the eleven-file release set from the real build outputs.
# Follows the confirmed releases/v26.38 naming and format; no artifact set was specified by image.
[CmdletBinding()]
param([string]$Version = '26.40')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$release = Join-Path $root "releases/v$Version"
$stage = Join-Path $root ".cache/package-$Version"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function Copy-Tree([string]$From, [string]$To) {
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  Copy-Item -Path (Join-Path $From '*') -Destination $To -Recurse -Force
}
function New-Zip([string]$Source, [string]$Target) {
  if (Test-Path $Target) { Remove-Item $Target -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($Source, $Target, [System.IO.Compression.CompressionLevel]::Optimal, $false)
  '{0}  {1:N1} MB' -f (Split-Path -Leaf $Target), ((Get-Item $Target).Length / 1MB)
}

New-Item -ItemType Directory -Force -Path $release | Out-Null
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Force -Path $stage | Out-Null
$v = $Version

# 1. Web bundle: the built dist plus font licences, hosting notes and the project licence.
$web = Join-Path $stage 'web'
Copy-Tree (Join-Path $root 'dist') $web
Copy-Tree (Join-Path $root 'nova/online/FONT_LICENSES') (Join-Path $web 'FONT_LICENSES')
Copy-Item (Join-Path $root 'LICENSE.md') (Join-Path $web 'LICENSE.md') -Force
Copy-Item (Join-Path $root 'docs/WEB_HOSTING_26_40.md') (Join-Path $web 'HOSTING.md') -Force
New-Zip $web (Join-Path $release "Nova_A-v$v-web.zip")

# 2. Source archive: repository sources only. Build outputs, caches and old releases are excluded.
$source = Join-Path $stage 'source'
New-Item -ItemType Directory -Force -Path $source | Out-Null
$excluded = @('.git', '.cache', '.pnpm-store', '.VSCodeCounter', 'node_modules', 'target', 'dist', 'releases', 'release-audits', 'godot-master', 'nova_core/pkg')
$robocopyArgs = @((Join-Path $root ''), $source, '/E', '/NFL', '/NDL', '/NJH', '/NJS', '/NP', '/R:0', '/W:0')
foreach ($name in $excluded) { $robocopyArgs += @('/XD', (Join-Path $root $name)) }
& robocopy @robocopyArgs | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy failed with $LASTEXITCODE" }
New-Zip $source (Join-Path $release "Nova_A-v$v-source.zip")

# 3. Reference projects shipped for open/migrate checks.
New-Zip (Join-Path $root 'reference-projects') (Join-Path $release "Nova_A-v$v-reference-projects.zip")

# 4. Evidence archive: real captures and machine-readable verification reports from this round.
$evidence = Join-Path $stage 'evidence'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
Copy-Tree (Join-Path $root 'release-audits') $evidence
New-Item -ItemType Directory -Force -Path (Join-Path $evidence 'reports/phase2') | Out-Null
Copy-Item (Join-Path $root 'reports/phase2/*.json') (Join-Path $evidence 'reports/phase2') -Force
Copy-Item (Join-Path $root 'releases/v26.40/RELEASE_NOTES.md') (Join-Path $evidence 'RELEASE_NOTES.md') -Force
New-Zip $evidence (Join-Path $release "Nova_A-v$v-release-evidence.zip")

# 5. Windows binaries published by run-tauri build.
$bin = Join-Path $root 'src-tauri/target/release'
Copy-Item (Join-Path $bin 'nova_a.exe') (Join-Path $release "Nova_A-v$v-windows-x64-portable.exe") -Force
$nsis = Get-ChildItem (Join-Path $bin 'bundle/nsis') -Filter '*.exe' -ErrorAction SilentlyContinue | Select-Object -First 1
$msi = Get-ChildItem (Join-Path $bin 'bundle/msi') -Filter '*.msi' -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $nsis) { throw 'NSIS installer missing' }
if (-not $msi) { throw 'MSI installer missing' }
Copy-Item $nsis.FullName (Join-Path $release "Nova_A-v$v-windows-x64-setup.exe") -Force
Copy-Item $msi.FullName (Join-Path $release "Nova_A-v$v-windows-x64.msi") -Force

# 6. Checksums over every released artifact.
$lines = Get-ChildItem $release -File | Where-Object { $_.Name -ne 'SHA256SUMS.txt' } | Sort-Object Name | ForEach-Object {
  $hash = (Get-FileHash $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
  "$hash  $($_.Name)"
}
Set-Content -Path (Join-Path $release 'SHA256SUMS.txt') -Value ($lines -join "`n") -Encoding ASCII

Remove-Item $stage -Recurse -Force
Get-ChildItem $release | ForEach-Object { '{0}  {1:N2} MB' -f $_.Name, ($_.Length / 1MB) }
