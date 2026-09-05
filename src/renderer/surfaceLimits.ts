import type { FrameOptions } from './types'
export const RENDER_SURFACE_LIMITS = { dimension: 8192, pixels: 16_777_216 } as const
/** Bound backing allocation while preserving the logical viewport and aspect ratio. */
export function boundedFrame(options: FrameOptions, hardwareDimension: number = RENDER_SURFACE_LIMITS.dimension): FrameOptions {
  const dimension = Math.max(1, Math.min(RENDER_SURFACE_LIMITS.dimension, Number.isFinite(hardwareDimension) ? hardwareDimension : RENDER_SURFACE_LIMITS.dimension))
  const finite = (value: number, fallback: number, minimum: number, maximum: number) => Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
  const width = finite(options.width, 1, 1, dimension), height = finite(options.height, 1, 1, dimension)
  const ratio = finite(options.pixelRatio, 1, .25, 8)
  const pixelRatio = Math.min(ratio, dimension / width, dimension / height, Math.sqrt(RENDER_SURFACE_LIMITS.pixels / (width * height)))
  return { ...options, width, height, pixelRatio }
}
