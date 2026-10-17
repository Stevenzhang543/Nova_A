/** 大世界性能工具：计算工作集与预算，提供分块场景的性能观察和优化资料。 */
import type { Entity } from '../world/Entity'
import type { Component2D, ComponentKind } from '../world/components'
import type { Vec2 } from '../world/types'
import { FrameObservability, type BenchmarkMode, type FrameObservation } from './performance/observability'

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
export interface PerformanceStartupObservation {
  schema: 'nova-startup-observation-v1'
  coldStartupMs: number | null
  warmStartupMs: number | null
  moduleToFirstHostFrameWallMs: number | null
  workspacePrefetchWallMs: number | null
}

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

export let performanceRuntimeSettings: PerformanceRuntimeSettings = { ...DEFAULT_SETTINGS }
export let performanceRuntimeState = {
  frame: 0,
  mainThreadMs: null as number | null,
  workerMs: 0,
  queueWaitMs: 0,
  cacheHits: 0,
  cacheMisses: 0,
  cacheHitRate: 1,
  allocations: 0,
  worstFrameMs: null as number | null,
  onePercentLowFps: null as number | null,
  inputToSubmitMs: null as number | null,
  /** Retained for historical capture readers; display latency was never measured. */
  inputToPixelMs: null as number | null,
  rafIntervalMs: null as number | null,
  submissionIntervalMs: null as number | null,
  cpuFrameMs: null as number | null,
  gpuMs: null as number | null,
  benchmarkMode: 'off' as BenchmarkMode,
  policyRevision: 0,
  policyReason: 'Uncalibrated: presentation remains at authored quality',
  /** Request-to-Ready cold/warm startup has no measured owner boundary yet. */
  coldStartupMs: null as number | null,
  warmStartupMs: null as number | null,
  moduleToFirstHostFrameWallMs: null as number | null,
  workspacePrefetchWallMs: null as number | null,
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
}

export type PerformanceStateAdapter = <T extends object>(target: T) => T
let performanceStateAdapterInstalled = false
/** The optional UI host wraps the same targets once; pure Runtime/Player owners keep plain state. */
export function installPerformanceStateAdapter(adapter: PerformanceStateAdapter): void {
  if (performanceStateAdapterInstalled) return
  // Publish both live bindings together only after adapter construction succeeds.
  const settings = adapter(performanceRuntimeSettings), state = adapter(performanceRuntimeState)
  if (!settings || typeof settings !== 'object' || !state || typeof state !== 'object') throw new TypeError('Performance state adapter must wrap both existing object targets')
  performanceRuntimeSettings = settings; performanceRuntimeState = state
  performanceStateAdapterInstalled = true
}

const frameObservability = new FrameObservability()
const performanceObservers = new Set<(observation: Readonly<FrameObservation>, observedAtMs: number) => void>()
let performanceObserverFailures = 0
export function performanceObservationDiagnostics() { return Object.freeze({ subscribers: performanceObservers.size, observerFailures: performanceObserverFailures }) }
/** Explicit profiling subscriptions observe owner timestamps; they never write world or schedule frames. */
export function subscribePerformanceObservations(observer: (observation: Readonly<FrameObservation>, observedAtMs: number) => void): () => void {
  if (performanceObservers.size >= 4) throw new Error('Performance observation subscribers are limited to four')
  performanceObservers.add(observer)
  return () => { performanceObservers.delete(observer) }
}
const moduleLoadedAtMs = performance.now()
let firstHostFrameObserved = false
let publishedCacheHits = 0, publishedCacheMisses = 0, pendingAllocations = 0

/** 结构说明（自动提取）：finite；输入 value、fallback、minimum、maximum；直接调用 Number.isFinite、Math.min、Math.max。 */ function finite(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const number = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.min(maximum, Math.max(minimum, number))
}

