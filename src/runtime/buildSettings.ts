import { reactive } from 'vue'
import { OFFICIAL_ANDROID_PACKAGE_ID, packageEnabled } from './packages'
import { platformSupport } from './platformSupport'

export type BuildTarget = 'windows' | 'linux' | 'macos' | 'web' | 'android'
export type BuildArchitecture = 'x86_64' | 'aarch64'
export type BuildRuntimeMode = 'game' | 'headless-server'
export type BuildProfile = 'debug' | 'release'
export type BuildOrientation = 'auto' | 'landscape' | 'portrait'
export type BuildCompression = 'store' | 'balanced' | 'maximum'
export type SigningMode = 'none' | 'manual'
export type BuildCacheMode = 'clean' | 'incremental' | 'validate'

export interface BuildPlatformOptions {
  identifier: string
  version: string
  iconAsset: string | null
  splashAsset: string | null
  orientation: BuildOrientation
  permissions: string[]
  signingMode: SigningMode
  signingIdentity: string
  notarizationProfile: string
  manifestAsset: string | null
  versionMetadata: Record<string, string>
}

export interface BuildDeliveryOptions {
  deterministic: boolean
  incremental: boolean
  compression: BuildCompression
  patchManifest: boolean
  structuredLogs: boolean
  crashReports: boolean
  telemetryEnabled: boolean
  telemetryEndpoint: string
  privacyPolicyUrl: string
  cacheMode: BuildCacheMode
  include: string[]
  exclude: string[]
  stripUnusedAssets: boolean
  sizeReport: boolean
  dependencyReport: boolean
  debugSymbols: boolean
  crashSymbols: boolean
}

export interface BuildSettings {
  gameName: string
  target: BuildTarget
  architecture: BuildArchitecture
  runtimeMode: BuildRuntimeMode
  profile: BuildProfile
  sceneOrder: string[]
  startupSceneUuid: string
  packageIntoExecutable: boolean
  developmentBuild: boolean
  outputDirectory: string
  presetName: string
  platform: BuildPlatformOptions
  delivery: BuildDeliveryOptions
}

export type BuildIssueSeverity = 'error' | 'warning' | 'info'
export interface BuildIssue { code: string; severity: BuildIssueSeverity; message: string }

export interface ExportCapabilities {
  host: 'windows' | 'linux' | 'macos' | 'unknown'
  architecture: BuildArchitecture | 'unknown'
  androidAvailable: boolean
  androidReason: string
}

export interface BuildProgress {
  phase: 'idle' | 'validating' | 'packing' | 'exporting' | 'complete' | 'failed'
  message: string
  percent: number
  outputPath: string
  cacheHits: number
  changedFiles: number
}

export interface BuildPreset { id: string; name: string; target: BuildTarget; profile: BuildProfile; runtimeMode: BuildRuntimeMode; cacheMode: BuildCacheMode; compression: BuildCompression; stripUnusedAssets: boolean }
export interface BuildHistoryEntry { id: string; startedAt: string; finishedAt: string; target: BuildTarget; profile: BuildProfile; status: 'complete' | 'failed'; outputPath: string; buildId: string; sizeBytes: number; message: string }

export const BUILTIN_BUILD_PRESETS: readonly BuildPreset[] = Object.freeze([
  Object.freeze({ id: 'windows-release', name: 'Windows release', target: 'windows', profile: 'release', runtimeMode: 'game', cacheMode: 'validate', compression: 'maximum', stripUnusedAssets: true }),
  Object.freeze({ id: 'web-release', name: 'Web release', target: 'web', profile: 'release', runtimeMode: 'game', cacheMode: 'validate', compression: 'maximum', stripUnusedAssets: true }),
  Object.freeze({ id: 'desktop-debug', name: 'Desktop debug', target: 'windows', profile: 'debug', runtimeMode: 'game', cacheMode: 'incremental', compression: 'store', stripUnusedAssets: false }),
  Object.freeze({ id: 'headless-server', name: 'Headless server', target: 'windows', profile: 'release', runtimeMode: 'headless-server', cacheMode: 'clean', compression: 'maximum', stripUnusedAssets: true })
])

function loadBuildHistory(): BuildHistoryEntry[] {
  if (typeof localStorage === 'undefined') return []
  try { const value = JSON.parse(localStorage.getItem('nova_a.build_history.v1') ?? '[]'); return Array.isArray(value) ? value.slice(0, 50) : [] } catch { return [] }
}

export const buildHistory = reactive(loadBuildHistory()) as BuildHistoryEntry[]

