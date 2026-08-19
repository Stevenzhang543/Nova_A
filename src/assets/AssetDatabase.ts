import { markRaw, reactive } from 'vue'
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
  type AssetRecord,
  type AssetSavedFilter,
  type AssetType,
  type TextureAtlasPage
} from './types'
import type { TextureRegion } from '../renderer'
import { dismissExternalAssetChange, importPipelineState, processAssetImport, retryAssetImport, stopWatchingAsset, watchAssetSource, type ImportedArtifact } from './importPipeline'
import { buildAssetDependencyGraph, repairAssetPathReferences } from './assetGraph'
import { assetSourceBytes, sha256Bytes } from './contentHash'

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
  favorites: string[]
  savedFilters: AssetSavedFilter[]
  importPresets: AssetImportPreset[]
  indexSize: number
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
  favorites: [],
  savedFilters: [],
  importPresets: [],
  indexSize: 0
})

const imageCache = new Map<string, HTMLImageElement>()
let atlasRevision = 0
let indexRevision = -1
let indexedRecords: AssetRecord[] = []
let recordsByUuid = new Map<string, AssetRecord>()

function inlinePipeline(source: string) {
  const hash = sha256Bytes(assetSourceBytes(source))
  return { importerVersion: 'inline-1', platform: 'web' as const, sourceHash: hash, artifactHash: hash, contentHash: hash, cacheKey: hash, status: 'ready' as const, lastValidSource: source, error: '', dependencies: [] as string[], reverseDependencies: [] as string[], cacheHit: false }
}

function ensureIndex(): void {
  if (indexRevision === assetState.generation) return
  indexedRecords = [...assetState.records].sort((a, b) => a.path.localeCompare(b.path) || a.uuid.localeCompare(b.uuid))
  recordsByUuid = new Map(indexedRecords.map(record => [record.uuid, record]))
  assetState.indexSize = indexedRecords.length
  indexRevision = assetState.generation
}

export function inferAssetType(file: Pick<File, 'name' | 'type'>): AssetType {
  const mime = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) return 'image'
  if (mime.startsWith('audio/') || ['wav', 'ogg', 'mp3', 'flac'].includes(extension)) return 'audio'
  if (mime.startsWith('font/') || ['ttf', 'otf', 'woff', 'woff2'].includes(extension)) return 'font'
  if (extension === 'nova-scene' || extension === 'scene') return 'scene'
  if (extension === 'nova-prefab' || extension === 'prefab') return 'prefab'
  if (extension === 'rhai' || mime === 'text/x-rhai') return 'script'
  if (extension === 'nova-schema') return 'dataSchema'
  if (extension === 'nova-data' || extension === 'csv') return 'dataTable'
  if (extension === 'nova-replay') return 'replay'
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
  if (extension === 'nova-tileset') return 'tileset'
  if (extension === 'nova-atlas' || extension === 'atlas') return 'atlas'
  if (['glsl', 'frag', 'vert', 'nova-shader'].includes(extension)) return 'shader'
  if (['csv', 'po', 'arb', 'nova-locale'].includes(extension) || /(?:^|[-_.])locale(?:[-_.]|$)/i.test(file.name)) return 'localization'
  if (extension === 'nova-theme') return 'uiTheme'
  return 'other'
}

function defaultFolder(type: AssetType): string {
  if (type === 'image') return 'Assets/Sprites'
  if (type === 'audio') return 'Assets/Audio'
  if (type === 'font') return 'Assets/Fonts'
  if (type === 'scene') return 'Assets/Scenes'
  if (type === 'prefab') return 'Assets/Prefabs'
  if (type === 'script') return 'Assets/Scripts'
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

function sanitizedName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 120) || 'Untitled asset'
}

function uniquePath(folder: string, name: string, ignoreGuid?: string): string {
  const normalizedFolder = normalizeFolder(folder)
  const stem = sanitizedName(name)
  let candidate = `${normalizedFolder}/${stem}`
  let suffix = 2
  while (assetState.records.some(record => record.uuid !== ignoreGuid && record.path.toLowerCase() === candidate.toLowerCase())) {
    const dot = stem.lastIndexOf('.')
    candidate = dot > 0
      ? `${normalizedFolder}/${stem.slice(0, dot)} ${suffix}${stem.slice(dot)}`
      : `${normalizedFolder}/${stem} ${suffix}`
    suffix++
  }
  return candidate
}

export function normalizeFolder(value: string): string {
  const clean = value.replace(/\\/g, '/').split('/').filter(part => part && part !== '.' && part !== '..').join('/')
  return clean.startsWith('.') ? clean : clean.startsWith('Assets') || clean === 'ProjectSettings' ? clean : `Assets/${clean}`
}

function imageMetadata(source: string): Promise<{ width: number; height: number }> {
  return new Promise(resolve => {
    const image = new Image()
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
    image.onerror = () => resolve({ width: 0, height: 0 })
    image.src = source
  })
}

