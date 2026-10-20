/** 导出播放器入口。26.43 起默认使用独立播放器（不含 Vue 与编辑器代码，见 src/runtime/player）；
 * 兼容播放器在下列情况下按需加载：`?legacyPlayer=1`、桌面网络测试实例、或独立播放器无法启动某个游戏
 * （自动换用兼容播放器重新加载一次）。`?legacyPlayer=0` 只用独立播放器、失败时显示错误（用于测试）。 */
import '@fontsource-variable/nunito-sans/wght.css'
import '@fontsource-variable/noto-sans-sc/wght.css'
import './runtime/player/player.css'
import { installPerformanceHost } from './platform/performanceHost'
import { applyPerformancePresentationPolicy, subscribePerformanceObservations } from './runtime/largeWorldPerformance'
import { activateLatencyProbe } from './platform/latencyProbeHost'
import { reportRecoverableError } from './runtime/runtimeFaultRecords'
import { assertRuntimePakActive, NOVA_PAK_COMPATIBILITY_LIMITS } from './runtime/novaPakReader'
import { decodeRuntimePackageBase64, fetchRuntimePackageBytes } from './platform/webRuntimePackageTransport'
import { createPlayerMessages, playerLocale } from './runtime/player/playerMessages'
import { startPlayer, type PlayerLoadStage, type PlayerSession } from './runtime/player/playerHost'

type PlayerMode = 'independent' | 'legacy'
interface PlayerDiagnostics { mode: PlayerMode; stage: PlayerLoadStage | 'failed' | 'starting'; fallbackReason: string; session: PlayerSession | null }
const desktop = '__TAURI_INTERNALS__' in window
const search = new URLSearchParams(location.search)
const diagnostics: PlayerDiagnostics = { mode: 'independent', stage: 'starting', fallbackReason: search.get('playerFallback') ?? '', session: null }
// Read by smoke tests and support: which Player runs this game and why.
;(globalThis as { __NOVA_PLAYER__?: PlayerDiagnostics }).__NOVA_PLAYER__ = diagnostics

/** 26.42 P-E3: `?desynchronized=1` (Web) or NOVA_DESYNCHRONIZED=1 (desktop) requests a desynchronized game canvas. */
async function readDesynchronizedSwitch(): Promise<boolean> {
  if (desktop) {
    try { const { invoke } = await import('@tauri-apps/api/core'); return (await invoke<boolean>('canvas_desynchronized')) === true } catch { return false }
  }
  return search.get('desynchronized') === '1'
}
/** Desktop network test instances (launched with per-instance overrides) keep the compatibility Player and its inspector. */
async function desktopInstanceOverrides(): Promise<boolean> {
  if (!desktop) return false
  try { const { invoke } = await import('@tauri-apps/api/core'); return Boolean((await invoke<{ instanceId?: string | null }>('runtime_overrides'))?.instanceId) } catch { return false }
}
/** The package beside (web) or inside/next to (desktop) the Player. */
async function loadPackageBytes(signal: AbortSignal): Promise<Uint8Array> {
  assertRuntimePakActive(signal)
  if (desktop) {
    const { invoke } = await import('@tauri-apps/api/core')
    const encoded = await invoke<string | null>('runtime_package')
    assertRuntimePakActive(signal)
    if (!encoded) throw new Error('game.nova-pak was not found beside or inside Nova Player')
    return await decodeRuntimePackageBase64(encoded, NOVA_PAK_COMPATIBILITY_LIMITS.maximumPackageBytes, signal)
  }
  return await fetchRuntimePackageBytes('./game.nova-pak', NOVA_PAK_COMPATIBILITY_LIMITS.maximumPackageBytes, signal)
}
async function closeWindow(): Promise<void> {
  if (desktop) { const { getCurrentWindow } = await import('@tauri-apps/api/window'); await getCurrentWindow().close() }
  else window.close()
}
async function runLegacy(root: HTMLElement): Promise<void> {
  diagnostics.mode = 'legacy'
  root.replaceChildren()
  const { mountLegacyPlayer } = await import('./playerLegacy')
  mountLegacyPlayer(root)
}
/** Load once more in the compatibility Player (a fresh page, so no state from this attempt remains). */
function reloadInLegacy(reason: string): void {
  const url = new URL(location.href)
  url.searchParams.set('legacyPlayer', '1')
  url.searchParams.set('playerFallback', reason.slice(0, 160))
  location.replace(url.toString())
}

