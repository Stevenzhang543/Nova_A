/** 验证脚本（v26.12-language）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import {registerNodeBundle22,captureNodeBundle22} from './lib/nodeOperationTrace22.mjs'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { rhaiCorpus as fixtures } from './fixtures/v26.12-rhai-corpus.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-v2612-language-'))
const checks = [], failures = []
const check = /** 执行检查并记录通过或错误，收集异常供最终失败报告。 */ (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: error.message }); failures.push(error) } }

try {
  await build({ configFile: false, root, logLevel: 'error', build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false, ssr:true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: join(root, 'src/visual/rhaiSyntax.ts'), output: { entryFileNames: 'language.mjs' } } } })
  registerNodeBundle22(temporary)
  const language = await import(pathToFileURL(join(temporary, 'language.mjs')).href)
  const { parseRhai, walkRhai, emitRhai, emitRhaiNode, lexRhai } = language
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const execute = /** 运行语言语料的启动函数，返回WASM结果或错误并释放实例。 */ source => {
    const runtime = new wasm.WasmScriptRuntime()
    try { return { result: JSON.parse(runtime.execute_json(source, 'start', JSON.stringify({ entity: 'language-corpus' }))) } }
    catch (error) { return { error: String(error) } }
    finally { runtime.free() }
  }
  const allKinds = new Set()
  for (const fixture of fixtures) {
    const program = parseRhai(fixture.source)
    check(fixture.name + ': typed parse and exact source', /** 验证解析结果、词法往返和预期节点种类，并检查所有节点范围及稳定身份完整。 */ () => {
      assert.equal(program.valid, true, JSON.stringify(program.diagnostics))
      assert.equal(emitRhai(program), fixture.source)
      assert.equal(program.tokens.map(/* 返回 token.text 的当前值。 */ token => token.text).join(''), fixture.source)
      const kinds = new Set([...walkRhai(program)].map(/* 返回 node.kind 的当前值。 */ node => node.kind)); for (const kind of kinds) allKinds.add(kind)
      for (const kind of fixture.kinds ?? []) assert.ok(kinds.has(kind), 'Missing typed ' + kind)
      assert.equal(kinds.has('Invalid'), false)
      for (const node of walkRhai(program)) { assert.ok(node.span.start >= 0 && node.span.end <= fixture.source.length && node.span.start <= node.span.end); assert.ok(node.scopeId); assert.ok(node.id) }
    })
    if (!program.valid) continue
    check(fixture.name + ': independent structural emission preserves WASM observable result', /** 逐节点生成源码并执行，验证原始与生成版本的日志、命令、属性和预期错误一致。 */ () => {
      const generated = program.body.map(emitRhaiNode).join('\n'), original = execute(fixture.source), emitted = execute(generated)
      if (fixture.error) { assert.match(original.error ?? '', fixture.error); assert.match(emitted.error ?? '', fixture.error); return }
      assert.equal(original.error, undefined); assert.equal(emitted.error, undefined, emitted.error + '\n' + generated)
      // Timing and source positions may differ. These are the public observable channels.
      for (const key of ['commands', 'logs', 'properties']) assert.deepEqual(emitted.result[key], original.result[key], key + '\n' + generated)
      assert.deepEqual(original.result.logs.map(/* 返回 item.message 的当前值。 */ item => item.message), fixture.logs)
      if (fixture.levels) assert.deepEqual(original.result.logs.map(/* 返回 item.level 的当前值。 */ item => item.level), fixture.levels)
      if (fixture.commands) assert.deepEqual(original.result.commands, fixture.commands)
      if (fixture.properties) assert.deepEqual(original.result.properties, fixture.properties)
      assert.equal(parseRhai(generated).valid, true, generated)
    })
  }
  check('edit a real typed literal and change the runtime result', /** 修改解析树中的数组字面量，验证重新生成并执行后体现新值。 */ () => {
    const program = parseRhai('fn start(){let a=[1,2];a[1]+=3;print(a[0]+a[1]);}')
    const literal = [...walkRhai(program)].find(/* 先计算 node.kind === 'Literal'；仅当其为真值时求右侧 node.raw === '1'，返回短路求值结果。 */ node => node.kind === 'Literal' && node.raw === '1')
    literal.raw = '10'
    const output = execute(program.body.map(emitRhaiNode).join('\n'))
    assert.equal(output.error, undefined); assert.equal(output.result.logs[0].message, '15')
  })
  check('UTF16 positions, CRLF and non-ASCII trivia are exact', /** 验证Unicode与CRLF下的源码位置，且所有词法范围连续覆盖全文。 */ () => {
    const source = '// 🌠\r\nlet value="你好";\r\nvalue+=1;', program = parseRhai(source)
    const declaration = program.body[0]
    assert.deepEqual([declaration.span.start, declaration.span.line, declaration.span.column], [7, 2, 1])
    let end = 0; for (const token of program.tokens) { assert.equal(token.span.start, end); end = token.span.end }; assert.equal(end, source.length)
  })
  check('bindings distinguish shadowing, writes, recursive functions and closure captures', /** 验证同名变量绑定独立、闭包捕获关联正确，并识别读写及递归调用引用。 */ () => {
    const source = 'let value=1; fn recurse(value){if value==0{return 0;}recurse(value-1)} fn start(){let value=2; {let value=3;print(value);} let f=|p|value+p;value+=1;print(f.call(4));}'
    const program = parseRhai(source), values = program.bindings.filter(/* 比较 binding.name 与 'value'，返回严格相等的判断结果。 */ binding => binding.name === 'value')
    assert.equal(program.valid, true); assert.equal(values.length, 4); assert.equal(new Set(values.map(/* 返回 binding.id 的当前值。 */ binding => binding.id)).size, 4)
    const closure = [...walkRhai(program)].find(/* 比较 node.kind 与 'Closure'，返回严格相等的判断结果。 */ node => node.kind === 'Closure')
    assert.equal(closure.captureBindingIds.length, 1); assert.ok(values.some(/* 先计算 binding.id === closure.captureBindingIds[0]；仅当其为真值时求右侧 binding.captured，返回短路求值结果。 */ binding => binding.id === closure.captureBindingIds[0] && binding.captured))
    assert.ok(program.references.some(/* 先计算 reference.access === 'readWrite'；仅当其为真值时求右侧 reference.bindingId === closure.captureBindingIds[0]，返回短路求值结果。 */ reference => reference.access === 'readWrite' && reference.bindingId === closure.captureBindingIds[0]))
    assert.ok(program.references.some(/** 判断递归引用是否绑定到实际recurse函数声明。 */ reference => reference.name === 'recurse' && reference.bindingId === program.bindings.find(/* 比较 binding.name 与 'recurse'，返回严格相等的判断结果。 */ binding => binding.name === 'recurse').id))
  })
  check('format-only edits preserve binding and node identities', /** 验证只新增注释和空格时绑定及相关节点身份保持稳定。 */ () => {
    const source = 'fn start(){let value=2;print(value);}', a = parseRhai(source), b = parseRhai('// added\nfn start() { let value = 2; print(value); }', { previous: a })
    assert.deepEqual(a.bindings.map(/* 返回 binding.id 的当前值。 */ binding => binding.id), b.bindings.map(/* 返回 binding.id 的当前值。 */ binding => binding.id))
    assert.deepEqual([...walkRhai(a)].filter(/* 调用 ['Identifier', 'VariableDeclaration', 'Parameter'].includes(node.kind) 并返回调用结果。 */ node => ['Identifier', 'VariableDeclaration', 'Parameter'].includes(node.kind)).map(/* 返回 node.id 的当前值。 */ node => node.id), [...walkRhai(b)].filter(/* 调用 ['Identifier', 'VariableDeclaration', 'Parameter'].includes(node.kind) 并返回调用结果。 */ node => ['Identifier', 'VariableDeclaration', 'Parameter'].includes(node.kind)).map(/* 返回 node.id 的当前值。 */ node => node.id))
  })
  check('declaration rename preserves its binding and dependent reference identity', /** 验证变量改名并修改值时保留原绑定身份且新引用正确关联。 */ () => {
    const a = parseRhai('fn start(){let old_name=2;print(old_name);}')
    const b = parseRhai('fn start(){let new_name=3;print(new_name);}', { previous: a })
    assert.equal(b.bindings.find(/* 比较 binding.name 与 'new_name'，返回严格相等的判断结果。 */ binding => binding.name === 'new_name').id, a.bindings.find(/* 比较 binding.name 与 'old_name'，返回严格相等的判断结果。 */ binding => binding.name === 'old_name').id)
    assert.equal(b.references.find(/* 比较 reference.name 与 'new_name'，返回严格相等的判断结果。 */ reference => reference.name === 'new_name').bindingId, b.bindings.find(/* 比较 binding.name 与 'new_name'，返回严格相等的判断结果。 */ binding => binding.name === 'new_name').id)
  })
  check('inserted blocks do not steal existing scope or binding identities', /** 验证插入相邻块不改变原绑定身份，作用域、绑定和节点标识仍唯一。 */ () => {
    const a = parseRhai('fn start(){{let old_value=2;print(old_value);}}')
    const b = parseRhai('fn start(){{let added=1;print(added);}{let old_value=2;print(old_value);}}', { previous: a })
    assert.equal(b.bindings.find(/* 比较 binding.name 与 'old_value'，返回严格相等的判断结果。 */ binding => binding.name === 'old_value').id, a.bindings.find(/* 比较 binding.name 与 'old_value'，返回严格相等的判断结果。 */ binding => binding.name === 'old_value').id)
    assert.equal(new Set(b.scopes.map(/* 返回 scope.id 的当前值。 */ scope => scope.id)).size, b.scopes.length)
    assert.equal(new Set(b.bindings.map(/* 返回 binding.id 的当前值。 */ binding => binding.id)).size, b.bindings.length)
    assert.equal(new Set([...walkRhai(b)].map(/* 返回 node.id 的当前值。 */ node => node.id)).size, [...walkRhai(b)].length)
  })
  check('source patch preserves comments and protects stale or overlapping edits', /** 验证局部源码替换保留注释，并拒绝预期文本不匹配或范围重叠的编辑。 */ () => {
    const source = 'fn start(){ /* keep */ print(1); }', program = parseRhai(source), literal = [...walkRhai(program)].find(/* 比较 node.kind 与 'Literal'，返回严格相等的判断结果。 */ node => node.kind === 'Literal')
    assert.equal(emitRhai(program, [{ ...literal.span, text: '2', expected: '1' }]), 'fn start(){ /* keep */ print(2); }')
    assert.throws(/* 调用 emitRhai(program, [{ ...literal.span, text: '2', expected: '3' }]) 并返回调用结果。 */ () => emitRhai(program, [{ ...literal.span, text: '2', expected: '3' }]), /changed/)
    assert.throws(/* 调用 emitRhai(program, [{ start: 0, end: 5, text: '' }, { start: 2, end: 8, text: '' }]) 并返回调用结果。 */ () => emitRhai(program, [{ start: 0, end: 5, text: '' }, { start: 2, end: 8, text: '' }]), /overlap/)
  })
  const malformed = ['fn f(', 'fn f(){let =;', 'let x=[1,2;', 'let x=#{a:};', 'fn f(){if true {', 'fn f(){for (x,) in []{}}', 'fn f(){try {} catch(', '"unterminated', '/* nested /* missing */', '`value ${1', 'let x=;', 'let x=(1+);', 'fn f(){break;}', 'const x=1; x=2;', 'fn f(a,a){}', 'fn f(){let x=1; fn nested(){}}', 'let value = (x=3);', '{fn nested(){}}', 'let value="\\q";', "let value='two';", 'let value=#{a:1,a:2};', 'fn start(){await work();}']
  for (const source of malformed) check('malformed source: ' + JSON.stringify(source), /** 验证无效源码保留原文与完整词法内容，同时提供诊断。 */ () => { const program = parseRhai(source); assert.equal(program.valid, false); assert.equal(emitRhai(program), source); assert.ok(program.diagnostics.length > 0); assert.equal(program.tokens.map(/* 返回 token.text 的当前值。 */ token => token.text).join(''), source) })
  check('all incomplete prefixes terminate without losing source', /** 逐字符解析未完成源码，验证原文可完整恢复且诊断数量不超限。 */ () => {
    const source = 'fn start(){let f=|v|#{key:[v,2]};for (x,i) in [1,2]{print(`value ${f.call(x).key[i]}`);}}'
    for (let index = 0; index < source.length; index++) { const prefix = source.slice(0, index), program = parseRhai(prefix); assert.equal(emitRhai(program), prefix); assert.ok(program.diagnostics.length <= program.limits.maxDiagnostics) }
  })
  check('lexer follows actual Rhai reserved names rather than other languages', /** 验证非法连续运算符和保留标识被拒绝，而允许的类关键字名称仍可作变量。 */ () => {
    for (const source of ['let value=1++2;', 'let value=1--2;', 'let __1=2;', 'let module=2;']) assert.equal(parseRhai(source).valid, false, source)
    for (const name of ['abstract', 'class', 'struct', 'begin']) assert.equal(parseRhai(`let ${name}=2;`).valid, true, name)
  })
  check('source, token, AST, nesting, comment and cancellation bounds are explicit', /** 验证源码、词法、节点、深度和注释限制及取消信号生效，无效限额回退默认值。 */ () => {
    for (const options of [{ limits: { maxSourceLength: 3 } }, { limits: { maxTokens: 3 } }, { limits: { maxNodes: 2 } }, { limits: { maxDepth: 2 } }]) {
      const program = parseRhai('fn start(){let x=[1,2,3];}', options); assert.equal(program.valid, false); assert.ok(program.diagnostics.some(/* 调用 item.code.startsWith('RHAI-LIMIT') 并返回调用结果。 */ item => item.code.startsWith('RHAI-LIMIT')))
    }
    assert.equal(parseRhai('/* /* nested */ */', { limits: { maxCommentDepth: 1 } }).valid, false)
    const controller = new AbortController(); controller.abort(); assert.equal(parseRhai('let x=1;', { signal: controller.signal }).valid, false)
    assert.equal(lexRhai('let x=1;', { limits: { maxTokens: NaN } }).limits.maxTokens, 200000)
  })
  check('sandbox-disabled calls and modules receive exact diagnostics while module AST is retained', /** 验证沙箱阻止eval、sleep与原生模块导入，关闭沙箱时保留模块和导出节点。 */ () => {
    assert.ok(parseRhai('fn start(){eval("1");}').diagnostics.some(/* 比较 item.code 与 'RHAI-SANDBOX-EVAL'，返回严格相等的判断结果。 */ item => item.code === 'RHAI-SANDBOX-EVAL'))
    assert.ok(parseRhai('fn start(){sleep(0.0);}').diagnostics.some(/* 比较 item.code 与 'RHAI-SANDBOX-SLEEP'，返回严格相等的判断结果。 */ item => item.code === 'RHAI-SANDBOX-SLEEP'))
    const program = parseRhai('import "part" as local; export local as public_part;', { sandbox: false }); assert.equal(program.valid, true, JSON.stringify(program.diagnostics)); assert.equal(program.body[0].kind, 'ModuleDeclaration'); assert.equal(program.body[1].kind, 'ExportDeclaration')
    assert.equal(parseRhai('import "part" as local;').valid, false)
  })
  check('host module mode accepts exact project use lines while retaining sandbox restrictions', /** 验证宿主use支持常量路径及换行规则，拒绝别名、插值、局部导入和原生沙箱越权。 */ () => {
    for (const source of ['use "library";\nfn start(){}', "use 'library'\nfn start(){}", 'use `library`;\nfn start(){}', 'use "sub\\math.rhai";\nfn start(){}']) { const program = parseRhai(source, { moduleMode: 'host' }); assert.equal(program.valid, true, JSON.stringify(program.diagnostics)); assert.equal(program.body[0].kind, 'ModuleDeclaration'); assert.equal(emitRhai(program), source) }
    for (const source of ['use "library" as alias;', 'use `library ${x}`;', 'fn start(){use "library";}', 'fn start(){\nuse "library";\n}', 'use "library"; fn start(){}', 'import "library";', 'fn start(){eval("1");}']) assert.equal(parseRhai(source, { moduleMode: 'host' }).valid, false, source)
  })
  check('deterministic operator corpus round trips through the actual runtime', /** 用固定种子生成六十个运算表达式，比较原文与节点生成源码的执行日志。 */ () => {
    let seed = 712; const random = /** 推进线性同余伪随机种子并返回无符号32位结果。 */ () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed }
    const ops = ['+', '-', '*', '%', '^', '&', '|', '<<', '>>']
    for (let index = 0; index < 60; index++) {
      const source = `fn start(){print(${random() % 9 + 1} ${ops[random() % ops.length]} ${random() % 3 + 1} ${ops[random() % ops.length]} ${random() % 3 + 1});}`
      const program = parseRhai(source); assert.equal(program.valid, true)
      assert.deepEqual(execute(program.body.map(emitRhaiNode).join('\n')).result?.logs, execute(source).result?.logs, source)
    }
  })
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), status: failures.length ? 'failed' : 'passed', checks: checks.length, failed: checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed'), typedKinds: [...allKinds].sort(), vmFixtures: fixtures.length, randomizedVmPairs: 60 }, null, 2))
  const report = process.argv.find(/* 调用 value.startsWith('--report=') 并返回调用结果。 */ value => value.startsWith('--report='))?.slice(9)
  if (report) await writeFile(report, JSON.stringify({ generatedAt: new Date().toISOString(), status: failures.length ? 'failed' : 'passed', checks, typedKinds: [...allKinds].sort(), vmFixtures: fixtures.length, randomizedVmPairs: 60 }, null, 2))
  if (failures.length) process.exitCode = 1
} finally { await captureNodeBundle22(temporary); await rm(temporary, { recursive: true, force: true }) }
