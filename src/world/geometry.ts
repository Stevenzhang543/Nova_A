/** 实体几何与物理规范化：计算凸包、面积及惯性，限制非法数值并同步质量、密度和碰撞形状。 */
import type { Vec2 } from './types'
import { prepareColliderSet, solverShapeArea, solverShapeInertia } from '../runtime/physicsGeometry'
import type { ColliderShapeDescriptor2D, PhysicsShapeKind } from '../runtime/physicsProduction'

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
  renderer?: {
    vertices: Vec2[]
    radiusX: number
    radiusY: number
  }
  authoring?: { kind?: string }
  getCollider?: () => {
    kind: string
    enabled: boolean
    offset: Vec2
    rotation: number
    size: Vec2
    radiusX: number
    radiusY: number
    vertices: Vec2[]
    physicsLayer: number
    collisionMask: number
    shapeModel: PhysicsShapeKind
    shapes: ColliderShapeDescriptor2D[]
    sensor: boolean
    oneWay: boolean
    oneWayNormal: Vec2
  } | null
}

/** 把输入转换为有限数值并限制物理量级；无法转换时使用备用值。 */ export function finiteNumber(value: unknown, fallback = 0): number {
  const numeric = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(Math.max(numeric, -MAX_PHYSICS_MAGNITUDE), MAX_PHYSICS_MAGNITUDE)
}

/* 调用 Math.min(Math.max(finiteNumber(value, fallback), min), max) 并返回调用结果。 */ export function clampNumber(value: unknown, min: number, max: number, fallback = min): number {
  return Math.min(Math.max(finiteNumber(value, fallback), min), max)
}

/** 取有限数的绝对值，并保证不小于最小尺寸或给定备用值。 */ export function positiveNumber(value: unknown, fallback = MIN_SIZE): number {
  const numeric = Math.abs(finiteNumber(value, fallback))
  return numeric >= MIN_SIZE ? numeric : Math.max(fallback, MIN_SIZE)
}

/** 把有限弧度映射到负 π（含）至正 π（不含）的等价角度。 */ export function normalizeAngle(angle: unknown): number {
  const numeric = finiteNumber(angle, 0)
  const fullTurn = Math.PI * 2
  return ((numeric + Math.PI) % fullTurn + fullTurn) % fullTurn - Math.PI
}

/* 计算表达式 (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x) 并返回结果，沿用操作数的原有类型规则。 */ function cross(origin: Vec2, a: Vec2, b: Vec2): number {
  return (a.x - origin.x) * (b.y - origin.y) - (a.y - origin.y) * (b.x - origin.x)
}

/* 先计算 a.x === b.x；仅当其为真值时求右侧 a.y === b.y，返回短路求值结果。 */ function samePoint(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y
}

