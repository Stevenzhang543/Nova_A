import type { Vec2 } from './types'
import { finiteNumber } from './geometry'

export const EDITOR_DEFAULT_SCALE = 40
export const EDITOR_MIN_SCALE = 0.05
export const EDITOR_MAX_SCALE = 1000

export class Camera {
  // Editor pixels per world unit. Keeping this separate from Camera2D means
  // physically sensible one-unit template objects remain easy to see/edit.
  scale = EDITOR_DEFAULT_SCALE
  offset: Vec2 = { x: 0, y: 0 }
  
  // NEW: Smooth Animation Targets
  targetScale: number | null = null
  targetOffset: Vec2 | null = null

  screenToWorld(p: Vec2): Vec2 {
    const scale = Math.min(Math.max(finiteNumber(this.scale, EDITOR_DEFAULT_SCALE), EDITOR_MIN_SCALE), EDITOR_MAX_SCALE)
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
    this.scale = Math.min(Math.max(finiteNumber(this.scale, EDITOR_DEFAULT_SCALE) * safeFactor, EDITOR_MIN_SCALE), EDITOR_MAX_SCALE)
    const after = this.screenToWorld(screen)

    this.offset.x += (after.x - before.x) * this.scale
    this.offset.y -= (after.y - before.y) * this.scale 
  }
}
