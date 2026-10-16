import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = process.cwd(), out = await mkdtemp(join(tmpdir(), 'nova-engine-assets-')), tests = []
class ControlledWorker {
  static instances = []
  messages = []; onmessage = null; onerror = null; terminated = false
  constructor() { ControlledWorker.instances.push(this) }
  postMessage(message) {
    this.messages.push(message)
    if (message.bytes) queueMicrotask(() => {
      if (!this.terminated) { const sourceHash = createHash('sha256').update(new Uint8Array(message.bytes)).digest('hex'); this.onmessage?.({ data: { sourceHash, cacheKey: sourceHash } }) }
    })
  }
  reply(message, result) { this.onmessage?.({ data: { id: message.id, lease: message.lease, result } }) }
  terminate() { this.terminated = true }
}
globalThis.Worker = ControlledWorker
globalThis.FileReader = class {
  result = null; error = null; onload = null; onerror = null
  readAsDataURL(blob) { void blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload?.() }, error => { this.error = error; this.onerror?.() }) }
}
await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: out, emptyOutDir: false,
  rollupOptions: { input: { imports: join(root, 'src/assets/importPipeline.ts'), defaults: join(root, 'src/assets/types.ts'), jobs: join(root, 'src/runtime/jobScheduler.ts'), services: join(root, 'src/runtime/performance/services.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
const load = name => import(pathToFileURL(join(out, `${name}.mjs`)).href)
const { performanceCoordinator, auxiliaryWork } = await load('services')
performanceCoordinator.configure({}, 4)
const imports = await load('imports'), jobs = await load('jobs'), { defaultImportSettings } = await load('defaults')
globalThis.window = { setTimeout(callback, ms) { const timer = setTimeout(callback, ms); timer.unref(); return timer } }
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve() }
const check = async (name, execute) => { await execute(); tests.push({ name, status: 'PASS' }) }
const workerFor = id => ControlledWorker.instances.find(worker => !worker.terminated && worker.messages.some(message => message.kind && message.id === id))
await check('real-import-and-job-executors-share-one-admission', async () => {
  const blocker = jobs.scheduleJob('hash', 'blocking'), worker = workerFor(blocker.id), message = worker.messages.find(item => item.id === blocker.id)
  const text = '{"nova":37}', file = new File([text], 'source.json', { type: 'application/json' })
  const importing = imports.processAssetImport(file, defaultImportSettings())
  assert.equal(auxiliaryWork.state.active, 1); assert.equal(auxiliaryWork.counts('asset').queued, 1)
  assert.equal(imports.importPipelineState.jobs.at(-1).status, 'queued')
  worker.reply(message, jobs.runJobLocally('hash', 'blocking')); await blocker.promise
  const artifact = await importing
  assert.equal(artifact.metadata.sourceHash, createHash('sha256').update(text).digest('hex'))
  assert.equal(Buffer.from(artifact.bytes).toString(), text); assert.equal(artifact.metadata.status, 'ready')
  await flush(); assert.equal(auxiliaryWork.state.activeHeavyJobs, 0)
})
await check('queued-import-cancellation-reclaims-count-and-bytes', async () => {
  const blocker = jobs.scheduleJob('hash', 'blocking-2'), worker = workerFor(blocker.id), message = worker.messages.find(item => item.id === blocker.id)
  const controller = new AbortController(), file = new File(['cancel'], 'cancel.txt')
  const importing = imports.processAssetImport(file, defaultImportSettings(), { signal: controller.signal })
  controller.abort(); await assert.rejects(importing, /cancelled/)
  assert.equal(auxiliaryWork.counts('asset').queued, 0); assert.equal(auxiliaryWork.state.inputBytes, 'blocking-2'.length * 2)
  worker.reply(message, jobs.runJobLocally('hash', 'blocking-2')); await blocker.promise; await flush()
})
await check('running-uninterruptible-read-holds-lease-until-actual-return', async () => {
  let resolveRead
  const read = new Promise(resolve => { resolveRead = resolve })
  const file = new File(['slow'], 'slow.txt')
  Object.defineProperty(file, 'stream', { value: undefined }); Object.defineProperty(file, 'arrayBuffer', { value: () => read })
  const controller = new AbortController(), importing = imports.processAssetImport(file, defaultImportSettings(), { signal: controller.signal })
  importing.catch(() => {}); controller.abort(); await assert.rejects(importing, /cancelled/)
  assert.equal(auxiliaryWork.state.activeHeavyJobs, 1, 'Abort must not pretend an outstanding read completed')
  resolveRead(new TextEncoder().encode('slow').buffer); await flush(); assert.equal(auxiliaryWork.state.activeHeavyJobs, 0)
})
await check('actual-project-import-session-rejects-independent-old-jobs', async () => {
  const epoch = performanceCoordinator.snapshot.sessionEpoch, job = jobs.scheduleJob('parseJson', '{"old":true}'), worker = workerFor(job.id), message = worker.messages.find(item => item.id === job.id), handler = worker.onmessage
  job.promise.catch(() => {}); imports.clearAssetImportSession(); await assert.rejects(job.promise, /cancelled|stale/i); await flush()
  assert.equal(performanceCoordinator.snapshot.sessionEpoch, epoch + 1); assert.equal(worker.terminated, true)
  handler?.({ data: { id: message.id, lease: message.lease, result: { old: true } } })
  assert.equal(auxiliaryWork.state.activeHeavyJobs, 0); assert.equal(auxiliaryWork.state.inputBytes, 0)
})
await check('pure-result-merge-includes-reservation-and-measured-wall-cost', async () => {
  jobs.jobSchedulerState.workerAvailable = false
  const job = jobs.scheduleJob('parseJson', '{"value":5}', { merge: parsed => { assert.equal(auxiliaryWork.state.activeHeavyJobs, 1); return { doubled: parsed.value * 2 } } })
  assert.deepEqual(await job.promise, { doubled: 10 }); await flush()
  const trace = auxiliaryWork.trace.at(-1)
  assert(trace.preparationMs >= 0); assert(trace.phases.mergeMs >= 0); assert(trace.phases.workerExecutionMs >= 0)
  assert(trace.wallMsIncludingPreparation >= trace.executionAndMergeMs); assert.equal(trace.status, 'completed')
})
await check('result-bounds-reject-without-leaking-reservation', async () => {
  const job = jobs.scheduleJob('parseJson', '{"value":"too large"}', { outputBytes: 8 })
  await assert.rejects(job.promise, /byte budget/); await flush(); assert.equal(auxiliaryWork.state.activeHeavyJobs, 0)
})
const sourcePaths = ['src/assets/importPipeline.ts', 'src/runtime/jobScheduler.ts', 'src/runtime/jobScheduler.worker.ts', 'src/runtime/performance/workScheduler.ts', 'src/runtime/performance/byteBounds.ts', 'src/runtime/dataResources.ts']
const report = { schemaVersion: 1, scope: 'FUNCTIONAL_HOST_TESTS_WITH_CONTROLLED_WORKER_IO', tests, traces: auxiliaryWork.trace,
  sources: await Promise.all(sourcePaths.map(async path => ({ path, sha256: createHash('sha256').update(await readFile(join(root, path))).digest('hex') }))),
  limitations: ['Runs actual import pipeline and job executor with controlled Worker and FileReader responses.', 'No claim about real Worker throughput, mixed GUI latency, H1/H2, physical heap or formal benchmarks.', 'Wall time includes preparation, queue and executor/merge; individual missing transport timings remain null.'] }
await mkdir(join(root, '.cache/engine-overhaul'), { recursive: true })
const reportPath = join(root, '.cache/engine-overhaul/asset-admission-functional.json'); await writeFile(reportPath, JSON.stringify(report, null, 2))
jobs.shutdownJobScheduler(); console.log(JSON.stringify({ passed: tests.length, report: reportPath }))
