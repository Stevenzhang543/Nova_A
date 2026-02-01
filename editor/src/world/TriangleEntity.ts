import { Entity } from './Entity'
import type { Vec2 } from './types'

export class TriangleEntity extends Entity {
  size: Vec2

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Triangle')
    this.transform.position = { ...pos }
    this.size = { ...size }
  }
}