// Nova_A/editor/src/world/CircleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'

export class CircleEntity extends Entity {
  radiusX: number
  radiusY: number

  constructor(id: number, pos: Vec2, rx: number, ry?: number) {
    super(id, 'Circle')
    this.transform.position = { ...pos }
    this.radiusX = rx
    this.radiusY = ry ?? rx
  }
}