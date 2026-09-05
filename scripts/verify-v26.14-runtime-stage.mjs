import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { build } from 'vite'
import ts from 'typescript'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {runtimeAudit14Paths,buildRuntimeAudit14Example} from './lib/runtimeAudit14.mjs'
const paths=runtimeAudit14Paths(import.meta.url),{stage,root,integrated,reportDir}=paths,useNative=process.argv.includes('--native')
const outDir = join(paths.cacheDir, 'runtime-compiled-'+(useNative?'native':'wasm')), checks = [], logs = [], registrations = []
const normalize = path => path.replaceAll('\\', '/')
const overlay = file => { const normalized = normalize(file), prefix = normalize(root) + '/'; return normalized.startsWith(prefix) ? join(stage, normalized.slice(prefix.length)) : null }
const readOverlay = file => { const candidate = overlay(file); return candidate && existsSync(candidate) ? readFileSync(candidate, 'utf8') : readFileSync(file, 'utf8') }
const runtimeFile = join(root, 'src/runtime/GameplayRuntime.ts'), source = readOverlay(runtimeFile)
const ast = ts.createSourceFile(runtimeFile, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS), imports = new Map()
for (const statement of ast.statements.filter(ts.isImportDeclaration)) {
  const names = statement.importClause?.namedBindings && ts.isNamedImports(statement.importClause.namedBindings) ? statement.importClause.namedBindings.elements.filter(element => !element.isTypeOnly).map(element => element.propertyName?.text ?? element.name.text) : []
  if (!statement.importClause?.isTypeOnly) imports.set(statement.moduleSpecifier.text, [...new Set([...(imports.get(statement.moduleSpecifier.text) ?? []), ...names])])
}
const realImports = new Set(['../assets/AssetDatabase', '../world/geometry', '../world/hierarchy', '../editor/selection', './time', './entityLifetimes', './dynamicObjects', './objectPool', './scriptTestExecution', './scriptHotReload', './scriptContracts', './scriptModules', './eventSheets', '../visual/graphCompiler', '../editor/scriptLanguage', '../editor/scriptLanguage26', './scriptSettings', './scriptDebug', './mediaClock', './timelineUiActions'])
const stagedWasm = !integrated && process.argv.includes('--staged-wasm'), wasmDirectory = stagedWasm ? join(stage,'wasm') : join(root,'nova_core/pkg')
const wasm = await import(pathToFileURL(join(wasmDirectory, 'nova_core.js')))
wasm.initSync({ module: await readFile(join(wasmDirectory, 'nova_core_bg.wasm')) })
const nativeBridge = useNative ? await buildRuntimeAudit14Example(paths,'runtime_bridge') : null
class NativeVm {
  sources = new Map()
  request(source, fn, context) { const result = spawnSync(nativeBridge, { input: JSON.stringify({ source, function: fn, context: context && JSON.parse(context) }), encoding: 'utf8', timeout: 15_000, maxBuffer: 10_000_000, windowsHide: true }); if (result.error || result.status) throw result.error ?? Error(result.stderr); const parsed = JSON.parse(result.stdout); if (parsed.error) throw Error(parsed.error); return JSON.stringify(parsed.value) }
  compile_cached(id, source) { const exports = this.request(source); this.sources.set(id, source); return exports }
  execute_cached_json(id, fn, context) { if (!this.sources.has(id)) throw Error('Missing native source cache'); return this.request(this.sources.get(id), fn, context) }
  execute_json(source, fn, context) { return this.request(source, fn, context) }
  validate(source) { return this.request(source) }
  free() { this.sources.clear() }
}
let allocations = 0, frees = 0
class TrackedVm {
  constructor() { this.vm = useNative ? new NativeVm() : new wasm.WasmScriptRuntime(); allocations++ }
  compile_cached(...args) { return this.vm.compile_cached(...args) }
  execute_cached_json(...args) { return this.vm.execute_cached_json(...args) }
  execute_json(...args) { return this.vm.execute_json(...args) }
  validate(source) { return this.vm.validate(source) }
  free() { this.vm.free(); frees++ }
}
const fixture = {
  InputManager: class { start() {} stop() {} }, WasmScriptRuntime: TrackedVm,
  physicsState: { playMode: 'paused', selectedEntityIds: [], inputMap: [], globalSettings: { tickRate: 60, timeScale: 1 }, engineDiagnostics: {}, audioSettings: {}, world: { entities: [], connections: [], invalidateRuntime() {}, update: () => ({}), teleport: (entity, position, rotation) => { entity.transform.position = { ...position }; entity.transform.rotation = rotation } } },
  editorState: {}, packageState: { installed: [] },
  addEditorLog: (...args) => logs.push(args), replayFixedInput: input => input, deterministicRandom: () => .5, saveSnapshot: () => ({}), gameFlowSnapshot: () => ({ paused: false, score: 0, session: {}, checkpoints: [] }), productionNetworkContext: () => ({ enabled: false, connected: false, authority: false, localPeerId: '', peerCount: 0, tick: 0 }), runtimeSceneEntitySnapshots: () => [],
  registerGraphDebugDocument: document => registrations.push(document),
  readEntityAuthoringData: entity => ({ uuid:entity.uuid,components:entity.components.map(component=>({kind:component.kind,data:JSON.parse(JSON.stringify(component))})) }),
  prepareRuntimeSceneTransition: identifier => fixture.prepareScene(identifier),
  deleteEntity: id => { const entity=fixture.physicsState.world.entities.find(entity=>entity.id===id);if(!entity)return;const doomed=new Set([entity.uuid]);let changed=true;while(changed){changed=false;for(const item of fixture.physicsState.world.entities)if(item.parentUuid&&doomed.has(item.parentUuid)&&!doomed.has(item.uuid)){doomed.add(item.uuid);changed=true}}fixture.physicsState.world.entities=fixture.physicsState.world.entities.filter(entity=>!doomed.has(entity.uuid)) },
  gameScreenToWorld: point => point, visibleWorldBounds: () => ({minX:-1,maxX:1,minY:-1,maxY:1}),
  graphDebugState: {}, graphStateValues: () => ({}),
  audioRuntime: { update() {}, stopAll() {}, setTransportTime() {}, dispose() {}, begin() {} }, particleRuntime: { update() {}, reset() {} }, pluginRuntime: { update() {}, stop() {} }, animationRuntime: { reset() {}, update() {} }, timelineRuntime: { reset() {}, update() {} },
}
globalThis.__novaRuntime14 = fixture
const check = async (name, operation) => { try { await operation(); checks.push({ name, status: 'passed' }); console.log('PASS ' + name) } catch (error) { checks.push({ name, status: 'failed', error: error.stack }); console.error('FAIL ' + name + ': ' + error.message) } }

