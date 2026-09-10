import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'
import { registeredHostDeclarations } from './lib/rhaiApiInventory.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-v2612-api-'))
const inventory = JSON.parse(await readFile(join(root, 'src/visual/rhaiApiSignatures.generated.json'), 'utf8'))
const source = await readFile(join(root, 'crates/nova_script/src/lib.rs'), 'utf8')
const awaitableLock = await readFile(join(root, 'Cargo.lock'), 'utf8')
const checks = [], fail = []
const check = (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { fail.push(error); checks.push({ name, status: 'failed', error: error.message }) } }
try {
  await writeFile(join(temporary, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: { api: join(root, 'src/visual/rhaiApiSignatures.ts'), language: join(root, 'src/visual/rhaiSyntax.ts'), palette: join(root, 'src/visual/graphSyntaxApi.ts') }, output: { entryFileNames: '[name].mjs' } } } })
  const { getRhaiApiSignatures, rhaiApiCallTemplate } = await import(pathToFileURL(join(temporary, 'api.mjs')).href)
  const { parseRhai } = await import(pathToFileURL(join(temporary, 'language.mjs')).href)
  const { syntaxExtensionDefinitions, initializeSyntaxApiNode } = await import(pathToFileURL(join(temporary, 'palette.mjs')).href)
  const bytes = await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')), compiledModule = await WebAssembly.compile(bytes)
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: compiledModule })
  const run = (program, callback = 'start', module = wasm) => {
    const runtime = new module.WasmScriptRuntime()
    try { return { result: JSON.parse(runtime.execute_json(program, callback, JSON.stringify({ entity: 'api-matrix-probe', entityName: 'API Probe' }))) } }
    catch (error) { return { error: String(error) } }
    finally { try { runtime.free() } catch { /* A failing probe must not hide its original error. */ } }
  }
  const typeOf = value => ['i64', 'int'].includes(value) ? 'int' : ['f64', 'float'].includes(value) ? 'float' : ['()', 'unit'].includes(value) ? 'unit' : value
  check('matrix is fresh for the exact Rust source and locked engine', () => {
    assert.equal(inventory.sourceHash, createHash('sha256').update(source).digest('hex'))
    assert.match(awaitableLock, new RegExp(`name = "rhai"\\r?\\nversion = "${inventory.rhaiVersion.replaceAll('.', '\\.')}"`))
  })
  check('every registered host overload appears with explicit parameter types and source location', () => {
    const declarations = registeredHostDeclarations(source), host = inventory.signatures.filter(item => item.origin === 'host' && item.role === 'callable')
    assert.equal(host.length, declarations.length)
    for (const declaration of declarations) assert.ok(host.some(item => item.name === declaration.name && item.parameters.length === declaration.parameters.length && item.parameters.every((parameter, index) => parameter.rustType === declaration.parameters[index].rustType)))
    assert.equal(new Set(inventory.signatures.map(item => item.id)).size, inventory.signatures.length)
    for (const signature of inventory.signatures) { assert.ok(signature.profiles.length > 0); assert.ok(signature.source.path); assert.ok(signature.source.line > 0); if (signature.origin === 'host') assert.deepEqual(signature.profiles, ['native', 'wasm']) }
    assert.ok(inventory.signatures.some(signature => signature.profiles.length === 1 && signature.parameters.some(parameter => /[iu]128/.test(parameter.rustType))))
  })
  check('float and integer overloads cannot be silently interchanged', () => {
    assert.deepEqual(getRhaiApiSignatures('set_position').map(item => item.parameters.map(parameter => parameter.type)), [['float', 'float']])
    assert.equal(rhaiApiCallTemplate(getRhaiApiSignatures('set_position')[0]), 'set_position(0.0, 0.0)')
    assert.equal(getRhaiApiSignatures('export_value').length, 5)
    assert.equal(getRhaiApiSignatures('sin')[0].parameters[0].type, 'float')
    assert.equal(getRhaiApiSignatures('clamp').length, 0)
    assert.match(run('fn start(){set_position(1,2);}').error ?? '', /Function not found.*i64/s)
    assert.equal(run('fn start(){set_position(1.0,2.0);}').result.commands[0].type, 'setPosition')
  })
  check('handles and opaque values require actual producers', () => {
    for (const item of getRhaiApiSignatures('entity_set_position')) assert.equal(item.parameters[0].defaultLiteral, null)
    for (const item of inventory.signatures) for (const parameter of item.parameters) if (['opaque', 'fn', 'timestamp'].includes(parameter.type)) assert.equal(parameter.defaultLiteral, null)
    for (const item of inventory.signatures.filter(item => item.role === 'lifecycle')) assert.ok(item.parameters.every(parameter => parameter.defaultLiteral === null))
  })
  check('disabled and internal calls are not offered as executable templates', () => {
    assert.ok(inventory.disabled.includes('sleep')); assert.ok(inventory.disabled.includes('eval')); assert.ok(inventory.disabled.includes('import'))
    for (const item of getRhaiApiSignatures('sleep')) { assert.equal(item.available, false); assert.equal(rhaiApiCallTemplate(item), null) }
    assert.ok(getRhaiApiSignatures('__nova_graph_trace').every(item => item.internal))
    for (const code of ['sleep(0);', 'sleep(0.0);', 'Fn("sleep").call(0);', 'Fn("sleep").call(0.0);']) assert.match(run(`fn start(){${code}}`).error ?? '', /sleep.*disabled|disabled.*sleep/s)
  })
  const host = inventory.signatures.filter(item => item.origin === 'host' && item.role === 'callable' && item.available && !item.internal)
  for (const signature of host) check(`actual WASM host overload ${signature.id}`, () => {
    const locals = signature.parameters.map((parameter, index) => `let argument_${index}=${parameter.defaultLiteral ?? (parameter.type === 'map' ? 'entity_handle()' : '()')};`).join('')
    const call = `${signature.name}(${signature.parameters.map((_, index) => `argument_${index}`).join(',')})`
    const code = `fn start(){${locals}let result=${call};print("__api_type="+type_of(result));}`
    const output = run(code); assert.equal(output.error, undefined, output.error + '\n' + code)
    const tag = output.result.logs.find(item => item.message.startsWith('__api_type=')); assert.ok(tag)
    if (signature.returnType !== 'dynamic') assert.equal(typeOf(tag.message.slice(11)), signature.returnType)
  })
  for (const signature of inventory.signatures.filter(item => item.role === 'lifecycle')) check(`actual WASM lifecycle parameter ${signature.name}`, () => {
    const body = signature.parameters.map((parameter, index) => `print("argument_${index}="+type_of(${parameter.name}));`).join('')
    const code = `fn ${signature.name}(${signature.parameters.map(parameter => parameter.name).join(',')}){${body}}`
    const output = run(code, signature.name); assert.equal(output.error, undefined)
    output.result.logs.forEach((item, index) => { if (signature.parameters[index].type !== 'dynamic') assert.equal(typeOf(item.message.split('=')[1]), signature.parameters[index].type) })
  })
  check('every suggested placeholder parses as Rhai, including exact range widths', () => {
    for (const signature of inventory.signatures) {
      const template = rhaiApiCallTemplate(signature)
      if (template) assert.equal(parseRhai(`fn start(){${template};}`).valid, true, template)
      for (const parameter of signature.parameters) if (parameter.type === 'range' && parameter.defaultLiteral !== null) assert.match(parameter.rustType, /Range(?:Inclusive)?<(?:INT|i64)>/)
    }
  })
  const contribution = (callable, defaults) => ({ type: 'package.test.' + callable, title: 'Pack ' + callable, description: 'Authored extension', category: 'Test library', keywords: 'test', color: '#fff', packageId: 'test.package', api: { callable }, pins: defaults.map((defaultValue, index) => ({ key: 'input_' + index, name: 'Input ' + index, kind: 'data', direction: 'input', valueType: 'Data', defaultValue })) })
  const extension = (callable, defaults) => syntaxExtensionDefinitions([contribution(callable, defaults)])[0]
  const extensionCall = definition => {
    const node = { uuid: 'alias-probe', type: definition.type, title: definition.title, category: definition.category, position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, collapsed: false, pins: [], config: {} }
    initializeSyntaxApiNode(node, definition.syntaxApiType, definition.syntaxApiDefaults)
    const slots = node.config.slots, callee = slots.find(slot => slot.field === 'callee').fallback
    return { node, code: callee + '(' + slots.filter(slot => slot.field === 'arguments').map(slot => slot.fallback).join(',') + ')' }
  }
  check('extension aliases only expose real arity-compatible WASM overloads', () => {
    assert.equal(syntaxExtensionDefinitions([contribution('imaginary_package_function', [])]).length, 0)
    assert.equal(syntaxExtensionDefinitions([contribution('set_position', [2])]).length, 0)
    assert.equal(syntaxExtensionDefinitions([contribution('sleep', [0])]).length, 0)
    assert.equal(syntaxExtensionDefinitions([contribution('export_value', ['value', 3])]).length, 5)
    const definition = extension('set_position', [2, -0]); assert.equal(definition.packageId, 'test.package'); assert.equal(definition.description, 'Authored extension'); assert.deepEqual(definition.syntaxApiDefaults, ['2.0', '-0.0'])
    assert.equal(run(`fn start(){${extensionCall(definition).code};}`).result.commands[0].x, 2)
  })
  check('extension authored strings, booleans and nested JSON survive actual WASM delivery', () => {
    const text = 'quote" slash\\b\n tab\t control\b'
    const logging = extensionCall(extension('log_info', [text])); assert.equal(run(`fn start(){${logging.code};}`).result.logs[0].message, text)
    const pause = extensionCall(extension('game_pause', [true])); assert.equal(run(`fn start(){${pause.code};}`).result.commands[0].paused, true)
    const payload = { values: [1, 'text', false], nested: { key: 'value' } }, session = extensionCall(extension('session_set', ['sample', payload]))
    assert.deepEqual(run(`fn start(){${session.code};}`).result.commands[0].value, payload)
  })
  check('extension invalid integer, handle and oversized defaults remain required', () => {
    const fractional = extensionCall(extension('animator_set_integer', ['counter', 3.25])); assert.equal(fractional.node.pins.find(pin => pin.key === 'arguments_1').required, true)
    const integer = extension('animator_set_integer', ['counter', 3]); assert.equal(integer.syntaxApiDefaults[1], '3')
    const handle = extensionCall(extension('entity_set_position', [{ valid: true }, 2, 3])); assert.equal(handle.node.pins.find(pin => pin.key === 'arguments_0').required, true)
    assert.equal(extension('log_info', ['x'.repeat(8193)]).syntaxApiDefaults[0], null)
    assert.equal(extension('session_set', ['value', Array(5000).fill(1)]).syntaxApiDefaults[1], null)
  })
  // Fresh WebAssembly modules isolate the tests that exercise platform primitives.
  const platformProbes = [
    ['timestamp and elapsed', 'fn start(){let now=timestamp();print(now.elapsed>=0.0);print(elapsed(now)>=0.0);}', ['true', 'true']],
    ['timestamp arithmetic', 'fn start(){let now=timestamp();let future=now+1.0;print(future>now);print(future-now>=1.0);}', ['true', 'true']],
    ['reflection and Fn/curry/call intrinsics', 'fn add(a,b){a+b} fn start(){let f=Fn("add");let partial=curry(f,2);print(call(partial,3));print(is_def_fn("add",2));print(is_def_var("partial"));print(is_shared(partial));}', ['5', 'true', 'true', 'false']],
    ['string, map, array and iterator packages', 'fn start(){let values=[1,2,3];print(values.map(|value|value*2).reduce(|sum,value|sum+value,0));let map=#{value:4};print(map.keys().len());print("abc".contains("b"));}', ['12', '1', 'true']],
    ['blob and JSON standard packages', 'fn start(){let bytes=blob(3,65);print(bytes.len());print(parse_json(`{"value":4}`).value);}', ['3', '4']],
    ['print/debug consume their internal formatter return value', 'fn start(){let result=print(2);print(type_of(result));print(type_of(debug(2)));}', ['2', '()', '()']],
  ]
  for (let index = 0; index < platformProbes.length; index++) {
    const [name, code, expected] = platformProbes[index], isolated = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href + '?api_probe=' + index)
    await isolated.default({ module_or_path: compiledModule })
    check('isolated actual WASM: ' + name, () => { const output = run(code, 'start', isolated); assert.equal(output.error, undefined); assert.deepEqual(output.result.logs.map(item => item.message), expected) })
  }
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), status: fail.length ? 'failed' : 'passed', checks: checks.length, hostOverloadsExecuted: host.length, lifecycleCallbacksExecuted: 15, isolatedPlatformProbes: platformProbes.length, signatureCount: inventory.signatures.length, failed: checks.filter(item => item.status === 'failed') }, null, 2))
  const report = process.argv.find(value => value.startsWith('--report='))?.slice(9)
  if (report) await writeFile(report, JSON.stringify({ generatedAt: new Date().toISOString(), status: fail.length ? 'failed' : 'passed', checks, hostOverloadsExecuted: host.length, isolatedPlatformProbes: platformProbes.length, signatureCount: inventory.signatures.length }, null, 2))
  if (fail.length) process.exitCode = 1
} finally { await rm(temporary, { recursive: true, force: true }) }
