import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), baseline = process.argv.includes('--baseline')
const probe = { bridgeInputAllocations: 0, bridgeInputBytes: 0, bridgeOutputBytes: 0 }
globalThis.__novaStateProbe = probe
let source = await readFile(join(root, 'nova_core/pkg/nova_core.js'), 'utf8')
const inputMarker = 'function passArrayF64ToWasm0(arg, malloc) {'
assert(source.includes(inputMarker), 'locked generated glue input observer must match')
source = source.replace(inputMarker, `${inputMarker}\n    globalThis.__novaStateProbe.bridgeInputAllocations++; globalThis.__novaStateProbe.bridgeInputBytes += arg.length * 8;`)
const outputMarker = /(__wbg___wbindgen_copy_to_typed_array_[a-f0-9]+: function\(arg0, arg1, arg2\) \{)/
assert(outputMarker.test(source), 'locked generated glue output observer must match')
source = source.replace(outputMarker, '$1\n            globalThis.__novaStateProbe.bridgeOutputBytes += arg1;')
const core = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)
const exports = await core.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
const world = new core.WasmRuntimeWorld(), checks = []
let passed = false, metrics = {}
let compiled = null, production = null
const body = (id, x = id * 10) => { const values = new Float64Array(56); values[0] = id; values[1] = 1; values[2] = x; values[8] = 1; values[9] = 1; values[12] = .5; values[13] = .5; return values }
const copy = (previous, target, expected) => {
  if (baseline) return previous ? world.copy_previous_body_state(target) : world.copy_state(target)
  return production.copyBorrowedRuntimeState(previous, target, expected)
}
try {
  if (!baseline) {
    compiled = await mkdtemp(join(tmpdir(), 'nova-engine-state-view-'))
    const entry = join(compiled, 'entry.ts'), modulePath = path => path.replaceAll('\\', '/')
    // Initialize the same production bridge import order; direct World is coupled to the editor store.
    await writeFile(entry, `export { GameplayRuntime } from '${modulePath(join(root, 'src/runtime/GameplayRuntime.ts'))}';\nexport { physicsState } from '${modulePath(join(root, 'src/store/physics.ts'))}';\n`)
    await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'world.mjs', inlineDynamicImports: true } } } })
    const { pathToFileURL } = await import('node:url')
    const { physicsState } = await import(pathToFileURL(join(compiled, 'world.mjs')).href)
    production = physicsState.world; production.runtime = world
  }
  world.set_timing(60, 8, 1, false, 0)
  for (let n = 1; n <= 100; n++) world.upsert_body(n, n - 1, body(n))
  world.advance(1 / 60, 0, 0)
  const size = world.state_len(), bodySize = world.body_state_len(), target = new Float64Array(size), previous = new Float64Array(bodySize)
  probe.bridgeInputAllocations = 0; probe.bridgeInputBytes = 0; probe.bridgeOutputBytes = 0
  const start = performance.now()
  for (let n = 0; n < 10; n++) { assert.equal(copy(false, target, size), size); assert.equal(copy(true, previous, bodySize), bodySize) }
  metrics = { bodies: 100, reads: 10, stateElements: size, previousElements: bodySize, ...probe, synchronousOwnedCopyBytes: baseline ? 0 : 10 * (size + bodySize) * 8, wallMs: performance.now() - start }
  assert.equal(target[2], 10); assert.equal(target[56 + 2], 20)
  checks.push('actual-100-body-state-content')
  if (baseline) { assert.equal(probe.bridgeInputAllocations, 20); assert.equal(probe.bridgeInputBytes, 10 * (size + bodySize) * 8); assert.equal(probe.bridgeOutputBytes, probe.bridgeInputBytes); checks.push('confirmed-legacy-temporary-allocation-and-input-copy') }
  else {
    assert.equal(probe.bridgeInputAllocations, 0); assert.equal(probe.bridgeInputBytes, 0); assert.equal(probe.bridgeOutputBytes, 0)
    checks.push('no-full-state-wasm-temporary-input-allocation')
    const oldView = world.state_view(), oldBuffer = oldView.buffer, owned = target.slice()
    exports.memory.grow(1)
    assert.notEqual(exports.memory.buffer, oldBuffer); assert.equal(oldView.byteLength, 0)
    copy(false, target, size); assert.deepEqual(target, owned)
    checks.push('memory-grow-fresh-view', 'owned-copy-stable-after-grow')
    const stateView = world.state_view
    world.state_view = () => oldView
    assert.throws(() => copy(false, target, size), /expired|Invalid/)
    world.state_view = stateView
    assert.throws(() => copy(false, world.state_view(), size), /expired|Invalid/)
    assert.throws(() => copy(false, new Float64Array(size - 1), size), /expired|Invalid/)
    checks.push('detached-view-explicitly-rejected', 'wasm-owned-target-rejected', 'truncated-owned-target-rejected')
    for (let n = 101; n <= 500; n++) world.upsert_body(n, n - 1, body(n))
    world.advance(1 / 60, 0, 0)
    const expanded = new Float64Array(world.state_len()); copy(false, expanded, expanded.length)
    assert.equal(expanded.length, 500 * 56); assert.equal(expanded[499 * 56 + 2], 5000); assert.deepEqual(target, owned)
    checks.push('vec-expansion-fresh-view', 'owned-copy-stable-after-next-tick')
    // Same frozen 500-body data, both existing APIs, bounded warm-up and five paired smoke samples.
    // These raw samples are intentionally separate from formal B4 performance acceptance.
    const prevExpanded = new Float64Array(world.body_state_len())
    const legacyPair = () => { world.copy_state(expanded); world.copy_previous_body_state(prevExpanded) }
    const ownedPair = () => { copy(false, expanded, expanded.length); copy(true, prevExpanded, prevExpanded.length) }
    for (let n = 0; n < 10; n++) { legacyPair(); ownedPair() }
    const legacySamplesMs = [], ownedSamplesMs = []
    for (let n = 0; n < 5; n++) {
      for (const [read, samples] of n % 2 ? [[ownedPair, ownedSamplesMs], [legacyPair, legacySamplesMs]] : [[legacyPair, legacySamplesMs], [ownedPair, ownedSamplesMs]]) {
        const started = performance.now(); for (let pair = 0; pair < 100; pair++) read(); samples.push(performance.now() - started)
      }
    }
    metrics.warmed500BodySmoke = { pairsPerSample: 100, warmupPairsPerAPI: 10, legacySamplesMs, ownedSamplesMs, note: 'Bounded micro smoke only; full owner frame, host/GPU/platform and B4 thresholds not measured.' }
    world.destroy_body(1); world.advance(1 / 60, 0, 0)
    const compacted = new Float64Array(world.state_len()); copy(false, compacted, compacted.length); assert.equal(compacted[0], 2)
    checks.push('structural-compaction-fresh-view')
    world.clear(); world.advance(0, 0, 0)
    const empty = new Float64Array(world.state_len()); copy(false, empty, empty.length); assert.equal(empty.length, 0)
    world.upsert_body(1, 0, body(1, 777)); world.advance(1 / 60, 0, 0)
    const reused = new Float64Array(world.state_len()); copy(false, reused, reused.length); assert.equal(reused[2], 777); assert.deepEqual(target, owned)
    checks.push('clear-empty-view', 'lifecycle-reuse-fresh-view')
  }
  passed = true
  console.log(JSON.stringify({ mode: baseline ? 'before' : 'after', metrics, checks }, null, 2))
} finally {
  world.free(); delete globalThis.__novaStateProbe
  if (compiled) await rm(compiled, { recursive: true, force: true })
  const reports = join(root, '.cache/engine-runtime'); await mkdir(reports, { recursive: true })
  await writeFile(join(reports, baseline ? 'state-view-before.json' : 'state-view-after.json'), JSON.stringify({ scope: 'Actual optimized ordinary WASM, observer-only generated glue. Input allocation counts cover bridge slice temporaries, not every Rust allocation. Controlled smoke, not B4.', metrics, checks, status: passed ? 'passed' : 'failed' }, null, 2))
}
