import type { AssetRecord } from '../assets/types'

const MAGIC = new TextEncoder().encode('NOVAPAK\0')
const HEADER_BYTES = 16
export const NOVA_PAK_VERSION = 1

export interface NovaPakEntry {
  path: string
  offset: number
  length: number
  originalLength: number
  codec: 'store' | 'gzip'
  mimeType: string
  sha256: string
  assetUuid?: string
  assetType?: string
}

export interface NovaPakIndex {
  format: 'nova-pak'
  version: number
  engineVersion: string
  createdAt: string
  startupSceneUuid: string
  entries: NovaPakEntry[]
}

export interface ParsedNovaPak {
  index: NovaPakIndex
  files: Map<string, Uint8Array>
}

function concatenate(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0))
  let cursor = 0
  for (const part of parts) { result.set(part, cursor); cursor += part.byteLength }
  return result
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(value => value.toString(16).padStart(2, '0')).join('')
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', input)))
}

async function gzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (!('CompressionStream' in globalThis) || bytes.byteLength < 128) return null
  const stream = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (!('DecompressionStream' in globalThis)) throw new Error('This browser cannot decompress Nova packages')
  const stream = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function safePackagePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some(part => part === '..')) throw new Error(`Unsafe package path: ${value}`)
  return normalized
}

async function assetBytes(asset: AssetRecord): Promise<Uint8Array> {
  if (!asset.source) throw new Error(`Asset ${asset.name} has no imported source data`)
  const response = await fetch(asset.source)
  if (!response.ok && !asset.source.startsWith('data:') && !asset.source.startsWith('blob:')) throw new Error(`Could not read ${asset.path}`)
  return new Uint8Array(await response.arrayBuffer())
}

export async function createNovaPak(projectJson: string, assets: AssetRecord[], startupSceneUuid: string): Promise<Uint8Array> {
  const project = JSON.parse(projectJson) as Record<string, unknown>
  const developmentBuild = (project.projectSettings as { build?: { developmentBuild?: boolean } } | undefined)?.build?.developmentBuild !== false
  let projectAssets = Array.isArray(project.assets) ? project.assets as Array<Record<string, unknown>> : []
  const componentKinds = new Set((Array.isArray(project.scenes) ? project.scenes : []).flatMap(scene => {
    const entities = scene && typeof scene === 'object' && Array.isArray((scene as Record<string, unknown>).entities) ? (scene as { entities: unknown[] }).entities : []
    return entities.flatMap(entity => entity && typeof entity === 'object' && Array.isArray((entity as Record<string, unknown>).components)
      ? (entity as { components: Array<Record<string, unknown>> }).components.map(component => component.kind)
      : [])
  }).filter((kind): kind is string => typeof kind === 'string'))
  const usesRigging = componentKinds.has('Skeleton2D')
  const usesTimeline = componentKinds.has('TimelinePlayer')
  const excludedOptionalUuids = new Set(projectAssets.flatMap(asset => {
    const type = String(asset.assetType)
    const unused = (type === 'rig' || type === 'skin') ? !usesRigging : type === 'timeline' ? !usesTimeline : false
    return unused && typeof asset.uuid === 'string' ? [asset.uuid] : []
  }))
  projectAssets = projectAssets.filter(asset => !excludedOptionalUuids.has(String(asset.uuid)))
  project.assets = projectAssets
  for (const asset of projectAssets) {
    delete asset.source
    if (!developmentBuild && asset.assetType === 'script') delete asset.script
  }
  if (!developmentBuild) {
    const settings = project.projectSettings as { scripting?: Record<string, unknown> } | undefined
    if (settings?.scripting) {
      settings.scripting.debuggerEnabled = false
      delete settings.scripting.customSignals
    }
  }
  const projectBytes = new TextEncoder().encode(JSON.stringify(project))
  const sources: Array<{ path: string; bytes: Uint8Array; mimeType: string; asset?: AssetRecord }> = [
    { path: 'project.nova', bytes: projectBytes, mimeType: 'application/x-nova-project' }
  ]
  for (const asset of assets) {
    if (excludedOptionalUuids.has(asset.uuid)) continue
    sources.push({ path: safePackagePath(asset.path), bytes: await assetBytes(asset), mimeType: asset.mimeType || 'application/octet-stream', asset })
  }

  const entries: NovaPakEntry[] = []
  const blocks: Uint8Array[] = []
  let offset = 0
  for (const source of sources) {
    const compressed = await gzip(source.bytes)
    const useCompressed = compressed !== null && compressed.byteLength + 16 < source.bytes.byteLength
    const block = useCompressed ? compressed : source.bytes
    entries.push({
      path: source.path,
      offset,
      length: block.byteLength,
      originalLength: source.bytes.byteLength,
      codec: useCompressed ? 'gzip' : 'store',
      mimeType: source.mimeType,
      sha256: await sha256(source.bytes),
      assetUuid: source.asset?.uuid,
      assetType: source.asset?.assetType
    })
    blocks.push(block)
    offset += block.byteLength
  }

  const index: NovaPakIndex = {
    format: 'nova-pak', version: NOVA_PAK_VERSION,
    engineVersion: String(project.engineVersion ?? '2.4.0'),
    createdAt: new Date().toISOString(), startupSceneUuid, entries
  }
  const indexBytes = new TextEncoder().encode(JSON.stringify(index))
  const header = new Uint8Array(HEADER_BYTES)
  header.set(MAGIC)
  const view = new DataView(header.buffer)
  view.setUint32(8, NOVA_PAK_VERSION, true)
  view.setUint32(12, indexBytes.byteLength, true)
  return concatenate([header, indexBytes, ...blocks])
}

