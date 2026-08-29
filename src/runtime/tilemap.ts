import { reactive } from 'vue'
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
  animation: { frames: number[]; framesPerSecond: number; mode: 'Loop' | 'PingPong' | 'Once' } | null
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

function integer(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.round(Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback))))
}

function normalizedPolygon(source: unknown): Vec2[] {
  if (!Array.isArray(source)) return []
  // The stable physics ABI stores four convex vertices per collider.
  return source.slice(0, 4).flatMap(value => {
    if (!value || typeof value !== 'object') return []
    const point = value as Record<string, unknown>
    return [{ x: Math.min(1, Math.max(0, finiteNumber(point.x))), y: Math.min(1, Math.max(0, finiteNumber(point.y))) }]
  })
}

function normalizedMetadata(source: unknown): Record<string, boolean | number | string> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {}
  const result: Record<string, boolean | number | string> = {}
  for (const [rawKey, rawValue] of Object.entries(source as Record<string, unknown>).slice(0, 64)) {
    const key = rawKey.trim().slice(0, 80)
    if (!key || !['boolean', 'number', 'string'].includes(typeof rawValue) || typeof rawValue === 'number' && !Number.isFinite(rawValue)) continue
    result[key] = typeof rawValue === 'string' ? rawValue.slice(0, 500) : rawValue as boolean | number
  }
  return result
}

