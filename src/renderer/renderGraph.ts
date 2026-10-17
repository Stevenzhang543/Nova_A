/** 渲染流程描述：组织渲染通道与依赖，检查顺序并提供执行所需信息。 */
import { reactive } from 'vue'
import type { RendererStats } from './types'
import { advancedRenderingActive, renderingSettings } from './renderSettings'

export type RenderPassName = 'World' | 'Lighting' | 'UI' | 'EditorOverlay' | 'PostProcess'
export interface RenderPassSample { name: RenderPassName; enabled: boolean; durationMs: number; drawCalls: number }
export type RenderGraphRequestStatus = 'none' | 'pending' | 'world-cpu-submitted' | 'not-submitted' | 'unmeasured'
export interface RenderGraphDiagnosticsScope { projectGeneration: number; sceneUuid: string; rendererGeneration: number; runtimeSessionIdentity: number; view: string }
export interface WorldCpuSubmissionSummary {
  requestFrame: number
  ownerEpoch: number
  worldCpuSubmissionAtMs: number
  measurementScope: 'world-renderer-cpu-api-submission'
  passes: readonly Readonly<RenderPassSample>[]
}
export interface DeterministicCaptureFrame { index: number; timeSeconds: number; audioSampleStart: number; audioSampleEnd: number; dataUrl: string; width: number; height: number; encodedBytes: number }
export interface DeterministicCaptureOptions { name?: string; frameRate?: number; sampleRate?: number; maximumFrames?: number; memoryBudgetMb?: number; includeUi?: boolean }

