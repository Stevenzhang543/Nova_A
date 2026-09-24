/** 物理形状准备：规范复合碰撞形状，计算求解器使用的几何、面积与惯性。 */
import { MAX_AUTHORED_COLLIDER_POINTS, type ColliderShapeDescriptor2D, type PhysicsShapeKind } from './physicsProduction'
import type { Vec2 } from '../world/types'

export const COLLIDER_CHILD_STRIDE = 21
export const MAX_SOLVER_CHILD_SHAPES = 128

export interface SolverColliderShape2D {
  id: number
  sourceId: string
  kind: 'Box' | 'Circle' | 'Capsule' | 'Segment' | 'ConvexPolygon'
  offset: Vec2
  rotation: number
  size: Vec2
  points: Vec2[]
  sensor: boolean
  physicsLayer: number
  collisionMask: number
  oneWay: boolean
  oneWayNormal: Vec2
}

export interface ColliderSource2D {
  shapeModel: PhysicsShapeKind
  offset: Vec2
  rotation: number
  size: Vec2
  radiusX: number
  radiusY: number
  vertices: Vec2[]
  shapes: ColliderShapeDescriptor2D[]
  sensor: boolean
  physicsLayer: number
  collisionMask: number
  oneWay: boolean
  oneWayNormal: Vec2
}

export interface PreparedColliderSet2D {
  shapes: SolverColliderShape2D[]
  blockedReason: string | null
  decomposed: boolean
}

/* 根据 Number.isFinite(value) 的真假，分别返回 value 或 fallback。 */ function finite(value: number, fallback = 0): number { return Number.isFinite(value) ? value : fallback }
/* 返回具有所列字段的新对象 { x: finite(value?.x), y: finite(value?.y) }。 */ function point(value: Vec2): Vec2 { return { x: finite(value?.x), y: finite(value?.y) } }
/* 计算表达式 (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) 并返回结果，沿用操作数的原有类型规则。 */ function cross(a: Vec2, b: Vec2, c: Vec2): number { return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) }
/** 结构说明（自动提取）：polygonArea；输入 points；写入 twice；包含循环处理。 */ function polygonArea(points: Vec2[]): number {
  let twice = 0
  for (let index = 0; index < points.length; index++) twice += points[index].x * points[(index + 1) % points.length].y - points[index].y * points[(index + 1) % points.length].x
  return twice * .5
}
/** 结构说明（自动提取）：orientation；输入 a、b、c；直接调用 cross、Math.abs、Math.sign。 */ function orientation(a: Vec2, b: Vec2, c: Vec2): number {
  const value = cross(a, b, c)
  return Math.abs(value) <= 1e-10 ? 0 : Math.sign(value)
}
/** 结构说明（自动提取）：onSegment；输入 a、b、pointValue；直接调用 Math.abs、cross、Math.min、Math.max。 */ function onSegment(a: Vec2, b: Vec2, pointValue: Vec2): boolean {
  return Math.abs(cross(a, b, pointValue)) <= 1e-10
    && pointValue.x >= Math.min(a.x, b.x) - 1e-10 && pointValue.x <= Math.max(a.x, b.x) + 1e-10
    && pointValue.y >= Math.min(a.y, b.y) - 1e-10 && pointValue.y <= Math.max(a.y, b.y) + 1e-10
}
/** 结构说明（自动提取）：segmentsIntersect；输入 a、b、c、d；直接调用 orientation、onSegment。 */ function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const first = orientation(a, b, c), second = orientation(a, b, d), third = orientation(c, d, a), fourth = orientation(c, d, b)
  if (first !== second && third !== fourth) return true
  return (first === 0 && onSegment(a, b, c)) || (second === 0 && onSegment(a, b, d)) || (third === 0 && onSegment(c, d, a)) || (fourth === 0 && onSegment(c, d, b))
}
/** 结构说明（自动提取）：isSimplePolygon；输入 points；直接调用 Math.hypot、segmentsIntersect；包含循环处理。 */ function isSimplePolygon(points: Vec2[]): boolean {
  for (let first = 0; first < points.length; first++) {
    for (let second = first + 1; second < points.length; second++) {
      if (Math.hypot(points[first].x - points[second].x, points[first].y - points[second].y) <= 1e-9) return false
    }
  }
  for (let first = 0; first < points.length; first++) {
    const firstNext = (first + 1) % points.length
    for (let second = first + 1; second < points.length; second++) {
      const secondNext = (second + 1) % points.length
      if (first === second || firstNext === second || secondNext === first) continue
      if (segmentsIntersect(points[first], points[firstNext], points[second], points[secondNext])) return false
    }
  }
  return true
}
/** 结构说明（自动提取）：insideTriangle；输入 pointValue、a、b、c；直接调用 cross。 */ function insideTriangle(pointValue: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
  const first = cross(a, b, pointValue), second = cross(b, c, pointValue), third = cross(c, a, pointValue)
  const negative = first < -1e-10 || second < -1e-10 || third < -1e-10
  const positive = first > 1e-10 || second > 1e-10 || third > 1e-10
  return !(negative && positive)
}

