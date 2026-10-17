"""Nova_A latency harness (Windows).

Drives a running Nova_A window with OS-injected input (SendInput) and watches a small screen region
through GDI BitBlt reads of the composed desktop. It measures, on one QueryPerformanceCounter clock:

  send -> captured   time from SendInput returning to the first captured desktop frame in which the
                     marker region changed. This is a *capture proxy* for display: it shows the change
                     reached the desktop compositor output that screen capture reads. It is not a
                     measurement of light leaving the panel (no photodiode or camera is used).

It also runs a loopback collector for the app's opt-in latency probe (NOVA_LATENCY_PROBE), so the
app's own records (received / consumed / submitted on the page clock) can be mapped onto the same
QPC clock. The mapping comes from HTTP round trips and its error bound is reported with every mapped
value. Nothing here sends data off the machine.

Usage examples (run from a console that is the foreground window, no elevation needed):
  python nova_latency_harness.py key   --title-pid <pid> --out <dir> --trials 100 --key SPACE
  python nova_latency_harness.py drag  --title-pid <pid> --out <dir> --trials 100 --dx 60
  python nova_latency_harness.py frames --title-pid <pid> --out <dir> --seconds 60
"""
from __future__ import annotations

import argparse
import ctypes
import ctypes.wintypes as wt
import json
import os
import random
import statistics
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import numpy as np

user32 = ctypes.WinDLL('user32', use_last_error=True)
gdi32 = ctypes.WinDLL('gdi32', use_last_error=True)
kernel32 = ctypes.WinDLL('kernel32', use_last_error=True)
try:
    user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))  # per-monitor v2: physical pixels
except Exception:
    pass

def now_ns() -> int:
    return time.perf_counter_ns()  # QueryPerformanceCounter on Windows

# ---------------------------------------------------------------- windows
EnumWindowsProc = ctypes.WINFUNCTYPE(wt.BOOL, wt.HWND, wt.LPARAM)

def windows_of(pid: int) -> list[tuple[int, str, tuple[int, int, int, int]]]:
    found = []
    def callback(hwnd, _):
        owner = wt.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(owner))
        if owner.value == pid and user32.IsWindowVisible(hwnd):
            length = user32.GetWindowTextLengthW(hwnd)
            buffer = ctypes.create_unicode_buffer(length + 1)
            user32.GetWindowTextW(hwnd, buffer, length + 1)
            rect = wt.RECT()
            user32.GetClientRect(hwnd, ctypes.byref(rect))
            origin = wt.POINT(0, 0)
            user32.ClientToScreen(hwnd, ctypes.byref(origin))
            found.append((hwnd, buffer.value, (origin.x, origin.y, rect.right, rect.bottom)))
        return True
    user32.EnumWindows(EnumWindowsProc(callback), 0)
    return sorted(found, key=lambda item: -(item[2][2] * item[2][3]))

def pid_of(image: str) -> int:
    """Newest process with this image name that owns a visible window."""
    import csv, subprocess
    rows = subprocess.run(['tasklist', '/FI', f'IMAGENAME eq {image}', '/FO', 'CSV', '/NH'], capture_output=True, text=True).stdout
    pids = [int(row[1]) for row in csv.reader(rows.splitlines()) if len(row) > 1 and row[0].lower() == image.lower()]
    for pid in reversed(pids):
        if windows_of(pid):
            return pid
    raise SystemExit(f'No running {image} with a visible window')

def focus(hwnd: int) -> None:
    if user32.IsIconic(hwnd):
        user32.ShowWindow(hwnd, 9)  # restore only a minimized window; keep a maximized one maximized
    user32.SetForegroundWindow(hwnd)
    time.sleep(0.3)

# ---------------------------------------------------------------- capture
class BITMAPINFOHEADER(ctypes.Structure):
    _fields_ = [('biSize', wt.DWORD), ('biWidth', wt.LONG), ('biHeight', wt.LONG), ('biPlanes', wt.WORD), ('biBitCount', wt.WORD),
                ('biCompression', wt.DWORD), ('biSizeImage', wt.DWORD), ('biXPelsPerMeter', wt.LONG), ('biYPelsPerMeter', wt.LONG),
                ('biClrUsed', wt.DWORD), ('biClrImportant', wt.DWORD)]

