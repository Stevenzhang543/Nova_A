/** 二维寻路运行：建立导航数据并执行路径、流场及代理移动相关计算。 */
import type { Entity } from '../world/Entity'
import type { NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldPointToLocal, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { createTileNavigationSampler, navigationShapes, navigationShapeOutline, shapeDistance, shapeSegmentDistance, polygonContainsSegment, segmentDistance, type NavigationShape } from './navigationGeometry'
import { reactive } from 'vue'
import { performanceRuntimeSettings, performanceRuntimeState, SpatialHash2D } from './largeWorldPerformance'

const MAX_GRID_CELLS = 262_144
const EPSILON = 1e-9
export const MAX_NAVIGATION_AGENTS = 10_000
export const MAX_NAVIGATION_REPATHS_PER_TICK = 256
export const MAX_NAVIGATION_AVOIDANCE_NEIGHBORS = 32

interface NavigationGrid {
  regionUuid: string
  clearance: number
  revision: string
  width: number
  height: number
  cellSize: number
  min: Vec2
  blocked: Uint8Array
  costs: Float64Array
  traversalCost: number
  minimumCost: number
  builtAt: number
}

export interface NavigationDebugPath { entityUuid: string; points: Vec2[]; status: 'Ready' | 'Unreachable' }
export const navigationDebugPaths = new Map<string, NavigationDebugPath>()
const grids = new Map<string, NavigationGrid>()
const nextRepath = new Map<string, number>()
const pathRevisions = new Map<string, string>()
let flowFields = new WeakMap<NavigationGrid, Map<string, { costs: Float64Array; next: Int32Array }>>()
let repathCursor = 0
let bakeController: AbortController | null = null
export const navigationBakeState = reactive({
  active: false,
  cancelled: false,
  progress: 0,
  regions: 0,
  cells: 0,
  artifactHash: '',
  error: ''
})
/** 返回实际缓存规模，供流送诊断和生命周期验证使用，不暴露可修改集合。 */
export function inspectNavigationCache(){return {grids:grids.size,repathSchedules:nextRepath.size,pathRevisions:pathRevisions.size,debugPaths:navigationDebugPaths.size}}
export const navigationProfile = {
  bakeCount: 0,
  pathQueries: 0,
  failedQueries: 0,
  lastBakeMilliseconds: 0,
  lastQueryMilliseconds: 0,
  maximumQueryMilliseconds: 0,
  bakedCells: 0,
  activeAgents: 0,
  avoidancePairs: 0,
  deferredRepaths: 0,
  droppedAgents: 0,
  maximumNeighbors: 0
}

/** 结构说明（自动提取）：pointInPolygon；输入 point、polygon；写入 previous、inside；返回路径包含 inside；包含循环处理。 */ function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

interface NavigationInputs {
  signature: string; polygon: Vec2[]; shapes: NavigationShape[]; clearance: number
  tile: ReturnType<typeof createTileNavigationSampler>; cost(point: Vec2): number
}
/* 计算表达式 uuid + ':' + radius 并返回结果，沿用操作数的原有类型规则。 */ function gridKey(uuid: string, radius: number): string { return uuid + ':' + radius }
/** 结构说明（自动提取）：captureNavigationInputs；输入 regionEntity、entities、radius；直接调用 regionEntity.getComponent、Math.max、finiteNumber、worldTransform、region.polygon.map 等；包含显式抛错路径。 */ function captureNavigationInputs(regionEntity: Entity, entities: Entity[], radius?: number): NavigationInputs {
  const region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')!
  const clearance = Math.max(0, finiteNumber(radius, region.agentRadius)), transform = worldTransform(regionEntity, entities)
  const polygon = region.polygon.map(/* 调用 localPointToWorld(regionEntity, point, entities) 并返回调用结果。 */ point => localPointToWorld(regionEntity, point, entities)), shapes = navigationShapes(regionEntity, region, entities), tile = createTileNavigationSampler(region, entities)
  if (polygon.length > 4096 || polygon.some(/* 先计算 !Number.isFinite(point.x + point.y) || Math.abs(point.x) > 1e12；仅当其为假值时求右侧 Math.abs(point.y) > 1e12，返回短路求值结果。 */ point => !Number.isFinite(point.x + point.y) || Math.abs(point.x) > 1e12 || Math.abs(point.y) > 1e12)) throw new Error('NAVIGATION_GEOMETRY: region requires at most 4096 finite vertices within world bounds.')
  const areas = JSON.parse(JSON.stringify(region.costAreas)) as NavigationRegion2D['costAreas'], layer = region.navigationLayer
  const cost = /** 结构说明（自动提取）：cost；输入 point；直接调用 Math.cos、Math.sin、finiteNumber、Math.max、Math.abs 等；写入 value；返回路径包含 value；包含循环处理。 */ (point: Vec2) => {
    const dx = point.x - transform.position.x, dy = point.y - transform.position.y
    const local = { x: (dx * Math.cos(transform.rotation) + dy * Math.sin(transform.rotation)) / transform.scale.x, y: (-dx * Math.sin(transform.rotation) + dy * Math.cos(transform.rotation)) / transform.scale.y }
    let value = 1
    for (const area of areas) {
      if (!area.enabled || area.navigationLayer !== layer) continue
      const x = local.x - finiteNumber(area.center.x), y = local.y - finiteNumber(area.center.y)
      if (area.shape === 'Circle' ? x * x + y * y <= Math.max(.001, finiteNumber(area.radius, 1)) ** 2 : Math.abs(x) <= Math.max(.001, finiteNumber(area.size.x, 1)) / 2 && Math.abs(y) <= Math.max(.001, finiteNumber(area.size.y, 1)) / 2) value = Math.min(1e12, Math.max(1e-12, value * Math.min(1000, Math.max(.001, finiteNumber(area.multiplier, 1)))))
    }
    return value
  }
  return { signature: JSON.stringify([regionEntity.enabled, entities.includes(regionEntity), region.enabled, region.polygon, region.cellSize, region.agentRadius, clearance, region.navigationLayer, region.navigationMask, region.navigationMode, region.algorithm, region.allowDiagonal, region.traversalCost, region.source, region.sourceEntityUuid, region.clusterSize, region.links, areas, transform, shapes, tile.signature]), polygon, shapes, clearance, tile, cost }
}
/** 结构说明（自动提取）：navigationCostMultiplier；输入 regionEntity、region、point、entities；直接调用 worldPointToLocal、finiteNumber、Math.max、Math.abs、Math.min；写入 multiplier；返回路径包含 multiplier；包含循环处理。 */ function navigationCostMultiplier(regionEntity: Entity, region: NavigationRegion2D, point: Vec2, entities: Entity[]): number {
  const local = worldPointToLocal(regionEntity, point, entities)
  let multiplier = 1
  for (const area of region.costAreas ?? []) {
    if (!area.enabled || area.navigationLayer !== region.navigationLayer) continue
    const dx = local.x - finiteNumber(area.center?.x), dy = local.y - finiteNumber(area.center?.y)
    const inside = area.shape === 'Circle' ? dx * dx + dy * dy <= Math.max(.001, finiteNumber(area.radius, 1)) ** 2 : Math.abs(dx) <= Math.max(.001, finiteNumber(area.size?.x, 1)) * .5 && Math.abs(dy) <= Math.max(.001, finiteNumber(area.size?.y, 1)) * .5
    if (inside) multiplier = Math.min(1e12, Math.max(1e-12, multiplier * Math.min(1000, Math.max(.001, finiteNumber(area.multiplier, 1)))))
  }
  return multiplier
}
interface NavigationBakeContext {
  regionEntity: Entity; region: NavigationRegion2D; entities: Entity[]; inputs: NavigationInputs
  min: Vec2; width: number; height: number; cellSize: number; blocked: Uint8Array; costs: Float64Array; now: number; started: number
}
/** 结构说明（自动提取）：prepareNavigationBake；输入 regionEntity、entities、now、radius、captured；直接调用 performance.now、regionEntity.getComponent、captureNavigationInputs、Math.min、polygon.map 等；写入 cellSize、width、height；包含循环处理；包含显式抛错路径。 */ function prepareNavigationBake(regionEntity: Entity, entities: Entity[], now: number, radius?: number, captured?: NavigationInputs): NavigationBakeContext | null {
  const started = performance.now(), region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')
  if (!regionEntity.enabled || !region?.enabled || !(region.navigationMask & (1 << ((region.navigationLayer - 1) & 31))) || region.polygon.length < 3) return null
  const inputs = captured ?? captureNavigationInputs(regionEntity, entities, radius), polygon = inputs.polygon
  const min = { x: Math.min(...polygon.map(/* 返回 point.x 的当前值。 */ point => point.x)), y: Math.min(...polygon.map(/* 返回 point.y 的当前值。 */ point => point.y)) }, max = { x: Math.max(...polygon.map(/* 返回 point.x 的当前值。 */ point => point.x)), y: Math.max(...polygon.map(/* 返回 point.y 的当前值。 */ point => point.y)) }
  let cellSize = Math.min(1e12, Math.max(.01, Math.abs(finiteNumber(region.cellSize, .5))))
  let width = Math.max(1, Math.ceil((max.x - min.x) / cellSize)), height = Math.max(1, Math.ceil((max.y - min.y) / cellSize))
  for (let attempt = 0; width * height > MAX_GRID_CELLS && attempt < 64; attempt++) {
    cellSize *= Math.max(1.01, Math.sqrt(width * height / MAX_GRID_CELLS), width / MAX_GRID_CELLS, height / MAX_GRID_CELLS)
    width = Math.max(1, Math.ceil((max.x - min.x) / cellSize)); height = Math.max(1, Math.ceil((max.y - min.y) / cellSize))
  }
  if (!Number.isSafeInteger(width * height) || width * height > MAX_GRID_CELLS || width * height * Math.max(1, inputs.shapes.length) > 64_000_000) throw new Error('NAVIGATION_LIMIT: bake exceeds the bounded grid/obstacle work budget; increase cell size or split the region.')
  return { regionEntity, region, entities, inputs, min, width, height, cellSize, blocked: new Uint8Array(width * height), costs: new Float64Array(width * height), now, started }
}
/** 结构说明（自动提取）：sampleNavigationRow；输入 context、y；直接调用 inputs.tile.sample、inputs.polygon.reduce、pointInPolygon、inputs.shapes.some、Math.min 等；写入 blocked[…]、costs[…]；包含循环处理。 */ function sampleNavigationRow(context: NavigationBakeContext, y: number): void {
  const { inputs, min, width, cellSize, blocked, costs } = context
  for (let x = 0; x < width; x++) {
    const point = { x: min.x + (x + .5) * cellSize, y: min.y + (y + .5) * cellSize }, tile = inputs.tile.sample(point), index = y * width + x
    const boundaryDistance = inputs.polygon.reduce(/* 调用 Math.min(distance, segmentDistance(point, first, inputs.polygon[(index + 1) % inputs.polygon.length])) 并返回调用结果。 */ (distance, first, index) => Math.min(distance, segmentDistance(point, first, inputs.polygon[(index + 1) % inputs.polygon.length])), Infinity)
    blocked[index] = pointInPolygon(point, inputs.polygon) && boundaryDistance + 1e-9 >= inputs.clearance && !inputs.shapes.some(/* 比较 shapeDistance(point, shape) 与 inputs.clearance + cellSize * Math.SQRT1_2，返回小于或等于的判断结果。 */ shape => shapeDistance(point, shape) <= inputs.clearance + cellSize * Math.SQRT1_2) && !tile?.blocked ? 0 : 1
    costs[index] = Math.min(1e12, Math.max(1e-12, (tile?.cost ?? 1) * inputs.cost(point)))
  }
}
/** 结构说明（自动提取）：publishNavigationGrid；输入 regionEntity、grid；直接调用 gridKey、grids.delete、reduce、grids.values、next 等；写入 cells、navigationProfile.bakedCells；包含循环处理。 */ function publishNavigationGrid(regionEntity: Entity, grid: NavigationGrid): void {
  const key = gridKey(regionEntity.uuid, grid.clearance)
  grids.delete(key)
  // Bounded cache across agent radii and regions; eviction never changes a published path.
  let cells = [...grids.values()].reduce(/* 计算表达式 sum + value.blocked.length 并返回结果，沿用操作数的原有类型规则。 */ (sum, value) => sum + value.blocked.length, 0)
  while (grids.size && (grids.size >= 64 || cells + grid.blocked.length > 4_194_304)) { const key = grids.keys().next().value!; cells -= grids.get(key)!.blocked.length; grids.delete(key) }
  grids.set(key, grid); regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')!.bakedRevision++; navigationProfile.bakeCount++; navigationProfile.bakedCells = grid.blocked.length
}
/** 结构说明（自动提取）：finishNavigationBake；输入 context、publish；直接调用 captureNavigationInputs、Error、Uint32Array、distances.fill、Math.min 等；写入 distances[…]、blocked[…]、minimumCost、navigationProfile.lastBakeMilliseconds；返回路径包含 grid；包含循环处理；包含显式抛错路径。 */ function finishNavigationBake(context: NavigationBakeContext, publish = true): NavigationGrid {
  const { regionEntity, region, entities, inputs, min, width, height, cellSize, blocked, costs, now, started } = context
  if (captureNavigationInputs(regionEntity, entities, inputs.clearance).signature !== inputs.signature) throw new Error('NAVIGATION_STALE: sources changed during baking; the previous artifact is preserved. Bake again.')
  if (region.source === 'TileMap' && inputs.clearance > 0) {
    // Chebyshev dilation is conservative for world-space circular clearance and linear in grid cells.
    const distances = new Uint32Array(blocked.length); distances.fill(0x3fffffff)
    for (let index = 0; index < blocked.length; index++) if (blocked[index]) distances[index] = 0
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) { const i = y * width + x; if (x) distances[i] = Math.min(distances[i], distances[i - 1] + 1); if (y) { distances[i] = Math.min(distances[i], distances[i - width] + 1); if (x) distances[i] = Math.min(distances[i], distances[i - width - 1] + 1); if (x + 1 < width) distances[i] = Math.min(distances[i], distances[i - width + 1] + 1) } }
    for (let y = height - 1; y >= 0; y--) for (let x = width - 1; x >= 0; x--) { const i = y * width + x; if (x + 1 < width) distances[i] = Math.min(distances[i], distances[i + 1] + 1); if (y + 1 < height) { distances[i] = Math.min(distances[i], distances[i + width] + 1); if (x) distances[i] = Math.min(distances[i], distances[i + width - 1] + 1); if (x + 1 < width) distances[i] = Math.min(distances[i], distances[i + width + 1] + 1) } }
    const clearanceCells = Math.ceil(inputs.clearance / cellSize + Math.SQRT1_2)
    for (let index = 0; index < blocked.length; index++) if (distances[index] <= clearanceCells) blocked[index] = 1
  }
  let minimumCost = Infinity
  for (let index = 0; index < costs.length; index++) if (!blocked[index] && costs[index] < minimumCost) minimumCost = costs[index]
  const grid = { regionUuid: regionEntity.uuid, clearance: inputs.clearance, revision: inputs.signature, width, height, cellSize, min, blocked, costs, traversalCost: Math.max(.001, finiteNumber(region.traversalCost, 1)), minimumCost: Number.isFinite(minimumCost) ? Math.max(1e-12, minimumCost) : 1, builtAt: now }
  if (publish) publishNavigationGrid(regionEntity, grid)
  navigationProfile.lastBakeMilliseconds = performance.now() - started
  return grid
}
/** 结构说明（自动提取）：bakeNavigationGrid；输入 regionEntity、entities、now、radius；直接调用 prepareNavigationBake、sampleNavigationRow、finishNavigationBake；包含循环处理。 */ export function bakeNavigationGrid(regionEntity: Entity, entities: Entity[], now = performance.now(), radius?: number): NavigationGrid | null {
  const context = prepareNavigationBake(regionEntity, entities, now, radius)
  if (!context) return null
  for (let y = 0; y < context.height; y++) sampleNavigationRow(context, y)
  return finishNavigationBake(context)
}
/** 结构说明（自动提取）：bakeNavigationGridCancellable；输入 regionEntity、entities、signal、onProgress；直接调用 prepareNavigationBake、performance.now、sampleNavigationRow、Math.max、onProgress 等；写入 sliceStarted；包含循环处理；等待异步结果。 */ async function bakeNavigationGridCancellable(regionEntity: Entity, entities: Entity[], signal: AbortSignal, onProgress: (progress: number) => void): Promise<NavigationGrid | null> {
  const context = prepareNavigationBake(regionEntity, entities, performance.now())
  if (!context) return null
  let sliceStarted = performance.now()
  for (let y = 0; y < context.height; y++) {
    if (signal.aborted) return null
    sampleNavigationRow(context, y)
    if (performance.now() - sliceStarted >= Math.max(.25, performanceRuntimeSettings.frameWorkBudgetMs)) { onProgress((y + 1) / context.height); await new Promise<void>(/* 调用 setTimeout(resolve, 0) 并返回调用结果。 */ resolve => setTimeout(resolve, 0)); sliceStarted = performance.now() }
  }
  if (signal.aborted) return null
  onProgress(1)
  return finishNavigationBake(context, false)
}

