/** 项目包管理：规范包清单与依赖，安装、启用及移除包并校验使用边界。 */
import { reactive } from 'vue'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'
import { NOVA_PACKAGE_MANIFEST_VERSION } from './stableContracts'

// Package compatibility must follow the single project-format authority. Keeping
// a release number here caused current-engine packages to be evaluated as if an
// older Nova_A build were running.
const PACKAGE_ENGINE_VERSION = NOVA_ENGINE_VERSION

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
export interface PackageRevocation { id: string; version: string; sha256: string; reason: string; advisoryId: string; revokedAt: string }
export interface PackageVulnerability { advisoryId: string; id: string; affected: string; severity: 'low' | 'moderate' | 'high' | 'critical'; summary: string; fixedVersion: string; publishedAt: string }
export interface PackageSolverStep { packageId: string; version: string; requestedBy: string; requirement: string; status: 'selected' | 'reused' | 'blocked'; detail: string }
export interface PackageSolverDiagnostic { status: 'resolved' | 'blocked'; roots: string[]; steps: PackageSolverStep[]; errors: string[]; lockfile: PackageLockEntry[] }

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
  ,revocations: [] as PackageRevocation[]
  ,vulnerabilities: [] as PackageVulnerability[]
  ,lastSecurityBulletin: ''
  ,lastSolverDiagnostic: null as PackageSolverDiagnostic | null
})

