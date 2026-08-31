import { reactive } from 'vue'
import { NOVA_PACKAGE_MANIFEST_VERSION } from './stableContracts'

const PACKAGE_ENGINE_VERSION = '6.4.0'

export { NOVA_PACKAGE_MANIFEST_VERSION }
export type PackageSourceKind = 'local' | 'git' | 'registry'
export type PackageEntryPointType = 'editor' | 'build' | 'importer' | 'runtime' | 'template'
export type PackageSecurityStatus = 'verified' | 'unverified' | 'quarantined'
export type PluginApiCertification = 'certified' | 'compatible' | 'uncertified'
export type PackageVisualValueType = 'Boolean' | 'Number' | 'String' | 'Vec2' | 'Entity' | 'Resource' | 'Data'
export interface PackageVisualNode {
  id: string
  title: string
  category: string
  description: string
  callable: string
  inputs: Array<{ name: string; valueType: PackageVisualValueType; defaultValue: unknown }>
  output: { name: string; valueType: PackageVisualValueType } | null
  deprecatedBy: string
}

export interface PackageSource { kind: PackageSourceKind; location: string }
export interface PackageManifest {
  manifestVersion: number
  id: string
  name: string
  version: string
  description: string
  engine: string
  dependencies: Record<string, string>
  dependencyHashes: Record<string, string>
  entryPointType: PackageEntryPointType
  apiCompatibility: string
  pluginApi: number | null
  native: boolean
  sha256: string
  signature: string
  publisher: string
  publisherVerified: boolean
  permissions: string[]
  rating: number | null
  securityUrl: string
  documentationUrl: string
  license: string
  licenseUrl: string
  provenance: string
  certification: PluginApiCertification
  vulnerabilityPolicy: string
  visualNodes: PackageVisualNode[]
}
export interface InstalledPackage {
  manifest: PackageManifest
  source: PackageSource
  enabled: boolean
  project: boolean
  installedAt: number
  securityStatus: PackageSecurityStatus
  grantedPermissions: string[]
  deprecations: string[]
}
export interface PackageLockEntry { id: string; version: string; source: PackageSource; sha256: string; signature: string; entryPointType: PackageEntryPointType; dependencies: Record<string, string> }
export interface QuarantinedPackage { id: string; version: string; reason: string; quarantinedAt: number }

export const PACKAGE_PERMISSION_CATALOG = Object.freeze([
  'log', 'events', 'editor.commands', 'editor.menus', 'editor.panels', 'editor.docks', 'editor.importers', 'editor.assets', 'editor.components', 'editor.inspectors', 'editor.gizmos', 'editor.settings', 'editor.graph-nodes',
  'render.passes', 'build.hooks', 'build.steps', 'build.android-sdk', 'project.templates', 'runtime.systems',
  'project.read', 'project.write', 'assets.read', 'assets.write', 'network.client', 'network.listen', 'process.spawn', 'gpu.render-pass'
])
const allowedPackagePermissions = new Set<string>(PACKAGE_PERMISSION_CATALOG)

export const packageState = reactive({
  installed: [] as InstalledPackage[],
  lockfile: [] as PackageLockEntry[],
  offlineCache: [] as PackageManifest[],
  offlineMode: true,
  releaseChannel: 'stable' as 'stable' | 'preview',
  allowUnverified: false,
  quarantine: [] as QuarantinedPackage[],
  rollback: {} as Record<string, PackageManifest[]>,
  selectedStatus: 'installed' as 'installed' | 'project' | 'updates' | 'incompatible' | 'disabled',
  errors: [] as string[],
  registryQuery: '',
  selectedRegistry: 'official',
  registries: [
    { id: 'official', name: 'Nova_A Official', location: 'https://packages.nova-a.dev/v1', trusted: true, offlineMirror: true, policy: 'pinned-publisher-and-sha256', allowStable: true },
    { id: 'local', name: 'Local mirror', location: '', trusted: false, offlineMirror: true, policy: 'local-review-required', allowStable: false }
  ],
  registryCatalog: [] as PackageManifest[],
  vulnerabilityPolicy: 'block-critical-high' as 'block-critical-high' | 'warn-only',
  lastCacheVerification: '',
  publisherTrust: [] as Array<{ publisher: string; fingerprint: string; packageId: string; verifiedAt: string }>
})

