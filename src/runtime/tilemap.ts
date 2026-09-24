/** 瓦片地图系统：管理瓦片集、地图单元和编辑操作，生成绘制及碰撞所需数据。 */
import { reactive } from 'vue'
import { assetState, textureContentRevision } from '../assets/AssetDatabase'
import { isTiledMapAsset, resolveTiledMapAsset } from '../assets/tiledMapAssets'
import { BoundedImportCache, registerImportSessionCleanup } from '../assets/importRetention'
import {
  assetReference,
  createTextAsset,
  readTextAsset,
  resolveAsset,
  resolveTextureRegion,
  updateTextAssetTransactional
} from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { TileChunkRenderCommand } from '../renderer'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldPointToLocal, worldTransform } from '../world/hierarchy'
import type { TileBlendMode2D, TileCellTransform2D, TileCollision2D, TileMap2D } from '../world/components'
import type { Vec2 } from '../world/types'

export interface TileDefinition {
  index: number
  name: string
  collision: TileCollision2D
  polygon: Vec2[]
  terrain: string
  navigationCost: number
  occluder: boolean
  navigationPolygon: Vec2[]
  occlusionPolygon: Vec2[]
  metadata: Record<string, boolean | number | string>
  sceneAsset: string | null
  prefabAsset: string | null
  sourceId: string
  region: { x: number; y: number; width: number; height: number } | null
  animation: { frames: number[]; durations?: number[]; framesPerSecond: number; mode: 'Loop' | 'PingPong' | 'Once' } | null
  variants: Array<{ tile: number; weight: number }>
}

export interface TileSetDocument {
  version: 2
  textureAsset: string | null
  sources: Array<{ id: string; name: string; textureAsset: string | null; margin: number; spacing: number }>
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
  tiles: TileDefinition[]
}

export type TileTool = 'brush' | 'stamp' | 'pattern' | 'line' | 'rectangle' | 'eraser' | 'fill' | 'replace' | 'eyedropper' | 'selection'

export const tilemapEditorState = reactive({
  active: false,
  tool: 'brush' as TileTool,
  tileIndex: 0,
  brushPresetAsset: null as string | null,
  terrainRulesAsset: null as string | null,
  selectedEntityUuid: null as string | null,
  selection: null as { start: { x: number; y: number }; end: { x: number; y: number } } | null,
  transform: 0 as TileCellTransform2D,
  randomizeVariants: false,
  clipboard: null as { width: number; height: number; tiles: number[]; transforms: TileCellTransform2D[] } | null,
  history: [] as Array<{ id: string; at: number; tool: TileTool; layerId: string; start: { x: number; y: number }; end: { x: number; y: number }; revision: number }>
})

export const tileBakeState = reactive({
  active: false,
  cancelled: false,
  progress: 0,
  processedChunks: 0,
  totalChunks: 0,
  artifactHash: '',
  error: '',
  result: { collision: 0, navigation: 0, occluders: 0, chunks: 0 }
})
let tileBakeController: AbortController | null = null

const MAX_TILESET_TILES = 65_536
const MAX_TILEMAP_CELLS = 4_194_304

/* 调用 Math.round(Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))) 并返回调用结果。 */ function integer(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.round(Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback))))
}

/** 结构说明（自动提取）：normalizedPolygon；输入 source；直接调用 Array.isArray、flatMap、source.slice。 */ function normalizedPolygon(source: unknown): Vec2[] {
  if (!Array.isArray(source)) return []
  // The stable physics ABI stores four convex vertices per collider.
  return source.slice(0, 4).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 value；直接调用 Math.min、Math.max、finiteNumber。 */ value => {
    if (!value || typeof value !== 'object') return []
    const point = value as Record<string, unknown>
    return [{ x: Math.min(1, Math.max(0, finiteNumber(point.x))), y: Math.min(1, Math.max(0, finiteNumber(point.y))) }]
  })
}

/** 结构说明（自动提取）：normalizedMetadata；输入 source；直接调用 Array.isArray、slice、Object.entries、rawKey.trim、includes 等；写入 result[…]；返回路径包含 result；包含循环处理。 */ function normalizedMetadata(source: unknown): Record<string, boolean | number | string> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  const result: Record<string, boolean | number | string> = {}
  for (const [rawKey, rawValue] of Object.entries(source as Record<string, unknown>).slice(0, 64)) {
    const key = rawKey.trim().slice(0, 80)
    if (!key || !['boolean', 'number', 'string'].includes(typeof rawValue) || typeof rawValue === 'number' && !Number.isFinite(rawValue)) continue
    result[key] = typeof rawValue === 'string' ? rawValue.slice(0, 500) : rawValue as boolean | number
  }
  return result
}

/** 结构说明（自动提取）：normalizeTileSet；输入 source；直接调用 integer、Math.max、Math.floor、Math.min、Array.isArray 等。 */ export function normalizeTileSet(source: unknown): TileSetDocument {
  const value = source && typeof source === 'object' ? source as Record<string, unknown> : {}
  const tileWidth = integer(value.tileWidth, 32, 1, 16_384)
  const tileHeight = integer(value.tileHeight, 32, 1, 16_384)
  const columns = integer(value.columns, 1, 1, MAX_TILESET_TILES)
  const rows = integer(value.rows, 1, 1, Math.max(1, Math.floor(MAX_TILESET_TILES / columns)))
  const count = Math.min(MAX_TILESET_TILES, columns * rows)
  const rawTiles = Array.isArray(value.tiles) ? value.tiles : []
  const sources = (Array.isArray(value.sources) ? value.sources : []).slice(0, 64).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 item、index；直接调用 raw.id.slice、raw.name.slice、integer。 */ (item, index) => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Record<string, unknown>
    return [{ id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 80) : `source-${index}`, name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : `Source ${index + 1}`, textureAsset: typeof raw.textureAsset === 'string' ? raw.textureAsset : null, margin: integer(raw.margin, 0, 0, 16_384), spacing: integer(raw.spacing, 0, 0, 16_384) }]
  })
  if (!sources.length) sources.push({ id: 'primary', name: 'Primary atlas', textureAsset: typeof value.textureAsset === 'string' ? value.textureAsset : null, margin: 0, spacing: 0 })
  const byIndex = new Map<number, Record<string, unknown>>()
  rawTiles.forEach(/** 结构说明（自动提取）：rawTiles.forEach 回调；输入 item；直接调用 integer、byIndex.set。 */ item => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const index = integer(record.index, -1, -1, count - 1)
    if (index >= 0) byIndex.set(index, record)
  })
  return {
    version: 2,
    textureAsset: typeof value.textureAsset === 'string' ? value.textureAsset : null,
    sources,
    tileWidth,
    tileHeight,
    columns,
    rows,
    tiles: Array.from({ length: count }, /** 结构说明（自动提取）：Array.from 回调；输入 _、index；直接调用 byIndex.get、includes、String、normalizedPolygon、Array.isArray 等。 */ (_, index) => {
      const raw = byIndex.get(index)
      const collision = ['Box', 'Polygon', 'OneWay'].includes(String(raw?.collision)) ? raw!.collision as TileCollision2D : 'None'
      const polygon = normalizedPolygon(raw?.polygon)
      const rawAnimation = raw?.animation && typeof raw.animation === 'object' ? raw.animation as Record<string, unknown> : null
      const animationFrames = Array.isArray(rawAnimation?.frames) ? rawAnimation.frames.slice(0, 256).map(/* 调用 integer(frame, index, 0, count - 1) 并返回调用结果。 */ frame => integer(frame, index, 0, count - 1)) : []
      const variants = Array.isArray(raw?.variants) ? raw.variants.slice(0, 64).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 item；直接调用 integer、Math.min、Math.max、finiteNumber。 */ item => {
        if (!item || typeof item !== 'object') return []
        const variant = item as Record<string, unknown>
        return [{ tile: integer(variant.tile, index, 0, count - 1), weight: Math.min(1e6, Math.max(0.000001, finiteNumber(variant.weight, 1))) }]
      }) : []
      const rawRegion = raw?.region && typeof raw.region === 'object' ? raw.region as Record<string, unknown> : null
      return {
        index,
        name: typeof raw?.name === 'string' ? raw.name.slice(0, 120) : `Tile ${index}`,
        collision,
        polygon: collision === 'Polygon' && polygon.length >= 3 ? polygon : [],
        terrain: typeof raw?.terrain === 'string' ? raw.terrain.slice(0, 80) : '',
        navigationCost: Math.min(1e6, Math.max(0, finiteNumber(raw?.navigationCost, 1))),
        occluder: raw?.occluder === true,
        navigationPolygon: normalizedPolygon(raw?.navigationPolygon),
        occlusionPolygon: normalizedPolygon(raw?.occlusionPolygon),
        metadata: normalizedMetadata(raw?.metadata),
        sceneAsset: typeof raw?.sceneAsset === 'string' ? raw.sceneAsset : null,
        prefabAsset: typeof raw?.prefabAsset === 'string' ? raw.prefabAsset : null,
        sourceId: typeof raw?.sourceId === 'string' && sources.some(/* 比较 source.id 与 raw.sourceId，返回严格相等的判断结果。 */ source => source.id === raw.sourceId) ? raw.sourceId : sources[0].id,
        region: rawRegion ? { x: integer(rawRegion.x, 0, 0, 1_000_000), y: integer(rawRegion.y, 0, 0, 1_000_000), width: integer(rawRegion.width, tileWidth, 1, 1_000_000), height: integer(rawRegion.height, tileHeight, 1, 1_000_000) } : null,
        animation: animationFrames.length ? { frames: animationFrames, ...(Array.isArray(rawAnimation?.durations) && rawAnimation.durations.length === animationFrames.length && rawAnimation.durations.every(/* 先计算 typeof value === 'number' && Number.isFinite(value) && value > 0；仅当其为真值时求右侧 value <= 3600，返回短路求值结果。 */ value => typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 3600) ? {durations: [...rawAnimation.durations] as number[]} : {}), framesPerSecond: Math.min(240, Math.max(0.01, finiteNumber(rawAnimation?.framesPerSecond, 8))), mode: rawAnimation?.mode === 'PingPong' || rawAnimation?.mode === 'Once' ? rawAnimation.mode : 'Loop' } : null,
        variants
      }
    })
  }
}

