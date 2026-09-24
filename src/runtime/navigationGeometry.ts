/** 导航几何工具：处理可行走区域、障碍及路径查询所需的二维几何。 */
import type { Entity } from '../world/Entity'
import type { NavigationRegion2D, NavigationObstacle2D, TileMap2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { worldTransform } from '../world/hierarchy'
import { prepareColliderSet } from './physicsGeometry'
import { readTileSet, transformNormalizedTilePoint } from './tilemap'

export interface NavigationShape { points: Vec2[]; ellipse?: { center: Vec2; axes: Vec2; angle: number } }
const rotate = /** 构造并返回记录 { x: point.x * Math.cos(angle) - point.y * Math.sin(angle), y: point.x * Math.sin(angle) + point.y * Math.cos(angle) }，字段按当前实参及捕获状态求值。 */ (point: Vec2, angle: number): Vec2 => ({ x: point.x * Math.cos(angle) - point.y * Math.sin(angle), y: point.x * Math.sin(angle) + point.y * Math.cos(angle) })
/** 结构说明（自动提取）：segmentDistance；输入 point、first、second；直接调用 Math.max、Math.min、Math.hypot。 */ export function segmentDistance(point: Vec2, first: Vec2, second: Vec2): number {
  const dx = second.x - first.x, dy = second.y - first.y, denominator = dx * dx + dy * dy
  const t = denominator ? Math.max(0, Math.min(1, ((point.x - first.x) * dx + (point.y - first.y) * dy) / denominator)) : 0
  return Math.hypot(point.x - first.x - dx * t, point.y - first.y - dy * t)
}
/** 结构说明（自动提取）：polygonContains；输入 point、points；直接调用 segmentDistance；写入 previous、inside；返回路径包含 inside；包含循环处理。 */ export function polygonContains(point: Vec2, points: Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const first = points[index], second = points[previous]
    if (segmentDistance(point, first, second) < 1e-9) return true
    if ((first.y > point.y) !== (second.y > point.y) && point.x < (second.x - first.x) * (point.y - first.y) / (second.y - first.y) + first.x) inside = !inside
  }
  return inside
}
/** 结构说明（自动提取）：shapeDistance；输入 point、shape；直接调用 rotate、Math.abs、Math.max、Math.hypot、polygonContains 等；写入 low、high；包含循环处理。 */ export function shapeDistance(point: Vec2, shape: NavigationShape): number {
  if (shape.ellipse) {
    const { center, axes, angle } = shape.ellipse, local = rotate({ x: point.x - center.x, y: point.y - center.y }, -angle)
    const x = Math.abs(local.x), y = Math.abs(local.y), a = Math.max(1e-9, axes.x), b = Math.max(1e-9, axes.y)
    if ((x / a) ** 2 + (y / b) ** 2 <= 1) return 0
    const aa = a * a, bb = b * b
    let low = 0, high = Math.max(a * x, b * y, aa, bb) * 2
    for (let iteration = 0; iteration < 64; iteration++) {
      const middle = (low + high) * .5
      if ((a * x / (middle + aa)) ** 2 + (b * y / (middle + bb)) ** 2 > 1) low = middle; else high = middle
    }
    return Math.hypot(x - aa * x / (high + aa), y - bb * y / (high + bb))
  }
  if (polygonContains(point, shape.points)) return 0
  return shape.points.reduce(/* 调用 Math.min(distance, segmentDistance(point, first, shape.points[(index + 1) % shape.points.length])) 并返回调用结果。 */ (distance, first, index) => Math.min(distance, segmentDistance(point, first, shape.points[(index + 1) % shape.points.length])), Infinity)
}
/** 结构说明（自动提取）：rectangle；输入 width、height。 */ function rectangle(width: number, height: number): Vec2[] { return [{ x: -width / 2, y: -height / 2 }, { x: width / 2, y: -height / 2 }, { x: width / 2, y: height / 2 }, { x: -width / 2, y: height / 2 }] }
/** 结构说明（自动提取）：transformedShape；输入 entity、entities、offset、rotation、size、points、ellipse；直接调用 worldTransform、rotate、Math.sign、Math.abs、map 等。 */ function transformedShape(entity: Entity, entities: Entity[], offset: Vec2, rotation: number, size: Vec2, points: Vec2[], ellipse = false): NavigationShape {
  const transform = worldTransform(entity, entities), shifted = rotate({ x: offset.x * transform.scale.x, y: offset.y * transform.scale.y }, transform.rotation)
  const center = { x: transform.position.x + shifted.x, y: transform.position.y + shifted.y }, angle = transform.rotation + rotation * Math.sign(transform.scale.x * transform.scale.y)
  const move = /** 结构说明（自动提取）：move；输入 point；直接调用 rotate。 */ (point: Vec2) => { const value = rotate(point, angle); return { x: center.x + value.x, y: center.y + value.y } }
  const width = Math.abs(size.x * transform.scale.x), height = Math.abs(size.y * transform.scale.y)
  return ellipse ? { points: [], ellipse: { center, axes: { x: width / 2, y: height / 2 }, angle } }
    : { points: (points.length ? points.map(/** 构造并返回记录 { x: point.x * transform.scale.x, y: point.y * transform.scale.y }，字段按当前实参及捕获状态求值。 */ point => ({ x: point.x * transform.scale.x, y: point.y * transform.scale.y })) : rectangle(width, height)).map(move) }
}
/** Frozen world-space obstacles. Clearance remains a world distance under scaled parents. */
/** 结构说明（自动提取）：navigationShapes；输入 regionEntity、region、entities；直接调用 sort、entity.getComponent、shapes.push、transformedShape、entity.getCollider 等；返回路径包含 shapes；包含循环处理；包含显式抛错路径。 */ export function navigationShapes(regionEntity: Entity, region: NavigationRegion2D, entities: Entity[]): NavigationShape[] {
  const shapes: NavigationShape[] = []
  for (const entity of [...entities].sort(/* 调用 a.uuid.localeCompare(b.uuid) 并返回调用结果。 */ (a, b) => a.uuid.localeCompare(b.uuid))) {
    if (!entity.enabled || entity === regionEntity) continue
    const obstacle = entity.getComponent<NavigationObstacle2D>('NavigationObstacle2D')
    if (obstacle?.enabled && obstacle.navigationLayer === region.navigationLayer) {
      shapes.push(transformedShape(entity, entities, { x: 0, y: 0 }, 0, obstacle.shape === 'Circle' ? { x: obstacle.radius * 2, y: obstacle.radius * 2 } : obstacle.size, [], obstacle.shape === 'Circle'))
    } else if (region.source === 'SceneGeometry' && !entity.getComponent('NavigationAgent2D') && !entity.getComponent('NavigationRegion2D')) {
      const collider = entity.getCollider()
      if (!collider?.enabled) continue
      const prepared = prepareColliderSet(collider, entity.rigidBody.bodyType === 'Dynamic')
      if (prepared.blockedReason) throw new Error('NAVIGATION_GEOMETRY: ' + entity.name + ': ' + prepared.blockedReason)
      for (const shape of prepared.shapes) {
        if (shape.sensor || (region.navigationMask & (1 << shape.physicsLayer)) === 0) continue
        // Capsule navigation uses its enclosing rectangle. This is conservative, never a passage through collision geometry.
        shapes.push(transformedShape(entity, entities, shape.offset, shape.rotation, shape.size, shape.points, shape.kind === 'Circle'))
      }
    }
    if (shapes.length > 4096) throw new Error('NAVIGATION_LIMIT: at most 4096 obstacle pieces per region are supported.')
  }
  return shapes
}
/** 结构说明（自动提取）：navigationShapeOutline；输入 shape、clearance；直接调用 Array.from、normals.map、points.reduce、Math.sign、points.map。 */ export function navigationShapeOutline(shape: NavigationShape, clearance: number): Vec2[] {
  if (shape.ellipse) {
    const { center, axes, angle } = shape.ellipse
    // Circumscribed support polygon for an ellipse dilated by a world-space disc.
    const count = 24, normals = Array.from({ length: count }, /* 调用 rotate({ x: Math.cos(index * 2 * Math.PI / count), y: Math.sin(index * 2 * Math.PI / count) }, angle) 并返回调用结果。 */ (_, index) => rotate({ x: Math.cos(index * 2 * Math.PI / count), y: Math.sin(index * 2 * Math.PI / count) }, angle))
    return normals.map(/** 结构说明（自动提取）：normals.map 回调；输入 first、index；直接调用 rotate、Math.hypot。 */ (first, index) => {
      const second = normals[(index + 1) % count], localFirst = rotate(first, -angle), localSecond = rotate(second, -angle)
      const a = Math.hypot(axes.x * localFirst.x, axes.y * localFirst.y) + clearance + .001, b = Math.hypot(axes.x * localSecond.x, axes.y * localSecond.y) + clearance + .001
      const determinant = first.x * second.y - first.y * second.x
      return { x: center.x + (a * second.y - first.y * b) / determinant, y: center.y + (first.x * b - a * second.x) / determinant }
    })
  }
  const points = shape.points, signed = points.reduce(/* 计算表达式 sum + first.x * points[(index + 1) % points.length].y - first.y * points[(index + 1) % points.length].x 并返回结果，沿用操作数的原有类型规则。 */ (sum, first, index) => sum + first.x * points[(index + 1) % points.length].y - first.y * points[(index + 1) % points.length].x, 0), sign = Math.sign(signed) || 1
  return points.map(/** 结构说明（自动提取）：points.map 回调；输入 point、index；直接调用 Math.hypot、Math.max。 */ (point, index) => {
    const previous = points[(index + points.length - 1) % points.length], next = points[(index + 1) % points.length]
    const firstLength = Math.hypot(point.x - previous.x, point.y - previous.y) || 1, secondLength = Math.hypot(next.x - point.x, next.y - point.y) || 1
    const first = { x: sign * (point.y - previous.y) / firstLength, y: sign * (previous.x - point.x) / firstLength }, second = { x: sign * (next.y - point.y) / secondLength, y: sign * (point.x - next.x) / secondLength }
    const denominator = Math.max(.001, 1 + first.x * second.x + first.y * second.y), distance = clearance + .001
    return { x: point.x + (first.x + second.x) * distance / denominator, y: point.y + (first.y + second.y) * distance / denominator }
  })
}
/** Resolve and copy tile data once per query/bake, never once per sampled cell. */
/** 结构说明（自动提取）：createTileNavigationSampler；输入 region、entities；直接调用 entities.find、entity.getComponent、readTileSet、worldTransform、JSON.parse 等。 */ export function createTileNavigationSampler(region: NavigationRegion2D, entities: Entity[]): { signature: unknown; sample(point: Vec2): { blocked: boolean; cost: number } | null } {
  if (region.source !== 'TileMap') return { signature: null, sample: /* 返回固定值 null。 */ () => null }
  const entity = entities.find(/* 比较 candidate.uuid 与 region.sourceEntityUuid，返回严格相等的判断结果。 */ candidate => candidate.uuid === region.sourceEntityUuid), tile = entity?.getComponent<TileMap2D>('TileMap2D'), document = tile?.enabled && entity?.enabled && tile.bakeNavigation ? readTileSet(tile.tileSetAsset) : null
  if (!entity || !tile || !document) return { signature: 'missing-or-disabled', sample: /** 构造并返回记录 { blocked: true, cost: 0 }，字段按当前实参及捕获状态求值。 */ () => ({ blocked: true, cost: 0 }) }
  const transform = worldTransform(entity, entities), data = JSON.parse(JSON.stringify({ width: tile.width, height: tile.height, tileSize: tile.tileSize, layers: tile.layers.filter(/* 先计算 layer.visible；仅当其为真值时求右侧 layer.navigationEnabled，返回短路求值结果。 */ layer => layer.visible && layer.navigationEnabled) })) as Pick<TileMap2D, 'width' | 'height' | 'tileSize' | 'layers'>
  const signature = [entity.uuid, transform, data, document]
  return { signature, /** 结构说明（自动提取）：sample；输入 point；直接调用 rotate、Math.floor、Number.isFinite、polygonContains、definition.navigationPolygon.map 等；写入 found、cost；包含循环处理。 */ sample(point) {
    const rotated = rotate({ x: point.x - transform.position.x, y: point.y - transform.position.y }, -transform.rotation)
    const rawX = rotated.x / transform.scale.x / data.tileSize.x + data.width / 2, rawY = rotated.y / transform.scale.y / data.tileSize.y + data.height / 2, x = Math.floor(rawX), y = Math.floor(rawY)
    if (!Number.isFinite(rawX + rawY) || x < 0 || y < 0 || x >= data.width || y >= data.height) return { blocked: true, cost: 0 }
    const index = y * data.width + x, local = { x: rawX - x, y: rawY - y }
    let cost = 0, found = false
    for (const layer of data.layers) {
      const definition = document.tiles[layer.tiles[index]]
      if (!definition) continue
      found = true
      if (!(definition.navigationCost > 0) || definition.navigationPolygon.length >= 3 && !polygonContains(local, definition.navigationPolygon.map(/* 调用 transformNormalizedTilePoint(point, layer.transforms[index] ?? 0) 并返回调用结果。 */ point => transformNormalizedTilePoint(point, layer.transforms[index] ?? 0)))) return { blocked: true, cost: 0 }
      cost = Math.max(cost, definition.navigationCost)
    }
    return { blocked: !found, cost: found ? Math.max(.001, cost) : 0 }
  } }
}