/** 结构说明（自动提取）：normalizePerformanceRuntimeSettings；输入 value；直接调用 finite、Math.round。 */ export function normalizePerformanceRuntimeSettings(value: unknown): PerformanceRuntimeSettings {
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

/** 执行时调用 Object.assign(performanceRuntimeSettings, normalizePerformanceRuntimeSettings(value))；不显式返回调用结果。 */ export function loadPerformanceRuntimeSettings(value: unknown): void { Object.assign(performanceRuntimeSettings, normalizePerformanceRuntimeSettings(value)) }
/* 返回具有所列字段的新对象 { ...normalizePerformanceRuntimeSettings(performanceRuntimeSettings) }。 */ export function serializePerformanceRuntimeSettings(): PerformanceRuntimeSettings { return { ...normalizePerformanceRuntimeSettings(performanceRuntimeSettings) } }

/** Only the shared coordinator may change presentation budgets; CPU function cost is not frame pacing. */
export function applyPerformancePresentationPolicy(policy: { benchmarkMode: BenchmarkMode; tier: number; renderScale: number; particleScale: number; revision: number; reason: string }): void {
  if (!Number.isInteger(policy.revision) || policy.revision < performanceRuntimeState.policyRevision) return
  const adaptive = policy.benchmarkMode === 'adaptive-experience' && performanceRuntimeSettings.adaptiveQuality
  performanceRuntimeState.benchmarkMode = policy.benchmarkMode
  performanceRuntimeState.policyRevision = policy.revision
  performanceRuntimeState.policyReason = policy.reason.slice(0, 240)
  performanceRuntimeState.adaptiveTier = adaptive ? Math.round(finite(policy.tier, 0, 0, 2)) : 0
  performanceRuntimeState.adaptivePixelRatioScale = adaptive ? finite(policy.renderScale, 1, .5, 1) : 1
  performanceRuntimeState.adaptiveParticleScale = adaptive ? finite(policy.particleScale, 1, .5, 1) : 1
}

export function beginPerformanceFrame(now = performance.now(), rafTimestamp?: number): void { frameObservability.begin(now, rafTimestamp) }
export function markPerformanceInput(now = performance.now()): number | null { return frameObservability.receipt(now) }
export function forgetPerformanceInput(sequence: number): void { frameObservability.forgetInput(sequence) }
export function rebasePerformanceFrameContinuity(): void { frameObservability.rebaseFrameContinuity() }
/** Called after the renderer's CPU API submission, never GPU completion or display presentation. */
/** 返回本次提交的序号，供输入消费台账绑定首次受影响的渲染包；被拒绝的提交沿用上一次序号。 */
export function markPerformanceSubmission(now = performance.now(), consumedInputSequence?: number): number { frameObservability.submission(now, consumedInputSequence); return frameObservability.submissionOrdinal() }
export function currentPerformanceFrameObservation() { return { ...frameObservability.current } }
/** 结构说明（自动提取）：recordWorkerPerformance；输入 workerMs、queueWaitMs、fallback、stale；直接调用 Math.max、finite；写入 performanceRuntimeState.workerMs、performanceRuntimeState.queueWaitMs。 */ export function recordWorkerPerformance(workerMs: number, queueWaitMs: number, fallback = false, stale = false): void {
  performanceRuntimeState.workerMs = Math.max(0, finite(workerMs, 0, 0, 60_000))
  performanceRuntimeState.queueWaitMs = Math.max(0, finite(queueWaitMs, 0, 0, 60_000))
  if (fallback) performanceRuntimeState.workerFallbacks++
  if (stale) performanceRuntimeState.staleWorkerResults++
}
/** 执行 performanceRuntimeState.staleWorkerResults++ 更新对应状态；不显式返回值。 */ export function recordStaleWorkerResult(): void { performanceRuntimeState.staleWorkerResults++ }
/** 结构说明（自动提取）：recordCachePerformance；输入 hits、misses、allocations；直接调用 Math.max、Math.round；写入 publishedCacheHits、publishedCacheMisses、pendingAllocations。 */ export function recordCachePerformance(hits: number, misses: number, allocations = 0): void {
  publishedCacheHits += Math.max(0, Math.round(hits)); publishedCacheMisses += Math.max(0, Math.round(misses)); pendingAllocations += Math.max(0, Math.round(allocations))
}

/** Publish actual owner observations at a bounded Editor refresh rate. */ export function completePerformanceFrame(now = performance.now()): void {
  const observation = frameObservability.complete(now)
  if (performanceObservers.size && Number.isFinite(now)) {
    const snapshot = Object.freeze({ ...observation })
    for (const observer of performanceObservers) {
      try { observer(snapshot, now) }
      catch { performanceObserverFailures++; performanceObservers.delete(observer) }
    }
  }
  if (!firstHostFrameObserved && Number.isFinite(now) && now >= moduleLoadedAtMs) {
    firstHostFrameObserved = true
    // This includes Launcher wait and ends at host completion, without checking Ready or renderer submission.
    performanceRuntimeState.moduleToFirstHostFrameWallMs = now - moduleLoadedAtMs
  }
  performanceRuntimeState.frame++
  if (performanceRuntimeState.frame % performanceRuntimeSettings.reactivePublishInterval !== 0) return
  Object.assign(performanceRuntimeState, observation)
  performanceRuntimeState.mainThreadMs = observation.cpuFrameMs
  const intervals = frameObservability.rafStatistics()
  performanceRuntimeState.worstFrameMs = intervals.worstMs
  performanceRuntimeState.onePercentLowFps = intervals.onePercentLowFps
  const totalCache = publishedCacheHits + publishedCacheMisses
  performanceRuntimeState.cacheHits += publishedCacheHits; performanceRuntimeState.cacheMisses += publishedCacheMisses
  performanceRuntimeState.cacheHitRate = totalCache ? publishedCacheHits / totalCache : performanceRuntimeState.cacheHitRate
  performanceRuntimeState.allocations = pendingAllocations
  publishedCacheHits = publishedCacheMisses = pendingAllocations = 0
  performanceRuntimeState.reactivePublications++
}

/** Existing workspace owner reports wall time including idle waits; it does not certify Ready or successful loads. */
export function recordWorkspacePrefetchWall(startedAt: number, now = performance.now()): void {
  performanceRuntimeState.workspacePrefetchWallMs = Number.isFinite(startedAt) && startedAt >= 0 && Number.isFinite(now) && now >= startedAt ? now - startedAt : null
}
/** @deprecated Historical API name; records only workspace-prefetch wall time, never warm startup. */
export function recordWarmStartup(startedAt: number, now = performance.now()): void { recordWorkspacePrefetchWall(startedAt, now) }
export function currentPerformanceStartupObservation(): Readonly<PerformanceStartupObservation> {
  return Object.freeze({ schema: 'nova-startup-observation-v1', coldStartupMs: null, warmStartupMs: null,
    moduleToFirstHostFrameWallMs: performanceRuntimeState.moduleToFirstHostFrameWallMs, workspacePrefetchWallMs: performanceRuntimeState.workspacePrefetchWallMs })
}
export function performanceLatencyPercentile(percentileValue = .95): number | null { return frameObservability.latencyPercentile(percentileValue) }

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
  private readonly emptyIndices = new Uint32Array(0)
  private componentCount = 0
  private componentCache = new WeakMap<Entity, { map: Entity['componentMap']; size: number; records: Array<{ kind: ComponentKind; component: Component2D; removed: boolean }> }>()
  count = 0

  /** 结构说明（自动提取）：refreshComponentCache；输入 entity；直接调用 componentCache.get、map.get、map、map.values、componentCache.set；写入 changed；包含循环处理。 */ private refreshComponentCache(entity: Entity): boolean {
    const map = entity.componentMap, previous = this.componentCache.get(entity)
    let changed = !previous || previous.map !== map || previous.size !== map.size
    if (!changed && previous) {
      // A size check catches normal add/delete operations. Identity and the
      // active flag catch same-size replacements and remove/restore without
      // repeatedly allocating or iterating componentMap.values().
      for (const record of previous.records) {
        if (map.get(record.kind) !== record.component || record.removed !== record.component.removed) { changed = true; break }
      }
    }
    if (!changed && previous) return false
    const records = [...map.values()].map(/** 构造并返回记录 { kind: component.kind, component, removed: component.removed }，字段按当前实参及捕获状态求值。 */ component => ({ kind: component.kind, component, removed: component.removed }))
    this.componentCache.set(entity, { map, size: map.size, records })
    return true
  }

  /** 结构说明（自动提取）：synchronize；输入 entities；直接调用 Math.max、Math.ceil、Math.log2、Float64Array、Uint8Array 等；写入 capacity、positions、rotations、scales 等；包含循环处理。 */ synchronize(entities: readonly Entity[]): { dirty: number; allocations: number; componentCount: number } {
    let allocations = 0
    if (entities.length > this.capacity) {
      this.capacity = Math.max(64, 2 ** Math.ceil(Math.log2(entities.length)))
      this.positions = new Float64Array(this.capacity * 2); this.rotations = new Float64Array(this.capacity); this.scales = new Float64Array(this.capacity * 2); this.enabled = new Uint8Array(this.capacity)
      allocations += 4
    }
    let componentStructureDirty = false
    let entityOrderDirty = this.count !== entities.length
    for (let index = 0; index < entities.length; index++) {
      const changed = this.refreshComponentCache(entities[index])
      if (changed) { componentStructureDirty = true; allocations++ }
      entityOrderDirty ||= this.uuids[index] !== entities[index].uuid
    }
    const structuralDirty = entityOrderDirty || componentStructureDirty
    let dirty = 0
    const componentBuckets = structuralDirty ? new Map<string, number[]>() : null
    for (let index = 0; index < entities.length; index++) {
      const entity = entities[index], x = entity.transform.position.x, y = entity.transform.position.y, rotation = entity.transform.rotation, scaleX = entity.transform.scale.x, scaleY = entity.transform.scale.y
      if (structuralDirty || this.positions[index * 2] !== x || this.positions[index * 2 + 1] !== y || this.rotations[index] !== rotation || this.scales[index * 2] !== scaleX || this.scales[index * 2 + 1] !== scaleY || this.enabled[index] !== Number(entity.enabled)) dirty++
      this.uuids[index] = entity.uuid; this.positions[index * 2] = x; this.positions[index * 2 + 1] = y; this.rotations[index] = rotation; this.scales[index * 2] = scaleX; this.scales[index * 2 + 1] = scaleY; this.enabled[index] = Number(entity.enabled)
      if (componentBuckets) for (const record of this.componentCache.get(entity)?.records ?? []) { if (record.component.removed) continue; const values = componentBuckets.get(record.kind) ?? []; values.push(index); componentBuckets.set(record.kind, values) }
    }
    this.uuids.length = entities.length; this.count = entities.length
    let componentCount = this.componentCount
    if (componentBuckets) {
      componentCount = 0
      for (const [kind, indexes] of componentBuckets) { componentCount += indexes.length; this.buckets.set(kind, Uint32Array.from(indexes)); allocations++ }
      for (const kind of [...this.buckets.keys()]) if (!componentBuckets.has(kind)) this.buckets.delete(kind)
      this.componentCount = componentCount
    }
    performanceRuntimeState.entityCount = entities.length; performanceRuntimeState.componentCount = componentCount
    return { dirty, allocations, componentCount }
  }

  /* 当 this.buckets.get(kind) 为 null 或 undefined 时返回 this.emptyIndices，否则保留左侧值。 */ indices(kind: string): Uint32Array { return this.buckets.get(kind) ?? this.emptyIndices }
  /* 返回具有所列字段的新对象 { x: this.positions[index * 2] ?? 0, y: this.positions[index * 2 + 1] ?? 0 }。 */ position(index: number): Vec2 { return { x: this.positions[index * 2] ?? 0, y: this.positions[index * 2 + 1] ?? 0 } }
}

