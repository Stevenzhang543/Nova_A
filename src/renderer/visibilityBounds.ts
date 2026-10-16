/** Conservative transformed bounds, independent of framework, world ownership and backend. */
import type { Vec2 } from '../world/types'

export interface RenderBounds2D { minX: number; maxX: number; minY: number; maxY: number }

/** Returns null for invalid/unknown geometry so callers retain it instead of silently hiding it. */
export function transformedRenderBounds(points: readonly Vec2[], position: Vec2, rotation: number, scale: Vec2, padding = 0): RenderBounds2D | null {
  if (!points.length || ![position.x, position.y, rotation, scale.x, scale.y, padding].every(Number.isFinite)) return null
  const cosine = Math.cos(rotation), sine = Math.sin(rotation)
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const point of points) {
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null
    const x = point.x * scale.x, y = point.y * scale.y
    const worldX = position.x + x * cosine - y * sine, worldY = position.y + x * sine + y * cosine
    minX = Math.min(minX, worldX); maxX = Math.max(maxX, worldX)
    minY = Math.min(minY, worldY); maxY = Math.max(maxY, worldY)
  }
  if (![minX, minY, maxX, maxY, minX - padding, maxX + padding, minY - padding, maxY + padding].every(Number.isFinite)) return null
  return { minX: minX - padding, maxX: maxX + padding, minY: minY - padding, maxY: maxY + padding }
}

export function renderBoundsIntersect(first: RenderBounds2D | null, second: RenderBounds2D): boolean {
  return !first || first.maxX >= second.minX && first.minX <= second.maxX && first.maxY >= second.minY && first.minY <= second.maxY
}
