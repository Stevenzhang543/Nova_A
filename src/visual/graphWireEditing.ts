/** 图连线路由编辑：校验拐点范围、限制路由规模，并返回可由编辑器统一纳入撤销事务的修改提案。 */
import type { GraphEdge, GraphPoint } from './graphTypes'

export const MAX_WIRE_REROUTES = 64
/** 拒绝非有限或绝对值超过一百万的坐标，返回独立拐点副本。 */ export function checkedWirePoint(point: GraphPoint): GraphPoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.x) > 1_000_000 || Math.abs(point.y) > 1_000_000) throw new Error('Routing coordinates must be finite and within ±1,000,000.')
  return { x: point.x, y: point.y }
}
/** Returns a proposal. The editor owns its single undo transaction. */
/** 校验单线及全图拐点数量，寻找与新点最近的折线段并返回插入后的独立路由数组。 */ export function insertWireReroute(edge: GraphEdge, point: GraphPoint, endpoints: readonly [GraphPoint, GraphPoint], totalPoints = edge.reroutes?.length ?? 0): GraphPoint[] {
  const current = edge.reroutes ?? []
  if (current.length >= MAX_WIRE_REROUTES) throw new Error('A wire can contain at most 64 routing points.')
  if (totalPoints >= 100_000) throw new Error('The graph already contains 100,000 routing points.')
  const value = checkedWirePoint(point), route = [endpoints[0], ...current, endpoints[1]]
  let insertion = 0, distance = Infinity
  for (let index = 0; index < route.length - 1; index++) {
    const a = route[index], b = route[index + 1], dx = b.x - a.x, dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((value.x - a.x) * dx + (value.y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    const score = (value.x - a.x - t * dx) ** 2 + (value.y - a.y - t * dy) ** 2
    if (score < distance) { distance = score; insertion = index }
  }
  return [...current.slice(0, insertion).map(/** 构造并返回记录 { ...point }，字段按当前实参及捕获状态求值。 */ point => ({ ...point })), value, ...current.slice(insertion).map(/** 构造并返回记录 { ...point }，字段按当前实参及捕获状态求值。 */ point => ({ ...point }))]
}
/** 校验仍有效的整数索引和坐标，返回仅替换目标拐点的独立路由数组。 */ export function changeWireReroute(edge: GraphEdge, index: number, point: GraphPoint): GraphPoint[] {
  if (!Number.isInteger(index) || index < 0 || index >= (edge.reroutes?.length ?? 0)) throw new Error('The routing point no longer exists.')
  const value = checkedWirePoint(point)
  return edge.reroutes!.map(/** 构造并返回记录 { ...(position === index ? value : point) }，字段按当前实参及捕获状态求值。 */ (point, position) => ({ ...(position === index ? value : point) }))
}
