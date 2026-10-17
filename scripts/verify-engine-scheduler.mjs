import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'vite'

const root = process.cwd(), compiled = await mkdtemp(join(tmpdir(), 'nova-engine-scheduler-'))
const tests = [], modules = new Set()
await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
  plugins: [{ name: 'capture-dependencies', generateBundle() { for (const id of this.getModuleIds()) modules.add(id) } }],
  build: { ssr: true, outDir: compiled, emptyOutDir: false,
    rollupOptions: { input: { coordinator: join(root, 'src/runtime/performance/coordinator.ts'), scheduler: join(root, 'src/runtime/performance/workScheduler.ts'), jobs: join(root, 'src/runtime/jobScheduler.ts'), services: join(root, 'src/runtime/performance/services.ts'), pressure: join(root, 'src/runtime/performance/pressureFeed.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
const load = name => import(pathToFileURL(join(compiled, `${name}.mjs`)).href)
const { PerformanceCoordinator, VISUAL_QUALITY_FLOOR } = await load('coordinator')
const { BudgetedWorkScheduler } = await load('scheduler')
const { auxiliaryWork, performanceCoordinator } = await load('services')
const flush = async () => { for (let index = 0; index < 8; index++) await Promise.resolve() }
const check = async (name, execute) => { await execute(); tests.push({ name, status: 'PASS' }) }
const descriptor = (name, overrides = {}) => ({ name, owner: 'compute', workClass: 'required', inputBytes: 16, scratchBytes: 32, outputBytes: 64, readSet: [], writeSet: [], cooperative: false, cancelStrategy: 'discard-after-completion', ...overrides })
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }

await check('pure-production-dependency-graph', () => {
  assert.equal([...modules].filter(id => /node_modules[\\/](?:vue|@vue)|src[\\/](?:editor|store|components|assets)|@tauri/.test(id)).length, 0)
})
await check('hardware-hint-and-global-cap', () => {
  for (const [hint, expected] of [[null, 1], [2, 1], [4, 1], [8, 2], [16, 3], [32, 4]]) assert.equal(new PerformanceCoordinator(() => 0, hint).snapshot.heavyJobAdmissionLimit, expected)
  assert.equal(new PerformanceCoordinator(() => 0, 32, { maxAuxiliaryHeavyJobs: 2 }).snapshot.heavyJobAdmissionLimit, 2)
  assert.equal(new PerformanceCoordinator(() => 0, NaN).snapshot.confidence, 'insufficient')
})
await check('immutable-comfortable-quality-floor', () => {
  assert(Object.isFrozen(VISUAL_QUALITY_FLOOR)); assert.equal(VISUAL_QUALITY_FLOOR.textPx, 16); assert.equal(VISUAL_QUALITY_FLOOR.controlPx, 44)
  assert.equal(VISUAL_QUALITY_FLOOR.labelGapPx, 12); assert.equal(VISUAL_QUALITY_FLOOR.coreMotion, true)
})
await check('required-work-progress-with-zero-helpers', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 8, { maxAuxiliaryHeavyJobs: 0, maxComputeHelpers: 0 })
  const scheduler = new BudgetedWorkScheduler(coordinator)
  assert.equal(await scheduler.schedule(descriptor('save'), () => 'saved').promise, 'saved')
  const optional = scheduler.schedule(descriptor('optional', { workClass: 'background' }), () => assert.fail('optional work must remain paused'))
  optional.promise.catch(() => {}); assert.equal(scheduler.state.queued, 1); optional.cancel(); await assert.rejects(optional.promise, /cancelled/); await flush(); scheduler.dispose()
})
await check('leases-release-exactly-once', () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4)
  const lease = coordinator.tryAcquire('asset', 1, 100, 200, 'required')
  assert.equal(coordinator.resources.activeHeavyJobs, 1); assert.equal(coordinator.tryAcquire('compute', 1, 1, 1, 'required'), null)
  assert.equal(lease.release(), true); assert.equal(lease.release(), false); assert.equal(coordinator.resources.scratchBytesReserved, 0)
  assert.throws(() => coordinator.tryAcquire('compute', 1, Infinity, 1, 'required'), /Invalid/)
})
await check('mixed-owners-share-global-admission', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred(), started = []
  const asset = scheduler.schedule(descriptor('asset', { owner: 'asset' }), () => { started.push('asset'); return gate.promise })
  const compute = scheduler.schedule(descriptor('compute'), () => { started.push('compute'); return 42 })
  assert.deepEqual(started, ['asset']); assert.equal(scheduler.state.activeHeavyJobs, 1)
  gate.resolve('ready'); await asset.promise; await flush(); assert.equal(await compute.promise, 42); assert.deepEqual(started, ['asset', 'compute']); scheduler.dispose()
})
await check('cancel-does-not-release-running-executor-early', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred()
  const running = scheduler.schedule(descriptor('uninterruptible'), () => gate.promise); running.promise.catch(() => {})
  running.cancel(); await assert.rejects(running.promise, /cancelled/); assert.equal(coordinator.resources.activeHeavyJobs, 1)
  const next = scheduler.schedule(descriptor('next'), () => 7)
  assert.equal(scheduler.state.queued, 1); gate.resolve(5); await flush(); assert.equal(await next.promise, 7)
  assert.equal(coordinator.resources.activeHeavyJobs, 0); scheduler.dispose()
})
await check('dependency-inheritance-no-lease-while-waiting', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), blocker = deferred(), order = []
  const active = scheduler.schedule(descriptor('active'), () => blocker.promise)
  const dependency = scheduler.schedule(descriptor('low-dependency', { workClass: 'background' }), () => { order.push('dependency'); return 1 })
  const middle = scheduler.schedule(descriptor('middle', { workClass: 'visible' }), () => { order.push('middle'); return 2 })
  const critical = scheduler.schedule(descriptor('critical', { workClass: 'critical', dependencies: [dependency.id] }), () => { order.push('critical'); return 3 })
  assert.equal(coordinator.resources.activeHeavyJobs, 1); blocker.resolve(0); await Promise.all([active.promise, dependency.promise, middle.promise, critical.promise])
  assert.deepEqual(order, ['dependency', 'critical', 'middle']); scheduler.dispose()
})
await check('ready-critical-drains-before-required-work', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred(), order = []
  const initial = scheduler.schedule(descriptor('initial', { workClass: 'critical' }), () => gate.promise)
  const required = scheduler.schedule(descriptor('required'), () => { order.push('required'); return 0 })
  const urgent = Array.from({ length: 18 }, (_, index) => scheduler.schedule(descriptor(`critical-${index}`, { workClass: 'critical' }), () => { order.push(index); return index }))
  gate.resolve(0); await Promise.all([initial.promise, required.promise, ...urgent.map(item => item.promise)])
  assert.deepEqual(order, [...Array.from({ length: 18 }, (_, index) => index), 'required']); scheduler.dispose()
})
// Master §39: finite Critical drains; ordinary Visible/Required rotations remain fair.
for (const workClass of ['visible', 'required']) {
  await check(`background-progress-under-continuous-${workClass}-work`, async () => {
    const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred(), completed = deferred(), order = [], tasks = []
    try {
      const held = scheduler.schedule(descriptor('held', { workClass: 'critical' }), () => gate.promise)
      const background = scheduler.schedule(descriptor('background', { workClass: 'background' }), () => { order.push('background'); return 0 })
      const enqueue = index => tasks.push(scheduler.schedule(descriptor(`ordinary-${index}`, { workClass }), () => { order.push(index); if (index < 31) enqueue(index + 1); else completed.resolve(); return index }))
      enqueue(0); gate.resolve(0); await Promise.all([held.promise, background.promise]); await completed.promise; await Promise.all(tasks.map(task => task.promise)); await flush()
      assert.equal(order.filter(value => value !== 'background').length, 32); assert(order.indexOf('background') <= 8)
      assert.equal(scheduler.state.queued, 0); assert.equal(scheduler.state.active, 0); assert.equal(scheduler.state.activeHeavyJobs, 0)
      assert.equal(scheduler.state.inputBytes, 0); assert.equal(scheduler.state.scratchBytesReserved, 0); assert.equal(scheduler.state.outputBytesReserved, 0)
    } finally { scheduler.dispose() }
  })
}
await check('write-read-conflicts', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 8), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred(), order = []
  const writer = scheduler.schedule(descriptor('writer', { writeSet: ['resource:1'] }), () => gate.promise)
  const reader = scheduler.schedule(descriptor('reader', { readSet: ['resource:1'] }), () => { order.push('reader'); return 1 })
  assert.equal(scheduler.state.active, 1); gate.resolve(0); await Promise.all([writer.promise, reader.promise]); assert.deepEqual(order, ['reader'])
  scheduler.dispose()
})
await check('equal-class-earlier-soft-deadline-starts-first', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred(), order = []
  const blocker = scheduler.schedule(descriptor('blocker'), () => gate.promise)
  const later = scheduler.schedule(descriptor('later', { deadlineMs: 200 }), () => { order.push('later'); return 1 })
  const earlier = scheduler.schedule(descriptor('earlier', { deadlineMs: 100 }), () => { order.push('earlier'); return 2 })
  gate.resolve(0); await Promise.all([blocker.promise, later.promise, earlier.promise]); assert.deepEqual(order, ['earlier', 'later']); scheduler.dispose()
})
await check('queued-and-running-expired-results-never-commit', async () => {
  let now = 0
  const coordinator = new PerformanceCoordinator(() => now, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred()
  const running = scheduler.schedule(descriptor('running-expiry', { expiresAtMs: 10 }), () => gate.promise); running.promise.catch(() => {})
  const queued = scheduler.schedule(descriptor('queued-expiry', { expiresAtMs: 5 }), () => assert.fail('Expired task must not run')); queued.promise.catch(() => {})
  now = 20; scheduler.wake(); await assert.rejects(queued.promise, /Stale task epoch or expiry/)
  gate.resolve(8); await assert.rejects(running.promise, /Stale task result discarded/); await flush(); assert.equal(coordinator.resources.activeHeavyJobs, 0); scheduler.dispose()
})
await check('task-and-byte-backpressure', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4, { maxQueueTasks: 8, maxQueueBytes: 1024 * 1024 }), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred()
  const tasks = Array.from({ length: 8 }, (_, index) => scheduler.schedule(descriptor(`bounded-${index}`), () => gate.promise))
  assert.throws(() => scheduler.schedule(descriptor('overflow'), () => 0), /capacity/)
  for (const task of tasks) task.promise.catch(() => {})
  scheduler.cancelAll(); gate.resolve(0); await flush(); assert.equal(scheduler.state.inputBytes, 0)
  assert.throws(() => scheduler.schedule(descriptor('bytes', { inputBytes: 1024 * 1024 + 1 }), () => 0), /capacity/); scheduler.dispose()
})
await check('stale-epoch-and-failed-dependency-reject-once', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 4), scheduler = new BudgetedWorkScheduler(coordinator), gate = deferred()
  const active = scheduler.schedule(descriptor('old-active'), () => gate.promise); active.promise.catch(() => {})
  const dependent = scheduler.schedule(descriptor('dependent', { dependencies: [active.id] }), () => assert.fail('stale dependent cannot execute')); dependent.promise.catch(() => {})
  coordinator.advanceEpoch(); await assert.rejects(dependent.promise, /Stale/); gate.resolve(9); await assert.rejects(active.promise, /Stale/); await flush()
  assert.equal(coordinator.resources.activeHeavyJobs, 0); scheduler.dispose()
})
await check('pressure-hysteresis-does-not-change-visual-quality', () => {
  const coordinator = new PerformanceCoordinator(() => 0, 8)
  const sample = observedAtMs => ({ observedAtMs, framePeriodMs: 16.667, ownerCpuP95Ms: 25, inputQueueP95Ms: 30, gpuP95Ms: null, backgroundContended: true })
  coordinator.observe(sample(1000)); coordinator.observe(sample(2000)); assert.equal(coordinator.snapshot.heavyJobAdmissionLimit, 2)
  coordinator.observe(sample(3000)); assert.equal(coordinator.snapshot.heavyJobAdmissionLimit, 1)
  for (let ms = 4000; ms <= 14000; ms += 1000) coordinator.observe({ ...sample(ms), backgroundContended: false })
  assert.equal(coordinator.snapshot.heavyJobAdmissionLimit, 2); assert.equal(coordinator.snapshot.qualityRevision, 0)
  assert.equal(coordinator.snapshot.framePeriodEstimateMs, 16.667)
})
const { installPressureObservationFeed } = await load('pressure')
await check('production-pressure-feed-is-passive-bounded-and-cleans-up', () => {
  const coordinator = new PerformanceCoordinator(() => 0, 8)
  let listener, unsubscribeCount = 0, overlap = true
  const dispose = installPressureObservationFeed(coordinator, callback => { listener = callback; return () => unsubscribeCount++ }, () => overlap)
  const sample = { cpuFrameMs: 25, rafIntervalMs: 16.667, submissionIntervalMs: null, inputToSubmitMs: null, gpuMs: null }
  for (let at = 0; at <= 3200; at += 100) listener(sample, at)
  assert.equal(coordinator.snapshot.heavyJobAdmissionLimit, 1); assert.equal(coordinator.snapshot.qualityRevision, 0)
  overlap = false
  for (let at = 3300; at <= 15000; at += 100) listener(sample, at)
  assert.equal(coordinator.snapshot.heavyJobAdmissionLimit, 2)
  coordinator.setMode('hidden'); const revision = coordinator.snapshot.revision
  listener(sample, 16000); listener(sample, 19000); assert.equal(coordinator.snapshot.revision, revision)
  dispose(); dispose(); assert.equal(unsubscribeCount, 1); listener(sample, 20000); assert.equal(coordinator.snapshot.revision, revision)
})
await check('hidden-optional-work-pauses-required-work-continues', async () => {
  const coordinator = new PerformanceCoordinator(() => 0, 8), scheduler = new BudgetedWorkScheduler(coordinator)
  coordinator.setMode('hidden')
  const optional = scheduler.schedule(descriptor('hidden', { workClass: 'background' }), () => 1)
  const required = scheduler.schedule(descriptor('save'), () => 2); assert.equal(await required.promise, 2)
  assert.equal(scheduler.state.queued, 1); coordinator.setMode('interactive'); assert.equal(await optional.promise, 1); scheduler.dispose()
})
await check('wall-cost-includes-preparation-and-merge-not-summed-cpu', async () => {
  let now = 10
  const coordinator = new PerformanceCoordinator(() => now, 4), scheduler = new BudgetedWorkScheduler(coordinator)
  const task = scheduler.schedule(descriptor('cost', { requestedAtMs: 0 }), context => {
    context.reportPhases({ postMessageMs: 1, workerExecutionMs: 5, transportAndReturnMs: 1, mergeMs: 1 }); now = 18; return 7
  })
  assert.equal(await task.promise, 7)
  const trace = scheduler.trace[0]; assert.equal(trace.preparationMs, 10); assert.equal(trace.executionAndMergeMs, 8); assert.equal(trace.wallMsIncludingPreparation, 18)
  assert.equal(trace.phases.mergeMs, 1); scheduler.dispose()
})

