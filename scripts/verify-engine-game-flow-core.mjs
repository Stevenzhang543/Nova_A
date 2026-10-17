/** Actual Core + ordinary WASM integration. This does not certify every subsystem's World isolation. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'
import { canonicalCoreBeforeGameFlow, canonicalCompatBeforeGameFlow } from './lib/gameFlowCoreContract.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const before = process.argv.includes('--before'), mode = before ? 'before' : 'after'
const outputRoot = join(root, '.cache/engine-overhaul/game-flow/core-integration')
await mkdir(outputRoot, { recursive: true })
const output = await mkdtemp(join(outputRoot, `${mode}-`))
const normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
const hashes = {}, sourceBeforeRun = {}, checks = [], limitations = [], observations = [], runtimes = [], worlds = []
let failure = null, finished = false, api, cleanup = { runtimes: [], worlds: [] }, ssrLoadedSources = [], buildEvidence = null
const sourceFiles = ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/GameplayRuntime.ts', 'src/runtime/gameFlow.ts', 'src/runtime/gameplayComponents.ts', 'src/runtime/gameFlowOwner.ts', 'src/editor/gameFlowAdapter.ts', 'src/runtime/gameplayWorldHost.ts', 'src/editor/gameplayWorldHost.ts', 'src/store/physics.ts', 'src/store/editor.ts', 'src/world/World.ts', 'src/world/Entity.ts', 'src/world/components.ts', 'src/world/hierarchy.ts', 'src/world/geometry.ts', 'nova_core/pkg/nova_core.js', 'nova_core/pkg/nova_core_bg.wasm', 'nova_core/pkg/nova_core.d.ts', 'scripts/fixtures/game-flow-core-transform-v1.json', 'scripts/lib/gameFlowCoreContract.mjs', 'scripts/verify-engine-game-flow-core.mjs']
const originals = new Map()
const baselineFor = path => ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/GameplayRuntime.ts'].includes(path)
  ? join(root, '.cache/engine-overhaul/game-flow/root-before-retry1', path.replaceAll('/', '_'))
  : join(root, '.cache/engine-overhaul/game-flow/before', path)
for (const path of sourceFiles) {
  const current = await readFile(join(root, path)); sourceBeforeRun[path] = sha(current)
  if (before && ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/GameplayRuntime.ts', 'src/runtime/gameFlow.ts', 'src/runtime/gameplayComponents.ts'].includes(path)) originals.set(normalize(join(root, path)), await readFile(baselineFor(path), 'utf8'))
  hashes[path] = { sha256: sha(originals.get(normalize(join(root, path))) ?? current), currentSha256: sha(current), overlay: originals.has(normalize(join(root, path))) }
}
const check = (name, operation) => { operation(); checks.push({ name, status: 'PASSED' }) }
const target = (name, operation) => {
  try { operation(); checks.push({ name, status: 'PASSED' }) }
  catch (error) { checks.push({ name, status: 'FAILED', error: error.stack ?? String(error) }); if (!before) throw error }
}
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })

try {
  // The paired baseline uses its own original modules, never the new Editor adapter or a fake GameFlow implementation.
  assert.equal(await canonicalCoreBeforeGameFlow(await readFile(join(root, sourceFiles[0]), 'utf8')), await readFile(baselineFor(sourceFiles[0]), 'utf8'))
  assert.equal(await canonicalCompatBeforeGameFlow(await readFile(join(root, sourceFiles[1]), 'utf8')), await readFile(baselineFor(sourceFiles[1]), 'utf8'))
  const entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime, gameplayRuntime, GameplayRuntimeCore',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/store/physics.ts': 'physicsState, sceneManager, createEditorWorld',
    'src/store/editor.ts': 'editorState', 'src/assets/AssetDatabase.ts': 'assetState',
    'src/assets/types.ts': 'defaultScriptMetadata', 'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'Script2D, Health2D, Collectible2D',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'src/runtime/gameFlow.ts': 'gameFlowState, gameFlowSnapshot',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmRuntimeWorld, WasmScriptRuntime'
  }
  if (!before) { entries['src/runtime/gameFlowOwner.ts'] = 'GameFlowOwner'; entries['src/editor/gameFlowAdapter.ts'] = 'getEditorGameFlowOwner' }
  const entry = join(output, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n') + (!before ? "\nexport { toRaw } from 'vue';" : ''))
  const loadedSources = new Set()
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'paired-real-game-flow-integration', enforce: 'pre', load(id) { return originals.get(normalize(id)) }, buildEnd() { for (const id of this.getModuleIds()) { const path = normalize(id.split('?')[0]); if (path.startsWith(`${normalize(root)}/src/`) || path.startsWith(`${normalize(root)}/nova_core/pkg/`)) loadedSources.add(path) } } }], build: { ssr: true, outDir: output, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  for (const path of [...loadedSources].sort()) {
    const key = normalize(relative(root, path)), bytes = originals.get(path) ?? await readFile(path)
    hashes[key] = { sha256: sha(bytes), currentSha256: sha(await readFile(path)), overlay: originals.has(path) }
  }
  ssrLoadedSources = [...loadedSources].sort().map(path => normalize(relative(root, path)))
  for (const [path, record] of Object.entries(hashes)) record.loadedInSsr = ssrLoadedSources.includes(path)
  if (before) {
    assert(!ssrLoadedSources.includes('src/editor/gameFlowAdapter.ts'), 'Paired baseline must not load the new Editor GameFlow adapter')
    assert(!ssrLoadedSources.includes('src/runtime/gameFlowOwner.ts'), 'Paired baseline must execute the original global Owner')
  }
  buildEvidence = { entrySha256: sha(await readFile(entry)), bundleSha256: sha(await readFile(join(output, 'integration.mjs'))), entryPath: entry, bundlePath: join(output, 'integration.mjs') }
  api = await import(pathToFileURL(join(output, 'integration.mjs')).href)
  await api.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  // Supply only browser event surfaces. Input/Core/World/gameplay/VM implementations remain real.
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance })
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null })
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false
  const attach = world => { world.runtime = new api.WasmRuntimeWorld(); world.wasmLoaded = true; worlds.push(world); return world }
  const originalWorld = attach(api.physicsState.world), services = api.createEditorGameplayScriptServices(), editorHost = api.createEditorGameplayWorldHost()
  const initial = { scale: api.physicsState.globalSettings.timeScale, mode: api.physicsState.playMode }
  const source = score => `@export let seen_score = 0.0;\n@export let seen_paused = false;\n@export let seen_session = "";\n@export let seen_checkpoint = false;\n@export let frames = 0;\nfn awake() { score_set(${score}.0); session_set("owner", entity_name()); checkpoint_set("save"); }\nfn update(dt) { frames += 1; seen_score = score_get(); seen_paused = game_paused(); seen_session = session_get("owner", "missing"); seen_checkpoint = checkpoint_has("save"); }\nfn mutate() { score_add(5.0); session_set("owner", "changed"); set_position(44.0, 55.0); game_pause(true); }\nfn recover() { checkpoint_restore("save"); game_pause(false); }`
  const records = [10, 11, 22].map(score => ({ uuid: `game-flow-core-${score}`, name: `GameFlow ${score}`, path: `Assets/game-flow-${score}.rhai`, assetType: 'script', source: source(score), script: api.defaultScriptMetadata() }))
  api.assetState.records.splice(0, api.assetState.records.length, ...records); api.assetState.generation++
  let id = 400
  const make = (label, record, position) => { const entity = new api.BoxEntity(id++, position, { x: 1, y: 1 }); entity.name = label; entity.isStatic = true; entity.addComponent(new api.Script2D()).scriptAsset = record.uuid; const health = entity.addComponent(new api.Health2D()); health.maximum = 100; health.current = 80; return entity }
  const editorEntity = make('Editor baseline', records[0], { x: 2, y: 3 }); originalWorld.entities.splice(0, originalWorld.entities.length, editorEntity)
  api.physicsState.globalSettings.timeScale = 2; api.physicsState.playMode = 'playing'
  const compatibility = new api.GameplayRuntime(); runtimes.push(compatibility)
  compatibility.beginSession(); compatibility.frame(.025)
  check('compat-normal-lifecycle-real-Rhai-commands-and-following-context', () => {
    assert.equal(editorEntity.script2D.lastError, null); assert.equal(editorEntity.script2D.properties.seen_score, 10); assert.equal(editorEntity.script2D.properties.seen_session, 'Editor baseline'); assert.equal(editorEntity.script2D.properties.seen_checkpoint, true); assert.equal(api.gameFlowState.score, 10)
    if (!before) { assert.equal(compatibility.gameFlowOwner, api.getEditorGameFlowOwner()); assert.equal(compatibility.gameFlowOwner.state, api.gameFlowState); assert.equal(compatibility.gameFlowOwner.world, originalWorld) }
  })
  compatibility.runEntityFunction(editorEntity, 'mutate')
  const immediateMutationPose = { ...editorEntity.transform.position }
  compatibility.frame(.025)
  observations.push({ stage: 'compat-command-before-and-after-frame', immediateMutationPose, afterFramePose: { ...editorEntity.transform.position }, note: 'Transform is diagnostic context only; this slice does not change World transform synchronization.' })
  check('compat-pause-does-not-suppress-update-or-delay-real-state', () => { assert.equal(api.physicsState.globalSettings.timeScale, 0); assert.equal(editorEntity.script2D.properties.seen_paused, true); assert.equal(editorEntity.script2D.properties.seen_score, 15); assert.equal(editorEntity.script2D.properties.seen_session, 'changed') })
  compatibility.runEntityFunction(editorEntity, 'recover'); compatibility.frame(.025)
  check('compat-checkpoint-and-resume-preserve-original-World-contract', () => { assert.equal(api.physicsState.globalSettings.timeScale, 2); assert.equal(editorEntity.transform.position.x, 2); assert.equal(editorEntity.transform.position.y, 3); assert.equal(editorEntity.script2D.properties.seen_score, 10); assert.equal(editorEntity.script2D.properties.seen_session, 'Editor baseline'); assert.equal(editorEntity.script2D.lastError, null) })
  compatibility.stopSession(false)
  check('compat-stop-clears-flow-and-releases-actual-input-and-VM', () => { assert.equal(compatibility.isActive, false); assert.equal(compatibility.input.attached, false); assert.equal(compatibility.scriptRuntime, null); assert.deepEqual(api.gameFlowSnapshot(), { paused: false, score: 0, session: {}, checkpoints: [] }) })
  const newHost = (world, scale, scene) => { const state = { ...api.physicsState, world, globalSettings: { ...api.physicsState.globalSettings, timeScale: scale }, engineDiagnostics: { ...api.physicsState.engineDiagnostics }, playMode: 'playing' }; return { ...editorHost, state, get activeSceneUuid() { return scene } } }
  const worldA = attach(api.createEditorWorld()), worldB = attach(api.createEditorWorld()), entityA = make('World A', records[1], { x: 7, y: 8 }), entityB = make('World B', records[2], { x: 17, y: 18 })
  worldA.entities.splice(0, worldA.entities.length, entityA); worldB.entities.splice(0, worldB.entities.length, entityB)
  const hostA = newHost(worldA, 1.5, 'scene-a'), hostB = newHost(worldB, .75, 'scene-b')
  const a = new api.GameplayRuntimeCore(services, hostA), b = new api.GameplayRuntimeCore(services, hostB); runtimes.push(a, b)
  const flow = runtime => before ? api.gameFlowSnapshot() : runtime.gameFlowOwner.gameFlowSnapshot()
  a.beginSession(); a.frame(.025); const aBeforeB = flow(a); b.beginSession(); b.frame(.025); a.frame(.025)
  observations.push({ stage: 'two-normal-worlds', aBeforeB, a: flow(a), b: flow(b), editor: api.gameFlowSnapshot(), aProperties: { ...entityA.script2D.properties }, bProperties: { ...entityB.script2D.properties } })
  target('two-real-Core-begin-and-frame-keep-score-session-and-checkpoints-separate', () => { assert.equal(flow(a).score, 11); assert.equal(flow(b).score, 22); assert.equal(flow(a).session.owner, 'World A'); assert.equal(flow(b).session.owner, 'World B'); assert.equal(entityA.script2D.properties.seen_score, 11); assert.equal(entityB.script2D.properties.seen_score, 22); assert.equal(api.gameFlowState.score, 0) })
  a.runEntityFunction(entityA, 'mutate'); a.frame(.025); b.frame(.025)
  observations.push({ stage: 'pause-A', scaleA: hostA.state.globalSettings.timeScale, scaleB: hostB.state.globalSettings.timeScale, editorScale: api.physicsState.globalSettings.timeScale, a: flow(a), b: flow(b) })
  target('Rhai-pause-and-following-context-only-touch-the-owning-World', () => { assert.equal(hostA.state.globalSettings.timeScale, 0); assert.equal(hostB.state.globalSettings.timeScale, .75); assert.equal(api.physicsState.globalSettings.timeScale, 2); assert.equal(flow(a).score, 16); assert.equal(flow(b).score, 22); assert.equal(entityA.script2D.properties.seen_paused, true); assert.equal(entityB.script2D.properties.seen_paused, false) })
  entityA.getComponent('Health2D').current = 5; a.runEntityFunction(entityA, 'recover'); a.frame(.025); b.frame(.025)
  observations.push({ stage: 'restore-A', positionA: { ...entityA.transform.position }, positionB: { ...entityB.transform.position }, healthA: entityA.getComponent('Health2D').current, a: flow(a), b: flow(b) })
  target('Rhai-checkpoint-restores-only-own-scene-transform-health-score-and-session', () => { assert.equal(entityA.transform.position.x, 7); assert.equal(entityA.transform.position.y, 8); assert.equal(entityA.getComponent('Health2D').current, 80); assert.equal(entityB.transform.position.x, 17); assert.equal(hostA.state.globalSettings.timeScale, 1.5); assert.equal(flow(a).score, 11); assert.equal(flow(b).score, 22); assert.equal(flow(a).session.owner, 'World A'); assert.equal(flow(b).session.owner, 'World B') })
  const collectible = new api.BoxEntity(id++, { x: 50, y: 50 }, { x: 1, y: 1 }); collectible.isStatic = true; const collectibleComponent = collectible.addComponent(new api.Collectible2D()); collectibleComponent.score = 3; collectibleComponent.destroyOnCollect = false; entityA.tags.push('player'); worldA.entities.push(collectible)
  const suppliedEvent = { type: 'triggerEntered', firstEntityUuid: collectible.uuid, secondEntityUuid: entityA.uuid, point: [0, 0], normal: [0, 1], relativeVelocity: [0, 0] }
  a.dispatchPhysicsEvents([suppliedEvent]); a.frame(.025)
  observations.push({ stage: 'supplied-fixture-contact', event: suppliedEvent, a: flow(a), b: flow(b), editor: api.gameFlowSnapshot(), provenance: 'Supplied fixture event through actual Core.dispatchPhysicsEvents and Collectible2D; not a measured Rust collision.' })
  target('actual-Core-contact-route-adds-real-Collectible-score-to-own-GameFlow', () => { assert.equal(flow(a).score, 14); assert.equal(flow(b).score, 22); assert.equal(api.gameFlowState.score, 0); assert.equal(entityA.script2D.properties.seen_score, 14) })
  a.stopSession(false)
  target('normal-stop-resets-only-own-flow-and-releases-input-VM', () => { assert.equal(a.input.attached, false); assert.equal(a.scriptRuntime, null); assert.deepEqual(flow(a), { paused: false, score: 0, session: {}, checkpoints: [] }); assert.equal(flow(b).score, 22); assert.equal(flow(b).session.owner, 'World B'); assert.equal(b.isActive, true); assert.equal(api.gameFlowState.score, 0) })
  b.stopSession(false)
  if (!before) {
    const priorMode = hostA.state.playMode, priorEntities = [...worldA.entities]
    check('wrong-injected-GameFlow-Owner-rejected-before-lifecycle', () => { assert.throws(() => new api.GameplayRuntimeCore(services, hostA, null, b.gameFlowOwner), /GAME_FLOW_WORLD_OWNER_MISMATCH/); assert.equal(hostA.state.playMode, priorMode); assert.deepEqual([...worldA.entities], priorEntities) })
    const debugOwner = { beginSession() { throw Error('A constructor must not start debug sessions') } }, fresh = new api.GameplayRuntimeCore(services, hostA, debugOwner); runtimes.push(fresh)
    check('third-DebugCounter-argument-retains-its-existing-position', () => { assert.equal(fresh.scriptDebugCounterOwner, debugOwner); assert.equal(fresh.gameFlowOwner.world, worldA) })
    const guarded = new api.GameplayRuntimeCore(services, hostA); runtimes.push(guarded)
    const counts = { inputStarts: 0, updates: 0 }, start = guarded.input.start, updateA = worldA.update, updateB = worldB.update
    guarded.input.start = function (...args) { counts.inputStarts++; return start.apply(this, args) }
    worldA.update = function (...args) { counts.updates++; return updateA.apply(this, args) }; worldB.update = function (...args) { counts.updates++; return updateB.apply(this, args) }
    try {
      hostA.state.world = worldB
      check('World-replacement-begin-rejected-before-input-start-or-world-update', () => { assert.throws(() => guarded.beginSession(), /GAME_FLOW_WORLD_OWNER_CHANGED/); assert.deepEqual(counts, { inputStarts: 0, updates: 0 }); assert.equal(guarded.isActive, false) })
      hostA.state.world = worldA; guarded.beginSession(); const afterBegin = { ...counts }; hostA.state.world = worldB
      check('active-World-replacement-frame-step-and-stop-reject-before-updating-or-cleaning-another-owner', () => { assert.throws(() => guarded.frame(.025), /GAME_FLOW_WORLD_OWNER_CHANGED/); assert.throws(() => guarded.stepOnce(), /GAME_FLOW_WORLD_OWNER_CHANGED/); assert.throws(() => guarded.stopSession(false), /GAME_FLOW_WORLD_OWNER_CHANGED/); assert.deepEqual(counts, afterBegin); assert.equal(guarded.isActive, true); assert.equal(guarded.input.attached, true) })
      hostA.state.world = worldA; guarded.stopSession(false)
    } finally { hostA.state.world = worldA; guarded.input.start = start; worldA.update = updateA; worldB.update = updateB }
    check('stopped-Editor-compat-rebinds-current-World-and-same-legacy-view-without-retargeting-old-Core', () => {
      const previousOwner = compatibility.gameFlowOwner, previousView = api.gameFlowState, previousMode = api.physicsState.playMode
      const replacementWorld = attach(api.createEditorWorld()), replacementEntity = make('Replacement Editor World', records[0], { x: 27, y: 28 })
      replacementWorld.entities.splice(0, replacementWorld.entities.length, replacementEntity)
      let replacement = null, restored = null
      try {
        api.physicsState.world = replacementWorld; api.physicsState.playMode = 'playing'
        replacement = new api.GameplayRuntime(); runtimes.push(replacement)
        // The live Editor view may be a Vue proxy. Assert that exact Owner separately from its raw World.
        assert.equal(replacement.gameFlowOwner, api.getEditorGameFlowOwner()); assert.equal(replacement.gameFlowOwner.world, api.physicsState.world); assert.equal(api.toRaw(replacement.gameFlowOwner.world), replacementWorld); assert.equal(replacement.gameFlowOwner.state, previousView); assert.equal(api.gameFlowState, previousView)
        assert.notEqual(replacement.gameFlowOwner, previousOwner); assert.equal(previousOwner.world, originalWorld)
        assert.throws(() => compatibility.beginSession(), /GAME_FLOW_WORLD_OWNER_CHANGED/); assert.throws(() => compatibility.frame(.025), /GAME_FLOW_WORLD_OWNER_CHANGED/)
        assert.equal(compatibility.isActive, false); assert.equal(compatibility.input.attached, false); assert.equal(compatibility.gameFlowOwner, previousOwner)
        replacement.beginSession(); replacement.frame(.025)
        assert.equal(replacementEntity.script2D.lastError, null); assert.equal(replacementEntity.script2D.properties.seen_score, 10); assert.equal(replacementEntity.script2D.properties.seen_session, 'Replacement Editor World'); assert.equal(replacementEntity.script2D.properties.seen_checkpoint, true)
        replacement.stopSession(false); assert.equal(replacement.input.attached, false); assert.equal(replacement.scriptRuntime, null)
        api.physicsState.world = originalWorld
        restored = new api.GameplayRuntime(); runtimes.push(restored)
        assert.equal(restored.gameFlowOwner.world, originalWorld); assert.equal(restored.gameFlowOwner.state, previousView); assert.equal(restored.gameFlowOwner, api.getEditorGameFlowOwner())
        restored.beginSession(); restored.frame(.025); assert.equal(editorEntity.script2D.lastError, null); assert.equal(editorEntity.script2D.properties.seen_score, 10)
        restored.stopSession(false); assert.equal(restored.input.attached, false); assert.equal(restored.scriptRuntime, null)
        observations.push({ stage: 'Editor-World-replacement-and-restoration', replacementScore: replacementEntity.script2D.properties.seen_score, replacementSession: replacementEntity.script2D.properties.seen_session, restoredScore: editorEntity.script2D.properties.seen_score, sameLegacyView: api.gameFlowState === previousView, oldCoreRetargeted: compatibility.gameFlowOwner !== previousOwner, provenance: 'Stopped Editor compatibility entry reconstructed for two actual Worlds; no claim of concurrent legacy Editor sessions.' })
      } finally {
        if (replacement?.isActive && api.toRaw(api.physicsState.world) === replacementWorld) replacement.stopSession(false)
        if (restored?.isActive && api.physicsState.world === originalWorld) restored.stopSession(false)
        api.physicsState.world = originalWorld; api.physicsState.playMode = previousMode
      }
    })
  }
  api.physicsState.globalSettings.timeScale = initial.scale; api.physicsState.playMode = initial.mode
  limitations.push('GameFlow-only ownership: CharacterBody/worldGameplay, objectPool, stream hooks, dynamicObjects, audio, replay and other global subsystems are not certified as isolated.', 'Node SSR + real ordinary optimized WASM is not browser, Engine Worker or independent Player verification.', 'Collectible scoring uses one explicitly supplied fixture contact, not Rust-generated collision evidence.', 'No performance, GPU or motion claims are made.')
  finished = true
} catch (error) { failure = error.stack ?? String(error); throw error }
finally {
  for (const [index, runtime] of runtimes.entries()) {
    try { runtime.stopSession(false); cleanup.runtimes.push({ index, active: runtime.isActive, inputAttached: runtime.input.attached, vmReleased: runtime.scriptRuntime === null }) }
    catch (error) { cleanup.runtimes.push({ index, error: error.stack ?? String(error) }) }
  }
  for (const [index, world] of worlds.entries()) { try { world.runtime?.free(); world.runtime = null; world.wasmLoaded = false; cleanup.worlds.push({ index, released: true }) } catch (error) { cleanup.worlds.push({ index, error: error.stack ?? String(error) }) } }
  const sourceChangesDuringRun = []
  for (const [path, hash] of Object.entries(sourceBeforeRun)) if (sha(await readFile(join(root, path))) !== hash) sourceChangesDuringRun.push(path)
  if (sourceChangesDuringRun.length) failure = `${failure ?? ''}\nSource changed during integration: ${sourceChangesDuringRun.join(', ')}`
  const status = failure || !finished ? 'FAILED' : checks.some(item => item.status === 'FAILED') ? 'BASELINE_NOT_PASSED' : 'PASSED'
  await writeFile(join(output, 'report.json'), JSON.stringify({ schema: 'nova-game-flow-core-integration-v1', generatedAt: new Date().toISOString(), mode, status, scope: 'Actual Core normal lifecycle + ordinary optimized WASM GameFlow ownership; all baseline independence failures remain visible.', checks, observations, sourceHashes: hashes, ssrLoadedSources, buildEvidence, sourceChangesDuringRun, environment: { node: process.version, platform: process.platform, architecture: process.arch, browser: null, graphicsBackend: null, execution: 'Node SSR, synchronous Core, ordinary optimized WASM' }, cleanup, limitations, failure }, null, 2))
  console.log(JSON.stringify({ mode, status, passed: checks.filter(item => item.status === 'PASSED').length, failed: checks.filter(item => item.status === 'FAILED').length, report: join(output, 'report.json') }))
  if (sourceChangesDuringRun.length) process.exitCode = 1
}
