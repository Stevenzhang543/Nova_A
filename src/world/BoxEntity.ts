// Nova_A/editor/src/world/BoxEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'

export class BoxEntity extends Entity {
  // Vertices are relative to the entity's position (transform.position)
  vertices: Vec2[]

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Box')
    this.transform.position = { ...pos }
    
    // Initialize as a rectangle
    this.vertices = [
      { x: 0, y: 0 },
      { x: size.x, y: 0 },
      { x: size.x, y: size.y },
      { x: 0, y: size.y }
    ]
  }
}