export type PackageLifecycleAction = 'enable' | 'disable' | 'uninstall' | 'update' | 'rollback'
const packageLifecycleListeners = new Set<(id: string, action: PackageLifecycleAction) => void>()
/** 结构说明（自动提取）：onPackageLifecycle；输入 listener；直接调用 packageLifecycleListeners.add。 */ export function onPackageLifecycle(listener: (id: string, action: PackageLifecycleAction) => void): () => void { packageLifecycleListeners.add(listener); return /** 执行时调用 packageLifecycleListeners.delete(listener)；不显式返回调用结果。 */ () => { packageLifecycleListeners.delete(listener) } }
/** 包状态已提交后逐个通知订阅者；隔离外部回调异常，避免把成功提交误报为失败或漏通知后续消费者。 */
function notifyPackageLifecycle(id: string, action: PackageLifecycleAction): void {
  for (const listener of [...packageLifecycleListeners]) {
    try { listener(id, action) }
    catch (error) {
      packageState.errors.push(`Package ${id} ${action} committed; consumer notification failed: ${error instanceof Error ? error.message : String(error)}`)
      if (packageState.errors.length > 100) packageState.errors.splice(0, packageState.errors.length - 100)
    }
  }
}
/** 结构说明（自动提取）：setPackageEnabled；输入 id、enabled；直接调用 packageState.installed.find、packageCompatibility、notifyPackageLifecycle；写入 item.enabled。 */ export function setPackageEnabled(id: string, enabled: boolean): boolean {
  if (typeof enabled !== 'boolean') return false
  const item = packageState.installed.find(/* 比较 candidate.manifest.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.manifest.id === id)
  if (!item || enabled && (item.manifest.native || item.securityStatus !== 'verified' || packageCompatibility(item).length > 0)) return false
  item.enabled = enabled
  notifyPackageLifecycle(id, enabled ? 'enable' : 'disable')
  return true
}
const verifiedPublisherPackages = new Set<string>()
/* 调用 JSON.stringify(normalizePackageManifest(manifest)) 并返回调用结果。 */ function publisherPackageKey(manifest: PackageManifest): string { return JSON.stringify(normalizePackageManifest(manifest)) }
// Official archive identity and operational metadata are stable across legacy copy edits.
/* 调用 JSON.stringify({ ...normalizePackageManifest(manifest), description: '', vulnerabilityPolicy: '' }) 并返回调用结果。 */ function officialRegistryPackageKey(manifest: PackageManifest): string { return JSON.stringify({ ...normalizePackageManifest(manifest), description: '', vulnerabilityPolicy: '' }) }
/** 结构说明（自动提取）：markPublisherPackageVerified；输入 manifest、fingerprint；直接调用 test、manifest.signature.startsWith、Error、verifiedPublisherPackages.add、publisherPackageKey 等；写入 manifest.publisherVerified、cached.publisherVerified、cached.signature；包含显式抛错路径。 */ export function markPublisherPackageVerified(manifest: PackageManifest, fingerprint: string): void {
  if (!/^[a-f0-9]{16,64}$/.test(fingerprint) || !manifest.signature.startsWith('ed25519-v1:')) throw new Error('Publisher verification metadata is invalid.')
  manifest.publisherVerified = true
  verifiedPublisherPackages.add(publisherPackageKey(manifest))
  if (!packageState.publisherTrust.some(/* 先计算 item.publisher === manifest.publisher && item.fingerprint === fingerprint；仅当其为真值时求右侧 item.packageId === manifest.id，返回短路求值结果。 */ item => item.publisher === manifest.publisher && item.fingerprint === fingerprint && item.packageId === manifest.id)) packageState.publisherTrust.push({ publisher: manifest.publisher, fingerprint, packageId: manifest.id, verifiedAt: new Date().toISOString() })
  const cached = packageState.registryCatalog.find(/* 先计算 item.id === manifest.id && item.version === manifest.version；仅当其为真值时求右侧 item.sha256 === manifest.sha256，返回短路求值结果。 */ item => item.id === manifest.id && item.version === manifest.version && item.sha256 === manifest.sha256)
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
/* 返回具有所列字段的新对象 { entryPointType: type, apiCompatibility: '>=1 <2', dependencyHashes, sha256, signature: `nova-official-v1:${sha256}` }。 */ function officialSecurity(type: PackageEntryPointType, sha256: string, dependencyHashes: Record<string, string> = {}) {
  return { entryPointType: type, apiCompatibility: '>=1 <2', dependencyHashes, sha256, signature: `nova-official-v1:${sha256}` }
}

const OFFICIAL_PACKAGES: Record<string, PackageManifest> = {
  [OFFICIAL_NAVIGATION_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_NAVIGATION_PACKAGE_ID, name: 'Nova Navigation 2D', version: '2.6.0',
    description: 'Grid/polygon navigation, agents, flow fields, avoidance, and dynamic rebaking.', engine: '>=2.6.0 <27.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', '26434adf10b122a8708afc496f682242d7f634a344bbd00f4699ff71b2e3a9ae'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_AI_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_AI_PACKAGE_ID, name: 'Nova AI Tools', version: '3.8.0',
    description: 'Optional serialized behavior trees and hierarchical state machines with deterministic debug traces.', engine: '>=3.8.0 <27.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', '11c75ccdc9f2037548e9eef31bd3ee34134a365e9eaeef741ee8e7917a69ac4e'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_OBJECT_POOL_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_OBJECT_POOL_PACKAGE_ID, name: 'Nova Object Pool', version: '3.8.0',
    description: 'Optional runtime object pools with reset contracts, bounded capacity, lifetime policies, reuse counters, and leak diagnostics.', engine: '>=3.8.0 <27.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', '1bb0707fffc9aa16790924146797791413754147129750608f29360bd2ee4e86'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_STREAMING_TOOLS_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_STREAMING_TOOLS_PACKAGE_ID, name: 'Nova Streaming Tools', version: '3.8.0',
    description: 'Optional authoring helpers and diagnostics for the core asynchronous world-cell runtime.', engine: '>=3.8.0 <27.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('editor', 'fbd228b8e1b6f780487885dea93276958c978d2f13f117a7c654c78d630cb047'), ...OFFICIAL_METADATA
  },
  [OFFICIAL_NETWORKING_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_NETWORKING_PACKAGE_ID, name: 'Nova Optional Networking', version: '2.9.0',
    description: 'Bounded WebSocket/native UDP transports, RPCs, snapshots, prediction, interpolation, rollback helpers, and multiplayer diagnostics.', engine: '>=2.9.0 <27.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('runtime', 'fd048525377499fbd054cb74b69d5369c57d11431951695d413ec1e14cfe3424'),
    ...OFFICIAL_METADATA, permissions: ['network.client', 'network.listen']
  },
  [OFFICIAL_ANDROID_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_ANDROID_PACKAGE_ID, name: 'Nova Android Export', version: '6.7.0',
    description: 'Optional Android export templates and validation. Requires a local Android SDK/JDK toolchain.', engine: '>=2.9.0 <27.0.0', dependencies: {},
    pluginApi: null, native: false, ...officialSecurity('build', 'cb2f4c6efb9bf972451cf545a4854878f8515ca327417424975ad2756349a5ca'),
    ...OFFICIAL_METADATA, permissions: ['build.android-sdk']
  }
}

packageState.registryCatalog.splice(
  0,
  packageState.registryCatalog.length,
  ...Object.values(OFFICIAL_PACKAGES)
)

/* 调用 packageState.installed.some(item => item.manifest.id === id && item.project && item.enabled) 并返回调用结果。 */ export function packageEnabled(id: string): boolean {
  return packageState.installed.some(/* 先计算 item.manifest.id === id && item.project；仅当其为真值时求右侧 item.enabled，返回短路求值结果。 */ item => item.manifest.id === id && item.project && item.enabled)
}

/** 结构说明（自动提取）：enableOfficialPackage；输入 id；直接调用 packageState.installed.find、packageState.installed.map、packageCompatibility、diagnosePackageResolution、packageState.lockfile.splice 等；写入 existing.enabled、existing.project。 */ export function enableOfficialPackage(id: typeof OFFICIAL_NAVIGATION_PACKAGE_ID | typeof OFFICIAL_AI_PACKAGE_ID | typeof OFFICIAL_OBJECT_POOL_PACKAGE_ID | typeof OFFICIAL_STREAMING_TOOLS_PACKAGE_ID | typeof OFFICIAL_NETWORKING_PACKAGE_ID | typeof OFFICIAL_ANDROID_PACKAGE_ID): boolean {
  const manifest = OFFICIAL_PACKAGES[id]
  if (!manifest) return false
  const existing = packageState.installed.find(/* 比较 item.manifest.id 与 id，返回严格相等的判断结果。 */ item => item.manifest.id === id)
  if (existing) {
    const candidate = { ...existing, enabled: true, project: true }
    const candidates = packageState.installed.map(/* 根据 item === existing 的真假，分别返回 candidate 或 item。 */ item => item === existing ? candidate : item)
    if (existing.securityStatus !== 'verified' || packageCompatibility(candidate, PACKAGE_ENGINE_VERSION, candidates).length) return false
    const diagnostic = diagnosePackageResolution(candidates)
    if (diagnostic.status === 'blocked') return false
    existing.enabled = true; existing.project = true
    packageState.lockfile.splice(0, packageState.lockfile.length, ...diagnostic.lockfile)
    notifyPackageLifecycle(id, 'enable')
    return true
  }
  installPackageManifest(manifest, { kind: 'registry', location: 'Nova_A official offline package' })
  return true
}

/* 根据 typeof value === 'string' 的真假，分别返回 value.trim().slice(0, maximum) 或 ''。 */ function text(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }
/** 结构说明（自动提取）：stringList；输入 value、maximum；直接调用 Array.isArray、slice、Set、filter、map 等。 */ function stringList(value: unknown, maximum = 64): string[] { return Array.isArray(value) ? [...new Set(value.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ (item): item is string => typeof item === 'string').map(/* 调用 item.trim().slice(0, 120) 并返回调用结果。 */ item => item.trim().slice(0, 120)).filter(Boolean))].slice(0, maximum) : [] }
/* 调用 /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(value) 并返回调用结果。 */ function validId(value: string): boolean { return /^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(value) }
/** 结构说明（自动提取）：sha256；输入 value；直接调用 toLowerCase、text、test。 */ function sha256(value: unknown): string { const normalized = text(value, 64).toLowerCase(); return /^[a-f0-9]{64}$/.test(normalized) ? normalized : '' }

/** 结构说明（自动提取）：parseVersion；输入 value；直接调用 exec、Number。 */ export function parseVersion(value: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(value)
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null
}

/** 结构说明（自动提取）：compareVersions；输入 first、second；直接调用 parseVersion、first.localeCompare；包含循环处理。 */ export function compareVersions(first: string, second: string): number {
  const a = parseVersion(first), b = parseVersion(second)
  if (!a || !b) return first.localeCompare(second)
  for (let index = 0; index < 3; index++) if (a[index] !== b[index]) return a[index] - b[index]
  return 0
}

/** 结构说明（自动提取）：versionSatisfies；输入 version、range；直接调用 parseVersion、range.trim、some、normalized.split。 */ export function versionSatisfies(version: string, range: string): boolean {
  const parsed = parseVersion(version)
  if (!parsed) return false
  const normalized = range.trim()
  if (!normalized || normalized === '*') return true
  const satisfiesComparator = /** 结构说明（自动提取）：satisfiesComparator；输入 comparator；直接调用 comparator.startsWith、comparator.slice、parseVersion、compareVersions、Boolean。 */ (comparator: string): boolean => {
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
  return normalized.split(/\s*\|\|\s*/).some(/* 调用 option.trim().split(/\s+/).filter(Boolean).every(satisfiesComparator) 并返回调用结果。 */ option => option.trim().split(/\s+/).filter(Boolean).every(satisfiesComparator))
}

/** 结构说明（自动提取）：normalizePackageManifest；输入 value；直接调用 text、sha256、validId、Error、parseVersion 等；写入 source、dependencies[…]、dependencyHashes[…]；包含循环处理；包含显式抛错路径。 */ export function normalizePackageManifest(value: unknown): PackageManifest {
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
  const visualNodes: PackageVisualNode[] = Array.isArray(source.visualNodes) ? source.visualNodes.slice(0, 256).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw；直接调用 text、test、Array.isArray、flatMap、item.inputs.slice 等。 */ (raw): PackageVisualNode[] => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>, nodeId = text(item.id, 120), callable = text(item.callable, 120)
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(nodeId) || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(callable)) return []
    const inputs = Array.isArray(item.inputs) ? item.inputs.slice(0, 32).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 rawInput；直接调用 text、String、test、allowedVisualTypes.has。 */ (rawInput): PackageVisualNode['inputs'] => {
      if (!rawInput || typeof rawInput !== 'object') return []
      const input = rawInput as Record<string, unknown>, name = text(input.name, 80), type = String(input.valueType) as PackageVisualValueType
      return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && allowedVisualTypes.has(type) ? [{ name, valueType: type, defaultValue: input.defaultValue ?? null }] : []
    }) : []
    const rawOutput = item.output && typeof item.output === 'object' ? item.output as Record<string, unknown> : null, outputType = String(rawOutput?.valueType ?? '') as PackageVisualValueType, outputName = text(rawOutput?.name, 80)
    const output = rawOutput && /^[A-Za-z_][A-Za-z0-9_]*$/.test(outputName) && allowedVisualTypes.has(outputType) ? { name: outputName, valueType: outputType } : null
    return [{ id: nodeId, title: text(item.title, 120) || nodeId, category: text(item.category, 80) || 'Libraries', description: text(item.description, 500), callable, inputs, output, deprecatedBy: text(item.deprecatedBy, 160) }]
  }) : []
  const permissions = stringList(source.permissions, 32)
  if (permissions.some(/* 返回 allowedPackagePermissions.has(permission) 的逻辑取反结果。 */ permission => !allowedPackagePermissions.has(permission))) throw new Error('Package requests an unsupported capability.')
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

