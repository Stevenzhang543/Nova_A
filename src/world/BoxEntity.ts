// Nova_A/editor/src/world/BoxEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'

export class BoxEntity extends Entity {
  // Vertices are relative to the entity's position (transform.position)
  vertices: Vec2[]

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Box')
    this.transform.position = { ...pos }
    
    // FIX: Centered vertices (0,0 is the middle)
    const hx = size.x / 2
    const hy = size.y / 2
    this.vertices = [
      { x: -hx, y: -hy },
      { x: hx, y: -hy },
      { x: hx, y: hy },
      { x: -hx, y: hy }
    ]
  }
}