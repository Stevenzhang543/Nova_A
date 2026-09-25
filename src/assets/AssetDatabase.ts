/** 资源数据库：维护资源登记、导入、文本更新、目录及集合，解析绘制纹理并协调图集缓存。 */
import { markRaw, reactive, watch } from 'vue'
import { normalizeUuid } from '../world/identity'
import { buildTextureAtlases } from './TextureAtlas'
import {
  DEFAULT_ASSET_FOLDERS,
  defaultAnimationImportMetadata,
  defaultImportSettings,
  defaultScriptMetadata,
  type AssetImportSettings,
  type AssetDatabaseSettings,
  type AssetImportPreset,
  type AssetCollection,
  type AssetContentGroup,
  type AssetRecord,
  type AssetSavedFilter,
  type AssetType,
  type TextAssetType,
  type TextureAtlasPage
} from './types'
import type { TextureRegion } from '../renderer'
import { clearAssetImportSession, dismissExternalAssetChange, importPipelineState, processAssetImport, retryAssetImport, stopWatchingAsset, watchAssetSource, type ImportedArtifact } from './importPipeline'
import { buildAssetDependencyGraph, repairAssetPathReferences } from './assetGraph'
import { assetSourceBytes, sha256Bytes } from './contentHash'
import { assetSettingsHash } from './assetProduction'
import { bindInterchangeTexture } from './interchangeBindings'
import { importContentInterchangeAsync, validateInterchangeMetadata } from './contentInteroperability'
import { applyDerivedSprite, prepareDerivedSpriteRefresh, spriteDefinitions, validateDerivedSprite } from './derivedSprites'
import { clearDerivedSpriteTextures, resolveDerivedSpriteTexture } from './derivedSpriteTexture'
import { BoundedImportCache } from './importRetention'
import { readAssetPixels } from './assetPixels'

export interface AssetDatabaseState {
  records: AssetRecord[]
  folders: string[]
  atlasPages: TextureAtlasPage[]
  generation: number
  importing: boolean
  atlasError: string
  selectedGuid: string | null
  currentFolder: string
  search: string
  typeFilter: AssetType | 'all'
  favoritesOnly: boolean
  tagFilter: string
  selectedCollectionId: string
  favorites: string[]
  savedFilters: AssetSavedFilter[]
  importPresets: AssetImportPreset[]
  collections: AssetCollection[]
  contentGroups: AssetContentGroup[]
  viewMode: 'grid' | 'list'
  thumbnailSize: number
  indexSize: number
  recentGuids: string[]
}

export const assetState = reactive<AssetDatabaseState>({
  records: [],
  folders: [...DEFAULT_ASSET_FOLDERS],
  atlasPages: [],
  generation: 0,
  importing: false,
  atlasError: '',
  selectedGuid: null,
  currentFolder: 'Assets',
  search: '',
  typeFilter: 'all',
  favoritesOnly: false,
  tagFilter: '',
  selectedCollectionId: '',
  favorites: [],
  savedFilters: [],
  importPresets: [],
  collections: [],
  contentGroups: [{ id: 'main', name: 'Main', mode: 'embedded', optional: false }],
  viewMode: 'grid',
  thumbnailSize: 112,
  indexSize: 0,
  recentGuids: []
})

watch(/* 返回 assetState.selectedGuid 的当前值。 */ () => assetState.selectedGuid, /** 将当前有效资源身份移至最近使用列表首位，去重并保留二十项。 */ guid => {
  if (!guid) return
  assetState.recentGuids.splice(0, assetState.recentGuids.length, guid, ...assetState.recentGuids.filter(/* 比较 value 与 guid，返回严格不等的判断结果。 */ value => value !== guid).slice(0, 19))
})

const pendingImageLoads = new Map<string, HTMLImageElement>()
const rejectedImageSources = new WeakMap<AssetRecord, { source: string; error: string }>()
const IMAGE_CACHE_LIMITS = Object.freeze({ entries: 256, bytes: 128 * 1024 * 1024 })
const imageCache = new BoundedImportCache<string, HTMLImageElement>(IMAGE_CACHE_LIMITS.entries, IMAGE_CACHE_LIMITS.bytes, /** 缓存驱逐时清除同键未完成图像监听和源，释放挂起加载引用。 */ key => {
  const pending = pendingImageLoads.get(key)
  if (pending) { pending.onload = null; pending.onerror = null; pending.src = ''; pendingImageLoads.delete(key) }
})
/* 返回具有所列字段的新对象 { entries: imageCache.size, bytes: imageCache.bytes, pending: pendingImageLoads.size, limits: IMAGE_CACHE_LIMITS }。 */ export function imageDecodedCacheStats() { return { entries: imageCache.size, bytes: imageCache.bytes, pending: pendingImageLoads.size, limits: IMAGE_CACHE_LIMITS } }
const installedFonts = new Map<string, FontFace>()
let atlasRevision = 0
let atlasContentRevision = 0
let assetSessionRevision = 0
/* 返回 assetSessionRevision 的当前值。 */ export function assetSessionVersion(): number { return assetSessionRevision }
let decodedTextureRevision = 0
/* 计算表达式 decodedTextureRevision + atlasContentRevision 并返回结果，沿用操作数的原有类型规则。 */ export function textureContentRevision(): number { return decodedTextureRevision + atlasContentRevision }
const reimportRevisions = new WeakMap<AssetRecord, number>()
let indexRevision = -1
let indexedRecords: AssetRecord[] = []
let recordsByUuid = new Map<string, AssetRecord>()

/** 根据内联源真实字节生成摘要，并建立无需外部导入器的可复现流水线元信息。 */ function inlinePipeline(source: string) {
  const hash = sha256Bytes(assetSourceBytes(source))
  return { importerId: 'nova.inline', importerVersion: '1.0.0', presetId: 'inline', platform: 'web' as const, sourceHash: hash, artifactHash: hash, contentHash: hash, cacheKey: hash, status: 'ready' as const, lastValidSource: source, error: '', dependencies: [] as string[], reverseDependencies: [] as string[], cacheHit: false, settingsHash: hash, artifactSettingsHash: hash, invalidationReason: 'Inline asset', sourceSettings: '{}', artifactSettings: '{}', diagnostics: [] as Array<{ severity: 'info' | 'warning' | 'error'; code: string; message: string }>, reproducible: true, deprecatedSettings: [] as string[] }
}

/** 仅在资源代次变化时重建按路径排序的列表和 UUID 索引，并同步索引数量。 */ function ensureIndex(): void {
  if (indexRevision === assetState.generation) return
  indexedRecords = [...assetState.records].sort(/* 先计算 a.path.localeCompare(b.path)；仅当其为假值时求右侧 a.uuid.localeCompare(b.uuid)，返回短路求值结果。 */ (a, b) => a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid))
  recordsByUuid = new Map(indexedRecords.map(/* 返回按声明顺序构造的数组 [record.uuid, record]。 */ record => [record.uuid, record]))
  assetState.indexSize = indexedRecords.length
  indexRevision = assetState.generation
}

/** 根据 MIME、扩展名和特定命名规则选择资源类型，未知文件归入其他。 */ export function inferAssetType(file: Pick<File, 'name' | 'type'>): AssetType {
  const mime = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) return 'image'
  if (mime.startsWith('audio/') || ['wav', 'ogg', 'mp3', 'flac'].includes(extension)) return 'audio'
  if (mime.startsWith('font/') || ['ttf', 'otf', 'woff', 'woff2'].includes(extension)) return 'font'
  if (extension === 'nova-scene' || extension === 'scene') return 'scene'
  if (extension === 'nova-prefab' || extension === 'prefab') return 'prefab'
  if (extension === 'rhai' || mime === 'text/x-rhai') return 'script'
  if (extension === 'nova-graph') return 'visualScript'
  if (extension === 'nova-events') return 'eventSheet'
  if (extension === 'nova-object') return 'objectBlueprint'
  if (extension === 'nova-schema') return 'dataSchema'
  if (extension === 'nova-data' || extension === 'csv') return 'dataTable'
  if (extension === 'nova-replay') return 'replay'
  if (extension === 'nova-path') return 'path'
  if (extension === 'nova-particle') return 'particleSystem'
  if (extension === 'nova-resource') return 'resource'
  if (extension === 'nova-material' || extension === 'material') return 'material'
  if (extension === 'nova-anim') return 'animation'
  if (extension === 'nova-controller') return 'controller'
  if (extension === 'nova-mask') return 'animationMask'
  if (extension === 'nova-rig') return 'rig'
  if (extension === 'nova-skin') return 'skin'
  if (extension === 'nova-timeline') return 'timeline'
  if (extension === 'nova-behavior') return 'behaviorTree'
  if (extension === 'nova-state') return 'stateMachine'
  if (extension === 'nova-palette') return 'tilePalette'
  if (extension === 'nova-brush') return 'brushPreset'
  if (extension === 'nova-terrain') return 'terrainRules'
  if (extension === 'nova-tileset' || ['tmx', 'tmj', 'tsx', 'tsj'].includes(extension)) return 'tileset'
  if (extension === 'nova-atlas' || extension === 'atlas' || extension === 'tpsheet' || /\.(?:aseprite|ase|texturepacker)\.json$/i.test(file.name)) return 'atlas'
  if (['glsl', 'frag', 'vert', 'nova-shader'].includes(extension)) return 'shader'
  if (['csv', 'po', 'arb', 'nova-locale'].includes(extension) || /(?:^|[-_.])locale(?:[-_.]|$)/i.test(file.name)) return 'localization'
  if (extension === 'nova-theme') return 'uiTheme'
  return 'other'
}

/** 为每个受支持资源类型选择默认项目目录。 */ function defaultFolder(type: AssetType): string {
  if (type === 'image') return 'Assets/Sprites'
  if (type === 'audio') return 'Assets/Audio'
  if (type === 'font') return 'Assets/Fonts'
  if (type === 'scene') return 'Assets/Scenes'
  if (type === 'prefab') return 'Assets/Prefabs'
  if (type === 'script') return 'Assets/Scripts'
  if (type === 'visualScript') return 'Assets/Visual Scripts'
  if (type === 'eventSheet') return 'Assets/Event Sheets'
  if (type === 'objectBlueprint') return 'Assets/Object Blueprints'
  if (type === 'material') return 'Assets/Materials'
  if (type === 'animation') return 'Assets/Animations'
  if (type === 'controller') return 'Assets/Controllers'
  if (type === 'animationMask') return 'Assets/AnimationMasks'
  if (type === 'rig') return 'Assets/Rigs'
  if (type === 'skin') return 'Assets/Skins'
  if (type === 'timeline') return 'Assets/Timelines'
  if (type === 'dataSchema') return 'Assets/Data/Schemas'
  if (type === 'dataTable') return 'Assets/Data/Tables'
  if (type === 'replay') return 'Assets/Replays'
  if (type === 'path') return 'Assets/Paths'
  if (type === 'particleSystem') return 'Assets/Particles'
  if (type === 'resource') return 'Assets/Resources'
  if (type === 'behaviorTree' || type === 'stateMachine') return 'Assets/AI'
  if (type === 'tilePalette') return 'Assets/TilePalettes'
  if (type === 'brushPreset') return 'Assets/BrushPresets'
  if (type === 'terrainRules') return 'Assets/TerrainRules'
  if (type === 'tileset') return 'Assets/TileSets'
  if (type === 'atlas') return 'Assets/Atlases'
  if (type === 'shader') return 'Assets/Shaders'
  if (type === 'localization') return 'Assets/Localization'
  if (type === 'uiTheme') return 'Assets/UI Themes'
  return 'Assets'
}

/* 先计算 value.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120)；仅当其为假值时求右侧 'Untitled asset'，返回短路求值结果。 */ function sanitizedName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'Untitled asset'
}