/** 结构说明（自动提取）：packageManifestDeprecations；输入 value；直接调用 filter、parseVersion、text、Array.isArray、includes 等。 */ export function packageManifestDeprecations(value: unknown): string[] {
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

/** 结构说明（自动提取）：reviewPackageSecurity；输入 manifest、candidates；直接调用 blocking.push、warnings.push、packageState.registryCatalog.find、Boolean、manifest.signature.startsWith 等；包含循环处理。 */ export function reviewPackageSecurity(manifest: PackageManifest, candidates: readonly InstalledPackage[] = packageState.installed): PackageSecurityReview {
  const blocking: string[] = [], warnings: string[] = []
  if (!manifest.engine) blocking.push('Package manifest must declare engine compatibility.')
  if (!manifest.apiCompatibility) blocking.push('Package manifest must declare a package API compatibility range.')
  if (!manifest.sha256) blocking.push('Package archive SHA-256 is missing or malformed.')
  if (!manifest.license) blocking.push('Package license is missing.')
  if (!manifest.provenance) blocking.push('Package provenance is missing.')
  if (!manifest.vulnerabilityPolicy) warnings.push('Publisher vulnerability policy is not documented.')
  if (manifest.pluginApi !== null && manifest.certification === 'uncertified') warnings.push('Plugin API compatibility is not certified for this release.')
  const trustedRegistryEntry = packageState.registryCatalog.find(/** 结构说明（自动提取）：packageState.registryCatalog.find 回调；输入 candidate；直接调用 officialRegistryPackageKey；返回表达式求值结果。 */ candidate =>
    candidate.id === manifest.id
    && candidate.version === manifest.version
    && candidate.sha256 === manifest.sha256
    && candidate.signature === manifest.signature
    && candidate.publisher === manifest.publisher
    && candidate.publisherVerified
    && officialRegistryPackageKey(candidate) === officialRegistryPackageKey(manifest)
  )
  const officialSignature = manifest.signature === `nova-official-v1:${manifest.sha256}` && manifest.publisherVerified && Boolean(trustedRegistryEntry)
  const reviewedPublisherSignature = manifest.publisherVerified && manifest.signature.startsWith('ed25519-v1:') && verifiedPublisherPackages.has(publisherPackageKey(manifest))
  if (!officialSignature && !reviewedPublisherSignature) blocking.push('Package signature is missing or cannot be verified by the Stable trust store.')
  for (const id of Object.keys(manifest.dependencies)) {
    if (!manifest.dependencyHashes[id]) blocking.push(`Dependency ${id} is missing a locked SHA-256 digest.`)
    const installed = candidates.find(/* 比较 item.manifest.id 与 id，返回严格相等的判断结果。 */ item => item.manifest.id === id)
    if (installed && manifest.dependencyHashes[id] && installed.manifest.sha256 !== manifest.dependencyHashes[id]) blocking.push(`Dependency ${id} digest differs from the manifest lock.`)
  }
  if (manifest.native) warnings.push('Native entry points remain disabled and require external review.')
  const revoked = packageState.revocations.find(/* 先计算 item.id === manifest.id；仅当其为真值时求右侧 (item.version === manifest.version || item.sha256 === manifest.sha256)，返回短路求值结果。 */ item => item.id === manifest.id && (item.version === manifest.version || item.sha256 === manifest.sha256))
  if (revoked) blocking.push(`Package was revoked by ${revoked.advisoryId}: ${revoked.reason}`)
  for (const advisory of packageState.vulnerabilities.filter(/* 先计算 item.id === manifest.id；仅当其为真值时求右侧 versionSatisfies(manifest.version, item.affected)，返回短路求值结果。 */ item => item.id === manifest.id && versionSatisfies(manifest.version, item.affected))) {
    const message = `${advisory.advisoryId} ${advisory.severity}: ${advisory.summary}${advisory.fixedVersion ? `; update to ${advisory.fixedVersion}` : ''}`
    if ((advisory.severity === 'critical' || advisory.severity === 'high') && packageState.vulnerabilityPolicy === 'block-critical-high') blocking.push(message)
    else warnings.push(message)
  }
  const quarantined = packageState.quarantine.find(/* 先计算 item.id === manifest.id；仅当其为真值时求右侧 item.version === manifest.version，返回短路求值结果。 */ item => item.id === manifest.id && item.version === manifest.version)
  if (quarantined) blocking.push(`Package is quarantined: ${quarantined.reason}`)
  return { status: blocking.length ? quarantined ? 'quarantined' : 'unverified' : 'verified', blocking, warnings }
}

/** 结构说明（自动提取）：verifyPackageArchive；输入 manifest、archiveSha256；直接调用 Boolean、sha256、reviewPackageSecurity。 */ export function verifyPackageArchive(manifest: PackageManifest, archiveSha256: string): boolean {
  return Boolean(manifest.sha256 && sha256(archiveSha256) === manifest.sha256 && reviewPackageSecurity(manifest).status === 'verified')
}

/** 结构说明（自动提取）：quarantinePackage；输入 manifest、reason；直接调用 packageState.quarantine.some、packageState.quarantine.push、reason.slice、Date.now、packageState.installed.find 等；写入 installed.enabled、installed.securityStatus。 */ export function quarantinePackage(manifest: PackageManifest, reason: string): void {
  if (!packageState.quarantine.some(/* 先计算 item.id === manifest.id；仅当其为真值时求右侧 item.version === manifest.version，返回短路求值结果。 */ item => item.id === manifest.id && item.version === manifest.version)) packageState.quarantine.push({ id: manifest.id, version: manifest.version, reason: reason.slice(0, 500), quarantinedAt: Date.now() })
  const installed = packageState.installed.find(/* 先计算 item.manifest.id === manifest.id；仅当其为真值时求右侧 item.manifest.version === manifest.version，返回短路求值结果。 */ item => item.manifest.id === manifest.id && item.manifest.version === manifest.version)
  if (installed) { installed.enabled = false; installed.securityStatus = 'quarantined'; notifyPackageLifecycle(manifest.id, 'disable') }
}

/** 结构说明（自动提取）：applyVerifiedPackageSecurityBulletin；输入 value；直接调用 Array.isArray、Error、text、test、flatMap 等；写入 packageState.lastSecurityBulletin；包含循环处理；包含显式抛错路径。 */ export function applyVerifiedPackageSecurityBulletin(value: unknown): { revoked: number; vulnerable: number; disabled: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Security bulletin must be an object.')
  const source = value as Record<string, unknown>
  if (source.format !== 'nova-package-security-bulletin' || source.version !== 1 || typeof source.bulletinId !== 'string') throw new Error('Unsupported package security bulletin.')
  const bulletinId = text(source.bulletinId, 120), issuedAt = text(source.issuedAt, 40)
  if (!bulletinId || !/^\d{4}-\d{2}-\d{2}T/.test(issuedAt)) throw new Error('Security bulletin identity or timestamp is invalid.')
  const revocations = (Array.isArray(source.revocations) ? source.revocations : []).slice(0, 10_000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw；直接调用 text、sha256、validId、parseVersion。 */ raw => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>, id = text(item.id, 120), version = text(item.version, 40), digest = sha256(item.sha256), reason = text(item.reason, 500)
    return validId(id) && parseVersion(version) && digest && reason ? [{ id, version, sha256: digest, reason, advisoryId: bulletinId, revokedAt: issuedAt }] : []
  })
  const severities = new Set(['low', 'moderate', 'high', 'critical'])
  const vulnerabilities = (Array.isArray(source.vulnerabilities) ? source.vulnerabilities : []).slice(0, 10_000).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 raw；直接调用 text、validId、severities.has、parseVersion。 */ raw => {
    if (!raw || typeof raw !== 'object') return []
    const item = raw as Record<string, unknown>, id = text(item.id, 120), affected = text(item.affected, 80), severity = text(item.severity, 16) as PackageVulnerability['severity'], summary = text(item.summary, 500), fixedVersion = text(item.fixedVersion, 40)
    return validId(id) && affected && severities.has(severity) && summary && (!fixedVersion || parseVersion(fixedVersion)) ? [{ advisoryId: text(item.advisoryId, 120) || bulletinId, id, affected, severity, summary, fixedVersion, publishedAt: issuedAt }] : []
  })
  if (revocations.length !== (Array.isArray(source.revocations) ? source.revocations.length : 0) || vulnerabilities.length !== (Array.isArray(source.vulnerabilities) ? source.vulnerabilities.length : 0)) throw new Error('Security bulletin contains a malformed revocation or advisory.')
  packageState.revocations.splice(0, packageState.revocations.length, ...revocations)
  packageState.vulnerabilities.splice(0, packageState.vulnerabilities.length, ...vulnerabilities)
  packageState.lastSecurityBulletin = `${bulletinId} · ${issuedAt}`
  let disabled = 0
  for (const item of packageState.installed) {
    const review = reviewPackageSecurity(item.manifest)
    if (review.status !== 'verified') { quarantinePackage(item.manifest, review.blocking.join(' ')); disabled++ }
  }
  return { revoked: revocations.length, vulnerable: vulnerabilities.length, disabled }
}

