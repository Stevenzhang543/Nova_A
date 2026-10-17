/** 绘制表面限制：根据尺寸与像素预算限制画布分配，避免超出平台上限。 */
import type { FrameOptions } from './types'
export const RENDER_SURFACE_LIMITS = { dimension: 8192, pixels: 16_777_216 } as const
/** Bound backing allocation while preserving the logical viewport and aspect ratio. */
/* 限制帧尺寸及像素比，使最终绘制表面同时满足硬件维度和总像素预算。 */
export function boundedFrame(options: FrameOptions, hardwareDimension: number = RENDER_SURFACE_LIMITS.dimension): FrameOptions {
  const dimension = Math.max(1, Math.min(RENDER_SURFACE_LIMITS.dimension, Number.isFinite(hardwareDimension) ? hardwareDimension : RENDER_SURFACE_LIMITS.dimension))
  const finite = /* 根据 Number.isFinite(value) 的真假，分别返回 Math.min(maximum, Math.max(minimum, value)) 或 fallback。 */ (value: number, fallback: number, minimum: number, maximum: number) => Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback
  const width = finite(options.width, 1, 1, dimension), height = finite(options.height, 1, 1, dimension)
  const ratio = finite(options.pixelRatio, 1, .25, 8)
  const pixelRatio = Math.min(ratio, dimension / width, dimension / height, Math.sqrt(RENDER_SURFACE_LIMITS.pixels / (width * height)))
  return { ...options, width, height, pixelRatio }
}