const verifiedPublisherPackages = new Set<string>()
function publisherPackageKey(manifest: PackageManifest): string { return `${manifest.id}@${manifest.version}:${manifest.sha256}:${manifest.signature}:${manifest.publisher}` }
export function markPublisherPackageVerified(manifest: PackageManifest, fingerprint: string): void {
  if (!/^[a-f0-9]{16,64}$/.test(fingerprint) || !manifest.signature.startsWith('ed25519-v1:')) throw new Error('Publisher verification metadata is invalid.')
  manifest.publisherVerified = true
  verifiedPublisherPackages.add(publisherPackageKey(manifest))
  if (!packageState.publisherTrust.some(item => item.publisher === manifest.publisher && item.fingerprint === fingerprint && item.packageId === manifest.id)) packageState.publisherTrust.push({ publisher: manifest.publisher, fingerprint, packageId: manifest.id, verifiedAt: new Date().toISOString() })
  const cached = packageState.registryCatalog.find(item => item.id === manifest.id && item.version === manifest.version && item.sha256 === manifest.sha256)
  if (cached) { cached.publisherVerified = true; cached.signature = manifest.signature }
}

export const OFFICIAL_NAVIGATION_PACKAGE_ID = 'top.whitelists.novaa.navigation'
export const OFFICIAL_AI_PACKAGE_ID = 'top.whitelists.novaa.ai'
export const OFFICIAL_OBJECT_POOL_PACKAGE_ID = 'top.whitelists.novaa.object-pool'
export const OFFICIAL_STREAMING_TOOLS_PACKAGE_ID = 'top.whitelists.novaa.streaming-tools'
export const OFFICIAL_NETWORKING_PACKAGE_ID = 'top.whitelists.novaa.networking'
export const OFFICIAL_ANDROID_PACKAGE_ID = 'top.whitelists.novaa.android'

const OFFICIAL_METADATA = {
  publisher: 'Whitelist', publisherVerified: true, permissions: [] as string[], rating: 5,
  securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security',
  documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/',
  license: 'MIT', licenseUrl: 'https://github.com/Stevenzhang543/Nova_A/blob/main/LICENSE.md',
  provenance: 'nova-official-v1', certification: 'certified' as PluginApiCertification,
  vulnerabilityPolicy: 'Report privately through the Nova_A security policy; Critical/High findings block Stable installation.', visualNodes: [] as PackageVisualNode[]
}
function officialSecurity(type: PackageEntryPointType, sha256: string, dependencyHashes: Record<string, string> = {}) {
  return { entryPointType: type, apiCompatibility: '>=1 <2', dependencyHashes, sha256, signature: `nova-official-v1:${sha256}` }
}

const OFFICIAL_PACKAGES: Record<string, PackageManifest> = {
  [OFFICIAL_NAVIGATION_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_NAVIGATION_PACKAGE_ID, name: 'Nova Navigation 2D', version: '2.6.0',
    description: 'Grid/polygon navigation, agents, flow fields, avoidance, and dynamic rebaking.', engine: '>=2.6.0 <7.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', '26434adf10b122a8708afc496f682242d7f634a344bbd00f4699ff71b2e3a9ae'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_AI_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_AI_PACKAGE_ID, name: 'Nova AI Tools', version: '3.8.0',
    description: 'Optional serialized behavior trees and hierarchical state machines with deterministic debug traces.', engine: '>=3.8.0 <7.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', '11c75ccdc9f2037548e9eef31bd3ee34134a365e9eaeef741ee8e7917a69ac4e'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_OBJECT_POOL_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_OBJECT_POOL_PACKAGE_ID, name: 'Nova Object Pool', version: '3.8.0',
    description: 'Optional runtime object pools with reset contracts, bounded capacity, lifetime policies, reuse counters, and leak diagnostics.', engine: '>=3.8.0 <7.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', '1bb0707fffc9aa16790924146797791413754147129750608f29360bd2ee4e86'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_STREAMING_TOOLS_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_STREAMING_TOOLS_PACKAGE_ID, name: 'Nova Streaming Tools', version: '3.8.0',
    description: 'Optional authoring helpers and diagnostics for the core asynchronous world-cell runtime.', engine: '>=3.8.0 <7.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('editor', 'fbd228b8e1b6f780487885dea93276958c978d2f13f117a7c654c78d630cb047'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_NETWORKING_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_NETWORKING_PACKAGE_ID, name: 'Nova Optional Networking', version: '2.9.0',
    description: 'Bounded WebSocket/native UDP transports, RPCs, snapshots, prediction, interpolation, rollback helpers, and multiplayer diagnostics.', engine: '>=2.9.0 <7.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', 'fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424'),
    ...OFFICIAL_METADATA, permissions: ['network.client', 'network.listen']
  },
  [OFFICIAL_ANDROID_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_ANDROID_PACKAGE_ID, name: 'Nova Android Export', version: '2.9.0',
    description: 'Optional Android export templates and validation. Requires a local Android SDK/JDK toolchain.', engine: '>=2.9.0 <7.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('build', 'cb2f4c6efb9bf972451cf545a4854878f8515ca327417424975ad2756349a5ca'),
    ...OFFICIAL_METADATA, permissions: ['build.android-sdk']
  }
}