/** 清理目录和文件名后检查不区分大小写的冲突，保留扩展名递增后缀直到路径可用。 */ function uniquePath(folder: string, name: string, ignoreGuid?: string): string {
  const normalizedFolder = normalizeFolder(folder)
  const stem = sanitizedName(name)
  let candidate = `${normalizedFolder}/${stem}`
  let suffix = 2
  while (assetState.records.some(/* 先计算 record.uuid !== ignoreGuid；仅当其为真值时求右侧 record.path.toLowerCase() === candidate.toLowerCase()，返回短路求值结果。 */ record => record.uuid !== ignoreGuid && record.path.toLowerCase() === candidate.toLowerCase())) {
    const dot = stem.lastIndexOf('.')
    candidate = dot > 0
      ? `${normalizedFolder}/${stem.slice(0, dot)} ${suffix}${stem.slice(dot)}`
      : `${normalizedFolder}/${stem} ${suffix}`
    suffix++
  }
  return candidate
}

/** 统一分隔符并移除点目录，按现有规则保留隐藏或项目设置目录，其他补充 Assets 前缀。 */ export function normalizeFolder(value: string): string {
  const clean = value.replace(/\\/g, '/').split('/').filter(/* 先计算 part && part !== '.'；仅当其为真值时求右侧 part !== '..'，返回短路求值结果。 */ part => part && part !== '.' && part !== '..').join('/')
  return clean.startsWith('.') ? clean : clean.startsWith('Assets') || clean === 'ProjectSettings' ? clean : `Assets/${clean}`
}

/** 加载图像并在十五秒超时内读取自然尺寸，错误时拒绝。 */ function imageMetadata(source:string):Promise<{width:number;height:number}>{
  return new Promise(/** 建立一次性图像元信息读取和超时处理，避免多个完成事件重复结算。 */ (resolve,reject)=>{
    const image=new Image();let finished=false
    const timeout=window.setTimeout(/* 调用 finish(new Error('IMAGE_METADATA_TIMEOUT: Image decoding exceeded 15 seconds.')) 并返回调用结果。 */ ()=>finish(new Error('IMAGE_METADATA_TIMEOUT: Image decoding exceeded 15 seconds.')),15000)
    const finish=/** 单次结算图像元信息读取，清除计时及事件后返回自然尺寸或错误。 */ (error?:Error)=>{if(finished)return;finished=true;window.clearTimeout(timeout);image.onload=null;image.onerror=null;if(error)reject(error);else resolve({width:image.naturalWidth,height:image.naturalHeight})}
    image.onload=/* 调用 finish() 并返回调用结果。 */ ()=>finish();image.onerror=/* 调用 finish(new Error('IMAGE_METADATA: The image could not be decoded.')) 并返回调用结果。 */ ()=>finish(new Error('IMAGE_METADATA: The image could not be decoded.'));image.src=source
  })
}
/** 加载音频元信息并要求有限非负时长，完成后释放媒体源和监听。 */ function audioMetadata(source:string):Promise<number>{
  return new Promise(/** 建立音频元信息读取器，使用一次性完成保护和超时拒绝。 */ (resolve,reject)=>{
    const audio=new Audio();let finished=false
    const timeout=window.setTimeout(/* 调用 finish(new Error('AUDIO_METADATA_TIMEOUT: Audio decoding exceeded 15 seconds.')) 并返回调用结果。 */ ()=>finish(new Error('AUDIO_METADATA_TIMEOUT: Audio decoding exceeded 15 seconds.')),15000)
    const finish=/** 单次结算音频元信息，清除媒体源和事件，再验证时长或返回错误。 */ (error?:Error)=>{if(finished)return;finished=true;window.clearTimeout(timeout);const duration=audio.duration;audio.onloadedmetadata=null;audio.onerror=null;audio.removeAttribute('src');audio.load();if(error)reject(error);else if(!Number.isFinite(duration)||duration<0)reject(new Error('AUDIO_METADATA: Audio has no finite duration.'));else resolve(duration)}
    audio.onloadedmetadata=/* 调用 finish() 并返回调用结果。 */ ()=>finish();audio.onerror=/* 调用 finish(new Error('AUDIO_METADATA: The audio could not be decoded.')) 并返回调用结果。 */ ()=>finish(new Error('AUDIO_METADATA: The audio could not be decoded.'));audio.src=source
  })
}

/** 按模板 `NovaAsset_${uuid.replace(/-/g, '')}` 生成并返回字符串。 */ function fontFamilyFor(uuid: string): string { return `NovaAsset_${uuid.replace(/-/g, '')}` }

/** 为字体资源准备 FontFace，以十五秒超时限制等待并清理计时器，尚不登记文档字体。 */ async function prepareFont(record: AssetRecord): Promise<FontFace | null> {
  if (record.assetType !== 'font' || !record.source || !('FontFace' in window)) return null
  const face = new FontFace(record.fontFamily || fontFamilyFor(record.uuid), `url(${JSON.stringify(record.source)})`)
  let timeout: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([face.load(), new Promise<never>(/** 登记字体加载超时拒绝处理，计时句柄由外层 finally 清理。 */ (_,reject)=>{timeout=setTimeout(/* 调用 reject(new Error('FONT_METADATA_TIMEOUT: Font decoding exceeded 15 seconds.')) 并返回调用结果。 */ ()=>reject(new Error('FONT_METADATA_TIMEOUT: Font decoding exceeded 15 seconds.')),15000)})]) }
  finally { if(timeout!==undefined)clearTimeout(timeout) }
}
/** 登记新字体并移除同资源旧 FontFace，更新字体所有权映射。 */ function registerFont(uuid:string,face:FontFace|null):void {
  if(!face)return
  document.fonts.add(face)
  const previous=installedFonts.get(uuid)
  if(previous&&previous!==face)document.fonts.delete(previous)
  installedFonts.set(uuid,face)
}
/** 异步准备字体，仅当记录仍属于项目且源未变化时登记，失败不阻断资源列表。 */ function installFont(record: AssetRecord): void {
  const source=record.source
  void prepareFont(record).then(/** 仅在异步加载对应的原资源仍有效且源未改动时安装字体。 */ face=>{if(assetState.records.includes(record)&&record.source===source)registerFont(record.uuid,face)}).catch(/* 返回 undefined 的当前值。 */ ()=>undefined)
}

/** 转换交换格式、验证媒体及字体；批次调用只暂存记录和字体，单项重试在会话有效时登记。 */ async function recordImportedArtifact(file: File, settings: AssetImportSettings, artifact: ImportedArtifact, requestedFolder?: string, signal?: AbortSignal, session = assetSessionRevision, stagedFonts?: Map<string, FontFace | null>): Promise<AssetRecord> {
  let assetType = inferAssetType(file), source = artifact.source
  const external = ['atlas', 'tileset', 'other'].includes(assetType) ? await importContentInterchangeAsync(file.name, new TextDecoder().decode(artifact.bytes)) : null
  if (external) {
    assetType = external.assetType; source = `data:${external.mimeType};charset=utf-8,${encodeURIComponent(external.source)}`
    artifact.metadata.importerId = `nova.${external.metadata.format}`
    artifact.metadata.lastValidSource = source
    artifact.metadata.artifactHash = sha256Bytes(assetSourceBytes(source))
    artifact.metadata.contentHash = artifact.metadata.artifactHash
    artifact.metadata.diagnostics.push(...external.metadata.diagnostics)
  }
  const metadata = assetType === 'image' ? await imageMetadata(source) : { width: 0, height: 0 }
  if (assetType === 'image' && (!metadata.width || !metadata.height)) throw new Error('IMAGE_METADATA: The imported image could not be decoded.')
  const uuid = normalizeUuid(undefined)
  const record: AssetRecord = {
    ...assetBookkeepingDefaults(),
    uuid, name: sanitizedName(file.name), path: uniquePath(requestedFolder || defaultFolder(assetType), file.name), assetType,
    mimeType: external?.mimeType || file.type || 'application/octet-stream', byteLength: file.size, source, sourceModified: file.lastModified, importedAt: Date.now(),
    width: metadata.width, height: metadata.height, duration: assetType === 'audio' ? await audioMetadata(source) : 0,
    fontFamily: assetType === 'font' ? fontFamilyFor(uuid) : '', settings,
    script: assetType === 'script' ? defaultScriptMetadata() : undefined,
    animationImport: assetType === 'animation' ? defaultAnimationImportMetadata() : undefined,
    pipeline: artifact.metadata,
    interchange: external?.metadata
  }
  const font=await prepareFont(record)
  if(signal?.aborted || session !== assetSessionRevision) throw new DOMException('Import cancelled or project replaced', 'AbortError')
  if (stagedFonts) { stagedFonts.set(record.uuid, font); return record }
  registerFont(record.uuid,font)
  assetState.records.push(record)
  const folder = record.path.slice(0, record.path.lastIndexOf('/'))
  if (folder && !assetState.folders.includes(folder)) assetState.folders.push(folder)
  return record
}

/** 逐项验证并暂存整批资源，守卫会话及取消状态后统一登记、绑定依赖与更新图集；失败不提交部分文件。 */ export async function importAssetFiles(files: Iterable<File>, requestedFolder?: string, signal?: AbortSignal, onPrepared?: (file: File, count: number) => void): Promise<AssetRecord[]> {
  const session = assetSessionRevision
  assetState.importing = true
  const imported: AssetRecord[] = []
  const stagedFonts = new Map<string, FontFace | null>()
  try {
    for (const file of files) {
      if(signal?.aborted || session !== assetSessionRevision) throw new DOMException('Import cancelled or project replaced', 'AbortError')
      const assetType = inferAssetType(file)
      const settings = defaultImportSettings()
      if (assetType === 'image' && /(?:^|[-_.])pixel(?:[-_.]|$)/i.test(file.name)) settings.filterMode = 'Nearest'
      const artifact = await processAssetImport(file, settings, {signal})
      const record = await recordImportedArtifact(file, settings, artifact, requestedFolder, signal, session, stagedFonts)
      imported.push(record)
      onPrepared?.(file, imported.length)
    }
    if(signal?.aborted || session !== assetSessionRevision) throw new DOMException('Import cancelled or project replaced', 'AbortError')
    // 所有文件验证成功后才一次提交；同名文件按提交次序分配路径，失败不留下半批资源。
    for (const record of imported) {
      record.path = uniquePath(requestedFolder || defaultFolder(record.assetType), record.name)
      registerFont(record.uuid, stagedFonts.get(record.uuid) ?? null)
      assetState.records.push(record)
      const folder = record.path.slice(0, record.path.lastIndexOf('/'))
      if (folder && !assetState.folders.includes(folder)) assetState.folders.push(folder)
    }
    return imported
  } finally {
    if (session === assetSessionRevision && imported.some(/** 仅为实际提交的批次更新索引及图集。 */ record => assetState.records.includes(record))) { for (const asset of assetState.records) if (asset.interchange) bindInterchangeTexture(asset, assetState.records); assetState.records.sort(/* 调用 first.path.localeCompare(second.path) 并返回调用结果。 */ (first, second) => first.path.localeCompare(second.path)); assetState.generation++; queueTextureAtlasRebuild() }
    assetState.importing = false
  }
}