/** 结构说明（自动提取）：cell；输入 grid、point；直接调用 Math.max、Math.min、Math.floor。 */ function cell(grid: NavigationGrid, point: Vec2): number {
  const x = Math.max(0, Math.min(grid.width - 1, Math.floor((point.x - grid.min.x) / grid.cellSize)))
  const y = Math.max(0, Math.min(grid.height - 1, Math.floor((point.y - grid.min.y) / grid.cellSize)))
  return y * grid.width + x
}

/** 构造并返回记录 { x: grid.min.x + (index % grid.width + .5) * grid.cellSize, y: grid.min.y + (Math.floor(index / grid.width) + .5) * grid.cellSize }，字段按当前实参及捕获状态求值。 */ function worldPoint(grid: NavigationGrid, index: number): Vec2 {
  return { x: grid.min.x + (index % grid.width + .5) * grid.cellSize, y: grid.min.y + (Math.floor(index / grid.width) + .5) * grid.cellSize }
}

/** 结构说明（自动提取）：neighbors；输入 grid、index、diagonal；直接调用 Math.floor、offsets.flatMap。 */ function neighbors(grid: NavigationGrid, index: number, diagonal: boolean): number[] {
  const x = index % grid.width, y = Math.floor(index / grid.width)
  const offsets = diagonal ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]
  return offsets.flatMap(/** 结构说明（自动提取）：offsets.flatMap 回调；输入 [dx, dy]。 */ ([dx, dy]) => {
    const nx = x + dx, ny = y + dy
    if (nx < 0 || ny < 0 || nx >= grid.width || ny >= grid.height) return []
    const next = ny * grid.width + nx
    if (grid.blocked[next]) return []
    if (dx !== 0 && dy !== 0 && (grid.blocked[y * grid.width + nx] || grid.blocked[ny * grid.width + x])) return []
    return [next]
  })
}

