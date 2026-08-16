[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseDirectory = Join-Path $projectRoot "releases\v$Version"
$notesPath = Join-Path $projectRoot "release-audits\v$Version-release-notes.md"
$ledgerPath = Join-Path $projectRoot "release-audits\v$Version-edit-ledger.md"
$benchmarkPath = Join-Path $projectRoot "release-audits\v$Version-benchmarks.json"
$stabilityPath = Join-Path $projectRoot "release-audits\v$Version-stability-smoke.json"
$referenceReadme = Join-Path $projectRoot 'reference-projects\README.md'

$artifacts = [ordered]@{
  (Join-Path $projectRoot 'src-tauri\target\release\nova_a.exe') = "Nova_A-v$Version-windows-x64-portable.exe"
  (Join-Path $projectRoot "src-tauri\target\release\bundle\msi\Nova_A_${Version}_x64_en-US.msi") = "Nova_A-v$Version-windows-x64.msi"
  (Join-Path $projectRoot "src-tauri\target\release\bundle\nsis\Nova_A_${Version}_x64-setup.exe") = "Nova_A-v$Version-windows-x64-setup.exe"
}

foreach ($source in @($artifacts.Keys) + @($notesPath, $ledgerPath, $benchmarkPath, $stabilityPath, $referenceReadme, (Join-Path $projectRoot 'dist\index.html'))) {
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Required release input is missing: $source"
  }
}

$releaseRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'releases'))
$resolvedRelease = [System.IO.Path]::GetFullPath($releaseDirectory)
if (-not $resolvedRelease.StartsWith(($releaseRoot + [System.IO.Path]::DirectorySeparatorChar), [System.StringComparison]::OrdinalIgnoreCase)) { throw "Unsafe release target: $resolvedRelease" }
if (Test-Path -LiteralPath $resolvedRelease) { Remove-Item -LiteralPath $resolvedRelease -Recurse -Force }
New-Item -ItemType Directory -Path $resolvedRelease -Force | Out-Null
foreach ($entry in $artifacts.GetEnumerator()) {
  Copy-Item -LiteralPath $entry.Key -Destination (Join-Path $releaseDirectory $entry.Value) -Force
}
Copy-Item -LiteralPath $notesPath -Destination (Join-Path $releaseDirectory 'RELEASE_NOTES.md') -Force
Copy-Item -LiteralPath $ledgerPath -Destination (Join-Path $releaseDirectory 'EDIT_LEDGER.md') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE.md') -Destination (Join-Path $releaseDirectory 'LICENSE.md') -Force

