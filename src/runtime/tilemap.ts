import { reactive } from 'vue'
import {
  assetReference,
  createTextAsset,
  readTextAsset,
  resolveAsset,
  resolveTextureRegion,
  updateTextAsset
} from '../assets/AssetDatabase'
import type { AssetRecord } from '../assets/types'
import type { TileChunkRenderCommand } from '../renderer'
import type { Entity } from '../world/Entity'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldPointToLocal, worldTransform } from '../world/hierarchy'
import type { TileCollision2D, TileMap2D } from '../world/components'
import type { Vec2 } from '../world/types'

export interface TileDefinition {
  index: number
  name: string
  collision: TileCollision2D
  polygon: Vec2[]
  terrain: string
  navigationCost: number
  occluder: boolean
}

export interface TileSetDocument {
  version: 1
  textureAsset: string | null
  tileWidth: number
  tileHeight: number
  columns: number
  rows: number
  tiles: TileDefinition[]
}

export type TileTool = 'brush' | 'rectangle' | 'eraser' | 'fill' | 'eyedropper' | 'selection'

export const tilemapEditorState = reactive({
  active: false,
  tool: 'brush' as TileTool,
  tileIndex: 0,
  brushPresetAsset: null as string | null,
  terrainRulesAsset: null as string | null,
  selectedEntityUuid: null as string | null,
  selection: null as { start: { x: number; y: number }; end: { x: number; y: number } } | null
})

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

