/** Actual pure Profiler Owner and same-raw Vue provider. Functional smoke; no performance qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import ts from 'typescript'

const root = process.cwd(), normalize = value => value.replaceAll('\\', '/')
const directory = resolve(process.env.NOVA_PROFILER_STATE_REPORT ?? 'release-audits/engine-profiler-state-20261006')
const baselinePath = resolve('release-audits/engine-profiler-owner-slice-20261006/baseline.json')
const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))
const owner = resolve('src/runtime/profiler.ts'), editor = resolve('src/editor/performanceStateAdapter.ts')
const checks = [], graphs = {}, hashes = {}, failures = [], policyEvidence = {}
await mkdir(directory, { recursive: true })
const check = async (name, action) => { try { await action(); checks.push({ name, status: 'passed' }) } catch (error) { const detail = { name, status: 'failed', error: String(error.stack ?? error) }; checks.push(detail); failures.push(detail) } }
const digest = data => createHash('sha256').update(data).digest('hex')
const oldSources = new Map()
for (const row of baseline.sources) {
  const source = await readFile(resolve(row.snapshot), 'utf8')
  assert.equal(digest(source), row.sha256, 'immutable baseline ' + row.path)
  oldSources.set(normalize(resolve(row.path)), source)
  hashes['before:' + row.path] = row.sha256
}
const forbidden = id => /(?:node_modules\/.*(?:vue|pinia)|\/src\/(?:editor|store|components|layout|ui|platform)\/|\/src\/assets\/(?:AssetDatabase|importPipeline)\.)/.test(normalize(id))
const capturePlugin = (phase, graph) => ({
  name: 'profiler-owner-' + phase, enforce: 'pre',
  load(id) { if (phase === 'before') return oldSources.get(normalize(id)) ?? null },
  generateBundle() { graph.push(...this.getModuleIds()) }
})
const singleChunk = result => (Array.isArray(result) ? result.flatMap(value => value.output) : result.output).find(value => value.type === 'chunk').code
for (const phase of ['before', 'after']) {
  const graph = graphs[phase] = []
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [capturePlugin(phase, graph)],
    build: { ssr: true, write: false, rollupOptions: { input: owner, output: { inlineDynamicImports: true } } } })
}
await check('compiled-pure-Profiler-graph-removes-the-confirmed-Vue-dependency', () => {
  assert(graphs.before.some(forbidden)); assert.deepEqual(graphs.after.filter(forbidden), [])
  assert.equal(typeof globalThis.document, 'undefined'); assert.equal(typeof globalThis.window, 'undefined')
})

const config = ts.readConfigFile(resolve('tsconfig.json'), ts.sys.readFile)
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
const pending = [owner], visited = new Set(), edges = [], violations = []
while (pending.length) {
  const file = normalize(pending.pop()); if (visited.has(file)) continue; visited.add(file)
  const text = await readFile(file, 'utf8'), tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true), references = []
  for (const statement of tree.statements) if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) references.push(statement.moduleSpecifier.text)
  const visit = node => { if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require') && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) references.push(node.arguments[0].text); ts.forEachChild(node, visit) }; visit(tree)
  for (const specifier of references) {
    const resolution = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule
    const target = resolution ? normalize(resolve(resolution.resolvedFileName)) : null
    const edge = { from: normalize(relative(root, file)), specifier, target: target ? normalize(relative(root, target)) : null }; edges.push(edge)
    if (/^(?:vue|@vue\/|pinia)/.test(specifier) || target && forbidden(target)) violations.push(edge)
    else if (target?.startsWith(normalize(root) + '/src/')) pending.push(target)
    else if (!resolution && specifier.startsWith('.')) violations.push({ ...edge, unresolved: true })
  }
}
graphs.source = { modules: [...visited].map(value => normalize(relative(root, value))), edges, violations }
await check('source-including-type-imports-is-pure-and-Profiler-has-no-DOM-clock-loop', async () => {
  assert.deepEqual(violations, [])
  const tree = ts.createSourceFile(owner, await readFile(owner, 'utf8'), ts.ScriptTarget.Latest, true), bad = []
  const globals = new Set(['window', 'document', 'localStorage', 'sessionStorage', 'requestAnimationFrame', 'cancelAnimationFrame', 'setTimeout', 'setInterval', 'Worker', 'HTMLElement'])
  const visit = node => { if (ts.isIdentifier(node) && globals.has(node.text)) bad.push(node.text); ts.forEachChild(node, visit) }; visit(tree)
  assert.deepEqual(bad, [])
})
await check('original-types-defaults-and-algorithms-change-only-unwrap-port-and-explicit-Off-guard', async () => {
  const beforeTree = ts.createSourceFile(owner, oldSources.get(normalize(owner)), ts.ScriptTarget.Latest, true)
  const afterTree = ts.createSourceFile(owner, await readFile(owner, 'utf8'), ts.ScriptTarget.Latest, true)
  const printer = ts.createPrinter({ removeComments: true })
  const print = (node, tree) => printer.printNode(ts.EmitHint.Unspecified, node, tree).replaceAll('toRaw(', 'unwrapProfilerState(')
  for (const previous of beforeTree.statements) {
    if (ts.isFunctionDeclaration(previous) || ts.isInterfaceDeclaration(previous) || ts.isTypeAliasDeclaration(previous)) {
      const current = afterTree.statements.find(node => node.kind === previous.kind && node.name?.text === previous.name?.text)
      assert(current, previous.name.text)
      if (previous.name.text === 'recordScriptFunction') {
        assert.equal(print(current.body.statements[0], afterTree), 'if (!shouldRecordScriptFunction() || !Number.isFinite(durationMs))\n    return;')
        const introduced = current.body.statements.filter(node => /^(?:const newIdentity =|const weight =|if \(newIdentity)/.test(node.getText(afterTree)))
        assert.equal(introduced.length, 4, 'exactly four collection admission/publication statements')
        assert(introduced.some(node => node.getText(afterTree).includes('scriptCollectionBudget.canAdmit(weight)')))
        assert(introduced.some(node => node.getText(afterTree).includes('scriptCollectionBudget.admit(weight)')))
        assert.deepEqual(current.body.statements.slice(1).filter(node => !introduced.includes(node)).map(node => print(node, afterTree)), previous.body.statements.slice(1).map(node => print(node, beforeTree)))
      } else if (previous.name.text === 'ScriptProfileCapture') {
        const originalMembers = current.members.filter(node => node.name?.text !== 'collection')
        const stripped = ts.factory.updateInterfaceDeclaration(current, current.modifiers, current.name, current.typeParameters, current.heritageClauses, originalMembers)
        assert.equal(print(stripped, afterTree), print(previous, beforeTree))
      } else if (previous.name.text === 'captureScriptProfile') {
        assert.equal(print(current, afterTree).replace('collection: currentScriptProfileCollection(), ', ''), print(previous, beforeTree))
      } else if (previous.name.text === 'clearProfiler') {
        assert.equal(print(current, afterTree).replace('    profilerState.scriptCollection = scriptCollectionBudget.clear();\n', ''), print(previous, beforeTree))
      } else if (previous.name.text === 'installProfilerStateAdapter') {
        assert.equal(print(current, afterTree).replace(", 'scriptCollection'", ''), print(previous, beforeTree))
      } else assert.equal(print(current, afterTree), print(previous, beforeTree), previous.name.text)
    }
  }
  const initializer = (tree, name) => tree.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.text === name).initializer
  const currentDefault = initializer(afterTree, 'rawProfilerState')
  const strippedDefault = ts.factory.updateObjectLiteralExpression(currentDefault, currentDefault.properties.filter(node => node.name?.text !== 'scriptCollection'))
  assert.equal(print(strippedDefault, afterTree), print(initializer(beforeTree, 'profilerState').arguments[0], beforeTree))
  assert.equal(print(initializer(afterTree, 'EMPTY'), afterTree), print(initializer(beforeTree, 'EMPTY'), beforeTree))
})

const entry = resolve(directory, 'contract-entry.ts')
await writeFile(entry, `export * as profiler from '${normalize(owner)}';\nexport * as editor from '${normalize(editor)}';\nexport * as production from '${normalize(resolve('src/runtime/production.ts'))}';\nexport * as runtime from '${normalize(resolve('src/runtime/largeWorldPerformance.ts'))}';\nexport {reactive,toRaw,isReactive,watch} from 'vue';\nimport {profilerState} from '${normalize(owner)}';\nexport function liveProfiler(){return profilerState}\n`)
const modules = {}
for (const phase of ['before', 'after']) {
  const result = await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [capturePlugin(phase, [])],
    build: { ssr: true, write: false, rollupOptions: { input: entry, output: { inlineDynamicImports: true } } } })
  const code = singleChunk(result), output = resolve(directory, phase + '.mjs')
  await writeFile(output, code); hashes[phase + ':contract-artifact'] = digest(code)
  modules[phase] = await import(pathToFileURL(output).href)
  if (phase === 'after') { const editorOutput = resolve(directory, 'after-editor.mjs'); await writeFile(editorOutput, code); modules.editor = await import(pathToFileURL(editorOutput).href) }
}
const originalPerformance = Object.getOwnPropertyDescriptor(globalThis, 'performance')
let clock = 1000
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => clock } })
// Compare every original field; the new collection metadata has a dedicated stricter budget verifier.
const projection = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'collection' || key === 'scriptCollection' ? undefined : key === 'createdAt' ? '<validated ISO timestamp>' : item))
const before = modules.before.profiler, plain = modules.after.profiler, hosted = modules.editor.profiler
const plainRaw = plain.profilerState, hostedRaw = hosted.profilerState
const defaults = projection(before.profilerState)
try {
  await check('all-original-default-fields-remain-identical-and-Runtime-is-plain', () => {
    assert.deepEqual(projection(plainRaw), defaults); assert.deepEqual(projection(hostedRaw), defaults)
    assert.equal(modules.after.isReactive(plainRaw), false); assert.equal(modules.before.isReactive(before.profilerState), true)
    assert.equal(plain.currentPerformanceSamplingScope(4).profilerIntervalSummaryCapacity, 240)
  })
  await check('before-confirmed-Off-still-aggregates-while-after-rejects-with-no-statistics-mutation', () => {
    before.profilerState.overheadMode = 'Off'; before.recordScriptFunction('off', 'Off', 'update', 7, 8)
    assert.equal(before.profilerState.scriptFunctions[0].calls, 1)
    policyEvidence.off = { before: projection(before.profilerState.scriptFunctions), after: {} }
    for (const p of [plain, hosted]) { p.profilerState.overheadMode = 'Off'; assert.equal(p.shouldRecordScriptFunction(), false); p.recordScriptFunction('off', 'Off', 'update', 7, 8); assert.equal(p.profilerState.scriptFunctions.length, 0); p.profilerState.overheadMode = 'Low overhead' }
    policyEvidence.off.after = { plain: projection(plain.profilerState.scriptFunctions), editorTargetBeforeBootstrap: projection(hosted.profilerState.scriptFunctions) }
    before.clearProfiler(); before.profilerState.overheadMode = 'Low overhead'
  })
  await check('selector-enabled-frozen-and-all-three-overhead-modes-match-callee-policy', () => {
    for (const enabled of [false, true]) for (const frozen of [false, true]) for (const mode of ['Full', 'Low overhead', 'Off']) {
      Object.assign(plain.profilerState, { enabled, frozen, overheadMode: mode })
      assert.equal(plain.shouldRecordScriptFunction(), enabled && !frozen && mode !== 'Off')
      plain.clearProfiler(); plain.recordScriptFunction('selector', 'Selector', 'tick', 1, 2)
      assert.equal(plain.profilerState.scriptFunctions.length, enabled && !frozen && mode !== 'Off' ? 1 : 0)
    }
    Object.assign(plain.profilerState, { enabled: true, frozen: false, overheadMode: 'Low overhead' }); plain.clearProfiler()
  })
  await check('failed-host-construction-unwrap-clone-and-reentry-publish-no-view', () => {
    const p = hosted, m = modules.editor, identity = value => value
    for (const adapter of [
      { wrap: null, unwrap: identity },
      { wrap: () => { throw Error('construction failure') }, unwrap: identity },
      { wrap: target => ({ ...target }), unwrap: identity },
      { wrap: target => m.reactive(target), unwrap: view => { const raw = m.toRaw(view); return Array.isArray(raw) ? raw.slice() : raw } },
      { wrap: target => m.reactive(target), unwrap: () => { throw Error('unwrap failure') } },
      { wrap: target => { p.installProfilerStateAdapter({ wrap: identity, unwrap: identity }); return target }, unwrap: identity }
    ]) { assert.throws(() => p.installProfilerStateAdapter(adapter)); assert.equal(p.profilerState, hostedRaw); assert.equal(m.liveProfiler(), hostedRaw) }
  })
  const settingsRaw = modules.editor.runtime.performanceRuntimeSettings, runtimeRaw = modules.editor.runtime.performanceRuntimeState
  await check('existing-Editor-bootstrap-wraps-the-same-three-raw-Owners-and-live-import', () => {
    const m = modules.editor; m.editor.installEditorPerformanceState()
    assert(m.isReactive(hosted.profilerState)); assert.equal(m.toRaw(hosted.profilerState), hostedRaw)
    assert.equal(m.liveProfiler(), hosted.profilerState)
    assert.equal(m.toRaw(m.runtime.performanceRuntimeSettings), settingsRaw); assert.equal(m.toRaw(m.runtime.performanceRuntimeState), runtimeRaw)
    for (const key of ['current', 'samples', 'scriptFunctions', 'scriptCaptures', 'markers', 'counters', 'annotations']) assert.equal(m.toRaw(hosted.profilerState[key]), hostedRaw[key])
  })
  await check('repeat-installs-cannot-replace-the-view-or-call-a-new-host-provider', () => {
    const view = hosted.profilerState; let calls = 0
    hosted.installProfilerStateAdapter({ wrap: () => { calls++; throw Error('must not wrap') }, unwrap: () => { calls++; throw Error('must not unwrap') } })
    modules.editor.editor.installEditorPerformanceState(); assert.equal(calls, 0); assert.equal(hosted.profilerState, view)
  })

  const frame = { frameMs: 16, physicsMs: 1, renderingMs: 2, scriptsMs: 3, animationMs: 1, audioMs: 1, assetsMs: 1, otherMs: 1, inputMs: 1, fps: null, memoryMb: null, gpuMs: null, inputToSubmitMs: 4, inputToPixelMs: 99 }
  function actualTrace(m) {
    const p = m.profiler, state = p.profilerState; p.clearProfiler(); state.scriptCaptures.splice(0)
    Object.assign(state, { enabled: true, frozen: false, overheadMode: 'Full' }); clock = 1000
    const obsolete = p.beginProfilerMarker('obsolete'); p.clearProfiler(); clock = 1002; obsolete(); assert.equal(state.markers.length, 0)
    const once = p.beginProfilerMarker('once', 'custom', 'detail'); clock = 1005; once(); once(); assert.equal(state.markers.length, 1); assert.equal(state.markers[0].durationMs, 3)
    p.recordScriptFunction('script', 'Script', 'update', 4.5, 8.6); p.recordScriptFunction('script', 'Script', 'update', -2, -1); p.recordScriptFunction('bad', 'Bad', 'update', NaN, 1)
    assert.deepEqual(projection(state.scriptFunctions[0]), { scriptUuid: 'script', scriptName: 'Script', functionName: 'update', calls: 2, totalMs: 4.5, lastMs: 0, maximumMs: 4.5, allocationEstimateBytes: 9 })
    const captureA = p.captureScriptProfile('test-a'); p.recordScriptFunction('script', 'Script', 'update', 2, 3); const captureB = p.captureScriptProfile('test-b')
    assert.equal(captureA.entries[0].calls, 2); const comparison = p.compareScriptProfiles(captureA, captureB)
    clock = 1016; const sample = p.recordFrameProfile(frame); assert.equal(sample.inputToPixelMs, null); assert.equal(sample.gpuMs, null); assert.equal(state.capacity, m.production.productionSettings.performance.traceCapacity)
    const recorded = projection({ current: state.current, samples: state.samples, markers: state.markers, counters: state.counters, scripts: state.scriptFunctions, captureA, captureB, comparison, scope: p.currentPerformanceSamplingScope(4) })
    for (let index = 0; index < 17; index++) p.captureScriptProfile('capture-' + index)
    assert.equal(state.scriptCaptures.length, 16); assert.equal(state.scriptCaptures[0].engineVersion, 'capture-1')
    for (let index = 0; index < 130; index++) p.addProfilerAnnotation(' annotation-' + index + ' ')
    assert.equal(state.annotations.length, 128); assert.equal(state.annotations.at(-1).text, 'annotation-127')
    assert(state.scriptCaptures.every(value => Number.isFinite(Date.parse(value.createdAt))))
    const view = state, retained = projection(state.scriptCaptures); p.clearProfiler()
    assert.equal(p.profilerState, view); assert.deepEqual(projection(state.scriptCaptures), retained); assert.equal(state.current.frame, 0)
    p.recordScriptFunction('script', 'Script', 'update', 1, 1); assert.equal(state.scriptFunctions[0].calls, 1)
    return recorded
  }
  let originalTrace, plainTrace, editorTrace
  await check('actual-original-vs-plain-vs-Editor-API-results-match-with-identical-controlled-clock', () => { originalTrace = actualTrace(modules.before); plainTrace = actualTrace(modules.after); editorTrace = actualTrace(modules.editor); assert.deepEqual(plainTrace, originalTrace); assert.deepEqual(editorTrace, originalTrace) })
  await writeFile(resolve(directory, 'same-input-api-traces.json'), JSON.stringify({ before: originalTrace, plain: plainTrace, editor: editorTrace }, null, 2) + '\n')
  await check('five-raw-array-truncations-retain-order-identity-and-actual-Vue-deep-watch', () => {
    for (const m of [modules.after, modules.editor]) {
      const p = m.profiler, state = p.profilerState; p.clearProfiler(); state.overheadMode = 'Full'
      const observed = [], stop = m.watch(() => state.counters.at(-1)?.value, value => observed.push(value), { flush: 'sync' })
      const counter = index => ({ frame: index, name: 'seed', value: index, unit: '' })
      state.counters = Array.from({ length: 9999 }, (_, index) => counter(index)); const rawItem = m.toRaw(state.counters)[1]
      p.recordProfilerCounter('new', 10001); p.recordProfilerCounter('new', 10002)
      assert.equal(state.counters.length, 10000); assert.equal(state.counters[0].value, 1); assert.equal(state.counters.at(-1).value, 10002); assert.equal(m.toRaw(state.counters)[0], rawItem)
      assert.equal(m.isReactive(m.toRaw(state.counters)[0]), false)
      stop(); if (m === modules.editor) assert(observed.includes(10002)); else assert.equal(observed.length, 0)
      const marker = index => ({ id: index, frame: index, name: 'seed', category: 'seed', startMs: index, durationMs: 1, detail: '' })
      state.markers = Array.from({ length: 10000 }, (_, index) => marker(index)); const end = p.beginProfilerMarker('last'); clock++; end()
      assert.equal(state.markers.length, 10000); assert.equal(state.markers[0].frame, 1); assert.equal(state.markers.at(-1).name, 'last')
      state.markers = Array.from({ length: 10000 }, (_, index) => marker(index)); state.counters = Array.from({ length: 10000 }, (_, index) => counter(index)); p.recordFrameProfile(frame)
      assert.equal(state.markers.length, 10000); assert.equal(state.markers[0].frame, 8); assert.equal(state.counters.length, 10000); assert.equal(state.counters[0].value, 2)
      const previous = m.production.productionSettings.performance.traceCapacity; m.production.productionSettings.performance.traceCapacity = 60
      try { state.samples.splice(0); for (let index = 0; index < 63; index++) { clock++; p.recordFrameProfile(frame) }; assert.equal(state.samples.length, 60); assert.equal(state.samples.at(-1).frame - state.samples[0].frame, 59); assert.equal(m.isReactive(m.toRaw(state.samples)[0]), false) } finally { m.production.productionSettings.performance.traceCapacity = previous }
    }
  })
  await check('actual-Vue-current-and-global-mode-watch-refresh-from-original-Owner-writes', () => {
    const m = modules.editor, p = hosted, gpu = [], mode = [], stops = [m.watch(() => p.profilerState.current.gpuMs, value => gpu.push(value), { flush: 'sync' }), m.watch(() => [p.profilerState.enabled, p.profilerState.overheadMode], value => mode.push(value), { flush: 'sync' })]
    try { p.recordFrameProfile({ ...frame, gpuMs: 5.25 }); p.recordFrameProfile(frame); p.profilerState.overheadMode = 'Off'; p.profilerState.enabled = false; assert.deepEqual(gpu, [5.25, null]); assert.deepEqual(mode, [[true, 'Off'], [false, 'Off']]); assert.equal(m.toRaw(p.profilerState), hostedRaw) } finally { stops.forEach(stop => stop()); Object.assign(p.profilerState, { enabled: true, frozen: false, overheadMode: 'Low overhead' }) }
  })
  await check('sampling-windows-frozen-history-and-unavailable-schema-remain-original', () => {
    const p = plain; p.clearProfiler(); p.profilerState.overheadMode = 'Low overhead'; p.recordFrameProfile(frame)
    const sample = p.profilerState.samples[0], length = p.profilerState.samples.length
    for (const key of ['fps', 'memoryMb', 'gpuMs', 'rafIntervalMs', 'submissionIntervalMs', 'inputToPixelMs']) assert.equal(sample[key], null)
    for (const [mode, cadence] of [['Full', 1], ['Low overhead', 4], ['Off', null]]) { p.profilerState.overheadMode = mode; const scope = p.currentPerformanceSamplingScope(7); assert.equal(scope.profilerSampleEveryHostFramesAtCapture, cadence); assert.equal(scope.runtimePublishEveryHostFramesAtCapture, 7); assert.equal(scope.profilerIntervalSummaryCapacity, 240); assert.equal(scope.historyMaySpanSamplingChangesAndPlayStop, true); assert.equal(p.profilerState.samples.length, length) }
    p.profilerState.overheadMode = 'Full'; p.profilerState.frozen = true; assert.equal(p.recordFrameProfile(frame), null); p.recordProfilerCounter('ignored', 1); const end = p.beginProfilerMarker('ignored'); end(); p.recordScriptFunction('ignored', 'Ignored', 'update', 1, 1); assert.equal(p.profilerState.samples.length, length)
    p.profilerState.frozen = false; p.profilerState.enabled = false; assert.equal(p.recordFrameProfile(frame), null); p.profilerState.enabled = true; p.profilerState.overheadMode = 'Low overhead'
  })
  await check('existing-2000-display-does-not-cap-private-aggregate-confirmed-and-preserved', () => {
    plain.clearProfiler(); for (let index = 0; index < 2001; index++) plain.recordScriptFunction('map-' + index, 'Map', 'tick', 0, 1)
    assert.equal(plain.profilerState.scriptFunctions.length, 2000); assert(!plain.profilerState.scriptFunctions.some(item => item.scriptUuid === 'map-2000'))
    plain.recordScriptFunction('map-2000', 'Map', 'tick', 100, 1); const retained = plain.profilerState.scriptFunctions[0]
    assert.equal(retained.scriptUuid, 'map-2000'); assert.equal(retained.calls, 2); assert.equal(retained.allocationEstimateBytes, 2)
    policyEvidence.collection = { distinctKeysSubmitted: 2001, displayCount: 2000, excludedItemRetainedAfterSecondUpdate: projection(retained), privateCollectionCapAdded: false }
    plain.clearProfiler(); plain.recordScriptFunction('map-2000', 'Map', 'tick', 1, 1); assert.equal(plain.profilerState.scriptFunctions[0].calls, 1)
  })
  await check('existing-main-installs-Editor-provider-before-GPU-diagnostics-watcher', async () => {
    const main = await readFile(resolve('src/main.ts'), 'utf8'); assert(main.indexOf('installEditorPerformanceState()') < main.indexOf('const disposeGpuDiagnosticsPolicy = watch(')); assert(main.includes("import { installEditorPerformanceState } from './editor/performanceStateAdapter'"))
  })
} finally { if (originalPerformance) Object.defineProperty(globalThis, 'performance', originalPerformance); else delete globalThis.performance }

for (const path of new Set(['src/runtime/profiler.ts', 'src/editor/performanceStateAdapter.ts', 'scripts/verify-engine-profiler-state.mjs', ...graphs.source.modules, 'src/main.ts', 'src/player.ts'])) hashes[path] = digest(await readFile(resolve(path)))
const moduleIdentity = []
const originalManifest = JSON.parse(await readFile(resolve('.cache/engine-overhaul/profile-dist-f3aa3/engine-build-manifest.json'), 'utf8'))
for (const id of graphs.after) if (normalize(id).startsWith(normalize(root) + '/src/')) { const path = normalize(relative(root, id)), sha256 = digest(await readFile(id)); const old = originalManifest.source.find(item => item.path === path); moduleIdentity.push({ path, sha256, matchesF3aa: sha256 === old?.sha256 }) }
const report = { format: 'nova-profiler-owner-verification', version: 1, generatedAt: new Date().toISOString(), status: failures.length ? 'failed' : 'passed', checks, graphs, hashes, moduleIdentity, policyEvidence,
  baseline: { buildId: baseline.buildId, sourceHash: baseline.sourceHash, before: baseline.sources },
  scope: 'SHORT_SMOKE actual same-input original/plain/Editor state functions and Vue subscriptions. No independent Player, whole Runtime M1 or performance qualification.',
  fixed: ['Profiler direct Vue import replaced by optional same-raw host wrap/unwrap', 'Off no longer aggregates or sorts script function statistics', 'Additive collection evidence is validated by verify-engine-profiler-collection; the original2001 admitted-case and all original fields remain compared here'],
  remaining: ['This callee test does not prove Core profiling argument preparation has been skipped; caller integration belongs to Root', 'Low overhead existing function aggregation and sort are preserved, not claimed free', 'Annotations retain the original first-128 policy, captures retain the latest-16, and clearProfiler retains captures'],
  association30: { imports: 'Source including type imports and compiled Profiler graph checked; actual Editor adapter remains host-only', consumers: 'Same public functions/live binding, original sampler/window/nullable schema/captures/markers and actual Vue deep subscriptions verified', projectsProtocolWasmResources: 'Not applicable: no project field, binary ABI, WASM, resource or backend change', entries: 'Existing Editor installation validated; independent Player production install is Root-owned and not GUI-tested here' },
  association64: { diagnosticPolicy: 'Off change separately tested against immutable original; no new frame clock or scheduling', logs: 'Same original fields/defaults/windows; unknown physical latency remains null; no Map cap/Top semantics change', renderingQualityMotion: 'Not applicable: no pixel, QualityLocked, renderScale, motion, submission or GPU algorithm change' },
  notTested: ['New integrated optimized artifact GUI', 'Standalone pure Player or full Runtime/Player M1', 'Profiler perturbation A/B or formal B/X/H performance'] }
await writeFile(resolve(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ status: report.status, checks: checks.length, failures: failures.length, pureCompiledModules: graphs.after.length, sourceModules: visited.size, report: normalize(relative(root, resolve(directory, 'report.json'))) }))
if (failures.length) process.exitCode = 1