$webArchive = Join-Path $releaseDirectory "Nova_A-v$Version-web.zip"
$webStage = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-web-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $webStage | Out-Null
try {
  Copy-Item -Path (Join-Path $projectRoot 'dist\*') -Destination $webStage -Recurse -Force
  $webReadme = @"
# Nova_A $Version Web Package

Serve this directory from an HTTP(S) origin. Do not open `index.html` with `file://`; WebAssembly modules, workers, ES modules, and the bundled manual require a web server. `index.html` opens the editor and `player.html` opens the standalone player. Preserve file names and MIME types, especially `application/wasm` for `.wasm` files. HTTPS is required for production networking and other secure browser APIs.

Verify every packaged file against `SHA256SUMS.txt`. Release metadata is in `release-metadata.json`.
"@
  [IO.File]::WriteAllText((Join-Path $webStage 'README.md'), $webReadme, [Text.UTF8Encoding]::new($false))
  $webMetadata = [ordered]@{ product = 'Nova_A'; version = $Version; format = 'nova-web-release'; projectFormat = 2; schema = 23; generatedAt = [DateTime]::UtcNow.ToString('o'); entrypoints = @('index.html','player.html'); hosting = [ordered]@{ protocol = 'http-or-https'; wasmMime = 'application/wasm'; spaFallbackRequired = $false } } | ConvertTo-Json -Depth 6
  [IO.File]::WriteAllText((Join-Path $webStage 'release-metadata.json'), "$webMetadata`n", [Text.UTF8Encoding]::new($false))
  $webChecksums = Get-ChildItem -LiteralPath $webStage -File -Recurse | Where-Object Name -ne 'SHA256SUMS.txt' | Sort-Object FullName | ForEach-Object { $relative = $_.FullName.Substring($webStage.Length).TrimStart('\').Replace('\','/'); "{0}  {1}" -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $relative }
  [IO.File]::WriteAllLines((Join-Path $webStage 'SHA256SUMS.txt'), $webChecksums, [Text.UTF8Encoding]::new($false))
  Compress-Archive -Path (Join-Path $webStage '*') -DestinationPath $webArchive -CompressionLevel Optimal -Force
}
finally {
  if (Test-Path -LiteralPath $webStage) { Remove-Item -LiteralPath $webStage -Recurse -Force }
}

$referenceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-reference-projects.zip"
Compress-Archive -Path (Join-Path $projectRoot 'reference-projects\*') -DestinationPath $referenceArchive -CompressionLevel Optimal -Force

$evidenceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-release-evidence.zip"
$evidenceStage = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-evidence-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $evidenceStage | Out-Null
try {
  Get-ChildItem -LiteralPath (Join-Path $projectRoot 'release-audits') -File -Filter "v$Version-*" | Copy-Item -Destination $evidenceStage -Force
  $screenshotSource = Join-Path $projectRoot "release-audits\screenshots\v$Version"
  if (Test-Path -LiteralPath $screenshotSource) { Copy-Item -LiteralPath $screenshotSource -Destination (Join-Path $evidenceStage 'screenshots') -Recurse -Force }
  foreach ($source in @($notesPath, $ledgerPath, (Join-Path $projectRoot 'package.json'), (Join-Path $projectRoot 'pnpm-lock.yaml'), (Join-Path $projectRoot 'Cargo.toml'), (Join-Path $projectRoot 'Cargo.lock'), (Join-Path $projectRoot 'README.md'), (Join-Path $projectRoot 'README.zh-CN.md'))) { Copy-Item -LiteralPath $source -Destination $evidenceStage -Force }
  foreach ($name in @('BENCHMARKS.md','STABILITY.md','PLATFORM_VERIFICATION.md','COMPATIBILITY.md','STABLE_CONTRACTS.md','KNOWN_LIMITATIONS.md')) { Copy-Item -LiteralPath (Join-Path $projectRoot "docs\$name") -Destination $evidenceStage -Force }
  Compress-Archive -Path (Join-Path $evidenceStage '*') -DestinationPath $evidenceArchive -CompressionLevel Optimal -Force
}
finally {
  if (Test-Path -LiteralPath $evidenceStage) { Remove-Item -LiteralPath $evidenceStage -Recurse -Force }
}

$sourceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-source.zip"
$sourceStage = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-source-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $sourceStage | Out-Null
try {
  $trackedAndUntracked = & git -C $projectRoot ls-files --cached --others --exclude-standard
  if ($LASTEXITCODE -ne 0) { throw 'git ls-files failed while collecting the source release.' }
  foreach ($relativePath in $trackedAndUntracked) {
    if ($relativePath -match '^(releases|dist|target|src-tauri/target|nova_core/target|node_modules|\.pnpm-store|\.VSCodeCounter)/') { continue }
    $source = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
    $destination = Join-Path $sourceStage $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
  }
  Compress-Archive -Path (Join-Path $sourceStage '*') -DestinationPath $sourceArchive -CompressionLevel Optimal -Force
}
finally {
  $resolvedStage = (Resolve-Path -LiteralPath $sourceStage -ErrorAction SilentlyContinue).Path
  $temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedStage -and $resolvedStage.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
}

$checksumPath = Join-Path $releaseDirectory 'SHA256SUMS.txt'
$checksumLines = Get-ChildItem -LiteralPath $releaseDirectory -File |
  Where-Object Name -ne 'SHA256SUMS.txt' |
  Sort-Object Name |
  ForEach-Object { "{0}  {1}" -f (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant(), $_.Name }
[System.IO.File]::WriteAllLines($checksumPath, $checksumLines, [System.Text.UTF8Encoding]::new($false))

Get-ChildItem -LiteralPath $releaseDirectory -File | Sort-Object Name | Select-Object Name, Length, LastWriteTime
