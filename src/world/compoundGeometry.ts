/** 复合实体外边界：收集完整绑定组，将相交多边形边拆分并剔除内部线段供绘制与几何查询。 */
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

/* 计算表达式 a.x * b.y - a.y * b.x 并返回结果，沿用操作数的原有类型规则。 */ function cross(a: Vec2, b: Vec2): number {
  return a.x * b.y - a.y * b.x
}

/* 返回具有所列字段的新对象 { x: a.x - b.x, y: a.y - b.y }。 */ function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

/** 用叉积容差及点积投影检查点是否在线段上。 */ function pointOnSegment(point: Vec2, a: Vec2, b: Vec2): boolean {
  const edge = subtract(b, a)
  const relative = subtract(point, a)
  if (Math.abs(cross(edge, relative)) > EPSILON * Math.max(1, Math.hypot(edge.x, edge.y))) return false
  const dot = relative.x * edge.x + relative.y * edge.y
  return dot >= -EPSILON && dot <= edge.x * edge.x + edge.y * edge.y + EPSILON
}

/** 通过射线交叉次数判断点是否严格位于多边形内部，边界点返回假。 */ function pointInPolygonStrict(point: Vec2, polygon: Vec2[]): boolean {
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

/** 求两线段交点在第一条边上的内部参数；共线时加入重叠端点参数。 */ function addIntersectionParameters(a: Vec2, b: Vec2, c: Vec2, d: Vec2, values: number[]): void {
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

/** 以八位小数坐标构造与端点方向无关的线段去重键。 */ function segmentKey(segment: BoundarySegment): string {
  const a = `${segment.start.x.toFixed(8)},${segment.start.y.toFixed(8)}`
  const b = `${segment.end.x.toFixed(8)},${segment.end.y.toFixed(8)}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** 按其他多边形边的交点拆分每条边，保留中点不在其他内部的片段并去重。 */ export function unionBoundary(polygons: Vec2[][]): BoundarySegment[] {
  const result: BoundarySegment[] = []
  const seen = new Set<string>()
  polygons.forEach(/** 遍历当前多边形边，汇集切分参数后生成未被其他多边形遮住的边界片段。 */ (polygon, polygonIndex) => {
    for (let edgeIndex = 0; edgeIndex < polygon.length; edgeIndex++) {
      const start = polygon[edgeIndex]
      const end = polygon[(edgeIndex + 1) % polygon.length]
      const parameters = [0, 1]
      polygons.forEach(/** 跳过当前多边形，将其他多边形各边与待处理边的交点加入切分参数。 */ (other, otherIndex) => {
        if (otherIndex === polygonIndex) return
        for (let otherEdge = 0; otherEdge < other.length; otherEdge++) {
          addIntersectionParameters(start, end, other[otherEdge], other[(otherEdge + 1) % other.length], parameters)
        }
      })
      parameters.sort(/* 计算表达式 a - b 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a - b)
      const unique = parameters.filter(/* 先计算 index === 0；仅当其为假值时求右侧 Math.abs(value - parameters[index - 1]) > EPSILON，返回短路求值结果。 */ (value, index) => index === 0 || Math.abs(value - parameters[index - 1]) > EPSILON)
      for (let index = 1; index < unique.length; index++) {
        const from = unique[index - 1]
        const to = unique[index]
        if (to - from <= EPSILON) continue
        const midpointRatio = (from + to) * 0.5
        const midpoint = {
          x: start.x + (end.x - start.x) * midpointRatio,
          y: start.y + (end.y - start.y) * midpointRatio
        }
        if (polygons.some(/* 先计算 otherIndex !== polygonIndex；仅当其为真值时求右侧 pointInPolygonStrict(midpoint, other)，返回短路求值结果。 */ (other, otherIndex) => otherIndex !== polygonIndex && pointInPolygonStrict(midpoint, other))) continue
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

/** 按完整绑定关系收集可绘制实体组，采样成员边界并生成各组多边形并集外边。 */ export function compoundGeometries(entities: Entity[], connections: Connection[]): CompoundGeometry[] {
  const groups: CompoundGeometry[] = []
  const visited = new Set<number>()
  // With no intact binding, each shape is its own group. Avoid two full-scene
  // scans per shape while retaining the same polygon and boundary generation.
  const hasBindings = connections.some(/* 先计算 connection.binding；仅当其为真值时求右侧 connection.breakState === 'intact'，返回短路求值结果。 */ connection => connection.binding && connection.breakState === 'intact')
  for (const entity of entities) {
    if (visited.has(entity.id) || !entity.enabled || !entity.hasComponent('ShapeRenderer2D')) continue
    const memberIds = hasBindings ? boundCompoundEntityIds(entity.id, connections, entities) : new Set([entity.id])
    const members = hasBindings
      ? entities.filter(/* 先计算 memberIds.has(candidate.id) && candidate.enabled；仅当其为真值时求右侧 candidate.hasComponent('ShapeRenderer2D')，返回短路求值结果。 */ candidate => memberIds.has(candidate.id) && candidate.enabled && candidate.hasComponent('ShapeRenderer2D'))
      : [entity]
    members.forEach(/* 调用 visited.add(member.id) 并返回调用结果。 */ member => visited.add(member.id))
    const polygons = members.map(/* 调用 entityBoundaryPoints(member, member.shapeType === 'Circle' ? 64 : 48, entities) 并返回调用结果。 */ member => entityBoundaryPoints(member, member.shapeType === 'Circle' ? 64 : 48, entities))
      .filter(/* 比较 polygon.length 与 3，返回大于或等于的判断结果。 */ polygon => polygon.length >= 3)
    groups.push({ memberIds, members, polygons, boundary: unionBoundary(polygons) })
  }
  return groups
}