/** Creates independently addressable sprite-region assets without duplicating source pixels. */
/** 预检全部帧几何、引用、身份及路径，复用已有派生帧并一次性新增缺失帧，保持稳定引用。 */ export function sliceSpriteSheet(record: AssetRecord): AssetRecord[] {
  if (!assetState.records.includes(record)) throw new Error('SPRITE_DERIVATION: The source asset is no longer in this project.')
  const definitions = spriteDefinitions(record, assetState.records), updates = prepareDerivedSpriteRefresh(record, assetState.records)
  const existing = new Map<string, AssetRecord>()
  for (const child of assetState.records.filter(/* 比较 value.derivedSprite?.ownerAsset 与 'asset://' + record.uuid，返回严格相等的判断结果。 */ value => value.derivedSprite?.ownerAsset === 'asset://' + record.uuid)) {
    if (existing.has(child.derivedSprite!.sourceKey)) throw new Error('SPRITE_DERIVATION: Duplicate derived frame identity.')
    existing.set(child.derivedSprite!.sourceKey, child)
  }
  const folder = record.path.slice(0, record.path.lastIndexOf('/')), paths = new Set(assetState.records.map(/* 调用 value.path.toLowerCase() 并返回调用结果。 */ value => value.path.toLowerCase()))
  const added: AssetRecord[] = [], output: AssetRecord[] = []
  for (const definition of definitions) {
    const retained = existing.get(definition.sprite.sourceKey)
    if (retained) { output.push(retained); continue }
    const name = sanitizedName(definition.name), stem = name.replace(/\.[^.]+$/, '')
    let path = folder + '/' + name, suffix = 2
    while (paths.has(path.toLowerCase())) path = folder + '/' + stem + ' (' + suffix++ + ').png'
    paths.add(path.toLowerCase())
    const settings = JSON.parse(JSON.stringify(record.settings)) as AssetImportSettings
    settings.spriteRegion = null; settings.atlas = false; settings.spriteSheet.enabled = false
    const child: AssetRecord = { ...assetBookkeepingDefaults(), uuid: normalizeUuid(undefined), name: path.slice(path.lastIndexOf('/') + 1), path, assetType: 'image', mimeType: 'image/png',
      source: '', byteLength: 0, sourceModified: 0, importedAt: Date.now(), width: 0, height: 0, duration: definition.durationMs / 1000, fontFamily: '',
      settings, contentGroup: record.contentGroup, editorOnly: record.editorOnly, tags: [...(record.tags ?? [])], pipeline: inlinePipeline(JSON.stringify(definition.sprite)) }
    applyDerivedSprite(child, definition.sprite); child.pipeline!.dependencies = [...new Set([record.uuid, definition.sprite.textureAsset.slice(8)])]
    added.push(child); output.push(child)
  }
  // All geometry, dependencies, identities and prospective names pass before committing anything.
  for (const update of updates) applyDerivedSprite(update.record, update.sprite)
  assetState.records.push(...added); assetState.records.sort(/* 调用 first.path.localeCompare(second.path) 并返回调用结果。 */ (first, second) => first.path.localeCompare(second.path))
  clearDerivedSpriteTextures(); assetState.generation++
  return output.map(/** 将派生帧输出转换为数据库当前索引中的资源记录。 */ record => resolveAsset(record.uuid)!)
}

/** Finds the non-transparent pixel bounds and stores them as the active sprite region. */
/** 读取受守卫像素并计算非透明包围盒，仍有效时写入裁剪区域并请求图集更新。 */ export async function trimTransparentImage(record: AssetRecord): Promise<boolean> {
  const snapshot = await readAssetPixels(record, assetState.records), {width, height, data: pixels} = snapshot
  let left = width, top = height, right = -1, bottom = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] > 0) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  snapshot.assertCurrent()
  if (right < left || bottom < top) return false
  record.settings.spriteRegion = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }; record.settings.transparentTrim = true; assetState.generation++; queueTextureAtlasRebuild(); return true
}

/** 复用相同源图像，否则登记内嵌资源并异步补齐尺寸与图集。 */ export function registerEmbeddedImage(source: string, name = 'Legacy texture'): AssetRecord {
  const existing = assetState.records.find(/* 先计算 record.assetType === 'image'；仅当其为真值时求右侧 record.source === source，返回短路求值结果。 */ record => record.assetType === 'image' && record.source === source)
  if (existing) return existing
  const uuid = normalizeUuid(undefined)
  const imagePath = uniquePath('Assets/Sprites/Imported', `${sanitizedName(name)}.png`)
  const record: AssetRecord = {
    ...assetBookkeepingDefaults(),
    uuid, name: imagePath.slice(imagePath.lastIndexOf('/') + 1), path: imagePath,
    assetType: 'image', mimeType: source.slice(5, source.indexOf(';')) || 'image/png', byteLength: source.length,
    source, sourceModified: 0, importedAt: Date.now(), width: 0, height: 0, duration: 0, fontFamily: '',
    settings: defaultImportSettings(), pipeline: inlinePipeline(source)
  }
  assetState.records.push(record)
  if (!assetState.folders.includes('Assets/Sprites/Imported')) assetState.folders.push('Assets/Sprites/Imported')
  void imageMetadata(source).then(/** 内嵌图像加载后补齐尺寸并安排图集更新。 */ size => { record.width = size.width; record.height = size.height; queueTextureAtlasRebuild() }).catch(/** 将 error instanceof Error ? error.message : String(error) 赋给 assetState.atlasError，不显式返回值。 */ error => { assetState.atlasError = error instanceof Error ? error.message : String(error) })
  assetState.generation++
  return record
}

/** Match hydration defaults at creation so the first Undo does not add metadata. */
/* 返回具有所列字段的新对象 { tags: [], collectionIds: [], contentGroup: 'main', editorOnly: false, sourceControlStatus: 'clean', thumbnailKey: '' }。 */ function assetBookkeepingDefaults(): Pick<AssetRecord, 'tags' | 'collectionIds' | 'contentGroup' | 'editorOnly' | 'sourceControlStatus' | 'thumbnailKey'> {
  return { tags: [], collectionIds: [], contentGroup: 'main', editorOnly: false, sourceControlStatus: 'clean', thumbnailKey: '' }
}

