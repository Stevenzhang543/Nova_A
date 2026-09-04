import { reactive } from 'vue'
import { productionSettings } from './production'
import { recordStaleWorkerResult, recordWorkerPerformance } from './largeWorldPerformance'

export type JobKind = 'parseJson' | 'parseCsv' | 'hash' | 'compare' | 'sampleAnimation' | 'advanceParticles' | 'buildSpatialGrid'
export interface JobScheduleOptions { key?: string; generation?: number; timeoutMs?: number }
interface QueueJob { id: number; kind: JobKind; payload: unknown; resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: ReturnType<typeof setTimeout> | null; cancelled: boolean; settled: boolean; queuedAt: number; key: string; generation: number; timeoutMs: number }
interface WorkerSlot { worker: Worker; busy: boolean; jobId: number | null; lease: number }
interface ActiveJob { job: QueueJob; started: number; slot: WorkerSlot | null; lease: number }

export const jobSchedulerState = reactive({
  workerAvailable: typeof Worker !== 'undefined', usingFallback: false, queued: 0, active: 0, completed: 0, failed: 0, cancelled: 0, stale: 0, averageMs: 0, workerMs: 0, queueWaitMs: 0, fallbackCount: 0, lastError: ''
})

const queue: QueueJob[] = [], workers: WorkerSlot[] = [], pending = new Map<number, ActiveJob>()
const latestGenerations = new Map<string, number>()
let nextId = 1
let nextLease = 1
let fallbackBusy = false
let fallbackLease = 0

function parseCsv(source: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], field = '', quoted = false
  for (let index = 0; index <= source.length; index++) {
    const character = source[index] ?? '\n'
    if (quoted && character === '"' && source[index + 1] === '"') { field += '"'; index++; continue }
    if (character === '"') { quoted = !quoted; continue }
    if (!quoted && (character === ',' || character === '\n' || character === '\r')) { if (character === '\r' && source[index + 1] === '\n') index++; row.push(field); field = ''; if (character !== ',') { if (row.some(value => value.length)) rows.push(row); row = [] }; continue }
    field += character
  }
  return rows.slice(0, 100_001).map(columns => columns.slice(0, 512))
}

export function runJobLocally(kind: JobKind, payload: unknown): unknown {
  if (kind === 'parseJson') return JSON.parse(String(payload))
  if (kind === 'parseCsv') return parseCsv(String(payload))
  if (kind === 'compare') return JSON.stringify((payload as { first?: unknown }).first) === JSON.stringify((payload as { second?: unknown }).second)
  if (kind === 'sampleAnimation') {
    const source = payload && typeof payload === 'object' ? payload as { time?: number; keys?: Array<{ time?: number; value?: number }> } : {}
    const keys = (Array.isArray(source.keys) ? source.keys : []).flatMap(key => Number.isFinite(key?.time) && Number.isFinite(key?.value) ? [{ time: Number(key.time), value: Number(key.value) }] : []).sort((a, b) => a.time - b.time).slice(0, 100_000)
    if (!keys.length) return 0
    const time = Number.isFinite(source.time) ? Number(source.time) : 0, nextIndex = keys.findIndex(key => key.time >= time)
    if (nextIndex <= 0) return keys[Math.max(0, nextIndex)].value
    if (nextIndex < 0) return keys[keys.length - 1].value
    const previous = keys[nextIndex - 1], next = keys[nextIndex], factor = Math.min(1, Math.max(0, (time - previous.time) / Math.max(1e-12, next.time - previous.time)))
    return previous.value + (next.value - previous.value) * factor
  }
  if (kind === 'advanceParticles') {
    const source = payload && typeof payload === 'object' ? payload as { dt?: number; gravity?: number; particles?: Array<{ x?: number; y?: number; vx?: number; vy?: number }> } : {}
    const dt = Math.min(1, Math.max(0, Number(source.dt) || 0)), gravity = Math.min(1e6, Math.max(-1e6, Number(source.gravity) || 0))
    return (Array.isArray(source.particles) ? source.particles : []).slice(0, 100_000).map(item => { const x = Number(item.x) || 0, y = Number(item.y) || 0, vx = Number(item.vx) || 0, vy = (Number(item.vy) || 0) + gravity * dt; return { x: x + vx * dt, y: y + vy * dt, vx, vy } })
  }
  if (kind === 'buildSpatialGrid') {
    const source = payload && typeof payload === 'object' ? payload as { cellSize?: number; entries?: Array<{ id?: string; x?: number; y?: number }> } : {}
    const cellSize = Math.min(1e6, Math.max(.01, Number(source.cellSize) || 16)), buckets: Record<string, string[]> = {}
    for (const entry of (Array.isArray(source.entries) ? source.entries : []).slice(0, 100_000)) { const id = String(entry.id ?? '').slice(0, 128); if (!id) continue; const key = `${Math.floor((Number(entry.x) || 0) / cellSize)}:${Math.floor((Number(entry.y) || 0) / cellSize)}`; (buckets[key] ??= []).push(id) }
    for (const values of Object.values(buckets)) values.sort()
    return Object.fromEntries(Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b)))
  }
  let first = 0x811c9dc5, second = 0x9e3779b9, value = String(payload)
  for (let index = 0; index < value.length; index++) { const code = value.charCodeAt(index); first = Math.imul(first ^ code, 0x01000193) >>> 0; second = Math.imul(second ^ (code + index), 0x85ebca6b) >>> 0 }
  return `${first.toString(16).padStart(8, '0')}${second.toString(16).padStart(8, '0')}`
}

