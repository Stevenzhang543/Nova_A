# Nova_A 26.43 packaging: assemble the eleven-file release set from one real build.
#
# 26.43 is released from the uncommitted working tree (the maintainer commits by hand). This script
# never runs git commands that write: no add, commit, tag, stash or archive of HEAD. The source zip is
# built from the files git would track (tracked files that exist plus untracked, non-ignored files),
# read with `git ls-files` only.
#
# Follows the established releases/v26.38 contract (names, formats, checksums). Run after
# scripts/build-release-26.43.cmd has produced dist/ and the Tauri Windows bundles from the same
# source. Every artifact is assembled in a staging folder first; releases/v26.43 is only written when
# all of them succeeded, and an existing v26.43 folder is never cleared wholesale.
[CmdletBinding()]
param([string]$Label = '26.43', [string]$EvidenceDirectory = '')

$ErrorActionPreference = 'Stop'
# git prints paths as UTF-8; decode them as UTF-8 regardless of the console code page.
[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $PSScriptRoot 'release-policy.ps1')
$info = Get-CalendarReleaseInfo -Label $Label
if ($null -eq $info) { throw "Not a calendar release label: $Label" }
$machine = $info.MachineVersion
$release = Join-Path $root "releases/v$Label"
$stage = Join-Path $root ".cache/package-$Label"
Add-Type -AssemblyName System.IO.Compression