/** 按模板 `data:${mimeType};charset=utf-8,${encodeURIComponent(source)}` 生成并返回字符串。 */ function textDataUrl(source: string, mimeType: string): string {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(source)}`
}

/** 为可编辑文本资源分配身份、类型扩展名和唯一目录路径，登记默认元信息并选中新资源。 */ export function createTextAsset(
  name: string,
  assetType: Exclude<TextAssetType, 'other'>,
  source: string,
  requestedFolder?: string
): AssetRecord {
  const uuid = normalizeUuid(undefined)
  const extension = assetType === 'script' ? '.rhai' : assetType === 'visualScript' ? '.nova-graph' : assetType === 'eventSheet' ? '.nova-events' : assetType === 'objectBlueprint' ? '.nova-object' : assetType === 'prefab' ? '.nova-prefab' : assetType === 'scene' ? '.nova-scene' : assetType === 'material' ? '.nova-material' : assetType === 'animation' ? '.nova-anim' : assetType === 'controller' ? '.nova-controller' : assetType === 'animationMask' ? '.nova-mask' : assetType === 'rig' ? '.nova-rig' : assetType === 'skin' ? '.nova-skin' : assetType === 'timeline' ? '.nova-timeline' : assetType === 'tileset' ? '.nova-tileset' : assetType === 'atlas' ? '.nova-atlas' : assetType === 'shader' ? '.nova-shader' : assetType === 'uiTheme' ? '.nova-theme' : assetType === 'behaviorTree' ? '.nova-behavior' : assetType === 'stateMachine' ? '.nova-state' : assetType === 'tilePalette' ? '.nova-palette' : assetType === 'brushPreset' ? '.nova-brush' : assetType === 'terrainRules' ? '.nova-terrain' : assetType === 'dataSchema' ? '.nova-schema' : assetType === 'dataTable' ? '.nova-data' : assetType === 'replay' ? '.nova-replay' : assetType === 'path' ? '.nova-path' : assetType === 'particleSystem' ? '.nova-particle' : assetType === 'resource' ? '.nova-resource' : '.nova-locale'
  const safeName = sanitizedName(name).endsWith(extension) ? sanitizedName(name) : `${sanitizedName(name)}${extension}`
  const mimeType = assetType === 'script' ? 'text/x-rhai' : assetType === 'visualScript' ? 'application/x-nova-graph+json' : `application/x-nova-${assetType}`
  const record: AssetRecord = {
    ...assetBookkeepingDefaults(),
    uuid,
    name: safeName,
    path: uniquePath(requestedFolder || defaultFolder(assetType), safeName),
    assetType,
    mimeType,
    byteLength: new TextEncoder().encode(source).byteLength,
    source: textDataUrl(source, mimeType),
    sourceModified: Date.now(),
    importedAt: Date.now(),
    width: 0,
    height: 0,
    duration: 0,
    fontFamily: '',
    settings: defaultImportSettings(),
    script: assetType === 'script' ? defaultScriptMetadata() : undefined,
    animationImport: assetType === 'animation' ? defaultAnimationImportMetadata() : undefined,
    pipeline: inlinePipeline(source)
  }
  assetState.records.push(record)
  const folder = record.path.slice(0, record.path.lastIndexOf('/'))
  if (folder && !assetState.folders.includes(folder)) assetState.folders.push(folder)
  assetState.records.sort(/* 调用 first.path.localeCompare(second.path) 并返回调用结果。 */ (first, second) => first.path.localeCompare(second.path))
  assetState.selectedGuid = record.uuid
  assetState.currentFolder = folder
  assetState.generation++
  return record
}

/** 仅读取支持的文本资源，兼容原文和百分号或 Base64 数据 URI，解码失败返回 null。 */ export function readTextAsset(reference: string | null | undefined): string | null {
  const record = resolveAsset(reference)
  if (!record || !['script', 'visualScript', 'eventSheet', 'objectBlueprint', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay', 'path', 'particleSystem', 'resource'].includes(record.assetType)) return null
  const comma = record.source.indexOf(',')
  if (!record.source.startsWith('data:') || comma < 0) return record.source || null
  try {
    const metadata = record.source.slice(0, comma)
    const payload = record.source.slice(comma + 1)
    if (!metadata.includes(';base64')) return decodeURIComponent(payload)
    const binary = atob(payload)
    return new TextDecoder().decode(Uint8Array.from(binary, /* 调用 character.charCodeAt(0) 并返回调用结果。 */ character => character.charCodeAt(0)))
  } catch {
    return null
  }
}

/** 更新可编辑且非生成缓存目录内的文本源、字节及时间，重建内联元信息并保留依赖列表。 */ export function updateTextAsset(uuid: string, source: string): boolean {
  const record = assetState.records.find(/* 比较 asset.uuid 与 uuid，返回严格相等的判断结果。 */ asset => asset.uuid === uuid)
  if (!record || record.path.startsWith('.nova/') || !['script', 'visualScript', 'eventSheet', 'objectBlueprint', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay', 'path', 'particleSystem', 'resource'].includes(record.assetType)) return false
  const nextSource = textDataUrl(source, record.mimeType || 'text/plain')
  if (record.source === nextSource) return true
  record.source = nextSource
  record.byteLength = new TextEncoder().encode(source).byteLength
  record.sourceModified = Date.now()
  record.importedAt = Date.now()
  const metadata = inlinePipeline(record.source)
  metadata.dependencies = record.pipeline?.dependencies ?? []
  metadata.reverseDependencies = record.pipeline?.reverseDependencies ?? []
  record.pipeline = metadata
  assetState.generation++
  return true
}

/**
 * Applies an in-memory text-asset write as a verified transaction. The prior
 * record and generation are restored if writing, verification, or an injected
 * qualification fault fails, so prefab sources never remain half-authored.
 */
/** 快照记录与代次后写入文本并回读校验，失败时恢复记录和代次。 */ export function updateTextAssetTransactional(uuid: string, source: string, faultAt?: 'after-write' | 'after-verify'): boolean {
  const record = assetState.records.find(/* 比较 asset.uuid 与 uuid，返回严格相等的判断结果。 */ asset => asset.uuid === uuid)
  if (!record) return false
  const before = JSON.parse(JSON.stringify(record)) as AssetRecord
  const generation = assetState.generation
  try {
    if (!updateTextAsset(uuid, source)) return false
    if (faultAt === 'after-write') throw new Error('Injected text-asset interruption after write.')
    if (readTextAsset(uuid) !== source) throw new Error('Text-asset verification failed.')
    if (faultAt === 'after-verify') throw new Error('Injected text-asset interruption after verification.')
    return true
  } catch {
    Object.assign(record, before)
    assetState.generation = generation
    return false
  }
}

/** 深复制资源，将保留的未知字段合并回文档顶层以支持兼容保存。 */ export function serializeAssets(): AssetRecord[] {
  return assetState.records.map(/** 复制资源并展开未知字段，已知当前字段优先于同名未知值。 */ record => {
    const copy = JSON.parse(JSON.stringify(record)) as AssetRecord
    const unknown = copy.unknownFields && typeof copy.unknownFields === 'object' ? copy.unknownFields : {}
    delete copy.unknownFields
    return { ...unknown, ...copy } as AssetRecord
  })
}

/* 调用 [...assetState.folders].sort((a, b) => a.localeCompare(b)) 并返回调用结果。 */ export function serializeAssetFolders(): string[] {
  return [...assetState.folders].sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ (a, b) => a.localeCompare(b))
}

/** 导出资源收藏、筛选、预设、集合与内容分组，去重排序并只保留有效收藏。 */ export function serializeAssetDatabaseSettings(): AssetDatabaseSettings {
  return {
    version: 2,
    favorites: [...new Set(assetState.favorites)].filter(/** 只保留数据库中仍存在的收藏身份。 */ uuid => assetState.records.some(/* 比较 record.uuid 与 uuid，返回严格相等的判断结果。 */ record => record.uuid === uuid)).sort(),
    savedFilters: assetState.savedFilters.map(/** 构造并返回记录 { ...filter }，字段按当前实参及捕获状态求值。 */ filter => ({ ...filter })).sort(/* 调用 a.name.localeCompare(b.name) 并返回调用结果。 */ (a, b) => a.name.localeCompare(b.name)),
    importPresets: assetState.importPresets.map(/** 构造并返回记录 { ...preset, settings: JSON.parse(JSON.stringify(preset.settings)) as AssetImportSettings }，字段按当前实参及捕获状态求值。 */ preset => ({ ...preset, settings: JSON.parse(JSON.stringify(preset.settings)) as AssetImportSettings })).sort(/* 调用 a.name.localeCompare(b.name) 并返回调用结果。 */ (a, b) => a.name.localeCompare(b.name)),
    collections: assetState.collections.map(/** 构造并返回记录 { ...collection, assetUuids: [...new Set(collection.assetUuids)].sort() }，字段按当前实参及捕获状态求值。 */ collection => ({ ...collection, assetUuids: [...new Set(collection.assetUuids)].sort() })).sort(/* 调用 a.name.localeCompare(b.name) 并返回调用结果。 */ (a, b) => a.name.localeCompare(b.name)),
    contentGroups: assetState.contentGroups.map(/** 构造并返回记录 { ...group }，字段按当前实参及捕获状态求值。 */ group => ({ ...group })).sort(/* 调用 a.name.localeCompare(b.name) 并返回调用结果。 */ (a, b) => a.name.localeCompare(b.name)),
    viewMode: assetState.viewMode,
    thumbnailSize: assetState.thumbnailSize
  }
}

/** 规范化并限制收藏、筛选、预设、集合及内容分组，恢复资源视图偏好。 */ function loadAssetDatabaseSettings(source: unknown): void {
  const value = source && typeof source === 'object' ? source as Partial<AssetDatabaseSettings> : {}
  assetState.favorites.splice(0, assetState.favorites.length, ...(Array.isArray(value.favorites) ? [...new Set(value.favorites.filter(/* 比较 typeof item 与 'string'，返回严格相等的判断结果。 */ item => typeof item === 'string'))].slice(0, 10_000) : []))
  const filters = Array.isArray(value.savedFilters) ? value.savedFilters.flatMap(/** 校验筛选身份名称，清理查询、目录、类型、标签及集合条件。 */ raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string') return []
    const type = raw.assetType === 'all' || typeof raw.assetType === 'string' ? raw.assetType as AssetType | 'all' : 'all'
    return [{ id: raw.id.slice(0, 80), name: raw.name.trim().slice(0, 80) || 'Filter', query: String(raw.query ?? '').slice(0, 200), folder: normalizeFolder(String(raw.folder ?? 'Assets')), assetType: type, tags: Array.isArray(raw.tags) ? raw.tags.map(String).map(/* 调用 tag.trim() 并返回调用结果。 */ tag => tag.trim()).filter(Boolean).slice(0, 32) : [], collectionId: String(raw.collectionId ?? '').slice(0, 80) }]
  }).slice(0, 128) : []
  assetState.savedFilters.splice(0, assetState.savedFilters.length, ...filters)
  const presets = Array.isArray(value.importPresets) ? value.importPresets.flatMap(/** 校验导入预设结构并与默认设置合并，保留有界名称和身份。 */ raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string' || !raw.settings || typeof raw.settings !== 'object') return []
    return [{ id: raw.id.slice(0, 80), name: raw.name.trim().slice(0, 80) || 'Preset', assetType: raw.assetType === 'all' || typeof raw.assetType === 'string' ? raw.assetType as AssetType | 'all' : 'all', settings: { ...defaultImportSettings(), ...raw.settings } as AssetImportSettings }]
  }).slice(0, 128) : []
  assetState.importPresets.splice(0, assetState.importPresets.length, ...presets)
  const collections = Array.isArray(value.collections) ? value.collections.flatMap(/** 校验集合身份名称、颜色和资源列表，去重并限制成员数量。 */ raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string') return []
    return [{ id: raw.id.slice(0, 80), name: raw.name.trim().slice(0, 80) || 'Collection', color: /^#[0-9a-f]{6}$/i.test(String(raw.color)) ? String(raw.color) : '#6ea8fe', assetUuids: Array.isArray(raw.assetUuids) ? [...new Set(raw.assetUuids.map(String))].slice(0, 20_000) : [] }]
  }).slice(0, 256) : []
  assetState.collections.splice(0, assetState.collections.length, ...collections)
  const groups = Array.isArray(value.contentGroups) ? value.contentGroups.flatMap(/** 校验内容组身份名称，规范化交付模式和可选标记。 */ raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string') return []
    const mode = ['embedded', 'downloadable', 'excluded'].includes(String(raw.mode)) ? raw.mode as AssetContentGroup['mode'] : 'embedded'
    return [{ id: raw.id.slice(0, 80), name: raw.name.trim().slice(0, 80) || 'Content', mode, optional: raw.optional === true }]
  }).slice(0, 128) : []
  assetState.contentGroups.splice(0, assetState.contentGroups.length, ...(groups.length ? groups : [{ id: 'main', name: 'Main', mode: 'embedded' as const, optional: false }]))
  assetState.viewMode = value.viewMode === 'list' ? 'list' : 'grid'
  assetState.thumbnailSize = Math.min(192, Math.max(72, Number(value.thumbnailSize) || 112))
}

/** 从资源路径提取规范目录，无有效父目录时使用类型默认目录。 */ function sourceFolder(path: unknown, type: AssetType): string {
  if (typeof path !== 'string') return defaultFolder(type)
  const separator = path.replace(/\\/g, '/').lastIndexOf('/')
  return separator > 0 ? normalizeFolder(path.slice(0, separator)) : defaultFolder(type)
}

/** 将有效输入转换为有限数值，空值、布尔及非法数值使用默认值。 */ function finiteAssetSetting(value: unknown, fallback: number): number {
  if (value == null || value === '' || typeof value === 'boolean') return fallback
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

/** 预检派生元信息后切换资源会话，释放旧字体缓存，迁移设置和未知字段，再恢复目录、字体与图集。 */ export function loadAssets(source: unknown, folderSource?: unknown, databaseSource?: unknown): void {
  for (const raw of Array.isArray(source) ? source : []) if (raw && typeof raw === 'object' && raw.derivedSprite !== undefined) { if (raw.assetType !== 'image') throw new Error('SPRITE_DERIVATION: Only image assets may carry derived sprite metadata.'); validateDerivedSprite(raw.derivedSprite) }
  assetSessionRevision++
  for(const face of installedFonts.values())document.fonts.delete(face)
  installedFonts.clear()
  clearAssetImportSession()
  assetState.records.splice(0)
  imageCache.clear()
  clearDerivedSpriteTextures()
  const records = Array.isArray(source) ? source : []
  for (const value of records) {
    if (!value || typeof value !== 'object') continue
    const item = value as Partial<AssetRecord>
    const knownFields = new Set(['uuid', 'name', 'path', 'assetType', 'mimeType', 'byteLength', 'source', 'sourceModified', 'importedAt', 'width', 'height', 'duration', 'fontFamily', 'settings', 'script', 'animationImport', 'interchange', 'derivedSprite', 'pipeline', 'tags', 'collectionIds', 'contentGroup', 'editorOnly', 'sourceControlStatus', 'thumbnailKey', 'unknownFields'])
    const inheritedUnknown = item.unknownFields && typeof item.unknownFields === 'object' ? item.unknownFields : {}
    const unknownFields = { ...inheritedUnknown, ...Object.fromEntries(Object.entries(value).filter(/* 返回 knownFields.has(key) 的逻辑取反结果。 */ ([key]) => !knownFields.has(key))) }
    const assetType = ['image', 'audio', 'font', 'scene', 'prefab', 'script', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay', 'path', 'particleSystem', 'visualScript', 'eventSheet', 'objectBlueprint', 'other', 'resource'].includes(String(item.assetType)) ? item.assetType as AssetType : 'other'
    const uuid = normalizeUuid(item.uuid)
    const defaults = defaultImportSettings()
    const settings: AssetImportSettings = {
      ...defaults,
      ...(item.settings ?? {}),
      atlasSettings: { ...defaults.atlasSettings, ...(item.settings?.atlasSettings ?? {}) },
      spriteSheet: { ...defaults.spriteSheet, ...(item.settings?.spriteSheet ?? {}) },
      borders: { ...defaults.borders, ...(item.settings?.borders ?? {}) },
      platformOverrides: { ...defaults.platformOverrides, ...(item.settings?.platformOverrides ?? {}) },
      collisionGeneration: { ...defaults.collisionGeneration, ...(item.settings?.collisionGeneration ?? {}) },
      svgSettings: { ...defaults.svgSettings, ...(item.settings?.svgSettings ?? {}) },
      audioSettings: { ...defaults.audioSettings, ...(item.settings?.audioSettings ?? {}) },
      fontSettings: { ...defaults.fontSettings, ...(item.settings?.fontSettings ?? {}) },
      tileSettings: { ...defaults.tileSettings, ...(item.settings?.tileSettings ?? {}) },
      scriptSettings: { ...defaults.scriptSettings, ...(item.settings?.scriptSettings ?? {}) },
      shaderSettings: { ...defaults.shaderSettings, ...(item.settings?.shaderSettings ?? {}) },
      localizationSettings: { ...defaults.localizationSettings, ...(item.settings?.localizationSettings ?? {}) }
    }
    settings.audioSettings.normalizationGain = Math.min(16, Math.max(.01, Number(settings.audioSettings.normalizationGain) || 1))
    settings.textureProfile = ['General', 'PixelArt', 'UI', 'NormalMap'].includes(String(settings.textureProfile)) ? settings.textureProfile : 'General'
    settings.audioSettings.profile = ['SoundEffect', 'Music', 'Voice', 'Streaming'].includes(String(settings.audioSettings.profile)) ? settings.audioSettings.profile : 'SoundEffect'
    settings.audioSettings.codec = ['Original', 'PCM', 'Vorbis', 'MP3'].includes(String(settings.audioSettings.codec)) ? settings.audioSettings.codec : 'Original'
    settings.audioSettings.quality = Math.min(1, Math.max(0, finiteAssetSetting(settings.audioSettings.quality, .8)))
    settings.audioSettings.trimStart = Math.max(0, Number(settings.audioSettings.trimStart) || 0)
    settings.audioSettings.trimEnd = Math.max(0, Number(settings.audioSettings.trimEnd) || 0)
    settings.audioSettings.preload = ['Preload', 'Metadata', 'None'].includes(String(settings.audioSettings.preload)) ? settings.audioSettings.preload : 'Auto'
    settings.fontSettings.renderMode = settings.fontSettings.renderMode === 'Bitmap' ? 'Bitmap' : 'Scalable'
    settings.fontSettings.fallbackFamilies = Array.isArray(settings.fontSettings.fallbackFamilies) ? settings.fontSettings.fallbackFamilies.map(String).map(/* 调用 value.trim() 并返回调用结果。 */ value => value.trim()).filter(Boolean).slice(0, 16) : defaults.fontSettings.fallbackFamilies
    settings.fontSettings.bitmapSize = Math.min(512, Math.max(6, Math.round(Number(settings.fontSettings.bitmapSize) || 32)))
    settings.fontSettings.outlineWidth = Math.min(32, Math.max(0, Number(settings.fontSettings.outlineWidth) || 0))
    settings.fontSettings.shaping = settings.fontSettings.shaping !== false
    settings.fontSettings.fallbackAssetUuids = Array.isArray(settings.fontSettings.fallbackAssetUuids) ? [...new Set(settings.fontSettings.fallbackAssetUuids.map(String))].slice(0, 32) : []
    settings.fontSettings.openTypeFeatures = Array.isArray(settings.fontSettings.openTypeFeatures) ? [...new Set(settings.fontSettings.openTypeFeatures.map(String).filter(/* 调用 /^[a-z0-9]{4}$/i.test(value) 并返回调用结果。 */ value => /^[a-z0-9]{4}$/i.test(value)))].slice(0, 64) : defaults.fontSettings.openTypeFeatures
    settings.fontSettings.hinting = ['Auto', 'None', 'Light', 'Full'].includes(String(settings.fontSettings.hinting)) ? settings.fontSettings.hinting : 'Auto'
    settings.fontSettings.oversampling = Math.min(8, Math.max(1, Number(settings.fontSettings.oversampling) || 1))
    settings.fontSettings.distanceField = ['SDF', 'MSDF'].includes(String(settings.fontSettings.distanceField)) ? settings.fontSettings.distanceField : 'None'
    settings.fontSettings.distanceRange = Math.min(64, Math.max(1, Number(settings.fontSettings.distanceRange) || 8))
    settings.fontSettings.declaredLanguages = Array.isArray(settings.fontSettings.declaredLanguages) ? [...new Set(settings.fontSettings.declaredLanguages.map(String).map(/* 调用 value.trim() 并返回调用结果。 */ value => value.trim()).filter(Boolean))].slice(0, 32) : ['en']
    settings.fontSettings.editorFont = settings.fontSettings.editorFont === true
    settings.spriteSheet.columns = Math.min(256, Math.max(1, Math.trunc(Number(settings.spriteSheet.columns) || 1)))
    settings.spriteSheet.rows = Math.min(256, Math.max(1, Math.trunc(Number(settings.spriteSheet.rows) || 1)))
    settings.spriteSheet.margin = Math.max(0, Math.trunc(Number(settings.spriteSheet.margin) || 0))
    settings.spriteSheet.spacing = Math.max(0, Math.trunc(Number(settings.spriteSheet.spacing) || 0))
    for (const side of ['left', 'top', 'right', 'bottom'] as const) settings.borders[side] = Math.max(0, Number(settings.borders[side]) || 0)
    settings.audioSettings.targetPeakDb = Math.min(0, Math.max(-24, finiteAssetSetting(settings.audioSettings.targetPeakDb, -1)))
    settings.audioSettings.loopStart = Math.max(0, Number(settings.audioSettings.loopStart) || 0)
    settings.audioSettings.loopEnd = Math.max(0, Number(settings.audioSettings.loopEnd) || 0)
    settings.audioSettings.loopRegions = (Array.isArray(settings.audioSettings.loopRegions) ? settings.audioSettings.loopRegions : []).slice(0, 64).map(/** 清理音频循环区身份、名称及非负起止时间，后续筛除空区间。 */ (region, index) => ({
      id: String(region?.id || `loop-${index + 1}`).replace(/[^A-Za-z0-9_.-]/g, '-').slice(0, 80), name: String(region?.name || `Loop ${index + 1}`).slice(0, 80),
      start: Math.max(0, Number(region?.start) || 0), end: Math.max(0, Number(region?.end) || 0)
    })).filter(/* 比较 region.end 与 region.start，返回大于的判断结果。 */ region => region.end > region.start)
    settings.audioSettings.activeLoopRegion = typeof settings.audioSettings.activeLoopRegion === 'string' && settings.audioSettings.loopRegions.some(/* 比较 region.id 与 settings.audioSettings.activeLoopRegion，返回严格相等的判断结果。 */ region => region.id === settings.audioSettings.activeLoopRegion) ? settings.audioSettings.activeLoopRegion : null
    settings.colorSpace = settings.colorSpace === 'Linear' ? 'Linear' : 'sRGB'
    settings.generateMipmaps = settings.generateMipmaps === true
    settings.transparency = ['Premultiply', 'Discard'].includes(String(settings.transparency)) ? settings.transparency : 'Preserve'
    settings.atlasSettings.rotationPolicy = settings.atlasSettings.rotationPolicy === 'Allow' ? 'Allow' : 'Never'
    settings.atlasSettings.trimPolicy = settings.atlasSettings.trimPolicy === 'None' ? 'None' : 'Transparent'
    settings.atlasSettings.group = String(settings.atlasSettings.group || 'Default').trim().slice(0, 80) || 'Default'
    settings.polygonOutline = Array.isArray(settings.polygonOutline) ? settings.polygonOutline.flatMap(/** 将多边形点规范为非负二维坐标，跳过非对象项。 */ point => point && typeof point === 'object' ? [{ x: Math.max(0, Number(point.x) || 0), y: Math.max(0, Number(point.y) || 0) }] : []).slice(0, 1024) : []
    settings.collisionGeneration.mode = ['Box', 'Polygon'].includes(String(settings.collisionGeneration.mode)) ? settings.collisionGeneration.mode : 'None'
    settings.collisionGeneration.tolerance = Math.min(64, Math.max(.01, Number(settings.collisionGeneration.tolerance) || 1))
    settings.extractedAnimationFrames = Array.isArray(settings.extractedAnimationFrames) ? settings.extractedAnimationFrames.flatMap(/** 将提取帧规范为非负起点和至少一像素宽高，跳过非对象项。 */ frame => frame && typeof frame === 'object' ? [{ x: Math.max(0, Number(frame.x) || 0), y: Math.max(0, Number(frame.y) || 0), width: Math.max(1, Number(frame.width) || 1), height: Math.max(1, Number(frame.height) || 1) }] : []).slice(0, 4096) : []
    settings.svgSettings.rasterization = ['Runtime', 'Disabled'].includes(String(settings.svgSettings.rasterization)) ? settings.svgSettings.rasterization : 'ImportTime'
    settings.svgSettings.scale = Math.min(16, Math.max(.01, Number(settings.svgSettings.scale) || 1)); settings.svgSettings.allowExternalResources = settings.svgSettings.allowExternalResources === true
    const variants = settings.platformVariants && typeof settings.platformVariants === 'object' ? settings.platformVariants : {}
    settings.platformVariants = Object.fromEntries(Object.entries(variants).filter(/** 只保留支持的平台及压缩模式覆盖配置。 */ ([platform, compression]) => ['windows', 'linux', 'macos', 'web'].includes(platform) && ['None', 'Lossless', 'Optimized'].includes(String(compression)))) as AssetImportSettings['platformVariants']
    settings.pixelsPerUnit = Math.min(1_000_000, Math.max(.000001, Number(settings.pixelsPerUnit) || 100))
    settings.pivot = {
      x: Math.min(1, Math.max(0, Number(settings.pivot?.x) || 0)),
      y: Math.min(1, Math.max(0, Number(settings.pivot?.y) || 0))
    }
    const rawRegion = settings.spriteRegion
    settings.spriteRegion = rawRegion && typeof rawRegion === 'object' ? {
      x: Math.max(0, Number(rawRegion.x) || 0), y: Math.max(0, Number(rawRegion.y) || 0),
      width: Math.max(1, Number(rawRegion.width) || 1), height: Math.max(1, Number(rawRegion.height) || 1)
    } : null
    assetState.records.push({
      uuid, name: sanitizedName(item.name || item.path?.split('/').pop() || 'Asset'),
      // 显示名可能相同；保存路径中的消歧后缀属于身份，重新打开时不得按显示名重新分配。
      path: uniquePath(sourceFolder(item.path, assetType), (typeof item.path === 'string' ? item.path.replace(/\\/g, '/').split('/').pop() : '') || item.name || 'Asset', uuid),
      assetType, mimeType: String(item.mimeType || 'application/octet-stream'), byteLength: Math.max(0, Number(item.byteLength) || 0),
      source: typeof item.source === 'string' ? item.source : '', sourceModified: Number(item.sourceModified) || 0,
      importedAt: Number(item.importedAt) || 0, width: Math.max(0, Number(item.width) || 0), height: Math.max(0, Number(item.height) || 0),
      duration: Math.max(0, Number(item.duration) || 0), fontFamily: item.fontFamily || (assetType === 'font' ? fontFamilyFor(uuid) : ''), settings,
      script: assetType === 'script' ? {
        ...defaultScriptMetadata(),
        ...(item.script ?? {}),
        version: 2,
        apiVersion: item.script?.apiVersion === undefined || Number(item.script.apiVersion) === 1 ? 1 : 2,
        breakpoints: Array.isArray(item.script?.breakpoints) ? [...new Set(item.script.breakpoints.map(Number).filter(/* 先计算 Number.isInteger(value)；仅当其为真值时求右侧 value > 0，返回短路求值结果。 */ value => Number.isInteger(value) && value > 0))].slice(0, 1000) : [],
        breakpointDetails: Array.isArray(item.script?.breakpointDetails) ? item.script.breakpointDetails.flatMap(/** 校验断点行号并限制身份、条件、日志、计数和分组字段。 */ (point, index) => {
          if (!point || typeof point !== 'object') return []
          const line = Math.round(Number(point.line))
          if (!Number.isFinite(line) || line < 1 || line > 1_000_000) return []
          return [{
            id: String(point.id || `breakpoint-${line}-${index}`).slice(0, 128), line,
            functionName: String(point.functionName || '').slice(0, 80), condition: String(point.condition || '').slice(0, 512),
            hitCondition: Math.min(1_000_000, Math.max(0, Math.round(Number(point.hitCondition) || 0))),
            logMessage: String(point.logMessage || '').slice(0, 1_024), enabled: point.enabled !== false,
            hitCount: Math.min(1_000_000_000, Math.max(0, Math.round(Number(point.hitCount) || 0))),
            group: String(point.group || 'Default').trim().slice(0, 80) || 'Default'
          }]
        }).slice(0, 1000) : [],
        tests: Array.isArray(item.script?.tests) ? item.script.tests.filter(/* 比较 typeof value 与 'string'，返回严格相等的判断结果。 */ value => typeof value === 'string').map(/* 调用 value.slice(0, 80) 并返回调用结果。 */ value => value.slice(0, 80)).slice(0, 256) : [],
        packageDependencies: Array.isArray(item.script?.packageDependencies) ? item.script.packageDependencies.filter(/* 比较 typeof value 与 'string'，返回严格相等的判断结果。 */ value => typeof value === 'string').map(/* 调用 value.slice(0, 256) 并返回调用结果。 */ value => value.slice(0, 256)).slice(0, 128) : [],
        packageName: String(item.script?.packageName || '').slice(0, 128),
        reloadPolicy: ['preserve', 'recreate', 'disabled'].includes(String(item.script?.reloadPolicy)) ? item.script!.reloadPolicy : 'preserve',
        signalConnections: Array.isArray(item.script?.signalConnections) ? item.script.signalConnections.flatMap(/** 保留非空信号及回调连接，限制来源目标字段并规范启用状态。 */ connection => {
          if (!connection || typeof connection !== 'object') return []
          const signal = String(connection.signal || '').trim().slice(0, 128), callback = String(connection.callback || '').trim().slice(0, 80)
          return signal && callback ? [{ signal, callback, source: String(connection.source || '').slice(0, 128), target: String(connection.target || '').slice(0, 128), enabled: connection.enabled !== false }] : []
        }).slice(0, 512) : [],
        recoverySource: String(item.script?.recoverySource || '').slice(0, 1_000_000),
        linkedGraphUuid: String(item.script?.linkedGraphUuid || '').toLowerCase().slice(0, 128),
        lastSavedHash: String(item.script?.lastSavedHash || '').slice(0, 128)
      } : undefined,
      animationImport: assetType === 'animation' ? {
        ...defaultAnimationImportMetadata(),
        ...(item.animationImport ?? {}),
        sourceAsset: typeof item.animationImport?.sourceAsset === 'string' ? item.animationImport.sourceAsset : null,
        sourceFrameRate: Math.min(240, Math.max(1, Number(item.animationImport?.sourceFrameRate) || 60)),
        sampleRate: Math.min(240, Math.max(1, Number(item.animationImport?.sampleRate) || 60)),
        compressionTolerance: Math.min(1e6, Math.max(0, Number(item.animationImport?.compressionTolerance) || .0001)),
        preserveEvents: item.animationImport?.preserveEvents !== false,
        trackMappings: Array.isArray(item.animationImport?.trackMappings) ? item.animationImport.trackMappings.flatMap(/** 只保留有字符串源目标的动画轨道映射并限制长度。 */ mapping => {
          if (!mapping || typeof mapping.source !== 'string' || typeof mapping.target !== 'string') return []
          return [{ source: mapping.source.slice(0, 256), target: mapping.target.slice(0, 256) }]
        }).slice(0, 512) : [],
        lastImportedAt: Math.max(0, Number(item.animationImport?.lastImportedAt) || 0)
      } : undefined,
      interchange: validateInterchangeMetadata(item.interchange) ?? undefined,
      derivedSprite: validateDerivedSprite(item.derivedSprite),
      pipeline: item.pipeline && typeof item.pipeline === 'object' ? {
        importerId: String(item.pipeline.importerId || 'nova.legacy').slice(0, 80),
        importerVersion: String(item.pipeline.importerVersion || '1.0.0').slice(0, 40),
        presetId: String(item.pipeline.presetId || 'legacy').slice(0, 80),
        platform: ['windows', 'linux', 'macos', 'web'].includes(String(item.pipeline.platform)) ? item.pipeline.platform : 'web',
        sourceHash: String(item.pipeline.sourceHash || item.pipeline.contentHash || '').slice(0, 128), artifactHash: String(item.pipeline.artifactHash || item.pipeline.cacheKey || '').slice(0, 128),
        contentHash: String(item.pipeline.contentHash || item.pipeline.sourceHash || '').slice(0, 128), cacheKey: String(item.pipeline.cacheKey || item.pipeline.artifactHash || '').slice(0, 128),
        status: item.pipeline.status === 'failed' ? 'failed' : 'ready', lastValidSource: typeof item.pipeline.lastValidSource === 'string' ? item.pipeline.lastValidSource : (typeof item.source === 'string' ? item.source : ''),
        error: String(item.pipeline.error || '').slice(0, 500), dependencies: Array.isArray(item.pipeline.dependencies) ? item.pipeline.dependencies.filter(/* 比较 typeof value 与 'string'，返回严格相等的判断结果。 */ value => typeof value === 'string').slice(0, 2048) : [],
        reverseDependencies: Array.isArray(item.pipeline.reverseDependencies) ? item.pipeline.reverseDependencies.filter(/* 比较 typeof value 与 'string'，返回严格相等的判断结果。 */ value => typeof value === 'string').slice(0, 2048) : [],
        cacheHit: item.pipeline.cacheHit === true,
        settingsHash: String(item.pipeline.settingsHash || item.pipeline.cacheKey || '').slice(0, 128), artifactSettingsHash: String(item.pipeline.artifactSettingsHash || item.pipeline.cacheKey || '').slice(0, 128),
        invalidationReason: String(item.pipeline.invalidationReason || 'Legacy metadata upgraded').slice(0, 500), sourceSettings: String(item.pipeline.sourceSettings || '{}').slice(0, 100_000), artifactSettings: String(item.pipeline.artifactSettings || '{}').slice(0, 100_000),
        diagnostics: Array.isArray(item.pipeline.diagnostics) ? item.pipeline.diagnostics.flatMap(/** 规范化导入诊断严重性和有界消息，丢弃非对象项。 */ diagnostic => diagnostic && typeof diagnostic === 'object' ? [{ severity: ['warning','error'].includes(String(diagnostic.severity)) ? diagnostic.severity as 'warning'|'error' : 'info' as const, code: String(diagnostic.code || 'IMPORT').slice(0, 80), message: String(diagnostic.message || '').slice(0, 1000) }] : []).slice(0, 256) : [],
        reproducible: item.pipeline.reproducible !== false, deprecatedSettings: Array.isArray(item.pipeline.deprecatedSettings) ? item.pipeline.deprecatedSettings.map(String).slice(0, 128) : []
      } : inlinePipeline(typeof item.source === 'string' ? item.source : ''),
      tags: Array.isArray(item.tags) ? [...new Set(item.tags.map(String).map(/* 调用 tag.trim() 并返回调用结果。 */ tag => tag.trim()).filter(Boolean))].slice(0, 64) : [], collectionIds: Array.isArray(item.collectionIds) ? [...new Set(item.collectionIds.map(String))].slice(0, 64) : [],
      contentGroup: String(item.contentGroup || 'main').slice(0, 80), editorOnly: item.editorOnly === true, sourceControlStatus: ['clean','added','modified','conflict','untracked'].includes(String(item.sourceControlStatus)) ? item.sourceControlStatus : 'clean', thumbnailKey: String(item.thumbnailKey || '').slice(0, 128),
      unknownFields: Object.keys(unknownFields).length ? unknownFields : undefined
    })
  }
  const folders = new Set<string>(DEFAULT_ASSET_FOLDERS)
  if (Array.isArray(folderSource)) {
    for (const value of folderSource) {
      if (typeof value !== 'string' || !value.trim()) continue
      const folder = normalizeFolder(value)
      if (folder === 'Assets' || folder.startsWith('Assets/') || folder === 'ProjectSettings' || folder.startsWith('.nova/')) folders.add(folder)
    }
  }
  assetState.records.forEach(/** 恢复派生资源尺寸、登记父目录并异步安装字体。 */ record => {
    if (record.derivedSprite) { record.width = record.derivedSprite.sourceSize.width; record.height = record.derivedSprite.sourceSize.height }
    const folder = record.path.slice(0, record.path.lastIndexOf('/'))
    if (folder) folders.add(folder)
    installFont(record)
  })
  assetState.folders.splice(0, assetState.folders.length, ...[...folders].sort())
  loadAssetDatabaseSettings(databaseSource)
  assetState.generation++
  queueTextureAtlasRebuild()
}

/** 计算无冲突新名称路径，先修复资源路径引用，再提交名称路径和代次变化。 */ export function renameAsset(uuid: string, name: string): boolean {
  const record = assetState.records.find(/* 比较 asset.uuid 与 uuid，返回严格相等的判断结果。 */ asset => asset.uuid === uuid)
  if (!record) return false
  const folder = record.path.slice(0, record.path.lastIndexOf('/'))
  const oldPath = record.path
  const newName = sanitizedName(name), newPath = uniquePath(folder, newName, uuid)
  repairAssetPathReferences(assetState.records, oldPath, newPath)
  record.name = newName; record.path = newPath
  assetState.generation++
  return true
}

/** 计算目标目录唯一资源路径，修复路径引用后登记目录并移动资源。 */ export function moveAsset(uuid: string, folder: string): boolean {
  const record = assetState.records.find(/* 比较 asset.uuid 与 uuid，返回严格相等的判断结果。 */ asset => asset.uuid === uuid)
  if (!record) return false
  const destination = normalizeFolder(folder)
  const oldPath = record.path
  const newPath = uniquePath(destination, record.name, uuid)
  repairAssetPathReferences(assetState.records, oldPath, newPath)
  if (!assetState.folders.includes(destination)) assetState.folders.push(destination)
  record.path = newPath
  assetState.generation++
  return true
}

/** Validate asynchronously before committing; stale operations never replace newer authoring. */
/** 以记录身份、修订和设置快照守卫重导入，预检格式、媒体、依赖及派生帧后提交；失败保留旧产物并记录错误。 */ export async function reimportAsset(uuid: string, file: File, prepared?: ImportedArtifact, signal?: AbortSignal): Promise<boolean> {
  const record = assetState.records.find(/* 比较 asset.uuid 与 uuid，返回严格相等的判断结果。 */ asset => asset.uuid === uuid)
  if (!record) return false
  const revision = (reimportRevisions.get(record) ?? 0) + 1; reimportRevisions.set(record, revision)
  const before = JSON.parse(JSON.stringify(record)) as AssetRecord
  const settings = JSON.stringify(record.settings)
  const current = /** 检查重导入未取消、原记录仍存在且请求修订、源和设置均未变化。 */ () => !signal?.aborted && assetState.records.includes(record) && reimportRevisions.get(record) === revision && record.source === before.source && JSON.stringify(record.settings) === settings
  try {
    if (record.derivedSprite) throw new Error('SPRITE_DERIVATION: Reimport the linked source image or atlas instead of an extracted frame.')
    const inferred = inferAssetType(file)
    if (inferred !== 'other' && inferred !== record.assetType) throw new Error(`CONTENT_TYPE_MISMATCH: ${inferred} source cannot replace ${record.assetType}.`)
    if (prepared && prepared.metadata.settingsHash !== assetSettingsHash(before.settings)) throw new Error('IMPORT_SETTINGS_CHANGED: Retry settings differ from the current asset. Reimport with the current settings.')
    const artifact = prepared ?? await processAssetImport(file, before.settings, { targetUuid: uuid, signal })
    const decoded = ['atlas', 'tileset'].includes(record.assetType) ? new TextDecoder().decode(artifact.bytes) : ''
    const external = decoded ? await importContentInterchangeAsync(file.name, decoded, before.interchange) : null
    if (before.interchange && !external) throw new Error('CONTENT_FORMAT_MISMATCH: Reimport requires the same supported atlas or Tiled metadata family.')
    if (external && external.assetType !== before.assetType) throw new Error(`CONTENT_TYPE_MISMATCH: ${external.assetType} source cannot replace ${before.assetType}.`)
    const candidate = { ...before, source: external ? `data:${external.mimeType};charset=utf-8,${encodeURIComponent(external.source)}` : artifact.source,
      mimeType: external?.mimeType || file.type || before.mimeType, byteLength: file.size, sourceModified: file.lastModified, importedAt: Date.now(), pipeline: structuredClone(artifact.metadata) }
    if (external) {
      candidate.interchange = external.metadata; candidate.pipeline.importerId = `nova.${external.metadata.format}`
      candidate.pipeline.artifactHash = sha256Bytes(assetSourceBytes(candidate.source)); candidate.pipeline.contentHash = candidate.pipeline.artifactHash
      candidate.pipeline.diagnostics.push(...external.metadata.diagnostics)
    }
    candidate.pipeline.lastValidSource = candidate.source
    if (candidate.assetType === 'image') {
      Object.assign(candidate, await imageMetadata(candidate.source))
      if (!candidate.width || !candidate.height) throw new Error('IMAGE_METADATA: The replacement image could not be decoded.')
    }
    if (candidate.assetType === 'audio') candidate.duration = await audioMetadata(candidate.source)
    const font=await prepareFont(candidate)
    const binding = bindInterchangeTexture(candidate, assetState.records, before)
    if (binding.diagnostics.length) throw new Error(binding.diagnostics.map(/** 按模板 `${issue.code}: ${issue.message}` 生成并返回字符串。 */ issue=>`${issue.code}: ${issue.message}`).join('\n'))
    const derivedUpdates = prepareDerivedSpriteRefresh(candidate, assetState.records)
    if (!current()) return false
    registerFont(uuid,font)
    // Keep editor identity/path and any independent metadata edits made while bytes were read.
    for (const key of ['source','mimeType','byteLength','sourceModified','importedAt','pipeline','interchange','width','height','duration'] as const) {
      if (key === 'interchange' && candidate.interchange === undefined) continue
      Object.assign(record, { [key]: candidate[key] })
    }
    for (const update of derivedUpdates) applyDerivedSprite(update.record, update.sprite)
    for (const page of assetState.atlasPages) page.regions.delete(uuid)
    clearDerivedSpriteTextures(); rejectedImageSources.delete(record); imageCache.delete(uuid); assetState.generation++; queueTextureAtlasRebuild(); return true
  } catch (error) {
    if (!current()) return false
    const message = error instanceof Error ? error.message : String(error)
    record.pipeline = { ...inlinePipeline(before.source), ...before.pipeline, status: 'failed', lastValidSource: before.source, error: message,
      invalidationReason: 'Source reimport failed; previous artifact and identity retained',
      diagnostics: [...(before.pipeline?.diagnostics ?? []).filter(/* 比较 item.code 与 'IMPORT_FAILED'，返回严格不等的判断结果。 */ item => item.code !== 'IMPORT_FAILED'), { severity: 'error', code: 'IMPORT_FAILED', message }] }
    assetState.generation++; return false
  }
}

/** 创建不与已有目录冲突的规范资源目录，排序并设为当前目录。 */ export function createAssetFolder(parent: string, name: string): string | null {
  const folder = normalizeFolder(`${parent}/${sanitizedName(name)}`)
  if (assetState.folders.some(/* 比较 value.toLowerCase() 与 folder.toLowerCase()，返回严格相等的判断结果。 */ value => value.toLowerCase() === folder.toLowerCase())) return null
  assetState.folders.push(folder)
  assetState.folders.sort()
  assetState.currentFolder = folder
  assetState.generation++
  return folder
}

/** 删除资源并释放文件监听、字体和纹理缓存，清理当前选择并请求图集更新。 */ export function deleteAsset(uuid: string): boolean {
  const index = assetState.records.findIndex(/* 比较 record.uuid 与 uuid，返回严格相等的判断结果。 */ record => record.uuid === uuid)
  if (index < 0) return false
  stopWatchingAsset(uuid)
  const font=installedFonts.get(uuid)
  if(font)document.fonts.delete(font)
  installedFonts.delete(uuid)
  assetState.records.splice(index, 1)
  imageCache.delete(uuid)
  clearDerivedSpriteTextures()
  if (assetState.selectedGuid === uuid) assetState.selectedGuid = null
  assetState.generation++
  queueTextureAtlasRebuild()
  return true
}

/** Restores a recoverable project-trash record without changing its stable GUID. */
/** 仅在身份未占用时恢复深复制资源，补目录、字体和排序并选中恢复项。 */ export function restoreAssetRecord(value: AssetRecord): boolean {
  if (!value || assetState.records.some(/* 比较 record.uuid 与 value.uuid，返回严格相等的判断结果。 */ record => record.uuid === value.uuid)) return false
  const restored = JSON.parse(JSON.stringify(value)) as AssetRecord
  assetState.records.push(restored)
  installFont(restored)
  assetState.records.sort(/* 先计算 a.path.localeCompare(b.path)；仅当其为假值时求右侧 a.uuid.localeCompare(b.uuid)，返回短路求值结果。 */ (a, b) => a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid))
  const folder = restored.path.slice(0, restored.path.lastIndexOf('/')) || 'Assets'
  if (!assetState.folders.includes(folder)) assetState.folders.push(folder)
  assetState.selectedGuid = restored.uuid
  assetState.generation++
  queueTextureAtlasRebuild()
  return true
}

/** 移除已收藏身份，否则仅为现存资源添加收藏。 */ export function toggleAssetFavorite(uuid: string): boolean {
  const index = assetState.favorites.indexOf(uuid)
  if (index >= 0) { assetState.favorites.splice(index, 1); return false }
  if (assetState.records.some(/* 比较 record.uuid 与 uuid，返回严格相等的判断结果。 */ record => record.uuid === uuid)) assetState.favorites.push(uuid)
  return true
}

/** 以非空名称保存当前查询、目录、类型、标签和集合筛选。 */ export function saveCurrentAssetFilter(name: string): AssetSavedFilter | null {
  const safe = name.trim().slice(0, 80)
  if (!safe) return null
  const filter: AssetSavedFilter = { id: normalizeUuid(undefined), name: safe, query: assetState.search.slice(0, 200), folder: assetState.currentFolder, assetType: assetState.typeFilter, tags: assetState.tagFilter ? [assetState.tagFilter] : [], collectionId: assetState.selectedCollectionId }
  assetState.savedFilters.push(filter)
  return filter
}

/** 读取已保存筛选并恢复查询、目录、类型、首个标签及集合选择。 */ export function applyAssetFilter(id: string): boolean {
  const filter = assetState.savedFilters.find(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (!filter) return false
  assetState.search = filter.query; assetState.currentFolder = filter.folder; assetState.typeFilter = filter.assetType; assetState.tagFilter = filter.tags[0] ?? ''; assetState.selectedCollectionId = filter.collectionId
  return true
}

/** 删除存在的已保存资源筛选，未找到返回 false。 */ export function deleteAssetFilter(id: string): boolean {
  const index = assetState.savedFilters.findIndex(/* 比较 item.id 与 id，返回严格相等的判断结果。 */ item => item.id === id)
  if (index < 0) return false
  assetState.savedFilters.splice(index, 1); return true
}

/** 以非空名称和合法颜色建立资源集合，排序后返回新集合。 */ export function createAssetCollection(name: string, color = '#6ea8fe'): AssetCollection | null {
  const safe = name.trim().slice(0, 80); if (!safe) return null
  const collection: AssetCollection = { id: normalizeUuid(undefined), name: safe, color: /^#[0-9a-f]{6}$/i.test(color) ? color : '#6ea8fe', assetUuids: [] }
  assetState.collections.push(collection); assetState.collections.sort(/* 调用 a.name.localeCompare(b.name) 并返回调用结果。 */ (a, b) => a.name.localeCompare(b.name)); return collection
}

/** 同步切换集合成员和资源反向集合身份，保持两个方向一致。 */ export function toggleAssetInCollection(assetUuid: string, collectionId: string): boolean {
  const asset = assetState.records.find(/* 比较 record.uuid 与 assetUuid，返回严格相等的判断结果。 */ record => record.uuid === assetUuid), collection = assetState.collections.find(/* 比较 item.id 与 collectionId，返回严格相等的判断结果。 */ item => item.id === collectionId)
  if (!asset || !collection) return false
  const included = collection.assetUuids.includes(assetUuid)
  collection.assetUuids = included ? collection.assetUuids.filter(/* 比较 uuid 与 assetUuid，返回严格不等的判断结果。 */ uuid => uuid !== assetUuid) : [...collection.assetUuids, assetUuid].sort()
  asset.collectionIds = included ? (asset.collectionIds ?? []).filter(/* 比较 id 与 collectionId，返回严格不等的判断结果。 */ id => id !== collectionId) : [...new Set([...(asset.collectionIds ?? []), collectionId])].sort()
  return !included
}

/** 深复制导入设置，以唯一身份及非空名称保存指定资源类型预设。 */ export function saveImportPreset(name: string, assetType: AssetType | 'all', settings: AssetImportSettings): AssetImportPreset | null {
  const safe = name.trim().slice(0, 80)
  if (!safe) return null
  const preset: AssetImportPreset = { id: normalizeUuid(undefined), name: safe, assetType, settings: JSON.parse(JSON.stringify(settings)) as AssetImportSettings }
  assetState.importPresets.push(preset); return preset
}

/** 仅应用类型兼容的导入预设，复制设置并请求资源和图集刷新。 */ export function applyImportPreset(id: string, asset: AssetRecord): boolean {
  const preset = assetState.importPresets.find(/* 先计算 item.id === id；仅当其为真值时求右侧 (item.assetType === 'all' || item.assetType === asset.assetType)，返回短路求值结果。 */ item => item.id === id && (item.assetType === 'all' || item.assetType === asset.assetType))
  if (!preset) return false
  asset.settings = JSON.parse(JSON.stringify(preset.settings)) as AssetImportSettings
  assetState.generation++; queueTextureAtlasRebuild(); return true
}

/** 重建依赖图并把排序后的正反依赖同步至每个资源流水线元信息。 */ export function synchronizeAssetDependencyMetadata(project?: unknown): void {
  const graph = buildAssetDependencyGraph(assetState.records, project)
  for (const record of assetState.records) {
    record.pipeline ??= inlinePipeline(record.source)
    record.pipeline.dependencies = [...(graph.dependencies.get(record.uuid) ?? [])].sort()
    record.pipeline.reverseDependencies = [...(graph.reverseDependencies.get(record.uuid) ?? [])].sort()
  }
}

/** 重试保留的导入输入，按是否具有目标身份选择重导入或登记新资源，再更新图集。 */ export async function retryFailedAssetImport(jobId: number, requestedFolder?: string): Promise<AssetRecord | null> {
  const result = await retryAssetImport(jobId)
  if (!result) return null
  if (result.targetUuid) return await reimportAsset(result.targetUuid, result.file, result.artifact) ? resolveAsset(result.targetUuid) : null
  const record = await recordImportedArtifact(result.file, result.settings, result.artifact, requestedFolder)
  assetState.records.sort(/* 调用 a.path.localeCompare(b.path) 并返回调用结果。 */ (a, b) => a.path.localeCompare(b.path)); assetState.generation++; queueTextureAtlasRebuild()
  return record
}

type SourceFileHandle = { getFile(): Promise<File> }

/** 通过浏览器选择原始文件并建立修改监听，记录初始时间，区分不支持与用户取消。 */ export async function linkAssetSource(uuid: string, onReimported?: () => void): Promise<'linked' | 'cancelled' | 'unsupported'> {
  const picker = (window as unknown as { showOpenFilePicker?: (options?: { multiple: boolean }) => Promise<SourceFileHandle[]> }).showOpenFilePicker
  if (!picker) return 'unsupported'
  let handles: SourceFileHandle[]
  try { handles = await picker({ multiple: false }) } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'; throw error }
  const handle = handles[0]
  if (!handle || !assetState.records.some(/* 比较 record.uuid 与 uuid，返回严格相等的判断结果。 */ record => record.uuid === uuid)) return 'cancelled'
  const initial = await handle.getFile()
  watchAssetSource(uuid, handle, /** 自动换源成功后通知作者历史拥有者，失败保留原源。 */ async file => { const success = await reimportAsset(uuid, file); if (success) onReimported?.(); return success }, initial.lastModified)
  const record = assetState.records.find(/* 比较 asset.uuid 与 uuid，返回严格相等的判断结果。 */ asset => asset.uuid === uuid)
  if (record) record.sourceModified = initial.lastModified
  return 'linked'
}

/** 根据用户选择重导入、复制或忽略外部变更，操作成功后移除待处理记录。 */ export async function resolveExternalAssetChange(changeId: string, choice: 'reimport' | 'keep' | 'duplicate'): Promise<boolean> {
  const change = importPipelineState.externalChanges.find(/* 比较 item.id 与 changeId，返回严格相等的判断结果。 */ item => item.id === changeId)
  if (!change) return false
  let success = true
  if (choice === 'reimport') success = await reimportAsset(change.uuid, change.file)
  else if (choice === 'duplicate') success = (await importAssetFiles([change.file])).length > 0
  if (success) dismissExternalAssetChange(change.id)
  return success
}

/** 按模板 `asset://${normalizeUuid(uuid)}` 生成并返回字符串。 */ export function assetReference(uuid: string): string { return `asset://${normalizeUuid(uuid)}` }
/** 仅从 asset URI 提取身份，其他引用返回 null。 */ export function assetGuid(reference: string | null | undefined): string | null {
  if (!reference?.startsWith('asset://')) return null
  return reference.slice('asset://'.length)
}
/** 确保索引代次最新后按资源 URI 或裸身份读取记录。 */ export function resolveAsset(reference: string | null | undefined): AssetRecord | null {
  const guid = assetGuid(reference) ?? reference
  ensureIndex()
  return guid ? recordsByUuid.get(guid) ?? null : null
}

