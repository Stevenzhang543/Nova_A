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
        polygon: collision === 'Polygon' && polygon.length >= 3 ? polygon : []
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
  component.opacity = Math.min(100, Math.max(0, finiteNumber(component.opacity, 100)))
  component.sortingLayer = integer(component.sortingLayer, 0, -1_000_000, 1_000_000)
  component.orderInLayer = integer(component.orderInLayer, 0, -1_000_000, 1_000_000)
  component.physicsLayer = integer(component.physicsLayer, 0, 0, 31)
  component.collisionMask = Math.min(0xffff_ffff, Math.max(0, Math.round(finiteNumber(component.collisionMask, 1)))) >>> 0
  if (component.filterMode !== 'Linear') component.filterMode = 'Nearest'
}

export function resizeTileMap(component: TileMap2D, width: number, height: number): void {
  const previous = [...component.tiles]
  const previousWidth = component.width
  const previousHeight = component.height
  component.width = integer(width, component.width, 1, 2048)
  component.height = integer(height, component.height, 1, Math.min(2048, Math.floor(MAX_TILEMAP_CELLS / component.width)))
  component.tiles = Array(component.width * component.height).fill(-1)
  for (let y = 0; y < Math.min(previousHeight, component.height); y++) {
    for (let x = 0; x < Math.min(previousWidth, component.width); x++) component.tiles[y * component.width + x] = previous[y * previousWidth + x]
  }
  component.revision++
  invalidateTileMap(component)
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
  component.tiles[index] = value
  markTileDirty(component, cell.x, cell.y)
  return true
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
  else if (tilemapEditorState.tool === 'brush') stroke.changed = setTile(component, cell, tilemapEditorState.tileIndex)
  else if (tilemapEditorState.tool === 'eraser') stroke.changed = setTile(component, cell, -1)
  else if (tilemapEditorState.tool === 'selection') tilemapEditorState.selection = { start: { ...cell }, end: { ...cell } }
  return stroke
}

export function continueTileStroke(component: TileMap2D, stroke: TileStroke, cell: { x: number; y: number }): void {
  if (tilemapEditorState.tool === 'brush' || tilemapEditorState.tool === 'eraser') {
    const value = tilemapEditorState.tool === 'eraser' ? -1 : tilemapEditorState.tileIndex
    for (const point of rasterLine(stroke.previous, cell)) stroke.changed = setTile(component, point, value) || stroke.changed
  } else if (tilemapEditorState.tool === 'selection' && tilemapEditorState.selection) tilemapEditorState.selection.end = { ...cell }
  stroke.previous = { ...cell }
}

export function endTileStroke(component: TileMap2D, stroke: TileStroke, cell: { x: number; y: number }): boolean {
  if (tilemapEditorState.tool === 'rectangle') {
    const left = Math.min(stroke.start.x, cell.x), right = Math.max(stroke.start.x, cell.x)
    const bottom = Math.min(stroke.start.y, cell.y), top = Math.max(stroke.start.y, cell.y)
    for (let y = bottom; y <= top; y++) for (let x = left; x <= right; x++) stroke.changed = setTile(component, { x, y }, tilemapEditorState.tileIndex) || stroke.changed
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

function markTileDirty(component: TileMap2D, x: number, y: number): void { chunkCaches.get(component)?.dirty.add(chunkKey(component, x, y)) }
export function invalidateTileMap(component: TileMap2D): void { chunkCaches.delete(component) }

function chunkCommand(entity: Entity, component: TileMap2D, tileSet: TileSetDocument, chunkX: number, chunkY: number, entities: Entity[]): TileChunkRenderCommand {
  const transform = worldTransform(entity, entities)
  const sprites: TileChunkRenderCommand['sprites'] = []
  const startX = chunkX * component.chunkSize, startY = chunkY * component.chunkSize
  const endX = Math.min(component.width, startX + component.chunkSize), endY = Math.min(component.height, startY + component.chunkSize)
  for (let y = startY; y < endY; y++) for (let x = startX; x < endX; x++) {
    const value = component.tiles[y * component.width + x]
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
      tint: { ...component.tint, a: component.opacity / 100 }, texture
    })
  }
  return { sprites, sortingLayer: component.sortingLayer, orderInLayer: component.orderInLayer, material: component.material }
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
  const tileSet = readTileSet(component.tileSetAsset)
  const asset = resolveAsset(component.tileSetAsset)
  if (!tileSet || !asset) return []
  const transform = worldTransform(entity, entities)
  const signature = [component.width, component.height, component.chunkSize, component.tileSize.x, component.tileSize.y, component.tileSetAsset, asset.sourceModified, transform.position.x, transform.position.y, transform.rotation, transform.scale.x, transform.scale.y, component.tint.r, component.tint.g, component.tint.b, component.opacity, component.filterMode, component.sortingLayer, component.orderInLayer, component.material].join(':')
  let cache = chunkCaches.get(component)
  if (!cache || cache.signature !== signature) {
    cache = { signature, chunks: new Map(), dirty: new Set() }
    chunkCaches.set(component, cache)
  }
  const columns = Math.ceil(component.width / component.chunkSize), rows = Math.ceil(component.height / component.chunkSize)
  const commands: TileChunkRenderCommand[] = []
  for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
    // Cull at chunk granularity before generating or walking any tile sprites.
    if (visibleBounds && !chunkIntersectsBounds(entity, component, x, y, entities, visibleBounds)) continue
    const key = `${x}:${y}`
    let command = cache.chunks.get(key)
    if (!command || cache.dirty.has(key)) {
      command = chunkCommand(entity, component, tileSet, x, y, entities)
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
  const tileSet = readTileSet(component.tileSetAsset)
  if (!tileSet) return []
  const collision = (x: number, y: number) => tileSet.tiles[component.tiles[y * component.width + x]]?.collision ?? 'None'
  const visited = new Uint8Array(component.width * component.height)
  const result: TileColliderDescriptor[] = []
  for (let y = 0; y < component.height; y++) for (let x = 0; x < component.width; x++) {
    const index = y * component.width + x
    if (visited[index]) continue
    const kind = collision(x, y)
    if (kind === 'None') { visited[index] = 1; continue }
    if (kind === 'Polygon') {
      visited[index] = 1
      const definition = tileSet.tiles[component.tiles[index]]
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
