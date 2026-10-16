<!-- 播放器入口：读取游戏包，限制运行参数并启动游戏或无界面服务器。 -->
<template>
  <main class="player-root">
    <WorldCanvas v-if="ready && !headless" :runtime="playerRuntime" :runtime-view="runtimeView" :runtime-surface="runtimeSurface" />
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRaw } from 'vue'
import WorldCanvas from './components/WorldCanvas.vue'
import { t } from './i18n'
import { GameplayRuntime as GameplayRuntimeCore } from './runtime/GameplayRuntimeCore'
import { bootstrapRuntimeWorld } from './runtime/runtimeWorldBootstrap'
import type { RuntimeWorldConfiguration, RuntimeWorldInitialState, RuntimeWorldSurface, RuntimeWorldView } from './runtime/runtimeWorldHostContracts'
import { createEditorRuntimeWorldPlatform, createEditorRuntimeWorldSurface } from './editor/runtimeWorldHostPlatformAdapter'
import { World } from './world/World'
import { createInitialWorldGameplayState } from './runtime/worldGameplayOwner'
import { serializeWorldGameplaySettings } from './runtime/worldGameplay'
import { createInitialRuntimePresentationState } from './runtime/presentationOwner'
import { serializeRuntimeAccessibilitySettings, serializeUiAudioSettings } from './runtime/presentation'
import { pluginState, serializePluginManifests } from './runtime/plugins'
import { activeRenderQuality } from './renderer/renderSettings'
import { performanceRuntimeState } from './runtime/largeWorldPerformance'
import { recordScriptFunction } from './runtime/profiler'
import { reportRecoverableError } from './runtime/runtimeFaultRecords'
import { prepareRuntimeProjectResources } from './runtime/preparedRuntimeProjectResources'
import { serializeAssets } from './assets/AssetDatabase'
import { normalizeUuid } from './world/identity'
import { executableGraphSource } from './visual/graphCompiler'
import { getProjectSessionGeneration, projectSessionState } from './projects/projectSession'
import { loadRuntimeProjectFromNovaPak } from './runtime/runtimeProjectLoader'
import { assertRuntimePakActive, runtimePackagePathKey, NOVA_PAK_COMPATIBILITY_LIMITS } from './runtime/novaPakReader'
import { createWebNovaPakCapabilities } from './platform/webNovaPakCodecs'
import { decodeRuntimePackageBase64, fetchRuntimePackageBytes } from './platform/webRuntimePackageTransport'
import { getEditorEntityBuilder } from './editor/entityBuilderAdapter'
import type { SceneEntityData } from './world/sceneEntityData'
import { migrate_project_json, current_format_version, engine_version } from '../nova_core/pkg/nova_core.js'
import { addEditorLog, editorState } from './store/editor'
import { loadProject, physicsState, sceneManager } from './store/physics'
import { buildSettings } from './runtime/buildSettings'
import { productionSettings, serializeProductionSettings } from './runtime/production'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_NETWORKING_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, packageEnabled, packageState } from './runtime/packages'

const ready = ref(false), headless = ref(false), errorMessage = ref('')
type RuntimeWorldLease = Awaited<ReturnType<typeof bootstrapRuntimeWorld>>
const playerRuntime = shallowRef<GameplayRuntimeCore | null>(null)
const runtimeView = shallowRef<RuntimeWorldView | null>(null)
const runtimeSurface = shallowRef<RuntimeWorldSurface | null>(null)
let runtimeLease: RuntimeWorldLease | null = null
let stopPromise: Promise<void> | null = null
// CPU catalog admission policy; media/GPU readiness is established separately.
const playerResourceLimits = Object.freeze({
  maximumRecords: NOVA_PAK_COMPATIBILITY_LIMITS.maximumEntries,
  maximumMetadataValues: 8 * 1024 * 1024,
  maximumDepth: 128,
  // PAK assets expand into data URLs; keep that expansion inside an explicit host budget.
  maximumTextBytes: 2 * NOVA_PAK_COMPATIBILITY_LIMITS.maximumDecodedBytes + NOVA_PAK_COMPATIBILITY_LIMITS.maximumProjectBytes
})
const networkInspectorOpen = ref(false), networkInspectorError = ref('')
type NetworkModule = import('./runtime/networkSessionOwner').NetworkSessionOwner
const networkState = shallowRef<NetworkModule['networkingState'] | null>(null)
let headlessTimer: number | null = null
const packageLoad = new AbortController()
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
const playerNetworkStatusLabel = computed(/** 将网络状态映射为本地化标签，缺失状态时显示连接中。 */ () => t(({ disabled: 'disabled', 'permission-required': 'permissionRequired', connecting: 'connecting', connected: 'connected', reconnecting: 'reconnecting', error: 'networkError' } as const)[networkState.value?.status ?? 'connecting']))
const instanceLogs = computed(/** 复制最近四十条日志并逆序展示。 */ () => editorState.logs.slice(-40).reverse())

