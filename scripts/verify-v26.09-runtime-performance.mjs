import assert from 'node:assert/strict'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2609-runtime-'))

class ControlledWorker {
  static instances = []
  onmessage = null
  onerror = null
  messages = []
  terminated = false

  constructor() { ControlledWorker.instances.push(this) }
  postMessage(message) { this.messages.push(message) }
  terminate() { this.terminated = true }
  reply(message, result, error) { this.onmessage?.({ data: { id: message.id, lease: message.lease, result, error } }) }
}

try {
  globalThis.Worker = ControlledWorker
  await build({
    configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
    build: {
      ssr: true, outDir: compiled, emptyOutDir: false,
      rollupOptions: {
        input: { jobs: join(root, 'src/runtime/jobScheduler.ts'), jobWorker: join(root, 'src/runtime/jobScheduler.worker.ts'), performance: join(root, 'src/runtime/largeWorldPerformance.ts') },
        output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' }
      }
    }
  })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const jobs = await load('jobs')
  const runtime = await load('performance')

  const posted = []
  globalThis.self = { postMessage: message => posted.push(message) }
  await load('jobWorker')
  const parityCases = [
    ['parseJson', '{"answer":42}'],
    ['parseCsv', 'name,value\nnova,26'],
    ['hash', 'Nova_A deterministic worker'],
    ['compare', { first: { value: 7 }, second: { value: 7 } }],
    ['sampleAnimation', { time: .25, keys: [{ time: 0, value: 0 }, { time: 1, value: 8 }] }],
    ['advanceParticles', { dt: .5, gravity: -2, particles: [{ x: 0, y: 0, vx: 4, vy: 2 }] }],
    ['buildSpatialGrid', { cellSize: 10, entries: [{ id: 'b', x: 1, y: 1 }, { id: 'a', x: 2, y: 2 }] }]
  ]
  for (let index = 0; index < parityCases.length; index++) {
    const [kind, payload] = parityCases[index]
    globalThis.self.onmessage({ data: { id: index + 1, lease: 100 + index, kind, payload } })
    const reply = posted.pop()
    assert.equal(reply.lease, 100 + index, 'worker replies must preserve their immutable lease')
    assert.deepEqual(reply.result, jobs.runJobLocally(kind, payload), `${kind} worker/fallback results must match`)
  }

  // Fill the bounded pool so the third job is guaranteed to remain queued.
  const first = jobs.scheduleJob('hash', 'running')
  const firstWorker = ControlledWorker.instances.at(-1)
  assert(firstWorker, 'the first job must use a worker')
  const firstMessage = firstWorker.messages[0]
  const blocker = jobs.scheduleJob('hash', 'blocker')
  blocker.promise.catch(() => {})
  const queued = jobs.scheduleJob('hash', 'queued')
  queued.cancel()
  await assert.rejects(queued.promise, /cancelled/i)
  assert.equal(jobs.jobSchedulerState.queued, 0, 'queued cancellation must remove the job immediately')
  blocker.cancel()
  await assert.rejects(blocker.promise, /cancelled/i)

  const staleBeforeCancel = jobs.jobSchedulerState.stale
  const retiredHandler = firstWorker.onmessage
  first.cancel()
  await assert.rejects(first.promise, /cancelled/i)
  assert.equal(firstWorker.terminated, true, 'running cancellation must retire its worker')
  assert.equal(jobs.jobSchedulerState.active, 0, 'running cancellation must settle immediately')

  const current = jobs.scheduleJob('sampleAnimation', { time: .25, keys: [{ time: 0, value: 0 }, { time: 1, value: 8 }] })
  const currentWorker = ControlledWorker.instances.at(-1)
  const currentMessage = currentWorker.messages[0]
  // Simulate a browser delivering an already-queued event from the retired
  // worker. Its old lease must not release or settle the current slot.
  retiredHandler?.({ data: { id: firstMessage.id, lease: firstMessage.lease, result: 'late' } })
  assert.equal(jobs.jobSchedulerState.stale, staleBeforeCancel + 1)
  assert.equal(jobs.jobSchedulerState.active, 1)
  currentWorker.reply(currentMessage, jobs.runJobLocally('sampleAnimation', currentMessage.payload))
  assert.equal(await current.promise, 2)

  const oldGeneration = jobs.scheduleJob('hash', 'old', { key: 'asset/source' })
  const oldWorker = ControlledWorker.instances.at(-1)
  const oldMessage = oldWorker.messages.at(-1)
  const newGeneration = jobs.scheduleJob('hash', 'new', { key: 'asset/source' })
  oldWorker.reply(oldMessage, jobs.runJobLocally('hash', oldMessage.payload))
  await assert.rejects(oldGeneration.promise, /stale/i)
  const generationWorker = ControlledWorker.instances.find(worker => worker.messages.some(message => message.id === newGeneration.id))
  const generationMessage = generationWorker.messages.find(message => message.id === newGeneration.id)
  generationWorker.reply(generationMessage, jobs.runJobLocally('hash', generationMessage.payload))
  assert.equal(await newGeneration.promise, jobs.runJobLocally('hash', 'new'))

  const timedOut = jobs.scheduleJob('hash', 'timeout', { timeoutMs: 100 })
  const timedOutWorker = ControlledWorker.instances.find(worker => worker.messages.some(message => message.id === timedOut.id))
  await assert.rejects(timedOut.promise, /timed out/i)
  assert.equal(timedOutWorker.terminated, true, 'timeout must retire rather than reuse a still-running worker')
  const afterTimeout = jobs.scheduleJob('hash', 'after-timeout')
  const replacementWorker = ControlledWorker.instances.find(worker => worker.messages.some(message => message.id === afterTimeout.id))
  assert.notEqual(replacementWorker, timedOutWorker, 'work after a timeout must receive a fresh worker lease')
  const replacementMessage = replacementWorker.messages.find(message => message.id === afterTimeout.id)
  replacementWorker.reply(replacementMessage, jobs.runJobLocally('hash', replacementMessage.payload))
  assert.equal(await afterTimeout.promise, jobs.runJobLocally('hash', 'after-timeout'))

  jobs.shutdownJobScheduler()
  jobs.jobSchedulerState.workerAvailable = false
  const order = []
  const fallback = jobs.scheduleJob('advanceParticles', { dt: .5, gravity: -2, particles: [{ x: 0, y: 0, vx: 4, vy: 2 }] })
  fallback.promise.then(() => order.push('job'))
  order.push('scheduled')
  await Promise.resolve()
  order.push('microtask')
  const fallbackResult = await fallback.promise
  assert.deepEqual(fallbackResult, jobs.runJobLocally('advanceParticles', { dt: .5, gravity: -2, particles: [{ x: 0, y: 0, vx: 4, vy: 2 }] }))
  assert.deepEqual(order, ['scheduled', 'microtask', 'job'], 'fallback must yield a browser task before doing work')
  jobs.shutdownJobScheduler()

  const scaleThresholds = new Map([
    [10_000, { coldMs: 1_500, warmP95Ms: 750, dirtyMs: 750, heapMiB: 192 }],
    [50_000, { coldMs: 4_000, warmP95Ms: 2_500, dirtyMs: 2_500, heapMiB: 512 }],
    [100_000, { coldMs: 8_000, warmP95Ms: 5_000, dirtyMs: 5_000, heapMiB: 896 }]
  ])
  const warmRounds = 8
  const percentile = (values, quantile) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * quantile) - 1]
  const updateHash = (hash, value) => {
    const text = `${value}\u0000`
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193) >>> 0
    return hash
  }
  const projectionChecksum = (entities, scheduler, fromScheduler) => {
    let hash = 0x811c9dc5
    for (let index = 0; index < entities.length; index++) {
      const entity = entities[index], position = fromScheduler ? scheduler.position(index) : entity.transform.position
      hash = updateHash(hash, entity.uuid)
      hash = updateHash(hash, position.x)
      hash = updateHash(hash, position.y)
    }
    for (const kind of ['Transform2D', 'Sprite2D', 'Collider2D']) {
      const indices = fromScheduler
        ? scheduler.indices(kind)
        : entities.flatMap((entity, index) => entity.componentMap.get(kind) && !entity.componentMap.get(kind).removed ? [index] : [])
      hash = updateHash(hash, kind)
      for (const index of indices) hash = updateHash(hash, index)
    }
    return hash.toString(16).padStart(8, '0')
  }
  const scaleResults = []
  for (const count of scaleThresholds.keys()) {
    const scans = { values: 0 }
    class CountingMap extends Map {
      values() { scans.values++; return super.values() }
    }
    let random = (0x9e3779b9 ^ count) >>> 0
    const entities = Array.from({ length: count }, (_, index) => {
      random = (Math.imul(random, 1_664_525) + 1_013_904_223) >>> 0
      const components = [['Transform2D', { kind: 'Transform2D', removed: false, enabled: true }]]
      if (index % 4 === 0) components.push(['Sprite2D', { kind: 'Sprite2D', removed: false, enabled: true }])
      if (index % 10 === 0) components.push(['Collider2D', { kind: 'Collider2D', removed: false, enabled: true }])
      return {
        uuid: `scale-${count}-entity-${index}`,
        enabled: index % 23 !== 0,
        transform: {
          position: { x: (random & 0xffff) - 32_768, y: ((random >>> 16) & 0xffff) - 32_768 },
          rotation: index % 360,
          scale: { x: 1 + (index % 5) / 10, y: 1 + (index % 7) / 10 }
        },
        componentMap: new CountingMap(components)
      }
    })
    const thresholds = scaleThresholds.get(count)
    const expectedComponentCount = count + Math.ceil(count / 4) + Math.ceil(count / 10)
    const heapBefore = process.memoryUsage().heapUsed
    const scheduler = new runtime.StableComponentScheduler()
    const coldStarted = performance.now()
    const cold = scheduler.synchronize(entities)
    const coldMs = performance.now() - coldStarted
    const heapDeltaBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore)
    const coldScans = scans.values
    assert.equal(cold.dirty, count, `${count}: cold synchronization must publish every entity`)
    assert.equal(cold.componentCount, expectedComponentCount, `${count}: every active component must be indexed`)
    assert(cold.allocations <= count + 16, `${count}: cold scheduler allocations must remain linear and bounded`)
    assert.equal(coldScans, count, `${count}: cold membership construction must scan each component map once`)
    assert.equal(scheduler.indices('Transform2D').length, count)
    assert.equal(scheduler.indices('Sprite2D').length, Math.ceil(count / 4))
    assert.equal(scheduler.indices('Collider2D').length, Math.ceil(count / 10))
    const expectedChecksum = projectionChecksum(entities, scheduler, false)
    const initialChecksum = projectionChecksum(entities, scheduler, true)
    assert.equal(initialChecksum, expectedChecksum, `${count}: typed scheduler projection must preserve deterministic world data`)

    const warmMs = []
    let warmAllocations = 0, warmDirty = 0
    for (let round = 0; round < warmRounds; round++) {
      const started = performance.now(), result = scheduler.synchronize(entities)
      warmMs.push(performance.now() - started)
      warmAllocations += result.allocations
      warmDirty += result.dirty
    }
    assert.equal(warmDirty, 0, `${count}: unchanged worlds must not report dirty entities`)
    assert.equal(warmAllocations, 0, `${count}: unchanged worlds must not allocate scheduler storage`)
    assert.equal(scans.values, coldScans, `${count}: unchanged worlds must not rescan component maps`)
    assert.equal(projectionChecksum(entities, scheduler, true), initialChecksum, `${count}: warm synchronization must be deterministic`)

    const probe = Math.floor(count * .61803398875)
    const originalX = entities[probe].transform.position.x
    entities[probe].transform.position.x = originalX + 17
    const dirtyStarted = performance.now(), dirty = scheduler.synchronize(entities), dirtyMs = performance.now() - dirtyStarted
    assert.equal(dirty.dirty, 1, `${count}: one transform edit must dirty exactly one entity`)
    assert.equal(dirty.allocations, 0, `${count}: transform-only edits must not allocate scheduler storage`)
    assert.equal(scans.values, coldScans, `${count}: transform-only edits must not rescan component maps`)
    assert.equal(scheduler.position(probe).x, originalX + 17)
    const mutatedChecksum = projectionChecksum(entities, scheduler, true)
    assert.notEqual(mutatedChecksum, initialChecksum, `${count}: a real edit must change the deterministic projection`)
    entities[probe].transform.position.x = originalX
    assert.equal(scheduler.synchronize(entities).dirty, 1)
    const restoredChecksum = projectionChecksum(entities, scheduler, true)
    assert.equal(restoredChecksum, initialChecksum, `${count}: restoring world data must restore its checksum`)

    assert(coldMs <= thresholds.coldMs, `${count}: cold synchronization ${coldMs.toFixed(2)}ms exceeds ${thresholds.coldMs}ms`)
    assert(percentile(warmMs, .95) <= thresholds.warmP95Ms, `${count}: warm p95 exceeds ${thresholds.warmP95Ms}ms`)
    assert(dirtyMs <= thresholds.dirtyMs, `${count}: dirty synchronization ${dirtyMs.toFixed(2)}ms exceeds ${thresholds.dirtyMs}ms`)
    assert(heapDeltaBytes <= thresholds.heapMiB * 1_048_576, `${count}: measured scheduler heap delta exceeds ${thresholds.heapMiB}MiB`)

    // Identity and remove/restore changes must also invalidate the membership
    // cache without turning every unchanged entity into work.
    const replacement = { kind: 'Transform2D', removed: false, enabled: true }
    entities[7].componentMap.set('Transform2D', replacement)
    scheduler.synchronize(entities)
    assert.equal(scans.values, coldScans + 1, `${count}: same-size replacement must rescan one map`)
    replacement.removed = true
    scheduler.synchronize(entities)
    assert.equal(scans.values, coldScans + 2, `${count}: remove state must rescan one map`)
    assert.equal(scheduler.indices('Transform2D').length, count - 1)

    scaleResults.push({
      entities: count,
      componentCount: expectedComponentCount,
      correctness: { indexedEntities: scheduler.count, transformIndexesAfterRemoval: count - 1, probe, restored: true },
      latencyMs: { cold: coldMs, warmAverage: warmMs.reduce((sum, value) => sum + value, 0) / warmMs.length, warmP95: percentile(warmMs, .95), dirty: dirtyMs },
      work: { coldDirty: cold.dirty, warmDirty, dirtyDirty: dirty.dirty, coldComponentMapScans: coldScans, warmComponentMapScans: 0, dirtyComponentMapScans: 0 },
      allocations: { coldScheduler: cold.allocations, warmScheduler: warmAllocations, dirtyScheduler: dirty.allocations, measuredHeapDeltaBytes: heapDeltaBytes },
      checksum: { initial: initialChecksum, mutated: mutatedChecksum, restored: restoredChecksum },
      thresholds
    })
  }

  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits/v26.09-runtime-performance.json'), `${JSON.stringify({
    format: 'nova-v26.09-runtime-performance-verification', version: 2, release: '26.09', engineVersion: '26.9.0', generatedAt: new Date().toISOString(),
    checks: ['worker-fallback-parity', 'immutable-job-leases', 'queued-cancellation', 'running-cancellation', 'timeout-worker-retirement', 'stale-reply-rejection', 'macrotask-fallback-yield', '10000-entity-scale-qualification', '50000-entity-scale-qualification', '100000-entity-scale-qualification'],
    metrics: { workerKinds: parityCases.length, unchangedSynchronizationsPerScale: warmRounds, scales: scaleResults },
    severity0Open: 0, severity1Open: 0, status: 'passed'
  }, null, 2)}\n`)
  console.log('Nova_A v26.09 focused runtime verification passed: cancellation, leases, fallback parity and 10k/50k/100k scale qualification.')
} finally {
  await rm(compiled, { recursive: true, force: true })
}
