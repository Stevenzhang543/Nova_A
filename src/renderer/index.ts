import { Canvas2DRenderer } from './Canvas2DRenderer'
import { WebGL2Renderer } from './WebGL2Renderer'
import type { Renderer2D } from './types'
import { reportRendererCreated } from './capabilities'

export * from './types'
export * from './capabilities'

export function createRenderer2D(canvas: HTMLCanvasElement): Renderer2D {
  try {
    const renderer = new WebGL2Renderer(canvas)
    reportRendererCreated('WebGL2')
    return renderer
  } catch (error) {
    console.warn('Nova_A WebGL2 renderer unavailable; using Canvas2D fallback.', error)
    const renderer = new Canvas2DRenderer(canvas)
    reportRendererCreated('Canvas2D')
    return renderer
  }
}
