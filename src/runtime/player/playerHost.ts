/** 26.43 P-E2：独立播放器的组合根。读取游戏包，按运行时 Owner 组合世界、脚本、媒体、界面与视图，
 * 不经过编辑器 store、Vue 或编辑器 i18n。
 *
 * Order: core WASM → package → migrated project → settings values → CPU resource catalog → media
 * (fonts and images prepared before the first frame) → localization, prompts and HUD reads → World
 * bootstrap → Gameplay Runtime → renderer surface → view, or a fixed-step loop for headless servers.
 * `stop()` releases everything in reverse order exactly once. */
import initNovaCore, { current_format_version, engine_version, migrate_project_json } from '../../../nova_core/pkg/nova_core.js'
import { loadRuntimeProjectFromNovaPak } from '../runtimeProjectLoader'
import { assertRuntimePakActive, NOVA_PAK_COMPATIBILITY_LIMITS } from '../novaPakReader'
import { createWebNovaPakCapabilities } from '../../platform/webNovaPakCodecs'
import { prepareRuntimeProjectResources } from '../preparedRuntimeProjectResources'
import { prepareRuntimeSceneMediaRequirements } from '../runtimeSceneMediaRequirements'
import { createRuntimeWorldMediaPlatformAdapter } from '../../platform/runtimeWorldMediaPlatformAdapter'
import { createRuntimeUiReadPorts } from '../../platform/runtimeUiReadPorts'
import { createWebAudioPlatform } from '../../platform/webAudioHost'
import { createNetworkPlatformPorts } from '../../platform/networkPlatformFactory'
import { RuntimeLocalizationOwner } from '../runtimeLocalizationOwner'
import { InputPromptOwner } from '../inputPromptOwner'
import { inputPromptState } from '../inputModality'
import { GameUiOwner } from '../gameUiOwner'
import { bootstrapRuntimeWorld } from '../runtimeWorldBootstrap'
import { GameplayRuntime } from '../GameplayRuntimeCore'
import { recordScriptFunction } from '../profiler'
import { reportRecoverableError } from '../runtimeFaultRecords'
import { loadPackageState } from '../packages'
import { setGraphPluginContributionSource } from '../../visual/graphCatalogSources'
import { executableGraphSource } from '../../visual/graphCompiler'
import { createEntityBuilder } from '../../world/entityBuilder'
import { normalizeUuid } from '../../world/identity'
import { World } from '../../world/World'
import { setTimelineCameraBlend } from '../../renderer/sceneRenderer'
import { resolveTiledMapAsset } from '../../assets/tiledMapAssets'
import { playerWorldConfiguration, readPlayerProjectId, readPlayerProjectValues } from './playerConfiguration'
import { createPlayerSurface, type PlayerSurface } from './playerSurface'
import { createPlayerView, type PlayerView } from './playerView'
import { createPlayerDebugOverlay, type PlayerDebugOverlay } from './playerDebugOverlay'
import type { PlayerMessages } from './playerMessages'
import type { SceneEntityData } from '../../world/sceneEntityData'
import type { AssetRecord } from '../runtimeAssetRecordContracts'
import type { RuntimeWorldCapabilities } from '../runtimeWorldHostContracts'
import type { UiReadPorts } from '../uiReadPorts'

export type PlayerLogLevel = 'debug' | 'info' | 'warning' | 'error'
export interface PlayerLogEntry { readonly at: number; readonly level: PlayerLogLevel; readonly category: string; readonly message: string }
export interface PlayerHostOptions {
  readonly container: HTMLElement
  readonly messages: PlayerMessages
  /** Reads the game package (desktop command or the file beside the page). */
  loadPackage(signal: AbortSignal): Promise<Uint8Array>
  /** Game scripts asked to quit (`quit_game`). */
  requestQuit(): void
  readonly signal?: AbortSignal
  /** Debug tools to open at start in development exports (`stats`, `physics`). */
  readonly debug?: string | null
  /** Status updates while loading; used by the loading screen. */
  onProgress?(stage: PlayerLoadStage): void
}
export type PlayerLoadStage = 'engine' | 'package' | 'project' | 'media' | 'world' | 'running'
export interface PlayerSession {
  readonly gameName: string
  readonly headless: boolean
  readonly runtime: GameplayRuntime
  readonly view: PlayerView | null
  readonly debug: PlayerDebugOverlay | null
  readonly developmentBuild: boolean
  readonly logs: readonly PlayerLogEntry[]
  readonly media: { readonly images: number; readonly fonts: number; readonly fallback: string }
  stop(): Promise<void>
}

