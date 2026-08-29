import type { CameraRenderView } from './types'

/** Axis-aligned world bounds of the pixels owned by one camera viewport. */
export function visibleWorldBounds(view: CameraRenderView, width: number, height: number) {
  const center = view.position ?? { x: (width * .5 - view.offset.x) / view.scale, y: (view.offset.y - height * .5) / view.scale }
  const viewport = view.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
  const halfWidth = width * Math.max(0, viewport.width) / Math.max(1e-9, view.scale) * .5
  const halfHeight = height * Math.max(0, viewport.height) / Math.max(1e-9, view.scale) * .5
  const rotation = view.rotation ?? 0
  const extentX = Math.abs(Math.cos(rotation)) * halfWidth + Math.abs(Math.sin(rotation)) * halfHeight
  const extentY = Math.abs(Math.sin(rotation)) * halfWidth + Math.abs(Math.cos(rotation)) * halfHeight
  return { minX: center.x - extentX, maxX: center.x + extentX, minY: center.y - extentY, maxY: center.y + extentY }
}

/** Exact inverse of the renderer camera transform for a screen-local pointer. */
export function gameScreenToWorld(point: { x: number; y: number }, view: CameraRenderView, width: number, height: number): { x: number; y: number } {
  if (!view.position) return { x: (point.x - view.offset.x) / Math.max(1e-9, view.scale), y: -(point.y - view.offset.y) / Math.max(1e-9, view.scale) }
  const viewport = view.viewport ?? { x: 0, y: 0, width: 1, height: 1 }
  const centerX = (viewport.x + viewport.width * .5) * width
  const centerY = (1 - viewport.y - viewport.height * .5) * height
  const local = { x: (point.x - centerX) / Math.max(1e-9, view.scale), y: -(point.y - centerY) / Math.max(1e-9, view.scale) }
  const angle = view.rotation ?? 0, cosine = Math.cos(angle), sine = Math.sin(angle)
  return { x: view.position.x + local.x * cosine - local.y * sine, y: view.position.y + local.x * sine + local.y * cosine }
}
