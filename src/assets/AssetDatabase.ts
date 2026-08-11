import { markRaw, reactive } from 'vue'
import { normalizeUuid } from '../world/identity'
import { buildTextureAtlases } from './TextureAtlas'
import {
  DEFAULT_ASSET_FOLDERS,
  defaultImportSettings,
  type AssetImportSettings,
  type AssetRecord,
  type AssetType,
  type TextureAtlasPage
} from './types'
import type { TextureRegion } from '../renderer'

interface AssetDatabaseState {
  records: AssetRecord[]
  folders: string[]
  atlasPages: TextureAtlasPage[]
  generation: number
  importing: boolean
  selectedGuid: string | null
  currentFolder: string
  search: string
  typeFilter: AssetType | 'all'
}

export const assetState = reactive<AssetDatabaseState>({
  records: [],
  folders: [...DEFAULT_ASSET_FOLDERS],
  atlasPages: [],
  generation: 0,
  importing: false,
  selectedGuid: null,
  currentFolder: 'Assets',
  search: '',
  typeFilter: 'all'
})

const imageCache = new Map<string, HTMLImageElement>()
let atlasRevision = 0

function inferAssetType(file: Pick<File, 'name' | 'type'>): AssetType {
  const mime = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(extension)) return 'image'
  if (mime.startsWith('audio/') || ['wav', 'ogg', 'mp3', 'flac'].includes(extension)) return 'audio'
  if (mime.startsWith('font/') || ['ttf', 'otf', 'woff', 'woff2'].includes(extension)) return 'font'
  if (extension === 'nova-scene' || extension === 'scene') return 'scene'
  if (extension === 'nova-prefab' || extension === 'prefab') return 'prefab'
  if (extension === 'rhai' || mime === 'text/x-rhai') return 'script'
  if (extension === 'nova-material' || extension === 'material') return 'material'
  if (extension === 'nova-anim') return 'animation'
  if (extension === 'nova-controller') return 'controller'
  if (extension === 'nova-tileset') return 'tileset'
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
  if (type === 'tileset') return 'Assets/TileSets'
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

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Asset could not be read'))
    reader.onerror = () => reject(reader.error ?? new Error('Asset could not be read'))
    reader.readAsDataURL(file)
  })
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

export async function importAssetFiles(files: Iterable<File>, requestedFolder?: string): Promise<AssetRecord[]> {
  assetState.importing = true
  const imported: AssetRecord[] = []
  try {
    for (const file of files) {
      const assetType = inferAssetType(file)
      const source = await readFile(file)
      const metadata = assetType === 'image' ? await imageMetadata(source) : { width: 0, height: 0 }
      const uuid = normalizeUuid(undefined)
      const settings = defaultImportSettings()
      if (assetType === 'image' && /(?:^|[-_.])pixel(?:[-_.]|$)/i.test(file.name)) settings.filterMode = 'Nearest'
      const record: AssetRecord = {
        uuid,
        name: sanitizedName(file.name),
        path: uniquePath(requestedFolder || defaultFolder(assetType), file.name),
        assetType,
        mimeType: file.type || 'application/octet-stream',
        byteLength: file.size,
        source,
        sourceModified: file.lastModified,
        importedAt: Date.now(),
        width: metadata.width,
        height: metadata.height,
        duration: assetType === 'audio' ? await audioMetadata(source) : 0,
        fontFamily: assetType === 'font' ? fontFamilyFor(uuid) : '',
        settings
      }
      assetState.records.push(record)
      imported.push(record)
      installFont(record)
      const folder = record.path.slice(0, record.path.lastIndexOf('/'))
      if (folder && !assetState.folders.includes(folder)) assetState.folders.push(folder)
    }
    assetState.records.sort((first, second) => first.path.localeCompare(second.path))
    assetState.generation++
    void rebuildTextureAtlases()
    return imported
  } finally {
    assetState.importing = false
  }
}

export function registerEmbeddedImage(source: string, name = 'Legacy texture'): AssetRecord {
  const existing = assetState.records.find(record => record.assetType === 'image' && record.source === source)
  if (existing) return existing
  const uuid = normalizeUuid(undefined)
  const record: AssetRecord = {
    uuid, name: sanitizedName(name), path: uniquePath('Assets/Sprites/Imported', `${sanitizedName(name)}.png`),
    assetType: 'image', mimeType: source.slice(5, source.indexOf(';')) || 'image/png', byteLength: source.length,
    source, sourceModified: 0, importedAt: Date.now(), width: 0, height: 0, duration: 0, fontFamily: '',
    settings: defaultImportSettings()
  }
  assetState.records.push(record)
  if (!assetState.folders.includes('Assets/Sprites/Imported')) assetState.folders.push('Assets/Sprites/Imported')
  void imageMetadata(source).then(size => { record.width = size.width; record.height = size.height; void rebuildTextureAtlases() })
  assetState.generation++
  return record
}

function textDataUrl(source: string, mimeType: string): string {
  return `data:${mimeType};charset=utf-8,${encodeURIComponent(source)}`
}

