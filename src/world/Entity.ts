// Nova_A/editor/src/world/Entity.ts
import { Transform } from './Transform'

export abstract class Entity {
  readonly id: number
  name: string
  transform = new Transform()

  constructor(id: number, name = 'Entity') {
    this.id = id
    this.name = name
  }
}