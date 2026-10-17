/** Paired actual Core + ordinary WASM checks. Shared service Owners remain separately unpassed. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const before = process.argv.includes('--before'), mode = before ? 'before' : 'after'
const outputRoot = join(root, '.cache/engine-overhaul/world-gameplay/core-integration')
const baselineRoot = join(outputRoot, 'before-9c0e')
const normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
await mkdir(outputRoot, { recursive: true })
const output = await mkdtemp(join(outputRoot, `${mode}-`))
const checks = [], observations = [], sourceHashes = {}, currentHashes = new Map(), originals = new Map(), runtimes = [], worlds = [], restorers = []
let api, failure = null, finished = false, loadedSources = [], buildEvidence = null
const cleanup = { runtimes: [], worlds: [], instrumentation: [] }
const baselineManifestBytes = await readFile(join(baselineRoot, 'engine-build-manifest.json'))
const baselineManifest = JSON.parse(baselineManifestBytes), baseline = JSON.parse(await readFile(join(baselineRoot, 'source.json'), 'utf8'))
assert.equal(sha(baselineManifestBytes), baseline.manifestSha256)
const manifestSource = new Map(baselineManifest.source.map(record => [normalize(record.path), record]))
for (const record of baseline.files) {
  const bytes = await readFile(join(baselineRoot, record.path))
  assert.equal(sha(bytes), record.sha256); assert.equal(record.sha256, manifestSource.get(record.path)?.sha256)
  if (before && /\.(ts|js)$/.test(record.path)) originals.set(normalize(join(root, record.path)), bytes.toString('utf8'))
}
const check = (name, operation, scope = 'direct-orchestration') => {
  try { operation(); checks.push({ name, scope, status: 'PASSED' }) }
  catch (error) { checks.push({ name, scope, status: 'FAILED', error: error.stack ?? String(error) }) }
}
const copy = value => JSON.parse(JSON.stringify(value))
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })

try {
  const entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime, GameplayRuntimeCore',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/store/physics.ts': 'physicsState, sceneManager, createEditorWorld',
    'src/assets/AssetDatabase.ts': 'assetState', 'src/assets/types.ts': 'defaultScriptMetadata',
    'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'Script2D, CharacterBody2D, Area2D, AreaEffector2D, Portal2D, Camera2D',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'src/runtime/worldGameplay.ts': 'worldGameplayState',
    'src/runtime/simulationAuthoring26.ts': 'simulationEvidenceState',
    'src/runtime/packages.ts': 'packageState',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmRuntimeWorld'
  }
  if (!before) entries['src/editor/worldGameplayAdapter.ts'] = 'createEditorWorldGameplayOwner'
  const entry = join(output, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n') + "\nexport { toRaw } from 'vue';", { flag: 'wx' })
  const reachable = new Set()
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'paired-world-gameplay-actual-source', enforce: 'pre', async load(id) {
    const path = normalize(id.split('?')[0])
    if (path.startsWith(`${normalize(root)}/src/`) || path.startsWith(`${normalize(root)}/nova_core/pkg/`)) {
      const bytes = await readFile(path); currentHashes.set(path, sha(bytes))
      const original = originals.get(path), key = normalize(relative(root, path))
      if (before && original === undefined) assert.equal(sha(bytes), manifestSource.get(key)?.sha256, `Unpaired baseline dependency: ${key}`)
      return original
    }
  }, buildEnd() { for (const id of this.getModuleIds()) { const path = normalize(id.split('?')[0]); if (currentHashes.has(path)) reachable.add(path) } } }], build: { ssr: true, outDir: output, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  loadedSources = [...reachable].sort().map(path => normalize(relative(root, path)))
  for (const path of [...reachable].sort()) sourceHashes[normalize(relative(root, path))] = { sha256: sha(originals.get(path) ?? await readFile(path)), currentSha256: currentHashes.get(path), overlay: originals.has(path), loadedInSsr: true }
  if (before) { assert(!loadedSources.includes('src/runtime/worldGameplayOwner.ts')); assert(!loadedSources.includes('src/editor/worldGameplayAdapter.ts')) }
  buildEvidence = { entryPath: entry, bundlePath: join(output, 'integration.mjs'), entrySha256: sha(await readFile(entry)), bundleSha256: sha(await readFile(join(output, 'integration.mjs'))) }
  api = await import(pathToFileURL(join(output, 'integration.mjs')).href)
  await api.initWasm({ module_or_path: await readFile(join(baselineRoot, 'nova_core/pkg/nova_core_bg.wasm')) })
  assert.equal(sha(await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm'))), baseline.files.find(item => item.path.endsWith('_bg.wasm')).sha256, 'This paired slice requires the same ordinary WASM')
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance })
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null })
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false
  const nativeCalls = [], worldCalls = [], signalCalls = [], sceneCalls = []
  const instrument = (object, method, sink, label) => {
    const actual = object[method]; assert.equal(typeof actual, 'function', `Missing actual ${method}`)
    object[method] = function (...args) {
      const record = { world: label, method, args: args.map(value => value?.uuid ? { uuid: value.uuid } : copy(value)), returned: null }
      sink.push(record)
      try { const result = actual.apply(this, args); record.returned = copy(result ?? null); return result }
      catch (error) { record.error = error.stack ?? String(error); throw error }
    }
    restorers.push(() => { object[method] = actual; cleanup.instrumentation.push({ world: label, method, restored: object[method] === actual }) })
  }
  const attach = (world, label) => {
    world.runtime = new api.WasmRuntimeWorld(); world.wasmLoaded = true; worlds.push({ world, label })
    for (const name of ['move_character_box_json', 'apply_transient_force', 'shift_origin']) instrument(world.runtime, name, nativeCalls, label)
    for (const name of ['moveCharacterBox', 'overlapBox', 'applyTransientForce', 'shiftOrigin']) instrument(world, name, worldCalls, label)
    return world
  }
  const key = (type, code = 'KeyD') => window.dispatchEvent(Object.assign(new Event(type), { code, key: 'd', repeat: false, isComposing: false, keyCode: 68, ctrlKey: false, altKey: false, shiftKey: false, metaKey: false }))
  let id = 700
  const entity = (name, position, dynamic = false) => { const value = new api.BoxEntity(id++, position, { x: 1, y: 1 }); value.name = name; value.isStatic = !dynamic; return value }
  const script = { uuid: 'world-gameplay-real-core-script', name: 'World ownership input', path: 'Assets/world-gameplay.rhai', assetType: 'script', source: '@export let axis = 0.0;\n@export let presses = 0;\n@export let ticks = 0;\nfn fixed_update(dt) { ticks += 1; axis = input_axis("Horizontal"); if input_pressed("MoveRight") { presses += 1; } move_character(axis * 0.5, 0.0); }', script: api.defaultScriptMetadata() }
  api.assetState.records.splice(0, api.assetState.records.length, script); api.assetState.generation++
  const character = (name, position) => { const value = entity(name, position, true); value.isKinematic = true; value.addComponent(new api.CharacterBody2D()); value.addComponent(new api.Script2D()).scriptAsset = script.uuid; return value }
  const area = (name, position) => { const value = entity(name, position); value.addComponent(new api.Area2D()); value.addComponent(new api.AreaEffector2D()).effectors = [{ id: 'wind', kind: 'Wind', enabled: true, direction: { x: 1, y: 0 }, strength: 20, drag: 0, fluidDensity: 1, damagePerSecond: 0, signal: 'area.effect' }]; return value }
  const portal = (name, position, target) => { const value = entity(name, position); const component = value.addComponent(new api.Portal2D()); component.targetSceneUuid = target; component.triggerRadius = 50; return value }
  const camera = (name, position) => { const value = entity(name, position); value.addComponent(new api.Camera2D()).active = true; return value }
  const snapshotCharacter = value => { const c = value.getComponent('CharacterBody2D'); return { position: { ...value.transform.position }, requested: { ...c.requestedMotion }, motionVelocity: { ...c.motionVelocity }, floor: c.onFloor, wall: c.onWall, ceiling: c.onCeiling, floorNormal: { ...c.floorNormal }, platform: { ...c.platformVelocity }, secondsSinceFloor: c.secondsSinceFloor } }
  const originalWorld = attach(api.physicsState.world, 'Editor-original'), originalCamera = api.physicsState.camera
  const settingsBefore = copy(api.physicsState.globalSettings), modeBefore = api.physicsState.playMode
  Object.assign(api.physicsState.globalSettings, { gravity: 0, airFriction: 0, timeScale: 1, tickRate: 60, maxCatchUpSteps: 8 }); api.physicsState.playMode = 'playing'
  const editorCharacter = character('Editor character', { x: 5, y: 5 }); originalWorld.entities.splice(0, originalWorld.entities.length, editorCharacter)
  const services = api.createEditorGameplayScriptServices(), editorHost = api.createEditorGameplayWorldHost()
  const legacy = new api.GameplayRuntime(); runtimes.push(legacy)
  legacy.beginSession(); key('keydown'); legacy.frame(.02); legacy.stepOnce(); key('keyup'); legacy.frame(.02)
  check('normal-legacy-begin-frame-step-execute-real-input-Rhai-and-WASM-character-move', () => { assert.equal(editorCharacter.script2D.lastError, null); assert.equal(editorCharacter.script2D.properties.presses, 1); assert(editorCharacter.script2D.properties.ticks >= 2); assert(editorCharacter.transform.position.x > 5); assert(nativeCalls.some(call => call.world === 'Editor-original' && call.method === 'move_character_box_json' && call.args[3] > 0)); if (!before) { assert.equal(legacy.worldGameplayOwner.world, originalWorld); assert.equal(legacy.worldGameplayOwner.state, api.worldGameplayState) } })
  legacy.stopSession(false)
  check('normal-legacy-stop-releases-actual-input-and-script-VM', () => { assert.equal(legacy.isActive, false); assert.equal(legacy.input.attached, false); assert.equal(legacy.scriptRuntime, null) })
  const editorBody = entity('Editor area body', { x: 40, y: 20 }, true), editorArea = area('Editor area', { x: 40, y: 20 }), editorPortal = portal('Editor portal', { x: 50, y: 5 }, 'fixture-editor-unregistered-target')
  originalWorld.entities.push(editorBody, editorArea, editorPortal)
  editorCharacter.getComponent('CharacterBody2D').requestedMotion = { x: 5, y: 0 }
  const editorBeforeForeign = snapshotCharacter(editorCharacter)
  const foreignWorld = attach(api.createEditorWorld(), 'Foreign-A'), foreignCharacter = character('Foreign character', { x: 30, y: 5 }), foreignBody = entity('Foreign area body', { x: 40, y: 20 }, true), foreignArea = area('Foreign area', { x: 40, y: 20 }), foreignPortal = portal('Foreign portal', { x: 80, y: 5 }, 'fixture-foreign-unregistered-target')
  foreignWorld.entities.splice(0, foreignWorld.entities.length, foreignCharacter, foreignBody, foreignArea, foreignPortal)
  const foreignState = { ...api.physicsState, world: foreignWorld, camera: { scale: 2, offset: { x: 11, y: 22 }, targetOffset: { x: 33, y: 44 } }, globalSettings: { ...api.physicsState.globalSettings }, engineDiagnostics: { ...api.physicsState.engineDiagnostics }, playMode: 'playing' }
  const foreignHost = { ...editorHost, state: foreignState, get activeSceneUuid() { return 'foreign-scene-a' }, prepareRuntimeSceneTransition(identifier) { sceneCalls.push({ world: 'Foreign-A', identifier }); return editorHost.prepareRuntimeSceneTransition(identifier) } }
  const a = new api.GameplayRuntimeCore(services, foreignHost); runtimes.push(a)
  const realEmit = a.emitSignal; a.emitSignal = function (...args) { signalCalls.push(copy(args)); return realEmit.apply(this, args) }; restorers.push(() => { a.emitSignal = realEmit })
  const foreignStart = { native: nativeCalls.length, world: worldCalls.length }, callsSince = (calls, at) => calls.slice(at)
  a.beginSession(); key('keydown'); a.frame(.02)
  const firstFrame = { editor: snapshotCharacter(editorCharacter), foreign: snapshotCharacter(foreignCharacter), native: callsSince(nativeCalls, foreignStart.native), world: callsSince(worldCalls, foreignStart.world), signals: copy(signalCalls), scenes: copy(sceneCalls) }
  observations.push({ stage: 'actual-foreign-begin-frame', ...firstFrame, provenance: 'Real Core fixed_update, actual InputManager event surfaces and Rust WASM queries/forces; wrappers delegate unchanged implementation.' })
  check('foreign-Character-consumes-own-Rhai-request-through-own-native-World', () => { assert.equal(foreignCharacter.script2D.lastError, null); assert.equal(foreignCharacter.script2D.properties.axis, 1); assert.equal(foreignCharacter.script2D.properties.presses, 1); assert.equal(foreignCharacter.getComponent('CharacterBody2D').requestedMotion.x, 0); assert(foreignCharacter.transform.position.x > 30); assert(firstFrame.native.some(call => call.world === 'Foreign-A' && call.method === 'move_character_box_json' && call.args[3] > 0)) })
  check('foreign-frame-preserves-original-Editor-character-request-transform-and-contacts', () => { assert.deepEqual(snapshotCharacter(editorCharacter), editorBeforeForeign); assert(!firstFrame.native.some(call => call.world === 'Editor-original')) })
  check('foreign-Area-real-overlap-and-transient-force-target-own-body', () => { assert(firstFrame.world.some(call => call.world === 'Foreign-A' && call.method === 'overlapBox')); assert(firstFrame.world.some(call => call.world === 'Foreign-A' && call.method === 'applyTransientForce' && call.args[0].uuid === foreignBody.uuid && call.returned === true)); assert(firstFrame.native.some(call => call.world === 'Foreign-A' && call.method === 'apply_transient_force')); assert(!firstFrame.world.some(call => call.world === 'Editor-original' && ['overlapBox', 'applyTransientForce'].includes(call.method))) })
  check('foreign-Portal-routes-own-target-through-actual-Core-scene-preparation', () => { assert.deepEqual(sceneCalls.map(call => call.identifier), ['fixture-foreign-unregistered-target']); assert(signalCalls.some(([name, payload]) => name === 'portal.entered' && payload.portal === foreignPortal.uuid)); assert(!signalCalls.some(([name, payload]) => name === 'portal.entered' && payload.portal === editorPortal.uuid)) })
  key('keyup'); a.stepOnce()
  check('actual-foreign-step-release-is-immediate-and-edge-is-not-replayed', () => { assert.equal(foreignCharacter.script2D.lastError, null); assert.equal(foreignCharacter.script2D.properties.axis, 0); assert.equal(foreignCharacter.script2D.properties.presses, 1); assert.equal(foreignCharacter.getComponent('CharacterBody2D').requestedMotion.x, 0) })
  editorPortal.getComponent('Portal2D').enabled = false; foreignPortal.getComponent('Portal2D').enabled = false
  originalWorld.entities.push(camera('Editor origin camera', { x: 25_000, y: 7_000 }))
  const foreignOriginCamera = camera('Foreign origin camera', { x: 12_000, y: -6_000 }); foreignWorld.entities.push(foreignOriginCamera)
  const originBefore = { editorPositions: originalWorld.entities.map(value => ({ uuid: value.uuid, position: { ...value.transform.position } })), editorCamera: copy(originalCamera), legacyOffset: copy(api.worldGameplayState.originOffset), foreignCamera: copy(foreignState.camera), nativeAt: nativeCalls.length }
  a.frame(.02)
  observations.push({ stage: 'automatic-origin-shift', before: originBefore, after: { editorPositions: originalWorld.entities.map(value => ({ uuid: value.uuid, position: { ...value.transform.position } })), editorCamera: copy(originalCamera), foreignCamera: copy(foreignState.camera), foreignOriginCamera: copy(foreignOriginCamera.transform.position), legacyOffset: copy(api.worldGameplayState.originOffset), ownOffset: before ? null : copy(a.worldGameplayOwner.state.originOffset), native: callsSince(nativeCalls, originBefore.nativeAt) } })
  check('foreign-focus-origin-shift-uses-own-real-Rust-frame-and-camera-signs', () => { assert.deepEqual(foreignOriginCamera.transform.position, { x: 0, y: 0 }); assert.deepEqual(foreignState.camera.offset, { x: originBefore.foreignCamera.offset.x + 24_000, y: originBefore.foreignCamera.offset.y + 12_000 }); assert.deepEqual(foreignState.camera.targetOffset, { x: originBefore.foreignCamera.targetOffset.x + 24_000, y: originBefore.foreignCamera.targetOffset.y + 12_000 }); assert(nativeCalls.slice(originBefore.nativeAt).some(call => call.world === 'Foreign-A' && call.method === 'shift_origin' && call.args[0] === 12_000 && call.args[1] === -6_000)); if (!before) assert.deepEqual(a.worldGameplayOwner.state.originOffset, { x: 12_000, y: -6_000 }) })
  check('foreign-origin-shift-does-not-change-original-Editor-World-camera-or-legacy-state', () => { assert.deepEqual(originalWorld.entities.map(value => ({ uuid: value.uuid, position: { ...value.transform.position } })), originBefore.editorPositions); assert.deepEqual(copy(originalCamera), originBefore.editorCamera); assert.deepEqual(copy(api.worldGameplayState.originOffset), originBefore.legacyOffset) })
  if (!before) {
    const boundOwner = a.worldGameplayOwner
    check('factory-binds-exact-supplied-Host-and-keeps-local-state', () => { assert.equal(boundOwner.world, foreignWorld); assert.notEqual(boundOwner.state, api.worldGameplayState); assert.equal(api.createEditorWorldGameplayOwner(foreignHost, { legacyRoot: false }), boundOwner) })
    const badHost = { ...foreignHost, state: { ...foreignState, world: originalWorld }, createWorldGameplayOwner() { return boundOwner } }
    check('wrong-factory-Owner-rejected-before-input-or-World-lifecycle', () => { const count = nativeCalls.length; assert.throws(() => new api.GameplayRuntimeCore(services, badHost), /GAMEPLAY_WORLD_OWNER_MISMATCH/); assert.equal(nativeCalls.length, count) })
    foreignState.world = originalWorld
    check('replaced-World-frame-step-and-active-stop-rejected-without-retarget', () => { const count = nativeCalls.length; assert.throws(() => a.frame(.02), /GAME(?:_FLOW|PLAY)_WORLD_OWNER_CHANGED/); assert.throws(() => a.stepOnce(), /GAME(?:_FLOW|PLAY)_WORLD_OWNER_CHANGED/); assert.throws(() => a.stopSession(false), /GAME(?:_FLOW|PLAY)_WORLD_OWNER_CHANGED/); assert.equal(nativeCalls.length, count); assert.equal(a.worldGameplayOwner, boundOwner); assert.equal(a.isActive, true) })
    foreignState.world = foreignWorld
  }
  // Exercise a real remaining shared service. A stop of B must not be mistaken for full A isolation.
  api.simulationEvidenceState.enabled = true; a.frame(.02)
  const bWorld = attach(api.createEditorWorld(), 'Foreign-B'), bEntity = entity('Foreign B evidence body', { x: 91, y: 92 })
  bWorld.entities.splice(0, bWorld.entities.length, bEntity)
  const bHost = { ...editorHost, state: { ...foreignState, world: bWorld, camera: { scale: 1, offset: { x: 0, y: 0 } }, globalSettings: { ...foreignState.globalSettings }, engineDiagnostics: { ...foreignState.engineDiagnostics } }, get activeSceneUuid() { return 'foreign-scene-b' } }
  const b = new api.GameplayRuntimeCore(services, bHost); runtimes.push(b); b.beginSession(); b.frame(.02); a.frame(.02)
  const evidenceBeforeStopB = copy(api.simulationEvidenceState); b.stopSession(false)
  observations.push({ stage: 'real-shared-evidence-service-stop-B-while-A-active', before: evidenceBeforeStopB, after: copy(api.simulationEvidenceState), aActive: a.isActive, provenance: 'Actual enabled captureSimulationEvidence and actual normal Core stop; no synthetic evidence entry or no-op service.' })
  check('shared-service-evidence-survives-other-World-stop', () => { assert(evidenceBeforeStopB.frames.length > 0); assert.equal(a.isActive, true); assert.deepEqual(copy(api.simulationEvidenceState), evidenceBeforeStopB) }, 'remaining-shared-service')
  a.stopSession(false)
  check('foreign-normal-stop-cleans-own-state-input-and-VM', () => { assert.equal(a.isActive, false); assert.equal(a.input.attached, false); assert.equal(a.scriptRuntime, null); if (!before) { assert.deepEqual(a.worldGameplayOwner.state.originOffset, { x: 0, y: 0 }); assert.equal(a.worldGameplayOwner.state.originShiftCount, 0) } })
  await Promise.resolve(); await Promise.resolve()
  Object.assign(api.physicsState.globalSettings, settingsBefore); api.physicsState.playMode = modeBefore
  observations.push({ stage: 'package-and-service-configuration', packages: copy(api.packageState), simulationEvidenceEnabled: api.simulationEvidenceState.enabled, services: 'Actual Editor composition of original navigation/AI/pool/stream/tile/evidence/particle implementations. No service replacements or package disablement.' })
  finished = true
} catch (error) { failure = error.stack ?? String(error) }
finally {
  for (const [index, runtime] of runtimes.entries()) { try { runtime.stopSession(false); cleanup.runtimes.push({ index, active: runtime.isActive, inputAttached: runtime.input.attached, vmReleased: runtime.scriptRuntime === null }) } catch (error) { cleanup.runtimes.push({ index, error: error.stack ?? String(error) }) } }
  for (const restore of restorers.reverse()) { try { restore() } catch (error) { cleanup.instrumentation.push({ error: error.stack ?? String(error) }) } }
  for (const { world, label } of worlds) { try { world.runtime?.free(); world.runtime = null; world.wasmLoaded = false; cleanup.worlds.push({ label, released: true }) } catch (error) { cleanup.worlds.push({ label, error: error.stack ?? String(error) }) } }
  const sourceChangesDuringRun = []
  for (const [path, hash] of currentHashes) if (sha(await readFile(path)) !== hash) sourceChangesDuringRun.push(normalize(relative(root, path)))
  if (sourceChangesDuringRun.length) failure = `${failure ?? ''}\nSource changed during integration: ${sourceChangesDuringRun.join(', ')}`
  const directFailed = checks.filter(item => item.scope === 'direct-orchestration' && item.status === 'FAILED').length, sharedFailed = checks.filter(item => item.scope === 'remaining-shared-service' && item.status === 'FAILED').length
  const status = failure || !finished ? 'FAILED' : directFailed ? (before ? 'BASELINE_DIRECT_SCOPE_NOT_PASSED' : 'DIRECT_SCOPE_NOT_PASSED') : sharedFailed ? 'DIRECT_SCOPE_PASSED_SHARED_SERVICES_NOT_PASSED' : 'DIRECT_SCOPE_PASSED'
  const limitations = ['Node SSR with actual ordinary WASM is not browser, Worker, independent Player or GUI verification.', 'Full WorldGameplay orchestration uses real original services; navigation, AI, pool, streaming, tile, particle and evidence internal Owners remain shared and are not certified isolated.', 'Portal targets are intentionally unregistered fixture identifiers: actual scene preparation rejects them. The check proves request routing, not a completed foreign scene transaction.', 'Only input browser event surfaces are supplied. Source/VM/World/physics/services are actual implementations; all recording wrappers delegate original methods.', 'Fixture package configuration is recorded. Absence of an AI/pool fixture is not a claim that those features are isolated.', 'No performance, GPU, concurrency gain, UI or motion claims.']
  sourceHashes['scripts/verify-engine-world-gameplay-core.mjs'] = { sha256: sha(await readFile(fileURLToPath(import.meta.url))), loadedInSsr: false }
  sourceHashes['nova_core/pkg/nova_core_bg.wasm'] = { sha256: baseline.files.find(item => item.path.endsWith('_bg.wasm')).sha256, loadedInSsr: false, executed: true }
  const report = { schema: 'nova-world-gameplay-core-integration-v1', generatedAt: new Date().toISOString(), mode, status, scope: 'Actual normal Core begin/frame/step/stop and direct WorldGameplay ownership, with remaining shared-service failures kept distinct.', checks, observations, baseline: { buildId: baseline.buildId, sourceHash: baseline.sourceHash, manifestSha256: baseline.manifestSha256, snapshotRecordSha256: sha(await readFile(join(baselineRoot, 'source.json'))), snapshotFiles: baseline.files.length }, sourceHashes, loadedSources, buildEvidence, sourceChangesDuringRun, environment: { node: process.version, platform: process.platform, architecture: process.arch, execution: 'Node SSR synchronous Core + ordinary optimized WASM', browser: null, graphicsBackend: null, performanceComparison: false }, cleanup, limitations, failure }
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' })
  console.log(JSON.stringify({ mode, status, passed: checks.filter(item => item.status === 'PASSED').length, directFailed, sharedFailed, report: join(output, 'report.json'), failure }))
  if (failure || !finished || !before && directFailed) process.exitCode = 1
}
