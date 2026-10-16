/** 运行任务调度：管理异步计算队列、取消及工作线程结果回传。 */
import { auxiliaryWork, performanceCoordinator } from './performance/services'
import type { WorkClass } from './performance/coordinator'
import type { WorkContext, WorkHandle, WorkPhases } from './performance/workScheduler'
import { measurePayloadBytes } from './performance/byteBounds'

export type JobKind = 'parseJson' | 'parseCsv' | 'hash' | 'compare' | 'sampleAnimation' | 'advanceParticles' | 'buildSpatialGrid'
export type JobExecutor = 'auto' | 'serial'
export interface JobScheduleOptions<T = unknown> { executor?: JobExecutor; key?: string; generation?: number; timeoutMs?: number; workClass?: WorkClass; dependencies?: readonly number[]; epoch?: number; inputBytes?: number; scratchBytes?: number; outputBytes?: number; merge?: (result: unknown) => T }
interface WorkerSlot { worker: Worker; busy: boolean; jobId: number | null; lease: number }
interface ActiveJob { id: number; started: number; queuedAt: number; slot: WorkerSlot | null; executor: JobExecutor; lease: number; resolve: (result: unknown) => void; reject: (error: Error) => void; cleanup: () => void; context: WorkContext; postMessageMs: number | null; phases: WorkPhases }

export const jobSchedulerState = {
  workerAvailable: typeof Worker !== 'undefined', usingFallback: false, queued: 0, active: 0, completed: 0, failed: 0, cancelled: 0, stale: 0, averageMs: 0, workerMs: 0, serialMs: 0, queueWaitMs: 0, fallbackCount: 0, serialCount: 0, lastError: ''
}

const workers: WorkerSlot[] = [], pending = new Map<number, ActiveJob>()
const handles = new Map<number, WorkHandle<unknown>>()
const latestGenerations = new Map<string, number>()
const keyUsers = new Map<string, number>()
const maximumRetainedKeys = 2048
let nextLease = 1
let fallbackBusy = false
let fallbackLease = 0
let settings = { maxWorkers: 2, maxQueued: 256, timeoutMs: 15_000 }
let metrics: { worker?: (elapsed: number, queueWait: number, fallback: boolean, stale: boolean) => void; stale?: () => void } = {}
const listeners = new Set<() => void>()
const notify = () => { jobSchedulerState.active = pending.size; jobSchedulerState.queued = Math.max(0, handles.size - pending.size); for (const listener of [...listeners]) listener() }
export function jobSchedulerOwnershipDiagnostics() { return Object.freeze({ createdWorkers: workers.length, activeWorkerJobs: [...pending.values()].filter(job => job.slot !== null).length, activeSerialJobs: [...pending.values()].filter(job => job.slot === null).length, retainedRevisionKeys: latestGenerations.size, referencedRevisionKeys: keyUsers.size }) }
function retainKey(key: string): void {
  if (!key) return
  if (!latestGenerations.has(key) && latestGenerations.size >= maximumRetainedKeys) {
    for (const candidate of latestGenerations.keys()) if (!keyUsers.has(candidate)) { latestGenerations.delete(candidate); break }
    if (latestGenerations.size >= maximumRetainedKeys) throw new Error('Job revision key capacity exceeded')
  }
  keyUsers.set(key, (keyUsers.get(key) ?? 0) + 1)
}
function releaseKey(key: string): void {
  if (!key) return
  const users = (keyUsers.get(key) ?? 0) - 1
  if (users > 0) keyUsers.set(key, users); else keyUsers.delete(key)
}
export function subscribeJobScheduler(listener: () => void): () => void { listeners.add(listener); return () => { listeners.delete(listener) } }
export function configureJobScheduler(value: Partial<typeof settings>, observers = metrics): void {
  const bound = (input: number | undefined, fallback: number, minimum: number, maximum: number) => input !== undefined && Number.isFinite(input) ? Math.max(minimum, Math.min(maximum, Math.floor(input))) : fallback
  settings = { maxWorkers: bound(value.maxWorkers, settings.maxWorkers, 0, 8), maxQueued: bound(value.maxQueued, settings.maxQueued, 8, 2048), timeoutMs: bound(value.timeoutMs, settings.timeoutMs, 100, 120_000) }
  metrics = observers; auxiliaryWork.wake()
}