/** 先规范点坐标、排序去重，再用上下单调链移除非左转点，返回凸包。 */ export function convexHull(points: Vec2[]): Vec2[] {
  const sorted = points
    .map(/** 构造并返回记录 { x: finiteNumber(point.x), y: finiteNumber(point.y) }，字段按当前实参及捕获状态求值。 */ point => ({ x: finiteNumber(point.x), y: finiteNumber(point.y) }))
    .sort(/* 先计算 a.x - b.x；仅当其为假值时求右侧 a.y - b.y，返回短路求值结果。 */ (a, b) => a.x - b.x || a.y - b.y)
    .filter(/* 先计算 index === 0；仅当其为假值时求右侧 !samePoint(point, values[index - 1])，返回短路求值结果。 */ (point, index, values) => index === 0 || !samePoint(point, values[index - 1]))

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

/** 检查顶点数、凸包数量、面积及连续转向一致性，拒绝退化或非凸多边形。 */ export function isValidConvexPolygon(vertices: Vec2[]): boolean {
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

/** 用缩放后顶点的鞋带公式计算绝对面积；不足三个点时为零。 */ export function polygonArea(vertices: Vec2[], scale: Vec2 = { x: 1, y: 1 }): number {
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

/** 优先累计准备后的复合碰撞形状面积，否则按椭圆或多边形几何计算。 */ export function entityArea(entity: GeometryEntity): number {
  const collider = entity.getCollider?.()
  if (collider) {
    const prepared = prepareColliderSet(collider, false)
    const compoundArea = prepared.shapes.reduce(/* 计算表达式 sum + solverShapeArea(shape, entity.transform.scale) 并返回结果，沿用操作数的原有类型规则。 */ (sum, shape) => sum + solverShapeArea(shape, entity.transform.scale), 0)
    if (compoundArea > MIN_AREA) return compoundArea
  }
  if (collider?.kind === 'EllipseCollider2D' || (!collider && entity.shapeType === 'Circle')) {
    const radiusX = positiveNumber(collider?.radiusX ?? entity.radiusX, 1) * positiveNumber(entity.transform.scale.x, 1)
    const radiusY = positiveNumber(collider?.radiusY ?? entity.radiusY, 1) * positiveNumber(entity.transform.scale.y, 1)
    return Math.PI * radiusX * radiusY
  }
  return polygonArea(collider?.vertices ?? entity.vertices ?? [], entity.transform.scale)
}

/** 手动模式保留有效惯性；自动模式按复合形状面积分配质量，或用椭圆及多边形公式计算并限制下界。 */ export function effectiveInertia(entity: GeometryEntity): number {
  const mass = clampNumber(entity.mass, MIN_MASS, MAX_MASS, 1)
  if (!entity.autoInertia) return positiveNumber(entity.inertia, mass)
  const collider = entity.getCollider?.()
  if (collider) {
    const shapes = prepareColliderSet(collider, false).shapes.filter(/* 返回 shape.sensor 的逻辑取反结果。 */ shape => !shape.sensor)
    const areas = shapes.map(/* 调用 solverShapeArea(shape, entity.transform.scale) 并返回调用结果。 */ shape => solverShapeArea(shape, entity.transform.scale)), totalArea = areas.reduce(/* 计算表达式 sum + area 并返回结果，沿用操作数的原有类型规则。 */ (sum, area) => sum + area, 0)
    if (totalArea > MIN_AREA) return Math.max(shapes.reduce(/* 计算表达式 sum + solverShapeInertia(shape, entity.transform.scale, mass * areas[index] / totalArea) 并返回结果，沿用操作数的原有类型规则。 */ (sum, shape, index) => sum + solverShapeInertia(shape, entity.transform.scale, mass * areas[index] / totalArea), 0), MIN_INERTIA)
  }

  if (collider?.kind === 'EllipseCollider2D' || (!collider && entity.shapeType === 'Circle')) {
    const radiusX = positiveNumber(collider?.radiusX ?? entity.radiusX, 1) * positiveNumber(entity.transform.scale.x, 1)
    const radiusY = positiveNumber(collider?.radiusY ?? entity.radiusY, 1) * positiveNumber(entity.transform.scale.y, 1)
    const offset = collider?.offset ?? { x: 0, y: 0 }
    return Math.max(mass * (radiusX * radiusX + radiusY * radiusY) / 4
      + mass * (offset.x * offset.x + offset.y * offset.y), MIN_INERTIA)
  }

  const vertices = (collider?.vertices ?? entity.vertices ?? []).map(/** 将多边形顶点转换成有限的缩放坐标，用于惯性积分。 */ vertex => ({
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

/** 限制密度后以面积计算质量，并在自动惯性模式下重算惯性。 */ export function syncMassFromDensity(entity: GeometryEntity): void {
  entity.density = clampNumber(entity.density, MIN_DENSITY, MAX_DENSITY, 1)
  entity.mass = clampNumber(entity.density * entityArea(entity), MIN_MASS, MAX_MASS, 1)
  if (entity.autoInertia) entity.inertia = effectiveInertia(entity)
}

/** 限制质量，面积足够时反算密度，并在自动惯性模式下重算惯性。 */ export function syncDensityFromMass(entity: GeometryEntity): void {
  entity.mass = clampNumber(entity.mass, MIN_MASS, MAX_MASS, 1)
  const area = entityArea(entity)
  if (area > MIN_AREA) {
    entity.density = clampNumber(entity.mass / area, MIN_DENSITY, MAX_DENSITY, 1)
  }
  if (entity.autoInertia) entity.inertia = effectiveInertia(entity)
}

/** 规范位置及角度，保证缩放量有限且非零，同时保留镜像符号。 */ function normalizeTransform(entity: GeometryEntity): void {
  entity.transform.position.x = finiteNumber(entity.transform.position.x)
  entity.transform.position.y = finiteNumber(entity.transform.position.y)
  entity.transform.rotation = normalizeAngle(entity.transform.rotation)
  entity.transform.scale.x = (finiteNumber(entity.transform.scale.x, 1) < 0 ? -1 : 1) * positiveNumber(entity.transform.scale.x, 1)
  entity.transform.scale.y = (finiteNumber(entity.transform.scale.y, 1) < 0 ? -1 : 1) * positiveNumber(entity.transform.scale.y, 1)
}

/** 规范平移及旋转运动、作用力和重力数值，并将阻尼限制为非负。 */ function normalizeMotion(entity: GeometryEntity): void {
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
}

/** 将恢复系数限制在零至一，恢复阈值及摩擦系数限制为非负。 */ function normalizeMaterial(entity: GeometryEntity): void {
  entity.restitution = clampNumber(entity.restitution, 0, 1, 0)
  entity.restitutionThreshold = Math.max(finiteNumber(entity.restitutionThreshold, 1), 0)
  entity.staticFriction = Math.max(0, finiteNumber(entity.staticFriction, 0))
  entity.dynamicFriction = Math.max(0, finiteNumber(entity.dynamicFriction, 0))
}

/** 规范透明度与 RGB 整数通道，避免非法绘制颜色。 */ function normalizeAppearance(entity: GeometryEntity): void {
  entity.transparency = clampNumber(entity.transparency, 0, 100, 100)
  entity.color.r = Math.round(clampNumber(entity.color.r, 0, 255, 0))
  entity.color.g = Math.round(clampNumber(entity.color.g, 0, 255, 180))
  entity.color.b = Math.round(clampNumber(entity.color.b, 0, 255, 255))
}

/** 保留线及路径的点序并限制长度；椭圆规范半径，多边形使用凸包或对应形状的备用顶点。 */ function normalizeShape(entity: GeometryEntity): void {
  if ((entity.authoring?.kind === 'Line' || entity.authoring?.kind === 'Path') && entity.renderer) {
    entity.renderer.vertices = entity.renderer.vertices.slice(0, 10_000).map(/** 构造并返回记录 { x: finiteNumber(point.x), y: finiteNumber(point.y) }，字段按当前实参及捕获状态求值。 */ point => ({ x: finiteNumber(point.x), y: finiteNumber(point.y) }))
    if (entity.renderer.vertices.length < 2) entity.renderer.vertices = [{ x: -.5, y: 0 }, { x: .5, y: 0 }]
    return
  }
  if (entity.shapeType === 'Circle') {
    const radiusX = positiveNumber(entity.radiusX, 1)
    const radiusY = positiveNumber(entity.radiusY, radiusX)
    if (entity.renderer) {
      entity.renderer.radiusX = radiusX
      entity.renderer.radiusY = radiusY
    } else {
      entity.radiusX = radiusX
      entity.radiusY = radiusY
    }
    return
  }
  if (!entity.vertices) return
  const hull = convexHull(entity.vertices)
  if (hull.length >= 3 && polygonArea(hull) > MIN_AREA) {
    if (entity.renderer) entity.renderer.vertices = hull
    else entity.vertices = hull
  } else if (entity.shapeType === 'Triangle') {
    const fallback = [{ x: 0, y: 0.5 }, { x: 0.5, y: -0.5 }, { x: -0.5, y: -0.5 }]
    if (entity.renderer) entity.renderer.vertices = fallback
    else entity.vertices = fallback
  } else {
    const fallback = [
      { x: -0.5, y: -0.5 }, { x: 0.5, y: -0.5 },
      { x: 0.5, y: 0.5 }, { x: -0.5, y: 0.5 }
    ]
    if (entity.renderer) entity.renderer.vertices = fallback
    else entity.vertices = fallback
  }
}

/** 依次规范变换、运动、材质和外观，约束图层及碰撞参数，最后更新形状和有效惯性。 */ export function normalizeEntity(entity: GeometryEntity): void {
  normalizeTransform(entity)
  normalizeMotion(entity)
  normalizeMaterial(entity)
  normalizeAppearance(entity)
  entity.layer = Math.min(Number.MAX_SAFE_INTEGER, Math.max(1, Math.round(finiteNumber(entity.layer, 1))))
  const collider = entity.getCollider?.()
  if (collider) {
    collider.physicsLayer = Math.min(31, Math.max(0, Math.round(finiteNumber(collider.physicsLayer, 0))))
    collider.collisionMask = Math.min(0xffff_ffff, Math.max(0, Math.round(finiteNumber(collider.collisionMask, 1)))) >>> 0
    collider.offset.x = finiteNumber(collider.offset.x)
    collider.offset.y = finiteNumber(collider.offset.y)
    collider.rotation = normalizeAngle(collider.rotation)
    collider.radiusX = positiveNumber(collider.radiusX, 1)
    collider.radiusY = positiveNumber(collider.radiusY, collider.radiusX)
    if (collider.shapeModel === 'Box') {
      const hull = convexHull(collider.vertices)
      if (hull.length >= 3 && polygonArea(hull) > MIN_AREA) collider.vertices = hull
    }
  }
  entity.mass = clampNumber(entity.mass, MIN_MASS, MAX_MASS, 1)
  entity.density = clampNumber(entity.density, MIN_DENSITY, MAX_DENSITY, 1)
  normalizeShape(entity)
  entity.inertia = entity.autoInertia
    ? effectiveInertia(entity)
    : Math.max(MIN_INERTIA, Math.abs(finiteNumber(
      entity.inertia,
      effectiveInertia({ ...entity, autoInertia: true })
    )))
}