packageState.registryCatalog.splice(
  0,
  packageState.registryCatalog.length,
  ...Object.values(OFFICIAL_PACKAGES).filter(manifest => manifest.id !== OFFICIAL_ANDROID_PACKAGE_ID)
)

export function packageEnabled(id: string): boolean {
  return packageState.installed.some(item => item.manifest.id === id && item.project && item.enabled)
}

export function enableOfficialPackage(id: typeof OFFICIAL_NAVIGATION_PACKAGE_ID | typeof OFFICIAL_AI_PACKAGE_ID | typeof OFFICIAL_OBJECT_POOL_PACKAGE_ID | typeof OFFICIAL_STREAMING_TOOLS_PACKAGE_ID | typeof OFFICIAL_NETWORKING_PACKAGE_ID | typeof OFFICIAL_ANDROID_PACKAGE_ID): boolean {
  const manifest = OFFICIAL_PACKAGES[id]
  if (!manifest) return false
  const existing = packageState.installed.find(item => item.manifest.id === id)
  if (existing) { existing.enabled = true; existing.project = true; resolvePackageLockfile(); return true }
  installPackageManifest(manifest, { kind: 'registry', location: 'Nova_A official offline package' })
  return true
}

function text(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }
function stringList(value: unknown, maximum = 64): string[] { return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string').map(item => item.trim().slice(0, 120)).filter(Boolean))].slice(0, maximum) : [] }
function validId(value: string): boolean { return /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(value) }
function sha256(value: unknown): string { const normalized = text(value, 64).toLowerCase(); return /^[a-f0-9]{64}$/.test(normalized) ? normalized : '' }

export function parseVersion(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

export function compareVersions(first: string, second: string): number {
  const a = parseVersion(first), b = parseVersion(second)
  if (!a || !b) return first.localeCompare(second)
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] - b[index]
  return 0
}

export function versionSatisfies(version: string, range: string): boolean {
  const parsed = parseVersion(version)
  if (!parsed) return false
  const normalized = range.trim()
  if (!normalized || normalized === '*') return true
  const satisfiesComparator = (comparator: string): boolean => {
    if (comparator.startsWith('^')) {
      const baseText = comparator.slice(1), base = parseVersion(baseText)
      if (!base || compareVersions(version, baseText) < 0) return false
      if (base[0] > 0) return parsed[0] === base[0]
      if (base[1] > 0) return parsed[0] === 0 && parsed[1] === base[1]
      return parsed[0] === 0 && parsed[1] === 0 && parsed[2] === base[2]
    }
    if (comparator.startsWith('~')) {
      const baseText = comparator.slice(1), base = parseVersion(baseText)
      return Boolean(base && parsed[0] === base[0] && parsed[1] === base[1] && compareVersions(version, baseText) >= 0)
    }
    if (comparator.startsWith('>=')) return compareVersions(version, comparator.slice(2)) >= 0
    if (comparator.startsWith('<=')) return compareVersions(version, comparator.slice(2)) <= 0
    if (comparator.startsWith('>')) return compareVersions(version, comparator.slice(1)) > 0
    if (comparator.startsWith('<')) return compareVersions(version, comparator.slice(1)) < 0
    return compareVersions(version, comparator) === 0
  }
  return normalized.split(/\s*\|\|\s*/).some(option => option.trim().split(/\s+/).filter(Boolean).every(satisfiesComparator))
}

export function normalizePackageManifest(value: unknown): PackageManifest {
  let source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const sourceId = text(source.id, 120), official = OFFICIAL_PACKAGES[sourceId]
  // Schema 28 official locks used symbolic digests. Hydrate only pinned first-party
  // IDs so existing projects migrate without weakening third-party verification.
  if (official && source.publisher === 'Whitelist' && source.publisherVerified === true) source = { ...official, ...source, ...(!sha256(source.sha256) ? { sha256: official.sha256, signature: official.signature } : {}), dependencyHashes: source.dependencyHashes ?? official.dependencyHashes, entryPointType: source.entryPointType ?? official.entryPointType, apiCompatibility: source.apiCompatibility ?? official.apiCompatibility }
  const id = text(source.id, 120), name = text(source.name, 120), version = text(source.version, 40)
  if (!validId(id)) throw new Error('Package ID must use reverse-domain style.')
  if (!name) throw new Error('Package name is required.')
  if (!parseVersion(version)) throw new Error('Package version must use semantic versioning.')
  const dependencies: Record<string, string> = {}
  if (source.dependencies && typeof source.dependencies === 'object' && !Array.isArray(source.dependencies)) {
    for (const [dependency, range] of Object.entries(source.dependencies as Record<string, unknown>)) {
      if (validId(dependency) && typeof range === 'string') dependencies[dependency] = range.slice(0, 80)
    }
  }
  const dependencyHashes: Record<string, string> = {}
  if (source.dependencyHashes && typeof source.dependencyHashes === 'object' && !Array.isArray(source.dependencyHashes)) for (const [dependency, digest] of Object.entries(source.dependencyHashes as Record<string, unknown>)) if (validId(dependency) && sha256(digest)) dependencyHashes[dependency] = sha256(digest)
  const entryPointType: PackageEntryPointType = source.entryPointType === 'editor' || source.entryPointType === 'build' || source.entryPointType === 'importer' || source.entryPointType === 'template' ? source.entryPointType : 'runtime'
  const allowedVisualTypes = new Set<PackageVisualValueType>(['Boolean', 'Number', 'String', 'Vec2', 'Entity', 'Resource', 'Data'])
  const visualNodes: PackageVisualNode[] = Array.isArray(source.visualNodes) ? source.visualNodes.slice(0, 256).flatMap((raw): PackageVisualNode[] => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>, nodeId = text(item.id, 120), callable = text(item.callable, 120)
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(nodeId) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(callable)) return []
    const inputs = Array.isArray(item.inputs) ? item.inputs.slice(0, 32).flatMap((rawInput): PackageVisualNode['inputs'] => {
      if (!rawInput || typeof rawInput !== 'object') return []
      const input = rawInput as Record<string, unknown>, name = text(input.name, 80), type = String(input.valueType) as PackageVisualValueType
      return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && allowedVisualTypes.has(type) ? [{ name, valueType: type, defaultValue: input.defaultValue ?? null }] : []
    }) : []
    const rawOutput = item.output && typeof item.output === 'object' ? item.output as Record<string, unknown> : null, outputType = String(rawOutput?.valueType ?? '') as PackageVisualValueType, outputName = text(rawOutput?.name, 80)
    const output = rawOutput && /^[A-Za-z_][A-Za-z0-9_]*$/.test(outputName) && allowedVisualTypes.has(outputType) ? { name: outputName, valueType: outputType } : null
    return [{ id: nodeId, title: text(item.title, 120) || nodeId, category: text(item.category, 80) || 'Libraries', description: text(item.description, 500), callable, inputs, output, deprecatedBy: text(item.deprecatedBy, 160) }]
  }) : []
  const permissions = stringList(source.permissions, 32)
  if (permissions.some(permission => !allowedPackagePermissions.has(permission))) throw new Error('Package requests an unsupported capability.')
  return {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id, name, version, description: text(source.description, 500),
    engine: text(source.engine, 80), dependencies, dependencyHashes, entryPointType, apiCompatibility: text(source.apiCompatibility, 80),
    pluginApi: Number(source.pluginApi) === 2 ? 2 : null, native: source.native === true,
    sha256: sha256(source.sha256), signature: text(source.signature, 1024),
    publisher: text(source.publisher, 120) || 'Unknown publisher', publisherVerified: source.publisherVerified === true,
    permissions, rating: Number.isFinite(Number(source.rating)) ? Math.min(5, Math.max(0, Number(source.rating))) : null,
    securityUrl: /^https:\/\//i.test(text(source.securityUrl, 500)) ? text(source.securityUrl, 500) : '',
    documentationUrl: /^https:\/\//i.test(text(source.documentationUrl, 500)) ? text(source.documentationUrl, 500) : '',
    license: text(source.license, 80), licenseUrl: /^https:\/\//i.test(text(source.licenseUrl, 500)) ? text(source.licenseUrl, 500) : '',
    provenance: text(source.provenance, 160),
    certification: source.certification === 'certified' || source.certification === 'compatible' ? source.certification : 'uncertified',
    vulnerabilityPolicy: text(source.vulnerabilityPolicy, 500), visualNodes
  }
}

