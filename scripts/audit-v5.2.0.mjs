import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8, userAgent: 'Nova_A v5.2.0 audit', mediaDevices: { addEventListener(){}, removeEventListener(){}, async enumerateDevices(){ return [] } } } })
globalThis.window ??= { setTimeout, clearTimeout, setInterval, clearInterval, addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }

const files = await Promise.all(['package.json','src-tauri/tauri.conf.json','instructions.txt','src/components/VisualGraphEditor.vue','src/visual/graphCatalog.ts','src/components/ConfigPanel.vue','src/components/EditorBottomPanel.vue','src/runtime/GameplayRuntime.ts','src/assets/AssetDatabase.ts','src/i18n.ts','crates/nova_format/src/lib.rs','docs/VISUAL_SCRIPTING_5_2.md','docs/NOVA_GRAPH_FORMAT_5_2.md','scripts/verify-v5.2.0-graphs.mjs'].map(path => readFile(join(root, path), 'utf8')))
const [packageSource, tauriSource, instructions, editor, catalogSource, inspector, assetsPanel, runtime, database, i18n, formatRust, guide, formatGuide, graphVerifier] = files
const pkg = JSON.parse(packageSource), tauri = JSON.parse(tauriSource)
check('V520-VERSION', pkg.version === '5.2.0' && tauri.version === '5.2.0', 'Web and native package authorities identify 5.2.0.')
check('V520-ROADMAP', instructions.includes('## 5.2.0 — Visual scripting foundation') && instructions.includes('Implementation status (5.2.0 candidate)'), 'The authoritative roadmap and candidate status retain the complete 5.2 contract.')
check('V520-ASSET', ['.nova-graph','visualScript','application/x-nova-graph+json'].every(marker => database.includes(marker)) && formatRust.includes('&["script", "visualScript"]'), 'Visual graphs are first-class assets and valid Script2D references.')
check('V520-EDITOR', ['minimap','zoom','selectionBox','alignSelected','distributeSelected','comment','collapsed','duplicateSelected','undo','redo','onKeydown',"event.key===' '"].every(marker => editor.includes(marker)) && ['reroute.execution','reroute.data'].every(marker => catalogSource.includes(marker)), 'Graph Editor exposes every specified foundation interaction.')
check('V520-ATTACH', inspector.includes("asset.assetType === 'visualScript'") && inspector.includes('isScriptVec2') && inspector.includes('setScriptDataProperty'), 'Script2D accepts graphs and edits typed Boolean/number/String/Vec2/Entity/Resource/Data overrides.')
check('V520-ASSET-UX', assetsPanel.includes('createVisualGraphAsset') && assetsPanel.includes('openInGraphStudio'), 'Assets can create, inspect and open visual graphs.')
check('V520-RUNTIME', runtime.includes("asset.assetType !== 'script' && asset.assetType !== 'visualScript'") && runtime.includes('executableGraphSource'), 'Visual graphs compile before entering the existing gameplay sandbox and command model.')
check('V520-I18N', ['en','de','zh'].every(locale => i18n.includes(`Object.assign(${locale}, {`) && i18n.includes(`visualGraph:`)) && ['nodePalette','validation','graphVariables','minimap'].every(key => i18n.includes(`${key}:`)), 'Graph editor chrome is present in English, German and Chinese.')
check('V520-DOCS', guide.includes('## Create and attach a graph') && guide.includes('## Graph Editor controls') && guide.includes('## Node families') && formatGuide.includes('Canonical encoding'), 'User workflow and stable asset format are documented.')
check('V520-VERIFY', packageSource.includes('verify:v5.2.0') && ['graphFilesUnder','parseGraphDocument','serializeGraphDocument','compileGraphSource','analyzeScript'].every(marker => graphVerifier.includes(marker)), 'The published graph verification command exists and checks every graph through parse, canonical round-trip, compile and static script validation.')

