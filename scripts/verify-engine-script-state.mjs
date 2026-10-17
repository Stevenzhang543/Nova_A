/** Actual script Owners and Vue bootstrap against byte-exact f3aa module baselines. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { build } from 'vite'
import ts from 'typescript'

const root = resolve(process.cwd()), before = process.argv.includes('--before'), stage = before ? 'before' : 'after'
const directory = join(root, '.cache/engine-overhaul/script-state'), temporary = await mkdtemp(join(tmpdir(), 'nova-script-state-'))
const files = ['src/runtime/scriptDebug.ts', 'src/runtime/scriptSettings.ts', 'src/runtime/scriptHotReload.ts', 'src/runtime/scriptCoverage.ts', 'src/runtime/scriptContracts.ts']
const normalize = value => value.replaceAll('\\', '/'), hash = value => createHash('sha256').update(value).digest('hex')
const vueEntry = normalize(join(dirname(createRequire(import.meta.url).resolve('vue/package.json')), 'dist/vue.runtime.esm-bundler.js'))
const checks = [], originals = new Map(), sourceHashes = {}, moduleGraphs = {}, sourceGraphs = {}
const check = (name, operation) => { operation(); checks.push(name) }
let passed = false
try {
  for (const file of files) {
    const saved = await readFile(join(directory, 'before', file.replaceAll('/', '_')), 'utf8')
    originals.set(normalize(join(root, file)), saved)
    sourceHashes[file] = hash(before ? saved : await readFile(join(root, file)))
  }
  const definitions = {
    'src/runtime/scriptDebug.ts': 'debug',
    'src/runtime/scriptSettings.ts': 'settings',
    'src/runtime/scriptHotReload.ts': 'reload',
    'src/runtime/scriptCoverage.ts': 'coverage',
    'src/runtime/scriptContracts.ts': 'contracts'
  }
  const entry = join(temporary, 'entry.ts')
  await writeFile(entry, Object.entries(definitions).map(([file, name]) => `export * as ${name} from '${normalize(join(root, file))}';`).join('\n') +
    `\nexport { reactive, toRaw, isReactive, watch } from '${vueEntry}';\n` +
    (!before ? `export { installScriptStateAdapter } from '${normalize(join(root, 'src/runtime/scriptStateAdapter.ts'))}';\nexport { installEditorScriptState } from '${normalize(join(root, 'src/editor/scriptStateAdapter.ts'))}';` : ''))
  const originalPlugin = { name: 'f3aa-script-owner-originals', enforce: 'pre', load(id) { return originals.get(normalize(id)) } }
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: before ? [originalPlugin] : [], build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const api = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  const states = () => [api.debug.scriptDebugState, api.settings.scriptProjectSettings, api.reload.scriptHotReloadState, api.coverage.scriptCoverageState]
  const raw = states().map(api.toRaw), defaults = states().map(value => JSON.parse(JSON.stringify(value)))
  check('initial-Owners-are-single-targets-with-expected-host-default', () => { for (const state of states()) assert.equal(api.isReactive(state), before); assert.equal(raw[0].sessionRevision, 0); assert.equal(raw[1].apiVersion, 2); assert.equal(raw[2].activePlan, null); assert.equal(raw[3].revision, 0) })
  if (!before) {
    const conflictPath = join(temporary, 'bootstrap-conflict.mjs')
    await writeFile(conflictPath, await readFile(join(temporary, 'integration.mjs')))
    const conflict = await import(pathToFileURL(conflictPath).href)
    check('aggregate-preflight-rejects-prior-independent-bootstrap-without-partial-publish', () => {
      const untouched = [conflict.settings.scriptProjectSettings, conflict.reload.scriptHotReloadState, conflict.coverage.scriptCoverageState]
      conflict.debug.installScriptDebugStateAdapter(target => conflict.reactive(target))
      let calls = 0
      assert.throws(() => conflict.installScriptStateAdapter(target => { calls++; return conflict.reactive(target) }), /independent module bootstrap/)
      assert.equal(calls, 0); assert(conflict.isReactive(conflict.debug.scriptDebugState))
      assert.equal(conflict.settings.scriptProjectSettings, untouched[0]); assert.equal(conflict.reload.scriptHotReloadState, untouched[1]); assert.equal(conflict.coverage.scriptCoverageState, untouched[2])
      untouched.forEach(value => assert.equal(conflict.isReactive(value), false))
    })
    check('installer-construction-failure-publishes-no-partial-bindings', () => {
      let calls = 0
      assert.throws(() => api.installScriptStateAdapter(target => { if (++calls === 3) throw Error('third view failed'); return api.reactive(target) }), /third view failed/)
      assert.equal(calls, 3); states().forEach((state, index) => assert.equal(state, raw[index]))
    })
    check('installer-invalid-view-publishes-no-partial-bindings', () => {
      let calls = 0
      assert.throws(() => api.installScriptStateAdapter(target => ++calls === 3 ? null : api.reactive(target)), /all four/)
      states().forEach((state, index) => assert.equal(state, raw[index]))
    })
    api.installEditorScriptState()
    check('actual-Editor-bootstrap-wraps-the-same-four-raw-Owners', () => { states().forEach((state, index) => { assert(api.isReactive(state)); assert.equal(api.toRaw(state), raw[index]); assert.deepEqual(JSON.parse(JSON.stringify(state)), defaults[index]) }) })
    const wrapped = states()
    check('repeat-install-is-idempotent-and-never-rewraps', () => { api.installScriptStateAdapter(() => { throw Error('must not execute'); }); api.installEditorScriptState(); states().forEach((state, index) => assert.equal(state, wrapped[index])) })
  }
  const observed = { paused: [], settings: [], hotReload: [], coverage: [] }, disposers = [
    api.watch(() => api.debug.scriptDebugState.paused, value => observed.paused.push(value), { flush: 'sync' }),
    api.watch(() => api.settings.scriptProjectSettings.testing.coverageEnabled, value => observed.settings.push(value), { flush: 'sync' }),
    api.watch(() => api.reload.scriptHotReloadState.history[0]?.status, value => observed.hotReload.push(value), { flush: 'sync' }),
    // ScriptStudio's production subscription reads revision before computing the report.
    // fileFor returns the original raw record: a new deep-file-only watch was never guaranteed.
    api.watch(() => { void api.coverage.scriptCoverageState.revision; return api.coverage.scriptCoverageReport().files[0]?.coveredFunctions.length }, value => observed.coverage.push(value), { flush: 'sync' })
  ]
  api.debug.beginDebugSession()
  api.debug.pauseScriptDebugger({ entityUuid: 'entity', entityName: 'Entity', scriptUuid: 'script', functionName: 'update', line: 2 }, { count: 4 }, 'actual callback boundary')
  api.debug.addDebugWatch('count'); api.debug.selectDebugFrame(0)
  check('unchanged-Debug-functions-pause-watch-and-retain-raw-snapshot', () => { assert.equal(api.debug.scriptDebugState.paused, true); assert.equal(api.debug.scriptDebugState.watches[0].value, '4'); assert.equal(api.debug.scriptDebugState.callStack.length, 1); assert.equal(api.debug.evaluateDebugExpression('count == 4'), true); assert.equal(api.toRaw(api.debug.scriptDebugState.locals).count, 4) })
  api.debug.clearScriptDebugger()
  check('actual-Vue-paused-watch-updates-from-original-functions', () => assert.deepEqual(observed.paused, [true, false]))
  const settings = api.settings.normalizeScriptSettings({ apiVersion: 1, customSignals: [' pulse ', 'pulse'], testing: { coverageEnabled: false, failOnEmpty: true }, remoteDebug: { enabled: true, host: 'external', port: 3, tokenHash: 'AB!CD' } })
  Object.assign(api.settings.scriptProjectSettings, settings)
  check('actual-normalize-load-save-shape-and-nested-Vue-watch-retained', () => { assert.deepEqual(api.settings.serializeScriptSettings(), settings); assert.deepEqual(observed.settings, [false]); assert.deepEqual(settings.customSignals, ['pulse']); assert.equal(settings.remoteDebug.host, '127.0.0.1'); assert.equal(settings.remoteDebug.port, 1024); assert.equal(settings.remoteDebug.tokenHash, 'abcd') })
  let continued = 0, stepped = '', cancelled = ''
  api.debug.bindDebugHost({ continue() { continued++ }, step(mode) { stepped = mode }, cancelTask(id) { cancelled = id; api.debug.updateDebugTask({ id, name: id, state: 'cancelled', entityUuid: 'entity', detail: 'real host' }); return true } })
  const policy = { enabled: true, expectedTokenHash: 'a'.repeat(32), allowExportedPlayers: true }
  const initialized = api.debug.handleDebugProtocol({ id: 'init', method: 'initialize', address: '127.0.0.1', playerVersion: 'test', tokenHash: 'a'.repeat(32) }, policy)
  check('old-public-protocol-auth-and-capability-API-remains-real', () => { assert.equal(initialized.result.version, 4); assert.equal(initialized.result.capabilities, api.debug.DEBUG_CAPABILITIES); assert.equal(initialized.result.capabilities.vmSuspension, false) })
  api.debug.pauseScriptDebugger({ entityUuid: 'entity', entityName: 'Entity', scriptUuid: 'script', functionName: 'update', line: 2 }, { count: 5 }, 'protocol snapshot')
  const session = api.debug.scriptDebugState.sessionRevision, pause = api.debug.scriptDebugState.pauseCount
  const request = method => ({ id: method, method, sessionRevision: session, pauseId: pause })
  check('public-protocol-rejects-stale-epochs-and-calls-real-host', () => {
    assert.equal(api.debug.handleDebugProtocol({ ...request('continue'), sessionRevision: session - 1 }, policy).error.code, 'NOVA-DEBUG-STALE')
    api.debug.handleDebugProtocol(request('continue'), policy); assert.equal(continued, 1)
    api.debug.handleDebugProtocol(request('stepIn'), policy); assert.equal(stepped, 'into')
    api.debug.handleDebugProtocol({ ...request('cancelTask'), taskId: 'task' }, policy); assert.equal(cancelled, 'task')
  })
  api.debug.bindDebugHost(null)
  check('old-host-unbind-clears-auth-task-and-pause-fields', () => { assert.equal(api.debug.scriptDebugState.remotePeer, null); assert.equal(api.debug.scriptDebugState.tasks.length, 0); assert.equal(api.debug.scriptDebugState.paused, false) })
  const shape = [{ name: 'count', valueType: 'int', serialized: true }], previousSource = '@export let count=0; fn update(dt){count+=1;}', candidateSource = '@export let count=0; fn update(dt){count+=2;}'
  const plan = api.reload.prepareHotReload('owner-script', previousSource, candidateSource, shape, shape, 'preserve')
  check('original-HotReload-plan-and-Vue-history-update-remain-canonical', () => { assert.equal(plan.classification, 'compatible'); assert.equal(api.toRaw(api.reload.scriptHotReloadState.activePlan), plan); assert.equal(observed.hotReload.at(-1), 'prepared') })
  api.reload.commitHotReload(plan); const rollback = api.reload.peekHotReloadRollback('owner-script')
  check('HotReload-commit-retains-real-source-and-detached-history', () => { assert.equal(rollback.source, previousSource); assert.equal(rollback.historyId, plan.id); assert.equal(observed.hotReload.at(-1), 'committed'); const history = api.reload.hotReloadHistory(); history[0].message = 'detached'; assert.notEqual(api.reload.scriptHotReloadState.history[0].message, 'detached') })
  assert.equal(api.reload.rollbackHotReload('owner-script'), previousSource)
  check('HotReload-rollback-and-clear-retain-original-session-rules', () => { assert.equal(api.reload.scriptHotReloadState.history[0].status, 'rolled-back'); api.reload.clearHotReloadSession(); assert.equal(api.reload.scriptHotReloadState.activePlan, null); assert.deepEqual(api.reload.scriptHotReloadState.rollbackSources, {}); assert.equal(api.reload.scriptHotReloadState.history.length, 1) })
  api.coverage.resetScriptCoverage(); api.coverage.recordScriptCoverage('owner-script', candidateSource, 'update'); api.coverage.flushScriptCoverage()
  const report = api.coverage.scriptCoverageReport()
  check('original-Coverage-functions-record-and-export-with-actual-Vue-notification', () => { assert.equal(report.files[0].scriptUuid, 'owner-script'); assert.deepEqual(report.files[0].coveredFunctions, ['update']); assert(observed.coverage.includes(1)); assert.match(api.coverage.scriptCoverageLcov(report), /FNDA:1,update/) })
  report.files[0].coveredFunctions.splice(0)
  check('Coverage-report-remains-detached-and-reset-owns-the-same-target', () => { assert.deepEqual(api.coverage.scriptCoverageReport().files[0].coveredFunctions, ['update']); api.coverage.resetScriptCoverage(); assert.equal(api.toRaw(api.coverage.scriptCoverageState), raw[3]); assert.deepEqual(api.coverage.scriptCoverageState.files, {}) })
  for (const dispose of disposers) dispose()
  if (!before) {
    for (const file of files) {
      const saved = ts.createSourceFile(file, originals.get(normalize(join(root, file))), ts.ScriptTarget.Latest, true)
      const current = ts.createSourceFile(file, await readFile(join(root, file), 'utf8'), ts.ScriptTarget.Latest, true)
      const functions = syntax => new Map(syntax.statements.filter(ts.isFunctionDeclaration).map(node => [node.name.text, node.body.getText(syntax)]))
      const oldFunctions = functions(saved), currentFunctions = functions(current)
      check('all-original-function-bodies-unchanged:' + file, () => { for (const [name, body] of oldFunctions) assert.equal(currentFunctions.get(name), body, name) })
      if (file !== 'src/runtime/scriptContracts.ts') {
        const stateName = { 'src/runtime/scriptDebug.ts': 'scriptDebugState', 'src/runtime/scriptSettings.ts': 'scriptProjectSettings', 'src/runtime/scriptHotReload.ts': 'scriptHotReloadState', 'src/runtime/scriptCoverage.ts': 'scriptCoverageState' }[file]
        const declaration = syntax => syntax.statements.filter(ts.isVariableStatement).flatMap(node => [...node.declarationList.declarations]).find(node => node.name.getText(syntax) === stateName)
        check('all-original-state-fields-and-default-literals-unchanged:' + file, () => assert.equal(declaration(current).initializer.getText(current), declaration(saved).initializer.arguments[0].getText(saved)))
      }
      const exports = syntax => syntax.statements.filter(node => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)).flatMap(node => node.name ? [node.name.text] : ts.isVariableStatement(node) ? node.declarationList.declarations.map(item => item.name.text) : [])
      check('all-original-public-export-names-retained:' + file, () => { const now = new Set(exports(current)); for (const name of exports(saved)) assert(now.has(name), name) })
    }
    const pureEntries = ['src/runtime/scriptStateAdapter.ts', 'src/runtime/scriptContracts.ts', 'src/runtime/scriptCoverage.ts', 'src/runtime/scriptHotReload.ts', 'src/runtime/scriptTestExecution.ts']
    for (let index = 0; index < pureEntries.length; index++) {
      const modules = new Set(), path = pureEntries[index]
      await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{ name: 'capture-owner-production-graph', generateBundle() { for (const id of this.getModuleIds()) modules.add(normalize(id)) } }], build: { ssr: true, outDir: join(temporary, 'graph-' + index), emptyOutDir: true, rollupOptions: { input: join(root, path) } } })
      const forbidden = [...modules].filter(id => /\/src\/(?:editor|store|assets)\/|\/node_modules\/(?:\.pnpm\/(?:vue@|@vue\+|pinia@)|vue\/|@vue\/|pinia\/)/.test(id))
      moduleGraphs[path] = { modules: [...modules].filter(id => id.startsWith(normalize(root))).map(id => id.slice(root.length + 1)), forbidden }
      check('actual-compiled-consumer-has-no-Editor-Vue:' + path, () => assert.deepEqual(forbidden, []))
      const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile)
      assert.equal(config.error, undefined)
      const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
      const pending = [join(root, path)], visited = new Set(), edges = [], invalid = []
      for (let cursor = 0; cursor < pending.length; cursor++) {
        const file = pending[cursor]
        if (visited.has(file)) continue
        visited.add(file)
        const syntax = ts.createSourceFile(file, await readFile(file, 'utf8'), ts.ScriptTarget.Latest, true)
        const references = new Set()
        const add = literal => { if (literal && ts.isStringLiteralLike(literal)) references.add(literal.text) }
        function visit(node) {
          if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier)
          if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal)
          if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression)
          if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) add(node.arguments[0])
          ts.forEachChild(node, visit)
        }
        visit(syntax)
        for (const specifier of references) {
          const resolution = ts.resolveModuleName(specifier, file, options, ts.sys).resolvedModule
          const target = resolution ? normalize(resolve(resolution.resolvedFileName)) : null
          const edge = { from: normalize(file).slice(root.length + 1), specifier, target: target?.startsWith(normalize(root) + '/') ? target.slice(root.length + 1) : target }
          edges.push(edge)
          if (/^(?:vue|@vue\/|pinia)/.test(specifier) || target && /\/src\/(?:editor|store|components|layout|ui)\/|\/src\/assets\/(?:AssetDatabase|importPipeline)\./.test(target)) invalid.push(edge)
          else if (target?.startsWith(normalize(root) + '/src/')) pending.push(target)
          else if (!resolution && specifier.startsWith('.')) invalid.push({ ...edge, unresolved: true })
        }
      }
      sourceGraphs[path] = { modules: [...visited].map(value => normalize(value).slice(root.length + 1)), edges, forbiddenOrUnresolved: invalid }
      check('actual-source-including-type-imports-has-no-Editor-Vue:' + path, () => assert.deepEqual(invalid, []))
    }
  }
  passed = true
} finally {
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, stage + '.json'), JSON.stringify({ generatedAt: new Date().toISOString(), stage, status: passed ? 'passed' : 'failed', checks, sourceHashes, moduleGraphs, sourceGraphs, scope: 'Actual shared script states/functions and Vue bootstrap; byte-exact f3aa four-state/Contracts before. No complete Runtime/Player or browser UI qualification.' }, null, 2))
  await rm(temporary, { recursive: true, force: true })
  console.log(`Script states ${stage}: ${checks.length} checks ${passed ? 'passed' : 'failed'}`)
}