function audioMetadata(source: string): Promise<number> {
  return new Promise(resolve => {
    const audio = new Audio()
    const finish = (duration = 0) => { audio.removeAttribute('src'); audio.load(); resolve(Number.isFinite(duration) ? duration : 0) }
    audio.onloadedmetadata = () => finish(audio.duration)
    audio.onerror = () => finish()
    audio.src = source
  })
}

function fontFamilyFor(uuid: string): string { return `NovaAsset_${uuid.replace(/-/g, '')}` }

function installFont(record: AssetRecord): void {
  if (record.assetType !== 'font' || !record.source || !('FontFace' in window)) return
  const face = new FontFace(record.fontFamily || fontFamilyFor(record.uuid), `url(${record.source})`)
  void face.load().then(loaded => document.fonts.add(loaded)).catch(() => undefined)
}

async function recordImportedArtifact(file: File, settings: AssetImportSettings, artifact: ImportedArtifact, requestedFolder?: string): Promise<AssetRecord> {
  const assetType = inferAssetType(file), source = artifact.source
  const metadata = assetType === 'image' ? await imageMetadata(source) : { width: 0, height: 0 }
  const uuid = normalizeUuid(undefined)
  const record: AssetRecord = {
    uuid, name: sanitizedName(file.name), path: uniquePath(requestedFolder || defaultFolder(assetType), file.name), assetType,
    mimeType: file.type || 'application/octet-stream', byteLength: file.size, source, sourceModified: file.lastModified, importedAt: Date.now(),
    width: metadata.width, height: metadata.height, duration: assetType === 'audio' ? await audioMetadata(source) : 0,
    fontFamily: assetType === 'font' ? fontFamilyFor(uuid) : '', settings,
    script: assetType === 'script' ? defaultScriptMetadata() : undefined,
    animationImport: assetType === 'animation' ? defaultAnimationImportMetadata() : undefined,
    pipeline: artifact.metadata
  }
  assetState.records.push(record); installFont(record)
  const folder = record.path.slice(0, record.path.lastIndexOf('/'))
  if (folder && !assetState.folders.includes(folder)) assetState.folders.push(folder)
  return record
}

export async function importAssetFiles(files: Iterable<File>, requestedFolder?: string): Promise<AssetRecord[]> {
  assetState.importing = true
  const imported: AssetRecord[] = []
  try {
    for (const file of files) {
      const assetType = inferAssetType(file)
      const settings = defaultImportSettings()
      if (assetType === 'image' && /(?:^|[-_.])pixel(?:[-_.]|$)/i.test(file.name)) settings.filterMode = 'Nearest'
      const artifact = await processAssetImport(file, settings)
      const record = await recordImportedArtifact(file, settings, artifact, requestedFolder)
      imported.push(record)
    }
    assetState.records.sort((first, second) => first.path.localeCompare(second.path))
    assetState.generation++
    queueTextureAtlasRebuild()
    return imported
  } finally {
    assetState.importing = false
  }
}

/** Creates independently addressable sprite-region assets without duplicating source pixels. */
export function sliceSpriteSheet(record: AssetRecord): AssetRecord[] {
  if (record.assetType !== 'image') return []
  const sheet = record.settings.spriteSheet
  const columns = Math.min(256, Math.max(1, Math.trunc(sheet.columns))), rows = Math.min(256, Math.max(1, Math.trunc(sheet.rows)))
  const margin = Math.max(0, Math.trunc(sheet.margin)), spacing = Math.max(0, Math.trunc(sheet.spacing))
  const width = Math.floor((record.width - margin * 2 - spacing * (columns - 1)) / columns)
  const height = Math.floor((record.height - margin * 2 - spacing * (rows - 1)) / rows)
  if (width < 1 || height < 1 || columns * rows > 4096) return []
  const stem = record.name.replace(/\.[^.]+$/, ''), extension = record.name.match(/\.[^.]+$/)?.[0] ?? '.png'
  const generated: AssetRecord[] = []
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const name = `${stem}_${String(row * columns + column).padStart(3, '0')}${extension}`
    generated.push({
      ...record, uuid: normalizeUuid(undefined), name, path: uniquePath(record.path.slice(0, record.path.lastIndexOf('/')), name), importedAt: Date.now(),
      settings: { ...record.settings, spriteRegion: { x: margin + column * (width + spacing), y: margin + row * (height + spacing), width, height }, spriteSheet: { ...sheet, enabled: false }, pivot: { ...record.settings.pivot }, borders: { ...record.settings.borders }, platformVariants: { ...record.settings.platformVariants } },
      pipeline: record.pipeline ? { ...record.pipeline, dependencies: [...record.pipeline.dependencies], reverseDependencies: [] } : undefined,
      unknownFields: record.unknownFields ? { ...record.unknownFields } : undefined
    })
  }
  assetState.records.push(...generated); assetState.records.sort((first, second) => first.path.localeCompare(second.path)); assetState.generation++; queueTextureAtlasRebuild()
  return generated
}