export class SpatialHash2D {
  private readonly buckets = new Map<string, Set<string>>()
  private readonly entries = new Map<string, SpatialBounds2D>()
  private readonly occupied = new Map<string, string[]>()
  /** 将 finite(cellSize, 16, .01, 1_000_000) 赋给 this.cellSize，不显式返回值。 */ constructor(public cellSize = performanceRuntimeSettings.spatialCellSize) { this.cellSize = finite(cellSize, 16, .01, 1_000_000) }
  /** 结构说明（自动提取）：keys；输入 bounds；直接调用 Math.floor、keys.push；返回路径包含 keys；包含循环处理。 */ private keys(bounds: SpatialBounds2D): string[] {
    const minX = Math.floor(bounds.minX / this.cellSize), maxX = Math.floor(bounds.maxX / this.cellSize), minY = Math.floor(bounds.minY / this.cellSize), maxY = Math.floor(bounds.maxY / this.cellSize), keys: string[] = []
    const maximumCells = 16_384
    for (let y = minY; y <= maxY && keys.length < maximumCells; y++) for (let x = minX; x <= maxX && keys.length < maximumCells; x++) keys.push(`${x}:${y}`)
    return keys
  }
  /** 结构说明（自动提取）：upsert；输入 entry；直接调用 remove、Math.min、Math.max、keys、entries.set 等；包含循环处理。 */ upsert(entry: SpatialEntry2D): void {
    this.remove(entry.id)
    const bounds = { minX: Math.min(entry.bounds.minX, entry.bounds.maxX), minY: Math.min(entry.bounds.minY, entry.bounds.maxY), maxX: Math.max(entry.bounds.minX, entry.bounds.maxX), maxY: Math.max(entry.bounds.minY, entry.bounds.maxY) }
    const keys = this.keys(bounds); this.entries.set(entry.id, bounds); this.occupied.set(entry.id, keys)
    for (const key of keys) { const bucket = this.buckets.get(key) ?? new Set<string>(); bucket.add(entry.id); this.buckets.set(key, bucket) }
  }
  /** 结构说明（自动提取）：remove；输入 id；直接调用 occupied.get、buckets.get、bucket.delete、buckets.delete、occupied.delete 等；包含循环处理。 */ remove(id: string): void { for (const key of this.occupied.get(id) ?? []) { const bucket = this.buckets.get(key); bucket?.delete(id); if (!bucket?.size) this.buckets.delete(key) }; this.occupied.delete(id); this.entries.delete(id) }
  /** 结构说明（自动提取）：query；输入 bounds；直接调用 Set、keys、buckets.get、ids.add、sort 等；返回路径包含 result；包含循环处理。 */ query(bounds: SpatialBounds2D): string[] {
    const ids = new Set<string>(); for (const key of this.keys(bounds)) for (const id of this.buckets.get(key) ?? []) ids.add(id)
    const result = [...ids].filter(/** 结构说明（自动提取）：filter 回调；输入 id；直接调用 entries.get。 */ id => { const value = this.entries.get(id)!; return value.maxX >= bounds.minX && value.minX <= bounds.maxX && value.maxY >= bounds.minY && value.minY <= bounds.maxY }).sort()
    recordCachePerformance(result.length, Math.max(0, ids.size - result.length)); return result
  }
  /** 结构说明（自动提取）：clear；无显式参数；直接调用 buckets.clear、entries.clear、occupied.clear。 */ clear(): void { this.buckets.clear(); this.entries.clear(); this.occupied.clear() }
  /* 返回 this.entries.size 的当前值。 */ get size(): number { return this.entries.size }
}

