<template>
  <main class="player-root">
    <WorldCanvas v-if="ready && !headless" />
    <section v-else class="player-status" :class="{ error: errorMessage }">
      <span class="player-mark">N</span>
      <strong>{{ headless ? t('headlessServer') : 'Nova Player' }}</strong>
      <p>{{ errorMessage ? t('playerLoadFailed', { message: errorMessage }) : ready && headless ? t('headlessServerRunning') : t('playerLoading') }}</p>
    </section>
    <button v-if="runtimeInstance" class="network-inspector-toggle" type="button" :aria-expanded="networkInspectorOpen" aria-controls="runtime-network-inspector" @click="networkInspectorOpen = !networkInspectorOpen"><span class="network-dot" :class="networkState?.status ?? 'connecting'" aria-hidden="true"></span>{{ networkInspectorOpen ? t('hideNetworkInspector') : t('showNetworkInspector') }}</button>
    <Transition name="network-inspector">
      <aside v-if="runtimeInstance && networkInspectorOpen" id="runtime-network-inspector" class="runtime-network-inspector" role="region" :aria-label="t('networkInspector')">
        <header><span><strong>{{ t('networkInspector') }}</strong><small>{{ runtimeInstance.playerName }}</small></span><button type="button" :aria-label="t('hideNetworkInspector')" @click="networkInspectorOpen = false">×</button></header>
        <dl>
          <div><dt>{{ t('instanceIdentity') }}</dt><dd><code :title="runtimeInstance.instanceId">{{ runtimeInstance.instanceId }}</code></dd></div>
          <div><dt>{{ t('inspectorIdentity') }}</dt><dd><code :title="runtimeInstance.inspectorId || t('sharedInspector')">{{ runtimeInstance.inspectorId || t('sharedInspector') }}</code></dd></div>
          <div><dt>{{ t('networkStatus') }}</dt><dd><output :class="networkState?.status ?? 'connecting'" aria-live="polite">{{ playerNetworkStatusLabel }}</output></dd></div>
          <div><dt>{{ t('networkRole') }}</dt><dd>{{ t(runtimeInstance.role) }}</dd></div>
          <div><dt>{{ t('sessionName') }}</dt><dd :title="runtimeInstance.sessionName">{{ runtimeInstance.sessionName }}</dd></div>
          <div><dt>{{ t('sessionMode') }}</dt><dd>{{ runtimeInstance.sessionMode === 'local' ? t('localLobby') : t('directConnect') }}</dd></div>
          <div><dt>{{ t('transport') }}</dt><dd>{{ networkState?.transport || runtimeInstance.transport }}</dd></div>
          <div><dt>{{ t('peers') }}</dt><dd>{{ networkState?.peers ?? 0 }}</dd></div>
          <div><dt>{{ t('bandwidth') }}</dt><dd>{{ networkState?.bandwidthOutKbps ?? 0 }} / {{ networkState?.bandwidthInKbps ?? 0 }} kbps</dd></div>
          <div><dt>{{ t('ownership') }}</dt><dd>{{ networkState?.ownership.length ?? 0 }}</dd></div>
          <div v-if="runtimeInstance.logScope"><dt>{{ t('logScope') }}</dt><dd><code :title="runtimeInstance.logScope">{{ runtimeInstance.logScope }}</code></dd></div>
        </dl>
        <p v-if="networkState?.lastError" class="inspector-error" role="alert">{{ networkState.lastError }}</p>
        <p v-else-if="networkInspectorError" class="inspector-error" role="alert">{{ t('playerNetworkInspectorFailed', { message: networkInspectorError }) }}</p>
        <section class="runtime-log" :aria-label="t('instanceLogs')">
          <h3>{{ t('instanceLogs') }}</h3>
          <p v-if="!instanceLogs.length">{{ t('noInstanceLogsAvailable') }}</p>
          <ol v-else>
            <li v-for="entry in instanceLogs" :key="entry.id" :class="entry.level">
              <time>{{ entry.timestamp }}</time><strong>{{ entry.category }}</strong><span>{{ entry.message }}</span>
            </li>
          </ol>
        </section>
      </aside>
    </Transition>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import WorldCanvas from './components/WorldCanvas.vue'