/** Deterministic ear clipping for authored simple polygons. Invalid ears never
 * become silent convex envelopes: the caller receives no pieces and validation
 * can name the polygon that must be repaired. */
/** 结构说明（自动提取）：decomposeSimplePolygon；输入 input；直接调用 input.some、filter、input.map、Math.hypot、points.pop 等；写入 clipped；返回路径包含 triangles；包含循环处理。 */ export function decomposeSimplePolygon(input: Vec2[]): Vec2[][] {
  if (input.length > MAX_AUTHORED_COLLIDER_POINTS) return []
  if (input.some(/* 先计算 !Number.isFinite(entry?.x)；仅当其为假值时求右侧 !Number.isFinite(entry?.y)，返回短路求值结果。 */ entry => !Number.isFinite(entry?.x) || !Number.isFinite(entry?.y))) return []
  const points = input.map(point).filter(/* 先计算 index === 0；仅当其为假值时求右侧 Math.hypot(entry.x - values[index - 1].x, entry.y - values[index - 1].y) > 1e-9，返回短路求值结果。 */ (entry, index, values) => index === 0 || Math.hypot(entry.x - values[index - 1].x, entry.y - values[index - 1].y) > 1e-9)
  if (points.length > 2 && Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y) <= 1e-9) points.pop()
  if (points.length < 3 || Math.abs(polygonArea(points)) <= 1e-12 || !isSimplePolygon(points)) return []
  const order = [...points.keys()]
  if (polygonArea(points) < 0) order.reverse()
  const triangles: Vec2[][] = []
  let guard = points.length * points.length
  while (order.length > 3 && guard-- > 0) {
    let clipped = false
    for (let cursor = 0; cursor < order.length; cursor++) {
      const previous = order[(cursor + order.length - 1) % order.length]
      const current = order[cursor]
      const next = order[(cursor + 1) % order.length]
      if (cross(points[previous], points[current], points[next]) <= 1e-10) continue
      if (order.some(/** 结构说明（自动提取）：order.some 回调；输入 candidate；直接调用 insideTriangle；返回表达式求值结果。 */ candidate => candidate !== previous && candidate !== current && candidate !== next && insideTriangle(points[candidate], points[previous], points[current], points[next]))) continue
      triangles.push([points[previous], points[current], points[next]])
      order.splice(cursor, 1)
      clipped = true
      break
    }
    if (!clipped) return []
  }
  if (order.length === 3) triangles.push(order.map(/* 返回 points[index] 的当前值。 */ index => points[index]))
  return triangles
}