export class BatchedCommandQueue {
  private queue: BatchedCommand[] = []
  private generations = new Map<string, number>()
  private nextSequence = 1
  /** 结构说明（自动提取）：enqueue；输入 key、run、generation；直接调用 generations.set、queue.push；写入 performanceRuntimeState.queuedCommands；返回路径包含 sequence。 */ enqueue(key: string, run: () => void, generation = (this.generations.get(key) ?? 0) + 1): number { this.generations.set(key, generation); const sequence = this.nextSequence++; this.queue.push({ sequence, key, generation, run }); performanceRuntimeState.queuedCommands = this.queue.length; return sequence }
  /** 执行时调用 this.generations.set(key, (this.generations.get(key) ?? 0) + 1)；不显式返回调用结果。 */ invalidate(key: string): void { this.generations.set(key, (this.generations.get(key) ?? 0) + 1) }
  /** 结构说明（自动提取）：flush；输入 maximum、budgetMs；直接调用 performance.now、queue.shift、generations.get、command.run；写入 performanceRuntimeState.queuedCommands、performanceRuntimeState.deferredCommands；包含循环处理。 */ flush(maximum = performanceRuntimeSettings.maximumCommandsPerFrame, budgetMs = performanceRuntimeSettings.frameWorkBudgetMs): { processed: number; deferred: number; stale: number } {
    const started = performance.now(); let processed = 0, stale = 0
    while (this.queue.length && processed < maximum && performance.now() - started <= budgetMs) { const command = this.queue.shift()!; if (this.generations.get(command.key) !== command.generation) { stale++; continue }; command.run(); processed++ }
    performanceRuntimeState.queuedCommands = this.queue.length; performanceRuntimeState.deferredCommands = this.queue.length
    return { processed, deferred: this.queue.length, stale }
  }
  /** 结构说明（自动提取）：clear；无显式参数；直接调用 queue.splice、generations.clear；写入 performanceRuntimeState.queuedCommands、performanceRuntimeState.deferredCommands。 */ clear(): void { this.queue.splice(0); this.generations.clear(); performanceRuntimeState.queuedCommands = performanceRuntimeState.deferredCommands = 0 }
}

