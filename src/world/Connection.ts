import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import type { Entity } from './Entity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
import { finiteNumber, normalizeAngle } from './geometry'
import { normalizeUuid } from './identity'
import { localPointToWorld, setWorldTransform, worldPointToLocal, worldTransform } from './hierarchy'
import { Joint2D, type JointKind2D } from './components'

export type ConnectionStyle = 'straight' | 'curved' | 'manual'
export type AnchorMode = 'center' | 'surface' | 'vertex' | 'side' | 'local'
export type ConnectionBreakState = 'intact' | 'snapped' | 'torn'

export interface ConnectionAnchor {
  entityId: number
  mode: AnchorMode
  localPoint: Vec2
  index: number
  sideT: number
}

export interface RopeNode {
  position: Vec2
  velocity: Vec2
}

export interface Connection {
  id: number
  uuid: string
  name: string
  componentType: 'Rope2D' | JointKind2D
  enabled: boolean
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
  collisionEnabled: boolean
  collisionRadius: number
  linearDensity: number
  segmentCount: number
  ropeNodes: RopeNode[]
  breakLink: number
  binding: boolean
  bindOffset: Vec2
  bindAngle: number
  breakState: ConnectionBreakState
  tension: number
  strain: number
  jointAxis: Vec2
  limitsEnabled: boolean
  lowerLimit: number
  upperLimit: number
  collideConnected: boolean
  motorEnabled: boolean
  motorSpeed: number
  maxMotorForce: number
  breakForce: number
  breakTorque: number
}

export const ROPE_NODE_CAPACITY = 32
export const ROPE_NODE_DATA_OFFSET = 29
export const CONNECTION_STRIDE = ROPE_NODE_DATA_OFFSET + ROPE_NODE_CAPACITY * 4

function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)
  return { x: point.x * cosine - point.y * sine, y: point.x * sine + point.y * cosine }
}

function polygonVertices(entity: Entity): Vec2[] | null {
  return entity instanceof BoxEntity || entity instanceof TriangleEntity ? entity.vertices : null
}

function worldToLocal(entity: Entity, point: Vec2, entities: Entity[] = [entity]): Vec2 {
  if (entities.length > 1 || entity.parentUuid) return worldPointToLocal(entity, point, entities)
  const rotated = rotate({
    x: finiteNumber(point.x) - entity.transform.position.x,
    y: finiteNumber(point.y) - entity.transform.position.y
  }, -entity.transform.rotation)
  return {
    x: rotated.x / Math.max(Math.abs(entity.transform.scale.x), 1e-12),
    y: rotated.y / Math.max(Math.abs(entity.transform.scale.y), 1e-12)
  }
}

function localToWorld(entity: Entity, point: Vec2, entities: Entity[] = [entity]): Vec2 {
  if (entities.length > 1 || entity.parentUuid) return localPointToWorld(entity, point, entities)
  const rotated = rotate({
    x: point.x * entity.transform.scale.x,
    y: point.y * entity.transform.scale.y
  }, entity.transform.rotation)
  return {
    x: entity.transform.position.x + rotated.x,
    y: entity.transform.position.y + rotated.y
  }
}

