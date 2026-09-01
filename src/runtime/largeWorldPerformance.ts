import { reactive } from 'vue'
import type { Entity } from '../world/Entity'
import type { Vec2 } from '../world/types'

export interface PerformanceRuntimeSettings {
  enabled: boolean
  adaptiveQuality: boolean
  targetFrameMs: number
  frameWorkBudgetMs: number
  streamingBudgetMs: number
  maximumCommandsPerFrame: number
  reactivePublishInterval: number
  spatialCellSize: number
}

export interface SpatialBounds2D { minX: number; minY: number; maxX: number; maxY: number }
export interface SpatialEntry2D { id: string; bounds: SpatialBounds2D }
export interface BatchedCommand { sequence: number; key: string; generation: number; run: () => void }
export interface FrameBudgetTask { id: string; priority: number; generation: number; run: () => void | Promise<void>; cancelled?: boolean }

const DEFAULT_SETTINGS: PerformanceRuntimeSettings = Object.freeze({
  enabled: true,
  adaptiveQuality: true,
  targetFrameMs: 16.667,
  frameWorkBudgetMs: 2.5,
  streamingBudgetMs: 1.5,
  maximumCommandsPerFrame: 2_048,
  reactivePublishInterval: 4,
  spatialCellSize: 16
})

export const performanceRuntimeSettings = reactive<PerformanceRuntimeSettings>({ ...DEFAULT_SETTINGS })
export const performanceRuntimeState = reactive({
  frame: 0,
  mainThreadMs: 0,
  workerMs: 0,
  queueWaitMs: 0,
  cacheHits: 0,
  cacheMisses: 0,
  cacheHitRate: 1,
  allocations: 0,
  worstFrameMs: 0,
  onePercentLowFps: 0,
  inputToPixelMs: 0,
  coldStartupMs: 0,
  warmStartupMs: 0,
  queuedCommands: 0,
  deferredCommands: 0,
  streamingProcessed: 0,
  streamingDeferred: 0,
  reactivePublications: 0,
  staleWorkerResults: 0,
  workerFallbacks: 0,
  entityCount: 0,
  componentCount: 0,
  dirtyTransforms: 0,
  spatialEntries: 0,
  adaptiveTier: 0,
  adaptivePixelRatioScale: 1,
  adaptiveParticleScale: 1
})

const frameSamples = new Float64Array(600)
const inputSamples = new Float64Array(240)
let frameSampleCount = 0, frameSampleCursor = 0, inputSampleCount = 0, inputSampleCursor = 0
let frameStarted = performance.now(), startupStarted = performance.now(), firstFrameAt = 0, pendingInputAt = 0
let publishedCacheHits = 0, publishedCacheMisses = 0, pendingAllocations = 0
let adaptiveGoodFrames = 0, adaptiveBadFrames = 0

function finite(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(maximum, Math.max(minimum, number))
}

export function normalizePerformanceRuntimeSettings(value: unknown): PerformanceRuntimeSettings {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    enabled: source.enabled !== false,
    adaptiveQuality: source.adaptiveQuality !== false,
    targetFrameMs: finite(source.targetFrameMs, DEFAULT_SETTINGS.targetFrameMs, 4, 100),
    frameWorkBudgetMs: finite(source.frameWorkBudgetMs, DEFAULT_SETTINGS.frameWorkBudgetMs, .1, 20),
    streamingBudgetMs: finite(source.streamingBudgetMs, DEFAULT_SETTINGS.streamingBudgetMs, .1, 20),
    maximumCommandsPerFrame: Math.round(finite(source.maximumCommandsPerFrame, DEFAULT_SETTINGS.maximumCommandsPerFrame, 32, 100_000)),
    reactivePublishInterval: Math.round(finite(source.reactivePublishInterval, DEFAULT_SETTINGS.reactivePublishInterval, 1, 120)),
    spatialCellSize: finite(source.spatialCellSize, DEFAULT_SETTINGS.spatialCellSize, .01, 1_000_000)
  }
}

