import { reactive } from 'vue'
import { assetState } from '../assets/AssetDatabase'
import type { RendererStats } from '../renderer'
import { productionSettings } from './production'
import { profilerState, type FrameProfile, type ProfilerAnnotation, type ProfilerCounter, type ProfilerMarker } from './profiler'
import { jobSchedulerState } from './jobScheduler'
import { audioRuntime } from './audio'
import { particleDiagnostics } from './particles'
import { NOVA_ENGINE_VERSION } from '../projects/projectFormat'

export interface LifetimeEvent {
  frame: number
  timestamp: number
  kind: 'entity' | 'asset' | 'audio' | 'job' | 'network'
  id: string
  action: 'created' | 'retained' | 'released'
}
export interface PerformanceCapture {
  format: 'nova-performance-capture'
  version: 2
  engineVersion: string
  id: string
  name: string
  createdAt: string
  frames: FrameProfile[]
  memoryMb: number | null
  assetMb: number
  liveEntities: number
  renderer: RendererStats
  markers: ProfilerMarker[]
  counters: ProfilerCounter[]
  annotations: ProfilerAnnotation[]
  mode: 'Full' | 'Low overhead' | 'Off'
  estimatedOverheadPercent: number
  remotePeer: string
  audio: { activeVoices: number; underruns: number; clippingEvents: number }
  particles: { active: number; updateMs: number; budgetExceeded: boolean }
  budget: CaptureBudgetResult
}
export interface CaptureBudgetResult { passed: boolean; evaluatedAt: string; checks: Array<{ id: string; actual: number | null; limit: number; unit: string; passed: boolean }> }

export interface CaptureComparison {
  first: string
  second: string
  averageFrameDeltaMs: number
  peakFrameDeltaMs: number
  memoryDeltaMb: number | null
  assetDeltaMb: number
  entityDelta: number
  gpuDeltaMs: number | null
  drawCallDelta: number
  textureMemoryDeltaMb: number
  budgetRegressions: string[]
}

export const performanceToolsState = reactive({
  memoryMb: null as number | null,
  assetMb: 0,
  memoryBudgetExceeded: false,
  assetBudgetExceeded: false,
  possibleLeak: false,
  leakSlopeMbPerMinute: 0,
  liveEntities: 0,
  createdEntities: 0,
  releasedEntities: 0,
  lifetimeEvents: [] as LifetimeEvent[],
  captures: [] as PerformanceCapture[],
  comparison: null as CaptureComparison | null
})

const knownEntities = new Set<string>()
const memoryWindow: Array<{ frame: number; value: number }> = []

function cloneStats(stats: RendererStats): RendererStats { return { ...stats, batchBreakReasons: { ...stats.batchBreakReasons } } }
function finiteAverage(values: number[]): number { return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0 }
function evaluateCapture(frames: FrameProfile[], renderer: RendererStats): CaptureBudgetResult {
  const checks: CaptureBudgetResult['checks'] = [
    { id: 'frame.average', actual: finiteAverage(frames.map(frame => frame.frameMs)), limit: productionSettings.performance.frameBudgetMs, unit: 'ms', passed: finiteAverage(frames.map(frame => frame.frameMs)) <= productionSettings.performance.frameBudgetMs },
    { id: 'render.average', actual: finiteAverage(frames.map(frame => frame.renderingMs)), limit: productionSettings.performance.renderingBudgetMs, unit: 'ms', passed: finiteAverage(frames.map(frame => frame.renderingMs)) <= productionSettings.performance.renderingBudgetMs },
    { id: 'audio.average', actual: finiteAverage(frames.map(frame => frame.audioMs)), limit: productionSettings.performance.audioBudgetMs, unit: 'ms', passed: finiteAverage(frames.map(frame => frame.audioMs)) <= productionSettings.performance.audioBudgetMs },
    { id: 'gpu.frame', actual: renderer.gpuMs, limit: productionSettings.performance.gpuBudgetMs, unit: 'ms', passed: renderer.gpuMs === null || renderer.gpuMs <= productionSettings.performance.gpuBudgetMs },
    { id: 'renderer.drawCalls', actual: renderer.drawCalls, limit: productionSettings.performance.drawCallBudget, unit: 'calls', passed: renderer.drawCalls <= productionSettings.performance.drawCallBudget },
    { id: 'renderer.textureMemory', actual: renderer.textureMemoryBytes / 1048576, limit: productionSettings.performance.textureBudgetMb, unit: 'MB', passed: renderer.textureMemoryBytes / 1048576 <= productionSettings.performance.textureBudgetMb },
    { id: 'particles.update', actual: particleDiagnostics.updateMs, limit: productionSettings.performance.particleBudgetMs, unit: 'ms', passed: particleDiagnostics.updateMs <= productionSettings.performance.particleBudgetMs },
    { id: 'profiler.overhead', actual: profilerState.estimatedOverheadPercent, limit: productionSettings.performance.profilerOverheadBudgetPercent, unit: '%', passed: profilerState.estimatedOverheadPercent <= productionSettings.performance.profilerOverheadBudgetPercent }
  ]
  return { passed: checks.every(check => check.passed), evaluatedAt: new Date().toISOString(), checks }
}