/** 检查派生帧来源、拥有者和几何边界，并返回当前源对应的加载拒绝诊断。 */ export function assetTextureDiagnostic(reference: string | null | undefined): string {
  const record = resolveAsset(reference)
  if (!record) return 'TEXTURE_MISSING: Select or repair the missing image reference.'
  if (record.derivedSprite) {
    const texture = resolveAsset(record.derivedSprite.textureAsset)
    if (!texture || texture.assetType !== 'image' || texture.derivedSprite) return 'TEXTURE_SOURCE_MISSING: Repair the original image linked by this frame.'
    if (!resolveAsset(record.derivedSprite.ownerAsset)) return 'TEXTURE_OWNER_MISSING: Repair the atlas or sheet that owns this frame.'
    const frame = record.derivedSprite.frame
    if (frame.x + frame.width > texture.width || frame.y + frame.height > texture.height) return 'TEXTURE_FRAME_BOUNDS: This frame no longer fits its source image. Restore or reimport the matching source.'
    const failure = rejectedImageSources.get(texture)
    return failure?.source === texture.source ? failure.error : ''
  }
  const failure = rejectedImageSources.get(record)
  return failure?.source === record.source ? failure.error : ''
}

/** 解析图像资源的完整纹理，再应用用户导入裁剪区域。 */ export function resolveTexture(reference: string | null | undefined, filterOverride?: 'Nearest' | 'Linear'): TextureRegion | null {
  const record = resolveAsset(reference)
  if (!record || record.assetType !== 'image') return null
  const texture = resolveUncroppedTexture(record, filterOverride)
  return texture ? importedSpriteRegion(record, texture) : null
}

