/** Same original Profiler/Map, bounded diagnostics and real Vue provider. No hardware/performance qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import ts from 'typescript'

const root = process.cwd(), directory = resolve(process.env.NOVA_PROFILER_COLLECTION_REPORT ?? 'release-audits/engine-profiler-collection-first-20261006')
const baselineDirectory = resolve('release-audits/engine-profiler-collection-budget-slice-20261006')
const baseline = JSON.parse(await readFile(resolve(baselineDirectory, 'baseline.json'), 'utf8'))
const beforeSource = await readFile(resolve(baselineDirectory, 'before/src/runtime/profiler.ts'), 'utf8')
const owner = resolve('src/runtime/profiler.ts'), normalize = value => value.replaceAll('\\', '/'), sha = value => createHash('sha256').update(value).digest('hex')
assert.equal(sha(beforeSource), baseline.sha256)
const checks = [], observations = {}, graphs = {}, hashes = {}, fail = []
await mkdir(directory, { recursive: true })
const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { const row = { name, status: 'failed', error: String(error.stack ?? error) }; checks.push(row); fail.push(row) } }
const entry = resolve(directory, 'entry.ts')
await writeFile(entry, `export * as profiler from '${normalize(owner)}';\nexport * as budget from '${normalize(resolve('src/runtime/profilerCollectionBudget.ts'))}';\nexport {installEditorPerformanceState} from '${normalize(resolve('src/editor/performanceStateAdapter.ts'))}';\nexport {watch,reactive,toRaw,isReactive} from 'vue';\n`)
const m = {}
for (const stage of ['before', 'after']) {
  const graph = graphs[stage] = []
  const result = await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'collection-' + stage, enforce: 'pre', load(id) { if (stage === 'before' && normalize(id) === normalize(owner)) return beforeSource }, generateBundle() { graph.push(...this.getModuleIds()) } }],
    build: { ssr: true, write: false, rollupOptions: { input: entry, output: { inlineDynamicImports: true } } } })
  const code = (Array.isArray(result) ? result.flatMap(value => value.output) : result.output).find(value => value.type === 'chunk').code
  const file = resolve(directory, stage + '.mjs'); await writeFile(file, code); hashes[stage + ':artifact'] = sha(code); m[stage] = await import(pathToFileURL(file).href)
}
const p = m.after.profiler, b = m.after.budget, state = p.profilerState, raw = state
await check('default4096-2MiB-128-and-one-immutable-evidence-owner', () => {
  const evidence = p.currentScriptProfileCollection()
  assert.equal(evidence.maxEntries, 4096); assert.equal(evidence.maxEstimatedMetadataBytes, 2097152); assert.equal(evidence.recordEstimateBytes, 128)
  assert.equal(evidence.rankingScope, 'admitted-set'); assert.equal(evidence.admittedEntries, 0); assert.equal(evidence.rejectedCalls, 0)
  assert.equal(evidence.collectionTruncated, false); assert.equal(evidence.displayTruncated, false); assert(Object.isFrozen(evidence)); assert.equal(state.scriptCollection, evidence)
})
await check('UTF16-key-and-first-stored-fields-exact-estimate', () => {
  assert.equal(b.scriptProfileMetadataEstimate('x:f', 'x', 'N', 'f'), 128 + 2 * 6)
  assert.equal(b.scriptProfileMetadataEstimate('x:😀', 'x', '😀', '😀'), 128 + 2 * 9)
  p.recordScriptFunction('first', 'Original', 'update', 2, 4)
  const weight = b.scriptProfileMetadataEstimate('first:update', 'first', 'Original', 'update'), first = state.scriptFunctions[0]
  assert.equal(state.scriptCollection.estimatedMetadataBytes, weight)
  p.recordScriptFunction('first', 'Renamed'.repeat(1000), 'update', 3, 5)
  assert.equal(state.scriptFunctions[0], first); assert.equal(first.scriptName, 'Original'); assert.equal(first.calls, 2); assert.equal(first.totalMs, 5); assert.equal(first.allocationEstimateBytes, 9); assert.equal(state.scriptCollection.estimatedMetadataBytes, weight)
})
await check('before-retains4097th-identity-while-after-rejects-and-keeps-all-accepted-statistics', () => {
  for (const api of [m.before.profiler, p]) { api.clearProfiler(); for (let index = 0; index < 4096; index++) api.recordScriptFunction('id-' + index, 'Fixture', 'update', 0, 1) }
  const retained = state.scriptFunctions.map(item => ({ ...item }))
  m.before.profiler.recordScriptFunction('overflow', 'Overflow', 'update', 2, 1); m.before.profiler.recordScriptFunction('overflow', 'Overflow', 'update', 3, 1)
  assert.equal(m.before.profiler.profilerState.scriptFunctions[0].scriptUuid, 'overflow'); assert.equal(m.before.profiler.profilerState.scriptFunctions[0].calls, 2)
  p.recordScriptFunction('overflow', 'Overflow', 'update', 2, 1); p.recordScriptFunction('overflow', 'Overflow', 'update', 3, 1)
  assert.equal(state.scriptCollection.admittedEntries, 4096); assert.equal(state.scriptCollection.rejectedCalls, 2); assert.equal(state.scriptCollection.collectionTruncated, true); assert.equal(state.scriptCollection.displayTruncated, true)
  assert.deepEqual(state.scriptFunctions.map(item => ({ ...item })), retained)
  p.recordScriptFunction('id-4095', 'Renamed', 'update', 8, 3)
  assert.equal(state.scriptFunctions[0].scriptUuid, 'id-4095'); assert.equal(state.scriptFunctions[0].calls, 2); assert.equal(state.scriptFunctions[0].scriptName, 'Fixture'); assert.equal(state.scriptFunctions[0].allocationEstimateBytes, 4)
  observations.entryLimit = { before4097th: { ...m.before.profiler.profilerState.scriptFunctions[0] }, after: state.scriptCollection, acceptedUpdate: { ...state.scriptFunctions[0] } }
})
await check('real4096-owner-displayTop2000-stable-order-remains-legal', () => {
  assert.equal(state.scriptFunctions.length, 2000); assert.equal(state.scriptFunctions[1].scriptUuid, 'id-0'); assert.equal(state.scriptFunctions[2].scriptUuid, 'id-1')
  const snapshot = state.scriptCollection; p.profilerState.overheadMode = 'Full'; p.profilerState.overheadMode = 'Low overhead'; assert.equal(state.scriptCollection, snapshot)
})
await check('Off-disabled-frozen-and-invalid-duration-do-not-admit-or-count-rejections', () => {
  const before = state.scriptCollection
  for (const values of [{ overheadMode: 'Off' }, { enabled: false }, { frozen: true }]) {
    Object.assign(state, values); p.recordScriptFunction('blocked', 'Blocked', 'update', 1, 1); Object.assign(state, { enabled: true, frozen: false, overheadMode: 'Low overhead' })
  }
  for (const duration of [NaN, Infinity]) p.recordScriptFunction('blocked', 'Blocked', 'update', duration, 1)
  assert.equal(state.scriptCollection, before)
})
await check('actual-Vue-provider-sees-budget-revisions-on-the-same-raw-root-without-a-clock', () => {
  m.after.installEditorPerformanceState(); assert(m.after.isReactive(p.profilerState)); assert.equal(m.after.toRaw(p.profilerState), raw)
  const seen = [], stop = m.after.watch(() => p.profilerState.scriptCollection.revision, value => seen.push(value), { flush: 'sync' })
  try { const previous = p.profilerState.scriptCollection.revision; p.recordScriptFunction('still-full', 'Rejected', 'tick', 1, 1); assert.deepEqual(seen, [previous + 1]); assert.equal(raw.scriptCollection, p.currentScriptProfileCollection())
    const acceptedRevision = p.profilerState.scriptCollection.revision; p.recordScriptFunction('id-0', 'Changed', 'update', 1, 1); assert.equal(p.profilerState.scriptCollection.revision, acceptedRevision); assert.equal(seen.length, 1)
  } finally { stop() }
})
await check('immutable-v1-capture-and-legacy-missing-evidence-unknown-preserve-compare-deltas', () => {
  const captured = p.captureScriptProfile('budget-test'), capturedEvidence = captured.collection
  assert(Object.isFrozen(capturedEvidence)); assert.equal(captured.version, 1); assert.equal(captured.entries.length, 2000)
  assert.deepEqual(p.scriptProfileCaptureCollectionEvidence(JSON.parse(JSON.stringify(captured))), capturedEvidence)
  const legacy = { ...captured }; delete legacy.collection; assert.equal(p.scriptProfileCaptureCollectionEvidence(legacy), null)
  assert.deepEqual(p.compareScriptProfiles(legacy, captured), p.compareScriptProfiles(captured, captured))
  p.recordScriptFunction('further-rejected', 'Rejected', 'tick', 1, 1); assert.equal(captured.collection, capturedEvidence); assert.notEqual(p.currentScriptProfileCollection(), capturedEvidence)
  observations.capture = { version: captured.version, evidence: capturedEvidence, legacyCoverage: 'unknown', entries: captured.entries.length }
})
await check('metadata2MiB-full-rejects-new-identity-while-existing-first-name-remains', () => {
  p.clearProfiler(); const key = 'byte:update', base = b.scriptProfileMetadataEstimate(key, 'byte', '', 'update'), name = 'n'.repeat((2097152 - base) / 2)
  p.recordScriptFunction('byte', name, 'update', 1, 1); assert.equal(state.scriptCollection.estimatedMetadataBytes, 2097152); assert.equal(state.scriptCollection.admittedEntries, 1)
  const item = m.after.toRaw(state.scriptFunctions[0]); p.recordScriptFunction('new', '', 'u', 1, 1); assert.equal(state.scriptCollection.rejectedCalls, 1); assert.equal(state.scriptFunctions.length, 1)
  p.recordScriptFunction('byte', 'Changed', 'update', 2, 2); assert.equal(m.after.toRaw(state.scriptFunctions[0]), item); assert.equal(item.scriptName, name); assert.equal(item.calls, 2); assert.equal(state.scriptCollection.estimatedMetadataBytes, 2097152)
  assert.equal(state.scriptCollection.collectionTruncated, true); assert.equal(state.scriptCollection.displayTruncated, false)
  observations.byteLimit = { nameUTF16Length: name.length, storedMetadataBudget: state.scriptCollection, retainedCalls: item.calls }
})
await check('clear-resets-current-budget-and-Map-preserves-original-captures-and-root', () => {
  const captured = p.captureScriptProfile('clear-test'), previousRevision = state.scriptCollection.revision, view = p.profilerState
  p.clearProfiler(); assert.equal(p.profilerState, view); assert.equal(state.scriptCollection.admittedEntries, 0); assert.equal(state.scriptCollection.estimatedMetadataBytes, 0); assert.equal(state.scriptCollection.rejectedCalls, 0); assert.equal(state.scriptCollection.revision, previousRevision + 1)
  assert(state.scriptCaptures.includes(captured)); assert.equal(captured.collection.estimatedMetadataBytes, 2097152)
  p.recordScriptFunction('byte', 'New', 'update', 1, 1); assert.equal(state.scriptFunctions[0].calls, 1); assert.equal(state.scriptFunctions[0].scriptName, 'New')
})
await check('pure-admission-both-caps-safe-arithmetic-and-saturating-counter', () => {
  const owner = b.createProfilerCollectionBudget({ maxEntries: 2, maxEstimatedMetadataBytes: 260 })
  assert(owner.canAdmit(130)); owner.admit(130); owner.admit(130); assert.equal(owner.canAdmit(130), false); assert.throws(() => owner.admit(130)); owner.reject(); owner.reject(); assert.equal(owner.snapshot.rejectedCalls, 2)
  owner.clear(); assert.equal(owner.snapshot.admittedEntries, 0); assert.equal(owner.snapshot.rejectedCalls, 0)
  for (const weight of [NaN, Infinity, -1, Number.MAX_SAFE_INTEGER + 1]) assert.equal(owner.canAdmit(weight), false)
  for (const options of [{ maxEntries: 4097 }, { maxEstimatedMetadataBytes: 2097153 }, { maxEntries: NaN }]) assert.throws(() => b.createProfilerCollectionBudget(options))
  assert.equal(b.incrementScriptProfileCounter(Number.MAX_SAFE_INTEGER - 1), Number.MAX_SAFE_INTEGER); assert.equal(b.incrementScriptProfileCounter(Number.MAX_SAFE_INTEGER), Number.MAX_SAFE_INTEGER)
})
await check('capture-schema-malicious-counts-flags-and-accessors-stay-unknown', () => {
  const good = p.currentScriptProfileCollection(); assert(b.readScriptProfileCollectionEvidence(good))
  for (const patch of [{ schema: 'wrong' }, { rankingScope: 'all-functions' }, { maxEntries: 4097 }, { maxEstimatedMetadataBytes: Infinity }, { admittedEntries: 4097 }, { estimatedMetadataBytes: -1 }, { rejectedCalls: NaN }, { revision: Number.MAX_SAFE_INTEGER + 1 }, { collectionTruncated: true }, { displayTruncated: true }, { rejectedCallsSaturated: true }, { recordEstimateBytes: 0 }]) assert.equal(b.readScriptProfileCollectionEvidence({ ...good, ...patch }), null)
  let invoked = 0; const payload = { ...good }; Object.defineProperty(payload, 'rejectedCalls', { get() { invoked++; return 0 } }); assert.equal(b.readScriptProfileCollectionEvidence(payload), null)
  const capture = {}; Object.defineProperty(capture, 'collection', { get() { invoked++; return good } }); assert.equal(p.scriptProfileCaptureCollectionEvidence(capture), null); assert.equal(invoked, 0)
})
await check('original-record-mutations-sort-and-compare-expressions-remain-byte-identical', async () => {
  const current = await readFile(owner, 'utf8')
  for (const phrase of [
    'const item = functionProfiles.get(key) ?? { scriptUuid, scriptName, functionName, calls: 0, totalMs: 0, lastMs: 0, maximumMs: 0, allocationEstimateBytes: 0 }',
    'item.calls++; item.lastMs = Math.max(0, durationMs); item.totalMs += item.lastMs; item.maximumMs = Math.max(item.maximumMs, item.lastMs); item.allocationEstimateBytes += Math.max(0, Math.round(allocationEstimateBytes))',
    'functionProfiles.set(key, item)',
    'const values = [...functionProfiles.values()].sort(',
    'profilerState.scriptFunctions.splice(0, profilerState.scriptFunctions.length, ...values)'
  ]) { assert(beforeSource.includes(phrase)); assert(current.includes(phrase)) }
  const parse = text => ts.createSourceFile(owner, text, ts.ScriptTarget.Latest, true), first = parse(beforeSource), next = parse(current), printer = ts.createPrinter({ removeComments: true })
  const compare = tree => printer.printNode(ts.EmitHint.Unspecified, tree.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'compareScriptProfiles'), tree)
  assert.equal(compare(first), compare(next))
})
const coreGraph = []
await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'pure-collection-graph', generateBundle() { coreGraph.push(...this.getModuleIds()) } }], build: { ssr: true, write: false, rollupOptions: { input: owner, output: { inlineDynamicImports: true } } } })
await check('compiled-real-Profiler-graph-remains-pure-with-no-second-record-map-or-clock', async () => {
  assert.deepEqual(coreGraph.filter(id => /node_modules\/.*(?:vue|pinia)|\/src\/(?:editor|store|components|ui|platform)\//.test(normalize(id))), [])
  const source = await readFile(resolve('src/runtime/profilerCollectionBudget.ts'), 'utf8'); assert(!/\b(?:Map|Set|Date|performance|window|document|setTimeout|setInterval|requestAnimationFrame)\b/.test(source)); assert(coreGraph.some(id => id.endsWith('/profilerCollectionBudget.ts')))
})
for (const path of ['src/runtime/profiler.ts', 'src/runtime/profilerCollectionBudget.ts', 'src/editor/performanceStateAdapter.ts', 'scripts/verify-engine-profiler-collection.mjs']) hashes[path] = sha(await readFile(resolve(path)))
graphs.pure = coreGraph
const report = { format: 'nova-profiler-collection-verification', version: 1, status: fail.length ? 'failed' : 'passed', checks, observations, graphs, hashes, baseline,
  scope: 'SHORT_SMOKE actual before/current Profiler API, same-raw real Vue provider and pure finite collection budget; prefill is functional data, not a performance benchmark or thousands of VM invocations.',
  notTested: ['Root-owned actual Core/WASM overflow bridge', 'Integrated GUI and general capture UI', 'Actual heap usage or formal diagnostic-overhead performance'] }
await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify({ status: report.status, checks: checks.length, failures: fail.length, report: normalize(relative(root, resolve(directory, 'report.json'))) })); if (fail.length) process.exitCode = 1