import { t } from './i18n'
import { gameplayRuntime } from './runtime/GameplayRuntime'
import { projectJsonFromNovaPak } from './runtime/novaPak'
import { editorState } from './store/editor'
import { loadProject, physicsState, toggleSimulation } from './store/physics'
import { buildSettings } from './runtime/buildSettings'
import { productionSettings } from './runtime/production'
import { OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled } from './runtime/packages'
import { networkingModule } from './runtime/productionRuntime'

const ready = ref(false), headless = ref(false), errorMessage = ref('')
const networkInspectorOpen = ref(false), networkInspectorError = ref('')
type NetworkModule = typeof import('./runtime/networking')
const networkState = shallowRef<NetworkModule['networkingState'] | null>(null)
let headlessTimer: number | null = null
interface RuntimeOverrides {
  networkRole: 'client' | 'server' | 'host' | null
  playerName: string | null
  sessionName: string | null
  instanceId: string | null
  logScope: string | null
  inspectorId: string | null
  sessionMode: 'local' | 'direct' | null
  transport?: 'websocket' | 'native-udp' | null
  endpoint?: string | null
  bindAddress?: string | null
  networkTransport?: 'websocket' | 'native-udp' | null
  networkEndpoint?: string | null
  networkBindAddress?: string | null
}
interface RuntimeInstance {
  role: 'client' | 'server' | 'host'
  playerName: string
  sessionName: string
  instanceId: string
  logScope: string
  inspectorId: string
  sessionMode: 'local' | 'direct'
  transport: 'websocket' | 'native-udp'
}
const runtimeInstance = ref<RuntimeInstance | null>(null)
const playerNetworkStatusLabel = computed(() => t(({ disabled: 'disabled', 'permission-required': 'permissionRequired', connecting: 'connecting', connected: 'connected', reconnecting: 'reconnecting', error: 'networkError' } as const)[networkState.value?.status ?? 'connecting']))
const instanceLogs = computed(() => editorState.logs.slice(-40).reverse())

function boundedRuntimeText(value: string | null, maximumLength: number): string {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return normalized && normalized.length <= maximumLength && !/[\u0000-\u001f\u007f]/.test(normalized) ? normalized : ''
}

function udpAddressScopeMatches(configuredValue: string, requestedValue: string): boolean {
  const host = (value: string) => {
    const clean = value.replace(/^udp:\/\//i, '').trim()
    if (clean.startsWith('[')) return clean.slice(1, clean.indexOf(']')).toLowerCase()
    return clean.slice(0, clean.lastIndexOf(':')).toLowerCase()
  }
  const configured = host(configuredValue), requested = host(requestedValue), loopback = new Set(['127.0.0.1', '::1', 'localhost']), unspecified = new Set(['0.0.0.0', '::'])
  return Boolean(configured && requested && (configured === requested || (loopback.has(requested) && (loopback.has(configured) || unspecified.has(configured)))))
}

async function applyRuntimeOverrides(): Promise<boolean> {
  if (!('__TAURI_INTERNALS__' in window)) return false
  const { invoke } = await import('@tauri-apps/api/core'), overrides = await invoke<RuntimeOverrides>('runtime_overrides')
  if (!overrides.instanceId) return false
  const permitted = productionSettings.networking.enabled && productionSettings.networking.permissionGranted && productionSettings.networking.autoStart && packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)
  const instanceId = boundedRuntimeText(overrides.instanceId, 48)
  if (!permitted || !instanceId) return false
  const configuredRole = productionSettings.networking.role
  const requestedRole = overrides.networkRole && ['client', 'server', 'host'].includes(overrides.networkRole) ? overrides.networkRole : configuredRole
  const role = (requestedRole === 'host' || requestedRole === 'server') && configuredRole === 'client' ? configuredRole : requestedRole
  const playerName = boundedRuntimeText(overrides.playerName, 80) || productionSettings.networking.playerName
  const sessionName = boundedRuntimeText(overrides.sessionName, 80) || productionSettings.networking.sessionName
  const sessionMode = productionSettings.networking.sessionMode
  const transportOverride = overrides.transport ?? overrides.networkTransport
  const transport = transportOverride === productionSettings.networking.transport ? transportOverride : productionSettings.networking.transport
  const endpoint = boundedRuntimeText(overrides.endpoint ?? overrides.networkEndpoint ?? null, 512)
  const bindAddress = boundedRuntimeText(overrides.bindAddress ?? overrides.networkBindAddress ?? null, 256)
  productionSettings.networking.role = role
  productionSettings.networking.playerName = playerName
  productionSettings.networking.sessionName = sessionName
  productionSettings.networking.sessionMode = sessionMode
  productionSettings.networking.transport = transport
  if (sessionMode === 'direct' && transport === 'native-udp' && endpoint && udpAddressScopeMatches(productionSettings.networking.endpoint, endpoint)) productionSettings.networking.endpoint = endpoint
  if (sessionMode === 'direct' && transport === 'native-udp' && bindAddress && udpAddressScopeMatches(productionSettings.networking.bindAddress, bindAddress)) productionSettings.networking.bindAddress = bindAddress
  runtimeInstance.value = { role, playerName, sessionName, instanceId, logScope: boundedRuntimeText(overrides.logScope, 80), inspectorId: boundedRuntimeText(overrides.inspectorId, 80), sessionMode, transport }
  return true
}

