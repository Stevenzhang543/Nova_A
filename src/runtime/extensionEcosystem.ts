/** 扩展生态元数据：组织扩展能力、依赖和兼容性描述及验证。 */
import { reactive } from 'vue'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'
import {
  addOfflineRegistryManifest,
  markPublisherPackageVerified,
  normalizePackageManifest,
  packageInstallReview,
  packageState,
  reviewPackageSecurity,
  type PackageEntryPointType,
  type PackageManifest,
  type PackageVisualNode,
  type PluginApiCertification
} from './packages'
import { NOVA_PACKAGE_MANIFEST_VERSION, NOVA_PLUGIN_API_VERSION } from './stableContracts'

export const NOVA_NATIVE_EXTENSION_ABI_VERSION = 1 as const
export const NOVA_LOCAL_REGISTRY_VERSION = 1 as const
export const MAX_LOCAL_REGISTRY_PACKAGES = 5_000
export const MAX_PACKAGE_ARCHIVE_BYTES = 512 * 1024 * 1024

export type NativeExtensionPlatform = 'windows' | 'linux' | 'macos'
export type NativeExtensionArchitecture = 'x86_64' | 'aarch64'
export type NativeExtensionPermission = 'project.read' | 'project.write' | 'assets.read' | 'assets.write' | 'network.client' | 'network.listen' | 'process.spawn' | 'gpu.render-pass'
export interface NativeExtensionBinary { platform: NativeExtensionPlatform; architecture: NativeExtensionArchitecture; path: string; sha256: string }
export interface NativeExtensionManifest {
  abiVersion: typeof NOVA_NATIVE_EXTENSION_ABI_VERSION
  entrySymbol: 'nova_extension_v1'
  isolation: 'sidecar-process'
  heartbeatMs: number
  restartLimit: number
  permissions: NativeExtensionPermission[]
  binaries: NativeExtensionBinary[]
}
export interface NativeExtensionLaunchPlan {
  extensionId: string
  executable: string
  abiVersion: number
  isolation: 'sidecar-process'
  grantedPermissions: NativeExtensionPermission[]
  heartbeatMs: number
  restartLimit: number
  implicitExecution: false
}

const NATIVE_PERMISSIONS = new Set<NativeExtensionPermission>(['project.read', 'project.write', 'assets.read', 'assets.write', 'network.client', 'network.listen', 'process.spawn', 'gpu.render-pass'])
/* 根据 typeof value === 'string' 的真假，分别返回 value.trim().slice(0, maximum) 或 ''。 */ function text(value: unknown, maximum: number): string { return typeof value === 'string' ? value.trim().slice(0, maximum) : '' }
/** 结构说明（自动提取）：integer；输入 value、fallback、minimum、maximum；直接调用 Number、Number.isSafeInteger、Math.min、Math.max。 */ function integer(value: unknown, fallback: number, minimum: number, maximum: number): number { const number = Number(value); return Number.isSafeInteger(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback }
/** 结构说明（自动提取）：safePath；输入 value；直接调用 replace、text、path.startsWith、path.includes、test 等；返回路径包含 path；包含显式抛错路径。 */ function safePath(value: unknown): string { const path = text(value, 240).replace(/\\/g, '/'); if (!path || path.startsWith('/') || path.includes('../') || /^(?:[a-z]+:|\\\\)/i.test(path)) throw new Error('Extension binaries require safe relative paths.'); return path }
/** 结构说明（自动提取）：sha256；输入 value；直接调用 toLowerCase、text、test、Error；返回路径包含 hash；包含显式抛错路径。 */ function sha256(value: unknown): string { const hash = text(value, 64).toLowerCase(); if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('A lowercase SHA-256 digest is required.'); return hash }

/** 结构说明（自动提取）：normalizeNativeExtensionManifest；输入 value；直接调用 Array.isArray、Error、Set、source.permissions.filter、map 等；包含显式抛错路径。 */ export function normalizeNativeExtensionManifest(value: unknown): NativeExtensionManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Native extension metadata must be an object.')
  const source = value as Partial<NativeExtensionManifest>
  if (source.abiVersion !== NOVA_NATIVE_EXTENSION_ABI_VERSION || source.entrySymbol !== 'nova_extension_v1') throw new Error(`Native extensions must target ABI ${NOVA_NATIVE_EXTENSION_ABI_VERSION} and nova_extension_v1.`)
  if (source.isolation !== 'sidecar-process') throw new Error('Native extensions must run in an isolated sidecar process.')
  const permissions = Array.isArray(source.permissions) ? [...new Set(source.permissions.filter(/* 调用 NATIVE_PERMISSIONS.has(item as NativeExtensionPermission) 并返回调用结果。 */ (item): item is NativeExtensionPermission => NATIVE_PERMISSIONS.has(item as NativeExtensionPermission)))] : []
  if (!Array.isArray(source.permissions) || permissions.length !== source.permissions.length) throw new Error('Native extension requests an unsupported permission.')
  const identities = new Set<string>()
  const binaries = (Array.isArray(source.binaries) ? source.binaries : []).slice(0, 16).map(/** 结构说明（自动提取）：map 回调；输入 raw；直接调用 identities.has、Error、identities.add、safePath、sha256；包含显式抛错路径。 */ raw => {
    const item = raw && typeof raw === 'object' ? raw as Partial<NativeExtensionBinary> : {}
    const platform: NativeExtensionPlatform = item.platform === 'linux' || item.platform === 'macos' ? item.platform : 'windows'
    const architecture: NativeExtensionArchitecture = item.architecture === 'aarch64' ? 'aarch64' : 'x86_64'
    const identity = `${platform}:${architecture}`; if (identities.has(identity)) throw new Error(`Duplicate native binary ${identity}.`); identities.add(identity)
    return { platform, architecture, path: safePath(item.path), sha256: sha256(item.sha256) }
  })
  if (!binaries.length) throw new Error('Native extension must declare at least one platform binary.')
  return { abiVersion: NOVA_NATIVE_EXTENSION_ABI_VERSION, entrySymbol: 'nova_extension_v1', isolation: 'sidecar-process', heartbeatMs: integer(source.heartbeatMs, 1_000, 100, 30_000), restartLimit: integer(source.restartLimit, 2, 0, 5), permissions, binaries }
}