/** 逐字符解析带双引号转义的 CSV，输出限制行列数量并忽略完全空行。 */ function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false
  for (let index = 0; index <= source.length; index++) {
    const character = source[index] ?? '\n'
    if (quoted && character === '"' && source[index + 1] === '"') { field += '"'; index++; continue }
    if (character === '"') { quoted = !quoted; continue }
    if (!quoted && (character === ',' || character === '\n' || character === '\r')) { if (character === '\r' && source[index + 1] === '\n') index++; row.push(field); field = ''; if (character !== ',') { if (row.some(/* 返回 value.length 的当前值。 */ value => value.length)) rows.push(row); row = [] }; continue }
    field += character
  }
  return rows.slice(0, 100_001).map(/* 调用 columns.slice(0, 512) 并返回调用结果。 */ columns => columns.slice(0, 512))
}

/** 在主线程执行解析、比较、动画采样、粒子推进、空间分桶或快速摘要任务，供工作线程不可用时回退。 */ export function runJobLocally(kind: JobKind, payload: unknown): unknown {
  if (kind === 'parseJson') return JSON.parse(String(payload))
  if (kind === 'parseCsv') return parseCsv(String(payload))
  if (kind === 'compare') return JSON.stringify((payload as { first?: unknown }).first) === JSON.stringify((payload as { second?: unknown }).second)
  if (kind === 'sampleAnimation') {
    const source = payload && typeof payload === 'object' ? payload as { time?: number; keys?: Array<{ time?: number; value?: number }> } : {}
    const keys = (Array.isArray(source.keys) ? source.keys : []).flatMap(/* 根据 Number.isFinite(key?.time) && Number.isFinite(key?.value) 的真假，分别返回 [{ time: Number(key.time), value: Number(key.value) }] 或 []。 */ key => Number.isFinite(key?.time) && Number.isFinite(key?.value) ? [{ time: Number(key.time), value: Number(key.value) }] : []).sort(/* 计算表达式 a.time - b.time 并返回结果，沿用操作数的原有类型规则。 */ (a, b) => a.time - b.time).slice(0, 100_000)
    if (!keys.length) return 0
    const time = Number.isFinite(source.time) ? Number(source.time) : 0, nextIndex = keys.findIndex(/* 比较 key.time 与 time，返回大于或等于的判断结果。 */ key => key.time >= time)
    // 首帧之前保持首值；超过末帧的 -1 留给下方末值分支。
    if (nextIndex === 0) return keys[0].value
    if (nextIndex < 0) return keys[keys.length - 1].value
    const previous = keys[nextIndex - 1], next = keys[nextIndex], factor = Math.min(1, Math.max(0, (time - previous.time) / Math.max(1e-12, next.time - previous.time)))
    return previous.value + (next.value - previous.value) * factor
  }
  if (kind === 'advanceParticles') {
    const source = payload && typeof payload === 'object' ? payload as { dt?: number; gravity?: number; particles?: Array<{ x?: number; y?: number; vx?: number; vy?: number }> } : {}
    const dt = Math.min(1, Math.max(0, Number(source.dt) || 0)), gravity = Math.min(1e6, Math.max(-1e6, Number(source.gravity) || 0))
    return (Array.isArray(source.particles) ? source.particles : []).slice(0, 100_000).map(/** 对单个粒子施加重力并按步长积分速度与位置。 */ item => { const x = Number(item.x) || 0, y = Number(item.y) || 0, vx = Number(item.vx) || 0, vy = (Number(item.vy) || 0) + gravity * dt; return { x: x + vx * dt, y: y + vy * dt, vx, vy } })
  }
  if (kind === 'buildSpatialGrid') {
    const source = payload && typeof payload === 'object' ? payload as { cellSize?: number; entries?: Array<{ id?: string; x?: number; y?: number }> } : {}
    const cellSize = Math.min(1e6, Math.max(.01, Number(source.cellSize) || 16)), buckets: Record<string, string[]> = {}
    for (const entry of (Array.isArray(source.entries) ? source.entries : []).slice(0, 100_000)) { const id = String(entry.id ?? '').slice(0, 128); if (!id) continue; const key = `${Math.floor((Number(entry.x) || 0) / cellSize)}:${Math.floor((Number(entry.y) || 0) / cellSize)}`; (buckets[key] ??= []).push(id) }
    for (const values of Object.values(buckets)) values.sort()
    return Object.fromEntries(Object.entries(buckets).sort(/* 调用 a.localeCompare(b) 并返回调用结果。 */ ([a], [b]) => a.localeCompare(b)))
  }
  let first = 0x811c9dc5, second = 0x9e3779b9, value = String(payload)
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

/** Diagnostic cost estimate, bounded without stringifying the entire input before dispatch. */
export function estimateJobBytes(value: unknown): number {
  return measurePayloadBytes(value, performanceCoordinator.config.maxQueueBytes)
}
function retireWorker(slot: WorkerSlot): void {
  slot.worker.onmessage = null; slot.worker.onerror = null; slot.worker.terminate()
  const index = workers.indexOf(slot); if (index >= 0) workers.splice(index, 1)
  slot.busy = false; slot.jobId = null; slot.lease = 0
}
function complete(id: number, lease: number, result: unknown, error?: string, executionMs?: number): void {
  const active = pending.get(id)
  if (!active || active.lease !== lease) { jobSchedulerState.stale++; metrics.stale?.(); notify(); return }
  pending.delete(id); active.cleanup()
  if (active.slot && active.slot.jobId === id && active.slot.lease === lease) { active.slot.busy = false; active.slot.jobId = null; active.slot.lease = 0 }
  else if (!active.slot && fallbackLease === lease) { fallbackBusy = false; fallbackLease = 0 }
  const elapsed = Math.max(0, performance.now() - active.started), queueWait = Math.max(0, active.started - active.queuedAt)
  const executorExecutionMs = executionMs !== undefined && Number.isFinite(executionMs) && executionMs >= 0 ? executionMs : null
  active.phases.postMessageMs = active.postMessageMs
  active.phases.workerExecutionMs = active.slot ? executorExecutionMs : null
  active.phases.localExecutionMs = active.slot ? null : executorExecutionMs
  active.phases.transportAndReturnMs = !active.slot || executorExecutionMs === null ? null : Math.max(0, elapsed - executorExecutionMs - (active.postMessageMs ?? 0))
  active.context.reportPhases(active.phases)
  jobSchedulerState.averageMs = jobSchedulerState.completed ? jobSchedulerState.averageMs * .9 + elapsed * .1 : elapsed
  jobSchedulerState.workerMs = active.slot ? elapsed : 0; jobSchedulerState.serialMs = active.slot ? 0 : elapsed; jobSchedulerState.queueWaitMs = queueWait
  metrics.worker?.(jobSchedulerState.workerMs, queueWait, !active.slot && active.executor === 'auto', false)
  if (error) active.reject(new Error(error)); else active.resolve(result)
  notify()
}
function createWorker(): WorkerSlot | null {
  if (!jobSchedulerState.workerAvailable) return null
  try {
    const worker = new Worker(new URL('./jobScheduler.worker.ts', import.meta.url), { type: 'module', name: 'nova-job-worker' })
    const slot: WorkerSlot = { worker, busy: false, jobId: null, lease: 0 }
    worker.onmessage = event => complete(Number(event.data?.id), Number(event.data?.lease), event.data?.result, typeof event.data?.error === 'string' ? event.data.error : undefined, event.data?.executionMs)
    worker.onerror = event => {
      const id = slot.jobId, lease = slot.lease
      jobSchedulerState.workerAvailable = false; jobSchedulerState.usingFallback = true
      retireWorker(slot)
      if (id !== null) complete(id, lease, undefined, event.message || 'Worker failed')
    }
    workers.push(slot); return slot
  } catch { jobSchedulerState.workerAvailable = false; jobSchedulerState.usingFallback = true; return null }
}
function workerLimit(): number { return Math.min(settings.maxWorkers, performanceCoordinator.snapshot.computeHelperLimit) }
function canStart(executor: JobExecutor): boolean {
  if (executor === 'serial') return !fallbackBusy
  if (jobSchedulerState.workerAvailable && workerLimit() > 0) return workers.some(slot => !slot.busy) || workers.length < workerLimit()
  return !fallbackBusy
}
function execute(kind: JobKind, payload: unknown, context: WorkContext, queuedAt: number, timeoutMs: number, phases: ActiveJob['phases'], outputByteLimit: number, executor: JobExecutor): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (context.signal.aborted) { reject(new Error('Job cancelled')); return }
    const allowed = executor === 'serial' ? 0 : workerLimit()
    let slot = allowed > 0 ? workers.find(candidate => !candidate.busy) ?? null : null
    if (!slot && allowed > 0 && workers.length < allowed) slot = createWorker()
    const lease = nextLease++, started = performance.now()
    const abort = () => {
      const active = pending.get(context.id)
      if (!active || active.lease !== lease) return
      // These workers own only independent copies, never authoritative or shared WASM state.
      if (slot) retireWorker(slot)
      complete(context.id, lease, undefined, String(context.signal.reason || 'Job cancelled'))
    }
    const timer = globalThis.setTimeout(() => {
      const active = pending.get(context.id)
      if (!active || active.lease !== lease) return
      if (slot) retireWorker(slot)
      complete(context.id, lease, undefined, `Job timed out after ${timeoutMs} ms`)
    }, timeoutMs)
    context.signal.addEventListener('abort', abort, { once: true })
    const active: ActiveJob = { id: context.id, started, queuedAt, slot, executor, lease, resolve, reject, context, postMessageMs: null, phases,
      cleanup: () => { clearTimeout(timer); context.signal.removeEventListener('abort', abort) } }
    pending.set(context.id, active)
    if (slot) {
      slot.busy = true; slot.jobId = context.id; slot.lease = lease
      try { const postStarted = performance.now(); slot.worker.postMessage({ id: context.id, lease, kind, payload, outputByteLimit }); active.postMessageMs = performance.now() - postStarted }
      catch (error) { retireWorker(slot); complete(context.id, lease, undefined, error instanceof Error ? error.message : String(error)) }
    } else {
      if (executor === 'serial') jobSchedulerState.serialCount++
      else { jobSchedulerState.usingFallback = true; jobSchedulerState.fallbackCount++ }
      fallbackBusy = true; fallbackLease = lease
      // A real task boundary allows input and cancellation before the non-preemptible serial fallback.
      globalThis.setTimeout(() => {
        if (pending.get(context.id)?.lease !== lease) return
        try { const localStarted = performance.now(), result = runJobLocally(kind, payload); complete(context.id, lease, result, undefined, performance.now() - localStarted) }
        catch (error) { complete(context.id, lease, undefined, error instanceof Error ? error.message : String(error)) }
      }, 0)
    }
    notify()
  })
}
export function scheduleJob<T = unknown>(kind: JobKind, payload: unknown, options: JobScheduleOptions<T> = {}): { id: number; generation: number; promise: Promise<T>; cancel: () => void } {
  const requestedAtMs = performance.now()
  const executor = options.executor ?? 'auto'
  if (executor !== 'auto' && executor !== 'serial') throw new Error('Invalid job executor')
  if (handles.size >= settings.maxQueued) throw new Error(`Job queue is limited to ${settings.maxQueued} items`)
  const key = options.key?.trim().slice(0, 160) ?? '', generation = options.generation ?? (key ? (latestGenerations.get(key) ?? 0) + 1 : 0)
  if (!Number.isSafeInteger(generation) || generation < 0) throw new Error('Invalid job generation')
  const inputBytes = options.inputBytes ?? estimateJobBytes(payload)
  const outputBytes = options.outputBytes ?? Math.min(performanceCoordinator.config.maxOutputBytes, Math.max(1024, inputBytes * 16))
  const queuedAt = performance.now()
  const previousGeneration = key ? latestGenerations.get(key) : undefined
  if (previousGeneration !== undefined && generation < previousGeneration) throw new Error('Stale job generation cannot replace a newer revision')
  retainKey(key)
  if (key) latestGenerations.set(key, generation)
  let handle: WorkHandle<T>
  const phases: ActiveJob['phases'] = { postMessageMs: null, workerExecutionMs: null, localExecutionMs: null, transportAndReturnMs: null, mergeMs: null }
  try { handle = auxiliaryWork.schedule<T>({ name: kind, owner: 'compute', workClass: options.workClass ?? 'required', epoch: options.epoch, requestedAtMs,
    inputRevision: generation, dependencies: options.dependencies, inputBytes, scratchBytes: options.scratchBytes ?? inputBytes,
    outputBytes, readSet: key ? [key] : [], writeSet: [],
    cooperative: false, cancelStrategy: executor === 'serial' ? 'discard-after-completion' : 'retire-independent-worker' }, async context => {
      if (key && latestGenerations.get(key) !== generation) throw new Error(`Stale ${kind} result discarded for ${key}`)
      const result = await execute(kind, payload, context, queuedAt, Math.min(120_000, Math.max(100, options.timeoutMs ?? settings.timeoutMs)), phases, outputBytes, executor)
      if (key && latestGenerations.get(key) !== generation) throw new Error(`Stale ${kind} result discarded for ${key}`)
      if (context.epoch !== performanceCoordinator.snapshot.sessionEpoch) throw new Error('Stale task result discarded')
      const mergeStarted = performance.now()
      measurePayloadBytes(result, outputBytes)
      const merged = options.merge ? options.merge(result) : result as T
      if (options.merge) measurePayloadBytes(merged, outputBytes)
      phases.mergeMs = performance.now() - mergeStarted; context.reportPhases(phases)
      return merged
    }, () => canStart(executor)) } catch (error) {
    if (key) { if (previousGeneration === undefined) latestGenerations.delete(key); else latestGenerations.set(key, previousGeneration) }
    releaseKey(key)
      throw error
    }
  handles.set(handle.id, handle as WorkHandle<unknown>)
  const promise = handle.promise.then(value => { jobSchedulerState.completed++; return value }, error => {
    const message = error instanceof Error ? error.message : String(error)
    if (/stale/i.test(message)) { jobSchedulerState.stale++; metrics.worker?.(0, 0, false, true) }
    else if (/cancelled|stopped/i.test(message)) jobSchedulerState.cancelled++
    else { jobSchedulerState.failed++; jobSchedulerState.lastError = message }
    throw error
  }).finally(() => { handles.delete(handle.id); releaseKey(key); notify() })
  notify()
  return { id: handle.id, generation, promise, cancel: () => {
    if (!handles.has(handle.id)) return
    if (key && latestGenerations.get(key) === generation) latestGenerations.set(key, generation + 1)
    handle.cancel()
  } }
}
export function shutdownJobScheduler(): void {
  for (const handle of handles.values()) handle.cancel('Job scheduler stopped')
  for (const slot of [...workers]) retireWorker(slot)
  latestGenerations.clear(); fallbackBusy = false; fallbackLease = 0
  notify()
}
