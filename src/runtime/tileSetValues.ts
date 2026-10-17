/** Original unique TileSet declarations and normalization; no catalog or UI owner. */
import {integer,MAX_TILESET_TILES} from './tileMapValues'
import {finiteNumber} from '../world/geometry'
import type {TileCollision2D} from '../world/components'
import type {Vec2} from '../world/types'


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