// CPU catalog admission policy (identical to the compatibility Player); media/GPU readiness is separate.
const PLAYER_RESOURCE_LIMITS = Object.freeze({
  maximumRecords: NOVA_PAK_COMPATIBILITY_LIMITS.maximumEntries,
  maximumMetadataValues: 8 * 1024 * 1024,
  maximumDepth: 128,
  maximumTextBytes: 2 * NOVA_PAK_COMPATIBILITY_LIMITS.maximumDecodedBytes + NOVA_PAK_COMPATIBILITY_LIMITS.maximumProjectBytes
})
// Images decoded before the first frame (more than this load on first use, like the Editor).
const PRELOADED_IMAGE_LIMIT = 512
const MEDIA_REQUIREMENT_LIMITS = Object.freeze({ maximumReferences: 4096, maximumReferenceBytes: 1024 * 1024 })
const LOG_LIMIT = 200

export async function startPlayer(options: PlayerHostOptions): Promise<PlayerSession> {
  const { messages } = options
  const controller = new AbortController()
  const signal = controller.signal
  const forwardAbort = () => controller.abort()
  options.signal?.addEventListener('abort', forwardAbort, { once: true })
  const logs: PlayerLogEntry[] = []
  const log = (message: string, category = 'Runtime', level: PlayerLogLevel = 'info') => {
    logs.push(Object.freeze({ at: Date.now(), level, category, message: String(message).slice(0, 2000) }))
    if (logs.length > LOG_LIMIT) logs.splice(0, logs.length - LOG_LIMIT)
    if (level === 'error') console.error(`[${category}] ${message}`)
    else if (level === 'warning') console.warn(`[${category}] ${message}`)
  }
  // Releases run in reverse order; each step runs once even when an earlier one fails.
  const releases: Array<() => unknown> = []
  let stopped: Promise<void> | null = null
  const stop = (): Promise<void> => {
    if (stopped) return stopped
    controller.abort()
    options.signal?.removeEventListener('abort', forwardAbort)
    stopped = (async () => {
      const failures: unknown[] = []
      for (const release of releases.splice(0).reverse()) { try { await release() } catch (error) { failures.push(error) } }
      if (failures.length) throw Object.assign(new Error('PLAYER_CLEANUP_FAILED'), { errors: failures })
    })()
    return stopped
  }

  try {
    options.onProgress?.('engine')
    await initNovaCore()
    assertRuntimePakActive(signal)
    options.onProgress?.('package')
    const bytes = await options.loadPackage(signal)
    assertRuntimePakActive(signal)
    options.onProgress?.('project')
    const shapes = createEntityBuilder({ message: (key, parameters) => messages(key, parameters), invalidateTileMap: () => undefined })
    const project = await loadRuntimeProjectFromNovaPak(bytes, createWebNovaPakCapabilities(), NOVA_PAK_COMPATIBILITY_LIMITS, {
      migrateProjectJson: migrate_project_json, currentFormatVersion: current_format_version, engineVersion: engine_version
    }, {
      storedShapeType: item => shapes.storedShapeType(item as unknown as SceneEntityData),
      message: (key, parameters) => messages(key, parameters)
    }, signal)
    assertRuntimePakActive(signal)
    const document = project.project
    const values = readPlayerProjectValues(document)
    // Package state uses the Editor's own normalizer, so enabled packages and visual library nodes match.
    loadPackageState(document.packages)
    const projectId = readPlayerProjectId(document) ?? globalThis.crypto.randomUUID()
    const resources = prepareRuntimeProjectResources(project, { projectId, revision: 1, limits: PLAYER_RESOURCE_LIMITS, assetPreparation: { normalizeUuid }, compileVisual: executableGraphSource })
    const catalog = resources.catalog
    const clock = { nowMilliseconds: () => performance.now() }

    // Media: fonts and the first images are ready before the first frame. A source that cannot be
    // decoded is reported, and the game still starts (that image loads on first use, or stays empty).
    options.onProgress?.('media')
    const imported = (asset: Parameters<typeof resolveTiledMapAsset>[0], records: readonly unknown[]) => resolveTiledMapAsset(asset, records as AssetRecord[]).tileSet
    let media = createRuntimeWorldMediaPlatformAdapter(catalog, { clock, resolveImportedTileSet: (asset, records) => imported(asset as AssetRecord, records) })
    const records = catalog.listIdentities()
    const images = records.filter(record => record.assetType === 'image').slice(0, PRELOADED_IMAGE_LIMIT).map(record => record.uuid)
    const fonts = records.filter(record => record.assetType === 'font').map(record => record.uuid)
    let mediaFallback = '', preparedImages = 0, preparedFonts = 0
    const prepare = async (plan: { images: string[]; fonts: string[] }) => {
      const requirements = prepareRuntimeSceneMediaRequirements(catalog, {
        catalogIdentity: catalog, revision: catalog.revision(),
        entry: { identity: catalog, sceneUuid: values.activeSceneUuid || 'player', verification: 'caller-verified', images: plan.images, fonts: plan.fonts },
        dynamic: { coverage: 'verified-none', declarations: [], unresolved: [] }
      }, MEDIA_REQUIREMENT_LIMITS, clock)
      await media.binding.prepareCpu(requirements, signal)
    }
    for (const plan of [{ images, fonts }, { images: [], fonts }, null]) {
      try { if (plan) { await prepare(plan); preparedImages = plan.images.length; preparedFonts = plan.fonts.length } break }
      catch (error) {
        assertRuntimePakActive(signal)
        mediaFallback = error instanceof Error ? error.message : String(error)
        log(`Media preparation: ${mediaFallback}`, 'Runtime', 'warning')
        // A failed preparation closes its binding; a fresh one serves the remaining (lazy) loads.
        await media.dispose().catch(() => undefined)
        media = createRuntimeWorldMediaPlatformAdapter(catalog, { clock, resolveImportedTileSet: (asset, records) => imported(asset as AssetRecord, records) })
      }
    }
    const activeMedia = media
    releases.push(() => activeMedia.dispose())
    assertRuntimePakActive(signal)

    // Localization, input prompts and the HUD's reads, all bound to this Catalog.
    const localization = new RuntimeLocalizationOwner({
      identity: catalog, projectId: catalog.projectId, revision: () => catalog.revision(), listRecords: () => catalog.listIdentities(),
      resolveAsset: reference => catalog.resolveAsset(reference), readTextAsset: reference => catalog.readDependencyText(reference)
    }, values.localizationSettings)
    releases.push(() => localization.dispose())
    const inputPrompt = new InputPromptOwner(clock)
    releases.push(() => inputPrompt.dispose())
    const uiPorts = createRuntimeUiReadPorts({ catalog, mediaBinding: activeMedia.binding, localization, inputPrompt, clock, gamepads: { getGamepads: () => navigator.getGamepads?.() ?? null }, signal })
    releases.push(() => uiPorts.dispose())
    // Project fonts that could not be prepared fall back to the theme's family instead of failing a frame.
    const uiReads: UiReadPorts = {
      ...uiPorts,
      fontMetadata(reference) { try { return uiPorts.fontMetadata(reference) } catch (error) { if (String((error as Error)?.message).startsWith('RUNTIME_UI_FONT_NOT_READY')) return null; throw error } },
      activeFontFallbackFamilies(locale) { try { return uiPorts.activeFontFallbackFamilies(locale) } catch (error) { if (String((error as Error)?.message).startsWith('RUNTIME_UI_FONT_NOT_READY')) return []; throw error } }
    }

    // Plugins: manifests in the package, through the shared Owner algorithms; graph nodes they add
    // are visible to the visual-script compiler of this Player only.
    const { configuration, pluginState } = playerWorldConfiguration(values, document, catalog, (message, level) => log(message, 'Plugin', level))
    releases.push(setGraphPluginContributionSource(() => pluginState.contributions))

    const capabilities: RuntimeWorldCapabilities = {
      tileResources: activeMedia.tileResources, rendererAssets: activeMedia.rendererAssets,
      audioPlatform: createWebAudioPlatform(), networkPlatform: createNetworkPlatformPorts(),
      save: { storage: () => typeof localStorage === 'undefined' ? undefined : localStorage, origin: () => typeof location === 'undefined' ? 'headless-runtime' : location.origin, timestamp: () => new Date().toISOString(), abortError: message => new DOMException(message, 'AbortError') },
      pluginPlatform: { clock: { now: () => performance.now() }, crypto: globalThis.crypto, storage: typeof localStorage === 'undefined' ? undefined : localStorage, atob: value => globalThis.atob(value), fetch: source => globalThis.fetch(source) },
      locale: { currentLocale: () => localization.currentLocale(), localize: (value, requested) => localization.localizeUiLabel(value, requested) },
      camera: { publishBlend: value => setTimelineCameraBlend(value) },
      message: (key, parameters) => messages(key, parameters),
      unwrapEntity: entity => entity,
      nowMilliseconds: () => performance.now(), isoNow: () => new Date().toISOString(), scheduleMacrotask: (callback, delay) => globalThis.setTimeout(callback, delay),
      recordScriptFunction, reportRecoverableError,
      log: (message, category, level = 'info') => log(message, category, level),
      requestQuit: () => options.requestQuit()
    }

    options.onProgress?.('world')
    const lease = await bootstrapRuntimeWorld({
      resources, configuration, capabilities, sceneRecords: values.sceneRecords, activeSceneUuid: values.activeSceneUuid, initialState: values.initialState, signal,
      async createWorld(services) {
        const world = new World(services)
        try { await world.wasmReady; if (world.wasmError) throw world.wasmError; return world }
        catch (error) { world.disposeRuntimeWorld(); throw error }
      },
      releaseWorld(world) { world.disposeRuntimeWorld() }
    })
    releases.push(() => lease.dispose())
    assertRuntimePakActive(signal)
    const runtime = new GameplayRuntime(resources.scriptServices, lease.host)
    releases.push(() => runtime.stopSession(false))
    const headless = values.build.runtimeMode === 'headless-server'

    let view: PlayerView | null = null, debug: PlayerDebugOverlay | null = null
    if (!headless) {
      const surface: PlayerSurface = createPlayerSurface(lease.host, catalog, values.rendering, lease.host.rendererAssets, activeMedia.fontMetadata, {
        created: backend => log(`Renderer: ${backend}`, 'Runtime', 'info'),
        rebuild: reason => view?.rebuildRenderer(reason)
      })
      releases.push(() => surface.dispose())
      const gameUi = new GameUiOwner(runtime.audio, () => runtime.presentation.state, uiReads)
      // Input owns the global modality (keyboard/gamepad/touch); prompts follow it.
      const syncModality = () => {
        if (inputPrompt.isDisposed || inputPromptState.modality === inputPrompt.state.modality) return
        const pad = inputPromptState.modality === 'gamepad' ? Array.from(navigator.getGamepads?.() ?? []).find(item => item?.connected)?.id ?? '' : ''
        inputPrompt.setInputModality(inputPromptState.modality, pad)
      }
      view = createPlayerView(options.container, {
        runtime, host: lease.host, surface, rendering: values.rendering, gameUi,
        setInputModality: modality => inputPrompt.setInputModality(modality),
        beforeFrame: syncModality,
        label: values.build.gameName, controlsLabel: messages('virtualControls'), uiLabel: messages('gameUi'),
        log: (message, level) => log(message, 'Runtime', level)
      })
      const activeView = view
      // The view stops drawing before the Runtime session ends (released in reverse order).
      releases.push(() => activeView.dispose())
      // Development exports: F3 frame statistics, F4 physics debug layer (`?debug=stats,physics` opens them).
      if (values.build.developmentBuild) {
        debug = createPlayerDebugOverlay(activeView.root, { runtime, host: lease.host, surface, stats: activeView.stats, initial: options.debug })
        const overlay = debug
        activeView.setAfterFrame(frame => overlay.afterFrame(frame))
        releases.push(() => { activeView.setAfterFrame(null); overlay.dispose() })
      }
    }
    assertRuntimePakActive(signal)
    runtime.beginSession()
    if (headless) {
      const tickRate = Math.max(1, Math.min(1_000, lease.state.globalSettings.tickRate))
      const timer = globalThis.setInterval(() => runtime.frame(1 / tickRate), 1_000 / tickRate)
      releases.push(() => globalThis.clearInterval(timer))
    }
    options.onProgress?.('running')
    return Object.freeze({
      gameName: values.build.gameName, headless, runtime, view, debug, developmentBuild: values.build.developmentBuild, logs,
      media: Object.freeze({ images: preparedImages, fonts: preparedFonts, fallback: mediaFallback }),
      stop
    })
  } catch (error) {
    try { await stop() } catch (cleanupError) { if (error instanceof Error) Object.assign(error, { cleanupError }) }
    throw error
  }
}
