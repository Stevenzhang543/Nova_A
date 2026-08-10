import { Canvas2DRenderer } from './Canvas2DRenderer'
import { WebGL2Renderer } from './WebGL2Renderer'
import type { Renderer2D } from './types'

export * from './types'

export function createRenderer2D(canvas: HTMLCanvasElement): Renderer2D {
  try {
    return new WebGL2Renderer(canvas)
  } catch (error) {
    console.warn('Nova_A WebGL2 renderer unavailable; using Canvas2D fallback.', error)
    return new Canvas2DRenderer(canvas)
  }
}