/** 结构说明（自动提取）：nativeExtensionLaunchPlan；输入 extensionId、value、platform、architecture、grantedPermissions；直接调用 normalizeNativeExtensionManifest、manifest.binaries.find、Error、Set、grantedPermissions.filter 等；包含显式抛错路径。 */ export function nativeExtensionLaunchPlan(extensionId: string, value: unknown, platform: NativeExtensionPlatform, architecture: NativeExtensionArchitecture, grantedPermissions: NativeExtensionPermission[]): NativeExtensionLaunchPlan {
  const manifest = normalizeNativeExtensionManifest(value), binary = manifest.binaries.find(/* 先计算 item.platform === platform；仅当其为真值时求右侧 item.architecture === architecture，返回短路求值结果。 */ item => item.platform === platform && item.architecture === architecture)
  if (!binary) throw new Error(`No ${platform}/${architecture} extension binary is installed.`)
  const grants = [...new Set(grantedPermissions.filter(/* 调用 manifest.permissions.includes(item) 并返回调用结果。 */ item => manifest.permissions.includes(item)))]
  if (manifest.permissions.some(/* 返回 grants.includes(permission) 的逻辑取反结果。 */ permission => !grants.includes(permission))) throw new Error('Every native extension permission requires explicit approval before launch.')
  return { extensionId: text(extensionId, 120), executable: binary.path, abiVersion: manifest.abiVersion, isolation: 'sidecar-process', grantedPermissions: grants, heartbeatMs: manifest.heartbeatMs, restartLimit: manifest.restartLimit, implicitExecution: false }
}

export interface PackageWizardDraft {
  id: string; name: string; version: string; description: string; entryPointType: PackageEntryPointType; pluginApi: number | null; native: boolean
  permissions: string[]; license: string; licenseUrl: string; documentationUrl: string; securityUrl: string; publisher: string; archiveSha256: string
  dependencies: Record<string, string>; dependencyHashes: Record<string, string>; visualNodes: PackageVisualNode[]
}
export interface PackageCertificationReport { status: 'passed' | 'blocked'; checks: Array<{ id: string; status: 'passed' | 'blocked'; detail: string }>; blocking: string[]; warnings: string[] }
export interface LocalRegistryDocument { format: 'nova-local-registry'; version: typeof NOVA_LOCAL_REGISTRY_VERSION; generatedAt: string; offline: true; packages: PackageManifest[] }

/** 结构说明（自动提取）：createPackageWizardDraft；无显式参数。 */ export function createPackageWizardDraft(): PackageWizardDraft {
  return { id: 'top.whitelists.my-package', name: 'My Nova Package', version: '1.0.0', description: '', entryPointType: 'editor', pluginApi: NOVA_PLUGIN_API_VERSION, native: false, permissions: [], license: 'MIT', licenseUrl: '', documentationUrl: '', securityUrl: '', publisher: 'Whitelist', archiveSha256: '', dependencies: {}, dependencyHashes: {}, visualNodes: [] }
}

