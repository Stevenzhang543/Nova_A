[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidatePattern('^\d+\.\d+(?:\.\d+)?$')]
  [string]$Version,
  [ValidatePattern('^\d+\.\d+(?:\.\d+)?$')]
  [string]$ReleaseLabel = ''
)

$ErrorActionPreference = 'Stop'

function Get-Sha256Lower {
  param(
    [Parameter(Mandatory = $true)]
    [string]$LiteralPath
  )

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
  param([Parameter(Mandatory = $true)][string]$MachineVersion)
  $match = [regex]::Match($MachineVersion, '^(\d{2})\.(\d{1,2})\.0$')
  if (-not $match.Success -or [int]$match.Groups[1].Value -lt 26) { return $null }
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 12) { return $null }
  return '{0}.{1:00}' -f [int]$match.Groups[1].Value, $sequence
}

function Test-VersionAtMost {
  param([string]$Candidate, [string]$Maximum)
  $candidateParts = @($Candidate.Split('.') | ForEach-Object { [int]$_ })
  $maximumParts = @($Maximum.Split('.') | ForEach-Object { [int]$_ })
  if ($candidateParts.Count -ne 3 -or $maximumParts.Count -ne 3) { return $false }
  for ($index = 0; $index -lt 3; $index++) {
    if ($candidateParts[$index] -lt $maximumParts[$index]) { return $true }
    if ($candidateParts[$index] -gt $maximumParts[$index]) { return $false }
  }
  return $true
}

