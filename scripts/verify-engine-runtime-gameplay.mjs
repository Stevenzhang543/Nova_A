import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), compiled = await mkdtemp(join(tmpdir(), 'nova-engine-gameplay-'))
const checks = [], normalize = path => path.replaceAll('\\', '/')
let passed = false
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32', userAgent: 'Nova Node integration test' } })
try {
  const entry = join(compiled, 'entry.ts')
  await writeFile(entry, `export { GameplayRuntime } from '${normalize(join(root, 'src/runtime/GameplayRuntime.ts'))}';\nexport { physicsState } from '${normalize(join(root, 'src/store/physics.ts'))}';\nexport { assetState } from '${normalize(join(root, 'src/assets/AssetDatabase.ts'))}';\nexport { BoxEntity } from '${normalize(join(root, 'src/world/BoxEntity.ts'))}';\nexport { Script2D } from '${normalize(join(root, 'src/world/components.ts'))}';\nexport { beginEntityLifetime, retireEntityLifetime } from '${normalize(join(root, 'src/runtime/entityLifetimes.ts'))}';\nexport { scriptProjectSettings } from '${normalize(join(root, 'src/runtime/scriptSettings.ts'))}';\nexport { createInputAction, createInputBinding } from '${normalize(join(root, 'src/runtime/input.ts'))}';\nexport { default as initWasm, WasmScriptRuntime, WasmRuntimeWorld } from '${normalize(join(root, 'nova_core/pkg/nova_core.js'))}';\n`)
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'gameplay.mjs', inlineDynamicImports: true } } } })
  const core = await import(pathToFileURL(join(compiled, 'gameplay.mjs')).href)
  await core.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  core.scriptProjectSettings.debuggerEnabled = false
  core.scriptProjectSettings.testing.coverageEnabled = false
  const runtime = new core.GameplayRuntime(), vm = new core.WasmScriptRuntime()
  runtime.scriptRuntime = vm; runtime.playSessionIdentity = 1; vm.clear_instances(1)
  const make = (n, name, source) => {
    const entity = new core.BoxEntity(n, { x: 0, y: 0 }, { x: 1, y: 1 }); entity.name = name; core.beginEntityLifetime(entity)
    if (source) { const id = `script-${n}`, component = entity.addComponent(new core.Script2D()); component.scriptAsset = id; core.assetState.records.push({ uuid: id, name: id, path: `${id}.rhai`, assetType: 'script', source, script: { apiVersion: 2 } }); core.assetState.generation++; runtime.compiledSources.set(id, source); vm.compile_cached(id, source) }
    return entity
  }
  const parent = make(1, 'Parent', 'fn update(dt) { set_position(10.0, 20.0); set_rotation(1.5707963267948966); set_scale(2.0, 3.0); }')
  const child = make(2, 'Child'); child.parentUuid = parent.uuid; child.transform.position = { x: 2, y: 0 }
  const reader = make(3, 'Reader', '@export let seen_x = 0.0;\n@export let seen_y = 0.0;\nfn update(dt) { let e = find_entity_handle("Child"); seen_x = entity_position_x_on(e); seen_y = entity_position_y_on(e); }')
  core.physicsState.world.entities.splice(0, core.physicsState.world.entities.length, parent, child, reader)
  runtime.runPhase('update')
  assert.equal(parent.script2D.lastError, null); assert.equal(reader.script2D.lastError, null)
  assert(Math.abs(reader.script2D.properties.seen_x - 10) < 1e-8); assert(Math.abs(reader.script2D.properties.seen_y - 24) < 1e-8)
  assert.equal(runtime.scriptContextDiagnostics.publications, 1); assert.equal(runtime.scriptContextDiagnostics.entityRecords, 3); assert(runtime.scriptContextDiagnostics.deltaRecords >= 3)
  checks.push('production-phase-shares-one-world', 'prior-parent-position-rotation-scale-visible-in-child-query')
  // Deferred target mutations remain invisible until the existing structural command boundary.
  runtime.applyCommand(parent, { type: 'targetSetPosition', target: child.uuid, generation: runtime.scriptWorldSnapshots.get(child.uuid).generation, x: 7, y: 8 })
  runtime.runEntityFunction(reader, 'update'); assert(Math.abs(reader.script2D.properties.seen_y - 24) < 1e-8)
  runtime.flushEntityCommands(); runtime.runEntityFunction(reader, 'update')
  assert.equal(reader.script2D.properties.seen_x, 7); assert.equal(reader.script2D.properties.seen_y, 8)
  checks.push('deferred-target-write-keeps-existing-boundary')
  runtime.queueEntityRemoval(child, false); runtime.flushEntityCommands()
  assert(!core.physicsState.world.entities.some(entity => entity.uuid === child.uuid))
  runtime.runEntityFunction(reader, 'update'); assert.equal(reader.script2D.properties.seen_x, 0)
  const newChild = make(4, 'Child'); newChild.uuid = child.uuid; newChild.transform.position = { x: 42, y: 0 }; core.physicsState.world.entities.push(newChild); runtime.invalidateScriptWorld()
  runtime.runEntityFunction(reader, 'update'); assert.equal(reader.script2D.properties.seen_x, 42)
  checks.push('retired-entity-query-is-invalid', 'reused-uuid-new-generation-resolves')
  const button = make(5, 'Button', '@export let calls = 0;\n@export let edges = "";\nfn tapped() { calls += 1; }\nfn down(dt) { edges += "d"; }\nfn up(dt) { edges += "u"; }')
  const sheet = { format: 'nova-event-sheet', version: 1, uuid: 'sheet', name: 'Inputs', enabled: true, ownerComponent: 'Script2D', logicAsset: 'script-5', baseSheetAsset: null, deterministicSeed: 1, handlers: ['input-pressed', 'input-released'].map((kind, index) => ({ uuid: `h${index}`, kind, name: kind, selector: 'Jump', callback: index ? 'up' : 'down', enabled: true, priority: 0, overrideInherited: true })) }
  core.assetState.records.push({ uuid: 'sheet', name: 'sheet', path: 'sheet.events', assetType: 'eventSheet', source: JSON.stringify(sheet) }); core.assetState.generation++; button.script2D.eventSheetAsset = 'asset://sheet'; core.physicsState.world.entities.push(button)
  const action = { ...core.createInputAction('Jump', 'button', [core.createInputBinding('physical-key', 'Space')]), callback: 'tapped' }
  core.physicsState.inputMap.splice(0, core.physicsState.inputMap.length, action)
  const snapshot = runtime.input.sample(core.physicsState.inputMap)
  Object.assign(snapshot, { pressed: { Jump: true }, released: { Jump: true }, performed: { Jump: true }, edges: [true, false, true, false].map((down, index) => ({ action: 'Jump', down, sequence: index + 1, timeMs: index })) })
  runtime.inputSnapshot = snapshot; runtime.dispatchInputCallbacks(snapshot)
  assert.equal(button.script2D.lastError, null); assert.equal(button.script2D.properties.calls, 2); assert.equal(button.script2D.properties.edges, 'dudu')
  runtime.dispatchInputCallbacks(runtime.input.sample(core.physicsState.inputMap))
  assert.equal(button.script2D.properties.calls, 2); assert.equal(button.script2D.properties.edges, 'dudu')
  runtime.latchFixedInput(snapshot); assert.equal(runtime.fixedEdges.length, 4)
  checks.push('multiple-press-callbacks-retain-occurrences', 'event-sheet-receives-ordered-edges-once', 'fixed-step-queue-retains-ordered-edges')
  const fixed = make(6, 'Fixed', '@export let steps = 0;\n@export let presses = 0;\nfn fixed_update(dt) { steps += 1; if input_pressed("Jump") { presses += 1; } }')
  core.physicsState.world.entities.push(fixed)
  core.physicsState.world.runtime = new core.WasmRuntimeWorld(); core.physicsState.world.wasmLoaded = true
  for (const entity of core.physicsState.world.entities) entity.isStatic = true
  runtime.fixedPressed = {}; runtime.fixedReleased = {}; runtime.fixedEdges = []; runtime.active = true
  core.physicsState.playMode = 'playing'
  const key = { target: null, code: 'Space', key: ' ', repeat: false, ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }
  runtime.input.onKeyDown(key); runtime.input.onKeyUp(key); runtime.frame(.07)
  assert.equal(fixed.script2D.lastError, null); assert(fixed.script2D.properties.steps >= 2); assert.equal(fixed.script2D.properties.presses, 1)
  runtime.frame(.02); assert.equal(fixed.script2D.properties.presses, 1); assert.equal(runtime.fixedEdges.length, 0)
  checks.push('actual-rust-catch-up-consumes-press-once')
  runtime.input.onKeyDown(key); runtime.frame(.02); assert.equal(runtime.inputSnapshot.down.Jump, true)
  core.physicsState.playMode = 'paused'; runtime.frame(.02); core.physicsState.playMode = 'playing'; runtime.frame(.02)
  assert.equal(runtime.inputSnapshot.down.Jump, false); assert.equal(runtime.inputSnapshot.pressed.Jump, false)
  checks.push('pause-resume-releases-held-input')
  core.physicsState.world.runtime.free(); core.physicsState.world.runtime = null; core.physicsState.world.wasmLoaded = false
  vm.free(); passed = true
  console.log('Actual GameplayRuntime + optimized WASM checks passed:', checks.join(', '))
} finally {
  const reports = join(root, '.cache/engine-runtime'); await mkdir(reports, { recursive: true })
  await writeFile(join(reports, 'gameplay-verification.json'), JSON.stringify({ scope: 'Actual production GameplayRuntime bridge + optimized WASM; Node host unit integration, not browser/Worker/Player certification', checks, status: passed ? 'passed' : 'failed' }, null, 2))
  await rm(compiled, { recursive: true, force: true })
}