class MinHeap {
  private values: Array<{ index: number; score: number }> = []
  /* 返回 this.values.length 的当前值。 */ get length(): number { return this.values.length }
  /** 结构说明（自动提取）：push；输入 value；直接调用 values.push、Math.floor；写入 values[…]、index；包含循环处理。 */ push(value: { index: number; score: number }): void {
    this.values.push(value); let index = this.values.length - 1
    while (index > 0) { const parent = Math.floor((index - 1) / 2); if (this.values[parent].score <= value.score) break; this.values[index] = this.values[parent]; index = parent }
    this.values[index] = value
  }
  /** 结构说明（自动提取）：pop；无显式参数；直接调用 values.pop；写入 values[…]、index；返回路径包含 first；包含循环处理。 */ pop(): { index: number; score: number } | undefined {
    const first = this.values[0], last = this.values.pop(); if (!last || !this.values.length) return first
    let index = 0
    while (true) { const left = index * 2 + 1, right = left + 1; if (left >= this.values.length) break; const child = right < this.values.length && this.values[right].score < this.values[left].score ? right : left; if (this.values[child].score >= last.score) break; this.values[index] = this.values[child]; index = child }
    this.values[index] = last; return first
  }
}

/** 结构说明（自动提取）：reconstruct；输入 grid、cameFrom、goal、startPoint、goalPoint；直接调用 cells.push、cells.reverse、map、cells.slice；包含循环处理。 */ function reconstruct(grid: NavigationGrid, cameFrom: Int32Array, goal: number, startPoint: Vec2, goalPoint: Vec2): Vec2[] {
  const cells: number[] = [goal]
  while (cameFrom[cells[cells.length - 1]] >= 0) cells.push(cameFrom[cells[cells.length - 1]])
  cells.reverse()
  return [{ ...startPoint }, ...cells.slice(1, -1).map(/* 调用 worldPoint(grid, index) 并返回调用结果。 */ index => worldPoint(grid, index)), { ...goalPoint }]
}

/** 结构说明（自动提取）：aStar；输入 grid、startPoint、goalPoint、diagonal、allowed；直接调用 cell、Float64Array、scores.fill、Int32Array、cameFrom.fill 等；写入 scores[…]、cameFrom[…]；包含循环处理。 */ function aStar(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean, allowed?: Set<number>): Vec2[] {
  const start = cell(grid, startPoint), goal = cell(grid, goalPoint)
  if (grid.blocked[start] || grid.blocked[goal]) return []
  const scores = new Float64Array(grid.blocked.length); scores.fill(Number.POSITIVE_INFINITY); scores[start] = 0
  const cameFrom = new Int32Array(grid.blocked.length); cameFrom.fill(-1)
  const open = new MinHeap(); open.push({ index: start, score: 0 })
  const goalX = goal % grid.width, goalY = Math.floor(goal / grid.width)
  while (open.length) {
    const current = open.pop()!.index
    if (current === goal) return reconstruct(grid, cameFrom, goal, startPoint, goalPoint)
    const cx = current % grid.width, cy = Math.floor(current / grid.width)
    for (const next of neighbors(grid, current, diagonal)) {
      if (allowed && next !== goal && next !== start && !allowed.has(next)) continue
      const nx = next % grid.width, ny = Math.floor(next / grid.width)
      const tentative = scores[current] + Math.hypot(nx - cx, ny - cy) * grid.cellSize * grid.traversalCost * grid.costs[next]
      if (tentative >= scores[next]) continue
      scores[next] = tentative; cameFrom[next] = current
      open.push({ index: next, score: tentative + Math.hypot(goalX - nx, goalY - ny) * grid.cellSize * grid.traversalCost * grid.minimumCost })
    }
  }
  return []
}

/** 结构说明（自动提取）：hierarchicalAStar；输入 grid、startPoint、goalPoint、diagonal、requestedClusterSize；直接调用 Math.max、Math.min、Math.round、finiteNumber、Math.ceil 等；写入 totalCost、coarseBlocked[…]、coarseCosts[…]；包含循环处理。 */ function hierarchicalAStar(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean, requestedClusterSize: number): Vec2[] {
  const clusterSize = Math.max(4, Math.min(64, Math.round(finiteNumber(requestedClusterSize, 16))))
  const coarseWidth = Math.ceil(grid.width / clusterSize), coarseHeight = Math.ceil(grid.height / clusterSize)
  if (coarseWidth * coarseHeight <= 4) return aStar(grid, startPoint, goalPoint, diagonal)
  const coarseBlocked = new Uint8Array(coarseWidth * coarseHeight), coarseCosts = new Float64Array(coarseBlocked.length)
  for (let cy = 0; cy < coarseHeight; cy++) for (let cx = 0; cx < coarseWidth; cx++) {
    let openCells = 0, totalCost = 0
    for (let y = cy * clusterSize; y < Math.min(grid.height, (cy + 1) * clusterSize); y++) for (let x = cx * clusterSize; x < Math.min(grid.width, (cx + 1) * clusterSize); x++) {
      const index = y * grid.width + x
      if (!grid.blocked[index]) { openCells++; totalCost += grid.costs[index] }
    }
    const index = cy * coarseWidth + cx
    coarseBlocked[index] = openCells ? 0 : 1
    coarseCosts[index] = openCells ? totalCost / openCells : 1
  }
  const coarse: NavigationGrid = { ...grid, width: coarseWidth, height: coarseHeight, cellSize: grid.cellSize * clusterSize, blocked: coarseBlocked, costs: coarseCosts }
  const coarsePath = aStar(coarse, startPoint, goalPoint, diagonal)
  if (!coarsePath.length) return []
  const corridorClusters = new Set<number>()
  for (const point of coarsePath) {
    const base = cell(coarse, point), bx = base % coarseWidth, by = Math.floor(base / coarseWidth)
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const x = bx + dx, y = by + dy
      if (x >= 0 && y >= 0 && x < coarseWidth && y < coarseHeight) corridorClusters.add(y * coarseWidth + x)
    }
  }
  const allowed = new Set<number>()
  for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) {
    if (corridorClusters.has(Math.floor(y / clusterSize) * coarseWidth + Math.floor(x / clusterSize))) allowed.add(y * grid.width + x)
  }
  const constrained = aStar(grid, startPoint, goalPoint, diagonal, allowed)
  return constrained.length ? constrained : aStar(grid, startPoint, goalPoint, diagonal)
}