# Entries use forward slashes and a fixed timestamp (as the 26.38 packager does), so the archives
# extract correctly on every platform and repeat byte-for-byte from the same inputs.
function New-Zip([string]$Source, [string]$Target) {
  if (Test-Path -LiteralPath $Target) { Remove-Item -LiteralPath $Target -Force }
  $base = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\')
  $stream = [IO.File]::Open($Target, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    [string[]]$files = @(Get-ChildItem -LiteralPath $base -File -Recurse | ForEach-Object FullName)
    [Array]::Sort($files, [StringComparer]::Ordinal)
    foreach ($file in $files) {
      $entry = $archive.CreateEntry($file.Substring($base.Length).TrimStart('\').Replace('\', '/'), [IO.Compression.CompressionLevel]::Optimal)
      $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
      $input = [IO.File]::OpenRead($file); $output = $entry.Open()
      try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
    }
  } finally { $archive.Dispose(); $stream.Dispose() }
}
function Get-Sha256Lower([string]$Path) { (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant() }
function Write-Utf8Lines([string]$Path, [string[]]$Lines) { [IO.File]::WriteAllText($Path, (($Lines -join "`n") + "`n"), [Text.UTF8Encoding]::new($false)) }
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
$baseCommit = (& git -C $root rev-parse HEAD).Trim()
$sourceCommit = "$baseCommit+working-tree"
$webReadme = @"
# Nova_A $Label Web Package

Serve this directory from an HTTP(S) origin; do not open ``index.html`` with ``file://``. ``index.html`` opens the editor and ``player.html`` the standalone player. Keep file names and serve ``.wasm`` as ``application/wasm``. Hashed files under ``assets/`` can be cached as immutable; revalidate HTML and ``release-metadata.json``. Cross-origin isolation is not required. See HOSTING.md for static deployment.

Verify every packaged file against ``SHA256SUMS.txt``. Release metadata is in ``release-metadata.json``.
"@
[IO.File]::WriteAllText((Join-Path $web 'README.md'), $webReadme, [Text.UTF8Encoding]::new($false))
$webMetadata = [ordered]@{ product = 'Nova_A'; version = $Label; machineVersion = $machine; format = 'nova-web-release'; projectFormat = 2; schema = 29; sourceCommit = $sourceCommit; entrypoints = @('index.html', 'player.html'); contentManifest = 'SHA256SUMS.txt'; hosting = [ordered]@{ protocol = 'http-or-https'; wasmMime = 'application/wasm'; hashedAssetCaching = 'immutable'; htmlCaching = 'revalidate'; crossOriginIsolationRequired = $false } } | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $web 'release-metadata.json'), "$webMetadata`n", [Text.UTF8Encoding]::new($false))
$webBase = (Resolve-Path -LiteralPath $web).Path.TrimEnd('\')
[string[]]$webFiles = @(Get-ChildItem -LiteralPath $webBase -File -Recurse | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object FullName)
[Array]::Sort($webFiles, [StringComparer]::Ordinal)
Write-Utf8Lines (Join-Path $web 'SHA256SUMS.txt') @($webFiles | ForEach-Object { '{0}  {1}' -f (Get-Sha256Lower $_), $_.Substring($webBase.Length).TrimStart('\').Replace('\', '/') })
New-Zip $web (Join-Path $out "Nova_A-v$Label-web.zip")

# 3. Source: the working tree as git would see it (tracked files that exist plus untracked files that
#    are not ignored), read-only. New top-level folders that are not part of the project tree (for
#    example a checkout of another engine placed in the repository folder) are left out.
$sourceZip = Join-Path $out "Nova_A-v$Label-source.zip"
$topLevel = @{}
foreach ($name in @(& git -C $root ls-tree --name-only HEAD)) { $topLevel[$name] = $true }
if ($LASTEXITCODE -ne 0) { throw 'git ls-tree failed' }
[string[]]$tracked = @(& git -C $root ls-files --cached -z | ForEach-Object { $_ -split "`0" } | Where-Object { $_ })
if ($LASTEXITCODE -ne 0) { throw 'git ls-files --cached failed' }
[string[]]$untracked = @(& git -C $root ls-files --others --exclude-standard -z | ForEach-Object { $_ -split "`0" } | Where-Object { $_ })
if ($LASTEXITCODE -ne 0) { throw 'git ls-files --others failed' }
$sourceFiles = [Collections.Generic.SortedSet[string]]::new([StringComparer]::Ordinal)
foreach ($path in $tracked + $untracked) {
  $top = ($path -split '/')[0]
  if ($path.Contains('/') -and -not $topLevel.ContainsKey($top)) { continue }
  if ($path -match '(^|/)__pycache__/') { continue }
  $item = Get-Item -LiteralPath (Join-Path $root $path) -Force -ErrorAction SilentlyContinue
  # Links (for example a junction to another checkout) are not part of the source archive.
  if ($item -and -not $item.PSIsContainer -and -not ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) { [void]$sourceFiles.Add($path) }
}
if ($sourceFiles.Count -lt 100) { throw "Source listing looks wrong: $($sourceFiles.Count) files" }
if (Test-Path -LiteralPath $sourceZip) { Remove-Item -LiteralPath $sourceZip -Force }
$sourceStream = [IO.File]::Open($sourceZip, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
$sourceArchive = [IO.Compression.ZipArchive]::new($sourceStream, [IO.Compression.ZipArchiveMode]::Create, $false)
try {
  foreach ($path in $sourceFiles) {
    $entry = $sourceArchive.CreateEntry("Nova_A-v$Label-source/$path", [IO.Compression.CompressionLevel]::Optimal)
    $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
    $input = [IO.File]::OpenRead((Join-Path $root $path)); $output = $entry.Open()
    try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
  }
} finally { $sourceArchive.Dispose(); $sourceStream.Dispose() }
Write-Host "Source zip: $($sourceFiles.Count) files from the working tree (base commit $baseCommit)"

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
$lines = @(Get-ChildItem -LiteralPath $out -File | Sort-Object Name | ForEach-Object { '{0}  {1}' -f (Get-Sha256Lower $_.FullName), $_.Name })
Write-Utf8Lines (Join-Path $out 'SHA256SUMS.txt') $lines
$expected = @('EDIT_LEDGER.md','LICENSE.md',"Nova_A-v$Label-reference-projects.zip","Nova_A-v$Label-release-evidence.zip","Nova_A-v$Label-source.zip","Nova_A-v$Label-web.zip","Nova_A-v$Label-windows-x64-portable.exe","Nova_A-v$Label-windows-x64-setup.exe","Nova_A-v$Label-windows-x64.msi",'RELEASE_NOTES.md','SHA256SUMS.txt')
$actual = @(Get-ChildItem -LiteralPath $out -File | ForEach-Object Name | Sort-Object)
if (@(Compare-Object ($expected | Sort-Object) $actual).Count -gt 0) { throw "Release set differs from the eleven-file contract: $($actual -join ', ')" }

# 8. Publish: replace only the files this script owns.
New-Item -ItemType Directory -Force -Path $release | Out-Null
foreach ($file in Get-ChildItem -LiteralPath $out -File) { Copy-Item -LiteralPath $file.FullName -Destination (Join-Path $release $file.Name) -Force }
Remove-Item -LiteralPath $stage -Recurse -Force
Get-ChildItem -LiteralPath $release | Sort-Object Name | ForEach-Object { '{0}  {1:N2} MB' -f $_.Name, ($_.Length / 1MB) }
