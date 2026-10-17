/** 验证脚本（v26.12-api-signatures）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import {registerNodeBundle22,captureNodeBundle22} from './lib/nodeOperationTrace22.mjs'
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
const check = /** 运行检查并分别记录通过或异常，同时收集失败对象。 */ (name, run) => { try { run(); checks.push({ name, status: 'passed' }) } catch (error) { fail.push(error); checks.push({ name, status: 'failed', error: error.message }) } }
try {
  check('Host closure registration allows Chinese and nested Rust comments without changing line identity', /** 注释只属于源码 trivia，参数和行号必须与无注释注册一致。 */ () => {
    for(const trivia of ['/* 中文闭包用途 */','// 中文闭包用途\n','/* 外层 /* 内层 */ 结束 */']){
      const plain='\nengine.register_fn("sample", move |value: INT| value);'
      const commented='\nengine.register_fn("sample", '+trivia+' move /* 捕获所有权 */ |value: INT| value);'
      assert.deepEqual(registeredHostDeclarations(commented),registeredHostDeclarations(plain))
    }
    assert.throws(/** 未结束的块注释不能吞掉后续注册。 */ () => registeredHostDeclarations('engine.register_fn("sample", /* broken'),/Unterminated/)
  })
  await writeFile(join(temporary, 'package.json'), '{"type":"module"}\n')
  await build({ configFile: false, root, logLevel: 'error', build: { sourcemap:process.env.NOVA_AUDIT_NODE_OPERATION_COVERAGE==='1'?'hidden':false,ssr:true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: { api: join(root, 'src/visual/rhaiApiSignatures.ts'), language: join(root, 'src/visual/rhaiSyntax.ts'), palette: join(root, 'src/visual/graphSyntaxApi.ts') }, output: { entryFileNames: '[name].mjs' } } } })
  registerNodeBundle22(temporary)
  const { getRhaiApiSignatures, rhaiApiCallTemplate } = await import(pathToFileURL(join(temporary, 'api.mjs')).href)
  const { parseRhai } = await import(pathToFileURL(join(temporary, 'language.mjs')).href)
  const { syntaxExtensionDefinitions, initializeSyntaxApiNode } = await import(pathToFileURL(join(temporary, 'palette.mjs')).href)
  const bytes = await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')), compiledModule = await WebAssembly.compile(bytes)
  const wasm = await import(pathToFileURL(join(root, 'nova_core/pkg/nova_core.js')).href)
  await wasm.default({ module_or_path: compiledModule })
  const run = /** 在独立WASM运行时执行给定程序及回调，返回结果或错误并尝试释放实例。 */ (program, callback = 'start', module = wasm) => {
    const runtime = new module.WasmScriptRuntime()
    try { return { result: JSON.parse(runtime.execute_json(program, callback, JSON.stringify({ entity: 'api-matrix-probe', entityName: 'API Probe' }))) } }
    catch (error) { return { error: String(error) } }
    finally { try { runtime.free() } catch { /* A failing probe must not hide its original error. */ } }
  }
  const typeOf = /** 把Rhai整数、浮点和单元类型别名规范为清单使用的名称。 */ value => ['i64', 'int'].includes(value) ? 'int' : ['f64', 'float'].includes(value) ? 'float' : ['()', 'unit'].includes(value) ? 'unit' : value
  check('matrix is fresh for the exact Rust source and locked engine', /** 验证API清单绑定的源码散列及Rhai版本与当前源码、锁文件一致。 */ () => {
    assert.equal(inventory.sourceHash, createHash('sha256').update(source).digest('hex'))
    assert.match(awaitableLock, new RegExp(`name = "rhai"\\r?\\nversion = "${inventory.rhaiVersion.replaceAll('.', '\\.')}"`))
  })
  check('every registered host overload appears with explicit parameter types and source location', /** 验证宿主API声明逐项匹配清单，签名标识唯一且平台和源码位置元数据完整。 */ () => {
    const declarations = registeredHostDeclarations(source), host = inventory.signatures.filter(/* 先计算 item.origin === 'host'；仅当其为真值时求右侧 item.role === 'callable'，返回短路求值结果。 */ item => item.origin === 'host' && item.role === 'callable')
    assert.equal(host.length, declarations.length)
    for (const declaration of declarations) assert.ok(host.some(/** 比较API名称、参数数量及逐参数Rust类型是否与声明一致。 */ item => item.name === declaration.name && item.parameters.length === declaration.parameters.length && item.parameters.every(/* 比较 parameter.rustType 与 declaration.parameters[index].rustType，返回严格相等的判断结果。 */ (parameter, index) => parameter.rustType === declaration.parameters[index].rustType)))
    assert.equal(new Set(inventory.signatures.map(/* 返回 item.id 的当前值。 */ item => item.id)).size, inventory.signatures.length)
    for (const signature of inventory.signatures) { assert.ok(signature.profiles.length > 0); assert.ok(signature.source.path); assert.ok(signature.source.line > 0); if (signature.origin === 'host') assert.deepEqual(signature.profiles, ['native', 'wasm']) }
    assert.ok(inventory.signatures.some(/* 先计算 signature.profiles.length === 1；仅当其为真值时求右侧 signature.parameters.some(parameter => /[iu]128/.test(parameter.rustType))，返回短路求值结果。 */ signature => signature.profiles.length === 1 && signature.parameters.some(/* 调用 /[iu]128/.test(parameter.rustType) 并返回调用结果。 */ parameter => /[iu]128/.test(parameter.rustType))))
  })
  check('float and integer overloads cannot be silently interchanged', /** 验证位置API浮点签名、调用模板和重载数量，且运行时拒绝整数位置参数。 */ () => {
    assert.deepEqual(getRhaiApiSignatures('set_position').map(/** 提取签名的参数类型列表。 */ item => item.parameters.map(/* 返回 parameter.type 的当前值。 */ parameter => parameter.type)), [['float', 'float']])
    assert.equal(rhaiApiCallTemplate(getRhaiApiSignatures('set_position')[0]), 'set_position(0.0, 0.0)')
    assert.equal(getRhaiApiSignatures('export_value').length, 5)
    assert.equal(getRhaiApiSignatures('sin')[0].parameters[0].type, 'float')
    assert.equal(getRhaiApiSignatures('clamp').length, 0)
    assert.match(run('fn start(){set_position(1,2);}').error ?? '', /Function not found.*i64/s)
    assert.equal(run('fn start(){set_position(1.0,2.0);}').result.commands[0].type, 'setPosition')
  })
  check('handles and opaque values require actual producers', /** 验证实体句柄、不透明类型及生命周期参数不生成伪造默认字面量。 */ () => {
    for (const item of getRhaiApiSignatures('entity_set_position')) assert.equal(item.parameters[0].defaultLiteral, null)
    for (const item of inventory.signatures) for (const parameter of item.parameters) if (['opaque', 'fn', 'timestamp'].includes(parameter.type)) assert.equal(parameter.defaultLiteral, null)
    for (const item of inventory.signatures.filter(/* 比较 item.role 与 'lifecycle'，返回严格相等的判断结果。 */ item => item.role === 'lifecycle')) assert.ok(item.parameters.every(/* 比较 parameter.defaultLiteral 与 null，返回严格相等的判断结果。 */ parameter => parameter.defaultLiteral === null))
  })
  check('disabled and internal calls are not offered as executable templates', /** 验证禁用API不会生成调用模板，且sleep直接或函数指针调用均被运行时拒绝。 */ () => {
    assert.ok(inventory.disabled.includes('sleep')); assert.ok(inventory.disabled.includes('eval')); assert.ok(inventory.disabled.includes('import'))
    for (const item of getRhaiApiSignatures('sleep')) { assert.equal(item.available, false); assert.equal(rhaiApiCallTemplate(item), null) }
    assert.ok(getRhaiApiSignatures('__nova_graph_trace').every(/* 返回 item.internal 的当前值。 */ item => item.internal))
    for (const code of ['sleep(0);', 'sleep(0.0);', 'Fn("sleep").call(0);', 'Fn("sleep").call(0.0);']) assert.match(run(`fn start(){${code}}`).error ?? '', /sleep.*disabled|disabled.*sleep/s)
  })
  const host = inventory.signatures.filter(/* 先计算 item.origin === 'host' && item.role === 'callable' && item.available；仅当其为真值时求右侧 !item.internal，返回短路求值结果。 */ item => item.origin === 'host' && item.role === 'callable' && item.available && !item.internal)
  for (const signature of host) check(`actual WASM host overload ${signature.id}`, /** 按签名构造并执行API调用，验证可调用性以及非动态返回类型。 */ () => {
    const locals = signature.parameters.map(/** 按参数默认值生成测试局部变量，缺省映射使用实体句柄，其余使用单元值。 */ (parameter, index) => `let argument_${index}=${parameter.defaultLiteral ?? (parameter.type === 'map' ? 'entity_handle()' : '()')};`).join('')
    const call = `${signature.name}(${signature.parameters.map(/** 生成按索引命名的测试参数变量名。 */ (_, index) => `argument_${index}`).join(',')})`
    const code = `fn start(){${locals}let result=${call};print("__api_type="+type_of(result));}`
    const output = run(code); assert.equal(output.error, undefined, output.error + '\n' + code)
    const tag = output.result.logs.find(/* 调用 item.message.startsWith('__api_type=') 并返回调用结果。 */ item => item.message.startsWith('__api_type=')); assert.ok(tag)
    if (signature.returnType !== 'dynamic') assert.equal(typeOf(tag.message.slice(11)), signature.returnType)
  })
  for (const signature of inventory.signatures.filter(/* 比较 item.role 与 'lifecycle'，返回严格相等的判断结果。 */ item => item.role === 'lifecycle')) check(`actual WASM lifecycle parameter ${signature.name}`, /** 生成生命周期函数并执行，验证运行时传入参数的实际类型。 */ () => {
    const body = signature.parameters.map(/** 生成输出指定生命周期参数类型的Rhai日志语句。 */ (parameter, index) => `print("argument_${index}="+type_of(${parameter.name}));`).join('')
    const code = `fn ${signature.name}(${signature.parameters.map(/* 返回 parameter.name 的当前值。 */ parameter => parameter.name).join(',')}){${body}}`
    const output = run(code, signature.name); assert.equal(output.error, undefined)
    output.result.logs.forEach(/** 将生命周期日志中的实际类型与对应非动态签名类型比较。 */ (item, index) => { if (signature.parameters[index].type !== 'dynamic') assert.equal(typeOf(item.message.split('=')[1]), signature.parameters[index].type) })
  })
  check('every suggested placeholder parses as Rhai, including exact range widths', /** 验证所有可生成的API模板能够解析，且范围默认值绑定正确整数范围类型。 */ () => {
    for (const signature of inventory.signatures) {
      const template = rhaiApiCallTemplate(signature)
      if (template) assert.equal(parseRhai(`fn start(){${template};}`).valid, true, template)
      for (const parameter of signature.parameters) if (parameter.type === 'range' && parameter.defaultLiteral !== null) assert.match(parameter.rustType, /Range(?:Inclusive)?<(?:INT|i64)>/)
    }
  })
  const contribution = /** 构造带API调用标识和默认输入引脚的测试扩展节点定义。 */ (callable, defaults) => ({ type: 'package.test.' + callable, title: 'Pack ' + callable, description: 'Authored extension', category: 'Test library', keywords: 'test', color: '#fff', packageId: 'test.package', api: { callable }, pins: defaults.map(/** 按索引和默认值创建数据输入引脚描述。 */ (defaultValue, index) => ({ key: 'input_' + index, name: 'Input ' + index, kind: 'data', direction: 'input', valueType: 'Data', defaultValue })) })
  const extension = /* 返回 syntaxExtensionDefinitions([contribution(callable, defaults)])[0] 的当前值。 */ (callable, defaults) => syntaxExtensionDefinitions([contribution(callable, defaults)])[0]
  const extensionCall = /** 初始化语法API节点，并从回退槽内容组装可执行调用文本。 */ definition => {
    const node = { uuid: 'alias-probe', type: definition.type, title: definition.title, category: definition.category, position: { x: 0, y: 0 }, size: { width: 0, height: 0 }, collapsed: false, pins: [], config: {} }
    initializeSyntaxApiNode(node, definition.syntaxApiType, definition.syntaxApiDefaults)
    const slots = node.config.slots, callee = slots.find(/* 比较 slot.field 与 'callee'，返回严格相等的判断结果。 */ slot => slot.field === 'callee').fallback
    return { node, code: callee + '(' + slots.filter(/* 比较 slot.field 与 'arguments'，返回严格相等的判断结果。 */ slot => slot.field === 'arguments').map(/* 返回 slot.fallback 的当前值。 */ slot => slot.fallback).join(',') + ')' }
  }
  check('extension aliases only expose real arity-compatible WASM overloads', /** 验证扩展节点拒绝未知、禁用或参数不匹配API，并保留元数据和浮点默认值。 */ () => {
    assert.equal(syntaxExtensionDefinitions([contribution('imaginary_package_function', [])]).length, 0)
    assert.equal(syntaxExtensionDefinitions([contribution('set_position', [2])]).length, 0)
    assert.equal(syntaxExtensionDefinitions([contribution('sleep', [0])]).length, 0)
    assert.equal(syntaxExtensionDefinitions([contribution('export_value', ['value', 3])]).length, 5)
    const definition = extension('set_position', [2, -0]); assert.equal(definition.packageId, 'test.package'); assert.equal(definition.description, 'Authored extension'); assert.deepEqual(definition.syntaxApiDefaults, ['2.0', '-0.0'])
    assert.equal(run(`fn start(){${extensionCall(definition).code};}`).result.commands[0].x, 2)
  })
  check('extension authored strings, booleans and nested JSON survive actual WASM delivery', /** 验证扩展默认值正确转义字符串并保留布尔、数组及嵌套映射。 */ () => {
    const text = 'quote" slash\\b\n tab\t control\b'
    const logging = extensionCall(extension('log_info', [text])); assert.equal(run(`fn start(){${logging.code};}`).result.logs[0].message, text)
    const pause = extensionCall(extension('game_pause', [true])); assert.equal(run(`fn start(){${pause.code};}`).result.commands[0].paused, true)
    const payload = { values: [1, 'text', false], nested: { key: 'value' } }, session = extensionCall(extension('session_set', ['sample', payload]))
    assert.deepEqual(run(`fn start(){${session.code};}`).result.commands[0].value, payload)
  })
  check('extension invalid integer, handle and oversized defaults remain required', /** 验证不合法整数和句柄默认值转为必填输入，超大字符串及集合不内联。 */ () => {
    const fractional = extensionCall(extension('animator_set_integer', ['counter', 3.25])); assert.equal(fractional.node.pins.find(/* 比较 pin.key 与 'arguments_1'，返回严格相等的判断结果。 */ pin => pin.key === 'arguments_1').required, true)
    const integer = extension('animator_set_integer', ['counter', 3]); assert.equal(integer.syntaxApiDefaults[1], '3')
    const handle = extensionCall(extension('entity_set_position', [{ valid: true }, 2, 3])); assert.equal(handle.node.pins.find(/* 比较 pin.key 与 'arguments_0'，返回严格相等的判断结果。 */ pin => pin.key === 'arguments_0').required, true)
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
    check('isolated actual WASM: ' + name, /** 在隔离WASM模块中执行样本，验证无错误且日志完全符合预期。 */ () => { const output = run(code, 'start', isolated); assert.equal(output.error, undefined); assert.deepEqual(output.result.logs.map(/* 返回 item.message 的当前值。 */ item => item.message), expected) })
  }
  console.log(JSON.stringify({ generatedAt: new Date().toISOString(), status: fail.length ? 'failed' : 'passed', checks: checks.length, hostOverloadsExecuted: host.length, lifecycleCallbacksExecuted: 15, isolatedPlatformProbes: platformProbes.length, signatureCount: inventory.signatures.length, failed: checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed') }, null, 2))
  const report = process.argv.find(/* 调用 value.startsWith('--report=') 并返回调用结果。 */ value => value.startsWith('--report='))?.slice(9)
  if (report) await writeFile(report, JSON.stringify({ generatedAt: new Date().toISOString(), status: fail.length ? 'failed' : 'passed', checks, hostOverloadsExecuted: host.length, isolatedPlatformProbes: platformProbes.length, signatureCount: inventory.signatures.length }, null, 2))
  if (fail.length) process.exitCode = 1
} finally { await captureNodeBundle22(temporary);await rm(temporary, { recursive: true, force: true }) }