/** 结构说明（自动提取）：gridPathWithLinks；输入 grid、regionEntity、region、start、goal、entities；直接调用 region.links.filter、hierarchicalAStar、flowFieldPath、aStar、Error 等；写入 scores[…]；返回路径包含 path；包含循环处理；包含显式抛错路径。 */ function gridPathWithLinks(grid: NavigationGrid, regionEntity: Entity, region: NavigationRegion2D, start: Vec2, goal: Vec2, entities: Entity[]): Vec2[] {
  const links = region.links.filter(/* 返回 link.enabled 的当前值。 */ link => link.enabled)
  if (!links.length) return region.algorithm === 'HierarchicalAStar' ? hierarchicalAStar(grid, start, goal, region.allowDiagonal, region.clusterSize) : region.algorithm === 'FlowField' ? flowFieldPath(grid, start, goal, region.allowDiagonal) : aStar(grid, start, goal, region.allowDiagonal)
  if (links.length > 128) throw new Error('NAVIGATION_LIMIT: at most 128 enabled links per region are supported.')
  const startCell = cell(grid, start), goalCell = cell(grid, goal)
  if (grid.blocked[startCell] || grid.blocked[goalCell]) return []
  type PortalEdge = { destination: number; cost: number; entry: Vec2; exit: Vec2 }
  const portals = new Map<number, PortalEdge[]>(), polygon = region.polygon.map(/* 调用 localPointToWorld(regionEntity, point, entities) 并返回调用结果。 */ point => localPointToWorld(regionEntity, point, entities))
  const add = /** 结构说明（自动提取）：add；输入 entry、exit、cost；直接调用 pointInOrOnPolygon、cell、portals.set、portals.get、Math.hypot 等。 */ (entry: Vec2, exit: Vec2, cost: number) => {
    if (!pointInOrOnPolygon(entry, polygon) || !pointInOrOnPolygon(exit, polygon)) return
    const source = cell(grid, entry), destination = cell(grid, exit)
    if (grid.blocked[source] || grid.blocked[destination]) return
    portals.set(source, [...(portals.get(source) ?? []), { destination, entry, exit, cost: Math.hypot(entry.x - exit.x, entry.y - exit.y) * Math.max(.001, finiteNumber(cost, 1)) }])
  }
  for (const link of links) { const entry = localPointToWorld(regionEntity, link.start, entities), exit = localPointToWorld(regionEntity, link.end, entities); add(entry, exit, link.cost); if (link.bidirectional) add(exit, entry, link.cost) }
  const scores = new Float64Array(grid.blocked.length); scores.fill(Infinity); scores[startCell] = 0
  const previous = new Int32Array(grid.blocked.length); previous.fill(-1)
  const crossed = new Map<number, PortalEdge>(), open = new MinHeap(); open.push({ index: startCell, score: 0 })
  while (open.length) {
    const current = open.pop()!
    if (current.score > scores[current.index]) continue
    if (current.index === goalCell) {
      const cells = [goalCell]; while (previous[cells[cells.length - 1]] >= 0) cells.push(previous[cells[cells.length - 1]]); cells.reverse()
      const path = [{ ...start }]
      for (let index = 1; index < cells.length; index++) { const edge = crossed.get(cells[index]); if (edge) path.push({ ...edge.entry }, { ...edge.exit }); else if (index < cells.length - 1) path.push(worldPoint(grid, cells[index])) }
      path.push({ ...goal }); return path
    }
    const relax = /** 结构说明（自动提取）：relax；输入 destination、weight、edge；直接调用 crossed.set、crossed.delete、open.push；写入 scores[…]、previous[…]。 */ (destination: number, weight: number, edge?: PortalEdge) => {
      const score = current.score + weight
      if (score >= scores[destination]) return
      scores[destination] = score; previous[destination] = current.index
      if (edge) crossed.set(destination, edge); else crossed.delete(destination)
      open.push({ index: destination, score })
    }
    for (const next of neighbors(grid, current.index, region.allowDiagonal)) relax(next, Math.hypot(next % grid.width - current.index % grid.width, Math.floor(next / grid.width) - Math.floor(current.index / grid.width)) * grid.cellSize * grid.traversalCost * grid.costs[next])
    for (const edge of portals.get(current.index) ?? []) relax(edge.destination, edge.cost, edge)
  }
  return []
}
/** 结构说明（自动提取）：flowFieldPath；输入 grid、startPoint、goalPoint、diagonal；直接调用 cell、flowFields.get、Map、flowFields.set、cache.get 等；写入 cache、costs[…]、next[…]、field 等；返回路径包含 path；包含循环处理。 */ function flowFieldPath(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean): Vec2[] {
  const start = cell(grid, startPoint), goal = cell(grid, goalPoint)
  if (grid.blocked[start] || grid.blocked[goal]) return []
  let cache = flowFields.get(grid)
  if (!cache) { cache = new Map(); flowFields.set(grid, cache) }
  const key = goal + ':' + diagonal
  let field = cache.get(key)
  if (!field) {
    const costs = new Float64Array(grid.blocked.length); costs.fill(Infinity); costs[goal] = 0
    const next = new Int32Array(grid.blocked.length); next.fill(-1)
    const open = new MinHeap(); open.push({ index: goal, score: 0 })
    while (open.length) {
      const current = open.pop()!
      if (current.score > costs[current.index]) continue
      for (const candidate of neighbors(grid, current.index, diagonal)) {
        const distance = Math.hypot(candidate % grid.width - current.index % grid.width, Math.floor(candidate / grid.width) - Math.floor(current.index / grid.width))
        const tentative = current.score + distance * grid.cellSize * grid.traversalCost * grid.costs[current.index]
        if (tentative >= costs[candidate]) continue
        costs[candidate] = tentative; next[candidate] = current.index; open.push({ index: candidate, score: tentative })
      }
    }
    field = { costs, next }; if (cache.size >= 4) cache.delete(cache.keys().next().value!); cache.set(key, field)
  }
  if (!Number.isFinite(field.costs[start])) return []
  const path: Vec2[] = [{ ...startPoint }]; let current = start
  for (let guard = 0; guard < grid.blocked.length && current !== goal; guard++) { current = field.next[current]; if (current < 0) return []; path.push(worldPoint(grid, current)) }
  if (path.length === 1) path.push({ ...goalPoint }); else path[path.length - 1] = { ...goalPoint }
  return path
}

/** 结构说明（自动提取）：clearLine；输入 grid、first、second；直接调用 Math.hypot、Math.max、Math.ceil、cell；包含循环处理。 */ function clearLine(grid: NavigationGrid, first: Vec2, second: Vec2): boolean {
  const distance = Math.hypot(second.x - first.x, second.y - first.y), steps = Math.max(1, Math.ceil(distance / (grid.cellSize * .4)))
  for (let step = 0; step <= steps; step++) if (grid.blocked[cell(grid, { x: first.x + (second.x - first.x) * step / steps, y: first.y + (second.y - first.y) * step / steps })]) return false
  return true
}

/** 结构说明（自动提取）：smoothPath；输入 grid、path；直接调用 clearLine、result.push；写入 index；返回路径包含 path、result；包含循环处理。 */ function smoothPath(grid: NavigationGrid, path: Vec2[]): Vec2[] {
  if (path.length < 3) return path
  const result = [path[0]]; let index = 0
  while (index < path.length - 1) { let next = path.length - 1; while (next > index + 1 && !clearLine(grid, path[index], path[next])) next--; result.push(path[next]); index = next }
  return result
}

