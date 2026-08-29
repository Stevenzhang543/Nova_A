import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/visual-scripting-v53-production')
let identity = 0
const fixedUuid = () => `53000000-0000-4000-8000-${(++identity).toString(16).padStart(12, '0')}`
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: fixedUuid } })
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8 } })
globalThis.window ??= { addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()

const connect = (scope, fromNode, fromKey, toNode, toKey) => {
  const from = fromNode.pins.find(pin => pin.key === fromKey && pin.direction === 'output')
  const to = toNode.pins.find(pin => pin.key === toKey && pin.direction === 'input')
  if (!from || !to) throw new Error(`Missing fixture pin ${fromNode.type}.${fromKey} -> ${toNode.type}.${toKey}`)
  scope.edges.push({ uuid: fixedUuid(), from: { nodeUuid: fromNode.uuid, pinUuid: from.uuid }, to: { nodeUuid: toNode.uuid, pinUuid: to.uuid } })
}

try {
  const catalog = await server.ssrLoadModule('/src/visual/graphCatalog.ts')
  const production = await server.ssrLoadModule('/src/visual/graphProduction.ts')
  const types = await server.ssrLoadModule('/src/visual/graphTypes.ts')
  const compiler = await server.ssrLoadModule('/src/visual/graphCompiler.ts')
  const language = await server.ssrLoadModule('/src/editor/scriptLanguage.ts')
  const graph = catalog.defaultVisualGraph('Production Visual Graph')
  graph.variables.push({ uuid: fixedUuid(), name: 'score_multiplier', valueType: 'Number', defaultValue: 2, exposed: true, serialized: true, group: 'Score', tooltip: 'Designer-controlled score multiplier.', minimum: 1, maximum: 10, step: 1, resourceType: null })

  const calculate = production.createGraphRoutine('function', 'calculate_bonus')
  calculate.pure = true
  production.addRoutineParameter(calculate, 'input', 'score', 'Number')
  production.addRoutineParameter(calculate, 'output', 'bonus', 'Number')
  graph.routines.push(calculate)

  const announce = production.createGraphRoutine('macro', 'announce_bonus')
  production.addRoutineParameter(announce, 'input', 'message', 'String')
  announce.locals.push({ uuid: fixedUuid(), name: 'formatted_message', valueType: 'String', defaultValue: '', exposed: false, serialized: false, group: 'Locals', tooltip: '', minimum: null, maximum: null, step: null, resourceType: null })
  graph.routines.push(announce)

  const organized = production.createGraphRoutine('subgraph', 'post_score_flow')
  graph.routines.push(organized)
  const contract = production.createGraphInterface('score_contract')
  contract.methods[0].name = 'calculate_bonus'
  contract.methods[0].inputs.push({ uuid: fixedUuid(), name: 'score', valueType: 'Number', defaultValue: 0, tooltip: '' })
  contract.methods[0].outputs.push({ uuid: fixedUuid(), name: 'bonus', valueType: 'Number', defaultValue: 0, tooltip: '' })
  graph.interfaces.push(contract)
  calculate.interfaceUuid = contract.uuid
  const customEvent = production.createGraphCustomEvent('score_changed')
  customEvent.parameters.push({ uuid: fixedUuid(), name: 'score', valueType: 'Number', defaultValue: 0, tooltip: '' })
  graph.customEvents.push(customEvent)
  production.synchronizeGraphSignatures(graph)

  const calculateEntry = calculate.nodes.find(node => node.type === 'routine.entry')
  const calculateReturn = calculate.nodes.find(node => node.type === 'routine.return')
  const multiply = catalog.createGraphNode('math.multiply', 280, 210, graph, calculate)
  const multiplier = catalog.createGraphNode('variable.get', 250, 370, graph, calculate)
  multiplier.config.variableUuid = graph.variables[0].uuid
  const multiplierPin = multiplier.pins.find(pin => pin.key === 'value'); multiplierPin.valueType = 'Number'; multiplierPin.defaultValue = 2
  calculate.nodes.push(multiply, multiplier)
  connect(calculate, calculateEntry, 'score', multiply, 'a')
  connect(calculate, multiplier, 'value', multiply, 'b')
  connect(calculate, multiply, 'value', calculateReturn, 'bonus')

  announce.edges.splice(0)
  const announceEntry = announce.nodes.find(node => node.type === 'routine.entry')
  const announceReturn = announce.nodes.find(node => node.type === 'routine.return')
  const setLocal = catalog.createGraphNode('local.set', 260, 140, graph, announce); setLocal.config.localUuid = announce.locals[0].uuid
  const getLocal = catalog.createGraphNode('local.get', 500, 330, graph, announce); getLocal.config.localUuid = announce.locals[0].uuid
  for (const pin of [...setLocal.pins, ...getLocal.pins].filter(pin => pin.kind === 'data')) { pin.valueType = 'String'; pin.defaultValue = '' }
  const routineLog = catalog.createGraphNode('api.log_info', 520, 140, graph, announce)
  announce.nodes.push(setLocal, getLocal, routineLog)
  connect(announce, announceEntry, 'next', setLocal, 'exec')
  connect(announce, announceEntry, 'message', setLocal, 'value')
  connect(announce, setLocal, 'next', routineLog, 'exec')
  connect(announce, getLocal, 'value', routineLog, 'message')
  connect(announce, routineLog, 'next', announceReturn, 'exec')

  const start = graph.nodes.find(node => node.type === 'event.start')
  const defaultLog = graph.nodes.find(node => node.type === 'api.log_info')
  graph.edges.splice(0)
  const calculateCall = catalog.createGraphNode(`routine.call.${calculate.uuid}`, 280, 300, graph)
  const numberToString = catalog.createGraphNode('convert.number_to_string', 520, 310, graph)
  const announceCall = catalog.createGraphNode(`routine.call.${announce.uuid}`, 760, 120, graph)
  const subgraphCall = catalog.createGraphNode(`routine.call.${organized.uuid}`, 1020, 120, graph)
  const customReceiver = catalog.createGraphNode(`custom.event.${customEvent.uuid}`, 80, 520, graph)
  const customConverter = catalog.createGraphNode('convert.number_to_string', 340, 650, graph)
  const customLog = catalog.createGraphNode('api.log_info', 380, 520, graph)
  graph.nodes.push(calculateCall, numberToString, announceCall, subgraphCall, customReceiver, customConverter, customLog)
  calculateCall.pins.find(pin => pin.key === 'score').defaultValue = 5
  connect(graph, calculateCall, 'bonus', numberToString, 'value')
  connect(graph, numberToString, 'result', announceCall, 'message')
  connect(graph, start, 'next', announceCall, 'exec')
  connect(graph, announceCall, 'next', subgraphCall, 'exec')
  connect(graph, subgraphCall, 'next', defaultLog, 'exec')
  connect(graph, customReceiver, 'next', customLog, 'exec')
  connect(graph, customReceiver, 'score', customConverter, 'value')
  connect(graph, customConverter, 'result', customLog, 'message')
  graph.comments.push({ uuid: fixedUuid(), text: 'Functions, macro locals, subgraphs, events, interfaces and debug metadata share one Graph Format 1 document.', position: { x: 35, y: 50 }, size: { width: 1220, height: 690 }, color: '#6d9fff', collapsed: false })
  graph.debug.breakpoints.push({ nodeUuid: announceCall.uuid, enabled: true, condition: '', hitCondition: 0, logMessage: '', hitCount: 0 })
  graph.debug.watches.push('score_multiplier', 'time.frame')
  production.renameGraphSymbol(graph, graph.variables[0].uuid, 'bonus_multiplier')

  const source = types.serializeGraphDocument(graph)
  const result = compiler.compileGraphSource(source)
  const scriptErrors = result.valid ? language.analyzeScript(result.source, 2).diagnostics.filter(item => item.severity === 'error') : []
  if (!result.valid || scriptErrors.length || !result.source.includes('fn calculate_bonus(__nova_call_depth, score)') || !result.source.includes('fn score_changed(score)')) throw new Error(`Production fixture failed to compile: ${JSON.stringify({ diagnostics: result.diagnostics, scriptErrors })}`)

  const base = types.parseGraphDocument(source), ours = types.parseGraphDocument(source), theirs = types.parseGraphDocument(source)
  base.name = 'Merge Fixture'; ours.name = 'Merge Fixture'; theirs.name = 'Merge Fixture'
  ours.variables[0].tooltip = 'Local branch tooltip'; theirs.variables[0].tooltip = 'Incoming branch tooltip'
  ours.comments[0].position.x += 20; theirs.comments[0].text = `${theirs.comments[0].text} Incoming documentation.`
  const merge = production.mergeGraphs(base, ours, theirs)
  if (merge.conflicts.length !== 1 || merge.conflicts[0].identity !== ours.variables[0].uuid) throw new Error(`Expected one identity conflict, got ${JSON.stringify(merge.conflicts)}`)
  const compatible = types.parseGraphDocument(source); compatible.variables[0].tooltip = 'Compatible documentation edit'
  const incompatible = types.parseGraphDocument(source); incompatible.variables[0].serialized = false
  const compatiblePlan = production.planGraphHotReload(graph, compatible, { bonus_multiplier: 7 })
  const incompatiblePlan = production.planGraphHotReload(graph, incompatible, { bonus_multiplier: 7 })
  if (!compatiblePlan.compatible || incompatiblePlan.compatible) throw new Error('Hot reload fixture classification failed.')

  const baseProject = JSON.parse(await readFile(join(root, 'reference-projects/projects/visual-scripting-v52-foundation/project.nova'), 'utf8'))
  baseProject.engineVersion = '5.3.0'; baseProject.projectMetadata.name = 'Visual Scripting Production'; baseProject.projectMetadata.template = 'visual-scripting-v53-production'
  const graphAsset = baseProject.assets.find(asset => asset.assetType === 'visualScript')
  const hash = createHash('sha256').update(source).digest('hex')
  Object.assign(graphAsset, { name: 'ProductionGraph.nova-graph', path: 'Assets/Visual Scripts/ProductionGraph.nova-graph', byteLength: new TextEncoder().encode(source).byteLength, source })
  Object.assign(graphAsset.pipeline, { importerVersion: 'visual-graph-1', sourceHash: hash, artifactHash: hash, contentHash: hash, cacheKey: hash, lastValidSource: source, error: '', status: 'ready' })
  await mkdir(join(output, 'merge-fixtures'), { recursive: true })
  await mkdir(join(output, 'hot-reload-fixtures'), { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(baseProject, null, 2)}\n`)
  await writeFile(join(output, 'ProductionGraph.nova-graph'), source)
  await writeFile(join(output, 'generated.rhai'), result.source)
  await writeFile(join(output, 'merge-fixtures/base.nova-graph'), types.serializeGraphDocument(base))
  await writeFile(join(output, 'merge-fixtures/ours.nova-graph'), types.serializeGraphDocument(ours))
  await writeFile(join(output, 'merge-fixtures/theirs.nova-graph'), types.serializeGraphDocument(theirs))
  await writeFile(join(output, 'merge-fixtures/expected.json'), `${JSON.stringify({ conflicts: merge.conflicts.map(item => ({ identity: item.identity, path: item.path })), automaticChanges: merge.changes }, null, 2)}\n`)
  await writeFile(join(output, 'hot-reload-fixtures/compatible.nova-graph'), types.serializeGraphDocument(compatible))
  await writeFile(join(output, 'hot-reload-fixtures/incompatible.nova-graph'), types.serializeGraphDocument(incompatible))
  await writeFile(join(output, 'hot-reload-fixtures/expected.json'), `${JSON.stringify({ compatible: compatiblePlan, incompatible: incompatiblePlan }, null, 2)}\n`)
  await writeFile(join(output, 'package-node-fixture.json'), `${JSON.stringify({ manifestVersion: 1, id: 'top.whitelists.novaa.visual-fixture', name: 'Visual Fixture Library', version: '1.0.0', engine: '^5.3.0', dependencies: {}, dependencyHashes: {}, entryPointType: 'runtime', apiCompatibility: '2', pluginApi: null, native: false, sha256: 'a'.repeat(64), signature: 'fixture-only', publisher: 'Whitelist fixture', publisherVerified: false, permissions: [], license: 'MIT', visualNodes: [{ id: 'comfortable-log', title: 'Comfortable Log', category: 'Libraries', description: 'Package-defined wrapper for a stable API-v2 callable.', callable: 'log_info', inputs: [{ name: 'message', valueType: 'String', defaultValue: 'Package node ready' }], output: null }] }, null, 2)}\n`)
  await writeFile(join(output, 'debug-trace-fixture.json'), `${JSON.stringify({ graphUuid: graph.uuid, commands: [{ type: 'graphTrace', graphUuid: graph.uuid, scopeUuid: graph.uuid, nodeUuid: start.uuid, edgeUuid: '', depth: 1, durationMicros: 10, values: { bonus_multiplier: 2 } }, { type: 'graphTrace', graphUuid: graph.uuid, scopeUuid: graph.uuid, nodeUuid: '', edgeUuid: graph.edges.find(edge => edge.from.nodeUuid === start.uuid)?.uuid, depth: 1, durationMicros: 3, values: { bonus_multiplier: 2 } }, { type: 'graphTrace', graphUuid: graph.uuid, scopeUuid: graph.uuid, nodeUuid: announceCall.uuid, edgeUuid: '', depth: 1, durationMicros: 7, values: { bonus_multiplier: 2 } }], expected: { sequence: [start.uuid, graph.edges.find(edge => edge.from.nodeUuid === start.uuid)?.uuid, announceCall.uuid], breakpointNode: announceCall.uuid, coverageNodes: 2, deterministic: true } }, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), '# Visual scripting v5.3 production reference\n\nEngine **5.3.0**, Project Format 2, schema 29, Graph Format 1 and Rhai API v2.\n\nOpen `project.nova`, enter Script → Visual Graph and select `ProductionGraph`. Inspect three reusable routine scopes, the typed interface, custom event, macro local, breakpoint, watches, generated Rhai, hot-reload cases and semantic three-way merge fixtures. Press Play to observe the same queued runtime commands as the generated Rhai source.\n\nRequired packages: none. `package-node-fixture.json` is declarative audit input and is never installed or executed.\n\nExternal gates still pending: independent clean-machine lifecycle, publisher signing, non-Chromium browser matrix and the real 72-hour soak.\n')
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '5.3.0', actions: [{ action: 'Switch graph scopes', expected: 'Main, function, macro and subgraph canvases retain independent viewport/content' }, { action: 'Play to breakpoint', expected: 'Runtime pauses once at announce_bonus without replaying prior commands' }, { action: 'Step into/over/out', expected: 'Ordered node traces advance with stable call depth' }, { action: 'Save compatible fixture', expected: 'Hot reload preserves bonus_multiplier' }, { action: 'Merge fixtures', expected: 'One tooltip conflict; independent comment move/text changes merge automatically' }, { action: 'Enable reduced motion', expected: 'Active wire remains emphasized without moving dash animation' }] }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '5.3.0', graphFormat: 1, apiVersion: 2, routines: { function: 1, macro: 1, subgraph: 1 }, customEvents: 1, interfaces: 1, locals: 1, breakpoints: 1, watches: 2, compileStatus: 'passed', staticScriptErrors: 0, mergeConflicts: 1, hotReloadCompatible: true, hotReloadIncompatibleRejected: true }, null, 2)}\n`)
} finally {
  await Promise.race([server.close(), new Promise(resolve => setTimeout(resolve, 2_000))])
}

const projects = join(root, 'reference-projects/projects')
for (const entry of await readdir(projects, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue
  const directory = join(projects, entry.name)
  try {
    const projectPath = join(directory, 'project.nova')
    const project = JSON.parse(await readFile(projectPath, 'utf8'))
    project.engineVersion = '5.3.0'
    if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.3.0'
    await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
    const readmePath = join(directory, 'README.md')
    const readme = await readFile(readmePath, 'utf8')
    await writeFile(readmePath, readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/g, 'Engine **5.3.0**'))
    for (const name of ['expected-output.json', 'test-controls.json']) {
      const path = join(directory, name)
      const document = JSON.parse(await readFile(path, 'utf8'))
      document.engineVersion = '5.3.0'
      await writeFile(path, `${JSON.stringify(document, null, 2)}\n`)
    }
  } catch (error) {
    throw new Error(`Unable to refresh v5.3 reference metadata for ${entry.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
console.log('Generated the Nova_A v5.3.0 production visual scripting reference and deterministic fixtures.')
