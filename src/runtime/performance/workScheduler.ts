import { PerformanceCoordinator, type HeavyLease, type WorkClass, type WorkOwner } from './coordinator'

export interface WorkDescriptor {
  name: string; owner: WorkOwner; workClass: WorkClass; epoch?: number; inputRevision?: number
  inputBytes: number; scratchBytes: number; outputBytes: number
  readSet: readonly string[]; writeSet: readonly string[]; dependencies?: readonly number[]
  deadlineMs?: number; expiresAtMs?: number; cooperative: boolean
  requestedAtMs?: number
  cancelStrategy: 'checkpoint' | 'retire-independent-worker' | 'discard-after-completion'
}
export interface WorkPhases { postMessageMs: number | null; workerExecutionMs: number | null; localExecutionMs?: number | null; transportAndReturnMs: number | null; mergeMs: number | null }
export interface WorkContext { readonly id: number; readonly epoch: number; readonly signal: AbortSignal; reportPhases(phases: WorkPhases): void }
export interface WorkHandle<T> { readonly id: number; readonly promise: Promise<T>; cancel(reason?: string): void }
type Terminal = 'completed' | 'failed' | 'cancelled' | 'stale'
export interface WorkTrace {
  id: number; name: string; owner: WorkOwner; workClass: WorkClass; epoch: number; inputRevision: number | null
  queuedAtMs: number; startedAtMs: number | null; completedAtMs: number; queueWaitMs: number | null
  executionAndMergeMs: number | null; endToEndMs: number; status: Terminal; inputBytes: number
  scratchBytes: number; outputBytes: number; cooperative: boolean; cancelStrategy: WorkDescriptor['cancelStrategy']
  preparationMs: number; wallMsIncludingPreparation: number; phases: Readonly<WorkPhases> | null
}
interface Task {
  id: number; descriptor: WorkDescriptor; priority: WorkClass; epoch: number; queuedAt: number
  startedAt: number | null; lease: HeavyLease | null; controller: AbortController; settled: boolean
  run: (context: WorkContext) => unknown | Promise<unknown>; canStart: () => boolean
  resolve: (value: unknown) => void; reject: (error: Error) => void
  phases: WorkPhases | null
}
const classes: readonly WorkClass[] = ['critical', 'visible', 'required', 'background', 'idle']
const rank = (workClass: WorkClass) => classes.indexOf(workClass)
const failure = (value: unknown) => value instanceof Error ? value : new Error(String(value))

