import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const legacy = process.argv.includes('--legacy-reproduction')
const core = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
await core.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
const vm = new core.WasmScriptRuntime(), checks = []
let passed = false
const context = (entity = 'entity-a', generation = 11, properties = {}) => ({ entity, entityName: entity, entityGenerations: { [entity]: generation }, properties, time: { delta: .01, fixedDelta: 1 / 60, elapsed: .01, scale: 1, frame: 1 } })
const call = (entity, generation, properties) => JSON.parse(legacy
  ? vm.execute_cached_json('counter', 'update', JSON.stringify(context(entity, generation, properties)))
  : vm.execute_instance_json('counter', 'update', 1, generation, JSON.stringify(context(entity, generation, properties))))
try {
  vm.compile_cached('counter', '@export let exported = 0;\nlet private_count = 0;\nscore_add(1.0);\nfn update(dt) { private_count += 1; exported += 1; print(private_count); }')
  const first = call('entity-a', 11, {})
  const second = call('entity-a', 11, first.properties)
  assert.equal(first.commands.length, 1)
  assert.equal(second.commands.length, 0, 'live-instance module initialization must execute once across callbacks')
  assert.equal(second.logs[0].message, '2', 'non-exported instance state must survive callbacks')
  assert.equal(second.properties.exported, 2)
  checks.push('instance-initialization-once', 'private-state-persists', 'export-state-roundtrip')
  const another = call('entity-b', 12, {})
  assert.equal(another.commands.length, 1); assert.equal(another.logs[0].message, '1')
  checks.push('same-program-instance-isolation')
  vm.remove_entity_instances(1, 'entity-a')
  const reused = call('entity-a', 13, {})
  assert.equal(reused.commands.length, 1); assert.equal(reused.logs[0].message, '1')
  assert.throws(() => call('entity-a', 11, {}), /generation|stale/i)
  checks.push('retired-instance-reuse', 'stale-generation-rejected')
  vm.clear_instances(2)
  assert.throws(() => call('entity-a', 13, {}), /epoch|stale/i)
  checks.push('stale-world-epoch-rejected')
  passed = true
  console.log('Nova live script WASM checks passed:', checks.join(', '))
} finally {
  vm.free()
  const reports = join(root, '.cache/engine-runtime')
  await mkdir(reports, { recursive: true })
  await writeFile(join(reports, legacy ? 'script-before.json' : 'script-verification.json'), JSON.stringify({ scope: 'Actual optimized WASM Rhai VM bindings; no platform/Player certification', checks, status: passed ? 'passed' : 'failed' }, null, 2))
}
