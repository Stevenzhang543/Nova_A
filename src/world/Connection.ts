import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import type { Entity } from './Entity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
import { finiteNumber, normalizeAngle } from './geometry'

export type ConnectionStyle = 'straight' | 'curved' | 'manual'
export type AnchorMode = 'center' | 'surface' | 'vertex' | 'side'
export type ConnectionBreakState = 'intact' | 'snapped' | 'torn'

export interface ConnectionAnchor {
  entityId: number
  mode: AnchorMode
  localPoint: Vec2
  index: number
  sideT: number
}

export interface Connection {
  id: number
  name: string
  style: ConnectionStyle
  anchors: ConnectionAnchor[]
  restLengths: number[]
  manualSegments: Vec2[][]
  curvature: number
  stretchable: boolean
  bendable: boolean
  stiffness: number
  damping: number
  maxStretchRatio: number
  bendingToleranceMass: number
  stretchingToleranceMass: number
  binding: boolean
  bindOffset: Vec2
  bindAngle: number
  breakState: ConnectionBreakState
  tension: number
  strain: number
}

export const CONNECTION_STRIDE = 24

function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

function polygonVertices(entity: Entity): Vec2[] | null {
  return entity instanceof BoxEntity || entity instanceof TriangleEntity ? entity.vertices : null
}

function worldToLocal(entity: Entity, point: Vec2): Vec2 {
  const rotated = rotate({
    x: finiteNumber(point.x) - entity.transform.position.x,
    y: finiteNumber(point.y) - entity.transform.position.y
  }, -entity.transform.rotation)
  return {
    x: rotated.x / Math.max(Math.abs(entity.transform.scale.x), 1e-12),
    y: rotated.y / Math.max(Math.abs(entity.transform.scale.y), 1e-12)
  }
}

function localToWorld(entity: Entity, point: Vec2): Vec2 {
  const rotated = rotate({
    x: point.x * entity.transform.scale.x,
    y: point.y * entity.transform.scale.y
  }, entity.transform.rotation)
  return {
    x: entity.transform.position.x + rotated.x,
    y: entity.transform.position.y + rotated.y
  }
}

function localDirection(entity: Entity, toward: Vec2): Vec2 {
  const world = {
    x: finiteNumber(toward.x) - entity.transform.position.x,
    y: finiteNumber(toward.y) - entity.transform.position.y
  }
  const rotated = rotate(world, -entity.transform.rotation)
  const direction = {
    x: rotated.x / entity.transform.scale.x,
    y: rotated.y / entity.transform.scale.y
  }
  const length = Math.hypot(direction.x, direction.y)
  return length > 1e-12 ? { x: direction.x / length, y: direction.y / length } : { x: 1, y: 0 }
}

function rayPolygonSurface(vertices: Vec2[], direction: Vec2): Vec2 {
  let bestT = Number.POSITIVE_INFINITY
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index]
    const b = vertices[(index + 1) % vertices.length]
    const edge = { x: b.x - a.x, y: b.y - a.y }
    const denominator = direction.x * edge.y - direction.y * edge.x
    if (Math.abs(denominator) <= 1e-14) continue
    const rayT = (a.x * edge.y - a.y * edge.x) / denominator
    const edgeT = (a.x * direction.y - a.y * direction.x) / denominator
    if (rayT >= 0 && edgeT >= 0 && edgeT <= 1 && rayT < bestT) bestT = rayT
  }
  return Number.isFinite(bestT)
    ? { x: direction.x * bestT, y: direction.y * bestT }
    : { x: 0, y: 0 }
}