/** 规范化文本并拒绝过长、空或含控制字符的运行参数。 */ function boundedRuntimeText(value: string | null, maximumLength: number): string {
  if (typeof value !== 'string') return ''
  const normalized = value.trim()
  return normalized && normalized.length <= maximumLength && !/[\u0000-\u001f\u007f]/.test(normalized) ? normalized : ''
}

/** 比较 UDP 主机范围，允许相同主机及已配置回环或未指定地址对应的回环请求。 */ function udpAddressScopeMatches(configuredValue: string, requestedValue: string): boolean {
  const host = /** 从普通或 IPv6 UDP 地址中提取规范化主机。 */ (value: string) => {
    const clean = value.replace(/^udp:\/\//i, '').trim()
    if (clean.startsWith('[')) return clean.slice(1, clean.indexOf(']')).toLowerCase()
    return clean.slice(0, clean.lastIndexOf(':')).toLowerCase()
  }
  const configured = host(configuredValue), requested = host(requestedValue), loopback = new Set(['127.0.0.1', '::1', 'localhost']), unspecified = new Set(['0.0.0.0', '::'])
  return Boolean(configured && requested && (configured === requested || (loopback.has(requested) && (loopback.has(configured) || unspecified.has(configured)))))
}

/** 仅在项目允许联网并自动启动时应用合法原生参数，限制角色提升、传输切换与 UDP 地址范围。 */ async function applyRuntimeOverrides(signal?: AbortSignal): Promise<boolean> {
  if (!('__TAURI_INTERNALS__' in window)) return false
  const { invoke } = await import('@tauri-apps/api/core'), overrides = await invoke<RuntimeOverrides>('runtime_overrides')
  assertRuntimePakActive(signal)
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

/** 原生环境关闭当前窗口，否则请求浏览器关闭窗口。 */ async function closePlayer(): Promise<void> {
  packageLoad.abort()
  try { await stopPlayerSession() }
  catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
    reportRecoverableError(error, 'Player shutdown', 'Runtime')
    return
  }
  if ('__TAURI_INTERNALS__' in window) {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  } else window.close()
}

/** 从原生命令或同目录 Web 文件读取包，缺失或 HTTP 失败抛出错误。 */ async function loadPackageBytes(signal?: AbortSignal): Promise<Uint8Array> {
  assertRuntimePakActive(signal)
  if ('__TAURI_INTERNALS__' in window) {
    const { invoke } = await import('@tauri-apps/api/core')
    const encoded = await invoke<string | null>('runtime_package')
    assertRuntimePakActive(signal)
    if (!encoded) throw new Error('game.nova-pak was not found beside or inside Nova Player')
    return await decodeRuntimePackageBase64(encoded, NOVA_PAK_COMPATIBILITY_LIMITS.maximumPackageBytes, signal)
  }
  return await fetchRuntimePackageBytes('./game.nova-pak', NOVA_PAK_COMPATIBILITY_LIMITS.maximumPackageBytes, signal)
}

/** Snapshot only the loaded project's configuration; all runtime counters start at their original Owner defaults. */
function captureRuntimeWorldConfiguration(projectId: string): RuntimeWorldConfiguration {
  const production = serializeProductionSettings()
  const world = Object.assign(createInitialWorldGameplayState(), serializeWorldGameplaySettings())
  const presentation = createInitialRuntimePresentationState()
  presentation.accessibility = serializeRuntimeAccessibilitySettings()
  presentation.uiAudio = serializeUiAudioSettings()
  return {
    projectId,
    enabledPackageIds: packageState.installed.filter(item => item.enabled && item.project).map(item => item.manifest.id),
    aiEnabled: packageEnabled(OFFICIAL_AI_PACKAGE_ID), objectPoolEnabled: packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID),
    networkPackageId: OFFICIAL_NETWORKING_PACKAGE_ID, world, presentation,
    replay: production.replay, network: { networking: production.networking, replay: production.replay }, save: production.data,
    plugins: serializePluginManifests(), pluginSafeMode: pluginState.safeMode, pluginSafeModeRecommended: pluginState.safeModeRecommended,
    frameWorkBudgetMs: production.performance.frameWorkBudgetMs, streamingBudgetMs: production.performance.streamingBudgetMs,
    particleBudget: activeRenderQuality.particleBudget, adaptiveParticleScale: performanceRuntimeState.adaptiveParticleScale
  }
}