const DEFAULT_CAPABILITIES: ExportCapabilities = {
  host: typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 'windows'
    : typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac') ? 'macos'
      : typeof navigator !== 'undefined' && navigator.platform ? 'linux' : 'unknown',
  architecture: 'unknown', androidAvailable: false, androidReason: 'Android export toolchain has not been detected.'
}

const BUILD_LOCAL_KEY = 'nova_a.build_local.v1'
function localBuildSettings(): { outputDirectory: string; signingIdentity: string; notarizationProfile: string } {
  if (typeof localStorage === 'undefined') return { outputDirectory: '', signingIdentity: '', notarizationProfile: '' }
  try { const value = JSON.parse(localStorage.getItem(BUILD_LOCAL_KEY) ?? '{}') as Record<string, unknown>; return { outputDirectory: text(value.outputDirectory, 1_024), signingIdentity: text(value.signingIdentity, 240), notarizationProfile: text(value.notarizationProfile, 240) } } catch { return { outputDirectory: '', signingIdentity: '', notarizationProfile: '' } }
}
const buildLocal = localBuildSettings()

export const exportCapabilities = reactive<ExportCapabilities>({ ...DEFAULT_CAPABILITIES })

export const buildSettings = reactive<BuildSettings>({
  gameName: 'MyGame',
  target: DEFAULT_CAPABILITIES.host === 'unknown' ? 'web' : DEFAULT_CAPABILITIES.host,
  architecture: 'x86_64',
  runtimeMode: 'game',
  profile: 'debug',
  sceneOrder: [],
  startupSceneUuid: '',
  packageIntoExecutable: false,
  developmentBuild: true,
  outputDirectory: buildLocal.outputDirectory,
  presetName: 'desktop-debug',
  platform: {
    identifier: 'top.whitelists.mygame', version: '1.0.0', iconAsset: null, splashAsset: null,
    orientation: 'auto', permissions: [], signingMode: 'none', signingIdentity: buildLocal.signingIdentity, notarizationProfile: buildLocal.notarizationProfile,
    manifestAsset: null, versionMetadata: {}
  },
  delivery: {
    deterministic: true, incremental: true, compression: 'balanced', patchManifest: true,
    structuredLogs: true, crashReports: false, telemetryEnabled: false, telemetryEndpoint: '', privacyPolicyUrl: '',
    cacheMode: 'incremental', include: ['Assets/**'], exclude: ['**/*.psd', '**/*.kra', '.nova/**'], stripUnusedAssets: false,
    sizeReport: true, dependencyReport: true, debugSymbols: true, crashSymbols: true
  }
})

export const buildProgress = reactive<BuildProgress>({
  phase: 'idle', message: '', percent: 0, outputPath: '', cacheHits: 0, changedFiles: 0
})

function safeName(value: unknown): string {
  const normalized = String(value ?? '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim().slice(0, 80)
  return normalized || 'MyGame'
}

function text(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }
function bool(value: unknown, fallback: boolean): boolean { return typeof value === 'boolean' ? value : fallback }
function stringList(value: unknown, maximum = 64): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim().slice(0, 120)).filter(Boolean))].slice(0, maximum) : []
}
function slug(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.+|\.+$/g, '') || 'game' }

