/** Standalone graphics core entry: backend, descriptors, host injection and a bounded factory. */
import { Canvas2DRenderer } from './Canvas2DRenderer'
import { WebGL2Renderer } from './WebGL2Renderer'
import { defaultRendererEnvironment, type RendererEnvironment } from './RendererEnvironment'
import type { Renderer2D } from './types'

export * from './types'
export * from './RendererEnvironment'
export * from './GpuDiagnosticsBudget'
export * from './renderSettingsSchema'
export { WebGL2Renderer, Canvas2DRenderer }

export class RendererCanvasReplacementRequired extends Error {}

/** Existing diagnostic fallback semantics are retained during the host migration. */
export function createRenderer2D(canvas: HTMLCanvasElement, canvas2dOnly = false, environment: RendererEnvironment = defaultRendererEnvironment()): Renderer2D {
  const requestedPath = environment.settings.rendererPath
  if (canvas2dOnly) { const renderer = new Canvas2DRenderer(canvas); environment.rendererCreated?.('Canvas2D', requestedPath); return renderer }
  try {
    if (requestedPath === 'Native' && !('__TAURI_INTERNALS__' in globalThis)) console.warn('Native renderer path requested on web; using the WebGL2 compatibility path.')
    const renderer = new WebGL2Renderer(canvas, environment)
    environment.rendererCreated?.('WebGL2', requestedPath)
    return renderer
  } catch (error) {
    console.warn('Nova_A WebGL2 renderer unavailable; using Canvas2D fallback.', error)
    try { const renderer = new Canvas2DRenderer(canvas); environment.rendererCreated?.('Canvas2D', requestedPath); return renderer }
    catch { throw new RendererCanvasReplacementRequired(`WebGL initialization failed after reserving its canvas. Remount a fresh canvas for Canvas2D. ${error instanceof Error ? error.message : String(error)}`) }
  }
}
