/** 桌面窗口行为：读取及应用窗口设置，协调启动状态与原生窗口接口。 */
import { reactive } from 'vue'
import { preferencesState } from '../store/preferences'
import { reportRecoverableError } from './faultCenter'

interface SavedWindowState { x: number; y: number; width: number; height: number; monitorName: string; scaleFactor: number; maximized: boolean }
const STORAGE_KEY = 'nova-a-window-state-v1'
const FIRST_LAUNCH_KEY = 'nova-a-window-first-launch-v4.1'
let initialized = false
let unlisteners: Array<() => void> = []

export const editorWindowState = reactive({ native: false, fullscreen: false, maximized: false, monitorRecovered: false, lastWindowedState: null as SavedWindowState | null })

/** 读取并验证窗口几何记录，限制最小尺寸并兼容可选显示器信息。 */ function readState(): SavedWindowState | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SavedWindowState> | null
    if (!value || ![value.x, value.y, value.width, value.height].every(/* 先计算 typeof item === 'number'；仅当其为真值时求右侧 Number.isFinite(item)，返回短路求值结果。 */ item => typeof item === 'number' && Number.isFinite(item))) return null
    return { x: value.x!, y: value.y!, width: Math.max(900, value.width!), height: Math.max(600, value.height!), monitorName: typeof value.monitorName === 'string' ? value.monitorName : '', scaleFactor: typeof value.scaleFactor === 'number' ? value.scaleFactor : 1, maximized: value.maximized === true }
  } catch { return null }
}

/** 尽力保存窗口位置状态并更新当前会话的窗口化基线。 */ function persistState(value: SavedWindowState): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); editorWindowState.lastWindowedState = value } catch { /* Window placement is optional. */ } }

/** 在原生宿主配置普通可缩放窗口，按偏好恢复最大化或可见位置，并监听位置尺寸及缩放变化。 */ export async function initializeEditorWindow(): Promise<void> {
  if (initialized || !('__TAURI_INTERNALS__' in window)) return
  initialized = true; editorWindowState.native = true
  try {
    const { availableMonitors, currentMonitor, getCurrentWindow, LogicalSize, PhysicalPosition, PhysicalSize } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    await appWindow.setMinSize(new LogicalSize(1024, 640))
    editorWindowState.fullscreen = await appWindow.isFullscreen()
    editorWindowState.maximized = await appWindow.isMaximized()
    const saved = readState(); editorWindowState.lastWindowedState = saved
    const firstLaunch = localStorage.getItem(FIRST_LAUNCH_KEY) !== 'complete'
    if (editorWindowState.fullscreen) await appWindow.setFullscreen(false)
    // The editor launches as a normal, decorated, resizable window. When the
    // maximized-launch preference is enabled it deliberately takes precedence
    // over a previously saved windowed size; users can still restore and resize
    // the window normally after startup.
    await appWindow.setDecorations(true)
    if (preferencesState.launchMaximized) {
      await appWindow.maximize()
      editorWindowState.fullscreen = false; editorWindowState.maximized = true
    } else if (saved) {
      const monitors = await availableMonitors()
      const intersects = monitors.some(/** 检查已保存窗口是否至少有可操作区域与当前显示器相交。 */ monitor => {
        const left = monitor.position.x, top = monitor.position.y, right = left + monitor.size.width, bottom = top + monitor.size.height
        return saved.x + Math.min(saved.width, 160) > left && saved.x < right && saved.y + Math.min(saved.height, 80) > top && saved.y < bottom
      })
      if (saved.maximized) { await appWindow.maximize(); editorWindowState.maximized = true }
      else if (intersects) { await appWindow.unmaximize(); await appWindow.setSize(new PhysicalSize(saved.width, saved.height)); await appWindow.setPosition(new PhysicalPosition(saved.x, saved.y)); editorWindowState.maximized = false }
      else { await appWindow.unmaximize(); editorWindowState.monitorRecovered = true; await appWindow.center(); editorWindowState.maximized = false }
      editorWindowState.fullscreen = false
    }
    if (firstLaunch) localStorage.setItem(FIRST_LAUNCH_KEY, 'complete')
    const save = /** 读取原生窗口状态，保留全屏前窗口化基线，记录尺寸位置与显示器缩放信息。 */ async () => {
      const [fullscreen, maximized] = await Promise.all([appWindow.isFullscreen(), appWindow.isMaximized()])
      editorWindowState.fullscreen = fullscreen; editorWindowState.maximized = maximized
      if (fullscreen) return
      if (maximized && editorWindowState.lastWindowedState) { persistState({ ...editorWindowState.lastWindowedState, maximized: true }); return }
      const [position, size, monitor, scaleFactor] = await Promise.all([appWindow.outerPosition(), appWindow.outerSize(), currentMonitor(), appWindow.scaleFactor()])
      persistState({ x: position.x, y: position.y, width: size.width, height: size.height, monitorName: monitor?.name ?? '', scaleFactor, maximized })
    }
    unlisteners.push(await appWindow.onMoved(/** 窗口位置或尺寸变化后异步持久化当前窗口状态。 */ () => { void save() }), await appWindow.onResized(/** 窗口位置或尺寸变化后异步持久化当前窗口状态。 */ () => { void save() }))
    unlisteners.push(await appWindow.onScaleChanged(/** 显示缩放变化后请求下一帧发布浏览器尺寸事件，并异步保存窗口状态。 */ () => { window.requestAnimationFrame(/* 调用 window.dispatchEvent(new Event('resize')) 并返回调用结果。 */ () => window.dispatchEvent(new Event('resize'))); void save() }))
  } catch (error) { reportRecoverableError(error, 'Initialize editor window') }
}