/** 结构说明（自动提取）：normalizeSource；输入 value；直接调用 text。 */ function normalizeSource(value: unknown): PackageSource {
  const source = value && typeof value === 'object' ? value as Partial<PackageSource> : {}
  return {
    kind: source.kind === 'git' || source.kind === 'registry' ? source.kind : 'local',
    location: text(source.location, 500) || 'local manifest'
  }
}

/** 结构说明（自动提取）：packageCompatibility；输入 item、engineVersion、candidates；直接调用 problems.push、reviewPackageSecurity、versionSatisfies、Object.entries、candidates.find；返回路径包含 problems；包含循环处理。 */ export function packageCompatibility(item: InstalledPackage, engineVersion = PACKAGE_ENGINE_VERSION, candidates: readonly InstalledPackage[] = packageState.installed): string[] {
  const problems: string[] = []
  problems.push(...reviewPackageSecurity(item.manifest, candidates).blocking)
  if (!versionSatisfies(engineVersion, item.manifest.engine)) problems.push(`Requires Nova_A ${item.manifest.engine}`)
  if (item.manifest.pluginApi !== null && item.manifest.pluginApi !== 2) problems.push(`Requires Plugin API ${item.manifest.pluginApi}`)
  for (const [id, range] of Object.entries(item.manifest.dependencies)) {
    const dependency = candidates.find(/* 先计算 candidate.manifest.id === id；仅当其为真值时求右侧 candidate.project，返回短路求值结果。 */ candidate => candidate.manifest.id === id && candidate.project)
    if (!dependency) problems.push(`Missing ${id} ${range}`)
    else if (!versionSatisfies(dependency.manifest.version, range)) problems.push(`${id} ${dependency.manifest.version} does not satisfy ${range}`)
  }
  if (item.manifest.native) problems.push('Native extension requires explicit external installation and is never executed by the package browser')
  return problems
}