const parsedTileSets = new BoundedImportCache<string, {asset: AssetRecord; source: string; generation: number; value: TileSetDocument | null}>(128, 64 * 1024 * 1024)
registerImportSessionCleanup(/* 调用 parsedTileSets.clear() 并返回调用结果。 */ () => parsedTileSets.clear())
/* 返回具有所列字段的新对象 {entries: parsedTileSets.size, bytes: parsedTileSets.bytes, maxEntries: 128, maxBytes: 64 * 1024 * 1024}。 */ export function tileSetCacheStats() { return {entries: parsedTileSets.size, bytes: parsedTileSets.bytes, maxEntries: 128, maxBytes: 64 * 1024 * 1024} }
/** 结构说明（自动提取）：readRuntimeTileSet；输入 reference；直接调用 resolveAsset、parsedTileSets.get、readTextAsset、JSON.parse、normalizeTileSet 等；写入 value；返回路径包含 cached.value、value。 */ function readRuntimeTileSet(reference: string | null | undefined): TileSetDocument | null {
  const asset = resolveAsset(reference)
  if (!asset || asset.assetType !== 'tileset') return null
  const cached = parsedTileSets.get(asset.uuid)
  if (cached && cached.asset === asset && cached.source === asset.source && cached.generation === assetState.generation) return cached.value
  const source = readTextAsset(reference); if (!source) return null
  let value: TileSetDocument | null = null
  try { const parsed = JSON.parse(source); value = normalizeTileSet(parsed.format === 'nova-tiled-map-resource' ? resolveTiledMapAsset(asset, assetState.records).tileSet : parsed) } catch { /* Import details expose the precise dependency diagnostic. */ }
  parsedTileSets.set(asset.uuid, {asset, source: asset.source, generation: assetState.generation, value}, source.length * 2 + (value?.tiles.length ?? 0) * 512)
  return value
}
/** Editors receive detached data; unsaved Inspector edits cannot alter the renderer's cached document. */
/** 结构说明（自动提取）：readTileSet；输入 reference；直接调用 readRuntimeTileSet、JSON.parse、JSON.stringify。 */ export function readTileSet(reference: string | null | undefined): TileSetDocument | null { const value=readRuntimeTileSet(reference);return value?JSON.parse(JSON.stringify(value)):null }

/** 结构说明（自动提取）：createTileSet；输入 texture、tileWidth、tileHeight；直接调用 Error、integer、Math.max、Math.floor、normalizeTileSet 等；包含显式抛错路径。 */ export function createTileSet(texture: AssetRecord, tileWidth = 32, tileHeight = 32): AssetRecord {
  if (texture.assetType !== 'image') throw new Error('A TileSet requires an image asset')
  const width = integer(tileWidth, 32, 1, Math.max(1, texture.width || 16_384))
  const height = integer(tileHeight, 32, 1, Math.max(1, texture.height || 16_384))
  const columns = Math.max(1, Math.floor(Math.max(width, texture.width) / width))
  const rows = Math.max(1, Math.floor(Math.max(height, texture.height) / height))
  const document = normalizeTileSet({ textureAsset: assetReference(texture.uuid), tileWidth: width, tileHeight: height, columns, rows })
  return createTextAsset(`${texture.name.replace(/\.[^.]+$/, '')} TileSet`, 'tileset', JSON.stringify(document, null, 2), 'Assets/TileSets')
}

/** Imported map documents remain source-owned. Editing starts from an explicit, independent copy. */
/** 结构说明（自动提取）：copyEditableTileSet；输入 reference；直接调用 resolveAsset、readTileSet、Error、createTextAsset、owner.name.replace 等；包含显式抛错路径。 */ export function copyEditableTileSet(reference: string): AssetRecord {
  const owner = resolveAsset(reference), document = readTileSet(reference)
  if (!owner || !document) throw new Error('TILESET_COPY: Resolve all source dependencies before making a copy.')
  return createTextAsset(owner.name.replace(/\.[^.]+$/, '') + ' Editable TileSet', 'tileset', JSON.stringify(document, null, 2), 'Assets/TileSets')
}
/** 结构说明（自动提取）：saveTileSet；输入 assetUuid、document；直接调用 resolveAsset、isTiledMapAsset、updateTextAssetTransactional、JSON.stringify、normalizeTileSet。 */ export function saveTileSet(assetUuid: string, document: TileSetDocument): boolean {
  const asset = resolveAsset(assetUuid)
  if (!asset || asset.assetType !== 'tileset' || isTiledMapAsset(asset)) return false
  return updateTextAssetTransactional(assetUuid, `${JSON.stringify(normalizeTileSet(document), null, 2)}\n`)
}

/** 结构说明（自动提取）：normalizeTileMap；输入 component；直接调用 integer、Math.min、Math.floor、Math.max、Math.abs 等；写入 component.width、component.height、component.tileSize、component.chunkSize 等。 */ export function normalizeTileMap(component: TileMap2D): void {
  component.width = integer(component.width, 32, 1, 2048)
  component.height = integer(component.height, 18, 1, Math.min(2048, Math.floor(MAX_TILEMAP_CELLS / component.width)))
  component.tileSize = {
    x: Math.min(1e6, Math.max(1e-6, Math.abs(finiteNumber(component.tileSize?.x, 1)))),
    y: Math.min(1e6, Math.max(1e-6, Math.abs(finiteNumber(component.tileSize?.y, 1))))
  }
  component.chunkSize = integer(component.chunkSize, 32, 4, 128)
  component.tiles = Array.from({ length: component.width * component.height }, /* 调用 integer(component.tiles?.[index], -1, -1, MAX_TILESET_TILES - 1) 并返回调用结果。 */ (_, index) => integer(component.tiles?.[index], -1, -1, MAX_TILESET_TILES - 1))
  const rawLayers = Array.isArray(component.layers) ? component.layers.slice(0, 128) : []
  component.layers = (rawLayers.length ? rawLayers : [{ id: crypto.randomUUID(), name: 'Base', visible: true, locked: false, opacity: 1, blendMode: 'Alpha' as const, parallax: { x: 1, y: 1 }, zOrder: 0, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: component.tiles, transforms: Array(component.width * component.height).fill(0) as TileCellTransform2D[] }]).map(/** 结构说明（自动提取）：map 回调；输入 layer、index；直接调用 layer.id.slice、layer.name.trim、slice、Math.min、Math.max 等；返回表达式求值结果。 */ (layer, index) => ({
    id: typeof layer.id === 'string' && layer.id ? layer.id.slice(0, 80) : `layer-${index}`,
    name: typeof layer.name === 'string' && layer.name.trim() ? layer.name.trim().slice(0, 80) : `Layer ${index + 1}`,
    visible: layer.visible !== false, locked: layer.locked === true,
    opacity: Math.min(1, Math.max(0, finiteNumber(layer.opacity, 1))),
    blendMode: (['Alpha', 'Additive', 'Multiply', 'Screen'].includes(String(layer.blendMode)) ? layer.blendMode : 'Alpha') as TileBlendMode2D,
    parallax: { x: Math.min(16, Math.max(-16, finiteNumber(layer.parallax?.x, 1))), y: Math.min(16, Math.max(-16, finiteNumber(layer.parallax?.y, 1))) },
    zOrder: integer(layer.zOrder, index, -1_000_000, 1_000_000),
    collisionEnabled: layer.collisionEnabled !== false,
    navigationEnabled: layer.navigationEnabled !== false,
    occlusionEnabled: layer.occlusionEnabled !== false,
    tiles: Array.from({ length: component.width * component.height }, /* 调用 integer(layer.tiles?.[tile], -1, -1, MAX_TILESET_TILES - 1) 并返回调用结果。 */ (_, tile) => integer(layer.tiles?.[tile], -1, -1, MAX_TILESET_TILES - 1)),
    transforms: Array.from({ length: component.width * component.height }, /** 结构说明（自动提取）：Array.from 回调；输入 _、tile；直接调用 integer；返回表达式求值结果。 */ (_, tile) => integer(layer.transforms?.[tile], 0, 0, 15) as TileCellTransform2D)
  }))
  component.activeLayer = integer(component.activeLayer, 0, 0, component.layers.length - 1)
  component.tiles = component.layers[component.activeLayer].tiles
  component.streamingRadius = integer(component.streamingRadius, 3, 1, 64)
  component.opacity = Math.min(100, Math.max(0, finiteNumber(component.opacity, 100)))
  component.sortingLayer = integer(component.sortingLayer, 0, -1_000_000, 1_000_000)
  component.orderInLayer = integer(component.orderInLayer, 0, -1_000_000, 1_000_000)
  component.physicsLayer = integer(component.physicsLayer, 0, 0, 31)
  component.collisionMask = Math.min(0xffff_ffff, Math.max(0, Math.round(finiteNumber(component.collisionMask, 1)))) >>> 0
  if (component.filterMode !== 'Linear') component.filterMode = 'Nearest'
}

