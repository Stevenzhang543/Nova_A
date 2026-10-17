/** Required M1 gate: inspect the compiled production graph rather than directory names. */
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, join, relative, isAbsolute } from 'node:path'
import { createHash } from 'node:crypto'
const root = resolve(process.cwd()), directory = resolve(root, process.env.NOVA_AUDIT_DIST_DIRECTORY || '.cache/engine-overhaul/profile-dist')
const suffix = relative(root, directory)
assert.ok(suffix && !suffix.startsWith('..') && !isAbsolute(suffix), 'Inspect a workspace artifact')
const manifest = JSON.parse(await readFile(join(directory, 'engine-build-manifest.json'), 'utf8'))
const graphBytes = await readFile(join(directory, 'engine-module-graph.json'))
assert.equal(createHash('sha256').update(graphBytes).digest('hex'), manifest.artifacts.find(item => item.path === 'engine-module-graph.json')?.sha256, 'Graph must belong to this exact build')
const graph = JSON.parse(graphBytes)
assert.equal(graph.buildId, manifest.buildId); assert.equal(graph.sourceHash, manifest.sourceHash)
const modules = new Map(graph.modules.map(item => [item.id, item])), chunks = new Map(graph.chunks.map(item => [item.file, item]))
function walk(seed, map, next) {
  const paths = new Map(), pending = seed.map(id => ({ id, path: [id] }))
  for (let index = 0; index < pending.length; index++) {
    const item = pending[index]
    if (paths.has(item.id)) continue
    paths.set(item.id, item.path)
    for (const id of next(map.get(item.id))) if (!paths.has(id)) pending.push({ id, path: [...item.path, id] })
  }
  return paths
}
const forbidden = id => /(?:^|\/)node_modules\/.*(?:\/vue(?:@|\/)|\/@vue\/|\/pinia(?:@|\/))/.test(id)
  || /^src\/(?:editor|store|components|layout|ui)\//.test(id)
  || /^src\/assets\/(?:AssetDatabase|importPipeline)\./.test(id)
  || /^src\/(?:App|PlayerApp)\.vue/.test(id)
  || /^src\/runtime\/(?:gameExporter|projectUpgrade|projectMutationRouter|extensionEcosystem|buildSettings)\./.test(id)
const results = []
// Keep the compatibility composition in the gate: moving the implementation must not hide its Editor reachability.
const entries = manifest.source.some(item => item.path === 'src/runtime/GameplayRuntimeCore.ts')
  ? [['Runtime core', 'src/runtime/GameplayRuntimeCore.ts'], ['Runtime compatibility composition', 'src/runtime/GameplayRuntime.ts']]
  : [['Runtime', 'src/runtime/GameplayRuntime.ts']]
