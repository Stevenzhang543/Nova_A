import { reactive } from 'vue'
import { productionSettings } from './production'
import { recordWorkerPerformance } from './largeWorldPerformance'

export type JobKind = 'parseJson' | 'parseCsv' | 'hash' | 'compare' | 'sampleAnimation' | 'advanceParticles' | 'buildSpatialGrid'
export interface JobScheduleOptions { key?: string; generation?: number; timeoutMs?: number }
interface QueueJob { id: number; kind: JobKind; payload: unknown; resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: number | null; cancelled: boolean; queuedAt: number; key: string; generation: number; timeoutMs: number }
interface WorkerSlot { worker: Worker; busy: boolean; jobId: number | null }

export const jobSchedulerState = reactive({
  workerAvailable: typeof Worker !== 'undefined', usingFallback: false, queued: 0, active: 0, completed: 0, failed: 0, cancelled: 0, stale: 0, averageMs: 0, workerMs: 0, queueWaitMs: 0, fallbackCount: 0, lastError: ''
})

const queue: QueueJob[] = [], workers: WorkerSlot[] = [], pending = new Map<number, { job: QueueJob; started: number; slot: WorkerSlot | null }>()
const latestGenerations = new Map<string, number>()
let nextId = 1
let fallbackBusy = false

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

function complete(id: number, result: unknown, error?: string): void {
  const active = pending.get(id); if (!active) return
  pending.delete(id); if (active.job.timer !== null) clearTimeout(active.job.timer)
  if (active.slot) { active.slot.busy = false; active.slot.jobId = null }
  else fallbackBusy = false
  const elapsed = performance.now() - active.started
  const queueWaitMs = Math.max(0, active.started - active.job.queuedAt), stale = Boolean(active.job.key && latestGenerations.get(active.job.key) !== active.job.generation)
  jobSchedulerState.averageMs = jobSchedulerState.completed ? jobSchedulerState.averageMs * .9 + elapsed * .1 : elapsed
  jobSchedulerState.workerMs = elapsed; jobSchedulerState.queueWaitMs = queueWaitMs
  jobSchedulerState.active = pending.size
  if (active.job.cancelled) {
    jobSchedulerState.cancelled++
    active.job.reject(new Error(error || 'Job cancelled'))
  }
  else if (stale) { jobSchedulerState.stale++; recordWorkerPerformance(elapsed, queueWaitMs, !active.slot, true); active.job.reject(new Error(`Stale ${active.job.kind} result discarded for ${active.job.key}`)) }
  else if (error) { jobSchedulerState.failed++; jobSchedulerState.lastError = error; active.job.reject(new Error(error)) }
  else { jobSchedulerState.completed++; active.job.resolve(result) }
  if (!stale) recordWorkerPerformance(elapsed, queueWaitMs, !active.slot, false)
  dispatch()
}

function createWorker(): WorkerSlot | null {
  if (!jobSchedulerState.workerAvailable) return null
  try {
    const worker = new Worker(new URL('./jobScheduler.worker.ts', import.meta.url), { type: 'module', name: 'nova-job-worker' })
    const slot: WorkerSlot = { worker, busy: false, jobId: null }
    worker.onmessage = event => complete(Number(event.data?.id), event.data?.result, typeof event.data?.error === 'string' ? event.data.error : undefined)
    worker.onerror = event => { const id = slot.jobId; jobSchedulerState.workerAvailable = false; jobSchedulerState.usingFallback = true; worker.terminate(); const index = workers.indexOf(slot); if (index >= 0) workers.splice(index, 1); if (id !== null) complete(id, undefined, event.message || 'Worker failed') }
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
    if (job.cancelled) { jobSchedulerState.cancelled++; job.reject(new Error('Job cancelled')); continue }
    const started = performance.now(); pending.set(job.id, { job, started, slot }); jobSchedulerState.active = pending.size
    job.timer = window.setTimeout(() => { job.cancelled = true; complete(job.id, undefined, `Job timed out after ${job.timeoutMs} ms`) }, job.timeoutMs)
    if (slot) { slot.busy = true; slot.jobId = job.id; slot.worker.postMessage({ id: job.id, kind: job.kind, payload: job.payload }); continue }
    jobSchedulerState.usingFallback = true
    jobSchedulerState.fallbackCount++
    fallbackBusy = true
    queueMicrotask(() => { try { complete(job.id, runJobLocally(job.kind, job.payload)) } catch (error) { complete(job.id, undefined, error instanceof Error ? error.message : String(error)) } })
  }
}

export function scheduleJob<T = unknown>(kind: JobKind, payload: unknown, options: JobScheduleOptions = {}): { id: number; generation: number; promise: Promise<T>; cancel: () => void } {
  if (queue.length + pending.size >= productionSettings.jobs.maxQueued) throw new Error(`Job queue is limited to ${productionSettings.jobs.maxQueued} items`)
  const id = nextId++
  const key = options.key?.trim().slice(0, 160) ?? '', generation = options.generation ?? (key ? (latestGenerations.get(key) ?? 0) + 1 : 0)
  if (key) latestGenerations.set(key, generation)
  let queued!: QueueJob
  const promise = new Promise<T>((resolve, reject) => { queued = { id, kind, payload, resolve: value => resolve(value as T), reject, timer: null, cancelled: false, queuedAt: performance.now(), key, generation, timeoutMs: Math.min(120_000, Math.max(100, options.timeoutMs ?? productionSettings.jobs.timeoutMs)) }; queue.push(queued); dispatch() })
  return { id, generation, promise, cancel: () => { queued.cancelled = true; if (key && latestGenerations.get(key) === generation) latestGenerations.set(key, generation + 1); const active = pending.get(id); if (active) complete(id, undefined, 'Job cancelled') } }
}

export function shutdownJobScheduler(): void { for (const slot of workers) slot.worker.terminate(); workers.splice(0); for (const { job } of pending.values()) job.reject(new Error('Job scheduler stopped')); pending.clear(); for (const job of queue) job.reject(new Error('Job scheduler stopped')); queue.splice(0); latestGenerations.clear(); fallbackBusy = false; jobSchedulerState.active = 0; jobSchedulerState.queued = 0 }
