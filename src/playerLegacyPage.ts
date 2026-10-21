/** 26.45: the compatibility Player (the Vue Player of 26.42 and earlier) as a page of its own,
 * player-legacy.html. The independent Player (player.html) opens it for `?legacyPlayer=1`, for desktop
 * network test instances, and once when a game cannot start in the independent Player; keeping it a
 * separate page means nothing of Vue or the Editor is reachable from player.html at all. */
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import { activateLatencyProbe } from './platform/latencyProbeHost'
import { mountLegacyPlayer } from './playerLegacy'

const search = new URLSearchParams(location.search)
// Read by smoke tests and support, as on player.html.
;(globalThis as { __NOVA_PLAYER__?: unknown }).__NOVA_PLAYER__ = { mode: 'legacy', stage: 'starting', fallbackReason: search.get('playerFallback') ?? '', session: null }

async function readDesynchronizedSwitch(): Promise<boolean> {
  if ('__TAURI_INTERNALS__' in window) {
    try { const { invoke } = await import('@tauri-apps/api/core'); return (await invoke<boolean>('canvas_desynchronized')) === true } catch { return false }
  }
  return search.get('desynchronized') === '1'
}

void (async () => {
  ;(globalThis as { __NOVA_DESYNCHRONIZED_CANVAS__?: boolean }).__NOVA_DESYNCHRONIZED_CANVAS__ = await readDesynchronizedSwitch()
  await activateLatencyProbe('web-player')
  mountLegacyPlayer(document.getElementById('app') ?? document.body)
})()