entries.push(['Renderer frontend', 'src/renderer/sceneRenderer.ts'], ['Player', 'src/player.ts'])
for (const [label, entry] of [['AI owner', 'src/runtime/aiOwner.ts'], ['AI document contracts', 'src/runtime/aiDocuments.ts'], ['AI compatibility port', 'src/runtime/aiTools.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [['Shared entity removal', 'src/world/entityRemoval.ts'], ['Shared entity builder', 'src/world/entityBuilder.ts'], ['TileMap value normalization', 'src/runtime/tileMapValues.ts'], ['Particle value normalization', 'src/runtime/particleEmitterValues.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [['Runtime asset value algorithms', 'src/runtime/runtimeAssetValues.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [['Navigation owner', 'src/runtime/navigationOwner.ts'], ['Navigation geometry', 'src/runtime/navigationGeometry.ts'], ['Navigation compatibility port', 'src/runtime/navigation2d.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [["Runtime asset record contracts","src/runtime/runtimeAssetRecordContracts.ts"], ["Derived sprite metadata","src/runtime/derivedSpriteMetadata.ts"], ["Content interchange metadata","src/runtime/contentInterchangeMetadata.ts"], ["Runtime asset record preparation","src/runtime/runtimeAssetPreparation.ts"], ["Prepared runtime resources","src/runtime/preparedRuntimeProjectResources.ts"], ["Runtime plugin owner","src/runtime/pluginRuntimeOwner.ts"], ["Entity lifetime owner","src/runtime/entityLifetimes.ts"], ["Stream lifecycle owner","src/runtime/streamLifecycle.ts"], ["Prepared project catalog", "src/runtime/runtimeProjectCatalog.ts"]]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [['Graph runtime hot reload', 'src/visual/graphRuntimeHotReload.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [["Runtime package reader","src/runtime/novaPakReader.ts"],["Detached runtime project loader","src/runtime/runtimeProjectLoader.ts"],["Runtime package Web codecs","src/platform/webNovaPakCodecs.ts"],["Bounded runtime byte stream","src/platform/runtimeByteStream.ts"],["Bounded runtime package transport","src/platform/webRuntimePackageTransport.ts"]]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [['Gameplay flow owner', 'src/runtime/gameFlowOwner.ts'], ['Gameplay flow compatibility port', 'src/runtime/gameFlow.ts'], ['World gameplay owner', 'src/runtime/worldGameplayOwner.ts'], ['World gameplay compatibility port', 'src/runtime/worldGameplay.ts'], ['Gameplay components owner', 'src/runtime/gameplayComponentsOwner.ts'], ['Gameplay components compatibility port', 'src/runtime/gameplayComponents.ts'], ['Simulation evidence owner', 'src/runtime/simulationEvidenceOwner.ts'], ['Runtime prefab instantiator', 'src/runtime/runtimePrefabInstantiator.ts'], ['Runtime object pool owner', 'src/runtime/objectPoolOwner.ts'], ['Runtime dynamic objects owner', 'src/runtime/dynamicObjectsOwner.ts'], ['Runtime object pool compatibility port', 'src/runtime/objectPool.ts'], ['Runtime dynamic objects compatibility port', 'src/runtime/dynamicObjects.ts'], ['Shared scene entity records', 'src/world/sceneEntityData.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [['Lighting owner', 'src/renderer/lighting2d.ts'], ['Production configuration', 'src/runtime/production.ts'], ['Shared script analysis', 'src/runtime/scriptAnalysis.ts'], ['Script state bootstrap', 'src/runtime/scriptStateAdapter.ts'], ['Profiler owner', 'src/runtime/profiler.ts'], ['Profiler collection budget', 'src/runtime/profilerCollectionBudget.ts'], ['Input state bootstrap', 'src/runtime/inputStateAdapter.ts'], ['Input modality state', 'src/runtime/inputModality.ts'], ['Device input state', 'src/runtime/deviceInput.ts']]) {
  if (manifest.source.some(item => item.path === entry)) entries.push([label, entry])
}
for (const [label, entry] of [["Animation value documents","src/runtime/animationDocuments.ts"],["Timeline value documents","src/runtime/timelineDocuments.ts"],["Animation document reader","src/runtime/animationTimelineDocumentReader.ts"],["Animation owner","src/runtime/animationOwner.ts"],["Timeline owner","src/runtime/timelineOwner.ts"],["Animation timeline owner","src/runtime/animationTimelineOwner.ts"],["Animation legacy port","src/runtime/animationTimelineLegacy.ts"],["Runtime save owner","src/runtime/runtimeSaveOwner.ts"],["Animation compatibility port","src/runtime/animation.ts"],["Timeline compatibility port","src/runtime/timeline.ts"],["Save compatibility port","src/runtime/saveGame.ts"]]) entries.push([label, entry])
for (const [label, entry] of [["Audio document values","src/runtime/audioDocuments.ts"],["Audio resource reader","src/runtime/audioResourceReader.ts"],["Audio runtime engine","src/runtime/audioRuntime.ts"],["Audio legacy capability port","src/runtime/audioLegacy.ts"],["Audio world owner","src/runtime/audioOwner.ts"],["Audio buffer engine","src/runtime/audioBuffers.ts"],["Web audio platform","src/platform/webAudioHost.ts"],["Audio compatibility facade","src/runtime/audio.ts"]]) entries.push([label, entry])
for (const [label, entry] of [['Runtime fault records', 'src/runtime/runtimeFaultRecords.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime presentation owner', 'src/runtime/presentationOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime virtual controls input owner', 'src/runtime/virtualControlsInputOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime replay owner', 'src/runtime/replayOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [['TileSet value documents', 'src/runtime/tileSetValues.ts'], ['TileMap fixed World owner', 'src/runtime/tileMapOwner.ts'], ['Tile placement fixed World owner', 'src/runtime/tileSceneOwner.ts'], ['Runtime scene instantiator', 'src/runtime/runtimeSceneInstantiator.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime particle owner', 'src/runtime/particleOwner.ts'], ['Runtime graph debug owner', 'src/runtime/graphDebugOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [["Production network owner","src/runtime/productionNetworkOwner.ts"],["Network session owner","src/runtime/networkSessionOwner.ts"],["Multiplayer replay owner","src/runtime/multiplayerReplayOwner.ts"],["Network project value algorithms","src/runtime/networkProductionValues.ts"],["Web network transports","src/platform/webNetworkTransports.ts"],["Native network transport","src/platform/nativeNetworkTransport.ts"],["Network platform factory","src/platform/networkPlatformFactory.ts"]]) entries.push([label, entry])
for (const [label, entry] of entries) {
  if (entry === 'src/runtime/dynamicObjects.ts' && !modules.has(entry)) {
    assert.ok(!graph.modules.some(item => [...(item.imports ?? []), ...(item.dynamicImports ?? [])].includes(entry)), 'An absent compatibility module must have no compiled references')
    assert.ok(!graph.chunks.some(item => item.modules.includes(entry)), 'An absent compatibility module must not appear in emitted chunks')
    results.push({ label, entry, status: 'NOT_EMITTED_NOT_A_BOUNDARY_PASS', violations: [], note: 'The source gate still checks this public compatibility facade. This build does not compile or emit it; no compiled-boundary pass is claimed.' })
    continue
  }
  assert.ok(modules.has(entry), `Actual compiled entry must exist: ${entry}`)
  const reachable = walk([entry], modules, item => [...(item?.imports ?? []), ...(item?.dynamicImports ?? [])])
  const violations = [...reachable].filter(([id]) => forbidden(id)).map(([id, path]) => ({ id, path }))
  results.push({ label, entry, reachableModules: reachable.size, status: violations.length ? 'NOT_PASSED' : 'VERIFIED_MODULE_GRAPH', violations })
}
const playerChunk = graph.chunks.find(item => item.entry && item.facade === 'player.html')
assert.ok(playerChunk, 'Actual Player emitted entry must exist')
const playerReachableChunks = walk([playerChunk.file], chunks, item => [...(item?.imports ?? []), ...(item?.dynamicImports ?? [])])
const playerEmittedModules = new Set([...playerReachableChunks.keys()].flatMap(file => chunks.get(file)?.modules ?? []))
const emittedViolations = [...playerEmittedModules].filter(forbidden)
results.push({ label: 'Player emitted production chunks', entry: playerChunk.file, reachableChunks: playerReachableChunks.size,
  renderedModules: playerEmittedModules.size, status: emittedViolations.length ? 'NOT_PASSED' : 'VERIFIED_EMITTED_GRAPH', violations: emittedViolations })
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), buildId: graph.buildId, sourceHash: graph.sourceHash, artifact: directory,
  status: results.every(item => !item.violations.length && item.status.startsWith('VERIFIED_')) ? 'VERIFIED_BOUNDARIES' : 'NOT_PASSED', results,
  limits: ['Failure is a required M1 migration gap, not a passing result.', 'Source module reachability and rendered chunk reachability are reported separately; tree shaking alone is insufficient.', 'This gate does not yet prove package exports/project references or native capability separation.'] }
const output = join(root, '.cache/engine-overhaul/production-boundaries.json')
await mkdir(resolve(output, '..'), { recursive: true }); await writeFile(output, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ status: report.status, buildId: report.buildId, results: results.map(item => ({ label: item.label, status: item.status, violations: item.violations.length })), report: output }))
if (report.status !== 'VERIFIED_BOUNDARIES') process.exitCode = 1
