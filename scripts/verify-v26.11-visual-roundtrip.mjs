/** 验证脚本（v26.11-visual-roundtrip）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import assert from 'node:assert/strict'
import { build } from 'vite'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(join(tmpdir(), 'nova-v2611-roundtrip-'))
const checks = []
const check = /** 执行同步检查并捕获异常，将通过状态或错误信息写入检查列表。 */ (id, run) => { try { run(); checks.push({ id, status: 'passed' }) } catch (error) { checks.push({ id, status: 'failed', error: error.message }) } }
const scopes = /* 返回按声明顺序构造的数组 [graph, ...graph.routines]。 */ graph => [graph, ...graph.routines]
const fixtures = {
  loop: `fn test_loop() { let sum = 0; for index in 0..3 { sum += index; } assert_eq(sum, 3); }`,
  else_if: `fn test_else_if() { let result = 0; if false { result = 1; } else if false { result = 2; } else { result = 3; } assert_eq(result, 3); }`,
  helper: `fn combine(left, right) { return left * 10 + right; }\nfn test_helper() { assert_eq(combine(2, 7), 27); }`,
  implicit: `fn twice(value) { value * 2 }\nfn test_implicit() { assert_eq(twice(4), 8); }`,
  comments: `// fn fake() { throw "must not exist"; }\n/* outer /* nested */ fn fake_two() {} */\nfn test_comments() { let text = "fn imaginary() { }"; assert_eq(text, "fn imaginary() { }"); }`,
  integer: `let numerator = 7;\nfn test_integer() { assert_eq(numerator / 2, 3); }`,
  dynamic_loop: `fn test_dynamic_loop() { let total = 0; let count = 1025; for i in 0..count { total += 1; } assert_eq(total, 1025); }`,
  try_catch: `fn test_try_catch() { let result = false; try { throw "expected"; } catch (error) { result = true; } assert_eq(result, true); }`,
  literal_delimiters: `fn test_literal_delimiters() { assert_eq("a\\\"+b", "a\\\"+b"); }`,
  declaration_result: `fn test_declaration_result() { let value = session_get("absent", 17); assert_eq(value, 17); }`,
  initialization: `let value = 1;\nvalue = 2;\nlet copied = value;\nfn test_initialization() { assert_eq(copied, 2); }`,
  implicit_branch: `fn choose(value) { if value { 7 } else { 9 } }\nfn test_implicit_branch() { assert_eq(choose(true), 7); assert_eq(choose(false), 9); }`,
  multiline_string: 'fn test_multiline_string() { let text = `first\n  second  \nthird`; assert_eq(text, "first\\n  second  \\nthird"); }',
  string_operator: `fn test_string_operator() { assert_eq("left" + "right", "leftright"); }`,
  trigonometry: `fn test_trigonometry() { assert_eq(sin(0.0), 0.0); assert_eq(cos(0.0), 1.0); }`,
  commented_return: 'fn returned() { 42 // returned value\n }\nfn test_commented_return() { assert_eq(returned(), 42); }',
  commented_global: '/*\nlet ghost = 42;\n*/\nfn test_commented_global() { assert_eq(is_def_var("ghost"), false); }',
  bare_export: '@export let count = 7;\nfn test_bare_export() { assert_eq(count / 2, 3); }',
  metadata_export: '@export(type="number", min=0, max=12) let count = 7;\nfn test_metadata_export() { assert_eq(count / 2, 3); }',
  signed_literal: 'let numerator = +7;\nfn test_signed_literal() { assert_eq(numerator / 2, 3); }',
  signed_array: 'let numerator = [+7];\nfn test_signed_array() { assert_eq(numerator[0] / 2, 3); }',
  tail_statements: 'fn declaration() { let value = 42 }\nfn assignment() { let value = 0; value = 3 }\nfn test_tail_statements() { assert_eq(declaration(), ()); assert_eq(assignment(), ()); }',
  bounded_values: 'let values = [9999999];\nfn test_bounded_values() { assert_eq(values[0], 9999999); }',
}

