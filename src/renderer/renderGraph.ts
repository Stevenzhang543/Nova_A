import { reactive } from 'vue'
import type { RendererStats } from './types'
import { advancedRenderingActive, renderingSettings } from './renderSettings'

export type RenderPassName = 'World' | 'Lighting' | 'UI' | 'EditorOverlay' | 'PostProcess'
export interface RenderPassSample { name: RenderPassName; enabled: boolean; durationMs: number; drawCalls: number }

export const renderGraphState = reactive({
  frame: 0,
  passes: [] as RenderPassSample[],
  captures: [] as Array<{ id: number; createdAt: string; dataUrl: string; width: number; height: number }>,
  captureRequested: false,
  comparisons: [] as Array<{ first: number; second: number; difference: number; comparedAt: string }>
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

export async function compareRenderCaptures(firstId: number, secondId: number): Promise<number | null> {
  const first = renderGraphState.captures.find(item => item.id === firstId), second = renderGraphState.captures.find(item => item.id === secondId)
  if (!first || !second || typeof document === 'undefined') return null
  const load = (source: string) => new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = source })
  const [a, b] = await Promise.all([load(first.dataUrl), load(second.dataUrl)]), width = Math.min(a.width, b.width), height = Math.min(a.height, b.height)
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || width * height > 16_777_216) return null
  context.drawImage(a, 0, 0, width, height); const one = context.getImageData(0, 0, width, height).data; context.clearRect(0, 0, width, height); context.drawImage(b, 0, 0, width, height); const two = context.getImageData(0, 0, width, height).data
  let sum = 0; for (let index = 0; index < one.length; index++) sum += Math.abs(one[index] - two[index])
  const difference = sum / Math.max(1, one.length * 255)
  renderGraphState.comparisons.unshift({ first: firstId, second: secondId, difference, comparedAt: new Date().toISOString() }); if (renderGraphState.comparisons.length > 20) renderGraphState.comparisons.length = 20
  return difference
}