export function loadPerformanceRuntimeSettings(value: unknown): void { Object.assign(performanceRuntimeSettings, normalizePerformanceRuntimeSettings(value)) }
export function serializePerformanceRuntimeSettings(): PerformanceRuntimeSettings { return { ...normalizePerformanceRuntimeSettings(performanceRuntimeSettings) } }

function percentile(values: Float64Array, count: number, percentileValue: number): number {
  if (!count) return 0
  const copy = Array.from(values.slice(0, count)).sort((a, b) => a - b)
  return copy[Math.min(copy.length - 1, Math.max(0, Math.floor((copy.length - 1) * percentileValue)))]
}

function updateAdaptiveQuality(frameMs: number): void {
  if (!performanceRuntimeSettings.adaptiveQuality) {
    performanceRuntimeState.adaptiveTier = 0
    performanceRuntimeState.adaptivePixelRatioScale = 1
    performanceRuntimeState.adaptiveParticleScale = 1
    adaptiveGoodFrames = adaptiveBadFrames = 0
    return
  }
  const target = performanceRuntimeSettings.targetFrameMs
  if (frameMs > target * 1.2) { adaptiveBadFrames++; adaptiveGoodFrames = 0 }
  else if (frameMs < target * .78) { adaptiveGoodFrames++; adaptiveBadFrames = 0 }
  else { adaptiveBadFrames = Math.max(0, adaptiveBadFrames - 1); adaptiveGoodFrames = Math.max(0, adaptiveGoodFrames - 1) }
  let tier = performanceRuntimeState.adaptiveTier
  if (adaptiveBadFrames >= 24 && tier < 2) { tier++; adaptiveBadFrames = 0 }
  if (adaptiveGoodFrames >= 180 && tier > 0) { tier--; adaptiveGoodFrames = 0 }
  performanceRuntimeState.adaptiveTier = tier
  // Presentation budgets only. Fixed timestep, simulation, scripts, animation
  // clocks, authored values and feature availability are never changed.
  performanceRuntimeState.adaptivePixelRatioScale = tier === 2 ? .72 : tier === 1 ? .86 : 1
  performanceRuntimeState.adaptiveParticleScale = tier === 2 ? .65 : tier === 1 ? .82 : 1
}

export function beginPerformanceFrame(now = performance.now()): void { frameStarted = now }
export function markPerformanceInput(now = performance.now()): void { pendingInputAt = now }
export function recordWorkerPerformance(workerMs: number, queueWaitMs: number, fallback = false, stale = false): void {
  performanceRuntimeState.workerMs = Math.max(0, finite(workerMs, 0, 0, 60_000))
  performanceRuntimeState.queueWaitMs = Math.max(0, finite(queueWaitMs, 0, 0, 60_000))
  if (fallback) performanceRuntimeState.workerFallbacks++
  if (stale) performanceRuntimeState.staleWorkerResults++
}
export function recordCachePerformance(hits: number, misses: number, allocations = 0): void {
  publishedCacheHits += Math.max(0, Math.round(hits)); publishedCacheMisses += Math.max(0, Math.round(misses)); pendingAllocations += Math.max(0, Math.round(allocations))
}