/** 结构说明（自动提取）：resizeTileMap；输入 component、width、height；直接调用 normalizeTileMap、integer、Math.min、Math.floor、fill 等；写入 component.width、component.height、layer.tiles、layer.transforms 等；包含循环处理。 */ export function resizeTileMap(component: TileMap2D, width: number, height: number): void {
  normalizeTileMap(component)
  const previousWidth = component.width
  const previousHeight = component.height
  component.width = integer(width, component.width, 1, 2048)
  component.height = integer(height, component.height, 1, Math.min(2048, Math.floor(MAX_TILEMAP_CELLS / component.width)))
  for (const layer of component.layers) {
    const previous = [...layer.tiles]
    const previousTransforms = [...layer.transforms]
    layer.tiles = Array(component.width * component.height).fill(-1)
    layer.transforms = Array(component.width * component.height).fill(0)
    for (let y = 0; y < Math.min(previousHeight, component.height); y++) for (let x = 0; x < Math.min(previousWidth, component.width); x++) {
      layer.tiles[y * component.width + x] = previous[y * previousWidth + x]
      layer.transforms[y * component.width + x] = previousTransforms[y * previousWidth + x] ?? 0
    }
  }
  component.tiles = component.layers[component.activeLayer].tiles
  component.revision++
  invalidateTileMap(component)
}

/** 结构说明（自动提取）：setActiveTileLayer；输入 component、index；直接调用 normalizeTileMap、integer、invalidateTileMap；写入 component.activeLayer、component.tiles。 */ export function setActiveTileLayer(component: TileMap2D, index: number): boolean {
  normalizeTileMap(component)
  const next = integer(index, component.activeLayer, 0, component.layers.length - 1)
  if (next === component.activeLayer) return false
  component.activeLayer = next; component.tiles = component.layers[next].tiles; component.revision++; invalidateTileMap(component); return true
}

/** 结构说明（自动提取）：addTileLayer；输入 component、name；直接调用 normalizeTileMap、component.layers.push、crypto.randomUUID、name.slice、fill 等；返回路径包含 component.activeLayer。 */ export function addTileLayer(component: TileMap2D, name = `Layer ${component.layers.length + 1}`): number {
  normalizeTileMap(component)
  if (component.layers.length >= 128) return component.activeLayer
  component.layers.push({ id: crypto.randomUUID(), name: name.slice(0, 80), visible: true, locked: false, opacity: 1, blendMode: 'Alpha', parallax: { x: 1, y: 1 }, zOrder: component.layers.length, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: Array(component.width * component.height).fill(-1), transforms: Array(component.width * component.height).fill(0) })
  setActiveTileLayer(component, component.layers.length - 1); return component.activeLayer
}

/** 结构说明（自动提取）：duplicateTileLayer；输入 component；直接调用 normalizeTileMap、component.layers.splice、crypto.randomUUID、slice、setActiveTileLayer；返回路径包含 component.activeLayer。 */ export function duplicateTileLayer(component: TileMap2D): number {
  normalizeTileMap(component); const source = component.layers[component.activeLayer]
  if (component.layers.length >= 128) return component.activeLayer
  component.layers.splice(component.activeLayer + 1, 0, { ...source, id: crypto.randomUUID(), name: `${source.name} copy`.slice(0, 80), parallax: { ...source.parallax }, tiles: [...source.tiles], transforms: [...source.transforms] })
  setActiveTileLayer(component, component.activeLayer + 1); return component.activeLayer
}

/** 结构说明（自动提取）：removeTileLayer；输入 component；直接调用 normalizeTileMap、component.layers.splice、Math.min、invalidateTileMap；写入 component.activeLayer、component.tiles。 */ export function removeTileLayer(component: TileMap2D): boolean {
  normalizeTileMap(component); if (component.layers.length <= 1) return false
  component.layers.splice(component.activeLayer, 1); component.activeLayer = Math.min(component.activeLayer, component.layers.length - 1); component.tiles = component.layers[component.activeLayer].tiles; component.revision++; invalidateTileMap(component); return true
}

export interface TilePaletteDocument { version: 1; tileSetAsset: string | null; tiles: number[] }
export interface BrushPresetDocument { version: 1; name: string; size: number; shape: 'Circle' | 'Square'; scatter: number }
export interface TerrainRulesDocument { version: 1; terrain: string; rules: Record<string, number> }

/** 结构说明（自动提取）：createTilePalette；输入 tileSetAsset、tiles；直接调用 createTextAsset、JSON.stringify、map、tiles.slice。 */ export function createTilePalette(tileSetAsset: string | null, tiles: number[]): AssetRecord {
  return createTextAsset('New Tile Palette', 'tilePalette', JSON.stringify({ version: 1, tileSetAsset, tiles: tiles.slice(0, MAX_TILESET_TILES).map(/* 调用 integer(value, -1, -1, MAX_TILESET_TILES - 1) 并返回调用结果。 */ value => integer(value, -1, -1, MAX_TILESET_TILES - 1)) }, null, 2), 'Assets/TilePalettes')
}
/** 结构说明（自动提取）：createBrushPreset；无显式参数；直接调用 createTextAsset、JSON.stringify。 */ export function createBrushPreset(): AssetRecord { return createTextAsset('New Brush Preset', 'brushPreset', JSON.stringify({ version: 1, name: 'Soft square', size: 1, shape: 'Square', scatter: 0 }, null, 2), 'Assets/BrushPresets') }
/** 结构说明（自动提取）：createTerrainRules；无显式参数；直接调用 createTextAsset、JSON.stringify。 */ export function createTerrainRules(): AssetRecord { return createTextAsset('New Terrain Rules', 'terrainRules', JSON.stringify({ version: 1, terrain: 'Ground', rules: { '0': 0 } }, null, 2), 'Assets/TerrainRules') }

/** 结构说明（自动提取）：readAssetJson；输入 reference、type；直接调用 resolveAsset、readTextAsset、JSON.parse。 */ function readAssetJson(reference: string | null, type: string): Record<string, unknown> | null { const asset = resolveAsset(reference), source = readTextAsset(reference); if (!asset || asset.assetType !== type || !source) return null; try { const value = JSON.parse(source); return value && typeof value === 'object' ? value as Record<string, unknown> : null } catch { return null } }
/** 结构说明（自动提取）：readBrushPreset；输入 reference；直接调用 readAssetJson、value.name.slice、integer、Math.min、Math.max 等。 */ export function readBrushPreset(reference: string | null): BrushPresetDocument | null { const value = readAssetJson(reference, 'brushPreset'); if (!value) return null; return { version: 1, name: typeof value.name === 'string' ? value.name.slice(0, 80) : 'Brush', size: integer(value.size, 1, 1, 64), shape: value.shape === 'Circle' ? 'Circle' : 'Square', scatter: Math.min(1, Math.max(0, finiteNumber(value.scatter))) } }
/** 结构说明（自动提取）：readTilePalette；输入 reference；直接调用 readAssetJson、Array.isArray、map、value.tiles.slice。 */ export function readTilePalette(reference: string | null): TilePaletteDocument | null { const value = readAssetJson(reference, 'tilePalette'); if (!value) return null; return { version: 1, tileSetAsset: typeof value.tileSetAsset === 'string' ? value.tileSetAsset : null, tiles: Array.isArray(value.tiles) ? value.tiles.slice(0, MAX_TILESET_TILES).map(/* 调用 integer(tile, -1, -1, MAX_TILESET_TILES - 1) 并返回调用结果。 */ tile => integer(tile, -1, -1, MAX_TILESET_TILES - 1)) : [] } }
/** 结构说明（自动提取）：readTerrainRules；输入 reference；直接调用 readAssetJson、Object.entries、String、integer、value.terrain.slice；写入 rules[…]；包含循环处理。 */ export function readTerrainRules(reference: string | null): TerrainRulesDocument | null { const value = readAssetJson(reference, 'terrainRules'); if (!value) return null; const rules: Record<string, number> = {}; if (value.rules && typeof value.rules === 'object') for (const [mask, tile] of Object.entries(value.rules as Record<string, unknown>)) rules[String(integer(mask, 0, 0, 15))] = integer(tile, -1, -1, MAX_TILESET_TILES - 1); return { version: 1, terrain: typeof value.terrain === 'string' ? value.terrain.slice(0, 80) : '', rules } }

/** 结构说明（自动提取）：bakeTileMap；输入 component；直接调用 normalizeTileMap、readRuntimeTileSet、filter、flatMap、component.layers.filter 等。 */ export function bakeTileMap(component: TileMap2D): { collision: number; navigation: number; occluders: number; chunks: number } {
  normalizeTileMap(component); const set = readRuntimeTileSet(component.tileSetAsset)
  const navigationTiles = component.layers.filter(/* 返回 layer.navigationEnabled 的当前值。 */ layer => layer.navigationEnabled).flatMap(/* 返回 layer.tiles 的当前值。 */ layer => layer.tiles).filter(/* 比较 tile 与 0，返回大于或等于的判断结果。 */ tile => tile >= 0)
  const occlusionTiles = component.layers.filter(/* 返回 layer.occlusionEnabled 的当前值。 */ layer => layer.occlusionEnabled).flatMap(/* 返回 layer.tiles 的当前值。 */ layer => layer.tiles).filter(/* 比较 tile 与 0，返回大于或等于的判断结果。 */ tile => tile >= 0)
  return { collision: component.bakeCollision ? buildTileColliderDescriptors(component).length : 0, navigation: component.bakeNavigation && set ? navigationTiles.filter(/* 比较 (set.tiles[tile]?.navigationCost ?? 0) 与 0，返回大于的判断结果。 */ tile => (set.tiles[tile]?.navigationCost ?? 0) > 0).length : 0, occluders: component.bakeOccluders && set ? occlusionTiles.filter(/* 返回 set.tiles[tile]?.occluder 的当前值。 */ tile => set.tiles[tile]?.occluder).length : 0, chunks: Math.ceil(component.width / component.chunkSize) * Math.ceil(component.height / component.chunkSize) * component.layers.length }
}

/** 结构说明（自动提取）：tileBakeHash；输入 value；直接调用 value.charCodeAt、Math.imul、padStart、hash.toString；写入 hash；包含循环处理。 */ function tileBakeHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return hash.toString(16).padStart(8, '0')
}

