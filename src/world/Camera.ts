import type { Vec2 } from './types'
import { finiteNumber } from './geometry'

export class Camera {
  scale = 0.5 
  offset: Vec2 = { x: 0, y: 0 }
  
  // NEW: Smooth Animation Targets
  targetScale: number | null = null
  targetOffset: Vec2 | null = null

  screenToWorld(p: Vec2): Vec2 {
    const scale = Math.min(Math.max(finiteNumber(this.scale, 0.5), 0.05), 10)
    return {
      x: (finiteNumber(p.x) - finiteNumber(this.offset.x)) / scale,
      y: -(finiteNumber(p.y) - finiteNumber(this.offset.y)) / scale
    }
  }

  zoomAt(screen: Vec2, factor: number) {
    // Clear animation targets if user manually zooms
    this.targetScale = null
    this.targetOffset = null
    
    const safeFactor = finiteNumber(factor, 1)
    if (safeFactor <= 0) return
    const before = this.screenToWorld(screen)
    this.scale = Math.min(Math.max(finiteNumber(this.scale, 0.5) * safeFactor, 0.05), 10)
    const after = this.screenToWorld(screen)

    this.offset.x += (after.x - before.x) * this.scale
    this.offset.y -= (after.y - before.y) * this.scale 
  }
}