export function deriveAnchor(
  entity: Entity,
  mode: AnchorMode,
  index = 0,
  sideT = 0.5,
  toward: Vec2 = entity.transform.position
): ConnectionAnchor {
  const vertices = polygonVertices(entity)
  const safeIndex = vertices?.length ? Math.abs(Math.round(finiteNumber(index))) % vertices.length : 0
  const safeSideT = Math.min(1, Math.max(0, finiteNumber(sideT, 0.5)))
  let localPoint: Vec2 = { x: 0, y: 0 }

  if (mode === 'vertex' && vertices?.length) {
    localPoint = { ...vertices[safeIndex] }
  } else if (mode === 'side' && vertices?.length) {
    const a = vertices[safeIndex]
    const b = vertices[(safeIndex + 1) % vertices.length]
    localPoint = {
      x: a.x + (b.x - a.x) * safeSideT,
      y: a.y + (b.y - a.y) * safeSideT
    }
  } else if (mode === 'surface') {
    const direction = localDirection(entity, toward)
    if (entity instanceof CircleEntity) {
      const scale = 1 / Math.sqrt(
        direction.x * direction.x / (entity.radiusX * entity.radiusX)
        + direction.y * direction.y / (entity.radiusY * entity.radiusY)
      )
      localPoint = { x: direction.x * scale, y: direction.y * scale }
    } else if (vertices?.length) {
      localPoint = rayPolygonSurface(vertices, direction)
    }
  }

  return { entityId: entity.id, mode, localPoint, index: safeIndex, sideT: safeSideT }
}

export function anchorAtWorldPoint(entity: Entity, point: Vec2): ConnectionAnchor {
  const local = worldToLocal(entity, point)
  if (entity instanceof CircleEntity) {
    const directionLength = Math.hypot(local.x, local.y)
    const direction = directionLength > 1e-12 ? local : { x: entity.radiusX, y: 0 }
    const divisor = Math.sqrt(
      direction.x * direction.x / (entity.radiusX * entity.radiusX)
      + direction.y * direction.y / (entity.radiusY * entity.radiusY)
    )
    const localPoint = divisor > 1e-12
      ? { x: direction.x / divisor, y: direction.y / divisor }
      : { x: entity.radiusX, y: 0 }
    return { entityId: entity.id, mode: 'surface', localPoint, index: 0, sideT: 0.5 }
  }

  const vertices = polygonVertices(entity)
  if (!vertices?.length) return deriveAnchor(entity, 'surface', 0, 0.5, point)
  let bestIndex = 0
  let bestT = 0
  let bestPoint = vertices[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index]
    const b = vertices[(index + 1) % vertices.length]
    const edge = { x: b.x - a.x, y: b.y - a.y }
    const lengthSquared = edge.x * edge.x + edge.y * edge.y
    const sideT = lengthSquared > 1e-24
      ? Math.min(1, Math.max(0, ((local.x - a.x) * edge.x + (local.y - a.y) * edge.y) / lengthSquared))
      : 0
    const candidate = { x: a.x + edge.x * sideT, y: a.y + edge.y * sideT }
    const distance = Math.hypot(local.x - candidate.x, local.y - candidate.y)
    if (distance < bestDistance) {
      bestDistance = distance
      bestIndex = index
      bestT = sideT
      bestPoint = candidate
    }
  }
  return { entityId: entity.id, mode: 'side', localPoint: bestPoint, index: bestIndex, sideT: bestT }
}

export function entityBoundaryPoints(entity: Entity, ellipseSamples = 48): Vec2[] {
  if (entity instanceof CircleEntity) {
    return Array.from({ length: Math.max(16, ellipseSamples) }, (_, index) => {
      const angle = index * Math.PI * 2 / Math.max(16, ellipseSamples)
      return localToWorld(entity, {
        x: Math.cos(angle) * entity.radiusX,
        y: Math.sin(angle) * entity.radiusY
      })
    })
  }
  return (polygonVertices(entity) ?? []).map(point => localToWorld(entity, point))
}

