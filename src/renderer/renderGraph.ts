import { reactive } from 'vue'
import type { RendererStats } from './types'
import { advancedRenderingActive, renderingSettings } from './renderSettings'

export type RenderPassName = 'World' | 'Lighting' | 'UI' | 'EditorOverlay' | 'PostProcess'
export interface RenderPassSample { name: RenderPassName; enabled: boolean; durationMs: number; drawCalls: number }
export interface DeterministicCaptureFrame { index: number; timeSeconds: number; audioSampleStart: number; audioSampleEnd: number; dataUrl: string; width: number; height: number; encodedBytes: number }
export interface DeterministicCaptureOptions { name?: string; frameRate?: number; sampleRate?: number; maximumFrames?: number; memoryBudgetMb?: number; includeUi?: boolean }

export const renderGraphState = reactive({
  frame: 0,
  passes: [] as RenderPassSample[],
  captures: [] as Array<{ id: number; createdAt: string; dataUrl: string; width: number; height: number }>,
  captureRequested: false,
  comparisons: [] as Array<{ first: number; second: number; difference: number; comparedAt: string }>
  , sequence: {
    active: false, name: 'Cinematic capture', frameRate: 60, sampleRate: 48_000, maximumFrames: 300,
    memoryBudgetBytes: 128 * 1048576, includeUi: true, capturedBytes: 0, frames: [] as DeterministicCaptureFrame[],
    stoppedReason: '', startedAtRenderFrame: 0
  }
})

let framePasses: RenderPassSample[] = []

export function beginRenderGraph(): number { renderGraphState.frame++; framePasses = []; return performance.now() }
export function recordRenderPass(name: RenderPassName, startedAt: number, enabled = true, drawCalls = 0): number {
  const ended = performance.now()
  framePasses.push({ name, enabled, durationMs: enabled ? Math.max(0, ended - startedAt) : 0, drawCalls })
  return ended
}
export function completeRenderGraph(worldStarted: number, stats: RendererStats, uiStarted: number, overlayStarted: number): void {
  if (!framePasses.some(pass => pass.name === 'World')) recordRenderPass('World', worldStarted, true, stats.drawCalls)
  if (!framePasses.some(pass => pass.name === 'Lighting')) framePasses.push({ name: 'Lighting', enabled: renderingSettings.lightingEnabled, durationMs: 0, drawCalls: 0 })
  if (!framePasses.some(pass => pass.name === 'UI')) recordRenderPass('UI', uiStarted, true, 1)
  if (!framePasses.some(pass => pass.name === 'EditorOverlay')) recordRenderPass('EditorOverlay', overlayStarted, true, 1)
  if (!framePasses.some(pass => pass.name === 'PostProcess')) framePasses.push({ name: 'PostProcess', enabled: renderingSettings.postProcessing.enabled, durationMs: 0, drawCalls: 0 })
  renderGraphState.passes.splice(0, renderGraphState.passes.length, ...framePasses)
}
export function requestRenderCapture(): void { renderGraphState.captureRequested = true }
export function startDeterministicCapture(options: DeterministicCaptureOptions = {}): void {
  const defaults = renderingSettings.deterministicCapture
  const frameRate = Math.min(240, Math.max(1, Math.round(Number(options.frameRate ?? defaults.frameRate) || defaults.frameRate)))
  const sampleRate = Math.min(192_000, Math.max(8_000, Math.round(Number(options.sampleRate ?? defaults.sampleRate) || defaults.sampleRate)))
  const maximumFrames = Math.min(18_000, Math.max(1, Math.round(Number(options.maximumFrames ?? defaults.maximumFrames) || defaults.maximumFrames)))
  const memoryBudgetMb = Math.min(2_048, Math.max(16, Number(options.memoryBudgetMb ?? defaults.memoryBudgetMb) || defaults.memoryBudgetMb))
  Object.assign(renderGraphState.sequence, {
    active: true,
    name: String(options.name ?? 'Cinematic capture').trim().slice(0, 80) || 'Cinematic capture',
    frameRate,
    sampleRate,
    maximumFrames,
    memoryBudgetBytes: Math.round(memoryBudgetMb * 1048576),
    includeUi: options.includeUi ?? defaults.includeUi,
    capturedBytes: 0,
    stoppedReason: '',
    startedAtRenderFrame: renderGraphState.frame
  })
  renderGraphState.sequence.frames.splice(0)
}
export function stopDeterministicCapture(reason = 'Stopped by user'): void { renderGraphState.sequence.active = false; renderGraphState.sequence.stoppedReason = reason.slice(0, 160) }
export function clearDeterministicCapture(): void { stopDeterministicCapture(''); renderGraphState.sequence.frames.splice(0); renderGraphState.sequence.capturedBytes = 0 }
export function captureRenderSurface(canvas: HTMLCanvasElement, overlay?: HTMLCanvasElement | null, filter = 'none'): void {
  const sequence = renderGraphState.sequence
  const sequenceCapture = sequence.active
  if (!renderGraphState.captureRequested && !sequenceCapture) return
  renderGraphState.captureRequested = false
  try {
    let source = canvas
    if (overlay && (!sequenceCapture || sequence.includeUi)) {
      const composite = document.createElement('canvas'); composite.width = canvas.width; composite.height = canvas.height
      const context = composite.getContext('2d')
      if (context) { context.filter = filter; context.drawImage(canvas, 0, 0); context.filter = 'none'; context.drawImage(overlay, 0, 0, overlay.width, overlay.height, 0, 0, composite.width, composite.height); source = composite }
    }
    const dataUrl = source.toDataURL('image/png')
    if (sequenceCapture) {
      const index = sequence.frames.length, encodedBytes = Math.max(0, Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * .75))
      if (sequence.capturedBytes + encodedBytes > sequence.memoryBudgetBytes) { stopDeterministicCapture('Capture memory budget reached'); return }
      const audioSampleStart = Math.round(index * sequence.sampleRate / sequence.frameRate), audioSampleEnd = Math.round((index + 1) * sequence.sampleRate / sequence.frameRate)
      sequence.frames.push({ index, timeSeconds: index / sequence.frameRate, audioSampleStart, audioSampleEnd, dataUrl, width: source.width, height: source.height, encodedBytes })
      sequence.capturedBytes += encodedBytes
      if (sequence.frames.length >= sequence.maximumFrames) stopDeterministicCapture('Maximum frame count reached')
    }
    renderGraphState.captures.unshift({ id: Date.now(), createdAt: sequenceCapture ? `Frame ${sequence.frames.length - 1} · ${((sequence.frames.length - 1) / sequence.frameRate).toFixed(6)} s` : new Date().toISOString(), dataUrl, width: source.width, height: source.height })
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