/** 结构说明（自动提取）：registryPackages；输入 query；直接调用 toLocaleLowerCase、query.trim、packageState.registryCatalog.filter。 */ export function registryPackages(query = packageState.registryQuery): PackageManifest[] {
  const needle = query.trim().toLocaleLowerCase()
  return packageState.registryCatalog.filter(/** 结构说明（自动提取）：packageState.registryCatalog.filter 回调；输入 manifest；直接调用 includes、toLocaleLowerCase；返回表达式求值结果。 */ manifest => !needle || `${manifest.name} ${manifest.id} ${manifest.description} ${manifest.publisher}`.toLocaleLowerCase().includes(needle))
}

/** Browsing is data-only. Installation happens only after an explicit UI action. */
/** 结构说明（自动提取）：installRegistryPackage；输入 id；直接调用 packageState.registryCatalog.find、Error、packageState.registries.find、installPackageManifest；包含显式抛错路径。 */ export function installRegistryPackage(id: string): InstalledPackage {
  const manifest = packageState.registryCatalog.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!manifest) throw new Error(`Package ${id} is not available in the selected registry or offline mirror.`)
  const registry = packageState.registries.find(/* 比较 item.id 与 packageState.selectedRegistry，返回严格相等的判断结果。 */ item => item.id === packageState.selectedRegistry)
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

/** 结构说明（自动提取）：packageInstallReview；输入 manifest；直接调用 reviewPackageSecurity、packageState.registries.find、sort、map、Object.entries。 */ export function packageInstallReview(manifest: PackageManifest): PackageInstallReview {
  const security = reviewPackageSecurity(manifest)
  const registry = packageState.registries.find(/* 比较 item.id 与 packageState.selectedRegistry，返回严格相等的判断结果。 */ item => item.id === packageState.selectedRegistry)
  const registryBlocked = packageState.releaseChannel === 'stable' && (!registry?.trusted || !registry.allowStable)
  const blocking = [...security.blocking, ...(registryBlocked ? [`Registry policy ${registry?.policy ?? 'missing'} does not permit Stable installation.`] : [])]
  return {
    id: manifest.id, version: manifest.version, publisher: manifest.publisher, publisherVerified: manifest.publisherVerified,
    sourcePolicy: registry?.policy ?? 'manifest-import', archiveSha256: manifest.sha256, signature: manifest.signature,
    license: manifest.license, provenance: manifest.provenance, pluginApiCompatibility: manifest.pluginApi === null ? manifest.apiCompatibility : `Plugin API ${manifest.pluginApi}`,
    certification: manifest.certification, permissions: [...manifest.permissions],
    dependencies: Object.entries(manifest.dependencies).map(/** 构造并返回记录 { id, range, sha256: manifest.dependencyHashes[id] ?? '' }，字段按当前实参及捕获状态求值。 */ ([id, range]) => ({ id, range, sha256: manifest.dependencyHashes[id] ?? '' })).sort(/* 调用 a.id.localeCompare(b.id) 并返回调用结果。 */ (a, b) => a.id.localeCompare(b.id)),
    blocking, warnings: [...security.warnings], executionAllowed: !blocking.length && !manifest.native
  }
}

/** 结构说明（自动提取）：addOfflineRegistryManifest；输入 value；直接调用 normalizePackageManifest、packageState.registryCatalog.findIndex、packageState.registryCatalog.splice、packageState.registryCatalog.push；返回路径包含 manifest。 */ export function addOfflineRegistryManifest(value: unknown): PackageManifest {
  const manifest = normalizePackageManifest(value)
  const index = packageState.registryCatalog.findIndex(/* 先计算 item.id === manifest.id；仅当其为真值时求右侧 item.version === manifest.version，返回短路求值结果。 */ item => item.id === manifest.id && item.version === manifest.version)
  if (index >= 0) packageState.registryCatalog.splice(index, 1, manifest); else packageState.registryCatalog.push(manifest)
  return manifest
}