/** 结构说明（自动提取）：cancelTileMapBake；无显式参数；直接调用 tileBakeController.abort；写入 tileBakeState.cancelled。 */ export function cancelTileMapBake(): boolean {
  if (!tileBakeController) return false
  tileBakeController.abort(); tileBakeState.cancelled = true
  return true
}

/** 结构说明（自动提取）：requestTileMapBake；输入 component；直接调用 cancelTileMapBake、normalizeTileMap、AbortController、Math.ceil、Object.assign 等；写入 tileBakeController、tileBakeState.progress、tileBakeState.result、tileBakeState.artifactHash 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ export async function requestTileMapBake(component: TileMap2D): Promise<typeof tileBakeState.result & { cancelled: boolean; artifactHash: string }> {
  cancelTileMapBake()
  normalizeTileMap(component)
  const controller = new AbortController(); tileBakeController = controller
  const chunksX = Math.ceil(component.width / component.chunkSize), chunksY = Math.ceil(component.height / component.chunkSize), totalChunks = chunksX * chunksY * component.layers.length
  const initialResult = { collision: 0, navigation: 0, occluders: 0, chunks: totalChunks }
  Object.assign(tileBakeState, { active: true, cancelled: false, progress: 0, processedChunks: 0, totalChunks, artifactHash: '', error: '', result: initialResult })
  try {
    for (const layer of [...component.layers].sort(/* 调用 a.id.localeCompare(b.id) 并返回调用结果。 */ (a, b) => a.id.localeCompare(b.id))) for (let chunkY = 0; chunkY < chunksY; chunkY++) for (let chunkX = 0; chunkX < chunksX; chunkX++) {
      await new Promise<void>(/* 调用 setTimeout(resolve, 0) 并返回调用结果。 */ resolve => setTimeout(resolve, 0))
      if (controller.signal.aborted) return { ...initialResult, cancelled: true, artifactHash: '' }
      // Reading each bounded chunk validates its deterministic runtime payload
      // without materializing a second full-map copy.
      readRuntimeTileChunk(component, layer.id, chunkX, chunkY)
      tileBakeState.processedChunks++; tileBakeState.progress = tileBakeState.processedChunks / Math.max(1, totalChunks)
    }
    tileBakeState.result = bakeTileMap(component)
    tileBakeState.artifactHash = tileBakeHash(`${deterministicTileMapStorage(component)}:${JSON.stringify(tileBakeState.result)}`)
    tileBakeState.progress = 1
    return { ...tileBakeState.result, cancelled: false, artifactHash: tileBakeState.artifactHash }
  } catch (error) {
    if (tileBakeController === controller) tileBakeState.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    // Only the current request owns the visible progress and cancellation state.
    if (tileBakeController === controller) {
      tileBakeState.cancelled = controller.signal.aborted
      tileBakeState.active = false
      tileBakeController = null
    }
  }
}

export interface TilemapDiagnostic { severity: 'info' | 'warning' | 'error'; code: 'invalid-terrain' | 'missing-tile' | 'overdraw' | 'collision' | 'navigation' | 'scene-placement'; message: string; layerId?: string; cell?: { x: number; y: number } }

/** 结构说明（自动提取）：validateTerrainRules；输入 document；直接调用 filter、Array.from、missing.join。 */ export function validateTerrainRules(document: TerrainRulesDocument | null): TilemapDiagnostic[] {
  if (!document) return []
  const missing = Array.from({ length: 16 }, /* 返回 mask 的当前值。 */ (_, mask) => mask).filter(/* 先计算 !Number.isInteger(document.rules[String(mask)])；仅当其为假值时求右侧 document.rules[String(mask)] < 0，返回短路求值结果。 */ mask => !Number.isInteger(document.rules[String(mask)]) || document.rules[String(mask)] < 0)
  return missing.length ? [{ severity: 'error', code: 'invalid-terrain', message: `Terrain ${document.terrain || 'unnamed'} has no valid transition for masks ${missing.join(', ')}.` }] : []
}

/** 结构说明（自动提取）：diagnoseTileMap；输入 component；直接调用 tileMapView、readRuntimeTileSet、validateTerrainRules、readTerrainRules、Math.floor 等；写入 component；包含循环处理。 */ export function diagnoseTileMap(component: TileMap2D): TilemapDiagnostic[] {
  component = tileMapView(component)
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  if (!tileSet) return [{ severity: 'error', code: 'missing-tile', message: 'The tilemap has no readable TileSet 2.0 asset.' }]
  const issues: TilemapDiagnostic[] = [...validateTerrainRules(readTerrainRules(tilemapEditorState.terrainRulesAsset))]
  let overdraw = 0, navigationTiles = 0, collisionTiles = 0
  for (let cellIndex = 0; cellIndex < component.width * component.height; cellIndex++) {
    let visibleAtCell = 0
    for (const layer of component.layers) {
      const value = layer.tiles[cellIndex]
      if (value < 0) continue
      const cell = { x: cellIndex % component.width, y: Math.floor(cellIndex / component.width) }
      if (!tileSet.tiles[value]) { issues.push({ severity: 'error', code: 'missing-tile', message: `Tile index ${value} is missing.`, layerId: layer.id, cell }); continue }
      if (layer.visible && layer.opacity > 0) visibleAtCell++
      if (layer.collisionEnabled && tileSet.tiles[value].collision !== 'None') collisionTiles++
      if (layer.navigationEnabled && tileSet.tiles[value].navigationCost > 0) navigationTiles++
      const placement = tileSet.tiles[value].sceneAsset || tileSet.tiles[value].prefabAsset
      if (placement && !resolveAsset(placement)) issues.push({ severity: 'error', code: 'scene-placement', message: `Tile ${value} references a missing scene or prefab.`, layerId: layer.id, cell })
    }
    if (visibleAtCell > 3) overdraw++
  }
  if (overdraw) issues.push({ severity: 'warning', code: 'overdraw', message: `${overdraw} cells draw more than three visible layers.` })
  if (component.bakeCollision && !collisionTiles) issues.push({ severity: 'warning', code: 'collision', message: 'Collision baking is enabled but no collision tile is present.' })
  if (component.bakeNavigation && !navigationTiles) issues.push({ severity: 'warning', code: 'navigation', message: 'Navigation baking is enabled but no traversable tile is present.' })
  if (!issues.length) issues.push({ severity: 'info', code: 'navigation', message: 'TileSet, terrain, collision, navigation, overdraw, and placement checks passed.' })
  return issues.slice(0, 512)
}

export interface RuntimeTileChunk { layerId: string; chunkX: number; chunkY: number; width: number; height: number; tiles: number[]; transforms: TileCellTransform2D[] }

/** Read-only projection: Inspector/render queries never normalize live reactive arrays. */
/** 结构说明（自动提取）：tileMapView；输入 component；直接调用 Number.isInteger、Array.isArray、component.layers.every、Number.isFinite、normalizeTileMap；返回路径包含 component、view。 */ function tileMapView(component: TileMap2D): TileMap2D {
  const cells=component.width*component.height
  const valid=Number.isInteger(component.width)&&Number.isInteger(component.height)&&component.width>=1&&component.width<=2048&&component.height>=1&&component.height<=2048&&Array.isArray(component.layers)&&component.layers.length>0&&component.layers.length<=128&&cells*component.layers.length<=MAX_TILEMAP_CELLS&&component.layers.every(/* 先计算 Array.isArray(layer.tiles)&&Array.isArray(layer.transforms)&&layer.tiles.length===cells；仅当其为真值时求右侧 layer.transforms.length===cells，返回短路求值结果。 */ layer=>Array.isArray(layer.tiles)&&Array.isArray(layer.transforms)&&layer.tiles.length===cells&&layer.transforms.length===cells)&&Number.isInteger(component.activeLayer)&&component.activeLayer>=0&&component.activeLayer<component.layers.length&&component.tiles===component.layers[component.activeLayer].tiles&&Number.isInteger(component.chunkSize)&&component.chunkSize>=4&&component.chunkSize<=128&&Number.isFinite(component.tileSize?.x)&&component.tileSize.x>0&&Number.isFinite(component.tileSize?.y)&&component.tileSize.y>0
  if(valid)return component
  const view={...component} as TileMap2D;normalizeTileMap(view);return view
}
/** 结构说明（自动提取）：ensureRuntimeTileMap；输入 component；直接调用 tileMapView、normalizeTileMap。 */ function ensureRuntimeTileMap(component: TileMap2D): void { if(tileMapView(component)!==component)normalizeTileMap(component) }

/** 结构说明（自动提取）：readRuntimeTileChunk；输入 component、layerId、chunkX、chunkY；直接调用 tileMapView、component.layers.find、Math.max、Math.round、Math.min 等；写入 component；包含循环处理。 */ export function readRuntimeTileChunk(component: TileMap2D, layerId: string, chunkX: number, chunkY: number): RuntimeTileChunk | null {
  component = tileMapView(component)
  const layer = component.layers.find(/* 比较 candidate.id 与 layerId，返回严格相等的判断结果。 */ candidate => candidate.id === layerId)
  if (!layer) return null
  const startX = Math.max(0, Math.round(chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunkY) * component.chunkSize)
  if (startX >= component.width || startY >= component.height) return null
  const width = Math.min(component.chunkSize, component.width - startX), height = Math.min(component.chunkSize, component.height - startY)
  const tiles: number[] = [], transforms: TileCellTransform2D[] = []
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const index = (startY + y) * component.width + startX + x; tiles.push(layer.tiles[index]); transforms.push(layer.transforms[index]) }
  return { layerId, chunkX: Math.round(chunkX), chunkY: Math.round(chunkY), width, height, tiles, transforms }
}

