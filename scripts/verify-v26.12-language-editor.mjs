import {registerNodeBundle22,captureNodeBundle22} from './lib/nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { rhaiCorpus } from './fixtures/v26.12-rhai-corpus.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(), 'nova-v2612-editor-')), checks = [], failures = []
const check = (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { failures.push(error); checks.push({ name, status: 'failed', error: String(error) }) } }
try {
  await build({ configFile: false, root, logLevel: 'error', build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false, ssr:true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: join(root, 'src/editor/scriptLanguage.ts'), output: { entryFileNames: 'language.mjs' } } } })
  registerNodeBundle22(temporary)
  const { analyzeScript, completionDetails, hoverInfo, parameterHint, renameScriptSymbol, formatScript, ScriptWorkspaceIndex } = await import(pathToFileURL(join(temporary, 'language.mjs')).href)
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const run = code => { const runtime = new wasm.WasmScriptRuntime(); try { const { commands, logs, properties } = JSON.parse(runtime.execute_json(code, 'start', '{"entity":"editor-probe"}')); return { commands, logs, properties } } catch (error) { return { error: String(error) } } finally { runtime.free() } }
  for (const fixture of rhaiCorpus) check('real runtime corpus has no false editor errors: ' + fixture.name, () => {
    assert.deepEqual(analyzeScript(fixture.source).diagnostics.filter(item => item.severity === 'error'), [])
    const formatted = formatScript(fixture.source, { indentSize: 4 }), original = run(fixture.source), after = run(formatted)
    if (fixture.error) { assert.match(original.error, fixture.error); assert.match(after.error, fixture.error) } else { assert.equal(original.error, undefined); assert.deepEqual(after, original) }
  })
  check('standard calls, dynamic methods and captured closures are recognized', () => {
    const source = 'fn start(){let a=[1,2];let x=4;let f=|v|x+v;print(a.map(|v|v*2).len());print(f.call(3));print(elapsed(timestamp())>=0.0);}'
    assert.deepEqual(analyzeScript(source).diagnostics.filter(item => item.severity === 'error'), []); assert.equal(run(source).error, undefined)
    for (const name of ['timestamp', 'elapsed', 'Fn', 'map']) { assert.ok(completionDetails(name).some(item => item.label === name)); assert.ok(hoverInfo(name)); assert.ok(parameterHint(name)) }
    assert.match(parameterHint('set_position').signature, /float/)
    assert.deepEqual(completionDetails('sleep'), [])
  })
  check('scoped shadowing and overloads do not create duplicate errors or phantom names', () => {
    const source = '/* fn ghost(){ unknown(); } */\nfn f(x){let x=x+1;x} fn f(x,y){x+y}\nfn g(){let x=5;x}\nfn start(){print(f(1));print(f(2,3));}'
    const analysis = analyzeScript(source)
    assert.equal(analysis.symbols.filter(item => item.name === 'f').length, 2)
    assert.equal(analysis.symbols.some(item => item.name === 'ghost'), false)
    assert.deepEqual(analysis.diagnostics.filter(item => item.severity === 'error'), [])
    assert.equal(analysis.diagnostics.filter(item => item.code === 'NOVA-SEM-002').length, 1)
    assert.ok(analyzeScript('fn f(x){} fn f(y){}').diagnostics.some(item => item.code === 'NOVA-SEM-001'))
  })
  check('unknown typos remain errors while external function propagation survives', () => {
    const analysis = analyzeScript('use "shared";\nfn start(){shared_value();unknown_typo();}', 2, 8, ['shared_value'])
    assert.deepEqual(analysis.diagnostics.filter(item => item.code === 'NOVA-SEM-003').map(item => item.message), ['Unknown function “unknown_typo”.'])
    assert.ok(completionDetails('shared_', analysis).some(item => item.detail === 'Resolved project module function'))
    assert.equal(analysis.revision, 8)
    assert.ok(analyzeScript('fn start(){sleep(0);}').diagnostics.some(item => /disabled/.test(item.message)))
  })
  check('exact UTF16 token spans and test annotations survive typed analysis', () => {
    const source = '// 😀\r\n// @test timeout=25 tags=core cases=1|2\r\nfn test_value(){print("中文");}\r\n'
    const analysis = analyzeScript(source)
    assert.equal(analysis.tests[0].timeoutMs, 25); assert.deepEqual(analysis.tests[0].cases, ['1', '2'])
    assert.ok(analysis.semanticTokens.some(token => token.kind === 'comment' && token.line === 1 && token.length === 5))
    assert.equal(analysis.symbols[0].line, 3)
    assert.ok(analyzeScript('fn start(){').diagnostics.some(item => item.code.startsWith('NOVA-PARSE')))
  })
  const renameSource = '// value stays in commentary 😀\r\nfn start(){\r\nlet value=4;\r\n{let value=8;print(value);}\r\nlet f=|x|value+x;\r\nprint(value);print(f.call(1));print("value stays in a string");\r\n}\r\n'
  check('selected lexical rename preserves shadowed values, strings, comments and VM behavior', () => {
    const result = renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('let value') + 5 })
    assert.match(result, /let amount=4/); assert.match(result, /let value=8;print\(value\)/); assert.match(result, /\|x\|amount\+x/)
    assert.match(result, /\/\/ value stays/); assert.match(result, /"value stays in a string"/)
    assert.deepEqual(run(result), run(renameSource))
    assert.throws(() => renameScriptSymbol(renameSource, 'value', 'amount'), /multiple bindings/)
  })
  check('renaming a captured reference or a cursor at identifier end selects its binding', () => {
    const result = renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('|x|value') + '|x|value'.length })
    assert.match(result, /let amount=4/); assert.deepEqual(run(result), run(renameSource))
  })
  check('capture collisions, exported properties and dynamic method/pointer renames refuse before edits', () => {
    const collision = 'fn start(){let a=1;{let b=2;print(a+b);}}'
    assert.throws(() => renameScriptSymbol(collision, 'a', 'b'), /capture|binding/)
    assert.throws(() => renameScriptSymbol('@export let value=1;\nfn start(){print(value);}', 'value', 'other'), /property migration/)
    assert.throws(() => renameScriptSymbol('fn f(){1} fn start(){print(Fn("f").call());}', 'f', 'other'), /function-pointer/)
    assert.throws(() => renameScriptSymbol('fn int.twice(){this*2} fn start(){print(2.twice());}', 'twice', 'other'), /Method/)
  })
  check('workspace rename requires a single selected document and preserves other documents', () => {
    const index = new ScriptWorkspaceIndex(); index.update('first', renameSource); index.update('second', 'fn start(){let value=2;print(value);}')
    assert.throws(() => index.rename('value', 'amount'), /ambiguous workspace/)
    const result = index.rename('value', 'amount', { uri: 'first', offset: renameSource.indexOf('let value') + 4 })
    assert.deepEqual([...result.keys()], ['first']); assert.equal(index.document('second').source, 'fn start(){let value=2;print(value);}')
  })
  check('cross-module and dynamic function-pointer references refuse an incomplete rename', () => {
    const source = 'fn helper(){1} fn start(){print(helper());}'
    for (const external of ['fn start(){print(helper());}', 'fn start(){print(Fn("helper").call());}', 'fn start(){let name="helper";print(Fn(name).call());}', 'fn start(){print(1.helper());}']) assert.throws(() => renameScriptSymbol(source, 'helper', 'renamed', { externalSources: [external] }), /cross-module/)
    assert.throws(() => renameScriptSymbol('fn helper(){1} fn start(){let name="helper";print(Fn(name).call());}', 'helper', 'renamed'), /function-pointer/)
    assert.throws(() => renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('value stays') }), /bindings|binding/)
    const index = new ScriptWorkspaceIndex(); index.update('one', source); index.update('two', 'fn start(){print(Fn("helper").call());}')
    assert.throws(() => index.rename('helper', 'renamed', { uri: 'one', offset: 4 }), /cross-module/)
  })
  check('legacy diagnostic and JSONL protocol contracts remain available', () => {
    const analysis = analyzeScript('use "../escape.rhai";\nfn update(dt){old_unknown();is_down("Move");}\nfn update(dt){}')
    for (const code of ['NOVA-MODULE-001', 'NOVA-SEM-001', 'NOVA-SEM-003', 'NOVA-COMPAT-001']) assert.ok(analysis.diagnostics.some(item => item.code === code), code)
    const requests = [{ id: 1, method: 'textDocument/analyze', params: { uri: 'one', text: 'fn start(){print("ready");}' } }, { id: 2, method: 'textDocument/completion', params: { uri: 'one', prefix: 'timestamp' } }, { id: 3, method: 'shutdown', params: {} }]
    const process = spawnSync(globalThis.process.execPath, ['scripts/nova-rhai-language-server.mjs', '--legacy-jsonl'], { cwd: root, input: requests.map(item => JSON.stringify(item)).join('\n') + '\n', encoding: 'utf8', timeout: 30_000 })
    assert.equal(process.status, 0, process.stderr); const responses = process.stdout.trim().split('\n').map(text => JSON.parse(text)); assert.ok(responses.some(item => item.event === 'ready')); assert.ok(responses.find(item => item.id === 2).result.some(item => item.label === 'timestamp'))
  })
  check('formatter indents code but preserves multiline literal and comment lexemes', () => {
    const source = 'fn start() {\r\nlet raw=`first\r\n   {value}\r\nlast`;\r\n/* multi\r\n   comment */\r\nif true {\r\nprint(raw);\r\n}\r\n}\r\n'
    const formatted = formatScript(source)
    assert.match(formatted, /\r\n  if true \{\r\n    print\(raw\);\r\n  \}/)
    assert.match(formatted, /`first\r\n   \{value\}\r\nlast`/)
    assert.match(formatted, /\/\* multi\r\n   comment \*\//)
    assert.deepEqual(run(formatted), run(source)); assert.equal(formatScript(formatted), formatted)
    assert.equal(formatScript('fn start(){'), 'fn start(){')
    assert.equal(formatScript('fn start(){}\r\n', { finalNewline: false }), 'fn start(){}')
  })
  check('actual LSP framed rename uses original CRLF/UTF16 selection', () => {
    const uri = 'file:///workspace/one.rhai', position = { line: 2, character: 6 }
    const requests = [{ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, version: 1, text: renameSource } } }, { jsonrpc: '2.0', id: 41, method: 'textDocument/rename', params: { textDocument: { uri }, position, newName: 'amount' } }, { jsonrpc: '2.0', id: 42, method: 'textDocument/prepareRename', params: { textDocument: { uri }, position } }]
    const input = requests.map(request => { const text = JSON.stringify(request); return `Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}` }).join('')
    const process = spawnSync(globalThis.process.execPath, ['scripts/nova-rhai-language-server.mjs'], { cwd: root, input, encoding: 'utf8', timeout: 30_000, maxBuffer: 4_000_000 })
    assert.equal(process.status, 0, JSON.stringify({ error: String(process.error), stderr: process.stderr, stdout: process.stdout.slice(-1500) }))
    const responses = process.stdout.split(/Content-Length: \d+\r\n\r\n/).filter(Boolean).map(text => JSON.parse(text)), rename = responses.find(item => item.id === 41), prepare = responses.find(item => item.id === 42)
    assert.equal(rename.error, undefined, JSON.stringify(rename)); assert.match(rename.result.changes[uri][0].newText, /let amount=4/)
    assert.deepEqual(prepare.result.range, { start: { line: 2, character: 4 }, end: { line: 2, character: 9 } })
    assert.deepEqual(run(rename.result.changes[uri][0].newText), run(renameSource))
  })
  console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', checks: checks.length, runtimeCorpus: rhaiCorpus.length, failed: checks.filter(item => item.status === 'failed') }, null, 2))
  const report = process.argv.find(value => value.startsWith('--report='))?.slice(9)
  if (report) await writeFile(report, JSON.stringify({ generatedAt:new Date().toISOString(), status: failures.length ? 'failed' : 'passed', checks }, null, 2))
  if (failures.length) process.exitCode = 1
} finally { await captureNodeBundle22(temporary); await rm(temporary, { recursive: true, force: true }) }