/** 优先解析派生帧或图集区域，否则在有界解码缓存中加载原图，使用源身份保护异步完成。 */ function resolveUncroppedTexture(record: AssetRecord, filterOverride?: 'Nearest' | 'Linear'): TextureRegion | null {
  if (record.derivedSprite) {
    const image = resolveAsset(record.derivedSprite.textureAsset)
    if (!image || image.assetType !== 'image' || image.derivedSprite) return null
    const texture = resolveUncroppedTexture(image, filterOverride)
    return texture ? resolveDerivedSpriteTexture(record.derivedSprite, texture, image, filterOverride ?? record.settings.filterMode) : null
  }
  if (!record.source) return null
  for (const page of assetState.atlasPages) {
    const region = page.regions.get(record.uuid)
    if (region) return { ...region, key: region.key + ':revision:' + atlasContentRevision, revision: atlasContentRevision, filter: filterOverride ?? region.filter, colorSpace: record.settings.colorSpace }
  }
  if (rejectedImageSources.get(record)?.source === record.source) return null
  let image = imageCache.get(record.uuid)
  if (!image) {
    const expectedBytes = Math.max(4, record.width * record.height * 4)
    if (!Number.isFinite(expectedBytes) || expectedBytes > IMAGE_CACHE_LIMITS.bytes) { rejectedImageSources.set(record, { source: record.source, error: 'TEXTURE_MEMORY_BUDGET: This source exceeds the128MiB decoded-image budget. Enable atlas packing or import a smaller source.' }); return null }
    const loaded = new Image(), source = record.source
    if (!imageCache.set(record.uuid, loaded, expectedBytes)) return null
    pendingImageLoads.set(record.uuid, loaded)
    loaded.onload = /** 仅处理当前图像请求，更新解码修订并按真实像素重新计费；超预算时拒绝保留图像。 */ () => {
      if (pendingImageLoads.get(record.uuid) !== loaded) return
      pendingImageLoads.delete(record.uuid); loaded.onload = null; loaded.onerror = null
      if (record.source !== source || imageCache.get(record.uuid) !== loaded) return
      decodedTextureRevision++
      const weight = loaded.naturalWidth * loaded.naturalHeight * 4
      if (!Number.isFinite(weight) || weight <= 0 || !imageCache.set(record.uuid, loaded, weight)) { imageCache.delete(record.uuid); rejectedImageSources.set(record, { source, error: 'TEXTURE_DECODE_FAILED: Image pixels could not be retained. Reimport the source to retry; reduce oversized image dimensions.' }) }
    }
    loaded.onerror = /** 清理失败图像的监听和缓存，仅为仍匹配的源记录解码错误。 */ () => {
      if (pendingImageLoads.get(record.uuid) !== loaded) return
      pendingImageLoads.delete(record.uuid); loaded.onload = null; loaded.onerror = null
      imageCache.delete(record.uuid); if (record.source === source) rejectedImageSources.set(record, { source, error: 'TEXTURE_DECODE_FAILED: Image decoding failed. Reimport the source to retry.' })
    }
    loaded.src = source; image = loaded
  }
  if (!image.complete || image.naturalWidth <= 0) return null
  return { key: `asset:${record.uuid}:${record.pipeline?.artifactHash || record.importedAt}`, source: image, revision: record.pipeline?.artifactHash || record.importedAt, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: filterOverride ?? record.settings.filterMode, colorSpace: record.settings.colorSpace }
}