export class FrameBudgetQueue {
  private tasks: FrameBudgetTask[] = []
  private generations = new Map<string, number>()
  /** 结构说明（自动提取）：enqueue；输入 task；直接调用 generations.get、generations.set、tasks.push、tasks.sort；返回路径包含 generation。 */ enqueue(task: Omit<FrameBudgetTask, 'generation'> & { generation?: number }): number { const generation = task.generation ?? (this.generations.get(task.id) ?? 0) + 1; this.generations.set(task.id, generation); this.tasks.push({ ...task, generation }); this.tasks.sort(/* 先计算 b.priority - a.priority；仅当其为假值时求右侧 a.id.localeCompare(b.id)，返回短路求值结果。 */ (a, b) => b.priority - a.priority || a.id.localeCompare(b.id)); return generation }
  /** 结构说明（自动提取）：cancel；输入 id；直接调用 generations.set、generations.get；写入 task.cancelled；包含循环处理。 */ cancel(id: string): void { this.generations.set(id, (this.generations.get(id) ?? 0) + 1); for (const task of this.tasks) if (task.id === id) task.cancelled = true }
  /** 结构说明（自动提取）：drain；输入 budgetMs；直接调用 performance.now、tasks.shift、generations.get、task.run；包含循环处理；等待异步结果。 */ async drain(budgetMs = performanceRuntimeSettings.frameWorkBudgetMs): Promise<{ processed: number; deferred: number; stale: number }> { const started = performance.now(); let processed = 0, stale = 0; while (this.tasks.length && performance.now() - started <= budgetMs) { const task = this.tasks.shift()!; if (task.cancelled || this.generations.get(task.id) !== task.generation) { stale++; continue }; await task.run(); processed++ }; return { processed, deferred: this.tasks.length, stale } }
  /** 结构说明（自动提取）：clear；无显式参数；直接调用 tasks.splice、generations.clear。 */ clear(): void { this.tasks.splice(0); this.generations.clear() }
  /* 返回 this.tasks.length 的当前值。 */ get pending(): number { return this.tasks.length }
}

