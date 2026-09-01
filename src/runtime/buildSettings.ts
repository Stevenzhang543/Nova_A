import { reactive } from 'vue'
import { OFFICIAL_ANDROID_PACKAGE_ID, OFFICIAL_NETWORKING_PACKAGE_ID, packageEnabled } from './packages'
import { platformSupport } from './platformSupport'
import { productionSettings } from './production'
import { networkAuthenticationProviders, networkEncryptionGuidance, reviewedNetworkTransports } from './networkProduction'
import { defaultExportTemplateId, exportTemplateIssues, resolveExportTemplateId } from './exportTemplates'
import { refreshAndroidToolchain, validateAndroidPermissions } from './mobileDelivery'

export type BuildTarget = 'windows' | 'linux' | 'macos' | 'web' | 'android'
export type BuildArchitecture = 'x86_64' | 'aarch64'
export type BuildRuntimeMode = 'game' | 'headless-server'
export type BuildProfile = 'debug' | 'release'
export type BuildOrientation = 'auto' | 'landscape' | 'portrait'
export type BuildCompression = 'store' | 'balanced' | 'maximum'
export type SigningMode = 'none' | 'manual'
export type BuildCacheMode = 'clean' | 'incremental' | 'validate'
export type BuildReleaseChannel = 'stable' | 'beta' | 'development'
export type BuildDeploymentMode = 'local' | 'remote-hook'

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
  releaseChannel: BuildReleaseChannel
  exportTemplate: string
  provenance: boolean
  sbom: boolean
  webHeaders: boolean
  deploymentMode: BuildDeploymentMode
  deploymentDestination: string
  signingHook: string
  notarizationHook: string
  cleanMachineJob: boolean
  contentCache: boolean
  deltaBuilds: boolean
  ciMatrixVersion: number
  deploymentConnectorId: string
  deploymentPermissionGranted: boolean
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
export interface BuildIssue { code: string; severity: BuildIssueSeverity; message: string; helpTarget: string }

export function buildIssueHelpTarget(code: string): string {
  if (code.startsWith('platform-') || ['android', 'android-package', 'host', 'architecture'].includes(code)) return 'platform-support'
  if (code.startsWith('telemetry') || code === 'privacy') return 'security-privacy'
  if (code === 'scene' || code === 'include-rules') return 'project-health'
  return 'build-export'
}

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

export interface BuildPreset { id: string; name: string; target: BuildTarget; profile: BuildProfile; runtimeMode: BuildRuntimeMode; cacheMode: BuildCacheMode; compression: BuildCompression; stripUnusedAssets: boolean; releaseChannel?: BuildReleaseChannel; exportTemplate?: string }
export interface BuildHistoryEntry { id: string; startedAt: string; finishedAt: string; target: BuildTarget; profile: BuildProfile; status: 'complete' | 'failed'; outputPath: string; buildId: string; sizeBytes: number; message: string; durationMs?: number; inputsHash?: string; outputsHash?: string; cacheKey?: string; manifestPath?: string; log?: string[]; evidenceStatus?: 'passed' | 'warning' | 'blocked' }