/** 结构说明（自动提取）：stableShapeId；输入 source、piece；直接调用 character.charCodeAt、Math.imul；写入 hash；包含循环处理。 */ function stableShapeId(source: string, piece: number): number {
  let hash = 0x811c9dc5
  for (const character of `${source}:${piece}`) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 0x01000193) }
  return hash >>> 0
}

/** 结构说明（自动提取）：baseShape；输入 source、id、kind、offset、rotation、size、points、piece、properties；直接调用 stableShapeId、point、finite、Math.max、Math.abs 等。 */ function baseShape(source: ColliderSource2D, id: string, kind: SolverColliderShape2D['kind'], offset: Vec2, rotation: number, size: Vec2, points: Vec2[], piece = 0, properties: Partial<ColliderShapeDescriptor2D> = {}): SolverColliderShape2D {
  return {
    id: stableShapeId(id, piece), sourceId: id, kind, offset: point(offset), rotation: finite(rotation),
    size: { x: Math.max(1e-9, Math.abs(finite(size.x, 1))), y: Math.max(1e-9, Math.abs(finite(size.y, 1))) },
    points: points.map(point), sensor: properties.sensor ?? source.sensor, physicsLayer: Math.min(31, Math.max(0, Math.round(properties.physicsLayer ?? source.physicsLayer))),
    collisionMask: (properties.collisionMask ?? source.collisionMask) >>> 0, oneWay: properties.oneWay ?? source.oneWay, oneWayNormal: point(properties.oneWayNormal ?? source.oneWayNormal)
  }
}

/** 结构说明（自动提取）：prepareOne；输入 source、id、kind、offset、rotation、size、authored、properties；直接调用 every、authored.some、Math.max、Math.abs、flatMap 等。 */ function prepareOne(source: ColliderSource2D, id: string, kind: PhysicsShapeKind, offset: Vec2, rotation: number, size: Vec2, authored: Vec2[], properties: Partial<ColliderShapeDescriptor2D> = {}): { shapes: SolverColliderShape2D[]; decomposed: boolean; invalid: boolean } {
  if (![offset?.x, offset?.y, rotation, size?.x, size?.y].every(/* 调用 Number.isFinite(value) 并返回调用结果。 */ value => Number.isFinite(value)) || !(size.x > 0) || !(size.y > 0) || authored.some(/* 先计算 !Number.isFinite(entry?.x)；仅当其为假值时求右侧 !Number.isFinite(entry?.y)，返回短路求值结果。 */ entry => !Number.isFinite(entry?.x) || !Number.isFinite(entry?.y))) return { shapes: [], decomposed: false, invalid: true }
  if (kind === 'Chain') {
    if (authored.length < 2) return { shapes: [], decomposed: true, invalid: true }
    const thickness = Math.max(1e-4, Math.abs(size.y || .02))
    const shapes = authored.slice(0, -1).flatMap(/** 结构说明（自动提取）：flatMap 回调；输入 start、index；直接调用 Math.hypot、Math.cos、Math.sin、baseShape、Math.atan2。 */ (start, index) => {
      const end = authored[index + 1], dx = end.x - start.x, dy = end.y - start.y, length = Math.hypot(dx, dy)
      if (length <= 1e-9) return []
      const midpoint = { x: (start.x + end.x) * .5, y: (start.y + end.y) * .5 }
      const cosine = Math.cos(rotation), sine = Math.sin(rotation)
      const center = { x: offset.x + midpoint.x * cosine - midpoint.y * sine, y: offset.y + midpoint.x * sine + midpoint.y * cosine }
      return [baseShape(source, id, 'Segment', center, rotation + Math.atan2(dy, dx), { x: length, y: thickness }, [], index, properties)]
    })
    return { shapes, decomposed: true, invalid: shapes.length === 0 }
  }
  if (kind === 'ConcavePolygon' || kind === 'ConvexPolygon' && authored.length > 4) {
    const pieces = decomposeSimplePolygon(authored)
    return { shapes: pieces.map(/* 调用 baseShape(source, id, 'ConvexPolygon', offset, rotation, size, points, index, properties) 并返回调用结果。 */ (points, index) => baseShape(source, id, 'ConvexPolygon', offset, rotation, size, points, index, properties)), decomposed: true, invalid: pieces.length === 0 }
  }
  if (kind === 'ConvexPolygon' && (authored.length < 3 || !isSimplePolygon(authored) || Math.abs(polygonArea(authored)) <= 1e-12)) return { shapes: [], decomposed: false, invalid: true }
  if (kind === 'ConvexPolygon' && authored.length === 4) { const turns = authored.map(/* 调用 Math.sign(cross(a, authored[(i+1)%4], authored[(i+2)%4])) 并返回调用结果。 */ (a, i) => Math.sign(cross(a, authored[(i+1)%4], authored[(i+2)%4]))).filter(Boolean); if (new Set(turns).size !== 1) return { shapes: [], decomposed: false, invalid: true } }
  const normalizedKind: SolverColliderShape2D['kind'] = kind === 'Circle' ? 'Circle' : kind === 'Capsule' ? 'Capsule' : kind === 'Segment' || kind === 'WorldBoundary' ? 'Segment' : kind === 'ConvexPolygon' ? 'ConvexPolygon' : 'Box'
  return { shapes: [baseShape(source, id, normalizedKind, offset, rotation, size, normalizedKind === 'ConvexPolygon' ? authored.slice(0, 4) : [], 0, properties)], decomposed: false, invalid: false }
}