try {
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, build: { ssr: true, outDir: join(temporary, 'compiled'), rollupOptions: { input: { sync: join(root, 'src/visual/graphCodeSync.ts'), compiler: join(root, 'src/visual/graphCompiler.ts'), layout: join(root, 'src/visual/graphInteraction.ts'), types: join(root, 'src/visual/graphTypes.ts'), catalog: join(root, 'src/visual/graphCatalog.ts'), production: join(root, 'src/visual/graphProduction.ts'), assets: join(root, 'src/assets/AssetDatabase.ts'), language: join(root, 'src/editor/scriptLanguage.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' } } } })
  const load = /* 调用 import(pathToFileURL(join(temporary, 'compiled', `${name}.mjs`))) 并返回调用结果。 */ name => import(pathToFileURL(join(temporary, 'compiled', `${name}.mjs`)))
  const [syncModule, compiler, layout, types, catalog, production, assets, language] = await Promise.all(['sync', 'compiler', 'layout', 'types', 'catalog', 'production', 'assets', 'language'].map(load))
  // This corpus continues to qualify the retained 26.11 graph representation.
  const sync = { ...syncModule, createGraphFromRhaiSource: syncModule.createLegacyGraphFromRhaiSource }
  check('verified Rhai trigonometry is recognized while unknown clamp remains diagnosed', /** 验证三角函数可识别，未支持的clamp调用产生唯一的未知函数诊断。 */ () => {
    const analysis = language.analyzeScript('fn update(dt) { sin(dt); cos(dt); clamp(dt, 0.0, 1.0); }')
    const unknown = analysis.diagnostics.filter(/* 比较 item.code 与 'NOVA-SEM-003'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-SEM-003')
    assert.equal(unknown.length, 1); assert.match(unknown[0].message, /clamp/)
  })
  check('text contents are not diagnosed as function calls', /** 验证日志字符串内类似函数调用的内容不会产生未知调用诊断。 */ () => {
    assert.equal(language.analyzeScript('fn start() { log_info("imaginary_call()"); }').diagnostics.some(/* 比较 item.code 与 'NOVA-SEM-003'，返回严格相等的判断结果。 */ item => item.code === 'NOVA-SEM-003'), false)
  })
  const runtimeDirectory = join(temporary, 'runtime')
  await mkdir(runtimeDirectory)
  for (const [name, source] of Object.entries(fixtures)) {
    const graph = sync.createGraphFromRhaiSource(source, name), generated = sync.createLinkedRhaiSource(graph)
    check(`${name}: graph validation`, /* 调用 assert.equal(compiler.validateGraph(graph).valid, true) 并返回调用结果。 */ () => assert.equal(compiler.validateGraph(graph).valid, true))
    check(`${name}: automatic layout`, /* 调用 assert.deepEqual(scopes(graph).flatMap(scope => layout.graphLayoutOverlaps(scope.nodes, 8)), []) 并返回调用结果。 */ () => assert.deepEqual(scopes(graph).flatMap(/* 调用 layout.graphLayoutOverlaps(scope.nodes, 8) 并返回调用结果。 */ scope => layout.graphLayoutOverlaps(scope.nodes, 8)), []))
    check(`${name}: no-op preserves graph identity`, /** 验证链接Rhai源码重新应用后图文档序列化结果保持不变。 */ () => assert.equal(types.serializeGraphDocument(sync.applyLinkedRhaiSource(graph, generated).graph), types.serializeGraphDocument(graph)))
    const assertion = '\nfn assert_eq(actual, expected) { if actual != expected { throw `Expected ${expected}, got ${actual}`; } }\n'
    await writeFile(join(runtimeDirectory, `${name}-original.rhai`), source + assertion)
    await writeFile(join(runtimeDirectory, `${name}-generated.rhai`), generated + assertion)
  }
  check('binary API expression retains both operands', /** 验证源码与图往返保留鼠标坐标组合表达式和更新函数参数。 */ () => {
    const graph = sync.createGraphFromRhaiSource('fn update(delta) { set_position(mouse_world_x() + mouse_world_y(), 0); }')
    const output = sync.createLinkedRhaiSource(graph)
    assert.match(output, /mouse_world_x\(\) \+ mouse_world_y\(\)/)
    assert.match(output, /fn update\(delta\)/)
  })
  const rewired = sync.createGraphFromRhaiSource('fn update(delta) { set_position(delta, 0.0); }\nfn test_event_pin() { update(1.0); }')
  check('rewiring an imported event reporter retains its parameter binding', /** 将位置输入改接到更新时间引脚，验证生成源码使用对应函数参数。 */ () => {
    const event = rewired.nodes.find(/* 比较 node.type 与 'event.update'，返回严格相等的判断结果。 */ node => node.type === 'event.update'), command = rewired.nodes.find(/* 比较 node.type 与 'api.set_position'，返回严格相等的判断结果。 */ node => node.type === 'api.set_position')
    const output = event.pins.find(/* 比较 pin.key 与 'dt'，返回严格相等的判断结果。 */ pin => pin.key === 'dt'), input = command.pins.find(/* 比较 pin.key 与 'x'，返回严格相等的判断结果。 */ pin => pin.key === 'x')
    rewired.edges = rewired.edges.filter(/* 比较 edge.to.pinUuid 与 input.uuid，返回严格不等的判断结果。 */ edge => edge.to.pinUuid !== input.uuid)
    rewired.edges.push({ uuid: types.graphUuid(), from: { nodeUuid: event.uuid, pinUuid: output.uuid }, to: { nodeUuid: command.uuid, pinUuid: input.uuid } })
    assert.match(sync.createLinkedRhaiSource(rewired), /set_position\(delta, 0\.0\)/)
  })
  await writeFile(join(runtimeDirectory, 'rewired-event.rhai'), sync.createLinkedRhaiSource(rewired))
  check('function names inside comments and strings stay inert', /** 验证带注释的源码仅产生实际声明的例程。 */ () => {
    const graph = sync.createGraphFromRhaiSource(fixtures.comments)
    assert.deepEqual(graph.routines.map(/* 返回 item.name 的当前值。 */ item => item.name), ['test_comments'])
  })
  check('parameter order is semantic rather than UUID order', /** 用逆序UUID验证例程参数序列化按声明顺序而非标识排序。 */ () => {
    const graph = catalog.defaultVisualGraph(), routine = production.createGraphRoutine('function', 'ordered')
    const left = production.addRoutineParameter(routine, 'input', 'left', 'Number'), right = production.addRoutineParameter(routine, 'input', 'right', 'Number')
    left.uuid = 'ffffffff-0000-4000-8000-000000000001'; right.uuid = '00000000-0000-4000-8000-000000000001'
    graph.routines.push(routine)
    assert.deepEqual(types.parseGraphDocument(types.serializeGraphDocument(graph)).routines[0].inputs.map(/* 返回 item.name 的当前值。 */ item => item.name), ['left', 'right'])
  })
  const original = sync.createGraphFromRhaiSource('fn start() { score_add(1); score_add(2); }', 'Edit synchronization')
  const linked = sync.createLinkedRhaiSource(original)
  check('deleting a marked command does not resurrect it', /** 从链接源码删除一条得分命令，验证图重新生成时保留其它命令且不恢复已删除语句。 */ () => {
    const edited = linked.split('\n').filter(/* 返回 /score_add\(2\)/.test(line) 的逻辑取反结果。 */ line => !/score_add\(2\)/.test(line)).join('\n')
    const regenerated = sync.createLinkedRhaiSource(sync.applyLinkedRhaiSource(original, edited).graph)
    assert.doesNotMatch(regenerated, /score_add\(2(?:\.0)?\)/)
    assert.match(regenerated, /score_add\(1(?:\.0)?\)/)
  })
  check('adding an unmarked command stays inside the callback', /** 验证在链接源码中新增得分命令后，重新生成的启动函数保留该语句。 */ () => {
    const edited = linked.replace(/(score_add\(1\);[^\n]*\n)/, '$1  score_add(7);\n')
    const regenerated = sync.createLinkedRhaiSource(sync.applyLinkedRhaiSource(original, edited).graph)
    assert.match(regenerated, /fn start\(\)[\s\S]*score_add\(7(?:\.0)?\)/)
  })
  check('asset save recognizes multiline node markers and keeps identities', /** 验证脚本与图资源关联后同步命中原图资产，并保持图文档内容一致。 */ () => {
    const graphAsset = assets.createTextAsset(original.name, 'visualScript', types.serializeGraphDocument(original), 'Assets/Visual Scripts')
    const script = assets.createTextAsset('Round trip', 'script', linked, 'Assets/Scripts')
    sync.linkScriptToGraph(script.uuid, original)
    const synchronized = sync.synchronizeLinkedGraphForScript(script.uuid, linked)
    assert.equal(synchronized.graphAssetUuid, graphAsset.uuid)
    assert.equal(types.serializeGraphDocument(synchronized.graph), types.serializeGraphDocument(original))
  })
  check('oversized source is rejected instead of truncated', /* 调用 assert.throws(() => sync.createGraphFromRhaiSource(`// ${'x'.repeat(64_000)}`), /64,000/) 并返回调用结果。 */ () => assert.throws(/* 调用 sync.createGraphFromRhaiSource(`// ${'x'.repeat(64_000)}`) 并返回调用结果。 */ () => sync.createGraphFromRhaiSource(`// ${'x'.repeat(64_000)}`), /64,000/))
  check('module and statement source line count is not truncated', /** 验证超过两千行的源码模块未被截断，且每行源码映射保持完整。 */ () => {
    const graph = catalog.defaultVisualGraph(), module = catalog.createGraphNode('code.module', 0, 0, graph)
    module.config.source = `${'// preserved\n'.repeat(2100)}fn source_tail() { return 12; }`; graph.nodes.push(module)
    assert.match(compiler.compileGraph(graph).source, /fn source_tail\(\)/)
    const result = compiler.compileGraph(graph)
    assert.deepEqual(result.mappings.filter(/* 比较 item.nodeUuid 与 module.uuid，返回严格相等的判断结果。 */ item => item.nodeUuid === module.uuid).map(/* 返回 result.source.split('\n')[mapping.generatedLine - 1] 的当前值。 */ mapping => result.source.split('\n')[mapping.generatedLine - 1]), module.config.source.split('\n'))
  })
  const runtime = process.argv.find(/* 调用 argument.startsWith('--runtime=') 并返回调用结果。 */ argument => argument.startsWith('--runtime='))?.slice('--runtime='.length)
  if (runtime) {
    const result = await new Promise(/** 启动原生运行时检查程序，合并输出并在启动失败或退出时返回结果。 */ resolveResult => {
      const child = spawn(resolve(runtime), [runtimeDirectory, '--format', 'json'], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
      let output = ''; child.stdout.on('data', /** 将进程输出块追加到结果文本。 */ chunk => { output += chunk }); child.stderr.on('data', /** 将进程输出块追加到结果文本。 */ chunk => { output += chunk })
      child.on('error', /* 调用 resolveResult({ code: -1, output: error.message }) 并返回调用结果。 */ error => resolveResult({ code: -1, output: error.message })); child.on('close', /* 调用 resolveResult({ code, output }) 并返回调用结果。 */ code => resolveResult({ code, output }))
    })
    check('native Rhai original/generated behavior', /** 验证原生运行时退出成功，全部预期样本通过且没有失败或跳过。 */ () => {
      assert.equal(result.code, 0, result.output)
      const report = JSON.parse(result.output)
      assert.equal(report.failed, 0)
      assert.equal(report.passed, Object.keys(fixtures).length * 2 + 1)
      assert.equal(report.skipped, 0)
    })
  }
  const report = { release: '26.11', status: checks.some(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed') ? 'failed' : 'passed', nativeRuntime: runtime ? 'run' : 'not requested', checks }
  await mkdir(join(root, 'release-audits'), { recursive: true })
  await writeFile(join(root, 'release-audits/v26.11-visual-roundtrip.json'), `${JSON.stringify(report, null, 2)}\n`)
  console.log(JSON.stringify(report, null, 2))
  if (report.status === 'failed') process.exitCode = 1
} finally {
  // This is the exact directory returned by mkdtemp, never a computed parent.
  await rm(temporary, { recursive: true, force: true })
}
