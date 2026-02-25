// Nova_A/editor/src/world/TriangleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'

export class TriangleEntity extends Entity {
  vertices: Vec2[]

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Triangle')
    this.transform.position = { ...pos }
    
    // Initialize as Isosceles Triangle
    this.vertices = [
      { x: size.x / 2, y: 0 },
      { x: size.x, y: size.y },
      { x: 0, y: size.y }
    ]
  }
}