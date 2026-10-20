/** 26.43 P-E2 独立播放器：把导出包里的项目文档变成 Runtime 组合所需的纯配置，不经过编辑器 store。
 *
 * The legacy Player loaded the package into the Editor stores (loadProject) and copied the result
 * back out. The independent Player reads the same project settings straight into the Runtime's
 * own values: input map, audio, physics, scripting, world and presentation settings, packages,
 * plugins, rendering policy and localization. Every normalizer used here is the one the Editor
 * uses, so both Players see identical settings. */
import { normalizeInputMap } from '../input'
import { loadDeviceInputSettings } from '../deviceInput'
import { normalizeAudioSettings } from '../audioDocuments'
import { normalizeScriptSettings, scriptProjectSettings } from '../scriptSettings'
import { createRuntimeSceneData } from '../runtimeSceneData'
import { createInitialWorldGameplayState, normalizeWorldGameplaySettings } from '../worldGameplayOwner'
import { createInitialRuntimePresentationState } from '../presentationOwner'
import { loadRuntimeAccessibilitySettings, loadUiAudioSettings, serializeRuntimeAccessibilitySettings, serializeUiAudioSettings } from '../presentation'
import { loadProductionSettings, serializeProductionSettings } from '../production'
import { DEFAULT_MAX_CATCH_UP_STEPS } from '../engineTiming'
import { defaultPhysicsLayers, defaultPhysicsProfile } from '../physicsProduction'
import { performanceRuntimeState } from '../largeWorldPerformance'
import { createPluginRuntimeOwner, type PluginRuntimeState } from '../pluginRuntimeOwner'
import { RuntimeRenderingPolicyOwner, createInitialRuntimeRenderingPolicyState } from '../../renderer/runtimeRenderingPolicyOwner'
import { defaultCollisionMatrix, type GlobalPhysicsSettings } from '../../world/World'
import { Camera } from '../../world/Camera'
import { normalizeUuid } from '../../world/identity'
import type { RuntimeWorldConfiguration, RuntimeWorldInitialState } from '../runtimeWorldHostContracts'
import type { RuntimeProjectCatalog } from '../runtimeProjectCatalog'
import type { AssetRecord } from '../runtimeAssetRecordContracts'

export const OFFICIAL_NETWORKING_PACKAGE_ID = 'top.whitelists.novaa.networking'
export const OFFICIAL_AI_PACKAGE_ID = 'top.whitelists.novaa.ai'
export const OFFICIAL_OBJECT_POOL_PACKAGE_ID = 'top.whitelists.novaa.object-pool'

export interface PlayerInstalledPackage { readonly id: string; readonly version: string; readonly enabled: boolean; readonly project: boolean }

const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

/** Installed packages as the Editor stores them: enabled and project-scoped entries count. */
export function readInstalledPackages(value: unknown): PlayerInstalledPackage[] {
  const installed = Array.isArray(record(value).installed) ? record(value).installed as unknown[] : []
  return installed.slice(0, 512).flatMap(item => {
    const entry = record(item), manifest = record(entry.manifest)
    const id = typeof manifest.id === 'string' ? manifest.id.trim().slice(0, 160) : ''
    return id ? [{ id, version: typeof manifest.version === 'string' ? manifest.version.slice(0, 40) : '0.0.0', enabled: entry.enabled === true, project: entry.project === true }] : []
  })
}
export function packageEnabledIn(packages: readonly PlayerInstalledPackage[], id: string): boolean { return packages.some(item => item.id === id && item.project && item.enabled) }

/** The Editor's defaults for a new document (store/physics), before the project's own physics settings. */
export function defaultGlobalPhysicsSettings(): GlobalPhysicsSettings {
  return { gravity: 9.8, airFriction: 0.01, timeScale: 1, tickRate: 60, maxCatchUpSteps: DEFAULT_MAX_CATCH_UP_STEPS, collisionMatrix: defaultCollisionMatrix(), interpolation: 'Interpolate', layers: defaultPhysicsLayers(), profile: defaultPhysicsProfile() }
}

