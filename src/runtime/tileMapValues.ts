/** Original TileMap value normalization; cache ownership stays at its existing service. */
import { finiteNumber } from '../world/geometry'
import type { TileBlendMode2D, TileCellTransform2D, TileMap2D } from '../world/components'


export const MAX_TILESET_TILES = 65_536
export const MAX_TILEMAP_CELLS = 4_194_304

/* 调用 Math.round(Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback)))) 并返回调用结果。 */ export function integer(value: unknown, fallback: number, minimum: number, maximum: number): number {
  return Math.round(Math.min(maximum, Math.max(minimum, finiteNumber(value, fallback))))
}

/** 结构说明（自动提取）：normalizeTileMap；输入 component；直接调用 integer、Math.min、Math.floor、Math.max、Math.abs 等；写入 component.width、component.height、component.tileSize、component.chunkSize 等。 */ export function normalizeTileMap(component: TileMap2D): void {
  component.width = integer(component.width, 32, 1, 2048)
  component.height = integer(component.height, 18, 1, Math.min(2048, Math.floor(MAX_TILEMAP_CELLS / component.width)))
  component.tileSize = {
    x: Math.min(1e6, Math.max(1e-6, Math.abs(finiteNumber(component.tileSize?.x, 1)))),
    y: Math.min(1e6, Math.max(1e-6, Math.abs(finiteNumber(component.tileSize?.y, 1))))
  }
  component.chunkSize = integer(component.chunkSize, 32, 4, 128)
  component.terrainRulesAsset = typeof component.terrainRulesAsset === 'string' && component.terrainRulesAsset ? component.terrainRulesAsset.slice(0, 512) : null
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