/** One finite queue for auxiliary owners. Executors, clocks and real task boundaries belong to hosts. */
export class BudgetedWorkScheduler {
  private readonly queued = new Map<number, Task>()
  private readonly running = new Map<number, Task>()
  private readonly terminals = new Map<number, Terminal>()
  private readonly traces: WorkTrace[] = []
  private readonly listeners = new Set<() => void>()
  private nextId = 1
  private inputBytes = 0
  private dispatching = false
  private urgentBurst = 0
  private readonly unsubscribe: () => void
  constructor(readonly coordinator: PerformanceCoordinator) { this.unsubscribe = coordinator.subscribe(() => this.wake()) }
  get state() { return Object.freeze({ queued: this.queued.size, active: this.running.size, inputBytes: this.inputBytes, ...this.coordinator.resources }) }
  get trace(): readonly Readonly<WorkTrace>[] { return this.traces.map(item => Object.freeze({ ...item })) }
  counts(owner: WorkOwner) { return Object.freeze({ active: [...this.running.values()].filter(task => task.descriptor.owner === owner).length, queued: [...this.queued.values()].filter(task => task.descriptor.owner === owner).length }) }
  subscribe(listener: () => void): () => void { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  private notify(): void { for (const listener of [...this.listeners]) listener() }
  schedule<T>(descriptor: WorkDescriptor, run: (context: WorkContext) => T | Promise<T>, canStart: () => boolean = () => true): WorkHandle<T> {
    const config = this.coordinator.config
    for (const bytes of [descriptor.inputBytes, descriptor.scratchBytes, descriptor.outputBytes]) if (!Number.isSafeInteger(bytes) || bytes < 0) throw new Error('Invalid task byte bound')
    if (!classes.includes(descriptor.workClass)) throw new Error('Invalid work class')
    if (this.queued.size + this.running.size >= config.maxQueueTasks || this.inputBytes + descriptor.inputBytes > config.maxQueueBytes) throw new Error('Auxiliary queue capacity exceeded')
    if (descriptor.scratchBytes > config.maxScratchBytes || descriptor.outputBytes > config.maxOutputBytes) throw new Error('Task memory reservation exceeds configured bound')
    const epoch = descriptor.epoch ?? this.coordinator.snapshot.sessionEpoch
    if (epoch !== this.coordinator.snapshot.sessionEpoch) throw new Error('Stale task epoch')
    const dependencies = [...new Set(descriptor.dependencies ?? [])]
    if (descriptor.name.length > 512 || descriptor.readSet.length > 256 || descriptor.writeSet.length > 256 || [...descriptor.readSet, ...descriptor.writeSet].some(key => key.length > 1024) || dependencies.length > 2048) throw new Error('Task metadata exceeds its bound')
    if (descriptor.inputRevision !== undefined && (!Number.isSafeInteger(descriptor.inputRevision) || descriptor.inputRevision < 0)) throw new Error('Invalid input revision')
    for (const timestamp of [descriptor.deadlineMs, descriptor.expiresAtMs]) if (timestamp !== undefined && (!Number.isFinite(timestamp) || timestamp < 0)) throw new Error('Invalid task deadline')
    // References must already exist: this produces a DAG without accepting unresolved cycles.
    for (const id of dependencies) if (!this.queued.has(id) && !this.running.has(id) && !this.terminals.has(id)) throw new Error(`Unknown task dependency ${id}`)
    const id = this.nextId++, queuedAt = this.coordinator.now()
    if (descriptor.requestedAtMs !== undefined && (!Number.isFinite(descriptor.requestedAtMs) || descriptor.requestedAtMs < 0 || descriptor.requestedAtMs > queuedAt)) throw new Error('Invalid request clock')
    let task!: Task
    const promise = new Promise<T>((resolve, reject) => { task = { id, descriptor: { ...descriptor, dependencies,
      readSet: Object.freeze([...descriptor.readSet]), writeSet: Object.freeze([...descriptor.writeSet]) }, priority: descriptor.workClass,
      epoch, queuedAt, startedAt: null, lease: null, controller: new AbortController(), settled: false, phases: null,
      run, canStart, resolve: value => resolve(value as T), reject } })
    this.queued.set(id, task); this.inputBytes += descriptor.inputBytes
    this.promoteDependencies(task, descriptor.workClass)
    this.wake(); this.notify()
    return Object.freeze({ id, promise, cancel: (reason = 'Job cancelled') => this.cancel(id, reason) })
  }
  private promoteDependencies(task: Task, priority: WorkClass): void {
    for (const id of task.descriptor.dependencies ?? []) {
      const dependency = this.queued.get(id) ?? this.running.get(id)
      if (dependency && rank(priority) < rank(dependency.priority)) { dependency.priority = priority; this.promoteDependencies(dependency, priority) }
    }
  }
  cancel(id: number, reason = 'Job cancelled'): void {
    const task = this.queued.get(id) ?? this.running.get(id)
    if (!task || task.settled) return
    task.settled = true; task.reject(new Error(reason)); task.controller.abort(reason)
    if (this.queued.has(id)) this.finish(task, 'cancelled')
    // Running reservations remain owned until the executor actually stops. Abort alone is not completion.
    this.wake(); this.notify()
  }
  cancelAll(reason = 'Job scheduler stopped'): void { for (const id of [...this.queued.keys(), ...this.running.keys()]) this.cancel(id, reason) }
  dispose(): void { this.cancelAll(); this.unsubscribe(); this.listeners.clear() }
  private finish(task: Task, status: Terminal): void {
    if (!this.queued.delete(task.id) && !this.running.delete(task.id)) return
    this.inputBytes -= task.descriptor.inputBytes
    this.terminals.set(task.id, status)
    // Retain referenced terminals, plus a bounded recent tail for optional future dependencies.
    const referenced = new Set([...this.queued.values(), ...this.running.values()].flatMap(item => [...(item.descriptor.dependencies ?? [])]))
    for (const id of this.terminals.keys()) if (this.terminals.size > 2048 && !referenced.has(id)) this.terminals.delete(id)
    const completedAt = this.coordinator.now()
    this.traces.push({ id: task.id, name: task.descriptor.name, owner: task.descriptor.owner, workClass: task.descriptor.workClass,
      epoch: task.epoch, inputRevision: task.descriptor.inputRevision ?? null, queuedAtMs: task.queuedAt,
      startedAtMs: task.startedAt, completedAtMs: completedAt, queueWaitMs: task.startedAt === null ? null : Math.max(0, task.startedAt - task.queuedAt),
      executionAndMergeMs: task.startedAt === null ? null : Math.max(0, completedAt - task.startedAt), endToEndMs: Math.max(0, completedAt - task.queuedAt),
      status, inputBytes: task.descriptor.inputBytes, scratchBytes: task.descriptor.scratchBytes, outputBytes: task.descriptor.outputBytes,
      cooperative: task.descriptor.cooperative, cancelStrategy: task.descriptor.cancelStrategy,
      preparationMs: Math.max(0, task.queuedAt - (task.descriptor.requestedAtMs ?? task.queuedAt)),
      wallMsIncludingPreparation: Math.max(0, completedAt - (task.descriptor.requestedAtMs ?? task.queuedAt)),
      phases: task.phases ? Object.freeze({ ...task.phases }) : null })
    if (this.traces.length > 600) this.traces.shift()
    task.lease?.release(); task.lease = null
    this.notify()
  }
  private conflicts(task: Task): boolean {
    return [...this.running.values()].some(active => task.descriptor.writeSet.some(key => active.descriptor.writeSet.includes(key) || active.descriptor.readSet.includes(key)) || task.descriptor.readSet.some(key => active.descriptor.writeSet.includes(key)))
  }
  wake(): void {
    if (this.dispatching) return
    this.dispatching = true
    try {
      for (const task of [...this.queued.values(), ...this.running.values()]) task.priority = task.descriptor.workClass
      for (const task of [...this.queued.values(), ...this.running.values()]) if (!task.settled) this.promoteDependencies(task, task.priority)
      for (const task of [...this.queued.values()]) {
        const failedDependency = task.descriptor.dependencies?.some(id => { const status = this.terminals.get(id); return status !== undefined && status !== 'completed' })
        const stale = task.epoch !== this.coordinator.snapshot.sessionEpoch || (task.descriptor.expiresAtMs !== undefined && this.coordinator.now() >= task.descriptor.expiresAtMs)
        if (failedDependency || stale) { task.settled = true; task.reject(new Error(stale ? 'Stale task epoch or expiry' : 'Task dependency failed')); this.finish(task, stale ? 'stale' : 'failed') }
      }
      while (this.queued.size) {
        let ready = [...this.queued.values()].filter(task => !task.controller.signal.aborted && !task.descriptor.dependencies?.some(id => this.terminals.get(id) !== 'completed') && !this.conflicts(task) && task.canStart())
        if (ready.some(task => task.priority !== 'idle') || [...this.running.values()].some(task => task.priority !== 'idle')) ready = ready.filter(task => task.priority !== 'idle')
        if (!ready.length) break
        ready.sort((a, b) => rank(a.priority) - rank(b.priority) || (a.descriptor.deadlineMs ?? Infinity) - (b.descriptor.deadlineMs ?? Infinity) || a.id - b.id)
        if (this.urgentBurst >= 8 && ready[0].priority !== 'critical') {
          const fair = ready.filter(task => task.priority !== 'idle' && rank(task.priority) > rank(ready[0].priority)).sort((a, b) => a.id - b.id)[0]
          if (fair) { ready.splice(ready.indexOf(fair), 1); ready.unshift(fair) }
        }
        let started = false
        for (const task of ready) {
          const lease = this.coordinator.tryAcquire(task.descriptor.owner, task.epoch, task.descriptor.scratchBytes, task.descriptor.outputBytes, task.priority)
          if (!lease) continue
          task.lease = lease; task.startedAt = this.coordinator.now(); this.queued.delete(task.id); this.running.set(task.id, task)
          this.urgentBurst = task.priority === 'visible' || task.priority === 'required' ? this.urgentBurst + 1 : 0
          let execution: unknown | Promise<unknown>
          try { execution = task.run(Object.freeze({ id: task.id, epoch: task.epoch, signal: task.controller.signal, reportPhases: (phases: WorkPhases) => {
            const valid = (value: number | null) => value === null || Number.isFinite(value) && value >= 0
            if (!Object.values(phases).every(valid)) throw new Error('Invalid measured task phase')
            task.phases = { ...phases }
          } })) }
          catch (error) { execution = Promise.reject(error) }
          Promise.resolve(execution).then(value => {
            const stale = task.epoch !== this.coordinator.snapshot.sessionEpoch || (task.descriptor.expiresAtMs !== undefined && this.coordinator.now() >= task.descriptor.expiresAtMs)
            const status = task.controller.signal.aborted ? 'cancelled' : stale ? 'stale' : 'completed'
            if (!task.settled) { task.settled = true; if (status === 'completed') task.resolve(value); else task.reject(new Error(status === 'stale' ? 'Stale task result discarded' : 'Job cancelled')) }
            this.finish(task, status); this.wake()
          }, error => {
            if (!task.settled) { task.settled = true; task.reject(failure(error)) }
            this.finish(task, task.controller.signal.aborted ? 'cancelled' : 'failed'); this.wake()
          })
          started = true; break
        }
        if (!started) break
      }
    } finally { this.dispatching = false }
  }
}