export function completePerformanceFrame(now = performance.now()): void {
  const frameMs = Math.max(0, now - frameStarted)
  frameSamples[frameSampleCursor] = frameMs; frameSampleCursor = (frameSampleCursor + 1) % frameSamples.length; frameSampleCount = Math.min(frameSamples.length, frameSampleCount + 1)
  if (pendingInputAt > 0) {
    const latency = Math.max(0, now - pendingInputAt); pendingInputAt = 0
    inputSamples[inputSampleCursor] = latency; inputSampleCursor = (inputSampleCursor + 1) % inputSamples.length; inputSampleCount = Math.min(inputSamples.length, inputSampleCount + 1)
    performanceRuntimeState.inputToPixelMs = latency
  }
  if (!firstFrameAt) { firstFrameAt = now; performanceRuntimeState.coldStartupMs = Math.max(0, now - startupStarted) }
  performanceRuntimeState.frame++
  updateAdaptiveQuality(frameMs)
  if (performanceRuntimeState.frame % performanceRuntimeSettings.reactivePublishInterval !== 0) return
  performanceRuntimeState.mainThreadMs = frameMs
  performanceRuntimeState.worstFrameMs = Math.max(...Array.from(frameSamples.slice(0, frameSampleCount)))
  const slowFrameMs = percentile(frameSamples, frameSampleCount, .99)
  performanceRuntimeState.onePercentLowFps = slowFrameMs > 0 ? 1000 / slowFrameMs : 0
  const totalCache = publishedCacheHits + publishedCacheMisses
  performanceRuntimeState.cacheHits += publishedCacheHits; performanceRuntimeState.cacheMisses += publishedCacheMisses
  performanceRuntimeState.cacheHitRate = totalCache ? publishedCacheHits / totalCache : performanceRuntimeState.cacheHitRate
  performanceRuntimeState.allocations = pendingAllocations
  publishedCacheHits = publishedCacheMisses = pendingAllocations = 0
  performanceRuntimeState.reactivePublications++
}

export function recordWarmStartup(startedAt: number, now = performance.now()): void { performanceRuntimeState.warmStartupMs = Math.max(0, now - startedAt) }
export function performanceLatencyPercentile(percentileValue = .95): number { return percentile(inputSamples, inputSampleCount, finite(percentileValue, .95, 0, 1)) }

/** Reused typed component columns keep stable entity order and avoid allocating
 * per-frame wrapper objects. They are observational: gameplay components stay
 * authoritative and are never rewritten by this cache. */
export class StableComponentScheduler {
  private uuids: string[] = []
  private capacity = 0
  private positions = new Float64Array(0)
  private rotations = new Float64Array(0)
  private scales = new Float64Array(0)
  private enabled = new Uint8Array(0)
  private buckets = new Map<string, Uint32Array>()
  private componentSignature = 0
  count = 0

  synchronize(entities: readonly Entity[]): { dirty: number; allocations: number; componentCount: number } {
    let allocations = 0
    if (entities.length > this.capacity) {
      this.capacity = Math.max(64, 2 ** Math.ceil(Math.log2(entities.length)))
      this.positions = new Float64Array(this.capacity * 2); this.rotations = new Float64Array(this.capacity); this.scales = new Float64Array(this.capacity * 2); this.enabled = new Uint8Array(this.capacity)
      allocations += 4
    }
    let nextComponentSignature = 0x811c9dc5
    for (const entity of entities) for (const component of entity.componentMap.values()) {
      for (let index = 0; index < component.kind.length; index++) nextComponentSignature = Math.imul(nextComponentSignature ^ component.kind.charCodeAt(index), 0x01000193) >>> 0
      nextComponentSignature = Math.imul(nextComponentSignature ^ Number(component.removed), 0x01000193) >>> 0
    }
    const structuralDirty = this.count !== entities.length || nextComponentSignature !== this.componentSignature || entities.some((entity, index) => this.uuids[index] !== entity.uuid)
    let dirty = 0
    const componentBuckets = structuralDirty ? new Map<string, number[]>() : null
    for (let index = 0; index < entities.length; index++) {
      const entity = entities[index], x = entity.transform.position.x, y = entity.transform.position.y, rotation = entity.transform.rotation, scaleX = entity.transform.scale.x, scaleY = entity.transform.scale.y
      if (structuralDirty || this.positions[index * 2] !== x || this.positions[index * 2 + 1] !== y || this.rotations[index] !== rotation || this.scales[index * 2] !== scaleX || this.scales[index * 2 + 1] !== scaleY || this.enabled[index] !== Number(entity.enabled)) dirty++
      this.uuids[index] = entity.uuid; this.positions[index * 2] = x; this.positions[index * 2 + 1] = y; this.rotations[index] = rotation; this.scales[index * 2] = scaleX; this.scales[index * 2 + 1] = scaleY; this.enabled[index] = Number(entity.enabled)
      if (componentBuckets) for (const component of entity.componentMap.values()) { if (component.removed) continue; const values = componentBuckets.get(component.kind) ?? []; values.push(index); componentBuckets.set(component.kind, values) }
    }
    this.uuids.length = entities.length; this.count = entities.length; this.componentSignature = nextComponentSignature
    let componentCount = [...this.buckets.values()].reduce((sum, indexes) => sum + indexes.length, 0)
    if (componentBuckets) {
      componentCount = 0
      for (const [kind, indexes] of componentBuckets) { componentCount += indexes.length; this.buckets.set(kind, Uint32Array.from(indexes)); allocations++ }
      for (const kind of [...this.buckets.keys()]) if (!componentBuckets.has(kind)) this.buckets.delete(kind)
    }
    performanceRuntimeState.entityCount = entities.length; performanceRuntimeState.componentCount = componentCount
    return { dirty, allocations, componentCount }
  }