export function normalizeTileSet(source: unknown): TileSetDocument {
  const value = source && typeof source === 'object' ? source as Record<string, unknown> : {}
  const tileWidth = integer(value.tileWidth, 32, 1, 16_384)
  const tileHeight = integer(value.tileHeight, 32, 1, 16_384)
  const columns = integer(value.columns, 1, 1, MAX_TILESET_TILES)
  const rows = integer(value.rows, 1, 1, Math.max(1, Math.floor(MAX_TILESET_TILES / columns)))
  const count = Math.min(MAX_TILESET_TILES, columns * rows)
  const rawTiles = Array.isArray(value.tiles) ? value.tiles : []
  const byIndex = new Map<number, Record<string, unknown>>()
  rawTiles.forEach(item => {
    if (!item || typeof item !== 'object') return
    const record = item as Record<string, unknown>
    const index = integer(record.index, -1, -1, count - 1)
    if (index >= 0) byIndex.set(index, record)
  })
  return {
    version: 1,
    textureAsset: typeof value.textureAsset === 'string' ? value.textureAsset : null,
    tileWidth,
    tileHeight,
    columns,
    rows,
    tiles: Array.from({ length: count }, (_, index) => {
      const raw = byIndex.get(index)
      const collision = ['Box', 'Polygon', 'OneWay'].includes(String(raw?.collision)) ? raw!.collision as TileCollision2D : 'None'
      const polygon = normalizedPolygon(raw?.polygon)
      return {
        index,
        name: typeof raw?.name === 'string' ? raw.name.slice(0, 120) : `Tile ${index}`,
        collision,
        polygon: collision === 'Polygon' && polygon.length >= 3 ? polygon : [],
        terrain: typeof raw?.terrain === 'string' ? raw.terrain.slice(0, 80) : '',
        navigationCost: Math.min(1e6, Math.max(0, finiteNumber(raw?.navigationCost, 1))),
        occluder: raw?.occluder === true
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
  return updateTextAsset(assetUuid, JSON.stringify(normalizeTileSet(document), null, 2))
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
  component.layers = (rawLayers.length ? rawLayers : [{ id: crypto.randomUUID(), name: 'Base', visible: true, locked: false, opacity: 1, tiles: component.tiles }]).map((layer, index) => ({
    id: typeof layer.id === 'string' && layer.id ? layer.id.slice(0, 80) : `layer-${index}`,
    name: typeof layer.name === 'string' && layer.name.trim() ? layer.name.trim().slice(0, 80) : `Layer ${index + 1}`,
    visible: layer.visible !== false, locked: layer.locked === true,
    opacity: Math.min(1, Math.max(0, finiteNumber(layer.opacity, 1))),
    tiles: Array.from({ length: component.width * component.height }, (_, tile) => integer(layer.tiles?.[tile], -1, -1, MAX_TILESET_TILES - 1))
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
    layer.tiles = Array(component.width * component.height).fill(-1)
    for (let y = 0; y < Math.min(previousHeight, component.height); y++) for (let x = 0; x < Math.min(previousWidth, component.width); x++) layer.tiles[y * component.width + x] = previous[y * previousWidth + x]
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
  component.layers.push({ id: crypto.randomUUID(), name: name.slice(0, 80), visible: true, locked: false, opacity: 1, tiles: Array(component.width * component.height).fill(-1) })
  setActiveTileLayer(component, component.layers.length - 1); return component.activeLayer
}

export function duplicateTileLayer(component: TileMap2D): number {
  normalizeTileMap(component); const source = component.layers[component.activeLayer]
  if (component.layers.length >= 128) return component.activeLayer
  component.layers.splice(component.activeLayer + 1, 0, { ...source, id: crypto.randomUUID(), name: `${source.name} copy`.slice(0, 80), tiles: [...source.tiles] })
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
  const used = component.layers.flatMap(layer => layer.tiles).filter(tile => tile >= 0)
  return { collision: component.bakeCollision ? buildTileColliderDescriptors(component).length : 0, navigation: component.bakeNavigation && set ? used.filter(tile => (set.tiles[tile]?.navigationCost ?? 0) > 0).length : 0, occluders: component.bakeOccluders && set ? used.filter(tile => set.tiles[tile]?.occluder).length : 0, chunks: Math.ceil(component.width / component.chunkSize) * Math.ceil(component.height / component.chunkSize) * component.layers.length }
}

export function worldToTile(entity: Entity, component: TileMap2D, point: Vec2, entities: Entity[]): { x: number; y: number } | null {
  const local = worldPointToLocal(entity, point, entities)
  const x = Math.floor(local.x / component.tileSize.x + component.width * .5)
  const y = Math.floor(local.y / component.tileSize.y + component.height * .5)
  return x >= 0 && y >= 0 && x < component.width && y < component.height ? { x, y } : null
}

function tileIndex(component: TileMap2D, cell: { x: number; y: number }): number { return cell.y * component.width + cell.x }
function setTile(component: TileMap2D, cell: { x: number; y: number }, value: number): boolean {
  if (cell.x < 0 || cell.y < 0 || cell.x >= component.width || cell.y >= component.height) return false
  const index = tileIndex(component, cell)
  if (component.tiles[index] === value) return false
  if (component.layers[component.activeLayer]?.locked) return false
  component.tiles[index] = value
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
  if (stroke.changed) component.revision++
  return stroke.changed
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

function chunkCommand(entity: Entity, component: TileMap2D, layer: TileMap2D['layers'][number], tileSet: TileSetDocument, chunkX: number, chunkY: number, entities: Entity[]): TileChunkRenderCommand {
  const transform = worldTransform(entity, entities)
  const sprites: TileChunkRenderCommand['sprites'] = []
  const startX = chunkX * component.chunkSize, startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
    const value = layer.tiles[y * component.width + x]
    if (value < 0 || value >= tileSet.columns * tileSet.rows) continue
    const texture = resolveTextureRegion(tileSet.textureAsset, {
      x: value % tileSet.columns * tileSet.tileWidth,
      y: Math.floor(value / tileSet.columns) * tileSet.tileHeight,
      width: tileSet.tileWidth,
      height: tileSet.tileHeight
    }, component.filterMode)
    if (!texture) continue
    const local = { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y }
    sprites.push({
      position: localPointToWorld(entity, local, entities), rotation: transform.rotation, scale: transform.scale,
      size: { ...component.tileSize }, pivot: { x: .5, y: .5 }, flipX: false, flipY: false,
      tint: { ...component.tint, a: component.opacity / 100 * layer.opacity }, texture
    })
  }
  return { sprites, sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer + component.layers.indexOf(layer), material: component.material }
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
  visibleBounds?: { minX: number; minY: number; maxX: number; maxY: number }
): TileChunkRenderCommand[] {
  if (!component.enabled || component.removed || !component.tileSetAsset) return []
  normalizeTileMap(component)
  const tileSet = readTileSet(component.tileSetAsset)
  const asset = resolveAsset(component.tileSetAsset)
  if (!tileSet || !asset) return []
  const transform = worldTransform(entity, entities)
  const signature = [component.width, component.height, component.chunkSize, component.tileSize.x, component.tileSize.y, component.tileSetAsset, asset.sourceModified, transform.position.x, transform.position.y, transform.rotation, transform.scale.x, transform.scale.y, component.tint.r, component.tint.g, component.tint.b, component.opacity, component.filterMode, component.sortingLayer, component.orderInLayer, component.material, component.revision, ...component.layers.map(layer => `${layer.id}:${layer.visible}:${layer.opacity}`)].join(':')
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
      command = chunkCommand(entity, component, layer, tileSet, x, y, entities)
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

/** Greedily merges adjacent box tiles and horizontal one-way runs. */
export function buildTileColliderDescriptors(component: TileMap2D): TileColliderDescriptor[] {
  if (!component.bakeCollision) return []
  const tileSet = readTileSet(component.tileSetAsset)
  if (!tileSet) return []
  normalizeTileMap(component)
  const collisionLayers = component.layers.filter(layer => layer.visible).map(layer => layer.tiles)
  const collision = (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const kind = tileSet.tiles[collisionLayers[index][y * component.width + x]]?.collision ?? 'None'
      if (kind !== 'None') return kind
    }
    return 'None' as TileCollision2D
  }
  const definitionAt = (x: number, y: number) => {
    for (let index = collisionLayers.length - 1; index >= 0; index--) {
      const definition = tileSet.tiles[collisionLayers[index][y * component.width + x]]
      if (definition?.collision !== 'None') return definition
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
    if (kind === 'Polygon') {
      visited[index] = 1
      const definition = definitionAt(x, y)
      const polygon = definition?.polygon.length && definition.polygon.length <= 4 ? definition.polygon : [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
      result.push({
        center: { x: (x + .5 - component.width * .5) * component.tileSize.x, y: (y + .5 - component.height * .5) * component.tileSize.y },
        size: { ...component.tileSize }, oneWay: false,
        vertices: polygon.map(point => ({ x: (point.x - .5) * component.tileSize.x, y: (point.y - .5) * component.tileSize.y }))
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
