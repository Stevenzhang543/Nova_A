/** 外部资源格式互通：识别图集、切片及地图输入，转换规范数据并验证导入元信息。 */
import type { AssetType } from './types'
import { MAX_SOURCE_BYTES, MAX_SLICES, object, list, text, integer, unit, stableId, frameRectangle, polygon } from '../runtime/contentInterchangeMetadata'
import type { InterchangeFormat, InterchangeSlice, ContentInterchangeMetadata } from '../runtime/contentInterchangeMetadata'
export { validateInterchangeMetadata } from '../runtime/contentInterchangeMetadata'
export type { InterchangeFormat, InterchangeSlice, ContentInterchangeMetadata } from '../runtime/contentInterchangeMetadata'
import { BoundedImportCache } from './importRetention'
import { sha256Text } from './contentHash'
import { convertTiledMap, convertTiledTileSet } from './tiledInterchange'
export interface ContentInterchangeResult {
  assetType: Extract<AssetType, 'atlas' | 'tileset'>
  mimeType: string
  source: string
  metadata: ContentInterchangeMetadata
}
const resultCache = new BoundedImportCache<string, ContentInterchangeResult>(32, 64 * 1024 * 1024)
const ordinal=/* 根据 first<second 的真假，分别返回 -1 或 first>second?1:0。 */ (first:string,second:string)=>first<second?-1:first>second?1:0
/** 按稳定对象键顺序序列化交换文档，保留数组顺序。 */ function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(/* 调用 ordinal(a,b) 并返回调用结果。 */ ([a], [b]) => ordinal(a,b)).map(/** 按模板 `${JSON.stringify(key)}:${stable(item)}` 生成并返回字符串。 */ ([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}
/* 调用 sha256Text(value) 并返回调用结果。 */ function hashText(value:string):string{return sha256Text(value)}
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

/** Optional host identity/cancellation preserves the existing three-argument converter API. */
export interface ContentInterchangeAsyncOptions {
  signal?: AbortSignal
  isCurrent?: () => boolean
  sourceIdentity?: string
  inputRevision?: number
  preparationStartedAtMs?: number
}
/** Reject oversized raw UTF-8 before creating a whole decoded string; preserve the decoder's leading BOM behavior. */
export function decodeContentInterchangeSource(fileName: string, bytes: ArrayBuffer): string {
  if (bytes.byteLength > MAX_SOURCE_BYTES) {
    const prefix = new Uint8Array(bytes, 0, Math.min(3, bytes.byteLength))
    if (bytes.byteLength > MAX_SOURCE_BYTES + 3 || prefix[0] !== 0xef || prefix[1] !== 0xbb || prefix[2] !== 0xbf) throw new Error(`CONTENT_SOURCE_LIMIT: ${fileName} exceeds the 16 MiB metadata limit.`)
  }
  return new TextDecoder().decode(bytes)
}
function contentImportAborted(): Error { const error = new Error('Content import cancelled or source replaced.'); error.name = 'AbortError'; return error }
/** Count UTF-8 without allocating a second whole-source byte buffer; reject at the original limit. */
function contentUtf8Bytes(value: string, maximum: number): number {
  if (value.length > maximum) throw new Error('CONTENT_INPUT_LIMIT: Input exceeds the configured byte budget.')
  let bytes = 0
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index)
    if (code < 0x80) bytes++
    else if (code < 0x800) bytes += 2
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < value.length && value.charCodeAt(index + 1) >= 0xdc00 && value.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index++ }
    else bytes += 3
    if (bytes > maximum) throw new Error('CONTENT_INPUT_LIMIT: Input exceeds the configured byte budget.')
  }
  return bytes
}
/** Conservative clone/retained-data estimate, not a physical JS heap upper bound. */
function contentRetainedBytes(value: unknown, maximum: number): number {
  let bytes = 0
  const ancestors = new WeakSet<object>()
  const add = (size: number): void => { bytes += size; if (!Number.isSafeInteger(bytes) || bytes > maximum) throw new Error('CONTENT_INPUT_LIMIT: Metadata exceeds the configured byte budget.') }
  const visit = (item: unknown, depth: number): void => {
    if (depth > 32) throw new Error('CONTENT_INPUT_STRUCTURE: Metadata nesting exceeds its plain schema.')
    if (typeof item === 'string') { add(item.length * 2); add(contentUtf8Bytes(item, maximum - bytes)); return }
    if (item === null || item === undefined || typeof item === 'number' || typeof item === 'boolean') { add(16); return }
    if (typeof item !== 'object' || ancestors.has(item)) throw new Error('CONTENT_INPUT_STRUCTURE: Expected acyclic plain metadata.')
    add(Array.isArray(item) ? 32 + item.length * 8 : 32)
    ancestors.add(item)
    for (const key in item) {
      if (!Object.prototype.hasOwnProperty.call(item, key)) continue
      const property = Object.getOwnPropertyDescriptor(item, key)
      if (!property || !('value' in property)) throw new Error('CONTENT_INPUT_STRUCTURE: Metadata accessors cannot be cloned safely.')
      add(key.length * 2); add(contentUtf8Bytes(key, maximum - bytes)); visit(property.value, depth + 1)
    }
    ancestors.delete(item)
  }
  visit(value, 0)
  return bytes
}
/** Global asset admission precedes conversion, Worker construction and postMessage clone. */
export async function importContentInterchangeAsync(fileName: string, source: string, previous?: ContentInterchangeMetadata | null, options: ContentInterchangeAsyncOptions = {}): Promise<ContentInterchangeResult | null> {
  const enteredAtMs = performance.now()
  const preparationStartedAtMs = options.preparationStartedAtMs
  const requestedAtMs = preparationStartedAtMs !== undefined && Number.isFinite(preparationStartedAtMs) && preparationStartedAtMs >= 0 && preparationStartedAtMs <= enteredAtMs ? preparationStartedAtMs : enteredAtMs
  const current = (): void => { if (options.signal?.aborted || options.isCurrent && !options.isCurrent()) throw contentImportAborted() }
  current()
  // The synchronous converter is also imported inside the Worker. Only the parent async path loads its existing singleton.
  const { auxiliaryWork, performanceCoordinator } = await import('../runtime/performance/services')
  current()
  const epoch = performanceCoordinator.snapshot.sessionEpoch
  let sourceBytes: number
  try { sourceBytes = contentUtf8Bytes(source, MAX_SOURCE_BYTES) }
  catch { throw new Error(`CONTENT_SOURCE_LIMIT: ${fileName} exceeds the 16 MiB metadata limit.`) }
  const maximumInput = performanceCoordinator.config.maxQueueBytes
  const retainedSourceBytes = sourceBytes + source.length * 2
  const inputBytes = retainedSourceBytes + contentRetainedBytes({ fileName, previous }, maximumInput - retainedSourceBytes)
  const identity = options.sourceIdentity ?? `content:${fileName.slice(0, 240)}`
  const work = auxiliaryWork.schedule<ContentInterchangeResult | null>({
    name: `content:${fileName.slice(0, 240)}`, owner: 'asset', workClass: 'required', epoch, inputRevision: options.inputRevision,
    inputBytes, scratchBytes: inputBytes * 8 + MAX_SOURCE_BYTES * 16, outputBytes: inputBytes + MAX_SOURCE_BYTES * 12,
    readSet: [identity], writeSet: [], requestedAtMs, cooperative: false, cancelStrategy: typeof Worker === 'undefined' || source.length < 131_072 ? 'discard-after-completion' : 'retire-independent-worker'
  }, async context => {
    const valid = (): void => { current(); if (context.signal.aborted || context.epoch !== performanceCoordinator.snapshot.sessionEpoch) throw contentImportAborted() }
    valid()
    if (typeof Worker === 'undefined' || source.length < 131_072) {
      const startedAt = performanceCoordinator.now()
      const result = importContentInterchange(fileName, source, previous)
      context.reportPhases({ postMessageMs: null, workerExecutionMs: null, localExecutionMs: Math.max(0, performanceCoordinator.now() - startedAt), transportAndReturnMs: null, mergeMs: null })
      valid(); return result
    }
    const worker = new Worker(new URL('./contentInteroperability.worker.ts', import.meta.url), { type: 'module' })
    const requestId = stableId(`${fileName}:${source.length}:${performance.now()}`)
    return new Promise<ContentInterchangeResult | null>((resolve, reject) => {
      let terminal = false, timeout: ReturnType<typeof setTimeout> | undefined
      let postedAt: number | null = null, postMessageMs: number | null = null
      const finish = async (result: ContentInterchangeResult | null, error?: unknown): Promise<void> => {
        if (terminal) return
        terminal = true
        if (timeout !== undefined) clearTimeout(timeout)
        context.signal.removeEventListener('abort', cancel)
        worker.onmessage = null; worker.onerror = null
        try {
          // DOM terminate returns void. Hosts with observable termination (Node tests) return a completion Promise.
          await worker.terminate()
          context.reportPhases({ postMessageMs, workerExecutionMs: null, transportAndReturnMs: null, mergeMs: null })
          if (error !== undefined) throw error
          valid(); resolve(result)
        } catch (failure) { reject(failure) }
      }
      const cancel = (): void => { void finish(null, contentImportAborted()) }
      context.signal.addEventListener('abort', cancel, { once: true })
      if (context.signal.aborted) { cancel(); return }
      timeout = setTimeout(() => { void finish(null, new Error('CONTENT_IMPORT_TIMEOUT: Metadata processing exceeded 10 seconds.')) }, 10_000)
      worker.onmessage = event => { if (event.data?.id !== requestId || terminal) return; void finish(event.data.result as ContentInterchangeResult | null, event.data.error ? new Error(String(event.data.error)) : undefined) }
      worker.onerror = event => { void finish(null, new Error(event.message)) }
      try { valid(); postedAt = performanceCoordinator.now(); worker.postMessage({ id: requestId, fileName, source, previous }); postMessageMs = Math.max(0, performanceCoordinator.now() - postedAt) }
      catch (error) { void finish(null, error) }
    })
  })
  const cancelWork = (): void => { work.cancel('Content import cancelled') }
  options.signal?.addEventListener('abort', cancelWork, { once: true })
  if (options.signal?.aborted) cancelWork()
  try { const result = await work.promise; current(); return result }
  catch (error) { if (options.signal?.aborted) throw contentImportAborted(); throw error }
  finally { options.signal?.removeEventListener('abort', cancelWork) }
}