/** 结构说明（自动提取）：packageManifestFromDraft；输入 draft、signature；直接调用 sha256、normalizePackageManifest、signature.startsWith。 */ export function packageManifestFromDraft(draft: PackageWizardDraft, signature = ''): PackageManifest {
  const archiveSha256 = sha256(draft.archiveSha256)
  return normalizePackageManifest({ manifestVersion: NOVA_PACKAGE_MANIFEST_VERSION, id: draft.id, name: draft.name, version: draft.version, description: draft.description, engine: `>=6.0.0 <27.0.0`, dependencies: draft.dependencies, dependencyHashes: draft.dependencyHashes, entryPointType: draft.entryPointType, apiCompatibility: '>=1 <2', pluginApi: draft.pluginApi, native: draft.native, sha256: archiveSha256, signature: signature && !signature.startsWith('ed25519-v1:') ? `ed25519-v1:${signature}` : signature, publisher: draft.publisher, publisherVerified: false, permissions: draft.permissions, rating: null, securityUrl: draft.securityUrl, documentationUrl: draft.documentationUrl, license: draft.license, licenseUrl: draft.licenseUrl, provenance: 'nova-publisher-request-v1', certification: 'uncertified' satisfies PluginApiCertification, vulnerabilityPolicy: 'Security reports must block Critical and High findings before Stable publication.', visualNodes: draft.visualNodes })
}

/** 结构说明（自动提取）：canonicalValue；输入 value；直接调用 Array.isArray、value.map、Object.fromEntries、map、sort 等；返回路径包含 value。 */ function canonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(/* 调用 left.localeCompare(right) 并返回调用结果。 */ ([left], [right]) => left.localeCompare(right)).map(/* 返回按声明顺序构造的数组 [key, canonicalValue(item)]。 */ ([key, item]) => [key, canonicalValue(item)]))
  return value
}

/** 结构说明（自动提取）：publisherSigningRequest；输入 manifest；直接调用 JSON.stringify、canonicalValue。 */ export function publisherSigningRequest(manifest: PackageManifest): string {
  const unsigned = { format: 'nova-publisher-signing-request', version: 1, engineVersion: NOVA_ENGINE_VERSION, manifestVersion: manifest.manifestVersion, package: { ...manifest, signature: '', publisherVerified: false }, archiveSha256: manifest.sha256, secretMaterialIncluded: false }
  return `${JSON.stringify(canonicalValue(unsigned), null, 2)}\n`
}

/** 结构说明（自动提取）：verifyPublisherSignature；输入 manifest、publicKeyBase64、signatureBase64；直接调用 Uint8Array.from、atob、crypto.subtle.importKey、crypto.subtle.verify、encode 等；写入 manifest.signature、manifest.publisherVerified；返回路径包含 verified；等待异步结果。 */ export async function verifyPublisherSignature(manifest: PackageManifest, publicKeyBase64: string, signatureBase64: string): Promise<boolean> {
  try {
    const keyBytes = Uint8Array.from(atob(publicKeyBase64), /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0)), signature = Uint8Array.from(atob(signatureBase64), /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'Ed25519' }, false, ['verify'])
    const verified = await crypto.subtle.verify({ name: 'Ed25519' }, key, signature, new TextEncoder().encode(publisherSigningRequest(manifest)))
    if (verified) {
      manifest.signature = `ed25519-v1:${signatureBase64}`; manifest.publisherVerified = true
      const fingerprintBytes = await crypto.subtle.digest('SHA-256', keyBytes), fingerprint = [...new Uint8Array(fingerprintBytes)].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('').slice(0, 32)
      markPublisherPackageVerified(manifest, fingerprint)
    }
    return verified
  } catch { return false }
}