export const performanceComponentScheduler = new StableComponentScheduler()
export const performanceCommandQueue = new BatchedCommandQueue()
export const performanceBackgroundQueue = new FrameBudgetQueue()

/** 结构说明（自动提取）：synchronizePerformanceWorld；输入 entities；直接调用 performanceComponentScheduler.synchronize、recordCachePerformance、Math.max、performanceCommandQueue.flush；写入 performanceRuntimeState.dirtyTransforms。 */ export function synchronizePerformanceWorld(entities: readonly Entity[]): void {
  if (!performanceRuntimeSettings.enabled) return
  const result = performanceComponentScheduler.synchronize(entities)
  performanceRuntimeState.dirtyTransforms = result.dirty
  recordCachePerformance(Math.max(0, entities.length - result.dirty), result.dirty, result.allocations)
  performanceCommandQueue.flush()
}

/** Invalidate old frame/input identities without creating another world clock. */ export function resetPerformanceRuntime(): void {
  frameObservability.reset()
  // Module/first-host and workspace-prefetch observations belong to their existing lifetime, not the frame ring.
  publishedCacheHits = publishedCacheMisses = pendingAllocations = 0
  performanceCommandQueue.clear(); performanceBackgroundQueue.clear()
  Object.assign(performanceRuntimeState, { frame: 0, mainThreadMs: null, workerMs: 0, queueWaitMs: 0, cacheHits: 0, cacheMisses: 0, cacheHitRate: 1, allocations: 0, worstFrameMs: null, onePercentLowFps: null, inputToSubmitMs: null, inputToPixelMs: null, rafIntervalMs: null, submissionIntervalMs: null, cpuFrameMs: null, coldStartupMs: null, warmStartupMs: null, queuedCommands: 0, deferredCommands: 0, streamingProcessed: 0, streamingDeferred: 0, reactivePublications: 0, staleWorkerResults: 0, workerFallbacks: 0, entityCount: 0, componentCount: 0, dirtyTransforms: 0, spatialEntries: 0, adaptiveTier: 0, adaptivePixelRatioScale: 1, adaptiveParticleScale: 1 })
}