export function normalizeTileSet(source: unknown): TileSetDocument {
  const value = source && typeof source === 'object' ? source as Record<string, unknown> : {}
  const tileWidth = integer(value.tileWidth, 32, 1, 16_384)
  const tileHeight = integer(value.tileHeight, 32, 1, 16_384)
  const columns = integer(value.columns, 1, 1, MAX_TILESET_TILES)
  const rows = integer(value.rows, 1, 1, Math.max(1, Math.floor(MAX_TILESET_TILES / columns)))
  const count = Math.min(MAX_TILESET_TILES, columns * rows)
  const rawTiles = Array.isArray(value.tiles) ? value.tiles : []
  const sources = (Array.isArray(value.sources) ? value.sources : []).slice(0, 64).flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const raw = item as Record<string, unknown>
    return [{ id: typeof raw.id === 'string' && raw.id ? raw.id.slice(0, 80) : `source-${index}`, name: typeof raw.name === 'string' ? raw.name.slice(0, 120) : `Source ${index + 1}`, textureAsset: typeof raw.textureAsset === 'string' ? raw.textureAsset : null, margin: integer(raw.margin, 0, 0, 16_384), spacing: integer(raw.spacing, 0, 0, 16_384) }]
  })
  if (!sources.length) sources.push({ id: 'primary', name: 'Primary atlas', textureAsset: typeof value.textureAsset === 'string' ? value.textureAsset : null, margin: 0, spacing: 0 })
  const byIndex = new Map<number, Record<string, unknown>>()
  rawTiles.forEach(item => {
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
    tiles: Array.from({ length: count }, (_, index) => {
      const raw = byIndex.get(index)
      const collision = ['Box', 'Polygon', 'OneWay'].includes(String(raw?.collision)) ? raw!.collision as TileCollision2D : 'None'
      const polygon = normalizedPolygon(raw?.polygon)
      const rawAnimation = raw?.animation && typeof raw.animation === 'object' ? raw.animation as Record<string, unknown> : null
      const animationFrames = Array.isArray(rawAnimation?.frames) ? rawAnimation.frames.slice(0, 256).map(frame => integer(frame, index, 0, count - 1)) : []
      const variants = Array.isArray(raw?.variants) ? raw.variants.slice(0, 64).flatMap(item => {
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
        sourceId: typeof raw?.sourceId === 'string' && sources.some(source => source.id === raw.sourceId) ? raw.sourceId : sources[0].id,
        region: rawRegion ? { x: integer(rawRegion.x, 0, 0, 1_000_000), y: integer(rawRegion.y, 0, 0, 1_000_000), width: integer(rawRegion.width, tileWidth, 1, 1_000_000), height: integer(rawRegion.height, tileHeight, 1, 1_000_000) } : null,
        animation: animationFrames.length ? { frames: animationFrames, framesPerSecond: Math.min(240, Math.max(0.01, finiteNumber(rawAnimation?.framesPerSecond, 8))), mode: rawAnimation?.mode === 'PingPong' || rawAnimation?.mode === 'Once' ? rawAnimation.mode : 'Loop' } : null,
        variants
      }
    })
  }
}

export function readTileSet(reference: string | null | undefined): TileSetDocument | null {
  const asset = resolveAsset(reference)
  const source = readTextAsset(reference)
  if (!asset || asset.assetType !== 'tileset' || !source) return null
  try { return normalizeTileSet(JSON.parse(source)) } catch { return null }
}

export function createTileSet(texture: AssetRecord, tileWidth = 32, tileHeight = 32): AssetRecord {
  if (texture.assetType !== 'image') throw new Error('A TileSet requires an image asset')
  const width = integer(tileWidth, 32, 1, Math.max(1, texture.width || 16_384))
  const height = integer(tileHeight, 32, 1, Math.max(1, texture.height || 16_384))
  const columns = Math.max(1, Math.floor(Math.max(width, texture.width) / width))
  const rows = Math.max(1, Math.floor(Math.max(height, texture.height) / height))
  const document = normalizeTileSet({ textureAsset: assetReference(texture.uuid), tileWidth: width, tileHeight: height, columns, rows })
  return createTextAsset(`${texture.name.replace(/\.[^.]+$/, '')} TileSet`, 'tileset', JSON.stringify(document, null, 2), 'Assets/TileSets')
}

export function saveTileSet(assetUuid: string, document: TileSetDocument): boolean {
  return updateTextAssetTransactional(assetUuid, `${JSON.stringify(normalizeTileSet(document), null, 2)}\n`)
}

export function normalizeTileMap(component: TileMap2D): void {
  component.width = integer(component.width, 32, 1, 2048)
  component.height = integer(component.height, 18, 1, Math.min(2048, Math.floor(MAX_TILEMAP_CELLS / component.width)))
  component.tileSize = {
    x: Math.min(1e6, Math.max(1e-6, Math.abs(finiteNumber(component.tileSize?.x, 1)))),
    y: Math.min(1e6, Math.max(1e-6, Math.abs(finiteNumber(component.tileSize?.y, 1))))
  }
  component.chunkSize = integer(component.chunkSize, 32, 4, 128)
  component.tiles = Array.from({ length: component.width * component.height }, (_, index) => integer(component.tiles?.[index], -1, -1, MAX_TILESET_TILES - 1))
  const rawLayers = Array.isArray(component.layers) ? component.layers.slice(0, 128) : []
  component.layers = (rawLayers.length ? rawLayers : [{ id: crypto.randomUUID(), name: 'Base', visible: true, locked: false, opacity: 1, blendMode: 'Alpha' as const, parallax: { x: 1, y: 1 }, zOrder: 0, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: component.tiles, transforms: Array(component.width * component.height).fill(0) as TileCellTransform2D[] }]).map((layer, index) => ({
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
    tiles: Array.from({ length: component.width * component.height }, (_, tile) => integer(layer.tiles?.[tile], -1, -1, MAX_TILESET_TILES - 1)),
    transforms: Array.from({ length: component.width * component.height }, (_, tile) => integer(layer.transforms?.[tile], 0, 0, 15) as TileCellTransform2D)
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

export function resizeTileMap(component: TileMap2D, width: number, height: number): void {
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

export function setActiveTileLayer(component: TileMap2D, index: number): boolean {
  normalizeTileMap(component)
  const next = integer(index, component.activeLayer, 0, component.layers.length - 1)
  if (next === component.activeLayer) return false
  component.activeLayer = next; component.tiles = component.layers[next].tiles; component.revision++; invalidateTileMap(component); return true
}

export function addTileLayer(component: TileMap2D, name = `Layer ${component.layers.length + 1}`): number {
  normalizeTileMap(component)
  if (component.layers.length >= 128) return component.activeLayer
  component.layers.push({ id: crypto.randomUUID(), name: name.slice(0, 80), visible: true, locked: false, opacity: 1, blendMode: 'Alpha', parallax: { x: 1, y: 1 }, zOrder: component.layers.length, collisionEnabled: true, navigationEnabled: true, occlusionEnabled: true, tiles: Array(component.width * component.height).fill(-1), transforms: Array(component.width * component.height).fill(0) })
  setActiveTileLayer(component, component.layers.length - 1); return component.activeLayer
}

export function duplicateTileLayer(component: TileMap2D): number {
  normalizeTileMap(component); const source = component.layers[component.activeLayer]
  if (component.layers.length >= 128) return component.activeLayer
  component.layers.splice(component.activeLayer + 1, 0, { ...source, id: crypto.randomUUID(), name: `${source.name} copy`.slice(0, 80), parallax: { ...source.parallax }, tiles: [...source.tiles], transforms: [...source.transforms] })
  setActiveTileLayer(component, component.activeLayer + 1); return component.activeLayer
}

export function removeTileLayer(component: TileMap2D): boolean {
  normalizeTileMap(component); if (component.layers.length <= 1) return false
  component.layers.splice(component.activeLayer, 1); component.activeLayer = Math.min(component.activeLayer, component.layers.length - 1); component.tiles = component.layers[component.activeLayer].tiles; component.revision++; invalidateTileMap(component); return true
}

export interface TilePaletteDocument { version: 1; tileSetAsset: string | null; tiles: number[] }
export interface BrushPresetDocument { version: 1; name: string; size: number; shape: 'Circle' | 'Square'; scatter: number }
export interface TerrainRulesDocument { version: 1; terrain: string; rules: Record<string, number> }

export function createTilePalette(tileSetAsset: string | null, tiles: number[]): AssetRecord {
  return createTextAsset('New Tile Palette', 'tilePalette', JSON.stringify({ version: 1, tileSetAsset, tiles: tiles.slice(0, MAX_TILESET_TILES).map(value => integer(value, -1, -1, MAX_TILESET_TILES - 1)) }, null, 2), 'Assets/TilePalettes')
}
export function createBrushPreset(): AssetRecord { return createTextAsset('New Brush Preset', 'brushPreset', JSON.stringify({ version: 1, name: 'Soft square', size: 1, shape: 'Square', scatter: 0 }, null, 2), 'Assets/BrushPresets') }
export function createTerrainRules(): AssetRecord { return createTextAsset('New Terrain Rules', 'terrainRules', JSON.stringify({ version: 1, terrain: 'Ground', rules: { '0': 0 } }, null, 2), 'Assets/TerrainRules') }

function readAssetJson(reference: string | null, type: string): Record<string, unknown> | null { const asset = resolveAsset(reference), source = readTextAsset(reference); if (!asset || asset.assetType !== type || !source) return null; try { const value = JSON.parse(source); return value && typeof value === 'object' ? value as Record<string, unknown> : null } catch { return null } }
export function readBrushPreset(reference: string | null): BrushPresetDocument | null { const value = readAssetJson(reference, 'brushPreset'); if (!value) return null; return { version: 1, name: typeof value.name === 'string' ? value.name.slice(0, 80) : 'Brush', size: integer(value.size, 1, 1, 64), shape: value.shape === 'Circle' ? 'Circle' : 'Square', scatter: Math.min(1, Math.max(0, finiteNumber(value.scatter))) } }
export function readTilePalette(reference: string | null): TilePaletteDocument | null { const value = readAssetJson(reference, 'tilePalette'); if (!value) return null; return { version: 1, tileSetAsset: typeof value.tileSetAsset === 'string' ? value.tileSetAsset : null, tiles: Array.isArray(value.tiles) ? value.tiles.slice(0, MAX_TILESET_TILES).map(tile => integer(tile, -1, -1, MAX_TILESET_TILES - 1)) : [] } }
export function readTerrainRules(reference: string | null): TerrainRulesDocument | null { const value = readAssetJson(reference, 'terrainRules'); if (!value) return null; const rules: Record<string, number> = {}; if (value.rules && typeof value.rules === 'object') for (const [mask, tile] of Object.entries(value.rules as Record<string, unknown>)) rules[String(integer(mask, 0, 0, 15))] = integer(tile, -1, -1, MAX_TILESET_TILES - 1); return { version: 1, terrain: typeof value.terrain === 'string' ? value.terrain.slice(0, 80) : '', rules } }

export function bakeTileMap(component: TileMap2D): { collision: number; navigation: number; occluders: number; chunks: number } {
  normalizeTileMap(component); const set = readTileSet(component.tileSetAsset)
  const navigationTiles = component.layers.filter(layer => layer.navigationEnabled).flatMap(layer => layer.tiles).filter(tile => tile >= 0)
  const occlusionTiles = component.layers.filter(layer => layer.occlusionEnabled).flatMap(layer => layer.tiles).filter(tile => tile >= 0)
  return { collision: component.bakeCollision ? buildTileColliderDescriptors(component).length : 0, navigation: component.bakeNavigation && set ? navigationTiles.filter(tile => (set.tiles[tile]?.navigationCost ?? 0) > 0).length : 0, occluders: component.bakeOccluders && set ? occlusionTiles.filter(tile => set.tiles[tile]?.occluder).length : 0, chunks: Math.ceil(component.width / component.chunkSize) * Math.ceil(component.height / component.chunkSize) * component.layers.length }
}

function tileBakeHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return hash.toString(16).padStart(8, '0')
}

export function cancelTileMapBake(): boolean {
  if (!tileBakeController) return false
  tileBakeController.abort(); tileBakeState.cancelled = true
  return true
}

export async function requestTileMapBake(component: TileMap2D): Promise<typeof tileBakeState.result & { cancelled: boolean; artifactHash: string }> {
  cancelTileMapBake()
  const controller = new AbortController(); tileBakeController = controller
  normalizeTileMap(component)
  const chunksX = Math.ceil(component.width / component.chunkSize), chunksY = Math.ceil(component.height / component.chunkSize), totalChunks = chunksX * chunksY * component.layers.length
  Object.assign(tileBakeState, { active: true, cancelled: false, progress: 0, processedChunks: 0, totalChunks, artifactHash: '', error: '', result: { collision: 0, navigation: 0, occluders: 0, chunks: totalChunks } })
  try {
    for (const layer of [...component.layers].sort((a, b) => a.id.localeCompare(b.id))) for (let chunkY = 0; chunkY < chunksY; chunkY++) for (let chunkX = 0; chunkX < chunksX; chunkX++) {
      await new Promise<void>(resolve => setTimeout(resolve, 0))
      if (controller.signal.aborted) return { ...tileBakeState.result, cancelled: true, artifactHash: tileBakeState.artifactHash }
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
    tileBakeState.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    tileBakeState.cancelled = controller.signal.aborted
    tileBakeState.active = false
    if (tileBakeController === controller) tileBakeController = null
  }
}

export interface TilemapDiagnostic { severity: 'info' | 'warning' | 'error'; code: 'invalid-terrain' | 'missing-tile' | 'overdraw' | 'collision' | 'navigation' | 'scene-placement'; message: string; layerId?: string; cell?: { x: number; y: number } }

export function validateTerrainRules(document: TerrainRulesDocument | null): TilemapDiagnostic[] {
  if (!document) return []
  const missing = Array.from({ length: 16 }, (_, mask) => mask).filter(mask => !Number.isInteger(document.rules[String(mask)]) || document.rules[String(mask)] < 0)
  return missing.length ? [{ severity: 'error', code: 'invalid-terrain', message: `Terrain ${document.terrain || 'unnamed'} has no valid transition for masks ${missing.join(', ')}.` }] : []
}

export function diagnoseTileMap(component: TileMap2D): TilemapDiagnostic[] {
  normalizeTileMap(component)
  const tileSet = readTileSet(component.tileSetAsset)
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

function ensureRuntimeTileMap(component: TileMap2D): void {
  const cells = component.width * component.height
  if (!Number.isInteger(component.width) || !Number.isInteger(component.height) || component.width < 1 || component.height < 1 || !component.layers.length || component.layers.some(layer => layer.tiles.length !== cells || layer.transforms.length !== cells) || component.activeLayer < 0 || component.activeLayer >= component.layers.length || component.tiles !== component.layers[component.activeLayer].tiles) normalizeTileMap(component)
}

export function readRuntimeTileChunk(component: TileMap2D, layerId: string, chunkX: number, chunkY: number): RuntimeTileChunk | null {
  ensureRuntimeTileMap(component)
  const layer = component.layers.find(candidate => candidate.id === layerId)
  if (!layer) return null
  const startX = Math.max(0, Math.round(chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunkY) * component.chunkSize)
  if (startX >= component.width || startY >= component.height) return null
  const width = Math.min(component.chunkSize, component.width - startX), height = Math.min(component.chunkSize, component.height - startY)
  const tiles: number[] = [], transforms: TileCellTransform2D[] = []
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const index = (startY + y) * component.width + startX + x; tiles.push(layer.tiles[index]); transforms.push(layer.transforms[index]) }
  return { layerId, chunkX: Math.round(chunkX), chunkY: Math.round(chunkY), width, height, tiles, transforms }
}

export function writeRuntimeTileChunk(component: TileMap2D, chunk: RuntimeTileChunk): boolean {
  ensureRuntimeTileMap(component)
  const layerIndex = component.layers.findIndex(candidate => candidate.id === chunk.layerId)
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

export function tileMetadataAt(component: TileMap2D, x: number, y: number): Record<string, boolean | number | string> {
  ensureRuntimeTileMap(component)
  if (x < 0 || y < 0 || x >= component.width || y >= component.height) return {}
  const set = readTileSet(component.tileSetAsset), index = y * component.width + x
  return Object.assign({}, ...component.layers.filter(layer => layer.visible).map(layer => set?.tiles[layer.tiles[index]]?.metadata ?? {}))
}

export function worldToTile(entity: Entity, component: TileMap2D, point: Vec2, entities: Entity[]): { x: number; y: number } | null {
  const local = worldPointToLocal(entity, point, entities)
  const x = Math.floor(local.x / component.tileSize.x + component.width * .5)
  const y = Math.floor(local.y / component.tileSize.y + component.height * .5)
  return x >= 0 && y >= 0 && x < component.width && y < component.height ? { x, y } : null
}

function tileIndex(component: TileMap2D, cell: { x: number; y: number }): number { return cell.y * component.width + cell.x }
function chooseVariant(component: TileMap2D, cell: { x: number; y: number }, value: number): number {
  if (!tilemapEditorState.randomizeVariants || value < 0) return value
  const definition = readTileSet(component.tileSetAsset)?.tiles[value]
  const choices = [{ tile: value, weight: 1 }, ...(definition?.variants ?? [])]
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0)
  let sample = deterministicUnit(cell) * total
  for (const choice of choices) { sample -= choice.weight; if (sample <= 0) return choice.tile }
  return value
}

function setTile(component: TileMap2D, cell: { x: number; y: number }, value: number, transform = tilemapEditorState.transform): boolean {
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

function deterministicUnit(cell: { x: number; y: number }): number {
  let value = Math.imul(cell.x, 73_856_093) ^ Math.imul(cell.y, 19_349_663)
  value = Math.imul(value ^ value >>> 13, 1_274_126_177)
  return ((value ^ value >>> 16) >>> 0) / 0xffff_ffff
}

function terrainTile(component: TileMap2D, cell: { x: number; y: number }, fallback: number): number {
  const terrain = readTerrainRules(tilemapEditorState.terrainRulesAsset)
  const tileSet = readTileSet(component.tileSetAsset)
  if (!terrain || !tileSet || !terrain.terrain) return fallback
  const matches = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= component.width || y >= component.height) return false
    return tileSet.tiles[component.tiles[y * component.width + x]]?.terrain === terrain.terrain
  }
  const mask = (matches(cell.x, cell.y + 1) ? 1 : 0)
    | (matches(cell.x + 1, cell.y) ? 2 : 0)
    | (matches(cell.x, cell.y - 1) ? 4 : 0)
    | (matches(cell.x - 1, cell.y) ? 8 : 0)
  return terrain.rules[String(mask)] ?? fallback
}

function applyPaintCell(component: TileMap2D, center: { x: number; y: number }, value: number): boolean {
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

function rasterLine(start: { x: number; y: number }, end: { x: number; y: number }): Array<{ x: number; y: number }> {
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

export function beginTileStroke(component: TileMap2D, cell: { x: number; y: number }): TileStroke {
  const stroke = { start: { ...cell }, previous: { ...cell }, changed: false }
  if (tilemapEditorState.tool === 'eyedropper') tilemapEditorState.tileIndex = component.tiles[tileIndex(component, cell)] ?? -1
  else if (tilemapEditorState.tool === 'fill') stroke.changed = floodFill(component, cell, tilemapEditorState.tileIndex)
  else if (tilemapEditorState.tool === 'brush') stroke.changed = applyPaintCell(component, cell, tilemapEditorState.tileIndex)
  else if (tilemapEditorState.tool === 'stamp' || tilemapEditorState.tool === 'pattern') stroke.changed = pasteTileClipboard(component, cell, tilemapEditorState.tool === 'pattern')
  else if (tilemapEditorState.tool === 'eraser') stroke.changed = setTile(component, cell, -1)
  else if (tilemapEditorState.tool === 'selection') tilemapEditorState.selection = { start: { ...cell }, end: { ...cell } }
  return stroke
}

export function continueTileStroke(component: TileMap2D, stroke: TileStroke, cell: { x: number; y: number }): void {
  if (tilemapEditorState.tool === 'brush' || tilemapEditorState.tool === 'eraser') {
    const value = tilemapEditorState.tool === 'eraser' ? -1 : tilemapEditorState.tileIndex
    for (const point of rasterLine(stroke.previous, cell)) stroke.changed = (tilemapEditorState.tool === 'brush' ? applyPaintCell(component, point, value) : setTile(component, point, value)) || stroke.changed
  } else if (tilemapEditorState.tool === 'selection' && tilemapEditorState.selection) tilemapEditorState.selection.end = { ...cell }
  stroke.previous = { ...cell }
}

export function endTileStroke(component: TileMap2D, stroke: TileStroke, cell: { x: number; y: number }): boolean {
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

export function tileWorldCoordinate(entity: Entity, component: TileMap2D, cell: { x: number; y: number }, entities: Entity[]): Vec2 {
  normalizeTileMap(component)
  return localPointToWorld(entity, { x: (cell.x + .5 - component.width / 2) * component.tileSize.x, y: (component.height / 2 - cell.y - .5) * component.tileSize.y }, entities)
}

export function deterministicTileMapStorage(component: TileMap2D): string {
  normalizeTileMap(component)
  const runLength = (values: number[]) => { const output: Array<[number, number]> = []; for (const value of values) { const previous = output[output.length - 1]; if (previous?.[0] === value) previous[1]++; else output.push([value, 1]) } return output }
  const value = {
    format: 'nova-tilemap-source', version: 1, width: component.width, height: component.height, tileSize: { ...component.tileSize }, chunkSize: component.chunkSize,
    layers: [...component.layers].sort((a, b) => a.zOrder - b.zOrder || a.id.localeCompare(b.id)).map(layer => ({ id: layer.id, name: layer.name, visible: layer.visible, locked: layer.locked, opacity: layer.opacity, blendMode: layer.blendMode, parallax: { ...layer.parallax }, zOrder: layer.zOrder, collisionEnabled: layer.collisionEnabled, navigationEnabled: layer.navigationEnabled, occlusionEnabled: layer.occlusionEnabled, tilesRle: runLength(layer.tiles), transformsRle: runLength(layer.transforms) }))
  }
  return `${JSON.stringify(value, null, 2)}\n`
}

export function tileStreamingBoundaries(component: TileMap2D): Array<{ chunkX: number; chunkY: number; left: number; top: number; right: number; bottom: number }> {
  normalizeTileMap(component); const size = Math.max(1, component.chunkSize), output = []
  for (let y = 0; y < component.height; y += size) for (let x = 0; x < component.width; x += size) output.push({ chunkX: Math.floor(x / size), chunkY: Math.floor(y / size), left: x, top: y, right: Math.min(component.width, x + size), bottom: Math.min(component.height, y + size) })
  return output
}

function selectionBounds(component: TileMap2D): { left: number; right: number; bottom: number; top: number } | null {
  const selection = tilemapEditorState.selection
  if (!selection) return null
  return {
    left: Math.max(0, Math.min(selection.start.x, selection.end.x)), right: Math.min(component.width - 1, Math.max(selection.start.x, selection.end.x)),
    bottom: Math.max(0, Math.min(selection.start.y, selection.end.y)), top: Math.min(component.height - 1, Math.max(selection.start.y, selection.end.y))
  }
}

export function copyTileSelection(component: TileMap2D): boolean {
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

export function pasteTileClipboard(component: TileMap2D, origin: { x: number; y: number }, repeat = false): boolean {
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

export function transformTileSelection(component: TileMap2D, operation: 'rotate' | 'mirrorX' | 'mirrorY'): boolean {
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

function floodFill(component: TileMap2D, start: { x: number; y: number }, replacement: number): boolean {
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

function chunkKey(component: TileMap2D, x: number, y: number): string {
  return `${Math.floor(x / component.chunkSize)}:${Math.floor(y / component.chunkSize)}`
}

function markTileDirty(component: TileMap2D, x: number, y: number): void {
  const layer = component.layers[component.activeLayer]
  if (layer) chunkCaches.get(component)?.dirty.add(`${layer.id}:${chunkKey(component, x, y)}`)
}
export function invalidateTileMap(component: TileMap2D): void { chunkCaches.delete(component) }

function animationTile(definition: TileDefinition | undefined, nowSeconds: number): number | null {
  const animation = definition?.animation
  if (!animation?.frames.length) return definition?.index ?? null
  const raw = Math.max(0, Math.floor(nowSeconds * animation.framesPerSecond))
  if (animation.mode === 'Once') return animation.frames[Math.min(animation.frames.length - 1, raw)]
  if (animation.mode === 'PingPong' && animation.frames.length > 1) {
    const period = animation.frames.length * 2 - 2
    const cursor = raw % period
    return animation.frames[cursor < animation.frames.length ? cursor : period - cursor]
  }
  return animation.frames[raw % animation.frames.length]
}

function chunkCommand(entity: Entity, component: TileMap2D, layer: TileMap2D['layers'][number], tileSet: TileSetDocument, chunkX: number, chunkY: number, entities: Entity[], cameraPosition?: Vec2): TileChunkRenderCommand {
  const transform = worldTransform(entity, entities)
  const sprites: TileChunkRenderCommand['sprites'] = []
  const startX = chunkX * component.chunkSize, startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
    const cellIndex = y * component.width + x
    const value = layer.tiles[cellIndex]
    if (value < 0 || value >= tileSet.columns * tileSet.rows) continue
    const definition = tileSet.tiles[value]
    const frame = animationTile(definition, performance.now() / 1_000) ?? value
    const frameDefinition = tileSet.tiles[frame] ?? definition
    const source = tileSet.sources.find(candidate => candidate.id === frameDefinition?.sourceId) ?? tileSet.sources[0]
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

function chunkIntersectsBounds(
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
  const minX = Math.min(...corners.map(point => point.x))
  const maxX = Math.max(...corners.map(point => point.x))
  const minY = Math.min(...corners.map(point => point.y))
  const maxY = Math.max(...corners.map(point => point.y))
  return maxX >= bounds.minX && minX <= bounds.maxX && maxY >= bounds.minY && minY <= bounds.maxY
}

export function tileChunkCommands(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  visibleBounds?: { minX: number; minY: number; maxX: number; maxY: number },
  cameraPosition?: Vec2
): TileChunkRenderCommand[] {
  if (!component.enabled || component.removed || !component.tileSetAsset) return []
  normalizeTileMap(component)
  const tileSet = readTileSet(component.tileSetAsset)
  const asset = resolveAsset(component.tileSetAsset)
  if (!tileSet || !asset) return []
  const transform = worldTransform(entity, entities)
  const hasAnimation = tileSet.tiles.some(tile => tile.animation?.frames.length)
  const animationTick = hasAnimation ? Math.floor(performance.now() / 1000 * Math.max(1, ...tileSet.tiles.map(tile => tile.animation?.framesPerSecond ?? 1))) : 0
  const signature = [component.width, component.height, component.chunkSize, component.tileSize.x, component.tileSize.y, component.tileSetAsset, asset.sourceModified, transform.position.x, transform.position.y, transform.rotation, transform.scale.x, transform.scale.y, cameraPosition?.x ?? 0, cameraPosition?.y ?? 0, component.tint.r, component.tint.g, component.tint.b, component.opacity, component.filterMode, component.sortingLayer, component.orderInLayer, component.material, component.revision, animationTick, ...component.layers.map(layer => `${layer.id}:${layer.visible}:${layer.opacity}:${layer.blendMode}:${layer.parallax.x}:${layer.parallax.y}:${layer.zOrder}`)].join(':')
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
export function transformNormalizedTilePoint(point: Vec2, flags: number): Vec2 {
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
export function tilePlacementDescriptors(
  entity: Entity,
  component: TileMap2D,
  entities: Entity[],
  chunkX: number,
  chunkY: number
): TilePlacementDescriptor[] {
  ensureRuntimeTileMap(component)
  const tileSet = readTileSet(component.tileSetAsset)
  if (!tileSet) return []
  const startX = Math.max(0, Math.round(chunkX) * component.chunkSize), startY = Math.max(0, Math.round(chunkY) * component.chunkSize)
  if (startX >= component.width || startY >= component.height) return []
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  const mapTransform = worldTransform(entity, entities), result: TilePlacementDescriptor[] = []
  for (const layer of component.layers.filter(candidate => candidate.visible)) {
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
export function buildTileColliderDescriptors(component: TileMap2D): TileColliderDescriptor[] {
  if (!component.bakeCollision) return []
  const tileSet = readTileSet(component.tileSetAsset)
  if (!tileSet) return []
  normalizeTileMap(component)
  const collisionLayers = component.layers.filter(layer => layer.visible && layer.collisionEnabled)
  const collision = (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const kind = tileSet.tiles[collisionLayers[index].tiles[y * component.width + x]]?.collision ?? 'None'
      if (kind !== 'None') return kind
    }
    return 'None' as TileCollision2D
  }
  const definitionAt = (x: number, y: number) => {
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
        vertices: polygon.map(point => transformNormalizedTilePoint(point, cellDefinition?.flags ?? 0)).map(point => ({ x: (point.x - .5) * component.tileSize.x, y: (point.y - .5) * component.tileSize.y }))
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
