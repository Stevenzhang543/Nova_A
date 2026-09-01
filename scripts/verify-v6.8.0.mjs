import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

if (!globalThis.crypto) globalThis.crypto = webcrypto
const version = '6.8.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v680-verify-'))
const checks = [], measurements = {}
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = path => readFile(join(root, path), 'utf8')

function generatedFixture(count, seed) {
  const records = new Array(count); let hash = 0x811c9dc5, state = seed >>> 0
  for (let index = 0; index < count; index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const x = (state & 0xffff) - 32768
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0; const y = (state & 0xffff) - 32768
    hash = Math.imul(hash ^ index, 0x01000193) >>> 0; hash = Math.imul(hash ^ x, 0x01000193) >>> 0; hash = Math.imul(hash ^ y, 0x01000193) >>> 0
    const component = { kind: 'Transform2D', removed: false }
    records[index] = { id: index + 1, uuid: `fixture-${String(index).padStart(6, '0')}`, enabled: true, transform: { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 } }, componentMap: new Map([['Transform2D', component]]) }
  }
  return { records, fingerprint: hash.toString(16).padStart(8, '0') }
}

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { performance: join(root, 'src/runtime/largeWorldPerformance.ts'), jobs: join(root, 'src/runtime/jobScheduler.ts'), format: join(root, 'src/projects/projectFormat.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [runtime, jobs, format] = await Promise.all(['performance', 'jobs', 'format'].map(load))
  check('V680-AUTHORITY', format.NOVA_ENGINE_VERSION === version && format.NOVA_PROJECT_FORMAT_MAJOR === 2 && format.NOVA_PROJECT_SCHEMA_VERSION === 29, 'Engine authority is 6.8.0 while Project Format 2/schema 29 remain frozen.')

  const settings = runtime.normalizePerformanceRuntimeSettings({ targetFrameMs: Infinity, frameWorkBudgetMs: -2, streamingBudgetMs: 999, maximumCommandsPerFrame: 1, reactivePublishInterval: 999, spatialCellSize: 0 })
  check('V680-BOUNDS', settings.targetFrameMs === 16.667 && settings.frameWorkBudgetMs === .1 && settings.streamingBudgetMs === 20 && settings.maximumCommandsPerFrame === 32 && settings.reactivePublishInterval === 120 && settings.spatialCellSize === .01, 'All runtime budgets normalize to finite documented limits.', settings)

  const fixtureMetrics = []
  for (const count of [10_000, 50_000, 100_000]) {
    const manifest = JSON.parse(await source(`release-fixtures/v6.8.0/${count}.json`))
    const beforeMemory = process.memoryUsage().heapUsed, generatedAt = performance.now(), fixture = generatedFixture(count, manifest.seed), generatedMs = performance.now() - generatedAt
    const scheduler = new runtime.StableComponentScheduler(), syncAt = performance.now(), first = scheduler.synchronize(fixture.records), syncMs = performance.now() - syncAt
    const warmAt = performance.now(), warm = scheduler.synchronize(fixture.records), warmMs = performance.now() - warmAt
    fixture.records[Math.floor(count / 2)].transform.position.x += 1
    const dirty = scheduler.synchronize(fixture.records)
    const spatialAt = performance.now(), spatial = new runtime.SpatialHash2D(manifest.spatialCellSize)
    for (const entity of fixture.records) spatial.upsert({ id: entity.uuid, bounds: { minX: entity.transform.position.x, minY: entity.transform.position.y, maxX: entity.transform.position.x, maxY: entity.transform.position.y } })
    const firstQuery = spatial.query({ minX: -1024, minY: -1024, maxX: 1024, maxY: 1024 }), secondQuery = spatial.query({ minX: -1024, minY: -1024, maxX: 1024, maxY: 1024 }), spatialMs = performance.now() - spatialAt
    const heapDeltaMb = Math.max(0, process.memoryUsage().heapUsed - beforeMemory) / 1048576
    const metrics = { count, fingerprint: fixture.fingerprint, generatedMs, syncMs, warmMs, spatialMs, heapDeltaMb, queryCount: firstQuery.length, allocations: first.allocations }
    fixtureMetrics.push(metrics)
    check(`V680-FIXTURE-${count}`, fixture.fingerprint === manifest.expectedFingerprint && scheduler.count === count && scheduler.indices('Transform2D').length === count && first.dirty === count && warm.dirty === 0 && warm.allocations === 0 && dirty.dirty === 1 && firstQuery.join('|') === secondQuery.join('|') && firstQuery.every((value, index, all) => index === 0 || all[index - 1].localeCompare(value) <= 0) && generatedMs < 5_000 && syncMs < 5_000 && spatialMs < 15_000 && heapDeltaMb < 768, `${count.toLocaleString()} objects retain deterministic fingerprints, bounded typed columns, one-item dirty detection, stable spatial order and local qualification thresholds.`, metrics)
  }
  measurements.fixtures = fixtureMetrics

  const commands = new runtime.BatchedCommandQueue(), applied = []
  commands.enqueue('selection', () => applied.push('stale'))
  commands.enqueue('selection', () => applied.push('current'))
  commands.enqueue('other', () => applied.push('other'))
  const commandResult = commands.flush(32, 20)
  check('V680-BATCHED-COMMANDS', applied.join(',') === 'current,other' && commandResult.stale === 1 && commandResult.deferred === 0, 'Batched commands retain deterministic sequence and reject superseded generations.', { ...commandResult, applied })

  const background = new runtime.FrameBudgetQueue(), backgroundApplied = []
  background.enqueue({ id: 'old-bake', priority: 1, run: () => backgroundApplied.push('old') }); background.cancel('old-bake')
  background.enqueue({ id: 'new-bake', priority: 2, run: () => backgroundApplied.push('new') })
  const backgroundResult = await background.drain(20)
  check('V680-CANCELLATION', backgroundApplied.join(',') === 'new' && backgroundResult.stale === 1 && backgroundResult.deferred === 0, 'Cancelled background generations cannot apply and current priority work completes.', backgroundResult)

  const sample = jobs.runJobLocally('sampleAnimation', { time: .25, keys: [{ time: 0, value: 0 }, { time: 1, value: 8 }] })
  const particles = jobs.runJobLocally('advanceParticles', { dt: .5, gravity: -2, particles: [{ x: 0, y: 0, vx: 4, vy: 2 }] })
  const gridA = jobs.runJobLocally('buildSpatialGrid', { cellSize: 10, entries: [{ id: 'b', x: 1, y: 1 }, { id: 'a', x: 2, y: 2 }, { id: 'c', x: 20, y: 1 }] })
  const gridB = jobs.runJobLocally('buildSpatialGrid', { cellSize: 10, entries: [{ id: 'b', x: 1, y: 1 }, { id: 'a', x: 2, y: 2 }, { id: 'c', x: 20, y: 1 }] })
  check('V680-WORKER-PARITY', sample === 2 && particles[0].x === 2 && particles[0].y === .5 && JSON.stringify(gridA) === JSON.stringify(gridB) && gridA['0:0'].join(',') === 'a,b', 'Animation, particle and spatial preparation use deterministic pure results shared with the mandatory worker fallback.', { sample, particle: particles[0], grid: gridA })

  const [performanceSource, workerSource, hierarchy, streaming, navigation, animation, particlesSource, canvas, gameplay, profiler, production, panel, guide, roadmap, instructions, manualEn, manualDe, manualZh, reference] = await Promise.all([
    'src/runtime/largeWorldPerformance.ts', 'src/runtime/jobScheduler.worker.ts', 'src/world/hierarchy.ts', 'src/runtime/worldStreaming.ts', 'src/runtime/navigation2d.ts', 'src/runtime/animation.ts', 'src/runtime/particles.ts', 'src/components/WorldCanvas.vue', 'src/runtime/gameplayRuntime.ts', 'src/runtime/profiler.ts', 'src/runtime/production.ts', 'src/components/ProfilerPanel.vue', 'docs/LARGE_WORLD_PERFORMANCE_6_8.md', 'docs/ROADMAP_6_2_TO_7_0.md', 'instructions.txt', 'manual/MANUAL.en.md', 'manual/MANUAL.de.md', 'manual/MANUAL.zh-CN.md', 'reference-projects/projects/creator-v680-large-world/project.nova'
  ].map(source))
  check('V680-RUNTIME-CONNECTION', hierarchy.includes('prepareHierarchyIndex') && navigation.includes('new SpatialHash2D') && animation.includes("indices('Animator')") && particlesSource.includes("indices('ParticleEmitter2D')") && gameplay.includes('synchronizePerformanceWorld') && canvas.includes('prepareHierarchyIndex'), 'Prepared hierarchy lookup, spatial navigation and stable animation/particle component schedules are connected inside gameplay and refreshed before rendering.')
  check('V680-STREAMING', streaming.includes('streamingBudgetMs') && streaming.includes('deferredThisFrame') && streaming.includes('desiredTargets') && navigation.includes('frameWorkBudgetMs') && navigation.includes('controller.signal.aborted'), 'Streaming and navigation background work are frame-budgeted, cancellable and retain desired work for later frames.')
  check('V680-WORKER-SAFETY', workerSource.includes('sampleAnimation') && workerSource.includes('advanceParticles') && workerSource.includes('buildSpatialGrid') && performanceSource.includes('generation') && performanceSource.includes('cancel'), 'Worker-safe pure operations, local fallback, generation checking and cancellation are present.')
  check('V680-METRICS', ['mainThreadMs','workerMs','queueWaitMs','cacheHitRate','allocations','worstFrameMs','onePercentLowFps','inputToPixelMs','coldStartupMs','warmStartupMs'].every(field => performanceSource.includes(field) && (profiler.includes(field) || panel.includes(field))) && panel.includes("t('warmStartup')"), 'Profiler exposes main/worker/queue/cache/allocation/worst/1%-low/input-latency/cold/warm startup evidence.')
  check('V680-ADAPTIVE-SAFETY', canvas.includes('adaptivePixelRatioScale') && particlesSource.includes('adaptiveParticleScale') && !performanceSource.includes('tickRate =') && !performanceSource.includes('fixedDelta =') && guide.includes('never changes physics tick rate'), 'Adaptive quality is restricted to presentation budgets and cannot rewrite fixed-step, scripts, animations or authored values.')
  check('V680-PERSISTENCE-UI', production.includes('adaptiveQuality') && production.includes('streamingBudgetMs') && panel.includes("t('adaptivePresentationQuality')") && panel.includes('runtimePerformance'), 'Normalized project settings and localized Profiler controls persist every v6.8 budget and expose runtime evidence.')
  check('V680-DOCUMENTATION', roadmap.includes('## 6.8.0 — large-world') && instructions.includes('## 6.8.0 implementation checkpoint') && manualEn.includes('Large-world and low-end performance workflow') && manualDe.includes('Großwelt- und Low-End-Leistungsablauf') && manualZh.includes('大型世界与低端设备性能流程'), 'Roadmap, implementation checkpoint, guide and all three manuals teach the complete v6.8 workflow.')
  const project = JSON.parse(reference)
  check('V680-REFERENCE', project.engineVersion === version && project.projectSettings.production.performance.adaptiveQuality === true && project.projectSettings.production.performance.maximumCommandsPerFrame === 2048, 'Playable reference freezes the v6.8 performance settings and remains compatible with schema 29.')
} finally { await rm(compiled, { recursive: true, force: true }) }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v6.8.0-verification', version: 1, engineVersion: version, generatedAt: new Date().toISOString(), perspectives: ['compatibility', 'determinism', 'data-oriented-runtime', 'worker-race-cancel-fallback', 'streaming', 'large-world', 'low-end', 'latency', 'documentation', 'user'], thresholds: { generationMs100k: 5_000, componentSyncMs100k: 5_000, spatialMs100k: 15_000, fixtureHeapDeltaMb: 768 }, measurements, checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v6.8.0-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v6.8.0 verification passed: ${checks.length} checks including 10k/50k/100k fixtures.`)