function settle(active: ActiveJob, result: unknown, error?: string): void {
  const { job } = active
  if (job.settled) return
  job.settled = true
  if (job.timer !== null) { clearTimeout(job.timer); job.timer = null }
  const elapsed = performance.now() - active.started
  const queueWaitMs = Math.max(0, active.started - job.queuedAt), stale = Boolean(job.key && latestGenerations.get(job.key) !== job.generation)
  jobSchedulerState.averageMs = jobSchedulerState.completed ? jobSchedulerState.averageMs * .9 + elapsed * .1 : elapsed
  jobSchedulerState.workerMs = elapsed; jobSchedulerState.queueWaitMs = queueWaitMs
  jobSchedulerState.active = pending.size
  if (job.cancelled) {
    jobSchedulerState.cancelled++
    job.reject(new Error(error || 'Job cancelled'))
  }
  else if (stale) { jobSchedulerState.stale++; recordWorkerPerformance(elapsed, queueWaitMs, !active.slot, true); job.reject(new Error(`Stale ${job.kind} result discarded for ${job.key}`)) }
  else if (error) { jobSchedulerState.failed++; jobSchedulerState.lastError = error; job.reject(new Error(error)) }
  else { jobSchedulerState.completed++; job.resolve(result) }
  if (!stale) recordWorkerPerformance(elapsed, queueWaitMs, !active.slot, false)
}

function releaseSlot(active: ActiveJob): void {
  if (active.slot && active.slot.jobId === active.job.id && active.slot.lease === active.lease) {
    active.slot.busy = false; active.slot.jobId = null; active.slot.lease = 0
  } else if (!active.slot && fallbackLease === active.lease) {
    fallbackBusy = false; fallbackLease = 0
  }
}

function complete(id: number, lease: number, result: unknown, error?: string): void {
  const active = pending.get(id)
  if (!active || active.lease !== lease) {
    // A retired worker is allowed to finish, but its reply must never settle a
    // newer job occupying the same slot.
    jobSchedulerState.stale++
    recordStaleWorkerResult()
    return
  }
  pending.delete(id)
  releaseSlot(active)
  settle(active, result, error)
  dispatch()
}

function retireWorker(slot: WorkerSlot): void {
  slot.worker.onmessage = null
  slot.worker.onerror = null
  slot.worker.terminate()
  const index = workers.indexOf(slot)
  if (index >= 0) workers.splice(index, 1)
  slot.busy = false; slot.jobId = null; slot.lease = 0
}

function cancelActive(active: ActiveJob, reason: string): void {
  if (active.job.settled) return
  active.job.cancelled = true
  pending.delete(active.job.id)
  // Worker work cannot be safely reused after cancellation or timeout. Retire
  // the slot so a late message cannot free or complete a newer lease.
  if (active.slot) retireWorker(active.slot)
  settle(active, undefined, reason)
  dispatch()
}

function rejectQueued(job: QueueJob, reason: string, stale = false): void {
  if (job.settled) return
  job.settled = true
  if (stale) { jobSchedulerState.stale++; recordWorkerPerformance(0, 0, false, true) }
  else jobSchedulerState.cancelled++
  job.reject(new Error(reason))
}

function createWorker(): WorkerSlot | null {
  if (!jobSchedulerState.workerAvailable) return null
  try {
    const worker = new Worker(new URL('./jobScheduler.worker.ts', import.meta.url), { type: 'module', name: 'nova-job-worker' })
    const slot: WorkerSlot = { worker, busy: false, jobId: null, lease: 0 }
    worker.onmessage = event => complete(Number(event.data?.id), Number(event.data?.lease), event.data?.result, typeof event.data?.error === 'string' ? event.data.error : undefined)
    worker.onerror = event => {
      const lease = slot.lease, active = slot.jobId === null ? null : pending.get(slot.jobId)
      jobSchedulerState.workerAvailable = false; jobSchedulerState.usingFallback = true
      retireWorker(slot)
      if (active && active.lease === lease) complete(active.job.id, lease, undefined, event.message || 'Worker failed')
    }
    workers.push(slot); return slot
  } catch { jobSchedulerState.workerAvailable = false; jobSchedulerState.usingFallback = true; return null }
}