async function closePlayer(): Promise<void> {
  if ('__TAURI_INTERNALS__' in window) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  } else window.close()
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function loadPackageBytes(): Promise<Uint8Array> {
  if ('__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    const encoded = await invoke<string | null>('runtime_package')
    if (!encoded) throw new Error('game.nova-pak was not found beside or inside Nova Player')
    return decodeBase64(encoded)
  }
  const response = await fetch('./game.nova-pak', { cache: 'no-store' })
  if (!response.ok) throw new Error(`game.nova-pak returned HTTP ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

onMounted(async () => {
  window.addEventListener('nova-player-quit', closePlayer)
  try {
    const project = await projectJsonFromNovaPak(await loadPackageBytes())
    if (!loadProject(project)) throw new Error(editorState.statusText)
    const runtimeOverridesApplied = await applyRuntimeOverrides()
    editorState.currentPage = 'game'
    await physicsState.world.wasmReady
    if (physicsState.world.wasmError) throw physicsState.world.wasmError
    toggleSimulation(true)
    gameplayRuntime.beginSession()
    if (runtimeOverridesApplied) {
      try { networkState.value = (await networkingModule()).networkingState }
      catch (error) { networkInspectorError.value = error instanceof Error ? error.message : String(error) }
    }
    headless.value = buildSettings.runtimeMode === 'headless-server'
    if (headless.value) {
      const tickRate = Math.max(1, Math.min(1_000, physicsState.globalSettings.tickRate))
      headlessTimer = window.setInterval(() => gameplayRuntime.frame(1 / tickRate), 1_000 / tickRate)
    }
    document.title = headless.value ? `${buildSettings.gameName} · Server` : buildSettings.gameName
    ready.value = true
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  }
})
onBeforeUnmount(() => { window.removeEventListener('nova-player-quit', closePlayer); if (headlessTimer !== null) window.clearInterval(headlessTimer); gameplayRuntime.stopSession(false) })
</script>

<style scoped>
.player-root { position: relative; width: 100vw; height: 100vh; overflow: hidden; background: var(--bg-canvas); }
.player-status { width: 100%; height: 100%; display: grid; place-content: center; justify-items: center; gap: 10px; color: var(--text-primary); }
.player-status p { max-width: 520px; margin: 0; color: var(--text-muted); text-align: center; }
.player-status.error p,
.inspector-error { color: var(--danger); }
.player-mark { width: 48px; height: 48px; display: grid; place-items: center; border-radius: 14px; color: var(--accent-contrast); background: linear-gradient(145deg, var(--accent), var(--accent-strong)); font-size: 20px; font-weight: 800; box-shadow: var(--shadow-lg); }
.network-inspector-toggle {
  position: fixed;
  z-index: 31;
  inset-block-start: max(12px, env(safe-area-inset-top));
  inset-inline-end: max(12px, env(safe-area-inset-right));
  min-height: 34px;
  max-width: min(280px, calc(100vw - 24px));
  padding: 6px 11px;
  display: flex;
  align-items: center;
  gap: 7px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, transparent);
  border-radius: 999px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-2) 90%, transparent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(18px) saturate(1.2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  line-height: 1.25;
}
.network-dot { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; background: var(--warning); box-shadow: 0 0 0 3px color-mix(in srgb, var(--warning) 18%, transparent); }
.network-dot.connected { background: var(--success); box-shadow: 0 0 0 3px color-mix(in srgb, var(--success) 18%, transparent); }
.network-dot.error,
.network-dot.permission-required { background: var(--danger); box-shadow: 0 0 0 3px color-mix(in srgb, var(--danger) 18%, transparent); }
.runtime-network-inspector {
  position: fixed;
  z-index: 30;
  inset-block-start: max(54px, calc(env(safe-area-inset-top) + 54px));
  inset-inline-end: max(12px, env(safe-area-inset-right));
  width: min(330px, calc(100vw - 24px));
  max-height: min(70vh, 520px);
  padding: 11px;
  overflow: auto;
  overscroll-behavior: contain;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 80%, transparent);
  border-radius: 14px;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--surface-2) 92%, transparent);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
}
.runtime-network-inspector header { display: flex; align-items: start; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.runtime-network-inspector header span { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.runtime-network-inspector header small { color: var(--text-muted); overflow-wrap: anywhere; }
.runtime-network-inspector header button { width: 30px; min-width: 30px; height: 30px; padding: 0; border-radius: 8px; }
.runtime-network-inspector dl { margin: 0; display: grid; gap: 2px; }
.runtime-network-inspector dl div { min-width: 0; min-height: 30px; padding: 5px 3px; display: grid; grid-template-columns: minmax(90px, .8fr) minmax(0, 1.2fr); gap: 9px; align-items: center; border-bottom: 1px solid var(--border-subtle); }
.runtime-network-inspector dt { color: var(--text-muted); font-size: 11px; overflow-wrap: anywhere; }
.runtime-network-inspector dd { min-width: 0; margin: 0; text-align: end; font-size: 11px; overflow-wrap: anywhere; }
.runtime-network-inspector code { white-space: normal; overflow-wrap: anywhere; }
.runtime-network-inspector output.connected { color: var(--success); }
.runtime-network-inspector output.error,
.runtime-network-inspector output.permission-required { color: var(--danger); }
.inspector-error { margin: 9px 0 0; font-size: 11px; line-height: 1.45; overflow-wrap: anywhere; }
.runtime-log { min-width: 0; margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--border-subtle); }
.runtime-log h3 { margin: 0 0 7px; font-size: 11px; letter-spacing: .02em; }
.runtime-log > p { margin: 0; color: var(--text-muted); font-size: 11px; line-height: 1.45; }
.runtime-log ol { max-height: 156px; margin: 0; padding: 0; display: grid; gap: 4px; overflow: auto; list-style: none; }
.runtime-log li { min-width: 0; display: grid; grid-template-columns: auto auto minmax(0, 1fr); gap: 6px; align-items: baseline; color: var(--text-secondary); font-size: var(--type-caption); line-height: 1.4; }
.runtime-log li.warning { color: var(--warning); }
.runtime-log li.error,
.runtime-log li.fatal { color: var(--danger); }
.runtime-log time { color: var(--text-muted); font-variant-numeric: tabular-nums; }
.runtime-log span { min-width: 0; overflow-wrap: anywhere; }
.network-inspector-enter-active,
.network-inspector-leave-active { transition: opacity .18s ease, transform .18s ease; }
.network-inspector-enter-from,
.network-inspector-leave-to { opacity: 0; transform: translateY(-6px) scale(.985); }
@media (max-width: 520px) {
  .runtime-network-inspector { inset-inline: 10px; width: auto; max-height: calc(100vh - 68px - env(safe-area-inset-bottom)); }
  .network-inspector-toggle { inset-inline-end: 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .network-inspector-enter-active,
  .network-inspector-leave-active { transition: none; }
}
</style>