gdi32.CreateDIBSection.restype = wt.HBITMAP
gdi32.CreateDIBSection.argtypes = [wt.HDC, ctypes.c_void_p, wt.UINT, ctypes.POINTER(ctypes.c_void_p), wt.HANDLE, wt.DWORD]
user32.GetDC.restype = wt.HDC
gdi32.CreateCompatibleDC.restype = wt.HDC
gdi32.SelectObject.restype = wt.HGDIOBJ
gdi32.SelectObject.argtypes = [wt.HDC, wt.HGDIOBJ]
# Handles are pointer-sized; without explicit argtypes ctypes would truncate them to a C int.
user32.GetDC.argtypes = [wt.HWND]
user32.ReleaseDC.argtypes = [wt.HWND, wt.HDC]
gdi32.CreateCompatibleDC.argtypes = [wt.HDC]
gdi32.DeleteDC.argtypes = [wt.HDC]
gdi32.DeleteObject.argtypes = [wt.HGDIOBJ]
user32.ShowWindow.argtypes = [wt.HWND, ctypes.c_int]
user32.SetForegroundWindow.argtypes = [wt.HWND]
user32.GetWindowThreadProcessId.argtypes = [wt.HWND, ctypes.POINTER(wt.DWORD)]
user32.IsWindowVisible.argtypes = [wt.HWND]
user32.IsIconic.argtypes = [wt.HWND]
user32.GetWindowTextLengthW.argtypes = [wt.HWND]
user32.GetWindowTextW.argtypes = [wt.HWND, wt.LPWSTR, ctypes.c_int]
user32.GetClientRect.argtypes = [wt.HWND, ctypes.POINTER(wt.RECT)]
user32.ClientToScreen.argtypes = [wt.HWND, ctypes.POINTER(wt.POINT)]
gdi32.BitBlt.argtypes = [wt.HDC, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int, wt.HDC, ctypes.c_int, ctypes.c_int, wt.DWORD]

class Grabber:
    """Reads a fixed screen rectangle of the composed desktop into a reusable BGRA buffer."""
    def __init__(self, x: int, y: int, w: int, h: int):
        self.x, self.y, self.w, self.h = x, y, w, h
        self.screen = user32.GetDC(None)
        self.memory = gdi32.CreateCompatibleDC(self.screen)
        header = BITMAPINFOHEADER(ctypes.sizeof(BITMAPINFOHEADER), w, -h, 1, 32, 0, 0, 0, 0, 0, 0)
        bits = ctypes.c_void_p()
        self.bitmap = gdi32.CreateDIBSection(self.screen, ctypes.byref(header), 0, ctypes.byref(bits), None, 0)
        gdi32.SelectObject(self.memory, self.bitmap)
        self.pixels = np.ctypeslib.as_array((ctypes.c_uint8 * (w * h * 4)).from_address(bits.value)).reshape(h, w, 4)

    def grab(self) -> np.ndarray:
        gdi32.BitBlt(self.memory, 0, 0, self.w, self.h, self.screen, self.x, self.y, 0x00CC0020 | 0x40000000)  # SRCCOPY|CAPTUREBLT
        return self.pixels

    def level(self) -> float:
        return float(self.grab()[:, :, :3].mean())

    def close(self) -> None:
        gdi32.DeleteObject(self.bitmap); gdi32.DeleteDC(self.memory); user32.ReleaseDC(None, self.screen)

# ---------------------------------------------------------------- input
class KEYBDINPUT(ctypes.Structure):
    _fields_ = [('wVk', wt.WORD), ('wScan', wt.WORD), ('dwFlags', wt.DWORD), ('time', wt.DWORD), ('dwExtraInfo', ctypes.c_size_t)]
class MOUSEINPUT(ctypes.Structure):
    _fields_ = [('dx', wt.LONG), ('dy', wt.LONG), ('mouseData', wt.DWORD), ('dwFlags', wt.DWORD), ('time', wt.DWORD), ('dwExtraInfo', ctypes.c_size_t)]
class _INPUTUNION(ctypes.Union):
    _fields_ = [('ki', KEYBDINPUT), ('mi', MOUSEINPUT), ('padding', ctypes.c_byte * 32)]
class INPUT(ctypes.Structure):
    _fields_ = [('type', wt.DWORD), ('u', _INPUTUNION)]

SCAN = {'SPACE': 0x39, 'D': 0x20, 'A': 0x1E, 'W': 0x11, 'S': 0x1F, 'J': 0x24}

SEND_RETURN_NS: list[int] = []

def send(*inputs: INPUT) -> int:
    """Injects the input and returns the QPC time taken immediately BEFORE SendInput. Windows may deliver an
    injected mouse move to the target thread before SendInput returns, so the call's start is the send instant;
    the call's own duration is kept in SEND_RETURN_NS for the log."""
    array = (INPUT * len(inputs))(*inputs)
    started = now_ns()
    user32.SendInput(len(inputs), array, ctypes.sizeof(INPUT))
    SEND_RETURN_NS.append(now_ns() - started)
    return started

