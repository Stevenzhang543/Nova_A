/** Execute a real owner-provided trace adapter. Never substitutes Node work cost for display/GPU cadence. */
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const args = Object.fromEntries(process.argv.slice(2).filter(value => value.startsWith('--') && value.includes('=')).map(value => { const at = value.indexOf('='); return [value.slice(2, at), value.slice(at + 1)] }))
if (process.argv.includes('--help')) {
  console.log('Usage: node scripts/verify-engine-observability-benchmark.mjs --adapter=./path/to/local-runtime-adapter.mjs --mode=both --warmup-seconds=10 --sample-seconds=120 --runs=5 --output=.cache/engine-benchmarks\nAdapter exports async createBenchmarkRun({mode,run,signal}), returning {metadata,nextSample({signal}),dispose()}. nextSample yields observed {rafIntervalMs,cpuFrameMs,submissionIntervalMs,inputToSubmitMs,gpuMs,policy?}. metadata must identify contentHash,qualitySignature,actualBenchmarkMode,buildId,backend,executionMode,wasmVariant,environment. Missing flow/GPU metrics must be null. --short-smoke explicitly permits shorter timings; it cannot qualify the formal benchmark. Each mode gets separate reports and raw runs.')
  process.exit(0)
}
assert.ok(args.adapter, 'A real local Runtime/Player adapter is required; no synthetic performance default exists. Use --help.')
const shortSmoke = process.argv.includes('--short-smoke')
const numeric = (key, fallback, minimum, maximum) => { const value = Number(args[key] ?? fallback); assert.ok(Number.isFinite(value) && value >= minimum && value <= maximum, key + ' is out of range'); return value }
const warmupMs = numeric('warmup-seconds', 10, shortSmoke ? 0 : 10, 300) * 1000
const sampleMs = numeric('sample-seconds', 120, shortSmoke ? .01 : 120, 3600) * 1000
const runs = numeric('runs', 5, shortSmoke ? 1 : 5, 30); assert.ok(Number.isInteger(runs))
const maximumSamples = numeric('max-samples', 100000, 100, 1000000)
const maximumBytes = numeric('max-bytes', 32 * 1024 * 1024, 1024, 256 * 1024 * 1024)
const modes = args.mode === 'quality-locked' ? ['quality-locked'] : args.mode === 'adaptive-experience' ? ['adaptive-experience'] : args.mode === undefined || args.mode === 'both' ? ['quality-locked', 'adaptive-experience'] : []
assert.ok(modes.length, 'mode must be both, quality-locked or adaptive-experience')
const { createBenchmarkRun } = await import(pathToFileURL(resolve(args.adapter)).href)
assert.equal(typeof createBenchmarkRun, 'function')
const output = resolve(args.output ?? '.cache/engine-benchmarks'); await mkdir(output, { recursive: true })
const controller = new AbortController(); process.once('SIGINT', () => controller.abort())
const median = values => { const sorted = [...values].sort((a, b) => a - b); return sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null }
const stats = (samples, key) => {
  const values = samples.map(sample => sample[key]).filter(value => value !== null).sort((a, b) => a - b)
  const at = quantile => values.length ? values[Math.floor((values.length - 1) * quantile)] : null
  const slowest = values.slice(-Math.ceil(values.length * .01))
  return { count: values.length, median: at(.5), p95: at(.95), p99: at(.99), onePercentLowFps: key === 'rafIntervalMs' && slowest.length ? 1000 / (slowest.reduce((sum, value) => sum + value, 0) / slowest.length) : null }
}
let frozenContentHash
for (const mode of modes) {
  const summaries = [], rawPaths = []; let qualitySignature
  for (let run = 1; run <= runs; run++) {
    assert.ok(!controller.signal.aborted, 'Benchmark cancelled')
    const adapter = await createBenchmarkRun({ mode, run, signal: controller.signal })
    try {
      const metadata = adapter.metadata
      for (const key of ['contentHash', 'qualitySignature', 'buildId', 'backend', 'executionMode', 'wasmVariant']) assert.equal(typeof metadata?.[key], 'string', 'Missing frozen metadata ' + key)
      assert.equal(metadata.actualBenchmarkMode, mode, 'Requested benchmark mode must be applied by the actual runtime owner')
      assert.ok(metadata.environment && typeof metadata.environment === 'object', 'Environment identity must be supplied by the actual host')
      assert.ok(JSON.stringify(metadata).length * 2 <= 65536, 'Environment metadata exceeds its diagnostic byte limit')
      frozenContentHash ??= metadata.contentHash; assert.equal(metadata.contentHash, frozenContentHash, 'Comparison content changed')
      qualitySignature ??= metadata.qualitySignature
      if (mode === 'quality-locked') assert.equal(metadata.qualitySignature, qualitySignature, 'Locked quality changed between runs')
      const started = performance.now(), samples = [], policies = []; let samplingStarted = null, lastProgress = started, completed = false, retainedBytes = 0
      while (!controller.signal.aborted) {
        let deadline
        const sample = await Promise.race([
          adapter.nextSample({ signal: controller.signal }),
          new Promise((_, reject) => { deadline = setTimeout(() => reject(new Error('Runtime trace owner timed out after 10s')), 10000) })
        ]).finally(() => clearTimeout(deadline))
        assert.ok(sample && typeof sample === 'object', 'Adapter stopped before its required wall-time sample')
        const now = performance.now()
        if (now - started < warmupMs) { await new Promise(done => setTimeout(done, 0)); continue }
        samplingStarted ??= now
        if (now - samplingStarted >= sampleMs) { completed = true; break }
        assert.ok(samples.length < maximumSamples, 'Trace sample/byte retention is bounded; increase --max-samples explicitly for this workload')
        const row = { observedAtMs: now - samplingStarted }
        if (sample.sequence !== undefined) { assert.ok(Number.isSafeInteger(sample.sequence) && sample.sequence > 0); row.ownerSequence = sample.sequence }
        if (sample.observedAtMs !== undefined) { assert.ok(Number.isFinite(sample.observedAtMs) && sample.observedAtMs >= 0); row.ownerObservedAtMs = sample.observedAtMs }
        for (const key of ['rafIntervalMs', 'cpuFrameMs', 'submissionIntervalMs', 'inputToSubmitMs', 'gpuMs']) {
          assert.ok(sample[key] === null || (typeof sample[key] === 'number' && Number.isFinite(sample[key]) && sample[key] >= 0), 'Missing/invalid nullable metric ' + key)
          if (key.endsWith('IntervalMs') && sample[key] !== null) assert.ok(sample[key] > 0, 'Intervals require two distinct owner timestamps')
          row[key] = sample[key]
        }
        if (sample.policy) {
          assert.equal(typeof sample.policy.reason, 'string'); assert.ok(Number.isInteger(sample.policy.revision))
          assert.ok(JSON.stringify(sample.policy).length <= 8192, 'Policy trace byte limit exceeded')
          assert.ok(sample.policy.oldValues && sample.policy.newValues, 'Quality changes require old/new values')
          assert.ok(mode !== 'quality-locked' || JSON.stringify(sample.policy.oldValues) === JSON.stringify(sample.policy.newValues), 'Locked quality cannot adapt')
          policies.push({ ...sample.policy, observedAtMs: row.observedAtMs })
        }
        retainedBytes += (JSON.stringify(row).length + (sample.policy ? JSON.stringify(sample.policy).length : 0)) * 2
        assert.ok(retainedBytes <= maximumBytes, 'Trace retained-byte limit exceeded')
        samples.push(row)
        if (now - lastProgress >= 10000) { console.log(JSON.stringify({ mode, run, sampledSeconds: (now - samplingStarted) / 1000 })); lastProgress = now }
        // The diagnostic collector yields even if a malformed adapter resolves synchronously.
        await new Promise(done => setTimeout(done, 0))
      }
      assert.ok(completed && samples.length, 'Cancelled or empty traces do not qualify')
      const metrics = Object.fromEntries(['rafIntervalMs', 'cpuFrameMs', 'submissionIntervalMs', 'inputToSubmitMs', 'gpuMs'].map(key => [key, stats(samples, key)]))
      const rawPath = join(output, mode + '-run-' + run + '.json')
      await writeFile(rawPath, JSON.stringify({ format: 'nova-observability-raw-run', version: 1, mode, run, scope: shortSmoke ? 'SHORT_SMOKE' : 'FORMAL_TRACE_COLLECTION_ONLY', metadata, warmupMs, sampledWallMs: performance.now() - samplingStarted, samples, policies, limitations: ['rAF and CPU API submissions are proxies, not physical display presentation.', 'No input flow identity or GPU query means null; collector never fills unknown values with zero.'] }, null, 2) + '\n')
      rawPaths.push(rawPath); summaries.push({ run, metrics })
    } finally { await adapter.dispose() }
  }
  const medianP95 = Object.fromEntries(['rafIntervalMs', 'cpuFrameMs', 'submissionIntervalMs', 'inputToSubmitMs', 'gpuMs'].map(key => [key, median(summaries.map(item => item.metrics[key].p95).filter(value => value !== null))]))
  const repeatSpreadP95 = Object.fromEntries(['rafIntervalMs', 'cpuFrameMs', 'submissionIntervalMs', 'inputToSubmitMs', 'gpuMs'].map(key => { const values = summaries.map(item => item.metrics[key].p95).filter(value => value !== null); return [key, values.length ? Math.max(...values) - Math.min(...values) : null] }))
  await writeFile(join(output, mode === 'quality-locked' ? 'QualityLocked.json' : 'AdaptiveExperience.json'), JSON.stringify({ format: 'nova-observability-benchmark', version: 1, mode, scope: shortSmoke ? 'SHORT_SMOKE' : 'FORMAL_TRACE_COLLECTION_ONLY', warmupMs, sampleMs, runs, frozenContentHash, medianP95, repeatSpreadP95, summaries, rawPaths, qualification: 'Collection is not threshold acceptance. H1/H2/GPU/platform/workload coverage must be assessed separately.' }, null, 2) + '\n')
}
console.log(JSON.stringify({ status: 'recorded', scope: shortSmoke ? 'SHORT_SMOKE' : 'FORMAL_TRACE_COLLECTION_ONLY', output }))