export interface PlayerBuildValues { readonly runtimeMode: 'game' | 'headless-server'; readonly gameName: string; readonly developmentBuild: boolean }
export function readPlayerBuildValues(value: unknown): PlayerBuildValues {
  const build = record(value)
  const gameName = typeof build.gameName === 'string' && build.gameName.trim() ? build.gameName.trim().slice(0, 120) : 'Nova Game'
  // Same rule as the Editor's build settings: the Release profile is never a development build.
  const developmentBuild = build.profile === 'release' ? false : build.profile === 'debug' ? true : build.developmentBuild !== false
  return { runtimeMode: build.runtimeMode === 'headless-server' ? 'headless-server' : 'game', gameName, developmentBuild }
}

/** Project ID exactly as the Editor's project session keeps it (an authored id up to 128 characters). */
export function readPlayerProjectId(project: Record<string, unknown>): string | null {
  const metadata = record(project.projectMetadata)
  return typeof metadata.id === 'string' && metadata.id && metadata.id.length <= 128 ? metadata.id : null
}

export interface PlayerProjectValues {
  readonly settings: Record<string, unknown>
  readonly packages: PlayerInstalledPackage[]
  readonly build: PlayerBuildValues
  readonly initialState: RuntimeWorldInitialState
  readonly rendering: RuntimeRenderingPolicyOwner
  readonly localizationSettings: unknown
  readonly sceneRecords: Record<string, unknown>[]
  readonly activeSceneUuid: string
}

/** Thrown for documents only the compatibility Player can run; the entry falls back to it. */
export class PlayerCompatibilityRequired extends Error { constructor(reason: string) { super(`PLAYER_COMPATIBILITY_REQUIRED: ${reason}`); this.name = 'PlayerCompatibilityRequired' } }
/** Very old documents keep images inline on entities; the Editor converts those to assets while loading. */
export function assertPlayerSceneCompatibility(scenes: readonly Record<string, unknown>[]): void {
  let visited = 0
  const inline = (value: unknown, depth: number): boolean => {
    if (!value || typeof value !== 'object' || depth > 12 || ++visited > 2_000_000) return false
    if (Array.isArray(value)) return value.some(item => inline(item, depth + 1))
    const item = value as Record<string, unknown>
    if (typeof item.texture === 'string' && item.texture && typeof item.textureAsset !== 'string') return true
    return Object.values(item).some(child => typeof child === 'object' && inline(child, depth + 1))
  }
  for (const scene of scenes) if (inline(scene.entities, 0)) throw new PlayerCompatibilityRequired('inline entity textures')
}

