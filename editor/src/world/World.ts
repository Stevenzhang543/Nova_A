// Nova_A/editor/src/world/World.ts
import { Entity } from './Entity'
import { BoxEntity } from './BoxEntity'
import { CircleEntity } from './CircleEntity'
import { TriangleEntity } from './TriangleEntity'
import type { Vec2 } from './types'
//import { reactive } from 'vue'

export class World {
  private nextId = 1
  // Initialized as an empty array here, but overwritten with a reactive array in physics.ts
  entities: Entity[] = []

  addBox(pos: Vec2, size: Vec2) {
    const box = new BoxEntity(this.nextId++, pos, size)
    this.entities.push(box)
    return box
  }

  // UPDATED: Now accepts separate X and Y radii
  addCircle(pos: Vec2, radiusX: number, radiusY: number) {
    const circle = new CircleEntity(this.nextId++, pos, radiusX, radiusY)
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