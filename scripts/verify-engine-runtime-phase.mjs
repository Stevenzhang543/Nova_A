import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { performance } from 'node:perf_hooks'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const baseline = process.argv.includes('--baseline')
const core = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
await core.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
const vm = new core.WasmScriptRuntime(), entityCount = 500, callbacks = 50
const world = { protocolVersion: 1, entityGenerations: {}, entities: {}, sceneEntities: [] }
for (let n = 0; n < entityCount; n++) {
  const id = `entity-${n}`
  world.entities[`Name ${n}`] = id; world.entityGenerations[id] = n + 1
  world.sceneEntities.push({ uuid: id, generation: n + 1, name: `Name ${n}`, enabled: true, tags: ['target'], groups: [], components: ['Transform2D'], position: [n, 0] })
}
const context = () => ({ entity: 'entity-0', entityName: 'Name 0', properties: {}, time: { delta: .01, fixedDelta: 1 / 60, elapsed: .01, scale: 1, frame: 1 } })
const counters = { worldPublications: 0, worldEntityRecords: 0, transferredBytes: 0, worldDeltaRecords: 0 }
const timing = { prepareMs: 0, serializeMs: 0, publishMs: 0, executeMs: 0, decodeMs: 0, wallMs: 0 }
const checks = []
let passed = false
const encode = value => { const t = performance.now(), json = JSON.stringify(value); timing.serializeMs += performance.now() - t; counters.transferredBytes += Buffer.byteLength(json); return json }
try {
  vm.compile_cached('phase', 'fn update(dt) { let e = find_entity_handle("Name 499"); print(entity_position_x_on(e)); }')
  vm.clear_instances(1)
  const wall = performance.now()
  if (!baseline) {
    const json = encode(world), t = performance.now(); vm.publish_world_context_json(1, 1, json); timing.publishMs += performance.now() - t
    counters.worldPublications++; counters.worldEntityRecords += entityCount
  }
  for (let n = 0; n < callbacks; n++) {
    const t = performance.now(), small = context()
    const payload = baseline ? { ...small, entityGenerations: { ...world.entityGenerations }, entities: { ...world.entities }, sceneEntities: world.sceneEntities.map(e => ({ ...e, tags: [...e.tags], groups: [...e.groups], components: [...e.components], position: [...e.position] })) } : small
    timing.prepareMs += performance.now() - t
    if (baseline) { counters.worldPublications++; counters.worldEntityRecords += entityCount }
    const json = encode(payload), start = performance.now()
    const raw = baseline ? vm.execute_instance_json('phase', 'update', 1, 1, json) : vm.execute_instance_context_json('phase', 'update', 1, 1, 1, json)
    timing.executeMs += performance.now() - start
    const decode = performance.now(), result = JSON.parse(raw); timing.decodeMs += performance.now() - decode
    assert.equal(Number(result.logs[0].message), 499)
  }
  timing.wallMs = performance.now() - wall
  checks.push('same-content-world-query')
  if (!baseline) {
    vm.apply_world_delta_json(1, 1, 2, JSON.stringify([{ ...world.sceneEntities[499], position: [1234, 0] }]))
    assert.equal(Number(JSON.parse(vm.execute_instance_context_json('phase', 'update', 1, 2, 1, JSON.stringify(context()))).logs[0].message), 1234)
    assert.throws(() => vm.execute_instance_context_json('phase', 'update', 1, 1, 1, JSON.stringify(context())), /revision|stale/i)
    assert.throws(() => vm.apply_world_delta_json(1, 1, 3, '[]'), /revision|stale/i)
    assert.throws(() => vm.publish_world_context_json(1, 2, JSON.stringify(world)), /revision|stale/i)
    assert.throws(() => vm.execute_instance_context_json('phase', 'update', 2, 2, 1, JSON.stringify(context())), /epoch|stale/i)
    checks.push('previous-owner-write-visible', 'stale-callback-revision', 'stale-delta-revision', 'stale-publication-revision', 'stale-world-epoch')
    assert.throws(() => vm.publish_world_context_json(1, 3, '{'), /EOF|parse|expected/i)
    assert.throws(() => vm.publish_world_context_json(1, 3, JSON.stringify({ ...world, protocolVersion: 99 })), /version/i)
    assert.throws(() => vm.publish_world_context_json(1, 3, JSON.stringify({ ...world, extra: true })), /unknown field/i)
    assert.throws(() => vm.apply_world_delta_json(1, 2, 3, JSON.stringify([{ ...world.sceneEntities[499], position: [null, 0] }])), /float|type|invalid/i)
    assert.throws(() => vm.execute_instance_context_json('phase', 'update', 1, 2, 1, JSON.stringify({ ...context(), ...world })), /small|published/i)
    checks.push('truncated-world-json-rejected', 'unsupported-world-version', 'unknown-world-field', 'invalid-delta-position', 'large-callback-world-rejected')
    assert.equal(counters.worldPublications, 1); assert.equal(counters.worldEntityRecords, entityCount)
  }
  passed = true
  console.log(JSON.stringify({ mode: baseline ? 'before' : 'after', entityCount, callbacks, counters, timing, checks }, null, 2))
} finally {
  vm.free()
  const reports = join(root, '.cache/engine-runtime'); await mkdir(reports, { recursive: true })
  await writeFile(join(reports, baseline ? 'phase-before.json' : 'phase-after.json'), JSON.stringify({ scope: 'Controlled optimized WASM fixture; 500 entities / 50 callbacks. Smoke comparison, not B4 or a platform performance gate.', mode: baseline ? 'before' : 'after', entityCount, callbacks, counters, timing, checks, status: passed ? 'passed' : 'failed' }, null, 2))
}
