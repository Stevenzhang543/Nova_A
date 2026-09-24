/** Nova 资源包格式：组织文件索引与数据，读取、构建及校验归档内容。 */
import { localizationBuildDependencies } from '../assets/localizationDependencies'
import type { AssetRecord } from '../assets/types'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

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
  physicsProfile?: Record<string, unknown>
  entries: NovaPakEntry[]
}

export interface ParsedNovaPak {
  index: NovaPakIndex
  files: Map<string, Uint8Array>
}

/** 结构说明（自动提取）：concatenate；输入 parts；直接调用 Uint8Array、parts.reduce、result.set；写入 cursor；返回路径包含 result；包含循环处理。 */ function concatenate(parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce(/* 计算表达式 total + part.byteLength 并返回结果，沿用操作数的原有类型规则。 */ (total, part) => total + part.byteLength, 0))
  let cursor = 0
  for (const part of parts) { result.set(part, cursor); cursor += part.byteLength }
  return result
}

/* 调用 [...bytes].map(value => value.toString(16).padStart(2, '0')).join('') 并返回调用结果。 */ function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map(/* 调用 value.toString(16).padStart(2, '0') 并返回调用结果。 */ value => value.toString(16).padStart(2, '0')).join('')
}

/** 结构说明（自动提取）：sha256；输入 bytes；直接调用 bytes.buffer.slice、bytesToHex、Uint8Array、crypto.subtle.digest；等待异步结果。 */ async function sha256(bytes: Uint8Array): Promise<string> {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', input)))
}

/** 结构说明（自动提取）：gzip；输入 bytes；直接调用 pipeThrough、stream、Blob、bytes.buffer.slice、CompressionStream 等；等待异步结果。 */ async function gzip(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (!('CompressionStream' in globalThis) || bytes.byteLength < 128) return null
  const stream = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]).stream().pipeThrough(new CompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** 结构说明（自动提取）：gunzip；输入 bytes；直接调用 Error、pipeThrough、stream、Blob、bytes.buffer.slice 等；等待异步结果；包含显式抛错路径。 */ async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  if (!('DecompressionStream' in globalThis)) throw new Error('This browser cannot decompress Nova packages')
  const stream = new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

/** 结构说明（自动提取）：safePackagePath；输入 value；直接调用 replace、value.replace、some、normalized.split、Error；返回路径包含 normalized；包含显式抛错路径。 */ function safePackagePath(value: string): string {
  const normalized = value.replace(/\\/g, '/').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some(/* 比较 part 与 '..'，返回严格相等的判断结果。 */ part => part === '..')) throw new Error(`Unsafe package path: ${value}`)
  return normalized
}

const INLINE_TEXT_ASSET_TYPES = new Set(['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay', 'resource'])

/** 结构说明（自动提取）：assetBytes；输入 asset；直接调用 Error、INLINE_TEXT_ASSET_TYPES.has、asset.mimeType.startsWith、asset.mimeType.includes、test 等；等待异步结果；包含显式抛错路径。 */ async function assetBytes(asset: AssetRecord): Promise<Uint8Array> {
  if (!asset.source) throw new Error(`Asset ${asset.name} has no imported source data`)
  const inlineText = INLINE_TEXT_ASSET_TYPES.has(asset.assetType)
    || asset.mimeType?.startsWith('text/')
    || asset.mimeType?.includes('json')
    || asset.mimeType?.startsWith('application/x-nova-')
  if (inlineText && !/^(?:data:|blob:|https?:)/i.test(asset.source)) return new TextEncoder().encode(asset.source)
  const response = await fetch(asset.source)
  if (!response.ok && !asset.source.startsWith('data:') && !asset.source.startsWith('blob:')) throw new Error(`Could not read ${asset.path}`)
  return new Uint8Array(await response.arrayBuffer())
}

export interface NovaPakBuildOptions { deterministic?: boolean; compression?: 'store' | 'balanced' | 'maximum'; authoritativeAssets?: boolean }

