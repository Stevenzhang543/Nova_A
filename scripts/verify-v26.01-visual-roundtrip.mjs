/** 验证脚本（v26.01-visual-roundtrip）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import { build } from 'vite'
import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

globalThis.crypto ??= webcrypto
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem() { return null }, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem() {}, /** 隔离存储桩忽略删除请求。 */ removeItem() {} }
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2601-visual-'))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { sync: join(root, 'src/visual/graphCodeSync.ts'), compiler: join(root, 'src/visual/graphCompiler.ts'), language: join(root, 'src/editor/scriptLanguage.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = /* 调用 import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`) 并返回调用结果。 */ name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [sync, compiler, language] = await Promise.all(['sync', 'compiler', 'language'].map(load))
  const source = `@export(type="number", min=0, max=100) let score = 0.0;
let enabled = true;

fn reward(amount) {
  score = score + amount;
  if amount > 0.0 {
    score_add(amount);
  } else {
    log_info("ignored");
  }
}

fn start() {
  reward(1.0);
}

fn update(dt) {
  if input_pressed("Action") && enabled {
    set_position(mouse_world_x(), mouse_world_y());
  } else {
    set_velocity(0.0, 0.0);
  }
  for index in 0..3 {
    log_debug("tick");
  }
}
`
  // This historical verifier retains the 26.01 node-model contract. The 26.12
  // default typed AST projection has its own structural/differential suite.
  const graph = sync.createLegacyGraphFromRhaiSource(source, '26.01 Round Trip', '26010000-0000-4000-8000-000000000001')
  const scopes = [graph, ...graph.routines]
  const types = scopes.flatMap(/** 提取作用域内各节点类型以比较转换后的图结构。 */ scope => scope.nodes.map(/* 返回 node.type 的当前值。 */ node => node.type))
  check('V2601-GRAPH-STRUCTURE', ['event.start','event.update','flow.branch','flow.repeat','variable.get','variable.set','logic.and','compare.greater','api.input_pressed','api.mouse_world_x','api.mouse_world_y','api.set_position','api.set_velocity','api.score_add'].every(/* 调用 types.includes(type) 并返回调用结果。 */ type => types.includes(type)), 'Variables, API values, operators, conditions, bounded loops, lifecycle events and commands become editable typed blocks.', { types: [...new Set(types)].sort(), nodes: types.length })
  check('V2601-MY-BLOCKS', graph.routines.some(/** 判断例程是否为带amount参数的reward函数。 */ routine => routine.name === 'reward' && routine.inputs.some(/* 比较 input.name 与 'amount'，返回严格相等的判断结果。 */ input => input.name === 'amount')) && types.some(/* 调用 type.startsWith('routine.call.') 并返回调用结果。 */ type => type.startsWith('routine.call.')), 'A custom Rhai function and its calls become a My Blocks routine with parameters.')
  const validation = compiler.validateGraph(graph)
  check('V2601-GRAPH-VALID', validation.valid, 'The generated graph passes the same typed-pin, edge, UUID, cycle and resource validation used by the editor.', { diagnostics: validation.diagnostics })
  const generated = sync.createLinkedRhaiSource(graph), generatedAnalysis = language.analyzeScript(generated, 2)
  check('V2601-GENERATED-RHAI', generated.includes('// @nova-graph-link 26010000-0000-4000-8000-000000000001') && generated.includes('fn reward(amount)') && generated.includes('for index in 0..') && generatedAnalysis.diagnostics.every(/* 比较 item.severity 与 'error'，返回严格不等的判断结果。 */ item => item.severity !== 'error'), 'Visual blocks compile into linked API-v2 Rhai with original author signatures, stable source markers and no static errors.', { diagnostics: generatedAnalysis.diagnostics })
  // This is the editor's real linked-code path: marker regions update the
  // existing graph rather than discarding identity by treating generated
  // trace statements as a brand-new unlinked script.
  const reparsed = sync.applyLinkedRhaiSource(graph, generated).graph, recompiled = sync.createLinkedRhaiSource(reparsed)
  const reparsedTypes = [reparsed, ...reparsed.routines].flatMap(/** 提取作用域内各节点类型以比较转换后的图结构。 */ scope => scope.nodes.map(/* 返回 node.type 的当前值。 */ node => node.type))
  const roundTrip = { identity: reparsed.uuid === graph.uuid, variables: reparsed.variables.length === graph.variables.length, branch: reparsedTypes.includes('flow.branch'), repeat: reparsedTypes.includes('flow.repeat'), variableSet: reparsedTypes.includes('variable.set'), scoreCall: recompiled.includes('score_add') }
  check('V2601-TWO-WAY', Object.values(roundTrip).every(Boolean), 'Switching code → visual → code preserves the graph identity, variables, structured control flow and gameplay calls.', { reparsedNodes: reparsedTypes.length, roundTrip, reparsedTypes: [...new Set(reparsedTypes)].sort() })
  const unsupported = sync.createLegacyGraphFromRhaiSource('fn update(dt) { try { custom_unknown(dt); } catch (error) { log_error(error); } }', 'Lossless')
  check('V2601-LOSSLESS-FALLBACK', [unsupported, ...unsupported.routines].some(/* 调用 scope.nodes.some(node => node.type === 'code.statement' && String(node.config.source).includes('try')) 并返回调用结果。 */ scope => scope.nodes.some(/* 先计算 node.type === 'code.statement'；仅当其为真值时求右侧 String(node.config.source).includes('try')，返回短路求值结果。 */ node => node.type === 'code.statement' && String(node.config.source).includes('try'))), 'Unsupported but valid Rhai remains visible as a bounded editable Rhai block instead of being deleted.')
} finally { await rm(compiled, { recursive: true, force: true }) }

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v26.01-visual-roundtrip', version: 1, release: '26.01', engineVersion: JSON.parse(await readFile(join(root, 'package.json'), 'utf8')).version, scope: 'Current implementation of the retained 26.01 legacy graph contract; the default 26.12 AST model is verified separately.', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.01-visual-roundtrip.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.01 visual round-trip passed: ${checks.length} checks.`)
