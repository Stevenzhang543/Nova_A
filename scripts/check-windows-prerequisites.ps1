# Windows 启动前只读检查：无需启动 WebView、不下载或安装依赖，输出可保存的 JSON 诊断。
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$issues = @()
$runtimeVersions = @()
$platform = [Environment]::OSVersion.Platform.ToString()
if ($platform -ne 'Win32NT') {
    [pscustomobject]@{ status = 'unsupported-host'; platform = $platform; issues = @('Run this read-only preflight on Windows.') } | ConvertTo-Json -Depth 4
    exit 2
}
# 读取系统登记的真实构建号，避免兼容性清单影响 OSVersion。
$system = Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$build = 0
[void][int]::TryParse([string]$system.CurrentBuildNumber, [ref]$build)
if ($build -lt 17763) { $issues += 'Historical Nova_A binary floor is Windows 10 build 17763 (1809). This machine is below that floor. Use a maintained OS; lowering metadata is not a compatibility fix.' }
$architecture = $env:PROCESSOR_ARCHITEW6432
if (-not $architecture) { $architecture = $env:PROCESSOR_ARCHITECTURE }
if ($architecture -ne 'AMD64') { $issues += 'The locally qualified Windows release is x86-64. x86 and ARM64/emulation are not qualified by this preflight.' }
# 同时检查每用户和两种机器注册视图；仅判断 Evergreen 登记，不执行运行时程序。
$roots = @('HKCU:\Software\Microsoft\EdgeUpdate\Clients', 'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients', 'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients')
foreach ($root in $roots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    foreach ($client in Get-ChildItem -LiteralPath $root) {
        $record = Get-ItemProperty -LiteralPath $client.PSPath
        if ([string]$record.name -like '*WebView2*' -and [string]$record.pv -match '^\d+\.\d+\.\d+\.\d+$' -and [string]$record.pv -ne '0.0.0.0') { $runtimeVersions += [string]$record.pv }
    }
}
$runtimeVersions = @($runtimeVersions | Sort-Object -Unique)
if ($runtimeVersions.Count -eq 0) { $issues += 'No Evergreen WebView2 Runtime registration was found. Install Microsoft Evergreen WebView2 Runtime (x64), then retry. An installed Edge browser alone is not evidence of WebView2 Runtime. Fixed-version deployment is not inspected by this script.' }
[pscustomobject]@{
    status = $(if ($issues.Count) { 'attention-required' } else { 'prerequisites-detected' })
    windowsBuild = $build
    architecture = $architecture
    webView2Versions = $runtimeVersions
    issues = $issues
    action = 'https://developer.microsoft.com/microsoft-edge/webview2/'
    boundaries = @('Read-only registration check; it does not launch a player or prove driver, GPU, audio or clean-machine compatibility.', 'Use a maintained Windows release and current Evergreen Runtime. Oldest-supported-machine behavior remains externally unverified.', 'No downloads, installs, environment changes or registry writes are performed.')
} | ConvertTo-Json -Depth 5
if ($issues.Count) { exit 2 }
