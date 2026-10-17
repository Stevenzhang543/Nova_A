/** Actual optimized ordinary WASM and production World timing bridge. No generated glue edits. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const reportDir = resolve(process.argv.find(value => value.startsWith('--report-dir='))?.slice(13) ?? join(root, 'release-audits/engine-runtime-timing'))
const sources = ['crates/nova_runtime/src/lib.rs', 'crates/nova_wasm/src/lib.rs', 'src/world/World.ts', 'src/runtime/engineTiming.ts', 'src/runtime/physicsProduction.ts', 'scripts/verify-engine-runtime-timing.mjs', 'nova_core/pkg/nova_core.js', 'nova_core/pkg/nova_core.d.ts', 'nova_core/pkg/nova_core_bg.wasm', 'nova_core/pkg/nova_core_bg.wasm.d.ts']
const digest = async () => Object.fromEntries(await Promise.all(sources.map(async path => [path, createHash('sha256').update(await readFile(join(root, path))).digest('hex')])) )
const before = await digest(), checks = [], observations = [], owned = []
let compiled, failure
const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: String(error.stack ?? error) }); failure = error } }
try {
  const glue = await readFile(join(root, 'nova_core/pkg/nova_core.js'), 'utf8')
  const core = await import('data:text/javascript;base64,' + Buffer.from(glue).toString('base64'))
  await core.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const create = (limit = 4) => { const world = new core.WasmRuntimeWorld(); owned.push(world); world.set_timing(60, limit, 1, false, 0); return world }
  const body = () => { const data = new Float64Array(56); data[0] = 1; data[4] = 10; data[8] = 1; data[12] = 1; data[13] = 1; data[17] = 1; data[25] = 1; data[26] = 1; return data }
  const snapshot = world => { const current = new Float64Array(world.state_len()), previous = new Float64Array(world.body_state_len()); world.copy_state(current); world.copy_previous_body_state(previous); return { current, previous, checksum: world.state_checksum(), time: JSON.parse(world.time_json()), diagnostics: JSON.parse(world.diagnostics_json()) } }
  await check('Optimized typed binding exists and actual long frames cap at250ms with default4 policy; explicit8 remains8', () => {
    assert.match(glue, /reset_frame_clock\(/)
    for (const limit of [4, 8]) { const world = create(limit), steps = world.advance(10, 0, 0), time = JSON.parse(world.time_json()); assert.equal(steps, limit); assert.equal(time.delta, .25); assert.equal(time.elapsed, .25); observations.push({ name: 'actual-wasm-long-frame', configuredLimit: limit, steps, time }) }
  })
  await check('Reset preserves authoritative current/previous owned copies, checksum, elapsed/frame, handles and pending events', () => {
    const world = create(), control = create()
    for (const target of [world, control]) { target.upsert_body(1, 0, body()); target.advance(1 / 60, 0, 0); target.advance(1 / 120, 0, 0) }
    const before = snapshot(world); assert.notEqual(before.current[2], before.previous[2]); assert.equal(before.current[0], 1)
    world.reset_frame_clock(); world.reset_frame_clock()
    const after = snapshot(world)
    assert.deepEqual(after.current, before.current); assert.deepEqual(after.previous, before.previous); assert.equal(after.checksum, before.checksum)
    for (const field of ['elapsed', 'frame', 'fixedDelta', 'scale']) assert.equal(after.time[field], before.time[field])
    assert.equal(after.time.delta, 0); assert.equal(after.diagnostics.stepsLastFrame, 0); assert.equal(after.diagnostics.interpolationAlpha, 1)
    for (const field of ['totalPhysicsSteps', 'bodyCount', 'connectionCount', 'eventCount', 'droppedSeconds', 'configurationRebuilds']) assert.equal(after.diagnostics[field], before.diagnostics[field])
    const events = JSON.parse(world.drain_events_json()); assert.deepEqual(events, JSON.parse(control.drain_events_json())); assert(events.some(value => value.type === 'entityCreated' && value.handle === 1))
    observations.push({ name: 'actual-wasm-reset-retains-world', checksum: before.checksum, currentX: before.current[2], previousX: before.previous[2], elapsed: after.time.elapsed, frame: after.time.frame, retainedEvents: events, alpha: after.diagnostics.interpolationAlpha })
  })
  await check('Reset discards partial accumulator; zero/half-step resume holds current until a real tick refreshes previous', () => {
    const world = create(); world.upsert_body(1, 0, body()); world.advance(1 / 60, 0, 0); world.advance(1 / 120, 0, 0)
    const before = snapshot(world); world.reset_frame_clock()
    assert.equal(world.advance(0, 0, 0), 0); assert.equal(world.advance(1 / 120, 0, 0), 0); assert.equal(world.interpolation_alpha(), 1)
    const held = snapshot(world); assert.deepEqual(held.current, before.current); assert.deepEqual(held.previous, before.previous); assert.equal(held.checksum, before.checksum)
    assert.equal(world.advance(1 / 120, 0, 0), 1)
    const resumed = snapshot(world); assert.deepEqual(resumed.previous, before.current); assert(resumed.current[2] > before.current[2]); assert(world.interpolation_alpha() < 1e-9)
    observations.push({ name: 'actual-wasm-resume', heldAlpha: 1, freshTickAlpha: world.interpolation_alpha(), previousAfterFreshTickX: resumed.previous[2], currentAfterFreshTickX: resumed.current[2] })
  })
  await check('Reset cancels unexecuted split-frame report without advancing or rewinding physics/time', () => {
    const world = create(); world.upsert_body(1, 0, body()); world.advance(1 / 60, 0, 0)
    const before = snapshot(world); assert.equal(world.prepare_advance(1 / 30), 2); const preparedTime = JSON.parse(world.time_json()); world.reset_frame_clock()
    const reset = snapshot(world); assert.equal(reset.time.elapsed, preparedTime.elapsed); assert.equal(reset.time.frame, preparedTime.frame)
    assert.equal(world.prepare_advance(0), 0); world.complete_advance(); const after = snapshot(world)
    assert.deepEqual(after.current, before.current); assert.deepEqual(after.previous, before.previous); assert.equal(after.checksum, before.checksum)
    assert.equal(after.time.elapsed, preparedTime.elapsed); assert.equal(after.time.frame, preparedTime.frame + 1); assert.equal(after.diagnostics.totalPhysicsSteps, before.diagnostics.totalPhysicsSteps); assert.equal(after.diagnostics.interpolationAlpha, 1)
  })
  compiled = await mkdtemp(join(tmpdir(), 'nova-runtime-timing-'))
  const path = value => value.replaceAll('\\', '/')
  const entry = join(compiled, 'entry.ts')
  // Same legacy production import order as the real state-view verifier; no new boundary claim.
  await writeFile(entry, `export { GameplayRuntime } from '${path(join(root, 'src/runtime/GameplayRuntime.ts'))}';\nexport { physicsState } from '${path(join(root, 'src/store/physics.ts'))}';\nexport * from '${path(join(root, 'src/runtime/engineTiming.ts'))}';\n`)
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'timing.mjs', inlineDynamicImports: true } } } })
  const module = await import(pathToFileURL(join(compiled, 'timing.mjs')).href), World = module.physicsState.world.constructor
  const production = () => { const world = new World(); world.runtime = create(); world.wasmLoaded = true; const entity = world.addBox({ x: 0, y: 0 }, { x: 1, y: 1 }); entity.velocity.x = 10; return world }
  await check('Pure shared frame normalization clamps to250ms and preserves explicit valid delta; invalid values become0', () => {
    assert.equal(module.DEFAULT_MAX_CATCH_UP_STEPS, 4); assert.equal(module.MAX_FRAME_DELTA_SECONDS, .25)
    for (const [input, expected] of [[10, .25], [.15, .15], [-1, 0], [NaN, 0], [Infinity, 0], [-Infinity, 0]]) assert.equal(module.normalizeSimulationFrameDelta(input), expected)
  })
  await check('Actual World update uses shared4/250ms defaults and retains explicit8 configuration', () => {
    for (const limit of [4, 8]) { const world = production(); assert.equal(world.lastSettings.maxCatchUpSteps, 4); const settings = { ...world.lastSettings, maxCatchUpSteps: limit, gravity: 0, airFriction: 0 }; world.update(10, true, settings); assert.equal(world.diagnostics.stepsLastFrame, limit); assert.equal(JSON.parse(world.runtime.time_json()).delta, .25); observations.push({ name: 'actual-World-long-frame', limit, diagnostics: { ...world.diagnostics } }) }
  })
  await check('Public World reset calls the real typed binding once and preserves entity/storage/pose/event identities', () => {
    const world = production(), settings = { ...world.lastSettings, gravity: 0, airFriction: 0 }
    world.update(1 / 60, true, settings); world.update(1 / 120, true, settings)
    const native = snapshot(world.runtime), transform = JSON.stringify(world.entities[0].transform), entities = world.entities, connections = world.connections, handles = world.bodyHandles, bodyRecords = world.bodyRecords, stateBuffer = world.stateBuffer, previousBuffer = world.previousBodyBuffer, events = world.events
    const reset = world.runtime.reset_frame_clock; let calls = 0; world.runtime.reset_frame_clock = function () { calls++; return reset.call(this) }
    world.resetSimulationClock()
    assert.equal(calls, 1); assert.equal(world.entities, entities); assert.equal(world.connections, connections); assert.equal(world.bodyHandles, handles); assert.equal(world.bodyRecords, bodyRecords); assert.equal(world.stateBuffer, stateBuffer); assert.equal(world.previousBodyBuffer, previousBuffer); assert.equal(world.events, events); assert.equal(JSON.stringify(world.entities[0].transform), transform)
    const after = snapshot(world.runtime); assert.deepEqual(after.current, native.current); assert.deepEqual(after.previous, native.previous); assert.equal(after.checksum, native.checksum); assert.equal(after.time.elapsed, native.time.elapsed); assert.equal(after.time.frame, native.time.frame)
    world.update(1 / 120, true, settings); assert.equal(world.diagnostics.stepsLastFrame, 0); assert.equal(world.diagnostics.interpolationAlpha, 1); assert.equal(world.stateChecksum(), native.checksum)
  })
  await check('Uninitialized World clock reset is a safe synchronous no-op', () => { const world = new World(), entities = world.entities, events = world.events; world.resetSimulationClock(); assert.equal(world.entities, entities); assert.equal(world.events, events) })
} catch (error) { failure = error; checks.push({ name: 'timing verifier initialization/integration', status: 'failed', error: String(error.stack ?? error) }) }
finally {
  for (const world of owned) world.free()
  if (compiled) { const target = resolve(compiled), base = resolve(tmpdir()) + '/'; assert(target.replaceAll('\\', '/').startsWith(base.replaceAll('\\', '/'))); await rm(target, { recursive: true, force: true }) }
  assert.deepEqual(await digest(), before, 'Sources or paired WASM artifacts changed during timing verification')
  await mkdir(reportDir, { recursive: true })
  const report = { format: 'nova-engine-runtime-timing', version: 1, generatedAt: new Date().toISOString(), status: failure ? 'failed' : 'passed', scope: 'Actual optimized ordinary WASM and production World methods under Node. Task-boundary caller restriction is explicit; no clock/world rebuild, pose writes or event drains inside reset. No GUI/visibility lifecycle, formal B0-B8/X11 or display qualification.', node: process.version, sourceHashes: before, checks, observations }
  await writeFile(join(reportDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' })
  for (const check of checks) console.log(check.status.toUpperCase() + ' ' + check.name + (check.error ? '\n' + check.error : ''))
  console.log('Saved ' + join(reportDir, 'report.json')); if (failure) process.exitCode = 1
}
