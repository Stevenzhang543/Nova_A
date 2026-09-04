[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+(?:\.\d+)?$')]
  [string]$Version,
  [ValidatePattern('^$|^\d+\.\d+\.\d+$')]
  [string]$MachineVersion = '',
  [string]$ReleaseDirectory = ''
)

$ErrorActionPreference = 'Stop'

function Get-Sha256Lower {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LiteralPath
  )

  # Use the framework implementation directly so independent verification also
  # works in minimal PowerShell hosts where Get-FileHash is not registered.
  $stream = [IO.File]::OpenRead($LiteralPath)
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try {
    return ([BitConverter]::ToString($algorithm.ComputeHash($stream))).Replace('-', '').ToLowerInvariant()
  }
  finally {
    $algorithm.Dispose()
    $stream.Dispose()
  }
}

function Get-CalendarReleaseInfo {
  param([Parameter(Mandatory = $true)][string]$Label)
  $match = [regex]::Match($Label, '^(\d{2})\.(\d{2})$')
  if (-not $match.Success) { return $null }
  $year = [int]$match.Groups[1].Value
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 12) { throw "Calendar release sequence must be between 01 and 12: $Label" }
  return [pscustomobject]@{ Year = $year; Sequence = $sequence; MachineVersion = "$year.$sequence.0" }
}

function Get-CanonicalCalendarLabel {
  param([string]$MachineVersion)
  $match = [regex]::Match($MachineVersion, '^(\d{2})\.(\d{1,2})\.0$')
  if (-not $match.Success -or [int]$match.Groups[1].Value -lt 26) { return $null }
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 12) { return $null }
  return '{0}.{1:00}' -f [int]$match.Groups[1].Value, $sequence
}

function Test-VersionAtMost {
  param([string]$Candidate, [string]$Maximum)
  if ($Candidate -notmatch '^\d+\.\d+\.\d+$' -or $Maximum -notmatch '^\d+\.\d+\.\d+$') { return $false }
  $left = @($Candidate.Split('.') | ForEach-Object { [int]$_ }); $right = @($Maximum.Split('.') | ForEach-Object { [int]$_ })
  for ($index = 0; $index -lt 3; $index++) { if ($left[$index] -lt $right[$index]) { return $true }; if ($left[$index] -gt $right[$index]) { return $false } }
  return $true
}

