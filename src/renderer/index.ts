import { Canvas2DRenderer } from './Canvas2DRenderer'
import { WebGL2Renderer } from './WebGL2Renderer'
import type { Renderer2D } from './types'
import { reportRendererCreated } from './capabilities'
import { renderingSettings } from './renderSettings'

export * from './types'
export * from './capabilities'

export function createRenderer2D(canvas: HTMLCanvasElement): Renderer2D {
  const requestedPath = renderingSettings.rendererPath
  try {
    if (requestedPath === 'Native' && !('__TAURI_INTERNALS__' in globalThis)) console.warn('Native renderer path requested on web; using the WebGL2 compatibility path.')
    const renderer = new WebGL2Renderer(canvas)
    reportRendererCreated('WebGL2', requestedPath)
    return renderer
  } catch (error) {
    console.warn('Nova_A WebGL2 renderer unavailable; using Canvas2D fallback.', error)
    const renderer = new Canvas2DRenderer(canvas)
    reportRendererCreated('Canvas2D', requestedPath)
    return renderer
  }
}
