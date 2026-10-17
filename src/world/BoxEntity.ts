/** 矩形实体：安装标准渲染与矩形碰撞组件，并在顶点变更时同步活动碰撞几何。 */
// Nova_A/editor/src/world/BoxEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'
import { Collider2D, ShapeRenderer2D } from './components'

export class BoxEntity extends Entity {
  /* 返回 this.renderer.vertices 的当前值。 */ get vertices(): Vec2[] { return this.renderer.vertices }
  /** 写入渲染顶点并复制到活动碰撞器；箱形碰撞模型同时根据顶点包围范围更新尺寸。 */ set vertices(value: Vec2[]) {
    this.renderer.vertices = value
    const collider = this.getCollider(true)
    if (collider && !collider.removed) {
      collider.vertices = value.map(/** 构造并返回记录 { ...vertex }，字段按当前实参及捕获状态求值。 */ vertex => ({ ...vertex }))
      if (value.length && collider.shapeModel === 'Box') collider.size = {
        x: positiveNumber(Math.max(...value.map(/* 返回 point.x 的当前值。 */ point => point.x)) - Math.min(...value.map(/* 返回 point.x 的当前值。 */ point => point.x))),
        y: positiveNumber(Math.max(...value.map(/* 返回 point.y 的当前值。 */ point => point.y)) - Math.min(...value.map(/* 返回 point.y 的当前值。 */ point => point.y)))
      }
    }
  }

  /** 安装矩形组件，将位置规范为有限数，并以尺寸的一半建立居中顶点和碰撞尺寸。 */ constructor(id: number, pos: Vec2, size: Vec2, uuid?: string) {
    super(id, 'Box', uuid)
    this.installStandardComponents(new ShapeRenderer2D('Rectangle'), new Collider2D('BoxCollider2D'))
    this.transform.position = { x: finiteNumber(pos.x), y: finiteNumber(pos.y) }
    
    // FIX: Centered vertices (0,0 is the middle)
    const hx = positiveNumber(size.x, 1) / 2
    const hy = positiveNumber(size.y, 1) / 2
    this.vertices = [
      { x: -hx, y: -hy },
      { x: hx, y: -hy },
      { x: hx, y: hy },
      { x: -hx, y: hy }
    ]
    this.collider.size = { x: hx * 2, y: hy * 2 }
  }
}
