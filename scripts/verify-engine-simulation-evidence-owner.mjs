/** Exact-source paired evidence history/checksum audit. Functional checks, not a benchmark. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before'), mode = before ? 'before' : 'after'
const ownerOnly = process.argv.includes('--owner-only')
const cache = join(root, '.cache/engine-overhaul/simulation-evidence'), baselineRoot = join(cache, 'before-80d68-gc1jcs')
await mkdir(cache, { recursive: true }); const output = await mkdtemp(join(cache, `${mode}-`)), snapshot = join(output, 'source')
const sha = value => createHash('sha256').update(value).digest('hex'), norm = value => value.replaceAll('\\', '/'), copy = value => JSON.parse(JSON.stringify(value))
await writeFile(join(output, 'verifier.mjs'), await readFile(fileURLToPath(import.meta.url)), { flag: 'wx' })
const baselineBytes = await readFile(join(baselineRoot, 'source.json')), baseline = JSON.parse(baselineBytes), manifestBytes = await readFile(join(baselineRoot, 'engine-build-manifest.json')), manifest = JSON.parse(manifestBytes), manifestFiles = new Map(manifest.source.map(item => [norm(item.path), item]))
assert.equal(sha(manifestBytes), baseline.manifestSha256)
const old = new Map(), hashes = {}, currentHashes = new Map(), reached = new Set(), baselineOverlays = new Set()
const evidenceSourcePaths = new Set(['src/runtime/simulationEvidenceOwner.ts', 'src/runtime/simulationAuthoring26.ts', 'src/editor/simulationEvidenceAdapter.ts'])
for (const record of baseline.files) { const bytes = await readFile(join(baselineRoot, record.path)); assert.equal(sha(bytes), record.sha256); assert.equal(record.sha256, manifestFiles.get(record.path)?.sha256); if (/\.(ts|js|json)$/.test(record.path)) old.set(norm(join(root, record.path)), bytes.toString('utf8')) }
const checks = [], observations = [], runtimes = [], worlds = []
const check = (name, operation, scope = 'history-ownership') => { try { operation(); checks.push({ name, scope, status: 'PASSED' }) } catch (error) { checks.push({ name, scope, status: 'FAILED', error: error.stack ?? String(error) }) } }
const cleanup = { runtimes: [], worlds: [] }
let api, finished = false, failure = null, bundleEvidence = null
if (!globalThis.crypto) globalThis.crypto = webcrypto
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
try {
  const entries = {
    'src/runtime/simulationAuthoring26.ts': 'simulationEvidenceState, simulationStateChecksum, captureSimulationEvidence, clearSimulationEvidence, buildSimulationProductionReport',
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime, GameplayRuntimeCore',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/store/physics.ts': 'physicsState, createEditorWorld',
    'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'BehaviorTree2D, NavigationAgent2D',
    'src/runtime/aiTools.ts': 'blackboardSnapshot, setBlackboardValue',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmRuntimeWorld'
  }
  if (!before) { entries['src/runtime/simulationEvidenceOwner.ts'] = 'SimulationEvidenceOwner'; entries['src/editor/simulationEvidenceAdapter.ts'] = 'createEditorSimulationEvidenceOwner' }
  const entry = join(output, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${norm(join(root, path))}';`).join('\n') + "\nexport { toRaw, watch, nextTick } from 'vue';", { flag: 'wx' })
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'simulation-evidence-locked-source', enforce: 'pre', async load(id) {
    const path = norm(id.split('?')[0]); if (path.startsWith(norm(root) + '/src/') || path.startsWith(norm(root) + '/nova_core/pkg/')) {
      const current = await readFile(path), key = norm(relative(root, path)); currentHashes.set(path, sha(current))
      const baselineOverlay = before || ownerOnly && !evidenceSourcePaths.has(key)
      if (baselineOverlay && !old.has(path)) throw Error(`Missing immutable80d68 baseline production dependency: ${key}`)
      const bytes = baselineOverlay ? Buffer.from(old.get(path)) : current
      if (baselineOverlay) { assert.equal(sha(bytes), manifestFiles.get(key)?.sha256, `Unpaired80d68 baseline: ${key}`); baselineOverlays.add(path) }
      await mkdir(dirname(join(snapshot, key)), { recursive: true }); await writeFile(join(snapshot, key), bytes, { flag: 'wx' }); hashes[key] = { sha256: sha(bytes), currentSha256: sha(current), overlay: baselineOverlay, matches80d68Manifest: sha(bytes) === manifestFiles.get(key)?.sha256, snapshotPath: join(snapshot, key) }
      return bytes.toString('utf8')
    }
  }, buildEnd() { for (const id of this.getModuleIds()) { const path = norm(id.split('?')[0]); if (currentHashes.has(path)) reached.add(path) } } }], build: { ssr: true, outDir: output, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  for (const path of reached) hashes[norm(relative(root, path))].loadedInSsr = true
  bundleEvidence = { entrySha256: sha(await readFile(entry)), bundlePath: join(output, 'integration.mjs'), bundleSha256: sha(await readFile(join(output, 'integration.mjs'))) }
  api = await import(pathToFileURL(join(output, 'integration.mjs')).href)
  const wasm = await readFile(join(baselineRoot, 'nova_core/pkg/nova_core_bg.wasm')); assert.equal(sha(wasm), sha(await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')))); await api.initWasm({ module_or_path: wasm })
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance }); globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null }); globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false
  let id = 3000
  const entity = (uuid, x) => new api.BoxEntity(id++, { x, y: 10 }, { x: 1, y: 1 }, uuid)
  const fixedUuid = '11111111-1111-4111-8111-111111111111', first = entity(fixedUuid, 1), second = entity('22222222-2222-4222-8222-222222222222', 2)
  const state = api.simulationEvidenceState, framesIdentity = state.frames
  state.enabled = false; api.clearSimulationEvidence(); state.lastChecksum = 'sentinel-disabled'
  check('disabled-capture-preserves-last-checksum-and-does-not-add-history', () => { assert.equal(api.captureSimulationEvidence(1, [first], []), 'sentinel-disabled'); assert.equal(state.frames.length, 0); assert.equal(state.divergentFrame, -1) }, 'legacy-positive-control')
  state.enabled = true; api.clearSimulationEvidence(); const checksumOrder = api.simulationStateChecksum([first, second], []), reversed = api.simulationStateChecksum([second, first], [])
  check('original-checksum-keeps-stable-UUID-sort-quantization-and-16hex-format', () => { assert.equal(checksumOrder, reversed); assert.match(checksumOrder, /^[0-9a-f]{16}$/); const x = first.transform.position.x; first.transform.position.x += 1e-11; assert.equal(api.simulationStateChecksum([first, second], []), checksumOrder); first.transform.position.x = x }, 'legacy-positive-control')
  for (let frame = 0; frame < 605; frame++) api.captureSimulationEvidence(frame, [first, second], [])
  const cappedChecksum = state.lastChecksum; first.transform.position.x++
  const beyond = api.captureSimulationEvidence(900, [first, second], []); api.captureSimulationEvidence(2, [first, second], []); api.captureSimulationEvidence(3, [first, second], [])
  check('600-frame-cap-keeps-first-record-and-first-divergence-while-updating-last-checksum', () => { assert.equal(state.frames.length, 600); assert.deepEqual(state.frames.map(item => item.frame), Array.from({ length: 600 }, (_, index) => index)); assert.equal(state.frames[2].checksum, cappedChecksum); assert.notEqual(beyond, cappedChecksum); assert.equal(state.lastChecksum, beyond); assert.equal(state.divergentFrame, 2) }, 'legacy-positive-control')
  let watched = 0, deepWatched = 0; const unwatch = api.watch(() => state.lastChecksum, () => watched++, { flush: 'sync' }), undeep = api.watch(state, () => deepWatched++, { deep: true, flush: 'sync' })
  api.clearSimulationEvidence(); api.captureSimulationEvidence(1, [first, second], []); unwatch(); undeep()
  check('legacy-clear-preserves-enabled-same-frames-array-and-reactive-public-view', () => { assert.equal(state.enabled, true); assert.equal(state.frames, framesIdentity); assert(watched > 0); assert(deepWatched > 0) }, 'legacy-positive-control')
  const report = api.buildSimulationProductionReport([first, second], [], { gravity: 9.80665, tickRate: 60, timeScale: 1 })
  check('existing-authoring-report-retains-checksum-and-six-check-categories', () => { assert.equal(report.checksum, api.simulationStateChecksum([first, second], [])); assert.deepEqual(report.checks.map(item => item.id), ['units', 'colliders', 'constraints', 'navigation', 'ai', 'determinism']) }, 'legacy-positive-control')
  const worldA = api.createEditorWorld(), worldB = api.createEditorWorld(); worldA.entities.push(entity(fixedUuid, 1)); worldB.entities.push(entity(fixedUuid, 8))
  let ownerA, ownerB
  if (!before) { ownerA = api.createEditorSimulationEvidenceOwner(worldA, { legacyRoot: false }); ownerB = api.createEditorSimulationEvidenceOwner(worldB, { legacyRoot: false }) }
  const stateA = before ? state : ownerA.state, stateB = before ? state : ownerB.state
  const captureA = frame => before ? api.captureSimulationEvidence(frame, worldA.entities, worldA.connections) : ownerA.captureSimulationEvidence(frame, worldA.entities, worldA.connections)
  const captureB = frame => before ? api.captureSimulationEvidence(frame, worldB.entities, worldB.connections) : ownerB.captureSimulationEvidence(frame, worldB.entities, worldB.connections)
  api.clearSimulationEvidence(); stateA.enabled = true; stateB.enabled = true; captureA(1); const aFirst = copy(stateA); captureB(1)
  check('same-frame-two-Worlds-keep-separate-history-lastChecksum-and-divergence', () => { assert.deepEqual(copy(stateA), aFirst); assert.notEqual(stateA, stateB); assert.equal(stateA.divergentFrame, -1); assert.equal(stateB.divergentFrame, -1); assert.notEqual(stateA.lastChecksum, stateB.lastChecksum) })
  stateB.enabled = false; const aBeforeDisabledB = copy(stateA); captureB(2)
  check('World-B-enabled-toggle-and-disabled-capture-do-not-change-World-A', () => { assert.equal(stateA.enabled, true); assert.deepEqual(copy(stateA), aBeforeDisabledB); assert.equal(stateB.frames.length, 1) })
  const aBeforeClearB = copy(stateA); if (before) api.clearSimulationEvidence(); else ownerB.clearSimulationEvidence()
  check('explicit-clear-B-preserves-A-history-and-enable', () => { assert.deepEqual(copy(stateA), aBeforeClearB); assert.equal(stateB.frames.length, 0); assert.equal(stateB.enabled, false) })
  observations.push({ stage: 'per-world-evidence-direct', A: copy(stateA), B: copy(stateB), actualWorlds: worldA !== worldB })
  // Actual retained AI blackboard ownership gap: use real setters/snapshots, no empty-board substitute.
  worldA.entities[0].addComponent(new api.BehaviorTree2D()); worldB.entities[0].addComponent(new api.BehaviorTree2D())
  api.setBlackboardValue(fixedUuid, 'evidence.shared-key', 1); const checksumBeforeB = api.simulationStateChecksum(worldA.entities, [])
  api.setBlackboardValue(worldB.entities[0].uuid, 'evidence.shared-key', 2); const checksumAfterB = api.simulationStateChecksum(worldA.entities, [])
  observations.push({ stage: 'actual-retained-AI-global-blackboard-checksum', sharedAuthoringUuid: worldA.entities[0].uuid === worldB.entities[0].uuid, checksumBeforeB, checksumAfterB, realBlackboard: api.blackboardSnapshot(fixedUuid), scope: before ? 'original-global' : ownerA.checksumPort.scope, provenance: 'Real aiTools.setBlackboardValue/snapshot. State Owner migration does not isolate the AI blackboard.' })
  check('retained-AI-blackboard-of-B-does-not-affect-A-checksum', () => { assert.equal(checksumAfterB, checksumBeforeB) }, 'remaining-shared-ai')
  const attach = world => { world.runtime = new api.WasmRuntimeWorld(); world.wasmLoaded = true; worlds.push(world); return world }
  const rootWorld = attach(api.physicsState.world), editorHost = api.createEditorGameplayWorldHost(), services = api.createEditorGameplayScriptServices()
  Object.assign(api.physicsState.globalSettings, { tickRate: 60, timeScale: 1, gravity: 0, airFriction: 0 }); api.physicsState.playMode = 'playing'
  const host = (world, name) => ({ ...editorHost, state: { ...api.physicsState, world, camera: { scale: 1, offset: { x: 0, y: 0 } }, globalSettings: { ...api.physicsState.globalSettings }, engineDiagnostics: { ...api.physicsState.engineDiagnostics }, playMode: 'playing' }, get activeSceneUuid() { return name } })
  if (!ownerOnly) {
  const coreAWorld = attach(api.createEditorWorld()), coreBWorld = attach(api.createEditorWorld()); coreAWorld.entities.push(entity(fixedUuid, 1)); coreBWorld.entities.push(entity(fixedUuid, 8))
  const a = new api.GameplayRuntimeCore(services, host(coreAWorld, 'evidence-a')), b = new api.GameplayRuntimeCore(services, host(coreBWorld, 'evidence-b')); runtimes.push(a, b)
  const actualA = before ? state : a.worldGameplayOwner.ports.evidence.state, actualB = before ? state : b.worldGameplayOwner.ports.evidence.state
  a.beginSession(); b.beginSession(); actualA.enabled = true; actualB.enabled = true; a.frame(.02); b.frame(.02); a.frame(.02)
  const actualABeforeStop = copy(actualA); b.stopSession(false)
  observations.push({ stage: 'actual-normal-Core-stop-B-while-A-active', ABefore: actualABeforeStop, AAfter: copy(actualA), BAfter: copy(actualB), AActive: a.isActive, provenance: 'Actual Core begin/frame/stop, original WGO algorithms/service ports and ordinary WASM. No synthetic history entry or no-op service.' })
  check('actual-Core-B-stop-preserves-A-enabled-history-lastChecksum-and-divergence', () => { assert(actualABeforeStop.frames.length > 0); assert.equal(a.isActive, true); assert.deepEqual(copy(actualA), actualABeforeStop); assert.equal(actualB.frames.length, 0) })
  a.stopSession(false)
  }
  if (!before) {
    const legacy = api.createEditorSimulationEvidenceOwner(rootWorld, { legacyRoot: true })
    check('legacy-factory-shares-the-original-raw-view-foreign-factory-is-fresh-plain', () => { assert.equal(legacy.state, state); assert.equal(api.toRaw(legacy.state), api.toRaw(state)); assert.equal(ownerA.world, worldA); assert.equal(ownerB.world, worldB); assert.equal(api.toRaw(ownerA.state), ownerA.state); assert.notEqual(ownerA.state, state); assert.equal(ownerA.checksumPort.scope, 'shared-legacy-ai') })
    check('required-checksum-port-fixed-world-port-and-foreign-array-mismatch-rejected-without-state-change', () => {
      const beforeGuard = copy(ownerA.state), framesBeforeGuard = ownerA.state.frames
      assert.throws(() => new api.SimulationEvidenceOwner(worldA, null), /SIMULATION_EVIDENCE_CHECKSUM_PORT_REQUIRED/)
      assert.throws(() => new api.SimulationEvidenceOwner(worldA, { scope: 'fixed-world', world: worldB, blackboardSnapshot: api.blackboardSnapshot }), /SIMULATION_EVIDENCE_CHECKSUM_WORLD_MISMATCH/)
      assert.throws(() => ownerA.captureSimulationEvidence(800, worldB.entities, worldA.connections), /SIMULATION_EVIDENCE_WORLD_ARRAY_MISMATCH/)
      assert.throws(() => ownerA.captureSimulationEvidence(800, worldA.entities, worldB.connections), /SIMULATION_EVIDENCE_WORLD_ARRAY_MISMATCH/)
      assert.deepEqual(copy(ownerA.state), beforeGuard); assert.equal(ownerA.state.frames, framesBeforeGuard)
      const sameStateOwner = new api.SimulationEvidenceOwner(worldA, { scope: 'fixed-world', world: worldA, blackboardSnapshot: api.blackboardSnapshot }, ownerA.state)
      assert.equal(sameStateOwner.state, ownerA.state); assert.deepEqual(copy(ownerA.state), beforeGuard); assert.equal(ownerA.state.frames, framesBeforeGuard)
    })
  }
  await Promise.resolve(); await Promise.resolve(); finished = true
} catch (error) { failure = error.stack ?? String(error) }
finally {
  for (const [index, runtime] of runtimes.entries()) { try { runtime.stopSession(false); cleanup.runtimes.push({ index, active: runtime.isActive, inputAttached: runtime.input.attached, vmReleased: runtime.scriptRuntime === null }) } catch (error) { cleanup.runtimes.push({ index, error: String(error) }) } }
  for (const [index, world] of worlds.entries()) { try { world.runtime?.free(); world.runtime = null; world.wasmLoaded = false; cleanup.worlds.push({ index, released: true }) } catch (error) { cleanup.worlds.push({ index, error: String(error) }) } }
  const sourceChangesDuringRun = [], workspaceOverlayChangesDuringRun = []; for (const [path, hash] of currentHashes) if (sha(await readFile(path)) !== hash) (baselineOverlays.has(path) ? workspaceOverlayChangesDuringRun : sourceChangesDuringRun).push(norm(relative(root, path)))
  if (sourceChangesDuringRun.length) failure = `${failure ?? ''}\nSource changed during validation: ${sourceChangesDuringRun.join(', ')}`
  const historyFailed = checks.filter(c => c.scope === 'history-ownership' && c.status === 'FAILED').length, controlFailed = checks.filter(c => c.scope === 'legacy-positive-control' && c.status === 'FAILED').length, sharedAiFailed = checks.filter(c => c.scope === 'remaining-shared-ai' && c.status === 'FAILED').length
  const status = failure || !finished || controlFailed ? 'FAILED' : historyFailed ? (before ? 'BASELINE_HISTORY_NOT_PASSED' : 'HISTORY_NOT_PASSED') : sharedAiFailed ? 'HISTORY_VERIFIED_SHARED_AI_NOT_PASSED' : 'HISTORY_VERIFIED'
  hashes['scripts/verify-engine-simulation-evidence-owner.mjs'] = { sha256: sha(await readFile(fileURLToPath(import.meta.url))), loadedInSsr: false }
  hashes['nova_core/pkg/nova_core_bg.wasm'] = { sha256: baseline.files.find(item => item.path.endsWith('_bg.wasm')).sha256, executed: true }
  await writeFile(join(output, 'report.json'), JSON.stringify({ schema: 'nova-simulation-evidence-owner-verification-v1', generatedAt: new Date().toISOString(), mode, ownerOnly, ownerOnlySourceComposition: ownerOnly ? 'Immutable80d68 production dependency closure plus exactly the 3 actual evidence production sources; no claim of integrated current WGO/Core.' : null, status, checks, observations, sourceHashes: hashes, loadedSources: [...reached].sort().map(path => norm(relative(root, path))), sourceChangesDuringRun, workspaceOverlayChangesDuringRun, bundleEvidence, baseline: { buildId: baseline.buildId, sourceHash: baseline.sourceHash, sourceRecordSha256: sha(baselineBytes), manifestSha256: baseline.manifestSha256 }, cleanup, environment: { node: process.version, platform: process.platform, architecture: process.arch, execution: ownerOnly ? 'Actual Node SSR Owner/facade/Vue checks; ordinary WASM initialized but no Core lifecycle' : 'Actual Node SSR Core and ordinary WASM functional checks', graphicsBackend: null, browser: null, performanceComparison: false }, limitations: ['Evidence history/state ownership only; current checksum AI blackboard remains truly shared and separately failed.', 'No browser, GUI, Worker, Player, GPU, motion or formal performance test.', 'Core foreign worlds use actual original remaining navigation/pool/prefab/stream/AI/particle services, without no-op replacements.', 'Pure owner guards are after-only API additions and are not claimed available before migration.'], failure }, null, 2), { flag: 'wx' })
  console.log(JSON.stringify({ mode, status, checks: checks.length, passed: checks.filter(c => c.status === 'PASSED').length, historyFailed, controlFailed, sharedAiFailed, report: join(output, 'report.json'), failure }))
  if (failure || !finished || controlFailed || !before && historyFailed) process.exitCode = 1
}