export function packageManifestDeprecations(value: unknown): string[] {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return [
    !parseVersion(text(source.version, 40)) ? 'Missing or invalid semantic version.' : '',
    !text(source.engine, 80) ? 'Missing engine compatibility.' : '',
    !text(source.apiCompatibility, 80) ? 'Missing API compatibility.' : '',
    !Array.isArray(source.permissions) ? 'Missing permissions declaration.' : '',
    !text(source.license, 80) ? 'Missing package license.' : '',
    !text(source.provenance, 160) ? 'Missing package provenance.' : '',
    !(source.dependencyHashes && typeof source.dependencyHashes === 'object' && !Array.isArray(source.dependencyHashes)) ? 'Missing dependency hashes.' : '',
    !['editor', 'build', 'importer', 'runtime', 'template'].includes(String(source.entryPointType ?? '')) ? 'Missing or invalid entry-point type.' : ''
  ].filter(Boolean)
}

export interface PackageSecurityReview { status: PackageSecurityStatus; blocking: string[]; warnings: string[] }

export function reviewPackageSecurity(manifest: PackageManifest, candidates: readonly InstalledPackage[] = packageState.installed): PackageSecurityReview {
  const blocking: string[] = [], warnings: string[] = []
  if (!manifest.engine) blocking.push('Package manifest must declare engine compatibility.')
  if (!manifest.apiCompatibility) blocking.push('Package manifest must declare a package API compatibility range.')
  if (!manifest.sha256) blocking.push('Package archive SHA-256 is missing or malformed.')
  if (!manifest.license) blocking.push('Package license is missing.')
  if (!manifest.provenance) blocking.push('Package provenance is missing.')
  if (!manifest.vulnerabilityPolicy) warnings.push('Publisher vulnerability policy is not documented.')
  if (manifest.pluginApi !== null && manifest.certification === 'uncertified') warnings.push('Plugin API compatibility is not certified for this release.')
  const trustedRegistryEntry = packageState.registryCatalog.find(candidate =>
    candidate.id === manifest.id
    && candidate.version === manifest.version
    && candidate.sha256 === manifest.sha256
    && candidate.signature === manifest.signature
    && candidate.publisher === manifest.publisher
    && candidate.publisherVerified
  )
  const officialSignature = manifest.signature === `nova-official-v1:${manifest.sha256}` && manifest.publisherVerified && Boolean(trustedRegistryEntry)
  const reviewedPublisherSignature = manifest.publisherVerified && manifest.signature.startsWith('ed25519-v1:') && verifiedPublisherPackages.has(publisherPackageKey(manifest))
  if (!officialSignature && !reviewedPublisherSignature) blocking.push('Package signature is missing or cannot be verified by the Stable trust store.')
  for (const id of Object.keys(manifest.dependencies)) {
    if (!manifest.dependencyHashes[id]) blocking.push(`Dependency ${id} is missing a locked SHA-256 digest.`)
    const installed = candidates.find(item => item.manifest.id === id)
    if (installed && manifest.dependencyHashes[id] && installed.manifest.sha256 !== manifest.dependencyHashes[id]) blocking.push(`Dependency ${id} digest differs from the manifest lock.`)
  }
  if (manifest.native) warnings.push('Native entry points remain disabled and require external review.')
  const quarantined = packageState.quarantine.find(item => item.id === manifest.id && item.version === manifest.version)
  if (quarantined) blocking.push(`Package is quarantined: ${quarantined.reason}`)
  return { status: blocking.length ? quarantined ? 'quarantined' : 'unverified' : 'verified', blocking, warnings }
}

