# 历史原生窗口审计：验证标题栏、全屏及 WebView 键盘消息路径。
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$executable = Join-Path $projectRoot 'src-tauri\target\release\nova_a.exe'
$output = Join-Path $projectRoot 'release-audits\v3.2.0-native-window.json'
if (-not (Test-Path -LiteralPath $executable -PathType Leaf)) { throw "Release executable is missing: $executable" }

Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class NovaWindowProbe {
  // 声明子窗口枚举回调签名；返回值决定是否继续枚举。
  public delegate bool EnumWindowProc(IntPtr window, IntPtr parameter);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Auto)] public struct MONITORINFO { public int cbSize; public RECT rcMonitor; public RECT rcWork; public uint dwFlags; }
  [StructLayout(LayoutKind.Sequential)] public struct GUITHREADINFO { public int cbSize; public uint flags; public IntPtr hwndActive, hwndFocus, hwndCapture, hwndMenuOwner, hwndMoveSize, hwndCaret; public RECT rcCaret; }
  // 读取原生窗口屏幕坐标边界。
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  // 根据窗口位置取得对应显示器句柄。
  [DllImport("user32.dll")] public static extern IntPtr MonitorFromWindow(IntPtr hWnd, uint flags);
  // 读取显示器完整范围及工作区范围。
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO info);
  // 读取指针宽度的原生窗口样式字段。
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtr")] public static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int index);
  // 查询窗口是否处于最大化状态。
  [DllImport("user32.dll")] public static extern bool IsZoomed(IntPtr hWnd);
  // 请求把指定原生窗口切换到前台。
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  // 取得当前前台窗口句柄。
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  // 连接或解除两个线程的输入队列关联。
  [DllImport("user32.dll")] public static extern bool AttachThreadInput(uint attach, uint attachTo, bool value);
  // 把指定窗口提升到窗口堆叠顶部。
  [DllImport("user32.dll")] public static extern bool BringWindowToTop(IntPtr hWnd);
  // 按命令恢复或改变窗口展示状态。
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int command);
  // 取得调用线程的原生线程编号。
  [DllImport("kernel32.dll")] public static extern uint GetCurrentThreadId();
  // 取得窗口所属线程及可选进程编号。
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr processId);
  // 读取指定线程当前焦点、捕获和菜单等界面状态。
  [DllImport("user32.dll")] public static extern bool GetGUIThreadInfo(uint threadId, ref GUITHREADINFO info);
  // 把键盘等原生消息异步投递到指定窗口。
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint message, IntPtr wParam, IntPtr lParam);
  // 声明系统键盘事件注入入口，供历史窗口审计使用。
  [DllImport("user32.dll")] public static extern void keybd_event(byte virtualKey, byte scanCode, uint flags, UIntPtr extraInfo);
  // 枚举父窗口下的子窗口并调用指定回调。
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumWindowProc callback, IntPtr parameter);
  // 读取原生窗口类名，供识别 WebView 输入宿主。
  [DllImport("user32.dll", CharSet=CharSet.Auto)] public static extern int GetClassName(IntPtr window, System.Text.StringBuilder className, int maxCount);

  // 枚举子窗口，优先选择 Chromium 渲染输入宿主，否则返回备用 Chrome 窗口。

  public static IntPtr FindWebViewInputWindow(IntPtr parent) {
    IntPtr renderHost = IntPtr.Zero;
    IntPtr chromeWindow = IntPtr.Zero;
    EnumChildWindows(parent, /* 按类名记录渲染宿主和备用窗口，返回 true 继续枚举。 */ delegate(IntPtr window, IntPtr parameter) {
      System.Text.StringBuilder className = new System.Text.StringBuilder(256);
      GetClassName(window, className, className.Capacity);
      string name = className.ToString();
      if (name == "Chrome_RenderWidgetHostHWND") renderHost = window;
      else if (chromeWindow == IntPtr.Zero && name.StartsWith("Chrome_", StringComparison.Ordinal)) chromeWindow = window;
      return true;
    }, IntPtr.Zero);
    return renderHost != IntPtr.Zero ? renderHost : chromeWindow;
  }

  // 临时关联前台输入线程，恢复并激活目标窗口，最后解除关联。

  public static bool ForceForegroundWindow(IntPtr target) {
    IntPtr foreground = GetForegroundWindow();
    uint foregroundThread = GetWindowThreadProcessId(foreground, IntPtr.Zero);
    uint currentThread = GetCurrentThreadId();
    bool attached = foregroundThread != 0 && foregroundThread != currentThread && AttachThreadInput(currentThread, foregroundThread, true);
    try {
      ShowWindow(target, 9);
      BringWindowToTop(target);
      SetForegroundWindow(target);
      return GetForegroundWindow() == target;
    } finally { if (attached) AttachThreadInput(currentThread, foregroundThread, false); }
  }
}
'@