function localDirection(entity: Entity, toward: Vec2, entities: Entity[] = [entity]): Vec2 {
  const transform = worldTransform(entity, entities)
  const world = {
    x: finiteNumber(toward.x) - transform.position.x,
    y: finiteNumber(toward.y) - transform.position.y
  }
  const rotated = rotate(world, -transform.rotation)
  const direction = {
    x: rotated.x / transform.scale.x,
    y: rotated.y / transform.scale.y
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

function sidePoint(vertices: Vec2[], index: number, sideT: number): Vec2 {
  const a = vertices[index]
  const b = vertices[(index + 1) % vertices.length]
  return { x: a.x + (b.x - a.x) * sideT, y: a.y + (b.y - a.y) * sideT }
}

function ellipseSurfacePoint(entity: CircleEntity, direction: Vec2): Vec2 {
  const scale = 1 / Math.sqrt(
    direction.x * direction.x / (entity.radiusX * entity.radiusX)
    + direction.y * direction.y / (entity.radiusY * entity.radiusY)
  )
  return { x: direction.x * scale, y: direction.y * scale }
}

function anchorLocalPoint(entity: Entity, mode: AnchorMode, index: number, sideT: number, toward: Vec2, entities: Entity[]): Vec2 {
  const vertices = polygonVertices(entity)
  if (mode === 'vertex' && vertices?.length) return { ...vertices[index] }
  if (mode === 'side' && vertices?.length) return sidePoint(vertices, index, sideT)
  if (mode !== 'surface') return { x: 0, y: 0 }
  const direction = localDirection(entity, toward, entities)
  if (entity instanceof CircleEntity) return ellipseSurfacePoint(entity, direction)
  return vertices?.length ? rayPolygonSurface(vertices, direction) : { x: 0, y: 0 }
}

export function deriveAnchor(
  entity: Entity,
  mode: AnchorMode,
  index = 0,
  sideT = 0.5,
  toward: Vec2 = entity.transform.position,
  entities: Entity[] = [entity]
): ConnectionAnchor {
  const vertices = polygonVertices(entity)
  const safeIndex = vertices?.length ? Math.abs(Math.round(finiteNumber(index))) % vertices.length : 0
  const safeSideT = Math.min(1, Math.max(0, finiteNumber(sideT, 0.5)))
  const localPoint = anchorLocalPoint(entity, mode, safeIndex, safeSideT, toward, entities)
  return { entityId: entity.id, mode, localPoint, index: safeIndex, sideT: safeSideT }
}

export function anchorAtWorldPoint(entity: Entity, point: Vec2, entities: Entity[] = [entity]): ConnectionAnchor {
  const local = worldToLocal(entity, point, entities)
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
  if (!vertices?.length) return deriveAnchor(entity, 'surface', 0, 0.5, point, entities)
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

export function entityBoundaryPoints(entity: Entity, ellipseSamples = 48, entities: Entity[] = [entity]): Vec2[] {
  if (entity instanceof CircleEntity) {
    return Array.from({ length: Math.max(16, ellipseSamples) }, (_, index) => {
      const angle = index * Math.PI * 2 / Math.max(16, ellipseSamples)
      return localToWorld(entity, {
        x: Math.cos(angle) * entity.radiusX,
        y: Math.sin(angle) * entity.radiusY
      }, entities)
    })
  }
  return (polygonVertices(entity) ?? []).map(point => localToWorld(entity, point, entities))
}

function supportPoint(entity: Entity, direction: Vec2, entities: Entity[]): Vec2 {
  const transform = worldTransform(entity, entities)
  if (entity instanceof CircleEntity) {
    const localDirection = rotate(direction, -transform.rotation)
    const scaledDirection = {
      x: localDirection.x * transform.scale.x,
      y: localDirection.y * transform.scale.y
    }
    const denominator = Math.hypot(
      entity.radiusX * scaledDirection.x,
      entity.radiusY * scaledDirection.y
    )
    if (denominator <= 1e-18) return { ...transform.position }
    return localToWorld(entity, {
      x: entity.radiusX * entity.radiusX * scaledDirection.x / denominator,
      y: entity.radiusY * entity.radiusY * scaledDirection.y / denominator
    }, entities)
  }

  const vertices = polygonVertices(entity) ?? []
  let best = transform.position
  let bestProjection = Number.NEGATIVE_INFINITY
  for (const vertex of vertices) {
    const world = localToWorld(entity, vertex, entities)
    const projection = world.x * direction.x + world.y * direction.y
    if (projection > bestProjection) { bestProjection = projection; best = world }
  }
  return best
}

function minkowskiSupport(a: Entity, b: Entity, direction: Vec2, entities: Entity[]): Vec2 {
  const pointA = supportPoint(a, direction, entities)
  const pointB = supportPoint(b, { x: -direction.x, y: -direction.y }, entities)
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

export function entitiesOverlap(a: Entity, b: Entity, entities: Entity[] = [a, b]): boolean {
  const transformA = worldTransform(a, entities)
  const transformB = worldTransform(b, entities)
  let direction = {
    x: transformB.position.x - transformA.position.x,
    y: transformB.position.y - transformA.position.y
  }
  if (direction.x * direction.x + direction.y * direction.y <= 1e-20) direction = { x: 1, y: 0 }
  const simplex = [minkowskiSupport(a, b, direction, entities)]
  direction = { x: -simplex[0].x, y: -simplex[0].y }

  for (let iteration = 0; iteration < 64; iteration++) {
    if (direction.x * direction.x + direction.y * direction.y <= 1e-20) return true
    const point = minkowskiSupport(a, b, direction, entities)
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

export function polylineLength(points: Vec2[]): number {
  let length = 0
  for (let index = 1; index < points.length; index++) {
    length += Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y)
  }
  return length
}

function samplePolyline(points: Vec2[], ratio: number): Vec2 {
  const total = polylineLength(points)
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1 || total <= 1e-12) return { ...points[0] }
  const target = Math.min(1, Math.max(0, ratio)) * total
  let traversed = 0
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1]
    const b = points[index]
    const segment = Math.hypot(b.x - a.x, b.y - a.y)
    if (traversed + segment >= target || index === points.length - 1) {
      const local = segment > 1e-12 ? (target - traversed) / segment : 0
      return { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local }
    }
    traversed += segment
  }
  return { ...points[points.length - 1] }
}

export function resolveAnchor(anchor: ConnectionAnchor, entities: Entity[]): Vec2 | null {
  const entity = entities.find(candidate => candidate.id === anchor.entityId)
  if (!entity) return null
  const localPoint = currentLocalAnchor(anchor, entity)
  return localPointToWorld(entity, localPoint, entities)
}

export function scaledLocalAnchor(anchor: ConnectionAnchor, entity: Entity, entities: Entity[] = [entity]): Vec2 {
  const localPoint = currentLocalAnchor(anchor, entity)
  const transform = worldTransform(entity, entities)
  return {
    x: finiteNumber(localPoint.x) * transform.scale.x,
    y: finiteNumber(localPoint.y) * transform.scale.y
  }
}

function currentLocalAnchor(anchor: ConnectionAnchor, entity: Entity): Vec2 {
  if (anchor.mode === 'center') return { x: 0, y: 0 }
  const vertices = polygonVertices(entity)
  if (anchor.mode === 'vertex' && vertices?.length) {
    return { ...vertices[Math.abs(Math.round(anchor.index)) % vertices.length] }
  }
  if (anchor.mode === 'side' && vertices?.length) {
    const index = Math.abs(Math.round(anchor.index)) % vertices.length
    const sideT = Math.min(1, Math.max(0, finiteNumber(anchor.sideT, 0.5)))
    return sidePoint(vertices, index, sideT)
  }
  if (anchor.mode === 'surface') {
    const directionLength = Math.hypot(anchor.localPoint.x, anchor.localPoint.y)
    const direction = directionLength > 1e-12
      ? { x: anchor.localPoint.x / directionLength, y: anchor.localPoint.y / directionLength }
      : { x: 1, y: 0 }
    if (entity instanceof CircleEntity) return ellipseSurfacePoint(entity, direction)
    if (vertices?.length) return rayPolygonSurface(vertices, direction)
  }
  return { x: finiteNumber(anchor.localPoint.x), y: finiteNumber(anchor.localPoint.y) }
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
    const towardEntity = connected[index + 1] ?? connected[index - 1]
    const toward = worldTransform(towardEntity, entities).position
    return deriveAnchor(entity, modes[index] ?? 'surface', 0, 0.5, toward, entities)
  })
  const restLengths = anchors.slice(0, -1).map((anchor, index) => {
    const a = resolveAnchor(anchor, entities)!
    const b = resolveAnchor(anchors[index + 1], entities)!
    return Math.max(1e-6, Math.hypot(b.x - a.x, b.y - a.y))
  })

  return {
    id,
    uuid: normalizeUuid(undefined),
    name: `Connection ${id}`,
    componentType: 'Rope2D',
    enabled: true,
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
    collisionEnabled: true,
    collisionRadius: 0.2,
    linearDensity: 0.08,
    segmentCount: 12,
    ropeNodes: [],
    breakLink: -1,
    binding: false,
    bindOffset: { x: 0, y: 0 },
    bindAngle: 0,
    breakState: 'intact',
    tension: 0,
    strain: 0
    , jointAxis: { x: 1, y: 0 }
    , limitsEnabled: false
    , lowerLimit: -1
    , upperLimit: 1
    , collideConnected: false
    , motorEnabled: false
    , motorSpeed: 0
    , maxMotorForce: 1000
    , breakForce: Number.POSITIVE_INFINITY
    , breakTorque: Number.POSITIVE_INFINITY
  }
}

