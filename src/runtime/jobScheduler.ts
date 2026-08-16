import { reactive } from 'vue'
import { productionSettings } from './production'

export type JobKind = 'parseJson' | 'parseCsv' | 'hash' | 'compare'
interface QueueJob { id: number; kind: JobKind; payload: unknown; resolve: (value: unknown) => void; reject: (reason: Error) => void; timer: number | null; cancelled: boolean }
interface WorkerSlot { worker: Worker; busy: boolean; jobId: number | null }

export const jobSchedulerState = reactive({
  workerAvailable: typeof Worker !== 'undefined', usingFallback: false, queued: 0, active: 0, completed: 0, failed: 0, cancelled: 0, averageMs: 0, lastError: ''
})

const queue: QueueJob[] = [], workers: WorkerSlot[] = [], pending = new Map<number, { job: QueueJob; started: number; slot: WorkerSlot | null }>()
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

function fallback(kind: JobKind, payload: unknown): unknown {
  if (kind === 'parseJson') return JSON.parse(String(payload))
  if (kind === 'parseCsv') return parseCsv(String(payload))
  if (kind === 'compare') return JSON.stringify((payload as { first?: unknown }).first) === JSON.stringify((payload as { second?: unknown }).second)
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
  jobSchedulerState.averageMs = jobSchedulerState.completed ? jobSchedulerState.averageMs * .9 + elapsed * .1 : elapsed
  jobSchedulerState.active = pending.size
  if (active.job.cancelled) jobSchedulerState.cancelled++
  else if (error) { jobSchedulerState.failed++; jobSchedulerState.lastError = error; active.job.reject(new Error(error)) }
  else { jobSchedulerState.completed++; active.job.resolve(result) }
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
    job.timer = window.setTimeout(() => { job.cancelled = true; complete(job.id, undefined, `Job timed out after ${productionSettings.jobs.timeoutMs} ms`) }, productionSettings.jobs.timeoutMs)
    if (slot) { slot.busy = true; slot.jobId = job.id; slot.worker.postMessage({ id: job.id, kind: job.kind, payload: job.payload }); continue }
    jobSchedulerState.usingFallback = true
    fallbackBusy = true
    queueMicrotask(() => { try { complete(job.id, fallback(job.kind, job.payload)) } catch (error) { complete(job.id, undefined, error instanceof Error ? error.message : String(error)) } })
  }
}

export function scheduleJob<T = unknown>(kind: JobKind, payload: unknown): { id: number; promise: Promise<T>; cancel: () => void } {
  if (queue.length + pending.size >= productionSettings.jobs.maxQueued) throw new Error(`Job queue is limited to ${productionSettings.jobs.maxQueued} items`)
  const id = nextId++
  let queued!: QueueJob
  const promise = new Promise<T>((resolve, reject) => { queued = { id, kind, payload, resolve: value => resolve(value as T), reject, timer: null, cancelled: false }; queue.push(queued); dispatch() })
  return { id, promise, cancel: () => { queued.cancelled = true; const active = pending.get(id); if (active) complete(id, undefined, 'Job cancelled') } }
}

export function shutdownJobScheduler(): void { for (const slot of workers) slot.worker.terminate(); workers.splice(0); for (const { job } of pending.values()) job.reject(new Error('Job scheduler stopped')); pending.clear(); for (const job of queue) job.reject(new Error('Job scheduler stopped')); queue.splice(0); fallbackBusy = false; jobSchedulerState.active = 0; jobSchedulerState.queued = 0 }
