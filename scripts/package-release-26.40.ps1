# Nova_A 26.40 packaging: assemble the eleven-file release set from one real build.
#
# Follows the established releases/v26.38 contract (names, formats, checksums). Run after
# scripts/build-release-26.40.cmd has produced dist/ and the Tauri Windows bundles from the same
# source. Every artifact is assembled in a staging folder first; releases/v26.40 is only written when
# all of them succeeded, and an existing v26.40 folder is never cleared wholesale.
[CmdletBinding()]
param([string]$Label = '26.40', [string]$EvidenceDirectory = '')

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'release-policy.ps1')
$info = Get-CalendarReleaseInfo -Label $Label
if ($null -eq $info) { throw "Not a calendar release label: $Label" }
$machine = $info.MachineVersion
$release = Join-Path $root "releases/v$Label"
$stage = Join-Path $root ".cache/package-$Label"
Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-Zip([string]$Source, [string]$Target) {
  if (Test-Path -LiteralPath $Target) { Remove-Item -LiteralPath $Target -Force }
  [System.IO.Compression.ZipFile]::CreateFromDirectory($Source, $Target, [System.IO.Compression.CompressionLevel]::Optimal, $false)
}
function Copy-Tree([string]$From, [string]$To) {
  New-Item -ItemType Directory -Force -Path $To | Out-Null
  Copy-Item -Path (Join-Path $From '*') -Destination $To -Recurse -Force
}

# 1. Every input must exist and belong to this version and this build.
$packageVersion = (Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw | ConvertFrom-Json).version
if ($packageVersion -ne $machine) { throw "package.json is $packageVersion, expected $machine" }
$dist = Join-Path $root 'dist'
$distIndex = Join-Path $dist 'index.html'
if (-not (Test-Path -LiteralPath $distIndex)) { throw 'dist/index.html is missing: run the build first.' }
$wasm = Get-ChildItem -LiteralPath (Join-Path $dist 'assets') -Filter '*.wasm' | Select-Object -First 1
if (-not $wasm) { throw 'dist has no WebAssembly module.' }
$bin = Join-Path $root 'src-tauri/target/release'
$portable = Join-Path $bin 'nova_a.exe'
$setup = Join-Path $bin "bundle/nsis/Nova_A_${machine}_x64-setup.exe"
$msi = Join-Path $bin "bundle/msi/Nova_A_${machine}_x64_en-US.msi"
foreach ($path in @($portable, $setup, $msi)) { if (-not (Test-Path -LiteralPath $path)) { throw "Missing Windows artifact: $path" } }
Assert-WindowsReleaseArtifactVersions -Portable $portable -Setup $setup -Msi $msi -MachineVersion $machine
# The bundle folders keep older builds with the same version name; refuse anything older than this dist.
$distTime = (Get-Item -LiteralPath $distIndex).LastWriteTimeUtc
foreach ($path in @($portable, $setup, $msi)) {
  if ((Get-Item -LiteralPath $path).LastWriteTimeUtc -lt $distTime.AddMinutes(-1)) { throw "Stale Windows artifact (older than dist): $path" }
}
foreach ($doc in @("docs/RELEASE_NOTES_$($Label.Replace('.', '_')).md", "docs/EDIT_LEDGER_$($Label.Replace('.', '_')).md", "docs/WEB_HOSTING_$($Label.Replace('.', '_')).md", 'LICENSE.md')) {
  if (-not (Test-Path -LiteralPath (Join-Path $root $doc))) { throw "Missing release document: $doc" }
}

if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
$out = Join-Path $stage 'out'
New-Item -ItemType Directory -Force -Path $out | Out-Null

# 2. Web: the built dist plus font licences, hosting notes and the project licence.
$web = Join-Path $stage 'web'
Copy-Tree $dist $web
Copy-Tree (Join-Path $root 'nova/online/FONT_LICENSES') (Join-Path $web 'FONT_LICENSES')
Copy-Item -LiteralPath (Join-Path $root 'LICENSE.md') -Destination (Join-Path $web 'LICENSE.md') -Force
Copy-Item -LiteralPath (Join-Path $root "docs/WEB_HOSTING_$($Label.Replace('.', '_')).md") -Destination (Join-Path $web 'HOSTING.md') -Force
New-Zip $web (Join-Path $out "Nova_A-v$Label-web.zip")