/** Converts one authoring collider into exact convex children. Static chain and
 * concave shapes are accepted; dynamic concave ownership is explicitly blocked. */
/** 结构说明（自动提取）：prepareColliderSet；输入 source、dynamic；直接调用 Math.min、prepareOne、shapes.push；写入 decomposed；包含循环处理。 */ export function prepareColliderSet(source: ColliderSource2D, dynamic: boolean): PreparedColliderSet2D {
  if (dynamic && source.shapeModel === 'ConcavePolygon') return { shapes: [], blockedReason: 'Dynamic ConcavePolygon is unsupported. Use a static body or convex child shapes.', decomposed: false }
  if (dynamic && source.shapeModel === 'Chain') return { shapes: [], blockedReason: 'Dynamic Chain is unsupported. Use a static/kinematic body or finite convex segment children.', decomposed: false }
  const primarySize = source.shapeModel === 'Circle' ? { x: source.radiusX * 2, y: source.radiusY * 2 } : source.size
  const descriptors: ColliderShapeDescriptor2D[] = [{ id: 'primary', kind: source.shapeModel, offset: source.offset, rotation: source.rotation, size: primarySize, radius: Math.min(primarySize.x,primarySize.y)*.5, points: source.vertices, enabled: true, sensor: source.sensor, physicsLayer: source.physicsLayer, collisionMask: source.collisionMask, oneWay: source.oneWay, oneWayNormal: source.oneWayNormal }, ...source.shapes]
  const shapes: SolverColliderShape2D[] = []
  let decomposed = false
  for (const descriptor of descriptors) {
    if (!descriptor.enabled) continue
    if (descriptor.points.length > MAX_AUTHORED_COLLIDER_POINTS) return { shapes: [], blockedReason: `Collider '${descriptor.id}' exceeds the ${MAX_AUTHORED_COLLIDER_POINTS}-point authoring safety limit.`, decomposed: true }
    if (dynamic && descriptor.id !== 'primary' && descriptor.kind === 'WorldBoundary') return { shapes: [], blockedReason: `WorldBoundary child '${descriptor.id}' requires a static or kinematic owner.`, decomposed }
    if (dynamic && descriptor.kind === 'ConcavePolygon') return { shapes: [], blockedReason: `Dynamic concave child '${descriptor.id}' is unsupported. Decompose it into convex children.`, decomposed }
    if (dynamic && descriptor.kind === 'Chain') return { shapes: [], blockedReason: `Dynamic chain child '${descriptor.id}' is unsupported. Use finite convex segment children.`, decomposed }
    const result = prepareOne(source, descriptor.id, descriptor.kind, descriptor.offset, descriptor.rotation, descriptor.size, descriptor.points, descriptor)
    if (result.invalid) return { shapes: [], blockedReason: `Collider '${descriptor.id}' is degenerate or self-intersecting and cannot be decomposed safely.`, decomposed: true }
    shapes.push(...result.shapes)
    decomposed ||= result.decomposed
    if (shapes.length > MAX_SOLVER_CHILD_SHAPES) return { shapes: [], blockedReason: `Collider exceeds the ${MAX_SOLVER_CHILD_SHAPES}-piece solver safety limit.`, decomposed: true }
  }
  return { shapes, blockedReason: shapes.length ? null : 'Collider has no enabled, valid shapes.', decomposed }
}

