// Nova_A/editor/src/world/TriangleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'

export class TriangleEntity extends Entity {
  vertices: Vec2[]

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Triangle')
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
