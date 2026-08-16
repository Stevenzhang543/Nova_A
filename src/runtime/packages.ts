import { reactive } from 'vue'
import { NOVA_PACKAGE_MANIFEST_VERSION } from './stableContracts'

export { NOVA_PACKAGE_MANIFEST_VERSION }
export type PackageSourceKind = 'local' | 'git' | 'registry'

export interface PackageSource { kind: PackageSourceKind; location: string }
export interface PackageManifest {
  manifestVersion: number
  id: string
  name: string
  version: string
  description: string
  engine: string
  dependencies: Record<string, string>
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
}
export interface InstalledPackage {
  manifest: PackageManifest
  source: PackageSource
  enabled: boolean
  project: boolean
  installedAt: number
}
export interface PackageLockEntry { id: string; version: string; source: PackageSource; sha256: string }

export const packageState = reactive({
  installed: [] as InstalledPackage[],
  lockfile: [] as PackageLockEntry[],
  offlineCache: [] as PackageManifest[],
  offlineMode: true,
  selectedStatus: 'installed' as 'installed' | 'project' | 'updates' | 'incompatible' | 'disabled',
  errors: [] as string[],
  registryQuery: '',
  selectedRegistry: 'official',
  registries: [
    { id: 'official', name: 'Nova_A Official', location: 'https://packages.nova-a.dev/v1', trusted: true, offlineMirror: true },
    { id: 'local', name: 'Local mirror', location: '', trusted: false, offlineMirror: true }
  ],
  registryCatalog: [] as PackageManifest[]
})

export const OFFICIAL_NAVIGATION_PACKAGE_ID = 'top.whitelists.novaa.navigation'
export const OFFICIAL_AI_PACKAGE_ID = 'top.whitelists.novaa.ai'
export const OFFICIAL_NETWORKING_PACKAGE_ID = 'top.whitelists.novaa.networking'
export const OFFICIAL_ANDROID_PACKAGE_ID = 'top.whitelists.novaa.android'

const OFFICIAL_METADATA = {
  publisher: 'Whitelist', publisherVerified: true, permissions: [] as string[], rating: 5,
  securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security',
  documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/'
}

const OFFICIAL_PACKAGES: Record<string, PackageManifest> = {
  [OFFICIAL_NAVIGATION_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_NAVIGATION_PACKAGE_ID, name: 'Nova Navigation 2D', version: '2.6.0',
    description: 'Grid/polygon navigation, agents, flow fields, avoidance, and dynamic rebaking.', engine: '>=2.6.0 <4.0.0', dependencies: {},
    pluginApi: null, native: false, sha256: 'official-navigation-2.6.0', signature: 'nova-a-official', ...OFFICIAL_METADATA
  },
  [OFFICIAL_AI_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_AI_PACKAGE_ID, name: 'Nova Gameplay AI', version: '2.6.0',
    description: 'Behavior trees and hierarchical gameplay state machines.', engine: '>=2.6.0 <4.0.0', dependencies: {},
    pluginApi: null, native: false, sha256: 'official-ai-2.6.0', signature: 'nova-a-official', ...OFFICIAL_METADATA
  },
  [OFFICIAL_NETWORKING_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_NETWORKING_PACKAGE_ID, name: 'Nova Optional Networking', version: '2.9.0',
    description: 'Bounded WebSocket/native UDP transports, RPCs, snapshots, prediction, interpolation, rollback helpers, and multiplayer diagnostics.', engine: '>=2.9.0 <4.0.0', dependencies: {},
    pluginApi: null, native: false, sha256: 'official-networking-2.9.0', signature: 'nova-a-official',
    ...OFFICIAL_METADATA, permissions: ['network.client', 'network.listen']
  },
  [OFFICIAL_ANDROID_PACKAGE_ID]: {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: OFFICIAL_ANDROID_PACKAGE_ID, name: 'Nova Android Export', version: '2.9.0',
    description: 'Optional Android export templates and validation. Requires a local Android SDK/JDK toolchain.', engine: '>=2.9.0 <4.0.0', dependencies: {},
    pluginApi: null, native: false, sha256: 'official-android-export-2.9.0', signature: 'nova-a-official',
    ...OFFICIAL_METADATA, permissions: ['build.android-sdk']
  }
}