const PROGRESS: Record<PlayerLoadStage, number> = { engine: 12, package: 30, project: 52, media: 70, world: 88, running: 100 }
function statusScreen(root: HTMLElement, title: string, text: string) {
  const screen = document.createElement('section'); screen.className = 'nova-player-status'; screen.setAttribute('role', 'status')
  const mark = document.createElement('span'); mark.className = 'nova-player-mark'; mark.textContent = 'N'; mark.setAttribute('aria-hidden', 'true')
  const heading = document.createElement('strong'); heading.textContent = title
  const paragraph = document.createElement('p'); paragraph.textContent = text
  const progress = document.createElement('div'); progress.className = 'nova-player-progress'; const bar = document.createElement('span'); progress.appendChild(bar)
  screen.append(mark, heading, paragraph, progress); root.appendChild(screen)
  return {
    progress(stage: PlayerLoadStage) { bar.style.width = `${PROGRESS[stage]}%` },
    text(value: string, error = false) { paragraph.textContent = value; screen.classList.toggle('error', error); screen.setAttribute('role', error ? 'alert' : 'status'); progress.hidden = error },
    title(value: string) { heading.textContent = value },
    button(label: string, action: () => void) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.addEventListener('click', action); screen.appendChild(button); button.focus() },
    leave() { screen.classList.add('leaving'); setTimeout(() => screen.remove(), 320) }
  }
}

/* 26.43 web: full-screen control for browser players (Fullscreen API, WebKit prefix on iPad Safari). */
type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null; webkitFullscreenEnabled?: boolean; webkitExitFullscreen?: () => Promise<void> | void }
type FullscreenElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void }
function installFullscreenControl(root: HTMLElement, messages: ReturnType<typeof createPlayerMessages>): () => void {
  const doc = document as FullscreenDocument
  if (desktop || !(doc.fullscreenEnabled || doc.webkitFullscreenEnabled)) return () => undefined
  const button = document.createElement('button'); button.type = 'button'; button.className = 'nova-player-fullscreen'; button.dataset.testid = 'player-fullscreen'
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); svg.appendChild(path); button.appendChild(svg)
  let hideTimer = 0
  const active = () => Boolean(doc.fullscreenElement || doc.webkitFullscreenElement)
  const read = () => {
    const on = active(), label = on ? messages('exitFullscreen') : messages('enterFullscreen')
    button.setAttribute('aria-label', label); button.title = label
    path.setAttribute('d', on ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5')
  }
  const wake = () => { button.classList.remove('hidden'); window.clearTimeout(hideTimer); hideTimer = window.setTimeout(() => button.classList.add('hidden'), 3_000) }
  button.addEventListener('click', async event => {
    event.stopPropagation()
    try {
      if (active()) await (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.())
      else { const element = document.documentElement as FullscreenElement; await (element.requestFullscreen ? element.requestFullscreen({ navigationUI: 'hide' }) : element.webkitRequestFullscreen?.()) }
    } catch (error) { reportRecoverableError(error, 'Player full screen', 'Runtime') }
    read(); wake()
  })
  // Keep the game's keyboard focus: the button never takes pointer focus.
  button.addEventListener('pointerdown', event => event.preventDefault())
  document.addEventListener('fullscreenchange', read); document.addEventListener('webkitfullscreenchange', read)
  window.addEventListener('pointermove', wake, { passive: true }); window.addEventListener('pointerdown', wake, { passive: true })
  read(); wake(); root.appendChild(button)
  return () => { window.clearTimeout(hideTimer); button.remove(); document.removeEventListener('fullscreenchange', read); document.removeEventListener('webkitfullscreenchange', read); window.removeEventListener('pointermove', wake); window.removeEventListener('pointerdown', wake) }
}

