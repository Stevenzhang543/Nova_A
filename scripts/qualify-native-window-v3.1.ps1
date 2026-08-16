[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$executable = Join-Path $projectRoot 'src-tauri\target\release\nova_a.exe'
$output = Join-Path $projectRoot 'release-audits\v3.1.0-native-window.json'
if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw "Release executable is missing: $executable" }

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NovaWindowProbe {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct GUITHREADINFO { public int cbSize; public uint flags; public IntPtr hwndActive, hwndFocus, hwndCapture, hwndMenuOwner, hwndMoveSize, hwndCaret; public RECT rcCaret; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint flags);
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO info);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtr")] public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);
  [DllImport("user32.dll")] public static extern bool GetGUIThreadInfo(uint threadId, ref GUITHREADINFO info);
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  [DllImport("user32.dll")] public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, UIntPtr extraInfo);
}
'@

function Get-WindowSample([IntPtr]$Handle) {
  $rect = New-Object NovaWindowProbe+RECT
  if (-not [NovaWindowProbe]::GetWindowRect($Handle, [ref]$rect)) { throw 'GetWindowRect failed.' }
  $monitorHandle = [NovaWindowProbe]::MonitorFromWindow($Handle, 2)
  $monitor = New-Object NovaWindowProbe+MONITORINFO
  $monitor.cbSize = [Runtime.InteropServices.Marshal]::SizeOf($monitor)
  if (-not [NovaWindowProbe]::GetMonitorInfo($monitorHandle, [ref]$monitor)) { throw 'GetMonitorInfo failed.' }
  $style = [NovaWindowProbe]::GetWindowLongPtr($Handle, -16).ToInt64()
  $width = $rect.Right - $rect.Left; $height = $rect.Bottom - $rect.Top
  $monitorWidth = $monitor.rcMonitor.Right - $monitor.rcMonitor.Left; $monitorHeight = $monitor.rcMonitor.Bottom - $monitor.rcMonitor.Top
  [ordered]@{
    rect = [ordered]@{ x = $rect.Left; y = $rect.Top; width = $width; height = $height }
    monitor = [ordered]@{ x = $monitor.rcMonitor.Left; y = $monitor.rcMonitor.Top; width = $monitorWidth; height = $monitorHeight }
    borderless = (($style -band 0x00C00000) -eq 0 -and ($style -band 0x00040000) -eq 0)
    fillsMonitor = ([Math]::Abs($rect.Left - $monitor.rcMonitor.Left) -le 2 -and [Math]::Abs($rect.Top - $monitor.rcMonitor.Top) -le 2 -and [Math]::Abs($width - $monitorWidth) -le 2 -and [Math]::Abs($height - $monitorHeight) -le 2)
    style = ('0x{0:X}' -f $style)
  }
}

function Get-FreeTcpPort {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try { return ([Net.IPEndPoint]$listener.LocalEndpoint).Port } finally { $listener.Stop() }
}

function Wait-DevToolsTarget([int]$Port) {
  $deadline = [DateTime]::UtcNow.AddSeconds(20)
  do {
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2
      $target = @($targets | Where-Object { $_.type -eq 'page' -and $_.webSocketDebuggerUrl } | Select-Object -First 1)
      if ($target.Count -gt 0) { return $target[0] }
    } catch { Start-Sleep -Milliseconds 120 }
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'Nova_A WebView2 DevTools target did not become available.'
}

function Send-CdpF11([string]$WebSocketUrl) {
  $socket = [Net.WebSockets.ClientWebSocket]::new()
  try {
    [void]$socket.ConnectAsync([Uri]$WebSocketUrl, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    $messages = @(
      '{"id":1,"method":"Input.dispatchKeyEvent","params":{"type":"keyDown","key":"F11","code":"F11","windowsVirtualKeyCode":122,"nativeVirtualKeyCode":122}}',
      '{"id":2,"method":"Input.dispatchKeyEvent","params":{"type":"keyUp","key":"F11","code":"F11","windowsVirtualKeyCode":122,"nativeVirtualKeyCode":122}}'
    )
    foreach ($json in $messages) {
      $bytes = [Text.Encoding]::UTF8.GetBytes($json)
      $segment = [ArraySegment[byte]]::new($bytes)
      [void]$socket.SendAsync($segment, [Net.WebSockets.WebSocketMessageType]::Text, $true, [Threading.CancellationToken]::None).GetAwaiter().GetResult()
    }
  } finally { $socket.Dispose() }
}

$debugPort = Get-FreeTcpPort
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $executable
$startInfo.UseShellExecute = $false
$startInfo.Environment['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = "--remote-debugging-port=$debugPort"
$process = [Diagnostics.Process]::Start($startInfo)
try {
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  do { Start-Sleep -Milliseconds 150; $process.Refresh() } while ($process.MainWindowHandle -eq 0 -and -not $process.HasExited -and [DateTime]::UtcNow -lt $deadline)
  if ($process.HasExited -or $process.MainWindowHandle -eq 0) { throw 'Nova_A did not create a native editor window within 30 seconds.' }
  Start-Sleep -Seconds 2
  $process.Refresh(); $handle = $process.MainWindowHandle
  $target = Wait-DevToolsTarget $debugPort
  $initial = Get-WindowSample $handle
  Send-CdpF11 $target.webSocketDebuggerUrl; Start-Sleep -Seconds 2
  $windowed = Get-WindowSample $handle
  Send-CdpF11 $target.webSocketDebuggerUrl; Start-Sleep -Seconds 2
  $restored = Get-WindowSample $handle
  $results = @(
    [ordered]@{ name = 'First launch is borderless fullscreen'; status = $(if ($initial.borderless -and $initial.fillsMonitor) { 'passed' } else { 'failed' }); detail = $initial },
    [ordered]@{ name = 'F11 restores a valid windowed state'; status = $(if (-not $windowed.fillsMonitor -and $windowed.rect.width -ge 900 -and $windowed.rect.height -ge 600) { 'passed' } else { 'failed' }); detail = $windowed },
    [ordered]@{ name = 'Second F11 returns to fullscreen'; status = $(if ($restored.fillsMonitor) { 'passed' } else { 'failed' }); detail = $restored }
  )
  $report = [ordered]@{ format = 'nova-native-window-verification'; version = 1; engineVersion = '3.1.0'; generatedAt = [DateTime]::UtcNow.ToString('o'); processId = $process.Id; status = $(if (@($results | Where-Object status -ne 'passed').Count -eq 0) { 'passed' } else { 'failed' }); results = $results }
  $json = $report | ConvertTo-Json -Depth 10
  [IO.Directory]::CreateDirectory((Split-Path -Parent $output)) | Out-Null
  [IO.File]::WriteAllText($output, "$json`n", [Text.UTF8Encoding]::new($false))
  if ($report.status -ne 'passed') { throw "Native window qualification failed. See $output" }
  Write-Output "Nova_A v3.1 native window qualification passed: $output"
}
finally {
  if (-not $process.HasExited) { $process.CloseMainWindow() | Out-Null; if (-not $process.WaitForExit(5000)) { Stop-Process -Id $process.Id -Force } }
}