  indices(kind: string): Uint32Array { return this.buckets.get(kind) ?? new Uint32Array(0) }
  position(index: number): Vec2 { return { x: this.positions[index * 2] ?? 0, y: this.positions[index * 2 + 1] ?? 0 } }
}

export class SpatialHash2D {
  private readonly buckets = new Map<string, Set<string>>()
  private readonly entries = new Map<string, SpatialBounds2D>()
  private readonly occupied = new Map<string, string[]>()
  constructor(public cellSize = performanceRuntimeSettings.spatialCellSize) { this.cellSize = finite(cellSize, 16, .01, 1_000_000) }
  private keys(bounds: SpatialBounds2D): string[] {
    const minX = Math.floor(bounds.minX / this.cellSize), maxX = Math.floor(bounds.maxX / this.cellSize), minY = Math.floor(bounds.minY / this.cellSize), maxY = Math.floor(bounds.maxY / this.cellSize), keys: string[] = []
    const maximumCells = 16_384
    for (let y = minY; y <= maxY && keys.length < maximumCells; y++) for (let x = minX; x <= maxX && keys.length < maximumCells; x++) keys.push(`${x}:${y}`)
    return keys
  }
  upsert(entry: SpatialEntry2D): void {
    this.remove(entry.id)
    const bounds = { minX: Math.min(entry.bounds.minX, entry.bounds.maxX), minY: Math.min(entry.bounds.minY, entry.bounds.maxY), maxX: Math.max(entry.bounds.minX, entry.bounds.maxX), maxY: Math.max(entry.bounds.minY, entry.bounds.maxY) }
    const keys = this.keys(bounds); this.entries.set(entry.id, bounds); this.occupied.set(entry.id, keys)
    for (const key of keys) { const bucket = this.buckets.get(key) ?? new Set<string>(); bucket.add(entry.id); this.buckets.set(key, bucket) }
  }
  remove(id: string): void { for (const key of this.occupied.get(id) ?? []) { const bucket = this.buckets.get(key); bucket?.delete(id); if (!bucket?.size) this.buckets.delete(key) }; this.occupied.delete(id); this.entries.delete(id) }
  query(bounds: SpatialBounds2D): string[] {
    const ids = new Set<string>(); for (const key of this.keys(bounds)) for (const id of this.buckets.get(key) ?? []) ids.add(id)
    const result = [...ids].filter(id => { const value = this.entries.get(id)!; return value.maxX >= bounds.minX && value.minX <= bounds.maxX && value.maxY >= bounds.minY && value.minY <= bounds.maxY }).sort()
    recordCachePerformance(result.length, Math.max(0, ids.size - result.length)); return result
  }
  clear(): void { this.buckets.clear(); this.entries.clear(); this.occupied.clear() }
  get size(): number { return this.entries.size }
}

