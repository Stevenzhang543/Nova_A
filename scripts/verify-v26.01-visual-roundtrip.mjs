import { build } from 'vite'
import { webcrypto } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

globalThis.crypto ??= webcrypto
globalThis.localStorage ??= { getItem() { return null }, setItem() {}, removeItem() {} }
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2601-visual-'))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })

try {
  await build({ configFile: false, root, logLevel: 'warn', ssr: { noExternal: true }, build: { ssr: true, outDir: compiled, emptyOutDir: false, rollupOptions: { input: { sync: join(root, 'src/visual/graphCodeSync.ts'), compiler: join(root, 'src/visual/graphCompiler.ts'), language: join(root, 'src/editor/scriptLanguage.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' } } } })
  const load = name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
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
  const graph = sync.createGraphFromRhaiSource(source, '26.01 Round Trip', '26010000-0000-4000-8000-000000000001')
  const scopes = [graph, ...graph.routines]
  const types = scopes.flatMap(scope => scope.nodes.map(node => node.type))
  check('V2601-GRAPH-STRUCTURE', ['event.start','event.update','flow.branch','flow.repeat','variable.get','variable.set','logic.and','compare.greater','api.input_pressed','api.mouse_world_x','api.mouse_world_y','api.set_position','api.set_velocity','api.score_add'].every(type => types.includes(type)), 'Variables, API values, operators, conditions, bounded loops, lifecycle events and commands become editable typed blocks.', { types: [...new Set(types)].sort(), nodes: types.length })
  check('V2601-MY-BLOCKS', graph.routines.some(routine => routine.name === 'reward' && routine.inputs.some(input => input.name === 'amount')) && types.some(type => type.startsWith('routine.call.')), 'A custom Rhai function and its calls become a My Blocks routine with parameters.')
  const validation = compiler.validateGraph(graph)
  check('V2601-GRAPH-VALID', validation.valid, 'The generated graph passes the same typed-pin, edge, UUID, cycle and resource validation used by the editor.', { diagnostics: validation.diagnostics })
  const generated = sync.createLinkedRhaiSource(graph), generatedAnalysis = language.analyzeScript(generated, 2)
  check('V2601-GENERATED-RHAI', generated.includes('// @nova-graph-link 26010000-0000-4000-8000-000000000001') && generated.includes('fn reward(__nova_call_depth, amount)') && generated.includes('for __index_') && generatedAnalysis.diagnostics.every(item => item.severity !== 'error'), 'Visual blocks compile into linked API-v2 Rhai with stable source markers and no static errors.', { diagnostics: generatedAnalysis.diagnostics })
  // This is the editor's real linked-code path: marker regions update the
  // existing graph rather than discarding identity by treating generated
  // trace statements as a brand-new unlinked script.
  const reparsed = sync.applyLinkedRhaiSource(graph, generated).graph, recompiled = sync.createLinkedRhaiSource(reparsed)
  const reparsedTypes = [reparsed, ...reparsed.routines].flatMap(scope => scope.nodes.map(node => node.type))
  const roundTrip = { identity: reparsed.uuid === graph.uuid, variables: reparsed.variables.length === graph.variables.length, branch: reparsedTypes.includes('flow.branch'), repeat: reparsedTypes.includes('flow.repeat'), variableSet: reparsedTypes.includes('variable.set'), scoreCall: recompiled.includes('score_add') }
  check('V2601-TWO-WAY', Object.values(roundTrip).every(Boolean), 'Switching code → visual → code preserves the graph identity, variables, structured control flow and gameplay calls.', { reparsedNodes: reparsedTypes.length, roundTrip, reparsedTypes: [...new Set(reparsedTypes)].sort() })
  const unsupported = sync.createGraphFromRhaiSource('fn update(dt) { try { custom_unknown(dt); } catch (error) { log_error(error); } }', 'Lossless')
  check('V2601-LOSSLESS-FALLBACK', [unsupported, ...unsupported.routines].some(scope => scope.nodes.some(node => node.type === 'code.statement' && String(node.config.source).includes('try'))), 'Unsupported but valid Rhai remains visible as a bounded editable Rhai block instead of being deleted.')
} finally { await rm(compiled, { recursive: true, force: true }) }

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.01-visual-roundtrip', version: 1, release: '26.01', engineVersion: '26.1.0', generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.01-visual-roundtrip.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.01 visual round-trip passed: ${checks.length} checks.`)