function normalizeRopeState(connection: Connection): void {
  connection.ropeNodes = (Array.isArray(connection.ropeNodes) ? connection.ropeNodes : [])
    .map(node => ({
      position: { x: finiteNumber(node?.position?.x), y: finiteNumber(node?.position?.y) },
      velocity: { x: finiteNumber(node?.velocity?.x), y: finiteNumber(node?.velocity?.y) }
    }))
    .filter(node => Number.isFinite(node.position.x + node.position.y + node.velocity.x + node.velocity.y))
    .slice(0, ROPE_NODE_CAPACITY)
  connection.breakLink = Math.min(
    connection.ropeNodes.length,
    Math.max(-1, Math.round(finiteNumber(connection.breakLink, -1)))
  )
}

function normalizeAnchor(anchor: ConnectionAnchor, entity: Entity): void {
  anchor.mode = anchor.mode === 'center' || anchor.mode === 'vertex' || anchor.mode === 'side' || anchor.mode === 'local' ? anchor.mode : 'surface'
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

function normalizeBinding(connection: Connection, entities: Entity[], hasBindOffset: boolean): void {
  if (!connection.binding) return
  connection.anchors = connection.anchors.slice(0, 2)
  const entityA = entities.find(entity => entity.id === connection.anchors[0].entityId)!
  const entityB = entities.find(entity => entity.id === connection.anchors[1].entityId)!
  const transformA = worldTransform(entityA, entities)
  const transformB = worldTransform(entityB, entities)
  connection.anchors[0] = deriveAnchor(entityA, 'center', 0, 0.5, transformB.position, entities)
  connection.anchors[1] = deriveAnchor(entityB, 'center', 0, 0.5, transformA.position, entities)
  if (!hasBindOffset) {
    connection.bindOffset = rotate({
      x: transformB.position.x - transformA.position.x,
      y: transformB.position.y - transformA.position.y
    }, -transformA.rotation)
    connection.bindAngle = normalizeAngle(transformB.rotation - transformA.rotation)
  }
  connection.collisionEnabled = false
  connection.ropeNodes = []
  connection.breakLink = -1
}

function normalizeRoutes(connection: Connection, entities: Entity[]): void {
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
}

export function normalizeConnection(connection: Connection, entities: Entity[]): boolean {
  connection.uuid = normalizeUuid(connection.uuid)
  connection.name = typeof connection.name === 'string' && connection.name.trim()
    ? connection.name.trim().slice(0, 80)
    : `Connection ${connection.id}`
  const componentTypes: Connection['componentType'][] = ['Rope2D', 'FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D']
  connection.componentType = connection.binding === true ? 'FixedJoint2D' : componentTypes.includes(connection.componentType) ? connection.componentType : 'Rope2D'
  connection.enabled = connection.enabled !== false
  connection.style = connection.style === 'curved' || connection.style === 'manual' ? connection.style : 'straight'
  connection.curvature = Math.min(2, Math.max(-2, finiteNumber(connection.curvature, 0.18)))
  connection.stiffness = Math.min(1e12, Math.max(0, finiteNumber(connection.stiffness, 1200)))
  connection.damping = Math.min(1e9, Math.max(0, finiteNumber(connection.damping, 35)))
  connection.maxStretchRatio = Math.min(1000, Math.max(1, finiteNumber(connection.maxStretchRatio, 1.25)))
  connection.bendingToleranceMass = Math.min(1e50, Math.max(0, finiteNumber(connection.bendingToleranceMass, 1e12)))
  connection.stretchingToleranceMass = Math.min(1e50, Math.max(0, finiteNumber(connection.stretchingToleranceMass, 1e12)))
  connection.collisionEnabled = connection.collisionEnabled === true && connection.binding !== true
  connection.collisionRadius = Math.min(1e6, Math.max(1e-6, finiteNumber(connection.collisionRadius, 0.2)))
  connection.linearDensity = Math.min(1e50, Math.max(1e-6, finiteNumber(connection.linearDensity, 0.08)))
  connection.segmentCount = Math.min(ROPE_NODE_CAPACITY, Math.max(3, Math.round(finiteNumber(connection.segmentCount, 12))))
  normalizeRopeState(connection)
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
  const rawAxis = connection.jointAxis as Vec2 | undefined
  const axisLength = Math.hypot(finiteNumber(rawAxis?.x, 1), finiteNumber(rawAxis?.y))
  connection.jointAxis = axisLength > 1e-9 ? { x: finiteNumber(rawAxis?.x, 1) / axisLength, y: finiteNumber(rawAxis?.y) / axisLength } : { x: 1, y: 0 }
  connection.limitsEnabled = connection.limitsEnabled === true
  connection.lowerLimit = finiteNumber(connection.lowerLimit, -1)
  connection.upperLimit = Math.max(connection.lowerLimit, finiteNumber(connection.upperLimit, 1))
  connection.collideConnected = connection.collideConnected === true
  connection.motorEnabled = connection.motorEnabled === true
  connection.motorSpeed = finiteNumber(connection.motorSpeed)
  connection.maxMotorForce = Math.max(0, finiteNumber(connection.maxMotorForce, 1000))
  connection.breakForce = Math.max(0, finiteNumber(connection.breakForce, Number.MAX_VALUE))
  connection.breakTorque = Math.max(0, finiteNumber(connection.breakTorque, Number.MAX_VALUE))
  connection.anchors = (Array.isArray(connection.anchors) ? connection.anchors : [])
    .filter(anchor => entities.some(entity => entity.id === anchor.entityId))
  if (connection.anchors.length < 2) return false

  for (const anchor of connection.anchors) {
    const entity = entities.find(candidate => candidate.id === anchor.entityId)!
    normalizeAnchor(anchor, entity)
  }

  normalizeBinding(connection, entities, Boolean(hasBindOffset))
  normalizeRoutes(connection, entities)
  return true
}

export function connectionsFromJointComponents(entities: Entity[]): Connection[] {
  const result: Connection[] = []
  for (const entity of entities) {
    for (const component of entity.componentMap.values()) {
      if (!(component instanceof Joint2D) || !component.enabled || component.removed || !component.targetEntityUuid) continue
      const target = entities.find(candidate => candidate.uuid === component.targetEntityUuid)
      if (!target || target === entity || !target.enabled) continue
      const transformA = worldTransform(entity, entities)
      const transformB = worldTransform(target, entities)
      if (!component.initialized) {
        component.referenceOffset = rotate({ x: transformB.position.x - transformA.position.x, y: transformB.position.y - transformA.position.y }, -transformA.rotation)
        component.referenceAngle = normalizeAngle(transformB.rotation - transformA.rotation)
        const anchorA = localPointToWorld(entity, component.anchor, entities)
        const anchorB = localPointToWorld(target, component.connectedAnchor, entities)
        if (component.kind === 'DistanceJoint2D' || component.kind === 'RopeJoint2D' || component.kind === 'SpringJoint2D') component.distance = Math.max(1e-6, Math.hypot(anchorB.x - anchorA.x, anchorB.y - anchorA.y))
        component.initialized = true
      }
      const connection = createConnection(-Math.max(1, entity.id), entities, [entity.id, target.id], ['center', 'center'])
      connection.uuid = component.uuid
      connection.name = component.kind
      connection.componentType = component.kind
      connection.enabled = component.enabled
      connection.anchors = [
        { entityId: entity.id, mode: 'local', localPoint: { ...component.anchor }, index: 0, sideT: .5 },
        { entityId: target.id, mode: 'local', localPoint: { ...component.connectedAnchor }, index: 0, sideT: .5 }
      ]
      connection.restLengths = [component.kind === 'RevoluteJoint2D' || component.kind === 'MotorJoint2D' ? 1e-6 : component.distance]
      connection.stretchable = component.kind === 'SpringJoint2D'
      connection.bendable = false
      connection.stiffness = component.stiffness
      connection.damping = component.damping
      connection.binding = false
      connection.bindOffset = { ...component.referenceOffset }
      connection.bindAngle = component.referenceAngle
      connection.collisionEnabled = false
      connection.jointAxis = { ...component.axis }
      connection.limitsEnabled = component.limitsEnabled
      connection.lowerLimit = component.lowerLimit
      connection.upperLimit = component.upperLimit
      connection.collideConnected = component.collideConnected
      connection.motorEnabled = component.motorEnabled || component.kind === 'MotorJoint2D'
      connection.motorSpeed = component.motorSpeed
      connection.maxMotorForce = component.maxMotorForce
      connection.breakForce = component.breakForce
      connection.breakTorque = component.breakTorque
      result.push(connection)
    }
  }
  return result
}

function physicalRouteFragments(connection: Connection, start: Vec2, end: Vec2): Vec2[][] {
  const points = [start, ...connection.ropeNodes.map(node => ({ ...node.position })), end]
  const breakLink = connection.breakLink
  if (connection.breakState === 'intact' || breakLink < 0 || breakLink >= points.length - 1) return [points]
  return [points.slice(0, breakLink + 1), points.slice(breakLink + 1)]
}

function designRouteSegment(connection: Connection, segment: number, start: Vec2, end: Vec2): Vec2[] {
  if (connection.style === 'straight') return [start, end]
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.max(1e-12, Math.hypot(dx, dy))
  const normal = { x: -dy / length, y: dx / length }
  if (connection.style === 'curved') {
    return [
      start,
      {
        x: (start.x + end.x) / 2 + normal.x * length * connection.curvature,
        y: (start.y + end.y) / 2 + normal.y * length * connection.curvature
      },
      end
    ]
  }
  const points = connection.manualSegments[segment] ?? [{ x: 0, y: 0 }, { x: 1, y: 0 }]
  return points.map(point => ({
    x: start.x + dx * point.x + normal.x * length * point.y,
    y: start.y + dy * point.x + normal.y * length * point.y
  }))
}

export function routePoints(connection: Connection, entities: Entity[]): Vec2[][] {
  if (connection.binding) return []
  const positions = connection.anchors.map(anchor => resolveAnchor(anchor, entities))
  const segments: Vec2[][] = []
  for (let index = 0; index < positions.length - 1; index++) {
    const start = positions[index]
    const end = positions[index + 1]
    if (!start || !end) continue
    if (connection.collisionEnabled && connection.ropeNodes.length && positions.length === 2) {
      segments.push(...physicalRouteFragments(connection, start, end))
    } else {
      segments.push(designRouteSegment(connection, index, start, end))
    }
  }
  return segments
}

export function connectionSharesLayer(connection: Connection, entities: Entity[]): boolean {
  const layers = connection.anchors
    .map(anchor => entities.find(entity => entity.id === anchor.entityId)?.getCollider()?.physicsLayer)
    .filter((layer): layer is number => layer !== undefined)
  return layers.length === connection.anchors.length && layers.every(layer => layer === layers[0])
}

export function initializeRopeNodes(connection: Connection, entities: Entity[]): void {
  if (!connection.collisionEnabled || connection.binding || connection.anchors.length !== 2) {
    connection.ropeNodes = []
    return
  }
  const path = routePoints({ ...connection, collisionEnabled: false, ropeNodes: [] }, entities)[0]
  if (!path || path.length < 2) { connection.ropeNodes = []; return }
  const length = Math.max(1e-6, polylineLength(path))
  const targetSpacing = Math.max(connection.collisionRadius * 1.25, length / (ROPE_NODE_CAPACITY + 1), 0.05)
  const automaticCount = Math.min(ROPE_NODE_CAPACITY, Math.max(3, Math.ceil(length / targetSpacing) - 1))
  const count = Math.min(ROPE_NODE_CAPACITY, Math.max(3, Math.round(connection.segmentCount || automaticCount)))
  connection.ropeNodes = Array.from({ length: count }, (_, index) => ({
    position: samplePolyline(path, (index + 1) / (count + 1)),
    velocity: { x: 0, y: 0 }
  }))
  connection.restLengths = [length]
  connection.breakLink = -1
}

export function connectionGeometrySignature(connection: Connection, entities: Entity[]): string {
  return JSON.stringify({
    anchors: connection.anchors.map(anchor => {
      const entity = entities.find(candidate => candidate.id === anchor.entityId)
      if (!entity) return null
      return {
        id: entity.id,
        point: resolveAnchor(anchor, entities),
        local: currentLocalAnchor(anchor, entity),
        rotation: entity.transform.rotation,
        scale: entity.transform.scale
      }
    }),
    style: connection.style,
    curvature: connection.curvature,
    manualSegments: connection.manualSegments,
    radius: connection.collisionRadius
  })
}

export function repatchConnection(connection: Connection, entities: Entity[]): void {
  if (connection.binding || connection.anchors.length !== 2 || connection.breakState !== 'intact') return
  const designPath = routePoints({
    ...connection,
    collisionEnabled: false,
    ropeNodes: [],
    breakLink: -1,
    breakState: 'intact'
  }, entities)[0]
  if (!designPath || designPath.length < 2) return
  connection.restLengths = [Math.max(1e-6, polylineLength(designPath))]
  if (connection.collisionEnabled) initializeRopeNodes(connection, entities)
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
  connection.anchors = [deriveAnchor(entityA, 'center', 0, 0.5, worldTransform(entityB, entities).position, entities), deriveAnchor(entityB, 'center', 0, 0.5, worldTransform(entityA, entities).position, entities)]
  const transformA = worldTransform(entityA, entities)
  const transformB = worldTransform(entityB, entities)
  const worldOffset = {
    x: transformB.position.x - transformA.position.x,
    y: transformB.position.y - transformA.position.y
  }
  connection.binding = true
  connection.componentType = 'FixedJoint2D'
  connection.enabled = true
  connection.bindOffset = rotate(worldOffset, -transformA.rotation)
  connection.bindAngle = normalizeAngle(transformB.rotation - transformA.rotation)
  connection.style = 'straight'
  connection.stretchable = false
  connection.bendable = false
  connection.restLengths = [Math.max(1e-6, Math.hypot(worldOffset.x, worldOffset.y))]
  connection.manualSegments = [[{ x: 0, y: 0 }, { x: 1, y: 0 }]]
  connection.collisionEnabled = false
  connection.ropeNodes = []
  connection.breakLink = -1
  connection.breakState = 'intact'
  connection.tension = 0
  connection.strain = 0
  return normalizeConnection(connection, entities)
}

export function boundCompoundEntityIds(entityId: number, connections: Connection[], entities: Entity[]): Set<number> {
  const existing = new Set(entities.map(entity => entity.id))
  const members = new Set<number>([entityId])
  const pending = [entityId]
  while (pending.length) {
    const current = pending.shift()!
    for (const connection of connections) {
      if (!connection.binding || connection.breakState !== 'intact') continue
      const ids = connection.anchors.map(anchor => anchor.entityId).filter(id => existing.has(id))
      if (!ids.includes(current)) continue
      for (const id of ids) {
        if (members.has(id)) continue
        members.add(id)
        pending.push(id)
      }
    }
  }
  return members
}

export function translateBoundCompound(entityId: number, delta: Vec2, connections: Connection[], entities: Entity[]): void {
  const ids = boundCompoundEntityIds(entityId, connections, entities)
  const transforms = [...ids].flatMap(id => {
    const entity = entities.find(candidate => candidate.id === id)
    return entity ? [{ entity, transform: worldTransform(entity, entities) }] : []
  })
  for (const { entity, transform } of transforms) {
    setWorldTransform(entity, {
      ...transform,
      position: { x: transform.position.x + delta.x, y: transform.position.y + delta.y }
    }, entities)
  }
}
