import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'reference-projects/projects/visual-scripting-v52-foundation')
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { platform: 'Win32', hardwareConcurrency: 8 } })
globalThis.window ??= { addEventListener(){}, removeEventListener(){}, dispatchEvent(){} }
globalThis.localStorage ??= { getItem(){ return null }, setItem(){}, removeItem(){} }
const server = await createServer({ root, appType: 'custom', logLevel: 'silent', server: { middlewareMode: true } })
await server.watcher.close()

const fixedUuid = number => `52000000-0000-4000-8000-${number.toString(16).padStart(12, '0')}`
try {
  const templates = await server.ssrLoadModule('/src/projects/templates.ts')
  const catalog = await server.ssrLoadModule('/src/visual/graphCatalog.ts')
  const types = await server.ssrLoadModule('/src/visual/graphTypes.ts')
  const compiler = await server.ssrLoadModule('/src/visual/graphCompiler.ts')
  const project = templates.createTemplateProject('snake', 'Nova Visual Scripting')
  project.engineVersion = '5.2.0'
  project.projectMetadata.name = 'Nova Visual Scripting'
  project.projectMetadata.template = 'visual-scripting-v52-foundation'

  const graph = catalog.defaultVisualGraph('Visual Startup')
  graph.variables.push({ uuid: fixedUuid(1), name: 'startup_message', valueType: 'String', defaultValue: 'Visual graph runtime ready', exposed: true, serialized: true, group: 'Startup', tooltip: 'Message logged when this graph starts.', minimum: null, maximum: null, step: null, resourceType: null })
  const getter = catalog.createGraphNode('variable.get', 370, 310, graph)
  getter.config.variableUuid = graph.variables[0].uuid
  const getterValue = getter.pins.find(pin => pin.key === 'value')
  const log = graph.nodes.find(node => node.type === 'api.log_info')
  const logMessage = log?.pins.find(pin => pin.key === 'message')
  if (!getterValue || !log || !logMessage) throw new Error('Unable to create the visual graph reference data wire.')
  graph.nodes.push(getter)
  graph.edges.push({ uuid: fixedUuid(2001), from: { nodeUuid: getter.uuid, pinUuid: getterValue.uuid }, to: { nodeUuid: log.uuid, pinUuid: logMessage.uuid } })
  graph.comments.push({ uuid: fixedUuid(3001), text: 'A typed exposed variable feeds the same API-v2 log command used by Rhai.', position: { x: 40, y: 50 }, size: { width: 620, height: 400 }, color: '#5b8def', collapsed: false })

  const nodeIds = new Map(), pinIds = new Map()
  graph.uuid = fixedUuid(0)
  graph.nodes.forEach((node, nodeIndex) => { const next = fixedUuid(100 + nodeIndex); nodeIds.set(node.uuid, next); node.uuid = next; node.pins.forEach((pin, pinIndex) => { const pinId = fixedUuid(1_000 + nodeIndex * 128 + pinIndex); pinIds.set(pin.uuid, pinId); pin.uuid = pinId }) })
  graph.edges.forEach((edge, edgeIndex) => { edge.uuid = fixedUuid(2_000 + edgeIndex); edge.from.nodeUuid = nodeIds.get(edge.from.nodeUuid); edge.from.pinUuid = pinIds.get(edge.from.pinUuid); edge.to.nodeUuid = nodeIds.get(edge.to.nodeUuid); edge.to.pinUuid = pinIds.get(edge.to.pinUuid) })
  const source = types.serializeGraphDocument(graph)
  const result = compiler.compileGraphSource(source)
  if (!result.valid || !result.source.includes('fn start()') || !result.source.includes('log_info(startup_message)')) throw new Error(`Reference graph did not compile: ${JSON.stringify(result.diagnostics)}`)

  const templateAsset = project.assets.find(asset => asset.assetType === 'script')
  if (!templateAsset) throw new Error('Snake template did not provide an asset record to normalize.')
  const hash = createHash('sha256').update(source).digest('hex')
  const assetUuid = fixedUuid(9_001)
  const graphAsset = structuredClone(templateAsset)
  Object.assign(graphAsset, { uuid: assetUuid, name: 'VisualStartup.nova-graph', path: 'Assets/Visual Scripts/VisualStartup.nova-graph', assetType: 'visualScript', mimeType: 'application/x-nova-graph+json', byteLength: new TextEncoder().encode(source).byteLength, source })
  delete graphAsset.script
  Object.assign(graphAsset.pipeline, { importerVersion: 'visual-graph-1', sourceHash: hash, artifactHash: hash, contentHash: hash, cacheKey: hash, lastValidSource: source, error: '', status: 'ready' })
  project.assets.push(graphAsset)
  if (!project.assetFolders.includes('Assets/Visual Scripts')) project.assetFolders.push('Assets/Visual Scripts')

  project.scenes[0].entities.push({
    uuid: fixedUuid(9_100), name: 'Visual Graph Host', enabled: true, editorVisible: true, editorLocked: false, tags: ['visual-script'], persistentAcrossScenes: false,
    prefabAsset: null, prefabInstanceUuid: null, prefabSourceUuid: null, prefabOverrides: {}, entityType: 'Empty',
    components: [
      { uuid: fixedUuid(9_101), kind: 'Transform2D', enabled: true, removed: false, data: { parentUuid: null, position: { x: 0, y: 0 }, rotation: 0, scale: { x: 1, y: 1 } } },
      { uuid: fixedUuid(9_102), kind: 'Script2D', enabled: true, removed: false, data: { scriptAsset: `asset://${assetUuid}`, properties: { startup_message: 'Visual graph runtime ready' } } }
    ]
  })

  await mkdir(output, { recursive: true })
  await writeFile(join(output, 'project.nova'), `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'VisualStartup.nova-graph'), source)
  await writeFile(join(output, 'generated.rhai'), result.source)
  await writeFile(join(output, 'README.md'), '# Visual scripting v5.2 foundation reference\n\nEngine **5.2.0**, Project Format 2, schema 29.\n\nRequired packages: none; Nova_A core only.\n\nTarget platforms: Windows desktop and modern web browsers.\n\nOpen `project.nova`, select **Visual Graph Host**, inspect its Script2D exposed value, then open `VisualStartup.nova-graph` in the Script workspace. Press Play and confirm one `Visual graph runtime ready` Info event. The carried-forward Snake scene proves a visual script and Rhai scripts share one runtime.\n\nKnown limitations: graph functions/subgraphs and visual debugging are scheduled for 5.3. Independent clean-machine and long-soak certification remain external.\n')
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ version: 1, engineVersion: '5.2.0', actions: [{ action: 'Open graph', expected: 'Three nodes, two wires, one comment and one exposed String variable appear' }, { action: 'Change Inspector value', expected: 'Script2D stores a per-object typed override' }, { action: 'Play', expected: 'The graph emits one Info message through the shared runtime' }, { action: 'Edit invalid wire', expected: 'Pre-play validation blocks type or cycle errors' }] }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '5.2.0', format: 'nova-graph', graphVersion: 1, apiVersion: 2, nodes: graph.nodes.length, edges: graph.edges.length, exposedVariables: 1, generatedLifecycle: ['start'], status: 'passed' }, null, 2)}\n`)
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
    project.engineVersion = '5.2.0'
    if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.2.0'
    await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
    const readmePath = join(directory, 'README.md')
    const readme = await readFile(readmePath, 'utf8')
    await writeFile(readmePath, readme.replace(/Engine \*\*\d+\.\d+\.\d+\*\*/g, 'Engine **5.2.0**'))
    for (const name of ['expected-output.json', 'test-controls.json']) {
      const path = join(directory, name)
      const document = JSON.parse(await readFile(path, 'utf8'))
      document.engineVersion = '5.2.0'
      await writeFile(path, `${JSON.stringify(document, null, 2)}\n`)
    }
  } catch (error) {
    throw new Error(`Unable to refresh v5.2 reference metadata for ${entry.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}
console.log('Generated the Nova_A v5.2.0 visual scripting reference project and refreshed compatible reference metadata.')
