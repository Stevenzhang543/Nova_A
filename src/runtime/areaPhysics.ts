/** 26.45: geometry for area effects: the world polygons of a body's colliders, the region of an
 * Area2D, convex clipping and polygon area/centroid. Used for buoyancy (the submerged part of a body
 * and its centroid) and point gravity. Pure functions on world data; no editor state. */
import type { Entity } from '../world/Entity'
import type { Area2D } from '../world/components'
import type { Vec2 } from '../world/types'
import { localPointToWorld, worldTransform } from '../world/hierarchy'
import { capsuleOutline, prepareColliderSet } from './physicsGeometry'

const CIRCLE_SEGMENTS = 20

/** Signed area (counter-clockwise positive) and centroid of a simple polygon. */
export function polygonAreaCentroid(points: readonly Vec2[]): { area: number; centroid: Vec2 } {
  let twice = 0, cx = 0, cy = 0
  for (let index = 0; index < points.length; index++) {
    const a = points[index], b = points[(index + 1) % points.length], cross = a.x * b.y - b.x * a.y
    twice += cross; cx += (a.x + b.x) * cross; cy += (a.y + b.y) * cross
  }
  if (Math.abs(twice) <= 1e-18) {
    const mean = points.reduce((sum, point) => ({ x: sum.x + point.x / Math.max(1, points.length), y: sum.y + point.y / Math.max(1, points.length) }), { x: 0, y: 0 })
    return { area: 0, centroid: mean }
  }
  return { area: twice * .5, centroid: { x: cx / (3 * twice), y: cy / (3 * twice) } }
}

function counterClockwise(points: Vec2[]): Vec2[] {
  return polygonAreaCentroid(points).area < 0 ? [...points].reverse() : points
}

/** Sutherland–Hodgman: the part of `subject` inside the convex polygon `clip`. */
export function clipConvex(subject: readonly Vec2[], clip: readonly Vec2[]): Vec2[] {
  let output = counterClockwise([...subject])
  const edges = counterClockwise([...clip])
  for (let index = 0; index < edges.length && output.length; index++) {
    const a = edges[index], b = edges[(index + 1) % edges.length]
    const inside = (point: Vec2) => (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x) >= -1e-12
    const input = output
    output = []
    for (let k = 0; k < input.length; k++) {
      const current = input[k], previous = input[(k + input.length - 1) % input.length]
      const currentIn = inside(current), previousIn = inside(previous)
      if (currentIn !== previousIn) {
        const dx = current.x - previous.x, dy = current.y - previous.y
        const denominator = (b.x - a.x) * dy - (b.y - a.y) * dx
        if (Math.abs(denominator) > 1e-18) {
          // Where previous + t·(current − previous) crosses the edge line a→b.
          const t = ((b.x - a.x) * (a.y - previous.y) - (b.y - a.y) * (a.x - previous.x)) / denominator
          output.push({ x: previous.x + dx * t, y: previous.y + dy * t })
        }
      }
      if (currentIn) output.push(current)
    }
  }
  return output.length >= 3 ? output : []
}

/** World-space polygons of every solid collider shape of a body (circles and capsules sampled).
 * `pose` replaces the entity's world position and rotation (the solver pose instead of the display
 * pose, which can lag a step behind while interpolating). */
export function colliderWorldPolygons(entity: Entity, entities: readonly Entity[], pose?: { position: Vec2; rotation: number } | null): Vec2[][] {
  const collider = entity.getCollider()
  if (!collider?.enabled) return []
  const transform = worldTransform(entity, entities as Entity[])
  const at = pose ?? transform, bodyCos = Math.cos(at.rotation), bodySin = Math.sin(at.rotation)
  const toWorld = (point: Vec2): Vec2 => {
    const x = point.x * transform.scale.x, y = point.y * transform.scale.y
    return { x: at.position.x + x * bodyCos - y * bodySin, y: at.position.y + x * bodySin + y * bodyCos }
  }
  const prepared = prepareColliderSet(collider, !entity.isStatic && !entity.isKinematic)
  return prepared.shapes.filter(shape => !shape.sensor).map(shape => {
    let local: Vec2[]
    if (shape.points.length >= 3) local = shape.points
    else if (shape.kind === 'Circle') local = Array.from({ length: CIRCLE_SEGMENTS }, (_, index) => { const angle = index / CIRCLE_SEGMENTS * Math.PI * 2; return { x: Math.cos(angle) * shape.size.x * .5, y: Math.sin(angle) * shape.size.y * .5 } })
    else if (shape.kind === 'Capsule') local = capsuleOutline(shape.size.x, shape.size.y, 8)
    else local = [{ x: -shape.size.x * .5, y: -shape.size.y * .5 }, { x: shape.size.x * .5, y: -shape.size.y * .5 }, { x: shape.size.x * .5, y: shape.size.y * .5 }, { x: -shape.size.x * .5, y: shape.size.y * .5 }]
    const cosine = Math.cos(shape.rotation), sine = Math.sin(shape.rotation)
    return local.map(point => toWorld({ x: shape.offset.x + point.x * cosine - point.y * sine, y: shape.offset.y + point.x * sine + point.y * cosine }))
  }).filter(points => points.length >= 3)
}

/** The world region of an Area2D (a box, or a circle sampled as a polygon), and its centre and reach. */
export function areaWorldRegion(entity: Entity, area: Area2D, entities: readonly Entity[]): { polygon: Vec2[]; center: Vec2; radius: number } {
  const transform = worldTransform(entity, entities as Entity[])
  if (area.shape === 'Circle') {
    const radius = area.radius * Math.max(Math.abs(transform.scale.x), Math.abs(transform.scale.y))
    const polygon = Array.from({ length: 24 }, (_, index) => { const angle = index / 24 * Math.PI * 2; return { x: transform.position.x + Math.cos(angle) * radius, y: transform.position.y + Math.sin(angle) * radius } })
    return { polygon, center: { ...transform.position }, radius }
  }
  const half = { x: area.size.x * .5, y: area.size.y * .5 }
  const polygon = [{ x: -half.x, y: -half.y }, { x: half.x, y: -half.y }, { x: half.x, y: half.y }, { x: -half.x, y: half.y }].map(point => localPointToWorld(entity, point, entities))
  return { polygon, center: { ...transform.position }, radius: Math.hypot(half.x * transform.scale.x, half.y * transform.scale.y) }
}

/** The submerged part of a body in a region: area, centroid and the body's total solid area. */
export function submergedPart(bodyPolygons: readonly Vec2[][], region: readonly Vec2[]): { area: number; centroid: Vec2; total: number } {
  let area = 0, cx = 0, cy = 0, total = 0
  for (const polygon of bodyPolygons) {
    total += Math.abs(polygonAreaCentroid(polygon).area)
    const inside = clipConvex(polygon, region)
    if (!inside.length) continue
    const part = polygonAreaCentroid(inside), partArea = Math.abs(part.area)
    area += partArea; cx += part.centroid.x * partArea; cy += part.centroid.y * partArea
  }
  return { area, centroid: area > 0 ? { x: cx / area, y: cy / area } : { x: 0, y: 0 }, total }
}
