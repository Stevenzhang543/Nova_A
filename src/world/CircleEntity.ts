/** 椭圆实体：统一维护椭圆渲染半径和碰撞半径，初始化有限位置与正半径。 */
// Nova_A/editor/src/world/CircleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'
import { Collider2D, ShapeRenderer2D } from './components'

export class CircleEntity extends Entity {
  /* 返回 this.renderer.radiusX 的当前值。 */ get radiusX(): number { return this.renderer.radiusX }
  /** 更新横向渲染半径；已有碰撞记录时同步其横向半径。 */ set radiusX(value: number) { this.renderer.radiusX = value; if (this.getCollider(true)) this.collider.radiusX = value }
  /* 返回 this.renderer.radiusY 的当前值。 */ get radiusY(): number { return this.renderer.radiusY }
  /** 更新纵向渲染半径；已有碰撞记录时同步其纵向半径。 */ set radiusY(value: number) { this.renderer.radiusY = value; if (this.getCollider(true)) this.collider.radiusY = value }

  /** 安装椭圆组件、规范位置和横向半径；未指定纵向半径时采用横向半径。 */ constructor(id: number, pos: Vec2, rx: number, ry?: number, uuid?: string) {
    super(id, 'Circle', uuid)
    this.installStandardComponents(new ShapeRenderer2D('Ellipse'), new Collider2D('EllipseCollider2D'))
    this.transform.position = { x: finiteNumber(pos.x), y: finiteNumber(pos.y) }
    this.radiusX = positiveNumber(rx, 1)
    this.radiusY = positiveNumber(ry, this.radiusX)
  }
}
