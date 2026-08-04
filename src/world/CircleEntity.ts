// Nova_A/editor/src/world/CircleEntity.ts
import { Entity } from './Entity'
import type { Vec2 } from './types'
import { finiteNumber, positiveNumber } from './geometry'

export class CircleEntity extends Entity {
  radiusX: number
  radiusY: number

  constructor(id: number, pos: Vec2, rx: number, ry?: number) {
    super(id, 'Circle')
    this.transform.position = { x: finiteNumber(pos.x), y: finiteNumber(pos.y) }
    this.radiusX = positiveNumber(rx, 1)
    this.radiusY = positiveNumber(ry, this.radiusX)
  }
}
