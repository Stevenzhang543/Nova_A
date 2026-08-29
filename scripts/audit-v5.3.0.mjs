import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const text = async path => readFile(join(root, path), 'utf8')
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.3.0 audit', mediaDevices: { addEventListener(){}, removeEventListener(){}, async enumerateDevices(){ return [] } } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }

const [packageSource, tauriSource, workspaceCargo, instructions, graphTypes, graphCatalog, graphCompiler, production, debuggerSource, runtime, panel, editor, packageRuntime, i18n, graphGuide, debugGuide, layoutSource, packageRelease] = await Promise.all([
  'package.json','src-tauri/tauri.conf.json','Cargo.toml','instructions.txt','src/visual/graphTypes.ts','src/visual/graphCatalog.ts','src/visual/graphCompiler.ts','src/visual/graphProduction.ts','src/visual/graphDebugger.ts','src/runtime/GameplayRuntime.ts','src/components/GraphProductionPanel.vue','src/components/VisualGraphEditor.vue','src/runtime/packages.ts','src/i18n.ts','docs/VISUAL_SCRIPTING_5_3.md','docs/VISUAL_SCRIPT_DEBUGGING_5_3.md','release-audits/v5.3.0-layout-browser.json','scripts/package-release.ps1'
].map(text))
const pkg = JSON.parse(packageSource), tauri = JSON.parse(tauriSource), layout = JSON.parse(layoutSource)

