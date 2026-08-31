import type { AssetType } from './types'

export type InterchangeFormat = 'aseprite-json' | 'texturepacker-json' | 'tiled-json' | 'tiled-xml' | 'atlas-json' | 'nova-native'
export interface InterchangeSlice {
  id: string
  sourceKey: string
  name: string
  frame: { x: number; y: number; width: number; height: number }
  sourceSize: { width: number; height: number }
  pivot: { x: number; y: number }
  rotated: boolean
  trimmed: boolean
  durationMs: number
  tags: string[]
  collider: Array<{ x: number; y: number }>
}
export interface ContentInterchangeMetadata {
  version: 1
  format: InterchangeFormat
  sourceName: string
  sourceHash: string
  texturePath: string
  mapSize: { width: number; height: number } | null
  slices: InterchangeSlice[]
  diagnostics: Array<{ severity: 'info' | 'warning' | 'error'; code: string; message: string }>
}
export interface ContentInterchangeResult {
  assetType: Extract<AssetType, 'atlas' | 'tileset'>
  mimeType: string
  source: string
  metadata: ContentInterchangeMetadata
}
const resultCache = new Map<string, ContentInterchangeResult | null>()

const MAX_SOURCE_BYTES = 16 * 1024 * 1024
const MAX_SLICES = 65_536
const MAX_TILED_CELLS = 4_194_304

