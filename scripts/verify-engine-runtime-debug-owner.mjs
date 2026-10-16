import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { webcrypto, createHash } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(), 'nova-debug-owner-'))
const before = process.argv.includes('--before'), checks = [], observations = [], normalize = path => path.replaceAll('\\', '/')
const reportOverride = process.argv.find(value => value.startsWith('--report='))?.slice('--report='.length)
let passed = false
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
const check = (name, operation) => { operation(); checks.push(name) }
try {
  const entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime', 'src/runtime/GameplayRuntimeCore.ts': 'GameplayRuntime as GameplayRuntimeCore',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices', 'src/store/physics.ts': 'physicsState',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/assets/AssetDatabase.ts': 'assetState', 'src/assets/types.ts': 'defaultScriptMetadata',
    'src/world/BoxEntity.ts': 'BoxEntity', 'src/world/components.ts': 'Script2D', 'src/runtime/entityLifetimes.ts': 'beginEntityLifetime',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings', 'src/runtime/scriptDebug.ts': 'clearScriptDebugger, beginDebugSession, scriptDebugState',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmScriptRuntime'
  }
  if (!before) entries['src/runtime/scriptDebugCounterOwner.ts'] = 'BoundedScriptDebugCounterOwner'
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n'))
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const core = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  await core.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  core.scriptProjectSettings.debuggerEnabled = true; core.scriptProjectSettings.breakOnRuntimeError = false; core.scriptProjectSettings.testing.coverageEnabled = false
  core.beginDebugSession(); core.physicsState.playMode = 'playing'
  const source = '@export let runs = 0;\nfn update(dt) {\n runs += 1;\n}', point = { id: 'point', line: 3, functionName: 'update', condition: '', hitCondition: 2, logMessage: '', enabled: true, hitCount: 0 }
  const record = { uuid: 'debug-owner-source', name: 'Debug', path: 'Assets/Scripts/debug.rhai', assetType: 'script', source, script: { ...core.defaultScriptMetadata(), breakpointDetails: [point] } }
  core.assetState.records.splice(0, core.assetState.records.length, record); core.assetState.generation++
  const editorServices = core.createEditorGameplayScriptServices(), { recordBreakpointHit: _hit, writeSource: _write, ...readonlyServices } = editorServices
  let entityId = 1
  const runtimes = [], make = (owner, services = readonlyServices) => {
    const runtime = new core.GameplayRuntimeCore(services, core.createEditorGameplayWorldHost(), owner), vm = new core.WasmScriptRuntime(), entity = new core.BoxEntity(entityId++, { x: 0, y: 0 }, { x: 1, y: 1 })
    entity.isStatic = true; entity.addComponent(new core.Script2D()).scriptAsset = record.uuid; core.beginEntityLifetime(entity)
    runtime.scriptRuntime = vm; runtime.active = true; runtime.playSessionIdentity = 11; vm.clear_instances(11)
    core.physicsState.world.entities.splice(0, core.physicsState.world.entities.length, entity); core.clearScriptDebugger(); core.physicsState.playMode = 'playing'
    runtimes.push(runtime); return { runtime, entity }
  }
  const missing = make(); missing.runtime.runEntityFunction(missing.entity, 'update'); missing.runtime.runEntityFunction(missing.entity, 'update')
  observations.push({ scope: 'readonly-without-counter', callbackRuns: missing.entity.script2D.properties.runs, catalogHitCount: point.hitCount, paused: core.scriptDebugState.paused, capabilities: missing.runtime.scriptDebugCapabilities ?? null })
  check('missing-owner-keeps-gameplay-and-readonly-catalog', () => { assert.equal(missing.entity.script2D.lastError, null); assert.equal(missing.entity.script2D.properties.runs, 2); assert.equal(point.hitCount, 0); assert.equal(core.scriptDebugState.paused, false) })
  if (before) {
    check('confirmed-before-counter-owner-capability-is-unreported', () => assert.equal(missing.runtime.scriptDebugCapabilities, undefined))
  } else {
    check('missing-owner-explicitly-disables-breakpoints-and-logpoints', () => { assert.equal(missing.runtime.scriptDebugCapabilities.callbackBreakpoints, 'unavailable'); assert.equal(missing.runtime.scriptDebugCapabilities.logpoints, 'unavailable'); assert.equal(missing.runtime.scriptDebugCapabilities.reason, 'debug-counter-owner-missing') })
    const owner = new core.BoundedScriptDebugCounterOwner(), actual = make(owner)
    actual.runtime.runEntityFunction(actual.entity, 'update'); actual.runtime.runEntityFunction(actual.entity, 'update')
    check('actual-readonly-owner-persists-continuous-hits-and-pauses-before-callback', () => { assert.equal(actual.entity.script2D.properties.runs, 1); assert.equal(point.hitCount, 0); assert.equal(core.physicsState.playMode, 'paused'); assert.match(core.scriptDebugState.reason, /hit 2/); assert.equal(actual.runtime.scriptDebugCapabilities.callbackBreakpoints, 'available') })
    core.clearScriptDebugger(); core.physicsState.playMode = 'playing'; point.logMessage = 'readonly {entityName}'; point.hitCondition = 0
    actual.runtime.runEntityFunction(actual.entity, 'update')
    check('actual-readonly-logpoint-counts-and-executes-without-authoring-write', () => { assert.equal(actual.entity.script2D.properties.runs, 2); assert.equal(point.hitCount, 0); assert.equal(core.scriptDebugState.paused, false) })
    actual.runtime.setHostSuspended(true); actual.runtime.setHostSuspended(false); actual.runtime.runEntityFunction(actual.entity, 'update')
    check('host-hide-does-not-retire-debug-world-epoch-or-count-owner', () => { assert.equal(actual.entity.script2D.properties.runs, 3); assert.equal(owner.diagnostics.activeSessions, 1) })
    point.logMessage = ''; point.hitCondition = 2; actual.runtime.playSessionIdentity = 12; actual.runtime.scriptRuntime.clear_instances(12); actual.runtime.invalidateScriptWorld(); actual.runtime.initializedScriptInstances.clear()
    actual.runtime.runEntityFunction(actual.entity, 'update')
    check('actual-play-world-epoch-restarts-local-counter-only', () => { assert.equal(core.scriptDebugState.paused, false); assert.equal(point.hitCount, 0); assert.equal(owner.diagnostics.activeSessions, 1) })
    actual.runtime.runEntityFunction(actual.entity, 'update'); assert.equal(core.scriptDebugState.paused, true)
    const lease1 = owner.openSession(20), first = lease1.prepareHit('one', 'program1', 0, point)
    assert.equal(first.status, 'prepared'); assert.equal(lease1.consumeHit(first.token).hitCount, 1)
    assert.equal(lease1.consumeHit(first.token).status, 'unavailable')
    const stale = lease1.prepareHit('one', 'program1', 0, point), current = lease1.prepareHit('one', 'program2', 0, point)
    check('source-revision-rejects-late-hit-and-resets-new-program', () => { assert.equal(lease1.consumeHit(stale.token).reason, 'stale-hit-token'); assert.equal(lease1.consumeHit(current.token).hitCount, 1) })
    const oldPoint = lease1.prepareHit('one', 'program2', 0, point), changed = lease1.prepareHit('one', 'program2', 0, { ...point, line: 4 })
    check('point-revision-rejects-old-context', () => { assert.equal(lease1.consumeHit(oldPoint.token).reason, 'stale-hit-token'); assert.equal(lease1.consumeHit(changed.token).hitCount, 1) })
    const lease2 = owner.openSession(21); lease1.dispose(); lease1.dispose()
    const fresh = lease2.prepareHit('one', 'program2', 0, point)
    check('late-idempotent-dispose-cannot-clear-new-owner-epoch', () => { assert.equal(lease1.prepareHit('one', 'program2', 0, point).reason, 'stale-debug-session'); assert.equal(lease2.consumeHit(fresh.token).hitCount, 1); assert.equal(owner.diagnostics.activeSessions, 1) })
    const duplicateEpoch = owner.openSession(21), replacement = duplicateEpoch.prepareHit('one', 'program2', 0, point)
    lease2.dispose()
    check('same-epoch-fast-owner-replacement-still-rejects-old-registration', () => { assert.equal(lease2.consumeHit(fresh.token).reason, 'stale-debug-session'); assert.equal(duplicateEpoch.consumeHit(replacement.token).hitCount, 1); assert.equal(owner.diagnostics.activeSessions, 1) })
    const token = duplicateEpoch.prepareHit('other-script', 'program2', 0, point)
    check('script-identity-and-token-object-ownership-reject-forgery', () => { assert.equal(duplicateEpoch.consumeHit({ ...token.token }).reason, 'stale-hit-token'); assert.equal(duplicateEpoch.consumeHit(token.token).hitCount, 1) })
    check('invalid-epoch-and-point-have-explicit-refusal', () => { assert.throws(() => owner.openSession(0), /Invalid debug world epoch/); assert.equal(duplicateEpoch.prepareHit('one', 'program2', 0, { ...point, line: -1 }).reason, 'invalid-debug-point'); assert.equal(owner.diagnostics.activeSessions, 1) })
    const small = new core.BoundedScriptDebugCounterOwner({ maxPoints: 1, maxMetadataBytes: 256, maxSourceBytes: 64 }), smallLease = small.openSession(1)
    const smallHit = smallLease.prepareHit('s', 'p', 0, point); assert.equal(smallHit.status, 'prepared'); smallLease.consumeHit(smallHit.token)
    check('point-and-byte-budgets-refuse-new-work-without-evicting-count', () => { assert.equal(smallLease.prepareHit('s', 'p', 1, { ...point, id: 'second' }).reason, 'debug-point-capacity'); assert.equal(smallLease.prepareHit('large', 'x'.repeat(40), 0, point).reason, 'debug-source-byte-capacity'); const old = smallLease.prepareHit('s', 'p', 0, point); assert.equal(smallLease.consumeHit(old.token).hitCount, 2) })
    const overflowing = make(new core.BoundedScriptDebugCounterOwner({ maxSourceBytes: 1 })); overflowing.runtime.runEntityFunction(overflowing.entity, 'update')
    check('actual-counter-budget-refusal-does-not-block-gameplay', () => { assert.equal(overflowing.entity.script2D.properties.runs, 1); assert.equal(overflowing.entity.script2D.lastError, null); assert.equal(overflowing.runtime.scriptDebugCapabilities.reason, 'debug-source-byte-capacity') })
    const metadata = make(new core.BoundedScriptDebugCounterOwner({ maxMetadataBytes: 1 })); metadata.runtime.runEntityFunction(metadata.entity, 'update')
    check('actual-metadata-byte-budget-refusal-does-not-block-gameplay', () => { assert.equal(metadata.entity.script2D.properties.runs, 1); assert.equal(metadata.runtime.scriptDebugCapabilities.reason, 'debug-metadata-byte-capacity') })
    const failed = make({ openSession() { throw Error('counter-host-failure') } }); failed.runtime.runEntityFunction(failed.entity, 'update')
    check('counter-host-error-is-observed-without-swallowing-gameplay', () => { assert.equal(failed.entity.script2D.properties.runs, 1); assert.equal(failed.runtime.scriptDebugCounterDiagnostics.failures, 1); assert.match(failed.runtime.scriptDebugCapabilities.reason, /counter-host-failure/) })
    point.hitCount = 0; point.hitCondition = 2; point.logMessage = ''; const editor = make(null, editorServices)
    editor.runtime.runEntityFunction(editor.entity, 'update'); editor.runtime.runEntityFunction(editor.entity, 'update')
    check('Editor-counter-port-retains-original-authoring-hit-semantics', () => { assert.equal(point.hitCount, 2); assert.equal(editor.entity.script2D.properties.runs, 1); assert.equal(core.scriptDebugState.paused, true) })
    const capabilities = missing.runtime.scriptDebugCapabilities; point.hitCondition = 0; point.logMessage = 'not enabled'; core.clearScriptDebugger(); core.physicsState.playMode = 'playing'; core.physicsState.world.entities.splice(0, core.physicsState.world.entities.length, missing.entity); missing.runtime.invalidateScriptWorld(); missing.runtime.runEntityFunction(missing.entity, 'update')
    check('no-hit-condition-or-logpoint-does-not-fabricate-missing-capability', () => { assert.equal(missing.entity.script2D.properties.runs, 3); assert.equal(missing.runtime.scriptDebugCapabilities.callbackBreakpoints, capabilities.callbackBreakpoints) })
    point.condition = 'true'; point.logMessage = ''; missing.runtime.runEntityFunction(missing.entity, 'update')
    check('true-condition-does-not-enable-a-missing-counter-capability', () => { assert.equal(missing.entity.script2D.properties.runs, 4); assert.equal(core.scriptDebugState.paused, false); assert.equal(missing.runtime.scriptDebugCapabilities.reason, 'debug-counter-owner-missing') })
    point.condition = ''
    const stoppingOwner = new core.BoundedScriptDebugCounterOwner(), stopping = make(stoppingOwner)
    stopping.runtime.runEntityFunction(stopping.entity, 'update'); stopping.runtime.stopSession(false); stopping.runtime.stopSession(false)
    check('actual-Core-stop-disposes-counter-session-and-VM-once', () => { assert.equal(stoppingOwner.diagnostics.activeSessions, 0); assert.equal(stoppingOwner.diagnostics.points, 0); assert.equal(stopping.runtime.scriptRuntime, null); assert.equal(stopping.runtime.isActive, false) })
    const previousSource = record.source; record.source = '@export let runs = 0;\nfn update(dt) {\n throw "actual-gameplay-error";\n}'; core.assetState.generation++
    const realError = make({ openSession() { throw Error('diagnostic-owner-error') } }); realError.runtime.runEntityFunction(realError.entity, 'update')
    check('diagnostic-fault-does-not-swallow-real-Gameplay-VM-error', () => { assert.match(realError.entity.script2D.lastError, /actual-gameplay-error/); assert.equal(realError.runtime.diagnostics.scriptErrors, 1); assert.equal(realError.runtime.scriptDebugCounterDiagnostics.failures, 1) })
    record.source = previousSource; core.assetState.generation++
  }
  for (const runtime of runtimes) { runtime.releaseScriptDebugCounterSession?.(); runtime.scriptRuntime?.free() }
  passed = true
} finally {
  const reportPath = reportOverride ? join(root, reportOverride) : join(root, '.cache/engine-runtime', `debug-owner-${before ? 'before' : 'after'}.json`)
  await mkdir(dirname(reportPath), { recursive: true })
  const hashes = {}; for (const file of ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/scriptServices.ts', 'nova_core/pkg/nova_core_bg.wasm']) hashes[file] = createHash('sha256').update(await readFile(join(root, file))).digest('hex')
  await writeFile(reportPath, JSON.stringify({ generatedAt: new Date().toISOString(), status: passed ? before ? 'CONFIRMED_DEFECT' : 'passed' : 'failed', checks, observations, sourceHashes: hashes, scope: 'Actual Core/readonly catalog/Editor port + optimized ordinary WASM and bounded counter lifecycle; no full Player debugger/global DebugState isolation claim.' }, null, 2))
  await rm(temporary, { recursive: true, force: true })
  console.log(`Debug Owner ${before ? 'before' : 'after'}: ${checks.length} checks ${passed ? 'completed' : 'failed'}`)
}