/** Continuous segment clearance: thin obstacles cannot fall between raster samples. */
/** 结构说明（自动提取）：shapeSegmentDistance；输入 first、second、shape；直接调用 at、Math.min、polygonContains、cross、segmentDistance；写入 high、low、distance；返回路径包含 distance；包含循环处理。 */ export function shapeSegmentDistance(first: Vec2, second: Vec2, shape: NavigationShape): number {
  if (shape.ellipse) {
    // Distance to a convex set along a segment is convex; bounded ternary minimization.
    let low = 0, high = 1
    const at = /* 调用 shapeDistance({ x: first.x + (second.x - first.x) * t, y: first.y + (second.y - first.y) * t }, shape) 并返回调用结果。 */ (t: number) => shapeDistance({ x: first.x + (second.x - first.x) * t, y: first.y + (second.y - first.y) * t }, shape)
    for (let iteration = 0; iteration < 64; iteration++) { const a = (low * 2 + high) / 3, b = (low + high * 2) / 3; if (at(a) <= at(b)) high = b; else low = a }
    return Math.min(at(0), at(1), at((low + high) / 2))
  }
  if (polygonContains(first, shape.points) || polygonContains(second, shape.points)) return 0
  let distance = Infinity
  for (let index = 0; index < shape.points.length; index++) {
    const a = shape.points[index], b = shape.points[(index + 1) % shape.points.length]
    const cross = /* 计算表达式 (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x) 并返回结果，沿用操作数的原有类型规则。 */ (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
    if (cross(first, second, a) * cross(first, second, b) < 0 && cross(a, b, first) * cross(a, b, second) < 0) return 0
    distance = Math.min(distance, segmentDistance(first, a, b), segmentDistance(second, a, b), segmentDistance(a, first, second), segmentDistance(b, first, second))
  }
  return distance
}
/** 结构说明（自动提取）：polygonContainsSegment；输入 first、second、polygon、clearance；直接调用 polygonContains、Math.abs、splits.push、shapeSegmentDistance、splits.sort 等；包含循环处理。 */ export function polygonContainsSegment(first: Vec2, second: Vec2, polygon: Vec2[], clearance: number): boolean {
  if (!polygonContains(first, polygon) || !polygonContains(second, polygon)) return false
  const splits = [0, 1], dx = second.x - first.x, dy = second.y - first.y
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length], ex = b.x - a.x, ey = b.y - a.y, denominator = dx * ey - dy * ex
    if (Math.abs(denominator) > 1e-12) { const ax = a.x - first.x, ay = a.y - first.y, t = (ax * ey - ay * ex) / denominator, u = (ax * dy - ay * dx) / denominator; if (t > 0 && t < 1 && u >= 0 && u <= 1) splits.push(t) }
    if (clearance > 0 && shapeSegmentDistance(first, second, { points: [a, b] }) + 1e-9 < clearance) return false
  }
  splits.sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
  return splits.slice(1).every(/** 结构说明（自动提取）：every 回调；输入 value、index；直接调用 polygonContains。 */ (value, index) => { const t = (splits[index] + value) * .5; return polygonContains({ x: first.x + dx * t, y: first.y + dy * t }, polygon) })
}