/** 结构说明（自动提取）：pointSegmentDistance；输入 point、first、second；直接调用 Math.hypot、Math.max、Math.min。 */ function pointSegmentDistance(point: Vec2, first: Vec2, second: Vec2): number {
  const dx = second.x - first.x, dy = second.y - first.y, lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= EPSILON) return Math.hypot(point.x - first.x, point.y - first.y)
  const factor = Math.max(0, Math.min(1, ((point.x - first.x) * dx + (point.y - first.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (first.x + dx * factor), point.y - (first.y + dy * factor))
}

/** 结构说明（自动提取）：pointInOrOnPolygon；输入 point、polygon；直接调用 pointInPolygon、polygon.some。 */ function pointInOrOnPolygon(point: Vec2, polygon: Vec2[]): boolean {
  return pointInPolygon(point, polygon) || polygon.some(/* 比较 pointSegmentDistance(point, candidate, polygon[(index + 1) % polygon.length]) 与 1e-6，返回小于的判断结果。 */ (candidate, index) => pointSegmentDistance(point, candidate, polygon[(index + 1) % polygon.length]) < 1e-6)
}

/** 结构说明（自动提取）：polygonPath；输入 regionEntity、region、start、goal、entities、clearance；直接调用 region.polygon.map、captureNavigationInputs、walkablePoint、polygon.reduce、Math.hypot 等；写入 scores[…]、cursor、cameFrom[…]；包含循环处理；包含显式抛错路径。 */ function polygonPath(regionEntity: Entity, region: NavigationRegion2D, start: Vec2, goal: Vec2, entities: Entity[], clearance: number): Vec2[] {
  const polygon = region.polygon.map(/* 调用 localPointToWorld(regionEntity, point, entities) 并返回调用结果。 */ point => localPointToWorld(regionEntity, point, entities))
  const inputs = captureNavigationInputs(regionEntity, entities, clearance)
  const walkablePoint = /** 结构说明（自动提取）：walkablePoint；输入 point；直接调用 pointInOrOnPolygon、polygon.every、inputs.shapes.some、inputs.tile.sample；返回表达式求值结果。 */ (point: Vec2) => pointInOrOnPolygon(point, polygon) && polygon.every(/* 比较 segmentDistance(point, first, polygon[(index + 1) % polygon.length]) + 1e-9 与 clearance，返回大于或等于的判断结果。 */ (first, index) => segmentDistance(point, first, polygon[(index + 1) % polygon.length]) + 1e-9 >= clearance) && !inputs.shapes.some(/* 比较 shapeDistance(point, shape) 与 clearance，返回小于或等于的判断结果。 */ shape => shapeDistance(point, shape) <= clearance) && !inputs.tile.sample(point)?.blocked
  const walkableSegment = /** 结构说明（自动提取）：walkableSegment；输入 first、second；直接调用 polygonContainsSegment、inputs.shapes.some；返回表达式求值结果。 */ (first: Vec2, second: Vec2) => polygonContainsSegment(first, second, polygon, clearance) && !inputs.shapes.some(/* 比较 shapeSegmentDistance(first, second, shape) 与 clearance，返回小于或等于的判断结果。 */ shape => shapeSegmentDistance(first, second, shape) <= clearance)
  if (!walkablePoint(start) || !walkablePoint(goal)) return []
  const nodes: Vec2[] = [{ ...start }, { ...goal }]
  // Region corners remain candidates at zero clearance; inset corners are admitted only when valid.
  const center = polygon.reduce(/** 构造并返回记录 { x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }，字段按当前实参及捕获状态求值。 */ (sum, point) => ({ x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }), { x: 0, y: 0 })
  for (const point of polygon) { const length = Math.hypot(center.x - point.x, center.y - point.y) || 1; const candidate = { x: point.x + (center.x - point.x) / length * clearance * 2, y: point.y + (center.y - point.y) / length * clearance * 2 }; if (walkablePoint(candidate)) nodes.push(candidate) }
  for (const shape of inputs.shapes) for (const point of navigationShapeOutline(shape, clearance)) if (walkablePoint(point)) nodes.push(point)
  if (nodes.length + region.links.length * 2 > 512) throw new Error('NAVIGATION_LIMIT: polygon visibility graph exceeds 512 vertices; use a grid or smaller regions.')
  const linkEdges = new Map<string, number>()
  for (const link of region.links.filter(/* 返回 link.enabled 的当前值。 */ link => link.enabled)) {
    const first = localPointToWorld(regionEntity, link.start, entities), second = localPointToWorld(regionEntity, link.end, entities)
    const firstIndex = nodes.push(first) - 1, secondIndex = nodes.push(second) - 1
    linkEdges.set(`${firstIndex}:${secondIndex}`, Math.hypot(second.x - first.x, second.y - first.y) * Math.max(.001, link.cost))
    if (link.bidirectional) linkEdges.set(`${secondIndex}:${firstIndex}`, Math.hypot(second.x - first.x, second.y - first.y) * Math.max(.001, link.cost))
  }
  const scores = new Float64Array(nodes.length); scores.fill(Number.POSITIVE_INFINITY); scores[0] = 0
  const cameFrom = new Int32Array(nodes.length); cameFrom.fill(-1)
  const open = new MinHeap(); open.push({ index: 0, score: 0 })
  while (open.length) {
    const current = open.pop()!.index
    if (current === 1) {
      const path: Vec2[] = []
      for (let cursor = 1; cursor >= 0; cursor = cameFrom[cursor]) { path.push({ ...nodes[cursor] }); if (cursor === 0) break }
      return path.reverse()
    }
    for (let next = 0; next < nodes.length; next++) {
      if (next === current) continue
      const linkCost = linkEdges.get(`${current}:${next}`)
      if (linkCost === undefined && !walkableSegment(nodes[current], nodes[next])) continue
      const midpoint = { x: (nodes[next].x + nodes[current].x) * .5, y: (nodes[next].y + nodes[current].y) * .5 }
      const distance = linkCost ?? Math.hypot(nodes[next].x - nodes[current].x, nodes[next].y - nodes[current].y) * Math.max(.001, region.traversalCost) * navigationCostMultiplier(regionEntity, region, midpoint, entities)
      const tentative = scores[current] + distance
      if (tentative >= scores[next]) continue
      scores[next] = tentative; cameFrom[next] = current
      open.push({ index: next, score: tentative })
    }
  }
  return []
}

/** 结构说明（自动提取）：findNavigationPath；输入 regionEntity、start、goal、entities、agentRadius、nowMilliseconds；直接调用 regionEntity.getComponent、every、performance.now、region.polygon.map、pointInOrOnPolygon 等；写入 navigationProfile.lastQueryMilliseconds、navigationProfile.maximumQueryMilliseconds、grid；返回路径包含 path；包含循环处理。 */ export function findNavigationPath(regionEntity: Entity, start: Vec2, goal: Vec2, entities: Entity[], agentRadius?: number, nowMilliseconds = performance.now()): Vec2[] {
  const region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')
  if (!regionEntity.enabled || !region?.enabled || !(region.navigationMask & (1 << ((region.navigationLayer - 1) & 31))) || ![start.x, start.y, goal.x, goal.y].every(Number.isFinite)) return []
  const started = performance.now()
  navigationProfile.pathQueries++
  const regionPolygon = region.polygon.map(/* 调用 localPointToWorld(regionEntity, point, entities) 并返回调用结果。 */ point => localPointToWorld(regionEntity, point, entities))
  if (!pointInOrOnPolygon(start, regionPolygon) || !pointInOrOnPolygon(goal, regionPolygon)) { navigationProfile.failedQueries++; return [] }
  if (region.navigationMode === 'Polygon' && region.source !== 'TileMap') {
    const path = polygonPath(regionEntity, region, start, goal, entities, Math.max(0, finiteNumber(agentRadius, region.agentRadius)))
    navigationProfile.lastQueryMilliseconds = performance.now() - started
    navigationProfile.maximumQueryMilliseconds = Math.max(navigationProfile.maximumQueryMilliseconds, navigationProfile.lastQueryMilliseconds)
    if (!path.length) navigationProfile.failedQueries++
    return path
  }
  const inputs = captureNavigationInputs(regionEntity, entities, agentRadius)
  const cached = grids.get(gridKey(regionEntity.uuid, inputs.clearance))
  // A throttled dynamic rebake must never return a path through obsolete obstacles.
  if (cached && cached.revision !== inputs.signature && region.dynamic && nowMilliseconds - cached.builtAt < Math.max(0, region.rebakeInterval) * 1000) { navigationProfile.failedQueries++; return [] }
  let grid = cached
  if (!grid || grid.revision !== inputs.signature) {
    const context = prepareNavigationBake(regionEntity, entities, nowMilliseconds, inputs.clearance, inputs)
    if (!context) { navigationProfile.failedQueries++; return [] }
    for (let y = 0; y < context.height; y++) sampleNavigationRow(context, y)
    grid = finishNavigationBake(context)
  }
  const path = gridPathWithLinks(grid, regionEntity, region, start, goal, entities)
  navigationProfile.lastQueryMilliseconds = performance.now() - started
  navigationProfile.maximumQueryMilliseconds = Math.max(navigationProfile.maximumQueryMilliseconds, navigationProfile.lastQueryMilliseconds)
  if (!path.length) navigationProfile.failedQueries++
  return path
}

/** 结构说明（自动提取）：avoidanceExtent；输入 entity、entities；直接调用 entity.getComponent、Math.max、worldTransform、Math.abs、Math.hypot。 */ function avoidanceExtent(entity: Entity, entities: Entity[]): number {
  const otherAgent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D'), obstacle = entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')
  if (otherAgent?.enabled) return Math.max(otherAgent.radius, otherAgent.avoidanceRadius)
  if (!obstacle?.enabled) return 0
  const scale = worldTransform(entity, entities).scale
  return obstacle.shape === 'Circle' ? obstacle.radius * Math.max(Math.abs(scale.x), Math.abs(scale.y)) : Math.hypot(obstacle.size.x * scale.x, obstacle.size.y * scale.y) * .5
}

/* 调用 Math.max(.25, Math.min(1_000_000, finiteNumber(maximumExtent, 1)) / 32) 并返回调用结果。 */ export function avoidanceSpatialCellSize(maximumExtent: number): number { return Math.max(.25, Math.min(1_000_000, finiteNumber(maximumExtent, 1)) / 32) }

/** 结构说明（自动提取）：avoid；输入 entity、desired、agent、candidates、entities；直接调用 worldTransform、Math.min、Math.max、finiteNumber、Math.round 等；写入 x、y、navigationProfile.maximumNeighbors；返回路径包含 desired；包含循环处理。 */ function avoid(entity: Entity, desired: Vec2, agent: NavigationAgent2D, candidates: Entity[], entities: Entity[]): Vec2 {
  if (!agent.avoidance) return desired
  const position = worldTransform(entity, entities).position
  let x = desired.x, y = desired.y
  let visited = 0
  const priority = Math.min(1, Math.max(0, finiteNumber(agent.avoidancePriority, .5)))
  const maximumNeighbors = Math.max(1, Math.min(MAX_NAVIGATION_AVOIDANCE_NEIGHBORS, Math.round(finiteNumber(agent.maximumAvoidanceNeighbors, 16))))
  const neighbors = candidates.flatMap(/** 结构说明（自动提取）：candidates.flatMap 回调；输入 other；直接调用 other.getComponent、worldTransform。 */ other => {
    if (other === entity || !other.enabled) return []
    const otherAgent = other.getComponent<NavigationAgent2D>('NavigationAgent2D'), obstacle = other.getComponent<NavigationObstacle2D>('NavigationObstacle2D')
    if (!otherAgent && !obstacle || otherAgent && (!otherAgent.enabled || otherAgent.navigationLayer !== agent.navigationLayer) || obstacle && (!obstacle.enabled || obstacle.navigationLayer !== agent.navigationLayer)) return []
    const point = worldTransform(other, entities).position
    return [{ other, otherAgent, obstacle, point, distanceSquared: (point.x - position.x) ** 2 + (point.y - position.y) ** 2 }]
  }).sort(/* 先计算 first.distanceSquared - second.distanceSquared；仅当其为假值时求右侧 first.other.uuid.localeCompare(second.other.uuid)，返回短路求值结果。 */ (first, second) => first.distanceSquared - second.distanceSquared || first.other.uuid.localeCompare(second.other.uuid)).slice(0, maximumNeighbors)
  for (const { other, otherAgent, obstacle, point } of neighbors) {
    visited++
    navigationProfile.avoidancePairs++
    const otherVelocity = otherAgent?.velocity ?? (obstacle?.dynamic ? obstacle.avoidanceVelocity : { x: 0, y: 0 }), otherRadius = otherAgent?.radius ?? avoidanceExtent(other, entities)
    const relativeSpeed = Math.max(.001, Math.hypot(desired.x - otherVelocity.x, desired.y - otherVelocity.y))
    const horizon = Math.min(1.5, Math.max(.05, (agent.avoidanceRadius + otherRadius) / relativeSpeed))
    const predicted = { x: point.x + otherVelocity.x * horizon, y: point.y + otherVelocity.y * horizon }
    const dx = position.x - predicted.x, dy = position.y - predicted.y
    const radius = agent.avoidanceRadius + otherRadius, distance = Math.hypot(dx, dy)
    if (distance < radius) {
      const otherPriority = Math.min(1, Math.max(0, finiteNumber(otherAgent?.avoidancePriority, 1)))
      const responsibility = obstacle ? 1 : Math.min(1, Math.max(.1, .5 + (otherPriority - priority) * .5))
      const strength = (radius - distance) / radius * Math.max(0, finiteNumber(agent.speed)) * responsibility
      if (distance > EPSILON) { x += dx / distance * strength; y += dy / distance * strength }
      else {
        const direction = other.uuid.localeCompare(entity.uuid) < 0 ? -1 : 1
        x += direction * strength
      }
    }
  }
  navigationProfile.maximumNeighbors = Math.max(navigationProfile.maximumNeighbors, visited)
  const length = Math.hypot(x, y); return length > agent.speed ? { x: x / length * agent.speed, y: y / length * agent.speed } : { x, y }
}

/** 结构说明（自动提取）：updateNavigation；输入 entities、fixedDelta、nowSeconds；直接调用 sort、entities.filter、allAgents.slice、Math.max、activeAgents.reduce 等；写入 performanceRuntimeState.spatialEntries、navigationProfile.activeAgents、navigationProfile.droppedAgents、navigationProfile.avoidancePairs 等；包含循环处理。 */ export function updateNavigation(entities: Entity[], fixedDelta: number, nowSeconds: number): void {
  const regions = entities.filter(/* 先计算 entity.enabled；仅当其为真值时求右侧 entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.enabled，返回短路求值结果。 */ entity => entity.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.enabled).sort(/* 调用 first.uuid.localeCompare(second.uuid) 并返回调用结果。 */ (first, second) => first.uuid.localeCompare(second.uuid))
  const allAgents = entities.filter(/* 先计算 entity.enabled；仅当其为真值时求右侧 entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.enabled，返回短路求值结果。 */ entity => entity.enabled && entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.enabled).sort(/* 调用 first.uuid.localeCompare(second.uuid) 并返回调用结果。 */ (first, second) => first.uuid.localeCompare(second.uuid))
  // 退场与禁用实体不得继续持有调度或网格；流送重载必须从当前成员重新建立路径。
  const liveRegions=new Set(regions.map(/** 收集仍可使用的导航区域标识。 */ entity=>entity.uuid)),liveAgents=new Set(allAgents.map(/** 收集仍启用的导航代理标识。 */ entity=>entity.uuid))
  for(const [key,grid] of grids)if(!liveRegions.has(grid.regionUuid))grids.delete(key)
  for(const cache of [nextRepath,pathRevisions,navigationDebugPaths])for(const key of cache.keys())if(!liveAgents.has(key))cache.delete(key)
  const activeAgents = allAgents.slice(0, MAX_NAVIGATION_AGENTS)
  const avoidanceEntities = entities.filter(/** 结构说明（自动提取）：entities.filter 回调；输入 entity；直接调用 entity.getComponent；返回表达式求值结果。 */ entity => entity.enabled && (entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.enabled || entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')?.enabled))
  // Keep both the largest query and largest inserted bounds below the spatial
  // hash's bounded key budget. This preserves exact large-radius avoidance
  // instead of clipping valid neighbors after 16,384 enumerated cells.
  const maximumAvoidanceExtent = Math.max(1,
    activeAgents.reduce(/* 调用 Math.max(maximum, entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.avoidanceRadius ?? 0) 并返回调用结果。 */ (maximum, entity) => Math.max(maximum, entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.avoidanceRadius ?? 0), 0),
    avoidanceEntities.reduce(/* 调用 Math.max(maximum, avoidanceExtent(entity, entities)) 并返回调用结果。 */ (maximum, entity) => Math.max(maximum, avoidanceExtent(entity, entities)), 0))
  const spatialCellSize = avoidanceSpatialCellSize(maximumAvoidanceExtent)
  const spatial = new SpatialHash2D(spatialCellSize), avoidanceByUuid = new Map<string, Entity>()
  for (const entity of avoidanceEntities) {
    const position = worldTransform(entity, entities).position, extent = avoidanceExtent(entity, entities)
    spatial.upsert({ id: entity.uuid, bounds: { minX: position.x - extent, minY: position.y - extent, maxX: position.x + extent, maxY: position.y + extent } }); avoidanceByUuid.set(entity.uuid, entity)
  }
  performanceRuntimeState.spatialEntries = spatial.size
  navigationProfile.activeAgents = activeAgents.length
  navigationProfile.droppedAgents = Math.max(0, allAgents.length - activeAgents.length)
  navigationProfile.avoidancePairs = 0
  navigationProfile.maximumNeighbors = 0
  const repathEligible = new Set<string>()
  if (activeAgents.length) {
    for (let offset = 0; offset < activeAgents.length && repathEligible.size < MAX_NAVIGATION_REPATHS_PER_TICK; offset++) {
      const candidate = activeAgents[(repathCursor + offset) % activeAgents.length], candidateAgent = candidate.getComponent<NavigationAgent2D>('NavigationAgent2D')!
      if ((nextRepath.get(candidate.uuid) ?? 0) <= nowSeconds || !candidateAgent.path.length) repathEligible.add(candidate.uuid)
    }
    repathCursor = (repathCursor + MAX_NAVIGATION_REPATHS_PER_TICK) % activeAgents.length
  }
  navigationProfile.deferredRepaths = 0
  const revisions = new Map<string, string>()
  for (const entity of activeAgents) {
    const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')
    if (!agent) continue
    const position = worldTransform(entity, entities).position
    const targetEntity=agent.targetEntityUuid?entities.find(/** 目标必须仍在当前世界中且启用。 */ candidate=>candidate.uuid===agent.targetEntityUuid&&candidate.enabled):undefined
    if(agent.targetEntityUuid&&!targetEntity){
      // 不以自身位置替代失效绑定，否则旧路径会在重新寻路间隔内继续驱动物理速度。
      agent.velocity={x:0,y:0};entity.velocity={x:0,y:0};agent.path=[];agent.pathIndex=0;agent.pathStatus='Unreachable';nextRepath.delete(entity.uuid);pathRevisions.delete(entity.uuid)
      navigationDebugPaths.set(entity.uuid,{entityUuid:entity.uuid,points:[],status:'Unreachable'});continue
    }
    const target=targetEntity?worldTransform(targetEntity,entities).position:agent.targetPosition
    const compatibleRegions = regions.filter(/** 结构说明（自动提取）：regions.filter 回调；输入 candidate；直接调用 candidate.getComponent。 */ candidate => {
      const region = candidate.getComponent<NavigationRegion2D>('NavigationRegion2D')!
      const bit = 1 << ((region.navigationLayer - 1) & 31)
      return region.navigationLayer === agent.navigationLayer && (agent.navigationMask & bit) !== 0 && (region.navigationMask & bit) !== 0
    })
    const regionEntity = compatibleRegions.find(/** 结构说明（自动提取）：compatibleRegions.find 回调；输入 candidate；直接调用 pointInOrOnPolygon、polygon.map、candidate.getComponent；返回表达式求值结果。 */ candidate => pointInOrOnPolygon(position, candidate.getComponent<NavigationRegion2D>('NavigationRegion2D')!.polygon.map(/* 调用 localPointToWorld(candidate, point, entities) 并返回调用结果。 */ point => localPointToWorld(candidate, point, entities)))) ?? compatibleRegions[0]
    if (!regionEntity) { agent.velocity = { x: 0, y: 0 }; entity.velocity = { x: 0, y: 0 }; agent.pathStatus = 'Unreachable'; agent.path = []; navigationDebugPaths.set(entity.uuid, { entityUuid: entity.uuid, points: [], status: 'Unreachable' }); continue }
    const radiusKey = gridKey(regionEntity.uuid, agent.radius)
    let revision = revisions.get(radiusKey)
    if (revision === undefined) { revision = captureNavigationInputs(regionEntity, entities, agent.radius).signature; revisions.set(radiusKey, revision) }
    const stale = pathRevisions.get(entity.uuid) !== revision
    if (stale) { agent.path = []; agent.velocity = { x: 0, y: 0 }; entity.velocity = { x: 0, y: 0 } }
    const needsRepath = stale || (nextRepath.get(entity.uuid) ?? 0) <= nowSeconds || !agent.path.length
    if (needsRepath && repathEligible.has(entity.uuid)) {
      pathRevisions.set(entity.uuid, revision)
      const raw = findNavigationPath(regionEntity, position, target, entities, agent.radius, nowSeconds * 1_000)
      const grid = grids.get(gridKey(regionEntity.uuid, Math.max(0, agent.radius)))
      agent.path = agent.pathSmoothing && grid ? smoothPath(grid, raw) : raw
      agent.pathIndex = Math.min(1, Math.max(0, agent.path.length - 1))
      agent.pathStatus = agent.path.length ? 'Ready' : 'Unreachable'
      nextRepath.set(entity.uuid, nowSeconds + Math.max(.02, agent.repathInterval))
      navigationDebugPaths.set(entity.uuid, { entityUuid: entity.uuid, points: agent.path.map(/** 构造并返回记录 { ...point }，字段按当前实参及捕获状态求值。 */ point => ({ ...point })), status: agent.pathStatus === 'Ready' ? 'Ready' : 'Unreachable' })
    } else if (needsRepath) {
      navigationProfile.deferredRepaths++
      if (!agent.path.length) agent.pathStatus = 'Pending'
    }
    let waypoint = agent.path[agent.pathIndex]
    while (waypoint) {
      const waypointDistance = Math.hypot(waypoint.x - position.x, waypoint.y - position.y)
      if (waypointDistance > Math.max(agent.stoppingDistance, agent.radius * .25)) break
      agent.pathIndex++; waypoint = agent.path[agent.pathIndex]
    }
    if (!waypoint) { agent.velocity = { x: 0, y: 0 }; entity.velocity = { x: 0, y: 0 }; continue }
    const dx = waypoint.x - position.x, dy = waypoint.y - position.y, distance = Math.hypot(dx, dy)
    const nearby = spatial.query({ minX: position.x - agent.avoidanceRadius, minY: position.y - agent.avoidanceRadius, maxX: position.x + agent.avoidanceRadius, maxY: position.y + agent.avoidanceRadius }).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 uuid；直接调用 avoidanceByUuid.get。 */ uuid => { const candidate = avoidanceByUuid.get(uuid); return candidate ? [candidate] : [] })
    const desired = avoid(entity, { x: dx / distance * agent.speed, y: dy / distance * agent.speed }, agent, nearby, entities)
    const maximumDelta = Math.max(0, agent.acceleration) * fixedDelta
    const changeX = desired.x - agent.velocity.x, changeY = desired.y - agent.velocity.y, changeLength = Math.hypot(changeX, changeY)
    const factor = changeLength > maximumDelta && changeLength > 0 ? maximumDelta / changeLength : 1
    agent.velocity = { x: agent.velocity.x + changeX * factor, y: agent.velocity.y + changeY * factor }
    entity.velocity = { ...agent.velocity }
  }
}

/** 结构说明（自动提取）：clearNavigationData；输入 regionUuid；直接调用 cancelNavigationBake、grids.delete、grids.clear、navigationDebugPaths.clear、nextRepath.clear 等；写入 navigationBakeState.artifactHash、navigationBakeState.error；包含循环处理。 */ export function clearNavigationData(regionUuid?: string): void {
  cancelNavigationBake(); navigationBakeState.artifactHash = ''; navigationBakeState.error = ''
  if (regionUuid) { for (const [key, grid] of grids) if (grid.regionUuid === regionUuid) grids.delete(key) } else grids.clear()
  navigationDebugPaths.clear()
  nextRepath.clear(); pathRevisions.clear()
}

/** 结构说明（自动提取）：rebakeNavigation；输入 entities；直接调用 performance.now、entity.getComponent、bakeNavigationGrid；写入 cells；包含循环处理。 */ export function rebakeNavigation(entities: Entity[]): { baked: number; cells: number; milliseconds: number } {
  const started = performance.now(); let baked = 0, cells = 0
  for (const entity of entities) {
    const region = entity.getComponent<NavigationRegion2D>('NavigationRegion2D')
    if (!entity.enabled || !region?.enabled || region.navigationMode !== 'Grid') continue
    const grid = bakeNavigationGrid(entity, entities)
    if (grid) { baked++; cells += grid.width * grid.height }
  }
  return { baked, cells, milliseconds: performance.now() - started }
}

/** 结构说明（自动提取）：stableHash；输入 value；直接调用 value.charCodeAt、Math.imul、padStart、hash.toString；写入 hash；包含循环处理。 */ function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return hash.toString(16).padStart(8, '0')
}

/** 结构说明（自动提取）：cancelNavigationBake；无显式参数；直接调用 bakeController.abort；写入 navigationBakeState.cancelled。 */ export function cancelNavigationBake(): boolean {
  if (!bakeController) return false
  bakeController.abort(); navigationBakeState.cancelled = true
  return true
}

/** 结构说明（自动提取）：requestNavigationBake；输入 entities；直接调用 cancelNavigationBake、AbortController、Object.assign、performance.now、sort 等；写入 bakeController、sliceStarted、cells、navigationBakeState.progress 等；包含循环处理；等待异步结果；包含显式抛错路径。 */ export async function requestNavigationBake(entities: Entity[]): Promise<{ baked: number; cells: number; milliseconds: number; cancelled: boolean; artifactHash: string }> {
  cancelNavigationBake()
  const controller = new AbortController(); bakeController = controller
  Object.assign(navigationBakeState, { active: true, cancelled: false, progress: 0, regions: 0, cells: 0, artifactHash: '', error: '' })
  const started = performance.now()
  const regions = entities.filter(/** 结构说明（自动提取）：entities.filter 回调；输入 entity；直接调用 entity.getComponent；返回表达式求值结果。 */ entity => entity.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.navigationMode === 'Grid').sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))
  const pending: Array<{ entity: Entity; grid: NavigationGrid }> = []
  let baked = 0, cells = 0
  try {
    let sliceStarted = performance.now()
    for (let index = 0; index < regions.length; index++) {
      if (index === 0 || performance.now() - sliceStarted >= performanceRuntimeSettings.frameWorkBudgetMs) {
        await new Promise<void>(/* 调用 setTimeout(resolve, 0) 并返回调用结果。 */ resolve => setTimeout(resolve, 0))
        sliceStarted = performance.now()
      }
      if (controller.signal.aborted) break
      const grid = await bakeNavigationGridCancellable(regions[index], entities, controller.signal, /** 结构说明（自动提取）：bakeNavigationGridCancellable 回调；输入 progress；直接调用 Math.max；写入 navigationBakeState.progress。 */ progress => { if (bakeController === controller) navigationBakeState.progress = (index + progress) / Math.max(1, regions.length) })
      if (controller.signal.aborted) break
      if (grid) { pending.push({ entity: regions[index], grid }); baked++; cells += grid.width * grid.height }
      navigationBakeState.progress = (index + 1) / Math.max(1, regions.length)
    }
    const cancelled = controller.signal.aborted || bakeController !== controller
    if (cancelled) return { baked: 0, cells: 0, milliseconds: performance.now() - started, cancelled: true, artifactHash: '' }
    for (const { entity, grid } of pending) if (captureNavigationInputs(entity, entities, grid.clearance).signature !== grid.revision) throw new Error('NAVIGATION_STALE: sources changed during baking; no partial artifacts were published.')
    for (const { entity, grid } of pending) publishNavigationGrid(entity, grid)
    navigationBakeState.regions = baked; navigationBakeState.cells = cells
    const artifact = [...grids.values()].sort(/* 调用 a.regionUuid.localeCompare(b.regionUuid) 并返回调用结果。 */ (a, b) => a.regionUuid.localeCompare(b.regionUuid)).map(/** 结构说明（自动提取）：map 回调；输入 grid；直接调用 stableHash、join、Array.from；返回表达式求值结果。 */ grid => [grid.regionUuid, grid.revision, grid.width, grid.height, grid.cellSize, stableHash(Array.from(grid.blocked).join('')), stableHash(Array.from(grid.costs).join(','))])
    navigationBakeState.artifactHash = stableHash(JSON.stringify(artifact))
    navigationBakeState.cancelled = cancelled
    if (!cancelled) navigationBakeState.progress = 1
    return { baked: navigationBakeState.regions, cells: navigationBakeState.cells, milliseconds: performance.now() - started, cancelled, artifactHash: navigationBakeState.artifactHash }
  } catch (error) {
    if (bakeController === controller) navigationBakeState.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    if (bakeController === controller) { bakeController = null; navigationBakeState.active = false }
  }
}

