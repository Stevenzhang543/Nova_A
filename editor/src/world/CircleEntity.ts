import { Entity } from './Entity'
import type { Vec2 } from './types'

export class CircleEntity extends Entity {
  radius: number

  constructor(id: number, pos: Vec2, radius: number) {
    super(id, 'Circle')
    this.transform.position = { ...pos }
    this.radius = radius
  }
}