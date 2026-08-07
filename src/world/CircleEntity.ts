// Nova_A/editor/src/world/CircleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'
import { Collider2D, ShapeRenderer2D } from './components'

export class CircleEntity extends Entity {
  get radiusX(): number { return this.renderer.radiusX }
  set radiusX(value: number) { this.renderer.radiusX = value; if (this.getCollider(true)) this.collider.radiusX = value }
  get radiusY(): number { return this.renderer.radiusY }
  set radiusY(value: number) { this.renderer.radiusY = value; if (this.getCollider(true)) this.collider.radiusY = value }

  constructor(id: number, pos: Vec2, rx: number, ry?: number, uuid?: string) {
    super(id, 'Circle', uuid)
    this.installStandardComponents(new ShapeRenderer2D('Ellipse'), new Collider2D('EllipseCollider2D'))
    this.transform.position = { x: finiteNumber(pos.x), y: finiteNumber(pos.y) }
    this.radiusX = positiveNumber(rx, 1)
    this.radiusY = positiveNumber(ry, this.radiusX)
  }
}