export function verifyPackageArchive(manifest: PackageManifest, archiveSha256: string): boolean {
  return Boolean(manifest.sha256 && sha256(archiveSha256) === manifest.sha256 && reviewPackageSecurity(manifest).status === 'verified')
}

export function quarantinePackage(manifest: PackageManifest, reason: string): void {
  if (!packageState.quarantine.some(item => item.id === manifest.id && item.version === manifest.version)) packageState.quarantine.push({ id: manifest.id, version: manifest.version, reason: reason.slice(0, 500), quarantinedAt: Date.now() })
  const installed = packageState.installed.find(item => item.manifest.id === manifest.id)
  if (installed) { installed.enabled = false; installed.securityStatus = 'quarantined' }
}

function normalizeSource(value: unknown): PackageSource {
  const source = value && typeof value === 'object' ? value as Partial<PackageSource> : {}
  return {
    kind: source.kind === 'git' || source.kind === 'registry' ? source.kind : 'local',
    location: text(source.location, 500) || 'local manifest'
  }
}

export function packageCompatibility(item: InstalledPackage, engineVersion = PACKAGE_ENGINE_VERSION, candidates: readonly InstalledPackage[] = packageState.installed): string[] {
  const problems: string[] = []
  problems.push(...reviewPackageSecurity(item.manifest, candidates).blocking)
  if (!versionSatisfies(engineVersion, item.manifest.engine)) problems.push(`Requires Nova_A ${item.manifest.engine}`)
  if (item.manifest.pluginApi !== null && item.manifest.pluginApi !== 2) problems.push(`Requires Plugin API ${item.manifest.pluginApi}`)
  for (const [id, range] of Object.entries(item.manifest.dependencies)) {
    const dependency = candidates.find(candidate => candidate.manifest.id === id && candidate.project)
    if (!dependency) problems.push(`Missing ${id} ${range}`)
    else if (!versionSatisfies(dependency.manifest.version, range)) problems.push(`${id} ${dependency.manifest.version} does not satisfy ${range}`)
  }
  if (item.manifest.native) problems.push('Native extension requires explicit external installation and is never executed by the package browser')
  return problems
}