function supportPoint(entity: Entity, direction: Vec2): Vec2 {
  if (entity instanceof CircleEntity) {
    const localDirection = rotate(direction, -entity.transform.rotation)
    const scaledDirection = {
      x: localDirection.x * entity.transform.scale.x,
      y: localDirection.y * entity.transform.scale.y
    }
    const denominator = Math.hypot(
      entity.radiusX * scaledDirection.x,
      entity.radiusY * scaledDirection.y
    )
    if (denominator <= 1e-18) return { ...entity.transform.position }
    return localToWorld(entity, {
      x: entity.radiusX * entity.radiusX * scaledDirection.x / denominator,
      y: entity.radiusY * entity.radiusY * scaledDirection.y / denominator
    })
  }

  const vertices = polygonVertices(entity) ?? []
  let best = entity.transform.position
  let bestProjection = Number.NEGATIVE_INFINITY
  for (const vertex of vertices) {
    const world = localToWorld(entity, vertex)
    const projection = world.x * direction.x + world.y * direction.y
    if (projection > bestProjection) { bestProjection = projection; best = world }
  }
  return best
}

function minkowskiSupport(a: Entity, b: Entity, direction: Vec2): Vec2 {
  const pointA = supportPoint(a, direction)
  const pointB = supportPoint(b, { x: -direction.x, y: -direction.y })
  return { x: pointA.x - pointB.x, y: pointA.y - pointB.y }
}

function tripleProduct(a: Vec2, b: Vec2, c: Vec2): Vec2 {
  const ac = a.x * c.x + a.y * c.y
  const bc = b.x * c.x + b.y * c.y
  return { x: b.x * ac - a.x * bc, y: b.y * ac - a.y * bc }
}

function updateSimplex(simplex: Vec2[]): { containsOrigin: boolean; direction: Vec2 } {
  const a = simplex[simplex.length - 1]
  const ao = { x: -a.x, y: -a.y }
  if (simplex.length === 2) {
    const b = simplex[0]
    const ab = { x: b.x - a.x, y: b.y - a.y }
    let direction = tripleProduct(ab, ao, ab)
    if (direction.x * direction.x + direction.y * direction.y <= 1e-20) {
      direction = { x: -ab.y, y: ab.x }
      if (direction.x * ao.x + direction.y * ao.y < 0) direction = { x: -direction.x, y: -direction.y }
    }
    return { containsOrigin: false, direction }
  }

  const b = simplex[1]
  const c = simplex[0]
  const ab = { x: b.x - a.x, y: b.y - a.y }
  const ac = { x: c.x - a.x, y: c.y - a.y }
  const abOutside = tripleProduct(ac, ab, ab)
  if (abOutside.x * ao.x + abOutside.y * ao.y > 1e-12) {
    simplex.splice(0, 1)
    return { containsOrigin: false, direction: abOutside }
  }
  const acOutside = tripleProduct(ab, ac, ac)
  if (acOutside.x * ao.x + acOutside.y * ao.y > 1e-12) {
    simplex.splice(1, 1)
    return { containsOrigin: false, direction: acOutside }
  }
  return { containsOrigin: true, direction: { x: 0, y: 0 } }
}

export function entitiesOverlap(a: Entity, b: Entity): boolean {
  let direction = {
    x: b.transform.position.x - a.transform.position.x,
    y: b.transform.position.y - a.transform.position.y
  }
  if (direction.x * direction.x + direction.y * direction.y <= 1e-20) direction = { x: 1, y: 0 }
  const simplex = [minkowskiSupport(a, b, direction)]
  direction = { x: -simplex[0].x, y: -simplex[0].y }

  for (let iteration = 0; iteration < 64; iteration++) {
    if (direction.x * direction.x + direction.y * direction.y <= 1e-20) return true
    const point = minkowskiSupport(a, b, direction)
    if (point.x * direction.x + point.y * direction.y < -1e-10) return false
    if (simplex.some(candidate => Math.hypot(candidate.x - point.x, candidate.y - point.y) <= 1e-12)) return false
    simplex.push(point)
    const result = updateSimplex(simplex)
    if (result.containsOrigin) return true
    direction = result.direction
  }
  return false
}

