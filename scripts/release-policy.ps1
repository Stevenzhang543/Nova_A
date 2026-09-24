# 共享发布策略：公开版本转换和 Windows 产物版本核验；加载本文件无发布副作用。
# Shared release-label and native artifact checks. Loading this file has no side effects.
# 解析公开日历版本标签并生成对应三段机器版本。
function Get-CalendarReleaseInfo {
  param([Parameter(Mandatory = $true)][string]$Label)
  $match = [regex]::Match($Label, '^(\d{2})\.(\d{2})$')
  if (-not $match.Success) { return $null }
  $year = [int]$match.Groups[1].Value
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 99) { throw "Release sequence must be between 01 and 99: $Label" }
  return [pscustomobject]@{ Year = $year; Sequence = $sequence; MachineVersion = "$year.$sequence.0" }
}

# 从三段机器版本生成规范的两段公开版本标签。
function Get-CanonicalCalendarLabel {
  param([string]$MachineVersion)
  $match = [regex]::Match($MachineVersion, '^(\d{2})\.(\d{1,2})\.0$')
  if (-not $match.Success -or [int]$match.Groups[1].Value -lt 26) { return $null }
  $sequence = [int]$match.Groups[2].Value
  if ($sequence -lt 1 -or $sequence -gt 99) { return $null }
  return '{0}.{1:00}' -f [int]$match.Groups[1].Value, $sequence
}

# 要求产物版本与指定机器版本完全匹配，拒绝相似前缀版本。
function Assert-ExactProductVersion {
  param([string]$Actual, [Parameter(Mandatory = $true)][string]$Expected, [string]$Artifact = 'artifact')
  if ($Actual -notmatch "^$([regex]::Escape($Expected))(?:\.0)?(?:\+[0-9A-Za-z.-]+)?$") {
    throw "$Artifact reports product version '$Actual'; expected exactly $Expected. Rebuild it from the frozen release source."
  }
}

# 只读打开 MSI 数据库，读取 ProductVersion 并释放全部 COM 对象。
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

# 同时核验便携程序、安装程序及 MSI 的产品版本。
function Assert-WindowsReleaseArtifactVersions {
  param([string]$Portable, [string]$Setup, [string]$Msi, [string]$MachineVersion)
  foreach ($path in @($Portable, $Setup)) {
    Assert-ExactProductVersion -Actual ([Diagnostics.FileVersionInfo]::GetVersionInfo([IO.Path]::GetFullPath($path)).ProductVersion) -Expected $MachineVersion -Artifact $path
  }
  Assert-ExactProductVersion -Actual (Get-MsiProductVersion -LiteralPath $Msi) -Expected $MachineVersion -Artifact $Msi
}