export function registryPackages(query = packageState.registryQuery): PackageManifest[] {
  const needle = query.trim().toLocaleLowerCase()
  return packageState.registryCatalog.filter(manifest => !needle || `${manifest.name} ${manifest.id} ${manifest.description} ${manifest.publisher}`.toLocaleLowerCase().includes(needle))
}

/** Browsing is data-only. Installation happens only after an explicit UI action. */
export function installRegistryPackage(id: string): InstalledPackage {
  const manifest = packageState.registryCatalog.find(item => item.id === id)
  if (!manifest) throw new Error(`Package ${id} is not available in the selected registry or offline mirror.`)
  const registry = packageState.registries.find(item => item.id === packageState.selectedRegistry)
  if (!registry) throw new Error('The selected package registry is not configured.')
  if (packageState.releaseChannel === 'stable' && (!registry.trusted || !registry.allowStable)) throw new Error(`Stable installs are blocked by registry policy ${registry.policy}. Use a trusted pinned registry or remain in an isolated preview project.`)
  if (packageState.offlineMode && !registry.offlineMirror) throw new Error('Offline mode requires a verified local registry mirror.')
  return installPackageManifest(manifest, { kind: 'registry', location: packageState.selectedRegistry })
}

export interface PackageInstallReview {
  id: string
  version: string
  publisher: string
  publisherVerified: boolean
  sourcePolicy: string
  archiveSha256: string
  signature: string
  license: string
  provenance: string
  pluginApiCompatibility: string
  certification: PluginApiCertification
  permissions: string[]
  dependencies: Array<{ id: string; range: string; sha256: string }>
  blocking: string[]
  warnings: string[]
  executionAllowed: boolean
}

export function packageInstallReview(manifest: PackageManifest): PackageInstallReview {
  const security = reviewPackageSecurity(manifest)
  const registry = packageState.registries.find(item => item.id === packageState.selectedRegistry)
  const registryBlocked = packageState.releaseChannel === 'stable' && (!registry?.trusted || !registry.allowStable)
  const blocking = [...security.blocking, ...(registryBlocked ? [`Registry policy ${registry?.policy ?? 'missing'} does not permit Stable installation.`] : [])]
  return {
    id: manifest.id, version: manifest.version, publisher: manifest.publisher, publisherVerified: manifest.publisherVerified,
    sourcePolicy: registry?.policy ?? 'manifest-import', archiveSha256: manifest.sha256, signature: manifest.signature,
    license: manifest.license, provenance: manifest.provenance, pluginApiCompatibility: manifest.pluginApi === null ? manifest.apiCompatibility : `Plugin API ${manifest.pluginApi}`,
    certification: manifest.certification, permissions: [...manifest.permissions],
    dependencies: Object.entries(manifest.dependencies).map(([id, range]) => ({ id, range, sha256: manifest.dependencyHashes[id] ?? '' })).sort((a, b) => a.id.localeCompare(b.id)),
    blocking, warnings: [...security.warnings], executionAllowed: !blocking.length && !manifest.native
  }
}

export function addOfflineRegistryManifest(value: unknown): PackageManifest {
  const manifest = normalizePackageManifest(value)
  const index = packageState.registryCatalog.findIndex(item => item.id === manifest.id && item.version === manifest.version)
  if (index >= 0) packageState.registryCatalog.splice(index, 1, manifest); else packageState.registryCatalog.push(manifest)
  return manifest
}

export function resolvePackageLockfile(): PackageLockEntry[] {
  const projectPackages = packageState.installed.filter(item => item.project).sort((a, b) => a.manifest.id.localeCompare(b.manifest.id))
  const seen = new Set<string>(), stack = new Set<string>(), lock: PackageLockEntry[] = []
  const visit = (item: InstalledPackage) => {
    if (seen.has(item.manifest.id)) return
    if (stack.has(item.manifest.id)) throw new Error(`Circular package dependency at ${item.manifest.id}`)
    stack.add(item.manifest.id)
    for (const [id, range] of Object.entries(item.manifest.dependencies)) {
      const dependency = packageState.installed.find(candidate => candidate.manifest.id === id && candidate.project && versionSatisfies(candidate.manifest.version, range))
      if (!dependency) throw new Error(`Cannot resolve ${id} ${range}`)
      visit(dependency)
    }
    stack.delete(item.manifest.id); seen.add(item.manifest.id)
    lock.push({ id: item.manifest.id, version: item.manifest.version, source: { ...item.source }, sha256: item.manifest.sha256, signature: item.manifest.signature, entryPointType: item.manifest.entryPointType, dependencies: { ...item.manifest.dependencyHashes } })
  }
  projectPackages.forEach(visit)
  packageState.lockfile.splice(0, packageState.lockfile.length, ...lock)
  return lock
}