/** 分别使用浏览器或原生全屏 API 切换，原生退出全屏时恢复先前可见窗口布局。 */ export async function toggleEditorFullscreen(): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) {
    try {
      if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen()
      editorWindowState.fullscreen = Boolean(document.fullscreenElement)
    } catch (error) { reportRecoverableError(error, 'Toggle browser fullscreen') }
    return
  }
  try {
    const { getCurrentWindow, PhysicalPosition, PhysicalSize, availableMonitors, currentMonitor } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow(), fullscreen = await appWindow.isFullscreen()
    if (!fullscreen) {
      const [position, size, monitor, scaleFactor] = await Promise.all([appWindow.outerPosition(), appWindow.outerSize(), currentMonitor(), appWindow.scaleFactor()])
      persistState({ x: position.x, y: position.y, width: size.width, height: size.height, monitorName: monitor?.name ?? '', scaleFactor, maximized: await appWindow.isMaximized() })
      await appWindow.setFullscreen(true); editorWindowState.fullscreen = true; return
    }
    await appWindow.setFullscreen(false); editorWindowState.fullscreen = false
    const saved = editorWindowState.lastWindowedState
    if (!saved) { await appWindow.maximize(); editorWindowState.maximized = true; return }
    const monitors = await availableMonitors()
    const valid = monitors.some(/** 检查保存位置的最小可操作范围是否仍落在某个显示器内。 */ monitor => saved.x < monitor.position.x + monitor.size.width && saved.x + 160 > monitor.position.x && saved.y < monitor.position.y + monitor.size.height && saved.y + 80 > monitor.position.y)
    if (saved.maximized) { await appWindow.maximize(); editorWindowState.maximized = true }
    else if (valid) { await appWindow.unmaximize(); await appWindow.setSize(new PhysicalSize(saved.width, saved.height)); await appWindow.setPosition(new PhysicalPosition(saved.x, saved.y)); editorWindowState.maximized = false }
    else { editorWindowState.monitorRecovered = true; await appWindow.center() }
  } catch (error) { reportRecoverableError(error, 'Toggle editor fullscreen') }
}

/** 解除全部原生窗口监听并允许后续重新初始化。 */ export function disposeEditorWindow(): void { unlisteners.forEach(/* 调用 unlisten() 并返回调用结果。 */ unlisten => unlisten()); unlisteners = []; initialized = false }