/** Finds the non-transparent pixel bounds and stores them as the active sprite region. */
export async function trimTransparentImage(record: AssetRecord): Promise<boolean> {
  if (record.assetType !== 'image' || !record.source || record.width < 1 || record.height < 1) return false
  const image = await new Promise<HTMLImageElement>((resolve, reject) => { const value = new Image(); value.onload = () => resolve(value); value.onerror = () => reject(new Error('Image preview failed')); value.src = record.source })
  const canvas = document.createElement('canvas'); canvas.width = record.width; canvas.height = record.height
  const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return false
  context.drawImage(image, 0, 0); const pixels = context.getImageData(0, 0, record.width, record.height).data
  let left = record.width, top = record.height, right = -1, bottom = -1
  for (let y = 0; y < record.height; y++) for (let x = 0; x < record.width; x++) if (pixels[(y * record.width + x) * 4 + 3] > 0) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y) }
  if (right < left || bottom < top) return false
  record.settings.spriteRegion = { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }; record.settings.transparentTrim = true; assetState.generation++; queueTextureAtlasRebuild(); return true
}

export function registerEmbeddedImage(source: string, name = 'Legacy texture'): AssetRecord {
  const existing = assetState.records.find(record => record.assetType === 'image' && record.source === source)
  if (existing) return existing
  const uuid = normalizeUuid(undefined)
  const record: AssetRecord = {
    uuid, name: sanitizedName(name), path: uniquePath('Assets/Sprites/Imported', `${sanitizedName(name)}.png`),
    assetType: 'image', mimeType: source.slice(5, source.indexOf(';')) || 'image/png', byteLength: source.length,
    source, sourceModified: 0, importedAt: Date.now(), width: 0, height: 0, duration: 0, fontFamily: '',
    settings: defaultImportSettings(), pipeline: inlinePipeline(source)
  }
  assetState.records.push(record)
  if (!assetState.folders.includes('Assets/Sprites/Imported')) assetState.folders.push('Assets/Sprites/Imported')
  void imageMetadata(source).then(size => { record.width = size.width; record.height = size.height; queueTextureAtlasRebuild() }).catch(error => { assetState.atlasError = error instanceof Error ? error.message : String(error) })
  assetState.generation++
  return record
}