export async function parseNovaPak(source: ArrayBuffer | Uint8Array): Promise<ParsedNovaPak> {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (bytes.byteLength < HEADER_BYTES || !MAGIC.every((value, index) => bytes[index] === value)) throw new Error('Not a Nova package')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const version = view.getUint32(8, true)
  if (version !== NOVA_PAK_VERSION) throw new Error(`Unsupported Nova package version ${version}`)
  const indexLength = view.getUint32(12, true)
  if (indexLength <= 0 || HEADER_BYTES + indexLength > bytes.byteLength) throw new Error('Nova package index is truncated')
  const index = JSON.parse(new TextDecoder().decode(bytes.subarray(HEADER_BYTES, HEADER_BYTES + indexLength))) as NovaPakIndex
  if (index.format !== 'nova-pak' || index.version !== version || !Array.isArray(index.entries)) throw new Error('Nova package index is invalid')
  const dataStart = HEADER_BYTES + indexLength
  const files = new Map<string, Uint8Array>()
  for (const entry of index.entries) {
    safePackagePath(entry.path)
    if (!Number.isSafeInteger(entry.offset) || !Number.isSafeInteger(entry.length) || entry.offset < 0 || entry.length < 0 || dataStart + entry.offset + entry.length > bytes.byteLength) throw new Error(`Package entry ${entry.path} is outside the archive`)
    const stored = bytes.slice(dataStart + entry.offset, dataStart + entry.offset + entry.length)
    const decoded = entry.codec === 'gzip' ? await gunzip(stored) : stored
    if (decoded.byteLength !== entry.originalLength) throw new Error(`Package entry ${entry.path} has the wrong size`)
    if (await sha256(decoded) !== entry.sha256) throw new Error(`Package entry ${entry.path} failed its checksum`)
    files.set(entry.path, decoded)
  }
  return { index, files }
}

function bytesToBase64(bytes: Uint8Array): string {
  let result = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) result += String.fromCharCode(...bytes.subarray(index, index + chunk))
  return btoa(result)
}

export function packageBase64(bytes: Uint8Array): string { return bytesToBase64(bytes) }

export async function projectJsonFromNovaPak(source: ArrayBuffer | Uint8Array): Promise<string> {
  const parsed = await parseNovaPak(source)
  const projectBytes = parsed.files.get('project.nova')
  if (!projectBytes) throw new Error('Nova package has no project.nova entry')
  const project = JSON.parse(new TextDecoder().decode(projectBytes)) as Record<string, unknown>
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