/** 结构说明（自动提取）：diagnosePackageResolution；输入 candidates；直接调用 sort、candidates.filter、Set、projectPackages.forEach、projectPackages.map 等；写入 packageState.lastSolverDiagnostic；返回路径包含 diagnostic。 */ export function diagnosePackageResolution(candidates: readonly InstalledPackage[] = packageState.installed): PackageSolverDiagnostic {
  const projectPackages = candidates.filter(/* 返回 item.project 的当前值。 */ item => item.project).sort(/* 调用 a.manifest.id.localeCompare(b.manifest.id) 并返回调用结果。 */ (a, b) => a.manifest.id.localeCompare(b.manifest.id))
  const seen = new Set<string>(), stack: string[] = [], lock: PackageLockEntry[] = [], steps: PackageSolverStep[] = [], errors: string[] = []
  const visit = /** 结构说明（自动提取）：visit；输入 item、requestedBy、requirement；直接调用 seen.has、steps.push、stack.includes、join、stack.slice 等；包含循环处理。 */ (item: InstalledPackage, requestedBy = 'project', requirement = item.manifest.version) => {
    if (seen.has(item.manifest.id)) { steps.push({ packageId: item.manifest.id, version: item.manifest.version, requestedBy, requirement, status: 'reused', detail: 'Reused the already locked compatible package.' }); return }
    if (stack.includes(item.manifest.id)) { const cycle = [...stack.slice(stack.indexOf(item.manifest.id)), item.manifest.id].join(' → '); errors.push(`Circular dependency: ${cycle}`); steps.push({ packageId: item.manifest.id, version: item.manifest.version, requestedBy, requirement, status: 'blocked', detail: `Circular dependency: ${cycle}` }); return }
    const security = reviewPackageSecurity(item.manifest, candidates)
    if (security.blocking.length) { errors.push(...security.blocking.map(/** 按模板 `${item.manifest.id}: ${problem}` 生成并返回字符串。 */ problem => `${item.manifest.id}: ${problem}`)); steps.push({ packageId: item.manifest.id, version: item.manifest.version, requestedBy, requirement, status: 'blocked', detail: security.blocking.join(' ') }); return }
    if (!versionSatisfies(PACKAGE_ENGINE_VERSION, item.manifest.engine)) { const detail = `Requires Nova_A ${item.manifest.engine}; current engine is ${PACKAGE_ENGINE_VERSION}.`; errors.push(`${item.manifest.id}: ${detail}`); steps.push({ packageId: item.manifest.id, version: item.manifest.version, requestedBy, requirement, status: 'blocked', detail }); return }
    stack.push(item.manifest.id)
    for (const [id, range] of Object.entries(item.manifest.dependencies).sort(/* 调用 left.localeCompare(right) 并返回调用结果。 */ ([left], [right]) => left.localeCompare(right))) {
      const matches = candidates.filter(/* 先计算 candidate.manifest.id === id && candidate.project；仅当其为真值时求右侧 versionSatisfies(candidate.manifest.version, range)，返回短路求值结果。 */ candidate => candidate.manifest.id === id && candidate.project && versionSatisfies(candidate.manifest.version, range)).sort(/* 调用 compareVersions(b.manifest.version, a.manifest.version) 并返回调用结果。 */ (a, b) => compareVersions(b.manifest.version, a.manifest.version))
      const dependency = matches[0]
      if (!dependency) { const detail = `No installed project package satisfies ${id} ${range}.`; errors.push(`${item.manifest.id}: ${detail}`); steps.push({ packageId: id, version: '', requestedBy: item.manifest.id, requirement: range, status: 'blocked', detail }); continue }
      if (dependency.manifest.sha256 !== item.manifest.dependencyHashes[id]) { const detail = `Locked digest for ${id} does not match ${dependency.manifest.sha256}.`; errors.push(`${item.manifest.id}: ${detail}`); steps.push({ packageId: id, version: dependency.manifest.version, requestedBy: item.manifest.id, requirement: range, status: 'blocked', detail }); continue }
      visit(dependency, item.manifest.id, range)
    }
    stack.pop()
    if (errors.some(/* 调用 error.startsWith(`${item.manifest.id}:`) 并返回调用结果。 */ error => error.startsWith(`${item.manifest.id}:`))) return
    seen.add(item.manifest.id)
    steps.push({ packageId: item.manifest.id, version: item.manifest.version, requestedBy, requirement, status: 'selected', detail: `${item.manifest.id}@${item.manifest.version} selected and hash pinned.` })
    lock.push({ id: item.manifest.id, version: item.manifest.version, source: { ...item.source }, sha256: item.manifest.sha256, signature: item.manifest.signature, entryPointType: item.manifest.entryPointType, dependencies: { ...item.manifest.dependencyHashes } })
  }
  projectPackages.forEach(/* 调用 visit(item) 并返回调用结果。 */ item => visit(item))
  const diagnostic: PackageSolverDiagnostic = { status: errors.length ? 'blocked' : 'resolved', roots: projectPackages.map(/* 返回 item.manifest.id 的当前值。 */ item => item.manifest.id), steps: steps.slice(0, 20_000), errors: [...new Set(errors)].slice(0, 5_000), lockfile: errors.length ? [] : lock }
  packageState.lastSolverDiagnostic = diagnostic
  return diagnostic
}

/** 结构说明（自动提取）：resolvePackageLockfile；无显式参数；直接调用 diagnosePackageResolution、Error、diagnostic.errors.join、packageState.lockfile.splice；返回路径包含 diagnostic.lockfile；包含显式抛错路径。 */ export function resolvePackageLockfile(): PackageLockEntry[] {
  const diagnostic = diagnosePackageResolution()
  if (diagnostic.status === 'blocked') throw new Error(diagnostic.errors.join(' '))
  packageState.lockfile.splice(0, packageState.lockfile.length, ...diagnostic.lockfile)
  return diagnostic.lockfile
}

/** 结构说明（自动提取）：installPackageManifest；输入 value、sourceValue；直接调用 packageManifestDeprecations、normalizePackageManifest、normalizeSource、reviewPackageSecurity、quarantinePackage 等；返回路径包含 packageState.installed[…]、item；包含循环处理；包含显式抛错路径。 */ export function installPackageManifest(value: unknown, sourceValue?: unknown): InstalledPackage {
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
    const dependency = packageState.installed.find(/* 先计算 candidate.manifest.id === dependencyId；仅当其为真值时求右侧 candidate.project，返回短路求值结果。 */ candidate => candidate.manifest.id === dependencyId && candidate.project)
    if (!dependency) throw new Error(`Package ${manifest.id} requires missing dependency ${dependencyId} ${range}.`)
    if (!versionSatisfies(dependency.manifest.version, range)) throw new Error(`Package ${manifest.id} requires ${dependencyId} ${range}, but ${dependency.manifest.version} is installed.`)
    if (dependency.manifest.sha256 !== manifest.dependencyHashes[dependencyId]) throw new Error(`Package ${manifest.id} dependency hash does not match ${dependencyId}.`)
  }
  const existing = packageState.installed.findIndex(/* 比较 candidate.manifest.id 与 manifest.id，返回严格相等的判断结果。 */ candidate => candidate.manifest.id === manifest.id)
  const cached = packageState.offlineCache.findIndex(/* 先计算 candidate.id === manifest.id；仅当其为真值时求右侧 candidate.version === manifest.version，返回短路求值结果。 */ candidate => candidate.id === manifest.id && candidate.version === manifest.version)
  if (existing >= 0 && compareVersions(manifest.version, packageState.installed[existing].manifest.version) <= 0) return packageState.installed[existing]
  const item: InstalledPackage = { manifest, source, enabled: !manifest.native && security.status === 'verified', project: true, installedAt: Date.now(), securityStatus: security.status, grantedPermissions: [...manifest.permissions], deprecations }
  const candidates = existing >= 0 ? packageState.installed.map(/* 根据 index === existing 的真假，分别返回 item 或 current。 */ (current, index) => index === existing ? item : current) : [...packageState.installed, item]
  const diagnostic = diagnosePackageResolution(candidates)
  if (diagnostic.status === 'blocked') throw new Error(diagnostic.errors.join(' '))
  // 导入同一包的新版本也保留回滚基线；所有验证完成后才修改包、缓存和锁文件。
  if (existing >= 0) {
    const history = packageState.rollback[manifest.id] ?? (packageState.rollback[manifest.id] = [])
    history.unshift(packageState.installed[existing].manifest)
    if (history.length > 5) history.splice(5)
  }
  if (cached >= 0) packageState.offlineCache.splice(cached, 1, manifest); else packageState.offlineCache.push(manifest)
  if (existing >= 0) packageState.installed.splice(existing, 1, item); else packageState.installed.push(item)
  packageState.lockfile.splice(0, packageState.lockfile.length, ...diagnostic.lockfile)
  if (existing >= 0) notifyPackageLifecycle(manifest.id, 'update')
  return item
}