def key(name: str, down: bool) -> INPUT:
    item = INPUT(); item.type = 1
    item.u.ki = KEYBDINPUT(0, SCAN[name], 0x0008 | (0 if down else 0x0002), 0, 0)  # KEYEVENTF_SCANCODE (| KEYUP)
    return item

def mouse_to(x: int, y: int, flags: int = 0) -> INPUT:
    left, top = user32.GetSystemMetrics(76), user32.GetSystemMetrics(77)
    width, height = user32.GetSystemMetrics(78), user32.GetSystemMetrics(79)
    item = INPUT(); item.type = 0
    item.u.mi = MOUSEINPUT(int((x - left) * 65535 / max(1, width - 1)), int((y - top) * 65535 / max(1, height - 1)), 0, 0x0001 | 0x8000 | 0x4000 | flags, 0, 0)
    return item

LEFT_DOWN, LEFT_UP = 0x0002, 0x0004

# ---------------------------------------------------------------- collector
class Collector:
    """Loopback endpoint for the app's latency probe; also answers clock-sync round trips."""
    def __init__(self, port: int, out_path: str):
        self.lock = threading.Lock()
        self.out = open(out_path, 'a', encoding='utf-8')
        collector = self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *args): pass
            def cors(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Headers', 'content-type')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            def do_OPTIONS(self):
                self.send_response(204); self.cors(); self.end_headers()
            def do_GET(self):
                if self.path.startswith('/sync'):
                    body = json.dumps({'collectorMs': now_ns() / 1e6}).encode()
                    self.send_response(200); self.cors(); self.send_header('content-type', 'application/json'); self.send_header('content-length', str(len(body))); self.end_headers(); self.wfile.write(body)
                else:
                    self.send_response(404); self.cors(); self.end_headers()
            def do_POST(self):
                received = now_ns() / 1e6
                length = int(self.headers.get('content-length', '0') or 0)
                data = self.rfile.read(min(length, 64 * 1024 * 1024))
                with collector.lock:
                    collector.out.write(json.dumps({'collectorReceivedMs': received, 'payload': json.loads(data or b'{}')}) + '\n'); collector.out.flush()
                self.send_response(204); self.cors(); self.end_headers()
        self.server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def close(self):
        self.server.shutdown(); self.out.close()

# ---------------------------------------------------------------- measurement helpers
def wait_level(grabber: Grabber, predicate, timeout_ms: float, record_polls: list | None = None) -> tuple[int | None, int]:
    """Polls until predicate(level) holds. Returns (QPC ns of the first matching capture, polls)."""
    deadline = now_ns() + int(timeout_ms * 1e6)
    polls, previous = 0, None
    while True:
        started = now_ns()
        level = grabber.level()
        finished = now_ns()
        polls += 1
        if record_polls is not None and previous is not None:
            record_polls.append((finished - previous) / 1e6)
        previous = finished
        if predicate(level):
            return started, polls  # capture began at `started`; the frame read was composed no later than this
        if finished > deadline:
            return None, polls

def describe(values: list[float]) -> dict:
    data = sorted(v for v in values if v is not None)
    if not data:
        return {'n': 0}
    at = lambda q: data[min(len(data) - 1, int(round((len(data) - 1) * q)))]
    out = {'n': len(data), 'mean': statistics.fmean(data), 'p50': at(.5), 'p95': at(.95), 'min': data[0], 'max': data[-1]}
    if len(data) >= 200:
        out['p99'] = at(.99)
    return out

def calibrate_region(window_rect, press, release, settle_ms=400, roi=12):
    """Captures the client area with the marker off and on and picks the most changed ROI."""
    x, y, w, h = window_rect
    full = Grabber(x, y, w, h)
    release(); time.sleep(settle_ms / 1000)
    off = full.grab()[:, :, :3].astype(np.int16).copy()
    press(); time.sleep(settle_ms / 1000)
    on = full.grab()[:, :, :3].astype(np.int16).copy()
    release(); time.sleep(settle_ms / 1000)
    full.close()
    diff = np.abs(on - off).sum(axis=2)
    if diff.max() < 60:
        raise SystemExit('Calibration failed: the marker did not change the window. Is the test scene running and focused?')
    # Choose the ROI whose every pixel changed strongly (inside the marker, away from edges).
    kernel = np.ones((roi, roi))
    from numpy.lib.stride_tricks import sliding_window_view
    windows = sliding_window_view(diff > 120, (roi, roi)).all(axis=(2, 3))
    candidates = np.argwhere(windows)
    if not len(candidates):
        raise SystemExit('Calibration failed: no region changed uniformly.')
    cy, cx = candidates[len(candidates) // 2]
    return x + int(cx), y + int(cy), roi, roi, float(off[cy:cy + roi, cx:cx + roi].mean()), float(on[cy:cy + roi, cx:cx + roi].mean())

# ---------------------------------------------------------------- tests
def run_key(args, hwnd, rect, log):
    name = args.key.upper()
    press = lambda: send(key(name, True))
    release = lambda: send(key(name, False))
    focus(hwnd)
    if args.roi:
        # A fixed region inside the marker (physical pixels); levels are still measured with the key up and down.
        gx, gy, gw, gh = args.roi[0] - 6, args.roi[1] - 6, 12, 12
        probe = Grabber(gx, gy, gw, gh)
        release(); time.sleep(0.4); off_level = probe.level()
        press(); time.sleep(0.4); on_level = probe.level()
        release(); time.sleep(0.4); probe.close()
        if abs(on_level - off_level) < 40:
            raise SystemExit(f'ROI calibration failed: level {off_level:.0f} -> {on_level:.0f}; is the marker at --roi and the scene playing?')
    else:
        gx, gy, gw, gh, off_level, on_level = calibrate_region(rect, press, release)
    log['calibration'] = {'roi': [gx, gy, gw, gh], 'offLevel': off_level, 'onLevel': on_level}
    middle = (off_level + on_level) / 2
    is_on = (lambda v: v > middle) if on_level > off_level else (lambda v: v < middle)
    is_off = lambda v: not is_on(v)
    grabber = Grabber(gx, gy, gw, gh)
    trials, intervals = [], []
    for index in range(args.trials + args.warmup):
        wait_level(grabber, is_off, 1000)
        time.sleep(random.uniform(0.06, 0.14))
        sent = press()
        detected, polls = wait_level(grabber, is_on, 1000, intervals)
        time.sleep(random.uniform(0.04, 0.08))
        sent_up = release()
        detected_up, polls_up = wait_level(grabber, is_off, 1000, intervals)
        if index >= args.warmup:
            trials.append({'trial': index - args.warmup, 'edge': 'down', 'sentNs': sent, 'capturedNs': detected, 'polls': polls,
                           'sendToCapturedMs': None if detected is None else (detected - sent) / 1e6})
            trials.append({'trial': index - args.warmup, 'edge': 'up', 'sentNs': sent_up, 'capturedNs': detected_up, 'polls': polls_up,
                           'sendToCapturedMs': None if detected_up is None else (detected_up - sent_up) / 1e6})
    grabber.close()
    return trials, intervals

def run_drag(args, hwnd, rect, log):
    """Drags an editor object with the left button held. --at is the object's centre in physical screen pixels;
    the ROI sits at centre + dx, which the object covers only after it has moved right by dx."""
    focus(hwnd)
    start_x, start_y = args.at
    roi = 10
    send(mouse_to(start_x, start_y)); time.sleep(0.15)
    send(mouse_to(start_x, start_y, LEFT_DOWN)); time.sleep(0.15)
    send(mouse_to(start_x + 8, start_y)); time.sleep(0.3)   # passes the 4 px drag threshold
    send(mouse_to(start_x, start_y)); time.sleep(0.4)
    grabber = Grabber(start_x + args.dx - roi // 2, start_y - roi // 2, roi, roi)
    trials, intervals = [], []
    try:
        off_level = grabber.level()
        send(mouse_to(start_x + args.dx, start_y)); time.sleep(0.4)
        on_level = grabber.level()
        send(mouse_to(start_x, start_y)); time.sleep(0.4)
        if abs(on_level - off_level) < 20:
            raise SystemExit(f'Drag calibration failed: ROI level {off_level:.0f} -> {on_level:.0f}; is the object at --at and selectable?')
        middle = (off_level + on_level) / 2
        is_on = (lambda v: v > middle) if on_level > off_level else (lambda v: v < middle)
        is_off = lambda v: not is_on(v)
        log['calibration'] = {'at': [start_x, start_y], 'dx': args.dx, 'roi': [start_x + args.dx - roi // 2, start_y - roi // 2, roi, roi], 'offLevel': off_level, 'onLevel': on_level}
        for index in range(args.trials + args.warmup):
            wait_level(grabber, is_off, 1000)
            time.sleep(random.uniform(0.06, 0.14))
            sent = send(mouse_to(start_x + args.dx, start_y))
            detected, polls = wait_level(grabber, is_on, 1000, intervals)
            time.sleep(random.uniform(0.04, 0.08))
            sent_back = send(mouse_to(start_x, start_y))
            detected_back, polls_back = wait_level(grabber, is_off, 1000, intervals)
            if index >= args.warmup:
                trials.append({'trial': index - args.warmup, 'edge': 'move-right', 'sentNs': sent, 'capturedNs': detected, 'polls': polls,
                               'sendToCapturedMs': None if detected is None else (detected - sent) / 1e6})
                trials.append({'trial': index - args.warmup, 'edge': 'move-back', 'sentNs': sent_back, 'capturedNs': detected_back, 'polls': polls_back,
                               'sendToCapturedMs': None if detected_back is None else (detected_back - sent_back) / 1e6})
    finally:
        send(mouse_to(start_x, start_y, LEFT_UP))
        grabber.close()
    return trials, intervals

def run_frames(args, hwnd, rect, log):
    """Steady play for args.seconds with periodic real input; frame statistics come from the probe/PresentMon."""
    focus(hwnd)
    started = now_ns(); events = []
    end = started + int(args.seconds * 1e9)
    toggle = False
    while now_ns() < end:
        toggle = not toggle
        events.append({'sentNs': send(key('D' if toggle else 'A', True)), 'key': 'D' if toggle else 'A', 'down': True})
        time.sleep(0.9)
        events.append({'sentNs': send(key('D' if toggle else 'A', False)), 'key': 'D' if toggle else 'A', 'down': False})
        events.append({'sentNs': send(key('SPACE', True)), 'key': 'SPACE', 'down': True}); time.sleep(0.05)
        events.append({'sentNs': send(key('SPACE', False)), 'key': 'SPACE', 'down': False}); time.sleep(0.05)
    log['window'] = {'startedNs': started, 'endedNs': now_ns()}
    return events, []

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['key', 'drag', 'frames'])
    parser.add_argument('--pid', type=int, help='process id of the Nova_A window to drive')
    parser.add_argument('--image', help='or: executable name of the Nova_A window to drive')
    parser.add_argument('--out', required=True)
    parser.add_argument('--label', default='run')
    parser.add_argument('--trials', type=int, default=100)
    parser.add_argument('--warmup', type=int, default=5)
    parser.add_argument('--key', default='SPACE')
    parser.add_argument('--dx', type=int, default=60)
    parser.add_argument('--at', type=int, nargs=2, help='drag: object centre in physical screen pixels')
    parser.add_argument('--roi', type=int, nargs=2, help='key: a point inside the marker in physical screen pixels (skips the automatic search)')
    parser.add_argument('--seconds', type=float, default=60)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    os.makedirs(args.out, exist_ok=True)
    stem = os.path.join(args.out, f'{args.label}-{args.mode}')
    collector = Collector(args.port, stem + '-probe.jsonl')
    if not args.pid:
        args.pid = pid_of(args.image)
    windows = windows_of(args.pid)
    if not windows:
        raise SystemExit(f'No visible window for pid {args.pid}')
    hwnd, title, rect = windows[0]
    log = {'mode': args.mode, 'label': args.label, 'pid': args.pid, 'title': title, 'clientRect': rect, 'startedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'),
           'qpcFrequency': None, 'method': 'SendInput (OS-injected) -> GDI BitBlt capture of the composed desktop, QPC clock'}
    frequency = ctypes.c_int64(); kernel32.QueryPerformanceFrequency(ctypes.byref(frequency)); log['qpcFrequency'] = frequency.value
    time.sleep(1.5)  # let the app's probe complete its clock sync against the collector
    runner = {'key': run_key, 'drag': run_drag, 'frames': run_frames}[args.mode]
    trials, intervals = runner(args, hwnd, rect, log)
    time.sleep(2.5)  # final probe flush
    collector.close()
    log['capturePollIntervalMs'] = describe(intervals)
    log['sendInputCallMs'] = describe([value / 1e6 for value in SEND_RETURN_NS])
    log['sendTimestamp'] = 'QPC immediately before SendInput'
    by_edge = {}
    for trial in trials:
        if 'sendToCapturedMs' in trial:
            by_edge.setdefault(trial['edge'], []).append(trial['sendToCapturedMs'])
    log['sendToCapturedMs'] = {edge: describe(values) for edge, values in by_edge.items()}
    log['timeouts'] = sum(1 for trial in trials if trial.get('sendToCapturedMs', 0) is None)
    with open(stem + '-trials.json', 'w', encoding='utf-8') as handle:
        json.dump({'log': log, 'trials': trials}, handle, indent=1)
    print(json.dumps(log, indent=1))

if __name__ == '__main__':
    main()