/** 结构说明（自动提取）：writeRuntimeTileChunk；输入 component、chunk；直接调用 ensureRuntimeTileMap、component.layers.findIndex、Math.max、Math.round、Math.min 等；写入 component.layers[…].tiles[…]、component.layers[…].transforms[…]、changed；返回路径包含 changed；包含循环处理。 */ export function writeRuntimeTileChunk(component: TileMap2D, chunk: RuntimeTileChunk): boolean {
  ensureRuntimeTileMap(component)
  const layerIndex = component.layers.findIndex(/* 比较 candidate.id 与 chunk.layerId，返回严格相等的判断结果。 */ candidate => candidate.id === chunk.layerId)
  if (layerIndex < 0 || component.layers[layerIndex].locked) return false
  const startX = Math.max(0, Math.round(chunk.chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunk.chunkY) * component.chunkSize)
  let changed = false
  for (let y = 0; y < Math.min(component.chunkSize, chunk.height); y++) for (let x = 0; x < Math.min(component.chunkSize, chunk.width); x++) {
    if (startX + x >= component.width || startY + y >= component.height) continue
    const source = y * chunk.width + x, target = (startY + y) * component.width + startX + x
    const tile = integer(chunk.tiles[source], -1, -1, MAX_TILESET_TILES - 1), flags = integer(chunk.transforms[source], 0, 0, 15) as TileCellTransform2D
    if (component.layers[layerIndex].tiles[target] !== tile || component.layers[layerIndex].transforms[target] !== flags) { component.layers[layerIndex].tiles[target] = tile; component.layers[layerIndex].transforms[target] = flags; changed = true }
  }
  if (changed) { component.revision++; invalidateTileMap(component) }
  return changed
}

/** 结构说明（自动提取）：tileMetadataAt；输入 component、x、y；直接调用 ensureRuntimeTileMap、readRuntimeTileSet、Object.assign、map、component.layers.filter。 */ export function tileMetadataAt(component: TileMap2D, x: number, y: number): Record<string, boolean | number | string> {
  ensureRuntimeTileMap(component)
  if (x < 0 || y < 0 || x >= component.width || y >= component.height) return {}
  const set = readRuntimeTileSet(component.tileSetAsset), index = y * component.width + x
  return Object.assign({}, ...component.layers.filter(/* 返回 layer.visible 的当前值。 */ layer => layer.visible).map(/* 当 set?.tiles[layer.tiles[index]]?.metadata 为 null 或 undefined 时返回 {}，否则保留左侧值。 */ layer => set?.tiles[layer.tiles[index]]?.metadata ?? {}))
}

/** 结构说明（自动提取）：worldToTile；输入 entity、component、point、entities；直接调用 worldPointToLocal、Math.floor。 */ export function worldToTile(entity: Entity, component: TileMap2D, point: Vec2, entities: Entity[]): { x: number; y: number } | null {
  const local = worldPointToLocal(entity, point, entities)
  const x = Math.floor(local.x / component.tileSize.x + component.width * .5)
  const y = Math.floor(local.y / component.tileSize.y + component.height * .5)
  return x >= 0 && y >= 0 && x < component.width && y < component.height ? { x, y } : null
}

/* 计算表达式 cell.y * component.width + cell.x 并返回结果，沿用操作数的原有类型规则。 */ function tileIndex(component: TileMap2D, cell: { x: number; y: number }): number { return cell.y * component.width + cell.x }
/** 结构说明（自动提取）：chooseVariant；输入 component、cell、value；直接调用 readRuntimeTileSet、choices.reduce、deterministicUnit；写入 sample；返回路径包含 value、choice.tile；包含循环处理。 */ function chooseVariant(component: TileMap2D, cell: { x: number; y: number }, value: number): number {
  if (!tilemapEditorState.randomizeVariants || value < 0) return value
  const definition = readRuntimeTileSet(component.tileSetAsset)?.tiles[value]
  const choices = [{ tile: value, weight: 1 }, ...(definition?.variants ?? [])]
  const total = choices.reduce(/* 计算表达式 sum + choice.weight 并返回结果，沿用操作数的原有类型规则。 */ (sum, choice) => sum + choice.weight, 0)
  let sample = deterministicUnit(cell) * total
  for (const choice of choices) { sample -= choice.weight; if (sample <= 0) return choice.tile }
  return value
}

/** 结构说明（自动提取）：setTile；输入 component、cell、value、transform；直接调用 tileIndex、chooseVariant、markTileDirty；写入 component.tiles[…]、layer.transforms[…]。 */ function setTile(component: TileMap2D, cell: { x: number; y: number }, value: number, transform = tilemapEditorState.transform): boolean {
  if (cell.x < 0 || cell.y < 0 || cell.x >= component.width || cell.y >= component.height) return false
  const index = tileIndex(component, cell)
  const resolvedValue = chooseVariant(component, cell, value)
  if (component.layers[component.activeLayer]?.locked) return false
  const layer = component.layers[component.activeLayer]
  if (component.tiles[index] === resolvedValue && layer.transforms[index] === transform) return false
  component.tiles[index] = resolvedValue
  layer.transforms[index] = resolvedValue < 0 ? 0 : transform
  markTileDirty(component, cell.x, cell.y)
  return true
}

/** 结构说明（自动提取）：deterministicUnit；输入 cell；直接调用 Math.imul；写入 value。 */ function deterministicUnit(cell: { x: number; y: number }): number {
  let value = Math.imul(cell.x, 73_856_093) ^ Math.imul(cell.y, 19_349_663)
  value = Math.imul(value ^ value >>> 13, 1_274_126_177)
  return ((value ^ value >>> 16) >>> 0) / 0xffff_ffff
}

/** 结构说明（自动提取）：terrainTile；输入 component、cell、fallback；直接调用 readTerrainRules、readRuntimeTileSet、matches、String；返回路径包含 fallback。 */ function terrainTile(component: TileMap2D, cell: { x: number; y: number }, fallback: number): number {
  const terrain = readTerrainRules(tilemapEditorState.terrainRulesAsset)
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  if (!terrain || !tileSet || !terrain.terrain) return fallback
  const matches = /** 结构说明（自动提取）：matches；输入 x、y。 */ (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= component.width || y >= component.height) return false
    return tileSet.tiles[component.tiles[y * component.width + x]]?.terrain === terrain.terrain
  }
  const mask = (matches(cell.x, cell.y + 1) ? 1 : 0)
    | (matches(cell.x + 1, cell.y) ? 2 : 0)
    | (matches(cell.x, cell.y - 1) ? 4 : 0)
    | (matches(cell.x - 1, cell.y) ? 8 : 0)
  return terrain.rules[String(mask)] ?? fallback
}

/** 结构说明（自动提取）：applyPaintCell；输入 component、center、value；直接调用 readBrushPreset、Math.floor、Math.hypot、Math.max、deterministicUnit 等；写入 changed；返回路径包含 changed；包含循环处理。 */ function applyPaintCell(component: TileMap2D, center: { x: number; y: number }, value: number): boolean {
  const preset = readBrushPreset(tilemapEditorState.brushPresetAsset) ?? { version: 1 as const, name: 'Default', size: 1, shape: 'Square' as const, scatter: 0 }
  const radius = Math.floor((preset.size - 1) / 2)
  let changed = false
  const touched: Array<{ x: number; y: number }> = []
  for (let y = center.y - radius; y <= center.y + radius; y++) for (let x = center.x - radius; x <= center.x + radius; x++) {
    const cell = { x, y }
    if (preset.shape === 'Circle' && Math.hypot(x - center.x, y - center.y) > Math.max(.5, preset.size / 2)) continue
    if (preset.scatter > 0 && deterministicUnit(cell) < preset.scatter) continue
    if (setTile(component, cell, terrainTile(component, cell, value))) { changed = true; touched.push(cell) }
  }
  if (tilemapEditorState.terrainRulesAsset && touched.length) {
    const candidates = new Map<string, { x: number; y: number }>()
    for (const cell of touched) for (const offset of [[0, 0], [0, 1], [1, 0], [0, -1], [-1, 0]] as const) {
      const candidate = { x: cell.x + offset[0], y: cell.y + offset[1] }
      candidates.set(`${candidate.x}:${candidate.y}`, candidate)
    }
    for (const candidate of candidates.values()) {
      if (candidate.x < 0 || candidate.y < 0 || candidate.x >= component.width || candidate.y >= component.height) continue
      const current = component.tiles[tileIndex(component, candidate)]
      if (current >= 0) changed = setTile(component, candidate, terrainTile(component, candidate, current)) || changed
    }
  }
  return changed
}

/** 结构说明（自动提取）：rasterLine；输入 start、end；直接调用 Math.abs、cells.push；写入 error、x、y；返回路径包含 cells；包含循环处理。 */ function rasterLine(start: { x: number; y: number }, end: { x: number; y: number }): Array<{ x: number; y: number }> {
  const cells: Array<{ x: number; y: number }> = []
  let x = start.x, y = start.y
  const dx = Math.abs(end.x - start.x), sx = start.x < end.x ? 1 : -1
  const dy = -Math.abs(end.y - start.y), sy = start.y < end.y ? 1 : -1
  let error = dx + dy
  while (true) {
    cells.push({ x, y })
    if (x === end.x && y === end.y) break
    const twice = 2 * error
    if (twice >= dy) { error += dy; x += sx }
    if (twice <= dx) { error += dx; y += sy }
  }
  return cells
}

export interface TileStroke { start: { x: number; y: number }; previous: { x: number; y: number }; changed: boolean }