/** 结构说明（自动提取）：packageUpdate；输入 item；直接调用 sort、packageState.offlineCache.filter。 */ export function packageUpdate(item: InstalledPackage): PackageManifest | null {
  return packageState.offlineCache.filter(/* 先计算 candidate.id === item.manifest.id；仅当其为真值时求右侧 compareVersions(candidate.version, item.manifest.version) > 0，返回短路求值结果。 */ candidate => candidate.id === item.manifest.id && compareVersions(candidate.version, item.manifest.version) > 0).sort(/* 调用 compareVersions(b.version, a.version) 并返回调用结果。 */ (a, b) => compareVersions(b.version, a.version))[0] ?? null
}

/** 结构说明（自动提取）：applyPackageUpdate；输入 id；直接调用 packageState.installed.findIndex、packageUpdate、reviewPackageSecurity、quarantinePackage、security.blocking.join 等；写入 packageState.rollback[…]；包含循环处理。 */ export function applyPackageUpdate(id: string): boolean {
  const index = packageState.installed.findIndex(/* 比较 item.manifest.id 与 id，返回严格相等的判断结果。 */ item => item.manifest.id === id)
  if (index < 0) return false
  const update = packageUpdate(packageState.installed[index])
  if (!update) return false
  const current = packageState.installed[index]
  const security = reviewPackageSecurity(update)
  if (packageState.releaseChannel === 'stable' && !packageState.allowUnverified && security.status !== 'verified') { quarantinePackage(update, security.blocking.join(' ') || 'Unverifiable update'); return false }
  if (!versionSatisfies(PACKAGE_ENGINE_VERSION, update.engine)) { packageState.errors.push(`Update requires Nova_A ${update.engine}; current engine is ${PACKAGE_ENGINE_VERSION}.`); return false }
  for (const [dependencyId, range] of Object.entries(update.dependencies)) {
    const dependency = packageState.installed.find(/* 先计算 candidate.manifest.id === dependencyId；仅当其为真值时求右侧 candidate.project，返回短路求值结果。 */ candidate => candidate.manifest.id === dependencyId && candidate.project)
    if (!dependency || !versionSatisfies(dependency.manifest.version, range) || dependency.manifest.sha256 !== update.dependencyHashes[dependencyId]) { packageState.errors.push(`Update blocked by dependency ${dependencyId} ${range}.`); return false }
  }
  const addedPermissions = update.permissions.filter(/* 返回 current.grantedPermissions.includes(permission) 的逻辑取反结果。 */ permission => !current.grantedPermissions.includes(permission))
  if (addedPermissions.length) { packageState.errors.push(`Update blocked until permission review: ${addedPermissions.join(', ')}`); return false }
  const candidate = { ...current, manifest: update, securityStatus: security.status, installedAt: Date.now(), grantedPermissions: current.grantedPermissions.filter(/* 调用 update.permissions.includes(permission) 并返回调用结果。 */ permission => update.permissions.includes(permission)) }
  const diagnostic = diagnosePackageResolution(packageState.installed.map(/* 根据 position === index 的真假，分别返回 candidate 或 item。 */ (item, position) => position === index ? candidate : item))
  if (diagnostic.status === 'blocked') { packageState.errors.push(...diagnostic.errors); return false }
  const history = packageState.rollback[id] ?? (packageState.rollback[id] = [])
  history.unshift(current.manifest); if (history.length > 5) history.splice(5)
  packageState.installed.splice(index, 1, candidate)
  packageState.lockfile.splice(0, packageState.lockfile.length, ...diagnostic.lockfile)
  notifyPackageLifecycle(id, 'update')
  return true
}

/** 结构说明（自动提取）：approvePackageUpdatePermissions；输入 id、permissions；直接调用 packageState.installed.find、packageUpdate、update.permissions.filter、required.some、Set 等；写入 item.grantedPermissions；返回路径包含 applied；包含显式抛错路径。 */ export function approvePackageUpdatePermissions(id: string, permissions: string[]): boolean {
  const item = packageState.installed.find(/* 比较 candidate.manifest.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.manifest.id === id), update = item ? packageUpdate(item) : null
  if (!item || !update) return false
  const required = update.permissions.filter(/* 返回 item.grantedPermissions.includes(permission) 的逻辑取反结果。 */ permission => !item.grantedPermissions.includes(permission))
  if (required.some(/* 返回 permissions.includes(permission) 的逻辑取反结果。 */ permission => !permissions.includes(permission))) return false
  const previous = [...item.grantedPermissions]
  item.grantedPermissions = [...new Set([...previous, ...required])]
  try { const applied = applyPackageUpdate(id); if (!applied) item.grantedPermissions = previous; return applied }
  catch (error) { item.grantedPermissions = previous; throw error }
}

/** 结构说明（自动提取）：rollbackPackage；输入 id；直接调用 packageState.installed.findIndex、item.grantedPermissions.filter、packageState.installed.map、reviewPackageSecurity、diagnosePackageResolution 等。 */ export function rollbackPackage(id: string): boolean {
  const index = packageState.installed.findIndex(/* 比较 candidate.manifest.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.manifest.id === id)
  const item = packageState.installed[index], history = packageState.rollback[id], previous = history?.[0]
  if (!item || !previous) return false
  const candidate = { ...item, manifest: previous, grantedPermissions: item.grantedPermissions.filter(/* 调用 previous.permissions.includes(permission) 并返回调用结果。 */ permission => previous.permissions.includes(permission)) }
  const candidates = packageState.installed.map(/* 根据 position === index 的真假，分别返回 candidate 或 installed。 */ (installed, position) => position === index ? candidate : installed)
  const security = reviewPackageSecurity(previous, candidates)
  if (security.status !== 'verified') return false
  const diagnostic = diagnosePackageResolution(candidates)
  if (diagnostic.status === 'blocked') { packageState.errors.push(...diagnostic.errors); return false }
  packageState.installed.splice(index, 1, { ...candidate, securityStatus: 'verified', enabled: item.enabled && !previous.native })
  packageState.lockfile.splice(0, packageState.lockfile.length, ...diagnostic.lockfile)
  history.shift()
  notifyPackageLifecycle(id, 'rollback')
  return true
}