/** Bundled UI fonts are ready before the first frame draws text (bounded wait; the game starts regardless). */
async function preloadBundledFonts(): Promise<void> {
  if (!document.fonts?.load) return
  const fonts = Promise.all([document.fonts.load('16px "Nunito Sans Variable"'), document.fonts.load('16px "Noto Sans SC Variable"', '游戏')]).then(() => undefined, () => undefined)
  await Promise.race([fonts, new Promise<void>(resolve => setTimeout(resolve, 1_500))])
}

async function runIndependent(root: HTMLElement): Promise<void> {
  const messages = createPlayerMessages(playerLocale())
  document.documentElement.lang = playerLocale()
  const shell = document.createElement('main'); shell.className = 'nova-player'; root.appendChild(shell)
  const status = statusScreen(shell, 'Nova Player', messages('playerLoading'))
  const activity: { notify: ((value: 'playing' | 'loading' | 'interactive') => void) | null } = { notify: null }
  const performanceHost = installPerformanceHost({ subscribeFrames: subscribePerformanceObservations,
    publishBudget: snapshot => applyPerformancePresentationPolicy({ benchmarkMode: snapshot.benchmarkMode, tier: 0,
      renderScale: 1, particleScale: 1, revision: snapshot.revision, reason: snapshot.reasonCodes.join(',') }),
    subscribeActivity: listener => { listener('loading'); activity.notify = listener; return () => { activity.notify = null } } })
  const loading = new AbortController()
  let session: PlayerSession | null = null, removeFullscreen: () => void = () => undefined
  const quit = async () => {
    loading.abort(); removeFullscreen()
    try { await session?.stop() } catch (error) { reportRecoverableError(error, 'Player shutdown', 'Runtime') }
    await closeWindow()
  }
  window.addEventListener('pagehide', event => { if (!event.persisted) { loading.abort(); void session?.stop().catch(() => undefined) } })
  try {
    await preloadBundledFonts()
    session = await startPlayer({
      container: shell, messages, signal: loading.signal, debug: search.get('debug'),
      loadPackage: signal => loadPackageBytes(signal),
      requestQuit: () => { void quit() },
      onProgress: stage => { diagnostics.stage = stage; status.progress(stage) }
    })
    diagnostics.session = session
    document.title = session.headless ? `${session.gameName} · Server` : session.gameName
    if (session.headless) { status.title(messages('headlessServer')); status.text(messages('headlessServerRunning')); return }
    activity.notify?.('playing')
    status.leave()
    removeFullscreen = installFullscreenControl(shell, messages)
    if (diagnostics.fallbackReason) console.info(`Nova Player: independent Player running (previous fallback: ${diagnostics.fallbackReason})`)
  } catch (error) {
    diagnostics.stage = 'failed'
    performanceHost.dispose()
    if (loading.signal.aborted) return
    const message = error instanceof Error ? error.message : String(error)
    console.error('Nova Player could not start this game', error)
    // The compatibility Player can still run games that need it; it is tried once, in a fresh page.
    if (!search.has('legacyPlayer')) { reloadInLegacy(message); return }
    status.text(messages('playerLoadFailed', { message }), true)
    status.button(messages('playerRetry'), () => location.reload())
  }
}

void (async () => {
  ;(globalThis as { __NOVA_DESYNCHRONIZED_CANVAS__?: boolean }).__NOVA_DESYNCHRONIZED_CANVAS__ = await readDesynchronizedSwitch()
  await activateLatencyProbe('web-player')
  const root = document.getElementById('app') ?? document.body
  if (search.get('legacyPlayer') === '1' || await desktopInstanceOverrides()) await runLegacy(root)
  else await runIndependent(root)
})()
