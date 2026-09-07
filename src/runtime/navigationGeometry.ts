import type { Entity } from '../world/Entity'
import type { NavigationRegion2D, NavigationObstacle2D, TileMap2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { worldTransform } from '../world/hierarchy'
import { prepareColliderSet } from './physicsGeometry'
import { readTileSet, transformNormalizedTilePoint } from './tilemap'

export interface NavigationShape { points: Vec2[]; ellipse?: { center: Vec2; axes: Vec2; angle: number } }
const rotate = (point: Vec2, angle: number): Vec2 => ({ x: point.x * Math.cos(angle) - point.y * Math.sin(angle), y: point.x * Math.sin(angle) + point.y * Math.cos(angle) })
export function segmentDistance(point: Vec2, first: Vec2, second: Vec2): number {
  const dx = second.x - first.x, dy = second.y - first.y, denominator = dx * dx + dy * dy
  const t = denominator ? Math.max(0, Math.min(1, ((point.x - first.x) * dx + (point.y - first.y) * dy) / denominator)) : 0
  return Math.hypot(point.x - first.x - dx * t, point.y - first.y - dy * t)
}
export function polygonContains(point: Vec2, points: Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index++) {
    const first = points[index], second = points[previous]
    if (segmentDistance(point, first, second) < 1e-9) return true
    if ((first.y > point.y) !== (second.y > point.y) && point.x < (second.x - first.x) * (point.y - first.y) / (second.y - first.y) + first.x) inside = !inside
  }
  return inside
}
export function shapeDistance(point: Vec2, shape: NavigationShape): number {
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
  return shape.points.reduce((distance, first, index) => Math.min(distance, segmentDistance(point, first, shape.points[(index + 1) % shape.points.length])), Infinity)
}
function rectangle(width: number, height: number): Vec2[] { return [{ x: -width / 2, y: -height / 2 }, { x: width / 2, y: -height / 2 }, { x: width / 2, y: height / 2 }, { x: -width / 2, y: height / 2 }] }
function transformedShape(entity: Entity, entities: Entity[], offset: Vec2, rotation: number, size: Vec2, points: Vec2[], ellipse = false): NavigationShape {
  const transform = worldTransform(entity, entities), shifted = rotate({ x: offset.x * transform.scale.x, y: offset.y * transform.scale.y }, transform.rotation)
  const center = { x: transform.position.x + shifted.x, y: transform.position.y + shifted.y }, angle = transform.rotation + rotation * Math.sign(transform.scale.x * transform.scale.y)
  const move = (point: Vec2) => { const value = rotate(point, angle); return { x: center.x + value.x, y: center.y + value.y } }
  const width = Math.abs(size.x * transform.scale.x), height = Math.abs(size.y * transform.scale.y)
  return ellipse ? { points: [], ellipse: { center, axes: { x: width / 2, y: height / 2 }, angle } }
    : { points: (points.length ? points.map(point => ({ x: point.x * transform.scale.x, y: point.y * transform.scale.y })) : rectangle(width, height)).map(move) }
}
/** Frozen world-space obstacles. Clearance remains a world distance under scaled parents. */
export function navigationShapes(regionEntity: Entity, region: NavigationRegion2D, entities: Entity[]): NavigationShape[] {
  const shapes: NavigationShape[] = []
  for (const entity of [...entities].sort((a, b) => a.uuid.localeCompare(b.uuid))) {
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
export function navigationShapeOutline(shape: NavigationShape, clearance: number): Vec2[] {
  if (shape.ellipse) {
    const { center, axes, angle } = shape.ellipse
    // Circumscribed support polygon for an ellipse dilated by a world-space disc.
    const count = 24, normals = Array.from({ length: count }, (_, index) => rotate({ x: Math.cos(index * 2 * Math.PI / count), y: Math.sin(index * 2 * Math.PI / count) }, angle))
    return normals.map((first, index) => {
      const second = normals[(index + 1) % count], localFirst = rotate(first, -angle), localSecond = rotate(second, -angle)
      const a = Math.hypot(axes.x * localFirst.x, axes.y * localFirst.y) + clearance + .001, b = Math.hypot(axes.x * localSecond.x, axes.y * localSecond.y) + clearance + .001
      const determinant = first.x * second.y - first.y * second.x
      return { x: center.x + (a * second.y - first.y * b) / determinant, y: center.y + (first.x * b - a * second.x) / determinant }
    })
  }
  const points = shape.points, signed = points.reduce((sum, first, index) => sum + first.x * points[(index + 1) % points.length].y - first.y * points[(index + 1) % points.length].x, 0), sign = Math.sign(signed) || 1
  return points.map((point, index) => {
    const previous = points[(index + points.length - 1) % points.length], next = points[(index + 1) % points.length]
    const firstLength = Math.hypot(point.x - previous.x, point.y - previous.y) || 1, secondLength = Math.hypot(next.x - point.x, next.y - point.y) || 1
    const first = { x: sign * (point.y - previous.y) / firstLength, y: sign * (previous.x - point.x) / firstLength }, second = { x: sign * (next.y - point.y) / secondLength, y: sign * (point.x - next.x) / secondLength }
    const denominator = Math.max(.001, 1 + first.x * second.x + first.y * second.y), distance = clearance + .001
    return { x: point.x + (first.x + second.x) * distance / denominator, y: point.y + (first.y + second.y) * distance / denominator }
  })
}
/** Resolve and copy tile data once per query/bake, never once per sampled cell. */
export function createTileNavigationSampler(region: NavigationRegion2D, entities: Entity[]): { signature: unknown; sample(point: Vec2): { blocked: boolean; cost: number } | null } {
  if (region.source !== 'TileMap') return { signature: null, sample: () => null }
  const entity = entities.find(candidate => candidate.uuid === region.sourceEntityUuid), tile = entity?.getComponent<TileMap2D>('TileMap2D'), document = tile?.enabled && entity?.enabled && tile.bakeNavigation ? readTileSet(tile.tileSetAsset) : null
  if (!entity || !tile || !document) return { signature: 'missing-or-disabled', sample: () => ({ blocked: true, cost: 0 }) }
  const transform = worldTransform(entity, entities), data = JSON.parse(JSON.stringify({ width: tile.width, height: tile.height, tileSize: tile.tileSize, layers: tile.layers.filter(layer => layer.visible && layer.navigationEnabled) })) as Pick<TileMap2D, 'width' | 'height' | 'tileSize' | 'layers'>
  const signature = [entity.uuid, transform, data, document]
  return { signature, sample(point) {
    const rotated = rotate({ x: point.x - transform.position.x, y: point.y - transform.position.y }, -transform.rotation)
    const rawX = rotated.x / transform.scale.x / data.tileSize.x + data.width / 2, rawY = rotated.y / transform.scale.y / data.tileSize.y + data.height / 2, x = Math.floor(rawX), y = Math.floor(rawY)
    if (!Number.isFinite(rawX + rawY) || x < 0 || y < 0 || x >= data.width || y >= data.height) return { blocked: true, cost: 0 }
    const index = y * data.width + x, local = { x: rawX - x, y: rawY - y }
    let cost = 0, found = false
    for (const layer of data.layers) {
      const definition = document.tiles[layer.tiles[index]]
      if (!definition) continue
      found = true
      if (!(definition.navigationCost > 0) || definition.navigationPolygon.length >= 3 && !polygonContains(local, definition.navigationPolygon.map(point => transformNormalizedTilePoint(point, layer.transforms[index] ?? 0)))) return { blocked: true, cost: 0 }
      cost = Math.max(cost, definition.navigationCost)
    }
    return { blocked: !found, cost: found ? Math.max(.001, cost) : 0 }
  } }
}

/** Continuous segment clearance: thin obstacles cannot fall between raster samples. */
export function shapeSegmentDistance(first: Vec2, second: Vec2, shape: NavigationShape): number {
  if (shape.ellipse) {
    // Distance to a convex set along a segment is convex; bounded ternary minimization.
    let low = 0, high = 1
    const at = (t: number) => shapeDistance({ x: first.x + (second.x - first.x) * t, y: first.y + (second.y - first.y) * t }, shape)
    for (let iteration = 0; iteration < 64; iteration++) { const a = (low * 2 + high) / 3, b = (low + high * 2) / 3; if (at(a) <= at(b)) high = b; else low = a }
    return Math.min(at(0), at(1), at((low + high) / 2))
  }
  if (polygonContains(first, shape.points) || polygonContains(second, shape.points)) return 0
  let distance = Infinity
  for (let index = 0; index < shape.points.length; index++) {
    const a = shape.points[index], b = shape.points[(index + 1) % shape.points.length]
    const cross = (p: Vec2, q: Vec2, r: Vec2) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
    if (cross(first, second, a) * cross(first, second, b) < 0 && cross(a, b, first) * cross(a, b, second) < 0) return 0
    distance = Math.min(distance, segmentDistance(first, a, b), segmentDistance(second, a, b), segmentDistance(a, first, second), segmentDistance(b, first, second))
  }
  return distance
}
export function polygonContainsSegment(first: Vec2, second: Vec2, polygon: Vec2[], clearance: number): boolean {
  if (!polygonContains(first, polygon) || !polygonContains(second, polygon)) return false
  const splits = [0, 1], dx = second.x - first.x, dy = second.y - first.y
  for (let index = 0; index < polygon.length; index++) {
    const a = polygon[index], b = polygon[(index + 1) % polygon.length], ex = b.x - a.x, ey = b.y - a.y, denominator = dx * ey - dy * ex
    if (Math.abs(denominator) > 1e-12) { const ax = a.x - first.x, ay = a.y - first.y, t = (ax * ey - ay * ex) / denominator, u = (ax * dy - ay * dx) / denominator; if (t > 0 && t < 1 && u >= 0 && u <= 1) splits.push(t) }
    if (clearance > 0 && shapeSegmentDistance(first, second, { points: [a, b] }) + 1e-9 < clearance) return false
  }
  splits.sort((a, b) => a - b)
  return splits.slice(1).every((value, index) => { const t = (splits[index] + value) * .5; return polygonContains({ x: first.x + dx * t, y: first.y + dy * t }, polygon) })
}