onMounted(/** 挂载时加载项目和受限参数，等待物理模块并启动会话；服务器模式设置计时器，失败显示加载错误。 */ async () => {
  window.addEventListener('nova-player-quit', closePlayer)
  try {
    const world = physicsState.world, signal = packageLoad.signal
    await world.wasmReady
    assertRuntimePakActive(signal)
    if (world.wasmError) throw world.wasmError
    const project = await loadRuntimeProjectFromNovaPak(await loadPackageBytes(signal), createWebNovaPakCapabilities(), NOVA_PAK_COMPATIBILITY_LIMITS, {
      migrateProjectJson: migrate_project_json,
      currentFormatVersion: current_format_version,
      engineVersion: engine_version
    }, {
      storedShapeType(item) { return getEditorEntityBuilder().storedShapeType(item as SceneEntityData) },
      message(key, parameters) { return t(key, parameters) }
    }, signal)
    assertRuntimePakActive(signal)
    if (physicsState.world !== world) throw new Error('RUNTIME_PROJECT_WORLD_CHANGED: The package load belongs to an earlier World.')
    if (!loadProject(project.source)) throw new Error(editorState.statusText)
    assertRuntimePakActive(signal)
    const loadedGeneration = getProjectSessionGeneration()
    const projectEntry = project.packageIndex?.entries.find(entry => runtimePackagePathKey(entry.path) === 'project.nova')
    if (!projectEntry) throw new Error('RUNTIME_PROJECT_IDENTITY_REQUIRED: The validated package has no project entry.')
    // The PAK reader keeps its verified content hash; save namespaces retain the loaded project metadata ID.
    const loadedIdentity = Object.freeze({ projectId: projectSessionState.id, projectSha256: projectEntry.sha256 })
    // Adopt the actual loaded IDs, including IDs assigned to legacy assets. Keep source as provenance.
    const resources = prepareRuntimeProjectResources({ ...project, project: { ...project.project, assets: serializeAssets() } }, {
      projectId: loadedIdentity.projectId, revision: loadedGeneration, limits: playerResourceLimits,
      assetPreparation: { normalizeUuid }, compileVisual: executableGraphSource
    })
    const runtimeOverridesApplied = await applyRuntimeOverrides(signal)
    assertRuntimePakActive(signal)
    if (physicsState.world !== world || getProjectSessionGeneration() !== loadedGeneration) throw new Error('RUNTIME_PROJECT_WORLD_CHANGED: The package load belongs to an earlier project or World.')
    const configuration = captureRuntimeWorldConfiguration(resources.catalog.projectId)
    const initialState: RuntimeWorldInitialState & { simulationRunning: boolean } = {
      camera: structuredClone(toRaw(physicsState.camera)), globalSettings: structuredClone(toRaw(physicsState.globalSettings)),
      playMode: 'playing', simulationRunning: true, engineDiagnostics: structuredClone(toRaw(physicsState.engineDiagnostics)),
      inputMap: structuredClone(toRaw(physicsState.inputMap)), audioSettings: structuredClone(toRaw(physicsState.audioSettings))
    }
    const capabilities = createEditorRuntimeWorldPlatform(resources, {
      log: addEditorLog, recordScriptFunction, reportRecoverableError,
      requestQuit() { window.dispatchEvent(new CustomEvent('nova-player-quit')) }
    })
    const lease = await bootstrapRuntimeWorld({
      resources, configuration, capabilities, sceneRecords: sceneManager.serialize(), activeSceneUuid: sceneManager.activeSceneUuid, initialState, signal,
      async createWorld(services) {
        const runtimeWorld = new World(services)
        try { await runtimeWorld.wasmReady; if (runtimeWorld.wasmError) throw runtimeWorld.wasmError; return runtimeWorld }
        catch (error) { runtimeWorld.disposeRuntimeWorld(); throw error }
      },
      releaseWorld(runtimeWorld) { runtimeWorld.disposeRuntimeWorld() }
    })
    // A lease that arrives after unmount must never publish itself or escape the already-completed shutdown.
    if (signal.aborted || physicsState.world !== world || getProjectSessionGeneration() !== loadedGeneration) {
      await lease.dispose()
      assertRuntimePakActive(signal)
      throw new Error('RUNTIME_PROJECT_WORLD_CHANGED: The loaded runtime world belongs to an earlier project.')
    }
    runtimeLease = lease
    const runtime = new GameplayRuntimeCore(resources.scriptServices, lease.host)
    playerRuntime.value = runtime
    runtimeView.value = lease.view
    runtimeSurface.value = createEditorRuntimeWorldSurface(lease.host)
    editorState.currentPage = 'game'
    assertRuntimePakActive(signal)
    runtime.beginSession()
    assertRuntimePakActive(signal)
    if (runtimeOverridesApplied) {
      try {
        const module = await playerRuntime.value.productionNetwork.networkingModule()
        assertRuntimePakActive(signal)
        networkState.value = module.networkingState
      } catch (error) {
        assertRuntimePakActive(signal)
        networkInspectorError.value = error instanceof Error ? error.message : String(error)
      }
    }
    headless.value = buildSettings.runtimeMode === 'headless-server'
    if (headless.value) {
      const tickRate = Math.max(1, Math.min(1_000, lease.state.globalSettings.tickRate))
      headlessTimer = window.setInterval(/** 按服务器 tick 频率推进一帧运行时。 */ () => playerRuntime.value?.frame(1 / tickRate), 1_000 / tickRate)
    }
    document.title = headless.value ? `${buildSettings.gameName} · Server` : buildSettings.gameName
    ready.value = true
  } catch (error) {
    if (!packageLoad.signal.aborted) errorMessage.value = error instanceof Error ? error.message : String(error)
    try { await stopPlayerSession() }
    catch (cleanupError) {
      if (!packageLoad.signal.aborted) errorMessage.value += `\nRuntime cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
      else reportRecoverableError(cleanupError, 'Cancelled Player startup cleanup', 'Runtime')
    }
  }
})

/** Clear the server loop, stop Core, unmount its surface, then release the exact allocating lease once. */
function stopPlayerSession(): Promise<void> {
  if (stopPromise) return stopPromise
  let resolve!: () => void, reject!: (error: unknown) => void
  stopPromise = new Promise<void>((yes, no) => { resolve = yes; reject = no })
  if (headlessTimer !== null) { window.clearInterval(headlessTimer); headlessTimer = null }
  const runtime = playerRuntime.value, lease = runtimeLease
  ready.value = false
  playerRuntime.value = null; runtimeLease = null
  runtimeView.value = null; runtimeSurface.value = null; networkState.value = null
  void (async () => {
    const failures: unknown[] = []
    try { runtime?.stopSession(false) } catch (error) { failures.push(error) }
    // Canvas must release its renderer/input before the Host makes its ports unavailable.
    try { await nextTick() } catch (error) { failures.push(error) }
    try { await lease?.dispose() } catch (error) { failures.push(error) }
    if (failures.length) reject(Object.assign(new Error('PLAYER_RUNTIME_CLEANUP_FAILED'), { errors: failures }))
    else resolve()
  })()
  return stopPromise
}
onBeforeUnmount(/** 卸载时移除退出监听、清除服务器计时器并停止会话。 */ () => {
  packageLoad.abort(); window.removeEventListener('nova-player-quit', closePlayer)
  void stopPlayerSession().catch(error => reportRecoverableError(error, 'Player unmount cleanup', 'Runtime'))
})
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