function Assert-VersionAuthorities {
  param([string]$Root, [string]$Expected)
  $values = @(
    (Get-Content -LiteralPath (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json).version,
    (Get-Content -LiteralPath (Join-Path $Root 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json).version,
    [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'Cargo.toml') -Raw), '(?m)^version\s*=\s*"([^"]+)"').Groups[1].Value,
    [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'src-tauri\Cargo.toml') -Raw), '(?m)^version\s*=\s*"([^"]+)"').Groups[1].Value,
    [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'src\projects\projectFormat.ts') -Raw), "NOVA_ENGINE_VERSION\s*=\s*'([^']+)'").Groups[1].Value,
    [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'crates\nova_format\src\lib.rs') -Raw), 'CURRENT_ENGINE_VERSION:\s*&str\s*=\s*"([^"]+)"').Groups[1].Value
  )
  $lockEntries = @([regex]::Matches((Get-Content -LiteralPath (Join-Path $Root 'Cargo.lock') -Raw), '(?ms)^name = "nova_[^"]+"\r?\nversion = "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  $lockVersions = @($lockEntries | Sort-Object -Unique)
  if ($lockEntries.Count -lt 7 -or @(($values + $lockVersions) | Where-Object { $_ -ne $Expected }).Count -gt 0) { throw "Packaged source version authorities do not all equal $Expected." }
}

function Test-RequiresStructuredEvidence {
  param([Parameter(Mandatory = $true)][string]$Label)
  $calendar = Get-CalendarReleaseInfo -Label $Label
  return $null -ne $calendar -and ($calendar.Year -gt 26 -or ($calendar.Year -eq 26 -and $calendar.Sequence -ge 6))
}

function Test-RequiresHeadlessAuthority {
  param([Parameter(Mandatory = $true)][string]$Label)
  $calendar = Get-CalendarReleaseInfo -Label $Label
  return $null -ne $calendar -and ($calendar.Year -gt 26 -or ($calendar.Year -eq 26 -and $calendar.Sequence -ge 7))
}

function Get-ExpectedLocalBuildNames {
  param([Parameter(Mandatory = $true)][string]$Label)
  $names = @('web-editor','web-player','windows-editor','windows-nsis','windows-msi')
  if (Test-RequiresHeadlessAuthority -Label $Label) { $names += 'windows-headless-authority' }
  return @($names | Sort-Object)
}

function Test-ForbiddenSourceArchivePath {
  param([Parameter(Mandatory = $true)][string]$Path)
  $normalized = $Path.Replace('\','/').TrimStart('/')
  if ($normalized -ieq 'instructions.txt') { return $true }
  $first = $normalized.Split('/')[0]
  if ($first -like 'stage*' -or $first -match '^(\.git|\.pnpm-store|\.VSCodeCounter|\.vite|\.cache|\.turbo|\.vscode|\.idea|dist|dist-ssr|node_modules|release-audits|releases|target|coverage|playwright-report|test-results|logs)$') { return $true }
  if ($normalized -match '^(src-tauri|nova_core)/target(/|$)' -or $normalized -match '^src-tauri/gen(/|$)') { return $true }
  $name = [IO.Path]::GetFileName($normalized)
  if ($name -match '^(\.DS_Store|Thumbs\.db|Desktop\.ini)$' -or $name -match '^(npm|yarn|pnpm|lerna)-debug\.log' -or $name -match '\.(log|tsbuildinfo|tmp|temp|local|pem|pfx|key)$' -or $name -match '\.sw.$') { return $true }
  if ($name -match '^\.env(?:\..+)?$' -and $name -ne '.env.example') { return $true }
  return $name -match '^(?:\.npmrc|\.pypirc|credentials?(?:\..+)?\.json|secrets?(?:\..+)?\.json)$'
}

if ([string]::IsNullOrWhiteSpace($MachineVersion)) {
  $calendarInput = Get-CalendarReleaseInfo -Label $Version
  $MachineVersion = if ($calendarInput) { $calendarInput.MachineVersion } else { $Version }
}
$canonicalCalendarLabel = Get-CanonicalCalendarLabel -MachineVersion $MachineVersion
if ($canonicalCalendarLabel -and $Version -ne $canonicalCalendarLabel) { throw "Machine version $MachineVersion must be verified under canonical public label $canonicalCalendarLabel." }
$calendarRelease = Get-CalendarReleaseInfo -Label $Version
if ($Version.Split('.').Count -eq 2 -and $null -eq $calendarRelease) { throw "Two-part public versions must use the calendar label YY.MM: $Version" }
if ($null -ne $calendarRelease -and $calendarRelease.MachineVersion -ne $MachineVersion) { throw "Public calendar label $Version requires machine version $($calendarRelease.MachineVersion), not $MachineVersion." }
$requiresStructuredEvidence = Test-RequiresStructuredEvidence -Label $Version
$requiresHeadlessAuthority = Test-RequiresHeadlessAuthority -Label $Version
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$releasesRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot 'releases')).TrimEnd('\')
$releaseCandidate = if ([string]::IsNullOrWhiteSpace($ReleaseDirectory)) { Join-Path $releasesRoot "v$Version" } else { $ReleaseDirectory }
$releaseRoot = (Resolve-Path -LiteralPath $releaseCandidate).Path
$releaseParent = [IO.Path]::GetDirectoryName($releaseRoot).TrimEnd('\')
$releaseLeaf = [IO.Path]::GetFileName($releaseRoot)
if (-not $releaseParent.Equals($releasesRoot, [StringComparison]::OrdinalIgnoreCase) -or ($releaseLeaf -ne "v$Version" -and $releaseLeaf -notmatch "^\.v$([regex]::Escape($Version))-staging-[a-f0-9]{32}$")) {
  throw "Release verification target must be the final release directory or an owned staging sibling: $releaseRoot"
}
$expected = @(
  'EDIT_LEDGER.md', 'LICENSE.md', "Nova_A-v$Version-reference-projects.zip", "Nova_A-v$Version-release-evidence.zip",
  "Nova_A-v$Version-source.zip", "Nova_A-v$Version-web.zip", "Nova_A-v$Version-windows-x64.msi",
  "Nova_A-v$Version-windows-x64-portable.exe", "Nova_A-v$Version-windows-x64-setup.exe", 'RELEASE_NOTES.md', 'SHA256SUMS.txt'
) | Sort-Object
if ($expected.Count -ne 11) { throw 'Internal release contract must contain exactly eleven root artifacts.' }
$actual = @(Get-ChildItem -LiteralPath $releaseRoot -File | ForEach-Object Name | Sort-Object)
if (@(Compare-Object $expected $actual).Count -gt 0) { throw 'Release root does not contain the exact mandatory artifact set.' }
$releaseNotes = Get-Content -LiteralPath (Join-Path $releaseRoot 'RELEASE_NOTES.md') -Raw
$editLedger = Get-Content -LiteralPath (Join-Path $releaseRoot 'EDIT_LEDGER.md') -Raw
if ($releaseNotes -notmatch [regex]::Escape($Version) -or $releaseNotes -notmatch [regex]::Escape($MachineVersion)) { throw 'Release notes do not identify both public and machine versions.' }
if ($editLedger -notmatch [regex]::Escape($Version) -or $editLedger -notmatch [regex]::Escape($MachineVersion) -or $editLedger -notmatch 'Files (changed|added)' -or $editLedger -notmatch 'deterministic path-level manifest') { throw 'Edit ledger does not identify the release, machine authority, and exhaustive path-level file section.' }
$ledgerPaths = @([regex]::Matches($editLedger, '(?m)^- `([^`]+)` — ') | ForEach-Object { $_.Groups[1].Value })
if ($ledgerPaths.Count -lt 20 -or @($ledgerPaths | Select-Object -Unique).Count -ne $ledgerPaths.Count) { throw 'Edit ledger path manifest is incomplete or contains duplicate paths.' }

$checksumNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
foreach ($line in Get-Content -LiteralPath (Join-Path $releaseRoot 'SHA256SUMS.txt')) {
  if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw "Malformed checksum line: $line" }
  $expectedHash = $Matches[1]; $name = $Matches[2]
  if ([IO.Path]::GetFileName($name) -ne $name -or -not $checksumNames.Add($name)) { throw "Unsafe or duplicate root checksum entry: $name" }
  $actualHash = Get-Sha256Lower -LiteralPath (Join-Path $releaseRoot $name)
  if ($actualHash -ne $expectedHash) { throw "Root checksum mismatch: $name" }
}
$expectedChecksummed = @($expected | Where-Object { $_ -ne 'SHA256SUMS.txt' } | Sort-Object)
if (@(Compare-Object $expectedChecksummed @($checksumNames | Sort-Object)).Count -gt 0) { throw 'Root checksum manifest does not cover the exact ten payload artifacts.' }
$checksumCount = $checksumNames.Count

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
  if ($webMetadata.version -ne $Version -or $webMetadata.machineVersion -ne $MachineVersion -or -not $webMetadata.sourceCommit -or $webMetadata.contentManifest -ne 'SHA256SUMS.txt') { throw 'Web release metadata is incomplete.' }
  $webChecksumPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $webPrefix = [IO.Path]::GetFullPath($web).TrimEnd('\') + '\'
  foreach ($line in Get-Content -LiteralPath (Join-Path $web 'SHA256SUMS.txt')) {
    if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw "Malformed web checksum line: $line" }
    $expectedHash = $Matches[1]; $relativePath = $Matches[2].Replace('\','/')
    $parts = $relativePath.Split('/')
    if ([IO.Path]::IsPathRooted($relativePath) -or $parts -contains '..' -or $parts -contains '' -or -not $webChecksumPaths.Add($relativePath)) { throw "Unsafe or duplicate web checksum entry: $relativePath" }
    $webPath = [IO.Path]::GetFullPath((Join-Path $web $relativePath.Replace('/', '\')))
    if (-not $webPath.StartsWith($webPrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $webPath -PathType Leaf)) { throw "Web checksum path is missing or escapes the archive: $relativePath" }
    $webHash = Get-Sha256Lower -LiteralPath $webPath
    if ($webHash -ne $expectedHash) { throw "Web checksum mismatch: $relativePath" }
  }
  $actualWebPaths = @(Get-ChildItem -LiteralPath $web -File -Recurse | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object { $_.FullName.Substring($web.Length).TrimStart('\').Replace('\','/') } | Sort-Object -Unique)
  if (@(Compare-Object @($webChecksumPaths | Sort-Object) $actualWebPaths).Count -gt 0) { throw 'Web checksum manifest does not cover the exact unique web payload inventory.' }

  $source = Join-Path $temporaryRoot 'source'
  foreach ($required in @('README.md', 'package.json', 'pnpm-lock.yaml', 'Cargo.toml', 'Cargo.lock', 'rust-toolchain.toml', '.gitignore', 'scripts\package-release.ps1', 'scripts\verify-release-package.ps1', 'scripts\audit-repository-hygiene.mjs', '.github')) {
    if (-not (Test-Path -LiteralPath (Join-Path $source $required))) { throw "Source package is missing $required" }
  }
  Assert-VersionAuthorities -Root $source -Expected $MachineVersion
  $sourceIgnoreRules = @(Get-Content -LiteralPath (Join-Path $source '.gitignore') | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') })
  foreach ($requiredRule in @('/instructions.txt','stage*/')) {
    if ($requiredRule -notin $sourceIgnoreRules) { throw "Packaged .gitignore is missing required rule $requiredRule." }
  }
  $forbiddenSource = Get-ChildItem -LiteralPath $source -Recurse -Force | Where-Object {
    $relative = $_.FullName.Substring($source.Length + 1)
    Test-ForbiddenSourceArchivePath -Path $relative
  }
  if ($forbiddenSource) { throw 'Source archive contains generated output, repository metadata, or private key material.' }

  $references = Join-Path $temporaryRoot 'reference-projects'
  $referenceReadmes = @(Get-ChildItem -LiteralPath (Join-Path $references 'projects') -Recurse -Filter README.md)
  if ($referenceReadmes.Count -lt 10) { throw 'Reference-project set is incomplete.' }
  $currentReferenceCount = 0
  foreach ($readme in $referenceReadmes) {
    $text = Get-Content -LiteralPath $readme.FullName -Raw
    $engineMatch = [regex]::Match($text, 'Engine \*\*(\d+\.\d+\.\d+)\*\*')
    if (-not $engineMatch.Success -or $text -notmatch 'Project Format 2.*schema 29') { throw "Reference README metadata is incomplete: $($readme.FullName)" }
    foreach ($required in @('project.nova', 'expected-output.json', 'test-controls.json')) { if (-not (Test-Path -LiteralPath (Join-Path $readme.DirectoryName $required) -PathType Leaf)) { throw "Reference fixture is missing $required beside $($readme.Name)" } }
    $referenceProject = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'project.nova') -Raw | ConvertFrom-Json
    if ($referenceProject.engineVersion -notmatch '^\d+\.\d+\.\d+$' -or $referenceProject.projectFormatMajor -ne 2 -or $referenceProject.formatVersion -ne 29) { throw "Reference project authority is invalid: $($readme.FullName)" }
    if (-not (Test-VersionAtMost -Candidate $referenceProject.engineVersion -Maximum $MachineVersion)) { throw "Reference archive contains future-engine project $($referenceProject.engineVersion): $($readme.Directory.Name)" }
    $readmeIsCurrent = $engineMatch.Groups[1].Value -eq $MachineVersion
    $projectIsCurrent = $referenceProject.engineVersion -eq $MachineVersion
    if ($readmeIsCurrent -xor $projectIsCurrent) { throw "Reference authority disagrees for public $Version / machine $($MachineVersion): $($readme.DirectoryName)" }
    if ($readmeIsCurrent) {
      $currentReferenceCount++
      $id = $readme.Directory.Name
      $expectedOutput = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'expected-output.json') -Raw | ConvertFrom-Json
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      if ($expectedOutput.release -ne $Version -or $expectedOutput.engineVersion -ne $MachineVersion -or $expectedOutput.projectFormat -ne 2 -or $expectedOutput.schema -ne 29 -or $expectedOutput.reference -ne $id -or [string]::IsNullOrWhiteSpace([string]$expectedOutput.authoring)) { throw "Current reference expected-output authority/schema is invalid: $id" }
      if ($controls.release -ne $Version -or $controls.engineVersion -ne $MachineVersion -or $controls.reference -ne $id -or $controls.authoring -ne $expectedOutput.authoring -or @($controls.classification).Count -lt 1 -or @($controls.actions).Count -lt 1) { throw "Current reference test-controls authority/behavior matrix is invalid: $id" }
      foreach ($behavior in @($controls.actions)) { if ([string]::IsNullOrWhiteSpace([string]$behavior.action) -or [string]::IsNullOrWhiteSpace([string]$behavior.expected)) { throw "Current reference contains an empty behavior: $id" } }
    }
    if ($Version -eq '5.7.0' -and $readme.Directory.Name -match 'v57') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v5.7 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch 'Required packages:' -or $text -notmatch 'Target platforms:' -or $text -notmatch 'Known limitations') { throw "Current v5.7 reference README metadata is incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '5.8.0' -and $readme.Directory.Name -match 'v58') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v5.8 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch 'Required packages:' -or $text -notmatch 'Target platforms:' -or $text -notmatch 'Known limitations') { throw "Current v5.8 reference README metadata is incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '5.9.0' -and $readme.Directory.Name -match 'v59') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v5.9 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch 'Test workflow' -or $text -notmatch 'External boundary') { throw "Current v5.9 reference README metadata is incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '6.0.0' -and $readme.Directory.Name -match 'creator-v60') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v6.0 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch 'Exact teaching workflow' -or $text -notmatch 'Known limitations' -or $text -notmatch 'Target platforms') { throw "Current v6.0 teaching README metadata is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      if (($controls.lifecycle -join '/') -ne 'author/save/reload/play/build/standalone-player') { throw "Current v6.0 reference lifecycle is incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '6.0.1' -and $readme.Directory.Name -eq 'creator-v601-mouse-knockout') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v6.0.1 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch 'world-space pointer' -or $text -notmatch 'eight orange' -or $text -notmatch 'portable Windows') { throw "Current v6.0.1 gameplay README is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      if (-not $controls.expected.playerUsesWorldPointer -or $controls.expected.targetCount -ne 8 -or -not $controls.expected.completionBanner -or -not $controls.expected.portableBuildConfigured) { throw "Current v6.0.1 gameplay controls are incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '6.0.2' -and $readme.Directory.Name -eq 'creator-v602-interaction-export-audit') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v6.0.2 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch '100%' -or $text -notmatch '200%' -or $text -notmatch 'embedded SHA-256') { throw "Current v6.0.2 interaction/export README is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      if ($controls.uiScales.Count -ne 5 -or -not $controls.expected.viewportContained -or -not $controls.expected.singleFilePortable -or -not $controls.expected.embeddedPackageVerified) { throw "Current v6.0.2 interaction/export controls are incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '6.0.3' -and $readme.Directory.Name -eq 'creator-v603-template-export-accessibility') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v6.0.3 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch 'windows-x64-v1' -or $text -notmatch 'passive visual' -or $text -notmatch '200%') { throw "Current v6.0.3 template/accessibility README is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      if ($controls.uiScales.Count -ne 5 -or $controls.expected.exportTemplate -ne 'windows-x64-v1' -or $controls.expected.accessibilityErrors -ne 0 -or -not $controls.expected.viewportContained -or -not $controls.expected.singleFilePortable) { throw "Current v6.0.3 template/accessibility controls are incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '6.0.4' -and $readme.Directory.Name -eq 'creator-v604-linked-build-performance') {
      if ($engineMatch.Groups[1].Value -ne $Version -or $referenceProject.engineVersion -ne $Version) { throw "Current v6.0.4 reference does not identify $Version`: $($readme.FullName)" }
      if ($text -notmatch '@nova-graph-link' -or $text -notmatch 'build-ID suffix' -or $text -notmatch 'Low-end') { throw "Current v6.0.4 linked-build README is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      if ($controls.uiScales.Count -ne 5 -or -not $controls.expected.bidirectional -or -not $controls.expected.arbitraryCodePreserved -or -not $controls.expected.independentScriptsUnchanged -or -not $controls.expected.singleFilePortable -or $controls.expected.accessDeniedErrors -ne 0) { throw "Current v6.0.4 linked-build controls are incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '26.06' -and $readme.Directory.Name -eq 'simulation-v2606-physics-navigation-ai') {
      if ($engineMatch.Groups[1].Value -ne $MachineVersion -or $referenceProject.engineVersion -ne $MachineVersion) { throw "Current 26.06 simulation reference does not identify $MachineVersion`: $($readme.FullName)" }
      if ($text -notmatch '1 grid unit = 1 metre' -or $text -notmatch 'compound cross collider' -or $text -notmatch 'Rope2D lattice' -or $text -notmatch 'Behavior Tree') { throw "Current 26.06 simulation reference README is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      $expectedOutput = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'expected-output.json') -Raw | ConvertFrom-Json
      if ($controls.actions.Count -lt 7 -or $expectedOutput.gridUnitMeters -ne 1 -or $expectedOutput.compoundColliderChildren -lt 2 -or $expectedOutput.ropePaths -lt 3 -or $expectedOutput.navigationAgents -lt 1 -or $expectedOutput.aiAgents -lt 1) { throw "Current 26.06 simulation reference matrix is incomplete: $($readme.FullName)" }
    }
    if ($Version -eq '26.07' -and $readme.Directory.Name -in @('multiplayer-v2607-coop-rollback', 'multiplayer-v2607-headless-authority')) {
      if ($engineMatch.Groups[1].Value -ne $MachineVersion -or $referenceProject.engineVersion -ne $MachineVersion) { throw "Current 26.07 multiplayer reference does not identify $MachineVersion`: $($readme.FullName)" }
      if ($text -notmatch 'Network Protocol 2' -or $text -notmatch 'native UDP') { throw "Current 26.07 multiplayer reference README is incomplete: $($readme.FullName)" }
      $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
      $expectedOutput = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'expected-output.json') -Raw | ConvertFrom-Json
      if ($controls.actions.Count -lt 5 -or $expectedOutput.networkProtocol -ne 2 -or $expectedOutput.replicatedEntities -lt 2 -or $expectedOutput.rpcContracts -lt 1 -or $expectedOutput.fixedTickReplication -ne $true) { throw "Current 26.07 multiplayer reference matrix is incomplete: $($readme.FullName)" }
    }
  }
  if ($requiresStructuredEvidence -and $currentReferenceCount -lt 1) { throw "Reference archive has no complete project for public $Version / machine $MachineVersion." }

  $evidence = Join-Path $temporaryRoot 'release-evidence'
  $manifestPath = Join-Path $evidence 'evidence-manifest.json'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  if ($manifest.format -ne 'nova-release-evidence-manifest' -or $manifest.version -ne 1 -or $manifest.release -ne $Version -or $manifest.machineVersion -ne $MachineVersion -or $manifest.engineVersion -ne $MachineVersion -or $manifest.localQualificationComplete -ne $true -or $manifest.localReportAuthorities.status -ne 'passed') { throw 'Evidence manifest release authority or local qualification state is incorrect.' }
  if ($manifest.externalGates) {
    $unexpectedExternalPass = @($manifest.externalGates.psobject.Properties | Where-Object { $_.Value -eq 'passed' })
    if ($unexpectedExternalPass.Count -gt 0) { throw 'Evidence manifest claims an external gate passed without packaged external evidence.' }
  }
  $sourceInputs = @($manifest.sourceInputs)
  [string[]]$sourceFiles = @(Get-ChildItem -LiteralPath $source -File -Recurse | ForEach-Object { $_.FullName.Substring($source.Length).TrimStart('\').Replace('\','/') })
  [Array]::Sort($sourceFiles, [StringComparer]::Ordinal)
  if ($sourceInputs.Count -ne $sourceFiles.Count) { throw 'Evidence sourceInputs does not cover the exact packaged source inventory.' }
  $digestText = [Text.StringBuilder]::new()
  for ($index = 0; $index -lt $sourceFiles.Count; $index++) {
    $relativePath = $sourceFiles[$index]; $entry = $sourceInputs[$index]; $filePath = Join-Path $source $relativePath.Replace('/','\'); $file = Get-Item -LiteralPath $filePath
    $hash = Get-Sha256Lower -LiteralPath $filePath
    if ($entry.path -ne $relativePath -or $entry.sha256 -ne $hash -or [long]$entry.bytes -ne $file.Length) { throw "Evidence sourceInputs is stale at $relativePath." }
    [void]$digestText.Append("$relativePath`0$hash`0$($file.Length)`n")
  }
  $digestBytes = [Text.UTF8Encoding]::new($false).GetBytes($digestText.ToString()); $digestAlgorithm = [Security.Cryptography.SHA256]::Create()
  try { $sourceInputDigest = ([BitConverter]::ToString($digestAlgorithm.ComputeHash($digestBytes))).Replace('-', '').ToLowerInvariant() } finally { $digestAlgorithm.Dispose() }
  if ($manifest.sourceInputDigest -ne $sourceInputDigest) { throw 'Evidence sourceInputDigest does not match the exact packaged source inventory.' }
  if ($requiresStructuredEvidence) {
    $manifestPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($entry in @($manifest.entries)) { [void]$manifestPaths.Add(([string]$entry.path).Replace('\','/')) }
    $requiredEvidence = @('build/local-builds.json','build/windows-smoke.json','external/gates.json','layout/layout-browser.json','performance/benchmarks.json','performance/stability-local.json','runtime/dependency-audit.json','runtime/migration-history.json','runtime/product-audit.json','runtime/template-catalog.json','runtime/user-interactions.json','runtime/verification.json','manual/MANUAL.en.md','manual/MANUAL.de.md','manual/MANUAL.zh-CN.md','manual/index.html')
    if ($requiresHeadlessAuthority) { $requiredEvidence += 'build/headless-authority.json' }
    foreach ($required in $requiredEvidence) {
      if (-not $manifestPaths.Contains($required)) { throw "Evidence archive is missing required baseline entry: $required" }
    }
  }
  if ($Version -eq '26.07') {
    foreach ($relativePath in @('runtime\network-verification.json', 'runtime\user-interactions.json', 'runtime\migration-history.json', 'layout\layout-browser.json', 'build\headless-authority.json', 'build\windows-smoke.json', 'external\gates.json')) {
      if (-not (Test-Path -LiteralPath (Join-Path $evidence $relativePath) -PathType Leaf)) { throw "The 26.07 evidence archive is missing $relativePath." }
    }
    $networkEvidence = Get-Content -LiteralPath (Join-Path $evidence 'runtime\network-verification.json') -Raw | ConvertFrom-Json
    $headlessEvidence = Get-Content -LiteralPath (Join-Path $evidence 'build\headless-authority.json') -Raw | ConvertFrom-Json
    if ($networkEvidence.status -ne 'passed' -or $headlessEvidence.status -ne 'passed' -or $headlessEvidence.traffic.status -ne 'passed') { throw 'The 26.07 network/server behavior evidence is not passed.' }
  }
  $evidenceFiles = @(Get-ChildItem -LiteralPath $evidence -File -Recurse | Where-Object FullName -ne $manifestPath)
  $evidencePaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $evidencePrefix = [IO.Path]::GetFullPath($evidence).TrimEnd('\') + '\'
  foreach ($entry in $manifest.entries) {
    $relativePath = [string]$entry.path
    $parts = $relativePath.Replace('/','\').Split('\')
    if ([string]::IsNullOrWhiteSpace($relativePath) -or [IO.Path]::IsPathRooted($relativePath) -or $parts -contains '..' -or $parts -contains '' -or -not $evidencePaths.Add($relativePath.Replace('\','/'))) { throw "Unsafe or duplicate evidence entry: $relativePath" }
    $path = [IO.Path]::GetFullPath((Join-Path $evidence $relativePath.Replace('/', '\')))
    if (-not $path.StartsWith($evidencePrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Evidence entry is missing or escapes the archive: $relativePath" }
    $file = Get-Item -LiteralPath $path
    $hash = Get-Sha256Lower -LiteralPath $path
    if ([string]$entry.bytes -notmatch '^\d+$' -or $entry.sha256 -notmatch '^[a-f0-9]{64}$' -or $hash -ne $entry.sha256 -or $file.Length -ne [long]$entry.bytes) { throw "Evidence digest or byte count mismatch: $relativePath" }
  }
  $actualEvidencePaths = @($evidenceFiles | ForEach-Object { $_.FullName.Substring($evidence.Length).TrimStart('\').Replace('\','/') } | Sort-Object -Unique)
  if (@(Compare-Object @($evidencePaths | Sort-Object) $actualEvidencePaths).Count -gt 0) { throw 'Evidence manifest does not cover the exact unique evidence inventory.' }
  $rootHashReport = Get-Content -LiteralPath (Join-Path $evidence 'build\root-artifact-hashes.json') -Raw | ConvertFrom-Json
  if ($rootHashReport.format -ne 'nova-root-artifact-hashes' -or $rootHashReport.version -ne 1 -or $rootHashReport.release -ne $Version) { throw 'Root-artifact evidence authority is invalid.' }
  $expectedRootHashNames = @($expected | Where-Object { $_ -notin @("Nova_A-v$Version-release-evidence.zip", 'SHA256SUMS.txt') } | Sort-Object)
  $rootHashNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($artifact in @($rootHashReport.artifacts)) {
    $name = [string]$artifact.name
    if ([IO.Path]::GetFileName($name) -ne $name -or -not $rootHashNames.Add($name)) { throw "Unsafe or duplicate root-artifact evidence entry: $name" }
    $artifactPath = Join-Path $releaseRoot $name
    if (-not (Test-Path -LiteralPath $artifactPath -PathType Leaf)) { throw "Root-artifact evidence points to a missing release file: $name" }
    $artifactFile = Get-Item -LiteralPath $artifactPath
    if ([string]$artifact.bytes -notmatch '^\d+$' -or $artifact.sha256 -notmatch '^[a-f0-9]{64}$' -or (Get-Sha256Lower -LiteralPath $artifactPath) -ne $artifact.sha256 -or $artifactFile.Length -ne [long]$artifact.bytes) { throw "Root-artifact evidence is stale: $name" }
  }
  if (@(Compare-Object $expectedRootHashNames @($rootHashNames | Sort-Object)).Count -gt 0) { throw 'Root-artifact evidence does not cover the exact non-circular release payload inventory.' }
  $localBuildsPath = Join-Path $evidence 'build\local-builds.json'
  if (Test-Path -LiteralPath $localBuildsPath -PathType Leaf) {
    $localBuilds = Get-Content -LiteralPath $localBuildsPath -Raw | ConvertFrom-Json
    if ($localBuilds.status -ne 'passed') { throw 'Packaged local-build evidence is not passed.' }
    $localBuildNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $localBuildPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    foreach ($artifact in @($localBuilds.artifacts)) {
      if ([string]::IsNullOrWhiteSpace([string]$artifact.name) -or -not $localBuildNames.Add([string]$artifact.name) -or [string]::IsNullOrWhiteSpace([string]$artifact.path) -or -not $localBuildPaths.Add(([string]$artifact.path).Replace('\','/'))) { throw 'Packaged local-build evidence contains a duplicate or empty name/path.' }
    }
    if ($requiresStructuredEvidence) {
      $expectedLocalBuildNames = Get-ExpectedLocalBuildNames -Label $Version
      if (@(Compare-Object $expectedLocalBuildNames @($localBuildNames | Sort-Object)).Count -gt 0) { throw "Packaged local-build evidence does not contain the exact $Version artifact set." }
    }
    $nativeBuildMap = [ordered]@{
      'windows-editor' = "Nova_A-v$Version-windows-x64-portable.exe"
      'windows-msi' = "Nova_A-v$Version-windows-x64.msi"
      'windows-nsis' = "Nova_A-v$Version-windows-x64-setup.exe"
    }
    foreach ($entry in $nativeBuildMap.GetEnumerator()) {
      $buildArtifact = @($localBuilds.artifacts | Where-Object name -eq $entry.Key)
      $rootArtifact = @($rootHashReport.artifacts | Where-Object name -eq $entry.Value)
      if ($buildArtifact.Count -ne 1 -or $rootArtifact.Count -ne 1 -or $buildArtifact[0].status -ne 'passed' -or $buildArtifact[0].sha256 -ne $rootArtifact[0].sha256) {
        throw "Packaged $($entry.Value) does not match the native artifact qualified by local-build evidence."
      }
    }
    if ($requiresHeadlessAuthority) {
      $headlessBuild = @($localBuilds.artifacts | Where-Object name -eq 'windows-headless-authority')
      $headlessEvidence = Get-Content -LiteralPath (Join-Path $evidence 'build\headless-authority.json') -Raw | ConvertFrom-Json
      if ($headlessEvidence.status -ne 'passed' -or $headlessBuild.Count -ne 1 -or $headlessBuild[0].status -ne 'passed' -or $headlessBuild[0].sha256 -ne $headlessEvidence.artifact.sha256) { throw "The $Version headless authority artifact does not match its qualified behavior report." }
    }
  }
  elseif ($requiresStructuredEvidence) { throw "The $Version evidence archive is missing build/local-builds.json." }

  $portableVersion = (Get-Item -LiteralPath (Join-Path $releaseRoot "Nova_A-v$Version-windows-x64-portable.exe")).VersionInfo.ProductVersion
  if ($portableVersion -notlike "$MachineVersion*") { throw "Portable executable reports unexpected product version $portableVersion" }
  [pscustomobject]@{ RootFiles = $actual.Count; PayloadChecksums = $checksumCount; WebFiles = @(Get-ChildItem -LiteralPath $web -File -Recurse).Count; ReferenceProjects = $referenceReadmes.Count; EvidenceFiles = $evidenceFiles.Count; EvidenceHashes = $manifest.entries.Count; PortableProductVersion = $portableVersion; Status = 'passed' }
}
finally {
  $resolvedTemporary = (Resolve-Path -LiteralPath $temporaryRoot -ErrorAction SilentlyContinue).Path
  $systemTemporary = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  if ($resolvedTemporary -and $resolvedTemporary.StartsWith($systemTemporary, [StringComparison]::OrdinalIgnoreCase)) { Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force }
  elseif ($resolvedTemporary) { throw "Unsafe temporary cleanup target: $resolvedTemporary" }
}
