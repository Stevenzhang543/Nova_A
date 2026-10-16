/** One byte/value-only v1 reader. Hosts supply actual hash, bounded codecs and explicit budgets. */
export interface NovaPakEntry {
  path: string
  offset: number
  length: number
  originalLength: number
  codec: 'store' | 'gzip'
  mimeType?: string
  sha256: string
  assetUuid?: string
  assetType?: string
}
export interface NovaPakIndex {
  format: 'nova-pak'
  version: number
  engineVersion?: string
  createdAt?: string
  startupSceneUuid?: string
  physicsProfile?: Record<string, unknown>
  entries: NovaPakEntry[]
}
export interface ParsedNovaPak {
  index: NovaPakIndex
  files: Map<string, Uint8Array>
}

export const NOVA_PAK_MAGIC = 'NOVAPAK\0'
export const NOVA_PAK_HEADER_BYTES = 16
export const NOVA_PAK_VERSION = 1
const MAGIC = new TextEncoder().encode(NOVA_PAK_MAGIC)
const HEADER_BYTES = NOVA_PAK_HEADER_BYTES

export interface RuntimePakLimits {
  maximumPackageBytes: number
  maximumIndexBytes: number
  maximumEntries: number
  maximumProjectBytes: number
  maximumEntryDecodedBytes: number
  maximumDecodedBytes: number
}

/** Caller policy, not a PAKv1 format ceiling. Native anchors currently cover embedded/export packages and project preflight. */
const COMPATIBILITY_PACKAGE_BYTES = 1024 * 1024 * 1024
export const NOVA_PAK_COMPATIBILITY_LIMITS: Readonly<RuntimePakLimits> = Object.freeze({
  maximumPackageBytes: COMPATIBILITY_PACKAGE_BYTES,
  maximumIndexBytes: 16 * 1024 * 1024,
  maximumEntries: 20_000,
  maximumProjectBytes: 64 * 1024 * 1024,
  maximumEntryDecodedBytes: COMPATIBILITY_PACKAGE_BYTES,
  maximumDecodedBytes: COMPATIBILITY_PACKAGE_BYTES
})

export interface RuntimePakCapabilities {
  digestSha256(bytes: Uint8Array): Promise<string>
  gunzipBounded(bytes: Uint8Array, maximumDecodedBytes: number, signal?: AbortSignal): Promise<Uint8Array>
}

export function runtimePakAbortError(): Error {
  const error = new Error('Nova package operation was cancelled')
  error.name = 'AbortError'
  return error
}

export function assertRuntimePakActive(signal?: AbortSignal): void {
  if (signal?.aborted) throw runtimePakAbortError()
}

function bindCapabilities(capabilities: RuntimePakCapabilities): RuntimePakCapabilities {
  if (!capabilities || typeof capabilities.digestSha256 !== 'function' || typeof capabilities.gunzipBounded !== 'function') throw new Error('RUNTIME_PAK_CAPABILITIES_REQUIRED: Supply actual hash and bounded decompression capabilities.')
  return { digestSha256: capabilities.digestSha256.bind(capabilities), gunzipBounded: capabilities.gunzipBounded.bind(capabilities) }
}

function validateLimits(limits: RuntimePakLimits): void {
  if (!limits) throw new Error('RUNTIME_PAK_LIMITS_REQUIRED: Supply explicit entry and aggregate decoded budgets.')
  for (const field of ['maximumPackageBytes', 'maximumIndexBytes', 'maximumEntries', 'maximumProjectBytes', 'maximumEntryDecodedBytes', 'maximumDecodedBytes'] as const) {
    if (!Number.isSafeInteger(limits[field]) || limits[field] <= 0) throw new Error(`RUNTIME_PAK_LIMITS_REQUIRED: ${field} must be a positive safe integer.`)
  }
}

export function safePackagePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some(/* 比较 part 与 '..'，返回严格相等的判断结果。 */ part => part === '..')) throw new Error(`Unsafe package path: ${value}`)
  return normalized
}

function assertCanonicalPackagePath(value: unknown): asserts value is string {
  if (typeof value !== 'string' || safePackagePath(value) !== value) throw new Error(`Unsafe package path: ${String(value)}`)
}

/** Alias detection removes empty/dot segments, then uses the existing writer's JavaScript whole-string Unicode case policy. Stored opaque keys retain their spelling. */
export function runtimePackagePathKey(value: string): string {
  assertCanonicalPackagePath(value)
  return value.split('/').filter(part => part && part !== '.').join('/').toLowerCase()
}