/** 结构说明（自动提取）：scanPackageCandidate；输入 value、archive；直接调用 normalizePackageManifest、add、String、reviewPackageSecurity、security.blocking.join 等；写入 manifest。 */ export function scanPackageCandidate(value: unknown, archive?: { compressedBytes: number; expandedBytes: number; files: string[] }): PackageCertificationReport {
  const checks: PackageCertificationReport['checks'] = [], blocking: string[] = [], warnings: string[] = []
  const add = /** 结构说明（自动提取）：add；输入 id、passed、detail；直接调用 checks.push、blocking.push。 */ (id: string, passed: boolean, detail: string) => { checks.push({ id, status: passed ? 'passed' : 'blocked', detail }); if (!passed) blocking.push(detail) }
  let manifest: PackageManifest | null = null
  try { manifest = normalizePackageManifest(value); add('manifest', true, 'Manifest fields and bounds are valid.') } catch (error) { add('manifest', false, error instanceof Error ? error.message : String(error)) }
  if (manifest) {
    const security = reviewPackageSecurity(manifest); add('trust', !security.blocking.length, security.blocking.join(' ') || 'Publisher, archive and dependencies satisfy the configured trust policy.'); warnings.push(...security.warnings)
    add('permission-bound', manifest.permissions.length <= 32, 'Package exceeds the 32-permission review bound.')
    add('native-isolation', !manifest.native, 'Native code cannot install through the in-process package browser; use the reviewed sidecar ABI workflow.')
    add('documentation', /^https:\/\//i.test(manifest.documentationUrl), 'Package documentation must use an HTTPS URL.')
    add('security-policy', /^https:\/\//i.test(manifest.securityUrl), 'Package security reporting must use an HTTPS URL.')
  }
  if (archive) {
    add('archive-size', Number.isFinite(archive.compressedBytes) && archive.compressedBytes > 0 && archive.compressedBytes <= MAX_PACKAGE_ARCHIVE_BYTES, 'Package archive is empty or exceeds 512 MB.')
    add('expansion-ratio', archive.expandedBytes <= Math.max(archive.compressedBytes * 100, 16 * 1024 * 1024), 'Package expansion ratio resembles an archive bomb.')
    add('archive-paths', archive.files.length <= 50_000 && archive.files.every(/* 先计算 path.length <= 240 && !path.replace(/\\/g, '/').split('/').includes('..')；仅当其为真值时求右侧 !/^(?:[a-z]+:|\/|\\\\)/i.test(path)，返回短路求值结果。 */ path => path.length <= 240 && !path.replace(/\\/g, '/').split('/').includes('..') && !/^(?:[a-z]+:|\/|\\\\)/i.test(path)), 'Package contains an unsafe path or exceeds 50,000 files.')
    add('hidden-executables', !archive.files.some(/* 调用 /\.(?:exe|dll|dylib|so|cmd|bat|ps1|sh)$/i.test(path) 并返回调用结果。 */ path => /\.(?:exe|dll|dylib|so|cmd|bat|ps1|sh)$/i.test(path)), 'Executable content requires the native sidecar review path.')
  }
  return { status: blocking.length ? 'blocked' : 'passed', checks, blocking, warnings }
}

/** 结构说明（自动提取）：createLocalRegistry；输入 manifests；直接调用 Error、sort、manifests.map、toISOString、Date；包含显式抛错路径。 */ export function createLocalRegistry(manifests: PackageManifest[]): LocalRegistryDocument {
  if (manifests.length > MAX_LOCAL_REGISTRY_PACKAGES) throw new Error(`Local registry exceeds ${MAX_LOCAL_REGISTRY_PACKAGES} packages.`)
  const packages = manifests.map(normalizePackageManifest).sort(/* 先计算 a.id.localeCompare(b.id)；仅当其为假值时求右侧 a.version.localeCompare(b.version)，返回短路求值结果。 */ (a, b) => a.id.localeCompare(b.id) || a.version.localeCompare(b.version))
  return { format: 'nova-local-registry', version: NOVA_LOCAL_REGISTRY_VERSION, generatedAt: new Date().toISOString(), offline: true, packages }
}

/** 结构说明（自动提取）：importLocalRegistry；输入 value；直接调用 Array.isArray、Error、addOfflineRegistryManifest、packageInstallReview；写入 packageState.offlineMode；包含循环处理；包含显式抛错路径。 */ export function importLocalRegistry(value: unknown): { imported: number; blocked: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Local registry must be an object.')
  const source = value as Partial<LocalRegistryDocument>; if (source.format !== 'nova-local-registry' || source.version !== 1 || source.offline !== true || !Array.isArray(source.packages)) throw new Error('Unsupported local registry document.')
  if (source.packages.length > MAX_LOCAL_REGISTRY_PACKAGES) throw new Error('Local registry package count exceeds its bound.')
  let imported = 0, blocked = 0
  for (const raw of source.packages) { try { const manifest = addOfflineRegistryManifest(raw); if (packageInstallReview(manifest).executionAllowed) imported++; else blocked++ } catch { blocked++ } }
  packageState.offlineMode = true
  return { imported, blocked }
}

export const ecosystemAuditState = reactive({ lastCertification: null as PackageCertificationReport | null, lastRegistryResult: null as { imported: number; blocked: number } | null, lifecycleReloads: 0, lifecycleFailures: 0 })