/** 结构说明（自动提取）：verifyPackageCache；无显式参数；直接调用 reviewPackageSecurity、problems.push、review.blocking.join、quarantinePackage、toISOString 等；写入 packageState.lastCacheVerification；返回路径包含 problems；包含循环处理。 */ export function verifyPackageCache(): string[] {
  const problems: string[] = []
  for (const manifest of packageState.offlineCache) {
    const review = reviewPackageSecurity(manifest)
    if (review.status !== 'verified') { problems.push(`${manifest.id}@${manifest.version}: ${review.blocking.join(' ')}`); quarantinePackage(manifest, review.blocking.join(' ')) }
  }
  packageState.lastCacheVerification = new Date().toISOString()
  return problems
}

/** 结构说明（自动提取）：packageUninstallImpact；输入 id；直接调用 map、packageState.installed.filter。 */ export function packageUninstallImpact(id: string): string[] {
  return packageState.installed.filter(/* 先计算 item.project；仅当其为真值时求右侧 id in item.manifest.dependencies，返回短路求值结果。 */ item => item.project && id in item.manifest.dependencies).map(/** 按模板 `${item.manifest.name} depends on this package` 生成并返回字符串。 */ item => `${item.manifest.name} depends on this package`)
}

/** 结构说明（自动提取）：uninstallPackage；输入 id；直接调用 packageUninstallImpact、packageState.installed.findIndex、diagnosePackageResolution、packageState.installed.filter、packageState.errors.push 等。 */ export function uninstallPackage(id: string): boolean {
  if (packageUninstallImpact(id).length) return false
  const index = packageState.installed.findIndex(/* 比较 item.manifest.id 与 id，返回严格相等的判断结果。 */ item => item.manifest.id === id)
  if (index < 0) return false
  const diagnostic = diagnosePackageResolution(packageState.installed.filter(/* 比较 position 与 index，返回严格不等的判断结果。 */ (_, position) => position !== index))
  if (diagnostic.status === 'blocked') { packageState.errors.push(...diagnostic.errors); return false }
  packageState.installed.splice(index, 1)
  packageState.lockfile.splice(0, packageState.lockfile.length, ...diagnostic.lockfile)
  notifyPackageLifecycle(id, 'uninstall')
  return true
}

/** 结构说明（自动提取）：serializePackageState；无显式参数；直接调用 packageState.installed.map、packageState.lockfile.map、packageState.offlineCache.map、packageState.quarantine.map。 */ export function serializePackageState(): Record<string, unknown> {
  return {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION,
    installed: packageState.installed.map(/** 构造并返回记录 { ...item, manifest: { ...item.manifest, dependencies: { ...item.manifest.dependencies } }, source: { ...item.source } }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, manifest: { ...item.manifest, dependencies: { ...item.manifest.dependencies } }, source: { ...item.source } })),
    lockfile: packageState.lockfile.map(/** 构造并返回记录 { ...item, source: { ...item.source } }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, source: { ...item.source } })),
    offlineCache: packageState.offlineCache.map(/** 构造并返回记录 { ...item, dependencies: { ...item.dependencies } }，字段按当前实参及捕获状态求值。 */ item => ({ ...item, dependencies: { ...item.dependencies } })),
    offlineMode: packageState.offlineMode, quarantine: packageState.quarantine.map(/** 构造并返回记录 { ...item }，字段按当前实参及捕获状态求值。 */ item => ({ ...item }))
  }
}

/** 结构说明（自动提取）：loadPackageState；输入 value；直接调用 Array.isArray、source.installed.flatMap、packageState.installed.splice、packageState.offlineCache.splice、source.offlineCache.flatMap 等；写入 packageState.offlineMode。 */ export function loadPackageState(value: unknown): void {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const installed = Array.isArray(source.installed) ? source.installed.flatMap(/** 结构说明（自动提取）：source.installed.flatMap 回调；输入 raw；直接调用 Set、packageManifestDeprecations、stringList、normalizePackageManifest、reviewPackageSecurity 等。 */ raw => {
    try {
      const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
      const deprecations = [...new Set([...packageManifestDeprecations(item.manifest), ...stringList(item.deprecations)])]
      const manifest = normalizePackageManifest(item.manifest), security = reviewPackageSecurity(manifest), compatible = versionSatisfies(PACKAGE_ENGINE_VERSION, manifest.engine)
      const status: PackageSecurityStatus = deprecations.length || !compatible ? 'unverified' : security.status
      return [{ manifest, source: normalizeSource(item.source), enabled: item.enabled !== false && status === 'verified', project: item.project !== false, installedAt: Math.max(0, Number(item.installedAt) || 0), securityStatus: status, grantedPermissions: stringList(item.grantedPermissions ?? manifest.permissions), deprecations }]
    } catch { return [] }
  }) : []
  packageState.installed.splice(0, packageState.installed.length, ...installed)
  packageState.offlineCache.splice(0, packageState.offlineCache.length, ...(Array.isArray(source.offlineCache) ? source.offlineCache.flatMap(/** 结构说明（自动提取）：source.offlineCache.flatMap 回调；输入 item；直接调用 normalizePackageManifest。 */ item => { try { return [normalizePackageManifest(item)] } catch { return [] } }) : []))
  packageState.offlineMode = source.offlineMode !== false
  packageState.quarantine.splice(0, packageState.quarantine.length, ...(Array.isArray(source.quarantine) ? source.quarantine.flatMap(/** 结构说明（自动提取）：source.quarantine.flatMap 回调；输入 raw；直接调用 text、validId、parseVersion、Math.max、Number。 */ raw => { const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}; const id = text(item.id, 120), version = text(item.version, 40); return validId(id) && parseVersion(version) ? [{ id, version, reason: text(item.reason, 500), quarantinedAt: Math.max(0, Number(item.quarantinedAt) || 0) }] : [] }) : []))
  packageState.errors.splice(0)
  try { resolvePackageLockfile() } catch (error) { packageState.errors.push(error instanceof Error ? error.message : String(error)) }
}
