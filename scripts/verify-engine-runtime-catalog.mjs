/** Paired prepared-resource reads and actual Editor/Core/Rhai adoption. Functional evidence only. */
import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir, mkdtemp } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createHash, webcrypto } from 'node:crypto'
import { build } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), before = process.argv.includes('--before'), mode = before ? 'before' : 'after'
const arg = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3)
const base = join(root, arg('baseline') ?? '.cache/engine-overhaul/player-runtime-catalog-preparation/prepared-95da-uNi9mt')
const cache = join(root, '.cache/engine-overhaul/runtime-catalog'), sha = bytes => createHash('sha256').update(bytes).digest('hex'), norm = value => value.replaceAll('\\', '/')
const copy = value => JSON.parse(JSON.stringify(value)), driver = await readFile(fileURLToPath(import.meta.url))
const baselineBytes = await readFile(join(base, 'source.json')), baseline = JSON.parse(baselineBytes)
assert.equal(sha(baselineBytes), '4fe893151931019c35943cee17e34987f3bcd1dfddf21a2fc92f1372e40df971')
assert.equal(baseline.files.length, 597); assert.deepEqual(baseline.overrides, [])
await mkdir(cache, { recursive: true }); const output = await mkdtemp(join(cache, `${mode}-`)), frozen = new Map(), sourceHashes = {}, checks = [], additional = [], runtimes = [], cleanup = { runtimes: [], wasm: [] }
await writeFile(join(output, 'verifier.mjs'), driver, { flag: 'wx' })
let api, rootWorld, failure = null, finished = false, pureEvidence = null, wasmSha256 = null
for (const file of baseline.files) {
  const oldBytes = await readFile(join(base, file.snapshotPath)); assert.equal(sha(oldBytes), file.sha256)
  if (file.path.startsWith('src/') || file.path.startsWith('nova_core/pkg/')) frozen.set(norm(join(root, file.path)), before ? oldBytes : await readFile(join(root, file.path)))
}
if (!before) for (const file of ['src/runtime/runtimeAssetValues.ts', 'src/runtime/runtimeProjectCatalog.ts']) frozen.set(norm(join(root, file)), await readFile(join(root, file)))
const afterHashes = new Map([...frozen].map(([file, bytes]) => [file, sha(bytes)]))
const paired = arg('compare') ? JSON.parse(await readFile(join(root, arg('compare')), 'utf8')) : null
if (!before) { assert(paired, '--compare must name the successful before report'); assert.equal(paired.driverSha256, sha(driver)); assert.equal(paired.checks.length, 7); assert(paired.checks.every(check => check.status === 'PASSED')) }
const summarize = text => text === null ? null : { utf16Length: text.length, utf8Sha256: sha(Buffer.from(text, 'utf8')) }
const capture = operation => { try { return { value: operation(), error: null } } catch (error) { return { value: null, error: error.message } } }
const check = async (id, operation) => { try { const value = await operation(); if (paired) assert.deepEqual(value, paired.checks.find(item => item.id === id).value, `Paired ${id} output differs`); checks.push({ id, status: 'PASSED', value }) } catch (error) { checks.push({ id, status: 'FAILED', error: error.stack ?? String(error) }) } finally { for (const runtime of runtimes) { try { runtime.stopSession(false) } catch {} } await Promise.resolve(); await Promise.resolve() } }
const extra = async (id, operation) => { if (before) return; try { additional.push({ id, status: 'PASSED', value: await operation() }) } catch (error) { additional.push({ id, status: 'FAILED', error: error.stack ?? String(error) }) } }
if (!globalThis.crypto) globalThis.crypto = webcrypto
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { getGamepads: () => [], maxTouchPoints: 0, platform: 'Win32' } })
for (const name of ['HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'HTMLSelectElement']) if (!(name in globalThis)) globalThis[name] = class {}
try {
  const entries = {
    'src/runtime/GameplayRuntime.ts': 'GameplayRuntime,GameplayRuntimeCore',
    'src/editor/gameplayWorldHost.ts': 'createEditorGameplayWorldHost',
    'src/editor/gameplayScriptServices.ts': 'createEditorGameplayScriptServices',
    'src/assets/AssetDatabase.ts': 'assetState,resolveAsset,assetGuid,readTextAsset,updateTextAsset,assetReference',
    'src/assets/types.ts': 'defaultScriptMetadata',
    'src/assets/assetReferences.ts': 'assetSourceText,ASSET_REFERENCE_LIMITS',
    'src/runtime/resources.ts': 'readResourceFromAssets,resolveResourceFromAssets,serializeResource',
    'src/runtime/scriptModules.ts': 'resolveProjectScriptBundle',
    'src/runtime/scriptSettings.ts': 'scriptProjectSettings', 'src/runtime/scriptDebug.ts': 'scriptDebugState',
    'src/store/physics.ts': 'physicsState',
    'src/world/BoxEntity.ts': 'BoxEntity', 'src/world/components.ts': 'Script2D',
    'src/visual/graphCompiler.ts': 'executableGraphSource', 'src/visual/graphSyntax.ts': 'projectRhaiSyntax',
    'nova_core/pkg/nova_core.js': 'default as initWasm,WasmRuntimeWorld'
  }
  if (!before) entries['src/runtime/runtimeProjectCatalog.ts'] = 'RuntimeProjectCatalog'
  const entry = join(output, 'entry.ts'); await writeFile(entry, Object.entries(entries).map(([file, names]) => `export {${names}} from '${norm(join(root, file))}';`).join('\n') + '\nexport {toRaw,isReactive} from "vue";\n', { flag: 'wx' })
  const cohortPlugin = { name: 'runtime-catalog-immutable-cohort', enforce: 'pre', async load(id) {
    const file = norm(id.split('?')[0]); if (!file.startsWith(norm(root) + '/src/') && !file.startsWith(norm(root) + '/nova_core/pkg/')) return
    const bytes = frozen.get(file), key = norm(relative(root, file)); if (!bytes) throw Error(`Import absent from immutable ${mode} catalog closure: ${key}`)
    if (!sourceHashes[key]) { const target = join(output, 'source', key); await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes, { flag: 'wx' }); sourceHashes[key] = { sha256: sha(bytes), matches95da: sha(bytes) === baseline.files.find(item => item.path === key)?.sha256 } }
    return bytes.toString('utf8')
  } }
  await build({ configFile: false, root, logLevel: 'error', ssr: { noExternal: true }, plugins: [cohortPlugin], build: { ssr: true, outDir: output, emptyOutDir: false, rollupOptions: { input: entry, output: { entryFileNames: 'integration.mjs', inlineDynamicImports: true } } } })
  api = await import(pathToFileURL(join(output, 'integration.mjs')).href)
  const wasm = await readFile(join(base, 'before/nova_core/pkg/nova_core_bg.wasm')); wasmSha256 = sha(wasm); assert.equal(wasmSha256, baseline.files.find(file => file.path.endsWith('_bg.wasm')).sha256)
  await api.initWasm({ module_or_path: wasm })
  globalThis.window = Object.assign(new EventTarget(), { performance: globalThis.performance })
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, activeElement: null, documentElement: { dataset: {}, style: { setProperty() {} } } })
  globalThis.CustomEvent = class extends Event { constructor(name, options) { super(name); this.detail = options?.detail } }
  api.scriptProjectSettings.debuggerEnabled = false; api.scriptProjectSettings.testing.coverageEnabled = false; api.scriptProjectSettings.hotReloadEnabled = true
  rootWorld = api.physicsState.world; rootWorld.runtime = new api.WasmRuntimeWorld(); rootWorld.wasmLoaded = true
  Object.assign(api.physicsState.globalSettings, { gravity: 0, airFriction: 0, timeScale: 1, tickRate: 60, maxCatchUpSteps: 8 }); api.physicsState.playMode = 'playing'
  const fixture = JSON.parse(await readFile(join(base, 'fixture-v1.json'), 'utf8')), uuid = n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  const record = (name, type, source, number = 100) => ({ uuid: uuid(number), name, path: `Assets/Scripts/${name}`, assetType: type, mimeType: type === 'script' ? 'text/x-rhai' : 'application/json', source, ...(type === 'script' ? { script: api.defaultScriptMetadata() } : {}) })
  const setRecords = records => { api.assetState.records.splice(0, api.assetState.records.length, ...copy(records)); api.assetState.generation++; return api.assetState.records }
  const view = value => value ? { uuid: value.uuid, name: value.name, path: value.path, assetType: value.assetType, source: value.source } : null
  const catalog = (records, revision = api.assetState.generation, projectId = 'prepared-project') => before ? null : new api.RuntimeProjectCatalog(copy(records), { revision, projectId })
  const core = (services, reference, id = 8000) => {
    rootWorld.entities.splice(0); rootWorld.connections.splice(0); rootWorld.invalidateRuntime()
    const entity = new api.BoxEntity(id, { x: 0, y: 10 }, { x: 1, y: 1 }, uuid(id)); entity.isStatic = true; entity.addComponent(new api.Script2D()).scriptAsset = reference; rootWorld.entities.push(entity)
    const runtime = new api.GameplayRuntimeCore(services, api.createEditorGameplayWorldHost()); runtimes.push(runtime); runtime.beginSession(); return { runtime, entity }
  }
  const execute = (services, reference, expected) => { const { runtime, entity } = core(services, reference); runtime.stepOnce(); assert.equal(entity.script2D.lastError, null); assert.equal(entity.script2D.properties.total, expected); const native = Array.from(rootWorld.runtime.state_view()); assert.equal(rootWorld.runtime.state_len(), 56); runtime.stopSession(false); return { total: entity.script2D.properties.total, error: entity.script2D.lastError, nativeLength: native.length, inputDetached: !runtime.input.attached, vmReleased: runtime.scriptRuntime === null } }

  await check('R01', () => {
    const A = record('z.rhai', 'script', 'Z', 1), B = { ...record('a.rhai', 'script', 'A', 1) }, C = { ...record('Case.rhai', 'script', 'C', 2), uuid: 'ABCDEFAB-0000-4000-8000-000000000003' }, shadow = { ...record('shadow.png', 'image', 'binary', 5), uuid: 'Assets/Scripts/Case.rhai' }
    const records = setRecords([A, B, C, shadow]), services = api.createEditorGameplayScriptServices(), snapshot = catalog(records), references = [null, undefined, '', A.uuid, `asset://${A.uuid}`, C.uuid, C.uuid.toLowerCase(), `ASSET://${A.uuid}`, ` ${A.uuid}`, 'asset://']
    const values = references.map(reference => { const result = api.resolveAsset(reference); if (snapshot) assert.deepEqual(view(snapshot.resolveAsset(reference)), view(result)); return view(result) })
    assert.equal(api.resolveAsset(A.uuid).source, 'Z'); assert.equal(api.resolveAsset(A.uuid), records[0]); assert.equal(api.resolveAsset(C.uuid.toLowerCase()), null); assert.equal(services.resolveModuleAsset(C.path), null)
    const modules = [C.path, 'Assets/Scripts/a.rhai', C.uuid, `asset://${A.uuid}`].map(reference => { const result = services.resolveModuleAsset(reference); if (snapshot) assert.deepEqual(snapshot.resolveModuleAsset(reference), result); return result })
    return { values, modules, liveIdentity: api.resolveAsset(A.uuid) === records[0], listedLive: services.listIdentities() === api.assetState.records }
  })
  await check('R02', () => {
    const cases = ['Nova_A 文本 café', '', 'data:text/plain', 'data:text/plain,' + encodeURIComponent('Nova_A 文本 café'), 'data:text/plain,%zz', 'data:text/plain;base64,' + Buffer.from('Nova_A 文本 café').toString('base64'), 'data:text/plain;base64,/w==', 'data:text/plain;base64,@@', 'data:text/plain;base64,77u/YQ==']
    const types = ['script','visualScript','eventSheet','objectBlueprint','prefab','scene','material','animation','controller','animationMask','rig','skin','timeline','tileset','atlas','shader','localization','uiTheme','behaviorTree','stateMachine','tilePalette','brushPreset','terrainRules','dataSchema','dataTable','replay','path','particleSystem','resource','other','image','audio','font']
    const inputs = cases.map((source, i) => record(`encoding-${i}.rhai`, 'script', source, 200+i)).concat(types.map((type, i) => record(`type-${i}`, type, 'type-source', 300+i)))
    const records = setRecords(inputs), snapshot = catalog(records), values = records.map(asset => { const source = api.readTextAsset(asset.uuid); if (snapshot) assert.equal(snapshot.readSource(asset.uuid), source); return { type: asset.assetType, source } })
    assert.equal(values[1].source, null); assert.equal(values[4].source, null); assert.equal(values[6].source, '\ufffd'); assert.equal(values[8].source, 'a'); assert.equal(values.find(item => item.type === 'other').source, null)
    return values
  })
  await check('R03', () => {
    const limit = api.ASSET_REFERENCE_LIMITS.textBytes, inputs = [record('raw', 'other', 'Nova_A 文本 café', 401), record('bad-utf8', 'other', 'data:text/plain;base64,/w==', 402), record('bad-percent', 'other', 'data:text/plain,%zz', 403), ...['image','audio','font'].map((type, i) => record(type, type, 'raw', 410+i)), record('at-limit', 'other', 'a'.repeat(limit), 420), record('over-limit', 'other', 'a'.repeat(limit+1), 421)]
    const records = setRecords(inputs), snapshot = catalog(records), values = records.map(asset => { const result = capture(() => summarize(api.assetSourceText(asset))); if (snapshot) assert.deepEqual(capture(() => summarize(snapshot.readDependencyText(asset.uuid))), result); return result })
    assert.equal(values[1].value, null); assert.deepEqual(values[2].value, summarize('data:text/plain,%zz')); assert.equal(values[6].value.utf16Length, limit); assert.match(values[7].error, /ASSET_REFERENCE_LIMIT.*16 MiB/)
    return { limit, values }
  })
  await check('R04', () => {
    const doc = (name, parent = null, data = {}) => ({ format: 'nova-resource', version: 1, id: name, name, kind: 'PhysicsMaterial', parent, data, variants: { Smooth: { friction: .125 } }, activeVariant: 'Smooth' })
    const A = { ...record('parent.nova-resource','resource',JSON.stringify(doc('Parent',null,{density:2,friction:.7})),501), uuid: 'ABCDEFAB-0000-4000-8000-000000000501' }, duplicate = { ...A, name:'second', source:JSON.stringify(doc('Second')) }, B = record('child.nova-resource','resource',JSON.stringify(doc('Child',`asset://${A.uuid}`,{restitution:.4})),502), bad = record('bad.nova-resource','resource','{bad',503), cycle = record('cycle.nova-resource','resource',JSON.stringify(doc('Cycle',`asset://${uuid(504)}`)),504)
    const records = setRecords([A,duplicate,B,bad,cycle]), snapshot = catalog(records), refs = [A.uuid, A.uuid.toLowerCase(), `asset://${A.uuid}`, `ASSET://${A.uuid}`, B.uuid, bad.uuid, cycle.uuid, 'missing']
    const values = refs.map(reference => { const read = api.readResourceFromAssets(reference, records), resolved = api.resolveResourceFromAssets(reference, records); if (snapshot) { const chosen = snapshot.resolveResourceRecord(reference); const expected = records.find(asset => asset.uuid.toLowerCase() === (reference??'').replace(/^asset:\/\//,'').toLowerCase()) ?? null; assert.deepEqual(view(chosen), view(expected)) } return { read, resolved, serialized: read ? api.serializeResource(read) : null } })
    assert.equal(values[1].read.name, 'Parent'); assert.equal(values[3].read, null); assert.equal(values[4].resolved.data.density, 2); assert.equal(values[6].resolved, null); return values
  })
  let graphBytes
  if (paired) { graphBytes = await readFile(join(dirname(join(root,arg('compare'))),'input-graph.json')); assert.equal(sha(graphBytes), paired.inputGraphSha256) }
  else graphBytes = Buffer.from(JSON.stringify(api.projectRhaiSyntax('@export let total=0;\nfn start(){total=73;}\nfn update(dt){total+=1;}','Prepared Visual',uuid(600))))
  await writeFile(join(output,'input-graph.json'),graphBytes,{flag:'wx'})
  await check('R05', () => {
    const rootSource = 'use "shared";\n@export let total=0;\nfn start(){total=shared_value();}\nfn update(dt){total+=1;}\nfn refresh(){total=shared_value();}'
    const records = setRecords([record('root.rhai','script',rootSource,601),record('shared.rhai','script','fn shared_value(){42}',602),record('visual.nova-graph','visualScript',graphBytes.toString('utf8'),603)]), services = api.createEditorGameplayScriptServices(), snapshot = catalog(records)
    const bundle = api.resolveProjectScriptBundle(uuid(601), { resolveAsset: services.resolveModuleAsset, readSource: services.readSource, compileVisual: services.compileVisual }), visual = services.compileVisual(graphBytes.toString('utf8'))
    const result = { bundle, visual, rhai: execute(services,uuid(601),43), graph: execute(services,uuid(603),74), missing: capture(() => api.resolveProjectScriptBundle(uuid(601),{resolveAsset:services.resolveModuleAsset,readSource:reference=>reference===uuid(602)?null:services.readSource(reference),compileVisual:services.compileVisual})) }
    if (snapshot) { const pure = snapshot.createScriptServices(api.executableGraphSource); assert.equal(api.resolveProjectScriptBundle(uuid(601),{resolveAsset:pure.resolveModuleAsset,readSource:pure.readSource,compileVisual:pure.compileVisual}),bundle); assert.deepEqual(execute(pure,uuid(601),43),result.rhai); assert.deepEqual(execute(pure,uuid(603),74),result.graph) }
    return result
  })
  await check('R06', () => {
    const source = 'use "live";\n@export let total=0;\nfn start(){total=live_value();}\nfn update(dt){total+=1;}\nfn refresh(){total=live_value();}', records = setRecords([record('root.rhai','script',source,701),record('live.rhai','script','fn live_value(){10}',702)]), services = api.createEditorGameplayScriptServices(), original = records[1], revision = services.revision()
    const point = {id:'point',line:1,functionName:'live_value',condition:'',hitCondition:0,logMessage:'',enabled:true,hitCount:0}; original.script.breakpointDetails.push(point)
    const counted = services.recordBreakpointHit(original.uuid,0,copy(point)); assert.equal(counted,1); const refused = capture(()=>services.recordBreakpointHit(original.uuid,0,{...point,id:'stale'})); assert(refused.error)
    const wrote = services.writeSource(original.uuid,'fn live_value(){11}'); assert.equal(wrote,true); assert.equal(services.revision(),revision+1); assert.equal(services.resolveAsset(original.uuid),original); assert.equal(services.readSource(original.uuid),'fn live_value(){11}')
    const {runtime,entity}=core(services,uuid(701)); runtime.stepOnce(); assert.equal(entity.script2D.properties.total,12); runtime.queueHotReload(uuid(702),'fn live_value(){88}'); runtime.stepOnce(); runtime.runEntityFunction(entity,'refresh'); runtime.flushEntityCommands(); assert.equal(entity.script2D.lastError,null); assert.equal(api.scriptDebugState.hotReload.status,'applied'); assert.equal(entity.script2D.properties.total,88)
    const total=entity.script2D.properties.total, stored=services.readSource(uuid(702)); runtime.stopSession(false)
    original.path='.nova/cache/live.rhai'; assert.equal(services.writeSource(original.uuid,'forbidden'),false)
    const replacement=copy(records); replacement[1].source='fn live_value(){99}'; api.assetState.records=replacement; api.assetState.generation++; assert.equal(services.readSource(uuid(702)),'fn live_value(){99}')
    return {counted,refused,wrote,total,stored,current:services.readSource(uuid(702)),liveList:services.listIdentities()===api.assetState.records,optionalWrite:typeof services.writeSource==='function',optionalCounter:typeof services.recordBreakpointHit==='function'}
  })
  await check('R07', () => {
    const values=[]
    for(let i=0;i<2;i++) { const records=setRecords([record('same.rhai','script',`@export let total=0;\nfn start(){total=${i?91:31};}\nfn update(dt){total+=1;}`,801)]); api.assetState.generation=9000+i; const services=api.createEditorGameplayScriptServices(), snapshot=catalog(records,9000+i,`project-${i}`), projection={identity:view(services.resolveAsset(uuid(801))),module:services.resolveModuleAsset('Assets/Scripts/same.rhai'),source:services.readSource(uuid(801)),revision:services.revision(),identities:services.listIdentities().map(asset=>({uuid:asset.uuid,path:asset.path})),output:execute(services,uuid(801),i?92:32)}; if(snapshot){const pure=snapshot.createScriptServices(api.executableGraphSource); assert.deepEqual(view(pure.resolveAsset(uuid(801))),projection.identity);assert.equal(pure.readSource(uuid(801)),projection.source);assert.equal(pure.revision(),projection.revision);assert.deepEqual(execute(pure,uuid(801),i?92:32),projection.output)} values.push(projection) }
    return values
  })
  await extra('N01',()=>{const inputs=[record('immutable.rhai','script','A',901)],A=new api.RuntimeProjectCatalog(inputs,{projectId:'A',revision:1}),B=new api.RuntimeProjectCatalog([{...inputs[0],source:'B'}],{projectId:'B',revision:2});inputs[0].source='changed';inputs[0].script.breakpoints.push(8);inputs.splice(0);assert.equal(A.readSource(uuid(901)),'A');assert.equal(B.readSource(uuid(901)),'B');assert.throws(()=>A.resolveAsset(uuid(901)).script.breakpoints.push(9),TypeError);assert(!('writeSource' in A.createScriptServices(api.executableGraphSource)));return{A:A.readSource(uuid(901)),B:B.readSource(uuid(901)),frozen:Object.isFrozen(A.resolveAsset(uuid(901)).script.breakpoints)}})
  await extra('N02',async()=>{const pureEntry=join(output,'pure-entry.ts'),pureDir=join(output,'pure');await writeFile(pureEntry,`export * from '${norm(join(root,'src/runtime/runtimeAssetValues.ts'))}';\nexport * from '${norm(join(root,'src/runtime/runtimeProjectCatalog.ts'))}';`,{flag:'wx'});let modules=[];await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[cohortPlugin,{name:'capture-runtime-catalog-pure',generateBundle(){modules=[...this.getModuleIds()].map(id=>norm(id.split('?')[0])).filter(id=>id.startsWith(norm(root)+'/src/'))}}],build:{ssr:true,outDir:pureDir,emptyOutDir:false,rollupOptions:{input:pureEntry,output:{entryFileNames:'pure.mjs',inlineDynamicImports:true}}}});const bad=modules.filter(file=>/\/src\/(editor|store|renderer)\/|AssetDatabase|importPipeline|contentInteroperability|importRetention/.test(file));assert.deepEqual(bad,[]);const paths=modules.map(file=>norm(relative(root,file))).sort();assert.deepEqual(paths,['src/assets/contentHash.ts','src/runtime/runtimeAssetValues.ts','src/runtime/runtimeProjectCatalog.ts']);pureEvidence={paths,bundleSha256:sha(await readFile(join(pureDir,'pure.mjs')))};return pureEvidence})
  await extra('N03',()=>{const input=record('guard.rhai','script','guard',902);let invoked=0;const getter={...input};Object.defineProperty(getter,'evil',{enumerable:true,get(){invoked++;return 1}});assert.throws(()=>new api.RuntimeProjectCatalog([getter],{projectId:'guard',revision:0}),/RUNTIME_CATALOG_RECORD_INVALID/);assert.equal(invoked,0);for(const value of [new Uint8Array(2),new Date(),new Map(),()=>1,Infinity])assert.throws(()=>new api.RuntimeProjectCatalog([{...input,extra:value}],{projectId:'guard',revision:0}),/RUNTIME_CATALOG_RECORD_INVALID/);assert.throws(()=>new api.RuntimeProjectCatalog([input],{projectId:'',revision:0}),/RUNTIME_CATALOG_REQUIRED/);const owner=new api.RuntimeProjectCatalog([input],{projectId:'guard',revision:0});assert.throws(()=>owner.createScriptServices(null),/SCRIPT_SERVICES_REQUIRED/);return{invoked,requiredCompiler:true,rejectedUnsupported:5}})
  finished=true
} catch(error) { failure=error.stack??String(error) }
finally {
  for(const [index,runtime]of runtimes.entries()){try{runtime.stopSession(false);cleanup.runtimes.push({index,active:runtime.isActive,inputAttached:runtime.input.attached,vmReleased:runtime.scriptRuntime===null})}catch(error){cleanup.runtimes.push({index,error:String(error)})}}
  if(rootWorld?.runtime){try{rootWorld.runtime.free();rootWorld.runtime=null;rootWorld.wasmLoaded=false;cleanup.wasm.push({released:true})}catch(error){cleanup.wasm.push({error:String(error)})}}
  const sourceChanges=[];if(!before)for(const[file,hash]of afterHashes)if(sha(await readFile(file))!==hash)sourceChanges.push(norm(relative(root,file)))
  const status=!finished||failure||checks.some(item=>item.status==='FAILED')||additional.some(item=>item.status==='FAILED')||sourceChanges.length?'FAILED':'PASSED'
  const graphFile=join(output,'input-graph.json');let inputGraphSha256=null;try{inputGraphSha256=sha(await readFile(graphFile))}catch{}
  const report={schema:'nova-runtime-catalog-paired-functional-v1',mode,status,generatedAt:new Date().toISOString(),driverSha256:sha(driver),baseline:{files:597,sourceHash:baseline.sourceHash,manifestSha256:baseline.manifestSha256,sourceRecordSha256:sha(baselineBytes),overrides:[]},checks,additional,inputGraphSha256,sourceHashes,sourceChanges,wasmSha256,pureEvidence,cleanup,failure,environment:{node:process.version,platform:process.platform,execution:'Actual Node SSR Editor/Core/Rhai + ordinary WASM, real AssetDatabase and visual compiler; functional only'},limits:['No PAK/decode/migration/Player/scene/streaming changes or qualification.','New immutable catalog isolation is after-only; common R07 compares actual old prepared-input read projections sequentially, never claims an old catalog Owner.','No formal performance, GUI/GPU, Worker/target platform/release or whole M1 qualification.','Plain-data snapshot rejects getters/classes/binary values; arbitrary Proxy input is outside contract.']}
  await writeFile(join(output,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({mode,status,common:checks.length,passed:checks.filter(item=>item.status==='PASSED').length,additional:additional.length,additionalPassed:additional.filter(item=>item.status==='PASSED').length,sourceChanges,failure,report:join(output,'report.json')}));if(status!=='PASSED')process.exitCode=1
}