export function validateRuntimePakJsonScalars(index: unknown): void {
  const pending: unknown[] = [index]
  while (pending.length) {
    const value = pending.pop()
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('Nova package index contains a non-finite number')
    if (typeof value === 'string') {
      for (let offset = 0; offset < value.length; offset++) {
        const character = value.charCodeAt(offset)
        if (character >= 0xd800 && character <= 0xdbff) {
          const next = value.charCodeAt(++offset)
          if (!(next >= 0xdc00 && next <= 0xdfff)) throw new Error('Nova package index contains an invalid Unicode scalar')
        } else if (character >= 0xdc00 && character <= 0xdfff) throw new Error('Nova package index contains an invalid Unicode scalar')
      }
    } else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) { pending.push(key, child) }
    }
  }
}

function validateEntryTable(index: NovaPakIndex, bytes: Uint8Array, dataStart: number, limits: RuntimePakLimits): void {
  validateRuntimePakJsonScalars(index)
  if ((index.engineVersion !== undefined && typeof index.engineVersion !== 'string') || (index.createdAt !== undefined && typeof index.createdAt !== 'string') || (index.startupSceneUuid !== undefined && typeof index.startupSceneUuid !== 'string')
    || index.entries.length > limits.maximumEntries || (index.physicsProfile !== undefined && (!index.physicsProfile || typeof index.physicsProfile !== 'object' || Array.isArray(index.physicsProfile)))) throw new Error('Nova package index is invalid')
  const paths = new Set<string>(), identities = new Set<string>()
  const intervals: Array<{ start: number; end: number; path: string }> = []
  let decodedBytes = 0, projectEntries = 0
  for (const entry of index.entries) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Nova package entry is invalid')
    const pathKey = runtimePackagePathKey(entry.path)
    if (paths.has(pathKey)) throw new Error(`Duplicate package path: ${entry.path}`)
    paths.add(pathKey)
    if (entry.codec !== 'store' && entry.codec !== 'gzip') throw new Error(`Unsupported package codec: ${String(entry.codec)}`)
    if ((entry.mimeType !== undefined && typeof entry.mimeType !== 'string') || typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(entry.sha256)
      || (entry.assetUuid !== undefined && typeof entry.assetUuid !== 'string') || (entry.assetType !== undefined && typeof entry.assetType !== 'string')) throw new Error(`Package entry ${entry.path} is invalid`)
    if (entry.assetUuid !== undefined) {
      const identity = entry.assetUuid.toLowerCase()
      if (!identity || identities.has(identity)) throw new Error(`Duplicate or empty package asset identity: ${entry.path}`)
      identities.add(identity)
    }
    if (!Number.isSafeInteger(entry.offset) || !Number.isSafeInteger(entry.length) || !Number.isSafeInteger(entry.originalLength)
      || entry.offset < 0 || entry.length < 0 || entry.originalLength < 0) throw new Error(`Package entry ${entry.path} is outside the archive`)
    if (entry.codec === 'store' && entry.length !== entry.originalLength) throw new Error(`Package entry ${entry.path} has the wrong stored size`)
    if (entry.path === 'project.nova') {
      projectEntries++
      if (entry.originalLength === 0) throw new Error('Nova package project.nova is empty')
    }
    const start = dataStart + entry.offset, end = start + entry.length
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end > bytes.byteLength) throw new Error(`Package entry ${entry.path} is outside the archive`)
    const entryLimit = entry.path === 'project.nova' ? Math.min(limits.maximumEntryDecodedBytes, limits.maximumProjectBytes) : limits.maximumEntryDecodedBytes
    if (entry.originalLength > entryLimit) throw new Error(`RUNTIME_PAK_DECODED_LIMIT: ${entry.path} requires ${entry.originalLength} decoded bytes; configured entry limit is ${entryLimit}.`)
    decodedBytes += entry.originalLength
    if (!Number.isSafeInteger(decodedBytes) || decodedBytes > limits.maximumDecodedBytes) throw new Error(`RUNTIME_PAK_DECODED_LIMIT: The decoded package requires ${decodedBytes} bytes; configured aggregate limit is ${limits.maximumDecodedBytes}.`)
    if (entry.length > 0) intervals.push({ start, end, path: entry.path })
  }
  if (projectEntries !== 1) throw new Error('Nova package must have exactly one project.nova entry')
  intervals.sort((first, second) => first.start - second.start || first.end - second.end)
  for (let index = 1; index < intervals.length; index++) if (intervals[index].start < intervals[index - 1].end) throw new Error(`Package entry ${intervals[index].path} overlaps another entry`)
}