/** Resolves a pixel-space sub-region without allocating another texture. */
/** 将显式像素区域限制在资源边界，并组合到完整纹理或图集 UV 范围。 */ export function resolveTextureRegion(
  reference: string | null | undefined,
  region: { x: number; y: number; width: number; height: number },
  filterOverride?: 'Nearest' | 'Linear'
): TextureRegion | null {
  const record = resolveAsset(reference)
  const texture = record?.assetType === 'image' ? resolveUncroppedTexture(record, filterOverride) : null
  if (!record || !texture || record.width <= 0 || record.height <= 0) return null
  const x = Math.min(record.width - 1, Math.max(0, Number(region.x) || 0))
  const y = Math.min(record.height - 1, Math.max(0, Number(region.y) || 0))
  const width = Math.min(record.width - x, Math.max(1, Number(region.width) || 1))
  const height = Math.min(record.height - y, Math.max(1, Number(region.height) || 1))
  return {
    ...texture,
    key: `${texture.key}:region:${x}:${y}:${width}:${height}`,
    uv: {
      x: texture.uv.x + x / record.width * texture.uv.width,
      y: texture.uv.y + y / record.height * texture.uv.height,
      width: width / record.width * texture.uv.width,
      height: height / record.height * texture.uv.height
    }
  }
}

