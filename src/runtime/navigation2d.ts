import type { Entity } from '../world/Entity'
import type { NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D } from '../world/components'
import { finiteNumber } from '../world/geometry'
import { localPointToWorld, worldPointToLocal, worldTransform } from '../world/hierarchy'
import type { Vec2 } from '../world/types'

const MAX_GRID_CELLS = 262_144
const EPSILON = 1e-9

interface NavigationGrid {
  regionUuid: string
  revision: string
  width: number
  height: number
  cellSize: number
  min: Vec2
  blocked: Uint8Array
  traversalCost: number
  builtAt: number
}

export interface NavigationDebugPath { entityUuid: string; points: Vec2[]; status: 'Ready' | 'Unreachable' }
export const navigationDebugPaths = new Map<string, NavigationDebugPath>()
const grids = new Map<string, NavigationGrid>()
const nextRepath = new Map<string, number>()

function pointInPolygon(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index], b = polygon[previous]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / Math.max(EPSILON, b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function obstacleContains(entity: Entity, obstacle: NavigationObstacle2D, point: Vec2, entities: Entity[]): boolean {
  const local = worldPointToLocal(entity, point, entities)
  if (obstacle.shape === 'Circle') return local.x * local.x + local.y * local.y <= obstacle.radius * obstacle.radius
  return Math.abs(local.x) <= obstacle.size.x * .5 && Math.abs(local.y) <= obstacle.size.y * .5
}

function gridSignature(regionEntity: Entity, region: NavigationRegion2D, obstacles: Entity[], entities: Entity[]): string {
  const transform = worldTransform(regionEntity, entities)
  return JSON.stringify([
    region.polygon, region.cellSize, region.navigationLayer, region.traversalCost,
    transform.position, transform.rotation, transform.scale,
    ...obstacles.map(entity => {
      const obstacle = entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')!
      return [entity.uuid, worldTransform(entity, entities), obstacle.shape, obstacle.size, obstacle.radius, obstacle.navigationLayer, obstacle.enabled]
    })
  ])
}

export function bakeNavigationGrid(regionEntity: Entity, entities: Entity[], now = performance.now()): NavigationGrid | null {
  const region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')
  if (!region?.enabled || region.polygon.length < 3) return null
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
  const blocked = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const point = { x: min.x + (x + .5) * cellSize, y: min.y + (y + .5) * cellSize }
    blocked[y * width + x] = pointInPolygon(point, polygon) && !obstacles.some(entity => obstacleContains(entity, entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')!, point, entities)) ? 0 : 1
  }
  const grid = { regionUuid: regionEntity.uuid, revision: gridSignature(regionEntity, region, obstacles, entities), width, height, cellSize, min, blocked, traversalCost: Math.max(.001, finiteNumber(region.traversalCost, 1)), builtAt: now }
  grids.set(regionEntity.uuid, grid)
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

function aStar(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean): Vec2[] {
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
      const nx = next % grid.width, ny = Math.floor(next / grid.width)
      const tentative = scores[current] + Math.hypot(nx - cx, ny - cy) * grid.traversalCost
      if (tentative >= scores[next]) continue
      scores[next] = tentative; cameFrom[next] = current
      open.push({ index: next, score: tentative + Math.hypot(goalX - nx, goalY - ny) })
    }
  }
  return []
}

function flowFieldPath(grid: NavigationGrid, startPoint: Vec2, goalPoint: Vec2, diagonal: boolean): Vec2[] {
  const start = cell(grid, startPoint), goal = cell(grid, goalPoint)
  if (grid.blocked[start] || grid.blocked[goal]) return []
  const costs = new Float64Array(grid.blocked.length); costs.fill(Number.POSITIVE_INFINITY); costs[goal] = 0
  const open = new MinHeap(); open.push({ index: goal, score: 0 })
  while (open.length) {
    const current = open.pop()!.index
    for (const next of neighbors(grid, current, diagonal)) {
      const tentative = costs[current] + 1
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

export function findNavigationPath(regionEntity: Entity, start: Vec2, goal: Vec2, entities: Entity[]): Vec2[] {
  const region = regionEntity.getComponent<NavigationRegion2D>('NavigationRegion2D')
  if (!region) return []
  const obstacles = entities.filter(entity => entity.enabled && entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')?.navigationLayer === region.navigationLayer)
  const signature = gridSignature(regionEntity, region, obstacles, entities)
  const cached = grids.get(regionEntity.uuid)
  const now = performance.now()
  const grid = !cached || cached.revision !== signature && (!region.dynamic || now - cached.builtAt >= region.rebakeInterval * 1_000) ? bakeNavigationGrid(regionEntity, entities, now) : cached
  if (!grid) return []
  const path = region.algorithm === 'FlowField' ? flowFieldPath(grid, start, goal, region.allowDiagonal) : aStar(grid, start, goal, region.allowDiagonal)
  return path
}

function avoid(entity: Entity, desired: Vec2, agent: NavigationAgent2D, entities: Entity[]): Vec2 {
  if (!agent.avoidance) return desired
  const position = worldTransform(entity, entities).position
  let x = desired.x, y = desired.y
  for (const other of entities) {
    if (other === entity || !other.enabled) continue
    const otherAgent = other.getComponent<NavigationAgent2D>('NavigationAgent2D')
    const obstacle = other.getComponent<NavigationObstacle2D>('NavigationObstacle2D')
    if (!otherAgent && !obstacle) continue
    const point = worldTransform(other, entities).position, dx = position.x - point.x, dy = position.y - point.y
    const radius = agent.avoidanceRadius + (otherAgent?.radius ?? obstacle?.radius ?? .5), distance = Math.hypot(dx, dy)
    if (distance > EPSILON && distance < radius) { const strength = (radius - distance) / radius * agent.speed; x += dx / distance * strength; y += dy / distance * strength }
  }
  const length = Math.hypot(x, y); return length > agent.speed ? { x: x / length * agent.speed, y: y / length * agent.speed } : { x, y }
}

export function updateNavigation(entities: Entity[], fixedDelta: number, nowSeconds: number): void {
  const regions = entities.filter(entity => entity.enabled && entity.getComponent<NavigationRegion2D>('NavigationRegion2D')?.enabled)
  for (const entity of entities) {
    const agent = entity.getComponent<NavigationAgent2D>('NavigationAgent2D')
    if (!entity.enabled || !agent?.enabled) continue
    const position = worldTransform(entity, entities).position
    const target = agent.targetEntityUuid ? worldTransform(entities.find(candidate => candidate.uuid === agent.targetEntityUuid) ?? entity, entities).position : agent.targetPosition
    const regionEntity = regions.find(candidate => candidate.getComponent<NavigationRegion2D>('NavigationRegion2D')!.navigationLayer === agent.navigationLayer)
    if (!regionEntity) { agent.pathStatus = 'Unreachable'; agent.path = []; navigationDebugPaths.set(entity.uuid, { entityUuid: entity.uuid, points: [], status: 'Unreachable' }); continue }
    if ((nextRepath.get(entity.uuid) ?? 0) <= nowSeconds || !agent.path.length) {
      const raw = findNavigationPath(regionEntity, position, target, entities)
      const grid = grids.get(regionEntity.uuid)
      agent.path = agent.pathSmoothing && grid ? smoothPath(grid, raw) : raw
      agent.pathIndex = Math.min(1, Math.max(0, agent.path.length - 1))
      agent.pathStatus = agent.path.length ? 'Ready' : 'Unreachable'
      nextRepath.set(entity.uuid, nowSeconds + Math.max(.02, agent.repathInterval))
      navigationDebugPaths.set(entity.uuid, { entityUuid: entity.uuid, points: agent.path.map(point => ({ ...point })), status: agent.pathStatus === 'Ready' ? 'Ready' : 'Unreachable' })
    }
    const waypoint = agent.path[agent.pathIndex]
    if (!waypoint) { agent.velocity = { x: 0, y: 0 }; continue }
    const dx = waypoint.x - position.x, dy = waypoint.y - position.y, distance = Math.hypot(dx, dy)
    if (distance <= Math.max(agent.stoppingDistance, agent.radius * .25)) { agent.pathIndex++; continue }
    const desired = avoid(entity, { x: dx / distance * agent.speed, y: dy / distance * agent.speed }, agent, entities)
    const maximumDelta = Math.max(0, agent.acceleration) * fixedDelta
    const changeX = desired.x - agent.velocity.x, changeY = desired.y - agent.velocity.y, changeLength = Math.hypot(changeX, changeY)
    const factor = changeLength > maximumDelta && maximumDelta > 0 ? maximumDelta / changeLength : 1
    agent.velocity = { x: agent.velocity.x + changeX * factor, y: agent.velocity.y + changeY * factor }
    entity.velocity = { ...agent.velocity }
  }
}

export function resetNavigation(): void { grids.clear(); nextRepath.clear(); navigationDebugPaths.clear() }

