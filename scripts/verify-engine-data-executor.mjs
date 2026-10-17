import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = process.cwd(), out = await mkdtemp(join(tmpdir(), 'nova-data-executor-')), tests = []
class ControlledWorker {
  static instances = []
  messages = []; onmessage = null; onerror = null; terminated = false
  constructor() { ControlledWorker.instances.push(this) }
  postMessage(message) { this.messages.push(message) }
  terminate() { this.terminated = true }
}
globalThis.Worker = ControlledWorker
await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: out, emptyOutDir: false,
  rollupOptions: { input: { data: join(root, 'src/runtime/dataResources.ts'), jobs: join(root, 'src/runtime/jobScheduler.ts'), worker: join(root, 'src/runtime/jobScheduler.worker.ts'), services: join(root, 'src/runtime/performance/services.ts') },
    output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
const load = name => import(pathToFileURL(join(out, name + '.mjs')).href)
const { performanceCoordinator, auxiliaryWork } = await load('services')
performanceCoordinator.configure({}, 8)
const jobs = await load('jobs'), data = await load('data')
let respondingWorker
globalThis.self = { postMessage: reply => respondingWorker.onmessage?.({ data: reply }) }
await load('worker')
const reply = message => {
  respondingWorker = ControlledWorker.instances.find(worker => !worker.terminated && worker.messages.includes(message))
  assert(respondingWorker); globalThis.self.onmessage({ data: message })
}
const flush = async () => { for (let index = 0; index < 12; index++) await Promise.resolve() }
const check = async (name, execute) => { await execute(); tests.push({ name, status: 'PASS' }) }
const schema = data.normalizeDataSchema({ name: 'ExecutorFixture', keyField: 'id', fields: [
  { name: 'id', type: 'string', required: true, default: '' }, { name: 'count', type: 'integer', required: true, default: 0 },
  { name: 'enabled', type: 'boolean', default: false }, { name: 'payload', type: 'json', default: null }
] })
const rows = [{ id: 'a', count: '2.6', enabled: '1', payload: '{"x":2}' }, { id: 'a', count: 'invalid', enabled: 'false', payload: '[3]' }, { id: '', count: '', enabled: true, payload: null }]
const expected = { rows: [{ id: 'a', count: 3, enabled: true, payload: { x: 2 } }, { id: 'a', count: 'invalid', enabled: false, payload: [3] }, { id: '', count: 0, enabled: true, payload: null }],
  issues: [{ row: 2, field: 'count', message: 'integer value is invalid' }, { row: 2, field: 'id', message: 'Key value is duplicated' }, { row: 3, field: 'id', message: 'Required value is missing' }] }

for (const [type, document] of [['json', rows], ['json', { rows }], ['database', { records: rows }]]) {
  await check(type + '-default-serial-preserves-conversion-and-validation', async () => {
    const source = JSON.stringify(document), before = ControlledWorker.instances.length, serialBefore = jobs.jobSchedulerState.serialCount, fallbackBefore = jobs.jobSchedulerState.fallbackCount
    const importing = data.importDataText(source, type, schema)
    await Promise.resolve(); assert.equal(jobs.jobSchedulerOwnershipDiagnostics().activeSerialJobs, 1)
    assert.deepEqual(await importing, expected); assert.equal(ControlledWorker.instances.length, before)
    assert.equal(jobs.jobSchedulerState.serialCount, serialBefore + 1); assert.equal(jobs.jobSchedulerState.fallbackCount, fallbackBefore)
    assert.equal(jobs.jobSchedulerState.workerAvailable, true); assert.equal(jobs.jobSchedulerState.workerMs, 0)
  })
}
await check('explicit-auto-experiment-still-uses-original-module-worker-algorithm', async () => {
  const importing = data.importDataText(JSON.stringify(rows), 'json', schema, { executor: 'auto' })
  const message = ControlledWorker.instances.at(-1).messages.at(-1)
  assert.equal(message.kind, 'parseJson'); assert.equal(jobs.jobSchedulerOwnershipDiagnostics().activeWorkerJobs, 1)
  reply(message); assert.deepEqual(await importing, expected)
})
await check('csv-default-keeps-worker-policy-quoting-and-field-validation', async () => {
  const importing = data.importDataText('id,count,enabled,payload\r\n"a,b",2.6,1,"{""x"":2}"\r\n', 'csv', schema)
  const message = ControlledWorker.instances.at(-1).messages.at(-1); assert.equal(message.kind, 'parseCsv')
  reply(message); assert.deepEqual(await importing, { rows: [{ id: 'a,b', count: 3, enabled: true, payload: { x: 2 } }], issues: [] })
})
await check('csv-explicit-serial-remains-equivalent-without-new-worker', async () => {
  const before = ControlledWorker.instances.length
  assert.deepEqual(await data.importDataText('id,count,enabled,payload\na,2,true,[3]', 'csv', schema, { executor: 'serial' }), { rows: [{ id: 'a', count: 2, enabled: true, payload: [3] }], issues: [] })
  assert.equal(ControlledWorker.instances.length, before)
})
await check('invalid-json-fails-and-releases-original-queue-reservations', async () => {
  await assert.rejects(data.importDataText('{invalid', 'json', schema), /JSON|property|position/i); await flush()
  assert.equal(auxiliaryWork.state.activeHeavyJobs, 0); assert.equal(auxiliaryWork.state.inputBytes, 0)
  assert.equal(performanceCoordinator.resources.scratchBytesReserved, 0); assert.equal(performanceCoordinator.resources.outputBytesReserved, 0)
})
await check('epoch-change-rejects-queued-data-import-before-authoring-commit', async () => {
  performanceCoordinator.configure({}, 4)
  const blocker = jobs.scheduleJob('hash', 'block-data-import'), message = ControlledWorker.instances.at(-1).messages.at(-1)
  blocker.promise.catch(() => {})
  const importing = data.importDataText(JSON.stringify(rows), 'database', schema); importing.catch(() => {})
  assert.equal(auxiliaryWork.state.activeHeavyJobs, 1); assert.equal(auxiliaryWork.state.queued, 1)
  performanceCoordinator.advanceEpoch(); await assert.rejects(importing, /Stale/)
  reply(message); await assert.rejects(blocker.promise, /Stale/); await flush()
  assert.equal(auxiliaryWork.state.activeHeavyJobs, 0); assert.equal(auxiliaryWork.state.inputBytes, 0)
})
jobs.shutdownJobScheduler(); await flush()
assert.equal(jobs.jobSchedulerOwnershipDiagnostics().createdWorkers, 0)
assert.equal(performanceCoordinator.resources.activeHeavyJobs, 0)
const sources = ['src/runtime/dataResources.ts', 'src/runtime/jobScheduler.ts', 'src/runtime/jobScheduler.worker.ts', 'src/runtime/performance/workScheduler.ts', 'src/runtime/performance/coordinator.ts', 'scripts/verify-engine-data-executor.mjs']
const report = { status: 'VERIFIED_FUNCTIONAL_CONTROLLED_HOST', generatedAt: new Date().toISOString(), tests,
  sourceHashes: await Promise.all(sources.map(async path => ({ path, sha256: createHash('sha256').update(await readFile(join(root, path))).digest('hex') }))), productionTrace: auxiliaryWork.trace,
  limitations: ['Controlled workers exercise the original worker handler, not real browser transport timing.', 'Real Worker cost evidence is the separately frozen a95075 exploration; these new source hashes do not relabel those measurements.', 'Serial parsing/normalization remain non-preemptible JS phases. Input long-tail/H1/H2/physical heap are NOT_TESTED.', 'DataResources still imports authoring AssetDatabase; this is an executor repair, not a pure Runtime boundary claim.'] }
const output = join(root, process.argv.find(value => value.startsWith('--report='))?.slice(9) ?? '.cache/engine-overhaul/data-serial-functional.json')
await mkdir(dirname(output), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ passed: tests.length, report: output }))
