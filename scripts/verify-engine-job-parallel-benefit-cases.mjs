/** Real production jobs and data-resource merge path; diagnostic workload generation only. */
import { configureJobScheduler, jobSchedulerOwnershipDiagnostics, jobSchedulerState, runJobLocally, scheduleJob, shutdownJobScheduler, subscribeJobScheduler } from '../src/runtime/jobScheduler'
import { auxiliaryWork, performanceCoordinator } from '../src/runtime/performance/services'
import { importDataText, normalizeDataSchema } from '../src/runtime/dataResources'

const task = () => new Promise(resolve => setTimeout(resolve, 0))
const assert = (value, message) => { if (!value) throw Error(message) }
const digest = async value => {
  const bytes = new TextEncoder().encode(typeof value === 'string' ? value : JSON.stringify(value))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return { sha256: Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join(''), bytes: bytes.byteLength }
}
const distribution = samples => {
  const ordered = [...samples].sort((a, b) => a - b), percentile = p => ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * p) - 1)]
  return { count: samples.length, medianMs: percentile(.5), p95Ms: percentile(.95), minMs: ordered[0], maxMs: ordered.at(-1), samplesMs: samples }
}

export async function runJobParallelBenefit(options) {
  const repetitions = options.repetitions ?? 5, rowsPerResource = options.rows ?? 12000, resourcesPerBatch = 6
  assert(repetitions >= 5 && repetitions <= 10, 'Exploration requires at least five and at most ten repeats')
  assert(rowsPerResource >= 1000 && rowsPerResource <= 50000, 'Bounded rows must be 1000..50000, below existing 100000-row cap')
  assert(options.fixture.entities.length > 0, 'Existing project fixture has no entities')
  const originalConfig = performanceCoordinator.config, originalSnapshot = performanceCoordinator.snapshot
  const originalHint = originalSnapshot.confidence === 'insufficient' ? null : navigator.hardwareConcurrency ?? null
  const actualHint = Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null
  const checks = [], samples = [], warmups = [], scenarios = [], smoke = [], cleanup = [], referenceBatches = []
  const publish = async (kind, payload) => { await options.publish?.({ kind, payload }) }
  const drained = async () => {
    for (let attempt = 0; attempt < 200; attempt++) {
      if (auxiliaryWork.state.active === 0 && auxiliaryWork.state.queued === 0 && jobSchedulerState.active === 0 && jobSchedulerState.queued === 0) return
      await task()
    }
    throw Error('Production scheduler failed bounded drainage')
  }
  const policy = helpers => {
    // Explicit exploration intervention: restore original policy in finally, never fake H.
    performanceCoordinator.configure({ ...originalConfig, benchmarkMode: 'quality-locked', maxComputeHelpers: helpers }, actualHint)
    configureJobScheduler({ maxWorkers: helpers, maxQueued: 64, timeoutMs: 60000 })
    return performanceCoordinator.snapshot
  }
  const stop = async () => { shutdownJobScheduler(); await drained(); assert(jobSchedulerOwnershipDiagnostics().createdWorkers === 0, 'Shutdown retained real workers') }
  const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: String(error.stack ?? error) }); throw error } }

  try {
    await check('Seven existing algorithms produce identical serial and native module-Worker protocol results', async () => {
      await stop(); const snapshot = policy(1)
      assert(snapshot.computeHelperLimit >= 1 && jobSchedulerState.workerAvailable, 'Actual browser module Worker unavailable')
      const cases = [
        ['parseJson', '{"rows":[{"id":"fixture","quoted":"a,b\\nvalue"}],"version":1}'],
        ['parseCsv', 'id,name\r\nfixture,"a,b"\r\nnext,"escaped ""quote"""\r\n'],
        ['hash', 'Nova actual project fixture checksum\u0000中文'],
        ['compare', { first: { fixture: options.fixture.entities[0] }, second: { fixture: options.fixture.entities[0] } }],
        ['sampleAnimation', { time: .25, keys: [{ time: 1, value: 4 }, { time: 0, value: 0 }] }],
        ['advanceParticles', { dt: .016, gravity: -9.8, particles: [{ x: 1, y: 2, vx: .3, vy: .4 }, { x: -1, y: 0, vx: -.2, vy: 1 }] }],
        ['buildSpatialGrid', { cellSize: 2, entries: [{ id: 'b', x: -1, y: 0 }, { id: 'a', x: -1, y: 0 }, { id: 'c', x: 4, y: 1 }] }]
      ]
      const fallbackBefore = jobSchedulerState.fallbackCount
      for (const [kind, payload] of cases) {
        const expected = await digest(runJobLocally(kind, payload)), result = await scheduleJob(kind, payload, { epoch: snapshot.sessionEpoch }).promise, actual = await digest(result)
        assert(expected.sha256 === actual.sha256, kind + ' native Worker output differs from actual serial algorithm')
        const trace = auxiliaryWork.trace.at(-1)
        assert(trace.status === 'completed' && trace.phases?.workerExecutionMs !== null, kind + ' had no real worker execution trace')
        smoke.push({ kind, inputHash: (await digest(payload)).sha256, resultHash: actual.sha256, trace })
      }
      assert(jobSchedulerState.fallbackCount === fallbackBefore && jobSchedulerOwnershipDiagnostics().createdWorkers === 1, 'Worker smoke silently used serial fallback')
      await stop()
    })
    await publish('smoke', smoke)

    const schema = normalizeDataSchema({ name: 'ExistingProjectEntityData', keyField: 'id', fields: [
      { name: 'id', type: 'string', required: true, default: '' }, { name: 'name', type: 'string', required: true, default: '' },
      { name: 'shape', type: 'string', default: '' }, { name: 'layer', type: 'integer', default: 1 },
      { name: 'mass', type: 'number', default: 0 }, { name: 'enabled', type: 'boolean', default: true },
      { name: 'x', type: 'number', default: 0 }, { name: 'y', type: 'number', default: 0 },
      { name: 'geometry', type: 'json', default: null }
    ] })
    const generate = type => {
      const started = performance.now(), texts = []
      const quote = value => '"' + String(value).replaceAll('"', '""') + '"'
      for (let resource = 0; resource < resourcesPerBatch; resource++) {
        const rows = Array.from({ length: rowsPerResource }, (_, index) => {
          const source = options.fixture.entities[index % options.fixture.entities.length]
          return { id: `resource${resource}-entity${index}`, name: source.name + (index % 17 === 0 ? ', "quoted"\nrow' : ''), shape: source.shapeType, layer: source.layer, mass: source.mass,
            enabled: index % 7 !== 0, x: source.transform.position.x, y: source.transform.position.y,
            geometry: source.vertices ?? { radiusX: source.radiusX, radiusY: source.radiusY } }
        })
        texts.push(type === 'json' ? JSON.stringify({ format: 'nova-data-table', version: 1, source: 'json', rows }) : schema.fields.map(field => field.name).join(',') + '\r\n' + rows.map(row => schema.fields.map(field => quote(field.type === 'json' ? JSON.stringify(row[field.name]) : row[field.name])).join(',')).join('\r\n'))
      }
      return { texts, buildInputMs: performance.now() - started }
    }
    const batch = async (scenario, helpers, temperature, repetition) => {
      await drained()
      const snapshot = performanceCoordinator.snapshot, lastId = auxiliaryWork.trace.at(-1)?.id ?? 0, beforeFallback = jobSchedulerState.fallbackCount
      const beforeOwner = jobSchedulerOwnershipDiagnostics(), peaks = { createdWorkers: beforeOwner.createdWorkers, activeWorkerJobs: 0, activeHeavyJobs: 0, scratchBytesReserved: 0, outputBytesReserved: 0, queuedTasks: 0, queuedInputBytes: 0 }
      const observe = () => {
        const jobs = jobSchedulerOwnershipDiagnostics(), work = auxiliaryWork.state
        peaks.createdWorkers = Math.max(peaks.createdWorkers, jobs.createdWorkers); peaks.activeWorkerJobs = Math.max(peaks.activeWorkerJobs, jobs.activeWorkerJobs)
        for (const name of ['activeHeavyJobs', 'scratchBytesReserved', 'outputBytesReserved']) peaks[name] = Math.max(peaks[name], work[name])
        peaks.queuedTasks = Math.max(peaks.queuedTasks, work.queued); peaks.queuedInputBytes = Math.max(peaks.queuedInputBytes, work.inputBytes)
      }
      const unsubscribe = [subscribeJobScheduler(observe), auxiliaryWork.subscribe(observe), performanceCoordinator.subscribe(observe)]
      let orderedResults, submissionMs, preparationMs, totalWallMs
      const started = performance.now()
      try {
        // Ready immutable text is the real import entry input; no invented per-entity worker task.
        const sources = scenario.texts.map(source => source)
        preparationMs = performance.now() - started
        // Freeze the auto-vs-zero-helper experiment after production imports gain a serial policy.
        const sendStarted = performance.now(), promises = sources.map(source => importDataText(source, scenario.type, schema, { executor: 'auto' }))
        submissionMs = performance.now() - sendStarted
        orderedResults = await Promise.all(promises)
        totalWallMs = performance.now() - started
      } finally { for (const dispose of unsubscribe) dispose() }
      await drained()
      const traces = auxiliaryWork.trace.filter(trace => trace.id > lastId)
      assert(traces.length === resourcesPerBatch && traces.every(trace => trace.status === 'completed'), 'Batch did not finish exactly six original production jobs')
      assert(orderedResults.every(result => result.rows.length === rowsPerResource && result.issues.length === 0), 'Real dataResources validation changed row count or reported issues')
      const outputHashes = []
      const validationStarted = performance.now()
      for (const result of orderedResults) outputHashes.push((await digest(result)).sha256)
      const verificationMsExcluded = performance.now() - validationStarted
      if (scenario.expectedHashes) assert(outputHashes.join(',') === scenario.expectedHashes.join(','), 'Fixed output hashes differ across helper count/temperature')
      else scenario.expectedHashes = outputHashes
      assert(peaks.activeHeavyJobs <= Math.max(1, snapshot.heavyJobAdmissionLimit), 'Global admission exceeded its actual policy')
      if (helpers > 0) assert(jobSchedulerState.fallbackCount === beforeFallback && peaks.activeWorkerJobs > 0, 'Parallel candidate silently used local fallback')
      else assert(peaks.activeWorkerJobs === 0 && jobSchedulerState.fallbackCount - beforeFallback === resourcesPerBatch, 'Zero-helper serial candidate created a Worker')
      const actualWorkerJobs = traces.filter(trace => trace.phases?.workerExecutionMs != null).length
      assert(actualWorkerJobs === (helpers > 0 ? resourcesPerBatch : 0), 'Actual Worker trace count disagrees with helper execution path')
      const sample = { scenario: scenario.type, helpersRequested: helpers, temperature, repetition, inputRows: rowsPerResource * resourcesPerBatch, resourcesPerBatch,
        totalWallMs, hostInputReferencePreparationMs: preparationMs, hostScheduleCallWallMs: submissionMs, stableCollectionMs: null,
        scope: 'Wall includes original scheduling preparation, real clone/post/queue/Worker or serial execution, original byte validation and original dataResources schema merge, Promise.all stable input-order collection. Ready immutable text creation/hashing is recorded separately; output hash verification is excluded. Per-job concurrent phases are not added to wall.',
        verificationMsExcluded, outputHashes, ownershipBefore: beforeOwner, peaks, ownershipAfter: jobSchedulerOwnershipDiagnostics(), schedulerAfter: auxiliaryWork.state, snapshot,
        actualWorkerJobs, fallbackJobs: jobSchedulerState.fallbackCount - beforeFallback, traces }
      await publish('sample', sample)
      return sample
    }

    for (const type of ['json', 'csv']) {
      const generated = generate(type), scenario = { type, ...generated }
      const inputHashes = []
      for (const text of scenario.texts) inputHashes.push(await digest(text))
      scenarios.push({ type, source: 'Existing tests/fixtures/v1_1_2_project.json entity fields expanded deterministically into six independent data-resource documents; original dataResources import and validation APIs.', rowsPerResource, resourcesPerBatch, fieldCount: schema.fields.length, buildInputMsExcluded: generated.buildInputMs, inputHashes, boundedProductionMaximumRows: 100000 })
      await publish('scenario', scenarios.at(-1))
      await stop(); policy(0)
      referenceBatches.push(await batch(scenario, 0, 'reference-not-sample', 0))
      await stop()
      // Balanced cold order: every candidate occupies every position over five repeats.
      for (let repeat = 0; repeat < repetitions; repeat++) for (let offset = 0; offset < 5; offset++) {
        const helpers = (repeat + offset) % 5
        await stop(); policy(helpers)
        samples.push(await batch(scenario, helpers, 'cold-worker-pool', repeat))
        await stop()
      }
      // Warm groups retain one real pool. All prewarm costs and group order remain visible.
      const warmOrder = type === 'json' ? [4, 2, 0, 3, 1] : [1, 3, 0, 2, 4]
      for (const helpers of warmOrder) {
        await stop(); policy(helpers)
        for (let warm = 0; warm < 2; warm++) warmups.push(await batch(scenario, helpers, 'warmup-not-sample', warm))
        for (let repeat = 0; repeat < repetitions; repeat++) samples.push(await batch(scenario, helpers, 'warm-reused-pool', repeat))
        await stop()
      }
    }
    await check('All candidates retain exact fixed inputs/results, required serial fallback and actual global admission', () => {
      assert(samples.length === 2 * 5 * 2 * repetitions, 'Missing requested cold/warm sample')
      assert(samples.every(sample => sample.schedulerAfter.active === 0 && sample.schedulerAfter.queued === 0 && sample.schedulerAfter.activeHeavyJobs === 0), 'Finished sample leaked global lease or queue')
    })
    await check('Real active worker cancellation and epoch rejection never merge stale output and release owners once', async () => {
      await stop(); policy(2)
      const payload = JSON.stringify(options.fixture).repeat(1500), snapshot = performanceCoordinator.snapshot
      let cancelSettlements = 0, cancelMerges = 0
      const cancelled = scheduleJob('hash', payload, { key: 'benefit-cancel', epoch: snapshot.sessionEpoch, merge: value => { cancelMerges++; return value } })
      const cancelledPromise = cancelled.promise.then(() => { cancelSettlements++; throw Error('Cancelled job resolved') }, error => { cancelSettlements++; return String(error) })
      assert(jobSchedulerOwnershipDiagnostics().activeWorkerJobs === 1, 'Cancellation did not hit a real active Worker lease')
      cancelled.cancel(); cancelled.cancel()
      const cancelResult = await cancelledPromise; await drained()
      assert(cancelSettlements === 1 && cancelMerges === 0 && /cancelled/i.test(cancelResult), 'Cancelled task merged or settled incorrectly')
      cleanup.push({ action: 'cancel-active-real-worker', settlements: cancelSettlements, merges: cancelMerges, result: cancelResult, owners: jobSchedulerOwnershipDiagnostics(), scheduler: auxiliaryWork.state })
      let epochSettlements = 0, epochMerges = 0
      const stale = scheduleJob('hash', payload, { key: 'benefit-epoch', epoch: performanceCoordinator.snapshot.sessionEpoch, merge: value => { epochMerges++; return value } })
      const stalePromise = stale.promise.then(() => { epochSettlements++; throw Error('Old epoch resolved') }, error => { epochSettlements++; return String(error) })
      assert(jobSchedulerOwnershipDiagnostics().activeWorkerJobs === 1, 'Epoch change did not hit real Worker execution')
      performanceCoordinator.advanceEpoch()
      const staleResult = await stalePromise; await drained()
      assert(epochSettlements === 1 && epochMerges === 0 && /stale/i.test(staleResult), 'Old epoch result merged or settled incorrectly')
      cleanup.push({ action: 'advance-epoch-active-real-worker', settlements: epochSettlements, merges: epochMerges, result: staleResult, owners: jobSchedulerOwnershipDiagnostics(), scheduler: auxiliaryWork.state })
      await stop()
      assert(auxiliaryWork.state.activeHeavyJobs === 0 && auxiliaryWork.state.inputBytes === 0 && auxiliaryWork.state.scratchBytesReserved === 0 && auxiliaryWork.state.outputBytesReserved === 0 && jobSchedulerOwnershipDiagnostics().referencedRevisionKeys === 0 && jobSchedulerOwnershipDiagnostics().retainedRevisionKeys === 0, 'Final owner/bytes/key cleanup leaked')
    })
    const summary = []
    for (const type of ['json', 'csv']) for (const temperature of ['cold-worker-pool', 'warm-reused-pool']) {
      const serial = samples.filter(sample => sample.scenario === type && sample.temperature === temperature && sample.helpersRequested === 0), baseline = distribution(serial.map(sample => sample.totalWallMs))
      for (let helpers = 0; helpers <= 4; helpers++) {
        const matching = samples.filter(sample => sample.scenario === type && sample.temperature === temperature && sample.helpersRequested === helpers), timing = distribution(matching.map(sample => sample.totalWallMs))
        summary.push({ scenario: type, temperature, helpersRequested: helpers, actualHelperLimit: matching[0].snapshot.computeHelperLimit, globalHeavyLimit: matching[0].snapshot.heavyJobAdmissionLimit, timing, serialTiming: baseline, medianNetChangeMs: baseline.medianMs - timing.medianMs, medianNetChangePercent: 100 * (baseline.medianMs - timing.medianMs) / baseline.medianMs,
          actualWorkerJobs: matching.map(sample => sample.actualWorkerJobs), createdWorkers: matching.map(sample => sample.peaks.createdWorkers), activeWorkerJobs: matching.map(sample => sample.peaks.activeWorkerJobs), activeHeavyJobs: matching.map(sample => sample.peaks.activeHeavyJobs), decision: helpers === 0 ? 'serial-reference' : timing.maxMs < baseline.minMs ? 'positive-net-benefit-outside-observed-range-exploration-only' : timing.minMs > baseline.maxMs ? 'negative-net-benefit-outside-observed-range-keep-serial' : 'ranges-overlap-or-mixed-more-target-host-evidence-required' })
      }
    }
    return { status: checks.every(check => check.status === 'passed') ? 'passed' : 'failed', checks, smoke, scenarios, referenceBatches, warmups, samples, summary, cleanup, environment: { userAgent: navigator.userAgent, hardwareConcurrencyHint: actualHint, crossOriginIsolated, timeOrigin: performance.timeOrigin, originalConfig, originalSnapshot },
      timingSemantics: { cold: 'Each measured batch starts with zero live job Workers; Worker creation/module load and clone costs are inside wall. Browser process, JS host and HTTP artifact cache already initialized; this is worker-pool cold, not OS/process cold.', warm: 'Two full data-import batches create/reuse each pool before five measured batches; all warmup traces/wall retained separately. Candidate groups have recorded different deterministic order between JSON and CSV.', preparation: 'Original WorkTrace preparation covers production schedule bookkeeping/byte estimates. Immutable document generation is separately recorded outside execution wall; sources are ready text as in importDataText contract.', local: 'Current production localExecutionMs is true local serial/fallback computation. Its workerExecutionMs and transportAndReturnMs are null; actual Workers have localExecutionMs null. Full WorkTrace objects retain these fields and null values; no phase is substituted with zero. The frozen a95075 artifact used an older serial workerExecutionMs name; its original raw and ledger remain unchanged.', transport: 'For actual Worker jobs only, postMessageMs is host post API wall; workerExecutionMs includes original worker computation/output byte validation; transportAndReturnMs is production residual including startup/dispatch/clone/return scheduling, not isolated transport measurement. actualWorkerJobs counts non-null Worker execution traces only under the new paired production source manifest.', merge: 'Original dataResources row/schema conversion and byte validation measured by production mergeMs. Promise.all collection is within total wall; its isolated phase is unavailable/null.', parallel: 'Per-job execution and merge traces overlap; never sum them as batch wall. No actual OS-core occupancy/energy or input/UI performance measured.' } }
  } catch (error) {
    await publish('failure', { error: String(error.stack ?? error), checks, samplesCompleted: samples.length, cleanup, scheduler: auxiliaryWork.state, ownership: jobSchedulerOwnershipDiagnostics() })
    throw error
  } finally {
    await stop()
    configureJobScheduler({ maxWorkers: 2, maxQueued: 256, timeoutMs: 15000 })
    performanceCoordinator.configure(originalConfig, originalHint); performanceCoordinator.setMode(originalSnapshot.mode)
    await publish('restored', { config: performanceCoordinator.config, snapshot: performanceCoordinator.snapshot, scheduler: auxiliaryWork.state, ownership: jobSchedulerOwnershipDiagnostics() })
  }
}