class ControlledWorker {
  static instances = []
  messages = []; onmessage = null; onerror = null; terminated = false
  constructor() { ControlledWorker.instances.push(this) }
  postMessage(message) { this.messages.push(message) }
  terminate() { this.terminated = true }
  reply(message, result) { this.onmessage?.({ data: { id: message.id, lease: message.lease, result } }) }
}
globalThis.Worker = ControlledWorker
performanceCoordinator.configure({}, 8)
const jobs = await load('jobs')
await check('production-queued-cancellation-is-removed-immediately', async () => {
  const first = jobs.scheduleJob('hash', 'running'), blocker = jobs.scheduleJob('hash', 'blocker')
  first.promise.catch(() => {}); blocker.promise.catch(() => {})
  const queued = jobs.scheduleJob('hash', 'queued'); queued.cancel(); await assert.rejects(queued.promise, /cancelled/)
  assert.equal(jobs.jobSchedulerState.queued, 0, JSON.stringify({ state: jobs.jobSchedulerState, budget: performanceCoordinator.snapshot, workers: ControlledWorker.instances.length }))
  first.cancel(); blocker.cancel(); await flush()
})
await check('production-worker-cancellation-and-retired-replies', async () => {
  const first = jobs.scheduleJob('hash', 'old'), worker = ControlledWorker.instances.at(-1), message = worker.messages[0], handler = worker.onmessage
  first.promise.catch(() => {}); first.cancel(); await assert.rejects(first.promise, /cancelled/); await flush()
  assert.equal(worker.terminated, true); assert.equal(performanceCoordinator.resources.activeHeavyJobs, 0)
  const next = jobs.scheduleJob('hash', 'new'), current = ControlledWorker.instances.at(-1), currentMessage = current.messages.at(-1)
  const staleBefore = jobs.jobSchedulerState.stale; handler({ data: { id: message.id, lease: message.lease, result: 'late' } })
  assert.equal(jobs.jobSchedulerState.stale, staleBefore + 1); assert.equal(jobs.jobSchedulerState.active, 1)
  current.reply(currentMessage, jobs.runJobLocally('hash', 'new')); assert.equal(await next.promise, jobs.runJobLocally('hash', 'new'))
})
await check('production-job-key-generations-are-checked-before-commit', async () => {
  const old = jobs.scheduleJob('hash', 'a', { key: 'source' }); old.promise.catch(() => {})
  const current = jobs.scheduleJob('hash', 'b', { key: 'source' })
  for (const worker of ControlledWorker.instances) for (const message of worker.messages) if (!worker.terminated && [old.id, current.id].includes(message.id)) worker.reply(message, jobs.runJobLocally(message.kind, message.payload))
  await assert.rejects(old.promise, /Stale/); assert.equal(await current.promise, jobs.runJobLocally('hash', 'b'))
})
await check('older-explicit-generation-cannot-invalidate-live-newer-job', async () => {
  const current = jobs.scheduleJob('hash', 'newer', { key: 'explicit-source', generation: 4 })
  assert.throws(() => jobs.scheduleJob('hash', 'older', { key: 'explicit-source', generation: 3 }), /Stale job generation/)
  const worker = ControlledWorker.instances.find(item => !item.terminated && item.messages.some(message => message.id === current.id))
  const message = worker.messages.find(item => item.id === current.id); worker.reply(message, jobs.runJobLocally('hash', 'newer'))
  assert.equal(await current.promise, jobs.runJobLocally('hash', 'newer'))
  const next = jobs.scheduleJob('hash', 'next', { key: 'explicit-source' }); current.cancel()
  const nextWorker = ControlledWorker.instances.find(item => !item.terminated && item.messages.some(item => item.id === next.id))
  nextWorker.reply(nextWorker.messages.find(item => item.id === next.id), jobs.runJobLocally('hash', 'next'))
  assert.equal(await next.promise, jobs.runJobLocally('hash', 'next'))
})
await check('terminal-revision-key-memory-is-bounded', async () => {
  for (let index = 0; index < 2050; index++) {
    const job = jobs.scheduleJob('hash', 'x', { key: `bounded-source-${index}` })
    const worker = ControlledWorker.instances.find(item => !item.terminated && item.messages.some(message => message.id === job.id))
    worker.reply(worker.messages.find(item => item.id === job.id), jobs.runJobLocally('hash', 'x')); await job.promise
  }
  const diagnostics = jobs.jobSchedulerOwnershipDiagnostics()
  assert.equal(diagnostics.retainedRevisionKeys, 2048); assert.equal(diagnostics.referencedRevisionKeys, 0); assert.equal(diagnostics.activeWorkerJobs, 0)
})
await check('large-valid-input-bound-does-not-overflow-default-output-reservation', async () => {
  const job = jobs.scheduleJob('hash', 'small-actual-fixture', { inputBytes: 256 * 1024 * 1024 })
  assert.equal(performanceCoordinator.resources.outputBytesReserved, performanceCoordinator.config.maxOutputBytes)
  const worker = ControlledWorker.instances.find(item => !item.terminated && item.messages.some(message => message.id === job.id))
  worker.reply(worker.messages.find(item => item.id === job.id), jobs.runJobLocally('hash', 'small-actual-fixture'))
  assert.equal(await job.promise, jobs.runJobLocally('hash', 'small-actual-fixture'))
  assert.equal(performanceCoordinator.resources.outputBytesReserved, 0)
})
await check('explicit-serial-executor-shares-admission-with-worker-without-retiring-it', async () => {
  const running = jobs.scheduleJob('hash', 'worker-in-flight')
  const worker = ControlledWorker.instances.find(item => !item.terminated && item.messages.some(message => message.id === running.id))
  const message = worker.messages.find(item => item.id === running.id)
  const createdBefore = ControlledWorker.instances.length, fallbackBefore = jobs.jobSchedulerState.fallbackCount, serialBefore = jobs.jobSchedulerState.serialCount
  const order = [], serial = jobs.scheduleJob('parseJson', '{"value":17}', { executor: 'serial' })
  serial.promise.then(() => order.push('finished')); order.push('scheduled'); await Promise.resolve(); order.push('microtask')
  assert.equal(performanceCoordinator.resources.activeHeavyJobs, 2)
  assert.equal(jobs.jobSchedulerOwnershipDiagnostics().activeSerialJobs, 1)
  assert.deepEqual(await serial.promise, { value: 17 }); assert.deepEqual(order, ['scheduled', 'microtask', 'finished'])
  assert.equal(ControlledWorker.instances.length, createdBefore); assert.equal(worker.terminated, false)
  assert.equal(jobs.jobSchedulerState.fallbackCount, fallbackBefore); assert.equal(jobs.jobSchedulerState.serialCount, serialBefore + 1)
  assert.equal(jobs.jobSchedulerState.workerMs, 0); assert(jobs.jobSchedulerState.serialMs >= 0)
  const trace = auxiliaryWork.trace.find(item => item.id === serial.id)
  assert.equal(trace.phases.workerExecutionMs, null); assert.equal(trace.phases.postMessageMs, null); assert.equal(trace.phases.transportAndReturnMs, null)
  assert(trace.phases.localExecutionMs >= 0); assert.equal(trace.cancelStrategy, 'discard-after-completion')
  assert.equal(performanceCoordinator.resources.activeHeavyJobs, 1)
  worker.reply(message, jobs.runJobLocally(message.kind, message.payload)); await running.promise
})
await check('explicit-serial-cancel-and-new-epoch-never-merge-and-settle-once', async () => {
  let merged = 0, terminal = 0
  const createdBefore = ControlledWorker.instances.length
  const cancelled = jobs.scheduleJob('parseJson', '{"cancelled":true}', { executor: 'serial', key: 'serial-cancel', merge: () => ++merged })
  cancelled.promise.then(() => terminal++, () => terminal++); cancelled.cancel(); cancelled.cancel()
  await assert.rejects(cancelled.promise, /cancelled/); await flush()
  const stale = jobs.scheduleJob('parseJson', '{"stale":true}', { executor: 'serial', key: 'serial-epoch', merge: () => ++merged })
  stale.promise.then(() => terminal++, () => terminal++); performanceCoordinator.advanceEpoch()
  await assert.rejects(stale.promise, /Stale/); await flush()
  assert.equal(merged, 0); assert.equal(terminal, 2); assert.equal(ControlledWorker.instances.length, createdBefore)
  assert.equal(performanceCoordinator.resources.activeHeavyJobs, 0); assert.equal(jobs.jobSchedulerOwnershipDiagnostics().activeSerialJobs, 0)
  assert.equal(jobs.jobSchedulerOwnershipDiagnostics().referencedRevisionKeys, 0)
})
await check('serial-lane-revision-and-byte-guards-preserve-latest-only-merge', async () => {
  const merged = []
  const old = jobs.scheduleJob('parseJson', '{"revision":1}', { executor: 'serial', key: 'serial-latest', merge: value => { merged.push(value.revision); return value } })
  old.promise.catch(() => {})
  const latest = jobs.scheduleJob('parseJson', '{"revision":2}', { executor: 'serial', key: 'serial-latest', merge: value => { merged.push(value.revision); return value } })
  assert.equal(jobs.jobSchedulerOwnershipDiagnostics().activeSerialJobs, 1)
  await assert.rejects(old.promise, /Stale/); assert.deepEqual(await latest.promise, { revision: 2 }); assert.deepEqual(merged, [2])
  const oversized = jobs.scheduleJob('parseJson', '"' + 'x'.repeat(100) + '"', { executor: 'serial', outputBytes: 8, merge: () => assert.fail('Oversized result must not merge') })
  await assert.rejects(oversized.promise, /byte|bound|limit/i); await flush()
  assert.equal(performanceCoordinator.resources.activeHeavyJobs, 0); assert.equal(performanceCoordinator.resources.outputBytesReserved, 0)
})
await check('invalid-executor-does-not-retain-a-revision-or-admission', () => {
  const before = jobs.jobSchedulerOwnershipDiagnostics()
  assert.throws(() => jobs.scheduleJob('hash', 'x', { executor: 'unknown', key: 'bad-executor' }), /Invalid job executor/)
  assert.deepEqual(jobs.jobSchedulerOwnershipDiagnostics(), before); assert.equal(performanceCoordinator.resources.activeHeavyJobs, 0)
})
await check('production-serial-fallback-yields-real-task', async () => {
  jobs.shutdownJobScheduler(); await flush(); jobs.jobSchedulerState.workerAvailable = false
  const order = [], job = jobs.scheduleJob('parseJson', '{"value":17}')
  job.promise.then(() => order.push('finished')); order.push('scheduled'); await Promise.resolve(); order.push('microtask')
  assert.deepEqual(await job.promise, { value: 17 }); assert.deepEqual(order, ['scheduled', 'microtask', 'finished']); jobs.shutdownJobScheduler(); await flush()
})
assert.equal(auxiliaryWork.state.activeHeavyJobs, 0)
const sources = ['src/runtime/performance/coordinator.ts', 'src/runtime/performance/workScheduler.ts', 'src/runtime/performance/services.ts', 'src/runtime/performance/pressureFeed.ts', 'src/runtime/jobScheduler.ts', 'src/assets/importPipeline.ts']
const report = { schemaVersion: 1, status: 'VERIFIED_FUNCTIONAL_HOST_TESTS', performanceQualification: 'NOT_TESTED', generatedAt: new Date().toISOString(), tests,
  sourceHashes: await Promise.all(sources.map(async path => ({ path, sha256: createHash('sha256').update(await readFile(join(root, path))).digest('hex') }))), dependencyModules: [...modules], productionTrace: auxiliaryWork.trace,
  limits: ['Controllable-clock/Worker host tests prove logic, not real GPU, H1/H2, B0–B8 or X01–X15 performance.', 'Byte reservations are conservative policy accounting, not measured JS heap/physical memory guarantees.', 'Formal mixed asset/job browser qualification is a separate run.'] }
const output = join(root, process.argv.find(value => value.startsWith('--report='))?.slice(9) ?? '.cache/engine-overhaul/scheduler-functional.json')
await mkdir(join(root, '.cache/engine-overhaul'), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ passed: tests.length, report: output }))
