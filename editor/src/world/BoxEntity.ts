import { Entity } from './Entity'
import type { Vec2 } from './types'

export class BoxEntity extends Entity {
  size: Vec2

  constructor(id: number, pos: Vec2, size: Vec2) {
    super(id, 'Box')
    this.transform.position = { ...pos }
    this.size = { ...size }
  }
}
