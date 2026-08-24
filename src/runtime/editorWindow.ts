import { reactive } from 'vue'
import { preferencesState } from '../store/preferences'
import { reportRecoverableError } from './faultCenter'

interface SavedWindowState { x: number; y: number; width: number; height: number; monitorName: string; scaleFactor: number; maximized: boolean }
const STORAGE_KEY = 'nova-a-window-state-v1'
const FIRST_LAUNCH_KEY = 'nova-a-window-first-launch-v4.1'
let initialized = false
let unlisteners: Array<() => void> = []

export const editorWindowState = reactive({ native: false, fullscreen: false, maximized: false, monitorRecovered: false, lastWindowedState: null as SavedWindowState | null })

function readState(): SavedWindowState | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<SavedWindowState> | null
    if (!value || ![value.x, value.y, value.width, value.height].every(item => typeof item === 'number' && Number.isFinite(item))) return null
    return { x: value.x!, y: value.y!, width: Math.max(900, value.width!), height: Math.max(600, value.height!), monitorName: typeof value.monitorName === 'string' ? value.monitorName : '', scaleFactor: typeof value.scaleFactor === 'number' ? value.scaleFactor : 1, maximized: value.maximized === true }
  } catch { return null }
}

function persistState(value: SavedWindowState): void { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); editorWindowState.lastWindowedState = value } catch { /* Window placement is optional. */ } }

export async function initializeEditorWindow(): Promise<void> {
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
    if (firstLaunch) {
      await appWindow.setDecorations(false)
      await appWindow.maximize()
      localStorage.setItem(FIRST_LAUNCH_KEY, 'complete')
      editorWindowState.fullscreen = false; editorWindowState.maximized = true
    } else if (saved) {
      await appWindow.setDecorations(true)
      const monitors = await availableMonitors()
      const intersects = monitors.some(monitor => {
        const left = monitor.position.x, top = monitor.position.y, right = left + monitor.size.width, bottom = top + monitor.size.height
        return saved.x + Math.min(saved.width, 160) > left && saved.x < right && saved.y + Math.min(saved.height, 80) > top && saved.y < bottom
      })
      if (saved.maximized) { await appWindow.maximize(); editorWindowState.maximized = true }
      else if (intersects) { await appWindow.unmaximize(); await appWindow.setSize(new PhysicalSize(saved.width, saved.height)); await appWindow.setPosition(new PhysicalPosition(saved.x, saved.y)); editorWindowState.maximized = false }
      else { await appWindow.unmaximize(); editorWindowState.monitorRecovered = true; await appWindow.center(); editorWindowState.maximized = false }
      editorWindowState.fullscreen = false
    } else if (preferencesState.launchMaximized) {
      await appWindow.setDecorations(true)
      await appWindow.maximize(); editorWindowState.fullscreen = false; editorWindowState.maximized = true
    }
    const save = async () => {
      const [fullscreen, maximized] = await Promise.all([appWindow.isFullscreen(), appWindow.isMaximized()])
      editorWindowState.fullscreen = fullscreen; editorWindowState.maximized = maximized
      if (fullscreen) return
      if (maximized && editorWindowState.lastWindowedState) { persistState({ ...editorWindowState.lastWindowedState, maximized: true }); return }
      const [position, size, monitor, scaleFactor] = await Promise.all([appWindow.outerPosition(), appWindow.outerSize(), currentMonitor(), appWindow.scaleFactor()])
      persistState({ x: position.x, y: position.y, width: size.width, height: size.height, monitorName: monitor?.name ?? '', scaleFactor, maximized })
    }
    unlisteners.push(await appWindow.onMoved(() => { void save() }), await appWindow.onResized(() => { void save() }))
    unlisteners.push(await appWindow.onScaleChanged(() => { window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))); void save() }))
  } catch (error) { reportRecoverableError(error, 'Initialize editor window') }
}

export async function toggleEditorFullscreen(): Promise<void> {
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
    const valid = monitors.some(monitor => saved.x < monitor.position.x + monitor.size.width && saved.x + 160 > monitor.position.x && saved.y < monitor.position.y + monitor.size.height && saved.y + 80 > monitor.position.y)
    if (saved.maximized) { await appWindow.maximize(); editorWindowState.maximized = true }
    else if (valid) { await appWindow.unmaximize(); await appWindow.setSize(new PhysicalSize(saved.width, saved.height)); await appWindow.setPosition(new PhysicalPosition(saved.x, saved.y)); editorWindowState.maximized = false }
    else { editorWindowState.monitorRecovered = true; await appWindow.center() }
  } catch (error) { reportRecoverableError(error, 'Toggle editor fullscreen') }
}

export function disposeEditorWindow(): void { unlisteners.forEach(unlisten => unlisten()); unlisteners = []; initialized = false }
