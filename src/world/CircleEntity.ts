// Nova_A/editor/src/world/CircleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'

export class CircleEntity extends Entity {
  radiusX: number
  radiusY: number

  constructor(id: number, pos: Vec2, rx: number, ry?: number) {
    super(id, 'Circle')
    this.transform.position = { ...pos }
    // FIX: Enforce minimum size of 0.1 so division/canvas methods don't throw NaN or Errors
    this.radiusX = Math.max(0.1, rx)
    this.radiusY = Math.max(0.1, ry ?? rx)
  }
}