export function smoothManualPath(points: Vec2[], iterations = 2): Vec2[] {
  let result = points
    .map(point => ({ x: finiteNumber(point.x), y: finiteNumber(point.y) }))
    .filter((point, index, values) => index === 0 || Math.hypot(point.x - values[index - 1].x, point.y - values[index - 1].y) > 1e-9)
    .slice(0, 256)
  if (result.length < 3) return result
  for (let iteration = 0; iteration < iterations && result.length < 512; iteration++) {
    const smoothed: Vec2[] = [{ ...result[0] }]
    for (let index = 0; index < result.length - 1; index++) {
      const a = result[index]
      const b = result[index + 1]
      smoothed.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 }
      )
    }
    smoothed.push({ ...result[result.length - 1] })
    result = smoothed.slice(0, 512)
  }
  return result
}

export function resolveAnchor(anchor: ConnectionAnchor, entities: Entity[]): Vec2 | null {
  const entity = entities.find(candidate => candidate.id === anchor.entityId)
  if (!entity) return null
  const scaled = {
    x: anchor.localPoint.x * entity.transform.scale.x,
    y: anchor.localPoint.y * entity.transform.scale.y
  }
  const rotated = rotate(scaled, entity.transform.rotation)
  return {
    x: entity.transform.position.x + rotated.x,
    y: entity.transform.position.y + rotated.y
  }
}

export function scaledLocalAnchor(anchor: ConnectionAnchor, entity: Entity): Vec2 {
  return {
    x: finiteNumber(anchor.localPoint.x) * entity.transform.scale.x,
    y: finiteNumber(anchor.localPoint.y) * entity.transform.scale.y
  }
}

export function createConnection(
  id: number,
  entities: Entity[],
  entityIds: number[],
  modes: AnchorMode[] = []
): Connection {
  const connected = entityIds
    .map(entityId => entities.find(entity => entity.id === entityId))
    .filter((entity): entity is Entity => Boolean(entity))
  if (connected.length < 2) throw new Error('A connection requires at least two valid objects')

  const anchors = connected.map((entity, index) => {
    const toward = connected[index + 1]?.transform.position ?? connected[index - 1].transform.position
    return deriveAnchor(entity, modes[index] ?? 'surface', 0, 0.5, toward)
  })
  const restLengths = anchors.slice(0, -1).map((anchor, index) => {
    const a = resolveAnchor(anchor, entities)!
    const b = resolveAnchor(anchors[index + 1], entities)!
    return Math.max(1e-6, Math.hypot(b.x - a.x, b.y - a.y))
  })

  return {
    id,
    name: `Connection ${id}`,
    style: 'straight',
    anchors,
    restLengths,
    manualSegments: restLengths.map(() => [{ x: 0, y: 0 }, { x: 1, y: 0 }]),
    curvature: 0.18,
    stretchable: false,
    bendable: true,
    stiffness: 1200,
    damping: 35,
    maxStretchRatio: 1.25,
    bendingToleranceMass: 1e12,
    stretchingToleranceMass: 1e12,
    binding: false,
    bindOffset: { x: 0, y: 0 },
    bindAngle: 0,
    breakState: 'intact',
    tension: 0,
    strain: 0
  }
}

