/** 扩展生态交付：整理扩展及包的发布配置，检查交付依赖与兼容信息。 */
import { reactive } from 'vue'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'
import { applyVerifiedPackageSecurityBulletin, compareVersions, diagnosePackageResolution, packageState, reviewPackageSecurity, type PackageManifest, type PackageSolverDiagnostic } from './packages'
import { canonicalReleaseJson, stableReleaseFingerprint, type BuildManifestFile } from './releaseEngineering'

export const NOVA_PACKAGE_ARCHIVE_VERSION = 1 as const
export const NOVA_UPDATER_MANIFEST_VERSION = 1 as const
export const MAX_PUBLISHER_FILES = 50_000
export const MAX_PUBLISHER_FILE_BYTES = 256 * 1024 * 1024
export const MAX_PUBLISHER_TOTAL_BYTES = 512 * 1024 * 1024

export interface ReproduciblePackageFile { path: string; sha256: string; bytes: number; contentBase64?: string }
export interface ReproduciblePackageArchive {
  format: 'nova-package-archive'
  version: typeof NOVA_PACKAGE_ARCHIVE_VERSION
  package: PackageManifest
  sourceDateEpoch: number
  compression: 'store'
  files: ReproduciblePackageFile[]
  archiveSha256: string
  reproducible: true
}
export interface PublisherValidation {
  status: 'passed' | 'blocked'
  checks: Array<{ id: string; status: 'passed' | 'blocked'; detail: string }>
  solver: PackageSolverDiagnostic
  archiveFingerprint: string
  blocking: string[]
}
export interface PackageSecurityBulletin {
  format: 'nova-package-security-bulletin'
  version: 1
  bulletinId: string
  issuedAt: string
  sequence: number
  signedBy: string
  signature: string
  revocations: Array<{ id: string; version: string; sha256: string; reason: string }>
  vulnerabilities: Array<{ advisoryId: string; id: string; affected: string; severity: 'low' | 'moderate' | 'high' | 'critical'; summary: string; fixedVersion: string }>
}
export interface SignedUpdaterManifest {
  format: 'nova-signed-update'
  version: typeof NOVA_UPDATER_MANIFEST_VERSION
  product: 'Nova_A'
  channel: 'stable' | 'preview'
  release: string
  sequence: number
  publishedAt: string
  minimumVersion: string
  artifact: { url: string; sha256: string; bytes: number; kind: 'msi' | 'nsis' | 'portable' }
  signature: string
  signingFingerprint: string
}
export interface UpdatePlan {
  release: string
  from: string
  sequence: number
  artifact: SignedUpdaterManifest['artifact']
  explicitNetworkRequired: true
  implicitNetworkOperation: false
  verified: true
  rollbackVersion: string
}
export interface MatchingHostPipeline { id: string; host: 'windows' | 'ubuntu' | 'macos'; target: string; architecture: 'x86_64' | 'aarch64'; command: string; status: 'local-ready' | 'pending-external' }
export interface ShippingEvidencePlan { files: string[]; signingHooks: string[]; lifecycle: Array<{ action: 'install' | 'launch' | 'upgrade' | 'repair' | 'uninstall'; evidence: string; status: 'pending-external' }>; networkDefault: 'disabled' }

export const ecosystemShippingState = reactive({
  updaterOptIn: false,
  updaterChannel: 'stable' as 'stable' | 'preview',
  highestUpdaterSequence: 0,
  lastSecuritySequence: 0,
  stagedUpdate: null as UpdatePlan | null,
  previousRelease: '' as string,
  appliedRelease: NOVA_ENGINE_VERSION,
  updaterStatus: 'disabled' as 'disabled' | 'idle' | 'staged' | 'applied' | 'rolled-back' | 'blocked',
  lastPublisherValidation: null as PublisherValidation | null,
  lastSecurityResult: null as null | { revoked: number; vulnerable: number; disabled: number }
})

