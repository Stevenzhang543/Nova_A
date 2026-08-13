import { reactive } from 'vue'
import type { RendererStats } from './types'
import { advancedRenderingActive, renderingSettings } from './renderSettings'

export type RenderPassName = 'World' | 'Lighting' | 'UI' | 'EditorOverlay' | 'PostProcess'
export interface RenderPassSample { name: RenderPassName; enabled: boolean; durationMs: number; drawCalls: number }

export const renderGraphState = reactive({
  frame: 0,
  passes: [] as RenderPassSample[],
  captures: [] as Array<{ id: number; createdAt: string; dataUrl: string; width: number; height: number }>,
  captureRequested: false
})

export function beginRenderGraph(): number { renderGraphState.frame++; renderGraphState.passes.splice(0); return performance.now() }
export function recordRenderPass(name: RenderPassName, startedAt: number, enabled = true, drawCalls = 0): number {
  const ended = performance.now()
  renderGraphState.passes.push({ name, enabled, durationMs: enabled ? Math.max(0, ended - startedAt) : 0, drawCalls })
  return ended
}
export function completeRenderGraph(worldStarted: number, stats: RendererStats, uiStarted: number, overlayStarted: number): void {
  if (!renderGraphState.passes.some(pass => pass.name === 'World')) recordRenderPass('World', worldStarted, true, stats.drawCalls)
  if (!renderGraphState.passes.some(pass => pass.name === 'Lighting')) renderGraphState.passes.push({ name: 'Lighting', enabled: renderingSettings.lightingEnabled, durationMs: 0, drawCalls: 0 })
  if (!renderGraphState.passes.some(pass => pass.name === 'UI')) recordRenderPass('UI', uiStarted, true, 1)
  if (!renderGraphState.passes.some(pass => pass.name === 'EditorOverlay')) recordRenderPass('EditorOverlay', overlayStarted, true, 1)
  if (!renderGraphState.passes.some(pass => pass.name === 'PostProcess')) renderGraphState.passes.push({ name: 'PostProcess', enabled: renderingSettings.postProcessing.enabled, durationMs: 0, drawCalls: 0 })
}
export function requestRenderCapture(): void { renderGraphState.captureRequested = true }
export function captureRenderSurface(canvas: HTMLCanvasElement, overlay?: HTMLCanvasElement | null, filter = 'none'): void {
  if (!renderGraphState.captureRequested) return
  renderGraphState.captureRequested = false
  try {
    let source = canvas
    if (overlay) {
      const composite = document.createElement('canvas'); composite.width = canvas.width; composite.height = canvas.height
      const context = composite.getContext('2d')
      if (context) { context.filter = filter; context.drawImage(canvas, 0, 0); context.filter = 'none'; context.drawImage(overlay, 0, 0, overlay.width, overlay.height, 0, 0, composite.width, composite.height); source = composite }
    }
    renderGraphState.captures.unshift({ id: Date.now(), createdAt: new Date().toISOString(), dataUrl: source.toDataURL('image/png'), width: source.width, height: source.height })
    if (renderGraphState.captures.length > 12) renderGraphState.captures.length = 12
  } catch { /* A tainted imported image must not break the render loop. */ }
}
export function renderGraphAllocatesEffects(): boolean { return advancedRenderingActive() }