export function installPackageManifest(value: unknown, sourceValue?: unknown): InstalledPackage {
  const deprecations = packageManifestDeprecations(value)
  const manifest = normalizePackageManifest(value)
  const source = normalizeSource(sourceValue)
  const security = reviewPackageSecurity(manifest)
  if (packageState.releaseChannel === 'stable' && !packageState.allowUnverified && security.status !== 'verified') {
    quarantinePackage(manifest, security.blocking.join(' ') || 'Unverifiable package')
    throw new Error(`Stable channel blocked ${manifest.id}: ${security.blocking.join(' ')}`)
  }
  if (deprecations.length) throw new Error(`Package manifest is deprecated and cannot be installed: ${deprecations.join(' ')}`)
  if (!versionSatisfies(PACKAGE_ENGINE_VERSION, manifest.engine)) throw new Error(`Package ${manifest.id} requires Nova_A ${manifest.engine}; current engine is ${PACKAGE_ENGINE_VERSION}.`)
  if (manifest.pluginApi !== null && manifest.pluginApi !== 2) throw new Error(`Package ${manifest.id} requires unsupported Plugin API ${manifest.pluginApi}.`)
  for (const [dependencyId, range] of Object.entries(manifest.dependencies)) {
    const dependency = packageState.installed.find(candidate => candidate.manifest.id === dependencyId && candidate.project)
    if (!dependency) throw new Error(`Package ${manifest.id} requires missing dependency ${dependencyId} ${range}.`)
    if (!versionSatisfies(dependency.manifest.version, range)) throw new Error(`Package ${manifest.id} requires ${dependencyId} ${range}, but ${dependency.manifest.version} is installed.`)
    if (dependency.manifest.sha256 !== manifest.dependencyHashes[dependencyId]) throw new Error(`Package ${manifest.id} dependency hash does not match ${dependencyId}.`)
  }
  const existing = packageState.installed.findIndex(candidate => candidate.manifest.id === manifest.id)
  const cached = packageState.offlineCache.findIndex(candidate => candidate.id === manifest.id && candidate.version === manifest.version)
  if (cached >= 0) packageState.offlineCache.splice(cached, 1, manifest); else packageState.offlineCache.push(manifest)
  if (existing >= 0 && compareVersions(manifest.version, packageState.installed[existing].manifest.version) <= 0) return packageState.installed[existing]
  const item: InstalledPackage = { manifest, source, enabled: !manifest.native && security.status === 'verified', project: true, installedAt: Date.now(), securityStatus: security.status, grantedPermissions: [...manifest.permissions], deprecations }
  if (existing >= 0) packageState.installed.splice(existing, 1, item); else packageState.installed.push(item)
  try { resolvePackageLockfile() } catch (error) { packageState.errors.push(error instanceof Error ? error.message : String(error)) }
  return item
}

export function packageUpdate(item: InstalledPackage): PackageManifest | null {
  return packageState.offlineCache.filter(candidate => candidate.id === item.manifest.id && compareVersions(candidate.version, item.manifest.version) > 0).sort((a, b) => compareVersions(b.version, a.version))[0] ?? null
}

export function applyPackageUpdate(id: string): boolean {
  const index = packageState.installed.findIndex(item => item.manifest.id === id)
  if (index < 0) return false
  const update = packageUpdate(packageState.installed[index])
  if (!update) return false
  const current = packageState.installed[index]
  const security = reviewPackageSecurity(update)
  if (packageState.releaseChannel === 'stable' && !packageState.allowUnverified && security.status !== 'verified') { quarantinePackage(update, security.blocking.join(' ') || 'Unverifiable update'); return false }
  if (!versionSatisfies(PACKAGE_ENGINE_VERSION, update.engine)) { packageState.errors.push(`Update requires Nova_A ${update.engine}; current engine is ${PACKAGE_ENGINE_VERSION}.`); return false }
  for (const [dependencyId, range] of Object.entries(update.dependencies)) {
    const dependency = packageState.installed.find(candidate => candidate.manifest.id === dependencyId && candidate.project)
    if (!dependency || !versionSatisfies(dependency.manifest.version, range) || dependency.manifest.sha256 !== update.dependencyHashes[dependencyId]) { packageState.errors.push(`Update blocked by dependency ${dependencyId} ${range}.`); return false }
  }
  const addedPermissions = update.permissions.filter(permission => !current.grantedPermissions.includes(permission))
  if (addedPermissions.length) { packageState.errors.push(`Update blocked until permission review: ${addedPermissions.join(', ')}`); return false }
  const history = packageState.rollback[id] ?? (packageState.rollback[id] = [])
  history.unshift(current.manifest); if (history.length > 5) history.splice(5)
  packageState.installed.splice(index, 1, { ...current, manifest: update, securityStatus: security.status, installedAt: Date.now() })
  try { resolvePackageLockfile() } catch (error) {
    packageState.installed.splice(index, 1, current)
    history.shift()
    resolvePackageLockfile()
    packageState.errors.push(error instanceof Error ? error.message : String(error))
    return false
  }
  return true
}