/** 结构说明（自动提取）：encodeColliderChildren；输入 shapes、scale、collisionMatrix；直接调用 shapes.slice、Float64Array、children.forEach；返回路径包含 output。 */ export function encodeColliderChildren(shapes: SolverColliderShape2D[], scale: Vec2, collisionMatrix: readonly number[]): Float64Array {
  const children = shapes.slice(1)
  const output = new Float64Array(children.length * COLLIDER_CHILD_STRIDE)
  const kindCode = /* 根据 kind === 'Circle' 的真假，分别返回 1 或 kind === 'Capsule' ? 2 : kind === 'Segment' ? 3 : 0。 */ (kind: SolverColliderShape2D['kind']) => kind === 'Circle' ? 1 : kind === 'Capsule' ? 2 : kind === 'Segment' ? 3 : 0
  children.forEach(/** 结构说明（自动提取）：children.forEach 回调；输入 shape、childIndex；直接调用 kindCode、Math.sign、Math.abs、forEach、shape.points.slice；写入 output[…]。 */ (shape, childIndex) => {
    const index = childIndex * COLLIDER_CHILD_STRIDE
    output[index] = shape.id; output[index + 1] = kindCode(shape.kind)
    output[index + 2] = shape.offset.x * scale.x; output[index + 3] = shape.offset.y * scale.y; output[index + 4] = shape.rotation * Math.sign(scale.x * scale.y)
    output[index + 5] = shape.size.x * Math.abs(scale.x); output[index + 6] = shape.size.y * Math.abs(scale.y)
    const matrixMask = collisionMatrix[shape.physicsLayer] ?? (2 ** shape.physicsLayer) >>> 0
    output[index + 7] = shape.sensor ? 1 : 0; output[index + 8] = shape.physicsLayer; output[index + 9] = (shape.collisionMask & matrixMask) >>> 0
    shape.points.slice(0, 4).forEach(/** 结构说明（自动提取）：forEach 回调；输入 vertex、vertexIndex；写入 output[…]。 */ (vertex, vertexIndex) => { output[index + 10 + vertexIndex * 2] = vertex.x * scale.x; output[index + 11 + vertexIndex * 2] = vertex.y * scale.y })
    if (shape.points.length === 3) { output[index + 16] = shape.points[2].x * scale.x; output[index + 17] = shape.points[2].y * scale.y }
    output[index + 18] = shape.oneWay ? 1 : 0; output[index + 19] = shape.oneWayNormal.x / scale.x; output[index + 20] = shape.oneWayNormal.y / scale.y
  })
  return output
}