function dispatch(): void {
  jobSchedulerState.queued = queue.length
  while (queue.length) {
    let slot = workers.find(candidate => !candidate.busy) ?? null
    if (!slot && workers.length < productionSettings.jobs.maxWorkers) slot = createWorker()
    if (!slot && jobSchedulerState.workerAvailable && workers.length >= productionSettings.jobs.maxWorkers) break
    if (!slot && fallbackBusy) break
    const job = queue.shift()!; jobSchedulerState.queued = queue.length
    if (job.cancelled) { rejectQueued(job, 'Job cancelled'); continue }
    if (job.key && latestGenerations.get(job.key) !== job.generation) { rejectQueued(job, `Stale ${job.kind} result discarded for ${job.key}`, true); continue }
    const started = performance.now(), lease = nextLease++
    const active: ActiveJob = { job, started, slot, lease }
    pending.set(job.id, active); jobSchedulerState.active = pending.size
    job.timer = globalThis.setTimeout(() => { const current = pending.get(job.id); if (current?.lease === lease) cancelActive(current, `Job timed out after ${job.timeoutMs} ms`) }, job.timeoutMs)
    if (slot) {
      slot.busy = true; slot.jobId = job.id; slot.lease = lease
      try { slot.worker.postMessage({ id: job.id, lease, kind: job.kind, payload: job.payload }) }
      catch (error) { retireWorker(slot); complete(job.id, lease, undefined, error instanceof Error ? error.message : String(error)) }
      continue
    }
    jobSchedulerState.usingFallback = true
    jobSchedulerState.fallbackCount++
    fallbackBusy = true; fallbackLease = lease
    // A task boundary lets input, paint and cancellation run before an
    // unavoidable single-thread fallback begins.
    globalThis.setTimeout(() => {
      const current = pending.get(job.id)
      if (!current || current.lease !== lease || job.settled) {
        if (fallbackLease === lease) { fallbackBusy = false; fallbackLease = 0; dispatch() }
        return
      }
      try { complete(job.id, lease, runJobLocally(job.kind, job.payload)) }
      catch (error) { complete(job.id, lease, undefined, error instanceof Error ? error.message : String(error)) }
    }, 0)
  }
}

export function scheduleJob<T = unknown>(kind: JobKind, payload: unknown, options: JobScheduleOptions = {}): { id: number; generation: number; promise: Promise<T>; cancel: () => void } {
  if (queue.length + pending.size >= productionSettings.jobs.maxQueued) throw new Error(`Job queue is limited to ${productionSettings.jobs.maxQueued} items`)
  const id = nextId++
  const key = options.key?.trim().slice(0, 160) ?? '', generation = options.generation ?? (key ? (latestGenerations.get(key) ?? 0) + 1 : 0)
  if (key) latestGenerations.set(key, generation)
  let queued!: QueueJob
  const promise = new Promise<T>((resolve, reject) => { queued = { id, kind, payload, resolve: value => resolve(value as T), reject, timer: null, cancelled: false, settled: false, queuedAt: performance.now(), key, generation, timeoutMs: Math.min(120_000, Math.max(100, options.timeoutMs ?? productionSettings.jobs.timeoutMs)) }; queue.push(queued); dispatch() })
  return { id, generation, promise, cancel: () => {
    if (queued.settled) return
    queued.cancelled = true
    if (key && latestGenerations.get(key) === generation) latestGenerations.set(key, generation + 1)
    const active = pending.get(id)
    if (active) { cancelActive(active, 'Job cancelled'); return }
    const index = queue.findIndex(job => job.id === id)
    if (index >= 0) { queue.splice(index, 1); jobSchedulerState.queued = queue.length; rejectQueued(queued, 'Job cancelled'); dispatch() }
  } }
}

export function shutdownJobScheduler(): void {
  for (const slot of [...workers]) retireWorker(slot)
  for (const active of pending.values()) { if (active.job.timer !== null) clearTimeout(active.job.timer); active.job.timer = null; active.job.settled = true; active.job.reject(new Error('Job scheduler stopped')) }
  pending.clear()
  for (const job of queue) { job.settled = true; job.reject(new Error('Job scheduler stopped')) }
  queue.splice(0); latestGenerations.clear(); fallbackBusy = false; fallbackLease = 0
  jobSchedulerState.active = 0; jobSchedulerState.queued = 0
}