export function normalizeBuildSettings(source: unknown, availableSceneUuids: string[]): BuildSettings {
  const item = source && typeof source === 'object' ? source as Partial<BuildSettings> : {}
  const platform = item.platform && typeof item.platform === 'object' ? item.platform as Partial<BuildPlatformOptions> : {}
  const delivery = item.delivery && typeof item.delivery === 'object' ? item.delivery as Partial<BuildDeliveryOptions> : {}
  const available = new Set(availableSceneUuids)
  const ordered = Array.isArray(item.sceneOrder)
    ? item.sceneOrder.filter((uuid): uuid is string => typeof uuid === 'string' && available.has(uuid))
    : []
  for (const uuid of availableSceneUuids) if (!ordered.includes(uuid)) ordered.push(uuid)
  const startup = typeof item.startupSceneUuid === 'string' && available.has(item.startupSceneUuid) ? item.startupSceneUuid : ordered[0] ?? ''
  const target: BuildTarget = item.target === 'windows' || item.target === 'linux' || item.target === 'macos' || item.target === 'web' || item.target === 'android' ? item.target : buildSettings.target
  const metadata: Record<string, string> = {}
  if (platform.versionMetadata && typeof platform.versionMetadata === 'object' && !Array.isArray(platform.versionMetadata)) for (const [key, value] of Object.entries(platform.versionMetadata)) if (typeof value === 'string' && key.trim()) metadata[key.trim().slice(0, 80)] = value.trim().slice(0, 300)
  const gameName = safeName(item.gameName)
  const developmentBuild = item.profile === 'release' ? false : item.profile === 'debug' ? true : item.developmentBuild !== false
  return {
    gameName, target,
    architecture: item.architecture === 'aarch64' ? 'aarch64' : 'x86_64',
    runtimeMode: item.runtimeMode === 'headless-server' ? 'headless-server' : 'game',
    profile: developmentBuild ? 'debug' : 'release',
    sceneOrder: ordered, startupSceneUuid: startup,
    packageIntoExecutable: item.packageIntoExecutable === true,
    developmentBuild,
    outputDirectory: text(item.outputDirectory, 1024) || buildLocal.outputDirectory, presetName: text(item.presetName, 80) || 'custom',
    platform: {
      identifier: text(platform.identifier, 160) || `top.whitelists.${slug(gameName)}`,
      version: text(platform.version, 40) || '1.0.0',
      iconAsset: typeof platform.iconAsset === 'string' ? platform.iconAsset.slice(0, 160) : null,
      splashAsset: typeof platform.splashAsset === 'string' ? platform.splashAsset.slice(0, 160) : null,
      orientation: platform.orientation === 'landscape' || platform.orientation === 'portrait' ? platform.orientation : 'auto',
      permissions: stringList(platform.permissions),
      signingMode: platform.signingMode === 'manual' ? 'manual' : 'none',
      signingIdentity: text(platform.signingIdentity, 240) || buildLocal.signingIdentity, notarizationProfile: text(platform.notarizationProfile, 240) || buildLocal.notarizationProfile,
      manifestAsset: typeof platform.manifestAsset === 'string' ? platform.manifestAsset.slice(0, 160) : null, versionMetadata: metadata
    },
    delivery: {
      deterministic: bool(delivery.deterministic, true), incremental: bool(delivery.incremental, true),
      compression: delivery.compression === 'store' || delivery.compression === 'maximum' ? delivery.compression : 'balanced',
      patchManifest: bool(delivery.patchManifest, true), structuredLogs: bool(delivery.structuredLogs, true),
      crashReports: bool(delivery.crashReports, false), telemetryEnabled: bool(delivery.telemetryEnabled, false),
      telemetryEndpoint: text(delivery.telemetryEndpoint, 500), privacyPolicyUrl: text(delivery.privacyPolicyUrl, 500),
      cacheMode: delivery.cacheMode === 'clean' || delivery.cacheMode === 'validate' ? delivery.cacheMode : 'incremental',
      include: stringList(delivery.include, 128), exclude: stringList(delivery.exclude, 128),
      stripUnusedAssets: bool(delivery.stripUnusedAssets, false), sizeReport: bool(delivery.sizeReport, true), dependencyReport: bool(delivery.dependencyReport, true),
      debugSymbols: bool(delivery.debugSymbols, true), crashSymbols: bool(delivery.crashSymbols, true)
    }
  }
}

export function synchronizeBuildScenes(availableSceneUuids: string[]): void {
  Object.assign(buildSettings, normalizeBuildSettings(buildSettings, availableSceneUuids))
}

export function serializeBuildSettings(availableSceneUuids = buildSettings.sceneOrder): BuildSettings {
  const shared = normalizeBuildSettings(buildSettings, availableSceneUuids)
  shared.outputDirectory = ''; shared.platform.signingIdentity = ''; shared.platform.notarizationProfile = ''
  return shared
}

export function persistBuildLocalSettings(): void {
  try { localStorage.setItem(BUILD_LOCAL_KEY, JSON.stringify({ outputDirectory: buildSettings.outputDirectory.slice(0, 1_024), signingIdentity: buildSettings.platform.signingIdentity.slice(0, 240), notarizationProfile: buildSettings.platform.notarizationProfile.slice(0, 240) })) } catch { /* User-local build preferences are best effort. */ }
}

export function setBuildProfile(profile: BuildProfile): void {
  buildSettings.profile = profile
  buildSettings.developmentBuild = profile === 'debug'
}

export function applyBuildPreset(id: string): boolean {
  const preset = BUILTIN_BUILD_PRESETS.find(item => item.id === id)
  if (!preset) return false
  buildSettings.presetName = preset.id; buildSettings.target = preset.target; buildSettings.runtimeMode = preset.runtimeMode
  buildSettings.delivery.cacheMode = preset.cacheMode; buildSettings.delivery.incremental = preset.cacheMode !== 'clean'
  buildSettings.delivery.compression = preset.compression; buildSettings.delivery.stripUnusedAssets = preset.stripUnusedAssets
  setBuildProfile(preset.profile); return true
}