function textDataUrl(source: string, mimeType: string): string {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(source)}`
}

export function createTextAsset(
  name: string,
  assetType: 'script' | 'prefab' | 'scene' | 'material' | 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline' | 'tileset' | 'atlas' | 'shader' | 'localization' | 'uiTheme' | 'behaviorTree' | 'stateMachine' | 'tilePalette' | 'brushPreset' | 'terrainRules' | 'dataSchema' | 'dataTable' | 'replay',
  source: string,
  requestedFolder?: string
): AssetRecord {
  const uuid = normalizeUuid(undefined)
  const extension = assetType === 'script' ? '.rhai' : assetType === 'prefab' ? '.nova-prefab' : assetType === 'scene' ? '.nova-scene' : assetType === 'material' ? '.nova-material' : assetType === 'animation' ? '.nova-anim' : assetType === 'controller' ? '.nova-controller' : assetType === 'animationMask' ? '.nova-mask' : assetType === 'rig' ? '.nova-rig' : assetType === 'skin' ? '.nova-skin' : assetType === 'timeline' ? '.nova-timeline' : assetType === 'tileset' ? '.nova-tileset' : assetType === 'atlas' ? '.nova-atlas' : assetType === 'shader' ? '.nova-shader' : assetType === 'uiTheme' ? '.nova-theme' : assetType === 'behaviorTree' ? '.nova-behavior' : assetType === 'stateMachine' ? '.nova-state' : assetType === 'tilePalette' ? '.nova-palette' : assetType === 'brushPreset' ? '.nova-brush' : assetType === 'terrainRules' ? '.nova-terrain' : assetType === 'dataSchema' ? '.nova-schema' : assetType === 'dataTable' ? '.nova-data' : assetType === 'replay' ? '.nova-replay' : '.nova-locale'
  const safeName = sanitizedName(name).endsWith(extension) ? sanitizedName(name) : `${sanitizedName(name)}${extension}`
  const mimeType = assetType === 'script' ? 'text/x-rhai' : `application/x-nova-${assetType}`
  const record: AssetRecord = {
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
  assetState.records.sort((first, second) => first.path.localeCompare(second.path))
  assetState.selectedGuid = record.uuid
  assetState.currentFolder = folder
  assetState.generation++
  return record
}

export function readTextAsset(reference: string | null | undefined): string | null {
  const record = resolveAsset(reference)
  if (!record || !['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay'].includes(record.assetType)) return null
  const comma = record.source.indexOf(',')
  if (!record.source.startsWith('data:') || comma < 0) return record.source || null
  try {
    const metadata = record.source.slice(0, comma)
    const payload = record.source.slice(comma + 1)
    if (!metadata.includes(';base64')) return decodeURIComponent(payload)
    const binary = atob(payload)
    return new TextDecoder().decode(Uint8Array.from(binary, character => character.charCodeAt(0)))
  } catch {
    return null
  }
}

export function updateTextAsset(uuid: string, source: string): boolean {
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (!record || record.path.startsWith('.nova/') || !['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay'].includes(record.assetType)) return false
  record.source = textDataUrl(source, record.mimeType || 'text/plain')
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

export function serializeAssets(): AssetRecord[] {
  return assetState.records.map(record => {
    const copy = JSON.parse(JSON.stringify(record)) as AssetRecord
    const unknown = copy.unknownFields && typeof copy.unknownFields === 'object' ? copy.unknownFields : {}
    delete copy.unknownFields
    return { ...unknown, ...copy } as AssetRecord
  })
}

export function serializeAssetFolders(): string[] {
  return [...assetState.folders].sort((a, b) => a.localeCompare(b))
}

export function serializeAssetDatabaseSettings(): AssetDatabaseSettings {
  return {
    version: 1,
    favorites: [...new Set(assetState.favorites)].filter(uuid => assetState.records.some(record => record.uuid === uuid)).sort(),
    savedFilters: assetState.savedFilters.map(filter => ({ ...filter })).sort((a, b) => a.name.localeCompare(b.name)),
    importPresets: assetState.importPresets.map(preset => ({ ...preset, settings: JSON.parse(JSON.stringify(preset.settings)) as AssetImportSettings })).sort((a, b) => a.name.localeCompare(b.name))
  }
}

function loadAssetDatabaseSettings(source: unknown): void {
  const value = source && typeof source === 'object' ? source as Partial<AssetDatabaseSettings> : {}
  assetState.favorites.splice(0, assetState.favorites.length, ...(Array.isArray(value.favorites) ? [...new Set(value.favorites.filter(item => typeof item === 'string'))].slice(0, 10_000) : []))
  const filters = Array.isArray(value.savedFilters) ? value.savedFilters.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string') return []
    const type = raw.assetType === 'all' || typeof raw.assetType === 'string' ? raw.assetType as AssetType | 'all' : 'all'
    return [{ id: raw.id.slice(0, 80), name: raw.name.trim().slice(0, 80) || 'Filter', query: String(raw.query ?? '').slice(0, 200), folder: normalizeFolder(String(raw.folder ?? 'Assets')), assetType: type }]
  }).slice(0, 128) : []
  assetState.savedFilters.splice(0, assetState.savedFilters.length, ...filters)
  const presets = Array.isArray(value.importPresets) ? value.importPresets.flatMap(raw => {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || typeof raw.name !== 'string' || !raw.settings || typeof raw.settings !== 'object') return []
    return [{ id: raw.id.slice(0, 80), name: raw.name.trim().slice(0, 80) || 'Preset', assetType: raw.assetType === 'all' || typeof raw.assetType === 'string' ? raw.assetType as AssetType | 'all' : 'all', settings: { ...defaultImportSettings(), ...raw.settings } as AssetImportSettings }]
  }).slice(0, 128) : []
  assetState.importPresets.splice(0, assetState.importPresets.length, ...presets)
}

function sourceFolder(path: unknown, type: AssetType): string {
  if (typeof path !== 'string') return defaultFolder(type)
  const separator = path.replace(/\\/g, '/').lastIndexOf('/')
  return separator > 0 ? normalizeFolder(path.slice(0, separator)) : defaultFolder(type)
}

export function loadAssets(source: unknown, folderSource?: unknown, databaseSource?: unknown): void {
  assetState.records.splice(0)
  imageCache.clear()
  const records = Array.isArray(source) ? source : []
  for (const value of records) {
    if (!value || typeof value !== 'object') continue
    const item = value as Partial<AssetRecord>
    const knownFields = new Set(['uuid', 'name', 'path', 'assetType', 'mimeType', 'byteLength', 'source', 'sourceModified', 'importedAt', 'width', 'height', 'duration', 'fontFamily', 'settings', 'script', 'animationImport', 'pipeline', 'unknownFields'])
    const inheritedUnknown = item.unknownFields && typeof item.unknownFields === 'object' ? item.unknownFields : {}
    const unknownFields = { ...inheritedUnknown, ...Object.fromEntries(Object.entries(value).filter(([key]) => !knownFields.has(key))) }
    const assetType = ['image', 'audio', 'font', 'scene', 'prefab', 'script', 'material', 'animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline', 'tileset', 'atlas', 'shader', 'localization', 'uiTheme', 'behaviorTree', 'stateMachine', 'tilePalette', 'brushPreset', 'terrainRules', 'dataSchema', 'dataTable', 'replay', 'other'].includes(String(item.assetType)) ? item.assetType as AssetType : 'other'
    const uuid = normalizeUuid(item.uuid)
    const defaults = defaultImportSettings()
    const settings: AssetImportSettings = {
      ...defaults,
      ...(item.settings ?? {}),
      atlasSettings: { ...defaults.atlasSettings, ...(item.settings?.atlasSettings ?? {}) },
      spriteSheet: { ...defaults.spriteSheet, ...(item.settings?.spriteSheet ?? {}) },
      borders: { ...defaults.borders, ...(item.settings?.borders ?? {}) },
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
    settings.audioSettings.quality = Math.min(1, Math.max(0, Number(settings.audioSettings.quality) || .8))
    settings.audioSettings.trimStart = Math.max(0, Number(settings.audioSettings.trimStart) || 0)
    settings.audioSettings.trimEnd = Math.max(0, Number(settings.audioSettings.trimEnd) || 0)
    settings.fontSettings.renderMode = settings.fontSettings.renderMode === 'Bitmap' ? 'Bitmap' : 'Scalable'
    settings.fontSettings.fallbackFamilies = Array.isArray(settings.fontSettings.fallbackFamilies) ? settings.fontSettings.fallbackFamilies.map(String).map(value => value.trim()).filter(Boolean).slice(0, 16) : defaults.fontSettings.fallbackFamilies
    settings.fontSettings.bitmapSize = Math.min(512, Math.max(6, Math.round(Number(settings.fontSettings.bitmapSize) || 32)))
    settings.fontSettings.outlineWidth = Math.min(32, Math.max(0, Number(settings.fontSettings.outlineWidth) || 0))
    settings.fontSettings.shaping = settings.fontSettings.shaping !== false
    settings.spriteSheet.columns = Math.min(256, Math.max(1, Math.trunc(Number(settings.spriteSheet.columns) || 1)))
    settings.spriteSheet.rows = Math.min(256, Math.max(1, Math.trunc(Number(settings.spriteSheet.rows) || 1)))
    settings.spriteSheet.margin = Math.max(0, Math.trunc(Number(settings.spriteSheet.margin) || 0))
    settings.spriteSheet.spacing = Math.max(0, Math.trunc(Number(settings.spriteSheet.spacing) || 0))
    for (const side of ['left', 'top', 'right', 'bottom'] as const) settings.borders[side] = Math.max(0, Number(settings.borders[side]) || 0)
    settings.audioSettings.targetPeakDb = Math.min(0, Math.max(-24, Number(settings.audioSettings.targetPeakDb) || -1))
    settings.audioSettings.loopStart = Math.max(0, Number(settings.audioSettings.loopStart) || 0)
    settings.audioSettings.loopEnd = Math.max(0, Number(settings.audioSettings.loopEnd) || 0)
    settings.colorSpace = settings.colorSpace === 'Linear' ? 'Linear' : 'sRGB'
    const variants = settings.platformVariants && typeof settings.platformVariants === 'object' ? settings.platformVariants : {}
    settings.platformVariants = Object.fromEntries(Object.entries(variants).filter(([platform, compression]) => ['windows', 'linux', 'macos', 'web'].includes(platform) && ['None', 'Lossless', 'Optimized'].includes(String(compression)))) as AssetImportSettings['platformVariants']
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
      path: uniquePath(sourceFolder(item.path, assetType), item.name || item.path?.split('/').pop() || 'Asset', uuid),
      assetType, mimeType: String(item.mimeType || 'application/octet-stream'), byteLength: Math.max(0, Number(item.byteLength) || 0),
      source: typeof item.source === 'string' ? item.source : '', sourceModified: Number(item.sourceModified) || 0,
      importedAt: Number(item.importedAt) || 0, width: Math.max(0, Number(item.width) || 0), height: Math.max(0, Number(item.height) || 0),
      duration: Math.max(0, Number(item.duration) || 0), fontFamily: item.fontFamily || (assetType === 'font' ? fontFamilyFor(uuid) : ''), settings,
      script: assetType === 'script' ? {
        ...defaultScriptMetadata(),
        ...(item.script ?? {}),
        breakpoints: Array.isArray(item.script?.breakpoints) ? [...new Set(item.script.breakpoints.map(Number).filter(value => Number.isInteger(value) && value > 0))].slice(0, 1000) : [],
        breakpointDetails: Array.isArray(item.script?.breakpointDetails) ? item.script.breakpointDetails.flatMap((point, index) => {
          if (!point || typeof point !== 'object') return []
          const line = Math.round(Number(point.line))
          if (!Number.isFinite(line) || line < 1 || line > 1_000_000) return []
          return [{
            id: String(point.id || `breakpoint-${line}-${index}`).slice(0, 128), line,
            functionName: String(point.functionName || '').slice(0, 80), condition: String(point.condition || '').slice(0, 512),
            hitCondition: Math.min(1_000_000, Math.max(0, Math.round(Number(point.hitCondition) || 0))),
            logMessage: String(point.logMessage || '').slice(0, 1_024), enabled: point.enabled !== false,
            hitCount: Math.min(1_000_000_000, Math.max(0, Math.round(Number(point.hitCount) || 0)))
          }]
        }).slice(0, 1000) : [],
        tests: Array.isArray(item.script?.tests) ? item.script.tests.filter(value => typeof value === 'string').map(value => value.slice(0, 80)).slice(0, 256) : [],
        packageDependencies: Array.isArray(item.script?.packageDependencies) ? item.script.packageDependencies.filter(value => typeof value === 'string').map(value => value.slice(0, 256)).slice(0, 128) : [],
        packageName: String(item.script?.packageName || '').slice(0, 128),
        reloadPolicy: ['preserve', 'recreate', 'disabled'].includes(String(item.script?.reloadPolicy)) ? item.script!.reloadPolicy : 'preserve',
        signalConnections: Array.isArray(item.script?.signalConnections) ? item.script.signalConnections.flatMap(connection => {
          if (!connection || typeof connection !== 'object') return []
          const signal = String(connection.signal || '').trim().slice(0, 128), callback = String(connection.callback || '').trim().slice(0, 80)
          return signal && callback ? [{ signal, callback, source: String(connection.source || '').slice(0, 128), target: String(connection.target || '').slice(0, 128), enabled: connection.enabled !== false }] : []
        }).slice(0, 512) : [],
        recoverySource: String(item.script?.recoverySource || '').slice(0, 1_000_000),
        lastSavedHash: String(item.script?.lastSavedHash || '').slice(0, 128)
      } : undefined,
      animationImport: assetType === 'animation' ? {
        ...defaultAnimationImportMetadata(),
        ...(item.animationImport ?? {}),
        sourceAsset: typeof item.animationImport?.sourceAsset === 'string' ? item.animationImport.sourceAsset : null,
        sourceFrameRate: Math.min(240, Math.max(1, Number(item.animationImport?.sourceFrameRate) || 60)),
        sampleRate: Math.min(240, Math.max(1, Number(item.animationImport?.sampleRate) || 60)),
        trackMappings: Array.isArray(item.animationImport?.trackMappings) ? item.animationImport.trackMappings.flatMap(mapping => {
          if (!mapping || typeof mapping.source !== 'string' || typeof mapping.target !== 'string') return []
          return [{ source: mapping.source.slice(0, 256), target: mapping.target.slice(0, 256) }]
        }).slice(0, 512) : [],
        lastImportedAt: Math.max(0, Number(item.animationImport?.lastImportedAt) || 0)
      } : undefined,
      pipeline: item.pipeline && typeof item.pipeline === 'object' ? {
        importerVersion: String(item.pipeline.importerVersion || '1.0.0').slice(0, 40),
        platform: ['windows', 'linux', 'macos', 'web'].includes(String(item.pipeline.platform)) ? item.pipeline.platform : 'web',
        sourceHash: String(item.pipeline.sourceHash || item.pipeline.contentHash || '').slice(0, 128), artifactHash: String(item.pipeline.artifactHash || item.pipeline.cacheKey || '').slice(0, 128),
        contentHash: String(item.pipeline.contentHash || item.pipeline.sourceHash || '').slice(0, 128), cacheKey: String(item.pipeline.cacheKey || item.pipeline.artifactHash || '').slice(0, 128),
        status: item.pipeline.status === 'failed' ? 'failed' : 'ready', lastValidSource: typeof item.pipeline.lastValidSource === 'string' ? item.pipeline.lastValidSource : (typeof item.source === 'string' ? item.source : ''),
        error: String(item.pipeline.error || '').slice(0, 500), dependencies: Array.isArray(item.pipeline.dependencies) ? item.pipeline.dependencies.filter(value => typeof value === 'string').slice(0, 2048) : [],
        reverseDependencies: Array.isArray(item.pipeline.reverseDependencies) ? item.pipeline.reverseDependencies.filter(value => typeof value === 'string').slice(0, 2048) : [],
        cacheHit: item.pipeline.cacheHit === true
      } : inlinePipeline(typeof item.source === 'string' ? item.source : ''),
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
  assetState.records.forEach(record => {
    const folder = record.path.slice(0, record.path.lastIndexOf('/'))
    if (folder) folders.add(folder)
    installFont(record)
  })
  assetState.folders.splice(0, assetState.folders.length, ...[...folders].sort())
  loadAssetDatabaseSettings(databaseSource)
  assetState.generation++
  queueTextureAtlasRebuild()
}

export function renameAsset(uuid: string, name: string): boolean {
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (!record) return false
  const folder = record.path.slice(0, record.path.lastIndexOf('/'))
  const oldPath = record.path
  record.name = sanitizedName(name)
  record.path = uniquePath(folder, record.name, uuid)
  repairAssetPathReferences(assetState.records, oldPath, record.path)
  assetState.generation++
  return true
}

export function moveAsset(uuid: string, folder: string): boolean {
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (!record) return false
  const destination = normalizeFolder(folder)
  const oldPath = record.path
  if (!assetState.folders.includes(destination)) assetState.folders.push(destination)
  record.path = uniquePath(destination, record.name, uuid)
  repairAssetPathReferences(assetState.records, oldPath, record.path)
  assetState.generation++
  return true
}

/** Reimports without changing the stable GUID and keeps the previous artifact on failure. */
export async function reimportAsset(uuid: string, file: File): Promise<boolean> {
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (!record) return false
  const previous = record.source
  try {
    const artifact = await processAssetImport(file, record.settings)
    record.source = artifact.source
    record.mimeType = file.type || record.mimeType
    record.byteLength = file.size
    record.sourceModified = file.lastModified
    record.importedAt = Date.now()
    record.pipeline = artifact.metadata
    if (record.assetType === 'image') Object.assign(record, await imageMetadata(record.source))
    if (record.assetType === 'audio') record.duration = await audioMetadata(record.source)
    installFont(record)
    assetState.generation++
    queueTextureAtlasRebuild()
    return true
  } catch (error) {
    record.source = record.pipeline?.lastValidSource || previous
    record.pipeline = {
      importerVersion: record.pipeline?.importerVersion || '2.0.0', platform: record.pipeline?.platform || 'web',
      sourceHash: record.pipeline?.sourceHash || record.pipeline?.contentHash || '', artifactHash: record.pipeline?.artifactHash || record.pipeline?.cacheKey || '',
      contentHash: record.pipeline?.contentHash || '', cacheKey: record.pipeline?.cacheKey || '', status: 'failed',
      lastValidSource: record.source, error: error instanceof Error ? error.message : String(error), dependencies: record.pipeline?.dependencies ?? [], reverseDependencies: record.pipeline?.reverseDependencies ?? [], cacheHit: record.pipeline?.cacheHit === true
    }
    return false
  }
}

export function createAssetFolder(parent: string, name: string): string | null {
  const folder = normalizeFolder(`${parent}/${sanitizedName(name)}`)
  if (assetState.folders.some(value => value.toLowerCase() === folder.toLowerCase())) return null
  assetState.folders.push(folder)
  assetState.folders.sort()
  assetState.currentFolder = folder
  assetState.generation++
  return folder
}

export function deleteAsset(uuid: string): boolean {
  const index = assetState.records.findIndex(record => record.uuid === uuid)
  if (index < 0) return false
  stopWatchingAsset(uuid)
  assetState.records.splice(index, 1)
  imageCache.delete(uuid)
  if (assetState.selectedGuid === uuid) assetState.selectedGuid = null
  assetState.generation++
  queueTextureAtlasRebuild()
  return true
}

export function toggleAssetFavorite(uuid: string): boolean {
  const index = assetState.favorites.indexOf(uuid)
  if (index >= 0) { assetState.favorites.splice(index, 1); return false }
  if (assetState.records.some(record => record.uuid === uuid)) assetState.favorites.push(uuid)
  return true
}

export function saveCurrentAssetFilter(name: string): AssetSavedFilter | null {
  const safe = name.trim().slice(0, 80)
  if (!safe) return null
  const filter: AssetSavedFilter = { id: normalizeUuid(undefined), name: safe, query: assetState.search.slice(0, 200), folder: assetState.currentFolder, assetType: assetState.typeFilter }
  assetState.savedFilters.push(filter)
  return filter
}

export function applyAssetFilter(id: string): boolean {
  const filter = assetState.savedFilters.find(item => item.id === id)
  if (!filter) return false
  assetState.search = filter.query; assetState.currentFolder = filter.folder; assetState.typeFilter = filter.assetType
  return true
}

export function deleteAssetFilter(id: string): boolean {
  const index = assetState.savedFilters.findIndex(item => item.id === id)
  if (index < 0) return false
  assetState.savedFilters.splice(index, 1); return true
}

export function saveImportPreset(name: string, assetType: AssetType | 'all', settings: AssetImportSettings): AssetImportPreset | null {
  const safe = name.trim().slice(0, 80)
  if (!safe) return null
  const preset: AssetImportPreset = { id: normalizeUuid(undefined), name: safe, assetType, settings: JSON.parse(JSON.stringify(settings)) as AssetImportSettings }
  assetState.importPresets.push(preset); return preset
}

export function applyImportPreset(id: string, asset: AssetRecord): boolean {
  const preset = assetState.importPresets.find(item => item.id === id && (item.assetType === 'all' || item.assetType === asset.assetType))
  if (!preset) return false
  asset.settings = JSON.parse(JSON.stringify(preset.settings)) as AssetImportSettings
  assetState.generation++; queueTextureAtlasRebuild(); return true
}

export function synchronizeAssetDependencyMetadata(project?: unknown): void {
  const graph = buildAssetDependencyGraph(assetState.records, project)
  for (const record of assetState.records) {
    record.pipeline ??= inlinePipeline(record.source)
    record.pipeline.dependencies = [...(graph.dependencies.get(record.uuid) ?? [])].sort()
    record.pipeline.reverseDependencies = [...(graph.reverseDependencies.get(record.uuid) ?? [])].sort()
  }
}

export async function retryFailedAssetImport(jobId: number, requestedFolder?: string): Promise<AssetRecord | null> {
  const result = await retryAssetImport(jobId)
  if (!result) return null
  const record = await recordImportedArtifact(result.file, result.settings, result.artifact, requestedFolder)
  assetState.records.sort((a, b) => a.path.localeCompare(b.path)); assetState.generation++; queueTextureAtlasRebuild()
  return record
}

type SourceFileHandle = { getFile(): Promise<File> }

export async function linkAssetSource(uuid: string): Promise<'linked' | 'cancelled' | 'unsupported'> {
  const picker = (window as unknown as { showOpenFilePicker?: (options?: { multiple: boolean }) => Promise<SourceFileHandle[]> }).showOpenFilePicker
  if (!picker) return 'unsupported'
  let handles: SourceFileHandle[]
  try { handles = await picker({ multiple: false }) } catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'; throw error }
  const handle = handles[0]
  if (!handle || !assetState.records.some(record => record.uuid === uuid)) return 'cancelled'
  const initial = await handle.getFile()
  watchAssetSource(uuid, handle, async file => reimportAsset(uuid, file))
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (record) record.sourceModified = initial.lastModified
  return 'linked'
}

export async function resolveExternalAssetChange(changeId: string, choice: 'reimport' | 'keep' | 'duplicate'): Promise<boolean> {
  const change = importPipelineState.externalChanges.find(item => item.id === changeId)
  if (!change) return false
  let success = true
  if (choice === 'reimport') success = await reimportAsset(change.uuid, change.file)
  else if (choice === 'duplicate') success = (await importAssetFiles([change.file])).length > 0
  dismissExternalAssetChange(change.id)
  return success
}

export function assetReference(uuid: string): string { return `asset://${normalizeUuid(uuid)}` }
export function assetGuid(reference: string | null | undefined): string | null {
  if (!reference?.startsWith('asset://')) return null
  return reference.slice('asset://'.length)
}
export function resolveAsset(reference: string | null | undefined): AssetRecord | null {
  const guid = assetGuid(reference) ?? reference
  ensureIndex()
  return guid ? recordsByUuid.get(guid) ?? null : null
}