export const BUILTIN_BUILD_PRESETS: readonly BuildPreset[] = Object.freeze([
  Object.freeze({ id: 'windows-release', name: 'Windows Tier-1 release', target: 'windows', profile: 'release', runtimeMode: 'game', cacheMode: 'validate', compression: 'maximum', stripUnusedAssets: true, releaseChannel: 'stable', exportTemplate: 'windows-x64-v1' }),
  Object.freeze({ id: 'web-release', name: 'Web Tier-1 release', target: 'web', profile: 'release', runtimeMode: 'game', cacheMode: 'validate', compression: 'maximum', stripUnusedAssets: true, releaseChannel: 'stable', exportTemplate: 'web-es2022-v1' }),
  Object.freeze({ id: 'desktop-debug', name: 'Windows development', target: 'windows', profile: 'debug', runtimeMode: 'game', cacheMode: 'incremental', compression: 'store', stripUnusedAssets: false, releaseChannel: 'development', exportTemplate: 'windows-x64-v1' }),
  Object.freeze({ id: 'headless-server', name: 'Windows headless server', target: 'windows', profile: 'release', runtimeMode: 'headless-server', cacheMode: 'clean', compression: 'maximum', stripUnusedAssets: true, releaseChannel: 'beta', exportTemplate: 'windows-headless-x64-v1' }),
  Object.freeze({ id: 'linux-ci', name: 'Linux matching-host CI', target: 'linux', profile: 'release', runtimeMode: 'game', cacheMode: 'clean', compression: 'maximum', stripUnusedAssets: true, releaseChannel: 'beta', exportTemplate: 'linux-x64-experimental-v1' }),
  Object.freeze({ id: 'macos-ci', name: 'macOS matching-host CI', target: 'macos', profile: 'release', runtimeMode: 'game', cacheMode: 'clean', compression: 'maximum', stripUnusedAssets: true, releaseChannel: 'beta', exportTemplate: 'macos-universal-experimental-v1' })
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
  packageIntoExecutable: DEFAULT_CAPABILITIES.host === 'windows' || DEFAULT_CAPABILITIES.host === 'linux',
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
    sizeReport: true, dependencyReport: true, debugSymbols: true, crashSymbols: true,
    releaseChannel: 'development', exportTemplate: 'windows-x64-v1', provenance: true, sbom: true, webHeaders: true,
    deploymentMode: 'local', deploymentDestination: '', signingHook: '', notarizationHook: '', cleanMachineJob: false,
    contentCache: true, deltaBuilds: true, ciMatrixVersion: 1, deploymentConnectorId: 'local', deploymentPermissionGranted: false
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
  const architecture: BuildArchitecture = item.architecture === 'aarch64' ? 'aarch64' : 'x86_64'
  const runtimeMode: BuildRuntimeMode = item.runtimeMode === 'headless-server' ? 'headless-server' : 'game'
  const metadata: Record<string, string> = {}
  if (platform.versionMetadata && typeof platform.versionMetadata === 'object' && !Array.isArray(platform.versionMetadata)) for (const [key, value] of Object.entries(platform.versionMetadata)) if (typeof value === 'string' && key.trim()) metadata[key.trim().slice(0, 80)] = value.trim().slice(0, 300)
  const gameName = safeName(item.gameName)
  const developmentBuild = item.profile === 'release' ? false : item.profile === 'debug' ? true : item.developmentBuild !== false
  return {
    gameName, target,
    architecture,
    runtimeMode,
    profile: developmentBuild ? 'debug' : 'release',
    sceneOrder: ordered, startupSceneUuid: startup,
    packageIntoExecutable: typeof item.packageIntoExecutable === 'boolean' ? item.packageIntoExecutable : target === 'windows' || target === 'linux',
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
      debugSymbols: bool(delivery.debugSymbols, true), crashSymbols: bool(delivery.crashSymbols, true),
      releaseChannel: delivery.releaseChannel === 'stable' || delivery.releaseChannel === 'beta' ? delivery.releaseChannel : 'development',
      exportTemplate: resolveExportTemplateId(text(delivery.exportTemplate, 160), target, architecture, runtimeMode),
      provenance: bool(delivery.provenance, true), sbom: bool(delivery.sbom, true), webHeaders: bool(delivery.webHeaders, true),
      deploymentMode: delivery.deploymentMode === 'remote-hook' ? 'remote-hook' : 'local',
      deploymentDestination: text(delivery.deploymentDestination, 500), signingHook: text(delivery.signingHook, 500), notarizationHook: text(delivery.notarizationHook, 500),
      cleanMachineJob: bool(delivery.cleanMachineJob, false), contentCache: bool(delivery.contentCache, true), deltaBuilds: bool(delivery.deltaBuilds, true),
      ciMatrixVersion: Number(delivery.ciMatrixVersion) === 1 ? 1 : 1, deploymentConnectorId: text(delivery.deploymentConnectorId, 80) || 'local', deploymentPermissionGranted: bool(delivery.deploymentPermissionGranted, false)
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
  buildSettings.delivery.releaseChannel = preset.releaseChannel ?? (preset.profile === 'release' ? 'beta' : 'development')
  buildSettings.delivery.exportTemplate = preset.exportTemplate ?? defaultExportTemplateId(preset.target, buildSettings.architecture, preset.runtimeMode)
  buildSettings.packageIntoExecutable = preset.target === 'windows' || preset.target === 'linux'
  setBuildProfile(preset.profile); return true
}

export function recordBuildHistory(entry: BuildHistoryEntry): void {
  buildHistory.unshift({ ...entry, message: entry.message.slice(0, 500), outputPath: entry.outputPath.slice(0, 1_024) })
  if (buildHistory.length > 50) buildHistory.splice(50)
  try { localStorage.setItem('nova_a.build_history.v1', JSON.stringify(buildHistory)) } catch { /* Build history is user-local and best effort. */ }
}

export function validateBuildSettings(settings: BuildSettings, capabilities = exportCapabilities): BuildIssue[] {
  const issues: Array<Omit<BuildIssue, 'helpTarget'>> = []
  const support = platformSupport(settings.target)
  if (support.tier === 'unsupported') issues.push({ code: 'platform-unsupported', severity: 'error', message: `${support.label} is Unsupported: ${support.reason}` })
  else if (support.tier === 'experimental') issues.push({ code: 'platform-experimental', severity: 'warning', message: `${support.label} is Experimental: ${support.reason}` })
  if (support.availability === 'unavailable') issues.push({ code: 'platform-unavailable', severity: 'error', message: `${support.label} export is explicitly unavailable: ${support.reason}` })
  if (support.availability === 'ci-only' && settings.delivery.releaseChannel === 'stable') issues.push({ code: 'platform-not-tier1', severity: 'error', message: `${support.label} is matching-host CI-only and cannot use the Stable release channel until ${support.evidence} passes.` })
  if (!support.architectures.includes(settings.architecture)) issues.push({ code: 'platform-architecture', severity: 'error', message: `${support.label} does not declare ${settings.architecture} support.` })
  if (!settings.sceneOrder.length || !settings.startupSceneUuid) issues.push({ code: 'scene', severity: 'error', message: 'Add at least one scene and choose a startup scene.' })
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(settings.platform.identifier)) issues.push({ code: 'identifier', severity: 'error', message: 'Application identifier must use reverse-domain format.' })
  if (!/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(settings.platform.version)) issues.push({ code: 'version', severity: 'error', message: 'Application version must use semantic versioning.' })
  if (settings.target === 'android' && !capabilities.androidAvailable) issues.push({ code: 'android', severity: 'error', message: capabilities.androidReason || 'Android export is unavailable on this machine.' })
  if (settings.target === 'android' && !packageEnabled(OFFICIAL_ANDROID_PACKAGE_ID)) issues.push({ code: 'android-package', severity: 'error', message: 'Install and enable the optional Nova Android Export package.' })
  if (settings.target !== 'web' && settings.target !== 'android' && capabilities.host !== 'unknown' && settings.target !== capabilities.host) issues.push({ code: 'host', severity: 'error', message: `${settings.target} export requires a ${settings.target} host or matching CI runner.` })
  if (settings.target === 'android') {
    const purposes = Object.fromEntries(settings.platform.permissions.map(permission => [permission, settings.platform.versionMetadata[`permissionPurpose.${permission}`] ?? '']))
    for (const issue of validateAndroidPermissions(settings.platform.permissions, purposes)) issues.push({ code: `android-${issue.code.toLocaleLowerCase()}`, severity: issue.severity, message: `${issue.permission}: ${issue.message}` })
    if (settings.platform.signingMode === 'manual' && !settings.platform.signingIdentity) issues.push({ code: 'android-signing', severity: 'error', message: 'Manual Android release signing requires an existing keystore path; passwords and alias are read only from the documented environment variables.' })
  }

  if (settings.target !== 'web' && settings.target !== 'android' && capabilities.architecture !== 'unknown' && settings.architecture !== capabilities.architecture) issues.push({ code: 'architecture', severity: 'error', message: `${settings.architecture} export requires a matching player template; this editor is ${capabilities.architecture}.` })
  if (settings.runtimeMode === 'headless-server' && (settings.target === 'web' || settings.target === 'android')) issues.push({ code: 'headless', severity: 'error', message: 'Headless authoritative servers require a desktop target.' })
  if (productionSettings.networking.enabled && !packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID)) issues.push({ code: 'network-package', severity: 'error', message: 'Networked builds require the reviewed optional Nova Networking package.' })
  if (productionSettings.networking.enabled && !productionSettings.networking.permissionGranted) issues.push({ code: 'network-permission', severity: 'error', message: 'Networked builds require an explicit project network permission.' })
  if (productionSettings.networking.enabled && productionSettings.networking.transportAdapterId && !reviewedNetworkTransports().some(adapter => adapter.id === productionSettings.networking.transportAdapterId)) issues.push({ code: 'network-adapter', severity: 'error', message: `Reviewed transport adapter ${productionSettings.networking.transportAdapterId} is not registered.` })
  if (productionSettings.networking.enabled && productionSettings.networking.authentication.mode === 'hook' && !networkAuthenticationProviders().some(provider => provider.id === productionSettings.networking.authentication.providerId)) issues.push({ code: 'network-authentication', severity: 'error', message: `Authentication provider ${productionSettings.networking.authentication.providerId || '(empty)'} is not registered.` })
  if (productionSettings.networking.enabled && productionSettings.networking.authentication.requireVerifiedPeers && productionSettings.networking.authentication.mode !== 'hook') issues.push({ code: 'network-verification', severity: 'error', message: 'Verified peers require a reviewed authentication hook.' })
  if (productionSettings.networking.enabled) { const selectedAdapter = reviewedNetworkTransports().find(adapter => adapter.id === productionSettings.networking.transportAdapterId), guidance = networkEncryptionGuidance(productionSettings.networking, selectedAdapter?.encrypted === true); if (guidance.severity === 'error') issues.push({ code: 'network-encryption', severity: 'error', message: guidance.message }); else if (guidance.severity === 'warning') issues.push({ code: 'network-encryption', severity: 'warning', message: guidance.message }) }
  if (settings.runtimeMode === 'headless-server' && !productionSettings.networking.enabled) issues.push({ code: 'headless-network', severity: 'error', message: 'The headless server preset requires networking to be enabled explicitly.' })
  if (settings.runtimeMode === 'headless-server' && !['server', 'host'].includes(productionSettings.networking.role)) issues.push({ code: 'headless-authority', severity: 'error', message: 'Headless servers require the Server or Host authority role.' })
  if (settings.runtimeMode === 'headless-server' && productionSettings.networking.transport !== 'native-udp' && !productionSettings.networking.transportAdapterId) issues.push({ code: 'headless-transport', severity: 'error', message: 'Authoritative headless servers require native UDP or a reviewed transport adapter.' })
  if (settings.packageIntoExecutable && (settings.target === 'web' || settings.target === 'macos' || settings.target === 'android')) issues.push({ code: 'single-file', severity: 'error', message: 'Single-file packaging is unavailable for this target.' })
  if (!settings.packageIntoExecutable && (settings.target === 'windows' || settings.target === 'linux')) issues.push({ code: 'sidecar-player', severity: 'info', message: 'This desktop build will contain a player and a separate game.nova-pak. Enable single-file packaging for one portable application.' })
  if (settings.platform.signingMode === 'manual' && !settings.platform.signingIdentity) issues.push({ code: 'signing', severity: 'warning', message: 'Signing is enabled but no certificate/profile identity is configured.' })
  if (settings.delivery.telemetryEnabled) {
    if (!/^https:\/\//i.test(settings.delivery.telemetryEndpoint)) issues.push({ code: 'telemetry-endpoint', severity: 'error', message: 'Opt-in telemetry requires an HTTPS endpoint.' })
    if (!/^https:\/\//i.test(settings.delivery.privacyPolicyUrl)) issues.push({ code: 'privacy', severity: 'error', message: 'Opt-in telemetry requires an HTTPS privacy-policy URL.' })
  }
  if (settings.profile === 'release' && settings.developmentBuild) issues.push({ code: 'profile', severity: 'error', message: 'Release profile cannot include development diagnostics.' })
  if (!settings.delivery.deterministic) issues.push({ code: 'reproducibility', severity: 'warning', message: 'Deterministic build metadata is disabled.' })
  if (settings.profile === 'release' && !settings.delivery.provenance) issues.push({ code: 'provenance', severity: 'error', message: 'Release builds require a provenance manifest.' })
  if (settings.profile === 'release' && !settings.delivery.sbom) issues.push({ code: 'sbom', severity: 'warning', message: 'Enable the software bill of materials for auditable release dependencies.' })
  if (settings.delivery.deploymentMode === 'remote-hook' && !/^https:\/\//i.test(settings.delivery.deploymentDestination)) issues.push({ code: 'remote-deploy', severity: 'error', message: 'Remote deployment requires an explicit HTTPS destination. Nova_A never deploys implicitly.' })
  if (settings.delivery.deploymentMode === 'remote-hook' && !settings.delivery.deploymentPermissionGranted) issues.push({ code: 'remote-deploy-permission', severity: 'error', message: 'Remote deployment requires an explicit project permission; configuring a URL never triggers a network request.' })
  if (settings.target === 'web' && settings.profile === 'release' && !settings.delivery.webHeaders) issues.push({ code: 'web-headers', severity: 'warning', message: 'Enable generated deployment headers for safe MIME, caching and browser policy defaults.' })
  if (settings.delivery.releaseChannel === 'stable' && settings.profile !== 'release') issues.push({ code: 'stable-debug', severity: 'error', message: 'Stable channel outputs must use the Release profile.' })
  if (!settings.delivery.exportTemplate.trim()) issues.push({ code: 'export-template', severity: 'error', message: 'Choose a version-pinned export template.' })
  for (const [index, message] of exportTemplateIssues(settings.delivery.exportTemplate, settings.target, settings.architecture, settings.runtimeMode, capabilities).entries()) issues.push({ code: `export-template-${index}`, severity: 'error', message })
  if (settings.delivery.deltaBuilds && !settings.delivery.patchManifest) issues.push({ code: 'delta-manifest', severity: 'warning', message: 'Delta builds require the patch manifest to describe added, changed and removed content.' })
  if (settings.profile === 'release' && settings.delivery.cacheMode === 'incremental' && !settings.delivery.deterministic) issues.push({ code: 'release-cache', severity: 'error', message: 'Release incremental builds require deterministic output or a validated clean cache.' })
  if (!settings.delivery.include.length) issues.push({ code: 'include-rules', severity: 'warning', message: 'No explicit content inclusion rule is configured.' })
  return issues.map(issue => ({ ...issue, helpTarget: buildIssueHelpTarget(issue.code) }))
}

export async function detectExportCapabilities(): Promise<void> {
  if (!('__TAURI_INTERNALS__' in window)) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    Object.assign(exportCapabilities, await invoke<ExportCapabilities>('export_capabilities'))
  } catch { /* Browser/default capabilities remain safe and conservative. */ }
    await refreshAndroidToolchain()
}
