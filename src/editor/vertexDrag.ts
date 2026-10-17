/** 顶点拖动基准：拖动直接改写实体几何数组，因此取消时必须能整体还原（主指令 §24 取消语义）。
 * 与变换拖动分开：变换用世界姿态快照还原，顶点用几何副本还原。
 * 注意：`vertices` 只存在于形状实体上，基础 Entity 没有该字段，因此这里做显式结构化访问，
 * 而不是假定每个实体都可编辑顶点。 */
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'

/** 形状实体才具备的基础顶点数组。 */
type ShapeVertices = { vertices?: Vec2[] }

export interface VertexBaseline {
  scale: Vec2
  vertices: Vec2[]
  rendererVertices: Vec2[]
  colliderVertices: Vec2[]
  pathPoints: Vec2[]
}

/** 读取形状实体的基础顶点；非形状实体返回空数组。 */
function readShapeVertices(entity: Entity): Vec2[] {
  const candidate = entity as Entity & ShapeVertices
  return Array.isArray(candidate.vertices) ? candidate.vertices : []
}

/** 捕获实体在顶点拖动前的缩放与全部可编辑几何副本。 */
export function captureVertexBaseline(entity: Entity): VertexBaseline {
  return {
    scale: { x: entity.transform.scale.x, y: entity.transform.scale.y },
    vertices: readShapeVertices(entity).map(/* 复制基础实体顶点。 */ vertex => ({ ...vertex })),
    rendererVertices: entity.renderer.vertices.map(/* 复制渲染顶点。 */ vertex => ({ ...vertex })),
    colliderVertices: (entity.collider.vertices ?? []).map(/* 复制碰撞顶点。 */ vertex => ({ ...vertex })),
    pathPoints: entity.authoring.path.points.map(/* 复制作者路径点。 */ point => ({ ...point }))
  }
}

/** 把顶点拖动直接写入的几何与缩放还原到捕获的基准。 */
export function restoreVertexBaseline(entity: Entity, baseline: VertexBaseline): void {
  entity.transform.scale.x = baseline.scale.x
  entity.transform.scale.y = baseline.scale.y
  const shape = entity as Entity & ShapeVertices
  if (Array.isArray(shape.vertices)) shape.vertices = baseline.vertices.map(/* 还原基础实体顶点。 */ vertex => ({ ...vertex }))
  entity.renderer.vertices = baseline.rendererVertices.map(/* 还原渲染顶点。 */ vertex => ({ ...vertex }))
  if (entity.collider.vertices) entity.collider.vertices = baseline.colliderVertices.map(/* 还原碰撞顶点。 */ vertex => ({ ...vertex }))
  entity.authoring.path.points = baseline.pathPoints.map(/* 还原作者路径点。 */ point => ({ ...point }))
}
