/** 三角实体：以居中等腰三角形初始化，并在合法顶点修改时同步渲染和活动碰撞器。 */
// Nova_A/editor/src/world/TriangleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'
import { Collider2D, ShapeRenderer2D } from './components'

export class TriangleEntity extends Entity {
  /* 返回 this.renderer.vertices 的当前值。 */ get vertices(): Vec2[] { return this.renderer.vertices }
  /** 先验证数组及每个有限坐标，再写渲染顶点并为活动碰撞器复制顶点。 */ set vertices(value: Vec2[]) {
    if (!Array.isArray(value)) throw new TypeError('vertices must be an array of finite coordinates')
    for (const vertex of value) {
      if (!vertex || !Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) throw new RangeError('vertices must contain finite coordinates')
    }
    this.renderer.vertices = value
    const collider = this.getCollider(true)
    if (collider && !collider.removed) collider.vertices = value.map(/** 构造并返回记录 { ...vertex }，字段按当前实参及捕获状态求值。 */ vertex => ({ ...vertex }))
  }

  /** 安装多边形组件，规范位置与尺寸，并创建居中等腰三角形顶点。 */ constructor(id: number, pos: Vec2, size: Vec2, uuid?: string) {
    super(id, 'Triangle', uuid)
    this.installStandardComponents(new ShapeRenderer2D('Polygon'), new Collider2D('PolygonCollider2D'))
    this.transform.position = { x: finiteNumber(pos.x), y: finiteNumber(pos.y) }
    
    // FIX: Centered Isosceles Triangle
    const hx = positiveNumber(size.x, 1) / 2
    const hy = positiveNumber(size.y, 1) / 2
    this.vertices = [
      { x: 0, y: hy },
      { x: hx, y: -hy },
      { x: -hx, y: -hy }
    ]
  }
}