/** 结构说明（自动提取）：scaledSolverVertices；输入 shape、scale；直接调用 shape.points.map、Math.abs、Math.max、Math.min、Array.from。 */ function scaledSolverVertices(shape: SolverColliderShape2D, scale: Vec2): Vec2[] {
  if (shape.kind === 'ConvexPolygon' && shape.points.length >= 3) return shape.points.map(/** 构造并返回记录 { x: vertex.x * scale.x, y: vertex.y * scale.y }，字段按当前实参及捕获状态求值。 */ vertex => ({ x: vertex.x * scale.x, y: vertex.y * scale.y }))
  const width = shape.size.x * Math.abs(scale.x), height = shape.size.y * Math.abs(scale.y)
  if (shape.kind === 'Capsule') {
    const radius = Math.max(5e-10, Math.min(width, height) * .5), vertical = height >= width, straight = Math.max(0, (vertical ? height : width) * .5 - radius)
    return Array.from({ length: 12 }, /** 结构说明（自动提取）：Array.from 回调；输入 _、sample；直接调用 Math.cos、Math.sin。 */ (_, sample) => { const angle = Math.PI * 2 * sample / 12, dx = Math.cos(angle), dy = Math.sin(angle); return { x: (vertical ? 0 : dx >= 0 ? straight : -straight) + dx * radius, y: (vertical ? dy >= 0 ? straight : -straight : 0) + dy * radius } })
  }
  return [{ x: -width * .5, y: -height * .5 }, { x: width * .5, y: -height * .5 }, { x: width * .5, y: height * .5 }, { x: -width * .5, y: height * .5 }]
}

/** Area of the exact shape sent to the Rust solver, in squared world units. */
/** 结构说明（自动提取）：solverShapeArea；输入 shape、scale；直接调用 Math.abs、scaledSolverVertices、vertices.reduce。 */ export function solverShapeArea(shape: SolverColliderShape2D, scale: Vec2): number {
  if (shape.sensor) return 0
  if (shape.kind === 'Circle') return Math.PI * shape.size.x * Math.abs(scale.x) * shape.size.y * Math.abs(scale.y) * .25
  const vertices = scaledSolverVertices(shape, scale)
  return Math.abs(vertices.reduce(/* 计算表达式 sum + vertex.x * vertices[(index + 1) % vertices.length].y - vertex.y * vertices[(index + 1) % vertices.length].x 并返回结果，沿用操作数的原有类型规则。 */ (sum, vertex, index) => sum + vertex.x * vertices[(index + 1) % vertices.length].y - vertex.y * vertices[(index + 1) % vertices.length].x, 0)) * .5
}

/** Moment about the body's origin using the same polygon/ellipse formula and
 * parallel-axis term as nova_physics. `mass` is this child's assigned mass. */
/** 结构说明（自动提取）：solverShapeInertia；输入 shape、scale、mass；直接调用 Math.abs、scaledSolverVertices；写入 local、crossSum、weightedSum；包含循环处理。 */ export function solverShapeInertia(shape: SolverColliderShape2D, scale: Vec2, mass: number): number {
  if (shape.sensor || !(mass > 0)) return 0
  let local = mass
  if (shape.kind === 'Circle') {
    const radiusX = shape.size.x * Math.abs(scale.x) * .5, radiusY = shape.size.y * Math.abs(scale.y) * .5
    local = mass * (radiusX * radiusX + radiusY * radiusY) * .25
  } else {
    const vertices = scaledSolverVertices(shape, scale)
    let crossSum = 0, weightedSum = 0
    for (let index = 0; index < vertices.length; index++) { const first = vertices[index], second = vertices[(index + 1) % vertices.length], cross = first.x * second.y - first.y * second.x; crossSum += cross; weightedSum += cross * (first.x * first.x + first.x * second.x + second.x * second.x + first.y * first.y + first.y * second.y + second.y * second.y) }
    if (Math.abs(crossSum) > 1e-18) local = Math.abs(mass * weightedSum / (6 * crossSum))
  }
  const offsetX = shape.offset.x * scale.x, offsetY = shape.offset.y * scale.y
  return local + mass * (offsetX * offsetX + offsetY * offsetY)
}