packageState.registryCatalog.splice(0, packageState.registryCatalog.length, ...Object.values(OFFICIAL_PACKAGES))

export function packageEnabled(id: string): boolean {
  return packageState.installed.some(item => item.manifest.id === id && item.project && item.enabled)
}

export function enableOfficialPackage(id: typeof OFFICIAL_NAVIGATION_PACKAGE_ID | typeof OFFICIAL_AI_PACKAGE_ID | typeof OFFICIAL_NETWORKING_PACKAGE_ID | typeof OFFICIAL_ANDROID_PACKAGE_ID): boolean {
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
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
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
  return {
    manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id, name, version, description: text(source.description, 500),
    engine: text(source.engine, 80) || '^2.6.0', dependencies,
    pluginApi: Number(source.pluginApi) === 2 ? 2 : null, native: source.native === true,
    sha256: text(source.sha256, 128).toLowerCase(), signature: text(source.signature, 1024),
    publisher: text(source.publisher, 120) || 'Unknown publisher', publisherVerified: source.publisherVerified === true,
    permissions: stringList(source.permissions), rating: Number.isFinite(Number(source.rating)) ? Math.min(5, Math.max(0, Number(source.rating))) : null,
    securityUrl: /^https:\/\//i.test(text(source.securityUrl, 500)) ? text(source.securityUrl, 500) : '',
    documentationUrl: /^https:\/\//i.test(text(source.documentationUrl, 500)) ? text(source.documentationUrl, 500) : ''
  }
}

function normalizeSource(value: unknown): PackageSource {
  const source = value && typeof value === 'object' ? value as Partial<PackageSource> : {}
  return {
    kind: source.kind === 'git' || source.kind === 'registry' ? source.kind : 'local',
    location: text(source.location, 500) || 'local manifest'
  }
}

export function packageCompatibility(item: InstalledPackage, engineVersion = '3.0.0', candidates: readonly InstalledPackage[] = packageState.installed): string[] {
  const problems: string[] = []
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
  return installPackageManifest(manifest, { kind: 'registry', location: packageState.selectedRegistry })
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
    lock.push({ id: item.manifest.id, version: item.manifest.version, source: { ...item.source }, sha256: item.manifest.sha256 })
  }
  projectPackages.forEach(visit)
  packageState.lockfile.splice(0, packageState.lockfile.length, ...lock)
  return lock
}

export function installPackageManifest(value: unknown, sourceValue?: unknown): InstalledPackage {
  const manifest = normalizePackageManifest(value)
  const source = normalizeSource(sourceValue)
  const existing = packageState.installed.findIndex(candidate => candidate.manifest.id === manifest.id)
  const cached = packageState.offlineCache.findIndex(candidate => candidate.id === manifest.id && candidate.version === manifest.version)
  if (cached >= 0) packageState.offlineCache.splice(cached, 1, manifest); else packageState.offlineCache.push(manifest)
  if (existing >= 0 && compareVersions(manifest.version, packageState.installed[existing].manifest.version) > 0) return packageState.installed[existing]
  const item: InstalledPackage = { manifest, source, enabled: !manifest.native, project: true, installedAt: Date.now() }
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
  packageState.installed.splice(index, 1, { ...current, manifest: update, installedAt: Date.now() })
  resolvePackageLockfile()
  return true
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
    offlineMode: packageState.offlineMode
  }
}

export function loadPackageState(value: unknown): void {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const installed = Array.isArray(source.installed) ? source.installed.flatMap(raw => {
    try {
      const item = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {}
      return [{ manifest: normalizePackageManifest(item.manifest), source: normalizeSource(item.source), enabled: item.enabled !== false, project: item.project !== false, installedAt: Math.max(0, Number(item.installedAt) || 0) }]
    } catch { return [] }
  }) : []
  packageState.installed.splice(0, packageState.installed.length, ...installed)
  packageState.offlineCache.splice(0, packageState.offlineCache.length, ...(Array.isArray(source.offlineCache) ? source.offlineCache.flatMap(item => { try { return [normalizePackageManifest(item)] } catch { return [] } }) : []))
  packageState.offlineMode = source.offlineMode !== false
  packageState.errors.splice(0)
  try { resolvePackageLockfile() } catch (error) { packageState.errors.push(error instanceof Error ? error.message : String(error)) }
}
