[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+\.\d+$')]
  [string]$Version
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releaseRoot = (Resolve-Path -LiteralPath (Join-Path $projectRoot "releases\v$Version")).Path
$expected = @(
  'EDIT_LEDGER.md', 'LICENSE.md', "Nova_A-v$Version-reference-projects.zip", "Nova_A-v$Version-release-evidence.zip",
  "Nova_A-v$Version-source.zip", "Nova_A-v$Version-web.zip", "Nova_A-v$Version-windows-x64.msi",
  "Nova_A-v$Version-windows-x64-portable.exe", "Nova_A-v$Version-windows-x64-setup.exe", 'RELEASE_NOTES.md', 'SHA256SUMS.txt'
) | Sort-Object
$actual = @(Get-ChildItem -LiteralPath $releaseRoot -File | ForEach-Object Name | Sort-Object)
if (@(Compare-Object $expected $actual).Count -gt 0) { throw 'Release root does not contain the exact mandatory artifact set.' }

$checksumCount = 0
foreach ($line in Get-Content -LiteralPath (Join-Path $releaseRoot 'SHA256SUMS.txt')) {
  if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw "Malformed checksum line: $line" }
  $checksumCount++
  $actualHash = (Get-FileHash -LiteralPath (Join-Path $releaseRoot $Matches[2]) -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $Matches[1]) { throw "Root checksum mismatch: $($Matches[2])" }
}
if ($checksumCount -ne 10) { throw "Expected 10 non-circular payload checksums, found $checksumCount." }

$temporaryRoot = Join-Path ([IO.Path]::GetTempPath()) ("nova-a-v$($Version.Replace('.',''))-independent-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $temporaryRoot | Out-Null
try {
  foreach ($kind in @('web', 'source', 'reference-projects', 'release-evidence')) {
    $destination = Join-Path $temporaryRoot $kind
    New-Item -ItemType Directory -Path $destination | Out-Null
    Expand-Archive -LiteralPath (Join-Path $releaseRoot "Nova_A-v$Version-$kind.zip") -DestinationPath $destination
  }

  $web = Join-Path $temporaryRoot 'web'
  $webRequired = @('index.html', 'player.html', 'README.md', 'LICENSE.md', 'release-metadata.json', 'SHA256SUMS.txt', 'FONT_LICENSES\Nunito-Sans-OFL-1.1.txt', 'FONT_LICENSES\Noto-Sans-SC-OFL-1.1.txt', 'FONT_LICENSES\JetBrains-Mono-OFL-1.1.txt')
  foreach ($required in $webRequired) { if (-not (Test-Path -LiteralPath (Join-Path $web $required) -PathType Leaf)) { throw "Web package is missing $required" } }
  if (Get-ChildItem -LiteralPath $web -Recurse -File | Where-Object Extension -In @('.map', '.exe', '.dll', '.pdb')) { throw 'Web package contains a desktop binary, symbol, or source map.' }
  $webMetadata = Get-Content -LiteralPath (Join-Path $web 'release-metadata.json') -Raw | ConvertFrom-Json
  if ($webMetadata.version -ne $Version -or -not $webMetadata.sourceCommit -or $webMetadata.contentManifest -ne 'SHA256SUMS.txt') { throw 'Web release metadata is incomplete.' }
  foreach ($line in Get-Content -LiteralPath (Join-Path $web 'SHA256SUMS.txt')) {
    if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw "Malformed web checksum line: $line" }
    $webPath = Join-Path $web $Matches[2].Replace('/', '\')
    $webHash = (Get-FileHash -LiteralPath $webPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($webHash -ne $Matches[1]) { throw "Web checksum mismatch: $($Matches[2])" }
  }

  $source = Join-Path $temporaryRoot 'source'
  foreach ($required in @('README.md', 'package.json', 'pnpm-lock.yaml', 'Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', 'scripts\package-release.ps1', 'scripts\verify-release-package.ps1', '.github')) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $required))) { throw "Source package is missing $required" }
  }
  $forbiddenSource = Get-ChildItem -LiteralPath $source -Recurse -Force | Where-Object {
    $_.FullName.Substring($source.Length + 1) -match '^(node_modules|release-audits|releases|dist|target|src-tauri\\target|nova_core\\target|\.git)(\\|$)' -or $_.Name -match '\.(pem|pfx|key)$'
  }
  if ($forbiddenSource) { throw 'Source archive contains generated output, repository metadata, or private key material.' }

  $references = Join-Path $temporaryRoot 'reference-projects'
  $referenceReadmes = @(Get-ChildItem -LiteralPath (Join-Path $references 'projects') -Recurse -Filter README.md)
  if ($referenceReadmes.Count -lt 10) { throw 'Reference-project set is incomplete.' }
  foreach ($readme in $referenceReadmes) {
    $text = Get-Content -LiteralPath $readme.FullName -Raw
    if ($text -notmatch "Engine \*\*$([regex]::Escape($Version))\*\*" -or $text -notmatch 'Required packages:' -or $text -notmatch 'Target platforms:' -or $text -notmatch 'Known limitations') { throw "Reference README metadata is incomplete: $($readme.FullName)" }
    foreach ($required in @('project.nova', 'expected-output.json', 'test-controls.json')) { if (-not (Test-Path -LiteralPath (Join-Path $readme.DirectoryName $required) -PathType Leaf)) { throw "Reference fixture is missing $required beside $($readme.Name)" } }
  }

  $evidence = Join-Path $temporaryRoot 'release-evidence'
  $manifestPath = Join-Path $evidence 'evidence-manifest.json'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  $evidenceFiles = @(Get-ChildItem -LiteralPath $evidence -File -Recurse | Where-Object FullName -ne $manifestPath)
  if ($manifest.entries.Count -ne $evidenceFiles.Count) { throw "Evidence manifest has $($manifest.entries.Count) entries for $($evidenceFiles.Count) files." }
  foreach ($entry in $manifest.entries) {
    $path = Join-Path $evidence $entry.path.Replace('/', '\')
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Evidence entry is missing: $($entry.path)" }
    $hash = (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($hash -ne $entry.sha256) { throw "Evidence hash mismatch: $($entry.path)" }
  }
  $rootHashReport = Get-Content -LiteralPath (Join-Path $evidence 'build\root-artifact-hashes.json') -Raw | ConvertFrom-Json
  if (-not ($rootHashReport.artifacts.name -contains "Nova_A-v$Version-source.zip")) { throw 'Evidence does not record the source-archive hash.' }

  $portableVersion = (Get-Item -LiteralPath (Join-Path $releaseRoot "Nova_A-v$Version-windows-x64-portable.exe")).VersionInfo.ProductVersion
  if ($portableVersion -notlike "$Version*") { throw "Portable executable reports unexpected product version $portableVersion" }
  [pscustomobject]@{ RootFiles = $actual.Count; PayloadChecksums = $checksumCount; WebFiles = @(Get-ChildItem -LiteralPath $web -File -Recurse).Count; ReferenceProjects = $referenceReadmes.Count; EvidenceFiles = $evidenceFiles.Count; EvidenceHashes = $manifest.entries.Count; PortableProductVersion = $portableVersion; Status = 'passed' }
}
finally {
  $resolvedTemporary = (Resolve-Path -LiteralPath $temporaryRoot -ErrorAction SilentlyContinue).Path
  $systemTemporary = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTemporary -and $resolvedTemporary.StartsWith($systemTemporary, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force }
  elseif ($resolvedTemporary) { throw "Unsafe temporary cleanup target: $resolvedTemporary" }
}
