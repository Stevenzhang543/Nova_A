// Nova_A/editor/src/world/TriangleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'

export class TriangleEntity extends Entity {
  vertices: Vec2[]

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Triangle')
    this.transform.position = { ...pos }
    
    // FIX: Centered Isosceles Triangle
    const hx = size.x / 2
    const hy = size.y / 2
    this.vertices = [
      { x: 0, y: hy },
      { x: hx, y: -hy },
      { x: -hx, y: -hy }
    ]
  }
}