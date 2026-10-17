/** Real Core/WASM caller-cost attribution. No fake VM or heap/performance qualification. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'vite'
import ts from 'typescript'
import { canonicalCoreBeforeWorldHost, canonicalCompatBeforeWorldHost } from './lib/gameplayWorldHostContract.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before')
const baselineDirectory = join(root, '.cache/engine-overhaul/profiler-off-caller')
const directory = join(root, process.argv.find(value => value.startsWith('--report-dir='))?.slice('--report-dir='.length) ?? '.cache/engine-overhaul/profiler-off-caller'), temporary = await mkdtemp(join(tmpdir(), 'nova-profiler-caller-'))
const normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
const vueEntry = join(dirname(createRequire(import.meta.url).resolve('vue/package.json')), 'dist/vue.runtime.esm-bundler.js')
const checks = [], observations = [], sourceHashes = {}, runtimes = []
let passed = false, error = null, parameterAst = null
const check = (name, operation) => { operation(); checks.push(name) }
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
try {
  const corePath = 'src/runtime/GameplayRuntimeCore.ts', saved = await readFile(join(baselineDirectory, 'Core-before.ts'), 'utf8'), current = await readFile(join(root, corePath), 'utf8'), canonical = await canonicalCoreBeforeWorldHost(current)
  const compatPath = normalize(join(root, 'src/runtime/GameplayRuntime.ts')), oldCompat = before ? await canonicalCompatBeforeWorldHost(await readFile(compatPath, 'utf8')) : null
  // Pair the old Core with its actual pre-Owner GameFlow/contacts modules. Installing
  // a current Editor port into an old Core would conceal the dependency migration.
  const beforeGameplay = new Map()
  if (before) {
    const baseline = join(root, '.cache/engine-overhaul/game-flow/before'), recorded = JSON.parse(await readFile(join(baseline, 'source.json'), 'utf8'))
    for (const path of ['src/runtime/gameFlow.ts', 'src/runtime/gameplayComponents.ts']) {
      const bytes = await readFile(join(baseline, path))
      assert.equal(sha(bytes), recorded.files.find(value => value.path === path)?.sha256)
      beforeGameplay.set(normalize(join(root, path)), bytes.toString('utf8'))
      sourceHashes[`beforeDependency:${path}`] = sha(bytes)
    }
  }
  assert.equal(sha(saved), '4195bbdab48d86fc9322a8ef461073e179b5dd1b302f4f18a9ace44c4054a851')
  sourceHashes[corePath] = sha(before ? saved : current)
  sourceHashes.currentCore = sha(current)
  for (const path of ['src/runtime/profiler.ts', 'src/editor/gameplayScriptServices.ts', 'src/runtime/scriptServices.ts', 'nova_core/pkg/nova_core_bg.wasm', 'scripts/verify-engine-script-profiler-caller.mjs']) sourceHashes[path] = sha(await readFile(join(root, path)))
  const syntax = text => ts.createSourceFile(corePath, text, ts.ScriptTarget.Latest, true)
  const calls = ast => { const result = []; function visit(node) { if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'recordScriptFunction') result.push(node); ts.forEachChild(node, visit) } visit(ast); return result }
  const oldAst = syntax(saved), newAst = syntax(current), oldCalls = calls(oldAst), newCalls = calls(newAst)
  parameterAst = { before: oldCalls.map(node => node.arguments.map(item => item.getText(oldAst))), after: newCalls.map(node => node.arguments.map(item => item.getText(newAst))) }
  check('single-production-call-retains-all-five-original-argument-expressions', () => { assert.equal(oldCalls.length, 1); assert.equal(newCalls.length, 1); assert.equal(oldCalls[0].arguments.length, 5); assert.deepEqual(parameterAst.after, parameterAst.before) })
  check('Core-changes-only-the-import-and-policy-guard', () => {
    const restored = canonical.replace("import { recordScriptFunction, shouldRecordScriptFunction } from './profiler'", "import { recordScriptFunction } from './profiler'")
      .replace('if (shouldRecordScriptFunction()) recordScriptFunction(', 'recordScriptFunction(')
    assert.equal(restored.replaceAll('\r\n', '\n'), saved.replaceAll('\r\n', '\n'))
    assert(ts.isIfStatement(newCalls[0].parent.parent)); assert.equal(newCalls[0].parent.parent.expression.getText(newAst), 'shouldRecordScriptFunction()')
  })
  const entries = {
    [corePath]: 'GameplayRuntime as GameplayRuntimeCore', 'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/store/physics.ts': 'physicsState', 'src/assets/AssetDatabase.ts': 'assetState', 'src/assets/types.ts': 'defaultScriptMetadata',
    'src/world/BoxEntity.ts': 'BoxEntity', 'src/world/components.ts': 'Script2D', 'src/runtime/entityLifetimes.ts': 'beginEntityLifetime',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings', 'src/runtime/scriptDebug.ts': 'scriptDebugState, clearScriptDebugger',
    'src/runtime/profiler.ts': 'profilerState, clearProfiler, captureScriptProfile, shouldRecordScriptFunction',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmScriptRuntime'
  }
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n') + `\nexport { toRaw } from '${normalize(vueEntry)}';`)
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: before ? [{ name: 'exact-Core-before-caller', enforce: 'pre', load(id) { if (normalize(id) === normalize(join(root, corePath))) return saved; if (normalize(id) === compatPath) return oldCompat; return beforeGameplay.get(normalize(id)) } }] : [], build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const api = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  await api.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.breakOnRuntimeError = false; api.scriptProjectSettings.testing.coverageEnabled = false
  api.clearScriptDebugger(); api.physicsState.playMode = 'playing'
  const worldOwner = api.physicsState.world
  const source = '@export let runs = 0;\n@export let payload = "seed";\nlet private_runs = 0;\nfn update(dt) { private_runs += 1; runs = private_runs; }\nfn fail() { throw "off-caller-real-vm-error"; }'
  const record = { uuid: 'profiler-caller-real-source', name: 'Profiler caller', path: 'Assets/Scripts/profiler-caller.rhai', assetType: 'script', source, script: api.defaultScriptMetadata() }
  api.assetState.records.splice(0, api.assetState.records.length, record); api.assetState.generation++
  const propertiesSeed = { runs: 0, payload: '汉字🙂\\'.repeat(32) }, incomingCopies = []
  const nativeStringify = JSON.stringify
  const policy = (mode, enabled = true, frozen = false) => { api.profilerState.overheadMode = mode; api.profilerState.enabled = enabled; api.profilerState.frozen = frozen }
  const make = (mode, enabled = true, frozen = false) => {
    api.clearProfiler(); policy(mode, enabled, frozen)
    const runtime = before ? new api.GameplayRuntimeCore(api.createEditorGameplayScriptServices()) : new api.GameplayRuntimeCore(api.createEditorGameplayScriptServices(), api.createEditorGameplayWorldHost()), entity = new api.BoxEntity(1 + runtimes.length, { x: 0, y: 0 }, { x: 1, y: 1 })
    entity.isStatic = true; const component = entity.addComponent(new api.Script2D()); component.scriptAsset = record.uuid; component.properties = { ...propertiesSeed }
    api.beginEntityLifetime(entity)
    runtime.scriptRuntime = new api.WasmScriptRuntime(); runtime.playSessionIdentity = 101 + runtimes.length; runtime.scriptRuntime.clear_instances(runtime.playSessionIdentity); runtime.active = true
    api.physicsState.world.entities.splice(0, api.physicsState.world.entities.length, entity); api.physicsState.playMode = 'playing'; runtimes.push(runtime)
    return { runtime, entity }
  }
  const invoke = (fixture, fn = 'update') => {
    const propertyRoot = fixture.entity.script2D.properties, originalPropertiesJson = nativeStringify(propertyRoot), valueBefore = { ...propertyRoot }
    const executionSource = fixture.runtime.compiledSources.get(record.uuid) ?? fixture.runtime.resolveModuleSource(record.uuid, record.source).source
    assert.equal(typeof executionSource, 'string', 'Read the actual production module bundle')
    const sample = { functionName: fn, mode: api.profilerState.overheadMode, enabled: api.profilerState.enabled, frozen: api.profilerState.frozen, abiCalls: 0, abiUtf8Bytes: 0, diagnosticPropertyCalls: 0, diagnosticPropertyJsonCodeUnits: 0, otherRootStringifyCalls: 0,
      executionSourceCodeUnits: executionSource.length, authorSourceCodeUnits: source.length, oldMixedUnitEstimate: executionSource.length * 2 + originalPropertiesJson.length }
    JSON.stringify = function(value, ...args) {
      const result = Reflect.apply(nativeStringify, JSON, [value, ...args])
      if (value === propertyRoot) { sample.diagnosticPropertyCalls++; sample.diagnosticPropertyJsonCodeUnits += result.length }
      else if (value && typeof value === 'object' && value.entity === fixture.entity.uuid && typeof value.invocationId === 'number' && value.properties === propertyRoot) {
        sample.abiCalls++; sample.abiUtf8Bytes += Buffer.byteLength(result, 'utf8')
      } else sample.otherRootStringifyCalls++
      return result
    }
    try { fixture.runtime.runEntityFunction(fixture.entity, fn) } finally { JSON.stringify = nativeStringify }
    assert.equal(JSON.stringify, nativeStringify)
    incomingCopies.push(valueBefore)
    sample.afterProperties = { ...fixture.entity.script2D.properties }; sample.lastError = fixture.entity.script2D.lastError
    sample.profile = api.captureScriptProfile().entries.map(item => ({ ...item }))
    observations.push(sample)
    return sample
  }
  const expectedDiagnosticCalls = recording => before || recording ? 1 : 0
  const assertCallback = (sample, recording, runs) => {
    assert.equal(sample.abiCalls, 1, 'actual callback ABI JSON remains required')
    assert(sample.abiUtf8Bytes > 0); assert.equal(sample.diagnosticPropertyCalls, expectedDiagnosticCalls(recording))
    assert.equal(sample.lastError, null); assert.equal(sample.afterProperties.runs, runs); assert.equal(sample.afterProperties.payload, propertiesSeed.payload)
  }
  for (const [name, mode, enabled, frozen] of [['Off', 'Off', true, false], ['disabled', 'Full', false, false], ['frozen', 'Full', true, true]]) {
    const fixture = make(mode, enabled, frozen), first = invoke(fixture), second = invoke(fixture)
    check(name + '-retains-real-VM-callback-and-private-instance-state', () => { assertCallback(first, false, 1); assertCallback(second, false, 2); assert.equal(fixture.runtime.diagnostics.lifecycleCalls, 2) })
    check(name + (before ? '-confirmed-unused-estimate-preparation' : '-skips-only-diagnostic-estimate-preparation'), () => { assert.equal(first.profile.length, 0); assert.equal(second.profile.length, 0); assert.equal(first.diagnosticPropertyCalls + second.diagnosticPropertyCalls, before ? 2 : 0); assert.equal(api.shouldRecordScriptFunction(), false) })
  }
  for (const mode of ['Full', 'Low overhead']) {
    const fixture = make(mode), first = invoke(fixture), second = invoke(fixture)
    check(mode + '-records-unchanged-original-estimate-and-call-count', () => { assertCallback(first, true, 1); assertCallback(second, true, 2); const value = second.profile.find(item => item.functionName === 'update'); assert.equal(value.calls, 2); assert.equal(value.allocationEstimateBytes, first.oldMixedUnitEstimate + second.oldMixedUnitEstimate); assert(value.lastMs >= 0 && Number.isFinite(value.totalMs) && value.maximumMs >= value.lastMs) })
  }
  const switched = make('Off'), offFirst = invoke(switched); policy('Full'); const on = invoke(switched); policy('Off'); const offLast = invoke(switched)
  check('Off-On-Off-live-policy-keeps-one-VM-scope-and-records-only-On', () => { assertCallback(offFirst, false, 1); assertCallback(on, true, 2); assertCallback(offLast, false, 3); assert.equal(offLast.profile[0].calls, 1); assert.equal(offLast.profile[0].allocationEstimateBytes, on.oldMixedUnitEstimate) })
  for (const mode of ['Off', 'Full']) {
    const fixture = make(mode), failed = invoke(fixture, 'fail'), recovered = invoke(fixture)
    check(mode + '-real-WASM-error-is-not-swallowed-and-valid-callback-recovers', () => { assert.match(failed.lastError, /off-caller-real-vm-error/); assert.equal(failed.afterProperties.runs, 0); assert.equal(fixture.runtime.diagnostics.scriptErrors, 1); assert.equal(failed.abiCalls, 1); assert.equal(failed.diagnosticPropertyCalls, expectedDiagnosticCalls(mode === 'Full')); assertCallback(recovered, mode === 'Full', 1); assert.equal(api.physicsState.playMode, 'playing') })
    check(mode + '-error-path-keeps-the-original-profiler-policy-and-estimate', () => { const fail = recovered.profile.find(item => item.functionName === 'fail'); if (mode === 'Full') { assert.equal(fail.calls, 1); assert.equal(fail.allocationEstimateBytes, failed.oldMixedUnitEstimate) } else assert.equal(recovered.profile.length, 0) })
  }
  const epoch = make('Off'), accepted = invoke(epoch), oldEpoch = epoch.runtime.playSessionIdentity
  epoch.runtime.scriptRuntime.clear_instances(oldEpoch + 1)
  epoch.runtime.playSessionIdentity = oldEpoch + 1; epoch.runtime.invalidateScriptWorld(); const published = invoke(epoch)
  epoch.runtime.playSessionIdentity = oldEpoch; const stale = invoke(epoch)
  epoch.runtime.playSessionIdentity = oldEpoch + 1; const restored = invoke(epoch)
  check('real-VM-new-epoch-rejects-old-Core-context-and-recovers-with-new-publication', () => { assertCallback(accepted, false, 1); assertCallback(published, false, 1); assert.match(stale.lastError, /epoch/i); assert.equal(stale.afterProperties.runs, 1); assert.equal(stale.abiCalls, 1); assert.equal(stale.diagnosticPropertyCalls, expectedDiagnosticCalls(false)); assertCallback(restored, false, 2); assert.equal(epoch.runtime.diagnostics.scriptErrors, 1); assert.equal(restored.profile.length, 0) })
  check('instrumentation-never-replaces-the-real-VM-or-world-and-leaves-JSON-restored', () => { assert.equal(JSON.stringify, nativeStringify); for (const runtime of runtimes) assert(runtime.scriptRuntime instanceof api.WasmScriptRuntime); assert.equal(api.physicsState.world, worldOwner); assert.equal(api.toRaw(api.physicsState.world.entities[0]), epoch.entity); assert(incomingCopies.every(item => item.payload === propertiesSeed.payload)) })
  passed = true
} catch (cause) { error = cause.stack; throw cause } finally {
  for (const runtime of runtimes) runtime.scriptRuntime?.free()
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, before ? 'before.json' : 'after.json'), JSON.stringify({ generatedAt: new Date().toISOString(), status: passed ? before ? 'CONFIRMED_DEFECT' : 'passed' : 'failed', checks, error, sourceHashes, parameterAst, observations,
    scope: 'Actual Gameplay Core/production Editor catalog/single existing World + optimized ordinary WASM. Core-before byte-exact original with same current pure Profiler callee. Per-callback synchronous JSON identity spy delegates all original calls; callback ABI roots and diagnostic property roots counted separately. No fake VM.',
    limits: ['source.length*2 + propertiesJSON.length remains the historic mixed-unit heuristic, not actual heap allocation bytes.', 'Counting smoke test, not wall-time/heap/performance B-gate; instrumentation itself perturbs execution.', 'Other required world/contract/ABI JSON is explicitly not attributed to this diagnostic property estimate.', 'Controlled Node host fixture uses actual VM epoch admission but does not certify browser/Worker/Player/GPU or whole Runtime purity.'] }, null, 2) + '\n')
  await rm(temporary, { recursive: true, force: true })
  console.log(`Actual Core profiler caller ${before ? 'before' : 'after'}: ${checks.length} checks ${passed ? 'completed' : 'failed'}`)
}
