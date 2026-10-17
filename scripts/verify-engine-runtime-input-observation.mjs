import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before')
const compiled = await mkdtemp(join(tmpdir(), 'nova-engine-input-observation-'))
const checks = [], normalize = path => path.replaceAll('\\', '/')
let passed = false, gamepads = [], nativeWorld = null, runtime = null
if (!globalThis.crypto) globalThis.crypto = webcrypto
if (!globalThis.HTMLElement) globalThis.HTMLElement = class {}
for (const name of ['HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class extends HTMLElement {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => gamepads, maxTouchPoints: 0, platform: 'Win32', userAgent: 'Nova Node observation integration' } })
const key = (code = 'Space', extra = {}) => ({ target: null, code, key: code === 'Space' ? ' ' : code.slice(3).toLowerCase(), repeat: false, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false, ...extra })
try {
  const entry = join(compiled, 'entry.ts')
  const exports = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime',
    'src/runtime/input.ts': 'InputManager, createInputAction, createInputBinding, INPUT_EDGE_CAPACITY',
    'src/runtime/entityLifetimes.ts': 'beginEntityLifetime',
    'src/store/physics.ts': 'physicsState',
    'src/assets/AssetDatabase.ts': 'assetState',
    'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'Script2D',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'src/runtime/replay.ts': 'replayState, stopReplay',
    'src/runtime/audio.ts': 'audioRuntime',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmScriptRuntime, WasmRuntimeWorld'
  }
  await writeFile(entry, Object.entries(exports).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n'))
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'observation.mjs', inlineDynamicImports: true } } } })
  const core = await import(pathToFileURL(join(compiled, 'observation.mjs')).href)
  const manager = new core.InputManager()
  assert.equal(typeof manager.setObservationCallbacks, 'function', 'actual InputManager needs a profiling opt-in receipt/consume bridge')
  assert.equal(typeof core.GameplayRuntime.prototype.setInputObservationCallbacks, 'function', 'actual GameplayRuntime needs current-frame consumption metadata')
  const action = core.createInputAction('Jump', 'button', [core.createInputBinding('physical-key', 'Space')])
  let clock = 10
  const receipts = [], resets = []
  const dispose = manager.setObservationCallbacks({ nowMs: () => clock, receipt: value => receipts.push(value), reset: (epoch, reason) => resets.push({ epoch, reason }) })
  manager.sample([action]); manager.onKeyDown(key()); clock = 12; manager.onKeyUp(key()); clock = 15
  const pulse = manager.sample([action]), consumed = manager.lastConsumedInputObservation
  assert.equal(pulse.pressed.Jump, true); assert.equal(pulse.released.Jump, true)
  assert.equal(receipts.length, 2); assert.deepEqual(consumed.receipts.map(value => value.receivedAtMs), [10, 12])
  assert.equal(consumed.latestReceipt.sequence, receipts[1].sequence)
  assert.equal(manager.lastConsumedInputObservation, consumed, 'observation getter must not consume gameplay input')
  manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null)
  checks.push('actual-raw-pulse-receipt-and-single-sample-consumption', 'read-only-getter-latest-valid-receipt')
  manager.onKeyDown(key('KeyA')); manager.onKeyUp(key('KeyA')); manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null)
  const typing = Object.assign(new HTMLInputElement(), { closest: () => ({}) })
  const count = receipts.length
  for (const extra of [{ defaultPrevented: true }, { isComposing: true }, { keyCode: 229 }, { target: typing }]) { manager.onKeyDown(key('Space', extra)); manager.onKeyUp(key('Space', extra)) }
  manager.onKeyDown(key('Space', { repeat: true })); manager.releaseAllInputs()
  assert.equal(receipts.length, count); manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null)
  checks.push('unmatched-ime-text-prevented-repeat-not-correlated')
  manager.setVirtualAction('Jump', 1); manager.onKeyDown(key('KeyA')); manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null)
  manager.releaseAllInputs(); manager.sample([action])
  const mixed = { ...action, bindings: [...action.bindings, core.createInputBinding('gamepad-button', '0')] }
  gamepads = [{ index: 0, id: 'probe', mapping: 'standard', connected: true, buttons: [{ value: 0, pressed: false }], axes: [0, 0] }]
  manager.sample([mixed]); manager.onKeyDown(key('KeyA')); gamepads[0].buttons[0] = { value: 1, pressed: true }; manager.sample([mixed]); assert.equal(manager.lastConsumedInputObservation, null)
  gamepads = []; manager.releaseAllInputs(); manager.sample([action])
  checks.push('virtual-and-polled-gamepad-not-borrowing-unrelated-raw-receipt')
  clock = 20; manager.onKeyDown(key()); manager.sample([action]); assert(manager.lastConsumedInputObservation)
  manager.onBlur(); assert.equal(manager.lastConsumedInputObservation, null); manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null)
  manager.onKeyDown(key()); for (let n = 0; n <= core.INPUT_EDGE_CAPACITY; n++) { manager.onKeyDown(key('KeyA')); manager.onKeyUp(key('KeyA')) }
  manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null); assert(resets.some(reset => reset.reason === 'overflow'))
  const recording = { version: 1, duration: 1, frames: [{ time: 0, snapshot: pulse }] }
  assert.equal(manager.playRecording(recording), true); const replayCount = receipts.length; manager.onKeyDown(key()); manager.sample([action]); assert.equal(manager.lastConsumedInputObservation, null); assert.equal(receipts.length, replayCount); manager.stopReplay()
  checks.push('blur-and-overflow-invalidate-pending-receipts', 'recorded-input-has-no-live-receipt')
  const mouse = core.createInputAction('Click', 'button', [core.createInputBinding('mouse-button', '0')])
  manager.releaseAllInputs(); manager.sample([mouse]); clock = 30
  manager.onMouseDown({ button: 0, clientX: 0, clientY: 0, target: null }); clock = 31; manager.onMouseUp({ button: 0, clientX: 0, clientY: 0, target: null }); manager.sample([mouse])
  assert.equal(manager.lastConsumedInputObservation.latestReceipt.device, 'mouse-button')
  const mouseCount = receipts.length; manager.onMouseDown({ button: 0, clientX: 0, clientY: 0, target: typing }); manager.onMouseUp({ button: 0, clientX: 0, clientY: 0, target: typing }); manager.sample([mouse]); assert.equal(receipts.length, mouseCount); assert.equal(manager.lastConsumedInputObservation, null)
  checks.push('actual-mouse-edge-observed-native-control-not-correlated')
  dispose(); dispose(); assert.equal(manager.observationEpoch, null)
  let replacementReceipts = 0
  const staleDispose = manager.setObservationCallbacks({ receipt() {} })
  const currentDispose = manager.setObservationCallbacks({ receipt() { replacementReceipts++ } })
  staleDispose(); staleDispose(); manager.onKeyDown(key()); assert.equal(replacementReceipts, 1); currentDispose(); currentDispose(); assert.equal(manager.observationEpoch, null)
  const disabled = new core.InputManager(); disabled.onKeyDown(key()); disabled.sample([action]); assert.equal(disabled.lastConsumedInputObservation, null); assert.equal(disabled.observationEpoch, null)
  checks.push('identity-safe-idempotent-observer-disposal', 'default-input-path-does-not-track-receipts')
  const invalid = new core.InputManager(); let invalidClock = Number.NaN
  invalid.setObservationCallbacks({ nowMs: () => invalidClock, receipt() {} }); invalid.onKeyDown(key()); invalid.sample([action]); assert.equal(invalid.lastConsumedInputObservation, null)
  invalidClock = 100; invalid.onKeyUp(key()); invalid.sample([action]); assert(invalid.lastConsumedInputObservation)
  invalidClock = 99; invalid.onKeyDown(key()); invalid.sample([action]); assert.equal(invalid.lastConsumedInputObservation, null); assert.equal(invalid.observationDiagnostics.invalidClock, 2)
  const missingClock = new core.InputManager(); let missingTime = null
  missingClock.setObservationCallbacks({ nowMs: () => missingTime, receipt() { assert.fail('invalid injected time must never fall back to an invented receipt') } }); missingClock.onKeyDown(key()); missingClock.sample([action]); assert.equal(missingClock.lastConsumedInputObservation, null)
  missingTime = undefined; missingClock.onKeyUp(key()); missingClock.sample([action]); assert.equal(missingClock.lastConsumedInputObservation, null); assert.equal(missingClock.observationDiagnostics.invalidClock, 2)
  const throws = new core.InputManager(); throws.setObservationCallbacks({ receipt() { throw Error('observer only') }, reset() { throw Error('observer only') } }); throws.onKeyDown(key()); assert.equal(throws.sample([action]).pressed.Jump, true); assert(throws.observationDiagnostics.callbackErrors > 0)
  assert.equal(throws.observationEpoch, null); assert.match(throws.observationDiagnostics.lastFailure, /observer only/)
  checks.push('nonfinite-or-backward-clock-unavailable', 'observer-errors-do-not-change-input-behavior')

  await core.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  core.scriptProjectSettings.debuggerEnabled = false; core.scriptProjectSettings.testing.coverageEnabled = false
  runtime = new core.GameplayRuntime(); runtime.scriptRuntime = new core.WasmScriptRuntime(); runtime.playSessionIdentity = 10; runtime.scriptRuntime.clear_instances(10); runtime.active = true
  const entity = new core.BoxEntity(1, { x: 0, y: 0 }, { x: 1, y: 1 }); entity.name = 'Actual fixed consumer'; entity.isStatic = true; core.beginEntityLifetime(entity)
  const script = entity.addComponent(new core.Script2D()), source = '@export let steps = 0;\n@export let presses = 0;\nfn fixed_update(dt) { steps += 1; if input_pressed("Jump") { presses += 1; } }'
  script.scriptAsset = 'observation-script'; core.assetState.records.push({ uuid: script.scriptAsset, name: 'observation-script', path: 'observation.rhai', assetType: 'script', source, script: { apiVersion: 2 } }); core.assetState.generation++; runtime.compiledSources.set(script.scriptAsset, source); runtime.scriptRuntime.compile_cached(script.scriptAsset, source)
  core.physicsState.world.entities.splice(0, core.physicsState.world.entities.length, entity); core.physicsState.inputMap.splice(0, core.physicsState.inputMap.length, action)
  nativeWorld = new core.WasmRuntimeWorld(); core.physicsState.world.runtime = nativeWorld; core.physicsState.world.wasmLoaded = true; core.physicsState.playMode = 'playing'
  const gameReceipts = [], gameConsumptions = []
  clock = 1000
  const gameDispose = runtime.setInputObservationCallbacks({ nowMs: () => clock, receipt: value => gameReceipts.push(value), consumed: value => gameConsumptions.push(value) })
  runtime.input.onKeyDown(key()); clock = 1002; runtime.input.onKeyUp(key()); runtime.frame(.07)
  const frame = runtime.lastFrameConsumedInput
  assert.equal(script.lastError, null); assert(script.properties.steps >= 2); assert.equal(script.properties.presses, 1)
  assert.equal(frame.worldEpoch, 10); assert.equal(frame.latestReceipt.sequence, gameReceipts[1].sequence); assert.deepEqual(frame.phases, ['frame', 'fixed']); assert.equal(frame.fixedConsumptionCount, 1); assert.equal(gameConsumptions.length, 1)
  assert.equal(runtime.lastFrameConsumedInput, frame); runtime.frame(.02); assert.equal(runtime.lastFrameConsumedInput, null); assert.equal(script.properties.presses, 1)
  checks.push('actual-gameplay-and-rust-catch-up-correlate-first-fixed-only', 'frame-getter-does-not-repeat-old-consumption')
  clock = 1010; runtime.input.onKeyDown(key()); runtime.input.onKeyUp(key()); runtime.frame(.00001)
  assert.deepEqual(runtime.lastFrameConsumedInput.phases, ['frame']); assert.equal(runtime.lastFrameConsumedInput.fixedConsumptionCount, 0)
  runtime.frame(.04); assert.equal(runtime.lastFrameConsumedInput, null)
  checks.push('frame-without-fixed-step-observed-old-latched-edge-not-reported-next-frame')
  clock = 1020; runtime.input.onKeyDown(key()); runtime.frame(.02); assert(runtime.lastFrameConsumedInput); runtime.input.onBlur(); assert.equal(runtime.lastFrameConsumedInput, null)
  core.physicsState.playMode = 'paused'; runtime.frame(.02); assert.equal(runtime.lastFrameConsumedInput, null); runtime.input.onKeyDown(key()); core.physicsState.playMode = 'playing'; runtime.frame(.02); assert.equal(runtime.lastFrameConsumedInput, null); assert.equal(runtime.inputSnapshot.down.Jump, false)
  checks.push('gameplay-blur-pause-resume-cannot-reuse-receipts')
  runtime.input.playRecording(recording); runtime.input.onKeyDown(key()); runtime.frame(.02); assert.equal(runtime.lastFrameConsumedInput, null); runtime.input.stopReplay(); runtime.input.releaseAllInputs()
  core.replayState.mode = 'playback'; core.replayState.frames.splice(0, core.replayState.frames.length, { tick: 0, input: pulse, physicsChecksum: '' }); core.replayState.tick = 0
  runtime.input.onKeyDown(key()); runtime.frame(.02); assert.equal(runtime.lastFrameConsumedInput, null); core.stopReplay(); runtime.input.releaseAllInputs()
  checks.push('input-recording-and-runtime-replay-remain-unavailable')
  clock = 1030; runtime.input.onKeyDown(key()); runtime.frame(.02); assert(runtime.lastFrameConsumedInput)
  const hiddenTime = nativeWorld.time_json(), hiddenChecksum = core.physicsState.world.stateChecksum(), hiddenElapsed = runtime.time.value.elapsed, hiddenSteps = script.properties.steps, hiddenPresses = script.properties.presses
  const hiddenTransform = JSON.stringify(entity.transform), captureCountBeforeHide = gameReceipts.length
  runtime.setHostSuspended(true); assert.equal(runtime.lastFrameConsumedInput, null); assert.equal(runtime.fixedEdges.length, 0); assert.equal(core.audioRuntime.diagnostics.clock.playing, false)
  runtime.input.onKeyDown(key()); runtime.frame(.25); runtime.setHostSuspended(true)
  assert.equal(nativeWorld.time_json(), hiddenTime); assert.equal(core.physicsState.world.stateChecksum(), hiddenChecksum); assert.equal(runtime.time.value.elapsed, hiddenElapsed); assert.equal(script.properties.steps, hiddenSteps); assert.equal(JSON.stringify(entity.transform), hiddenTransform); assert.equal(gameReceipts.length, captureCountBeforeHide)
  runtime.setHostSuspended(false); runtime.frame(.00001); assert.equal(runtime.inputSnapshot.down.Jump, false); assert.equal(runtime.inputSnapshot.pressed.Jump, false); assert.equal(script.properties.presses, hiddenPresses); assert.equal(runtime.lastFrameConsumedInput, null)
  assert.equal(core.audioRuntime.diagnostics.clock.playing, true)
  const inactive = new core.GameplayRuntime(), audioClockBeforeInactive = JSON.stringify(core.audioRuntime.diagnostics.clock)
  inactive.setHostSuspended(true); assert.equal(inactive.isActive, false); assert.equal(JSON.stringify(core.audioRuntime.diagnostics.clock), audioClockBeforeInactive); assert.equal(core.physicsState.world.runtime, nativeWorld)
  checks.push('actual-host-hide-does-not-advance-rust-world-or-script-time', 'host-resume-discards-hidden-held-edges-and-restores-existing-audio', 'inactive-host-hide-does-not-initialize-world-or-audio')
  gameDispose()
  runtime.setInputObservationCallbacks({ receipt() { throw Error('failed receipt observer') } })
  runtime.input.onKeyDown(key()); assert.equal(runtime.input.observationEpoch, null); const stepsBeforeObserverFault = script.properties.steps; runtime.frame(.02); assert(script.properties.steps > stepsBeforeObserverFault); assert.equal(runtime.lastFrameConsumedInput, null)
  runtime.input.releaseAllInputs(); runtime.frame(.02)
  runtime.setInputObservationCallbacks({ receipt() {}, consumed() { throw Error('failed consumed observer') } })
  runtime.input.onKeyDown(key()); runtime.input.onKeyUp(key()); runtime.frame(.02); assert.equal(runtime.lastFrameConsumedInput, null); assert.equal(runtime.input.observationEpoch, null); assert(runtime.inputObservationDiagnostics.callbackErrors >= 2); assert.match(runtime.inputObservationDiagnostics.lastFailure, /failed consumed observer/)
  checks.push('gameplay-faulty-observers-unregistered-without-swallowing-gameplay-work')
  runtime.setInputObservationCallbacks({ nowMs: () => clock, receipt() {} })
  clock = 1040; runtime.input.onKeyDown(key()); runtime.input.onKeyUp(key()); runtime.frame(.02); assert(runtime.lastFrameConsumedInput); runtime.playSessionIdentity++; assert.equal(runtime.lastFrameConsumedInput, null)
  let newOwnerCaptures = 0
  const oldOwnerDispose = runtime.setInputObservationCallbacks({ receipt() {} })
  const newOwnerDispose = runtime.setInputObservationCallbacks({ receipt() { newOwnerCaptures++ } })
  oldOwnerDispose(); runtime.input.onKeyDown(key()); assert.equal(newOwnerCaptures, 1); newOwnerDispose(); newOwnerDispose(); assert.equal(runtime.lastFrameConsumedInput, null)
  checks.push('world-epoch-stale-getter-rejected', 'gameplay-owner-disposal-cannot-clear-new-registration')
  runtime.stopSession(false); runtime = null
  passed = true; console.log('Actual input observation checks passed:', checks.join(', '))
} finally {
  runtime?.stopSession(false); nativeWorld?.free()
  const reports = join(root, '.cache/engine-runtime'); await mkdir(reports, { recursive: true })
  await writeFile(join(reports, before ? 'input-observation-before.json' : 'input-observation-after.json'), JSON.stringify({ scope: 'Actual InputManager + GameplayRuntime + ordinary optimized WASM fixed-step bridge, Node observation integration; not input-to-pixel or browser/Worker/Player certification', checks, status: passed ? 'passed' : 'failed' }, null, 2))
  await rm(compiled, { recursive: true, force: true })
}
