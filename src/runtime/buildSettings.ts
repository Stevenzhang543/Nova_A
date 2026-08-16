import { reactive } from 'vue'
import { OFFICIAL_ANDROID_PACKAGE_ID, packageEnabled } from './packages'

export type BuildTarget = 'windows' | 'linux' | 'macos' | 'web' | 'android'
export type BuildArchitecture = 'x86_64' | 'aarch64'
export type BuildRuntimeMode = 'game' | 'headless-server'
export type BuildProfile = 'debug' | 'release'
export type BuildOrientation = 'auto' | 'landscape' | 'portrait'
export type BuildCompression = 'store' | 'balanced' | 'maximum'
export type SigningMode = 'none' | 'manual'

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

const DEFAULT_CAPABILITIES: ExportCapabilities = {
  host: typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('win') ? 'windows'
    : typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac') ? 'macos'
      : typeof navigator !== 'undefined' && navigator.platform ? 'linux' : 'unknown',
  architecture: 'unknown', androidAvailable: false, androidReason: 'Android export toolchain has not been detected.'
}

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
  outputDirectory: '',
  platform: {
    identifier: 'top.whitelists.mygame', version: '1.0.0', iconAsset: null, splashAsset: null,
    orientation: 'auto', permissions: [], signingMode: 'none', signingIdentity: '', notarizationProfile: ''
  },
  delivery: {
    deterministic: true, incremental: true, compression: 'balanced', patchManifest: true,
    structuredLogs: true, crashReports: true, telemetryEnabled: false, telemetryEndpoint: '', privacyPolicyUrl: ''
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
    outputDirectory: text(item.outputDirectory, 1024),
    platform: {
      identifier: text(platform.identifier, 160) || `top.whitelists.${slug(gameName)}`,
      version: text(platform.version, 40) || '1.0.0',
      iconAsset: typeof platform.iconAsset === 'string' ? platform.iconAsset.slice(0, 160) : null,
      splashAsset: typeof platform.splashAsset === 'string' ? platform.splashAsset.slice(0, 160) : null,
      orientation: platform.orientation === 'landscape' || platform.orientation === 'portrait' ? platform.orientation : 'auto',
      permissions: stringList(platform.permissions),
      signingMode: platform.signingMode === 'manual' ? 'manual' : 'none',
      signingIdentity: text(platform.signingIdentity, 240), notarizationProfile: text(platform.notarizationProfile, 240)
    },
    delivery: {
      deterministic: bool(delivery.deterministic, true), incremental: bool(delivery.incremental, true),
      compression: delivery.compression === 'store' || delivery.compression === 'maximum' ? delivery.compression : 'balanced',
      patchManifest: bool(delivery.patchManifest, true), structuredLogs: bool(delivery.structuredLogs, true),
      crashReports: bool(delivery.crashReports, true), telemetryEnabled: bool(delivery.telemetryEnabled, false),
      telemetryEndpoint: text(delivery.telemetryEndpoint, 500), privacyPolicyUrl: text(delivery.privacyPolicyUrl, 500)
    }
  }
}

export function synchronizeBuildScenes(availableSceneUuids: string[]): void {
  Object.assign(buildSettings, normalizeBuildSettings(buildSettings, availableSceneUuids))
}

export function serializeBuildSettings(): BuildSettings {
  return normalizeBuildSettings(buildSettings, buildSettings.sceneOrder)
}

export function setBuildProfile(profile: BuildProfile): void {
  buildSettings.profile = profile
  buildSettings.developmentBuild = profile === 'debug'
}

export function validateBuildSettings(settings: BuildSettings, capabilities = exportCapabilities): BuildIssue[] {
  const issues: BuildIssue[] = []
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
  return issues
}

export async function detectExportCapabilities(): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    Object.assign(exportCapabilities, await invoke<ExportCapabilities>('export_capabilities'))
  } catch { /* Browser/default capabilities remain safe and conservative. */ }
}
