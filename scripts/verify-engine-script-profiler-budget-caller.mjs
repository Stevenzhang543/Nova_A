/** Actual Core/WASM callbacks under Profiler collection admission; no synthetic VM or performance claim. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'vite'
import ts from 'typescript'
import { canonicalCoreBeforeWorldHost } from './lib/gameplayWorldHostContract.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url))), directory = join(root, process.argv.find(value => value.startsWith('--report-dir='))?.slice('--report-dir='.length) ?? '.cache/engine-overhaul/profiler-budget-caller')
const temporary = await mkdtemp(join(tmpdir(), 'nova-profiler-budget-caller-')), normalize = value => value.replaceAll('\\', '/')
const sha = value => createHash('sha256').update(value).digest('hex'), checks = [], observations = [], sourceHashes = {}
const vueEntry = join(dirname(createRequire(import.meta.url).resolve('vue/package.json')), 'dist/vue.runtime.esm-bundler.js')
const check = (name, operation) => { operation(); checks.push(name) }
let passed = false, error = null, runtime = null, parameterAst = null, apiPrefillCalls = 0
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
try {
  await mkdir(join(directory, 'source'), { recursive: true })
  const sourceFiles = ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/profiler.ts', 'src/runtime/profilerCollectionBudget.ts', 'src/editor/gameplayScriptServices.ts', 'src/runtime/scriptServices.ts', 'nova_core/pkg/nova_core_bg.wasm', 'scripts/verify-engine-script-profiler-budget-caller.mjs']
  for (const path of sourceFiles) { const bytes = await readFile(join(root, path)); sourceHashes[path] = sha(bytes); if (!path.endsWith('.wasm')) await writeFile(join(directory, 'source', path.replaceAll('/', '_')), bytes) }
  const canonical = await canonicalCoreBeforeWorldHost(await readFile(join(root, 'src/runtime/GameplayRuntimeCore.ts'), 'utf8'))
  assert.equal(sha(canonical), 'a2695bbf0f4877c690baa41a14c026a28b7e252e57006ae0286c433cedf5fc07')
  assert.equal(sourceHashes['src/runtime/profiler.ts'], '9fb316da81d9179c140c4e6bc32aef0cdc62996ef865a987e3c6d2d990f5fb2a')
  const corePath = 'src/runtime/GameplayRuntimeCore.ts', current = await readFile(join(root, corePath), 'utf8'), old = await readFile(join(root, '.cache/engine-overhaul/profiler-off-caller/Core-before.ts'), 'utf8')
  const calls = text => { const ast = ts.createSourceFile(corePath, text, ts.ScriptTarget.Latest, true), found = []; const visit = node => { if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'recordScriptFunction') found.push({ arguments: node.arguments.map(argument => argument.getText(ast)), guard: ts.isIfStatement(node.parent.parent) ? node.parent.parent.expression.getText(ast) : null }); ts.forEachChild(node, visit) }; visit(ast); return found }
  parameterAst = { old: calls(old), current: calls(current) }
  check('real-Core-single-call-keeps-original-five-arguments-and-live-policy-guard', () => { assert.equal(parameterAst.current.length, 1); assert.equal(parameterAst.old.length, 1); assert.equal(parameterAst.current[0].arguments.length, 5); assert.deepEqual(parameterAst.current[0].arguments, parameterAst.old[0].arguments); assert.equal(parameterAst.current[0].guard, 'shouldRecordScriptFunction()') })
  const entries = {
    [corePath]: 'GameplayRuntime as GameplayRuntimeCore', 'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/store/physics.ts': 'physicsState', 'src/assets/AssetDatabase.ts': 'assetState', 'src/assets/types.ts': 'defaultScriptMetadata',
    'src/world/BoxEntity.ts': 'BoxEntity', 'src/world/components.ts': 'Script2D', 'src/runtime/entityLifetimes.ts': 'beginEntityLifetime',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings', 'src/runtime/scriptDebug.ts': 'clearScriptDebugger',
    'src/runtime/profiler.ts': 'profilerState, clearProfiler, captureScriptProfile, recordScriptFunction, currentScriptProfileCollection, shouldRecordScriptFunction',
    'src/runtime/profilerCollectionBudget.ts': 'SCRIPT_PROFILE_MAX_ENTRIES, SCRIPT_PROFILE_MAX_METADATA_BYTES, scriptProfileMetadataEstimate',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmScriptRuntime'
  }
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n') + `\nexport { toRaw } from '${normalize(vueEntry)}';`)
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const api = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  await api.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.breakOnRuntimeError = false; api.scriptProjectSettings.testing.coverageEnabled = false
  api.clearScriptDebugger(); api.physicsState.playMode = 'playing'
  const worldOwner = api.physicsState.world
  const source = '@export let runs = 0;\n@export let payload = "seed";\nlet private_runs = 0;\nfn update(dt) { private_runs += 1; runs = private_runs; set_position(12.5, -3.25); }\nfn fail() { throw "budget-caller-real-vm-error"; }'
  const records = ['accepted', 'new'].map(name => ({ uuid: `profiler-budget-${name}`, name: `Budget ${name}`, path: `Assets/Scripts/budget-${name}.rhai`, assetType: 'script', source, script: api.defaultScriptMetadata() }))
  api.assetState.records.splice(0, api.assetState.records.length, ...records); api.assetState.generation++
  runtime = new api.GameplayRuntimeCore(api.createEditorGameplayScriptServices(), api.createEditorGameplayWorldHost()); runtime.scriptRuntime = new api.WasmScriptRuntime(); runtime.playSessionIdentity = 701; runtime.scriptRuntime.clear_instances(701); runtime.active = true
  const fixtures = records.map((record, index) => { const entity = new api.BoxEntity(index + 1, { x: 0, y: 0 }, { x: 1, y: 1 }); entity.isStatic = true; const script = entity.addComponent(new api.Script2D()); script.scriptAsset = record.uuid; script.properties = { runs: 0, payload: '汉字🙂'.repeat(20) }; api.beginEntityLifetime(entity); return { entity, record } })
  api.physicsState.world.entities.splice(0, api.physicsState.world.entities.length, ...fixtures.map(fixture => fixture.entity))
  const policy = (mode = 'Full', enabled = true, frozen = false) => Object.assign(api.profilerState, { overheadMode: mode, enabled, frozen })
  const nativeStringify = JSON.stringify, profile = (fixture, fn = 'update') => api.captureScriptProfile().entries.find(item => item.scriptUuid === fixture.record.uuid && item.functionName === fn)
  const invoke = (fixture, fn = 'update') => {
    const propertyRoot = fixture.entity.script2D.properties, propertiesJson = nativeStringify(propertyRoot), previousRuns = propertyRoot.runs
    const executionSource = runtime.compiledSources.get(fixture.record.uuid) ?? runtime.resolveModuleSource(fixture.record.uuid, fixture.record.source).source
    const sample = { scriptUuid: fixture.record.uuid, functionName: fn, mode: api.profilerState.overheadMode, enabled: api.profilerState.enabled, frozen: api.profilerState.frozen, previousRuns, abiCalls: 0, abiUtf8Bytes: 0, diagnosticPropertyCalls: 0, estimatedAllocation: executionSource.length * 2 + propertiesJson.length, collectionBefore: api.currentScriptProfileCollection() }
    fixture.entity.transform.position = { x: 0, y: 0 }
    JSON.stringify = function(value, ...args) { const result = Reflect.apply(nativeStringify, JSON, [value, ...args]); if (value === propertyRoot) sample.diagnosticPropertyCalls++; else if (value && typeof value === 'object' && value.entity === fixture.entity.uuid && typeof value.invocationId === 'number' && value.properties === propertyRoot) { sample.abiCalls++; sample.abiUtf8Bytes += Buffer.byteLength(result, 'utf8') } return result }
    try { runtime.runEntityFunction(fixture.entity, fn) } finally { JSON.stringify = nativeStringify }
    sample.afterProperties = { ...fixture.entity.script2D.properties }; sample.lastError = fixture.entity.script2D.lastError; sample.afterPosition = { ...fixture.entity.transform.position }; sample.collectionAfter = api.currentScriptProfileCollection(); observations.push(sample)
    return sample
  }
  const assertUpdate = (sample, runs, recording = true) => { assert.equal(sample.abiCalls, 1); assert(sample.abiUtf8Bytes > 0); assert.equal(sample.diagnosticPropertyCalls, recording ? 1 : 0); assert.equal(sample.lastError, null); assert.equal(sample.afterProperties.runs, runs); assert.equal(sample.afterProperties.payload, '汉字🙂'.repeat(20)); assert.deepEqual(sample.afterPosition, { x: 12.5, y: -3.25 }) }
  const [accepted, candidate] = fixtures
  api.clearProfiler(); policy()
  api.recordScriptFunction(accepted.record.uuid, 'Original accepted statistical name', 'update', 1000, 7); apiPrefillCalls++
  for (let index = 1; index < api.SCRIPT_PROFILE_MAX_ENTRIES; index++) { api.recordScriptFunction('prefill-' + index, 'Actual API fixture', 'update', 0, 1); apiPrefillCalls++ }
  const full = api.currentScriptProfileCollection(), acceptedSeed = { ...profile(accepted) }
  check('actual-Profiler-public-API-prepares-4096-admitted-identities-without-VM-loop', () => { assert.equal(full.admittedEntries, 4096); assert.equal(full.rejectedCalls, 0); assert.equal(full.displayTruncated, true); assert.equal(api.profilerState.scriptFunctions.length, 2000); assert.equal(runtime.diagnostics.lifecycleCalls, 0); assert.equal(apiPrefillCalls, 4096) })
  const acceptedFirst = invoke(accepted), acceptedSecond = invoke(accepted)
  check('full-entry-budget-keeps-admitted-real-callback-aggregation-props-and-command', () => { assertUpdate(acceptedFirst, 1); assertUpdate(acceptedSecond, 2); const item = profile(accepted); assert.equal(item.calls, acceptedSeed.calls + 2); assert.equal(item.scriptName, acceptedSeed.scriptName); assert.equal(item.allocationEstimateBytes, acceptedSeed.allocationEstimateBytes + acceptedFirst.estimatedAllocation + acceptedSecond.estimatedAllocation); assert.equal(api.currentScriptProfileCollection(), full); assert(item.totalMs >= acceptedSeed.totalMs) })
  const retained = api.profilerState.scriptFunctions.map(item => ({ ...item })), newFirst = invoke(candidate), newSecond = invoke(candidate)
  check('full-entry-budget-rejects-new-statistics-while-real-VM-and-ABI-scope-advance', () => { assertUpdate(newFirst, 1); assertUpdate(newSecond, 2); assert.equal(api.currentScriptProfileCollection().admittedEntries, 4096); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 2); assert.equal(profile(candidate), undefined); assert.deepEqual(api.profilerState.scriptFunctions.map(item => ({ ...item })), retained); assert(api.currentScriptProfileCollection().revision > full.revision) })
  const errorsBefore = runtime.diagnostics.scriptErrors, failed = invoke(candidate, 'fail'), recovered = invoke(candidate)
  check('refused-new-identity-still-reports-real-VM-error-and-recovers-on-same-scope', () => { assert.match(failed.lastError, /budget-caller-real-vm-error/); assert.equal(failed.abiCalls, 1); assert.equal(failed.diagnosticPropertyCalls, 1); assert.equal(failed.afterProperties.runs, 2); assertUpdate(recovered, 3); assert.equal(runtime.diagnostics.scriptErrors, errorsBefore + 1); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 4); assert.equal(profile(candidate), undefined); assert.equal(profile(candidate, 'fail'), undefined); assert.equal(api.physicsState.playMode, 'playing') })
  const acceptedFailure = invoke(accepted, 'fail'), acceptedRecovered = invoke(accepted)
  check('admitted-asset-new-function-refusal-does-not-reset-existing-update-statistics', () => { assert.match(acceptedFailure.lastError, /budget-caller-real-vm-error/); assertUpdate(acceptedRecovered, 3); assert.equal(profile(accepted).calls, acceptedSeed.calls + 3); assert.equal(profile(accepted, 'fail'), undefined); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 5) })
  const beforeDisabled = api.currentScriptProfileCollection()
  for (const [name, mode, enabled, frozen, runs] of [['Off', 'Off', true, false, 4], ['disabled', 'Full', false, false, 5], ['frozen', 'Full', true, true, 6]]) {
    policy(mode, enabled, frozen); const sample = invoke(candidate)
    check(name + '-executes-real-callback-without-diagnostic-preparation-or-refusal-count', () => { assertUpdate(sample, runs, false); assert.equal(api.currentScriptProfileCollection(), beforeDisabled); assert.equal(profile(candidate), undefined); assert.equal(api.shouldRecordScriptFunction(), false) })
  }
  policy(); const priorScope = runtime.scriptRuntime; api.clearProfiler(); const cleared = api.currentScriptProfileCollection(), afterClear = invoke(candidate), afterClearSecond = invoke(candidate)
  check('clear-resets-only-statistics-and-same-VM-instance-private-state-continues', () => { assert.equal(cleared.admittedEntries, 0); assert.equal(cleared.rejectedCalls, 0); assertUpdate(afterClear, 7); assertUpdate(afterClearSecond, 8); assert.equal(profile(candidate).calls, 2); assert.equal(profile(candidate).scriptName, candidate.record.name); assert.equal(profile(candidate).allocationEstimateBytes, afterClear.estimatedAllocation + afterClearSecond.estimatedAllocation); assert.equal(runtime.scriptRuntime, priorScope); assert.equal(runtime.playSessionIdentity, 701) })
  api.clearProfiler()
  const byteKey = accepted.record.uuid + ':update', fixedWeight = api.scriptProfileMetadataEstimate(byteKey, accepted.record.uuid, '', 'update')
  const longName = 'N'.repeat((api.SCRIPT_PROFILE_MAX_METADATA_BYTES - fixedWeight) / 2)
  api.recordScriptFunction(accepted.record.uuid, longName, 'update', 1000, 13); apiPrefillCalls++
  const byteFull = api.currentScriptProfileCollection(), byteSeed = { ...profile(accepted) }
  check('actual-Profiler-API-exhausts-exact-estimated-byte-budget-with-one-record', () => { assert.equal(byteFull.admittedEntries, 1); assert.equal(byteFull.estimatedMetadataBytes, api.SCRIPT_PROFILE_MAX_METADATA_BYTES); assert.equal(byteFull.rejectedCalls, 0); assert.equal(api.scriptProfileMetadataEstimate(byteKey, accepted.record.uuid, longName, 'update'), api.SCRIPT_PROFILE_MAX_METADATA_BYTES); assert.equal(byteSeed.scriptName.length, longName.length) })
  const byteAccepted = invoke(accepted), byteNew = invoke(candidate)
  check('byte-full-admitted-callback-aggregates-and-new-real-callback-is-only-diagnostically-refused', () => { assertUpdate(byteAccepted, 4); assertUpdate(byteNew, 9); const item = profile(accepted); assert.equal(item.calls, 2); assert.equal(item.scriptName, longName); assert.equal(item.allocationEstimateBytes, 13 + byteAccepted.estimatedAllocation); assert.equal(api.currentScriptProfileCollection().admittedEntries, 1); assert.equal(api.currentScriptProfileCollection().estimatedMetadataBytes, byteFull.estimatedMetadataBytes); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 1); assert.equal(profile(candidate), undefined) })
  const byteFailure = invoke(candidate, 'fail'), byteRecovery = invoke(candidate)
  check('byte-refused-error-retains-current-properties-and-recovery-command', () => { assert.match(byteFailure.lastError, /budget-caller-real-vm-error/); assert.equal(byteFailure.afterProperties.runs, 9); assert.equal(byteFailure.abiCalls, 1); assertUpdate(byteRecovery, 10); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 3); assert.equal(profile(candidate), undefined) })
  const byteDisabled = api.currentScriptProfileCollection()
  for (const [mode, enabled, frozen, runs] of [['Off', true, false, 11], ['Full', false, false, 12], ['Full', true, true, 13]]) { policy(mode, enabled, frozen); assertUpdate(invoke(candidate), runs, false); assert.equal(api.currentScriptProfileCollection(), byteDisabled) }
  checks.push('byte-refusal-Off-disabled-frozen-do-not-change-budget-evidence')
  policy(); api.clearProfiler(); const byteCleared = invoke(candidate)
  check('byte-budget-clear-readmits-same-live-script-without-resetting-private-state', () => { assertUpdate(byteCleared, 14); assert.equal(profile(candidate).calls, 1); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 0); assert.equal(api.currentScriptProfileCollection().admittedEntries, 1); assert.equal(runtime.scriptRuntime, priorScope) })
  const oldEpoch = runtime.playSessionIdentity, errorsBeforeEpoch = runtime.diagnostics.scriptErrors
  runtime.scriptRuntime.clear_instances(oldEpoch + 1); runtime.playSessionIdentity = oldEpoch + 1; runtime.invalidateScriptWorld(); const published = invoke(candidate)
  runtime.playSessionIdentity = oldEpoch; const stale = invoke(candidate)
  runtime.playSessionIdentity = oldEpoch + 1; const epochRecovered = invoke(candidate)
  check('budget-owner-does-not-weaken-real-VM-old-epoch-rejection-and-fresh-scope', () => { assertUpdate(published, 1); assert.match(stale.lastError, /epoch/i); assert.equal(stale.abiCalls, 1); assert.equal(stale.afterProperties.runs, 1); assertUpdate(epochRecovered, 2); assert.equal(runtime.diagnostics.scriptErrors, errorsBeforeEpoch + 1); assert.equal(api.currentScriptProfileCollection().rejectedCalls, 0); assert.equal(profile(candidate).calls, 4) })
  check('diagnostic-preparation-spy-preserves-real-VM-single-world-and-original-JSON', () => { assert.equal(JSON.stringify, nativeStringify); assert(runtime.scriptRuntime instanceof api.WasmScriptRuntime); assert.equal(api.physicsState.world, worldOwner); assert.equal(api.toRaw(api.physicsState.world.entities[1]), candidate.entity); assert.equal(runtime.diagnostics.lifecycleCalls, 20); assert.equal(runtime.diagnostics.scriptErrors, 4); assert.equal(runtime.diagnostics.lifecycleCalls + runtime.diagnostics.scriptErrors, observations.length); assert.equal(observations.reduce((count, sample) => count + sample.abiCalls, 0), 24); assert.equal(apiPrefillCalls, 4097) })
  for (const path of sourceFiles) assert.equal(sha(await readFile(join(root, path))), sourceHashes[path], 'Source changed during test: ' + path)
  checks.push('all-Core-Profiler-services-WASM-and-verifier-hashes-stable-during-actual-run')
  passed = true
} catch (cause) { error = cause.stack; throw cause } finally {
  runtime?.scriptRuntime?.free()
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'after.json'), JSON.stringify({ generatedAt: new Date().toISOString(), status: passed ? 'passed' : 'failed', checks, error, sourceHashes, parameterAst, apiPrefillCalls, actualVmCalls: observations.length, observations,
    scope: 'Real production Gameplay Core/Editor script catalog/single existing World/optimized ordinary nonshared WASM. Public Profiler API prefill; actual callbacks under collection entry+estimated metadata byte limits. No fake VM or 4096 VM calls.',
    limits: ['4096 synthetic diagnostic identities are inserted through the real public API; they are not 4096 scene scripts or a performance workload.', '2MiB collection metadata accounting is a bounded UTF16/fixed-record estimate, not measured JS heap usage.', 'Full callbacks still prepare the original allocation heuristic even when a new identity is refused; callback ABI JSON remains required. Off/disabled/frozen skip only diagnostics.', 'source.length*2+propertiesJSON.length retains the original mixed-unit estimate, not actual allocation bytes.', 'This functional counting test and its synchronous spy perturb execution; no wall-time/B-gate/GUI/Worker/Player/GPU qualification.'] }, null, 2) + '\n')
  await rm(temporary, { recursive: true, force: true })
  console.log(`Actual Core profiler budget caller: ${checks.length} checks ${passed ? 'passed' : 'failed'}, ${observations.length} real VM callbacks, ${apiPrefillCalls} public API prefill calls`)
}
