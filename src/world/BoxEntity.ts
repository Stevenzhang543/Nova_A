// Nova_A/editor/src/world/BoxEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'

export class BoxEntity extends Entity {
  // Vertices are relative to the entity's position (transform.position)
  vertices: Vec2[]

  constructor(id: number, pos: Vec2, size: Vec2, uuid?: string) {
    super(id, 'Box', uuid)
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
  }
}