/** Reads project settings into the Runtime singletons a Player owns and returns the rest as values. */
export function readPlayerProjectValues(project: Record<string, unknown>): PlayerProjectValues {
  const settings = record(project.projectSettings)
  const inputMap = normalizeInputMap(settings.inputMap)
  loadDeviceInputSettings(settings.deviceInput)
  const audioSettings = normalizeAudioSettings(settings.audio)
  Object.assign(scriptProjectSettings, normalizeScriptSettings(settings.scripting))
  // The project's physics settings use the shared scene-record decoder (no entities are built here).
  const physicsHolder = { globalSettings: defaultGlobalPhysicsSettings() }
  const sceneData = createRuntimeSceneData({
    state: physicsHolder,
    createEntityFromData() { throw new Error('PLAYER_PROJECT_SETTINGS_BUILD_NO_ENTITIES') },
    normalizeIdentifier(value, fallback = 1) { const number = Number(value); return Number.isFinite(number) ? Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(number))) : fallback }
  })
  sceneData.loadPhysicsProjectSettings(settings.physics)
  loadProductionSettings(settings.production)
  const presentation = record(settings.presentation)
  loadRuntimeAccessibilitySettings(presentation.accessibility)
  loadUiAudioSettings(presentation.uiAudio)
  const rendering = new RuntimeRenderingPolicyOwner(createInitialRuntimeRenderingPolicyState())
  rendering.loadRenderingSettings(settings.rendering)
  const sceneRecords = (Array.isArray(project.scenes) ? project.scenes : [{ uuid: normalizeUuid(undefined), name: 'Main Scene', ...project }]).filter((scene): scene is Record<string, unknown> => !!scene && typeof scene === 'object')
  assertPlayerSceneCompatibility(sceneRecords)
  const requested = typeof project.activeSceneUuid === 'string' ? project.activeSceneUuid : ''
  const build = readPlayerBuildValues(settings.build)
  // Exports write the startup scene as the document's active scene; otherwise the first scene starts.
  const activeSceneUuid = requested && sceneRecords.some(scene => scene.uuid === requested) ? requested : String(sceneRecords[0]?.uuid ?? '')
  const camera = new Camera()
  return {
    settings, packages: readInstalledPackages(project.packages), build, rendering,
    localizationSettings: presentation.localization,
    sceneRecords, activeSceneUuid,
    initialState: {
      camera, globalSettings: physicsHolder.globalSettings, playMode: 'playing',
      engineDiagnostics: { bodyCount: 0, connectionCount: 0, stepsLastFrame: 0, totalPhysicsSteps: 0, interpolationAlpha: 0, droppedSeconds: 0, eventCount: 0, configurationRebuilds: 0 },
      inputMap, audioSettings
    }
  }
}

/** Runtime World configuration from the read values (the legacy Player captured the same fields from stores). */
export function playerWorldConfiguration(values: PlayerProjectValues, project: Record<string, unknown>, catalog: RuntimeProjectCatalog<AssetRecord>, log: (message: string, level: 'error' | 'warning' | 'info') => void): { configuration: RuntimeWorldConfiguration; pluginState: PluginRuntimeState } {
  const production = serializeProductionSettings()
  const world = Object.assign(createInitialWorldGameplayState(), normalizeWorldGameplaySettings(values.settings.world))
  const presentation = createInitialRuntimePresentationState()
  presentation.accessibility = serializeRuntimeAccessibilitySettings()
  presentation.uiAudio = serializeUiAudioSettings()
  // Plugin manifests through the shared Owner algorithms; this Player never fetches or approves anything new.
  const pluginState: PluginRuntimeState = { manifests: [], active: 0, errors: [], safeMode: false, activePluginIds: [], safeModeRecommended: false, contributions: [], generation: 0, reloads: 0, unloads: 0, isolatedFailures: 0 }
  const plugins = createPluginRuntimeOwner({
    state: pluginState, log: (message, _category, level) => log(message, level), clock: performance, crypto: globalThis.crypto,
    atob: value => globalThis.atob(value), assetReference: uuid => `asset://${uuid}`, resolveAsset: reference => catalog.resolveAsset(reference),
    fetch: source => globalThis.fetch(source)
  })
  plugins.loadPluginManifests(project.plugins)
  const configuration: RuntimeWorldConfiguration = {
    projectId: catalog.projectId,
    enabledPackageIds: values.packages.filter(item => item.enabled && item.project).map(item => item.id),
    aiEnabled: packageEnabledIn(values.packages, OFFICIAL_AI_PACKAGE_ID), objectPoolEnabled: packageEnabledIn(values.packages, OFFICIAL_OBJECT_POOL_PACKAGE_ID),
    networkPackageId: OFFICIAL_NETWORKING_PACKAGE_ID, world, presentation,
    replay: production.replay, network: { networking: production.networking, replay: production.replay }, save: production.data,
    plugins: plugins.serializePluginManifests(), pluginSafeMode: false, pluginSafeModeRecommended: false,
    frameWorkBudgetMs: production.performance.frameWorkBudgetMs, streamingBudgetMs: production.performance.streamingBudgetMs,
    particleBudget: values.rendering.state.activeRenderQuality.particleBudget, adaptiveParticleScale: performanceRuntimeState.adaptiveParticleScale
  }
  return { configuration, pluginState }
}
