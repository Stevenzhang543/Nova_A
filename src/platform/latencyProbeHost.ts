/** Turns the opt-in latency probe on when the host names a loopback collector; otherwise does nothing. */
import { latencyProbe } from '../runtime/latencyProbe'

export async function activateLatencyProbe(label: string): Promise<void> {
  if (latencyProbe.enabled) return
  let endpoint = ''
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      endpoint = (await invoke<string | null>('latency_probe_endpoint')) ?? ''
    } catch { return }
  } else endpoint = new URLSearchParams(location.search).get('latencyProbe') ?? ''
  if (endpoint && latencyProbe.configure(endpoint, label)) console.info(`Nova_A latency probe reporting to ${latencyProbe.endpoint}`)
}
