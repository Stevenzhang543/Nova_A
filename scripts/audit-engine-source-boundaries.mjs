/** Check source dependencies, including erased type imports, with the repository's locked TS resolver. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import ts from 'typescript'

const root = resolve(process.cwd()), graph = new Map()
const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile)
assert.equal(config.error, undefined, 'Read the actual project configuration')
const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
const id = path => relative(root, path).replaceAll('\\', '/')
const inside = path => !isAbsolute(id(path)) && !id(path).startsWith('../')
const forbidden = path => /^src\/(?:editor|store|components|layout|ui)\//.test(path)
  || /^src\/assets\/(?:AssetDatabase|importPipeline)\./.test(path)
  || /^src\/(?:App|PlayerApp)\.vue/.test(path)
  || /^src\/runtime\/(?:gameExporter|projectUpgrade|projectMutationRouter|extensionEcosystem|buildSettings)\./.test(path)
  || /(?:^|\/)node_modules\/.*(?:\/vue(?:@|\/)|\/@vue\/|\/pinia(?:@|\/))/.test(path)
const forbiddenSpecifier = name => /^(?:vue|@vue\/[^/]+|pinia)(?:\/|$)/.test(name)
async function dependencies(path) {
  if (graph.has(path)) return graph.get(path)
  const bytes = await readFile(path), name = id(path)
  const file = ts.createSourceFile(path, bytes.toString('utf8'), ts.ScriptTarget.Latest, true)
  const result = { path: name, sha256: createHash('sha256').update(bytes).digest('hex'), dependencies: [] }
  const references = new Map()
  const add = (text, kind) => { if (text && ts.isStringLiteralLike(text)) references.set(`${kind}:${text.text}`, { specifier: text.text, kind }) }
  function visit(node) {
    if (ts.isImportDeclaration(node)) add(node.moduleSpecifier, node.importClause?.isTypeOnly ? 'type-import' : 'import')
    if (ts.isExportDeclaration(node)) add(node.moduleSpecifier, node.isTypeOnly ? 'type-export' : 'export')
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression, 'import-equals')
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal, 'import-type')
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) add(node.arguments[0], 'dynamic-import-or-require')
    ts.forEachChild(node, visit)
  }
  visit(file)
  for (const reference of references.values()) {
    const resolution = ts.resolveModuleName(reference.specifier, path, options, ts.sys).resolvedModule
    const target = resolution ? resolve(resolution.resolvedFileName) : reference.specifier.startsWith('.') ? resolve(path, '..', reference.specifier) : null
    result.dependencies.push({ ...reference, target, targetId: target ? id(target) : reference.specifier,
      unresolved: !resolution, forbidden: forbiddenSpecifier(reference.specifier) || target !== null && forbidden(id(target)),
      asset: target !== null && /\.css$/.test(target) && ts.sys.fileExists(target),
      local: target !== null && inside(target) && !id(target).startsWith('node_modules/') })
  }
  graph.set(path, result)
  return result
}
const entries = [
  ['Runtime core', 'src/runtime/GameplayRuntimeCore.ts'], ['Runtime compatibility composition', 'src/runtime/GameplayRuntime.ts'],
  ['Renderer core', 'src/renderer/core.ts'], ['Renderer frontend', 'src/renderer/sceneRenderer.ts'],
  ['World', 'src/world/World.ts'], ['Coordinator', 'src/runtime/performance/coordinator.ts'],
  ['Job scheduler', 'src/runtime/jobScheduler.ts'], ['Event sheet reader', 'src/runtime/eventSheetReader.ts'],
  ['Lighting owner', 'src/renderer/lighting2d.ts'], ['Production configuration', 'src/runtime/production.ts'],
  ['Debug counter owner', 'src/runtime/scriptDebugCounterOwner.ts'], ['Hierarchy', 'src/world/hierarchy.ts'],
  ['Shared script analysis', 'src/runtime/scriptAnalysis.ts'], ['Script contracts', 'src/runtime/scriptContracts.ts'],
  ['Script coverage', 'src/runtime/scriptCoverage.ts'], ['Script hot reload', 'src/runtime/scriptHotReload.ts'],
  ['Script test execution', 'src/runtime/scriptTestExecution.ts'],
  ['Script state bootstrap', 'src/runtime/scriptStateAdapter.ts'], ['Profiler owner', 'src/runtime/profiler.ts'],
  ['Profiler collection budget', 'src/runtime/profilerCollectionBudget.ts'], ['Input state bootstrap', 'src/runtime/inputStateAdapter.ts'],
  ['Input modality state', 'src/runtime/inputModality.ts'], ['Device input state', 'src/runtime/deviceInput.ts'],
  ['Gameplay direct host contracts', 'src/runtime/gameplayWorldHost.ts'],
  ['AI owner', 'src/runtime/aiOwner.ts'], ['AI document contracts', 'src/runtime/aiDocuments.ts'], ['AI compatibility port', 'src/runtime/aiTools.ts'],
  ['Shared entity removal', 'src/world/entityRemoval.ts'], ['Shared entity builder', 'src/world/entityBuilder.ts'], ['TileMap value normalization', 'src/runtime/tileMapValues.ts'], ['Particle value normalization', 'src/runtime/particleEmitterValues.ts'],
  ['Runtime asset value algorithms', 'src/runtime/runtimeAssetValues.ts'], ['Prepared project catalog', 'src/runtime/runtimeProjectCatalog.ts'],
  ['Navigation owner', 'src/runtime/navigationOwner.ts'], ['Navigation geometry', 'src/runtime/navigationGeometry.ts'], ['Navigation compatibility port', 'src/runtime/navigation2d.ts'],
  ["Runtime asset record contracts","src/runtime/runtimeAssetRecordContracts.ts"], ["Derived sprite metadata","src/runtime/derivedSpriteMetadata.ts"], ["Content interchange metadata","src/runtime/contentInterchangeMetadata.ts"], ["Runtime asset record preparation","src/runtime/runtimeAssetPreparation.ts"], ["Prepared runtime resources","src/runtime/preparedRuntimeProjectResources.ts"], ["Runtime plugin owner","src/runtime/pluginRuntimeOwner.ts"], ["Entity lifetime owner","src/runtime/entityLifetimes.ts"], ["Stream lifecycle owner","src/runtime/streamLifecycle.ts"],
  ['Graph runtime hot reload', 'src/visual/graphRuntimeHotReload.ts'],
  ['Runtime package reader', 'src/runtime/novaPakReader.ts'],
  ['Detached runtime project loader', 'src/runtime/runtimeProjectLoader.ts'],
  ['Runtime package Web codecs', 'src/platform/webNovaPakCodecs.ts'],
  ['Bounded runtime byte stream', 'src/platform/runtimeByteStream.ts'],
  ['Bounded runtime package transport', 'src/platform/webRuntimePackageTransport.ts'],
  ['Gameplay flow owner', 'src/runtime/gameFlowOwner.ts'], ['Gameplay flow compatibility port', 'src/runtime/gameFlow.ts'],
  ['World gameplay owner', 'src/runtime/worldGameplayOwner.ts'], ['World gameplay compatibility port', 'src/runtime/worldGameplay.ts'], ['Gameplay components owner', 'src/runtime/gameplayComponentsOwner.ts'], ['Gameplay components compatibility port', 'src/runtime/gameplayComponents.ts'], ['Simulation evidence owner', 'src/runtime/simulationEvidenceOwner.ts'], ['Runtime prefab instantiator', 'src/runtime/runtimePrefabInstantiator.ts'], ['Runtime object pool owner', 'src/runtime/objectPoolOwner.ts'], ['Runtime dynamic objects owner', 'src/runtime/dynamicObjectsOwner.ts'], ['Runtime object pool compatibility port', 'src/runtime/objectPool.ts'], ['Runtime dynamic objects compatibility port', 'src/runtime/dynamicObjects.ts'], ['Shared scene entity records', 'src/world/sceneEntityData.ts'],
  ['Audio settings contracts', 'src/runtime/audioSettingsContracts.ts'], ['Runtime scene contracts', 'src/runtime/runtimeSceneContracts.ts'],
  ['Performance observations', 'src/runtime/largeWorldPerformance.ts'], ['Performance host', 'src/platform/performanceHost.ts'], ['Player', 'src/player.ts']
]
for (const [label, entry] of [["Animation value documents","src/runtime/animationDocuments.ts"],["Timeline value documents","src/runtime/timelineDocuments.ts"],["Animation document reader","src/runtime/animationTimelineDocumentReader.ts"],["Animation owner","src/runtime/animationOwner.ts"],["Timeline owner","src/runtime/timelineOwner.ts"],["Animation timeline owner","src/runtime/animationTimelineOwner.ts"],["Animation legacy port","src/runtime/animationTimelineLegacy.ts"],["Runtime save owner","src/runtime/runtimeSaveOwner.ts"],["Animation compatibility port","src/runtime/animation.ts"],["Timeline compatibility port","src/runtime/timeline.ts"],["Save compatibility port","src/runtime/saveGame.ts"],["Animation timeline contracts","src/runtime/animationTimelineContracts.ts"]]) entries.push([label, entry])
for (const [label, entry] of [["Audio document values","src/runtime/audioDocuments.ts"],["Audio resource reader","src/runtime/audioResourceReader.ts"],["Audio runtime engine","src/runtime/audioRuntime.ts"],["Audio legacy capability port","src/runtime/audioLegacy.ts"],["Audio world owner","src/runtime/audioOwner.ts"],["Audio buffer engine","src/runtime/audioBuffers.ts"],["Web audio platform","src/platform/webAudioHost.ts"],["Audio compatibility facade","src/runtime/audio.ts"],["Audio runtime contracts","src/runtime/audioRuntimeContracts.ts"]]) entries.push([label, entry])
for (const [label, entry] of [['Runtime fault records', 'src/runtime/runtimeFaultRecords.ts'], ['Application log contracts', 'src/contracts/applicationLog.ts']]) entries.push([label, entry])
const results = []
for (const [label, entry] of [['Runtime presentation owner', 'src/runtime/presentationOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime virtual controls input owner', 'src/runtime/virtualControlsInputOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime replay owner', 'src/runtime/replayOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [['TileSet value documents', 'src/runtime/tileSetValues.ts'], ['TileMap fixed World owner', 'src/runtime/tileMapOwner.ts'], ['Tile placement fixed World owner', 'src/runtime/tileSceneOwner.ts'], ['Runtime scene instantiator', 'src/runtime/runtimeSceneInstantiator.ts']]) entries.push([label, entry])
for (const [label, entry] of [['Runtime particle owner', 'src/runtime/particleOwner.ts'], ['Runtime graph debug owner', 'src/runtime/graphDebugOwner.ts']]) entries.push([label, entry])
for (const [label, entry] of [["Production network owner","src/runtime/productionNetworkOwner.ts"],["Network session owner","src/runtime/networkSessionOwner.ts"],["Multiplayer replay owner","src/runtime/multiplayerReplayOwner.ts"],["Network project value algorithms","src/runtime/networkProductionValues.ts"],["Network session contracts","src/runtime/networkSessionContracts.ts"],["Web network transports","src/platform/webNetworkTransports.ts"],["Native network transport","src/platform/nativeNetworkTransport.ts"],["Network platform factory","src/platform/networkPlatformFactory.ts"]]) entries.push([label, entry])
for (const [label, entry] of entries) {
  const pending = [{ path: resolve(root, entry), chain: [entry] }], visited = new Set(), violations = [], unresolved = [], external = new Set(), assets = new Set()
  for (let index = 0; index < pending.length; index++) {
    const item = pending[index]
    if (visited.has(item.path)) continue
    visited.add(item.path)
    for (const dependency of (await dependencies(item.path)).dependencies) {
      const chain = [...item.chain, dependency.targetId]
      if (dependency.forbidden) { violations.push({ ...dependency, chain }); continue }
      if (dependency.asset) { assets.add(dependency.targetId); continue }
      if (dependency.unresolved && dependency.local) { unresolved.push({ ...dependency, chain }); continue }
      if (dependency.local) pending.push({ path: dependency.target, chain })
      else external.add(dependency.specifier)
    }
  }
  results.push({ label, entry, reachableLocalModules: visited.size, status: violations.length || unresolved.length ? 'NOT_PASSED' : 'VERIFIED_SOURCE_IMPORTS', violations, unresolved, external: [...external].sort(), assets: [...assets].sort() })
}
const report = { schemaVersion: 1, generatedAt: new Date().toISOString(), typescriptVersion: ts.version,
  status: results.every(result => result.status === 'VERIFIED_SOURCE_IMPORTS') ? 'VERIFIED_SOURCE_BOUNDARIES' : 'NOT_PASSED', results,
  source: [...graph.values()].sort((a, b) => a.path.localeCompare(b.path)),
  limits: ['Includes type-only imports and exports; mixed imports conservatively traverse the entire target module.',
    'Forbidden edges stop traversal and retain their actual chain; counts differ from the complete compiled reachability gate.',
    'Existing CSS imports are recorded as assets; CSS contents, external library internals and global ambient declarations are not traversed.',
    'Does not certify package exports, project-reference isolation, emitted Player chunks, Worker execution or native capabilities.'] }
const output = join(root, '.cache/engine-overhaul/source-boundaries.json')
await mkdir(resolve(output, '..'), { recursive: true })
await writeFile(output, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ status: report.status, results: results.map(result => ({ label: result.label, status: result.status, violations: result.violations.length, unresolved: result.unresolved.length })), report: output }))
if (report.status !== 'VERIFIED_SOURCE_BOUNDARIES') process.exitCode = 1