/** 结构说明（自动提取）：createNovaPak；输入 projectJson、assets、startupSceneUuid、options；直接调用 assets.map、Set、toLowerCase、safePackagePath、asset.uuid.toLowerCase 等；写入 assets、projectAssets、project.assets、settings.scripting.debuggerEnabled 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ export async function createNovaPak(projectJson: string, assets: AssetRecord[], startupSceneUuid: string, options: NovaPakBuildOptions = {}): Promise<Uint8Array> {
  // All package identity/source fields are scalar: capture them before the first asynchronous read.
  assets=assets.map(/** 构造并返回记录 {...asset}，字段按当前实参及捕获状态求值。 */ asset=>({...asset}))
  const identities=new Set<string>(),paths=new Set(['project.nova'])
  for(const asset of assets){const path=safePackagePath(asset.path).toLowerCase(),id=asset.uuid.toLowerCase();if(identities.has(id)||paths.has(path))throw new Error(`Duplicate package asset identity/path: ${asset.path}`);identities.add(id);paths.add(path)}
  const project = JSON.parse(projectJson) as Record<string, unknown>
  const developmentBuild = (project.projectSettings as { build?: { developmentBuild?: boolean } } | undefined)?.build?.developmentBuild !== false
  const packageEntries = project.packages && typeof project.packages === 'object' && Array.isArray((project.packages as Record<string, unknown>).installed)
    ? (project.packages as { installed: Array<Record<string, unknown>> }).installed : []
  const networkingIncluded = packageEntries.some(/** 结构说明（自动提取）：packageEntries.some 回调；输入 item。 */ item => {
    const manifest = item.manifest && typeof item.manifest === 'object' ? item.manifest as Record<string, unknown> : {}
    return manifest.id === 'top.whitelists.novaa.networking' && item.enabled !== false && item.project !== false
  })
  const projectSettings = project.projectSettings && typeof project.projectSettings === 'object' ? project.projectSettings as Record<string, unknown> : {}
  const production = projectSettings.production && typeof projectSettings.production === 'object' ? projectSettings.production as Record<string, unknown> : null
  if (production && !networkingIncluded) delete production.networking
  let projectAssets = Array.isArray(project.assets) ? project.assets as Array<Record<string, unknown>> : []
  const componentKinds = new Set((Array.isArray(project.scenes) ? project.scenes : []).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 scene；直接调用 Array.isArray、entities.flatMap。 */ scene => {
    const entities = scene && typeof scene === 'object' && Array.isArray((scene as Record<string, unknown>).entities) ? (scene as { entities: unknown[] }).entities : []
    return entities.flatMap(/** 结构说明（自动提取）：entities.flatMap 回调；输入 entity；直接调用 Array.isArray、components.map；返回表达式求值结果。 */ entity => entity && typeof entity === 'object' && Array.isArray((entity as Record<string, unknown>).components)
      ? (entity as { components: Array<Record<string, unknown>> }).components.map(/* 返回 component.kind 的当前值。 */ component => component.kind)
      : [])
  }).filter(/* 比较 typeof kind 与 'string'，返回严格相等的判断结果。 */ (kind): kind is string => typeof kind === 'string'))
  const usesRigging = componentKinds.has('Skeleton2D')
  const usesTimeline = componentKinds.has('TimelinePlayer')
  const selectedLocaleAssets = localizationBuildDependencies(assets, project).assetUuids
  const excludedOptionalUuids = new Set(projectAssets.flatMap(/** 结构说明（自动提取）：projectAssets.flatMap 回调；输入 asset；直接调用 String、selectedLocaleAssets.has、toLowerCase。 */ asset => {
    const type = String(asset.assetType)
    const unused = (type === 'rig' || type === 'skin') ? !usesRigging : type === 'timeline' ? !usesTimeline : type === 'localization' ? !selectedLocaleAssets.has(String(asset.uuid).toLowerCase()) : false
    return unused && typeof asset.uuid === 'string' ? [asset.uuid] : []
  }))
  if(options.authoritativeAssets)excludedOptionalUuids.clear()
  const selectedUuids=new Set(assets.map(/* 返回 asset.uuid 的当前值。 */ asset=>asset.uuid))
  projectAssets = projectAssets.filter(/* 先计算 selectedUuids.has(String(asset.uuid))；仅当其为真值时求右侧 !excludedOptionalUuids.has(String(asset.uuid))，返回短路求值结果。 */ asset => selectedUuids.has(String(asset.uuid)) && !excludedOptionalUuids.has(String(asset.uuid)))
  project.assets = projectAssets
  for (const asset of projectAssets) {
    delete asset.source
    if (!developmentBuild && (asset.assetType === 'script' || asset.assetType === 'visualScript')) delete asset.script
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
  sources.sort(/* 根据 first.path < second.path 的真假，分别返回 -1 或 first.path > second.path ? 1 : 0。 */ (first, second) => first.path < second.path ? -1 : first.path > second.path ? 1 : 0)

  const entries: NovaPakEntry[] = []
  const blocks: Uint8Array[] = []
  let offset = 0
  for (const source of sources) {
    const compressed = options.compression === 'store' ? null : await gzip(source.bytes)
    const savingsRequired = options.compression === 'maximum' ? 0 : 16
    const useCompressed = compressed !== null && compressed.byteLength + savingsRequired < source.bytes.byteLength
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

  const physicsProfile = projectSettings.physics && typeof projectSettings.physics === 'object'
    ? (projectSettings.physics as { profile?: unknown }).profile
    : undefined
  const index: NovaPakIndex = {
    format: 'nova-pak', version: NOVA_PAK_VERSION,
    engineVersion: String(project.engineVersion ?? NOVA_ENGINE_VERSION),
    createdAt: options.deterministic === false ? new Date().toISOString() : '1970-01-01T00:00:00.000Z', startupSceneUuid,
    physicsProfile: physicsProfile && typeof physicsProfile === 'object' ? structuredClone(physicsProfile as Record<string, unknown>) : undefined,
    entries
  }
  const indexBytes = new TextEncoder().encode(JSON.stringify(index))
  const header = new Uint8Array(HEADER_BYTES)
  header.set(MAGIC)
  const view = new DataView(header.buffer)
  view.setUint32(8, NOVA_PAK_VERSION, true)
  view.setUint32(12, indexBytes.byteLength, true)
  return concatenate([header, indexBytes, ...blocks])
}

/** 结构说明（自动提取）：parseNovaPak；输入 source；直接调用 Uint8Array、MAGIC.every、Error、DataView、view.getUint32 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ export async function parseNovaPak(source: ArrayBuffer | Uint8Array): Promise<ParsedNovaPak> {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source)
  if (bytes.byteLength < HEADER_BYTES || !MAGIC.every(/* 比较 bytes[index] 与 value，返回严格相等的判断结果。 */ (value, index) => bytes[index] === value)) throw new Error('Not a Nova package')
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

/** 结构说明（自动提取）：bytesToBase64；输入 bytes；直接调用 String.fromCharCode、bytes.subarray、btoa；写入 index、result；包含循环处理。 */ function bytesToBase64(bytes: Uint8Array): string {
  let result = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) result += String.fromCharCode(...bytes.subarray(index, index + chunk))
  return btoa(result)
}

/* 调用 bytesToBase64(bytes) 并返回调用结果。 */ export function packageBase64(bytes: Uint8Array): string { return bytesToBase64(bytes) }

/** 结构说明（自动提取）：projectJsonFromNovaPak；输入 source；直接调用 parseNovaPak、parsed.files.get、Error、JSON.parse、decode 等；写入 asset.source、project.activeSceneUuid；包含循环处理；等待异步结果；包含显式抛错路径。 */ export async function projectJsonFromNovaPak(source: ArrayBuffer | Uint8Array): Promise<string> {
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