/** 结构说明（自动提取）：safeRelativePath；输入 value；直接调用 replace、value.trim、path.startsWith、includes、path.split 等；返回路径包含 path；包含显式抛错路径。 */ function safeRelativePath(value: string): string {
  const path = value.trim().replace(/\\/g, '/').replace(/^\.\//, '')
  if (!path || path.length > 240 || path.startsWith('/') || path.split('/').includes('..') || /^(?:[a-z]+:|\\\\)/i.test(path) || path.includes('\0')) throw new Error(`Unsafe package path: ${value.slice(0, 120)}`)
  if (/[<>:\x00-\x1f\x7f|?*]/.test(path) || path.split('/').some(/* 先计算 !part || part === '.' || /[. ]$/.test(part)；仅当其为假值时求右侧 /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)，返回短路求值结果。 */ part => !part || part === '.' || /[. ]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part))) throw new Error('Package path is not portable across supported filesystems: ' + value.slice(0, 120))
  return path
}
/* 调用 /^[a-f0-9]{64}$/.test(value) 并返回调用结果。 */ function validSha256(value: string): boolean { return /^[a-f0-9]{64}$/.test(value) }
/* 调用 canonicalReleaseJson({ ...value, signature: '' }) 并返回调用结果。 */ function canonicalUnsigned<T extends { signature: string }>(value: T): string { return canonicalReleaseJson({ ...value, signature: '' }) }
/** 结构说明（自动提取）：sha256Text；输入 value；直接调用 crypto.subtle.digest、encode、TextEncoder、join、map 等；等待异步结果。 */ async function sha256Text(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map(/* 调用 byte.toString(16).padStart(2, '0') 并返回调用结果。 */ byte => byte.toString(16).padStart(2, '0')).join('')
}
/** 结构说明（自动提取）：verifyEd25519；输入 message、publicKeyBase64、signatureBase64；直接调用 crypto.subtle.importKey、decode、crypto.subtle.verify、signatureBase64.replace、encode 等；等待异步结果。 */ async function verifyEd25519(message: string, publicKeyBase64: string, signatureBase64: string): Promise<boolean> {
  try {
    const decode = /* 调用 Uint8Array.from(atob(value), character => character.charCodeAt(0)) 并返回调用结果。 */ (value: string) => Uint8Array.from(atob(value), /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0))
    const key = await crypto.subtle.importKey('raw', decode(publicKeyBase64), { name: 'Ed25519' }, false, ['verify'])
    return crypto.subtle.verify({ name: 'Ed25519' }, key, decode(signatureBase64.replace(/^ed25519-v1:/, '')), new TextEncoder().encode(message))
  } catch { return false }
}
/** 结构说明（自动提取）：publicKeyFingerprint；输入 publicKeyBase64；直接调用 Uint8Array.from、atob、crypto.subtle.digest、slice、join 等；等待异步结果。 */ async function publicKeyFingerprint(publicKeyBase64: string): Promise<string> {
  try {
    const key = Uint8Array.from(atob(publicKeyBase64), /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0)), digest = await crypto.subtle.digest('SHA-256', key)
    return [...new Uint8Array(digest)].map(/* 调用 byte.toString(16).padStart(2, '0') 并返回调用结果。 */ byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 32)
  } catch { return '' }
}