function recordLifetime(frame: number, kind: LifetimeEvent['kind'], id: string, action: LifetimeEvent['action']): void {
  performanceToolsState.lifetimeEvents.push({ frame, timestamp: performance.now(), kind, id: id.slice(0, 160), action })
  const capacity = productionSettings.performance.lifetimeCapacity
  if (performanceToolsState.lifetimeEvents.length > capacity) performanceToolsState.lifetimeEvents.splice(0, performanceToolsState.lifetimeEvents.length - capacity)
}

export function samplePerformanceTools(frame: number, entityUuids: string[], renderer: RendererStats): { allocations: number; assetJobs: number } {
  const current = new Set(entityUuids.slice(0, 100_000))
  let allocations = 0
  for (const uuid of current) if (!knownEntities.has(uuid)) { allocations++; performanceToolsState.createdEntities++; recordLifetime(frame, 'entity', uuid, 'created') }
  for (const uuid of knownEntities) if (!current.has(uuid)) { allocations++; performanceToolsState.releasedEntities++; recordLifetime(frame, 'entity', uuid, 'released') }
  knownEntities.clear(); current.forEach(uuid => knownEntities.add(uuid))
  performanceToolsState.liveEntities = knownEntities.size
  performanceToolsState.assetMb = assetState.records.reduce((total, asset) => total + Math.max(0, asset.byteLength), 0) / (1024 * 1024)
  const memory = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
  performanceToolsState.memoryMb = memory ? memory.usedJSHeapSize / (1024 * 1024) : null
  performanceToolsState.memoryBudgetExceeded = performanceToolsState.memoryMb !== null && performanceToolsState.memoryMb > productionSettings.performance.memoryBudgetMb
  performanceToolsState.assetBudgetExceeded = performanceToolsState.assetMb > productionSettings.performance.assetBudgetMb

  if (performanceToolsState.memoryMb !== null) {
    memoryWindow.push({ frame, value: performanceToolsState.memoryMb })
    const capacity = productionSettings.performance.leakWindowFrames
    if (memoryWindow.length > capacity) memoryWindow.splice(0, memoryWindow.length - capacity)
    if (memoryWindow.length >= Math.min(60, capacity)) {
      const first = memoryWindow[0], last = memoryWindow[memoryWindow.length - 1]
      const elapsedMinutes = Math.max(1 / 3_600, (last.frame - first.frame) / 60 / 60)
      const slope = (last.value - first.value) / elapsedMinutes
      performanceToolsState.leakSlopeMbPerMinute = slope
      const risingSamples = memoryWindow.slice(1).filter((sample, index) => sample.value >= memoryWindow[index].value - .05).length
      performanceToolsState.possibleLeak = slope > 1 && risingSamples / Math.max(1, memoryWindow.length - 1) > .8
    }
  }
  // Retain a bounded indication that GPU/render resources are alive without
  // retaining the resources themselves.
  if (renderer.renderTargets > 0 && frame % 120 === 0) recordLifetime(frame, 'asset', `render-targets:${renderer.renderTargets}`, 'retained')
  return { allocations, assetJobs: jobSchedulerState.active + jobSchedulerState.queued }
}

