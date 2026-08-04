import type { Vec2 } from './types'

export const MIN_SIZE = 1e-6
export const MIN_AREA = MIN_SIZE * MIN_SIZE * 1e-6
export const MIN_INERTIA = 1e-24
export const MAX_PHYSICS_MAGNITUDE = 1e50
export const MIN_MASS = MIN_SIZE
export const MAX_MASS = MAX_PHYSICS_MAGNITUDE
export const MIN_DENSITY = MIN_SIZE
export const MAX_DENSITY = MAX_PHYSICS_MAGNITUDE

interface GeometryEntity {
  shapeType: string
  mass: number
  density: number
  autoInertia: boolean
  inertia: number
  transform: {
    position: Vec2
    rotation: number
    scale: Vec2
  }
  radiusX?: number
  radiusY?: number
  vertices?: Vec2[]
  velocity: Vec2
  acceleration: Vec2
  force: Vec2
  angularVelocity: number
  torque: number
  gravity: number
  gravityScale: number
  linearDamping: number
  angularDamping: number
  restitution: number
  restitutionThreshold: number
  staticFriction: number
  dynamicFriction: number
  transparency: number
  color: { r: number; g: number; b: number }
  layer: number
}

export function finiteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(numeric, -MAX_PHYSICS_MAGNITUDE), MAX_PHYSICS_MAGNITUDE)
}

export function clampNumber(value: unknown, min: number, max: number, fallback = min): number {
  return Math.min(Math.max(finiteNumber(value, fallback), min), max)
}

export function positiveNumber(value: unknown, fallback = MIN_SIZE): number {
  const numeric = Math.abs(finiteNumber(value, fallback))
  return numeric >= MIN_SIZE ? numeric : Math.max(fallback, MIN_SIZE)
}