# 3. Source: exactly the committed tree (no caches, builds, releases or local tooling).
$sourceZip = Join-Path $out "Nova_A-v$Label-source.zip"
& git -C $root archive --format=zip --prefix="Nova_A-v$Label-source/" -o $sourceZip HEAD
if ($LASTEXITCODE -ne 0) { throw 'git archive failed' }

# 4. Reference projects as shipped in the repository.
New-Zip (Join-Path $root 'reference-projects') (Join-Path $out "Nova_A-v$Label-reference-projects.zip")

# 5. Evidence: the checks actually run for this release.
if (-not $EvidenceDirectory) { $EvidenceDirectory = Join-Path $root ".cache/evidence-$Label" }
if (-not (Test-Path -LiteralPath $EvidenceDirectory)) { throw "Evidence folder is missing: $EvidenceDirectory" }
New-Zip $EvidenceDirectory (Join-Path $out "Nova_A-v$Label-release-evidence.zip")

# 6. Windows binaries and documents.
Copy-Item -LiteralPath $portable -Destination (Join-Path $out "Nova_A-v$Label-windows-x64-portable.exe")
Copy-Item -LiteralPath $setup -Destination (Join-Path $out "Nova_A-v$Label-windows-x64-setup.exe")
Copy-Item -LiteralPath $msi -Destination (Join-Path $out "Nova_A-v$Label-windows-x64.msi")
Copy-Item -LiteralPath (Join-Path $root 'LICENSE.md') -Destination (Join-Path $out 'LICENSE.md')
Copy-Item -LiteralPath (Join-Path $root "docs/RELEASE_NOTES_$($Label.Replace('.', '_')).md") -Destination (Join-Path $out 'RELEASE_NOTES.md')
Copy-Item -LiteralPath (Join-Path $root "docs/EDIT_LEDGER_$($Label.Replace('.', '_')).md") -Destination (Join-Path $out 'EDIT_LEDGER.md')
Assert-WindowsReleaseArtifactVersions -Portable (Join-Path $out "Nova_A-v$Label-windows-x64-portable.exe") -Setup (Join-Path $out "Nova_A-v$Label-windows-x64-setup.exe") -Msi (Join-Path $out "Nova_A-v$Label-windows-x64.msi") -MachineVersion $machine

# 7. Checksums over every artifact.
$lines = Get-ChildItem -LiteralPath $out -File | Sort-Object Name | ForEach-Object { "$((Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant())  $($_.Name)" }
Set-Content -LiteralPath (Join-Path $out 'SHA256SUMS.txt') -Value ($lines -join "`n") -Encoding ASCII
$expected = @('EDIT_LEDGER.md','LICENSE.md',"Nova_A-v$Label-reference-projects.zip","Nova_A-v$Label-release-evidence.zip","Nova_A-v$Label-source.zip","Nova_A-v$Label-web.zip","Nova_A-v$Label-windows-x64-portable.exe","Nova_A-v$Label-windows-x64-setup.exe","Nova_A-v$Label-windows-x64.msi",'RELEASE_NOTES.md','SHA256SUMS.txt')
$actual = @(Get-ChildItem -LiteralPath $out -File | ForEach-Object Name | Sort-Object)
if (@(Compare-Object ($expected | Sort-Object) $actual).Count -gt 0) { throw "Release set differs from the eleven-file contract: $($actual -join ', ')" }

# 8. Publish: replace only the files this script owns.
New-Item -ItemType Directory -Force -Path $release | Out-Null
foreach ($file in Get-ChildItem -LiteralPath $out -File) { Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $release $file.Name) -Force }
Remove-Item -LiteralPath $stage -Recurse -Force
Get-ChildItem -LiteralPath $release | Sort-Object Name | ForEach-Object { '{0}  {1:N2} MB' -f $_.Name, ($_.Length / 1MB) }