/** 把资源导入裁剪区域限制在尺寸边界，并转换为纹理 UV 子区域。 */ function importedSpriteRegion(record: AssetRecord, texture: TextureRegion): TextureRegion {
  const region = record.settings.spriteRegion
  if (!region || record.width <= 0 || record.height <= 0) return texture
  const x = Math.min(record.width - 1, Math.max(0, region.x))
  const y = Math.min(record.height - 1, Math.max(0, region.y))
  const width = Math.min(record.width - x, Math.max(1, region.width))
  const height = Math.min(record.height - y, Math.max(1, region.height))
  return {
    ...texture,
    key: `${texture.key}:${x}:${y}:${width}:${height}`,
    uv: {
      x: texture.uv.x + x / record.width * texture.uv.width,
      y: texture.uv.y + y / record.height * texture.uv.height,
      width: width / record.width * texture.uv.width,
      height: height / record.height * texture.uv.height
    }
  }
}

/** 异步构建图集，仅提交最新请求修订，更新纹理内容版本并清理派生纹理缓存。 */ export async function rebuildTextureAtlases(): Promise<void> {
  const revision = ++atlasRevision
  const pages = await buildTextureAtlases(assetState.records)
  if (revision !== atlasRevision) return
  assetState.atlasPages.splice(0, assetState.atlasPages.length, ...pages.map(/* 调用 markRaw(page) 并返回调用结果。 */ page => markRaw(page)))
  atlasContentRevision++; clearDerivedSpriteTextures()
  assetState.atlasError = ''
  assetState.generation++
}

/** 启动图集重建，失败时保留旧有效图集并记录有界错误消息。 */ export function queueTextureAtlasRebuild(): void {
  const pending = rebuildTextureAtlases(), requestedRevision = atlasRevision
  void pending.catch(/** 只发布最新构建的错误，旧请求不得覆盖后来成功构建的状态。 */ error => {
    if (requestedRevision !== atlasRevision) return
    assetState.atlasError = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500)
    console.error('Texture atlas rebuild failed; the previous valid atlas remains active.', error)
  })
}

/** 根据目录、全文查询、类型、标签、集合及收藏条件筛选已排序资源索引。 */ export function filteredAssets(): AssetRecord[] {
  ensureIndex()
  const query = assetState.search.trim().toLowerCase()
  const folder = `${assetState.currentFolder}/`
  const favorites = new Set(assetState.favorites)
  const collection = assetState.collections.find(/* 比较 item.id 与 assetState.selectedCollectionId，返回严格相等的判断结果。 */ item => item.id === assetState.selectedCollectionId), collectionAssets = collection ? new Set(collection.assetUuids) : null
  return indexedRecords.filter(/** 组合目录、查询、类型、标签、集合和收藏规则判断资源是否出现在当前视图。 */ record => {
    const inFolder = record.path.startsWith(folder) && !record.path.slice(folder.length).includes('/')
    const typeMatches = assetState.typeFilter === 'all' || record.assetType === assetState.typeFilter
    const queryMatches = !query || record.name.toLowerCase().includes(query) || record.path.toLowerCase().includes(query) || (record.tags ?? []).some(/* 调用 tag.toLowerCase().includes(query) 并返回调用结果。 */ tag => tag.toLowerCase().includes(query))
    const tagMatches = !assetState.tagFilter || (record.tags ?? []).includes(assetState.tagFilter)
    return (query || collectionAssets || inFolder) && typeMatches && queryMatches && tagMatches && (!collectionAssets || collectionAssets.has(record.uuid)) && (!assetState.favoritesOnly || favorites.has(record.uuid))
  })
}
