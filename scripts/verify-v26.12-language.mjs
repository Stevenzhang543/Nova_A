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
const check = (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { checks.push({ name, status: 'failed', error: error.message }); failures.push(error) } }

try {
  await build({ configFile: false, root, logLevel: 'error', build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: join(root, 'src/visual/rhaiSyntax.ts'), output: { entryFileNames: 'language.mjs' } } } })
  const language = await import(pathToFileURL(join(temporary, 'language.mjs')).href)
  const { parseRhai, walkRhai, emitRhai, emitRhaiNode, lexRhai } = language
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  const execute = source => {
    const runtime = new wasm.WasmScriptRuntime()
    try { return { result: JSON.parse(runtime.execute_json(source, 'start', JSON.stringify({ entity: 'language-corpus' }))) } }
    catch (error) { return { error: String(error) } }
    finally { runtime.free() }
  }
  const allKinds = new Set()
  for (const fixture of fixtures) {
    const program = parseRhai(fixture.source)
    check(fixture.name + ': typed parse and exact source', () => {
      assert.equal(program.valid, true, JSON.stringify(program.diagnostics))
      assert.equal(emitRhai(program), fixture.source)
      assert.equal(program.tokens.map(token => token.text).join(''), fixture.source)
      const kinds = new Set([...walkRhai(program)].map(node => node.kind)); for (const kind of kinds) allKinds.add(kind)
      for (const kind of fixture.kinds ?? []) assert.ok(kinds.has(kind), 'Missing typed ' + kind)
      assert.equal(kinds.has('Invalid'), false)
      for (const node of walkRhai(program)) { assert.ok(node.span.start >= 0 && node.span.end <= fixture.source.length && node.span.start <= node.span.end); assert.ok(node.scopeId); assert.ok(node.id) }
    })
    if (!program.valid) continue
    check(fixture.name + ': independent structural emission preserves WASM observable result', () => {
      const generated = program.body.map(emitRhaiNode).join('\n'), original = execute(fixture.source), emitted = execute(generated)
      if (fixture.error) { assert.match(original.error ?? '', fixture.error); assert.match(emitted.error ?? '', fixture.error); return }
      assert.equal(original.error, undefined); assert.equal(emitted.error, undefined, emitted.error + '\n' + generated)
      // Timing and source positions may differ. These are the public observable channels.
      for (const key of ['commands', 'logs', 'properties']) assert.deepEqual(emitted.result[key], original.result[key], key + '\n' + generated)
      assert.deepEqual(original.result.logs.map(item => item.message), fixture.logs)
      if (fixture.levels) assert.deepEqual(original.result.logs.map(item => item.level), fixture.levels)
      if (fixture.commands) assert.deepEqual(original.result.commands, fixture.commands)
      if (fixture.properties) assert.deepEqual(original.result.properties, fixture.properties)
      assert.equal(parseRhai(generated).valid, true, generated)
    })
  }
  check('edit a real typed literal and change the runtime result', () => {
    const program = parseRhai('fn start(){let a=[1,2];a[1]+=3;print(a[0]+a[1]);}')
    const literal = [...walkRhai(program)].find(node => node.kind === 'Literal' && node.raw === '1')
    literal.raw = '10'
    const output = execute(program.body.map(emitRhaiNode).join('\n'))
    assert.equal(output.error, undefined); assert.equal(output.result.logs[0].message, '15')
  })
  check('UTF16 positions, CRLF and non-ASCII trivia are exact', () => {
    const source = '// 🌠\r\nlet value="你好";\r\nvalue+=1;', program = parseRhai(source)
    const declaration = program.body[0]
    assert.deepEqual([declaration.span.start, declaration.span.line, declaration.span.column], [7, 2, 1])
    let end = 0; for (const token of program.tokens) { assert.equal(token.span.start, end); end = token.span.end }; assert.equal(end, source.length)
  })
  check('bindings distinguish shadowing, writes, recursive functions and closure captures', () => {
    const source = 'let value=1; fn recurse(value){if value==0{return 0;}recurse(value-1)} fn start(){let value=2; {let value=3;print(value);} let f=|p|value+p;value+=1;print(f.call(4));}'
    const program = parseRhai(source), values = program.bindings.filter(binding => binding.name === 'value')
    assert.equal(program.valid, true); assert.equal(values.length, 4); assert.equal(new Set(values.map(binding => binding.id)).size, 4)
    const closure = [...walkRhai(program)].find(node => node.kind === 'Closure')
    assert.equal(closure.captureBindingIds.length, 1); assert.ok(values.some(binding => binding.id === closure.captureBindingIds[0] && binding.captured))
    assert.ok(program.references.some(reference => reference.access === 'readWrite' && reference.bindingId === closure.captureBindingIds[0]))
    assert.ok(program.references.some(reference => reference.name === 'recurse' && reference.bindingId === program.bindings.find(binding => binding.name === 'recurse').id))
  })
  check('format-only edits preserve binding and node identities', () => {
    const source = 'fn start(){let value=2;print(value);}', a = parseRhai(source), b = parseRhai('// added\nfn start() { let value = 2; print(value); }', { previous: a })
    assert.deepEqual(a.bindings.map(binding => binding.id), b.bindings.map(binding => binding.id))
    assert.deepEqual([...walkRhai(a)].filter(node => ['Identifier', 'VariableDeclaration', 'Parameter'].includes(node.kind)).map(node => node.id), [...walkRhai(b)].filter(node => ['Identifier', 'VariableDeclaration', 'Parameter'].includes(node.kind)).map(node => node.id))
  })
  check('declaration rename preserves its binding and dependent reference identity', () => {
    const a = parseRhai('fn start(){let old_name=2;print(old_name);}')
    const b = parseRhai('fn start(){let new_name=3;print(new_name);}', { previous: a })
    assert.equal(b.bindings.find(binding => binding.name === 'new_name').id, a.bindings.find(binding => binding.name === 'old_name').id)
    assert.equal(b.references.find(reference => reference.name === 'new_name').bindingId, b.bindings.find(binding => binding.name === 'new_name').id)
  })
  check('inserted blocks do not steal existing scope or binding identities', () => {
    const a = parseRhai('fn start(){{let old_value=2;print(old_value);}}')
    const b = parseRhai('fn start(){{let added=1;print(added);}{let old_value=2;print(old_value);}}', { previous: a })
    assert.equal(b.bindings.find(binding => binding.name === 'old_value').id, a.bindings.find(binding => binding.name === 'old_value').id)
    assert.equal(new Set(b.scopes.map(scope => scope.id)).size, b.scopes.length)
    assert.equal(new Set(b.bindings.map(binding => binding.id)).size, b.bindings.length)
    assert.equal(new Set([...walkRhai(b)].map(node => node.id)).size, [...walkRhai(b)].length)
  })
  check('source patch preserves comments and protects stale or overlapping edits', () => {
    const source = 'fn start(){ /* keep */ print(1); }', program = parseRhai(source), literal = [...walkRhai(program)].find(node => node.kind === 'Literal')
    assert.equal(emitRhai(program, [{ ...literal.span, text: '2', expected: '1' }]), 'fn start(){ /* keep */ print(2); }')
    assert.throws(() => emitRhai(program, [{ ...literal.span, text: '2', expected: '3' }]), /changed/)
    assert.throws(() => emitRhai(program, [{ start: 0, end: 5, text: '' }, { start: 2, end: 8, text: '' }]), /overlap/)
  })
  const malformed = ['fn f(', 'fn f(){let =;', 'let x=[1,2;', 'let x=#{a:};', 'fn f(){if true {', 'fn f(){for (x,) in []{}}', 'fn f(){try {} catch(', '"unterminated', '/* nested /* missing */', '`value ${1', 'let x=;', 'let x=(1+);', 'fn f(){break;}', 'const x=1; x=2;', 'fn f(a,a){}', 'fn f(){let x=1; fn nested(){}}', 'let value = (x=3);', '{fn nested(){}}', 'let value="\\q";', "let value='two';", 'let value=#{a:1,a:2};', 'fn start(){await work();}']
  for (const source of malformed) check('malformed source: ' + JSON.stringify(source), () => { const program = parseRhai(source); assert.equal(program.valid, false); assert.equal(emitRhai(program), source); assert.ok(program.diagnostics.length > 0); assert.equal(program.tokens.map(token => token.text).join(''), source) })
  check('all incomplete prefixes terminate without losing source', () => {
    const source = 'fn start(){let f=|v|#{key:[v,2]};for (x,i) in [1,2]{print(`value ${f.call(x).key[i]}`);}}'
    for (let index = 0; index < source.length; index++) { const prefix = source.slice(0, index), program = parseRhai(prefix); assert.equal(emitRhai(program), prefix); assert.ok(program.diagnostics.length <= program.limits.maxDiagnostics) }
  })
  check('lexer follows actual Rhai reserved names rather than other languages', () => {
    for (const source of ['let value=1++2;', 'let value=1--2;', 'let __1=2;', 'let module=2;']) assert.equal(parseRhai(source).valid, false, source)
    for (const name of ['abstract', 'class', 'struct', 'begin']) assert.equal(parseRhai(`let ${name}=2;`).valid, true, name)
  })
  check('source, token, AST, nesting, comment and cancellation bounds are explicit', () => {
    for (const options of [{ limits: { maxSourceLength: 3 } }, { limits: { maxTokens: 3 } }, { limits: { maxNodes: 2 } }, { limits: { maxDepth: 2 } }]) {
      const program = parseRhai('fn start(){let x=[1,2,3];}', options); assert.equal(program.valid, false); assert.ok(program.diagnostics.some(item => item.code.startsWith('RHAI-LIMIT')))
    }
    assert.equal(parseRhai('/* /* nested */ */', { limits: { maxCommentDepth: 1 } }).valid, false)
    const controller = new AbortController(); controller.abort(); assert.equal(parseRhai('let x=1;', { signal: controller.signal }).valid, false)
    assert.equal(lexRhai('let x=1;', { limits: { maxTokens: NaN } }).limits.maxTokens, 200000)
  })
  check('sandbox-disabled calls and modules receive exact diagnostics while module AST is retained', () => {
    assert.ok(parseRhai('fn start(){eval("1");}').diagnostics.some(item => item.code === 'RHAI-SANDBOX-EVAL'))
    assert.ok(parseRhai('fn start(){sleep(0.0);}').diagnostics.some(item => item.code === 'RHAI-SANDBOX-SLEEP'))
    const program = parseRhai('import "part" as local; export local as public_part;', { sandbox: false }); assert.equal(program.valid, true, JSON.stringify(program.diagnostics)); assert.equal(program.body[0].kind, 'ModuleDeclaration'); assert.equal(program.body[1].kind, 'ExportDeclaration')
    assert.equal(parseRhai('import "part" as local;').valid, false)
  })
  check('host module mode accepts exact project use lines while retaining sandbox restrictions', () => {
    for (const source of ['use "library";\nfn start(){}', "use 'library'\nfn start(){}", 'use `library`;\nfn start(){}', 'use "sub\\math.rhai";\nfn start(){}']) { const program = parseRhai(source, { moduleMode: 'host' }); assert.equal(program.valid, true, JSON.stringify(program.diagnostics)); assert.equal(program.body[0].kind, 'ModuleDeclaration'); assert.equal(emitRhai(program), source) }
    for (const source of ['use "library" as alias;', 'use `library ${x}`;', 'fn start(){use "library";}', 'fn start(){\nuse "library";\n}', 'use "library"; fn start(){}', 'import "library";', 'fn start(){eval("1");}']) assert.equal(parseRhai(source, { moduleMode: 'host' }).valid, false, source)
  })
  check('deterministic operator corpus round trips through the actual runtime', () => {
    let seed = 712; const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed }
    const ops = ['+', '-', '*', '%', '^', '&', '|', '<<', '>>']
    for (let index = 0; index < 60; index++) {
      const source = `fn start(){print(${random() % 9 + 1} ${ops[random() % ops.length]} ${random() % 3 + 1} ${ops[random() % ops.length]} ${random() % 3 + 1});}`
      const program = parseRhai(source); assert.equal(program.valid, true)
      assert.deepEqual(execute(program.body.map(emitRhaiNode).join('\n')).result?.logs, execute(source).result?.logs, source)
    }
  })
  console.log(JSON.stringify({ status: failures.length ? 'failed' : 'passed', checks: checks.length, failed: checks.filter(item => item.status === 'failed'), typedKinds: [...allKinds].sort(), vmFixtures: fixtures.length, randomizedVmPairs: 60 }, null, 2))
  const report = process.argv.find(value => value.startsWith('--report='))?.slice(9)
  if (report) await writeFile(report, JSON.stringify({ status: failures.length ? 'failed' : 'passed', checks, typedKinds: [...allKinds].sort(), vmFixtures: fixtures.length, randomizedVmPairs: 60 }, null, 2))
  if (failures.length) process.exitCode = 1
} finally { await rm(temporary, { recursive: true, force: true }) }
