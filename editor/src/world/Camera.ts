import type { Vec2 } from './types'

export class Camera {
  scale = 1
  offset: Vec2 = { x: 0, y: 0 }

  worldToScreen(world: Vec2): Vec2 {
    return {
      x: world.x * this.scale + this.offset.x,
      y: world.y * this.scale + this.offset.y
    }
  }

  screenToWorld(screen: Vec2): Vec2 {
    return {
      x: (screen.x - this.offset.x) / this.scale,
      y: (screen.y - this.offset.y) / this.scale
    }
  }

  zoomAt(mouse: Vec2, factor: number) {
    const before = this.screenToWorld(mouse)

    this.scale *= factor
    this.scale = Math.min(Math.max(this.scale, 0.1), 10)

    const after = this.screenToWorld(mouse)

    this.offset.x += (before.x - after.x) * this.scale
    this.offset.y += (before.y - after.y) * this.scale
  }
}