function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
function text(value: unknown, fallback = '', limit = 512): string { return typeof value === 'string' ? value.slice(0, limit) : fallback }
function integer(value: unknown, fallback = 0, minimum = 0, maximum = 1_000_000): number { const number = Number(value); return Math.round(Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback))) }
function unit(value: unknown, fallback = .5): number { const number = Number(value); return Math.min(1, Math.max(0, Number.isFinite(number) ? number : fallback)) }
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}
function stableId(value: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193); second = Math.imul(second ^ (code + index), 0x85ebca6b) }
  return `slice-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}
function hashText(value: string): string {
  let a = 0x811c9dc5, b = 0x9e3779b9, c = 0x27d4eb2f, d = 0x165667b1
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); a = Math.imul(a ^ code, 0x01000193); b = Math.imul(b ^ (code + index), 0x85ebca6b); c = Math.imul(c ^ (code + a), 0xc2b2ae35); d = Math.imul(d ^ (code + b), 0x27d4eb2f) }
  return [a, b, c, d, a ^ c, b ^ d, a ^ b, c ^ d].map(part => (part >>> 0).toString(16).padStart(8, '0')).join('')
}
function frameRectangle(value: unknown): InterchangeSlice['frame'] {
  const frame = object(value)
  return { x: integer(frame.x), y: integer(frame.y), width: integer(frame.w ?? frame.width, 1, 1), height: integer(frame.h ?? frame.height, 1, 1) }
}
function polygon(value: unknown): Array<{ x: number; y: number }> {
  return list(value).slice(0, 256).flatMap(item => { const point = object(item); const x = Number(point.x), y = Number(point.y); return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [] })
}
function frameTags(document: Record<string, unknown>): Map<number, string[]> {
  const tags = new Map<number, string[]>(), meta = object(document.meta)
  for (const raw of list(meta.frameTags).slice(0, 4_096)) {
    const tag = object(raw), name = text(tag.name, 'tag', 120), from = integer(tag.from), to = integer(tag.to, from)
    for (let index = Math.min(from, to); index <= Math.max(from, to) && index < MAX_SLICES; index++) tags.set(index, [...(tags.get(index) ?? []), name])
  }
  return tags
}
function sliceFromFrame(sourceKey: string, name: string, rawValue: unknown, index: number, tags: Map<number, string[]>): InterchangeSlice {
  const raw = object(rawValue), rectangle = frameRectangle(raw.frame ?? raw), source = object(raw.sourceSize), pivot = object(raw.pivot)
  const spriteSource = object(raw.spriteSourceSize), collider = polygon(raw.collider ?? raw.polygon ?? raw.vertices)
  return {
    id: stableId(sourceKey), sourceKey, name: name.slice(0, 240), frame: rectangle,
    sourceSize: { width: integer(source.w ?? source.width, rectangle.width, 1), height: integer(source.h ?? source.height, rectangle.height, 1) },
    pivot: { x: unit(pivot.x, spriteSource.x === undefined ? .5 : (Number(spriteSource.x) + rectangle.width / 2) / Math.max(1, Number(source.w) || rectangle.width)), y: unit(pivot.y, spriteSource.y === undefined ? .5 : (Number(spriteSource.y) + rectangle.height / 2) / Math.max(1, Number(source.h) || rectangle.height)) },
    rotated: raw.rotated === true, trimmed: raw.trimmed === true, durationMs: integer(raw.duration, 0, 0, 3_600_000), tags: [...new Set(tags.get(index) ?? [])].sort(), collider
  }
}
function atlasFrames(document: Record<string, unknown>): InterchangeSlice[] {
  const tags = frameTags(document), frames = document.frames
  if (Array.isArray(frames)) return frames.slice(0, MAX_SLICES).map((raw, index) => { const item = object(raw), name = text(item.filename ?? item.name, `frame-${index}`, 240); return sliceFromFrame(name, name, item, index, tags) })
  return Object.entries(object(frames)).sort(([a], [b]) => a.localeCompare(b)).slice(0, MAX_SLICES).map(([name, raw], index) => sliceFromFrame(name, name, raw, index, tags))
}
function detectJsonFormat(name: string, document: Record<string, unknown>): InterchangeFormat | null {
  const lower = name.toLowerCase(), meta = object(document.meta), app = text(meta.app).toLowerCase()
  if (app.includes('aseprite') || lower.endsWith('.aseprite.json') || lower.endsWith('.ase.json')) return 'aseprite-json'
  if (app.includes('texturepacker') || text(meta.smartupdate).length || lower.endsWith('.tpsheet') || lower.endsWith('.texturepacker.json')) return 'texturepacker-json'
  if (text(document.type).toLowerCase() === 'map' || text(document.type).toLowerCase() === 'tileset' || Array.isArray(document.layers) && ('tilewidth' in document || 'tilesets' in document)) return 'tiled-json'
  if (document.frames && meta) return 'atlas-json'
  return null
}
function tiledProperties(value: unknown): Record<string, string | number | boolean> { return Object.fromEntries(list(value).slice(0, 128).flatMap(raw => { const property = object(raw), name = text(property.name, '', 120), item = property.value; return name && ['string', 'number', 'boolean'].includes(typeof item) ? [[name, item as string | number | boolean]] : [] })) }
function tiledTileSet(document: Record<string, unknown>): Record<string, unknown> {
  const tileWidth = integer(document.tilewidth, 32, 1, 16_384), tileHeight = integer(document.tileheight, 32, 1, 16_384)
  const imageWidth = integer(document.imagewidth, tileWidth, tileWidth), imageHeight = integer(document.imageheight, tileHeight, tileHeight)
  const columns = integer(document.columns, Math.max(1, Math.floor(imageWidth / tileWidth)), 1, 65_536), tileCount = integer(document.tilecount, Math.max(1, columns * Math.floor(imageHeight / tileHeight)), 1, 65_536)
  const rawTiles = new Map(list(document.tiles).map(raw => [integer(object(raw).id), object(raw)]))
  return { version: 2, textureAsset: null, sources: [{ id: 'tiled-primary', name: text(document.name, 'Tiled source', 120), textureAsset: null, margin: integer(document.margin), spacing: integer(document.spacing) }], tileWidth, tileHeight, columns, rows: Math.max(1, Math.ceil(tileCount / columns)), tiles: Array.from({ length: tileCount }, (_, index) => { const raw = rawTiles.get(index) ?? {}, animation = list(raw.animation).slice(0, 256).map(item => object(item)); return { index, name: text(raw.type ?? raw.class, `Tile ${index}`, 120), collision: list(object(raw.objectgroup).objects).length ? 'Polygon' : 'None', polygon: [], terrain: text(raw.terrain), navigationCost: 1, occluder: false, navigationPolygon: [], occlusionPolygon: [], metadata: tiledProperties(raw.properties), sceneAsset: null, prefabAsset: null, sourceId: 'tiled-primary', region: null, animation: animation.length ? { frames: animation.map(frame => integer(frame.tileid, index, 0, tileCount - 1)), framesPerSecond: Math.min(240, Math.max(.01, 1000 / Math.max(1, Number(animation[0].duration) || 125))), mode: 'Loop' } : null, variants: [] } }) }
}
function tiledMapResource(document: Record<string, unknown>): Record<string, unknown> {
  const width = integer(document.width, 1, 1, 2_048), height = integer(document.height, 1, 1, Math.min(2_048, Math.floor(MAX_TILED_CELLS / width)))
  const layers = list(document.layers).slice(0, 128).flatMap((raw, index) => { const layer = object(raw); if (!Array.isArray(layer.data)) return []; const data = layer.data.slice(0, width * height).map(value => Math.max(-1, integer(value, 0) - 1)); while (data.length < width * height) data.push(-1); const rawOpacity = Number(layer.opacity); return [{ id: text(layer.id, `layer-${index}`, 80), name: text(layer.name, `Layer ${index + 1}`, 120), visible: layer.visible !== false, opacity: Math.min(1, Math.max(0, Number.isFinite(rawOpacity) ? rawOpacity : 1)), parallax: { x: Number(layer.parallaxx) || 1, y: Number(layer.parallaxy) || 1 }, tiles: data, properties: tiledProperties(layer.properties) }] })
  return { format: 'nova-tiled-map-resource', version: 1, width, height, tileWidth: integer(document.tilewidth, 32, 1, 16_384), tileHeight: integer(document.tileheight, 32, 1, 16_384), infinite: document.infinite === true, layers, tilesets: list(document.tilesets).slice(0, 256).map(raw => { const item = object(raw); return { firstGid: integer(item.firstgid, 1, 1), source: text(item.source, '', 1024) } }), properties: tiledProperties(document.properties) }
}
function parseTiledXml(source: string): Record<string, unknown> {
  const root = /<(map|tileset)\b([^>]*)>/i.exec(source)
  if (!root) throw new Error('TILED_XML_ROOT: Expected a <map> or <tileset> root element.')
  const attributes = (raw: string) => Object.fromEntries([...raw.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/g)].map(match => [match[1], match[3]]))
  const document: Record<string, unknown> = { ...attributes(root[2]), type: root[1].toLowerCase() === 'map' ? 'map' : 'tileset' }
  for (const key of ['width', 'height', 'tilewidth', 'tileheight', 'columns', 'tilecount', 'spacing', 'margin']) if (key in document) document[key] = Number(document[key])
  if (document.type === 'map') document.layers = [...source.matchAll(/<layer\b([^>]*)>([\s\S]*?)<\/layer>/gi)].slice(0, 128).map((match, index) => { const data = /<data\b[^>]*encoding\s*=\s*["']csv["'][^>]*>([\s\S]*?)<\/data>/i.exec(match[2]); return { ...attributes(match[1]), id: attributes(match[1]).id ?? `layer-${index}`, data: data ? data[1].split(',').map(value => Number(value.trim()) || 0) : [] } })
  return document
}
export function detectInterchangeFormat(fileName: string, source: string): InterchangeFormat | null {
  const lower = fileName.toLowerCase()
  if (/\.(tmx|tsx)$/.test(lower)) return 'tiled-xml'
  if (!/\.(json|tmj|tsj|tpsheet|atlas)$/.test(lower)) return null
  try { return detectJsonFormat(lower, object(JSON.parse(source))) } catch { return null }
}
export function importContentInterchange(fileName: string, source: string, previous?: ContentInterchangeMetadata | null): ContentInterchangeResult | null {
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) throw new Error(`CONTENT_SOURCE_LIMIT: ${fileName} exceeds the 16 MiB metadata limit.`)
  const format = detectInterchangeFormat(fileName, source)
  if (!format) return null
  const cacheKey = previous ? '' : `${fileName.toLowerCase()}:${hashText(source)}`
  if (cacheKey && resultCache.has(cacheKey)) return structuredClone(resultCache.get(cacheKey) ?? null)
  const document = format === 'tiled-xml' ? parseTiledXml(source) : object(JSON.parse(source))
  const diagnostics: ContentInterchangeMetadata['diagnostics'] = []
  let assetType: 'atlas' | 'tileset', generated: Record<string, unknown>, slices: InterchangeSlice[] = [], texturePath = ''
  if (format === 'tiled-json' || format === 'tiled-xml') {
    const isMap = text(document.type).toLowerCase() === 'map' || Array.isArray(document.layers)
    generated = isMap ? tiledMapResource(document) : tiledTileSet(document)
    assetType = 'tileset'; texturePath = text(document.image ?? object(document.tileset).image, '', 1024)
    if (isMap) diagnostics.push({ severity: 'info', code: 'TILED_MAP_RESOURCE', message: 'Map layers were imported as a deterministic contextual TileMap resource; assign its TileSet references before painting.' })
  } else {
    slices = atlasFrames(document)
    const previousIds = new Map((previous?.slices ?? []).map(slice => [slice.sourceKey, slice.id]))
    for (const slice of slices) slice.id = previousIds.get(slice.sourceKey) ?? slice.id
    const meta = object(document.meta); texturePath = text(meta.image ?? document.image, '', 1024)
    const size = object(meta.size)
    generated = { format: 'nova-atlas', version: 2, sourceFormat: format, textureAsset: null, texturePath, width: integer(size.w ?? size.width), height: integer(size.h ?? size.height), slices }
    assetType = 'atlas'
    if (!slices.length) diagnostics.push({ severity: 'warning', code: 'ATLAS_EMPTY', message: 'The metadata contains no usable frames.' })
  }
  const mapSize = assetType === 'tileset' && 'width' in generated ? { width: integer(generated.width, 1, 1), height: integer(generated.height, 1, 1) } : null
  const canonicalSource = `${JSON.stringify(JSON.parse(stable(generated)), null, 2)}\n`
  const result:ContentInterchangeResult = { assetType, mimeType: assetType === 'atlas' ? 'application/x-nova-atlas+json' : 'application/x-nova-tileset+json', source: canonicalSource, metadata: { version: 1, format, sourceName: fileName.slice(0, 240), sourceHash: hashText(source), texturePath, mapSize, slices, diagnostics } }
  if (cacheKey) { resultCache.set(cacheKey, structuredClone(result)); if (resultCache.size > 32) resultCache.delete(resultCache.keys().next().value!) }
  return result
}

/** Uses an isolated worker for metadata large enough to affect pointer latency; small files avoid worker startup cost. */
export async function importContentInterchangeAsync(fileName:string,source:string,previous?:ContentInterchangeMetadata|null):Promise<ContentInterchangeResult|null>{
  if(typeof Worker==='undefined'||source.length<131_072)return importContentInterchange(fileName,source,previous)
  const worker=new Worker(new URL('./contentInteroperability.worker.ts',import.meta.url),{type:'module'}),requestId=stableId(`${fileName}:${source.length}:${performance.now()}`)
  return new Promise((resolve,reject)=>{const timeout=window.setTimeout(()=>{worker.terminate();reject(new Error('CONTENT_IMPORT_TIMEOUT: Metadata processing exceeded 10 seconds.'))},10_000);worker.onmessage=event=>{if(event.data?.id!==requestId)return;window.clearTimeout(timeout);worker.terminate();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.result as ContentInterchangeResult|null)};worker.onerror=event=>{window.clearTimeout(timeout);worker.terminate();reject(new Error(event.message))};worker.postMessage({id:requestId,fileName,source,previous})})
}

export function validateInterchangeMetadata(value: ContentInterchangeMetadata | null | undefined): ContentInterchangeMetadata | null {
  if (!value || value.version !== 1 || !['aseprite-json', 'texturepacker-json', 'tiled-json', 'tiled-xml', 'atlas-json', 'nova-native'].includes(value.format)) return null
  const slices = list(value.slices).slice(0, MAX_SLICES).flatMap((raw, index) => { const item = object(raw), sourceKey = text(item.sourceKey, `frame-${index}`, 512), rectangle = frameRectangle(item.frame); return [{ id: text(item.id, stableId(sourceKey), 80), sourceKey, name: text(item.name, sourceKey, 240), frame: rectangle, sourceSize: { width: integer(object(item.sourceSize).width, rectangle.width, 1), height: integer(object(item.sourceSize).height, rectangle.height, 1) }, pivot: { x: unit(object(item.pivot).x), y: unit(object(item.pivot).y) }, rotated: item.rotated === true, trimmed: item.trimmed === true, durationMs: integer(item.durationMs, 0, 0, 3_600_000), tags: [...new Set(list(item.tags).map(tag => text(tag, '', 120)).filter(Boolean))].sort(), collider: polygon(item.collider) }] })
  return { version: 1, format: value.format, sourceName: text(value.sourceName, 'source', 240), sourceHash: text(value.sourceHash, '', 128), texturePath: text(value.texturePath, '', 1024), mapSize: value.mapSize ? { width: integer(value.mapSize.width, 1, 1), height: integer(value.mapSize.height, 1, 1) } : null, slices, diagnostics: list(value.diagnostics).slice(0, 512).flatMap(raw => { const item = object(raw), severity = ['warning', 'error'].includes(text(item.severity)) ? text(item.severity) as 'warning' | 'error' : 'info'; return [{ severity, code: text(item.code, 'CONTENT_INFO', 80), message: text(item.message, '', 2_000) }] }) }
}
