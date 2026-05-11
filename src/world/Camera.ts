import type { Vec2 } from './types'

export class Camera {
  scale = 0.5 
  offset: Vec2 = { x: 0, y: 0 }
  
  // NEW: Smooth Animation Targets
  targetScale: number | null = null
  targetOffset: Vec2 | null = null

  screenToWorld(p: Vec2): Vec2 {
    return {
      x: (p.x - this.offset.x) / this.scale,
      y: -(p.y - this.offset.y) / this.scale 
    }
  }

  zoomAt(screen: Vec2, factor: number) {
    // Clear animation targets if user manually zooms
    this.targetScale = null
    this.targetOffset = null
    
    const before = this.screenToWorld(screen)
    this.scale = Math.min(Math.max(this.scale * factor, 0.05), 10) 
    const after = this.screenToWorld(screen)

    this.offset.x += (after.x - before.x) * this.scale
    this.offset.y -= (after.y - before.y) * this.scale 
  }
}