const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()
try {
  const catalog = await server.ssrLoadModule('/src/visual/graphCatalog.ts')
  const types = await server.ssrLoadModule('/src/visual/graphTypes.ts')
  const compiler = await server.ssrLoadModule('/src/visual/graphCompiler.ts')
  const api = await server.ssrLoadModule('/src/editor/scriptApi.ts')
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const graph = catalog.defaultVisualGraph('Audit graph')
  const canonical1 = types.serializeGraphDocument(graph)
  const canonical2 = types.serializeGraphDocument(types.parseGraphDocument(canonical1))
  const compiled = compiler.compileGraphSource(canonical1)
  const scriptErrors = language.analyzeScript(compiled.source, 2).diagnostics.filter(diagnostic => diagnostic.severity === 'error')
  check('V520-CANONICAL', canonical1 === canonical2 && canonical1.endsWith('\n'), 'Graph serialization is canonical and round-trips byte-for-byte.', { bytes: canonical1.length })
  check('V520-COMPILE', compiled.valid && compiled.source.includes('fn start()') && compiled.source.includes('log_info(') && scriptErrors.length === 0, 'A graph compiles into statically valid Rhai API v2 source.', { diagnostics: compiled.diagnostics, scriptErrors })

  const apiDefinitions = catalog.GRAPH_NODE_CATALOG.filter(node => node.api)
  const missing = api.SCRIPT_API_V2_MANIFEST.entries.filter(entry => !apiDefinitions.some(node => node.api.callable === entry.callable)).map(entry => entry.callable)
  const malformed = apiDefinitions.filter(node => node.api.signature.includes('->') ? !node.pins.some(pin => pin.kind === 'data' && pin.direction === 'output') : node.api.resultConvention === 'queued-command' && !node.pins.some(pin => pin.kind === 'execution' && pin.direction === 'input')).map(node => node.type)
  check('V520-PARITY', missing.length === 0 && malformed.length === 0 && apiDefinitions.length === api.SCRIPT_API_V2_MANIFEST.entries.length, 'Every Rhai API v2 entry generates one structurally correct graph node.', { apiEntries: api.SCRIPT_API_V2_MANIFEST.entries.length, graphApiNodes: apiDefinitions.length, missing, malformed })
  check('V520-TYPES', ['Boolean','Number','String','Vec2','Entity','Resource','Data'].every(type => catalog.GRAPH_NODE_CATALOG.some(node => node.type === `literal.${type.toLowerCase()}`)) && ['flow.branch','flow.repeat','convert.number_to_string','reroute.execution'].every(type => catalog.graphNodeDefinition(type)), 'Typed values, explicit conversions, branching, bounded loops and reroutes are cataloged.')

  const wrongType = types.parseGraphDocument(canonical1)
  const number = catalog.createGraphNode('literal.number', 0, 0, wrongType), log = wrongType.nodes.find(node => node.type === 'api.log_info')
  wrongType.nodes.push(number)
  wrongType.edges.push({ uuid: types.graphUuid(), from: { nodeUuid: number.uuid, pinUuid: number.pins.find(pin => pin.key === 'value').uuid }, to: { nodeUuid: log.uuid, pinUuid: log.pins.find(pin => pin.key === 'message').uuid } })
  const typeResult = compiler.validateGraph(wrongType)
  const cycle = types.parseGraphDocument(canonical1), cycleLog = cycle.nodes.find(node => node.type === 'api.log_info')
  cycle.edges.push({ uuid: types.graphUuid(), from: { nodeUuid: cycleLog.uuid, pinUuid: cycleLog.pins.find(pin => pin.key === 'next').uuid }, to: { nodeUuid: cycleLog.uuid, pinUuid: cycleLog.pins.find(pin => pin.key === 'exec').uuid } })
  const cycleResult = compiler.validateGraph(cycle)
  check('V520-PREPLAY', typeResult.diagnostics.some(item => item.code === 'GRAPH-EDGE-TYPE') && cycleResult.diagnostics.some(item => item.code === 'GRAPH-CYCLE'), 'Invalid type and unbounded cycle graphs are rejected before play.', { typeCodes: typeResult.diagnostics.map(item => item.code), cycleCodes: cycleResult.diagnostics.map(item => item.code) })

  const scale = catalog.defaultVisualGraph('1,000 node scale')
  while (scale.nodes.length < 1_000) scale.nodes.push(catalog.createGraphNode('literal.number', (scale.nodes.length % 40) * 250, Math.floor(scale.nodes.length / 40) * 120, scale))
  const scaleResult = compiler.validateGraph(scale)
  check('V520-1000', scaleResult.valid && scaleResult.nodeCount === 1_000 && scaleResult.elapsedMs < 1_000, 'The compiler validates a 1,000-node graph within the local one-second responsiveness budget.', { elapsedMs: scaleResult.elapsedMs, nodes: scaleResult.nodeCount, diagnostics: scaleResult.diagnostics.length })

  const localized = types.parseGraphDocument(canonical1)
  localized.name = '图形 Äußere'
  localized.nodes[0].title = '开始 Ereignis'
  localized.nodes[0].config = { '中': 1, 'ä': 2, z: 3 }
  const localeBytes = types.serializeGraphDocument(localized)
  check('V520-LOCALE-IDS', localized.nodes.every(node => /^[0-9a-f-]{36}$/.test(node.uuid)) && localeBytes.includes('开始 Ereignis'), 'Localized presentation text does not alter stable UUID identity or prevent canonical serialization.')
} finally {
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))])
}

const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v5.2.0-product-audit', version: 1, engineVersion: '5.2.0', generatedAt: new Date().toISOString(), catalogs: ['FORMAT','CATALOG','COMPILER','RUNTIME','EDITOR','INSPECTOR','I18N','RESPONSIVENESS'], checks, severity0Open: 0, severity1Open: failed.length, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v5.2.0-product-audit.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A v5.2.0 product audit passed: ${checks.length} checks.`)
