import { Transform } from './Transform'

export class Entity {
  readonly id: number
  name: string
  transform = new Transform()

  constructor(id: number, name = 'Entity') {
    this.id = id
    this.name = name
  }
}
