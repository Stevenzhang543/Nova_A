/** Focused pure config graph, same-owner Vue adapter and actual save/network consumers. Not whole Runtime/Player M1. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const root=process.cwd(),cache=resolve('.cache'),evidence=resolve('.cache/engine-overhaul/production-state-source')
await mkdir(cache,{recursive:true});await mkdir(evidence,{recursive:true})
const temporary=await mkdtemp(join(cache,'nova-production-state-')),owner=resolve('src/runtime/production.ts')
const beforePath=join(evidence,'before-production.ts'),beforeSource=await readFile(beforePath,'utf8'),checks=[]
const test=async(name,run)=>{await run();checks.push({name,status:'passed'})},normalize=path=>path.replaceAll('\\','/')
const forbidden=id=>/node_modules\/.*(?:vue|pinia)|\/src\/(?:editor|store|components|platform|ui)\//.test(normalize(id))
let opened
try {
 const graphs={before:[],after:[]}
 let baseline
 for(const phase of ['before','after']){
  const result=await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{
   name:'production-state-graph-'+phase,enforce:'pre',load(id){if(phase==='before'&&normalize(id)===normalize(owner))return beforeSource},
   generateBundle(){graphs[phase].push(...this.getModuleIds())}
  }],build:{ssr:true,write:false,rollupOptions:{input:owner,output:{inlineDynamicImports:true}}}})
  if(phase==='before'){const file=join(temporary,'before.mjs');await writeFile(file,result.output.find(item=>item.type==='chunk').code);baseline=await import(pathToFileURL(file).href)}
 }
 await test('Compiled production config graph loses its confirmed Vue edge without adding Editor/platform dependencies',()=>{
  assert.ok(graphs.before.some(forbidden),'before snapshot confirms Vue reachability')
  assert.equal(graphs.after.filter(forbidden).length,0)
  for(const file of ['runtime/production.ts','runtime/largeWorldPerformance.ts','runtime/performance/observability.ts'])assert.ok(graphs.after.some(id=>normalize(id).endsWith(file)))
 })
 const entry=join(temporary,'contract.ts')
 await writeFile(entry,`export * as production from ${JSON.stringify(normalize(owner))};\nexport * as editor from ${JSON.stringify(normalize(resolve('src/editor/productionStateAdapter.ts')))};\nexport * as performance from ${JSON.stringify(normalize(resolve('src/runtime/largeWorldPerformance.ts')))};\nexport * as runtime from ${JSON.stringify(normalize(resolve('src/runtime/productionRuntime.ts')))};\nexport * as save from ${JSON.stringify(normalize(resolve('src/runtime/saveGame.ts')))};\nexport * as session from ${JSON.stringify(normalize(resolve('src/projects/projectSession.ts')))};\nexport {reactive,isReactive,toRaw,watch} from 'vue';\nimport {productionSettings} from ${JSON.stringify(normalize(owner))};\nexport function liveSettings(){return productionSettings}\n`)
 const entryName=normalize(relative(resolve('src'),entry)).slice(0,-3)
 opened=await openMediaAuditModules({repository:root,bases:[root]},{contract:entryName})
 const m=opened.modules.contract,p=m.production,raw=p.productionSettings
 await test('Default Runtime config is plain and retains every existing default including network opt-in',()=>{
  assert.equal(m.isReactive(raw),false)
  assert.deepEqual(p.serializeProductionSettings(),baseline.serializeProductionSettings())
  assert.equal(raw.networking.enabled,false);assert.equal(raw.networking.permissionGranted,false);assert.equal(raw.networking.autoStart,false)
 })
 const fixture=JSON.parse(await readFile(resolve('reference-projects/projects/physics-v2617-platformer/project.nova'),'utf8'))
 const corpus=[undefined,null,[],{},fixture.projectSettings?.production,
  {performance:{traceCapacity:-1,frameBudgetMs:NaN,adaptiveQuality:false,reactivePublishInterval:150,jobs:Infinity},replay:{seed:Infinity,capacity:0}},
  {data:{saveSchemaVersion:2,saveMigrations:[{fromVersion:1,toVersion:2,renames:{score:'points'},defaults:{level:1},remove:['old']}]},testing:{tests:[{id:'a',retries:3},{id:'a',flakyInfrastructure:true,retries:4}]}},
  {networking:{enabled:'true',permissionGranted:1,autoStart:true,role:'host',sessionMode:'direct',transport:'native-udp',endpoint:' udp://127.0.0.1:7777 ',maximumPacketBytes:Infinity,maximumPendingReliable:0,authentication:{mode:'hook',providerId:'auth id',requireVerifiedPeers:true,handshakeTimeoutMs:10},security:{requireEncryption:true,maximumPacketAgeMs:1,replayWindow:1},channels:[{id:'input',delivery:'invalid',maximumPayloadBytes:999999},{id:'input'}],rpcContracts:[{name:'rpc',channelId:'missing',authority:'any',payloadSchema:'object'}]}},
  {networking:{enabled:true,permissionGranted:true,autoStart:false,channels:[],interest:{defaultRadius:999,maximumRadius:20},replicatedEntities:[{entityUuid:'entity',authority:'owner',properties:['transform','evil','transform'],predict:true}]}}]
 await test('Actual old/new normalizers agree on historical partial config, invalid bounds, tests, migrations and network security',()=>{
  for(const value of corpus)assert.deepEqual(p.normalizeProductionSettings(value),baseline.normalizeProductionSettings(value))
 })
 await test('Failed adapter construction does not publish or prevent a later valid same-owner installation',()=>{
  assert.throws(()=>p.installProductionStateAdapter(()=>{throw Error('fixture adapter failure')}),/fixture adapter failure/)
  assert.equal(p.productionSettings,raw)
  assert.throws(()=>p.installProductionStateAdapter(()=>null),/existing settings object/)
  assert.equal(p.productionSettings,raw)
  m.editor.installEditorProductionState();assert.equal(m.isReactive(p.productionSettings),true)
  assert.equal(m.toRaw(p.productionSettings),raw);assert.equal(m.liveSettings(),p.productionSettings)
 })
 await test('Live Vue watchers observe nested edits, replaced normalized sections and the existing jobs configuration reader',()=>{
  const traces=[],jobs=[]
  const stopTrace=m.watch(()=>p.productionSettings.performance.traceCapacity,v=>traces.push(v),{flush:'sync'})
  const stopJobs=m.watch(()=>p.productionSettings.jobs,value=>jobs.push({maxWorkers:value.maxWorkers,timeoutMs:value.timeoutMs}),{deep:true,flush:'sync'})
  try{
   p.productionSettings.performance.traceCapacity=720;p.productionSettings.jobs.maxWorkers=3
   p.loadProductionSettings({performance:{traceCapacity:840,frameBudgetMs:20,reactivePublishInterval:12},jobs:{maxWorkers:1,timeoutMs:1200}})
   assert.deepEqual(traces,[720,840]);assert.deepEqual(jobs,[{maxWorkers:3,timeoutMs:15000},{maxWorkers:1,timeoutMs:1200}])
   assert.equal(m.performance.performanceRuntimeSettings.targetFrameMs,20);assert.equal(m.performance.performanceRuntimeSettings.reactivePublishInterval,12)
   assert.equal(m.liveSettings(),p.productionSettings);assert.equal(m.toRaw(p.productionSettings),raw)
  }finally{stopTrace();stopJobs()}
 })
 await test('Repeat installers preserve the first proxy/owner and reset preserves identity plus default semantics',()=>{
  const installed=p.productionSettings;let calls=0
  p.installProductionStateAdapter(value=>{calls++;return value});m.editor.installEditorProductionState()
  assert.equal(calls,0);assert.equal(p.productionSettings,installed)
  p.resetProductionSettings();baseline.resetProductionSettings()
  assert.equal(p.productionSettings,installed);assert.equal(m.toRaw(p.productionSettings),raw)
  assert.deepEqual(p.serializeProductionSettings(),baseline.serializeProductionSettings())
 })
 await test('Plain serialized project config remains detached and reloads through the same existing owner',()=>{
  p.loadProductionSettings(corpus.at(-1));const saved=p.serializeProductionSettings(),text=JSON.stringify(saved)
  assert.equal(m.isReactive(saved),false);assert.equal(m.isReactive(saved.networking),false);assert.deepEqual(structuredClone(saved),saved)
  saved.networking.replicatedEntities[0].properties.push('fixture-copy-only');assert.ok(!p.productionSettings.networking.replicatedEntities[0].properties.includes('fixture-copy-only'))
  const installed=p.productionSettings;p.resetProductionSettings();p.loadProductionSettings(JSON.parse(text))
  assert.equal(p.productionSettings,installed);assert.equal(m.toRaw(p.productionSettings),raw)
  assert.deepEqual(p.serializeProductionSettings(),baseline.normalizeProductionSettings(corpus.at(-1)))
 })
 await test('Actual productionRuntime reads the live owner and keeps disabled/permission guards before lazy networking import',async()=>{
  p.resetProductionSettings();assert.equal(m.runtime.productionNetworkContext().enabled,false)
  await assert.rejects(m.runtime.startProductionNetworking(),/Networking is disabled/)
  p.loadProductionSettings({networking:{enabled:true,permissionGranted:false,autoStart:true,role:'host'}})
  m.runtime.beginProductionRuntime();assert.equal(m.runtime.productionNetworkContext().enabled,false);assert.equal(m.runtime.productionNetworkContext().role,'host')
  await assert.rejects(m.runtime.startProductionNetworking(),/permission has not been granted/)
  await m.runtime.stopProductionNetworking()
 })
 await test('Actual saveGame schema migration follows config load after wrapping without a copy or lost live binding',()=>{
  const storage=new Map();globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value)),removeItem:key=>storage.delete(key),key:index=>[...storage.keys()][index]??null,get length(){return storage.size}}
  p.resetProductionSettings();m.session.projectSessionState.id='production-state-contract'
  Object.assign(m.save.saveGameState,{projectId:'production-state-contract',slot:'slot1',values:{},dirty:false,lastCommittedAt:null,error:''})
  m.save.setSaveValue('score',7);assert.equal(m.save.commitSaveSlot(),true)
  p.loadProductionSettings({data:{saveSchemaVersion:2,saveMigrations:[{fromVersion:1,toVersion:2,renames:{score:'points'},defaults:{level:1},remove:[]}]}})
  assert.equal(m.save.loadSaveSlot('slot1'),true);assert.deepEqual(m.save.saveGameState.values,{points:7,level:1})
  assert.equal(m.toRaw(p.productionSettings),raw)
 })
 await test('Root entry installations occur before Editor jobs subscription and legacy Player does not add an Editor adapter dependency',async()=>{
  const main=await readFile(resolve('src/main.ts'),'utf8'),player=await readFile(resolve('src/player.ts'),'utf8')
  const installed=main.indexOf('installEditorProductionState()'),jobs=main.indexOf('installEditorJobScheduler()')
  assert.ok(installed>=0&&jobs>installed,'Root installs config before the existing jobs watcher')
  assert.ok(player.includes('installProductionStateAdapter(target => reactive(target) as typeof target)'))
  assert.ok(!player.includes('editor/productionStateAdapter'))
 })
 const sources=['src/runtime/production.ts','src/editor/productionStateAdapter.ts','src/main.ts','src/player.ts','scripts/verify-engine-production-state.mjs']
 const hashes={};for(const path of sources)hashes[path]=createHash('sha256').update(await readFile(resolve(path))).digest('hex')
 hashes['before-production.ts']=createHash('sha256').update(beforeSource).digest('hex')
 const report=join(evidence,'production-state-contract.json')
 await writeFile(report,JSON.stringify({format:'nova-production-state-verification',version:1,status:'passed',scope:'SHORT_SMOKE compiled config graph, actual Vue same-owner live binding, productionRuntime guard and saveGame migration with in-memory storage. Not whole Runtime/Player M1 or browser/native save validation.',checks,graphs,hashes,
  association30:{imports:'Handled: production graph has no Vue, adapters explicit in root-owned Editor/legacy Player entries',entries:'Root integrated before service watchers/component setup',projectSaveLoad:'Existing normalization/load/serialize/reset preserved; plain detached round-trip and actual save migration tested; browser save/reopen pending root build',buildWorkerUrlsWasmGlueTauriLicenses:'Not applicable: no new package, worker, protocol, WASM, URL, native capability or dependency'},
  association64:{configurationAndInjection:'Same owner and defaults preserved, optional reactive host injection tested',scheduling:'Existing jobs section deep watch compatible; actual post-build jobs UI pending',uiMotionVisibilityGpu:'Not applicable: no UI style, motion, visibility, backend or submission changes',logs:'Original f775 startup/CI and old Reduced Motion FAIL retained'},
  notTested:['New optimized profile actual settings/jobs watch/save-reopen GUI','Standalone pure Player or whole Runtime/Player M1','Target hardware performance; no performance claim']},null,2)+'\n')
 console.log(JSON.stringify({status:'passed',checks:checks.length,pureModules:graphs.after.length,pureViolations:graphs.after.filter(forbidden).length,report}))
}finally{
 if(opened)await opened.close()
 assert.ok(temporary.startsWith(cache+'\\')||temporary.startsWith(cache+'/'));await rm(temporary,{recursive:true,force:true})
}
