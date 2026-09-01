import type { Entity } from '../world/Entity'
import type { NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldPointToLocal, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'
import { normalizeTileMap, readTileSet, transformNormalizedTilePoint } from './tilemap'
import { reactive } from 'vue'
import { performanceRuntimeSettings, performanceRuntimeState, SpatialHash2D } from './largeWorldPerformance'

const MAX_GRID_CELLS = 262_144
const EPSILON = 1e-9
export const MAX_NAVIGATION_AGENTS = 10_000
export const MAX_NAVIGATION_REPATHS_PER_TICK = 256
export const MAX_NAVIGATION_AVOIDANCE_NEIGHBORS = 32

interface NavigationGrid {
  regionUuid: string
  revision: string
  width: number
  height: number
  cellSize: number
  min: Vec2
  blocked: Uint8Array
  costs: Float64Array
  traversalCost: number
  builtAt: number
}

export interface NavigationDebugPath { entityUuid: string; points: Vec2[]; status: 'Ready' | 'Unreachable' }
export const navigationDebugPaths = new Map<string, NavigationDebugPath>()
const grids = new Map<string, NavigationGrid>()
const nextRepath = new Map<string, number>()
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

function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / Math.max(EPSILON, b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function obstacleContains(entity: Entity, obstacle: NavigationObstacle2D, point: Vec2, entities: Entity[], clearance = 0): boolean {
  const local = worldPointToLocal(entity, point, entities)
  if (obstacle.shape === 'Circle') return local.x * local.x + local.y * local.y <= (obstacle.radius + clearance) * (obstacle.radius + clearance)
  return Math.abs(local.x) <= obstacle.size.x * .5 + clearance && Math.abs(local.y) <= obstacle.size.y * .5 + clearance
}

function gridSignature(regionEntity: Entity, region: NavigationRegion2D, obstacles: Entity[], entities: Entity[]): string {
  const transform = worldTransform(regionEntity, entities)
  const source = region.source === 'TileMap' ? entities.find(entity => entity.uuid === region.sourceEntityUuid)?.getComponent<import('../world/components').TileMap2D>('TileMap2D') : null
  return JSON.stringify([
    region.polygon, region.cellSize, region.clusterSize, region.navigationLayer, region.traversalCost, region.source, region.sourceEntityUuid, source?.revision, region.links, region.costAreas,
    transform.position, transform.rotation, transform.scale,
    ...obstacles.map(entity => {
      const obstacle = entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')!
      return [entity.uuid, worldTransform(entity, entities), obstacle.shape, obstacle.size, obstacle.radius, obstacle.navigationLayer, obstacle.enabled]
    })
  ])
}

function navigationCostMultiplier(regionEntity: Entity, region: NavigationRegion2D, point: Vec2, entities: Entity[]): number {
  const local = worldPointToLocal(regionEntity, point, entities)
  let multiplier = 1
  for (const area of region.costAreas ?? []) {
    if (!area.enabled || area.navigationLayer !== region.navigationLayer) continue
    const dx = local.x - finiteNumber(area.center?.x), dy = local.y - finiteNumber(area.center?.y)
    const inside = area.shape === 'Circle'
      ? dx * dx + dy * dy <= Math.max(.001, finiteNumber(area.radius, 1)) ** 2
      : Math.abs(dx) <= Math.max(.001, finiteNumber(area.size?.x, 1)) * .5 && Math.abs(dy) <= Math.max(.001, finiteNumber(area.size?.y, 1)) * .5
    if (inside) multiplier *= Math.min(1_000, Math.max(.001, finiteNumber(area.multiplier, 1)))
  }
  return multiplier
}

function tileNavigationSample(region: NavigationRegion2D, point: Vec2, entities: Entity[]): { blocked: boolean; cost: number } | null {
  if (region.source !== 'TileMap' || !region.sourceEntityUuid) return null
  const entity = entities.find(candidate => candidate.uuid === region.sourceEntityUuid), component = entity?.getComponent<import('../world/components').TileMap2D>('TileMap2D')
  if (!entity || !component?.enabled || !component.bakeNavigation) return { blocked: true, cost: 0 }
  const tileSet = readTileSet(component.tileSetAsset)
  if (!tileSet) return { blocked: true, cost: 0 }
  const local = worldPointToLocal(entity, point, entities), rawX = local.x / component.tileSize.x + component.width * .5, rawY = local.y / component.tileSize.y + component.height * .5
  const x = Math.floor(rawX), y = Math.floor(rawY)
  if (x < 0 || y < 0 || x >= component.width || y >= component.height) return { blocked: true, cost: 0 }
  const index = y * component.width + x, localPoint = { x: rawX - x, y: rawY - y }
  let cost = 0, found = false
  for (const layer of component.layers.filter(candidate => candidate.visible && candidate.navigationEnabled)) {
    const definition = tileSet.tiles[layer.tiles[index]]
    if (!definition) continue
    found = true
    if (!(definition.navigationCost > 0)) return { blocked: true, cost: 0 }
    if (definition.navigationPolygon.length >= 3) {
      const polygon = definition.navigationPolygon.map(candidate => transformNormalizedTilePoint(candidate, layer.transforms[index] ?? 0))
      if (!pointInPolygon(localPoint, polygon)) return { blocked: true, cost: 0 }
    }
    cost = Math.max(cost, definition.navigationCost)
  }
  return { blocked: !found, cost: found ? Math.max(.001, cost) : 0 }
}

export function bakeNavigationGrid(regionEntity: Entity, entities: Entity[], now = performance.now()): NavigationGrid | null {
  const started = performance.now()
  const region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')
  if (!region?.enabled || region.polygon.length < 3) return null
  if (region.source === 'TileMap' && region.sourceEntityUuid) { const tileMap = entities.find(entity => entity.uuid === region.sourceEntityUuid)?.getComponent<import('../world/components').TileMap2D>('TileMap2D'); if (tileMap) normalizeTileMap(tileMap) }
  const obstacles = entities.filter(entity => entity.enabled && entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')?.navigationLayer === region.navigationLayer)
  const polygon = region.polygon.map(point => localPointToWorld(regionEntity, point, entities))
  const min = { x: Math.min(...polygon.map(point => point.x)), y: Math.min(...polygon.map(point => point.y)) }
  const max = { x: Math.max(...polygon.map(point => point.x)), y: Math.max(...polygon.map(point => point.y)) }
  let cellSize = Math.min(1e6, Math.max(.01, Math.abs(finiteNumber(region.cellSize, .5))))
  let width = Math.max(1, Math.ceil((max.x - min.x) / cellSize)), height = Math.max(1, Math.ceil((max.y - min.y) / cellSize))
  if (width * height > MAX_GRID_CELLS) {
    cellSize *= Math.sqrt(width * height / MAX_GRID_CELLS)
    width = Math.max(1, Math.ceil((max.x - min.x) / cellSize)); height = Math.max(1, Math.ceil((max.y - min.y) / cellSize))
  }
  const blocked = new Uint8Array(width * height), costs = new Float64Array(width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const point = { x: min.x + (x + .5) * cellSize, y: min.y + (y + .5) * cellSize }
    const tile = tileNavigationSample(region, point, entities), index = y * width + x
    blocked[index] = pointInPolygon(point, polygon) && !obstacles.some(entity => obstacleContains(entity, entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')!, point, entities, Math.max(0, region.agentRadius))) && !tile?.blocked ? 0 : 1
    costs[index] = (tile?.cost ?? 1) * navigationCostMultiplier(regionEntity, region, point, entities)
  }
  const grid = { regionUuid: regionEntity.uuid, revision: gridSignature(regionEntity, region, obstacles, entities), width, height, cellSize, min, blocked, costs, traversalCost: Math.max(.001, finiteNumber(region.traversalCost, 1)), builtAt: now }
  grids.set(regionEntity.uuid, grid)
  region.bakedRevision++
  navigationProfile.bakeCount++
  navigationProfile.bakedCells = width * height
  navigationProfile.lastBakeMilliseconds = performance.now() - started
  return grid
}

function cell(grid: NavigationGrid, point: Vec2): number {
  const x = Math.max(0, Math.min(grid.width - 1, Math.floor((point.x - grid.min.x) / grid.cellSize)))
  const y = Math.max(0, Math.min(grid.height - 1, Math.floor((point.y - grid.min.y) / grid.cellSize)))
  return y * grid.width + x
}

function worldPoint(grid: NavigationGrid, index: number): Vec2 {
  return { x: grid.min.x + (index % grid.width + .5) * grid.cellSize, y: grid.min.y + (Math.floor(index / grid.width) + .5) * grid.cellSize }
}

function neighbors(grid: NavigationGrid, index: number, diagonal: boolean): number[] {
  const x = index % grid.width, y = Math.floor(index / grid.width)
  const offsets = diagonal ? [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]] : [[-1, 0], [1, 0], [0, -1], [0, 1]]
  return offsets.flatMap(([dx, dy]) => {
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
  get length(): number { return this.values.length }
  push(value: { index: number; score: number }): void {
    this.values.push(value); let index = this.values.length - 1
    while (index > 0) { const parent = Math.floor((index - 1) / 2); if (this.values[parent].score <= value.score) break; this.values[index] = this.values[parent]; index = parent }
    this.values[index] = value
  }
  pop(): { index: number; score: number } | undefined {
    const first = this.values[0], last = this.values.pop(); if (!last || !this.values.length) return first
    let index = 0
    while (true) { const left = index * 2 + 1, right = left + 1; if (left >= this.values.length) break; const child = right < this.values.length && this.values[right].score < this.values[left].score ? right : left; if (this.values[child].score >= last.score) break; this.values[index] = this.values[child]; index = child }
    this.values[index] = last; return first
  }
}

function reconstruct(grid: NavigationGrid, cameFrom: Int32Array, goal: number, startPoint: Vec2, goalPoint: Vec2): Vec2[] {
  const cells: number[] = [goal]
  while (cameFrom[cells[cells.length - 1]] >= 0) cells.push(cameFrom[cells[cells.length - 1]])
  cells.reverse()
  return [{ ...startPoint }, ...cells.slice(1, -1).map(index => worldPoint(grid, index)), { ...goalPoint }]
}

function aStar(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean, allowed?: Set<number>): Vec2[] {
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
      const tentative = scores[current] + Math.hypot(nx - cx, ny - cy) * grid.traversalCost * grid.costs[next]
      if (tentative >= scores[next]) continue
      scores[next] = tentative; cameFrom[next] = current
      open.push({ index: next, score: tentative + Math.hypot(goalX - nx, goalY - ny) })
    }
  }
  return []
}

function hierarchicalAStar(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean, requestedClusterSize: number): Vec2[] {
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
  return aStar(grid, startPoint, goalPoint, diagonal, allowed)
}

function pathCost(path: Vec2[]): number {
  let result = 0
  for (let index = 1; index < path.length; index++) result += Math.hypot(path[index].x - path[index - 1].x, path[index].y - path[index - 1].y)
  return result
}

function gridPathWithLinks(grid: NavigationGrid, regionEntity: Entity, region: NavigationRegion2D, start: Vec2, goal: Vec2, entities: Entity[]): Vec2[] {
  const direct = region.algorithm === 'HierarchicalAStar'
    ? hierarchicalAStar(grid, start, goal, region.allowDiagonal, region.clusterSize)
    : region.algorithm === 'FlowField' ? flowFieldPath(grid, start, goal, region.allowDiagonal) : aStar(grid, start, goal, region.allowDiagonal)
  let best = direct, bestCost = direct.length ? pathCost(direct) : Number.POSITIVE_INFINITY
  const pathSegment = (from: Vec2, to: Vec2) => region.algorithm === 'HierarchicalAStar'
    ? hierarchicalAStar(grid, from, to, region.allowDiagonal, region.clusterSize)
    : aStar(grid, from, to, region.allowDiagonal)
  for (const link of (region.links ?? []).filter(candidate => candidate.enabled)) {
    const first = localPointToWorld(regionEntity, link.start, entities), second = localPointToWorld(regionEntity, link.end, entities)
    const directions: Array<[Vec2, Vec2]> = [[first, second]]
    if (link.bidirectional) directions.push([second, first])
    for (const [entry, exit] of directions) {
      const before = pathSegment(start, entry), after = pathSegment(exit, goal)
      if (!before.length || !after.length) continue
      const candidate = [...before, { ...exit }, ...after.slice(1)]
      const cost = pathCost(before) + Math.hypot(exit.x - entry.x, exit.y - entry.y) * Math.max(.001, finiteNumber(link.cost, 1)) + pathCost(after)
      if (cost < bestCost) { best = candidate; bestCost = cost }
    }
  }
  return best
}

function flowFieldPath(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean): Vec2[] {
  const start = cell(grid, startPoint), goal = cell(grid, goalPoint)
  if (grid.blocked[start] || grid.blocked[goal]) return []
  const costs = new Float64Array(grid.blocked.length); costs.fill(Number.POSITIVE_INFINITY); costs[goal] = 0
  const open = new MinHeap(); open.push({ index: goal, score: 0 })
  while (open.length) {
    const current = open.pop()!.index
    for (const next of neighbors(grid, current, diagonal)) {
      const tentative = costs[current] + grid.costs[next]
      if (tentative >= costs[next]) continue
      costs[next] = tentative; open.push({ index: next, score: tentative })
    }
  }
  if (!Number.isFinite(costs[start])) return []
  const path: Vec2[] = [{ ...startPoint }]; let current = start
  for (let guard = 0; guard < grid.blocked.length && current !== goal; guard++) {
    const next = neighbors(grid, current, diagonal).sort((a, b) => costs[a] - costs[b])[0]
    if (next === undefined || costs[next] >= costs[current]) return []
    current = next; path.push(worldPoint(grid, current))
  }
  path[path.length - 1] = { ...goalPoint }
  return path
}

function clearLine(grid: NavigationGrid, first: Vec2, second: Vec2): boolean {
  const distance = Math.hypot(second.x - first.x, second.y - first.y), steps = Math.max(1, Math.ceil(distance / (grid.cellSize * .4)))
  for (let step = 0; step <= steps; step++) if (grid.blocked[cell(grid, { x: first.x + (second.x - first.x) * step / steps, y: first.y + (second.y - first.y) * step / steps })]) return false
  return true
}

function smoothPath(grid: NavigationGrid, path: Vec2[]): Vec2[] {
  if (path.length < 3) return path
  const result = [path[0]]; let index = 0
  while (index < path.length - 1) { let next = path.length - 1; while (next > index + 1 && !clearLine(grid, path[index], path[next])) next--; result.push(path[next]); index = next }
  return result
}

function pointSegmentDistance(point: Vec2, first: Vec2, second: Vec2): number {
  const dx = second.x - first.x, dy = second.y - first.y, lengthSquared = dx * dx + dy * dy
  if (lengthSquared <= EPSILON) return Math.hypot(point.x - first.x, point.y - first.y)
  const factor = Math.max(0, Math.min(1, ((point.x - first.x) * dx + (point.y - first.y) * dy) / lengthSquared))
  return Math.hypot(point.x - (first.x + dx * factor), point.y - (first.y + dy * factor))
}

function pointInOrOnPolygon(point: Vec2, polygon: Vec2[]): boolean {
  return pointInPolygon(point, polygon) || polygon.some((candidate, index) => pointSegmentDistance(point, candidate, polygon[(index + 1) % polygon.length]) < 1e-6)
}

function polygonPath(regionEntity: Entity, region: NavigationRegion2D, start: Vec2, goal: Vec2, entities: Entity[], clearance: number): Vec2[] {
  const polygon = region.polygon.map(point => localPointToWorld(regionEntity, point, entities))
  const obstacles = entities.filter(entity => {
    const obstacle = entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')
    return entity.enabled && obstacle?.enabled && obstacle.navigationLayer === region.navigationLayer
  })
  const walkablePoint = (point: Vec2) => pointInOrOnPolygon(point, polygon) && !obstacles.some(entity => obstacleContains(entity, entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')!, point, entities, clearance))
  const walkableSegment = (first: Vec2, second: Vec2) => {
    const steps = Math.max(2, Math.ceil(Math.hypot(second.x - first.x, second.y - first.y) / Math.max(.05, region.cellSize * .5)))
    for (let step = 0; step <= steps; step++) if (!walkablePoint({ x: first.x + (second.x - first.x) * step / steps, y: first.y + (second.y - first.y) * step / steps })) return false
    return true
  }
  if (!walkablePoint(start) || !walkablePoint(goal)) return []
  const nodes: Vec2[] = [{ ...start }, { ...goal }]
  for (const point of polygon) nodes.push(point)
  for (const entity of obstacles) {
    const obstacle = entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')!, transform = worldTransform(entity, entities)
    if (obstacle.shape === 'Circle') {
      const radius = obstacle.radius + clearance + .001
      for (let index = 0; index < 12; index++) nodes.push({ x: transform.position.x + Math.cos(index / 12 * Math.PI * 2) * radius, y: transform.position.y + Math.sin(index / 12 * Math.PI * 2) * radius })
    } else {
      const halfX = obstacle.size.x * .5 + clearance + .001, halfY = obstacle.size.y * .5 + clearance + .001
      for (const local of [{ x: -halfX, y: -halfY }, { x: halfX, y: -halfY }, { x: halfX, y: halfY }, { x: -halfX, y: halfY }]) nodes.push(localPointToWorld(entity, local, entities))
    }
  }
  const linkEdges = new Map<string, number>()
  for (const link of region.links.filter(link => link.enabled)) {
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
      const distance = linkCost ?? Math.hypot(nodes[next].x - nodes[current].x, nodes[next].y - nodes[current].y) * Math.max(.001, region.traversalCost)
      const tentative = scores[current] + distance
      if (tentative >= scores[next]) continue
      scores[next] = tentative; cameFrom[next] = current
      open.push({ index: next, score: tentative + Math.hypot(goal.x - nodes[next].x, goal.y - nodes[next].y) })
    }
  }
  return []
}

export function findNavigationPath(regionEntity: Entity, start: Vec2, goal: Vec2, entities: Entity[], agentRadius?: number): Vec2[] {
  const region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')
  if (!region) return []
  const started = performance.now()
  navigationProfile.pathQueries++
  if (region.navigationMode === 'Polygon') {
    const path = polygonPath(regionEntity, region, start, goal, entities, Math.max(0, finiteNumber(agentRadius, region.agentRadius)))
    navigationProfile.lastQueryMilliseconds = performance.now() - started
    navigationProfile.maximumQueryMilliseconds = Math.max(navigationProfile.maximumQueryMilliseconds, navigationProfile.lastQueryMilliseconds)
    if (!path.length) navigationProfile.failedQueries++
    return path
  }
  const obstacles = entities.filter(entity => entity.enabled && entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')?.navigationLayer === region.navigationLayer)
  const signature = gridSignature(regionEntity, region, obstacles, entities)
  const cached = grids.get(regionEntity.uuid)
  const now = performance.now()
  const grid = !cached || cached.revision !== signature && (!region.dynamic || now - cached.builtAt >= region.rebakeInterval * 1_000) ? bakeNavigationGrid(regionEntity, entities, now) : cached
  if (!grid) { navigationProfile.failedQueries++; return [] }
  const path = gridPathWithLinks(grid, regionEntity, region, start, goal, entities)
  navigationProfile.lastQueryMilliseconds = performance.now() - started
  navigationProfile.maximumQueryMilliseconds = Math.max(navigationProfile.maximumQueryMilliseconds, navigationProfile.lastQueryMilliseconds)
  if (!path.length) navigationProfile.failedQueries++
  return path
}

function avoid(entity: Entity, desired: Vec2, agent: NavigationAgent2D, candidates: Entity[], entities: Entity[]): Vec2 {
  if (!agent.avoidance) return desired
  const position = worldTransform(entity, entities).position
  let x = desired.x, y = desired.y
  let visited = 0
  const maximumNeighbors = Math.max(1, Math.min(MAX_NAVIGATION_AVOIDANCE_NEIGHBORS, Math.round(finiteNumber(agent.maximumAvoidanceNeighbors, 16))))
  for (const other of candidates) {
    if (other === entity || !other.enabled) continue
    const otherAgent = other.getComponent<NavigationAgent2D>('NavigationAgent2D')
    const obstacle = other.getComponent<NavigationObstacle2D>('NavigationObstacle2D')
    if (!otherAgent && !obstacle) continue
    if (otherAgent && otherAgent.navigationLayer !== agent.navigationLayer) continue
    if (obstacle && obstacle.navigationLayer !== agent.navigationLayer) continue
    if (visited++ >= maximumNeighbors) break
    navigationProfile.avoidancePairs++
    const point = worldTransform(other, entities).position, dx = position.x - point.x, dy = position.y - point.y
    const radius = agent.avoidanceRadius + (otherAgent?.radius ?? obstacle?.radius ?? .5), distance = Math.hypot(dx, dy)
    if (distance > EPSILON && distance < radius) { const strength = (radius - distance) / radius * agent.speed; x += dx / distance * strength; y += dy / distance * strength }
  }
  navigationProfile.maximumNeighbors = Math.max(navigationProfile.maximumNeighbors, visited)
  const length = Math.hypot(x, y); return length > agent.speed ? { x: x / length * agent.speed, y: y / length * agent.speed } : { x, y }
}

export function updateNavigation(entities: Entity[], fixedDelta: number, nowSeconds: number): void {
  const regions = entities.filter(entity => entity.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.enabled)
  const allAgents = entities.filter(entity => entity.enabled && entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.enabled).sort((first, second) => first.uuid.localeCompare(second.uuid))
  const activeAgents = allAgents.slice(0, MAX_NAVIGATION_AGENTS)
  const avoidanceEntities = entities.filter(entity => entity.enabled && (entity.hasComponent('NavigationAgent2D') || entity.hasComponent('NavigationObstacle2D')))
  const spatialCellSize = Math.max(.25, Math.min(64, activeAgents.reduce((maximum, entity) => Math.max(maximum, entity.getComponent<NavigationAgent2D>('NavigationAgent2D')?.avoidanceRadius ?? 1), 1) * 2))
  const spatial = new SpatialHash2D(spatialCellSize), avoidanceByUuid = new Map<string, Entity>()
  for (const entity of avoidanceEntities) {
    const position = worldTransform(entity, entities).position
    spatial.upsert({ id: entity.uuid, bounds: { minX: position.x, minY: position.y, maxX: position.x, maxY: position.y } }); avoidanceByUuid.set(entity.uuid, entity)
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
  for (const entity of activeAgents) {
    const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')
    if (!agent) continue
    const position = worldTransform(entity, entities).position
    const target = agent.targetEntityUuid ? worldTransform(entities.find(candidate => candidate.uuid === agent.targetEntityUuid) ?? entity, entities).position : agent.targetPosition
    const regionEntity = regions.find(candidate => {
      const region = candidate.getComponent<NavigationRegion2D>('NavigationRegion2D')!
      const bit = 1 << ((region.navigationLayer - 1) & 31)
      return region.navigationLayer === agent.navigationLayer && (agent.navigationMask & bit) !== 0 && (region.navigationMask & bit) !== 0
    })
    if (!regionEntity) { agent.pathStatus = 'Unreachable'; agent.path = []; navigationDebugPaths.set(entity.uuid, { entityUuid: entity.uuid, points: [], status: 'Unreachable' }); continue }
    const needsRepath = (nextRepath.get(entity.uuid) ?? 0) <= nowSeconds || !agent.path.length
    if (needsRepath && repathEligible.has(entity.uuid)) {
      const raw = findNavigationPath(regionEntity, position, target, entities, agent.radius)
      const grid = grids.get(regionEntity.uuid)
      agent.path = agent.pathSmoothing && grid ? smoothPath(grid, raw) : raw
      agent.pathIndex = Math.min(1, Math.max(0, agent.path.length - 1))
      agent.pathStatus = agent.path.length ? 'Ready' : 'Unreachable'
      nextRepath.set(entity.uuid, nowSeconds + Math.max(.02, agent.repathInterval))
      navigationDebugPaths.set(entity.uuid, { entityUuid: entity.uuid, points: agent.path.map(point => ({ ...point })), status: agent.pathStatus === 'Ready' ? 'Ready' : 'Unreachable' })
    } else if (needsRepath) {
      navigationProfile.deferredRepaths++
      if (!agent.path.length) agent.pathStatus = 'Pending'
    }
    const waypoint = agent.path[agent.pathIndex]
    if (!waypoint) { agent.velocity = { x: 0, y: 0 }; continue }
    const dx = waypoint.x - position.x, dy = waypoint.y - position.y, distance = Math.hypot(dx, dy)
    if (distance <= Math.max(agent.stoppingDistance, agent.radius * .25)) { agent.pathIndex++; continue }
    const nearby = spatial.query({ minX: position.x - spatialCellSize, minY: position.y - spatialCellSize, maxX: position.x + spatialCellSize, maxY: position.y + spatialCellSize }).flatMap(uuid => { const candidate = avoidanceByUuid.get(uuid); return candidate ? [candidate] : [] })
    const desired = avoid(entity, { x: dx / distance * agent.speed, y: dy / distance * agent.speed }, agent, nearby, entities)
    const maximumDelta = Math.max(0, agent.acceleration) * fixedDelta
    const changeX = desired.x - agent.velocity.x, changeY = desired.y - agent.velocity.y, changeLength = Math.hypot(changeX, changeY)
    const factor = changeLength > maximumDelta && maximumDelta > 0 ? maximumDelta / changeLength : 1
    agent.velocity = { x: agent.velocity.x + changeX * factor, y: agent.velocity.y + changeY * factor }
    entity.velocity = { ...agent.velocity }
  }
}

export function clearNavigationData(regionUuid?: string): void {
  if (regionUuid) grids.delete(regionUuid); else grids.clear()
  for (const [entityUuid, path] of navigationDebugPaths) if (!regionUuid || path.entityUuid === regionUuid) navigationDebugPaths.delete(entityUuid)
}

export function rebakeNavigation(entities: Entity[]): { baked: number; cells: number; milliseconds: number } {
  const started = performance.now(); let baked = 0, cells = 0
  for (const entity of entities) {
    const region = entity.getComponent<NavigationRegion2D>('NavigationRegion2D')
    if (!entity.enabled || !region?.enabled || region.navigationMode !== 'Grid') continue
    const grid = bakeNavigationGrid(entity, entities)
    if (grid) { baked++; cells += grid.width * grid.height }
  }
  return { baked, cells, milliseconds: performance.now() - started }
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < value.length; index++) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 0x01000193) >>> 0 }
  return hash.toString(16).padStart(8, '0')
}

export function cancelNavigationBake(): boolean {
  if (!bakeController) return false
  bakeController.abort(); navigationBakeState.cancelled = true
  return true
}

export async function requestNavigationBake(entities: Entity[]): Promise<{ baked: number; cells: number; milliseconds: number; cancelled: boolean; artifactHash: string }> {
  cancelNavigationBake()
  const controller = new AbortController(); bakeController = controller
  Object.assign(navigationBakeState, { active: true, cancelled: false, progress: 0, regions: 0, cells: 0, artifactHash: '', error: '' })
  const started = performance.now()
  const regions = entities.filter(entity => entity.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.navigationMode === 'Grid').sort((a, b) => a.uuid.localeCompare(b.uuid))
  try {
    let sliceStarted = performance.now()
    for (let index = 0; index < regions.length; index++) {
      if (index === 0 || performance.now() - sliceStarted >= performanceRuntimeSettings.frameWorkBudgetMs) {
        await new Promise<void>(resolve => setTimeout(resolve, 0))
        sliceStarted = performance.now()
      }
      if (controller.signal.aborted) break
      const grid = bakeNavigationGrid(regions[index], entities)
      if (controller.signal.aborted) break
      if (grid) { navigationBakeState.regions++; navigationBakeState.cells += grid.width * grid.height }
      navigationBakeState.progress = (index + 1) / Math.max(1, regions.length)
    }
    const cancelled = controller.signal.aborted
    const artifact = [...grids.values()].sort((a, b) => a.regionUuid.localeCompare(b.regionUuid)).map(grid => [grid.regionUuid, grid.revision, grid.width, grid.height, grid.cellSize, stableHash(Array.from(grid.blocked).join('')), stableHash(Array.from(grid.costs).join(','))])
    navigationBakeState.artifactHash = stableHash(JSON.stringify(artifact))
    navigationBakeState.cancelled = cancelled
    if (!cancelled) navigationBakeState.progress = 1
    return { baked: navigationBakeState.regions, cells: navigationBakeState.cells, milliseconds: performance.now() - started, cancelled, artifactHash: navigationBakeState.artifactHash }
  } catch (error) {
    navigationBakeState.error = error instanceof Error ? error.message : String(error)
    throw error
  } finally {
    if (bakeController === controller) bakeController = null
    navigationBakeState.active = false
  }
}

export function navigationProfileSnapshot(): typeof navigationProfile { return { ...navigationProfile } }

export function resetNavigation(): void {
  cancelNavigationBake(); grids.clear(); nextRepath.clear(); navigationDebugPaths.clear(); repathCursor = 0
  Object.assign(navigationBakeState, { active: false, cancelled: false, progress: 0, regions: 0, cells: 0, artifactHash: '', error: '' })
  Object.assign(navigationProfile, { bakeCount: 0, pathQueries: 0, failedQueries: 0, lastBakeMilliseconds: 0, lastQueryMilliseconds: 0, maximumQueryMilliseconds: 0, bakedCells: 0, activeAgents: 0, avoidancePairs: 0, deferredRepaths: 0, droppedAgents: 0, maximumNeighbors: 0 })
}