export function resolveTexture(reference: string | null | undefined, filterOverride?: 'Nearest' | 'Linear'): TextureRegion | null {
  const record = resolveAsset(reference)
  if (!record || record.assetType !== 'image' || !record.source) return null
  for (const page of assetState.atlasPages) {
    const region = page.regions.get(record.uuid)
    if (region) return importedSpriteRegion(record, { ...region, filter: filterOverride ?? region.filter, colorSpace: record.settings.colorSpace })
  }
  let image = imageCache.get(record.uuid)
  if (!image) {
    image = new Image()
    image.src = record.source
    imageCache.set(record.uuid, image)
  }
  if (!image.complete || image.naturalWidth <= 0) return null
  return importedSpriteRegion(record, { key: `asset:${record.uuid}`, source: image, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: filterOverride ?? record.settings.filterMode, colorSpace: record.settings.colorSpace })
}

/** Resolves a pixel-space sub-region without allocating another texture. */
export function resolveTextureRegion(
  reference: string | null | undefined,
  region: { x: number; y: number; width: number; height: number },
  filterOverride?: 'Nearest' | 'Linear'
): TextureRegion | null {
  const record = resolveAsset(reference)
  const texture = resolveTexture(reference, filterOverride)
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

function importedSpriteRegion(record: AssetRecord, texture: TextureRegion): TextureRegion {
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

export async function rebuildTextureAtlases(): Promise<void> {
  const revision = ++atlasRevision
  const pages = await buildTextureAtlases(assetState.records)
  if (revision !== atlasRevision) return
  assetState.atlasPages.splice(0, assetState.atlasPages.length, ...pages.map(page => markRaw(page)))
  assetState.atlasError = ''
  assetState.generation++
}

export function queueTextureAtlasRebuild(): void {
  void rebuildTextureAtlases().catch(error => {
    assetState.atlasError = error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500)
    console.error('Texture atlas rebuild failed; the previous valid atlas remains active.', error)
  })
}

export function filteredAssets(): AssetRecord[] {
  ensureIndex()
  const query = assetState.search.trim().toLowerCase()
  const folder = `${assetState.currentFolder}/`
  const favorites = new Set(assetState.favorites)
  return indexedRecords.filter(record => {
    const inFolder = record.path.startsWith(folder) && !record.path.slice(folder.length).includes('/')
    const typeMatches = assetState.typeFilter === 'all' || record.assetType === assetState.typeFilter
    const queryMatches = !query || record.name.toLowerCase().includes(query) || record.path.toLowerCase().includes(query)
    return (query || inFolder) && typeMatches && queryMatches && (!assetState.favoritesOnly || favorites.has(record.uuid))
  })
}
