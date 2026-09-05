# Shared release-label and native artifact checks. Loading this file has no side effects.
function Get-CalendarReleaseInfo {
  param([Parameter(Mandatory = $true)][string]$Label)
  $match = [regex]::Match($Label, '^(\d{2})\.(\d{2})$')
  if (-not $match.Success) { return $null }
  $year = [int]$match.Groups[1].Value
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 99) { throw "Release sequence must be between 01 and 99: $Label" }
  return [pscustomobject]@{ Year = $year; Sequence = $sequence; MachineVersion = "$year.$sequence.0" }
}

function Get-CanonicalCalendarLabel {
  param([string]$MachineVersion)
  $match = [regex]::Match($MachineVersion, '^(\d{2})\.(\d{1,2})\.0$')
  if (-not $match.Success -or [int]$match.Groups[1].Value -lt 26) { return $null }
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 99) { return $null }
  return '{0}.{1:00}' -f [int]$match.Groups[1].Value, $sequence
}

function Assert-ExactProductVersion {
  param([string]$Actual, [Parameter(Mandatory = $true)][string]$Expected, [string]$Artifact = 'artifact')
  if ($Actual -notmatch "^$([regex]::Escape($Expected))(?:\.0)?(?:\+[0-9A-Za-z.-]+)?$") {
    throw "$Artifact reports product version '$Actual'; expected exactly $Expected. Rebuild it from the frozen release source."
  }
}

function Get-MsiProductVersion {
  param([Parameter(Mandatory = $true)][string]$LiteralPath)
  $installer = $null; $database = $null; $view = $null; $record = $null
  try {
    $installer = New-Object -ComObject WindowsInstaller.Installer
    $database = $installer.GetType().InvokeMember('OpenDatabase', 'InvokeMethod', $null, $installer, @([IO.Path]::GetFullPath($LiteralPath), 0))
    $view = $database.GetType().InvokeMember('OpenView', 'InvokeMethod', $null, $database, @('SELECT `Value` FROM `Property` WHERE `Property` = ''ProductVersion'''))
    $view.GetType().InvokeMember('Execute', 'InvokeMethod', $null, $view, $null) | Out-Null
    $record = $view.GetType().InvokeMember('Fetch', 'InvokeMethod', $null, $view, $null)
    if ($null -eq $record) { throw "MSI has no ProductVersion: $LiteralPath" }
    return [string]$record.GetType().InvokeMember('StringData', 'GetProperty', $null, $record, 1)
  }
  finally {
    foreach ($value in @($record, $view, $database, $installer)) { if ($null -ne $value -and [Runtime.InteropServices.Marshal]::IsComObject($value)) { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($value) } }
  }
}

function Assert-WindowsReleaseArtifactVersions {
  param([string]$Portable, [string]$Setup, [string]$Msi, [string]$MachineVersion)
  foreach ($path in @($Portable, $Setup)) {
    Assert-ExactProductVersion -Actual ([Diagnostics.FileVersionInfo]::GetVersionInfo([IO.Path]::GetFullPath($path)).ProductVersion) -Expected $MachineVersion -Artifact $path
  }
  Assert-ExactProductVersion -Actual (Get-MsiProductVersion -LiteralPath $Msi) -Expected $MachineVersion -Artifact $Msi
}