export const renderGraphState = reactive({
  frame: 0,
  passes: [] as RenderPassSample[],
  request: { frame: 0, status: 'none' as RenderGraphRequestStatus, worldCpuSubmissionAtMs: null as number | null, reason: 'unknown' as const },
  lastWorldSubmission: null as WorldCpuSubmissionSummary | null,
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
let activeOwner: DiagnosticsOwner | null = null
let frameOwnerEpoch = -1

/** This owns diagnostics only; it never owns a graphics context or advances a clock. */
class DiagnosticsOwner {
  private epochValue = 0
  private disposedValue = false
  private retiredValue = false
  private scopeValue: Readonly<RenderGraphDiagnosticsScope> | null = null
  get epoch(): number { return this.epochValue }
  get disposed(): boolean { return this.disposedValue || this.retiredValue }
  retire(): void { this.retiredValue = true }
  updateScope(scope: RenderGraphDiagnosticsScope): void {
    if (this.disposed) return
    const old = this.scopeValue
    if (old && old.projectGeneration === scope.projectGeneration && old.sceneUuid === scope.sceneUuid
      && old.rendererGeneration === scope.rendererGeneration && old.runtimeSessionIdentity === scope.runtimeSessionIdentity && old.view === scope.view) return
    this.scopeValue = Object.freeze({ ...scope })
    this.invalidate()
  }
  invalidate(): void { if (!this.disposed) { this.epochValue++; clearOwnerDiagnostics(this) } }
  dispose(): void { if (this.disposedValue) return; this.disposedValue = true; this.epochValue++; clearOwnerDiagnostics(this) }
}
export type RenderGraphDiagnosticsOwner = DiagnosticsOwner
export function createRenderGraphDiagnosticsOwner(): RenderGraphDiagnosticsOwner { return new DiagnosticsOwner() }
const legacyOwner = new DiagnosticsOwner()
function clearCurrentDiagnostics(): void {
  framePasses = []; frameOwnerEpoch = -1
  renderGraphState.passes.splice(0)
  Object.assign(renderGraphState.request, { frame: 0, status: 'none', worldCpuSubmissionAtMs: null })
  renderGraphState.lastWorldSubmission = null
}
function clearOwnerDiagnostics(owner: DiagnosticsOwner): void {
  // A late cleanup from an old canvas must not erase a newer owner's observation.
  if (activeOwner !== owner) return
  clearCurrentDiagnostics()
  if (owner.disposed) activeOwner = null
}
function ownsCurrentRequest(owner: DiagnosticsOwner): boolean { return !owner.disposed && activeOwner === owner && frameOwnerEpoch === owner.epoch }

/* 开始新渲染图帧，清空临时通道记录并返回计时起点。 */
export function beginRenderGraph(owner: RenderGraphDiagnosticsOwner = legacyOwner): number {
  const started = performance.now()
  if (owner.disposed) return started
  if (activeOwner !== owner) {
    // A replacement explicit Owner makes its predecessor stale even before late unmount cleanup.
    if (owner !== legacyOwner && activeOwner && activeOwner !== legacyOwner) activeOwner.retire()
    clearCurrentDiagnostics(); activeOwner = owner
  }
  renderGraphState.frame++; framePasses = []; frameOwnerEpoch = owner.epoch
  renderGraphState.passes.splice(0)
  Object.assign(renderGraphState.request, { frame: renderGraphState.frame, status: 'pending', worldCpuSubmissionAtMs: null })
  return started
}
/* 记录一个渲染通道的启用状态、耗时和绘制调用数，并返回结束时间。 */
export function recordRenderPass(name: RenderPassName, startedAt: number, enabled = true, drawCalls = 0, owner: RenderGraphDiagnosticsOwner = legacyOwner): number {
  const ended = performance.now()
  if (!ownsCurrentRequest(owner)) return ended
  framePasses.push({ name, enabled, durationMs: enabled ? Math.max(0, ended - startedAt) : 0, drawCalls })
  return ended
}
/* 补齐未显式记录的默认渲染通道，再提交本帧通道列表。 */
export function completeRenderGraph(worldStarted: number, stats: RendererStats, uiStarted: number, overlayStarted: number, owner: RenderGraphDiagnosticsOwner = legacyOwner): void {
  if (!ownsCurrentRequest(owner)) return
  if (!framePasses.some(/* 比较 pass.name 与 'World'，返回严格相等的判断结果。 */ pass => pass.name === 'World')) recordRenderPass('World', worldStarted, true, stats.drawCalls, owner)
  if (!framePasses.some(/* 比较 pass.name 与 'Lighting'，返回严格相等的判断结果。 */ pass => pass.name === 'Lighting')) framePasses.push({ name: 'Lighting', enabled: renderingSettings.lightingEnabled, durationMs: 0, drawCalls: 0 })
  if (!framePasses.some(/* 比较 pass.name 与 'UI'，返回严格相等的判断结果。 */ pass => pass.name === 'UI')) recordRenderPass('UI', uiStarted, true, 1, owner)
  if (!framePasses.some(/* 比较 pass.name 与 'EditorOverlay'，返回严格相等的判断结果。 */ pass => pass.name === 'EditorOverlay')) recordRenderPass('EditorOverlay', overlayStarted, true, 1, owner)
  if (!framePasses.some(/* 比较 pass.name 与 'PostProcess'，返回严格相等的判断结果。 */ pass => pass.name === 'PostProcess')) framePasses.push({ name: 'PostProcess', enabled: renderingSettings.postProcessing.enabled, durationMs: 0, drawCalls: 0 })
  renderGraphState.passes.splice(0, renderGraphState.passes.length, ...framePasses)
  const at = stats.cpuSubmissionAtMs
  const measured = typeof at === 'number' && Number.isFinite(at) && at >= 0
  renderGraphState.request.worldCpuSubmissionAtMs = measured ? at : null
  renderGraphState.request.status = measured ? 'world-cpu-submitted' : at === null ? 'not-submitted' : 'unmeasured'
  if (measured) {
    // A single immutable, bounded historical summary. Never feed it into current-frame counters.
    renderGraphState.lastWorldSubmission = Object.freeze({ requestFrame: renderGraphState.request.frame, ownerEpoch: owner.epoch,
      worldCpuSubmissionAtMs: at, measurementScope: 'world-renderer-cpu-api-submission' as const,
      passes: Object.freeze(framePasses.slice(0, 5).map(pass => Object.freeze({ ...pass }))) })
  }
}
/** 将 true 赋给 renderGraphState.captureRequested，不显式返回值。 */ export function requestRenderCapture(): void { renderGraphState.captureRequested = true }
/* 归一化捕获频率、帧数和内存预算，初始化确定性捕获序列并清空旧帧。 */
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
/* 停止确定性捕获并保存有长度上限的停止原因。 */
export function stopDeterministicCapture(reason = 'Stopped by user'): void { renderGraphState.sequence.active = false; renderGraphState.sequence.stoppedReason = reason.slice(0, 160) }
/* 停止捕获、移除已录制帧并清零捕获字节统计。 */
export function clearDeterministicCapture(): void { stopDeterministicCapture(''); renderGraphState.sequence.frames.splice(0); renderGraphState.sequence.capturedBytes = 0 }
/* 按请求捕获渲染表面及可选覆盖层，遵守序列帧数和内存预算并隔离画布读取失败。 */
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
/* 调用 advancedRenderingActive() 并返回调用结果。 */ export function renderGraphAllocatesEffects(): boolean { return advancedRenderingActive() }

/* 加载两次捕获并计算归一化像素绝对差，将结果保存到有上限的比较历史。 */
export async function compareRenderCaptures(firstId: number, secondId: number): Promise<number | null> {
  const first = renderGraphState.captures.find(/* 比较 item.id 与 firstId，返回严格相等的判断结果。 */ item => item.id === firstId), second = renderGraphState.captures.find(/* 比较 item.id 与 secondId，返回严格相等的判断结果。 */ item => item.id === secondId)
  if (!first || !second || typeof document === 'undefined') return null
  const load = /* 将图像数据地址异步加载为 HTML 图像对象，供捕获比较读取像素。 */ (source: string) => new Promise<HTMLImageElement>(/* 绑定图像加载成功与失败处理，然后设置图像来源以启动加载。 */ (resolve, reject) => { const image = new Image(); image.onload = /* 调用 resolve(image) 并返回调用结果。 */ () => resolve(image); image.onerror = reject; image.src = source })
  const [a, b] = await Promise.all([load(first.dataUrl), load(second.dataUrl)]), width = Math.min(a.width, b.width), height = Math.min(a.height, b.height)
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height; const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context || width * height > 16_777_216) return null
  context.drawImage(a, 0, 0, width, height); const one = context.getImageData(0, 0, width, height).data; context.clearRect(0, 0, width, height); context.drawImage(b, 0, 0, width, height); const two = context.getImageData(0, 0, width, height).data
  let sum = 0; for (let index = 0; index < one.length; index++) sum += Math.abs(one[index] - two[index])
  const difference = sum / Math.max(1, one.length * 255)
  renderGraphState.comparisons.unshift({ first: firstId, second: secondId, difference, comparedAt: new Date().toISOString() }); if (renderGraphState.comparisons.length > 20) renderGraphState.comparisons.length = 20
  return difference
}
