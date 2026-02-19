// Nova_A/editor/src/world/World.ts
import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'

export class World {
  private nextId = 1
  entities: Entity[] = []

  addBox(pos: Vec2, size: Vec2) {
    const box = new BoxEntity(this.nextId++, pos, size)
    this.entities.push(box)
    return box
  }

  addCircle(pos: Vec2, rx: number, ry?: number) {
    const circle = new CircleEntity(this.nextId++, pos, rx, ry)
    this.entities.push(circle)
    return circle
  }

  addTriangle(pos: Vec2, size: Vec2) {
    const triangle = new TriangleEntity(this.nextId++, pos, size)
    this.entities.push(triangle)
    return triangle
  }

  update(_dt: number) {
    // physics logic here
  }
}