/** 结构说明（自动提取）：beginTileStroke；输入 component、cell；直接调用 tileIndex、floodFill、applyPaintCell、pasteTileClipboard、setTile；写入 tilemapEditorState.tileIndex、stroke.changed、tilemapEditorState.selection；返回路径包含 stroke。 */ export function beginTileStroke(component: TileMap2D, cell: { x: number; y: number }): TileStroke {
  const stroke = { start: { ...cell }, previous: { ...cell }, changed: false }
  if (tilemapEditorState.tool === 'eyedropper') tilemapEditorState.tileIndex = component.tiles[tileIndex(component, cell)] ?? -1
  else if (tilemapEditorState.tool === 'fill') stroke.changed = floodFill(component, cell, tilemapEditorState.tileIndex)
  else if (tilemapEditorState.tool === 'brush') stroke.changed = applyPaintCell(component, cell, tilemapEditorState.tileIndex)
  else if (tilemapEditorState.tool === 'stamp' || tilemapEditorState.tool === 'pattern') stroke.changed = pasteTileClipboard(component, cell, tilemapEditorState.tool === 'pattern')
  else if (tilemapEditorState.tool === 'eraser') stroke.changed = setTile(component, cell, -1)
  else if (tilemapEditorState.tool === 'selection') tilemapEditorState.selection = { start: { ...cell }, end: { ...cell } }
  return stroke
}

/** 结构说明（自动提取）：continueTileStroke；输入 component、stroke、cell；直接调用 rasterLine、applyPaintCell、setTile；写入 stroke.changed、tilemapEditorState.selection.end、stroke.previous；包含循环处理。 */ export function continueTileStroke(component: TileMap2D, stroke: TileStroke, cell: { x: number; y: number }): void {
  if (tilemapEditorState.tool === 'brush' || tilemapEditorState.tool === 'eraser') {
    const value = tilemapEditorState.tool === 'eraser' ? -1 : tilemapEditorState.tileIndex
    for (const point of rasterLine(stroke.previous, cell)) stroke.changed = (tilemapEditorState.tool === 'brush' ? applyPaintCell(component, point, value) : setTile(component, point, value)) || stroke.changed
  } else if (tilemapEditorState.tool === 'selection' && tilemapEditorState.selection) tilemapEditorState.selection.end = { ...cell }
  stroke.previous = { ...cell }
}

/** 结构说明（自动提取）：endTileStroke；输入 component、stroke、cell；直接调用 Math.min、Math.max、setTile、terrainTile、rasterLine 等；写入 stroke.changed；返回路径包含 stroke.changed；包含循环处理。 */ export function endTileStroke(component: TileMap2D, stroke: TileStroke, cell: { x: number; y: number }): boolean {
  if (tilemapEditorState.tool === 'rectangle') {
    const left = Math.min(stroke.start.x, cell.x), right = Math.max(stroke.start.x, cell.x)
    const bottom = Math.min(stroke.start.y, cell.y), top = Math.max(stroke.start.y, cell.y)
    for (let y = bottom; y <= top; y++) for (let x = left; x <= right; x++) stroke.changed = setTile(component, { x, y }, terrainTile(component, { x, y }, tilemapEditorState.tileIndex)) || stroke.changed
  }
  if (tilemapEditorState.tool === 'line') for (const point of rasterLine(stroke.start, cell)) stroke.changed = setTile(component, point, terrainTile(component, point, tilemapEditorState.tileIndex)) || stroke.changed
  if (tilemapEditorState.tool === 'replace') {
    const target = component.tiles[tileIndex(component, stroke.start)]
    for (let index = 0; index < component.tiles.length; index++) if (component.tiles[index] === target) stroke.changed = setTile(component, { x: index % component.width, y: Math.floor(index / component.width) }, tilemapEditorState.tileIndex) || stroke.changed
  }
  if (stroke.changed) component.revision++
  if (stroke.changed) {
    const layerId = component.layers[component.activeLayer]?.id ?? 'base'
    tilemapEditorState.history.unshift({ id: crypto.randomUUID(), at: Date.now(), tool: tilemapEditorState.tool, layerId, start: { ...stroke.start }, end: { ...cell }, revision: component.revision })
    tilemapEditorState.history.splice(200)
  }
  return stroke.changed
}

/** 结构说明（自动提取）：tileWorldCoordinate；输入 entity、component、cell、entities；直接调用 tileMapView、localPointToWorld；写入 component。 */ export function tileWorldCoordinate(entity: Entity, component: TileMap2D, cell: { x: number; y: number }, entities: Entity[]): Vec2 {
  component = tileMapView(component)
  return localPointToWorld(entity, { x: (cell.x + .5 - component.width / 2) * component.tileSize.x, y: (component.height / 2 - cell.y - .5) * component.tileSize.y }, entities)
}

/** 结构说明（自动提取）：deterministicTileMapStorage；输入 component；直接调用 tileMapView、map、sort、JSON.stringify；写入 component。 */ export function deterministicTileMapStorage(component: TileMap2D): string {
  component = tileMapView(component)
  const runLength = /** 结构说明（自动提取）：runLength；输入 values；直接调用 output.push；返回路径包含 output；包含循环处理。 */ (values: number[]) => { const output: Array<[number, number]> = []; for (const value of values) { const previous = output[output.length - 1]; if (previous?.[0] === value) previous[1]++; else output.push([value, 1]) } return output }
  const value = {
    format: 'nova-tilemap-source', version: 1, width: component.width, height: component.height, tileSize: { ...component.tileSize }, chunkSize: component.chunkSize,
    layers: [...component.layers].sort(/* 先计算 a.zOrder - b.zOrder；仅当其为假值时求右侧 a.id.localeCompare(b.id)，返回短路求值结果。 */ (a, b) => a.zOrder - b.zOrder || a.id.localeCompare(b.id)).map(/** 结构说明（自动提取）：map 回调；输入 layer；直接调用 runLength；返回表达式求值结果。 */ layer => ({ id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked, opacity: layer.opacity, blendMode: layer.blendMode, parallax: { ...layer.parallax }, zOrder: layer.zOrder, collisionEnabled: layer.collisionEnabled, navigationEnabled: layer.navigationEnabled, occlusionEnabled: layer.occlusionEnabled, tilesRle: runLength(layer.tiles), transformsRle: runLength(layer.transforms) }))
  }
  return `${JSON.stringify(value, null, 2)}\n`
}

/** 结构说明（自动提取）：tileStreamingBoundaries；输入 component；直接调用 tileMapView、Math.max、output.push、Math.floor、Math.min；写入 component、y、x；返回路径包含 output；包含循环处理。 */ export function tileStreamingBoundaries(component: TileMap2D): Array<{ chunkX: number; chunkY: number; left: number; top: number; right: number; bottom: number }> {
  component = tileMapView(component); const size = Math.max(1, component.chunkSize), output = []
  for (let y = 0; y < component.height; y += size) for (let x = 0; x < component.width; x += size) output.push({ chunkX: Math.floor(x / size), chunkY: Math.floor(y / size), left: x, top: y, right: Math.min(component.width, x + size), bottom: Math.min(component.height, y + size) })
  return output
}

/** 结构说明（自动提取）：selectionBounds；输入 component；直接调用 Math.max、Math.min。 */ function selectionBounds(component: TileMap2D): { left: number; right: number; bottom: number; top: number } | null {
  const selection = tilemapEditorState.selection
  if (!selection) return null
  return {
    left: Math.max(0, Math.min(selection.start.x, selection.end.x)), right: Math.min(component.width - 1, Math.max(selection.start.x, selection.end.x)),
    bottom: Math.max(0, Math.min(selection.start.y, selection.end.y)), top: Math.min(component.height - 1, Math.max(selection.start.y, selection.end.y))
  }
}

/** 结构说明（自动提取）：copyTileSelection；输入 component；直接调用 normalizeTileMap、selectionBounds、tileIndex、tiles.push、transforms.push；写入 tilemapEditorState.clipboard；包含循环处理。 */ export function copyTileSelection(component: TileMap2D): boolean {
  normalizeTileMap(component)
  const bounds = selectionBounds(component)
  if (!bounds) return false
  const tiles: number[] = [], transforms: TileCellTransform2D[] = []
  for (let y = bounds.bottom; y <= bounds.top; y++) for (let x = bounds.left; x <= bounds.right; x++) {
    const index = tileIndex(component, { x, y })
    tiles.push(component.tiles[index]); transforms.push(component.layers[component.activeLayer].transforms[index])
  }
  tilemapEditorState.clipboard = { width: bounds.right - bounds.left + 1, height: bounds.top - bounds.bottom + 1, tiles, transforms }
  return true
}

/** 结构说明（自动提取）：pasteTileClipboard；输入 component、origin、repeat；直接调用 setTile、Math.max；写入 changed；返回路径包含 changed；包含循环处理。 */ export function pasteTileClipboard(component: TileMap2D, origin: { x: number; y: number }, repeat = false): boolean {
  const clipboard = tilemapEditorState.clipboard
  if (!clipboard) return setTile(component, origin, tilemapEditorState.tileIndex)
  let changed = false
  const width = repeat ? Math.max(clipboard.width, component.width - origin.x) : clipboard.width
  const height = repeat ? Math.max(clipboard.height, component.height - origin.y) : clipboard.height
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = (y % clipboard.height) * clipboard.width + x % clipboard.width
    changed = setTile(component, { x: origin.x + x, y: origin.y + y }, clipboard.tiles[source], clipboard.transforms[source]) || changed
  }
  return changed
}