function New-DeterministicZip {
  param([Parameter(Mandatory = $true)][string]$SourceDirectory, [Parameter(Mandatory = $true)][string]$DestinationPath)
  Add-Type -AssemblyName System.IO.Compression
  if (Test-Path -LiteralPath $DestinationPath) { Remove-Item -LiteralPath $DestinationPath -Force }
  $source = (Resolve-Path -LiteralPath $SourceDirectory).Path.TrimEnd('\')
  $stream = [IO.File]::Open($DestinationPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  $archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
  try {
    [string[]]$filePaths = @(Get-ChildItem -LiteralPath $source -File -Recurse | ForEach-Object FullName)
    [Array]::Sort($filePaths, [StringComparer]::Ordinal)
    foreach ($filePath in $filePaths) {
      $file = Get-Item -LiteralPath $filePath
      $relative = $file.FullName.Substring($source.Length).TrimStart('\').Replace('\','/')
      $entry = $archive.CreateEntry($relative, [IO.Compression.CompressionLevel]::Optimal)
      $entry.LastWriteTime = [DateTimeOffset]::new(2000, 1, 1, 0, 0, 0, [TimeSpan]::Zero)
      $input = [IO.File]::OpenRead($file.FullName); $output = $entry.Open()
      try { $input.CopyTo($output) } finally { $output.Dispose(); $input.Dispose() }
    }
  }
  finally { $archive.Dispose(); $stream.Dispose() }
}

function Assert-VersionAuthorities {
  param([Parameter(Mandatory = $true)][string]$Root, [Parameter(Mandatory = $true)][string]$MachineVersion)
  $packageVersion = (Get-Content -LiteralPath (Join-Path $Root 'package.json') -Raw | ConvertFrom-Json).version
  $tauriVersion = (Get-Content -LiteralPath (Join-Path $Root 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json).version
  $workspaceCargo = [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'Cargo.toml') -Raw), '(?m)^version\s*=\s*"([^"]+)"').Groups[1].Value
  $tauriCargo = [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'src-tauri\Cargo.toml') -Raw), '(?m)^version\s*=\s*"([^"]+)"').Groups[1].Value
  $frontend = [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'src\projects\projectFormat.ts') -Raw), "NOVA_ENGINE_VERSION\s*=\s*'([^']+)'").Groups[1].Value
  $rustFormat = [regex]::Match((Get-Content -LiteralPath (Join-Path $Root 'crates\nova_format\src\lib.rs') -Raw), 'CURRENT_ENGINE_VERSION:\s*&str\s*=\s*"([^"]+)"').Groups[1].Value
  $lockEntries = @([regex]::Matches((Get-Content -LiteralPath (Join-Path $Root 'Cargo.lock') -Raw), '(?ms)^name = "nova_[^"]+"\r?\nversion = "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  $lockVersions = @($lockEntries | Sort-Object -Unique)
  $authorities = @($packageVersion, $tauriVersion, $workspaceCargo, $tauriCargo, $frontend, $rustFormat) + $lockVersions
  if ($lockEntries.Count -lt 7 -or @($authorities | Where-Object { $_ -ne $MachineVersion }).Count -gt 0) { throw "Release version authorities do not all equal ${MachineVersion}: $($authorities -join ', ')." }
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

function Assert-CurrentReleaseReferences {
  param(
    [Parameter(Mandatory = $true)][string]$ProjectRoot,
    [Parameter(Mandatory = $true)][string]$PublicLabel,
    [Parameter(Mandatory = $true)][string]$MachineVersion
  )
  $projectsRoot = Join-Path $ProjectRoot 'reference-projects\projects'
  $matches = 0
  foreach ($readme in @(Get-ChildItem -LiteralPath $projectsRoot -Recurse -File -Filter README.md)) {
    $projectPath = Join-Path $readme.DirectoryName 'project.nova'
    if (-not (Test-Path -LiteralPath $projectPath -PathType Leaf)) { continue }
    $text = Get-Content -LiteralPath $readme.FullName -Raw
    $engineMatch = [regex]::Match($text, 'Engine \*\*(\d+\.\d+\.\d+)\*\*')
    $project = Get-Content -LiteralPath $projectPath -Raw | ConvertFrom-Json
    $readmeIsCurrent = $engineMatch.Success -and $engineMatch.Groups[1].Value -eq $MachineVersion
    $projectIsCurrent = $project.engineVersion -eq $MachineVersion
    if ($readmeIsCurrent -xor $projectIsCurrent) { throw "Reference authority disagrees for public $PublicLabel / machine $($MachineVersion): $($readme.DirectoryName)" }
    if (-not $readmeIsCurrent) { continue }
    foreach ($required in @('expected-output.json','test-controls.json')) {
      if (-not (Test-Path -LiteralPath (Join-Path $readme.DirectoryName $required) -PathType Leaf)) { throw "Current $PublicLabel reference is missing $($required): $($readme.DirectoryName)" }
    }
    if ($project.projectFormatMajor -ne 2 -or $project.formatVersion -ne 29) { throw "Current $PublicLabel reference must retain Project Format 2/schema 29: $($readme.DirectoryName)" }
    $expected = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'expected-output.json') -Raw | ConvertFrom-Json
    $controls = Get-Content -LiteralPath (Join-Path $readme.DirectoryName 'test-controls.json') -Raw | ConvertFrom-Json
    $id = $readme.Directory.Name
    if ($expected.release -ne $PublicLabel -or $expected.engineVersion -ne $MachineVersion -or $expected.projectFormat -ne 2 -or $expected.schema -ne 29 -or $expected.reference -ne $id -or [string]::IsNullOrWhiteSpace([string]$expected.authoring)) { throw "Current $PublicLabel expected-output authority/schema is invalid: $id" }
    if ($controls.release -ne $PublicLabel -or $controls.engineVersion -ne $MachineVersion -or $controls.reference -ne $id -or $controls.authoring -ne $expected.authoring -or @($controls.classification).Count -lt 1 -or @($controls.actions).Count -lt 1) { throw "Current $PublicLabel test-controls authority/behavior matrix is invalid: $id" }
    foreach ($behavior in @($controls.actions)) { if ([string]::IsNullOrWhiteSpace([string]$behavior.action) -or [string]::IsNullOrWhiteSpace([string]$behavior.expected)) { throw "Current $PublicLabel reference has an empty behavior: $id" } }
    $matches++
  }
  if ($matches -lt 1) { throw "No complete reference project identifies public $PublicLabel / machine $MachineVersion." }
}

function Assert-StructuredEvidence {
  param(
    [Parameter(Mandatory = $true)][string]$EvidenceRoot,
    [Parameter(Mandatory = $true)][pscustomobject]$Manifest,
    [Parameter(Mandatory = $true)][string]$ProjectRoot
  )
  $resolvedRoot = (Resolve-Path -LiteralPath $EvidenceRoot).Path
  $rootPrefix = $resolvedRoot.TrimEnd('\') + '\'
  $paths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($entry in @($Manifest.entries)) {
    $relativePath = [string]$entry.path
    $parts = $relativePath.Replace('/','\').Split('\')
    if ([string]::IsNullOrWhiteSpace($relativePath) -or $relativePath.Replace('\','/') -eq 'evidence-manifest.json' -or [IO.Path]::IsPathRooted($relativePath) -or $parts -contains '..' -or $parts -contains '') { throw "Unsafe evidence manifest path: $relativePath" }
    if (-not $paths.Add($relativePath.Replace('\','/'))) { throw "Duplicate evidence manifest path: $relativePath" }
    $fullPath = [IO.Path]::GetFullPath((Join-Path $resolvedRoot $relativePath.Replace('/','\')))
    if (-not $fullPath.StartsWith($rootPrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { throw "Evidence manifest path is missing or escapes its root: $relativePath" }
    $file = Get-Item -LiteralPath $fullPath
    if ([string]$entry.bytes -notmatch '^\d+$' -or [string]$entry.sha256 -notmatch '^[a-f0-9]{64}$' -or $file.Length -ne [long]$entry.bytes -or (Get-Sha256Lower -LiteralPath $fullPath) -ne [string]$entry.sha256) { throw "Evidence manifest digest or byte count is stale: $relativePath" }
  }
  $resolvedManifest = [IO.Path]::GetFullPath((Join-Path $resolvedRoot 'evidence-manifest.json'))
  $actualPaths = @(Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse | Where-Object FullName -ne $resolvedManifest | ForEach-Object { $_.FullName.Substring($resolvedRoot.Length).TrimStart('\').Replace('\','/') } | Sort-Object -Unique)
  if (@(Compare-Object @($paths | Sort-Object) $actualPaths).Count -gt 0) { throw 'Evidence manifest does not cover the exact unique evidence file inventory.' }
  if (Test-RequiresStructuredEvidence -Label ([string]$Manifest.release)) {
    $requiredEvidence = @('build/local-builds.json','build/windows-smoke.json','external/gates.json','layout/layout-browser.json','performance/benchmarks.json','performance/stability-local.json','runtime/dependency-audit.json','runtime/migration-history.json','runtime/product-audit.json','runtime/template-catalog.json','runtime/user-interactions.json','runtime/verification.json','manual/MANUAL.en.md','manual/MANUAL.de.md','manual/MANUAL.zh-CN.md','manual/index.html')
    if (Test-RequiresHeadlessAuthority -Label ([string]$Manifest.release)) { $requiredEvidence += 'build/headless-authority.json' }
    foreach ($required in $requiredEvidence) {
      if (-not $paths.Contains($required)) { throw "Structured evidence is missing required baseline entry: $required" }
    }
  }
  $localBuildsPath = Join-Path $resolvedRoot 'build\local-builds.json'
  $localBuilds = Get-Content -LiteralPath $localBuildsPath -Raw | ConvertFrom-Json
  if ($localBuilds.status -ne 'passed') { throw 'Local-build evidence is not passed.' }
  $projectPrefix = [IO.Path]::GetFullPath($ProjectRoot).TrimEnd('\') + '\'
  $artifactNames = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  $artifactPaths = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
  foreach ($artifact in @($localBuilds.artifacts)) {
    if ($artifact.status -ne 'passed') { throw "Local-build evidence is incomplete for $($artifact.name)." }
    if ([string]::IsNullOrWhiteSpace([string]$artifact.name) -or -not $artifactNames.Add([string]$artifact.name)) { throw "Duplicate or empty local-build evidence name: $($artifact.name)" }
    $relativePath = [string]$artifact.path
    $parts = $relativePath.Replace('/','\').Split('\')
    if ([string]::IsNullOrWhiteSpace($relativePath) -or [IO.Path]::IsPathRooted($relativePath) -or $parts -contains '..' -or $parts -contains '' -or -not $artifactPaths.Add($relativePath.Replace('\','/'))) { throw "Unsafe or duplicate local-build artifact path: $relativePath" }
    $fullPath = [IO.Path]::GetFullPath((Join-Path $ProjectRoot $relativePath.Replace('/','\')))
    if ([string]$artifact.sha256 -notmatch '^[a-f0-9]{64}$' -or [string]$artifact.bytes -notmatch '^\d+$' -or -not $fullPath.StartsWith($projectPrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf) -or (Get-Item -LiteralPath $fullPath).Length -ne [long]$artifact.bytes -or (Get-Sha256Lower -LiteralPath $fullPath) -ne [string]$artifact.sha256) { throw "Local-build evidence is stale or outside the project: $relativePath" }
  }
  if (Test-RequiresStructuredEvidence -Label ([string]$Manifest.release)) {
    $expectedArtifacts = Get-ExpectedLocalBuildNames -Label ([string]$Manifest.release)
    if (@(Compare-Object $expectedArtifacts @($artifactNames | Sort-Object)).Count -gt 0) { throw "Local-build evidence does not contain the exact $($Manifest.release) artifact set." }
  }
}

function Invoke-WithTransientFileRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Operation,
    [Parameter(Mandatory = $true)]
    [scriptblock]$Action,
    [int]$MaximumAttempts = 6
  )

  for ($attempt = 1; $attempt -le $MaximumAttempts; $attempt++) {
    try {
      & $Action
      return
    }
    catch {
      if ($attempt -eq $MaximumAttempts) {
        throw "$Operation failed after $MaximumAttempts attempts: $($_.Exception.Message)"
      }
      Start-Sleep -Milliseconds (250 * $attempt)
    }
  }
}

function Get-SourceIdentity {
  param([Parameter(Mandatory = $true)][string]$Root)
  $gitMetadata = Join-Path $Root '.git'
  if (Test-Path -LiteralPath $gitMetadata) {
    $revision = (& git -c "safe.directory=$($Root.Replace('\', '/'))" -C $Root rev-parse HEAD 2>$null).Trim()
    if ($LASTEXITCODE -eq 0 -and $revision -match '^[a-f0-9]{40,64}$') {
      $workingTree = @(& git -c "safe.directory=$($Root.Replace('\', '/'))" -C $Root status --porcelain 2>$null)
      if ($LASTEXITCODE -ne 0) { throw 'git status failed while determining release source identity.' }
      return [pscustomobject]@{ Revision = $revision; State = $(if ($workingTree.Count -gt 0) { 'git-working-tree' } else { 'git-commit' }) }
    }
  }
  return [pscustomobject]@{ Revision = 'unavailable-source-snapshot'; State = 'filesystem-snapshot' }
}

function Test-SensitiveSourcePath {
  param([Parameter(Mandatory = $true)][string]$Path)
  $name = [IO.Path]::GetFileName($Path)
  $extension = [IO.Path]::GetExtension($name).ToLowerInvariant()
  if ($extension -in @('.pem','.pfx','.key')) { return $true }
  if ($name -match '^\.env(?:\..+)?$' -and $name -ne '.env.example') { return $true }
  return $name -match '^(?:\.npmrc|\.pypirc|credentials?(?:\..+)?\.json|secrets?(?:\..+)?\.json)$'
}

function Test-ExcludedSourcePath {
  param([Parameter(Mandatory = $true)][string]$Path)
  $normalized = $Path.Replace('\','/').TrimStart('/')
  if ($normalized -ieq 'instructions.txt') { return $true }
  $first = $normalized.Split('/')[0]
  if ($first -like 'stage*' -or $first -match '^(\.git|\.pnpm-store|\.VSCodeCounter|\.vite|\.cache|\.turbo|\.vscode|\.idea|dist|dist-ssr|node_modules|release-audits|releases|target|coverage|playwright-report|test-results|logs)$') { return $true }
  if ($normalized -match '^(src-tauri|nova_core)/target(/|$)' -or $normalized -match '^src-tauri/gen(/|$)') { return $true }
  $name = [IO.Path]::GetFileName($normalized)
  if ($name -match '^(\.DS_Store|Thumbs\.db|Desktop\.ini)$' -or $name -match '^(npm|yarn|pnpm|lerna)-debug\.log' -or $name -match '\.(log|tsbuildinfo|tmp|temp|local)$' -or $name -match '\.sw.$') { return $true }
  return $false
}

function Get-FilesystemSourceFiles {
  param([Parameter(Mandatory = $true)][string]$Root)
  $stack = [Collections.Generic.Stack[IO.DirectoryInfo]]::new()
  $stack.Push([IO.DirectoryInfo]::new($Root))
  $files = [Collections.Generic.List[string]]::new()
  while ($stack.Count -gt 0) {
    $directory = $stack.Pop()
    foreach ($entry in $directory.EnumerateFileSystemInfos()) {
      $relative = $entry.FullName.Substring($Root.Length).TrimStart('\')
      if (Test-ExcludedSourcePath -Path $relative) { continue }
      if (($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { continue }
      if ($entry -is [IO.DirectoryInfo]) { $stack.Push($entry) }
      elseif ($entry -is [IO.FileInfo] -and -not (Test-SensitiveSourcePath -Path $relative)) { $files.Add($relative.Replace('\','/')) }
    }
  }
  [string[]]$ordered = @($files)
  [Array]::Sort($ordered, [StringComparer]::Ordinal)
  return $ordered
}

function Assert-EvidenceSourceInputs {
  param([Parameter(Mandatory = $true)][string]$ProjectRoot, [Parameter(Mandatory = $true)][pscustomobject]$Manifest)
  $expected = [Collections.Generic.List[object]]::new()
  foreach ($relativePath in @(Get-FilesystemSourceFiles -Root $ProjectRoot)) {
    $file = Get-Item -LiteralPath (Join-Path $ProjectRoot $relativePath.Replace('/','\'))
    $expected.Add([pscustomobject]@{ path = $relativePath; sha256 = Get-Sha256Lower -LiteralPath $file.FullName; bytes = $file.Length })
  }
  $actual = @($Manifest.sourceInputs)
  if ($actual.Count -ne $expected.Count) { throw 'Structured evidence sourceInputs does not cover the exact current source inventory.' }
  $lines = [Text.StringBuilder]::new()
  for ($index = 0; $index -lt $expected.Count; $index++) {
    $left = $expected[$index]; $right = $actual[$index]
    if ($right.path -ne $left.path -or $right.sha256 -ne $left.sha256 -or [long]$right.bytes -ne $left.bytes) { throw "Structured evidence sourceInputs is stale at $($left.path)." }
    [void]$lines.Append("$($left.path)`0$($left.sha256)`0$($left.bytes)`n")
  }
  $bytes = [Text.UTF8Encoding]::new($false).GetBytes($lines.ToString())
  $algorithm = [Security.Cryptography.SHA256]::Create()
  try { $digest = ([BitConverter]::ToString($algorithm.ComputeHash($bytes))).Replace('-', '').ToLowerInvariant() } finally { $algorithm.Dispose() }
  if ([string]$Manifest.sourceInputDigest -notmatch '^[a-f0-9]{64}$' -or $Manifest.sourceInputDigest -ne $digest) { throw 'Structured evidence sourceInputDigest does not identify the exact current source inventory.' }
}

$MachineVersion = $Version
if ($MachineVersion -notmatch '^\d+\.\d+\.\d+$') { throw "Machine version must be three-part SemVer: $MachineVersion" }
$canonicalCalendarLabel = Get-CanonicalCalendarLabel -MachineVersion $MachineVersion
if ([string]::IsNullOrWhiteSpace($ReleaseLabel)) { $ReleaseLabel = if ($canonicalCalendarLabel) { $canonicalCalendarLabel } else { $MachineVersion } }
if ($canonicalCalendarLabel -and $ReleaseLabel -ne $canonicalCalendarLabel) { throw "Machine version $MachineVersion requires canonical public calendar label $canonicalCalendarLabel." }
$Version = $ReleaseLabel
$calendarRelease = Get-CalendarReleaseInfo -Label $Version
if ($Version.Split('.').Count -eq 2 -and $null -eq $calendarRelease) { throw "Two-part public versions must use the calendar label YY.MM: $Version" }
if ($null -ne $calendarRelease -and $calendarRelease.MachineVersion -ne $MachineVersion) { throw "Public calendar label $Version requires machine version $($calendarRelease.MachineVersion), not $MachineVersion." }
$requiresStructuredEvidence = Test-RequiresStructuredEvidence -Label $Version
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$gitSafeDirectory = $projectRoot.Replace('\', '/')
$sourceIdentity = Get-SourceIdentity -Root $projectRoot
Assert-VersionAuthorities -Root $projectRoot -MachineVersion $MachineVersion
$finalReleaseDirectory = Join-Path $projectRoot "releases\v$Version"
$notesPath = Join-Path $projectRoot "release-audits\v$Version-release-notes.md"
$ledgerPath = Join-Path $projectRoot "release-audits\v$Version-edit-ledger.md"
$benchmarkPath = Join-Path $projectRoot "release-audits\v$Version-benchmarks.json"
$stabilityPath = Join-Path $projectRoot "release-audits\v$Version-stability-smoke.json"
$referenceReadme = Join-Path $projectRoot 'reference-projects\README.md'
$structuredEvidence = Join-Path $projectRoot "release-audits\evidence-v$Version"
$structuredEvidenceManifest = Join-Path $structuredEvidence 'evidence-manifest.json'

$artifacts = [ordered]@{
  (Join-Path $projectRoot 'src-tauri\target\release\nova_a.exe') = "Nova_A-v$Version-windows-x64-portable.exe"
  (Join-Path $projectRoot "src-tauri\target\release\bundle\msi\Nova_A_${MachineVersion}_x64_en-US.msi") = "Nova_A-v$Version-windows-x64.msi"
  (Join-Path $projectRoot "src-tauri\target\release\bundle\nsis\Nova_A_${MachineVersion}_x64-setup.exe") = "Nova_A-v$Version-windows-x64-setup.exe"
}

$requiredInputs = @($artifacts.Keys) + @(
  $notesPath,
  $ledgerPath,
  $benchmarkPath,
  $stabilityPath,
  $referenceReadme,
  (Join-Path $projectRoot 'dist\index.html'),
  (Join-Path $projectRoot 'dist\player.html'),
  (Join-Path $projectRoot 'LICENSE.md'),
  (Join-Path $projectRoot 'node_modules\@fontsource-variable\nunito-sans\LICENSE'),
  (Join-Path $projectRoot 'node_modules\@fontsource-variable\noto-sans-sc\LICENSE'),
  (Join-Path $projectRoot 'node_modules\@fontsource-variable\jetbrains-mono\LICENSE'),
  (Join-Path $projectRoot 'package.json'),
  (Join-Path $projectRoot 'pnpm-lock.yaml'),
  (Join-Path $projectRoot '.gitignore'),
  (Join-Path $projectRoot 'scripts\audit-repository-hygiene.mjs'),
  (Join-Path $projectRoot 'Cargo.toml'),
  (Join-Path $projectRoot 'Cargo.lock'),
  (Join-Path $projectRoot 'README.md'),
  (Join-Path $projectRoot 'README.zh-CN.md'),
  (Join-Path $projectRoot 'docs\BENCHMARKS.md'),
  (Join-Path $projectRoot 'docs\STABILITY.md'),
  (Join-Path $projectRoot 'docs\PLATFORM_VERIFICATION.md'),
  (Join-Path $projectRoot 'docs\COMPATIBILITY.md'),
  (Join-Path $projectRoot 'docs\STABLE_CONTRACTS.md'),
  (Join-Path $projectRoot 'docs\KNOWN_LIMITATIONS.md')
)
if ($requiresStructuredEvidence) { $requiredInputs += $structuredEvidenceManifest }
foreach ($source in $requiredInputs) {
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Required release input is missing: $source"
  }
}
if ($requiresStructuredEvidence) {
  $candidateEvidence = Get-Content -LiteralPath $structuredEvidenceManifest -Raw | ConvertFrom-Json
  if ($candidateEvidence.format -ne 'nova-release-evidence-manifest' -or $candidateEvidence.version -ne 1 -or $candidateEvidence.release -ne $Version -or $candidateEvidence.machineVersion -ne $MachineVersion -or $candidateEvidence.engineVersion -ne $MachineVersion -or $candidateEvidence.localQualificationComplete -ne $true -or $candidateEvidence.localReportAuthorities.status -ne 'passed') {
    throw "Structured evidence is stale or incomplete for public $Version / machine $MachineVersion. Run pnpm evidence:v$Version after every required report and build."
  }
  Assert-StructuredEvidence -EvidenceRoot $structuredEvidence -Manifest $candidateEvidence -ProjectRoot $projectRoot
  Assert-EvidenceSourceInputs -ProjectRoot $projectRoot -Manifest $candidateEvidence
  Assert-CurrentReleaseReferences -ProjectRoot $projectRoot -PublicLabel $Version -MachineVersion $MachineVersion
}
$releaseGeneratedAt = if ($requiresStructuredEvidence) { [string]$candidateEvidence.generatedAt } else { (Get-Item -LiteralPath $notesPath).LastWriteTimeUtc.ToString('o') }

$releaseRoot = [System.IO.Path]::GetFullPath((Join-Path $projectRoot 'releases')).TrimEnd('\')
New-Item -ItemType Directory -Path $releaseRoot -Force | Out-Null
$releaseDirectory = Join-Path $releaseRoot (".v$Version-staging-" + [guid]::NewGuid().ToString('N'))
$resolvedRelease = [System.IO.Path]::GetFullPath($releaseDirectory)
if (-not [IO.Path]::GetDirectoryName($resolvedRelease).Equals($releaseRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolvedRelease) -notmatch "^\.v$([regex]::Escape($Version))-staging-[a-f0-9]{32}$") { throw "Unsafe release staging target: $resolvedRelease" }
if (Test-Path -LiteralPath $resolvedRelease) { throw "Release staging target unexpectedly exists: $resolvedRelease" }
New-Item -ItemType Directory -Path $resolvedRelease | Out-Null
try {
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
  Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE.md') -Destination (Join-Path $webStage 'LICENSE.md') -Force
  $fontLicenseDirectory = Join-Path $webStage 'FONT_LICENSES'
  New-Item -ItemType Directory -Path $fontLicenseDirectory -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot 'node_modules\@fontsource-variable\nunito-sans\LICENSE') -Destination (Join-Path $fontLicenseDirectory 'Nunito-Sans-OFL-1.1.txt') -Force
  Copy-Item -LiteralPath (Join-Path $projectRoot 'node_modules\@fontsource-variable\noto-sans-sc\LICENSE') -Destination (Join-Path $fontLicenseDirectory 'Noto-Sans-SC-OFL-1.1.txt') -Force
  Copy-Item -LiteralPath (Join-Path $projectRoot 'node_modules\@fontsource-variable\jetbrains-mono\LICENSE') -Destination (Join-Path $fontLicenseDirectory 'JetBrains-Mono-OFL-1.1.txt') -Force
  $webReadme = @"
# Nova_A $Version Web Package

Serve this directory from an HTTP(S) origin. Do not open `index.html` with `file://`; WebAssembly modules, workers, ES modules, and the bundled manual require a web server. `index.html` opens the editor and `player.html` opens the standalone player. Preserve file names and MIME types, especially `application/wasm` for `.wasm` files. HTTPS is required for production networking and other secure browser APIs. Use immutable long-lived caching for hashed files under `assets/`, but revalidate HTML and `release-metadata.json`. Cross-origin isolation is not required by this release; if a host enables it, configure COOP/COEP consistently for every asset. The locally qualified browser is the pinned Edge/Chromium identity in the evidence archive; Firefox remains an explicit external gate.

Verify every packaged file against `SHA256SUMS.txt`. Release metadata is in `release-metadata.json`.
"@
  [IO.File]::WriteAllText((Join-Path $webStage 'README.md'), $webReadme, [Text.UTF8Encoding]::new($false))
  $webMetadata = [ordered]@{ product = 'Nova_A'; version = $Version; machineVersion = $MachineVersion; format = 'nova-web-release'; projectFormat = 2; schema = 29; sourceCommit = $sourceIdentity.Revision; sourceState = $sourceIdentity.State; generatedAt = $releaseGeneratedAt; entrypoints = @('index.html','player.html'); contentManifest = 'SHA256SUMS.txt'; runtimeCapabilities = @('2D editor','standalone player','WebAssembly physics','workers','bundled manual','local variable fonts'); hosting = [ordered]@{ protocol = 'http-or-https'; wasmMime = 'application/wasm'; hashedAssetCaching = 'immutable'; htmlCaching = 'revalidate'; crossOriginIsolationRequired = $false; spaFallbackRequired = $false } } | ConvertTo-Json -Depth 6
  [IO.File]::WriteAllText((Join-Path $webStage 'release-metadata.json'), "$webMetadata`n", [Text.UTF8Encoding]::new($false))
  [string[]]$webChecksumFiles = @(Get-ChildItem -LiteralPath $webStage -File -Recurse | Where-Object Name -ne 'SHA256SUMS.txt' | ForEach-Object FullName)
  [Array]::Sort($webChecksumFiles, [StringComparer]::Ordinal)
  $webChecksums = @($webChecksumFiles | ForEach-Object { $relative = $_.Substring($webStage.Length).TrimStart('\').Replace('\','/'); "{0}  {1}" -f (Get-Sha256Lower -LiteralPath $_), $relative })
  [IO.File]::WriteAllLines((Join-Path $webStage 'SHA256SUMS.txt'), $webChecksums, [Text.UTF8Encoding]::new($false))
  New-DeterministicZip -SourceDirectory $webStage -DestinationPath $webArchive
}
finally {
  if (Test-Path -LiteralPath $webStage) { Remove-Item -LiteralPath $webStage -Recurse -Force }
}

$referenceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-reference-projects.zip"
$referenceStage = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-references-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $referenceStage | Out-Null
try { Invoke-WithTransientFileRetry -Operation 'Reference-project archive creation' -Action {
  foreach ($entry in @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'reference-projects') | Where-Object Name -ne 'projects')) { Copy-Item -LiteralPath $entry.FullName -Destination $referenceStage -Recurse -Force }
  $projectsStage = Join-Path $referenceStage 'projects'; New-Item -ItemType Directory -Path $projectsStage -Force | Out-Null
  foreach ($directory in @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'reference-projects\projects') -Directory)) {
    $projectPath = Join-Path $directory.FullName 'project.nova'
    if (-not (Test-Path -LiteralPath $projectPath -PathType Leaf)) { continue }
    $engine = [string](Get-Content -LiteralPath $projectPath -Raw | ConvertFrom-Json).engineVersion
    if (-not (Test-VersionAtMost -Candidate $engine -Maximum $MachineVersion)) { continue }
    Copy-Item -LiteralPath $directory.FullName -Destination (Join-Path $projectsStage $directory.Name) -Recurse -Force
  }
  New-DeterministicZip -SourceDirectory $referenceStage -DestinationPath $referenceArchive
} }
finally { if (Test-Path -LiteralPath $referenceStage) { Remove-Item -LiteralPath $referenceStage -Recurse -Force } }

$evidenceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-release-evidence.zip"
$evidenceStage = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-evidence-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $evidenceStage | Out-Null
try {
  if (Test-Path -LiteralPath $structuredEvidence -PathType Container) {
    Copy-Item -Path (Join-Path $structuredEvidence '*') -Destination $evidenceStage -Recurse -Force
  }
  else {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'release-audits') -File -Filter "v$Version-*" | Copy-Item -Destination $evidenceStage -Force
  }
  $screenshotSource = Join-Path $projectRoot "release-audits\screenshots\v$Version"
  if (Test-Path -LiteralPath $screenshotSource) { Copy-Item -LiteralPath $screenshotSource -Destination (Join-Path $evidenceStage 'screenshots') -Recurse -Force }
  foreach ($source in @($notesPath, $ledgerPath, (Join-Path $projectRoot 'package.json'), (Join-Path $projectRoot 'pnpm-lock.yaml'), (Join-Path $projectRoot 'Cargo.toml'), (Join-Path $projectRoot 'Cargo.lock'), (Join-Path $projectRoot 'README.md'), (Join-Path $projectRoot 'README.zh-CN.md'))) { Copy-Item -LiteralPath $source -Destination $evidenceStage -Force }
  foreach ($name in @('BENCHMARKS.md','STABILITY.md','PLATFORM_VERIFICATION.md','COMPATIBILITY.md','STABLE_CONTRACTS.md','KNOWN_LIMITATIONS.md')) { Copy-Item -LiteralPath (Join-Path $projectRoot "docs\$name") -Destination $evidenceStage -Force }
  New-DeterministicZip -SourceDirectory $evidenceStage -DestinationPath $evidenceArchive
}
finally {
  if (Test-Path -LiteralPath $evidenceStage) { Remove-Item -LiteralPath $evidenceStage -Recurse -Force }
}

$sourceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-source.zip"
$sourceStage = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-source-" + [guid]::NewGuid().ToString('N'))
$sourceTemporaryArchive = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-source-" + [guid]::NewGuid().ToString('N') + '.zip')
New-Item -ItemType Directory -Path $sourceStage | Out-Null
try {
  # Use the same policy-defined filesystem inventory as evidence generation.
  # Git ignore state must not silently make the packaged source differ from
  # the exact sourceInputs authority recorded in the evidence manifest.
  $trackedAndUntracked = Get-FilesystemSourceFiles -Root $projectRoot
  foreach ($relativePath in $trackedAndUntracked) {
    if (Test-ExcludedSourcePath -Path $relativePath) { continue }
    if (Test-SensitiveSourcePath -Path $relativePath) { continue }
    if ([IO.Path]::IsPathRooted($relativePath) -or $relativePath.Replace('/','\').Split('\') -contains '..') { throw "Unsafe source archive path: $relativePath" }
    $source = Join-Path $projectRoot $relativePath
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) { continue }
    $sourceItem = Get-Item -LiteralPath $source -Force
    if (($sourceItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Source archive refuses a reparse-point file: $relativePath" }
    $destination = Join-Path $sourceStage $relativePath
    $destinationDirectory = Split-Path -Parent $destination
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $source -Destination $destination -Force
  }
  New-DeterministicZip -SourceDirectory $sourceStage -DestinationPath $sourceTemporaryArchive
  Move-Item -LiteralPath $sourceTemporaryArchive -Destination $sourceArchive -Force
}
finally {
  $resolvedStage = (Resolve-Path -LiteralPath $sourceStage -ErrorAction SilentlyContinue).Path
  $temporaryRoot = [System.IO.Path]::GetFullPath([System.IO.Path]::GetTempPath())
  if ($resolvedStage -and $resolvedStage.StartsWith($temporaryRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
  if (Test-Path -LiteralPath $sourceTemporaryArchive) { Remove-Item -LiteralPath $sourceTemporaryArchive -Force }
}

# The source archive is created after the initial evidence tree so its exact
# hash can be embedded without creating a circular evidence-archive hash.
$evidenceRefresh = Join-Path ([System.IO.Path]::GetTempPath()) ("nova-a-evidence-refresh-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $evidenceRefresh | Out-Null
try {
  Expand-Archive -LiteralPath $evidenceArchive -DestinationPath $evidenceRefresh -Force
  $packagedArtifacts = Get-ChildItem -LiteralPath $releaseDirectory -File |
    Where-Object Name -NotIn @((Split-Path -Leaf $evidenceArchive), 'SHA256SUMS.txt') |
    Sort-Object Name |
    ForEach-Object { [ordered]@{ name = $_.Name; bytes = $_.Length; sha256 = (Get-Sha256Lower -LiteralPath $_.FullName) } }
  $artifactHashReport = [ordered]@{ format = 'nova-root-artifact-hashes'; version = 1; release = $Version; generatedAt = $releaseGeneratedAt; note = 'The evidence archive and checksum manifest are excluded to avoid circular hashes.'; artifacts = @($packagedArtifacts) } | ConvertTo-Json -Depth 6
  $artifactHashPath = Join-Path $evidenceRefresh 'build\root-artifact-hashes.json'
  New-Item -ItemType Directory -Path (Split-Path -Parent $artifactHashPath) -Force | Out-Null
  [IO.File]::WriteAllText($artifactHashPath, "$artifactHashReport`n", [Text.UTF8Encoding]::new($false))
  $manifestPath = Join-Path $evidenceRefresh 'evidence-manifest.json'
  $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
  [string[]]$evidenceEntryFiles = @(Get-ChildItem -LiteralPath $evidenceRefresh -File -Recurse | Where-Object FullName -ne $manifestPath | ForEach-Object FullName)
  [Array]::Sort($evidenceEntryFiles, [StringComparer]::Ordinal)
  $manifest.entries = @($evidenceEntryFiles |
    ForEach-Object {
      $file = Get-Item -LiteralPath $_
      [pscustomobject]@{
        path = $file.FullName.Substring($evidenceRefresh.Length).TrimStart('\').Replace('\','/')
        sha256 = (Get-Sha256Lower -LiteralPath $file.FullName)
        bytes = $file.Length
        source = $manifest.source.commit
        tool = 'Nova_A package-release.ps1'
        environment = $manifest.environment.id
      }
    })
  $manifest | ConvertTo-Json -Depth 20 | ForEach-Object { [IO.File]::WriteAllText($manifestPath, "$_`n", [Text.UTF8Encoding]::new($false)) }
  Remove-Item -LiteralPath $evidenceArchive -Force
  New-DeterministicZip -SourceDirectory $evidenceRefresh -DestinationPath $evidenceArchive
}
finally {
  if (Test-Path -LiteralPath $evidenceRefresh) { Remove-Item -LiteralPath $evidenceRefresh -Recurse -Force }
}

$checksumPath = Join-Path $releaseDirectory 'SHA256SUMS.txt'
$checksumLines = Get-ChildItem -LiteralPath $releaseDirectory -File |
  Where-Object Name -ne 'SHA256SUMS.txt' |
  Sort-Object Name |
  ForEach-Object { "{0}  {1}" -f (Get-Sha256Lower -LiteralPath $_.FullName), $_.Name }
[System.IO.File]::WriteAllLines($checksumPath, $checksumLines, [System.Text.UTF8Encoding]::new($false))

$expectedNames = @(
  'EDIT_LEDGER.md', 'LICENSE.md', "Nova_A-v$Version-reference-projects.zip", "Nova_A-v$Version-release-evidence.zip",
  "Nova_A-v$Version-source.zip", "Nova_A-v$Version-web.zip", "Nova_A-v$Version-windows-x64.msi",
  "Nova_A-v$Version-windows-x64-portable.exe", "Nova_A-v$Version-windows-x64-setup.exe", 'RELEASE_NOTES.md', 'SHA256SUMS.txt'
)
if ($expectedNames.Count -ne 11) { throw 'Internal release contract must contain exactly eleven root artifacts.' }
$actualNames = @(Get-ChildItem -LiteralPath $releaseDirectory -File | ForEach-Object Name | Sort-Object)
$nameDifference = @(Compare-Object ($expectedNames | Sort-Object) $actualNames)
if ($nameDifference.Count -gt 0) { throw "Release root does not contain the exact mandatory artifact set: $($nameDifference | Out-String)" }
foreach ($line in Get-Content -LiteralPath $checksumPath) {
  if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw "Invalid checksum line: $line" }
  $actualHash = Get-Sha256Lower -LiteralPath (Join-Path $releaseDirectory $Matches[2])
  if ($actualHash -ne $Matches[1]) { throw "Checksum verification failed for $($Matches[2])" }
}

& (Join-Path $PSScriptRoot 'verify-release-package.ps1') -Version $Version -MachineVersion $MachineVersion -ReleaseDirectory $releaseDirectory | Out-Null

$resolvedFinalRelease = [IO.Path]::GetFullPath($finalReleaseDirectory)
$finalReleaseParent = [IO.Path]::GetDirectoryName($resolvedFinalRelease)
if (-not $finalReleaseParent.Equals($releaseRoot, [StringComparison]::OrdinalIgnoreCase) -or [IO.Path]::GetFileName($resolvedFinalRelease) -ne "v$Version") { throw "Unsafe final release target: $resolvedFinalRelease" }
$backupDirectory = Join-Path $releaseRoot (".v$Version-backup-" + [guid]::NewGuid().ToString('N'))
$backedUpPreviousRelease = $false
try {
  if (Test-Path -LiteralPath $resolvedFinalRelease) {
    $existingRelease = Get-Item -LiteralPath $resolvedFinalRelease -Force
    if (-not $existingRelease.PSIsContainer -or ($existingRelease.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw "Refusing to replace a non-directory or reparse-point release target: $resolvedFinalRelease" }
    Move-Item -LiteralPath $resolvedFinalRelease -Destination $backupDirectory
    $backedUpPreviousRelease = $true
  }
  Move-Item -LiteralPath $releaseDirectory -Destination $resolvedFinalRelease
}
catch {
  if (-not (Test-Path -LiteralPath $resolvedFinalRelease) -and $backedUpPreviousRelease -and (Test-Path -LiteralPath $backupDirectory)) {
    Move-Item -LiteralPath $backupDirectory -Destination $resolvedFinalRelease
  }
  throw
}
if ($backedUpPreviousRelease -and (Test-Path -LiteralPath $backupDirectory)) {
  Remove-Item -LiteralPath $backupDirectory -Recurse -Force
}

Get-ChildItem -LiteralPath $resolvedFinalRelease -File | Sort-Object Name | Select-Object Name, Length, LastWriteTime
}
finally {
  if (Test-Path -LiteralPath $releaseDirectory) {
    $cleanupCandidate = [IO.Path]::GetFullPath($releaseDirectory)
    if ([IO.Path]::GetDirectoryName($cleanupCandidate).Equals($releaseRoot, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($cleanupCandidate) -match "^\.v$([regex]::Escape($Version))-staging-[a-f0-9]{32}$") {
      Remove-Item -LiteralPath $cleanupCandidate -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}