export class BatchedCommandQueue {
  private queue: BatchedCommand[] = []
  private generations = new Map<string, number>()
  private nextSequence = 1
  enqueue(key: string, run: () => void, generation = (this.generations.get(key) ?? 0) + 1): number { this.generations.set(key, generation); const sequence = this.nextSequence++; this.queue.push({ sequence, key, generation, run }); performanceRuntimeState.queuedCommands = this.queue.length; return sequence }
  invalidate(key: string): void { this.generations.set(key, (this.generations.get(key) ?? 0) + 1) }
  flush(maximum = performanceRuntimeSettings.maximumCommandsPerFrame, budgetMs = performanceRuntimeSettings.frameWorkBudgetMs): { processed: number; deferred: number; stale: number } {
    const started = performance.now(); let processed = 0, stale = 0
    while (this.queue.length && processed < maximum && performance.now() - started <= budgetMs) { const command = this.queue.shift()!; if (this.generations.get(command.key) !== command.generation) { stale++; continue }; command.run(); processed++ }
    performanceRuntimeState.queuedCommands = this.queue.length; performanceRuntimeState.deferredCommands = this.queue.length
    return { processed, deferred: this.queue.length, stale }
  }
  clear(): void { this.queue.splice(0); this.generations.clear(); performanceRuntimeState.queuedCommands = performanceRuntimeState.deferredCommands = 0 }
}

export class FrameBudgetQueue {
  private tasks: FrameBudgetTask[] = []
  private generations = new Map<string, number>()
  enqueue(task: Omit<FrameBudgetTask, 'generation'> & { generation?: number }): number { const generation = task.generation ?? (this.generations.get(task.id) ?? 0) + 1; this.generations.set(task.id, generation); this.tasks.push({ ...task, generation }); this.tasks.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)); return generation }
  cancel(id: string): void { this.generations.set(id, (this.generations.get(id) ?? 0) + 1); for (const task of this.tasks) if (task.id === id) task.cancelled = true }
  async drain(budgetMs = performanceRuntimeSettings.frameWorkBudgetMs): Promise<{ processed: number; deferred: number; stale: number }> { const started = performance.now(); let processed = 0, stale = 0; while (this.tasks.length && performance.now() - started <= budgetMs) { const task = this.tasks.shift()!; if (task.cancelled || this.generations.get(task.id) !== task.generation) { stale++; continue }; await task.run(); processed++ }; return { processed, deferred: this.tasks.length, stale } }
  clear(): void { this.tasks.splice(0); this.generations.clear() }
  get pending(): number { return this.tasks.length }
}

export const performanceComponentScheduler = new StableComponentScheduler()
export const performanceCommandQueue = new BatchedCommandQueue()
export const performanceBackgroundQueue = new FrameBudgetQueue()

export function synchronizePerformanceWorld(entities: readonly Entity[]): void {
  if (!performanceRuntimeSettings.enabled) return
  const result = performanceComponentScheduler.synchronize(entities)
  performanceRuntimeState.dirtyTransforms = result.dirty
  recordCachePerformance(Math.max(0, entities.length - result.dirty), result.dirty, result.allocations)
  performanceCommandQueue.flush()
}

export function resetPerformanceRuntime(): void {
  frameSamples.fill(0); inputSamples.fill(0); frameSampleCount = frameSampleCursor = inputSampleCount = inputSampleCursor = 0
  startupStarted = performance.now(); firstFrameAt = pendingInputAt = 0; publishedCacheHits = publishedCacheMisses = pendingAllocations = 0; adaptiveGoodFrames = adaptiveBadFrames = 0
  performanceCommandQueue.clear(); performanceBackgroundQueue.clear()
  Object.assign(performanceRuntimeState, { frame: 0, mainThreadMs: 0, workerMs: 0, queueWaitMs: 0, cacheHits: 0, cacheMisses: 0, cacheHitRate: 1, allocations: 0, worstFrameMs: 0, onePercentLowFps: 0, inputToPixelMs: 0, coldStartupMs: 0, warmStartupMs: 0, queuedCommands: 0, deferredCommands: 0, streamingProcessed: 0, streamingDeferred: 0, reactivePublications: 0, staleWorkerResults: 0, workerFallbacks: 0, entityCount: 0, componentCount: 0, dirtyTransforms: 0, spatialEntries: 0, adaptiveTier: 0, adaptivePixelRatioScale: 1, adaptiveParticleScale: 1 })
}
