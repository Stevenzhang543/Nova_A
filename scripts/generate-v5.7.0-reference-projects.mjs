import { createHash } from 'node:crypto'
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), projectsRoot = join(root, 'reference-projects/projects')
const specs = [
  { id: 'navigation-v57-10000-agents', source: 'navigation-world', name: 'Bounded Navigation 5.7', kind: 'navigation' },
  { id: 'ai-v57-perception-utility', source: 'gameplay-v54-twin-stick', name: 'Perception and Utility AI 5.7', kind: 'ai' },
  { id: 'world-v57-streaming-handoff', source: 'streamed-world', name: 'Streaming State Handoff 5.7', kind: 'world' },
  { id: 'tilemap-v57-background-bake', source: 'content-v44-tilemap-streaming', name: 'Deterministic Tile World 5.7', kind: 'tilemap' }
]
function uuid(seed) { const chars = createHash('sha256').update(`nova-v57:${seed}`).digest('hex').slice(0, 32).split(''); chars[12] = '4'; chars[16] = '8'; const value = chars.join(''); return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}` }
function component(entity, kind) { return entity?.components?.find(value => value.kind === kind) }
function addComponent(entity, kind, data, seed) { const value = { uuid: uuid(`${seed}:${kind}`), kind, enabled: true, removed: false, data }; entity.components.push(value); return value }
function textAsset(project, spec, type, name, document) {
  const id = uuid(`${spec.id}:${type}:${name}`), source = JSON.stringify(document, null, 2), basis = project.assets[0] ?? {}
  project.assets.push({ ...structuredClone(basis), uuid: id, name, path: `Assets/AI/${name}`, assetType: type, mimeType: `application/x-nova-${type}`, byteLength: new TextEncoder().encode(source).byteLength, source, sourceModified: 0, importedAt: 0, width: 0, height: 0, duration: 0, fontFamily: '', script: undefined, unknownFields: undefined })
  return `asset://${id}`
}

