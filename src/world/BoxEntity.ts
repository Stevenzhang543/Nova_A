// Nova_A/editor/src/world/BoxEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'
import { Collider2D, ShapeRenderer2D } from './components'

export class BoxEntity extends Entity {
  get vertices(): Vec2[] { return this.renderer.vertices }
  set vertices(value: Vec2[]) {
    this.renderer.vertices = value
    const collider = this.getCollider(true)
    if (collider && !collider.removed) collider.vertices = value.map(vertex => ({ ...vertex }))
  }

  constructor(id: number, pos: Vec2, size: Vec2, uuid?: string) {
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
