/** Actual Editor adapter -> existing trace host -> same bundled Motion Owner. Functional smoke only. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = process.cwd(), normal = value => value.replaceAll('\\', '/')
const directory = resolve(process.env.NOVA_MOTION_TRACE_REPORT ?? 'release-audits/engine-motion-trace-metadata-20261007')
const manifestPath = resolve(process.env.NOVA_MOTION_TRACE_MANIFEST ?? '.cache/engine-overhaul/profile-dist/engine-build-manifest.json')
const baselinePath = resolve('.cache/engine-overhaul/motion-owner-metadata/before-performanceTraceAdapter.ts')
const adapterPath = resolve('src/editor/performanceTraceAdapter.ts')
const checks = [], graphs = {}, observations = {}, source = {}, artifacts = {}
const digest = value => createHash('sha256').update(value).digest('hex')
const failures = []
const check = async (name, action) => {
  try { await action(); checks.push({ name, status: 'passed' }) }
  catch (error) { const row = { name, status: 'failed', error: String(error.stack ?? error) }; checks.push(row); failures.push(row) }
}
await mkdir(directory, { recursive: true })
await assert.rejects(readFile(resolve(directory, 'report.json')), { code: 'ENOENT' })
await writeFile(resolve(directory, 'verifier.mjs'), await readFile(new URL(import.meta.url)))
const before = await readFile(baselinePath, 'utf8'), after = await readFile(adapterPath, 'utf8')
const manifestBytes = await readFile(manifestPath), manifest = JSON.parse(manifestBytes)
assert.equal(manifest.buildId, 'engine-profile-a1d6fe7b3c4ce5db243a', 'Frozen GUI identity must not silently change')
assert.equal(manifest.source.find(row => row.path === 'src/editor/performanceTraceAdapter.ts')?.sha256, digest(before))
await writeFile(resolve(directory, 'frozen-a1d6f-manifest.json'), manifestBytes)
await writeFile(resolve(directory, 'before-performanceTraceAdapter.ts'), before)
await writeFile(resolve(directory, 'after-performanceTraceAdapter.ts'), after)
const graphBytes = await readFile(resolve(dirname(manifestPath), 'engine-module-graph.json'))
assert.equal(digest(graphBytes), manifest.artifacts.find(row => row.path === 'engine-module-graph.json')?.sha256)
const frozenGraph = JSON.parse(graphBytes), modules = new Map(frozenGraph.modules.map(row => [row.id, row]))
const reachable = new Set(), pending = ['src/player.ts']
while (pending.length) { const id = pending.pop(); if (reachable.has(id)) continue; reachable.add(id); const row = modules.get(id); pending.push(...row?.imports ?? [], ...row?.dynamicImports ?? []) }
await check('Editor-only-new-edge-does-not-expand-frozen-Player-module-reachability', () => {
  assert.equal(frozenGraph.buildId, manifest.buildId)
  assert.equal(reachable.has('src/editor/performanceTraceAdapter.ts'), false)
  const stripped = after.replace(/import \{ getUiMotionDiagnostics \} from '\.\.\/ui\/motion'\r?\n/, '').replace(/        uiMotion: getUiMotionDiagnostics\(\),\r?\n/, '')
  assert.equal(stripped, before, 'Only Root-authorized getter import and metadata field were added')
  observations.player = { frozenBuildId: manifest.buildId, reachableModules: reachable.size, editorAdapterReachable: false,
    uiMotionAlreadyReachable: reachable.has('src/ui/motion.ts'), conclusion: 'A new outgoing edge on this unreachable Editor module cannot expand this unchanged Player graph. Whole Player gate remains NOT_PASSED.' }
})

// Import real modules with browser globals absent; supply only metadata/WAAPI host surfaces afterwards.
// No production import is stubbed, no Motion collection is replaced, and all entries share the bundled Vue.
const originalGlobals = new Map(['window', 'document', 'navigator', 'innerWidth', 'innerHeight', 'getComputedStyle'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
delete globalThis.window; delete globalThis.document
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Node actual-module functional host', platform: 'Win32', hardwareConcurrency: 8 } })
globalThis.innerWidth = 800; globalThis.innerHeight = 600
const entry = resolve(directory, 'entry.ts')
await writeFile(entry, [
  `export { installEditorPerformanceTrace } from ${JSON.stringify(normal(adapterPath))};`,
  `export { run, getUiMotionDiagnostics } from ${JSON.stringify(normal(resolve('src/ui/motion.ts')))};`,
  `export { preferencesState, systemReducedMotion } from ${JSON.stringify(normal(resolve('src/store/preferences.ts')))};`,
  `export { physicsState } from ${JSON.stringify(normal(resolve('src/store/physics.ts')))};`,
  `export { beginPerformanceFrame, markPerformanceSubmission, completePerformanceFrame, performanceObservationDiagnostics } from ${JSON.stringify(normal(resolve('src/runtime/largeWorldPerformance.ts')))};`,
  `export { nextTick, toRaw } from 'vue';`
].join('\n'))
const apis = {}, disposers = []
try {
  for (const phase of ['before', 'after']) {
    const compiled = resolve(directory, phase, 'integration.mjs'), ids = []
    const identity = `motion-metadata-node-functional-${phase}`
    await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true },
      define: { 'import.meta.env.VITE_NOVA_PERFORMANCE_TRACE': JSON.stringify('1'), 'import.meta.env.VITE_NOVA_BUILD_ID': JSON.stringify(identity) },
      plugins: [{ name: 'actual-motion-metadata-' + phase, enforce: 'pre',
        load(id) { return phase === 'before' && normal(id) === normal(adapterPath) ? before : null },
        generateBundle() { ids.push(...this.getModuleIds()) } }],
      build: { ssr: true, outDir: dirname(compiled), emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
    artifacts[phase] = { path: normal(relative(root, compiled)), sha256: digest(await readFile(compiled)), diagnosticBuildId: identity }
    graphs[phase] = ids.map(id => normal(normal(id).startsWith(normal(root) + '/') ? relative(root, id) : id))
    for (const id of ids) if (normal(id).startsWith(normal(root) + '/') && /\.(?:ts|js|mjs|json)$/.test(id) && !id.includes('node_modules')) {
      const path = normal(relative(root, id)), bytes = phase === 'before' && normal(id) === normal(adapterPath) ? before : await readFile(id)
      source[phase + ':' + path] = digest(bytes)
    }
    // Existing preferences/world modules see the same explicitly absent browser host at initialization.
    delete globalThis.window
    const api = apis[phase] = await import(pathToFileURL(compiled).href)
    const target = { devicePixelRatio: 1 }
    Object.defineProperty(globalThis, 'window', { configurable: true, value: target })
    const beforeObservers = api.performanceObservationDiagnostics().subscribers
    const dispose = api.installEditorPerformanceTrace(); disposers.push(dispose)
    const trace = target.novaPerformanceDiagnosticsV1
    assert(trace && typeof trace.metadata === 'function', 'Actual adapter must install existing trace API')
    const metadata = trace.metadata()
    observations[phase] = { metadata, baselineOwner: api.getUiMotionDiagnostics(), beforeObservers,
      installedObservers: api.performanceObservationDiagnostics().subscribers }
    await check(phase + '-actual-subscription-no-metadata-samples-and-detached-clone', () => {
      assert.equal(api.performanceObservationDiagnostics().subscribers, beforeObservers + 1)
      assert.equal(trace.snapshot().producedSamples, 0)
      metadata.environment.policy.revision = -999
      assert.notEqual(trace.metadata().environment.policy.revision, -999)
      assert.equal(trace.snapshot().producedSamples, 0, 'Metadata reads must not create frame samples')
      const current = trace.metadata()
      if (phase === 'before') assert.equal(Object.hasOwn(current.environment, 'uiMotion'), false)
      else assert.deepEqual(current.environment.uiMotion, api.getUiMotionDiagnostics())
    })
    if (phase === 'after') {
      let animation, cancellations = 0, completed = 0
      const element = { isConnected: true, animate() { animation = { onfinish: null, oncancel: null,
        cancel() { cancellations++; this.oncancel?.() } }; return animation } }
      globalThis.getComputedStyle = () => ({ opacity: '1', transform: 'none' })
      const handle = api.run(element, [{ opacity: 0 }, { opacity: 1 }], 'fast', () => completed++)
      await check('same-bundled-Motion-Owner-active-count-and-policy-update-without-metadata-retention', async () => {
        assert.equal(api.getUiMotionDiagnostics().activeJobs, 1)
        const one = trace.metadata(), retained = structuredClone(one)
        assert.equal(one.environment.uiMotion.activeJobs, 1)
        one.environment.uiMotion.activeJobs = 900
        assert.equal(api.getUiMotionDiagnostics().activeJobs, 1)
        assert.equal(trace.metadata().environment.uiMotion.activeJobs, 1)
        api.preferencesState.reduceMotion = true; await api.nextTick()
        assert.equal(trace.metadata().environment.uiMotion.policy, 'reduced')
        assert.equal(retained.environment.uiMotion.policy, 'on')
        api.preferencesState.reduceMotion = false; await api.nextTick()
        api.systemReducedMotion.value = true; await api.nextTick()
        assert.equal(trace.metadata().environment.uiMotion.policy, 'reduced')
        api.systemReducedMotion.value = false; await api.nextTick()
        handle.cancel(); handle.cancel()
        assert.equal(trace.metadata().environment.uiMotion.activeJobs, 0)
        assert.equal(retained.environment.uiMotion.activeJobs, 1)
        assert.equal(cancellations, 1); assert.equal(completed, 0)
        observations.motion = { retained, final: trace.metadata().environment.uiMotion, cancellations, completed,
          note: 'Actual run/cancel/collections and Vue policy; deterministic WAAPI element boundary. No compositor timing or visual assertion.' }
      })
    }
    await check(phase + '-existing-real-observation-publication-and-idempotent-cleanup', () => {
      api.beginPerformanceFrame(100); api.markPerformanceSubmission(101); api.completePerformanceFrame(102)
      assert.equal(trace.snapshot().producedSamples, 1)
      const batch = trace.drain(); assert.equal(batch.samples.length, 1)
      assert.equal(batch.samples[0].cpuFrameMs, 2); assert.equal(batch.samples[0].gpuMs, null)
      dispose(); dispose()
      assert.equal(api.performanceObservationDiagnostics().subscribers, beforeObservers)
      assert.equal(target.novaPerformanceDiagnosticsV1, undefined)
      assert.equal(trace.snapshot().disposed, true); assert.equal(trace.snapshot().queuedBytes, 0)
      assert.throws(() => trace.metadata(), /disposed/)
      api.beginPerformanceFrame(200); api.completePerformanceFrame(202)
      assert.equal(trace.snapshot().producedSamples, 1)
      observations[phase].cleanup = { observers: api.performanceObservationDiagnostics(), trace: trace.snapshot(), publicApiRemoved: true }
    })
  }
  await check('all-existing-metadata-fields-retain-before-behavior', () => {
    const previous = structuredClone(observations.before.metadata), current = structuredClone(observations.after.metadata)
    delete current.environment.uiMotion; delete previous.buildId; delete current.buildId
    assert.deepEqual(current, previous)
  })
  for (const file of ['src/ui/motion.ts', 'src/platform/performanceTraceHost.ts', 'src/runtime/performance/benchmarkTrace.ts']) {
    const hash = digest(await readFile(resolve(file)))
    assert.equal(source['before:' + file], hash); assert.equal(source['after:' + file], hash)
    assert.equal(manifest.source.find(row => row.path === file)?.sha256, hash, 'Existing Owner/host belongs to frozen a1d6f')
  }
} catch (error) { failures.push({ name: 'host-bootstrap-or-final-source-guard', error: String(error.stack ?? error) }) }
finally {
  for (const dispose of disposers) { try { dispose() } catch (error) { failures.push({ name: 'cleanup', error: String(error) }) } }
  for (const [key, descriptor] of originalGlobals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] }
}
const report = { schema: 'nova-motion-trace-metadata-functional-v1', status: failures.length ? 'FAILED' : 'VERIFIED_FUNCTIONAL_SMOKE',
  frozenGuiBuildId: manifest.buildId, frozenManifestSha256: digest(manifestBytes),
  nodeVersion: process.version, beforeAdapterSha256: digest(before), afterAdapterSha256: digest(after),
  scriptSha256: digest(await readFile(resolve('scripts/verify-engine-motion-trace-metadata.mjs'))),
  checks, failures, observations, artifacts, source, graphs,
  hostBoundaries: ['Browser globals absent at real-module initialization; metadata window/navigator/dimensions supplied explicitly.',
    'Only element.animate and getComputedStyle are deterministic platform boundaries; no production modules, Vue or Motion/trace Owners were stubbed.',
    'No installUiMotion interaction tree or browser/compositor was executed. Existing immutable a1d6f GUI evidence is separate.'],
  limits: ['The new getter creates one fixed six-primitive object per metadata read; existing host clones the complete metadata. This is not zero allocation or a heap measurement.',
    'Does not prove real browser/UI motion, hardware timing, memory plateau, formal B/X/H performance, or whole Player/M1 isolation.',
    'Diagnostic bundles are current module functional artifacts, not the frozen a1d6f GUI build. All source/artifact hashes are recorded separately.'] }
await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ status: report.status, passed: checks.filter(row => row.status === 'passed').length, failed: failures.length, report: normal(relative(root, resolve(directory, 'report.json'))) }))
if (failures.length) process.exitCode = 1