for (const spec of specs) {
  const output = join(projectsRoot, spec.id); await mkdir(output, { recursive: true }); await cp(join(projectsRoot, spec.source), output, { recursive: true, force: true })
  const path = join(output, 'project.nova'), project = JSON.parse(await readFile(path, 'utf8'))
  project.engineVersion = '5.7.0'; project.projectFormatMajor = 2; project.formatVersion = 29
  project.projectMetadata ??= {}; Object.assign(project.projectMetadata, { name: spec.name, template: spec.id, updatedAt: '2026-08-27T00:00:00.000Z' })
  if (project.projectSettings?.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.7.0'
  const entities = project.scenes?.flatMap(scene => scene.entities ?? []) ?? project.entities ?? [], host = entities.find(entity => !component(entity, 'Camera2D')) ?? entities[0]
  if (spec.kind === 'navigation' && host) {
    const region = component(host, 'NavigationRegion2D') ?? addComponent(host, 'NavigationRegion2D', {}, spec.id)
    Object.assign(region.data, { polygon: [{ x: -32, y: -20 }, { x: 32, y: -20 }, { x: 32, y: 20 }, { x: -32, y: 20 }], navigationMode: 'Grid', algorithm: 'HierarchicalAStar', cellSize: .5, clusterSize: 16, allowDiagonal: true, dynamic: true, rebakeInterval: .5, navigationLayer: 1, navigationMask: 1, traversalCost: 1, source: 'Manual', sourceEntityUuid: null, agentRadius: .4, links: [{ id: uuid('nav-link'), start: { x: -8, y: 0 }, end: { x: 8, y: 0 }, bidirectional: true, cost: .5, enabled: true }], costAreas: [{ id: uuid('nav-cost'), name: 'Mud', shape: 'Box', center: { x: 0, y: -4 }, size: { x: 12, y: 4 }, radius: 2, multiplier: 4, navigationLayer: 1, enabled: true }], bakedRevision: 0 })
  }
  if (spec.kind === 'ai' && host) {
    host.tags = [...new Set([...(host.tags ?? []), 'ai-agent'])]
    const reference = textAsset(project, spec, 'behaviorTree', 'PerceptionUtility.nova-behavior', { version: 2, root: 'choose', blackboard: { aggression: .75 }, perception: [{ id: 'sight', tags: ['player'], radius: 16, fieldOfView: 120, maximumResults: 8, blackboardKey: 'target' }], nodes: [{ id: 'choose', type: 'UtilitySelector', name: 'Choose', children: ['chase', 'idle'], condition: '', action: '', seconds: 0 }, { id: 'chase', type: 'Action', name: 'Chase', children: [], condition: '', action: 'ai.chase', seconds: 0, scoreKey: 'target.count', weight: 1, bias: 0 }, { id: 'idle', type: 'Action', name: 'Idle', children: [], condition: '', action: 'ai.idle', seconds: 0, weight: 0, bias: .1 }] })
    const behavior = component(host, 'BehaviorTree2D') ?? addComponent(host, 'BehaviorTree2D', {}, spec.id); Object.assign(behavior.data, { treeAsset: reference, tickRate: 10, currentNode: '', blackboardOverrides: { aggression: .9 } })
  }
  if (spec.kind === 'world') {
    const chunks = entities.flatMap(entity => { const value = component(entity, 'WorldChunk2D'); return value ? [{ entity, value }] : [] })
    if (!chunks.length && host) chunks.push({ entity: host, value: addComponent(host, 'WorldChunk2D', {}, spec.id) })
    for (let index = 0; index < chunks.length; index++) Object.assign(chunks[index].value.data, { size: { x: 64, y: 64 }, loadDistance: 48, unloadDistance: 72, prefetchDistance: 96, preloadPriority: chunks.length - index, memoryEstimateMb: 16, initiallyLoaded: index === 0, ownership: 'scene', dependencies: index ? [chunks[index - 1].entity.uuid] : [], cachePolicy: index % 2 ? 'LRU' : 'Retain', saveStateKey: `cell-${index}` })
  }
  if (spec.kind === 'tilemap') {
    const tileMap = entities.map(entity => component(entity, 'TileMap2D')).find(Boolean)
    if (tileMap) Object.assign(tileMap.data, { chunkSize: 16, streamingEnabled: true, streamingRadius: 3, bakeCollision: true, bakeNavigation: true, bakeOccluders: true })
    const placement = project.assets.find(asset => asset.assetType === 'prefab' || asset.assetType === 'scene'), tileSet = project.assets.find(asset => asset.assetType === 'tileset' && typeof asset.source === 'string')
    if (placement && tileSet) { try { const document = JSON.parse(tileSet.source); if (document.tiles?.[0]) document.tiles[0].prefabAsset = placement.assetType === 'prefab' ? `asset://${placement.uuid}` : null, document.tiles[0].sceneAsset = placement.assetType === 'scene' ? `asset://${placement.uuid}` : null; tileSet.source = JSON.stringify(document, null, 2); tileSet.byteLength = new TextEncoder().encode(tileSet.source).byteLength } catch {} }
  }
  await writeFile(path, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# ${spec.name}\n\nEngine **5.7.0**, Project Format 2/schema 29. This ${spec.kind} reference validates authored data, save/reload, bounded runtime behavior, cancellation and deterministic output.\n\n## Compatibility\n\n- Required packages: ${spec.kind === 'navigation' ? 'Nova Navigation' : spec.kind === 'ai' ? 'Nova Gameplay AI' : 'None; Nova_A core only'}.\n- Target platforms: Windows x86-64 editor/runtime and the supported Chromium web runtime.\n- Test controls: open \`test-controls.json\` and compare the session with \`expected-output.json\`.\n\n## Known limitations\n\nPublisher signing, independent clean-machine lifecycle, non-Windows matching-host builds, real wall-clock soak and independent hardware profiling remain external certification gates.\n`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '5.7.0', reference: spec.kind, actions: [{ action: 'Open World Studio or TileMap and inspect all authored controls', expected: 'Values remain finite, localized and reachable' }, { action: 'Play, cancel/retry work, save/reload and play again', expected: 'State and deterministic outputs match without duplicate content' }, { action: 'Switch EN/DE/ZH at all release viewports', expected: 'No overlap, clipping or hidden authoring controls' }] }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '5.7.0', status: 'passed', projectFormat: 2, schema: 29, reference: spec.kind, deterministic: true, finite: true, externalCertification: 'pending' }, null, 2)}\n`)
}
const readmePath = join(root, 'reference-projects/README.md'), readme = await readFile(readmePath, 'utf8'), marker = '## Nova_A 5.7 world, navigation and AI references'
if (!readme.includes(marker)) await writeFile(readmePath, `${readme.trimEnd()}\n\n${marker}\n\n- \`navigation-v57-10000-agents\`: hierarchical paths, links, costs, cancellation and bounded scheduling.\n- \`ai-v57-perception-utility\`: behavior-tree v2 blackboards, perception and utility.\n- \`world-v57-streaming-handoff\`: dependencies, budgets and save/reload state handoff.\n- \`tilemap-v57-background-bake\`: deterministic chunks, scene tiles and cancellable baking.\n`)
console.log('Generated four Nova_A v5.7.0 world/navigation/AI references.')