export function normalizeConnection(connection: Connection, entities: Entity[]): boolean {
  connection.name = typeof connection.name === 'string' && connection.name.trim()
    ? connection.name.trim().slice(0, 80)
    : `Connection ${connection.id}`
  connection.style = connection.style === 'curved' || connection.style === 'manual' ? connection.style : 'straight'
  connection.curvature = Math.min(2, Math.max(-2, finiteNumber(connection.curvature, 0.18)))
  connection.stiffness = Math.min(1e12, Math.max(0, finiteNumber(connection.stiffness, 1200)))
  connection.damping = Math.min(1e9, Math.max(0, finiteNumber(connection.damping, 35)))
  connection.maxStretchRatio = Math.min(1000, Math.max(1, finiteNumber(connection.maxStretchRatio, 1.25)))
  connection.bendingToleranceMass = Math.min(1e50, Math.max(0, finiteNumber(connection.bendingToleranceMass, 1e12)))
  connection.stretchingToleranceMass = Math.min(1e50, Math.max(0, finiteNumber(connection.stretchingToleranceMass, 1e12)))
  connection.binding = connection.binding === true
  const rawBindOffset = connection.bindOffset as Vec2 | undefined
  const hasBindOffset = rawBindOffset && Number.isFinite(Number(rawBindOffset.x)) && Number.isFinite(Number(rawBindOffset.y))
  connection.bindOffset = hasBindOffset
    ? { x: finiteNumber(rawBindOffset.x), y: finiteNumber(rawBindOffset.y) }
    : { x: 0, y: 0 }
  connection.bindAngle = normalizeAngle(connection.bindAngle)
  connection.breakState = connection.breakState === 'snapped' || connection.breakState === 'torn' ? connection.breakState : 'intact'
  connection.tension = Math.max(0, finiteNumber(connection.tension))
  connection.strain = Math.max(0, finiteNumber(connection.strain))
  connection.anchors = connection.anchors.filter(anchor => entities.some(entity => entity.id === anchor.entityId))
  if (connection.anchors.length < 2) return false
  if (connection.binding) connection.anchors = connection.anchors.slice(0, 2)

  for (const anchor of connection.anchors) {
    const entity = entities.find(candidate => candidate.id === anchor.entityId)!
    anchor.mode = anchor.mode === 'center' || anchor.mode === 'vertex' || anchor.mode === 'side' ? anchor.mode : 'surface'
    anchor.localPoint = {
      x: finiteNumber(anchor.localPoint?.x),
      y: finiteNumber(anchor.localPoint?.y)
    }
    anchor.index = Math.max(0, Math.round(finiteNumber(anchor.index)))
    anchor.sideT = Math.min(1, Math.max(0, finiteNumber(anchor.sideT, 0.5)))
    if (!Number.isFinite(anchor.localPoint.x + anchor.localPoint.y)) {
      Object.assign(anchor, deriveAnchor(entity, anchor.mode, anchor.index, anchor.sideT))
    }
  }

  if (connection.binding) {
    const entityA = entities.find(entity => entity.id === connection.anchors[0].entityId)!
    const entityB = entities.find(entity => entity.id === connection.anchors[1].entityId)!
    connection.anchors[0] = deriveAnchor(entityA, 'center')
    connection.anchors[1] = deriveAnchor(entityB, 'center')
    if (!hasBindOffset) {
      connection.bindOffset = rotate({
        x: entityB.transform.position.x - entityA.transform.position.x,
        y: entityB.transform.position.y - entityA.transform.position.y
      }, -entityA.transform.rotation)
      connection.bindAngle = normalizeAngle(entityB.transform.rotation - entityA.transform.rotation)
    }
  }

  const segmentCount = connection.anchors.length - 1
  connection.restLengths = Array.from({ length: segmentCount }, (_, index) => {
    const fallbackA = resolveAnchor(connection.anchors[index], entities)!
    const fallbackB = resolveAnchor(connection.anchors[index + 1], entities)!
    const fallback = Math.max(1e-6, Math.hypot(fallbackB.x - fallbackA.x, fallbackB.y - fallbackA.y))
    return Math.min(1e50, Math.max(1e-6, finiteNumber(connection.restLengths?.[index], fallback)))
  })
  connection.manualSegments = Array.from({ length: segmentCount }, (_, index) => {
    const points = Array.isArray(connection.manualSegments?.[index]) ? connection.manualSegments[index] : []
    const normalized = points
      .map(point => ({ x: finiteNumber(point?.x), y: finiteNumber(point?.y) }))
      .filter(point => Number.isFinite(point.x + point.y))
      .slice(0, 1024)
    if (normalized.length < 2) return [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    normalized[0] = { x: 0, y: 0 }
    normalized[normalized.length - 1] = { x: 1, y: 0 }
    return normalized
  })
  return true
}

export function routePoints(connection: Connection, entities: Entity[]): Vec2[][] {
  if (connection.binding) return []
  const positions = connection.anchors.map(anchor => resolveAnchor(anchor, entities))
  const segments: Vec2[][] = []
  for (let index = 0; index < positions.length - 1; index++) {
    const start = positions[index]
    const end = positions[index + 1]
    if (!start || !end) continue
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.max(1e-12, Math.hypot(dx, dy))
    const normal = { x: -dy / length, y: dx / length }
    if (connection.style === 'straight') {
      segments.push([start, end])
    } else if (connection.style === 'curved') {
      segments.push([
        start,
        { x: (start.x + end.x) / 2 + normal.x * length * connection.curvature, y: (start.y + end.y) / 2 + normal.y * length * connection.curvature },
        end
      ])
    } else {
      segments.push((connection.manualSegments[index] ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }]).map(point => ({
        x: start.x + dx * point.x + normal.x * length * point.y,
        y: start.y + dy * point.x + normal.y * length * point.y
      })))
    }
  }
  return segments
}

