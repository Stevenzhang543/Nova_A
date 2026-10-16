/** Actual Gameplay lifecycle + ordinary WASM. Direct-host migration, not multi-world qualification. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before')
const reportSuffix = process.argv.find(value => value.startsWith('--report-dir='))?.slice('--report-dir='.length) ?? '.cache/engine-overhaul/gameplay-world-host'
assert.ok(reportSuffix.startsWith('.cache/engine-overhaul/') && !reportSuffix.includes('..') && !reportSuffix.startsWith('/'), 'Keep the chosen report inside the audit workspace')
const directory = join(root, reportSuffix), temporary = await mkdtemp(join(tmpdir(), 'nova-gameplay-host-'))
const normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
const checks = [], observations = [], sourceHashes = {}, runtimes = [], worlds = []
let passed = false, failure = null
const check = (name, operation) => { operation(); checks.push(name) }
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
try {
  const paths = ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/GameplayRuntime.ts', 'src/runtime/audio.ts', 'src/runtime/runtimeSceneTransition.ts', 'src/store/physics.ts', 'src/store/editor.ts', 'nova_core/pkg/nova_core_bg.wasm']
  if (!before) paths.push('src/editor/gameplayWorldHost.ts', 'src/runtime/gameplayWorldHost.ts', 'src/runtime/audioSettingsContracts.ts', 'src/runtime/runtimeSceneContracts.ts')
  const originals = new Map()
  for (const path of paths) {
    const bytes = before && !path.endsWith('.wasm') ? await readFile(join(directory, 'before', path.replaceAll('/', '_'))) : await readFile(join(root, path))
    sourceHashes[path] = sha(bytes)
    if (before && !path.endsWith('.wasm')) originals.set(normalize(join(root, path)), bytes.toString())
  }
  const entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime, gameplayRuntime, GameplayRuntimeCore',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/store/physics.ts': 'physicsState, sceneManager, createEditorWorld, prepareRuntimeSceneTransition',
    'src/store/editor.ts': 'editorState', 'src/assets/AssetDatabase.ts': 'assetState',
    'src/assets/types.ts': 'defaultScriptMetadata', 'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'Script2D, CharacterBody2D', 'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'src/runtime/scriptDebug.ts': 'scriptDebugState',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmRuntimeWorld, WasmScriptRuntime'
  }
  if (!before) entries['src/editor/gameplayWorldHost.ts'] = 'createEditorGameplayWorldHost'
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n'))
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: before ? [{ name: 'paired-original-core-and-compat', enforce: 'pre', load(id) { return originals.get(normalize(id)) } }] : [], build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const api = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  await api.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  for (const name of ['compile_cached', 'execute_instance_context_json', 'publish_world_context_json', 'apply_world_context_delta_json']) {
    const original = api.WasmScriptRuntime.prototype[name]
    if (original) api.WasmScriptRuntime.prototype[name] = function (...args) { try { return original.apply(this, args) } catch (error) { observations.push({ nativeCall: name, error: error.stack ?? String(error) }); throw error } }
  }
  // World deliberately skips asynchronous loading in Node. Attach the actual optimized binding to that same World.
  const attach = world => { world.runtime = new api.WasmRuntimeWorld(); world.wasmLoaded = true; worlds.push(world); return world }
  const world = attach(api.physicsState.world), rootState = api.physicsState
  // Only browser event surfaces are supplied; no Gameplay/VM/subsystem implementation is replaced.
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance }); globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null })
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false
  const source = '@export let starts = 0;\n@export let frames = 0;\n@export let ticks = 0;\n@export let destroyed = 0;\nlet private_frames = 0;\nfn start() { starts += 1; }\nfn fixed_update(dt) { ticks += 1; }\nfn update(dt) { private_frames += 1; frames = private_frames; set_position(12.5, -3.25); }\nfn on_destroy() { destroyed += 1; }\nfn fail() { throw "world-host-real-vm-error"; }'
  const record = { uuid: 'world-host-script', name: 'World host', path: 'Assets/world-host.rhai', assetType: 'script', source, script: api.defaultScriptMetadata() }
  api.assetState.records.splice(0, api.assetState.records.length, record); api.assetState.generation++
  const make = (id, withScript = true) => { const entity = new api.BoxEntity(id, { x: 0, y: 0 }, { x: 1, y: 1 }); entity.isStatic = true; if (withScript) entity.addComponent(new api.Script2D()).scriptAsset = record.uuid; return entity }
  const initialEntity = make(100), initialChild = make(101, false); initialChild.parentUuid = initialEntity.uuid
  world.entities.splice(0, world.entities.length, initialEntity, initialChild); api.physicsState.playMode = 'playing'
  const entity = world.entities[0], child = world.entities[1]
  const runtime = new api.GameplayRuntime(); runtimes.push(runtime)
  check('compat-prototype-and-unique-singleton-use-the-original-owner', () => { assert.equal(Object.getPrototypeOf(api.GameplayRuntime.prototype), api.GameplayRuntimeCore.prototype); assert(api.gameplayRuntime instanceof api.GameplayRuntime); assert.equal(api.physicsState.world, world) })
  runtime.beginSession(); runtime.frame(.07)
  check('normal-begin-and-frame-run-real-WASM-start-update-and-catch-up', () => { assert.equal(entity.script2D.lastError, null); assert.equal(entity.script2D.properties.starts, 1); assert.equal(entity.script2D.properties.frames, 1); assert(entity.script2D.properties.ticks >= 2); assert.equal(entity.transform.position.x, 12.5); assert.equal(api.physicsState.engineDiagnostics.stepsLastFrame, entity.script2D.properties.ticks) })
  const authored = runtime.inspectObjectRuntime(entity.uuid).authoredEntity
  check('authoring-snapshot-does-not-follow-live-runtime-position', () => { assert.equal(authored.components.find(component => component.kind === 'Transform2D').data.position.x, 0); assert.equal(entity.transform.position.x, 12.5) })
  runtime.frame(.02)
  check('normal-second-frame-keeps-live-instance-state', () => { assert.equal(entity.script2D.properties.starts, 1); assert.equal(entity.script2D.properties.frames, 2) })
  const priorTicks = entity.script2D.properties.ticks, priorFrames = entity.script2D.properties.frames
  api.physicsState.playMode = 'paused'; runtime.frame(.02)
  check('paused-live-state-does-not-run-callbacks', () => { assert.equal(entity.script2D.properties.frames, priorFrames); assert.equal(entity.script2D.properties.ticks, priorTicks) })
  api.physicsState.playMode = 'playing'; runtime.frame(.02)
  check('resume-uses-same-owner-and-scope', () => { assert.equal(api.physicsState, rootState); assert.equal(api.physicsState.world, world); assert.equal(entity.script2D.properties.frames, 3) })
  runtime.runEntityFunction(entity, 'fail'); runtime.frame(.02)
  check('actual-VM-error-recovers-without-changing-world-or-private-state', () => { assert.equal(runtime.diagnostics.scriptErrors, 1); assert.equal(entity.script2D.lastError, null); assert.equal(entity.script2D.properties.frames, 4); assert.equal(api.physicsState.world, world) })
  runtime.pendingScene = { type: 'load', identifier: 'missing-scene' }; runtime.flushStructuralCommands()
  check('failed-actual-scene-preparation-keeps-identity-and-destruction-state', () => { assert.equal(world.entities[0], entity); assert.equal(world.entities[1], child); assert.equal(entity.script2D.properties.destroyed, 0) })
  runtime.queueEntityRemoval(entity, false); runtime.flushEntityCommands()
  check('actual-editor-delete-preserves-subtree-removal-and-on-destroy-order', () => { assert.equal(entity.script2D.properties.destroyed, 1); assert(!world.entities.includes(entity)); assert(!world.entities.includes(child)) })
  const quitOrder = []
  window.addEventListener('nova-player-quit', () => { quitOrder.push('event'); assert.equal(runtime.active, false); assert.equal(api.physicsState.playMode, 'editing'); assert.equal(api.editorState.statusText, 'Runtime requested quit') })
  runtime.quitRequested = true; runtime.frame(.02)
  check('normal-frame-quit-stops-session-then-editor-state-then-event', () => { assert.deepEqual(quitOrder, ['event']); assert.equal(runtime.quitRequested, false); assert.equal(runtime.active, false) })
  if (!before) {
    const host = api.createEditorGameplayWorldHost(), services = api.createEditorGameplayScriptServices()
    check('editor-host-has-exact-live-state-and-scene-identity', () => { assert.equal(host.state, api.physicsState); assert.equal(host.state.world, world); assert.equal(host.activeSceneUuid, api.sceneManager.activeSceneUuid); assert.equal(typeof host.activeSceneUuid, 'string') })
    check('missing-host-fails-explicitly-without-lifecycle-side-effects', () => { const mode = api.physicsState.playMode; assert.throws(() => new api.GameplayRuntimeCore(services), /GAMEPLAY_WORLD_HOST_REQUIRED/); assert.throws(() => new api.GameplayRuntimeCore(), /SCRIPT_SERVICES_REQUIRED/); assert.equal(api.physicsState.playMode, mode) })
    const beforeConstruction = { mode: rootState.playMode, entities: [...world.entities], generation: api.assetState.generation, status: api.editorState.statusText }
    const brokenHost = { ...host, get log() { throw Error('late-host-factory-failure') } }
    check('late-host-service-failure-does-not-start-input-play-or-world-lifecycle', () => { assert.throws(() => new api.GameplayRuntimeCore(services, brokenHost), /late-host-factory-failure/); assert.equal(rootState.playMode, beforeConstruction.mode); assert.deepEqual([...world.entities], beforeConstruction.entities); assert.equal(api.assetState.generation, beforeConstruction.generation); assert.equal(api.editorState.statusText, beforeConstruction.status) })
    let liveRoot = rootState, ownerCalls = 0
    const ownerHost = { ...host, get state() { return liveRoot }, get activeSceneUuid() { return host.activeSceneUuid }, readEntityAuthoringData(entity) { assert.equal(this, ownerHost); ownerCalls++; return host.readEntityAuthoringData(entity) }, log(...args) { assert.equal(this, ownerHost); ownerCalls++; host.log(...args) } }
    const injected = new api.GameplayRuntimeCore(services, ownerHost); runtimes.push(injected)
    liveRoot = { ...rootState, camera: { scale: 3, offset: { x: 6, y: 7 } } }
    check('bound-port-retains-dynamic-root-getter-instead-of-constructor-snapshot', () => { assert.equal(injected.worldHost.state, liveRoot); assert.equal(injected.worldHost.state.camera.scale, 3) })
    liveRoot = rootState
    const settings = api.physicsState.globalSettings, inputs = api.physicsState.inputMap, audio = api.physicsState.audioSettings, camera = api.physicsState.camera
    api.physicsState.globalSettings = { ...settings, tickRate: 40 }; api.physicsState.inputMap = []; api.physicsState.audioSettings = { ...audio, masterVolume: .25 }; api.physicsState.camera = { scale: 2, offset: { x: 4, y: 5 } }
    check('injected-port-reads-field-replacements-from-original-live-root', () => { assert.equal(injected.worldHost.state, rootState); assert.equal(injected.worldHost.state.globalSettings.tickRate, 40); assert.equal(injected.worldHost.state.inputMap, api.physicsState.inputMap); assert.equal(injected.worldHost.state.audioSettings.masterVolume, .25); assert.equal(injected.worldHost.state.camera.scale, 2) })
    api.physicsState.globalSettings = settings; api.physicsState.inputMap = inputs; api.physicsState.audioSettings = audio; api.physicsState.camera = camera
    const next = make(102); world.entities.splice(0, world.entities.length, next); api.physicsState.playMode = 'playing'; injected.beginSession(); injected.frame(.025)
    check('explicit-port-normal-lifecycle-runs-same-real-world-and-VM', () => { assert.equal(next.script2D.lastError, null); assert.equal(next.script2D.properties.starts, 1); assert.equal(next.script2D.properties.frames, 1); assert.equal(injected.worldHost.state.world, world) })
    check('normal-lifecycle-binds-host-method-receiver-to-supplied-owner', () => { assert(ownerCalls >= 2) })
    injected.stopSession()
    // Known remaining global Owner: normal foreign frame still consumes global character motion.
    const foreignWorld = attach(api.createEditorWorld()), foreignEntity = make(103, false), globalCharacter = make(104, false), character = globalCharacter.addComponent(new api.CharacterBody2D())
    globalCharacter.isStatic = false; foreignEntity.isStatic = true
    world.entities.splice(0, world.entities.length, globalCharacter); foreignWorld.entities.splice(0, foreignWorld.entities.length, foreignEntity)
    const foreignState = { ...api.physicsState, world: foreignWorld, engineDiagnostics: { ...api.physicsState.engineDiagnostics } }, foreignHost = { ...host, state: foreignState }
    const foreign = new api.GameplayRuntimeCore(services, foreignHost); runtimes.push(foreign); foreign.beginSession(); character.requestedMotion = { x: 7, y: 0 }; foreign.frame(.025)
    check('confirmed-remaining-global-character-owner-under-normal-foreign-lifecycle', () => { assert(foreignState.engineDiagnostics.stepsLastFrame >= 1); assert.equal(character.requestedMotion.x, 0); assert.equal(api.physicsState.world, world); assert.equal(foreign.worldHost.state.world, foreignWorld) })
    observations.push({ capability: 'independent-gameplay-worlds-and-sessions', status: 'NOT_PASSED', issue: 'CONFIRMED: beforeWorldPhysicsStep consumes original global World character motion during foreign Core normal beginSession/frame; global pool/stream Owners also remain. GameFlow Owner isolation is tested separately.' })
    foreign.stopSession(); world.entities.splice(0); const restore = new api.GameplayRuntime(); runtimes.push(restore); restore.beginSession(); restore.frame(.025); restore.stopSession(); api.physicsState.playMode = 'editing'
    check('normal-original-owner-restores-global-hooks-after-limitation-probe', () => { assert.equal(api.physicsState.world, world); assert.equal(restore.active, false) })
  }
  passed = true
} catch (error) { failure = error.stack ?? String(error); throw error }
finally {
  for (const runtime of runtimes) { try { runtime.stopSession(); runtime.scriptRuntime?.free() } catch {} }
  for (const world of worlds) { try { world.runtime?.free(); world.runtime = null; world.wasmLoaded = false } catch {} }
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, before ? 'before-lifecycle.json' : 'after-lifecycle.json'), JSON.stringify({ scope: 'Actual normal Gameplay lifecycle, same World/Editor bindings and optimized ordinary WASM; Node host functional integration, not browser/Worker/Player or multi-world certification', generatedAt: new Date().toISOString(), status: passed ? 'passed' : 'failed', checks, observations, sourceHashes, failure }, null, 2))
  await rm(temporary, { recursive: true, force: true })
}
console.log(`${before ? 'Before' : 'After'} Gameplay WorldHost: ${checks.length} passed`)
