/** 外部资源格式互通：识别图集、切片及地图输入，转换规范数据并验证导入元信息。 */
import type { AssetType } from './types'
import { BoundedImportCache } from './importRetention'
import { sha256Text } from './contentHash'
import { convertTiledMap, convertTiledTileSet } from './tiledInterchange'

export type InterchangeFormat = 'aseprite-json' | 'texturepacker-json' | 'tiled-json' | 'tiled-xml' | 'atlas-json' | 'nova-native'
export interface InterchangeSlice {
  id: string
  sourceKey: string
  /** Original playback order, independent of deterministic metadata sorting. */
  sourceIndex?: number
  name: string
  frame: { x: number; y: number; width: number; height: number }
  sourceSize: { width: number; height: number }
  trimOffset?: { x: number; y: number }
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
  /** Original bounded interchange text for repeatable reimport after save/reopen. */
  originalSource?: string
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
const resultCache = new BoundedImportCache<string, ContentInterchangeResult>(32, 64 * 1024 * 1024)

const MAX_SOURCE_BYTES = 16 * 1024 * 1024
const MAX_SLICES = 65_536
const ordinal=/* 根据 first<second 的真假，分别返回 -1 或 first>second?1:0。 */ (first:string,second:string)=>first<second?-1:first>second?1:0

/* 根据 value && typeof value === 'object' && !Array.isArray(value) 的真假，分别返回 value as Record<string, unknown> 或 {}。 */ function object(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
/* 根据 Array.isArray(value) 的真假，分别返回 value 或 []。 */ function list(value: unknown): unknown[] { return Array.isArray(value) ? value : [] }
/* 根据 typeof value === 'string' 的真假，分别返回 value.slice(0, limit) 或 fallback。 */ function text(value: unknown, fallback = '', limit = 512): string { return typeof value === 'string' ? value.slice(0, limit) : fallback }
/** 转换并限制数值为给定范围内整数，非有限输入使用默认值。 */ function integer(value: unknown, fallback = 0, minimum = 0, maximum = 1_000_000): number { const number = Number(value); return Math.round(Math.min(maximum, Math.max(minimum, Number.isFinite(number) ? number : fallback))) }
/** 把数值限制在零到一范围，非有限输入使用默认值。 */ function unit(value: unknown, fallback = .5): number { const number = Number(value); return Math.min(1, Math.max(0, Number.isFinite(number) ? number : fallback)) }
/** 按稳定对象键顺序序列化交换文档，保留数组顺序。 */ function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(/* 调用 ordinal(a,b) 并返回调用结果。 */ ([a], [b]) => ordinal(a,b)).map(/** 按模板 `${JSON.stringify(key)}:${stable(item)}` 生成并返回字符串。 */ ([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}
/** 从来源帧键生成稳定双摘要身份，便于重导入维持帧引用。 */ function stableId(value: string): string {
  let first = 0x811c9dc5, second = 0x9e3779b9
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193); second = Math.imul(second ^ (code + index), 0x85ebca6b) }
  return `slice-${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`
}
/* 调用 sha256Text(value) 并返回调用结果。 */ function hashText(value:string):string{return sha256Text(value)}

/** 兼容宽高字段别名并生成有界非零尺寸帧矩形。 */ function frameRectangle(value: unknown): InterchangeSlice['frame'] {
  const frame = object(value)
  return { x: integer(frame.x), y: integer(frame.y), width: integer(frame.w ?? frame.width, 1, 1), height: integer(frame.h ?? frame.height, 1, 1) }
}
/** 在顶点数量上限内保留具有有限二维坐标的点。 */ function polygon(value: unknown): Array<{ x: number; y: number }> {
  return list(value).slice(0, 256).flatMap(/** 只接受有限二维坐标，丢弃无效交换多边形点。 */ item => { const point = object(item); const x = Number(point.x), y = Number(point.y); return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [] })
}
/** 展开有界动画标签帧区间，生成每个帧索引对应的标签列表。 */ function frameTags(document: Record<string, unknown>): Map<number, string[]> {
  const tags = new Map<number, string[]>(), meta = object(document.meta)
  for (const raw of list(meta.frameTags).slice(0, 4_096)) {
    const tag = object(raw), name = text(tag.name, 'tag', 120), from = integer(tag.from), to = integer(tag.to, from)
    for (let index = Math.min(from, to); index <= Math.max(from, to) && index < MAX_SLICES; index++) tags.set(index, [...(tags.get(index) ?? []), name])
  }
  return tags
}
/** 从来源帧构造稳定切片身份、像素矩形、裁剪旋转、轴心、时长、标签及碰撞轮廓。 */ function sliceFromFrame(sourceKey: string, name: string, rawValue: unknown, index: number, tags: Map<number, string[]>): InterchangeSlice {
  const raw = object(rawValue), rectangle = frameRectangle(raw.frame ?? raw), source = object(raw.sourceSize), pivot = object(raw.pivot)
  const spriteSource = object(raw.spriteSourceSize), collider = polygon(raw.collider ?? raw.polygon ?? raw.vertices)
  return {
    id: stableId(sourceKey), sourceKey, sourceIndex: index, name: name.slice(0, 240), frame: rectangle,
    trimOffset: { x: integer(spriteSource.x), y: integer(spriteSource.y) },
    sourceSize: { width: integer(source.w ?? source.width, raw.rotated === true ? rectangle.height : rectangle.width, 1), height: integer(source.h ?? source.height, raw.rotated === true ? rectangle.width : rectangle.height, 1) },
    pivot: { x: unit(pivot.x, spriteSource.x === undefined ? .5 : (Number(spriteSource.x) + rectangle.width / 2) / Math.max(1, Number(source.w) || rectangle.width)), y: unit(pivot.y, spriteSource.y === undefined ? .5 : (Number(spriteSource.y) + rectangle.height / 2) / Math.max(1, Number(source.h) || rectangle.height)) },
    rotated: raw.rotated === true, trimmed: raw.trimmed === true, durationMs: integer(raw.duration, 0, 0, 3_600_000), tags: [...new Set(tags.get(index) ?? [])].sort(), collider
  }
}
/** 兼容数组和名称映射图集帧，保留来源索引并按需稳定排序。 */ function atlasFrames(document: Record<string, unknown>): InterchangeSlice[] {
  const tags = frameTags(document), frames = document.frames
  if (Array.isArray(frames)) return frames.slice(0, MAX_SLICES).map(/** 读取数组帧名称与稳定来源键，再转换统一切片记录。 */ (raw, index) => { const item = object(raw), name = text(item.filename ?? item.name, `frame-${index}`, 240); return sliceFromFrame(name, name, item, index, tags) })
  return Object.entries(object(frames)).slice(0, MAX_SLICES).map(/* 调用 sliceFromFrame(name, name, raw, index, tags) 并返回调用结果。 */ ([name, raw], index) => sliceFromFrame(name, name, raw, index, tags)).sort(/* 调用 ordinal(a.sourceKey,b.sourceKey) 并返回调用结果。 */ (a,b)=>ordinal(a.sourceKey,b.sourceKey))
}
/** 根据文件名、生成软件元信息和文档结构识别 Aseprite、TexturePacker、Tiled 或通用图集。 */ function detectJsonFormat(name: string, document: Record<string, unknown>): InterchangeFormat | null {
  const lower = name.toLowerCase(), meta = object(document.meta), app = text(meta.app).toLowerCase()
  if (app.includes('aseprite') || lower.endsWith('.aseprite.json') || lower.endsWith('.ase.json')) return 'aseprite-json'
  if (app.includes('texturepacker') || text(meta.smartupdate).length || lower.endsWith('.tpsheet') || lower.endsWith('.texturepacker.json')) return 'texturepacker-json'
  if (text(document.type).toLowerCase() === 'map' || text(document.type).toLowerCase() === 'tileset' || Array.isArray(document.layers) && ('tilewidth' in document || 'tilesets' in document)) return 'tiled-json'
  if (document.frames && meta) return 'atlas-json'
  return null
}
/** 解析受限简单图集与有限 CSV 地图 XML，拒绝实体声明和需 JSON 适配的复杂元信息。 */ function parseTiledXml(source: string): Record<string, unknown> {
  if (/<!DOCTYPE|<!ENTITY|<(?:group|objectgroup|imagelayer|tile|properties|wangsets|terraintypes)\b/i.test(source)) throw new Error('TILED_XML_LIMIT: Export JSON for object/collision/animation/property metadata; this XML adapter supports simple atlas tilesets and finite CSV tile layers.')
  const root = /<(map|tileset)\b([^>]*)>/i.exec(source)
  if (!root) throw new Error('TILED_XML_ROOT: Expected a <map> or <tileset> root element.')
  const decode = /** 解码 XML 五种内置字符实体，其他实体文本保持原样。 */ (text:string) => text.replace(/&(?:quot|apos|amp|lt|gt);/g, /** 把当前匹配的 XML 内置实体转换为对应字符。 */ value => ({'&quot;':'"','&apos;':"'",'&amp;':'&','&lt;':'<','&gt;':'>'}[value]!))
  const attributes = /** 从属性文本读取引号键值并解码内置 XML 实体。 */ (raw: string) => Object.fromEntries([...raw.matchAll(/([A-Za-z_:][\w:.-]*)\s*=\s*(["'])(.*?)\2/g)].map(/* 返回按声明顺序构造的数组 [match[1], decode(match[3])]。 */ match => [match[1], decode(match[3])]))
  const numeric = /** 将受支持的位置、透明度、视差字段转换为数值，可见和无限标记转换为布尔。 */ (values: Record<string,string>): Record<string,unknown> => Object.fromEntries(Object.entries(values).map(/** 按属性名转换支持的数值和布尔字段，其余保持原字符串。 */ ([key,value]) => ['x','y','offsetx','offsety','opacity','parallaxx','parallaxy'].includes(key) ? [key, Number(value)] : key === 'visible' || key === 'infinite' ? [key, value === '1' || value === 'true'] : [key,value]))
  const document: Record<string, unknown> = { ...numeric(attributes(root[2])), type: root[1].toLowerCase() === 'map' ? 'map' : 'tileset' }
  const image=/<image\b([^>]*)\/?>(?:<\/image>)?/i.exec(source)
  if(document.type==='tileset'&&image){const value=attributes(image[1]);document.image=value.source;document.imagewidth=Number(value.width);document.imageheight=Number(value.height)}
  if(document.type==='map'){
    document.tilesets=[...source.matchAll(/<tileset\b([^>]*)(?:\/>|>([\s\S]*?)<\/tileset>)/gi)].map(/** 读取外部瓦片集路径或递归解析嵌入瓦片集，并转换起始全局身份。 */ match=>{const value=attributes(match[1]);if(value.source)return {...value,firstgid:Number(value.firstgid)};return {...parseTiledXml('<tileset '+match[1]+'>'+match[2]+'</tileset>'),firstgid:Number(value.firstgid)}})
    document.layers=[...source.matchAll(/<layer\b([^>]*)>([\s\S]*?)<\/layer>/gi)].map(/** 要求未压缩 CSV 单元内容，检查整数瓦片身份并生成地图层记录。 */ (match,index)=>{const data=/<data\b([^>]*)>([\s\S]*?)<\/data>/i.exec(match[2]);if(!data||attributes(data[1]).encoding!=='csv'||attributes(data[1]).compression)throw new Error('TILED_XML_DATA: Export uncompressed CSV tile data.');const cells=data[2].trim().replace(/,\s*$/,'').split(',').map(/* 调用 Number(value.trim()) 并返回调用结果。 */ value=>Number(value.trim()));if(cells.some(/* 返回 Number.isSafeInteger(value) 的逻辑取反结果。 */ value=>!Number.isSafeInteger(value)))throw new Error('TILED_XML_DATA: Invalid tile ID.');return {...numeric(attributes(match[1])),id:attributes(match[1]).id??'layer-'+index,type:'tilelayer',data:cells}})
  }
  return document
}
/** 依据扩展名及可解析 JSON 结构检测支持的交换格式，无法识别返回 null。 */ export function detectInterchangeFormat(fileName: string, source: string): InterchangeFormat | null {
  const lower = fileName.toLowerCase()
  if (/\.(tmx|tsx)$/.test(lower)) return 'tiled-xml'
  if (!/\.(json|tmj|tsj|tpsheet|atlas)$/.test(lower)) return null
  try { return detectJsonFormat(lower, object(JSON.parse(source))) } catch { return null }
}
/** 在源和产物字节预算内转换地图或图集，保留原始源和旧帧身份，生成规范产物并缓存无旧状态结果。 */ export function importContentInterchange(fileName: string, source: string, previous?: ContentInterchangeMetadata | null): ContentInterchangeResult | null {
  if (new TextEncoder().encode(source).byteLength > MAX_SOURCE_BYTES) throw new Error(`CONTENT_SOURCE_LIMIT: ${fileName} exceeds the 16 MiB metadata limit.`)
  const format = detectInterchangeFormat(fileName, source)
  if (!format) return null
  const cacheKey = previous ? '' : `${fileName.toLowerCase()}:${hashText(source)}`
  const cached = cacheKey ? resultCache.get(cacheKey) : undefined
  if (cached) return structuredClone(cached)
  const document = format === 'tiled-xml' ? parseTiledXml(source) : object(JSON.parse(source))
  const diagnostics: ContentInterchangeMetadata['diagnostics'] = []
  let assetType: 'atlas' | 'tileset', generated: Record<string, unknown>, slices: InterchangeSlice[] = [], texturePath = ''
  if (format === 'tiled-json' || format === 'tiled-xml') {
    const isMap = text(document.type).toLowerCase() === 'map' || Array.isArray(document.layers)
    generated = isMap ? convertTiledMap(document) : convertTiledTileSet(document)
    assetType = 'tileset'; texturePath = text(document.image ?? object(document.tileset).image, '', 1024)
    if (isMap) diagnostics.push({ severity: 'info', code: 'TILED_MAP_RESOURCE', message: 'Finite map layers retain global tile IDs and stable tileset/image dependencies. Use Create tilemap in scene after resolving dependencies.' })
  } else {
    slices = atlasFrames(document)
    const previousIds = new Map((previous?.slices ?? []).map(/* 返回按声明顺序构造的数组 [slice.sourceKey, slice.id]。 */ slice => [slice.sourceKey, slice.id]))
    for (const slice of slices) slice.id = previousIds.get(slice.sourceKey) ?? slice.id
    const meta = object(document.meta); texturePath = text(meta.image ?? document.image, '', 1024)
    const size = object(meta.size)
    generated = { format: 'nova-atlas', version: 2, sourceFormat: format, textureAsset: null, texturePath, width: integer(size.w ?? size.width), height: integer(size.h ?? size.height), slices }
    assetType = 'atlas'
    if (!slices.length) diagnostics.push({ severity: 'warning', code: 'ATLAS_EMPTY', message: 'The metadata contains no usable frames.' })
  }
  const mapSize = assetType === 'tileset' && 'width' in generated ? { width: integer(generated.width, 1, 1), height: integer(generated.height, 1, 1) } : null
  const canonicalSource = `${JSON.stringify(JSON.parse(stable(generated)), null, 2)}\n`
  if (new TextEncoder().encode(canonicalSource).length > MAX_SOURCE_BYTES) throw new Error('CONTENT_ARTIFACT_LIMIT: Generated content exceeds the 16 MiB text artifact budget.')
  const result:ContentInterchangeResult = { assetType, mimeType: assetType === 'atlas' ? 'application/x-nova-atlas+json' : 'application/x-nova-tileset+json', source: canonicalSource, metadata: { version: 1, format, sourceName: fileName.slice(0, 240), sourceHash: hashText(source), originalSource: source, texturePath, mapSize, slices, diagnostics } }
  if (cacheKey) resultCache.set(cacheKey, structuredClone(result), new TextEncoder().encode(JSON.stringify(result)).length)
  return result
}

/** Uses an isolated worker for metadata large enough to affect pointer latency; small files avoid worker startup cost. */
/** 小文档或无 Worker 时同步转换，大文档委派带十秒超时的独立 Worker。 */ export async function importContentInterchangeAsync(fileName:string,source:string,previous?:ContentInterchangeMetadata|null):Promise<ContentInterchangeResult|null>{
  if(typeof Worker==='undefined'||source.length<131_072)return importContentInterchange(fileName,source,previous)
  const worker=new Worker(new URL('./contentInteroperability.worker.ts',import.meta.url),{type:'module'}),requestId=stableId(`${fileName}:${source.length}:${performance.now()}`)
  return new Promise(/** 登记交换转换 Worker 超时、回复及错误处理，并发送带请求身份的转换数据。 */ (resolve,reject)=>{const timeout=window.setTimeout(/** 超时后终止交换转换 Worker 并拒绝等待，避免无限挂起。 */ ()=>{worker.terminate();reject(new Error('CONTENT_IMPORT_TIMEOUT: Metadata processing exceeded 10 seconds.'))},10_000);worker.onmessage=/** 忽略非本次回复，完成时清理超时并终止 Worker，再交付结果或错误。 */ event=>{if(event.data?.id!==requestId)return;window.clearTimeout(timeout);worker.terminate();if(event.data.error)reject(new Error(event.data.error));else resolve(event.data.result as ContentInterchangeResult|null)};worker.onerror=/** 清理超时并终止失败 Worker，将错误消息交给调用者。 */ event=>{window.clearTimeout(timeout);worker.terminate();reject(new Error(event.message))};worker.postMessage({id:requestId,fileName,source,previous})})
}

/** 验证交换格式版本并规范化切片、原始源、地图尺寸及有界诊断列表。 */ export function validateInterchangeMetadata(value: ContentInterchangeMetadata | null | undefined): ContentInterchangeMetadata | null {
  if (!value || value.version !== 1 || !['aseprite-json', 'texturepacker-json', 'tiled-json', 'tiled-xml', 'atlas-json', 'nova-native'].includes(value.format)) return null
  const slices = list(value.slices).slice(0, MAX_SLICES).flatMap(/** 规范化单个恢复切片的身份、来源索引、几何、轴心、时长及标签碰撞数据。 */ (raw, index) => { const item = object(raw), sourceKey = text(item.sourceKey, `frame-${index}`, 512), rectangle = frameRectangle(item.frame); return [{ id: text(item.id, stableId(sourceKey), 80), sourceKey, sourceIndex: integer(item.sourceIndex, index, 0, MAX_SLICES - 1), name: text(item.name, sourceKey, 240), frame: rectangle, trimOffset: { x: integer(object(item.trimOffset).x), y: integer(object(item.trimOffset).y) }, sourceSize: { width: integer(object(item.sourceSize).width, rectangle.width, 1), height: integer(object(item.sourceSize).height, rectangle.height, 1) }, pivot: { x: unit(object(item.pivot).x), y: unit(object(item.pivot).y) }, rotated: item.rotated === true, trimmed: item.trimmed === true, durationMs: integer(item.durationMs, 0, 0, 3_600_000), tags: [...new Set(list(item.tags).map(/* 调用 text(tag, '', 120) 并返回调用结果。 */ tag => text(tag, '', 120)).filter(Boolean))].sort(), collider: polygon(item.collider) }] })
  return { version: 1, format: value.format, sourceName: text(value.sourceName, 'source', 240), sourceHash: text(value.sourceHash, '', 128), ...(typeof value.originalSource === 'string' && new TextEncoder().encode(value.originalSource).byteLength <= MAX_SOURCE_BYTES ? {originalSource: value.originalSource} : {}), texturePath: text(value.texturePath, '', 1024), mapSize: value.mapSize ? { width: integer(value.mapSize.width, 1, 1), height: integer(value.mapSize.height, 1, 1) } : null, slices, diagnostics: list(value.diagnostics).slice(0, 512).flatMap(/** 规范化交换诊断严重性并限制代码与消息长度。 */ raw => { const item = object(raw), severity = ['warning', 'error'].includes(text(item.severity)) ? text(item.severity) as 'warning' | 'error' : 'info'; return [{ severity, code: text(item.code, 'CONTENT_INFO', 80), message: text(item.message, '', 2_000) }] }) }
}