export async function parseRuntimeNovaPak(source: ArrayBuffer | Uint8Array, capabilities: RuntimePakCapabilities, limits: RuntimePakLimits, signal?: AbortSignal): Promise<ParsedNovaPak> {
  const { digestSha256, gunzipBounded } = bindCapabilities(capabilities)
  validateLimits(limits)
  assertRuntimePakActive(signal)
  if (!(source instanceof Uint8Array) && !(source instanceof ArrayBuffer)) throw new Error('Not a Nova package byte buffer')
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (bytes.byteLength > limits.maximumPackageBytes) throw new Error(`RUNTIME_PAK_PACKAGE_LIMIT: Package requires ${bytes.byteLength} bytes; configured package limit is ${limits.maximumPackageBytes}.`)
  if (bytes.byteLength < HEADER_BYTES || !MAGIC.every(/* 比较 bytes[index] 与 value，返回严格相等的判断结果。 */ (value, index) => bytes[index] === value)) throw new Error('Not a Nova package')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const version = view.getUint32(8, true)
  if (version !== NOVA_PAK_VERSION) throw new Error(`Unsupported Nova package version ${version}`)
  const indexLength = view.getUint32(12, true)
  if (indexLength > limits.maximumIndexBytes) throw new Error(`RUNTIME_PAK_INDEX_LIMIT: Index requires ${indexLength} bytes; configured index limit is ${limits.maximumIndexBytes}.`)
  if (indexLength <= 0 || HEADER_BYTES + indexLength > bytes.byteLength) throw new Error('Nova package index is truncated')
  const index = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + indexLength))) as NovaPakIndex
  if (!index || typeof index !== 'object' || Array.isArray(index) || index.format !== 'nova-pak' || index.version !== version || !Array.isArray(index.entries)) throw new Error('Nova package index is invalid')
  const dataStart = HEADER_BYTES + indexLength
  validateEntryTable(index, bytes, dataStart, limits)
  const files = new Map<string, Uint8Array>()
  for (const entry of index.entries) {
    assertRuntimePakActive(signal)
    safePackagePath(entry.path)
    if (!Number.isSafeInteger(entry.offset) || !Number.isSafeInteger(entry.length) || entry.offset < 0 || entry.length < 0 || dataStart + entry.offset + entry.length > bytes.byteLength) throw new Error(`Package entry ${entry.path} is outside the archive`)
    const stored = bytes.slice(dataStart + entry.offset, dataStart + entry.offset + entry.length)
    const decoded = entry.codec === 'gzip' ? await gunzipBounded(stored, entry.originalLength, signal) : stored
    assertRuntimePakActive(signal)
    if (decoded.byteLength !== entry.originalLength) throw new Error(`Package entry ${entry.path} has the wrong size`)
    if (await digestSha256(decoded) !== entry.sha256.toLowerCase()) throw new Error(`Package entry ${entry.path} failed its checksum`)
    assertRuntimePakActive(signal)
    files.set(entry.path, decoded)
  }
  assertRuntimePakActive(signal)
  return { index, files }
}

export function bytesToBase64(bytes: Uint8Array): string {
  let result = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) result += String.fromCharCode(...bytes.subarray(index, index + chunk))
  return btoa(result)
}

export function projectJsonFromParsedNovaPak(parsed: ParsedNovaPak): string {
  const projectBytes = parsed.files.get('project.nova')
  if (!projectBytes) throw new Error('Nova package has no project.nova entry')
  const project = JSON.parse(new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(projectBytes)) as Record<string, unknown>
  validateRuntimePakJsonScalars(project)
  const assets = Array.isArray(project.assets) ? project.assets as Array<Record<string, unknown>> : []
  for (const asset of assets) {
    const path = typeof asset.path === 'string' ? asset.path : ''
    const bytes = parsed.files.get(path)
    if (!bytes) continue
    const mimeType = typeof asset.mimeType === 'string' && asset.mimeType ? asset.mimeType : 'application/octet-stream'
    asset.source = `data:${mimeType};base64,${bytesToBase64(bytes)}`
  }
  if (parsed.index.startupSceneUuid) project.activeSceneUuid = parsed.index.startupSceneUuid
  return JSON.stringify(project)
}
