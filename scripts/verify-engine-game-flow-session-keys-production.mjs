/** Targeted production setter regression. Actual Owner/Vue; optional actual Core + ordinary WASM is a separate cohort. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createHash, webcrypto } from 'node:crypto'
import { resolve, relative, join, dirname, isAbsolute } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = resolve(process.cwd()), native = process.argv.includes('--native-only')
const requested = process.argv.find(value => value.startsWith('--output='))?.slice(9)
assert.ok(requested, 'Explicit unique --output is required')
const output = resolve(root, requested), suffix = relative(root, output).replaceAll('\\', '/')
assert.ok(suffix.startsWith('.cache/engine-overhaul/game-flow/session-keys/') && !suffix.startsWith('..') && !isAbsolute(suffix))
const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const ownerPath = 'src/runtime/gameFlowOwner.ts', ownerBytes = await readFile(join(root, ownerPath))
const expectedOwner = '670a645b6770458285e75bf38ade5be4fa9c3cd25cfa5c72649faa9dc40ccdf8'
assert.equal(sha(ownerBytes), expectedOwner, 'Lock the actual authorized production fix')
const transformPath = 'scripts/fixtures/game-flow-session-key-transform-v1.json'
const transformBytes = await readFile(join(root, transformPath)), transform = JSON.parse(transformBytes)
assert.equal(ownerBytes.toString().split(transform.to).length - 1, transform.count)
const inverse = ownerBytes.toString().replace(transform.to, transform.from)
assert.equal(sha(inverse), transform.beforeSha256, 'All bytes outside the one authorized method remain exact')
assert.equal(sha(inverse), sha(await readFile(join(root, '.cache/engine-overhaul/game-flow/session-keys/production-fix/before-gameFlowOwner.ts'))))
await mkdir(dirname(output), { recursive: true }); await mkdir(output)
await writeFile(join(output, 'verifier-source.mjs'), await readFile(new URL(import.meta.url)))
await writeFile(join(output, 'gameFlowOwner-source.ts'), ownerBytes)
const report = {
  schemaVersion: 1, scope: native ? 'ACTUAL_CORE_ORDINARY_WASM_SESSION_COMMANDS' : 'ACTUAL_PRODUCTION_OWNER_SAME_RAW_VUE_SESSION_KEYS',
  status: 'NOT_RUN', output, node: process.version, platform: process.platform, architecture: process.arch,
  productionEditedByVerifier: false, lockedOwnerSha256: expectedOwner, guiBuildQualification: false,
  originalMethodOnlyChanged: { inverseSha256: sha(inverse), originalSha256: transform.beforeSha256, transformSha256: sha(transformBytes) },
  checks: [], observations: [], sourceHashes: [], cleanup: {}, limits: [
    'Diagnostic Node SSR module bundle; no immutable Editor GUI artifact, Tauri WebView, native window or Player qualification.',
    'No performance, GPU, motion, adversarial sandbox or whole Runtime/World isolation claim.',
    'The __proto__ data-key branch replaces only the session dictionary; previous dictionary aliases keep their old value.',
    native ? 'Real ordinary WASM and Core are exercised with minimal EventTarget browser surfaces, not real browser input/audio hardware.' : 'Actual World constructor and same Editor Owner are used without initializing WASM or advancing physics. Native commands are a separate cohort.'
  ]
}
const check = async (name, action) => {
  try { await action(); report.checks.push({ name, status: 'PASSED' }) }
  catch (error) { report.checks.push({ name, status: 'FAILED', error: String(error.stack ?? error) }); process.exitCode = 1 }
}
const absolute = path => JSON.stringify(join(root, path).replaceAll('\\', '/'))
const entries = {
  'src/runtime/gameFlowOwner.ts': 'GameFlowOwner', 'src/world/World.ts': 'World',
  'src/editor/gameFlowAdapter.ts': 'getEditorGameFlowOwner',
  'src/runtime/gameFlow.ts': 'gameFlowState, getLegacyGameFlowRawState, requireLegacyGameFlowOwner'
}
if (native) Object.assign(entries, {
  'src/runtime/GameplayRuntime.ts': 'GameplayRuntime', 'src/store/physics.ts': 'physicsState',
  'src/store/editor.ts': 'editorState', 'src/assets/AssetDatabase.ts': 'assetState',
  'src/assets/types.ts': 'defaultScriptMetadata', 'src/world/BoxEntity.ts': 'BoxEntity',
  'src/world/components.ts': 'Script2D', 'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
  'nova_core/pkg/nova_core.js': 'default as initWasm, WasmRuntimeWorld'
})
const entryPath = join(output, 'actual-entry.ts'), bundlePath = join(output, 'compiled/actual.mjs')
await writeFile(entryPath, Object.entries(entries).map(([path, names]) => `export { ${names} } from ${absolute(path)};`).join('\n') + "\nexport { watch, nextTick, toRaw, isReactive } from 'vue';\n")
let api, watched = null, runtime = null, world = null, previousNativeState = null
const before = new Map(), loaded = new Set()
const nonModuleArtifacts = [transformPath, ...(native ? ['nova_core/pkg/nova_core_bg.wasm', 'nova_core/pkg/nova_core.d.ts'] : [])]
const artifactHashesBefore = new Map()
for (const path of nonModuleArtifacts) artifactHashesBefore.set(path, sha(await readFile(join(root, path))))
try {
  if (native) {
    if (!globalThis.crypto) globalThis.crypto = webcrypto
    for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
  }
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{
    name: 'production-session-source-pair', enforce: 'pre',
    async load(id) {
      const path = id.split('?')[0]
      if (path.replaceAll('\\', '/').startsWith(root.replaceAll('\\', '/') + '/') && !path.includes('node_modules') && /\.(ts|js|mjs|json)$/.test(path)) {
        const bytes = await readFile(path); before.set(path, sha(bytes)); loaded.add(path)
        return bytes.toString()
      }
    }
  }], build: { ssr: true, outDir: dirname(bundlePath), emptyOutDir: false, rollupOptions: { input: entryPath, output: { entryFileNames: 'actual.mjs', inlineDynamicImports: true } } } })
  report.compiledArtifact = { path: bundlePath, sha256: sha(await readFile(bundlePath)), entrySha256: sha(await readFile(entryPath)), guiBuildQualification: false }
  api = await import(pathToFileURL(bundlePath).href)
  const owner = api.getEditorGameFlowOwner(), view = owner.state, raw = api.getLegacyGameFlowRawState(), ownerWorld = owner.world
  const sameOwner = () => { assert.equal(api.getEditorGameFlowOwner(), owner); assert.equal(api.requireLegacyGameFlowOwner(), owner); assert.equal(owner.state, view); assert.equal(view, api.gameFlowState); assert.equal(api.toRaw(view), raw); assert.equal(owner.world, ownerWorld) }
  const events = []
  const resetWatch = async () => {
    watched?.(); watched = null; owner.resetGameFlow(); await api.nextTick(); events.length = 0
    watched = api.watch(() => view.session, () => events.push({ ownKeyCount: Object.keys(view.session).length, snapshot: owner.gameFlowSnapshot().session }), { deep: true })
  }
  const settle = () => api.nextTick()
  if (!native) {
    await check('Vue 1: installed same raw reactive state, original Editor Owner and actual World', async () => {
      owner.resetGameFlow(); await settle(); sameOwner(); assert.ok(api.isReactive(view)); assert.ok(api.isReactive(view.session)); assert.ok(api.toRaw(ownerWorld) instanceof api.World)
      report.observations.push({ case: 'same-raw-owner-world', stateReactive: true, sessionReactive: true, sameOwner: true, sameStateRaw: true, secondOwnerOrWorldForEditorExperiment: false })
    })
    await check('Vue 2: ordinary assignment plus actual production add/update trigger deep watch', async () => {
      await resetWatch(); const dictionary = view.session
      view.session.assignment = 'one'; await settle(); assert.equal(events.length, 1)
      assert.equal(owner.setSessionValue('ownerSetter', 'two'), true); await settle(); assert.equal(events.length, 2)
      assert.equal(owner.setSessionValue('ownerSetter', 'updated'), true); await settle(); assert.equal(events.length, 3)
      assert.equal(view.session, dictionary); sameOwner()
      report.observations.push({ case: 'ordinary-notification-control', notifications: 3, events: structuredClone(events), dictionaryIdentityRetained: true })
    })
    await check('Vue 3 control: direct defineProperty on proxy still bypasses watch; not the production path', async () => {
      await resetWatch(); Object.defineProperty(view.session, 'defined', { value: 'one', writable: true, enumerable: true, configurable: true }); await settle()
      Object.defineProperty(view.session, 'defined', { value: 'updated', writable: true, enumerable: true, configurable: true }); await settle()
      assert.equal(events.length, 0); assert.equal(owner.gameFlowSnapshot().session.defined, 'updated'); assert.equal(Object.getPrototypeOf(api.toRaw(view.session)), Object.prototype)
      report.observations.push({ case: 'define-property-proxy-counterexample', classification: 'CONFIRMED_CONTROL_HAZARD', notifications: 0, snapshot: owner.gameFlowSnapshot().session, productionUsesThisProxyOperation: false })
    })
    await check('Vue 4: actual production fresh/update __proto__ is own JSON data, notifies, keeps prototype and Owner', async () => {
      await resetWatch(); const dictionary = view.session
      assert.equal(owner.setSessionValue('__proto__', { version: 1 }), true); await settle(); assert.equal(events.length, 1); assert.notEqual(view.session, dictionary)
      assert.equal(owner.setSessionValue('__proto__', { version: 2 }), true); await settle(); assert.equal(events.length, 2)
      assert.equal(Object.keys(view.session).length, 1); assert.ok(Object.hasOwn(view.session, '__proto__')); assert.equal(Object.getPrototypeOf(api.toRaw(view.session)), Object.prototype)
      assert.deepEqual(owner.gameFlowSnapshot().session.__proto__, { version: 2 }); assert.equal(Object.hasOwn(Object.prototype, 'version'), false); sameOwner()
      report.observations.push({ case: 'production-proto-fresh-update', notifications: 2, events: structuredClone(events), ownKeyCount: 1, prototypeUnchanged: true, sameStateOwnerWorld: true, dictionaryIdentityReplaced: true })
    })
    await check('Vue 5: actual snapshot/checkpoint JSON and restore preserve __proto__ and notify', async () => {
      assert.equal(owner.setRuntimeCheckpoint('data-property-save'), true)
      const serialized = JSON.stringify(owner.state.checkpoints[0]), roundTrip = JSON.parse(serialized)
      assert.ok(Object.hasOwn(roundTrip.session, '__proto__')); assert.deepEqual(roundTrip.session.__proto__, { version: 2 })
      assert.equal(owner.setSessionValue('__proto__', { version: 3 }), true); await settle(); const beforeRestore = events.length
      assert.equal(owner.restoreRuntimeCheckpoint('data-property-save'), true); await settle(); assert.equal(events.length, beforeRestore + 1)
      assert.deepEqual(owner.gameFlowSnapshot().session.__proto__, { version: 2 }); assert.equal(Object.getPrototypeOf(api.toRaw(view.session)), Object.prototype); sameOwner()
      report.observations.push({ case: 'production-checkpoint-json-restore', checkpointJson: serialized, snapshot: owner.gameFlowSnapshot(), restoreNotifications: 1, prototypeUnchanged: true })
    })
    await check('Vue 6: 512 own keys reject inherited/new keys and allow existing ordinary/proto updates with watch', async () => {
      await resetWatch(); for (let index = 0; index < 511; index++) assert.equal(owner.setSessionValue(`k${index}`, index), true); await settle(); events.length = 0
      assert.equal(owner.setSessionValue('__proto__', { version: 1 }), true); await settle(); assert.equal(events.length, 1)
      for (const key of ['toString', 'constructor', 'hasOwnProperty', 'plain513']) assert.equal(owner.setSessionValue(key, 'rejected'), false)
      await settle(); assert.equal(events.length, 1)
      assert.equal(owner.setSessionValue('__proto__', { version: 2 }), true); await settle(); assert.equal(events.length, 2)
      assert.equal(owner.setSessionValue('k0', 'updated'), true); await settle(); assert.equal(events.length, 3)
      assert.equal(Object.keys(view.session).length, 512); assert.equal(Object.getPrototypeOf(api.toRaw(view.session)), Object.prototype); sameOwner()
      report.observations.push({ case: 'production-cap-watch', ownKeys: 512, notifications: 3, rejected: ['toString', 'constructor', 'hasOwnProperty', 'plain513'], existingProtoAndOrdinaryUpdates: true })
    })
    watched?.(); watched = null; owner.resetGameFlow(); await settle()
    const fresh = () => { const w = new api.World(); const o = new api.GameFlowOwner({ world: w, settings: { timeScale: 1 }, activeSceneUuid: 'production-session-keys' }); assert.equal(o.world, w); return o }
    await check('Pure Owner: ordinary full cap rejects all four inherited names without mutation, updates same own key', () => {
      const o = fresh(); for (let index = 0; index < 512; index++) assert.equal(o.setSessionValue(`k${index}`, index), true)
      const beforeJson = JSON.stringify(o.gameFlowSnapshot())
      for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) assert.equal(o.setSessionValue(key, { rejected: true }), false)
      assert.equal(JSON.stringify(o.gameFlowSnapshot()), beforeJson); assert.equal(o.setSessionValue(' k7 ', 'updated'), true)
      assert.equal(o.state.session.k7, 'updated'); assert.equal(Object.keys(o.state.session).length, 512); assert.equal(Object.getPrototypeOf(o.state.session), Object.prototype)
      report.observations.push({ case: 'pure-full-cap', ownKeys: 512, newInheritedNamesRejected: true, ownUpdatePermitted: true, rejectedMutations: 0 })
    })
    await check('Pure Owner: inherited names are valid own JSON keys below cap; no blacklist', () => {
      const o = fresh(); for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) assert.equal(o.setSessionValue(key, { key }), true)
      const saved = JSON.parse(JSON.stringify(o.gameFlowSnapshot()))
      for (const key of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) { assert.ok(Object.hasOwn(saved.session, key)); assert.deepEqual(saved.session[key], { key }) }
      assert.equal(Object.keys(saved.session).length, 4); assert.equal(Object.getPrototypeOf(o.state.session), Object.prototype)
      report.observations.push({ case: 'pure-inherited-valid-json', snapshot: saved, ownKeys: 4, prototypeUnchanged: true })
    })
    await check('Pure Owner: original key normalization, JSON 64000 boundary, null and nonserializable rejection', () => {
      const o = fresh(), longKey = 'x'.repeat(100), circular = {}; circular.self = circular
      assert.equal(o.setSessionValue(`  ${longKey}  `, 0), true); assert.ok(Object.hasOwn(o.state.session, 'x'.repeat(80)))
      assert.equal(o.setSessionValue('empty', ''), true); assert.equal(o.setSessionValue('false', false), true)
      assert.equal(o.setSessionValue('exact64000', 'v'.repeat(63998)), true)
      for (const [key, value] of [['tooLarge', 'v'.repeat(63999)], ['null', null], ['undefined', undefined], ['bigint', 1n], ['circular', circular], [' ', 1]]) assert.equal(o.setSessionValue(key, value), false)
      assert.equal(Object.keys(o.state.session).length, 4)
      report.observations.push({ case: 'original-limits-preserved', keyMaximum: 80, exactSerializedLength: JSON.stringify(o.state.session.exact64000).length, nullUndefinedBigintCircularRejected: true, emptyStringAndFalseAccepted: true })
    })
    await check('Pure Owner: checkpoint restores prototype data and does not modify another real World Owner', () => {
      const a = fresh(), b = fresh(); assert.equal(a.setSessionValue('__proto__', { value: 'a' }), true); assert.equal(b.setSessionValue('sentinel', 'b'), true)
      assert.equal(a.setRuntimeCheckpoint('proto'), true); assert.equal(a.setSessionValue('__proto__', { value: 'changed' }), true); assert.equal(a.restoreRuntimeCheckpoint('proto'), true)
      assert.deepEqual(a.gameFlowSnapshot().session.__proto__, { value: 'a' }); assert.deepEqual(b.gameFlowSnapshot().session, { sentinel: 'b' }); assert.equal(Object.getPrototypeOf(a.state.session), Object.prototype)
      report.observations.push({ case: 'pure-checkpoint-isolation', a: a.gameFlowSnapshot(), b: b.gameFlowSnapshot(), scope: 'Only session dictionaries, no concurrent Runtime simulation claim.' })
    })
    report.cleanup.editorWatchStopped = true; owner.resetGameFlow(); await settle(); report.cleanup.editorFlowReset = true
  } else {
    globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance })
    globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null })
    globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
    await api.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
    world = api.physicsState.world
    previousNativeState = { entities: [...world.entities], records: [...api.assetState.records], generation: api.assetState.generation, mode: api.physicsState.playMode, scale: api.physicsState.globalSettings.timeScale, debugger: api.scriptProjectSettings.debuggerEnabled, coverage: api.scriptProjectSettings.testing.coverageEnabled }
    world.runtime = new api.WasmRuntimeWorld(); world.wasmLoaded = true
    api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false
    const source = `@export let seen_proto = "missing";\n@export let seen_ctor = "missing";\n@export let seen_rejected = "missing";\n@export let seen_existing = "missing";\nfn awake() { session_set("__proto__", "native-proto"); session_set("constructor", "native-constructor"); checkpoint_set("native-data"); }\nfn update(dt) { seen_proto = session_get("__proto__", "missing"); seen_ctor = session_get("constructor", "missing"); seen_rejected = session_get("toString", "missing"); seen_existing = session_get("k0", "missing"); }\nfn mutate() { session_set("__proto__", "native-updated"); }\nfn recover() { checkpoint_restore("native-data"); }\nfn capacity_probe() { session_set("toString", "must-not-save"); session_set("k0", "native-existing-updated"); }`
    await writeFile(join(output, 'native-session-probe.rhai'), source)
    const record = { uuid: 'production-session-key-rhai', name: 'Production Session Keys', path: 'Assets/production-session-key.rhai', assetType: 'script', source, script: api.defaultScriptMetadata() }
    api.assetState.records.splice(0, api.assetState.records.length, record); api.assetState.generation++
    const entity = new api.BoxEntity(7201, { x: 2, y: 3 }, { x: 1, y: 1 }); entity.name = 'Session key native probe'; entity.isStatic = true; entity.addComponent(new api.Script2D()).scriptAsset = record.uuid
    world.entities.splice(0, world.entities.length, entity); api.physicsState.playMode = 'playing'; api.physicsState.globalSettings.timeScale = 1
    runtime = new api.GameplayRuntime(); runtime.beginSession(); runtime.frame(.025)
    await check('Native Core 1: real Rhai session_set and following update session_get preserve special own keys and checkpoint', () => {
      assert.equal(entity.script2D.lastError, null); assert.equal(runtime.gameFlowOwner, owner); assert.equal(entity.script2D.properties.seen_proto, 'native-proto'); assert.equal(entity.script2D.properties.seen_ctor, 'native-constructor')
      assert.ok(Object.hasOwn(view.session, '__proto__')); assert.equal(Object.getPrototypeOf(api.toRaw(view.session)), Object.prototype)
      const cp = JSON.parse(JSON.stringify(view.checkpoints[0])); assert.ok(Object.hasOwn(cp.session, '__proto__')); assert.equal(cp.session.__proto__, 'native-proto')
      runtime.runEntityFunction(entity, 'mutate'); runtime.frame(.025); assert.equal(entity.script2D.properties.seen_proto, 'native-updated')
      runtime.runEntityFunction(entity, 'recover'); runtime.frame(.025); assert.equal(entity.script2D.properties.seen_proto, 'native-proto'); assert.equal(entity.script2D.lastError, null)
      report.observations.push({ case: 'native-real-command-context', sourceSha256: sha(source), snapshot: owner.gameFlowSnapshot(), properties: { ...entity.script2D.properties }, checkpointOwnProto: true, qualification: 'Actual Rhai VM -> Core command -> actual Owner -> next update context. Not source-only evidence.' })
    })
    await check('Native Core 2: full capacity actual Rhai inherited key rejected, existing own update accepted in next context', () => {
      owner.resetGameFlow(); for (let index = 0; index < 512; index++) assert.equal(owner.setSessionValue(`k${index}`, 'existing'), true)
      const beforeErrors = api.editorState.logs.length
      runtime.runEntityFunction(entity, 'capacity_probe'); runtime.frame(.025)
      assert.equal(entity.script2D.lastError, null); assert.equal(Object.keys(view.session).length, 512); assert.equal(Object.hasOwn(view.session, 'toString'), false)
      assert.equal(entity.script2D.properties.seen_rejected, 'missing'); assert.equal(entity.script2D.properties.seen_existing, 'native-existing-updated')
      const errorRows = api.editorState.logs.slice(beforeErrors).filter(row => row.message?.includes('Session value rejected: toString'))
      assert.equal(errorRows.length, 1)
      report.observations.push({ case: 'native-full-cap-command', ownKeys: 512, rejectedKeyAbsent: true, nextUpdateProperties: { ...entity.script2D.properties }, actualRejectionLogs: errorRows })
    })
  }
  report.status = report.checks.some(row => row.status === 'FAILED') ? 'FAILED' : 'VERIFIED_TARGETED_PRODUCTION_FIX'
} catch (error) { report.status = 'FAILED_BOOTSTRAP'; report.failure = String(error.stack ?? error); process.exitCode = 1 }
finally {
  watched?.()
  if (runtime) { try { runtime.stopSession(false); report.cleanup.runtime = { active: runtime.isActive, inputAttached: runtime.input.attached, vmReleased: runtime.scriptRuntime === null } } catch (error) { report.cleanup.runtimeError = String(error.stack ?? error); process.exitCode = 1 } }
  if (world) { try { world.runtime?.free(); world.runtime = null; world.wasmLoaded = false; report.cleanup.wasmReleased = true } catch (error) { report.cleanup.wasmError = String(error.stack ?? error); process.exitCode = 1 } }
  if (previousNativeState && api) {
    world.entities.splice(0, world.entities.length, ...previousNativeState.entities); api.assetState.records.splice(0, api.assetState.records.length, ...previousNativeState.records); api.assetState.generation = previousNativeState.generation
    api.physicsState.playMode = previousNativeState.mode; api.physicsState.globalSettings.timeScale = previousNativeState.scale; api.scriptProjectSettings.debuggerEnabled = previousNativeState.debugger; api.scriptProjectSettings.testing.coverageEnabled = previousNativeState.coverage
    report.cleanup.hostStateRestored = true
  }
  report.sourceChangesDuringRun = []
  for (const path of [...loaded].sort()) {
    const afterHash = sha(await readFile(path)), beforeHash = before.get(path), local = relative(root, path).replaceAll('\\', '/')
    report.sourceHashes.push({ path: local, sha256: beforeHash, afterSha256: afterHash, unchanged: beforeHash === afterHash })
    if (beforeHash !== afterHash) report.sourceChangesDuringRun.push(local)
  }
  for (const path of nonModuleArtifacts) {
    const beforeHash = artifactHashesBefore.get(path), afterHash = sha(await readFile(join(root, path)))
    report.sourceHashes.push({ path, sha256: beforeHash, afterSha256: afterHash, unchanged: beforeHash === afterHash, artifactNotQualifiedAsGui: true })
    if (beforeHash !== afterHash) report.sourceChangesDuringRun.push(path)
  }
  report.ownerSourceUnchanged = sha(await readFile(join(root, ownerPath))) === expectedOwner
  if (!report.ownerSourceUnchanged || report.sourceChangesDuringRun.length || process.exitCode) { if (report.status === 'VERIFIED_TARGETED_PRODUCTION_FIX') report.status = 'FAILED_ASSOCIATION_OR_CLEANUP'; process.exitCode = 1 }
  report.codePath = { owner: `${ownerPath}:${ownerBytes.toString().split('\n').findIndex(line => line.includes('setSessionValue(key: string,')) + 1}`, nativeCommandExecuted: native, scope: native ? 'Rhai session_set -> Core sessionSet branch -> Owner method; next update reads JSON context via session_get.' : 'No native script command executed in this cohort.' }
  report.driverSha256 = sha(await readFile(new URL(import.meta.url))); report.completedAt = new Date().toISOString()
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify({ status: report.status, passed: report.checks.filter(row => row.status === 'PASSED').length, failed: report.checks.filter(row => row.status === 'FAILED').length, output, reportSha256: sha(await readFile(join(output, 'report.json'))), driverSha256: report.driverSha256 }))
