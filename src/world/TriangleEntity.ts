// Nova_A/editor/src/world/TriangleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'
import { Collider2D, ShapeRenderer2D } from './components'

export class TriangleEntity extends Entity {
  get vertices(): Vec2[] { return this.renderer.vertices }
  set vertices(value: Vec2[]) {
    if (!Array.isArray(value)) throw new TypeError('vertices must be an array of finite coordinates')
    for (const vertex of value) {
      if (!vertex || !Number.isFinite(vertex.x) || !Number.isFinite(vertex.y)) throw new RangeError('vertices must contain finite coordinates')
    }
    this.renderer.vertices = value
    const collider = this.getCollider(true)
    if (collider && !collider.removed) collider.vertices = value.map(vertex => ({ ...vertex }))
  }

  constructor(id: number, pos: Vec2, size: Vec2, uuid?: string) {
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