export function createTextAsset(
  name: string,
  assetType: 'script' | 'prefab' | 'scene' | 'material' | 'animation' | 'controller' | 'tileset',
  source: string,
  requestedFolder?: string
): AssetRecord {
  const uuid = normalizeUuid(undefined)
  const extension = assetType === 'script' ? '.rhai' : assetType === 'prefab' ? '.nova-prefab' : assetType === 'scene' ? '.nova-scene' : assetType === 'material' ? '.nova-material' : assetType === 'animation' ? '.nova-anim' : assetType === 'controller' ? '.nova-controller' : '.nova-tileset'
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
    settings: defaultImportSettings()
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
  if (!record || !['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'tileset'].includes(record.assetType)) return null
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
  if (!record || !['script', 'prefab', 'scene', 'material', 'animation', 'controller', 'tileset'].includes(record.assetType)) return false
  record.source = textDataUrl(source, record.mimeType || 'text/plain')
  record.byteLength = new TextEncoder().encode(source).byteLength
  record.sourceModified = Date.now()
  record.importedAt = Date.now()
  assetState.generation++
  return true
}

export function serializeAssets(): AssetRecord[] {
  return assetState.records.map(record => JSON.parse(JSON.stringify(record)) as AssetRecord)
}

export function serializeAssetFolders(): string[] {
  return [...assetState.folders]
}

function sourceFolder(path: unknown, type: AssetType): string {
  if (typeof path !== 'string') return defaultFolder(type)
  const separator = path.replace(/\\/g, '/').lastIndexOf('/')
  return separator > 0 ? normalizeFolder(path.slice(0, separator)) : defaultFolder(type)
}

export function loadAssets(source: unknown, folderSource?: unknown): void {
  assetState.records.splice(0)
  imageCache.clear()
  const records = Array.isArray(source) ? source : []
  for (const value of records) {
    if (!value || typeof value !== 'object') continue
    const item = value as Partial<AssetRecord>
    const assetType = ['image', 'audio', 'font', 'scene', 'prefab', 'script', 'material', 'animation', 'controller', 'tileset', 'other'].includes(String(item.assetType)) ? item.assetType as AssetType : 'other'
    const uuid = normalizeUuid(item.uuid)
    const settings: AssetImportSettings = { ...defaultImportSettings(), ...(item.settings ?? {}) }
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
      duration: Math.max(0, Number(item.duration) || 0), fontFamily: item.fontFamily || (assetType === 'font' ? fontFamilyFor(uuid) : ''), settings
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
  assetState.generation++
  void rebuildTextureAtlases()
}

export function renameAsset(uuid: string, name: string): boolean {
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (!record) return false
  const folder = record.path.slice(0, record.path.lastIndexOf('/'))
  record.name = sanitizedName(name)
  record.path = uniquePath(folder, record.name, uuid)
  assetState.generation++
  return true
}

export function moveAsset(uuid: string, folder: string): boolean {
  const record = assetState.records.find(asset => asset.uuid === uuid)
  if (!record) return false
  const destination = normalizeFolder(folder)
  if (!assetState.folders.includes(destination)) assetState.folders.push(destination)
  record.path = uniquePath(destination, record.name, uuid)
  assetState.generation++
  return true
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
  assetState.records.splice(index, 1)
  imageCache.delete(uuid)
  if (assetState.selectedGuid === uuid) assetState.selectedGuid = null
  assetState.generation++
  void rebuildTextureAtlases()
  return true
}

export function assetReference(uuid: string): string { return `asset://${normalizeUuid(uuid)}` }
export function assetGuid(reference: string | null | undefined): string | null {
  if (!reference?.startsWith('asset://')) return null
  return reference.slice('asset://'.length)
}
export function resolveAsset(reference: string | null | undefined): AssetRecord | null {
  const guid = assetGuid(reference) ?? reference
  return guid ? assetState.records.find(record => record.uuid === guid) ?? null : null
}

export function resolveTexture(reference: string | null | undefined, filterOverride?: 'Nearest' | 'Linear'): TextureRegion | null {
  const record = resolveAsset(reference)
  if (!record || record.assetType !== 'image' || !record.source) return null
  for (const page of assetState.atlasPages) {
    const region = page.regions.get(record.uuid)
    if (region) return importedSpriteRegion(record, filterOverride ? { ...region, filter: filterOverride } : region)
  }
  let image = imageCache.get(record.uuid)
  if (!image) {
    image = new Image()
    image.src = record.source
    imageCache.set(record.uuid, image)
  }
  if (!image.complete || image.naturalWidth <= 0) return null
  return importedSpriteRegion(record, { key: `asset:${record.uuid}`, source: image, uv: { x: 0, y: 0, width: 1, height: 1 }, filter: filterOverride ?? record.settings.filterMode })
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
  assetState.generation++
}

export function filteredAssets(): AssetRecord[] {
  const query = assetState.search.trim().toLowerCase()
  const folder = `${assetState.currentFolder}/`
  return assetState.records.filter(record => {
    const inFolder = record.path.startsWith(folder) && !record.path.slice(folder.length).includes('/')
    const typeMatches = assetState.typeFilter === 'all' || record.assetType === assetState.typeFilter
    const queryMatches = !query || record.name.toLowerCase().includes(query) || record.path.toLowerCase().includes(query)
    return (query || inFolder) && typeMatches && queryMatches
  })
}
