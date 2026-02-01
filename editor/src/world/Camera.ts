import type { Vec2 } from './types'

export class Camera {
  scale = 1
  offset: Vec2 = { x: 0, y: 0 }

  screenToWorld(p: Vec2): Vec2 {
    return {
      x: (p.x - this.offset.x) / this.scale,
      y: (p.y - this.offset.y) / this.scale
    }
  }

  zoomAt(screen: Vec2, factor: number) {
    const before = this.screenToWorld(screen)

    this.scale = Math.min(Math.max(this.scale * factor, 0.1), 10)

    const after = this.screenToWorld(screen)

    this.offset.x += (after.x - before.x) * this.scale
    this.offset.y += (after.y - before.y) * this.scale
  }
}