export function normalizeAngle(angle: unknown): number {
  const numeric = finiteNumber(angle, 0)
  const fullTurn = Math.PI * 2
  return ((numeric + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI
}

function cross(origin: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

function samePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y
}

export function convexHull(points: Vec2[]): Vec2[] {
  const sorted = points
    .map(point => ({ x: finiteNumber(point.x), y: finiteNumber(point.y) }))
    .sort((a, b) => a.x - b.x || a.y - b.y)
    .filter((point, index, values) => index === 0 || !samePoint(point, values[index - 1]))

  if (sorted.length <= 2) return sorted

  const lower: Vec2[] = []
  for (const point of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: Vec2[] = []
  for (let index = sorted.length - 1; index >= 0; index--) {
    const point = sorted[index]
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}

export function isValidConvexPolygon(vertices: Vec2[]): boolean {
  if (vertices.length < 3) return false
  const hull = convexHull(vertices)
  if (hull.length !== vertices.length || polygonArea(vertices) <= MIN_AREA) return false

  let turnDirection = 0
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index]
    const b = vertices[(index + 1) % vertices.length]
    const c = vertices[(index + 2) % vertices.length]
    const turn = cross(a, b, c)
    if (turn === 0) return false
    const direction = Math.sign(turn)
    if (turnDirection !== 0 && direction !== turnDirection) return false
    turnDirection = direction
  }
  return true
}

export function polygonArea(vertices: Vec2[], scale: Vec2 = { x: 1, y: 1 }): number {
  if (vertices.length < 3) return 0
  let twiceArea = 0
  for (let index = 0; index < vertices.length; index++) {
    const current = vertices[index]
    const next = vertices[(index + 1) % vertices.length]
    twiceArea += (current.x * scale.x) * (next.y * scale.y)
      - (current.y * scale.y) * (next.x * scale.x)
  }
  return Math.abs(twiceArea) * 0.5
}

export function entityArea(entity: GeometryEntity): number {
  if (entity.shapeType === 'Circle') {
    const radiusX = positiveNumber(entity.radiusX, 1) * positiveNumber(entity.transform.scale.x, 1)
    const radiusY = positiveNumber(entity.radiusY, 1) * positiveNumber(entity.transform.scale.y, 1)
    return Math.PI * radiusX * radiusY
  }
  return polygonArea(entity.vertices ?? [], entity.transform.scale)
}

export function effectiveInertia(entity: GeometryEntity): number {
  const mass = clampNumber(entity.mass, MIN_MASS, MAX_MASS, 1)
  if (!entity.autoInertia) return positiveNumber(entity.inertia, mass)

  if (entity.shapeType === 'Circle') {
    const radiusX = positiveNumber(entity.radiusX, 1) * positiveNumber(entity.transform.scale.x, 1)
    const radiusY = positiveNumber(entity.radiusY, 1) * positiveNumber(entity.transform.scale.y, 1)
    return Math.max(mass * (radiusX * radiusX + radiusY * radiusY) / 4, MIN_INERTIA)
  }

  const vertices = (entity.vertices ?? []).map(vertex => ({
    x: finiteNumber(vertex.x) * positiveNumber(entity.transform.scale.x, 1),
    y: finiteNumber(vertex.y) * positiveNumber(entity.transform.scale.y, 1)
  }))
  if (vertices.length < 3) return mass

  let crossSum = 0
  let weightedSum = 0
  for (let index = 0; index < vertices.length; index++) {
    const a = vertices[index]
    const b = vertices[(index + 1) % vertices.length]
    const edgeCross = a.x * b.y - a.y * b.x
    const term = a.x * a.x + a.x * b.x + b.x * b.x
      + a.y * a.y + a.y * b.y + b.y * b.y
    crossSum += edgeCross
    weightedSum += edgeCross * term
  }
  if (Math.abs(crossSum) <= MIN_AREA) return mass
  return Math.max(Math.abs(mass * weightedSum / (6 * crossSum)), MIN_INERTIA)
}

export function syncMassFromDensity(entity: GeometryEntity): void {
  entity.density = clampNumber(entity.density, MIN_DENSITY, MAX_DENSITY, 1)
  entity.mass = clampNumber(entity.density * entityArea(entity), MIN_MASS, MAX_MASS, 1)
  if (entity.autoInertia) entity.inertia = effectiveInertia(entity)
}

export function syncDensityFromMass(entity: GeometryEntity): void {
  entity.mass = clampNumber(entity.mass, MIN_MASS, MAX_MASS, 1)
  const area = entityArea(entity)
  if (area > MIN_AREA) {
    entity.density = clampNumber(entity.mass / area, MIN_DENSITY, MAX_DENSITY, 1)
  }
  if (entity.autoInertia) entity.inertia = effectiveInertia(entity)
}

export function normalizeEntity(entity: GeometryEntity): void {
  entity.transform.position.x = finiteNumber(entity.transform.position.x)
  entity.transform.position.y = finiteNumber(entity.transform.position.y)
  entity.transform.rotation = normalizeAngle(entity.transform.rotation)
  entity.transform.scale.x = positiveNumber(entity.transform.scale.x, 1)
  entity.transform.scale.y = positiveNumber(entity.transform.scale.y, 1)

  entity.velocity.x = finiteNumber(entity.velocity.x)
  entity.velocity.y = finiteNumber(entity.velocity.y)
  entity.acceleration.x = finiteNumber(entity.acceleration.x)
  entity.acceleration.y = finiteNumber(entity.acceleration.y)
  entity.force.x = finiteNumber(entity.force.x)
  entity.force.y = finiteNumber(entity.force.y)
  entity.angularVelocity = finiteNumber(entity.angularVelocity)
  entity.torque = finiteNumber(entity.torque)
  entity.gravity = finiteNumber(entity.gravity)
  entity.gravityScale = finiteNumber(entity.gravityScale, 1)
  entity.linearDamping = Math.max(0, finiteNumber(entity.linearDamping, 0))
  entity.angularDamping = Math.max(0, finiteNumber(entity.angularDamping, 0))
  entity.restitution = clampNumber(entity.restitution, 0, 1, 0)
  entity.restitutionThreshold = Math.max(finiteNumber(entity.restitutionThreshold, 1), 0)
  entity.staticFriction = Math.max(0, finiteNumber(entity.staticFriction, 0))
  entity.dynamicFriction = Math.max(0, finiteNumber(entity.dynamicFriction, 0))
  entity.transparency = clampNumber(entity.transparency, 0, 100, 100)
  entity.color.r = Math.round(clampNumber(entity.color.r, 0, 255, 0))
  entity.color.g = Math.round(clampNumber(entity.color.g, 0, 255, 180))
  entity.color.b = Math.round(clampNumber(entity.color.b, 0, 255, 255))
  entity.layer = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(finiteNumber(entity.layer, 1))))

  entity.mass = clampNumber(entity.mass, MIN_MASS, MAX_MASS, 1)
  entity.density = clampNumber(entity.density, MIN_DENSITY, MAX_DENSITY, 1)

  if (entity.shapeType === 'Circle') {
    entity.radiusX = positiveNumber(entity.radiusX, 1)
    entity.radiusY = positiveNumber(entity.radiusY, entity.radiusX)
  } else if (entity.vertices) {
    const hull = convexHull(entity.vertices)
    if (hull.length >= 3 && polygonArea(hull) > MIN_AREA) entity.vertices = hull
    else if (entity.shapeType === 'Triangle') {
      entity.vertices = [{ x: 0, y: 0.5 }, { x: 0.5, y: -0.5 }, { x: -0.5, y: -0.5 }]
    } else {
      entity.vertices = [
        { x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 },
        { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }
      ]
    }
  }

  entity.inertia = entity.autoInertia
    ? effectiveInertia(entity)
    : Math.max(MIN_INERTIA, Math.abs(finiteNumber(
      entity.inertia,
      effectiveInertia({ ...entity, autoInertia: true })
    )))
}
