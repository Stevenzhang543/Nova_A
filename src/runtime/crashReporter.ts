import { addEditorLog } from '../store/editor'
import { physicsState, sceneManager } from '../store/physics'

interface CrashPayload {
  message: string
  stack: string
  project: string
  scene: string
  renderer: string
}

let installed = false

async function persistCrash(payload: CrashPayload): Promise<void> {
  addEditorLog(payload.message, 'Engine', 'fatal', payload.stack)
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
  const report = (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason))
    const payload: CrashPayload = {
      message: error.message || 'Unknown runtime failure', stack: error.stack ?? '',
      project: physicsState.world.projectEngineVersion,
      scene: sceneManager.activeScene?.name ?? 'Unknown', renderer
    }
    void persistCrash(payload)
  }
  window.addEventListener('error', event => report(event.error ?? event.message))
  window.addEventListener('unhandledrejection', event => report(event.reason))
}