export function capturePerformance(name = `Capture ${performanceToolsState.captures.length + 1}`, renderer: RendererStats): PerformanceCapture {
  const capture: PerformanceCapture = {
    format: 'nova-performance-capture', version: 2, engineVersion: NOVA_ENGINE_VERSION,
    id: `capture-${Date.now().toString(36)}-${performanceToolsState.captures.length}`,
    name: name.trim().slice(0, 120) || 'Capture', createdAt: new Date().toISOString(),
    frames: profilerState.samples.slice(-productionSettings.performance.traceCapacity).map(frame => ({ ...frame })),
    memoryMb: performanceToolsState.memoryMb, assetMb: performanceToolsState.assetMb,
    liveEntities: performanceToolsState.liveEntities, renderer: cloneStats(renderer),
    markers: profilerState.markers.map(marker => ({ ...marker })), counters: profilerState.counters.map(counter => ({ ...counter })), annotations: profilerState.annotations.map(annotation => ({ ...annotation })), mode: profilerState.overheadMode, estimatedOverheadPercent: profilerState.estimatedOverheadPercent, remotePeer: profilerState.remotePeer,
    audio: { activeVoices: audioRuntime.diagnostics.activeVoices, underruns: audioRuntime.diagnostics.underruns, clippingEvents: audioRuntime.diagnostics.clippingEvents }, particles: { active: particleDiagnostics.activeParticles, updateMs: particleDiagnostics.updateMs, budgetExceeded: particleDiagnostics.budgetExceeded }, budget: evaluateCapture(profilerState.samples, renderer)
  }
  performanceToolsState.captures.push(capture)
  if (performanceToolsState.captures.length > 16) performanceToolsState.captures.splice(0, performanceToolsState.captures.length - 16)
  return capture
}

export function comparePerformanceCaptures(firstId: string, secondId: string): CaptureComparison | null {
  const first = performanceToolsState.captures.find(capture => capture.id === firstId)
  const second = performanceToolsState.captures.find(capture => capture.id === secondId)
  if (!first || !second || first.id === second.id) { performanceToolsState.comparison = null; return null }
  const firstFrames = first.frames.map(frame => frame.frameMs), secondFrames = second.frames.map(frame => frame.frameMs)
  const comparison: CaptureComparison = {
    first: first.id, second: second.id,
    averageFrameDeltaMs: finiteAverage(secondFrames) - finiteAverage(firstFrames),
    peakFrameDeltaMs: Math.max(0, ...secondFrames) - Math.max(0, ...firstFrames),
    memoryDeltaMb: first.memoryMb === null || second.memoryMb === null ? null : second.memoryMb - first.memoryMb,
    assetDeltaMb: second.assetMb - first.assetMb, entityDelta: second.liveEntities - first.liveEntities,
    gpuDeltaMs: first.renderer.gpuMs === null || second.renderer.gpuMs === null ? null : second.renderer.gpuMs - first.renderer.gpuMs,
    drawCallDelta: second.renderer.drawCalls - first.renderer.drawCalls,
    textureMemoryDeltaMb: (second.renderer.textureMemoryBytes - first.renderer.textureMemoryBytes) / 1048576,
    budgetRegressions: second.budget.checks.filter(check => !check.passed && first.budget.checks.find(item => item.id === check.id)?.passed !== false).map(check => check.id)
  }
  performanceToolsState.comparison = comparison
  return comparison
}

export function serializePerformanceCapture(capture: PerformanceCapture): string { return JSON.stringify(capture, null, 2) }
export function performanceCaptureCiReport(capture: PerformanceCapture): { status: 'passed' | 'failed'; engineVersion: string; checks: CaptureBudgetResult['checks'] } { return { status: capture.budget.passed ? 'passed' : 'failed', engineVersion: capture.engineVersion, checks: capture.budget.checks } }

export function clearPerformanceTools(): void {
  knownEntities.clear(); memoryWindow.splice(0)
  Object.assign(performanceToolsState, { memoryMb: null, assetMb: 0, memoryBudgetExceeded: false, assetBudgetExceeded: false, possibleLeak: false, leakSlopeMbPerMinute: 0, liveEntities: 0, createdEntities: 0, releasedEntities: 0, comparison: null })
  performanceToolsState.lifetimeEvents.splice(0)
}
