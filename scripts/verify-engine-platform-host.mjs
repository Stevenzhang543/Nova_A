/** Actual compiled host and shared Coordinator with controlled platform owners; no hardware claims. */
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { build } from 'vite'

const root = resolve(process.cwd()), directory = await mkdtemp(join(tmpdir(), 'nova-platform-host-'))
const modules = new Set(), checks = []
await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true },
  define: { 'import.meta.env.VITE_NOVA_PERFORMANCE_TRACE': '"0"' },
  plugins: [{ name: 'actual-platform-dependency-graph', generateBundle() { for (const id of this.getModuleIds()) modules.add(id) } }],
  build: { ssr: true, outDir: directory, emptyOutDir: false, rollupOptions: {
    input: { host: join(root, 'src/platform/performanceHost.ts'), services: join(root, 'src/runtime/performance/services.ts') },
    output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
const { installPerformanceHost } = await import(pathToFileURL(join(directory, 'host.mjs')).href)
const { performanceCoordinator, auxiliaryWork } = await import(pathToFileURL(join(directory, 'services.mjs')).href)
const prior = Object.fromEntries(['document', 'localStorage', 'navigator', 'requestAnimationFrame'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
const listeners = new Set(), storage = new Map()
const documentOwner = { hidden: false, addEventListener(name, listener) { assert.equal(name, 'visibilitychange'); listeners.add(listener) },
  removeEventListener(name, listener) { assert.equal(name, 'visibilitychange'); listeners.delete(listener) } }
const expose = (name, value) => Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
expose('document', documentOwner)
expose('localStorage', { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) })
expose('navigator', { hardwareConcurrency: 8 })
let frameRequests = 0
expose('requestAnimationFrame', () => { frameRequests++; return frameRequests })
const check = (name, run) => { run(); checks.push({ name, status: 'PASS' }) }
const visibility = hidden => { documentOwner.hidden = hidden; for (const listener of [...listeners]) listener() }
try {
  check('actual-platform-module-graph-has-no-framework-editor-store-or-asset-owner', () => {
    assert.deepEqual([...modules].filter(id => /node_modules.*(?:vue|pinia|tauri)|src[\\/](?:editor|store|components|ui|assets)[\\/]/i.test(id)), [])
  })
  check('services-are-explicit-and-optional-without-an-extra-frame-loop', () => {
    const host = installPerformanceHost()
    assert.equal(performanceCoordinator.snapshot.heavyJobAdmissionLimit, 2)
    assert.equal(performanceCoordinator.snapshot.mode, 'interactive'); assert.equal(listeners.size, 1)
    host.dispose(); host.dispose(); assert.equal(listeners.size, 0); assert.equal(frameRequests, 0)
    assert.throws(() => host.configure({ experienceMode: 'quiet' }), /PERFORMANCE_HOST_DISPOSED/)
  })
  check('actual-activity-is-restored-after-hidden-and-invalid-late-events-are-ignored', () => {
    let activity, stopped = 0, publications = 0
    const host = installPerformanceHost({ publishBudget: () => { publications++ },
      subscribeActivity: listener => { activity = listener; listener('playing'); return () => { stopped++ } } })
    assert.equal(performanceCoordinator.snapshot.mode, 'playing')
    visibility(true); assert.equal(performanceCoordinator.snapshot.mode, 'hidden')
    activity('loading'); assert.equal(performanceCoordinator.snapshot.mode, 'hidden')
    visibility(false); assert.equal(performanceCoordinator.snapshot.mode, 'loading')
    activity('invalid'); assert.equal(performanceCoordinator.snapshot.mode, 'loading')
    host.dispose(); host.dispose(); const published = publications
    activity('exporting'); visibility(true); visibility(false); performanceCoordinator.configure({})
    assert.equal(publications, published); assert.equal(stopped, 1); assert.equal(listeners.size, 0)
  })
  check('injected-existing-frame-owner-feeds-policy-and-disposal-stops-late-observations', () => {
    let frame, stopped = 0
    const host = installPerformanceHost({ subscribeFrames: listener => { frame = listener; return () => { stopped++ } } })
    for (let time = 0; time <= 1000; time += 100) frame({ cpuFrameMs: 2, rafIntervalMs: 16, submissionIntervalMs: 16, inputToSubmitMs: null, gpuMs: null }, time)
    assert.equal(performanceCoordinator.snapshot.framePeriodEstimateMs, 16)
    assert.equal(performanceCoordinator.snapshot.confidence, 'measured')
    host.dispose(); const revision = performanceCoordinator.snapshot.revision
    frame({ cpuFrameMs: 100, rafIntervalMs: 16, submissionIntervalMs: 16, inputToSubmitMs: null, gpuMs: null }, 2000)
    assert.equal(performanceCoordinator.snapshot.revision, revision); assert.equal(stopped, 1); assert.equal(frameRequests, 0)
  })
  check('old-installation-cleanup-cannot-change-the-replacement-activity', () => {
    let oldActivity, currentActivity
    const old = installPerformanceHost({ subscribeActivity: listener => { oldActivity = listener; return () => {} } })
    old.dispose()
    const current = installPerformanceHost({ subscribeActivity: listener => { currentActivity = listener; listener('playing'); return () => {} } })
    old.dispose(); oldActivity('interactive'); assert.equal(performanceCoordinator.snapshot.mode, 'playing')
    visibility(true); currentActivity('recovering'); visibility(false)
    assert.equal(performanceCoordinator.snapshot.mode, 'recovering'); current.dispose()
  })
  check('failed-partial-installation-removes-observation-and-budget-subscriptions', () => {
    let publications = 0, stopped = 0
    assert.throws(() => installPerformanceHost({ publishBudget: () => { publications++ },
      subscribeFrames: () => () => { stopped++ }, subscribeActivity: () => { throw new Error('activity-source-failed') } }), /activity-source-failed/)
    assert.equal(stopped, 1); assert.equal(listeners.size, 0)
    const priorPublications = publications; performanceCoordinator.configure({})
    assert.equal(publications, priorPublications)
  })
  check('preference-persistence-and-corrupt-input-keep-safe-comfortable-policy', () => {
    storage.set('nova-a.performance-policy.v1', 'corrupt JSON')
    const host = installPerformanceHost()
    assert.equal(performanceCoordinator.config.experienceMode, 'balanced')
    host.configure({ experienceMode: 'quiet', maxAssetWorkers: 2, maxComputeHelpers: 2, maxSubmissionCredits: 1 })
    assert.equal(JSON.parse(storage.get('nova-a.performance-policy.v1')).experienceMode, 'quiet')
    host.dispose(); const reloaded = installPerformanceHost()
    assert.equal(performanceCoordinator.config.experienceMode, 'quiet'); assert.equal(performanceCoordinator.snapshot.heavyJobAdmissionLimit, 1)
    assert.equal(performanceCoordinator.snapshot.gpuSubmissionCreditLimit, 1)
    assert.equal(frameRequests, 0); reloaded.dispose()
  })
  const sourceHashes = Object.fromEntries(await Promise.all([...modules].filter(id => id.startsWith(root.replaceAll('\\', '/')) || id.startsWith(root)).map(async id => {
    const path = relative(root, id).replaceAll('\\', '/'); return [path, createHash('sha256').update(await readFile(id)).digest('hex')]
  })))
  const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), status: 'VERIFIED_CONTROLLED_PLATFORM_TESTS', checks,
    sources: sourceHashes, moduleGraph: [...modules].map(id => relative(root, id).replaceAll('\\', '/')).sort(),
    limitations: ['Actual compiled platform module and shared Coordinator; document/activity/frame owners are controlled fixtures.',
      'No separate frame loop. No browser, hardware/GPU, power, Player isolation or full M1 qualification.'] }
  const output = join(root, '.cache/engine-overhaul/platform-host-functional.json')
  await mkdir(resolve(output, '..'), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ status: report.status, checks: checks.length, report: output }))
} finally {
  auxiliaryWork.dispose()
  for (const [name, descriptor] of Object.entries(prior)) { if (descriptor) Object.defineProperty(globalThis, name, descriptor); else delete globalThis[name] }
}