export function approvePackageUpdatePermissions(id: string, permissions: string[]): boolean {
  const item = packageState.installed.find(candidate => candidate.manifest.id === id), update = item ? packageUpdate(item) : null
  if (!item || !update) return false
  const required = update.permissions.filter(permission => !item.grantedPermissions.includes(permission))
  if (required.some(permission => !permissions.includes(permission))) return false
  item.grantedPermissions = [...new Set([...item.grantedPermissions, ...required])]
  return applyPackageUpdate(id)
}

export function rollbackPackage(id: string): boolean {
  const item = packageState.installed.find(candidate => candidate.manifest.id === id), previous = packageState.rollback[id]?.shift()
  if (!item || !previous || reviewPackageSecurity(previous).status !== 'verified') return false
  item.manifest = previous; item.securityStatus = 'verified'; item.enabled = !previous.native; resolvePackageLockfile(); return true
}

export function verifyPackageCache(): string[] {
  const problems: string[] = []
  for (const manifest of packageState.offlineCache) {
    const review = reviewPackageSecurity(manifest)
    if (review.status !== 'verified') { problems.push(`${manifest.id}@${manifest.version}: ${review.blocking.join(' ')}`); quarantinePackage(manifest, review.blocking.join(' ')) }
  }
  packageState.lastCacheVerification = new Date().toISOString()
  return problems
}

export function packageUninstallImpact(id: string): string[] {
  return packageState.installed.filter(item => item.project && id in item.manifest.dependencies).map(item => `${item.manifest.name} depends on this package`)
}

export function uninstallPackage(id: string): boolean {
  if (packageUninstallImpact(id).length) return false
  const index = packageState.installed.findIndex(item => item.manifest.id === id)
  if (index < 0) return false
  packageState.installed.splice(index, 1)
  resolvePackageLockfile()
  return true
}

export function serializePackageState(): Record<string, unknown> {
  return {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION,
    installed: packageState.installed.map(item => ({ ...item, manifest: { ...item.manifest, dependencies: { ...item.manifest.dependencies } }, source: { ...item.source } })),
    lockfile: packageState.lockfile.map(item => ({ ...item, source: { ...item.source } })),
    offlineCache: packageState.offlineCache.map(item => ({ ...item, dependencies: { ...item.dependencies } })),
    offlineMode: packageState.offlineMode, quarantine: packageState.quarantine.map(item => ({ ...item }))
  }
}

export function loadPackageState(value: unknown): void {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const installed = Array.isArray(source.installed) ? source.installed.flatMap(raw => {
    try {
      const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
      const deprecations = [...new Set([...packageManifestDeprecations(item.manifest), ...stringList(item.deprecations)])]
      const manifest = normalizePackageManifest(item.manifest), security = reviewPackageSecurity(manifest), compatible = versionSatisfies(PACKAGE_ENGINE_VERSION, manifest.engine)
      const status: PackageSecurityStatus = deprecations.length || !compatible ? 'unverified' : security.status
      return [{ manifest, source: normalizeSource(item.source), enabled: item.enabled !== false && status === 'verified', project: item.project !== false, installedAt: Math.max(0, Number(item.installedAt) || 0), securityStatus: status, grantedPermissions: stringList(item.grantedPermissions ?? manifest.permissions), deprecations }]
    } catch { return [] }
  }) : []
  packageState.installed.splice(0, packageState.installed.length, ...installed)
  packageState.offlineCache.splice(0, packageState.offlineCache.length, ...(Array.isArray(source.offlineCache) ? source.offlineCache.flatMap(item => { try { return [normalizePackageManifest(item)] } catch { return [] } }) : []))
  packageState.offlineMode = source.offlineMode !== false
  packageState.quarantine.splice(0, packageState.quarantine.length, ...(Array.isArray(source.quarantine) ? source.quarantine.flatMap(raw => { const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}; const id = text(item.id, 120), version = text(item.version, 40); return validId(id) && parseVersion(version) ? [{ id, version, reason: text(item.reason, 500), quarantinedAt: Math.max(0, Number(item.quarantinedAt) || 0) }] : [] }) : []))
  packageState.errors.splice(0)
  try { resolvePackageLockfile() } catch (error) { packageState.errors.push(error instanceof Error ? error.message : String(error)) }
}