try {
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [{
    name: 'isolated-runtime14-overlay', enforce: 'pre',
    resolveId(specifier, importer) {
      if (!importer && overlay(specifier) && existsSync(overlay(specifier))) return normalize(specifier)
      if (normalize(importer ?? '').endsWith('/src/runtime/objectBlueprints.ts') && ['../store/physics', './prefabs', '../editor/authoring2d'].includes(specifier)) return `\0blueprint14:${specifier}`
      if (['/src/runtime/objectPool.ts','/src/runtime/dynamicObjects.ts'].some(file => normalize(importer ?? '').endsWith(file)) && ['../store/physics','../store/editor','./prefabs','./gameplayComponents'].includes(specifier)) return `\0host14:${specifier}`
      if (normalize(importer ?? '') === normalize(runtimeFile) && imports.has(specifier) && !realImports.has(specifier)) return `\0fixture14:${specifier}`
      if (specifier.startsWith('.') && importer && !importer.startsWith('\0')) for (const suffix of ['', '.ts', '.js']) {
        const path = resolve(dirname(importer), specifier + suffix), candidate = overlay(path)
        if (candidate && existsSync(candidate)) return normalize(path)
      }
    },
    load(id) {
      if (id.startsWith('\0host14:')) {
        const names = id.endsWith('/physics') ? ['physicsState'] : id.endsWith('/editor') ? ['addEditorLog'] : id.endsWith('/prefabs') ? ['instantiatePrefab'] : ['initializeGameplayEntities']
        return names.map(name => name === 'physicsState' ? 'export const physicsState = globalThis.__novaRuntime14.physicsState;' : `export const ${name} = (...args) => globalThis.__novaRuntime14[${JSON.stringify(name)}]?.(...args);`).join('\n')
      }
      if (id.startsWith('\0blueprint14:')) {
        const names = id.endsWith('/physics') ? ['beginHistoryTransaction','cancelHistoryTransaction','commitHistoryTransaction','physicsState','selectEntities'] : id.endsWith('/prefabs') ? ['capturePrefabOverrides','createPrefabFromEntities','instantiatePrefab'] : ['createAuthoringObject']
        return names.map(name => `export const ${name} = (...args) => globalThis.__novaRuntime14[${JSON.stringify(name)}](...args);`).join('\n').replace('export const physicsState = (...args) => globalThis.__novaRuntime14["physicsState"](...args);', 'export const physicsState = globalThis.__novaRuntime14.physicsState;')
      }
      if (id.startsWith('\0fixture14:')) return imports.get(id.slice('\0fixture14:'.length)).map(name => `export const ${name} = globalThis.__novaRuntime14[${JSON.stringify(name)}] ?? (() => {});`).join('\n')
      const candidate = overlay(id); if (candidate && existsSync(candidate)) return readFileSync(candidate, 'utf8')
    },
  }], build: { ssr: true, outDir, emptyOutDir: true, rollupOptions: { input: { prefabsReal: join(root,'src/runtime/prefabs.ts'), physicsReal: join(root, 'src/store/physics.ts'), scenes:join(root,'src/world/SceneManager.ts'), sceneTransitions:join(root,'src/runtime/runtimeSceneTransition.ts'), time: join(root, 'src/runtime/time.ts'), lifetimes: join(root, 'src/runtime/entityLifetimes.ts'), pool: join(root, 'src/runtime/objectPool.ts'), dynamic: join(root, 'src/runtime/dynamicObjects.ts'), runtime: runtimeFile, events: join(root, 'src/runtime/eventSheets.ts'), composition: join(root, 'src/runtime/objectComposition.ts'), blueprints: join(root, 'src/runtime/objectBlueprints.ts'), tests: join(root, 'src/runtime/scriptTestExecution.ts'), hotReload: join(root, 'src/runtime/scriptHotReload.ts'), assets: join(root, 'src/assets/AssetDatabase.ts'), entity: join(root, 'src/world/BoxEntity.ts'), components: join(root, 'src/world/components.ts'), settings: join(root, 'src/runtime/scriptSettings.ts'), sync: join(root, 'src/visual/graphCodeSync.ts'), graphTypes: join(root, 'src/visual/graphTypes.ts') }, output: { entryFileNames: '[name].mjs', chunkFileNames: '[name]-[hash].mjs' } } } })
  const load = name => import(pathToFileURL(join(outDir, name + '.mjs')))
  const [runtimeModule, events, suites, reload, db, entityModule, components, settings, sync, types] = await Promise.all(['runtime', 'events', 'tests', 'hotReload', 'assets', 'entity', 'components', 'settings', 'sync', 'graphTypes'].map(load))
  const [composition, blueprints] = await Promise.all(['composition', 'blueprints'].map(load))
  const prefabsReal = await load('prefabsReal')
  const [timeModule, lifetimes, pool, dynamic] = await Promise.all(['time','lifetimes','pool','dynamic'].map(load))
  const [sceneTransitions, sceneModule, physicsReal] = await Promise.all(['sceneTransitions','scenes','physicsReal'].map(load))
  settings.scriptProjectSettings.debuggerEnabled = false
  settings.scriptProjectSettings.hotReloadEnabled = true
  settings.scriptProjectSettings.testing.coverageEnabled = false
  const assets = new Map()
  function asset(name, source, assetType = 'script') {
    const record = { uuid: crypto.randomUUID(), name, path: `Assets/Scripts/${name}`, source: 'data:text/plain;charset=utf-8,' + encodeURIComponent(source), assetType, script: { reloadPolicy: 'preserve', apiVersion: 2 } }
    assets.set(record.uuid, record); db.assetState.records.splice(0, db.assetState.records.length, ...assets.values()); db.assetState.generation++; return record
  }
  const update = (record, source) => { record.source = 'data:text/plain;charset=utf-8,' + encodeURIComponent(source); db.assetState.generation++ }
  const ref = record => 'asset://' + record.uuid
  const handler = (callback, overrideInherited = true) => ({ ...events.defaultEventHandler('start'), callback, overrideInherited })
  const sheet = (name, logic, handlers, base) => asset(name, JSON.stringify({ ...events.defaultEventSheet(name, logic && ref(logic)), handlers, baseSheetAsset: base && ref(base) }), 'eventSheet')
  const baseLogic = asset('base.rhai', '@export let count = 0;\nfn inherited() { count += 1; log_info("base:" + count); }\nfn start() { log_info("base-start"); }')
  const derivedLogic = asset('derived.rhai', '@export let count = 100;\nfn local() { count += 1; log_info("derived:" + count); }\nfn start() { log_info("derived-start"); }')
  const base = sheet('base.events', baseLogic, [handler('inherited'), handler('start')])
  const child = sheet('child.events', derivedLogic, [handler('local'), handler('start', false)], base)
  await check('same event selector keeps distinct callbacks and additive author provenance', () => {
    const resolved = events.resolveEventHandlers(ref(child)); assert.equal(resolved.length, 4)
    assert.equal(resolved.find(item => item.callback === 'inherited').logicAsset, ref(baseLogic))
    assert.equal(resolved.filter(item => item.callback === 'start').length, 2)
  })
  await check('explicit override replaces only matching inherited callback', () => {
    const override = sheet('override.events', derivedLogic, [handler('start')], base), resolved = events.resolveEventHandlers(ref(override))
    assert.deepEqual(resolved.map(item => item.callback).sort(), ['inherited', 'start'])
    assert.equal(resolved.find(item => item.callback === 'start').logicAsset, ref(derivedLogic))
  })
  await check('cycles and missing bases cannot execute partial handler chains', () => {
    const broken = sheet('broken.events', derivedLogic, [handler('local')], { uuid: crypto.randomUUID() })
    assert.deepEqual(events.resolveEventHandlers(ref(broken)), [])
    const cyclic = sheet('cycle.events', derivedLogic, [handler('local')]); const document = events.readEventSheet(ref(cyclic)); document.baseSheetAsset = ref(cyclic); update(cyclic, JSON.stringify(document))
    assert.deepEqual(events.resolveEventHandlers(ref(cyclic)), [])
    assert.ok(events.validateEventSheet(document).some(item => item.code === 'EVENT-INHERIT-CYCLE'))
  })
  const entity = new entityModule.BoxEntity(1, { x: 0, y: 0 }, { x: 1, y: 1 }); entity.addComponent(new components.Script2D())
  entity.script2D.scriptAsset = ref(derivedLogic); entity.script2D.eventSheetAsset = ref(child); fixture.physicsState.world.entities = [entity]
  const runtime = new runtimeModule.GameplayRuntime(); runtime.active = true; runtime.scriptRuntime = new TrackedVm()
  await check('inherited handlers execute their actual author VM and keep independent properties', () => {
    logs.length = 0; runtime.compileAttachedScripts(); runtime.runEntityFunction(entity, 'start'); runtime.runEventSheetHandlers(entity, 'start', '', 'start')
    assert.deepEqual(logs.map(item => item[0]).sort(), [`${entity.name}: base:1`, `${entity.name}: base-start`, `${entity.name}: derived:101`, `${entity.name}: derived-start`].sort())
    assert.equal(entity.script2D.properties.count, 101)
    runtime.runEventSheetHandlers(entity, 'start', '', 'start'); assert.equal(entity.script2D.properties.count, 102)
    assert.ok(logs.some(item => item[0] === `${entity.name}: base:2`))
  })
  await check('active callbacks retain their compiled generation after an unqueued source edit', () => {
    update(derivedLogic, 'fn local() { log_info("UNQUEUED"); }'); logs.length = 0; runtime.runEntityFunction(entity, 'local')
    assert.ok(logs.some(item => item[0] === `${entity.name}: derived:103`)); assert.ok(logs.every(item => !item[0].includes('UNQUEUED')))
  })
  await check('disabled reload classification cannot be downgraded by changed export types', () => {
    const plan = reload.prepareHotReload('disabled', 'fn start() {}', 'fn start() {}', [{ name: 'x', valueType: 'int', serialized: true }], [{ name: 'x', valueType: 'float', serialized: true }], 'disabled')
    assert.equal(plan.classification, 'rejected')
  })
  await check('paused frame compiles the exact queued draft without advancing time', () => {
    const draft = '@export let count = 100;\nfn local() { count += 10; log_info("draft:" + count); }'
    runtime.queueHotReload(derivedLogic.uuid, draft); const frame = runtime.time.value.frame; runtime.frame(.1)
    assert.equal(runtime.time.value.frame, frame); logs.length = 0; runtime.runEntityFunction(entity, 'local')
    assert.ok(logs.some(item => item[0] === `${entity.name}: draft:113`)); assert.equal(db.readTextAsset(derivedLogic.uuid), 'fn local() { log_info("UNQUEUED"); }')
  })
  await check('invalid queued draft leaves the prior runnable generation intact', () => {
    runtime.queueHotReload(derivedLogic.uuid, 'fn local( {'); runtime.frame(.1); logs.length = 0; runtime.runEntityFunction(entity, 'local')
    assert.ok(logs.some(item => item[0] === `${entity.name}: draft:123`))
  })
  await check('project policy changed after queuing still prevents the frame-boundary swap',()=>{
    runtime.queueHotReload(derivedLogic.uuid,'@export let count=100;\nfn local(){count+=1000;log_info("forbidden:"+count);}');assert.equal(runtime.pendingReloads.has(derivedLogic.uuid),true)
    settings.scriptProjectSettings.hotReloadEnabled=false;runtime.frame(.1);logs.length=0;runtime.runEntityFunction(entity,'local')
    assert.ok(logs.some(item=>item[0]===`${entity.name}: draft:133`));assert.ok(logs.every(item=>!item[0].includes('forbidden:')));settings.scriptProjectSettings.hotReloadEnabled=true
  })
  await check('reloaded inherited author keeps its own state and cancels stale paused commands',()=>{
    runtime.pendingGraphExecution={entityUuid:entity.uuid,scriptUuid:baseLogic.uuid,sourcePath:baseLogic.path,functionName:'inherited',commands:[{type:'setPosition',x:99,y:0}],nextIndex:0}
    runtime.queueHotReload(baseLogic.uuid,'@export let count=0;\nfn inherited(){count+=10;log_info("base-draft:"+count);} fn start(){}');assert.equal(runtime.pendingReloads.has(baseLogic.uuid),true);runtime.frame(.1)
    assert.equal(runtime.pendingGraphExecution,null);logs.length=0;runtime.runEventSheetHandlers(entity,'start','','start');assert.ok(logs.some(item=>item[0]===`${entity.name}: base-draft:12`));assert.equal(entity.script2D.properties.count,143)
  })
  await check('one signal deduplicates event/connection callbacks while keeping distinct authors',()=>{
    const own=asset('signals.rhai','@export let count=0;\nfn on_signal(name,payload,source){count+=100;} fn signal_callback(){count+=1;log_info("signal:"+count);}'),parent=asset('signal-base.rhai','fn signal_callback(){log_info("signal-parent");}')
    const eventHandler={...handler('signal_callback'),kind:'signal',selector:'pulse',overrideInherited:false},parentSheet=sheet('signals-base.events',parent,[eventHandler]),ownSheet=sheet('signals.events',own,[eventHandler],parentSheet)
    own.script.signalConnections=[{enabled:true,signal:'pulse',source:'',target:'',callback:'signal_callback'},{enabled:true,signal:'pulse',source:'',target:'',callback:'signal_callback'},{enabled:true,signal:'pulse',source:'',target:'',callback:'on_signal'}]
    const target=new entityModule.BoxEntity(52,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(own);target.script2D.eventSheetAsset=ref(ownSheet);fixture.physicsState.world.entities=[target];runtime.compileAttachedScripts();logs.length=0;runtime.emitSignal('pulse',{},target.uuid,'test');runtime.dispatchSignals()
    assert.equal(target.script2D.properties.count,101,JSON.stringify(logs));assert.equal(logs.filter(item=>item[0]===`${target.name}: signal-parent`).length,1);assert.equal(logs.filter(item=>item[0]===`${target.name}: signal:101`).length,1)
    fixture.physicsState.world.entities=[entity]
  })

  await check('one UI action delivers event payload once, preserves direct callbacks and deduplicates connections',()=>{
    const own=asset('ui-event.rhai','@export let count=0;\nfn legacy(){count+=1;} fn on_signal(name,payload,source){if name!="ui.legacy" || payload.entity!=source || source==""{throw "missing UI signal data";}count+=100;} fn request_restart(name,payload,source){if name!="ui.legacy" || payload.entity!=source || source==""{throw "missing UI handler data";}count+=10;}')
    const parent=asset('ui-event-parent.rhai','fn request_restart(name,payload,source){if name!="ui.legacy" || source==""{throw "missing parent UI data";}log_info("UI_PARENT_ONCE");}')
    const event={...handler('request_restart'),kind:'ui',selector:'legacy',overrideInherited:false},baseSheet=sheet('ui-base.events',parent,[event]),ownSheet=sheet('ui.events',own,[event],baseSheet)
    own.script.signalConnections=[{enabled:true,signal:'ui.legacy',source:'',target:'',callback:'legacy'},{enabled:true,signal:'ui.legacy',source:'',target:'',callback:'request_restart'}]
    const target=new entityModule.BoxEntity(551,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(own);target.script2D.eventSheetAsset=ref(ownSheet)
    const uiRuntime=new runtimeModule.GameplayRuntime();uiRuntime.active=true;uiRuntime.scriptRuntime=new TrackedVm();fixture.physicsState.world.entities=[target];uiRuntime.compileAttachedScripts();logs.length=0
    try{uiRuntime.invokeUiCallback(target,' legacy ');assert.equal(target.script2D.properties.count,1,'Only the legacy callback should run immediately');uiRuntime.dispatchSignals();uiRuntime.dispatchSignals();assert.equal(target.script2D.properties.count,111,JSON.stringify(logs));assert.equal(logs.filter(item=>item[0]===target.name+': UI_PARENT_ONCE').length,1);assert.equal(uiRuntime.diagnostics.scriptErrors,0,JSON.stringify(logs))}finally{uiRuntime.stopSession();fixture.physicsState.world.entities=[entity]}
  })
  await check('UI handler sharing the button name receives signal arguments without a direct zero-argument invocation',()=>{
    const own=asset('ui-same-name.rhai','@export let count=0;\nfn restart(name,payload,source){if name!="ui.restart" || payload.entity!=source || source==""{throw "missing same-name UI data";}count+=1;}')
    const ownSheet=sheet('ui-same-name.events',own,[{...handler('restart'),kind:'ui',selector:'restart'}]),target=new entityModule.BoxEntity(552,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(own);target.script2D.eventSheetAsset=ref(ownSheet)
    const uiRuntime=new runtimeModule.GameplayRuntime();uiRuntime.active=true;uiRuntime.scriptRuntime=new TrackedVm();fixture.physicsState.world.entities=[target];uiRuntime.compileAttachedScripts();logs.length=0
    try{uiRuntime.invokeUiCallback(target,'restart');assert.equal(uiRuntime.diagnostics.scriptErrors,0,JSON.stringify(logs));assert.equal(target.script2D.properties.count??0,0);uiRuntime.dispatchSignals();assert.equal(target.script2D.properties.count,1,JSON.stringify(logs));assert.equal(uiRuntime.diagnostics.scriptErrors,0,JSON.stringify(logs))}finally{uiRuntime.stopSession();fixture.physicsState.world.entities=[entity]}
  })

  await check('event callback discovery ignores comments, strings and receiver-only methods',()=>{
    const source=asset('callback-discovery.rhai','// fn phantom(){}\nlet text="fn string_fake(){}"; fn real(){} fn int.receiver(){}'),document=events.defaultEventSheet('names',ref(source))
    assert.deepEqual([...events.callbackNamesInLogic(document)],['real'])
  })
  const sharedModule=asset('atomic-helper.rhai','fn increment(){1}'),rootA=asset('atomic-a.rhai','use "atomic-helper";\n@export let count=0;\nfn update(dt){count+=increment();}'),rootB=asset('atomic-b.rhai','use "atomic-helper";\n@export let count=100;\nfn update(dt){count+=increment();}\nfn collision(){0}')
  const atomicEntities=[rootA,rootB].map((code,index)=>{const target=new entityModule.BoxEntity(61+index,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(code);return target})
  const atomicRuntime=new runtimeModule.GameplayRuntime();atomicRuntime.active=true;atomicRuntime.scriptRuntime=new TrackedVm();fixture.physicsState.world.entities=atomicEntities;atomicRuntime.compileAttachedScripts();for(const target of atomicEntities)atomicRuntime.runEntityFunction(target,'update')
  await check('shared module reload swaps all affected roots and pins unqueued root edits',()=>{
    assert.deepEqual(atomicEntities.map(target=>target.script2D.properties.count),[1,101]);const oldVm=atomicRuntime.scriptRuntime
    update(rootA,'fn update(dt){throw "unqueued root";}');atomicRuntime.queueHotReload(sharedModule.uuid,'fn increment(){5}');assert.equal(atomicRuntime.pendingReloads.has(sharedModule.uuid),true);atomicRuntime.frame(.1)
    assert.notEqual(atomicRuntime.scriptRuntime,oldVm);for(const target of atomicEntities)atomicRuntime.runEntityFunction(target,'update');assert.deepEqual(atomicEntities.map(target=>target.script2D.properties.count),[6,106])
    assert.equal(db.readTextAsset(sharedModule.uuid),'fn increment(){1}')
  })
  await check('one dependent compile failure rejects the entire prepared VM and preserves every instance',()=>{
    const beforeVm=atomicRuntime.scriptRuntime,beforeSources=[...atomicRuntime.compiledSources],before=[allocations,frees]
    atomicRuntime.queueHotReload(sharedModule.uuid,'fn increment(){9}\nfn collision(){2}');assert.equal(atomicRuntime.pendingReloads.has(sharedModule.uuid),true);atomicRuntime.frame(.1)
    assert.equal(atomicRuntime.scriptRuntime,beforeVm);assert.deepEqual([...atomicRuntime.compiledSources],beforeSources);assert.deepEqual([allocations-before[0],frees-before[1]],[1,1])
    for(const target of atomicEntities)atomicRuntime.runEntityFunction(target,'update');assert.deepEqual(atomicEntities.map(target=>target.script2D.properties.count),[11,111])
  })
  await check('dependent-root rollback cannot consume history or claim a change when only imported module text changed',()=>{
    const before=reload.peekHotReloadRollback(rootB.uuid),vm=atomicRuntime.scriptRuntime;assert.ok(before);assert.equal(atomicRuntime.rollbackHotReload(rootB.uuid),false);assert.deepEqual(reload.peekHotReloadRollback(rootB.uuid),before);assert.equal(atomicRuntime.scriptRuntime,vm);assert.equal(atomicRuntime.pendingReloads.has(rootB.uuid),false)
  })
  await check('a dependent script opting out prevents indirect reload through a shared module',()=>{
    const beforeVm=atomicRuntime.scriptRuntime;rootB.script.reloadPolicy='disabled';atomicRuntime.queueHotReload(sharedModule.uuid,'fn increment(){50}');atomicRuntime.frame(.1);assert.equal(atomicRuntime.scriptRuntime,beforeVm)
    for(const target of atomicEntities)atomicRuntime.runEntityFunction(target,'update');assert.deepEqual(atomicEntities.map(target=>target.script2D.properties.count),[16,116]);rootB.script.reloadPolicy='preserve'
  })
  await check('rollback history is consumed only after a validated persisted candidate actually commits',()=>{
    const before=reload.peekHotReloadRollback(sharedModule.uuid);assert.ok(before);const originalPath=sharedModule.path;sharedModule.path='.nova/protected.rhai';assert.equal(atomicRuntime.rollbackHotReload(sharedModule.uuid),false);assert.deepEqual(reload.peekHotReloadRollback(sharedModule.uuid),before);sharedModule.path=originalPath
    assert.equal(atomicRuntime.rollbackHotReload(sharedModule.uuid),true);assert.equal(reload.scriptHotReloadState.history.find(item=>item.id===before.historyId).status,'committed');settings.scriptProjectSettings.hotReloadEnabled=false;atomicRuntime.frame(.1);settings.scriptProjectSettings.hotReloadEnabled=true
    assert.equal(reload.scriptHotReloadState.history.find(item=>item.id===before.historyId).status,'committed');assert.deepEqual(reload.peekHotReloadRollback(sharedModule.uuid),before)
    assert.equal(atomicRuntime.rollbackHotReload(sharedModule.uuid),true);atomicRuntime.frame(.1);assert.equal(reload.scriptHotReloadState.history.find(item=>item.id===before.historyId).status,'rolled-back')
    for(const target of atomicEntities)atomicRuntime.runEntityFunction(target,'update');assert.deepEqual(atomicEntities.map(target=>target.script2D.properties.count),[17,117])
  })
  atomicRuntime.scriptRuntime.free();atomicRuntime.scriptRuntime=null;fixture.physicsState.world.entities=[entity]
  runtime.scriptRuntime.free(); runtime.scriptRuntime = null
  const metadata = name => ({ name, line: 1, timeoutMs: 10000, skipped: false, tags: [], seed: 7, cases: [] })
  const suiteContext = { entity: 'fixture', randomSeed: 7, properties: {}, transform: { position: [0, 0], scale: [1, 1], rotation: 0 } }
  await check('actual VM suite hooks run once/per-case and failed test still tears down and frees', () => {
    const source = 'fn before_all(){log_info("all-before");} fn before_each(){log_info("before");} fn test_ok(){let xs=[1,2];let m=#{n:3};let f=|x|x+m.n;if f.call(xs[1])!=5 {throw "closure result";}} fn test_fail(){throw "deliberate";} fn after_each(){log_info("after");} fn after_all(){log_info("all-after");}'
    const order = [], before = [allocations, frees]
    const results = suites.executeScriptTestSuite({ scriptUuid: 'suite', scriptName: 'suite', source, functions: new Set(['before_all','before_each','test_ok','test_fail','after_each','after_all']), tests: [metadata('test_ok'),metadata('test_fail')], context: suiteContext, createVm: () => new TrackedVm(), parseExecution: JSON.parse, onExecution: (name, execution) => { order.push(name) } })
    assert.equal(results[0].passed, true, JSON.stringify(results)); assert.equal(results[1].passed, false)
    assert.deepEqual(order, ['before_all','before_each','test_ok','after_each','before_each','after_each','after_all'])
    assert.deepEqual([allocations - before[0], frees - before[1]], [1,1])
  })
  await check('compile failure frees its VM and skip-only suites allocate nothing', () => {
    const run = (source, tests) => suites.executeScriptTestSuite({ scriptUuid: 'failure', scriptName: 'failure', source, functions: new Set(['test_ok']), tests, context: suiteContext, createVm: () => new TrackedVm(), parseExecution: JSON.parse })
    const before = [allocations, frees]; assert.equal(run('fn broken( {', [metadata('test_ok')])[0].passed, false); assert.deepEqual([allocations - before[0], frees - before[1]], [1,1])
    run('fn test_ok(){}', [{ ...metadata('test_ok'), skipped: true }]); assert.deepEqual([allocations - before[0], frees - before[1]], [1,1])
  })
  await check('production test discovery executes a visual graph through the same suite runner', () => {
    const graph = sync.createGraphFromRhaiSource('fn test_visual(){ if 2+2!=4 { throw "arithmetic"; } }', 'Visual tests'), graphAsset = asset('tests.nova-graph', types.serializeGraphDocument(graph), 'visualScript')
    const results = new runtimeModule.GameplayRuntime().runScriptTests(graphAsset.uuid)
    assert.equal(results.length, 1); assert.equal(results[0].test, 'test_visual'); assert.equal(results[0].passed, true, JSON.stringify(results))
  })
  await check('composition resolves required dependencies and exclusions before any mutation', () => {
    const target = new entityModule.BoxEntity(2, { x: 0, y: 0 }, { x: 1, y: 1 }), before = target.components.map(item => item.kind)
    assert.throws(() => composition.planObjectComposition(target, ['TopDownController2D'], ['RigidBody2D']), /requires excluded/)
    assert.deepEqual(target.components.map(item => item.kind), before)
    const plan = composition.planObjectComposition(target, ['AreaEffector2D','Health2D'], ['ShapeRenderer2D'])
    assert.equal(target.hasComponent('Health2D'), false); composition.applyObjectComposition(target, plan)
    for (const kind of ['AreaEffector2D','Area2D','Health2D','BoxCollider2D']) assert.equal(target.hasComponent(kind), true)
    assert.equal(target.hasComponent('ShapeRenderer2D'), false)
  })
  await check('composition rejects conflicting controllers, removed transform and connection-only components', () => {
    const target = new entityModule.BoxEntity(3, { x: 0, y: 0 }, { x: 1, y: 1 })
    assert.throws(() => composition.planObjectComposition(target, ['TopDownController2D','PlatformController2D'], []), /conflicts/)
    assert.throws(() => composition.planObjectComposition(target, [], ['Transform2D']), /cannot exclude/)
    assert.throws(() => composition.planObjectComposition(target, ['Rope2D'], []), /scene connection/)
  })
  const prefab = asset('composition.prefab', '{}', 'prefab')
  const blueprint = (name, required, excluded = [], base = null) => asset(name, JSON.stringify({ ...blueprints.defaultObjectBlueprint(name), prefabAsset: ref(prefab), baseBlueprintAsset: base && ref(base), requiredComponents: required, excludedComponents: excluded, tags: ['enemy'] }), 'objectBlueprint')
  fixture.selectEntities = ids => { fixture.physicsState.selectedEntityIds = ids }
  fixture.capturePrefabOverrides = target => { target.prefabOverrides = { recorded: true }; return target.prefabOverrides }
  let createBatch = () => []
  fixture.instantiatePrefab = () => { const batch = createBatch(); fixture.physicsState.world.entities.push(...batch); return batch }
  const family = blueprint('family.object', ['Health2D']), derived = blueprint('enemy.object', ['TopDownController2D'], ['ShapeRenderer2D'], family)
  await check('unsaved blueprint validation detects cycles, composition conflicts and missing prefabs without writes', () => {
    const saved = blueprints.readObjectBlueprint(ref(family)), before = [...assets.values()].map(record => [record.uuid, record.source]), generation = db.assetState.generation
    assert.deepEqual(blueprints.validateObjectBlueprintDraft(family.uuid, saved), [])
    assert.ok(blueprints.validateObjectBlueprintDraft(family.uuid, { ...saved, baseBlueprintAsset: ref(derived) }).some(issue => issue.code === 'OBJECT-INHERIT-CYCLE'))
    assert.ok(blueprints.validateObjectBlueprintDraft(family.uuid, { ...saved, excludedComponents: ['Health2D'] }).some(issue => issue.code === 'OBJECT-COMPONENT-CONFLICT'))
    assert.ok(blueprints.validateObjectBlueprintDraft(family.uuid, { ...saved, prefabAsset: 'asset://' + crypto.randomUUID() }).some(issue => issue.code === 'OBJECT-PREFAB-MISSING'))
    assert.ok(blueprints.validateObjectBlueprintDraft(family.uuid, { ...saved, uuid: crypto.randomUUID() }).some(issue => issue.code === 'OBJECT-DRAFT-IDENTITY'))
    assert.deepEqual([...assets.values()].map(record => [record.uuid, record.source]), before); assert.equal(db.assetState.generation, generation)
    assert.deepEqual(blueprints.readObjectBlueprint(ref(family)), saved)
  })
  await check('blueprint inheritance applies composition to roots and preserves authored children', () => {
    const rootEntity = new entityModule.BoxEntity(4, { x: 0, y: 0 }, { x: 1, y: 1 }), childEntity = new entityModule.BoxEntity(5, { x: 0, y: 0 }, { x: 1, y: 1 }); childEntity.parentUuid = rootEntity.uuid
    createBatch = () => [rootEntity, childEntity]
    const result = blueprints.instantiateObjectBlueprint(ref(derived)); assert.equal(result.length, 2)
    for (const kind of ['Health2D','TopDownController2D','CharacterBody2D','RigidBody2D']) assert.equal(rootEntity.hasComponent(kind), true)
    assert.equal(rootEntity.hasComponent('ShapeRenderer2D'), false); assert.equal(childEntity.hasComponent('ShapeRenderer2D'), true); assert.equal(childEntity.hasComponent('Health2D'), false)
    assert.deepEqual(rootEntity.tags, ['enemy']); assert.deepEqual(childEntity.tags, [])
    assert.equal(rootEntity.script2D, null); assert.equal(rootEntity.objectBlueprintAsset, ref(derived)); assert.equal(childEntity.objectBlueprintAsset, null)
    const stored = physicsReal.readEntityAuthoringData(rootEntity), reopened = physicsReal.createEntityFromData(stored, 95)
    assert.equal(stored.objectBlueprintAsset, ref(derived)); assert.equal(reopened.objectBlueprintAsset, ref(derived)); assert.equal(reopened.script2D, null)
    assert.deepEqual(fixture.physicsState.selectedEntityIds, [rootEntity.id])
  })
  await check('blueprint identity migrates legacy Script2D and asset replacement visits live and stored static instances', () => {
    const target = new entityModule.BoxEntity(96, { x: 0, y: 0 }, { x: 1, y: 1 }); target.addComponent(new components.Script2D()); target.script2D.objectBlueprintAsset = ref(family)
    const legacy = physicsReal.readEntityAuthoringData(target); delete legacy.objectBlueprintAsset
    const migrated = physicsReal.createEntityFromData(legacy, 97); assert.equal(migrated.objectBlueprintAsset, ref(family))
    const detached = physicsReal.createEntityFromData({ ...legacy, objectBlueprintAsset: null }, 98); assert.equal(detached.script2D.objectBlueprintAsset, null)
    const staticEntity = new entityModule.BoxEntity(99, { x: 0, y: 0 }, { x: 1, y: 1 }), identity = crypto.randomUUID(), replacement = crypto.randomUUID()
    staticEntity.objectBlueprintAsset = 'asset://' + identity
    const previous = physicsReal.physicsState.world.entities.slice(), storedScene = physicsReal.sceneManager.create('Static blueprint identity')
    storedScene.data = { entities: [physicsReal.readEntityAuthoringData(staticEntity)], connections: [] }
    physicsReal.physicsState.world.entities.splice(0, previous.length, staticEntity)
    try {
      assert.equal(physicsReal.countAssetReferences(identity), 2); assert.equal(physicsReal.replaceAssetReferences(identity, replacement), 2)
      assert.equal(staticEntity.objectBlueprintAsset, 'asset://' + replacement); assert.equal(storedScene.data.entities[0].objectBlueprintAsset, 'asset://' + replacement)
      assert.equal(physicsReal.clearAssetReferences(replacement), 2); assert.equal(staticEntity.objectBlueprintAsset, null); assert.equal(storedScene.data.entities[0].objectBlueprintAsset, null)
    } finally { physicsReal.physicsState.world.entities.splice(0, physicsReal.physicsState.world.entities.length, ...previous) }
  })
  await check('blueprint failure removes only new entities/connections and preserves selection', () => {
    const before = [...fixture.physicsState.world.entities], selected = [...fixture.physicsState.selectedEntityIds], connection = { id: 55 }
    const invalid = blueprint('invalid.object', ['TopDownController2D'], ['RigidBody2D'])
    createBatch = () => [new entityModule.BoxEntity(6, { x: 0, y: 0 }, { x: 1, y: 1 })]
    assert.deepEqual(blueprints.instantiateObjectBlueprint(ref(invalid)), []); assert.deepEqual(fixture.physicsState.world.entities, before); assert.deepEqual(fixture.physicsState.selectedEntityIds, selected)
    fixture.instantiatePrefab = () => { fixture.physicsState.world.entities.push(...createBatch()); fixture.physicsState.world.connections.push(connection); throw Error('Late prefab failure') }
    assert.deepEqual(blueprints.instantiateObjectBlueprint(ref(derived)), []); assert.deepEqual(fixture.physicsState.world.entities, before); assert.ok(!fixture.physicsState.world.connections.includes(connection))
  })
  await check('cancel, replace, pause, entity cleanup and reset invalidate prepared timer dispatches', () => {
    const clock = new timeModule.RuntimeTime()
    clock.startTask('one','a',.1); clock.startTask('one','b',.1)
    const due = clock.beginFrame(.2,60,1); assert.equal(clock.consumeExpiration(due[0]),true)
    clock.cancelTask('one','b'); assert.equal(clock.consumeExpiration(due[1]),false)
    clock.start('one','repeat',.01,true); const repeated=clock.beginFrame(.1,60,1); assert.ok(repeated.length>1)
    clock.start('one','repeat',1,true); assert.ok(repeated.every(item=>!clock.consumeExpiration(item)))
    clock.start('one','pause',.01,true); const paused=clock.beginFrame(.1,60,1).filter(item=>item.name==='pause'); clock.pause('one','pause'); assert.ok(paused.every(item=>!clock.consumeExpiration(item)))
    clock.startTask('one','remove',.1); const removed=clock.beginFrame(.2,60,1); clock.removeEntity('one'); assert.ok(removed.every(item=>!clock.consumeExpiration(item)))
    clock.startTask('one','reset',.1); const reset=clock.beginFrame(.2,60,1); clock.reset(); assert.ok(reset.every(item=>!clock.consumeExpiration(item)))
  })
  await check('timer capacity, nonfinite requests and per-frame dispatch volume are bounded', () => {
    const clock=new timeModule.RuntimeTime(); assert.equal(clock.start('one','bad',Infinity,false),false)
    for(let i=0;i<timeModule.MAX_RUNTIME_TIMERS;i++) assert.equal(clock.start('one','t'+i,.001,true),true)
    assert.equal(clock.startTask('two','full',1),false); assert.equal(clock.start('one','t0',1,false),true)
    const due=clock.beginFrame(.25,60,1); assert.equal(due.length,timeModule.MAX_TIMER_EXPIRATIONS_PER_FRAME); assert.ok(due.every(item=>clock.consumeExpiration(item)))
    assert.ok(due.every(item=>!clock.consumeExpiration(item)))
  })
  await check('paused single-step dispatches timers/tasks and a callback can cancel another due task',()=>{
    const target=new entityModule.BoxEntity(71,{x:0,y:0},{x:1,y:1}),code=asset('step-timers.rhai','@export let count=0;\nfn on_timer(name){count+=1;} fn on_task(name){if name=="a"{task_cancel("b");count+=10;}else{count+=1000;}}')
    target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(code);fixture.physicsState.world.entities=[target];fixture.physicsState.camera={scale:1,offset:{x:0,y:0}};Object.assign(fixture.physicsState.world,{singleStep:()=>({}),stateChecksum:()=>'',events:[]})
    const running=new runtimeModule.GameplayRuntime();running.active=true;running.scriptRuntime=new TrackedVm();running.input.sample=()=>running.inputSnapshot;running.compileAttachedScripts()
    running.time.start(target.uuid,'tick',.001,false);running.time.startTask(target.uuid,'a',.001);running.time.startTask(target.uuid,'b',.001);running.stepOnce();assert.equal(target.script2D.properties.count,11);assert.equal(fixture.physicsState.playMode,'paused')
    running.stepOnce();assert.equal(target.script2D.properties.count,11);running.scriptRuntime.free()
  })
  await check('direct and pending handles reject retired and reused entity lifetimes', () => {
    const target=new entityModule.BoxEntity(31,{x:0,y:0},{x:1,y:1});fixture.physicsState.world.entities=[target]
    const first=lifetimes.beginEntityLifetime(target), handle={id:target.uuid,generation:first}, pendingId='pending:test:8:1', pending=new Map([[pendingId,{uuid:target.uuid,generation:first}]]), pendingHandle={id:pendingId,generation:dynamic.runtimeHandleGeneration(pendingId)}
    assert.equal(dynamic.resolveRuntimeHandle(handle,pending),target);assert.equal(dynamic.resolveRuntimeHandle(pendingHandle,pending),target)
    lifetimes.retireEntityLifetime(target);assert.equal(dynamic.resolveRuntimeHandle(handle,pending),null);assert.equal(dynamic.runtimeSceneEntitySnapshots([target]).length,0)
    const next=lifetimes.beginEntityLifetime(target);assert.notEqual(next,first);assert.equal(dynamic.resolveRuntimeHandle(handle,pending),null);assert.equal(dynamic.resolveRuntimeHandle(pendingHandle,pending),null)
    assert.equal(dynamic.resolveRuntimeHandle({id:target.uuid,generation:next},pending),target)
  })
  await check('pooled expiry uses simulation time, cleans before reset and gets a fresh lifetime', () => {
    pool.resetObjectPools();const owner=new entityModule.BoxEntity(41,{x:0,y:0},{x:1,y:1}), config=new components.ObjectPool2D();config.prefabAsset='asset://pooled';config.prewarm=1;config.capacity=1;config.maximumLifetime=.5;owner.addComponent(config)
    const reused=new entityModule.BoxEntity(42,{x:0,y:0},{x:1,y:1});fixture.physicsState.world.entities=[owner];fixture.instantiatePrefab=()=>{fixture.physicsState.world.entities.push(reused);return[reused]}
    let now=0;const calls=[];pool.setPoolRuntimeHooks({clock:()=>now,beforeRelease:entities=>{calls.push(entities[0].enabled);assert.equal(pool.releasePooled(entities[0]),false);assert.equal(pool.acquirePooled(config.prefabAsset,{x:99,y:0}),null)}})
    pool.prepareObjectPools();assert.equal(lifetimes.entityLifetimeActive(reused),false);assert.equal(pool.acquirePooled(config.prefabAsset,{x:2,y:0})[0],reused);const generation=lifetimes.entityLifetimeGeneration(reused)
    now=.49;pool.updateObjectPools();assert.equal(reused.enabled,true);now=.5;pool.updateObjectPools();assert.deepEqual(calls,[true]);assert.equal(reused.enabled,false);assert.equal(config.activeCount,0)
    assert.equal(pool.acquirePooled(config.prefabAsset,{x:4,y:0})[0],reused);assert.ok(lifetimes.entityLifetimeGeneration(reused)>generation);pool.releasePooled(reused);assert.equal(reused.transform.position.x,0)
    pool.acquirePooled(config.prefabAsset,{x:8,y:0});pool.setPoolRuntimeHooks({beforeRelease:()=>{throw Error('cleanup failure')}});assert.throws(()=>pool.releasePooled(reused),/cleanup failure/);assert.equal(lifetimes.entityLifetimeActive(reused),false);assert.equal(config.activeCount,0);assert.equal(pool.acquirePooled(config.prefabAsset,{x:0,y:0})[0],reused)
    pool.setPoolRuntimeHooks();pool.releasePooled(reused);pool.resetObjectPools()
  })

  await check('configured pool capacity refuses fallback allocation while unrelated prefabs and allowed expansion remain valid',()=>{
    pool.resetObjectPools();const owner=new entityModule.BoxEntity(580,{x:0,y:0},{x:1,y:1}),config=new components.ObjectPool2D();config.prefabAsset='asset://bounded-pool';config.prewarm=0;config.capacity=1;config.autoExpand=false;owner.addComponent(config);fixture.physicsState.world.entities=[owner];let made=0
    fixture.instantiatePrefab=()=>{const entity=new entityModule.BoxEntity(581+made++,{x:0,y:0},{x:1,y:1});fixture.physicsState.world.entities.push(entity);return[entity]};const transform={position:{x:0,y:0},rotation:0,scale:{x:1,y:1}}
    try{assert.equal(dynamic.spawnRuntimePrefab(config.prefabAsset,transform),null);assert.equal(made,0);assert.ok(dynamic.spawnRuntimePrefab('asset://unrelated-prefab',transform));assert.equal(made,1);config.autoExpand=true;assert.ok(dynamic.spawnRuntimePrefab(config.prefabAsset,transform));assert.equal(made,2);assert.equal(dynamic.spawnRuntimePrefab(config.prefabAsset,transform),null);assert.equal(made,2);config.capacity=2;assert.ok(dynamic.spawnRuntimePrefab(config.prefabAsset,transform));assert.equal(made,3)}finally{pool.resetObjectPools();fixture.physicsState.world.entities=[entity]}
  })

  if(useNative||stagedWasm) await check('staged actual bridge targets only the current runtime entity generation',()=>{
    const target=new entityModule.BoxEntity(51,{x:0,y:0},{x:1,y:1}), code=asset('lifetime.rhai','fn update(dt){let current=entity_handle();entity_set_position(current,2.0,0.0);}')
    target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(code);fixture.physicsState.world.entities=[target];lifetimes.beginEntityLifetime(target)
    const running=new runtimeModule.GameplayRuntime();running.active=true;running.scriptRuntime=new TrackedVm();running.compileAttachedScripts();running.runEntityFunction(target,'update');running.flushDynamicCommands();assert.equal(target.transform.position.x,2)
    running.runEntityFunction(target,'update');lifetimes.beginEntityLifetime(target);target.transform.position.x=0;running.flushDynamicCommands();assert.equal(target.transform.position.x,0);running.scriptRuntime.free()
  })
  await check('actual physics authoring snapshot is detached and never normalizes live values',()=>{
    const target=new entityModule.BoxEntity(301,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.properties={nested:{value:9}};target.mass=NaN
    const snapshot=physicsReal.readEntityAuthoringData(target);assert.equal(Number.isNaN(target.mass),true);snapshot.components.find(item=>item.kind==='Script2D').data.properties.nested.value=100;assert.equal(target.script2D.properties.nested.value,9)
  })


  await check('reactive world proxies preserve real pool identity and stale replacement objects cannot release a lease',async()=>{
    const {reactive}=await import('vue'),owner=new entityModule.BoxEntity(561,{x:0,y:0},{x:1,y:1}),config=new components.ObjectPool2D();config.prefabAsset='asset://reactive-pool';config.prewarm=1;config.capacity=1;owner.addComponent(config)
    fixture.physicsState.world.entities=reactive([owner]);let made=0;fixture.instantiatePrefab=()=>{const entity=new entityModule.BoxEntity(562+made++,{x:0,y:0},{x:1,y:1});fixture.physicsState.world.entities.push(entity);return[entity]}
    try{
      pool.prepareObjectPools();pool.prepareObjectPools();assert.equal(made,1,'Raw/proxy mismatch pruned a live pool instance')
      const first=pool.acquirePooled(config.prefabAsset,{x:1,y:0})[0],generation=lifetimes.entityLifetimeGeneration(first),proxy=fixture.physicsState.world.entities.find(entity=>entity.uuid===first.uuid)
      assert.notEqual(first,proxy,'Fixture must expose a real Vue proxy');pool.prepareObjectPools();assert.equal(pool.objectPoolDiagnostics()[0].active,1);assert.equal(pool.releasePooled(proxy),true)
      const next=pool.acquirePooled(config.prefabAsset,{x:2,y:0})[0];assert.equal(next,first);assert.ok(lifetimes.entityLifetimeGeneration(next)>generation);assert.equal(made,1);assert.equal(config.reusedCount,2)
      const stale=new entityModule.BoxEntity(first.id,{x:0,y:0},{x:1,y:1},first.uuid);assert.equal(pool.releasePooled(stale),false,'Same UUID replacement must not release original identity')
      fixture.physicsState.world.entities=[fixture.physicsState.world.entities[0],stale];pool.prepareObjectPools();assert.equal(made,2,'A genuinely removed raw entity must invalidate the old allocation')
    }finally{pool.resetObjectPools();pool.setPoolRuntimeHooks();fixture.physicsState.world.entities=[entity]}
  })

  await check('actual prefab comparison and conflict reads never mutate reactive scene or override identity',()=>{
    const entity=new entityModule.BoxEntity(1201,{x:0,y:0},{x:1,y:1}),source=physicsReal.readEntityAuthoringData(entity),record=asset('readonly-inspector.prefab',JSON.stringify({prefabVersion:2,name:'Inspector source',bundle:{entities:[source],rootUuids:[entity.uuid],connections:[]},variantOf:null,sourceChecksum:'',createdAt:'2026-01-01T00:00:00.000Z'}),'prefab')
    entity.prefabAsset=ref(record);entity.prefabSourceUuid=entity.uuid;entity.prefabInstanceUuid=crypto.randomUUID();entity.name='Local name';entity.mass=NaN
    const originalOverrides={sentinel:true};let overrideWrites=0;Object.defineProperty(entity,'prefabOverrides',{configurable:true,get:()=>originalOverrides,set:()=>{overrideWrites++}})
    const world=physicsReal.physicsState.world,previous=world.entities.slice(),connectionIdentity=world.connections,assetBytes=record.source;world.entities.splice(0,world.entities.length,entity)
    const snapshot=JSON.stringify(physicsReal.readEntityAuthoringData(entity)),selection=[...physicsReal.physicsState.selectedEntityIds]
    try{for(let iteration=0;iteration<25;iteration++){const comparison=prefabsReal.comparePrefabInstance(entity),conflicts=prefabsReal.prefabConflictReport(entity);assert.ok(comparison.some(item=>item.path==='name'&&item.value==='Local name'));assert.ok(conflicts.some(item=>item.code==='override'&&item.path==='name'))}
      assert.equal(overrideWrites,0);assert.equal(entity.prefabOverrides,originalOverrides);assert.equal(Number.isNaN(entity.mass),true);assert.equal(JSON.stringify(physicsReal.readEntityAuthoringData(entity)),snapshot);assert.equal(world.connections,connectionIdentity);assert.deepEqual(physicsReal.physicsState.selectedEntityIds,selection);assert.equal(record.source,assetBytes)
    }finally{world.entities.splice(0,world.entities.length,...previous)}
  })

  const realWorld=physicsReal.physicsState.world,realScenes=physicsReal.sceneManager
  const previousWorld=fixture.physicsState.world;fixture.physicsState.world=realWorld
  const outgoing=new entityModule.BoxEntity(401,{x:10,y:0},{x:1,y:1}),persistent=new entityModule.BoxEntity(402,{x:2,y:0},{x:1,y:1}),persistentChild=new entityModule.BoxEntity(403,{x:1,y:0},{x:1,y:1})
  persistent.persistentAcrossScenes=true;persistent.parentUuid=outgoing.uuid;persistentChild.parentUuid=persistent.uuid
  const outgoingCode=asset('scene-outgoing.rhai','@export let destroyed=0;\nfn on_destroy(){destroyed+=1;log_info("outgoing-destroy");}\nfn on_task(name){log_info("retained-task");}')
  outgoing.addComponent(new components.Script2D());outgoing.script2D.scriptAsset=ref(outgoingCode)
  realWorld.entities.splice(0,realWorld.entities.length,outgoing,persistent,persistentChild);realWorld.connections.splice(0);realWorld.setNextId(500)
  const incoming=new entityModule.BoxEntity(1,{x:0,y:0},{x:1,y:1}),incomingCode=asset('scene-incoming.rhai','fn awake(){log_info("incoming-awake");} fn start(){log_info("incoming-start");}')
  incoming.addComponent(new components.Script2D());incoming.script2D.scriptAsset=ref(incomingCode)
  const destination=realScenes.create('Transaction destination');destination.data={entities:[{id:1,...physicsReal.readEntityAuthoringData(incoming)}],connections:[],layers:[1],activeLayer:1,renderLayer:'all'}
  fixture.prepareScene=identifier=>physicsReal.prepareRuntimeSceneTransition(identifier)
  await check('actual scene adapter rejects malformed and stale targets without changing the live world or active scene',()=>{
    const before=realWorld.entities.slice(),active=realScenes.activeSceneUuid,invalid=realScenes.create('Malformed');invalid.data={entities:[null]}
    assert.throws(()=>physicsReal.prepareRuntimeSceneTransition(invalid.uuid),/must be objects/);assert.deepEqual(realWorld.entities,before);assert.equal(realScenes.activeSceneUuid,active)
    const prepared=physicsReal.prepareRuntimeSceneTransition(destination.uuid);destination.data.layers=[1,2];assert.equal(prepared.commit(),false);assert.match(prepared.error,/changed/);assert.deepEqual(realWorld.entities,before);assert.equal(realScenes.activeSceneUuid,active)
  })
  await check('actual scene adapter rolls back a late scene-manager failure including world identity and navigation',()=>{
    const before=realWorld.entities.slice(),active=realScenes.activeSceneUuid,history=realScenes.navigationHistory.slice(),original=realScenes.setActive
    realScenes.setActive=function(uuid){original.call(this,uuid);throw Error('Injected host installation failure')}
    try{const prepared=physicsReal.prepareRuntimeSceneTransition(destination.uuid);assert.equal(prepared.commit(),false);assert.match(prepared.error,/Injected host/);assert.deepEqual(realWorld.entities,before);assert.equal(realWorld.entities[0],before[0]);assert.equal(realScenes.activeSceneUuid,active);assert.deepEqual(realScenes.navigationHistory,history);assert.equal(persistent.parentUuid,outgoing.uuid);assert.equal(persistent.transform.position.x,2)}finally{realScenes.setActive=original}
  })
  const switching=new runtimeModule.GameplayRuntime();switching.active=true;switching.scriptRuntime=new TrackedVm();switching.compileAttachedScripts();switching.ensureLifecycle();switching.time.startTask(outgoing.uuid,'waiting',1)
  await check('failed runtime scene preparation or commit leaves callbacks, timers and instances live',()=>{
    logs.length=0;switching.pendingScene={type:'load',identifier:'missing-scene'};switching.flushStructuralCommands();assert.equal(switching.time.inspect(outgoing.uuid).length,1);assert.equal(outgoing.script2D.properties.destroyed,undefined);assert.ok(realWorld.entities.includes(outgoing));assert.ok(!logs.some(item=>item[0].includes('outgoing-destroy')))
    const original=realScenes.setActive;realScenes.setActive=()=>{throw Error('Rejected host transition')};try{switching.pendingScene={type:'load',identifier:destination.uuid};switching.flushStructuralCommands();assert.equal(switching.time.inspect(outgoing.uuid).length,1);assert.ok(realWorld.entities.includes(outgoing));assert.ok(!logs.some(item=>item[0].includes('outgoing-destroy')))}finally{realScenes.setActive=original}
  })
  await check('successful scene commit preserves persistent identities/descendants and orders destruction before new lifecycle',()=>{
    const generation=lifetimes.entityLifetimeGeneration(persistent);logs.length=0;switching.pendingScene={type:'load',identifier:destination.uuid};switching.flushStructuralCommands()
    assert.equal(realScenes.activeSceneUuid,destination.uuid);assert.ok(!realWorld.entities.includes(outgoing));assert.ok(realWorld.entities.includes(persistent));assert.ok(realWorld.entities.includes(persistentChild));assert.equal(lifetimes.entityLifetimeGeneration(persistent),generation);assert.equal(persistent.parentUuid,null);assert.equal(persistent.transform.position.x,12)
    assert.equal(outgoing.script2D.properties.destroyed,1);assert.equal(switching.time.inspect(outgoing.uuid).length,0);assert.equal(lifetimes.entityLifetimeActive(outgoing),false)
    const order=logs.map(item=>item[0]).filter(message=>/outgoing-destroy|incoming-awake|incoming-start/.test(message));assert.deepEqual(order.map(message=>message.split(': ').at(-1)),['outgoing-destroy','incoming-awake','incoming-start'])
  })
  switching.scriptRuntime.free();switching.scriptRuntime=null;fixture.physicsState.world=previousWorld
  await check('destroy/task Event Sheets use actual inherited authors and teardown never leaves debugger commands suspended',()=>{
    const parentLogic=asset('destroy-base.rhai','fn cleanup(){log_info("base-cleanup");} fn task_done(name){log_info("base-task:"+name);}'),localLogic=asset('destroy-child.rhai','fn on_destroy(){log_info("primary-cleanup");} fn on_task(name){log_info("primary-task:"+name);}')
    const parent=sheet('destroy-base.events',parentLogic,[{...events.defaultEventHandler('destroy'),callback:'cleanup'},{...events.defaultEventHandler('task'),callback:'task_done',selector:'done'}]),child=sheet('destroy-child.events',localLogic,[events.defaultEventHandler('destroy')],parent)
    const target=new entityModule.BoxEntity(501,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(localLogic);target.script2D.eventSheetAsset=ref(child);fixture.physicsState.world.entities=[target]
    const running=new runtimeModule.GameplayRuntime();running.active=true;running.scriptRuntime=new TrackedVm();running.compileAttachedScripts();running.ensureLifecycle();logs.length=0
    running.time.startTask(target.uuid,'done',.01);running.dispatchTimerExpirations(running.time.beginFrame(.1,60,1));assert.ok(logs.some(item=>item[0].endsWith('base-task:done')));assert.ok(logs.some(item=>item[0].endsWith('primary-task:done')))
    running.queueEntityRemoval(target,false);running.flushEntityCommands();assert.equal(logs.filter(item=>item[0].endsWith('base-cleanup')).length,1);assert.equal(logs.filter(item=>item[0].endsWith('primary-cleanup')).length,1);assert.equal(running.pendingDebugInvocation,null);assert.equal(running.pendingGraphExecution,null);running.scriptRuntime.free()
  })
  await check('runtime inspector keeps authored properties distinct and returns detached state without allocating a VM or generation',()=>{
    const code=asset('inspect.rhai','@export let count=0;\nfn update(dt){count+=1;}'),target=new entityModule.BoxEntity(601,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(code);target.script2D.properties={count:20};fixture.physicsState.world.entities=[target]
    const running=new runtimeModule.GameplayRuntime();running.active=true;const before=allocations;assert.equal(lifetimes.inspectEntityLifetimeGeneration(target),null);assert.equal(running.inspectObjectRuntime(target.uuid).generation,null);assert.equal(lifetimes.inspectEntityLifetimeGeneration(target),null);assert.equal(allocations,before)
    running.scriptRuntime=new TrackedVm();running.compileAttachedScripts();running.ensureLifecycle();running.runEntityFunction(target,'update');running.time.startTask(target.uuid,'probe',1)
    const inspected=running.inspectObjectRuntime(target.uuid);assert.equal(inspected.behaviors[0].authoredProperties.count,20);assert.equal(inspected.behaviors[0].properties.count,21);inspected.behaviors[0].properties.count=99;inspected.timers[0].remaining=0;assert.equal(target.script2D.properties.count,21);assert.equal(running.time.inspect(target.uuid)[0].remaining,1);running.scriptRuntime.free()
  })
  await check('nested awake spawns survive successive structural boundaries and each lifecycle executes once',()=>{
    pool.resetObjectPools();const codes=new Map([['parent',asset('nested-parent.rhai','fn awake(){log_info("parent-awake");spawn_at("child",0.0,0.0,0.0,1.0,1.0);} fn start(){log_info("parent-start");}')],['child',asset('nested-child.rhai','fn awake(){log_info("child-awake");spawn_at("grandchild",0.0,0.0,0.0,1.0,1.0);} fn start(){log_info("child-start");}')],['grandchild',asset('nested-grandchild.rhai','fn awake(){log_info("grandchild-awake");} fn start(){log_info("grandchild-start");}')]])
    let next=700;const make=name=>{const value=new entityModule.BoxEntity(++next,{x:0,y:0},{x:1,y:1});value.addComponent(new components.Script2D());value.script2D.scriptAsset=ref(codes.get(name));return value}
    const parent=make('parent');fixture.physicsState.world.entities=[parent];fixture.instantiatePrefab=name=>{const value=make(name);fixture.physicsState.world.entities.push(value);return[value]}
    const running=new runtimeModule.GameplayRuntime();running.active=true;running.scriptRuntime=new TrackedVm();running.compileAttachedScripts();logs.length=0;running.ensureLifecycle();assert.equal(running.pendingDynamicCommands.length,1)
    running.flushEntityCommands();assert.equal(fixture.physicsState.world.entities.length,2);assert.equal(running.pendingDynamicCommands.length,1)
    running.flushEntityCommands();running.flushEntityCommands();assert.equal(fixture.physicsState.world.entities.length,3);assert.equal(running.pendingDynamicCommands.length,0)
    assert.deepEqual(logs.map(item=>item[0].split(': ').at(-1)),['parent-awake','parent-start','child-awake','child-start','grandchild-awake','grandchild-start']);running.scriptRuntime.free()
  })
  await check('deferred source commands and queued destruction cannot affect a later reused lifetime',()=>{
    const source=new entityModule.BoxEntity(801,{x:0,y:0},{x:1,y:1}),target=new entityModule.BoxEntity(802,{x:0,y:0},{x:1,y:1});fixture.physicsState.world.entities=[source,target];lifetimes.beginEntityLifetime(source);const targetGeneration=lifetimes.beginEntityLifetime(target)
    const running=new runtimeModule.GameplayRuntime();running.applyCommand(source,{type:'targetSetPosition',target:target.uuid,generation:targetGeneration,x:99,y:0});running.applyCommand(source,{type:'instantiate',prefab:'never'})
    let created=0;fixture.instantiatePrefab=()=>{created++;return[]};lifetimes.beginEntityLifetime(source);running.flushEntityCommands();assert.equal(target.transform.position.x,0);assert.equal(created,0)
    running.queueEntityRemoval(target,true);running.queueEntityRemoval(target,false);lifetimes.beginEntityLifetime(target);running.flushEntityCommands();assert.ok(fixture.physicsState.world.entities.includes(target));assert.equal(lifetimes.entityLifetimeActive(target),true)
  })
  await check('stopping a session destroys once, cancels timers/signals/deferred work and frees its VM',()=>{
    const code=asset('stop-cleanup.rhai','fn on_destroy(){log_info("stopped-cleanup");spawn_at("discard",0.0,0.0,0.0,1.0,1.0);task_wait("discard",1.0);}'),target=new entityModule.BoxEntity(901,{x:0,y:0},{x:1,y:1});target.addComponent(new components.Script2D());target.script2D.scriptAsset=ref(code);fixture.physicsState.world.entities=[target]
    const running=new runtimeModule.GameplayRuntime();running.active=true;running.scriptRuntime=new TrackedVm();running.compileAttachedScripts();running.ensureLifecycle();running.time.startTask(target.uuid,'pending',1);running.emitSignal('pending',null,target.uuid,'test');logs.length=0;const freed=frees
    running.stopSession(false);running.stopSession(false);assert.equal(logs.filter(item=>item[0].endsWith('stopped-cleanup')).length,1);assert.equal(running.isActive,false);assert.equal(running.scriptRuntime,null);assert.equal(frees,freed+1);assert.equal(running.pendingDynamicCommands.length,0);assert.equal(running.pendingSignals.length,0);assert.equal(running.time.inspect(target.uuid).length,0);assert.equal(lifetimes.entityLifetimeActive(target),false)
  })
  await check('inherited-only Event Sheets attach atomically and imported callbacks validate through the production resolver',()=>{
    asset('event-module.rhai','fn imported_callback(){log_info("module-callback");}')
    const logic=asset('event-import-root.rhai','use "event-module.rhai";\nfn start(){}'),base=sheet('event-inherit-base.events',logic,[handler('imported_callback')]),child=sheet('event-inherit-only.events',null,[],base)
    const document=events.parseEventSheet(decodeURIComponent(child.source.split(',')[1]));assert.equal(events.validateEventSheet(document).some(item=>item.severity==='error'),false);assert.equal(events.callbackNamesInLogic(document).has('imported_callback'),true)
    const target=new entityModule.BoxEntity(1001,{x:0,y:0},{x:1,y:1});assert.ok(events.attachEventSheet(target,ref(child)));assert.equal(target.script2D.scriptAsset,ref(logic));assert.equal(events.resolveEventHandlers(ref(child))[0].logicAsset,ref(logic))
    const invalid=sheet('invalid-local.events',{uuid:'missing'},[],base),empty=new entityModule.BoxEntity(1002,{x:0,y:0},{x:1,y:1});assert.equal(events.attachEventSheet(empty,ref(invalid)),null);assert.equal(empty.script2D,null)
    update(logic,'use "missing-module.rhai";\nfn start(){}');assert.ok(events.validateEventSheet(document).some(item=>item.code==='EVENT-LOGIC-SOURCE'))
  })
} catch (error) {
  checks.push({ name: 'stage harness execution', status: 'failed', error: error.stack }); process.exitCode = 1
  console.error(error)
} finally {
  delete globalThis.__novaRuntime14
  await mkdir(reportDir, { recursive: true })
  const report = { format:'nova-v26.14-runtime-verification',version:1,...paths.metadata,status: !checks.length || checks.some(item => item.status === 'failed') ? 'failed' : 'passed', generatedAt: new Date().toISOString(), runtimeBackend: (integrated ? 'integrated-' : 'isolated-') + (useNative ? 'native-Rhai' : stagedWasm ? 'staged-WASM' : 'workspace-WASM'), scope: (integrated ? 'Integrated source programmer fixture: ' : 'Isolated 26.14 source overlay: ') + 'real Rhai execution, production asset records, event resolution, compiler, command processing, physics scene adapter and test runner. Render/audio/network hosts and prefab factory/project history boundary are controlled fixtures; scene decoding/rollback use real World/SceneManager/store functions, including an explicit injected installation failure. Native bridge validates and executes through real Rust; its JavaScript source cache is a test adapter, with native AST cache atomicity tested separately in Rust. This report describes executed fixtures only; it is not a global release-readiness claim.', checks, vmAllocations: allocations, vmFrees: frees }
  await writeFile(join(reportDir, integrated ? `v26.14-runtime-${useNative?'native':'wasm'}.json` : `runtime-${useNative ? 'native' : stagedWasm ? 'staged-wasm' : 'wasm'}-verification.json`), JSON.stringify(report, null, 2) + '\n')
  if(!integrated) await writeFile(join(reportDir, 'runtime-verification.json'), JSON.stringify(report, null, 2) + '\n')
}
if (checks.some(item => item.status === 'failed')) process.exitCode = 1
