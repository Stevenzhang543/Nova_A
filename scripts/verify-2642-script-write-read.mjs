/** 26.42 S-4: what a Rhai callback reads back after it writes, measured in the shipped WASM script runtime.
 *
 * Engine writes (`set_position`, `set_velocity`, `entity_set_position`) are queued as commands and applied by
 * the host after the callback returns. Reads in the same callback (`transform()`, `rigid_body()`) see the
 * snapshot taken before the callback started. Script variables, including `@export` properties, change
 * immediately. The quick start (docs/QUICKSTART_26_42.*.md, "Writes apply after the callback") documents
 * exactly what this script asserts.
 *
 * Usage: node scripts/verify-2642-script-write-read.mjs (needs nova_core/pkg). */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = process.cwd()
const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
await wasm.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
const runtime = new wasm.WasmScriptRuntime()
const results = []
const check = (name, run) => { try { run(); results.push({ name, ok: true }); console.log('PASS', name) } catch (error) { results.push({ name, ok: false, error: String(error?.message ?? error) }); console.log('FAIL', name, '\n   ', String(error?.message ?? error)) } }

const input = { down: {}, pressed: {}, released: {}, performed: {}, cancelled: {}, phases: {}, durations: {}, axes: {}, vectors: {}, mousePosition: [0, 0], mouseWorldPosition: [0, 0], viewBounds: [-10, 10, -6, 6], viewportSize: [1280, 720], wheel: [0, 0], contexts: ['Gameplay'], maps: ['Default'], scheme: 'keyboard-mouse' }
const self = { uuid: 'self-0000', name: 'Probe' }, other = { uuid: 'other-0000', name: 'Other' }
const context = properties => ({
  apiVersion: 2, entity: self.uuid, entityName: self.name, components: ['Transform2D', 'RigidBody2D', 'Script2D'],
  entities: { Probe: self.uuid, Other: other.uuid },
  sceneEntities: [{ uuid: self.uuid, name: self.name, enabled: true, tags: [], groups: [], components: ['Transform2D', 'RigidBody2D', 'Script2D'], position: [1, 2] }, { uuid: other.uuid, name: other.name, enabled: true, tags: [], groups: [], components: ['Transform2D'], position: [5, 5] }],
  time: { delta: 1 / 120, fixedDelta: 1 / 120, elapsed: 0, scale: 1, frame: 1 }, randomSeed: 1, input, contact: null, event: null, properties, save: {},
  transform: { position: [1, 2], rotation: 0, scale: [1, 1] },
  rigidBody: { velocity: [0, 0], angularVelocity: 0, mass: 1, bodyType: 'Dynamic', sleeping: false, grounded: false },
  character: null, gameFlow: { paused: false, score: 0, session: {}, checkpoints: [] },
  networking: { enabled: false, connected: false, authority: true, peerCount: 0, localPeerId: '', role: 'offline', tick: 0 }
})
const source = `@export(type="float") let seen_x = 0.0;
@export(type="float") let seen_vx = 0.0;
@export(type="float") let counter = 0.0;
@export(type="float") let counter_after = 0.0;
@export(type="float") let other_x = 0.0;
fn fixed_update(dt) {
  set_position(9.0, 9.0);
  seen_x = transform().position_x;
  set_velocity(4.0, 0.0);
  let body = rigid_body();
  seen_vx = if body == () { -1.0 } else { body.velocity_x };
  counter += 1.0;
  counter_after = counter;
  entity_set_position(find_entity_handle("Other"), 7.0, 7.0);
  other_x = entity_position_x_on(find_entity_handle("Other"));
}`
let compiled = null, validation = null
check('the probe script compiles', () => {
  validation = JSON.parse(runtime.validate(source))
  assert.ok(!(validation.diagnostics ?? []).some(item => item.severity === 'error'), JSON.stringify(validation).slice(0, 600))
  runtime.compile_cached('s4-probe', source); compiled = true
})
let result = null
if (compiled) check('a callback that writes then reads sees the pre-callback snapshot for engine state', () => {
  result = JSON.parse(runtime.execute_cached_json('s4-probe', 'fixed_update', JSON.stringify(context({ seen_x: 0, seen_vx: 0, counter: 0, counter_after: 0, other_x: 0 }))))
  assert.equal(result.properties.seen_x, 1, `transform() after set_position read ${result.properties.seen_x}`)
  assert.ok(result.properties.seen_vx === 0 || result.properties.seen_vx === -1, `rigid_body() after set_velocity read ${result.properties.seen_vx}`)
})
if (result) check('script variables change immediately inside the callback', () => {
  assert.equal(result.properties.counter, 1)
  assert.equal(result.properties.counter_after, 1)
})
if (result) check('the writes leave the callback as ordered host commands', () => {
  const types = result.commands.map(command => command.type)
  const position = types.indexOf('setPosition'), velocity = types.indexOf('setVelocity')
  assert.ok(position >= 0 && velocity > position, `command order: ${types.join(', ')}`)
  const moved = result.commands.find(command => command.type === 'setPosition')
  assert.deepEqual([moved.x, moved.y], [9, 9])
})
if (result) check('another entity read after entity_set_position also returns its snapshot', () => {
  assert.equal(result.properties.other_x, 5, `entity position after entity_set_position read ${result.properties.other_x}`)
})
await mkdir(join(root, '.cache', 'verify'), { recursive: true })
await writeFile(join(root, '.cache', 'verify', 'script-write-read-2642.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results, observed: result && { properties: result.properties, commands: result.commands.map(command => command.type) } }, null, 2))
const failed = results.filter(item => !item.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
runtime.free()
process.exit(failed.length ? 1 : 0)