/** 结构说明（自动提取）：transformTileSelection；输入 component、operation；直接调用 copyTileSelection、fill、Array、selectionBounds、pasteTileClipboard；写入 tiles[…]、transforms[…]、tilemapEditorState.clipboard；包含循环处理。 */ export function transformTileSelection(component: TileMap2D, operation: 'rotate' | 'mirrorX' | 'mirrorY'): boolean {
  if (!copyTileSelection(component) || !tilemapEditorState.clipboard) return false
  const source = tilemapEditorState.clipboard
  const nextWidth = operation === 'rotate' ? source.height : source.width
  const nextHeight = operation === 'rotate' ? source.width : source.height
  const tiles = Array(nextWidth * nextHeight).fill(-1), transforms = Array<TileCellTransform2D>(nextWidth * nextHeight).fill(0)
  for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
    const sourceIndex = y * source.width + x
    const nx = operation === 'rotate' ? source.height - 1 - y : operation === 'mirrorX' ? source.width - 1 - x : x
    const ny = operation === 'rotate' ? x : operation === 'mirrorY' ? source.height - 1 - y : y
    const flags = source.transforms[sourceIndex]
    const rotation = flags & 3, flipX = (flags & 4) !== 0, flipY = (flags & 8) !== 0
    const nextFlags = operation === 'rotate' ? ((rotation + 1) & 3) | (flipX ? 4 : 0) | (flipY ? 8 : 0) : rotation | ((operation === 'mirrorX' ? !flipX : flipX) ? 4 : 0) | ((operation === 'mirrorY' ? !flipY : flipY) ? 8 : 0)
    const targetIndex = ny * nextWidth + nx
    tiles[targetIndex] = source.tiles[sourceIndex]; transforms[targetIndex] = nextFlags as TileCellTransform2D
  }
  tilemapEditorState.clipboard = { width: nextWidth, height: nextHeight, tiles, transforms }
  const bounds = selectionBounds(component)
  return bounds ? pasteTileClipboard(component, { x: bounds.left, y: bounds.bottom }) : false
}

/** 结构说明（自动提取）：floodFill；输入 component、start、replacement；直接调用 tileIndex、Uint8Array、pending.pop、setTile、pending.push；写入 visited[…]、changed；返回路径包含 changed；包含循环处理。 */ function floodFill(component: TileMap2D, start: { x: number; y: number }, replacement: number): boolean {
  const target = component.tiles[tileIndex(component, start)]
  if (target === replacement) return false
  const pending = [start]
  const visited = new Uint8Array(component.width * component.height)
  let changed = false
  while (pending.length) {
    const cell = pending.pop()!
    const index = tileIndex(component, cell)
    if (visited[index] || component.tiles[index] !== target) continue
    visited[index] = 1
    changed = setTile(component, cell, replacement) || changed
    if (cell.x > 0) pending.push({ x: cell.x - 1, y: cell.y })
    if (cell.x + 1 < component.width) pending.push({ x: cell.x + 1, y: cell.y })
    if (cell.y > 0) pending.push({ x: cell.x, y: cell.y - 1 })
    if (cell.y + 1 < component.height) pending.push({ x: cell.x, y: cell.y + 1 })
  }
  if (changed) component.revision++
  return changed
}

interface ChunkCache { signature: string; chunks: Map<string, TileChunkRenderCommand>; dirty: Set<string> }
const chunkCaches = new WeakMap<TileMap2D, ChunkCache>()

/** 按模板 `${Math.floor(x / component.chunkSize)}:${Math.floor(y / component.chunkSize)}` 生成并返回字符串。 */ function chunkKey(component: TileMap2D, x: number, y: number): string {
  return `${Math.floor(x / component.chunkSize)}:${Math.floor(y / component.chunkSize)}`
}

/** 结构说明（自动提取）：markTileDirty；输入 component、x、y；直接调用 dirty.add、chunkCaches.get、chunkKey。 */ function markTileDirty(component: TileMap2D, x: number, y: number): void {
  const layer = component.layers[component.activeLayer]
  if (layer) chunkCaches.get(component)?.dirty.add(`${layer.id}:${chunkKey(component, x, y)}`)
}
/** 执行时调用 chunkCaches.delete(component)；不显式返回调用结果。 */ export function invalidateTileMap(component: TileMap2D): void { chunkCaches.delete(component) }

let explicitTileTime: number | null = null
/** 结构说明（自动提取）：setTileAnimationTime；输入 seconds；直接调用 Number.isFinite、Error；写入 explicitTileTime；包含显式抛错路径。 */ export function setTileAnimationTime(seconds: number | null): void { if(seconds!==null&&(!Number.isFinite(seconds)||seconds<0))throw new Error('TILE_TIME: Expected a finite non-negative time.');explicitTileTime=seconds }
/* 当 explicitTileTime 为 null 或 undefined 时返回 performance.now()/1000，否则保留左侧值。 */ function tileAnimationTime(): number { return explicitTileTime ?? performance.now()/1000 }
/** 结构说明（自动提取）：animationTile；输入 definition、nowSeconds；直接调用 animation.frames.keys、Array.from、order.reduce、Math.max、Math.min 等；写入 cursor；返回路径包含 animation.frames[…]；包含循环处理。 */ export function animationTile(definition: TileDefinition | undefined, nowSeconds: number): number | null {
  const animation = definition?.animation
  if (!animation?.frames.length) return definition?.index ?? null
  if(animation.durations?.length===animation.frames.length){
    const order=animation.mode==='PingPong'&&animation.frames.length>1?[...animation.frames.keys(),...Array.from({length:animation.frames.length-2},/* 计算表达式 animation.frames.length-2-i 并返回结果，沿用操作数的原有类型规则。 */ (_,i)=>animation.frames.length-2-i)]:[...animation.frames.keys()]
    const total=order.reduce(/* 计算表达式 sum+animation.durations![index] 并返回结果，沿用操作数的原有类型规则。 */ (sum,index)=>sum+animation.durations![index],0),time=Math.max(0,nowSeconds)
    let cursor=animation.mode==='Once'?Math.min(total,time):time%total
    for(const index of order){const duration=animation.durations[index];if(cursor<duration)return animation.frames[index];cursor-=duration}
    return animation.frames[order.at(-1)!]
  }
  const raw = Math.max(0, Math.floor(nowSeconds * animation.framesPerSecond))
  if (animation.mode === 'Once') return animation.frames[Math.min(animation.frames.length - 1, raw)]
  if (animation.mode === 'PingPong' && animation.frames.length > 1) {
    const period = animation.frames.length * 2 - 2
    const cursor = raw % period
    return animation.frames[cursor < animation.frames.length ? cursor : period - cursor]
  }
  return animation.frames[raw % animation.frames.length]
}

/** 结构说明（自动提取）：chunkCommand；输入 entity、component、layer、tileSet、chunkX、chunkY、entities、cameraPosition；直接调用 worldTransform、Math.min、animationTile、tileAnimationTime、tileSet.sources.find 等；写入 position.x、position.y；包含循环处理。 */ function chunkCommand(entity: Entity, component: TileMap2D, layer: TileMap2D['layers'][number], tileSet: TileSetDocument, chunkX: number, chunkY: number, entities: Entity[], cameraPosition?: Vec2): TileChunkRenderCommand {
  const transform = worldTransform(entity, entities)
  const sprites: TileChunkRenderCommand['sprites'] = []
  const startX = chunkX * component.chunkSize, startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
    const cellIndex = y * component.width + x
    const value = layer.tiles[cellIndex]
    if (value < 0 || value >= tileSet.columns * tileSet.rows) continue
    const definition = tileSet.tiles[value]
    const frame = animationTile(definition, tileAnimationTime()) ?? value
    const frameDefinition = tileSet.tiles[frame] ?? definition
    const source = tileSet.sources.find(/* 比较 candidate.id 与 frameDefinition?.sourceId，返回严格相等的判断结果。 */ candidate => candidate.id === frameDefinition?.sourceId) ?? tileSet.sources[0]
    const region = frameDefinition?.region ?? {
      x: source.margin + frame % tileSet.columns * (tileSet.tileWidth + source.spacing),
      y: source.margin + Math.floor(frame / tileSet.columns) * (tileSet.tileHeight + source.spacing),
      width: tileSet.tileWidth,
      height: tileSet.tileHeight
    }
    const texture = resolveTextureRegion(source.textureAsset ?? tileSet.textureAsset, {
      x: region.x,
      y: region.y,
      width: region.width,
      height: region.height
    }, component.filterMode)
    if (!texture) continue
    const local = { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y }
    const position = localPointToWorld(entity, local, entities)
    if (cameraPosition) { position.x += cameraPosition.x * (1 - layer.parallax.x); position.y += cameraPosition.y * (1 - layer.parallax.y) }
    const flags = layer.transforms[cellIndex] ?? 0
    sprites.push({
      position, rotation: transform.rotation + (flags & 3) * Math.PI * .5, scale: transform.scale,
      size: { ...component.tileSize }, pivot: { x: .5, y: .5 }, flipX: (flags & 4) !== 0, flipY: (flags & 8) !== 0,
      tint: { ...component.tint, a: component.opacity / 100 * layer.opacity }, texture
    })
  }
  return { sprites, sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer + layer.zOrder, material: component.material, blendMode: layer.blendMode }
}

/** 结构说明（自动提取）：chunkIntersectsBounds；输入 entity、component、chunkX、chunkY、entities、bounds；直接调用 Math.min、localPointToWorld、corners.map、Math.max。 */ function chunkIntersectsBounds(
  entity: Entity,
  component: TileMap2D,
  chunkX: number,
  chunkY: number,
  entities: Entity[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
): boolean {
  const startX = chunkX * component.chunkSize
  const startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize)
  const endY = Math.min(component.height, startY + component.chunkSize)
  const left = (startX - component.width * .5) * component.tileSize.x
  const right = (endX - component.width * .5) * component.tileSize.x
  const bottom = (startY - component.height * .5) * component.tileSize.y
  const top = (endY - component.height * .5) * component.tileSize.y
  const corners = [
    localPointToWorld(entity, { x: left, y: bottom }, entities),
    localPointToWorld(entity, { x: right, y: bottom }, entities),
    localPointToWorld(entity, { x: right, y: top }, entities),
    localPointToWorld(entity, { x: left, y: top }, entities)
  ]
  const minX = Math.min(...corners.map(/* 返回 point.x 的当前值。 */ point => point.x))
  const maxX = Math.max(...corners.map(/* 返回 point.x 的当前值。 */ point => point.x))
  const minY = Math.min(...corners.map(/* 返回 point.y 的当前值。 */ point => point.y))
  const maxY = Math.max(...corners.map(/* 返回 point.y 的当前值。 */ point => point.y))
  return maxX >= bounds.minX && minX <= bounds.maxX && maxY >= bounds.minY && minY <= bounds.maxY
}