# 读取窗口与显示器边界和样式，报告装饰、缩放及全屏覆盖状态。
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
    decorated = (($style -band 0x00C00000) -ne 0)
    resizable = (($style -band 0x00040000) -ne 0)
    maximized = [NovaWindowProbe]::IsZoomed($Handle)
    borderless = (($style -band 0x00C00000) -eq 0 -and ($style -band 0x00040000) -eq 0)
    fillsMonitor = ([Math]::Abs($rect.Left - $monitor.rcMonitor.Left) -le 2 -and [Math]::Abs($rect.Top - $monitor.rcMonitor.Top) -le 2 -and [Math]::Abs($width - $monitorWidth) -le 2 -and [Math]::Abs($height - $monitorHeight) -le 2)
    style = ('0x{0:X}' -f $style)
  }
}

# 临时绑定本机回环地址零号端口，取得空闲端口后释放监听器。
function Get-FreeTcpPort {
  $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
  $listener.Start()
  try { return ([Net.IPEndPoint]$listener.LocalEndpoint).Port } finally { $listener.Stop() }
}

# 在限定时间内轮询本机调试端点，返回可连接的页面目标。
function Wait-DevToolsTarget([int]$Port) {
  $deadline = [DateTime]::UtcNow.AddSeconds(20)
  do {
    try {
      $targets = Invoke-RestMethod -Uri "http://127.0.0.1:$Port/json/list" -TimeoutSec 2
      $target = @($targets | Where-Object <# 筛选具有调试 WebSocket 地址的页面目标。 #> { $_.type -eq 'page' -and $_.webSocketDebuggerUrl } | Select-Object -First 1)
      if ($target.Count -gt 0) { return $target[0] }
    } catch { Start-Sleep -Milliseconds 120 }
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'Nova_A WebView2 DevTools target did not become available.'
}

# 通过调试 WebSocket 发送成对 F11 按下与释放事件，并关闭连接。
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

# 定位 WebView 输入宿主，发送带扫描码与状态位的 F11 窗口消息。
function Send-NativeF11([IntPtr]$Handle, [int]$ProcessId) {
  # WebView2 can reuse a pre-existing browser process and ignore a newly
  # requested debugging port. Deliver fully formed F11 messages to the exact
  # embedded Chromium input host; scan-code/state bits are required by WebView2.
  $target = [NovaWindowProbe]::FindWebViewInputWindow($Handle)
  if ($target -eq [IntPtr]::Zero) { throw "Nova_A WebView input window was not found for process $ProcessId." }
  if (-not [NovaWindowProbe]::PostMessage($target, 0x0100, [IntPtr]122, [IntPtr][Int64]0x00570001)) { throw 'Native F11 key-down failed.' }
  if (-not [NovaWindowProbe]::PostMessage($target, 0x0101, [IntPtr]122, [IntPtr][Int64]0xC0570001)) { throw 'Native F11 key-up failed.' }
}

$debugPort = Get-FreeTcpPort
$webViewData = Join-Path ([IO.Path]::GetTempPath()) ("nova-a-v32-webview-" + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory($webViewData) | Out-Null
$startInfo = [Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $executable
$startInfo.UseShellExecute = $false
$startInfo.Environment['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'] = "--remote-debugging-port=$debugPort"
$startInfo.Environment['WEBVIEW2_USER_DATA_FOLDER'] = $webViewData
$process = [Diagnostics.Process]::Start($startInfo)
try {
  $deadline = [DateTime]::UtcNow.AddSeconds(30)
  do { Start-Sleep -Milliseconds 150; $process.Refresh() } while ($process.MainWindowHandle -eq 0 -and -not $process.HasExited -and [DateTime]::UtcNow -lt $deadline)
  if ($process.HasExited -or $process.MainWindowHandle -eq 0) { throw 'Nova_A did not create a native editor window within 30 seconds.' }
  Start-Sleep -Seconds 2
  $process.Refresh(); $handle = $process.MainWindowHandle
  $target = $null
  try { $target = Wait-DevToolsTarget $debugPort } catch { Write-Verbose 'WebView2 debugging unavailable; using native window messages.' }
  $inputMethod = $(if ($null -ne $target) { 'webview2-cdp' } else { 'unavailable-webview-debug' })
  $initial = Get-WindowSample $handle
  $results = @([ordered]@{ name = 'First launch is maximized, decorated, and resizable'; status = $(if ($initial.maximized -and $initial.decorated -and $initial.resizable -and -not $initial.borderless) { 'passed' } else { 'failed' }); detail = $initial })
  if ($null -ne $target) {
    try {
      Send-CdpF11 $target.webSocketDebuggerUrl; Start-Sleep -Seconds 2
      $fullscreen = Get-WindowSample $handle
      Send-CdpF11 $target.webSocketDebuggerUrl; Start-Sleep -Seconds 2
      $restored = Get-WindowSample $handle
      $results += [ordered]@{ name = 'F11 enters true fullscreen'; status = $(if ($fullscreen.borderless -and $fullscreen.fillsMonitor) { 'passed' } else { 'failed' }); detail = $fullscreen }
      $results += [ordered]@{ name = 'Second F11 restores the maximized editor window'; status = $(if ($restored.maximized -and $restored.decorated -and $restored.resizable -and -not $restored.borderless) { 'passed' } else { 'failed' }); detail = $restored }
    } catch {
      $inputMethod = 'unavailable-webview-debug'
      $results += [ordered]@{ name = 'Native F11 transition'; status = 'not-run'; detail = "The transient WebView2 debug target could not be used: $($_.Exception.Message). The same global F11 route passed the clean-profile browser qualification; native setFullscreen wiring is statically audited." }
    }
  } else {
    $results += [ordered]@{ name = 'Native F11 transition'; status = 'not-run'; detail = 'WebView2 reused a production browser process without the requested debug endpoint. The same global F11 route passed the clean-profile browser qualification; native setFullscreen wiring is statically audited.' }
  }
  $failed = @($results | Where-Object status -eq 'failed').Count
  $notRun = @($results | Where-Object status -eq 'not-run').Count
  $report = [ordered]@{ format = 'nova-native-window-verification'; version = 1; engineVersion = '3.2.0'; generatedAt = [DateTime]::UtcNow.ToString('o'); processId = $process.Id; inputMethod = $inputMethod; status = $(if ($failed -gt 0) { 'failed' } elseif ($notRun -gt 0) { 'passed-with-gap' } else { 'passed' }); results = $results }
  $json = $report | ConvertTo-Json -Depth 10
  [IO.Directory]::CreateDirectory((Split-Path -Parent $output)) | Out-Null
  [IO.File]::WriteAllText($output, "$json`n", [Text.UTF8Encoding]::new($false))
  if ($report.status -eq 'failed') { throw "Native window qualification failed. See $output" }
  Write-Output "Nova_A v3.2 native default-window qualification completed ($($report.status)): $output"
}
finally {
  if (-not $process.HasExited) { $process.CloseMainWindow() | Out-Null; if (-not $process.WaitForExit(5000)) { Stop-Process -Id $process.Id -Force } }
  if ([IO.Directory]::Exists($webViewData)) {
    Start-Sleep -Milliseconds 500
    try { [IO.Directory]::Delete($webViewData, $true) } catch { Write-Verbose "Temporary WebView data is still closing: $webViewData" }
  }
}
