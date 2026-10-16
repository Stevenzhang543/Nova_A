/** Focused production-module checks; virtual timestamps do not certify GPU/display performance. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const output = resolve(process.argv.find(value => value.startsWith('--report='))?.slice(9) ?? '.cache/engine-observability-verification.json')
const opened = await openMediaAuditModules({ repository: process.cwd(), bases: [process.cwd()] }, { observation: 'runtime/performance/observability', runtime: 'runtime/largeWorldPerformance', profiler: 'runtime/profiler', tools: 'runtime/performanceTools', trace: 'runtime/performance/benchmarkTrace', host: 'platform/performanceTraceHost', ui: 'runtime/gameUi', components: 'world/components', box: 'world/BoxEntity' })
const { observation: o, runtime: r, profiler: p, tools: t, trace: b, host: h, ui: u, components: c, box } = opened.modules
const checks = []
const test = async (name, action) => { await action(); checks.push({ name, status: 'passed' }) }
try {
  await test('CPU function cost cannot produce a cadence FPS or a physical input latency', () => {
    r.resetPerformanceRuntime(); r.performanceRuntimeSettings.reactivePublishInterval = 1
    r.beginPerformanceFrame(100); r.markPerformanceInput(100); r.completePerformanceFrame(102)
    assert.equal(r.performanceRuntimeState.cpuFrameMs, 2)
    assert.equal(r.performanceRuntimeState.onePercentLowFps, null)
    assert.equal(r.performanceRuntimeState.inputToSubmitMs, null)
    assert.equal(r.performanceRuntimeState.inputToPixelMs, null)
    assert.equal(r.performanceRuntimeState.gpuMs, null)
  })
  await test('rAF and CPU API submission are measured independently of CPU phase work', () => {
    const recorder = new o.FrameObservability()
    recorder.begin(10, 10); recorder.submission(12); recorder.complete(14)
    recorder.begin(26, 26); recorder.submission(31); const result = recorder.complete(35)
    assert.equal(result.cpuFrameMs, 9); assert.equal(result.rafIntervalMs, 16); assert.equal(result.submissionIntervalMs, 19)
    assert.equal(result.inputToSubmitMs, null); assert.equal(result.gpuMs, null)
    assert.equal(recorder.rafStatistics().onePercentLowFps, 62.5)
  })
  await test('Hidden rebase excludes hidden wall time but preserves measured slow-frame history', () => {
    const recorder = new o.FrameObservability()
    recorder.begin(0, 0); recorder.submission(2); recorder.complete(3)
    recorder.begin(100, 100); recorder.submission(110); recorder.complete(112)
    recorder.rebaseFrameContinuity(); recorder.begin(100000, 100000); recorder.submission(100002)
    assert.equal(recorder.current.rafIntervalMs, null); assert.equal(recorder.current.submissionIntervalMs, null)
    recorder.begin(100016, 100016); recorder.submission(100020)
    assert.equal(recorder.current.rafIntervalMs, 16); assert.equal(recorder.current.submissionIntervalMs, 18)
    assert.equal(recorder.rafStatistics().count, 2); assert.equal(recorder.rafStatistics().worstMs, 100)
    assert.equal(recorder.submissionStatistics().worstMs, 108)
  })
  await test('1% Low uses the mean of the slowest ceil(1% * N), not reciprocal p99', () => {
    const result = o.intervalStatistics([...Array(198).fill(16), 80, 100])
    assert.equal(result.p99Ms, 16); assert.equal(result.onePercentLowFps, 1000 / 90)
    assert.equal(o.intervalStatistics([NaN, -1, 0, Infinity]).onePercentLowFps, null)
  })
  await test('Only an explicitly consumed input identity can produce inputToSubmit', () => {
    const recorder = new o.FrameObservability(), sequence = recorder.receipt(0)
    recorder.begin(0, 0); recorder.submission(0, sequence)
    assert.equal(recorder.current.inputToSubmitMs, 0); assert.equal(recorder.latencyPercentile(), 0)
    recorder.begin(10, 10); recorder.submission(12, sequence)
    assert.equal(recorder.current.inputToSubmitMs, null)
    const stale = recorder.receipt(15); recorder.reset(); recorder.submission(20, stale)
    assert.equal(recorder.current.inputToSubmitMs, null)
  })
  await test('Storage is bounded and unavailable timestamps do not become zeros', () => {
    const recorder = new o.FrameObservability()
    for (let index = 0; index < 900; index++) { recorder.begin(index * 16, index * 16); recorder.submission(index * 16 + 2); recorder.complete(index * 16 + 3); recorder.receipt(index * 16) }
    assert.equal(recorder.rafStatistics().count, 600); assert.equal(recorder.submissionStatistics().count, 600)
    recorder.begin(NaN, NaN); assert.equal(recorder.complete(Infinity).cpuFrameMs, null)
  })
  await test('Old viewport cleanup forgets only its own input tokens', () => {
    const recorder = new o.FrameObservability(), older = recorder.receipt(10), replacement = recorder.receipt(11)
    recorder.forgetInput(older); recorder.forgetInput(older)
    recorder.begin(12, 12); recorder.submission(15, older); assert.equal(recorder.current.inputToSubmitMs, null)
    recorder.begin(16, 16); recorder.submission(20, replacement); assert.equal(recorder.current.inputToSubmitMs, 9)
  })
  await test('Input token bridge requires a matching current epoch and actual consumption, then reports one latest receipt', () => {
    const recorder = new o.FrameObservability(), tokens = new o.InputReceiptTokenMap(at => recorder.receipt(at), token => recorder.forgetInput(token))
    const first = { inputEpoch: 1, sequence: 1, receivedAtMs: 10 }, last = { inputEpoch: 1, sequence: 2, receivedAtMs: 12 }
    tokens.reset(1); tokens.receipt(first); tokens.receipt(last); tokens.receipt(last)
    recorder.begin(13, 13); recorder.submission(14); assert.equal(recorder.current.inputToSubmitMs, null)
    assert.equal(tokens.retainedReceipts, 2); assert.equal(tokens.consumeLatest(null), undefined)
    const sample = { inputEpoch: 1, receipts: [first, last], latestReceipt: last }, candidate = tokens.consumeLatest(sample)
    assert.equal(tokens.retainedReceipts, 1); recorder.begin(16, 16); recorder.submission(20, candidate)
    assert.equal(recorder.current.inputToSubmitMs, 8); tokens.release(candidate)
    assert.equal(tokens.retainedReceipts, 0); assert.equal(tokens.consumeLatest(sample), undefined)
    tokens.dispose(); tokens.dispose()
  })
  await test('Deferred submission, epoch reset and disposal cannot reuse or clear another viewport candidate', () => {
    const recorder = new o.FrameObservability(), factory = () => new o.InputReceiptTokenMap(at => recorder.receipt(at), token => recorder.forgetInput(token))
    const old = factory(), current = factory(), receipt = { inputEpoch: 1, sequence: 1, receivedAtMs: 10 }, sample = { inputEpoch: 1, receipts: [receipt], latestReceipt: receipt }
    old.reset(1); current.reset(1); old.receipt(receipt); current.receipt(receipt)
    const oldCandidate = old.consumeLatest(sample), currentCandidate = current.consumeLatest(sample)
    old.release(oldCandidate); old.dispose(); old.dispose(); old.receipt(receipt)
    recorder.begin(11, 11); recorder.submission(12, oldCandidate); assert.equal(recorder.current.inputToSubmitMs, null)
    recorder.begin(13, 13); recorder.submission(15, currentCandidate); assert.equal(recorder.current.inputToSubmitMs, 5); current.release(currentCandidate)
    current.receipt({ ...receipt, sequence: 2 }); current.reset(2); current.receipt({ ...receipt, sequence: 3 })
    assert.equal(current.retainedReceipts, 0); assert.equal(current.consumeLatest(sample), undefined); current.dispose()
  })
  await test('Profiling receipt bridge bounds retained identity and pending candidate storage to 256', () => {
    const recorder = new o.FrameObservability(), tokens = new o.InputReceiptTokenMap(at => recorder.receipt(at), token => recorder.forgetInput(token))
    tokens.reset(1)
    for (let sequence = 1; sequence <= 300; sequence++) tokens.receipt({ inputEpoch: 1, sequence, receivedAtMs: sequence })
    assert.equal(tokens.retainedReceipts, 256)
    const latestReceipt = { inputEpoch: 1, sequence: 300, receivedAtMs: 300 }
    const candidate = tokens.consumeLatest({ inputEpoch: 1, receipts: [latestReceipt], latestReceipt })
    tokens.receipt({ inputEpoch: 1, sequence: 301, receivedAtMs: 301 }); assert.equal(tokens.retainedReceipts, 256)
    tokens.release(candidate); tokens.reset(2); assert.equal(tokens.retainedReceipts, 0); tokens.dispose()
  })
  await test('CPU pressure alone cannot silently lower authored quality', () => {
    r.resetPerformanceRuntime(); r.performanceRuntimeSettings.adaptiveQuality = true
    for (let index = 0; index < 60; index++) { r.beginPerformanceFrame(index * 100); r.completePerformanceFrame(index * 100 + 90) }
    assert.equal(r.performanceRuntimeState.adaptivePixelRatioScale, 1); assert.equal(r.performanceRuntimeState.adaptiveParticleScale, 1)
    r.applyPerformancePresentationPolicy({ benchmarkMode: 'adaptive-experience', tier: 1, renderScale: .86, particleScale: .82, revision: 1, reason: 'explicit test policy' })
    assert.equal(r.performanceRuntimeState.adaptivePixelRatioScale, .86)
    r.applyPerformancePresentationPolicy({ benchmarkMode: 'quality-locked', tier: 2, renderScale: .5, particleScale: .5, revision: 2, reason: 'quality lock' })
    assert.equal(r.performanceRuntimeState.adaptivePixelRatioScale, 1)
    r.applyPerformancePresentationPolicy({ benchmarkMode: 'adaptive-experience', tier: 2, renderScale: .5, particleScale: .5, revision: 1, reason: 'stale' })
    assert.equal(r.performanceRuntimeState.benchmarkMode, 'quality-locked')
  })
  await test('Historical CPU-FPS/display aliases remain archived but unqualified', () => {
    assert.deepEqual(o.migrateFrameObservation({ mainThreadMs: 2, frameMs: 2, inputToPixelMs: 1, onePercentLowFps: 500 }), { cpuFrameMs: null, rafIntervalMs: null, submissionIntervalMs: null, inputToSubmitMs: null, gpuMs: null })
    p.profilerState.overheadMode = 'Low overhead'; p.clearProfiler()
    const sample = { frameMs: 16, physicsMs: 1, renderingMs: 2, scriptsMs: 0, animationMs: 0, audioMs: 0, assetsMs: 0, otherMs: 0, fps: 62.5, memoryMb: null }
    const recorded = p.recordFrameProfile(sample)
    assert.equal(recorded.inputToSubmitMs, null); assert.equal(recorded.rafIntervalMs, null)
    const renderer = { gpuMs: null, drawCalls: 1, textureMemoryBytes: 0, batchBreakReasons: {} }
    const captured = t.capturePerformance('unknown-clock', renderer)
    assert.equal(captured.version, 4)
    assert.equal(captured.measurementSchema, 'nova-frame-observation-v1')
    assert.equal(captured.startup.schema, 'nova-startup-observation-v1')
    assert.equal(captured.startup.coldStartupMs, null); assert.equal(captured.startup.warmStartupMs, null)
    assert.equal(captured.budget.checks.find(check => check.id === 'frame.average').status, 'unavailable')
    assert.equal(captured.budget.checks.find(check => check.id === 'gpu.frame').actual, null)
    const legacy = JSON.parse(t.serializePerformanceCapture({ ...captured, version: 2, frames: [{ ...recorded, inputToPixelMs: 1, onePercentLowFps: 500 }] }))
    assert.equal(legacy.frames[0].legacyMetrics.inputToPixelMs, 1); assert.equal(legacy.frames[0].onePercentLowFps, null)
  })
  await test('Trace retention limits samples and bytes and releases all retained state', () => {
    const trace = new b.PerformanceBenchmarkTrace(2, 1024), observation = { cpuFrameMs: 2, rafIntervalMs: 16, submissionIntervalMs: 17, inputToSubmitMs: null, gpuMs: null }
    for (let index = 0; index < 5; index++) trace.push(observation, index * 16)
    assert.equal(trace.snapshot.queuedSamples, 2); assert.equal(trace.snapshot.droppedSamples, 3); assert.ok(trace.snapshot.queuedBytes <= 1024)
    const rows = trace.drain(1); assert.equal(rows.samples[0].sequence, 4); rows.samples[0].cpuFrameMs = 999
    assert.equal(trace.drain().samples[0].cpuFrameMs, 2)
    trace.dispose(); trace.push(observation, 100); assert.equal(trace.snapshot.queuedSamples, 0); assert.equal(trace.snapshot.queuedBytes, 0)
    const tiny = new b.PerformanceBenchmarkTrace(100, 256); for (let index = 0; index < 10; index++) tiny.push(observation, index); assert.ok(tiny.snapshot.queuedBytes <= 256)
  })
  await test('Profiling host is opt-in, copies metadata, cleans subscriptions and preserves newer hooks', () => {
    const target = {}, meta = { contentHash: 'real-owner', qualitySignature: 'quality', actualBenchmarkMode: 'quality-locked', buildId: 'test', backend: 'test', executionMode: 'test', wasmVariant: 'unavailable', environment: { dpi: 1 } }
    let listener, subscriptions = 0
    const subscribe = value => { subscriptions++; listener = value; return () => { subscriptions--; listener = undefined } }
    h.installPerformanceTraceHost({ target, subscribe, metadata: () => meta, profilingEnabled: false })()
    assert.equal(subscriptions, 0); assert.equal(target.novaPerformanceDiagnosticsV1, undefined)
    const dispose = h.installPerformanceTraceHost({ target, subscribe, metadata: () => meta, profilingEnabled: true, maxSamples: 2, maxBytes: 1024 })
    const api = target.novaPerformanceDiagnosticsV1; assert.equal(subscriptions, 1); assert.ok(Object.isFrozen(api))
    api.metadata().environment.dpi = 99; assert.equal(meta.environment.dpi, 1)
    listener({ cpuFrameMs: 2, rafIntervalMs: 16, submissionIntervalMs: 17, inputToSubmitMs: null, gpuMs: null }, 20)
    assert.equal(api.drain().samples[0].inputToSubmitMs, null)
    dispose(); dispose(); assert.equal(subscriptions, 0); assert.equal(target.novaPerformanceDiagnosticsV1, undefined); assert.equal(api.snapshot().disposed, true)
    const second = h.installPerformanceTraceHost({ target, subscribe, metadata: () => meta, profilingEnabled: true }); const replacement = {}; target.novaPerformanceDiagnosticsV1 = replacement; second(); assert.equal(target.novaPerformanceDiagnosticsV1, replacement)
  })
  await test('Actual owner observation subscription caps and diagnostics do not leak failing listeners', () => {
    const releases = [], before = r.performanceObservationDiagnostics().observerFailures
    try {
      for (let index = 0; index < 4; index++) releases.push(r.subscribePerformanceObservations(() => {}))
      assert.throws(() => r.subscribePerformanceObservations(() => {}), /limited to four/)
    } finally { releases.forEach(release => release()) }
    const release = r.subscribePerformanceObservations(() => { throw new Error('diagnostic failure') })
    r.beginPerformanceFrame(10, 10); r.completePerformanceFrame(12); release()
    assert.equal(r.performanceObservationDiagnostics().subscribers, 0); assert.equal(r.performanceObservationDiagnostics().observerFailures, before + 1)
  })
  await test('UI gamepad edges keep running without rendering and held edges activate exactly once', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    let pressed = false, polls = 0, activations = 0
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads() { polls++; return [{ id: 'virtual-functional-controller', index: 0, connected: true, buttons: [{ pressed, value: pressed ? 1 : 0 }], axes: [0, 0] }] } } })
    const ui = new u.GameUiRuntime()
    try {
      const root = new box.BoxEntity(901, { x: 0, y: 0 }, { x: 1, y: 1 }, '00000901-0000-4000-8000-000000000000')
      root.addComponent(new c.RectTransform()); root.addComponent(new c.Canvas()).referenceSize = { x: 1000, y: 500 }
      const button = new box.BoxEntity(902, { x: 0, y: 0 }, { x: 1, y: 1 }, '00000902-0000-4000-8000-000000000000')
      button.parentUuid = root.uuid; Object.assign(button.addComponent(new c.RectTransform()), { focusable: true, skipNavigation: false }); button.addComponent(new c.Button())
      const context = new Proxy({ canvas: { width: 1000, height: 500 }, measureText: value => ({ width: String(value).length * 8 }) }, { get: (target, key) => key in target ? target[key] : () => {} })
      ui.setCallback((entity, name) => { if (entity === button && name === 'on_pressed') activations++ })
      ui.render(context, 1000, 500, [root, button]); assert.equal(polls, 0); assert.ok(ui.focusByUuid(button.uuid))
      pressed = true
      ui.render(context, 1000, 500, [root, button]); ui.render(context, 1000, 500, [root, button]); assert.equal(polls, 0); assert.equal(activations, 0)
      ui.sampleInput(); assert.equal(activations, 1)
      for (let frame = 0; frame < 30; frame++) ui.sampleInput()
      assert.equal(activations, 1, 'Held input cannot activate once per deferred frame')
      pressed = false; ui.sampleInput(); pressed = true; ui.sampleInput(); assert.equal(activations, 2)
      const before = polls; ui.sampleInput({ editor: true }); ui.sampleInput({ preview: true }); assert.equal(polls, before)
    } finally { ui.reset(); if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else delete globalThis.navigator }
  })
  await test('Software browser adapter refuses formal qualification before launching anything', async () => {
    const execute = promisify(execFile)
    await assert.rejects(execute(process.execPath, [resolve('scripts/verify-engine-observability-benchmark.mjs'), '--adapter=' + resolve('scripts/engine-observability-cdp-adapter.mjs')]), /This adapter forces SwiftShader/)
  })
  await test('Benchmark collector keeps both modes separate and rejects shortened formal sampling', async () => {
    const temporary = await mkdtemp(resolve('.cache/observability-runner-test-'))
    try {
      const adapter = join(temporary, 'synthetic-contract-fixture.mjs')
      await writeFile(adapter, `export async function createBenchmarkRun({mode}) { return {metadata:{contentHash:'test',qualitySignature:'test',buildId:'test',backend:'synthetic-contract-fixture',executionMode:'test',wasmVariant:'unavailable',actualBenchmarkMode:mode,environment:{scope:'SHORT_SMOKE synthetic adapter protocol only'}},async nextSample(){await new Promise(done=>setTimeout(done,1));return {rafIntervalMs:16,cpuFrameMs:2,submissionIntervalMs:16,inputToSubmitMs:null,gpuMs:null}},async dispose(){}} }`)
      const execute = promisify(execFile), runner = resolve('scripts/verify-engine-observability-benchmark.mjs')
      await execute(process.execPath, [runner, '--adapter=' + adapter, '--mode=both', '--short-smoke', '--warmup-seconds=0', '--sample-seconds=.01', '--runs=1', '--output=' + temporary])
      const locked = JSON.parse(await readFile(join(temporary, 'QualityLocked.json'))), adaptive = JSON.parse(await readFile(join(temporary, 'AdaptiveExperience.json')))
      assert.equal(locked.mode, 'quality-locked'); assert.equal(adaptive.mode, 'adaptive-experience')
      assert.equal(locked.scope, 'SHORT_SMOKE'); assert.equal(locked.medianP95.gpuMs, null)
      await assert.rejects(execute(process.execPath, [runner, '--adapter=' + adapter, '--sample-seconds=1']), /sample-seconds is out of range/)
    } finally { assert.ok(temporary.startsWith(resolve('.cache') + '\\') || temporary.startsWith(resolve('.cache') + '/')); await rm(temporary, { recursive: true, force: true }) }
  })
  const sources = ['src/runtime/performance/observability.ts', 'src/runtime/performance/benchmarkTrace.ts', 'src/platform/performanceTraceHost.ts', 'src/runtime/largeWorldPerformance.ts', 'src/runtime/profiler.ts', 'src/runtime/performanceTools.ts', 'src/runtime/gameUi.ts', 'src/components/ProfilerPanel.vue', 'src/components/WorldCanvas.vue', 'scripts/verify-engine-observability.mjs', 'scripts/verify-engine-observability-presentation.mjs', 'scripts/verify-engine-observability-benchmark.mjs', 'scripts/engine-observability-cdp-adapter.mjs']
  const hashes = Object.fromEntries(await Promise.all(sources.map(async path => [path, createHash('sha256').update(await readFile(path)).digest('hex')])))
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, JSON.stringify({ format: 'nova-engine-observability-verification', version: 1, status: 'passed', scope: 'SHORT_SMOKE / deterministic production-module host checks. Not B0–B8/X01–X15 or physical GPU performance qualification.', generatedAt: new Date().toISOString(), checks, hashes }, null, 2) + '\n')
  console.log(JSON.stringify({ status: 'passed', checks: checks.length, report: output, scope: 'SHORT_SMOKE' }))
} finally { await opened.close() }
