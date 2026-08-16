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

New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
foreach ($entry in $artifacts.GetEnumerator()) {
  Copy-Item -LiteralPath $entry.Key -Destination (Join-Path $releaseDirectory $entry.Value) -Force
}
Copy-Item -LiteralPath $notesPath -Destination (Join-Path $releaseDirectory 'RELEASE_NOTES.md') -Force
Copy-Item -LiteralPath $ledgerPath -Destination (Join-Path $releaseDirectory 'EDIT_LEDGER.md') -Force
Copy-Item -LiteralPath (Join-Path $projectRoot 'LICENSE.md') -Destination (Join-Path $releaseDirectory 'LICENSE.md') -Force

$webArchive = Join-Path $releaseDirectory "Nova_A-v$Version-web.zip"
Compress-Archive -Path (Join-Path $projectRoot 'dist\*') -DestinationPath $webArchive -CompressionLevel Optimal -Force

$referenceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-reference-projects.zip"
Compress-Archive -Path (Join-Path $projectRoot 'reference-projects\*') -DestinationPath $referenceArchive -CompressionLevel Optimal -Force

$evidenceArchive = Join-Path $releaseDirectory "Nova_A-v$Version-release-evidence.zip"
Compress-Archive -LiteralPath @($benchmarkPath, $stabilityPath, $ledgerPath, (Join-Path $projectRoot 'docs\BENCHMARKS.md'), (Join-Path $projectRoot 'docs\STABILITY.md'), (Join-Path $projectRoot 'docs\PLATFORM_VERIFICATION.md')) -DestinationPath $evidenceArchive -CompressionLevel Optimal -Force

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
