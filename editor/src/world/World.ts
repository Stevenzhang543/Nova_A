import type { Box, Vec2 } from './types'

export class World {
  boxes: Box[] = []
  private nextId = 1

  addBox(pos: Vec2, size: Vec2) {
    this.boxes.push({
      id: this.nextId++,
      pos,
      size
    })
  }
}
