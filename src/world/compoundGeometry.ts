import type { Connection } from './Connection'
import { boundCompoundEntityIds, entityBoundaryPoints } from './Connection'
import type { Entity } from './Entity'
import type { Vec2 } from './types'

export interface BoundarySegment {
  start: Vec2
  end: Vec2
}

export interface CompoundGeometry {
  memberIds: Set<number>
  members: Entity[]
  polygons: Vec2[][]
  boundary: BoundarySegment[]
}

const EPSILON = 1e-8

function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

function pointOnSegment(point: Vec2, a: Vec2, b: Vec2): boolean {
  const edge = subtract(b, a)
  const relative = subtract(point, a)
  if (Math.abs(cross(edge, relative)) > EPSILON * Math.max(1, Math.hypot(edge.x, edge.y))) return false
  const dot = relative.x * edge.x + relative.y * edge.y
  return dot >= -EPSILON && dot <= edge.x * edge.x + edge.y * edge.y + EPSILON
}

function pointInPolygonStrict(point: Vec2, polygon: Vec2[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[previous]
    const b = polygon[index]
    if (pointOnSegment(point, a, b)) return false
    if ((a.y > point.y) !== (b.y > point.y)
      && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function addIntersectionParameters(a: Vec2, b: Vec2, c: Vec2, d: Vec2, values: number[]): void {
  const edgeA = subtract(b, a)
  const edgeB = subtract(d, c)
  const denominator = cross(edgeA, edgeB)
  const relative = subtract(c, a)
  if (Math.abs(denominator) > EPSILON) {
    const t = cross(relative, edgeB) / denominator
    const u = cross(relative, edgeA) / denominator
    if (t > EPSILON && t < 1 - EPSILON && u >= -EPSILON && u <= 1 + EPSILON) values.push(t)
    return
  }
  if (Math.abs(cross(relative, edgeA)) > EPSILON) return
  const lengthSquared = edgeA.x * edgeA.x + edgeA.y * edgeA.y
  if (lengthSquared <= EPSILON * EPSILON) return
  for (const point of [c, d]) {
    const t = ((point.x - a.x) * edgeA.x + (point.y - a.y) * edgeA.y) / lengthSquared
    if (t > EPSILON && t < 1 - EPSILON) values.push(t)
  }
}

function segmentKey(segment: BoundarySegment): string {
  const a = `${segment.start.x.toFixed(8)},${segment.start.y.toFixed(8)}`
  const b = `${segment.end.x.toFixed(8)},${segment.end.y.toFixed(8)}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

export function unionBoundary(polygons: Vec2[][]): BoundarySegment[] {
  const result: BoundarySegment[] = []
  const seen = new Set<string>()
  polygons.forEach((polygon, polygonIndex) => {
    for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex++) {
      const start = polygon[edgeIndex]
      const end = polygon[(edgeIndex + 1) % polygon.length]
      const parameters = [0, 1]
      polygons.forEach((other, otherIndex) => {
        if (otherIndex === polygonIndex) return
        for (let otherEdge = 0; otherEdge < other.length; otherEdge++) {
          addIntersectionParameters(start, end, other[otherEdge], other[(otherEdge + 1) % other.length], parameters)
        }
      })
      parameters.sort((a, b) => a - b)
      const unique = parameters.filter((value, index) => index === 0 || Math.abs(value - parameters[index - 1]) > EPSILON)
      for (let index = 1; index < unique.length; index++) {
        const from = unique[index - 1]
        const to = unique[index]
        if (to - from <= EPSILON) continue
        const midpointRatio = (from + to) * 0.5
        const midpoint = {
          x: start.x + (end.x - start.x) * midpointRatio,
          y: start.y + (end.y - start.y) * midpointRatio
        }
        if (polygons.some((other, otherIndex) => otherIndex !== polygonIndex && pointInPolygonStrict(midpoint, other))) continue
        const segment = {
          start: { x: start.x + (end.x - start.x) * from, y: start.y + (end.y - start.y) * from },
          end: { x: start.x + (end.x - start.x) * to, y: start.y + (end.y - start.y) * to }
        }
        const key = segmentKey(segment)
        if (seen.has(key)) continue
        seen.add(key)
        result.push(segment)
      }
    }
  })
  return result
}

export function compoundGeometries(entities: Entity[], connections: Connection[]): CompoundGeometry[] {
  const groups: CompoundGeometry[] = []
  const visited = new Set<number>()
  for (const entity of entities) {
    if (visited.has(entity.id) || !entity.enabled || !entity.hasComponent('ShapeRenderer2D')) continue
    const memberIds = boundCompoundEntityIds(entity.id, connections, entities)
    const members = entities.filter(candidate => memberIds.has(candidate.id) && candidate.enabled && candidate.hasComponent('ShapeRenderer2D'))
    members.forEach(member => visited.add(member.id))
    const polygons = members.map(member => entityBoundaryPoints(member, member.shapeType === 'Circle' ? 64 : 48, entities))
      .filter(polygon => polygon.length >= 3)
    groups.push({ memberIds, members, polygons, boundary: unionBoundary(polygons) })
  }
  return groups
}