/** Canonical package identity excludes wall-clock timestamps and file-system order. */
/** 结构说明（自动提取）：createReproduciblePackageArchive；输入 manifest、inputFiles、sourceDateEpoch；直接调用 Number.isSafeInteger、Error、Set、sort、inputFiles.map 等；等待异步结果；包含显式抛错路径。 */ export async function createReproduciblePackageArchive(manifest: PackageManifest, inputFiles: ReproduciblePackageFile[], sourceDateEpoch = 0): Promise<ReproduciblePackageArchive> {
  if (!Number.isSafeInteger(sourceDateEpoch) || sourceDateEpoch < 0) throw new Error('SOURCE_DATE_EPOCH must be a non-negative integer.')
  if (!inputFiles.length || inputFiles.length > MAX_PUBLISHER_FILES) throw new Error(`Package requires 1–${MAX_PUBLISHER_FILES} files.`)
  const identities = new Set<string>(), files = inputFiles.map(/** 结构说明（自动提取）：inputFiles.map 回调；输入 file；直接调用 safeRelativePath、path.toLocaleLowerCase、identities.has、Error、identities.add 等；包含显式抛错路径。 */ file => {
    const path = safeRelativePath(file.path), key = path.toLocaleLowerCase()
    if (identities.has(key)) throw new Error(`Duplicate package path: ${path}`)
    identities.add(key)
    const bytes = Math.round(file.bytes)
    if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_PUBLISHER_FILE_BYTES || !validSha256(file.sha256)) throw new Error(`Invalid package file metadata: ${path}`)
    return { path, sha256: file.sha256, bytes, ...(file.contentBase64 ? { contentBase64: file.contentBase64 } : {}) }
  }).sort(/* 调用 left.path.localeCompare(right.path) 并返回调用结果。 */ (left, right) => left.path.localeCompare(right.path))
  if (files.reduce(/* 计算表达式 sum + file.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.bytes, 0) > MAX_PUBLISHER_TOTAL_BYTES) throw new Error('Package expanded size exceeds 512 MB.')
  const identity = { format: 'nova-package-archive' as const, version: NOVA_PACKAGE_ARCHIVE_VERSION, package: { ...manifest, sha256: '', signature: '', publisherVerified: false }, sourceDateEpoch, compression: 'store' as const, files, reproducible: true as const }
  const archiveSha256 = await sha256Text(canonicalReleaseJson(identity))
  return { ...identity, package: manifest, archiveSha256, reproducible: true }
}

/** 结构说明（自动提取）：validateReproduciblePackageArchive；输入 value；直接调用 add、map、Array.isArray、Set、files.map 等；写入 files、ecosystemShippingState.lastPublisherValidation；返回路径包含 report。 */ export function validateReproduciblePackageArchive(value: unknown): PublisherValidation {
  const checks: PublisherValidation['checks'] = [], blocking: string[] = []
  const add = /** 结构说明（自动提取）：add；输入 id、passed、detail；直接调用 checks.push、blocking.push。 */ (id: string, passed: boolean, detail: string) => { checks.push({ id, status: passed ? 'passed' : 'blocked', detail }); if (!passed) blocking.push(detail) }
  const source = value && typeof value === 'object' ? value as Partial<ReproduciblePackageArchive> : {}
  let files: ReproduciblePackageFile[] = []
  add('format', source.format === 'nova-package-archive' && source.version === 1 && source.reproducible === true && source.compression === 'store', 'Archive must use canonical nova-package-archive v1 store mode.')
  try {
    files = (Array.isArray(source.files) ? source.files : []).map(/** 构造并返回记录 { ...file, path: safeRelativePath(file.path) }，字段按当前实参及捕获状态求值。 */ file => ({ ...file, path: safeRelativePath(file.path) }))
    const unique = new Set(files.map(/* 调用 file.path.toLocaleLowerCase() 并返回调用结果。 */ file => file.path.toLocaleLowerCase()))
    add('paths', files.length > 0 && files.length <= MAX_PUBLISHER_FILES && unique.size === files.length, 'Archive paths must be unique, relative and bounded.')
    add('hashes', files.every(/** 结构说明（自动提取）：files.every 回调；输入 file；直接调用 validSha256、Number.isSafeInteger；返回表达式求值结果。 */ file => validSha256(file.sha256) && Number.isSafeInteger(file.bytes) && file.bytes >= 0 && file.bytes <= MAX_PUBLISHER_FILE_BYTES), 'Every file needs a bounded byte count and SHA-256.')
    add('expanded-size', files.reduce(/* 计算表达式 sum + file.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.bytes, 0) <= MAX_PUBLISHER_TOTAL_BYTES, 'Expanded archive size must not exceed 512 MB.')
    add('hidden-executables', !files.some(/* 调用 /\.(?:exe|dll|dylib|so|cmd|bat|ps1|sh)$/i.test(file.path) 并返回调用结果。 */ file => /\.(?:exe|dll|dylib|so|cmd|bat|ps1|sh)$/i.test(file.path)), 'Executable content requires reviewed native-sidecar publishing.')
  } catch (error) { add('paths', false, error instanceof Error ? error.message : String(error)) }
  const solver = diagnosePackageResolution()
  add('solver', solver.status === 'resolved', solver.errors.join(' ') || 'Current dependency lock resolves deterministically.')
  const archiveFingerprint = stableReleaseFingerprint({ package: source.package, sourceDateEpoch: source.sourceDateEpoch, files })
  add('archive-identity', validSha256(String(source.archiveSha256 ?? '')), 'Archive identity must be a SHA-256 digest.')
  const report = { status: blocking.length ? 'blocked' : 'passed', checks, solver, archiveFingerprint, blocking } satisfies PublisherValidation
  ecosystemShippingState.lastPublisherValidation = report
  return report
}

/** 结构说明（自动提取）：createRegistryPublication；输入 manifest、archive；直接调用 validateReproduciblePackageArchive、Error、validation.blocking.join、toISOString、Date 等；包含显式抛错路径。 */ export function createRegistryPublication(manifest: PackageManifest, archive: ReproduciblePackageArchive): Record<string, unknown> {
  const validation = validateReproduciblePackageArchive(archive)
  if (validation.status !== 'passed' || archive.package.id !== manifest.id || archive.package.version !== manifest.version) throw new Error(validation.blocking.join(' ') || 'Package/archive identity mismatch.')
  return { format: 'nova-registry-publication', version: 1, generatedAt: new Date(0).toISOString(), package: manifest, archive: { sha256: archive.archiveSha256, sourceDateEpoch: archive.sourceDateEpoch, files: archive.files.map(/** 构造并返回记录 { path, sha256, bytes }，字段按当前实参及捕获状态求值。 */ ({ path, sha256, bytes }) => ({ path, sha256, bytes })) }, compatibility: { engine: manifest.engine, packageApi: manifest.apiCompatibility, pluginApi: manifest.pluginApi }, security: { permissions: manifest.permissions, license: manifest.license, securityUrl: manifest.securityUrl, vulnerabilityPolicy: manifest.vulnerabilityPolicy }, provenance: { publisher: manifest.publisher, statement: manifest.provenance, reproducible: true }, implicitNetworkOperation: false }
}

/** 结构说明（自动提取）：importSignedSecurityBulletin；输入 value、publicKeyBase64；直接调用 Error、Number.isSafeInteger、publicKeyFingerprint、verifyEd25519、canonicalUnsigned 等；写入 ecosystemShippingState.lastSecuritySequence、ecosystemShippingState.lastSecurityResult；返回路径包含 result；等待异步结果；包含显式抛错路径。 */ export async function importSignedSecurityBulletin(value: unknown, publicKeyBase64: string): Promise<{ revoked: number; vulnerable: number; disabled: number }> {
  if (!value || typeof value !== 'object') throw new Error('Security bulletin is missing.')
  const bulletin = value as PackageSecurityBulletin
  if (bulletin.format !== 'nova-package-security-bulletin' || bulletin.version !== 1 || !Number.isSafeInteger(bulletin.sequence) || bulletin.sequence <= ecosystemShippingState.lastSecuritySequence) throw new Error('Security bulletin is malformed, stale or replayed.')
  if (bulletin.signedBy !== await publicKeyFingerprint(publicKeyBase64)) throw new Error('Security bulletin key does not match its pinned signing fingerprint.')
  if (!await verifyEd25519(canonicalUnsigned(bulletin), publicKeyBase64, bulletin.signature)) throw new Error('Security bulletin signature is invalid.')
  const result = applyVerifiedPackageSecurityBulletin(bulletin)
  ecosystemShippingState.lastSecuritySequence = bulletin.sequence
  ecosystemShippingState.lastSecurityResult = result
  return result
}

/** 结构说明（自动提取）：normalizeUpdaterManifest；输入 value；直接调用 Array.isArray、Error、includes、test、Number.isSafeInteger 等；包含显式抛错路径。 */ export function normalizeUpdaterManifest(value: unknown): SignedUpdaterManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Updater manifest must be an object.')
  const source = value as SignedUpdaterManifest
  if (source.format !== 'nova-signed-update' || source.version !== 1 || source.product !== 'Nova_A' || !['stable', 'preview'].includes(source.channel)) throw new Error('Unsupported updater manifest.')
  if (!/^\d+\.\d+\.\d+(?:[-+].*)?$/.test(source.release) || !Number.isSafeInteger(source.sequence) || source.sequence <= 0 || !/^https:\/\//i.test(source.artifact?.url) || !validSha256(source.artifact?.sha256 ?? '') || !Number.isSafeInteger(source.artifact?.bytes) || source.artifact.bytes <= 0 || !['msi', 'nsis', 'portable'].includes(source.artifact.kind) || !/^ed25519-v1:/.test(source.signature) || !/^[a-f0-9]{16,64}$/.test(source.signingFingerprint)) throw new Error('Updater metadata is incomplete or outside its safety bounds.')
  return { ...source, artifact: { ...source.artifact } }
}

let updaterGeneration = 0

/** 结构说明（自动提取）：stageSignedUpdate；输入 value、publicKeyBase64；直接调用 Error、normalizeUpdaterManifest、test、compareVersions、publicKeyFingerprint 等；写入 ecosystemShippingState.stagedUpdate、ecosystemShippingState.updaterStatus；返回路径包含 plan；等待异步结果；包含显式抛错路径。 */ export async function stageSignedUpdate(value: unknown, publicKeyBase64: string): Promise<UpdatePlan> {
  if (!ecosystemShippingState.updaterOptIn) throw new Error('Updates are disabled. Opt in before checking a signed channel.')
  const generation = updaterGeneration, from = ecosystemShippingState.appliedRelease
  const manifest = normalizeUpdaterManifest(value)
  if (!/^\d+\.\d+\.\d+$/.test(manifest.minimumVersion) || compareVersions(from, manifest.minimumVersion) < 0) throw new Error('This update requires a newer installed base version.')
  if (manifest.channel !== ecosystemShippingState.updaterChannel) throw new Error(`Update belongs to the ${manifest.channel} channel.`)
  if (compareVersions(manifest.release, ecosystemShippingState.appliedRelease) <= 0 || manifest.sequence <= ecosystemShippingState.highestUpdaterSequence || manifest.sequence <= (ecosystemShippingState.stagedUpdate?.sequence ?? 0)) throw new Error('Update is stale, a downgrade, or a replay.')
  if (manifest.signingFingerprint !== await publicKeyFingerprint(publicKeyBase64)) throw new Error('Update key does not match its pinned signing fingerprint.')
  if (!await verifyEd25519(canonicalUnsigned(manifest), publicKeyBase64, manifest.signature)) throw new Error('Update signature is invalid.')
  if (generation !== updaterGeneration || !ecosystemShippingState.updaterOptIn || manifest.channel !== ecosystemShippingState.updaterChannel || from !== ecosystemShippingState.appliedRelease || manifest.sequence <= ecosystemShippingState.highestUpdaterSequence || manifest.sequence <= (ecosystemShippingState.stagedUpdate?.sequence ?? 0)) throw new Error('Update verification was superseded or cancelled.')
  const plan: UpdatePlan = { release: manifest.release, from: ecosystemShippingState.appliedRelease, sequence: manifest.sequence, artifact: { ...manifest.artifact }, explicitNetworkRequired: true, implicitNetworkOperation: false, verified: true, rollbackVersion: ecosystemShippingState.appliedRelease }
  ecosystemShippingState.stagedUpdate = plan; ecosystemShippingState.updaterStatus = 'staged'
  return plan
}

/** Records an operator-confirmed verified application. Native installers perform the actual atomic replacement. */
/** 结构说明（自动提取）：commitStagedUpdate；输入 artifactSha256；写入 ecosystemShippingState.updaterStatus、ecosystemShippingState.previousRelease、ecosystemShippingState.appliedRelease、ecosystemShippingState.highestUpdaterSequence 等。 */ export function commitStagedUpdate(artifactSha256: string): boolean {
  const plan = ecosystemShippingState.stagedUpdate
  if (!plan || !ecosystemShippingState.updaterOptIn || plan.from !== ecosystemShippingState.appliedRelease || plan.sequence <= ecosystemShippingState.highestUpdaterSequence || artifactSha256 !== plan.artifact.sha256) { ecosystemShippingState.updaterStatus = 'blocked'; return false }
  ecosystemShippingState.previousRelease = ecosystemShippingState.appliedRelease
  ecosystemShippingState.appliedRelease = plan.release
  ecosystemShippingState.highestUpdaterSequence = plan.sequence
  ecosystemShippingState.stagedUpdate = null; ecosystemShippingState.updaterStatus = 'applied'; return true
}
/** 结构说明（自动提取）：rollbackCommittedUpdate；无显式参数；写入 ecosystemShippingState.appliedRelease、ecosystemShippingState.previousRelease、ecosystemShippingState.updaterStatus。 */ export function rollbackCommittedUpdate(): boolean {
  if (!ecosystemShippingState.previousRelease) return false
  ecosystemShippingState.appliedRelease = ecosystemShippingState.previousRelease
  ecosystemShippingState.previousRelease = ''; ecosystemShippingState.updaterStatus = 'rolled-back'; return true
}
/** 结构说明（自动提取）：setUpdaterOptIn；输入 enabled；写入 ecosystemShippingState.updaterOptIn、ecosystemShippingState.updaterStatus、ecosystemShippingState.stagedUpdate。 */ export function setUpdaterOptIn(enabled: boolean): void {
  updaterGeneration++
  ecosystemShippingState.updaterOptIn = enabled
  ecosystemShippingState.updaterStatus = enabled ? 'idle' : 'disabled'
  if (!enabled) ecosystemShippingState.stagedUpdate = null
}

/** 结构说明（自动提取）：packageSecuritySnapshot；输入 manifest；直接调用 reviewPackageSecurity。 */ export function packageSecuritySnapshot(manifest: PackageManifest): { bulletin: string; revocations: number; vulnerabilities: number; quarantine: number; reviewStatus: string; blocking: string[] } {
  const review = reviewPackageSecurity(manifest)
  return { bulletin: packageState.lastSecurityBulletin, revocations: packageState.revocations.length, vulnerabilities: packageState.vulnerabilities.length, quarantine: packageState.quarantine.length, reviewStatus: review.status, blocking: [...review.blocking] }
}

/** 结构说明（自动提取）：matchingHostPipelines；无显式参数。 */ export function matchingHostPipelines(): MatchingHostPipeline[] {
  return [
    { id: 'windows-x64', host: 'windows', target: 'windows', architecture: 'x86_64', command: 'pnpm tauri build', status: 'local-ready' },
    { id: 'linux-x64', host: 'ubuntu', target: 'linux', architecture: 'x86_64', command: 'pnpm nova export --target linux --profile release', status: 'pending-external' },
    { id: 'macos-arm64', host: 'macos', target: 'macos', architecture: 'aarch64', command: 'pnpm nova export --target macos --profile release', status: 'pending-external' }
  ]
}

/** 结构说明（自动提取）：createShippingEvidencePlan；输入 files；直接调用 map、files.reduce。 */ export function createShippingEvidencePlan(files: BuildManifestFile[] = []): ShippingEvidencePlan & { artifactCount: number; totalBytes: number } {
  return {
    files: ['nova-build-provenance.json', 'nova-sbom.cdx.json', 'nova-patch-manifest.json', 'symbols/', 'crash-reporting-guidance.md'],
    signingHooks: ['Windows Authenticode identity (external)', 'macOS signing/notarization identity (matching host)', 'package Ed25519 publisher key (external private key)'],
    lifecycle: (['install', 'launch', 'upgrade', 'repair', 'uninstall'] as const).map(/** 构造并返回记录 { action, evidence: `disposable-host/${action}.json`, status: 'pending-external' as const }，字段按当前实参及捕获状态求值。 */ action => ({ action, evidence: `disposable-host/${action}.json`, status: 'pending-external' as const })),
    networkDefault: 'disabled', artifactCount: files.length, totalBytes: files.reduce(/* 计算表达式 sum + file.bytes 并返回结果，沿用操作数的原有类型规则。 */ (sum, file) => sum + file.bytes, 0)
  }
}