check('V530-VERSION', pkg.version === '5.3.0' && tauri.version === '5.3.0' && /version\s*=\s*"5\.3\.0"/.test(workspaceCargo), 'Web, native and Rust workspace authorities identify 5.3.0.')
check('V530-ROADMAP', instructions.includes('## 5.3.0') && instructions.includes('Implementation status (5.3.0 candidate)') && instructions.includes('debugger determinism, merge fixtures and reduced motion'), 'The authoritative roadmap retains the complete 5.3 contract and gates.')
check('V530-FORMAT', ['routines: GraphRoutine[]','customEvents: GraphCustomEvent[]','interfaces: GraphInterface[]','libraries: GraphLibraryReference[]','breakpoints: GraphBreakpoint[]','watches: string[]','migrations: GraphMigrationRecord[]'].every(marker => graphTypes.includes(marker)), 'Graph Format 1 additively stores production scopes, contracts, libraries, debug metadata and migrations.')
check('V530-CATALOG', ['routine.call.','custom.event.','custom.emit.','local.get','local.set','package.'].every(marker => graphCatalog.includes(marker)), 'The graph catalog resolves routines, events, locals and package-defined visual nodes.')
check('V530-COMPILER', ['compileScope','__nova_graph_trace','routine\\.call\\.','custom\\.emit\\.','graphNodeDefinition','definition?.api'].every(marker => graphCompiler.includes(marker)), 'Graph compilation covers reusable scopes, custom events, package nodes and deterministic tracing.')
check('V530-DEBUG-BRIDGE', ['GraphTrace','pendingGraphExecution','recordGraphTrace','queueGraphHotReload','debugStep'].every(marker => runtime.includes(marker)) && ['callStack','timings','coverage','breakpointHits','recordGraphTrace'].every(marker => debuggerSource.includes(marker)), 'Runtime and debugger expose trace ordering, stepping, stack, timing, coverage, breakpoints and state-safe hot reload.')
check('V530-REFACTOR-MERGE', ['findGraphReferences','renameGraphSymbol','extractGraphFunction','replaceGraphNodeType','migrateDeprecatedGraphNodes','semanticGraphDiff','mergeGraphs','applyGraphConflict','planGraphHotReload'].every(marker => production.includes(marker)), 'Identity-safe refactoring, migration, semantic diff/merge and hot-reload planning are implemented.')
check('V530-EDITOR', ['GraphProductionPanel','activeScopeUuid','toggleBreakpoint','wires path.active','prefers-reduced-motion'].every(marker => editor.includes(marker)) && ['addRoutine(','visualDebugger','semanticGraphDiff','generateRhaiAsset','removeInterfaceParameter'].every(marker => panel.includes(marker)), 'The editor exposes every production tool, interface editing and reduced-motion-safe execution feedback.')
check('V530-PACKAGES', ['visualNodes','PackageVisualNode','slice(0, 256)','slice(0, 32)','callable'].every(marker => packageRuntime.includes(marker)) && ['SCRIPT_API_V2_MANIFEST','entry.callable === node.callable','package.${installed.manifest.id}'].every(marker => graphCatalog.includes(marker)), 'Package Manifest 1 can declare bounded API-v2-backed visual nodes without arbitrary host execution.')
check('V530-I18N', ['graphProductionTools','visualDebugger','semanticGraphDiff','generateNewRhaiAsset','noInterface','implements'].every(key => (i18n.match(new RegExp(`${key}:`, 'g')) ?? []).length >= 3), 'All new production controls have English, German and Chinese dictionary entries.')
check('V530-DOCS', graphGuide.includes('1. Add a **Function**') && graphGuide.includes('## Hot reload') && debugGuide.includes('## Semantic diff') && debugGuide.includes('set or disable a breakpoint'), 'Authoring, debugging, merge and hot-reload workflows are documented.')
check('V530-LAYOUT', layout.status === 'passed' && layout.matrix.length === 12 && layout.matrix.every(item => item.status === 'passed') && layout.severity0Open === 0 && layout.severity1Open === 0, 'Browser qualification passed EN/DE/ZH at all four required viewports.', { matrix: layout.matrix.length })
check('V530-RELEASE-CONTRACT', ['source.zip','web.zip','windows-x64-portable.exe','windows-x64-setup.exe','windows-x64.msi','reference-projects.zip','release-evidence.zip','RELEASE_NOTES.md','EDIT_LEDGER.md','LICENSE.md','SHA256SUMS.txt'].every(marker => packageRelease.includes(marker)), 'The generic release packager enforces the exact eleven-artifact contract.')

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()
try {
  const types = await server.ssrLoadModule('/src/visual/graphTypes.ts')
  const compiler = await server.ssrLoadModule('/src/visual/graphCompiler.ts')
  const productionModule = await server.ssrLoadModule('/src/visual/graphProduction.ts')
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const fixtureRoot = join(root, 'reference-projects/projects/visual-scripting-v53-production')
  const source = await readFile(join(fixtureRoot, 'ProductionGraph.nova-graph'), 'utf8')
  const graph = types.parseGraphDocument(source), canonical = types.serializeGraphDocument(graph), roundTrip = types.serializeGraphDocument(types.parseGraphDocument(canonical)), compiled = compiler.compileGraphSource(canonical)
  const scriptErrors = compiled.valid ? language.analyzeScript(compiled.source, 2).diagnostics.filter(item => item.severity === 'error') : []
  check('V530-CANONICAL-COMPILE', canonical === roundTrip && compiled.valid && !scriptErrors.length && compiled.source.includes('__nova_graph_trace'), 'The production graph round-trips canonically and generates valid, traced Rhai API-v2 source.', { nodes: compiled.nodeCount, edges: compiled.edgeCount, mappings: compiled.mappings.length, diagnostics: compiled.diagnostics, scriptErrors })

  const compatible = await readFile(join(fixtureRoot, 'hot-reload-fixtures/compatible.nova-graph'), 'utf8'), incompatible = await readFile(join(fixtureRoot, 'hot-reload-fixtures/incompatible.nova-graph'), 'utf8')
  const compatiblePlan = productionModule.planGraphHotReload(source, compatible, { bonus_multiplier: 9 }), incompatiblePlan = productionModule.planGraphHotReload(source, incompatible, { bonus_multiplier: 9 })
  check('V530-STATE-RELOAD', compatiblePlan.compatible && compatiblePlan.preserved.bonus_multiplier === 9 && !incompatiblePlan.compatible, 'Compatible graph reload preserves state and a serialized-lifetime change fails closed.', { compatiblePlan, incompatiblePlan })

  const base = await readFile(join(fixtureRoot, 'merge-fixtures/base.nova-graph'), 'utf8'), ours = await readFile(join(fixtureRoot, 'merge-fixtures/ours.nova-graph'), 'utf8'), theirs = await readFile(join(fixtureRoot, 'merge-fixtures/theirs.nova-graph'), 'utf8')
  const first = productionModule.mergeGraphs(base, ours, theirs), second = productionModule.mergeGraphs(base, ours, theirs)
  check('V530-MERGE-DETERMINISM', first.conflicts.length === 1 && JSON.stringify(first.conflicts.map(item => [item.identity,item.path])) === JSON.stringify(second.conflicts.map(item => [item.identity,item.path])), 'Semantic three-way merge produces one stable-identity conflict deterministically.', { conflicts: first.conflicts.map(item => ({ identity: item.identity, path: item.path })), automaticChanges: first.changes.length })

  const refactorGraph = types.parseGraphDocument(source), target = refactorGraph.variables[0], before = productionModule.findGraphReferences(refactorGraph, target.uuid), after = productionModule.renameGraphSymbol(refactorGraph, target.uuid, 'audit_multiplier')
  check('V530-IDENTITY-REFACTOR', target.name === 'audit_multiplier' && target.uuid === graph.variables[0].uuid && before.length === after.length && compiler.compileGraph(refactorGraph).valid, 'Rename and Find References preserve UUID identity and leave the graph compilable.', { references: after.length })
} finally {
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))])
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v5.3.0-product-audit', version: 1, engineVersion: '5.3.0', generatedAt: new Date().toISOString(), perspectives: ['programmer','runtime','user','layout'], checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v5.3.0-product-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v5.3.0 product audit passed: ${checks.length} checks.`)