export function setManualRoute(connection: Connection, points: Vec2[], entities: Entity[]): void {
  const anchors = connection.anchors.map(anchor => resolveAnchor(anchor, entities)).filter((point): point is Vec2 => Boolean(point))
  const smoothedPoints = smoothManualPath(points)
  if (anchors.length < 2 || smoothedPoints.length < 2) return
  const segmentCount = anchors.length - 1
  connection.manualSegments = Array.from({ length: segmentCount }, () => [] as Vec2[])
  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
    const startIndex = Math.floor(segmentIndex * (smoothedPoints.length - 1) / segmentCount)
    const endIndex = Math.max(startIndex + 1, Math.ceil((segmentIndex + 1) * (smoothedPoints.length - 1) / segmentCount))
    const sample = smoothedPoints.slice(startIndex, endIndex + 1)
    const start = anchors[segmentIndex]
    const end = anchors[segmentIndex + 1]
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.max(1e-12, Math.hypot(dx, dy))
    const normal = { x: -dy / length, y: dx / length }
    connection.manualSegments[segmentIndex] = sample.map(point => {
      const relative = { x: point.x - start.x, y: point.y - start.y }
      return {
        x: (relative.x * dx + relative.y * dy) / (length * length),
        y: (relative.x * normal.x + relative.y * normal.y) / length
      }
    })
    connection.manualSegments[segmentIndex][0] = { x: 0, y: 0 }
    connection.manualSegments[segmentIndex][connection.manualSegments[segmentIndex].length - 1] = { x: 1, y: 0 }
  }
}

export function configureBinding(connection: Connection, entities: Entity[]): boolean {
  if (connection.anchors.length < 2) return false
  const entityA = entities.find(entity => entity.id === connection.anchors[0].entityId)
  const entityB = entities.find(entity => entity.id === connection.anchors[1].entityId)
  if (!entityA || !entityB || entityA.id === entityB.id) return false
  connection.anchors = [deriveAnchor(entityA, 'center'), deriveAnchor(entityB, 'center')]
  const worldOffset = {
    x: entityB.transform.position.x - entityA.transform.position.x,
    y: entityB.transform.position.y - entityA.transform.position.y
  }
  connection.binding = true
  connection.bindOffset = rotate(worldOffset, -entityA.transform.rotation)
  connection.bindAngle = normalizeAngle(entityB.transform.rotation - entityA.transform.rotation)
  connection.style = 'straight'
  connection.stretchable = false
  connection.bendable = false
  connection.restLengths = [Math.max(1e-6, Math.hypot(worldOffset.x, worldOffset.y))]
  connection.manualSegments = [[{ x: 0, y: 0 }, { x: 1, y: 0 }]]
  connection.breakState = 'intact'
  connection.tension = 0
  connection.strain = 0
  return normalizeConnection(connection, entities)
}
