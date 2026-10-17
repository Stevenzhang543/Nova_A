/** 验证脚本（v26.12-language-editor）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
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
const check = /** 执行语言检查并收集通过结果或异常失败信息。 */ (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { failures.push(error); checks.push({ name, status: 'failed', error: String(error) }) } }
try {
  await build({ configFile: false, root, logLevel: 'error', build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false, ssr:true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: join(root, 'src/editor/scriptLanguage.ts'), output: { entryFileNames: 'language.mjs' } } } })
  registerNodeBundle22(temporary)
  const { analyzeScript, completionDetails, hoverInfo, parameterHint, renameScriptSymbol, formatScript, ScriptWorkspaceIndex } = await import(pathToFileURL(join(temporary, 'language.mjs')).href)
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const run = /** 在WASM运行时执行启动脚本，提取命令、日志和属性，捕获错误并释放实例。 */ code => { const runtime = new wasm.WasmScriptRuntime(); try { const { commands, logs, properties } = JSON.parse(runtime.execute_json(code, 'start', '{"entity":"editor-probe"}')); return { commands, logs, properties } } catch (error) { return { error: String(error) } } finally { runtime.free() } }
  for (const fixture of rhaiCorpus) check('real runtime corpus has no false editor errors: ' + fixture.name, /** 验证样本静态诊断无错误，格式化前后执行结果或预期错误保持一致。 */ () => {
    assert.deepEqual(analyzeScript(fixture.source).diagnostics.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error'), [])
    const formatted = formatScript(fixture.source, { indentSize: 4 }), original = run(fixture.source), after = run(formatted)
    if (fixture.error) { assert.match(original.error, fixture.error); assert.match(after.error, fixture.error) } else { assert.equal(original.error, undefined); assert.deepEqual(after, original) }
  })
  check('standard calls, dynamic methods and captured closures are recognized', /** 验证闭包、映射和时间API运行及编辑提示可用，并确认禁用API不出现在补全中。 */ () => {
    const source = 'fn start(){let a=[1,2];let x=4;let f=|v|x+v;print(a.map(|v|v*2).len());print(f.call(3));print(elapsed(timestamp())>=0.0);}'
    assert.deepEqual(analyzeScript(source).diagnostics.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error'), []); assert.equal(run(source).error, undefined)
    for (const name of ['timestamp', 'elapsed', 'Fn', 'map']) { assert.ok(completionDetails(name).some(/* 比较 item.label 与 name，返回严格相等的判断结果。 */ item => item.label === name)); assert.ok(hoverInfo(name)); assert.ok(parameterHint(name)) }
    assert.match(parameterHint('set_position').signature, /float/)
    assert.deepEqual(completionDetails('sleep'), [])
  })
  check('scoped shadowing and overloads do not create duplicate errors or phantom names', /** 验证注释中的虚假声明被忽略，重载和遮蔽正常分析且同签名重复定义被诊断。 */ () => {
    const source = '/* fn ghost(){ unknown(); } */\nfn f(x){let x=x+1;x} fn f(x,y){x+y}\nfn g(){let x=5;x}\nfn start(){print(f(1));print(f(2,3));}'
    const analysis = analyzeScript(source)
    assert.equal(analysis.symbols.filter(/* 比较 item.name 与 'f'，返回严格相等的判断结果。 */ item => item.name === 'f').length, 2)
    assert.equal(analysis.symbols.some(/* 比较 item.name 与 'ghost'，返回严格相等的判断结果。 */ item => item.name === 'ghost'), false)
    assert.deepEqual(analysis.diagnostics.filter(/* 比较 item.severity 与 'error'，返回严格相等的判断结果。 */ item => item.severity === 'error'), [])
    assert.equal(analysis.diagnostics.filter(/* 比较 item.code 与 'NOVA-SEM-002'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-SEM-002').length, 1)
    assert.ok(analyzeScript('fn f(x){} fn f(y){}').diagnostics.some(/* 比较 item.code 与 'NOVA-SEM-001'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-SEM-001'))
  })
  check('unknown typos remain errors while external function propagation survives', /** 验证已解析模块函数参与补全而未知调用仍被诊断，保留分析修订并报告禁用函数。 */ () => {
    const analysis = analyzeScript('use "shared";\nfn start(){shared_value();unknown_typo();}', 2, 8, ['shared_value'])
    assert.deepEqual(analysis.diagnostics.filter(/* 比较 item.code 与 'NOVA-SEM-003'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-SEM-003').map(/* 返回 item.message 的当前值。 */ item => item.message), ['Unknown function “unknown_typo”.'])
    assert.ok(completionDetails('shared_', analysis).some(/* 比较 item.detail 与 'Resolved project module function'，返回严格相等的判断结果。 */ item => item.detail === 'Resolved project module function'))
    assert.equal(analysis.revision, 8)
    assert.ok(analyzeScript('fn start(){sleep(0);}').diagnostics.some(/* 调用 /disabled/.test(item.message) 并返回调用结果。 */ item => /disabled/.test(item.message)))
  })
  check('exact UTF16 token spans and test annotations survive typed analysis', /** 验证测试注解、Unicode和CRLF位置正确解析，未闭合语法产生解析诊断。 */ () => {
    const source = '// 😀\r\n// @test timeout=25 tags=core cases=1|2\r\nfn test_value(){print("中文");}\r\n'
    const analysis = analyzeScript(source)
    assert.equal(analysis.tests[0].timeoutMs, 25); assert.deepEqual(analysis.tests[0].cases, ['1', '2'])
    assert.ok(analysis.semanticTokens.some(/* 先计算 token.kind === 'comment' && token.line === 1；仅当其为真值时求右侧 token.length === 5，返回短路求值结果。 */ token => token.kind === 'comment' && token.line === 1 && token.length === 5))
    assert.equal(analysis.symbols[0].line, 3)
    assert.ok(analyzeScript('fn start(){').diagnostics.some(/* 调用 item.code.startsWith('NOVA-PARSE') 并返回调用结果。 */ item => item.code.startsWith('NOVA-PARSE')))
  })
  const renameSource = '// value stays in commentary 😀\r\nfn start(){\r\nlet value=4;\r\n{let value=8;print(value);}\r\nlet f=|x|value+x;\r\nprint(value);print(f.call(1));print("value stays in a string");\r\n}\r\n'
  check('selected lexical rename preserves shadowed values, strings, comments and VM behavior', /** 验证按位置重命名仅更新对应绑定及闭包引用，保留遮蔽变量、字符串和注释，歧义时拒绝。 */ () => {
    const result = renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('let value') + 5 })
    assert.match(result, /let amount=4/); assert.match(result, /let value=8;print\(value\)/); assert.match(result, /\|x\|amount\+x/)
    assert.match(result, /\/\/ value stays/); assert.match(result, /"value stays in a string"/)
    assert.deepEqual(run(result), run(renameSource))
    assert.throws(/* 调用 renameScriptSymbol(renameSource, 'value', 'amount') 并返回调用结果。 */ () => renameScriptSymbol(renameSource, 'value', 'amount'), /multiple bindings/)
  })
  check('renaming a captured reference or a cursor at identifier end selects its binding', /** 验证在闭包引用末尾定位仍能重命名原绑定且运行结果不变。 */ () => {
    const result = renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('|x|value') + '|x|value'.length })
    assert.match(result, /let amount=4/); assert.deepEqual(run(result), run(renameSource))
  })
  check('capture collisions, exported properties and dynamic method/pointer renames refuse before edits', /** 验证可能捕获变量、迁移导出属性或破坏函数指针和方法调用的重命名被拒绝。 */ () => {
    const collision = 'fn start(){let a=1;{let b=2;print(a+b);}}'
    assert.throws(/* 调用 renameScriptSymbol(collision, 'a', 'b') 并返回调用结果。 */ () => renameScriptSymbol(collision, 'a', 'b'), /capture|binding/)
    assert.throws(/* 调用 renameScriptSymbol('@export let value=1;\nfn start(){print(value);}', 'value', 'other') 并返回调用结果。 */ () => renameScriptSymbol('@export let value=1;\nfn start(){print(value);}', 'value', 'other'), /property migration/)
    assert.throws(/* 调用 renameScriptSymbol('fn f(){1} fn start(){print(Fn("f").call());}', 'f', 'other') 并返回调用结果。 */ () => renameScriptSymbol('fn f(){1} fn start(){print(Fn("f").call());}', 'f', 'other'), /function-pointer/)
    assert.throws(/* 调用 renameScriptSymbol('fn int.twice(){this*2} fn start(){print(2.twice());}', 'twice', 'other') 并返回调用结果。 */ () => renameScriptSymbol('fn int.twice(){this*2} fn start(){print(2.twice());}', 'twice', 'other'), /Method/)
  })
  check('workspace rename requires a single selected document and preserves other documents', /** 验证工作区重命名必须明确文档与绑定，且不修改其它同名文档。 */ () => {
    const index = new ScriptWorkspaceIndex(); index.update('first', renameSource); index.update('second', 'fn start(){let value=2;print(value);}')
    assert.throws(/* 调用 index.rename('value', 'amount') 并返回调用结果。 */ () => index.rename('value', 'amount'), /ambiguous workspace/)
    const result = index.rename('value', 'amount', { uri: 'first', offset: renameSource.indexOf('let value') + 4 })
    assert.deepEqual([...result.keys()], ['first']); assert.equal(index.document('second').source, 'fn start(){let value=2;print(value);}')
  })
  check('cross-module and dynamic function-pointer references refuse an incomplete rename', /** 验证跨模块直接、动态和方法式调用阻止不安全重命名，注释位置不能作为绑定。 */ () => {
    const source = 'fn helper(){1} fn start(){print(helper());}'
    for (const external of ['fn start(){print(helper());}', 'fn start(){print(Fn("helper").call());}', 'fn start(){let name="helper";print(Fn(name).call());}', 'fn start(){print(1.helper());}']) assert.throws(/* 调用 renameScriptSymbol(source, 'helper', 'renamed', { externalSources: [external] }) 并返回调用结果。 */ () => renameScriptSymbol(source, 'helper', 'renamed', { externalSources: [external] }), /cross-module/)
    assert.throws(/* 调用 renameScriptSymbol('fn helper(){1} fn start(){let name="helper";print(Fn(name).call());}', 'helper', 'renamed') 并返回调用结果。 */ () => renameScriptSymbol('fn helper(){1} fn start(){let name="helper";print(Fn(name).call());}', 'helper', 'renamed'), /function-pointer/)
    assert.throws(/* 调用 renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('value stays') }) 并返回调用结果。 */ () => renameScriptSymbol(renameSource, 'value', 'amount', { offset: renameSource.indexOf('value stays') }), /bindings|binding/)
    const index = new ScriptWorkspaceIndex(); index.update('one', source); index.update('two', 'fn start(){print(Fn("helper").call());}')
    assert.throws(/* 调用 index.rename('helper', 'renamed', { uri: 'one', offset: 4 }) 并返回调用结果。 */ () => index.rename('helper', 'renamed', { uri: 'one', offset: 4 }), /cross-module/)
  })
  check('legacy diagnostic and JSONL protocol contracts remain available', /** 验证模块越界、重复定义、未知调用与兼容诊断，并确认旧JSON行协议补全可用。 */ () => {
    const analysis = analyzeScript('use "../escape.rhai";\nfn update(dt){old_unknown();is_down("Move");}\nfn update(dt){}')
    for (const code of ['NOVA-MODULE-001', 'NOVA-SEM-001', 'NOVA-SEM-003', 'NOVA-COMPAT-001']) assert.ok(analysis.diagnostics.some(/* 比较 item.code 与 code，返回严格相等的判断结果。 */ item => item.code === code), code)
    const requests = [{ id: 1, method: 'textDocument/analyze', params: { uri: 'one', text: 'fn start(){print("ready");}' } }, { id: 2, method: 'textDocument/completion', params: { uri: 'one', prefix: 'timestamp' } }, { id: 3, method: 'shutdown', params: {} }]
    const process = spawnSync(globalThis.process.execPath, ['scripts/nova-rhai-language-server.mjs', '--legacy-jsonl'], { cwd: root, input: requests.map(/* 调用 JSON.stringify(item) 并返回调用结果。 */ item => JSON.stringify(item)).join('\n') + '\n', encoding: 'utf8', timeout: 30_000 })
    assert.equal(process.status, 0, process.stderr); const responses = process.stdout.trim().split('\n').map(/* 调用 JSON.parse(text) 并返回调用结果。 */ text => JSON.parse(text)); assert.ok(responses.some(/* 比较 item.event 与 'ready'，返回严格相等的判断结果。 */ item => item.event === 'ready')); assert.ok(responses.find(/* 比较 item.id 与 2，返回严格相等的判断结果。 */ item => item.id === 2).result.some(/* 比较 item.label 与 'timestamp'，返回严格相等的判断结果。 */ item => item.label === 'timestamp'))
  })
  check('formatter indents code but preserves multiline literal and comment lexemes', /** 验证格式化保留CRLF、多行字符串及块注释，结果幂等且无效语法不被重写。 */ () => {
    const source = 'fn start() {\r\nlet raw=`first\r\n   {value}\r\nlast`;\r\n/* multi\r\n   comment */\r\nif true {\r\nprint(raw);\r\n}\r\n}\r\n'
    const formatted = formatScript(source)
    assert.match(formatted, /\r\n  if true \{\r\n    print\(raw\);\r\n  \}/)
    assert.match(formatted, /`first\r\n   \{value\}\r\nlast`/)
    assert.match(formatted, /\/\* multi\r\n   comment \*\//)
    assert.deepEqual(run(formatted), run(source)); assert.equal(formatScript(formatted), formatted)
    assert.equal(formatScript('fn start(){'), 'fn start(){')
    assert.equal(formatScript('fn start(){}\r\n', { finalNewline: false }), 'fn start(){}')
  })
  check('actual LSP framed rename uses original CRLF/UTF16 selection', /** 通过标准语言服务器协议执行准备重命名和重命名，验证返回范围与代码执行语义。 */ () => {
    const uri = 'file:///workspace/one.rhai', position = { line: 2, character: 6 }
    const requests = [{ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri, version: 1, text: renameSource } } }, { jsonrpc: '2.0', id: 41, method: 'textDocument/rename', params: { textDocument: { uri }, position, newName: 'amount' } }, { jsonrpc: '2.0', id: 42, method: 'textDocument/prepareRename', params: { textDocument: { uri }, position } }]
    const input = requests.map(/** 将JSON请求封装为带UTF-8字节长度头的语言服务器协议消息。 */ request => { const text = JSON.stringify(request); return `Content-Length: ${Buffer.byteLength(text)}\r\n\r\n${text}` }).join('')
    const process = spawnSync(globalThis.process.execPath, ['scripts/nova-rhai-language-server.mjs'], { cwd: root, input, encoding: 'utf8', timeout: 30_000, maxBuffer: 4_000_000 })
    assert.equal(process.status, 0, JSON.stringify({ error: String(process.error), stderr: process.stderr, stdout: process.stdout.slice(-1500) }))
    const responses = process.stdout.split(/Content-Length: \d+\r\n\r\n/).filter(Boolean).map(/* 调用 JSON.parse(text) 并返回调用结果。 */ text => JSON.parse(text)), rename = responses.find(/* 比较 item.id 与 41，返回严格相等的判断结果。 */ item => item.id === 41), prepare = responses.find(/* 比较 item.id 与 42，返回严格相等的判断结果。 */ item => item.id === 42)
    assert.equal(rename.error, undefined, JSON.stringify(rename)); assert.match(rename.result.changes[uri][0].newText, /let amount=4/)
    assert.deepEqual(prepare.result.range, { start: { line: 2, character: 4 }, end: { line: 2, character: 9 } })
    assert.deepEqual(run(rename.result.changes[uri][0].newText), run(renameSource))
  })
  console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', checks: checks.length, runtimeCorpus: rhaiCorpus.length, failed: checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed') }, null, 2))
  const report = process.argv.find(/* 调用 value.startsWith('--report=') 并返回调用结果。 */ value => value.startsWith('--report='))?.slice(9)
  if (report) await writeFile(report, JSON.stringify({ generatedAt:new Date().toISOString(), status: failures.length ? 'failed' : 'passed', checks }, null, 2))
  if (failures.length) process.exitCode = 1
} finally { await captureNodeBundle22(temporary); await rm(temporary, { recursive: true, force: true }) }