/* 返回具有所列字段的新对象 { ...navigationProfile }。 */ export function navigationProfileSnapshot(): typeof navigationProfile { return { ...navigationProfile } }

/** 结构说明（自动提取）：resetNavigation；无显式参数；直接调用 cancelNavigationBake、grids.clear、nextRepath.clear、pathRevisions.clear、WeakMap 等；写入 flowFields、repathCursor。 */ export function resetNavigation(): void {
  cancelNavigationBake(); grids.clear(); nextRepath.clear(); pathRevisions.clear(); flowFields = new WeakMap(); navigationDebugPaths.clear(); repathCursor = 0
  Object.assign(navigationBakeState, { active: false, cancelled: false, progress: 0, regions: 0, cells: 0, artifactHash: '', error: '' })
  Object.assign(navigationProfile, { bakeCount: 0, pathQueries: 0, failedQueries: 0, lastBakeMilliseconds: 0, lastQueryMilliseconds: 0, maximumQueryMilliseconds: 0, bakedCells: 0, activeAgents: 0, avoidancePairs: 0, deferredRepaths: 0, droppedAgents: 0, maximumNeighbors: 0 })
}

/** Keep cached paths and absolute targets in the translated runtime coordinate frame. */
/** 结构说明（自动提取）：shiftNavigationOrigin；输入 offset、entities；直接调用 cancelNavigationBake、Map、entity.getComponent、move、navigationDebugPaths.values 等；写入 grid.revision；包含循环处理。 */ export function shiftNavigationOrigin(offset: Vec2, entities: Entity[]): void {
  cancelNavigationBake()
  const move = /** 结构说明（自动提取）：move；输入 point；写入 point.x、point.y。 */ (point: Vec2) => { point.x -= offset.x; point.y -= offset.y }, revisions = new Map<string, string>()
  for (const entity of entities) {
    const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D', true)
    if (agent) { move(agent.targetPosition); for (const point of agent.path) move(point) }
  }
  for (const debug of navigationDebugPaths.values()) for (const point of debug.points) move(point)
  for (const [key, grid] of grids) {
    const entity = entities.find(/* 比较 candidate.uuid 与 grid.regionUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === grid.regionUuid)
    if (!entity?.getComponent<NavigationRegion2D>('NavigationRegion2D')) { grids.delete(key); continue }
    move(grid.min)
    try { const revision = captureNavigationInputs(entity, entities, grid.clearance).signature; revisions.set(grid.revision, revision); grid.revision = revision }
    catch { grids.delete(key) } // Invalid authored navigation cannot partially abort a committed physics frame translation.
  }
  for (const [uuid, revision] of pathRevisions) { const shifted = revisions.get(revision); if (shifted) pathRevisions.set(uuid, shifted); else pathRevisions.delete(uuid) }
}
