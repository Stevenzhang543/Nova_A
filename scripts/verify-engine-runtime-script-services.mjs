import assert from 'node:assert/strict'
import { readFile, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'
import ts from 'typescript'

const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(tmpdir(), 'nova-script-services-'))
const before = process.argv.includes('--before'), stage = before ? 'before' : 'after', checks = [], normalize = path => path.replaceAll('\\', '/')
const reportOverride = process.argv.find(value => value.startsWith('--report='))?.slice('--report='.length)
const baselineDirectory = join(root, process.argv.find(value => value.startsWith('--baseline-dir='))?.slice('--baseline-dir='.length) ?? '.cache/engine-runtime/script-catalog-before')
const sourceFiles = ['src/runtime/GameplayRuntime.ts', 'src/runtime/eventSheets.ts', 'nova_core/pkg/nova_core_bg.wasm']
const sourceHashes = {}
let passed = false, servicesGraph = null
if (!globalThis.crypto) globalThis.crypto = webcrypto
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32', userAgent: 'Nova actual script service integration' } })
const check = (name, operation) => { operation(); checks.push(name) }
try {
  const originals = new Map()
  if (before) for (const path of sourceFiles.filter(path => path.endsWith('.ts'))) originals.set(normalize(join(root, path)), await readFile(join(baselineDirectory, path.replaceAll('/', '_')), 'utf8'))
  for (const path of sourceFiles) sourceHashes[path] = createHash('sha256').update(originals.get(normalize(join(root, path))) ?? await readFile(join(root, path))).digest('hex')
  const entry = join(temporary, 'entry.ts'), entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime, gameplayRuntime, DEFAULT_SCRIPT_SOURCE',
    'src/store/physics.ts': 'physicsState',
    'src/assets/AssetDatabase.ts': 'assetState, resolveAsset, readTextAsset',
    'src/assets/types.ts': 'defaultScriptMetadata',
    'src/world/BoxEntity.ts': 'BoxEntity',
    'src/world/components.ts': 'Script2D',
    'src/runtime/entityLifetimes.ts': 'beginEntityLifetime',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings',
    'src/runtime/scriptDebug.ts': 'scriptDebugState, clearScriptDebugger, beginDebugSession',
    'src/runtime/eventSheets.ts': 'resolveEventHandlers, scheduleObjectEvents',
    'nova_core/pkg/nova_core.js': 'default as initWasm, WasmScriptRuntime'
  }
  if (!before) entries['src/editor/gameplayScriptServices.ts'] = 'createEditorGameplayScriptServices'
  if (!before) entries['src/editor/gameplayWorldHost.ts'] = 'createEditorGameplayWorldHost'
  await writeFile(entry, Object.entries(entries).map(([path, names]) => `export { ${names} } from '${normalize(join(root, path))}';`).join('\n') + (!before ? `\nexport { GameplayRuntime as GameplayRuntimeCore } from '${normalize(join(root, 'src/runtime/GameplayRuntimeCore.ts'))}';\nexport { resolveEventHandlers as resolveCatalogEventHandlers } from '${normalize(join(root, 'src/runtime/eventSheetReader.ts'))}';` : ''))
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: before ? [{ name: 'byte-exact-before-source', enforce: 'pre', load(id) { return originals.get(normalize(id)) } }] : [], build: { ssr: true, outDir: temporary, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  const core = await import(pathToFileURL(join(temporary, 'integration.mjs')).href)
  await core.initWasm({ module_or_path: await readFile(join(root, 'nova_core/pkg/nova_core_bg.wasm')) })
  core.scriptProjectSettings.debuggerEnabled = false; core.scriptProjectSettings.testing.coverageEnabled = false; core.scriptProjectSettings.hotReloadEnabled = true
  const exportNames = source => {
    const syntax = ts.createSourceFile('runtime.ts', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), names = new Set()
    for (const statement of syntax.statements) {
      if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) for (const element of statement.exportClause.elements) names.add(element.name.text)
      if (!statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) continue
      if (statement.name && ts.isIdentifier(statement.name)) names.add(statement.name.text)
      if (ts.isVariableStatement(statement)) for (const declaration of statement.declarationList.declarations) if (ts.isIdentifier(declaration.name)) names.add(declaration.name.text)
    }
    return names
  }
  const publicApi = JSON.parse(await readFile(join(root, 'scripts/fixtures/engine-runtime-public-api-v1.json'), 'utf8'))
  const originalExports = new Set(publicApi.exports), publicSource = before ? originals.get(normalize(join(root, 'src/runtime/GameplayRuntime.ts'))) : await readFile(join(root, 'src/runtime/GameplayRuntime.ts'), 'utf8')
  const currentExports = exportNames(publicSource)
  check('all-original-public-value-and-type-exports-retained', () => {
    assert.equal(originalExports.size, 8)
    if (before) { assert.equal(createHash('sha256').update(publicSource).digest('hex'), publicApi.baselineSourceSha256); assert.deepEqual([...currentExports].sort(), [...originalExports].sort()) }
    for (const name of originalExports) assert(currentExports.has(name), `Missing original export ${name}`)
  })
  const add = (uuid, source, assetType = 'script', path = `Assets/Scripts/${uuid}.rhai`) => {
    const record = { uuid, name: uuid, path, assetType, source, script: assetType === 'script' ? core.defaultScriptMetadata() : undefined }
    core.assetState.records.push(record); core.assetState.generation++; return record
  }
  core.assetState.records.splice(0); core.assetState.generation++
  const helper = add('catalog-helper', 'fn twice(value) { value * 2 }')
  const text = add('catalog-main', 'use "catalog-helper";\n@export let count = 0;\nlet private_count = 0;\nfn update(dt) { private_count += 1; count = twice(private_count); }')
  const eventLogic = add('catalog-event', '@export let events = "";\nfn base(dt) { events += "b"; }\nfn child(dt) { events += "c"; }')
  const handler = (uuid, callback, overrideInherited = false) => ({ uuid, kind: 'update', name: callback, selector: '', callback, enabled: true, priority: 0, overrideInherited })
  const sheet = (uuid, baseSheetAsset, handlers) => ({ format: 'nova-event-sheet', version: 1, uuid, name: uuid, enabled: true, ownerComponent: 'Entity', logicAsset: 'catalog-event', baseSheetAsset, deterministicSeed: 1, handlers })
  const base = add('catalog-base', JSON.stringify(sheet('base-doc', null, [handler('base-handler', 'base')])), 'eventSheet')
  const child = add('catalog-child', JSON.stringify(sheet('child-doc', 'asset://catalog-base', [handler('child-handler', 'child')])), 'eventSheet')
  let entityId = 1
  const makeEntity = (name, reference) => { const entity = new core.BoxEntity(entityId++, { x: 0, y: 0 }, { x: 1, y: 1 }); entity.name = name; entity.isStatic = true; entity.addComponent(new core.Script2D()).scriptAsset = reference; core.beginEntityLifetime(entity); return entity }
  const runtimes = [], makeRuntime = services => { const runtime = services ? new core.GameplayRuntimeCore(services, core.createEditorGameplayWorldHost()) : new core.GameplayRuntime(); runtime.scriptRuntime = new core.WasmScriptRuntime(); runtime.playSessionIdentity = 101 + runtimes.length; runtime.scriptRuntime.clear_instances(runtime.playSessionIdentity); runtime.active = true; runtimes.push(runtime); return runtime }
  const worldOwner = core.physicsState.world
  const runtime = makeRuntime(), entity = makeEntity('Catalog', text.uuid), eventEntity = makeEntity('Events', eventLogic.uuid)
  eventEntity.script2D.eventSheetAsset = 'asset://catalog-child'
  core.physicsState.world.entities.splice(0, core.physicsState.world.entities.length, entity, eventEntity); core.physicsState.playMode = 'playing'
  runtime.compileAttachedScripts(); runtime.runPhase('update'); runtime.runPhase('update')
  check('actual-production-VM-private-scope-and-top-level-once', () => { assert.equal(entity.script2D.lastError, null); assert.equal(entity.script2D.properties.count, 4) })
  const ordered = core.resolveEventHandlers('asset://catalog-child').map(value => value.callback)
  check('actual-Gameplay-inherited-callback-dispatch-order', () => { assert.equal(eventEntity.script2D.lastError, null); assert.equal(eventEntity.script2D.properties.events, ordered.join('').replaceAll('base', 'b').replaceAll('child', 'c').repeat(2)); assert.deepEqual(core.scheduleObjectEvents([eventEntity], 'update').map(value => value.callback), ordered) })
  const stored = core.readTextAsset(helper.uuid)
  runtime.queueHotReload(helper.uuid, 'fn twice(value) { value * 3 }'); runtime.flushHotReloads(); runtime.runPhase('update')
  check('dependent-module-atomic-hot-reload-keeps-authoring-source', () => { assert.equal(core.scriptDebugState.hotReload.status, 'applied'); assert.equal(entity.script2D.properties.count, 3); assert.equal(core.readTextAsset(helper.uuid), stored) })
  const validVm = runtime.scriptRuntime, validSource = runtime.compiledSources.get(text.uuid)
  runtime.queueHotReload(helper.uuid, 'fn twice(value) { value * 4 }'); text.script.reloadPolicy = 'disabled'; runtime.flushHotReloads(); text.script.reloadPolicy = 'preserve'; runtime.runPhase('update')
  check('failed-dependent-transaction-retains-original-VM-and-scope', () => { assert.equal(core.scriptDebugState.hotReload.status, 'rejected'); assert.equal(runtime.scriptRuntime, validVm); assert.equal(runtime.compiledSources.get(text.uuid), validSource); assert.equal(entity.script2D.properties.count, 6) })
  core.assetState.generation++; runtime.runPhase('update')
  check('catalog-revision-does-not-reinitialize-live-instance', () => assert.equal(entity.script2D.properties.count, 9))
  assert.equal(runtime.rollbackHotReload(helper.uuid), true); runtime.flushHotReloads(); runtime.runPhase('update')
  check('real-authoring-source-rollback-restores-dependent-VM', () => { assert.equal(core.scriptDebugState.hotReload.status, 'applied'); assert.equal(entity.script2D.properties.count, 2); assert.equal(core.readTextAsset(helper.uuid), stored) })
  const debugAsset = add('catalog-debug', '@export let runs = 0;\nfn update(dt) {\n  runs += 1;\n}')
  debugAsset.script.breakpointDetails = [{ id: 'conditional', line: 3, functionName: 'update', condition: '', hitCondition: 2, logMessage: '', enabled: true, hitCount: 0 }]
  const debugEntity = makeEntity('Debug', debugAsset.uuid); core.physicsState.world.entities.push(debugEntity); runtime.invalidateScriptWorld()
  core.scriptProjectSettings.debuggerEnabled = true; core.beginDebugSession(); runtime.runEntityFunction(debugEntity, 'update')
  runtime.runEntityFunction(debugEntity, 'update')
  check('real-authoring-breakpoint-hit-count-and-callback-entry-pause', () => { assert.equal(debugAsset.script.breakpointDetails[0].hitCount, 2); assert.equal(debugEntity.script2D.properties.runs, 1); assert.equal(core.physicsState.playMode, 'paused'); assert.equal(core.scriptDebugState.callStack[0].line, 3); assert.equal(runtime.pendingDebugInvocation.scriptUuid, debugAsset.uuid) })
  core.clearScriptDebugger(); core.physicsState.playMode = 'playing'; debugAsset.script.breakpointDetails[0].logMessage = 'observed {entityName}'; runtime.runEntityFunction(debugEntity, 'update')
  check('real-authoring-logpoint-increments-hit-and-executes-callback', () => { assert.equal(debugAsset.script.breakpointDetails[0].hitCount, 3); assert.equal(debugEntity.script2D.properties.runs, 2); assert.equal(core.scriptDebugState.paused, false) })
  core.scriptProjectSettings.debuggerEnabled = false
  if (!before) {
    check('compatibility-facade-inherits-unique-core-and-singleton', () => { assert.equal(Object.getPrototypeOf(core.GameplayRuntime.prototype), core.GameplayRuntimeCore.prototype); assert(core.gameplayRuntime instanceof core.GameplayRuntime); assert(core.gameplayRuntime instanceof core.GameplayRuntimeCore); assert.equal(runtime.runPhase, core.GameplayRuntimeCore.prototype.runPhase); assert.match(core.DEFAULT_SCRIPT_SOURCE, /fn update/) })
    const editorServices = core.createEditorGameplayScriptServices()
    check('editor-catalog-retains-identity-versus-module-path-boundary', () => { assert.equal(editorServices.resolveAsset(helper.path), null); assert.equal(editorServices.resolveModuleAsset(helper.path).uuid, helper.uuid); assert.equal(editorServices.revision(), core.assetState.generation) })
    const alternative = new Map(core.assetState.records.map(record => [record.uuid, JSON.parse(JSON.stringify(record))])), reads = []
    alternative.get(helper.uuid).source = 'fn twice(value) { value * 11 }'
    alternative.get(child.uuid).source = JSON.stringify(sheet('child-doc', 'asset://catalog-base', [handler('child-handler', 'base', true)]))
    let revision = 5
    const services = {
      resolveAsset: reference => alternative.get(reference?.replace(/^asset:\/\//, '')) ?? null,
      resolveModuleAsset: reference => [...alternative.values()].find(record => ['script', 'visualScript'].includes(record.assetType) && (record.uuid === reference.replace(/^asset:\/\//, '') || record.path === reference)) ?? null,
      readSource: reference => { const uuid = reference?.replace(/^asset:\/\//, ''); reads.push(uuid); return alternative.get(uuid)?.source ?? null },
      revision: () => revision, listIdentities: () => [...alternative.values()], compileVisual: editorServices.compileVisual,
      recordBreakpointHit: (uuid, index, point) => { const actual = alternative.get(uuid).script.breakpointDetails[index]; assert.equal(actual.id, point.id); return actual.hitCount = Math.min(1_000_000_000, actual.hitCount + 1) }
    }
    const otherRuntime = makeRuntime(services), otherEntity = makeEntity('Other catalog', text.uuid), otherEvent = makeEntity('Other event', eventLogic.uuid)
    otherEvent.script2D.eventSheetAsset = 'asset://catalog-child'; core.physicsState.world.entities.splice(0, core.physicsState.world.entities.length, otherEntity, otherEvent)
    otherRuntime.compileAttachedScripts(); otherRuntime.runPhase('update')
    check('actual-Core-module-and-event-reads-use-injected-catalog', () => { assert.equal(otherEntity.script2D.properties.count, 11); assert.equal(otherEvent.script2D.properties.events, 'b'); assert(reads.includes(base.uuid)); assert.deepEqual(core.resolveCatalogEventHandlers('asset://catalog-child', services).map(item => item.callback), ['base']); assert.equal(core.resolveEventHandlers('asset://catalog-child').length, 2) })
    revision++; otherRuntime.runPhase('update')
    check('injected-revision-retains-private-scope-without-default-catalog', () => { assert.equal(otherEntity.script2D.properties.count, 22); assert.equal(core.readTextAsset(helper.uuid), stored) })
    alternative.get(base.uuid).source = JSON.stringify(sheet('base-doc', 'asset://catalog-child', [handler('base-handler', 'base')]))
    check('injected-broken-inheritance-fails-closed-with-no-global-fallback', () => assert.deepEqual(core.resolveCatalogEventHandlers('asset://catalog-child', services), []))
    alternative.get(base.uuid).source = base.source
    const ownDebug = makeEntity('Injected debug', debugAsset.uuid); core.physicsState.world.entities.push(ownDebug); otherRuntime.invalidateScriptWorld()
    alternative.get(debugAsset.uuid).script.breakpointDetails[0].hitCondition = 0; alternative.get(debugAsset.uuid).script.breakpointDetails[0].logMessage = 'catalog {entityName}'
    core.scriptProjectSettings.debuggerEnabled = true; core.clearScriptDebugger(); otherRuntime.runEntityFunction(ownDebug, 'update')
    check('injected-debug-write-updates-only-its-catalog-owner', () => { assert.equal(alternative.get(debugAsset.uuid).script.breakpointDetails[0].hitCount, 4); assert.equal(debugAsset.script.breakpointDetails[0].hitCount, 3); assert.equal(ownDebug.script2D.properties.runs, 1) })
    core.scriptProjectSettings.debuggerEnabled = false
    otherRuntime.queueHotReload(helper.uuid, 'fn twice(value) { value * 13 }'); otherRuntime.flushHotReloads(); otherRuntime.runPhase('update')
    check('injected-catalog-hot-reload-uses-same-real-VM-transaction', () => { assert.equal(core.scriptDebugState.hotReload.status, 'applied'); assert.equal(otherEntity.script2D.properties.count, 13); assert.equal(alternative.get(helper.uuid).source, 'fn twice(value) { value * 11 }') })
    check('read-only-host-rejects-authoring-rollback-without-source-mutation', () => { assert.equal(otherRuntime.rollbackHotReload(helper.uuid), false); assert.equal(alternative.get(helper.uuid).source, 'fn twice(value) { value * 11 }'); assert.equal(otherRuntime.pendingReloads.size, 0) })
    const originalRead = services.readSource; services.readSource = () => null
    check('per-instance-catalog-callback-identity-is-bound', () => assert.match(otherRuntime.resolveScriptBundle(text.uuid), /value \* 11/))
    services.readSource = originalRead
    check('injected-runtime-keeps-existing-world-owner', () => { assert.equal(core.physicsState.world, worldOwner); assert.equal(core.physicsState.world.entities[0].uuid, otherEntity.uuid) })
    check('Core-requires-explicit-catalog-without-Editor-default', () => assert.throws(() => new core.GameplayRuntimeCore(), /SCRIPT_SERVICES_REQUIRED/))
    const modules = new Set(), pureEntry = join(temporary, 'pure.ts')
    await writeFile(pureEntry, `export * from '${normalize(join(root, 'src/runtime/eventSheetReader.ts'))}';\nexport * from '${normalize(join(root, 'src/runtime/scriptServices.ts'))}';`)
    await build({ configFile: false, root, logLevel: 'error', plugins: [{ name: 'production-service-graph', transform(_source, id) { modules.add(normalize(id)) } }], build: { outDir: join(temporary, 'pure'), lib: { entry: pureEntry, formats: ['es'], fileName: 'pure' }, rollupOptions: { external: [], output: { inlineDynamicImports: true } } } })
    const forbidden = [...modules].filter(path => /\/src\/(?:editor|store|assets)\/|\/node_modules\/(?:vue|pinia)\//.test(path))
    servicesGraph = { modules: [...modules].filter(path => path.startsWith(normalize(root))).map(path => path.slice(root.length + 1)), forbidden }
    check('actual-production-reader-service-graph-has-no-Editor-AssetDB-Vue', () => assert.deepEqual(forbidden, []))
  }
  for (const item of runtimes) item.scriptRuntime?.free()
  passed = true; console.log(`Actual script catalog ${stage}: ${checks.length} checks passed`)
} finally {
  const reportDir = join(root, '.cache/engine-runtime'); await mkdir(reportDir, { recursive: true })
  const reportPath = reportOverride ? join(root, reportOverride) : join(reportDir, `script-services-${stage}.json`)
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, JSON.stringify({ stage, generatedAt: new Date().toISOString(), status: passed ? 'passed' : 'failed', sourceHashes, checks, servicesGraph, scope: 'Actual Gameplay/AssetDatabase/EventSheet/WASM integration; before uses byte-exact saved production sources. No Worker/browser/Player or full Runtime isolation certification.' }, null, 2))
  await rm(temporary, { recursive: true, force: true })
}
