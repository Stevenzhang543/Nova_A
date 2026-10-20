/** Turns the opt-in latency probe on when the host names a loopback collector; otherwise does nothing. */
import { latencyProbe, type LatencyProbeTransport } from '../runtime/latencyProbe'

export async function activateLatencyProbe(label: string): Promise<void> {
  if (latencyProbe.enabled) return
  let endpoint = ''
  let transport: LatencyProbeTransport | undefined
  if ('__TAURI_INTERNALS__' in window) {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      endpoint = (await invoke<string | null>('latency_probe_endpoint')) ?? ''
      // 26.44: batches go through the native host (recent WebView2 releases block page requests to loopback).
      transport = (path, body) => invoke<string>('latency_probe_send', { path, body: body ?? '' })
    } catch { return }
  } else endpoint = new URLSearchParams(location.search).get('latencyProbe') ?? ''
  if (endpoint && latencyProbe.configure(endpoint, label, transport)) console.info(`Nova_A latency probe reporting to ${latencyProbe.endpoint}${transport ? ' (through the desktop host)' : ''}`)
}
