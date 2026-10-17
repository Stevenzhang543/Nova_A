/** Exercise shared script analysis and retained Editor clients against byte-exact originals. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import ts from 'typescript'
import { rhaiCorpus } from './fixtures/v26.12-rhai-corpus.mjs'

const root = resolve(process.cwd()), directory = resolve(root, '.cache/engine-overhaul/script-analysis-source')
const originalWorker = globalThis.Worker, checks = [], modules = new Map(), sourceHashes = {}
const hash = value => createHash('sha256').update(value).digest('hex')
const normalize = path => path.replaceAll('\\', '/')
const originalNames = ['scriptLanguage', 'scriptLanguage26', 'scriptLanguageSyntax', 'scriptApi']
const originals = new Map()
for (const name of originalNames) originals.set(name, await readFile(resolve(directory, `before/src/editor/${name}.ts`), 'utf8'))
const virtual = name => `\0nova-original-${name}`
const canonical = value => JSON.parse(JSON.stringify(value, (key, item) => key === 'elapsedMs' ? undefined : item))
const check = async (name, run) => {
  try { await run(); checks.push({ name, status: 'passed' }) }
  catch (error) { checks.push({ name, status: 'failed', error: String(error?.stack ?? error) }); throw error }
}
let passed = false, integration, analysisModule
class WorkerProbe {
  static instances = []
  sent = []; terminated = 0
  constructor(url, options) { this.url = String(url); this.options = options; WorkerProbe.instances.push(this) }
  postMessage(message) { this.sent.push(message) }
  terminate() { this.terminated++ }
}
try {
  const entry = resolve(directory, 'integration-entry.ts')
  await writeFile(entry, [
    `export * as Original from '${virtual('scriptLanguage')}';`,
    `export * as OriginalApi from '${virtual('scriptApi')}';`,
    `export * as OriginalAnnotations from '${virtual('scriptLanguage26')}';`,
    ...[['Editor', 'editor/scriptLanguage'], ['Analysis', 'runtime/scriptAnalysis'], ['Api', 'runtime/scriptApiCatalog'], ['EditorApi', 'editor/scriptApi'], ['Annotations', 'runtime/scriptAnalysisAnnotations'], ['EditorAnnotations', 'editor/scriptLanguage26'], ['Syntax', 'runtime/scriptAnalysisSyntax'], ['EditorSyntax', 'editor/scriptLanguageSyntax']].map(([name, path]) => `export * as ${name} from '${normalize(resolve(root, `src/${path}.ts`))}';`)
  ].join('\n').replaceAll('\0', '\\0'))
  await build({ configFile: false, root, logLevel: 'error', plugins: [{
    name: 'original-analysis-reference', enforce: 'pre',
    resolveId(id) { if (id.startsWith('\0nova-original-')) return id },
    load(id) {
      if (!id.startsWith('\0nova-original-')) return
      const name = id.slice('\0nova-original-'.length), text = originals.get(name)
      assert(text, `Unexpected original module ${name}`)
      const imports = text.replace(/from '([^']+)'/g, (whole, specifier) => {
        if (specifier.startsWith('./')) return `from ${JSON.stringify(virtual(specifier.slice(2)))}`
        if (specifier.startsWith('../visual/')) return `from ${JSON.stringify(normalize(resolve(root, 'src/editor', specifier)))}`
        return whole
      })
      return ts.transpileModule(imports, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext }, fileName: `${name}.ts` }).outputText
    },
    generateBundle() {
      for (const id of this.getModuleIds()) if (normalize(id).startsWith(normalize(resolve(root, 'src')) + '/')) modules.set(normalize(id), this.getModuleInfo(id)?.importedIds ?? [])
    }
  }], build: { ssr: true, outDir: resolve(directory, 'compiled'), emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  globalThis.Worker = undefined
  integration = await import(pathToFileURL(resolve(directory, 'compiled/integration.mjs')).href)
  const { Original: old, Editor: editor, Analysis: current } = integration
  analysisModule = current
  await check('all-Editor-public-value-exports-retained-and-shared-algorithm-identity', () => {
    assert.deepEqual(Object.keys(editor).sort(), Object.keys(old).sort())
    for (const name of Object.keys(current)) assert.strictEqual(editor[name], current[name], name)
    assert.equal('ScriptLanguageService' in current, false)
    assert.equal('ScriptWorkspaceIndex' in current, false)
    assert.equal('handleScriptProtocol' in current, false)
    assert.deepEqual(canonical(integration.Api), canonical(integration.OriginalApi))
    for (const name of Object.keys(integration.Api)) assert.strictEqual(integration.EditorApi[name], integration.Api[name])
    for (const name of Object.keys(integration.Annotations)) assert.strictEqual(integration.EditorAnnotations[name], integration.Annotations[name])
    for (const name of Object.keys(integration.Syntax)) assert.strictEqual(integration.EditorSyntax[name], integration.Syntax[name])
  })
  const extra = [
    '// 😀\r\n// @test timeout=25 tags=core cases=1|2\r\nfn test_value(){print("中文");}\r\n',
    '/// @struct Damage amount:Number, source:Entity?\n/// @type speed: Number\nlet speed=1.0;\nfn update(dt){speed+=dt;}',
    'use "shared";\nfn start(){shared_value();unknown_typo();}',
    'fn start(){',
    'fn f(x){} fn f(y){}',
    '@export let speed=1.0; fn start(){set_position(speed, 2.0);}'
  ]
  for (const [index, source] of [...rhaiCorpus.map(fixture => fixture.source), ...extra].entries()) await check(`original-analysis-output-${index}`, () => {
    for (const apiVersion of [1, 2]) {
      const before = old.analyzeScript(source, apiVersion, 17, ['shared_value']), after = current.analyzeScript(source, apiVersion, 17, ['shared_value'])
      assert.deepEqual(canonical(after), canonical(before))
      assert.deepEqual(integration.Annotations.analyzeScript26(source), integration.OriginalAnnotations.analyzeScript26(source))
      for (const prefix of ['', 'set_', 'shared_', 'test_']) assert.deepEqual(current.completionDetails(prefix, after), old.completionDetails(prefix, before))
      for (const symbol of ['set_position', 'shared_value', 'unknown_typo']) {
        assert.deepEqual(current.hoverInfo(symbol, after), old.hoverInfo(symbol, before))
        assert.deepEqual(current.parameterHint(symbol, 1), old.parameterHint(symbol, 1))
      }
      assert.deepEqual(current.scriptCodeActions(after), old.scriptCodeActions(before))
      assert.deepEqual(current.applyScriptLintPolicy(after, { deprecatedApi: 'error', shadowing: 'off', unusedSymbols: 'warning' }), { ...old.applyScriptLintPolicy(before, { deprecatedApi: 'error', shadowing: 'off', unusedSymbols: 'warning' }), elapsedMs: after.elapsedMs })
    }
    assert.equal(current.formatScript(source, { indentSize: 4, finalNewline: true }), old.formatScript(source, { indentSize: 4, finalNewline: true }))
  })
  await check('binding-rename-keeps-shadowed-comment-and-string-reference', () => {
    const source = '// value\r\nfn start(){let value=4;{let value=8;print(value);}let f=|x|value+x;print("value");print(f.call(1));}'
    const selection = { offset: source.indexOf('let value') + 5 }
    const actual = current.renameScriptSymbol(source, 'value', 'amount', selection)
    assert.equal(actual, old.renameScriptSymbol(source, 'value', 'amount', selection))
    assert.match(actual, /let amount=4/); assert.match(actual, /let value=8/); assert.match(actual, /"value"/)
    assert.throws(() => current.renameScriptSymbol(source, 'value', 'amount'), /multiple bindings/)
  })
  const wasm = await import(pathToFileURL(resolve(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: await readFile(resolve(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const execute = source => {
    const vm = new wasm.WasmScriptRuntime()
    try { return { result: JSON.parse(vm.execute_json(source, 'start', '{"entity":"analysis-migration"}')) } }
    catch (error) { return { error: String(error) } }
    finally { vm.free() }
  }
  for (const fixture of rhaiCorpus) await check(`actual-WASM-formatted-corpus-${fixture.name}`, () => {
    const before = execute(fixture.source), after = execute(current.formatScript(fixture.source, { indentSize: 4 }))
    if (fixture.error) { assert.match(before.error, fixture.error); assert.match(after.error, fixture.error) }
    else {
      assert.equal(before.error, undefined); assert.equal(after.error, undefined)
      for (const key of ['commands', 'logs', 'properties']) assert.deepEqual(after.result[key], before.result[key])
      assert.deepEqual(before.result.logs.map(item => item.message), fixture.logs)
    }
  })
  await check('Editor-workspace-cache-revision-protocol-and-snapshot-remain', () => {
    const index = new editor.ScriptWorkspaceIndex(), source = 'fn current(){print(1);}'
    const first = index.update('current.rhai', source, 2, 12)
    assert.strictEqual(index.update('current.rhai', source, 2, 12), first)
    assert.notStrictEqual(index.update('current.rhai', source, 2, 13), first)
    assert.equal(editor.handleScriptProtocol(index, { id: 4, method: 'textDocument/definition', params: { symbol: 'current' } }).result.uri, 'current.rhai')
    const snapshot = index.snapshot(); index.clear(); assert.equal(index.restore(snapshot), 1)
    assert.equal(index.document('current.rhai').analysis.revision, 13)
    assert.throws(() => index.restore('{"format":"bad"}'), /Unsupported/)
  })
  globalThis.Worker = WorkerProbe
  await check('Editor-worker-retarget-abort-and-late-reply-cannot-reapply', async () => {
    const service = new editor.ScriptLanguageService(), worker = WorkerProbe.instances.at(-1), signal = new AbortController()
    assert.equal(worker.options.name, 'nova-script-language')
    const first = service.analyze('fn old(){}', { revision: 1 }), second = service.analyze('fn current(){}', { revision: 2, signal: signal.signal })
    assert((await first).functions.old)
    worker.onmessage({ data: { id: worker.sent[0].id, analysis: current.analyzeScript('fn stale(){}', 2, 1) } })
    signal.abort(); assert((await second).functions.current)
    worker.onmessage({ data: { id: worker.sent[1].id, analysis: current.analyzeScript('fn stale(){}', 2, 2) } })
    assert.equal(service.pending.size, 0)
    service.dispose(); service.dispose(); assert.equal(worker.terminated, 1)
    assert.equal(worker.onmessage, null)
    assert((await service.analyze('fn after_dispose(){}', { revision: 3 })).functions.after_dispose)
  })
  for (const mismatch of ['revision', 'api', 'externals']) await check(`Editor-worker-wrong-${mismatch}-uses-current-source`, async () => {
    const service = new editor.ScriptLanguageService(), worker = WorkerProbe.instances.at(-1)
    const pending = service.analyze('fn current(){helper();}', { revision: 25, apiVersion: 2, externalFunctions: ['helper'] })
    worker.onmessage({ data: { id: worker.sent[0].id, analysis: current.analyzeScript('fn stale(){}', mismatch === 'api' ? 1 : 2, mismatch === 'revision' ? 24 : 25, mismatch === 'externals' ? [] : ['helper']) } })
    const actual = await pending; assert(actual.functions.current); assert.equal(actual.functions.stale, undefined); assert.equal(actual.revision, 25)
    service.dispose()
  })
  const pureEntry = resolve(directory, 'pure-entry.ts')
  await writeFile(pureEntry, `export * from '${normalize(resolve(root, 'src/runtime/scriptAnalysis.ts'))}';`)
  let pureGraph = []
  await build({ configFile: false, root, logLevel: 'error', plugins: [{ name: 'pure-analysis-graph', generateBundle() { pureGraph = [...this.getModuleIds()].filter(id => !id.startsWith('\0')).map(normalize) } }], build: { ssr: true, outDir: resolve(directory, 'compiled'), emptyOutDir: false, rollupOptions: { input: pureEntry, output: { entryFileNames: 'pure-analysis.mjs' } } } })
  await check('actual-pure-analysis-compiled-graph-has-no-Editor-Vue-or-Worker', () => {
    assert(pureGraph.some(id => id.endsWith('/src/runtime/scriptAnalysis.ts')))
    assert.equal(pureGraph.some(id => /\/src\/(?:editor|store|components|layout|ui)\/|\/node_modules\/.*(?:vue|pinia)/.test(id)), false)
    const source = analysisModule
    assert.equal('ScriptLanguageService' in source, false)
  })
  for (const id of new Set([...modules.keys(), ...pureGraph])) if (id.startsWith(normalize(root) + '/')) sourceHashes[id.slice(normalize(root).length + 1)] = hash(await readFile(id))
  sourceHashes['nova_core/pkg/nova_core_bg.wasm'] = hash(await readFile(resolve(root, 'nova_core/pkg/nova_core_bg.wasm')))
  await writeFile(resolve(directory, 'pure-compiled-graph.json'), JSON.stringify(pureGraph, null, 2) + '\n')
  passed = true
} finally {
  globalThis.Worker = originalWorker
  const report = { format: 'nova-engine-script-analysis-verification', version: 1, generatedAt: new Date().toISOString(), status: passed ? 'passed' : 'failed', checks, sourceHashes, originalHashes: Object.fromEntries([...originals].map(([name, value]) => [name, hash(value)])), scope: 'Algorithm equivalence, real WASM formatting and controlled Editor language-client lifecycle; not native VM, real Worker transport performance or complete Runtime/Player isolation.' }
  const reportPath = resolve(root, process.argv.find(value => value.startsWith('--report='))?.slice(9) ?? '.cache/engine-overhaul/script-analysis-source/verification.json')
  await mkdir(dirname(reportPath), { recursive: true }); await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ status: report.status, checks: checks.length, reportPath }))
}
