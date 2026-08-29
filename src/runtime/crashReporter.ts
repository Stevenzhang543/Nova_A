import { reportFatalError } from './faultCenter'

interface CrashPayload {
  message: string
  stack: string
  project: string
  scene: string
  renderer: string
}

let installed = false

function isBrowserLayoutDeliveryWarning(reason: unknown): boolean {
  const message = reason instanceof Error ? reason.message : String(reason)
  return /ResizeObserver loop (?:limit exceeded|completed with undelivered notifications)/i.test(message)
}

async function persistCrash(payload: CrashPayload): Promise<void> {
  const [{ recordTelemetry }, { buildSettings }] = await Promise.all([import('./shipping'), import('./buildSettings')])
  recordTelemetry('runtime.crash', { renderer: payload.renderer, scene: payload.scene, message: payload.message.slice(0, 160) })
  if (payload.renderer !== 'Nova_A Editor' && !buildSettings.delivery.crashReports) return
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('write_crash_log', { payload })
  } catch (error) {
    console.error('Could not write Nova_A crash log', error)
  }
}

export function installCrashReporter(renderer = 'Editor'): void {
  if (installed) return
  installed = true
  const report = async (reason: unknown) => {
    // Browsers dispatch this platform notification through `window.error` even
    // though it is not an application exception. Canvas resizing is coalesced
    // separately; never turn the delivery warning itself into a fatal report.
    if (isBrowserLayoutDeliveryWarning(reason)) return
    const error = reason instanceof Error ? reason : new Error(String(reason))
    reportFatalError(error, renderer === 'Nova_A Editor' ? 'Uncaught editor error' : 'Uncaught player error')
    let project = 'Unknown', scene = 'Unknown'
    try {
      const [{ physicsState, sceneManager, getSceneJSON }, { markRecoverySessionCrashed, storeRecoverySnapshot }] = await Promise.all([import('../store/physics'), import('./recovery')])
      project = physicsState.world.projectEngineVersion
      scene = sceneManager.activeScene?.name ?? 'Unknown'
      markRecoverySessionCrashed()
      if (renderer === 'Nova_A Editor') storeRecoverySnapshot(getSceneJSON(), 'crash')
    } catch { /* The last valid autosave remains available. */ }
    const payload: CrashPayload = {
      message: error.message || 'Unknown runtime failure', stack: error.stack ?? '',
      project, scene, renderer
    }
    await persistCrash(payload).catch(persistError => console.error('Could not persist Nova_A crash', persistError))
  }
  window.addEventListener('error', event => {
    const reason = event.error ?? event.message
    if (isBrowserLayoutDeliveryWarning(reason)) {
      event.preventDefault()
      return
    }
    void report(reason)
    event.preventDefault()
  })
  window.addEventListener('unhandledrejection', event => { void report(event.reason); event.preventDefault() })
}