export function recordBuildHistory(entry: BuildHistoryEntry): void {
  buildHistory.unshift({ ...entry, message: entry.message.slice(0, 500), outputPath: entry.outputPath.slice(0, 1_024) })
  if (buildHistory.length > 50) buildHistory.splice(50)
  try { localStorage.setItem('nova_a.build_history.v1', JSON.stringify(buildHistory)) } catch { /* Build history is user-local and best effort. */ }
}

export function validateBuildSettings(settings: BuildSettings, capabilities = exportCapabilities): BuildIssue[] {
  const issues: BuildIssue[] = []
  const support = platformSupport(settings.target)
  if (support.tier === 'unsupported') issues.push({ code: 'platform-unsupported', severity: 'error', message: `${support.label} is Unsupported: ${support.reason}` })
  else if (support.tier === 'experimental') issues.push({ code: 'platform-experimental', severity: 'warning', message: `${support.label} is Experimental: ${support.reason}` })
  if (!support.architectures.includes(settings.architecture)) issues.push({ code: 'platform-architecture', severity: 'error', message: `${support.label} does not declare ${settings.architecture} support.` })
  if (!settings.sceneOrder.length || !settings.startupSceneUuid) issues.push({ code: 'scene', severity: 'error', message: 'Add at least one scene and choose a startup scene.' })
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(settings.platform.identifier)) issues.push({ code: 'identifier', severity: 'error', message: 'Application identifier must use reverse-domain format.' })
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(settings.platform.version)) issues.push({ code: 'version', severity: 'error', message: 'Application version must use semantic versioning.' })
  if (settings.target === 'android' && !capabilities.androidAvailable) issues.push({ code: 'android', severity: 'error', message: capabilities.androidReason || 'Android export is unavailable on this machine.' })
  if (settings.target === 'android' && !packageEnabled(OFFICIAL_ANDROID_PACKAGE_ID)) issues.push({ code: 'android-package', severity: 'error', message: 'Install and enable the optional Nova Android Export package.' })
  if (settings.target !== 'web' && settings.target !== 'android' && capabilities.host !== 'unknown' && settings.target !== capabilities.host) issues.push({ code: 'host', severity: 'error', message: `${settings.target} export requires a ${settings.target} host or matching CI runner.` })
  if (settings.target !== 'web' && capabilities.architecture !== 'unknown' && settings.architecture !== capabilities.architecture) issues.push({ code: 'architecture', severity: 'error', message: `${settings.architecture} export requires a matching player template; this editor is ${capabilities.architecture}.` })
  if (settings.runtimeMode === 'headless-server' && (settings.target === 'web' || settings.target === 'android')) issues.push({ code: 'headless', severity: 'error', message: 'Headless authoritative servers require a desktop target.' })
  if (settings.packageIntoExecutable && (settings.target === 'web' || settings.target === 'macos' || settings.target === 'android')) issues.push({ code: 'single-file', severity: 'error', message: 'Single-file packaging is unavailable for this target.' })
  if (settings.platform.signingMode === 'manual' && !settings.platform.signingIdentity) issues.push({ code: 'signing', severity: 'warning', message: 'Signing is enabled but no certificate/profile identity is configured.' })
  if (settings.delivery.telemetryEnabled) {
    if (!/^https:\/\//i.test(settings.delivery.telemetryEndpoint)) issues.push({ code: 'telemetry-endpoint', severity: 'error', message: 'Opt-in telemetry requires an HTTPS endpoint.' })
    if (!/^https:\/\//i.test(settings.delivery.privacyPolicyUrl)) issues.push({ code: 'privacy', severity: 'error', message: 'Opt-in telemetry requires an HTTPS privacy-policy URL.' })
  }
  if (settings.profile === 'release' && settings.developmentBuild) issues.push({ code: 'profile', severity: 'error', message: 'Release profile cannot include development diagnostics.' })
  if (!settings.delivery.deterministic) issues.push({ code: 'reproducibility', severity: 'warning', message: 'Deterministic build metadata is disabled.' })
  if (settings.profile === 'release' && settings.delivery.cacheMode === 'incremental' && !settings.delivery.deterministic) issues.push({ code: 'release-cache', severity: 'error', message: 'Release incremental builds require deterministic output or a validated clean cache.' })
  if (!settings.delivery.include.length) issues.push({ code: 'include-rules', severity: 'warning', message: 'No explicit content inclusion rule is configured.' })
  return issues
}

export async function detectExportCapabilities(): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    Object.assign(exportCapabilities, await invoke<ExportCapabilities>('export_capabilities'))
  } catch { /* Browser/default capabilities remain safe and conservative. */ }
}