/** 结构说明（自动提取）：tileChunkCommands；输入 entity、component、entities、visibleBounds、cameraPosition；直接调用 tileMapView、readRuntimeTileSet、resolveAsset、worldTransform、tileSet.tiles.some 等；写入 component、cache、command；返回路径包含 commands；包含循环处理。 */ export function tileChunkCommands(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  visibleBounds?: { minX: number; minY: number; maxX: number; maxY: number },
  cameraPosition?: Vec2
): TileChunkRenderCommand[] {
  if (!component.enabled || component.removed || !component.tileSetAsset) return []
  component = tileMapView(component)
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  const asset = resolveAsset(component.tileSetAsset)
  if (!tileSet || !asset) return []
  const transform = worldTransform(entity, entities)
  const hasAnimation = tileSet.tiles.some(/* 返回 tile.animation?.frames.length 的当前值。 */ tile => tile.animation?.frames.length)
  const animationTick = hasAnimation ? tileSet.tiles.filter(/* 返回 tile.animation?.frames.length 的当前值。 */ tile=>tile.animation?.frames.length).map(/* 调用 animationTile(tile,tileAnimationTime()) 并返回调用结果。 */ tile=>animationTile(tile,tileAnimationTime())).join(',') : 0
  const signature = [assetState.generation, textureContentRevision(), component.width, component.height, component.chunkSize, component.tileSize.x, component.tileSize.y, component.tileSetAsset, asset.sourceModified, transform.position.x, transform.position.y, transform.rotation, transform.scale.x, transform.scale.y, cameraPosition?.x ?? 0, cameraPosition?.y ?? 0, component.tint.r, component.tint.g, component.tint.b, component.opacity, component.filterMode, component.sortingLayer, component.orderInLayer, component.material, component.revision, animationTick, ...component.layers.map(/** 按模板 `${layer.id}:${layer.visible}:${layer.opacity}:${layer.blendMode}:${layer.parallax.x}:${layer.parallax.y}:${layer.zOrder}` 生成并返回字符串。 */ layer => `${layer.id}:${layer.visible}:${layer.opacity}:${layer.blendMode}:${layer.parallax.x}:${layer.parallax.y}:${layer.zOrder}`)].join(':')
  let cache = chunkCaches.get(component)
  if (!cache || cache.signature !== signature) {
    cache = { signature, chunks: new Map(), dirty: new Set() }
    chunkCaches.set(component, cache)
  }
  const columns = Math.ceil(component.width / component.chunkSize), rows = Math.ceil(component.height / component.chunkSize)
  const commands: TileChunkRenderCommand[] = []
  for (const layer of component.layers) for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    if (!layer.visible || layer.opacity <= 0) continue
    // Cull at chunk granularity before generating or walking any tile sprites.
    if (visibleBounds && !chunkIntersectsBounds(entity, component, x, y, entities, visibleBounds)) continue
    const key = `${layer.id}:${x}:${y}`
    let command = cache.chunks.get(key)
    if (!command || cache.dirty.has(key)) {
      command = chunkCommand(entity, component, layer, tileSet, x, y, entities, cameraPosition)
      cache.chunks.set(key, command)
      cache.dirty.delete(key)
    }
    if (command.sprites.length) commands.push(command)
  }
  return commands
}

export interface TileColliderDescriptor {
  center: Vec2
  size: Vec2
  vertices: Vec2[]
  oneWay: boolean
}

/** Applies the same rotate/mirror flags used by rendering and collider baking. */
/** 结构说明（自动提取）：transformNormalizedTilePoint；输入 point、flags；写入 x、y；包含循环处理。 */ export function transformNormalizedTilePoint(point: Vec2, flags: number): Vec2 {
  let x = point.x - .5, y = point.y - .5
  if ((flags & 4) !== 0) x = -x
  if ((flags & 8) !== 0) y = -y
  for (let turn = 0; turn < (flags & 3); turn++) { const previous = x; x = -y; y = previous }
  return { x: x + .5, y: y + .5 }
}

export interface TilePlacementDescriptor {
  layerId: string
  cell: { x: number; y: number }
  kind: 'scene' | 'prefab'
  asset: string
  position: Vec2
  rotation: number
  flipX: boolean
  flipY: boolean
}

/**
 * Returns bounded, chunk-local scene/prefab placements for a streaming host.
 * The function never expands an entire large world unless the caller asks for
 * every chunk explicitly.
 */
/** 结构说明（自动提取）：tilePlacementDescriptors；输入 entity、component、entities、chunkX、chunkY；直接调用 ensureRuntimeTileMap、readRuntimeTileSet、Math.max、Math.round、Math.min 等；返回路径包含 result；包含循环处理。 */ export function tilePlacementDescriptors(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  chunkX: number,
  chunkY: number
): TilePlacementDescriptor[] {
  ensureRuntimeTileMap(component)
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  if (!tileSet) return []
  const startX = Math.max(0, Math.round(chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunkY) * component.chunkSize)
  if (startX >= component.width || startY >= component.height) return []
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  const mapTransform = worldTransform(entity, entities), result: TilePlacementDescriptor[] = []
  for (const layer of component.layers.filter(/* 返回 candidate.visible 的当前值。 */ candidate => candidate.visible)) {
    for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
      const index = y * component.width + x, definition = tileSet.tiles[layer.tiles[index]]
      const asset = definition?.sceneAsset ?? definition?.prefabAsset
      if (!definition || !asset) continue
      const flags = layer.transforms[index] ?? 0
      const local = { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y }
      result.push({
        layerId: layer.id,
        cell: { x, y },
        kind: definition.sceneAsset ? 'scene' : 'prefab',
        asset,
        position: localPointToWorld(entity, local, entities),
        rotation: mapTransform.rotation + (flags & 3) * Math.PI * .5,
        flipX: (flags & 4) !== 0,
        flipY: (flags & 8) !== 0
      })
    }
  }
  return result
}

/** Greedily merges adjacent box tiles and horizontal one-way runs. */
/** 结构说明（自动提取）：buildTileColliderDescriptors；输入 component；直接调用 readRuntimeTileSet、normalizeTileMap、component.layers.filter、Uint8Array、collision 等；写入 visited[…]；返回路径包含 result；包含循环处理。 */ export function buildTileColliderDescriptors(component: TileMap2D): TileColliderDescriptor[] {
  if (!component.bakeCollision) return []
  const tileSet = readRuntimeTileSet(component.tileSetAsset)
  if (!tileSet) return []
  normalizeTileMap(component)
  const collisionLayers = component.layers.filter(/* 先计算 layer.visible；仅当其为真值时求右侧 layer.collisionEnabled，返回短路求值结果。 */ layer => layer.visible && layer.collisionEnabled)
  const collision = /** 结构说明（自动提取）：collision；输入 x、y；返回路径包含 kind；包含循环处理。 */ (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const kind = tileSet.tiles[collisionLayers[index].tiles[y * component.width + x]]?.collision ?? 'None'
      if (kind !== 'None') return kind
    }
    return 'None' as TileCollision2D
  }
  const definitionAt = /** 结构说明（自动提取）：definitionAt；输入 x、y；返回路径包含 undefined；包含循环处理。 */ (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const layer = collisionLayers[index], cellIndex = y * component.width + x
      const definition = tileSet.tiles[layer.tiles[cellIndex]]
      if (definition?.collision !== 'None') return { definition, flags: layer.transforms[cellIndex] ?? 0 }
    }
    return undefined
  }
  const visited = new Uint8Array(component.width * component.height)
  const result: TileColliderDescriptor[] = []
  for (let y = 0; y < component.height; y++) for (let x = 0; x < component.width; x++) {
    const index = y * component.width + x
    if (visited[index]) continue
    const kind = collision(x, y)
    if (kind === 'None') { visited[index] = 1; continue }
    const cellDefinition = definitionAt(x, y)
    if (kind === 'Polygon' || (cellDefinition?.flags ?? 0) !== 0) {
      visited[index] = 1
      const definition = cellDefinition?.definition
      const polygon = definition?.polygon.length && definition.polygon.length <= 4 ? definition.polygon : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
      result.push({
        center: { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y },
        size: { ...component.tileSize }, oneWay: kind === 'OneWay',
        vertices: polygon.map(/* 调用 transformNormalizedTilePoint(point, cellDefinition?.flags ?? 0) 并返回调用结果。 */ point => transformNormalizedTilePoint(point, cellDefinition?.flags ?? 0)).map(/** 构造并返回记录 { x: (point.x - .5) * component.tileSize.x, y: (point.y - .5) * component.tileSize.y }，字段按当前实参及捕获状态求值。 */ point => ({ x: (point.x - .5) * component.tileSize.x, y: (point.y - .5) * component.tileSize.y }))
      })
      continue
    }
    let runWidth = 1
    while (x + runWidth < component.width && !visited[index + runWidth] && collision(x + runWidth, y) === kind) runWidth++
    let runHeight = 1
    if (kind === 'Box') {
      outer: while (y + runHeight < component.height) {
        for (let dx = 0; dx < runWidth; dx++) if (visited[(y + runHeight) * component.width + x + dx] || collision(x + dx, y + runHeight) !== 'Box') break outer
        runHeight++
      }
    }
    for (let dy = 0; dy < runHeight; dy++) for (let dx = 0; dx < runWidth; dx++) visited[(y + dy) * component.width + x + dx] = 1
    const width = runWidth * component.tileSize.x, height = runHeight * component.tileSize.y
    result.push({
      center: { x: (x + runWidth * .5 - component.width * .5) * component.tileSize.x, y: (y + runHeight * .5 - component.height * .5) * component.tileSize.y },
      size: { x: width, y: height }, vertices: [], oneWay: kind === 'OneWay'
    })
  }
  return result
}
