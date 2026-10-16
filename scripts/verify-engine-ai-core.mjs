/** Actual Core/Rhai/ordinary WASM AI ownership integration. Functional evidence, not a benchmark. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {dirname,join,relative} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash,webcrypto} from 'node:crypto'
import {build} from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),before=process.argv.includes('--before'),mode=before?'before':'after'
const cache=join(root,'.cache/engine-overhaul/ai/core-integration'),baselineRoot=join(cache,'before-209575-4b0Tdx')
const sha=x=>createHash('sha256').update(x).digest('hex'),norm=x=>x.replaceAll('\\','/'),copy=x=>JSON.parse(JSON.stringify(x))
const baselineBytes=await readFile(join(baselineRoot,'source.json'));assert.equal(sha(baselineBytes),'36ee5edac3f4fb0cde4eb4ef944669e3769fd1161e6d5c6999a1514ae2c3d3b5')
const baseline=JSON.parse(baselineBytes),frozen=new Map(),sourceHashes={},currentHashes=new Map(),reached=new Set()
for(const record of baseline.files){const bytes=await readFile(join(baselineRoot,record.path));assert.equal(sha(bytes),record.sha256);if(record.path.startsWith('src/')||record.path.startsWith('nova_core/pkg/'))frozen.set(norm(join(root,record.path)),before?bytes:await readFile(join(root,record.path)))}
if(!before)for(const key of ['src/runtime/aiOwner.ts','src/runtime/aiDocuments.ts','src/editor/aiAdapter.ts'])frozen.set(norm(join(root,key)),await readFile(join(root,key)))
if(!before)for(const [path,bytes]of frozen)currentHashes.set(path,sha(bytes))
await mkdir(cache,{recursive:true});const output=await mkdtemp(join(cache,`${mode}-`)),snapshot=join(output,'source')
await writeFile(join(output,'verifier.mjs'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'})
const checks=[],afterOnlyChecks=[],observations=[],nativeCalls=[],runtimes=[],worlds=[],restorers=[],cleanup={runtimes:[],worlds:[],instrumentation:[]}
let api,failure=null,finished=false,bundleEvidence=null
const check=async(name,operation,scope='ai-ownership')=>{const first=runtimes.length;try{await operation();checks.push({name,scope,status:'PASSED'})}catch(error){checks.push({name,scope,status:'FAILED',error:error.stack??String(error)})}finally{const group=[];for(const runtime of runtimes.slice(first)){try{runtime.stopSession(false);group.push({active:runtime.isActive,inputAttached:runtime.input.attached,vmReleased:runtime.scriptRuntime===null})}catch(error){group.push({error:String(error)})}}observations.push({stage:'per-group-finally-cleanup',name,runtimes:group});await Promise.resolve();await Promise.resolve()}}
const afterOnly=async(name,operation)=>{if(before)return;try{await operation();afterOnlyChecks.push({name,status:'PASSED'})}catch(error){afterOnlyChecks.push({name,status:'FAILED',error:error.stack??String(error)})}}
if(!globalThis.crypto)globalThis.crypto=webcrypto
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[],maxTouchPoints:0,platform:'Win32'}})
for(const name of ['HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement'])if(!(name in globalThis))globalThis[name]=class{}
try{
 const entries={
  'src/runtime/GameplayRuntime.ts':'GameplayRuntime,GameplayRuntimeCore',
  'src/editor/gameplayWorldHost.ts':'createEditorGameplayWorldHost','src/editor/gameplayScriptServices.ts':'createEditorGameplayScriptServices',
  'src/store/physics.ts':'physicsState,createEditorWorld','src/world/BoxEntity.ts':'BoxEntity','src/world/components.ts':'Script2D,BehaviorTree2D,StateMachine2D',
  'src/assets/AssetDatabase.ts':'createTextAsset,updateTextAsset,assetReference','src/runtime/scriptSettings.ts':'scriptProjectSettings',
  'src/runtime/packages.ts':'enableOfficialPackage,OFFICIAL_AI_PACKAGE_ID,packageState',
  'src/runtime/simulationEvidenceOwner.ts':'computeSimulationStateChecksum',
  'src/runtime/entityLifetimes.ts':'entityLifetimeActive',
  'nova_core/pkg/nova_core.js':'default as initWasm,WasmRuntimeWorld'
 }
 const entry=join(output,'entry.ts');await writeFile(entry,Object.entries(entries).map(([path,names])=>`export {${names}} from '${norm(join(root,path))}';`).join('\n')+`\nexport * as legacyAi from '${norm(join(root,'src/runtime/aiTools.ts'))}';\nexport {watch,toRaw,isReactive} from 'vue';`,{flag:'wx'})
 await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'ai-exact-source-cohort',enforce:'pre',async load(id){
  const path=norm(id.split('?')[0]);if(!path.startsWith(norm(root)+'/src/')&&!path.startsWith(norm(root)+'/nova_core/pkg/'))return
  const key=norm(relative(root,path)),bytes=frozen.get(path);if(!bytes)throw Error(`Production import absent from immutable ${mode} AI source closure: ${key}`)
  await mkdir(dirname(join(snapshot,key)),{recursive:true});await writeFile(join(snapshot,key),bytes,{flag:'wx'})
  sourceHashes[key]={sha256:sha(bytes),matches209575:sha(bytes)===baseline.files.find(item=>item.path===key)?.sha256,snapshotPath:join(snapshot,key)};return bytes.toString('utf8')
 },buildEnd(){for(const id of this.getModuleIds()){const path=norm(id.split('?')[0]);if(sourceHashes[norm(relative(root,path))])reached.add(path)}}}],build:{ssr:true,outDir:output,emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'integration.mjs',inlineDynamicImports:true}}}})
 for(const path of reached)sourceHashes[norm(relative(root,path))].loadedInSsr=true
 bundleEvidence={entrySha256:sha(await readFile(entry)),bundleSha256:sha(await readFile(join(output,'integration.mjs'))),bundlePath:join(output,'integration.mjs')}
 api=await import(pathToFileURL(join(output,'integration.mjs')).href)
 const wasm=await readFile(join(baselineRoot,'nova_core/pkg/nova_core_bg.wasm'));assert.equal(sha(wasm),baseline.files.find(item=>item.path.endsWith('_bg.wasm')).sha256);if(!before)assert.equal(sha(wasm),sha(await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))));await api.initWasm({module_or_path:wasm})
 globalThis.window=Object.assign(new EventTarget(),{performance:globalThis.performance});globalThis.document=Object.assign(new EventTarget(),{hidden:false,activeElement:null});globalThis.CustomEvent=class extends Event{constructor(name,options){super(name);this.detail=options?.detail}}
 api.scriptProjectSettings.debuggerEnabled=false;api.scriptProjectSettings.testing.coverageEnabled=false
 assert(api.enableOfficialPackage(api.OFFICIAL_AI_PACKAGE_ID),'Actual AI official package must be enabled in both cohorts')
 const attach=(world,label)=>{world.runtime=new api.WasmRuntimeWorld();world.wasmLoaded=true;worlds.push({world,label});const actual=world.runtime.clear;world.runtime.clear=function(){nativeCalls.push({label,method:'clear'});return actual.call(this)};restorers.push(()=>{world.runtime.clear=actual;cleanup.instrumentation.push({label,method:'clear',restored:world.runtime.clear===actual})});return world}
 const rootWorld=attach(api.physicsState.world,'Editor-root'),editorHost=api.createEditorGameplayWorldHost(),services=api.createEditorGameplayScriptServices()
 Object.assign(api.physicsState.globalSettings,{gravity:0,airFriction:0,timeScale:1,tickRate:60,maxCatchUpSteps:8});api.physicsState.playMode='playing'
 let entityId=5000,assetId=0
 const uuid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 const make=(name,sharedUuid,x=0,y=10)=>{const entity=new api.BoxEntity(entityId++,{x,y},{x:1,y:1},sharedUuid);entity.name=name;entity.isStatic=true;return entity}
 const asset=(name,type,source)=>{const record=api.createTextAsset(`AI-core-${++assetId}-${name}`,type,source,'Assets');return {record,reference:api.assetReference(record.uuid)}}
 const node=(id,type,extra={})=>({id,type,name:id,children:[],condition:'',action:'',seconds:10,...extra})
 const document=(nodes,extra={})=>({version:2,root:nodes[0].id,nodes,...extra})
 const waitTree=seconds=>document([node('sequence','Sequence',{children:['wait','set','done']}),node('wait','Wait',{seconds}),node('set','SetBlackboard',{key:'completed',value:7}),node('done','Action',{action:'ai.done'})])
 const longTree=document([node('wait','Wait',{seconds:10})],{blackboard:{score:0}})
 const scriptSource='@export let calls=0;\n@export let entries=0;\n@export let destroys=0;\n@export let last_source="";\nfn on_signal(name,payload,source){if name=="ai.done"{calls+=1;last_source=source;}if name=="ai.enter"{entries+=1;last_source=source;}}\nfn on_destroy(){destroys+=1;}'
 const scripted=entity=>{entity.addComponent(new api.Script2D()).scriptAsset=asset(entity.name+'.rhai','script',scriptSource).reference;return entity}
 const behavior=(name,reference,sharedUuid,overrides={})=>{const entity=scripted(make(name,sharedUuid)),component=entity.addComponent(new api.BehaviorTree2D());component.treeAsset=reference;component.tickRate=60;component.blackboardOverrides=overrides;return entity}
 const machine=(name,reference,sharedUuid)=>{const entity=scripted(make(name,sharedUuid));entity.addComponent(new api.StateMachine2D()).machineAsset=reference;return entity}
 const foreignHost=(world,label)=>({...editorHost,state:{...api.physicsState,world,camera:{scale:1,offset:{x:0,y:0},targetOffset:{x:0,y:0}},globalSettings:{...api.physicsState.globalSettings},engineDiagnostics:{...api.physicsState.engineDiagnostics},playMode:'playing'},get activeSceneUuid(){return label}})
 const core=(world,label,legacy=false)=>{const runtime=legacy?new api.GameplayRuntime():new api.GameplayRuntimeCore(services,foreignHost(world,label));runtimes.push(runtime);const wgo=runtime.worldGameplayOwner,actual=wgo.beginWorldGameplay;wgo.beginWorldGameplay=function(...args){const pending=actual.call(this,...args);runtime.actualAiBeginPromise=pending;return pending};restorers.push(()=>{wgo.beginWorldGameplay=actual;cleanup.instrumentation.push({label,method:'beginWorldGameplay',restored:wgo.beginWorldGameplay===actual})});return runtime}
 const begin=async runtime=>{runtime.beginSession();await runtime.actualAiBeginPromise;assert(runtime.worldGameplayOwner.aiModule,'Actual optional AI importer must have resolved');return runtime.worldGameplayOwner.aiModule}
 const tick=(runtime,entryPoint='stepOnce')=>{if(entryPoint==='frame')runtime.frame(.017);else runtime.stepOnce();runtime.dispatchSignals()}
 const aiOf=runtime=>runtime.worldGameplayOwner.aiModule
 const diag=runtime=>before?api.legacyAi.aiDebugState:aiOf(runtime).diagnostics
 const board=(runtime,entity)=>aiOf(runtime).blackboardSnapshot(entity.uuid)
 const evidence=runtime=>runtime.worldGameplayOwner.ports.evidence
 const native=()=>{const view=rootWorld.runtime.state_view();assert(view instanceof Float64Array);return {stateLen:rootWorld.runtime.state_len(),bodyLen:rootWorld.runtime.body_state_len(),state:Array.from(view)}}
 const inventory=world=>world.entities.map(entity=>({id:entity.id,uuid:entity.uuid,position:copy(entity.transform.position),enabled:entity.enabled,parentUuid:entity.parentUuid}))
 const sentinel=make('Editor untouched',uuid(900),500)
 const resetRoot=(values=[sentinel])=>{api.legacyAi.resetAi();rootWorld.entities.splice(0,rootWorld.entities.length,...values);rootWorld.connections.splice(0);rootWorld.invalidateRuntime();rootWorld.update(.11,true,api.physicsState.globalSettings);assert.equal(rootWorld.runtime.state_len(),values.length*56,'Native control must have real nonempty 56-float body records')}
 const foreign=(label,entities)=>{const world=attach(api.createEditorWorld(),label);world.entities.push(...entities);return {world,runtime:core(world,label)}}
 const stopAllSince=async start=>{for(const runtime of runtimes.slice(start))runtime.stopSession(false);await Promise.resolve();await Promise.resolve()}

 await check('AI01-normal-legacy-Core-frame-step-real-Wait-blackboard-Action-once-Rhai-output',async()=>{
  const start=runtimes.length,tree=asset('positive.behavior','behaviorTree',JSON.stringify(waitTree(.045))),actor=behavior('Positive',tree.reference,uuid(1));resetRoot([actor]);const runtime=core(rootWorld,'Positive',true);await begin(runtime)
  tick(runtime,'frame');tick(runtime);assert.equal(actor.script2D.properties.calls,0);tick(runtime,'frame');tick(runtime)
  observations.push({stage:'normal-positive-real-Core',calls:actor.script2D.properties.calls,source:actor.script2D.properties.last_source,board:copy(board(runtime,actor)),error:actor.script2D.lastError,native:native()})
  assert.equal(actor.script2D.lastError,null);assert.equal(actor.script2D.properties.calls,1);assert.equal(actor.script2D.properties.last_source,'ai');assert.equal(board(runtime,actor).completed,7);assert.equal(native().stateLen,56);await stopAllSince(start)
 },'positive-control')

 await check('AI02-two-real-Core-same-UUID-blackboards-and-Evidence-checksums-do-not-cross',async()=>{
  const start=runtimes.length;resetRoot();const tree=asset('blackboard.behavior','behaviorTree',JSON.stringify(longTree)),actorA=behavior('BoardA',tree.reference,uuid(2),{score:1}),actorB=behavior('BoardB',tree.reference,uuid(2),{score:2}),A=foreign('BoardA',[actorA]),B=foreign('BoardB',[actorB]);await begin(A.runtime);tick(A.runtime)
  evidence(A.runtime).state.enabled=true;const beforeB=evidence(A.runtime).captureSimulationEvidence(41);await begin(B.runtime);tick(B.runtime);const afterB=evidence(A.runtime).captureSimulationEvidence(42)
  observations.push({stage:'actual-same-UUID-blackboard-checksum',A:copy(board(A.runtime,actorA)),B:copy(board(B.runtime,actorB)),beforeB,afterB,scope:evidence(A.runtime).checksumPort.scope,sharedUuid:actorA.uuid===actorB.uuid})
  assert.equal(board(A.runtime,actorA).score,1);assert.equal(board(B.runtime,actorB).score,2);assert.equal(afterB,beforeB);await stopAllSince(start)
 })

 await check('AI03-same-UUID-Wait-accumulation-and-B-begin-emitter-stay-in-own-Core',async()=>{
  const start=runtimes.length;resetRoot();const tree=asset('timer.behavior','behaviorTree',JSON.stringify(waitTree(.045))),actorA=behavior('WaitA',tree.reference,uuid(3)),actorB=behavior('WaitB',tree.reference,uuid(3)),A=foreign('WaitA',[actorA]),B=foreign('WaitB',[actorB]);await begin(A.runtime);tick(A.runtime);tick(A.runtime);await begin(B.runtime);tick(B.runtime);tick(B.runtime);tick(A.runtime);tick(A.runtime)
  const aOutput=actorA.script2D.properties.calls,bOutput=actorB.script2D.properties.calls;observations.push({stage:'actual-same-UUID-Wait-emitter',aOutput,bOutput,Aboard:copy(board(A.runtime,actorA)),Bboard:copy(board(B.runtime,actorB)),Asource:actorA.script2D.properties.last_source,Bsource:actorB.script2D.properties.last_source})
  assert.equal(actorA.script2D.lastError,null);assert.equal(actorB.script2D.lastError,null);assert.equal(aOutput,1);assert.equal(bOutput,0);tick(B.runtime);assert.equal(actorB.script2D.properties.calls,1);await stopAllSince(start)
 })

 await check('AI04-distinct-UUID-update-retire-and-B-stop-preserve-A-runtime-board-and-Wait',async()=>{
  const start=runtimes.length;resetRoot();const tree=asset('prune.behavior','behaviorTree',JSON.stringify(waitTree(.055))),actorA=behavior('PruneA',tree.reference,uuid(4),{score:11}),actorB=behavior('PruneB',tree.reference,uuid(5),{score:22}),A=foreign('PruneA',[actorA]),B=foreign('PruneB',[actorB]);await begin(A.runtime);tick(A.runtime);tick(A.runtime);const original=copy(board(A.runtime,actorA));await begin(B.runtime);tick(B.runtime);const afterUpdate=copy(board(A.runtime,actorA));B.runtime.queueEntityRemoval(actorB);B.runtime.flushEntityCommands();B.runtime.flushStructuralCommands();const afterRetire=copy(board(A.runtime,actorA));B.runtime.stopSession(false);const afterStop=copy(board(A.runtime,actorA));tick(A.runtime);tick(A.runtime)
  observations.push({stage:'actual-B-update-retire-stop',original,afterUpdate,afterRetire,afterStop,Aactive:A.runtime.isActive,Bremoved:!B.world.entities.includes(actorB),BlifetimeRetired:!api.entityLifetimeActive(actorB),Bdestroyed:actorB.script2D.properties.destroys,AcontinuedWaitCalls:actorA.script2D.properties.calls,remainingHost:'Actual inherited Editor deleteEntity still targets Editor Root; foreign membership removal is not claimed fixed by AI ownership.'})
  assert.deepEqual(afterUpdate,original);assert.deepEqual(afterRetire,original);assert.deepEqual(afterStop,original);assert.equal(A.runtime.isActive,true);assert.equal(actorB.script2D.properties.destroys,1);assert.equal(api.entityLifetimeActive(actorB),false);assert.equal(actorA.script2D.properties.calls,1);await stopAllSince(start)
 })

 await check('AI05-same-UUID-machine-OnEnter-and-explicit-notify-consumption-are-independent',async()=>{
  const start=runtimes.length;resetRoot();const value={version:2,initialState:'idle',states:[{id:'idle',parent:'',onEnter:'ai.enter',onUpdate:'',onExit:''},{id:'done',parent:'',onEnter:'ai.done',onUpdate:'',onExit:''}],transitions:[{from:'idle',to:'done',signal:'advance',priority:0}]},doc=asset('machine.state','stateMachine',JSON.stringify(value)),actorA=machine('MachineA',doc.reference,uuid(6)),actorB=machine('MachineB',doc.reference,uuid(6)),A=foreign('MachineA',[actorA]),B=foreign('MachineB',[actorB]);await begin(A.runtime);tick(A.runtime);await begin(B.runtime);tick(B.runtime);aiOf(A.runtime).notifyAiSignal('advance');tick(B.runtime);tick(A.runtime)
  observations.push({stage:'actual-machine-enter-notify',Astate:actorA.getComponent('StateMachine2D').currentState,Bstate:actorB.getComponent('StateMachine2D').currentState,Aentries:actorA.script2D.properties.entries,Bentries:actorB.script2D.properties.entries,Acalls:actorA.script2D.properties.calls,Bcalls:actorB.script2D.properties.calls,input:'Existing actual notifyAiSignal API invoked on A; Core has no script->AI broadcast integration claim.'})
  assert.equal(actorA.script2D.properties.entries,1);assert.equal(actorB.script2D.properties.entries,1);assert.equal(actorA.getComponent('StateMachine2D').currentState,'done');assert.equal(actorB.getComponent('StateMachine2D').currentState,'idle');assert.equal(actorA.script2D.properties.calls,1);assert.equal(actorB.script2D.properties.calls,0);await stopAllSince(start)
 })

 await check('AI06-own-world-perception-and-live-source-override-revision-retain-original-math',async()=>{
  const start=runtimes.length;resetRoot();const value=document([node('wait','Wait',{seconds:10})],{blackboard:{score:0},perception:[{id:'eyes',tags:['target'],radius:5,fieldOfView:90,maximumResults:1,blackboardKey:'sight'}]}),doc=asset('perception.behavior','behaviorTree',JSON.stringify(value)),actorA=behavior('PerceptionA',doc.reference,uuid(7),{score:1}),actorB=behavior('PerceptionB',doc.reference,uuid(7),{score:2}),parentA=make('ParentA',uuid(8),0,0),targetA=make('NearA',uuid(9),0,3),tieA=make('TieA',uuid(10),0,3),parentB=make('ParentB',uuid(11),0,0),targetB=make('NearB',uuid(12),0,4)
  for(const parent of [parentA,parentB])parent.transform.rotation=Math.PI/2;actorA.parentUuid=parentA.uuid;actorB.parentUuid=parentB.uuid;actorA.transform.position={x:0,y:0};actorB.transform.position={x:0,y:0};for(const entity of [targetA,tieA,targetB])entity.tags=['target']
  const A=foreign('PerceptionA',[tieA,targetA,actorA,parentA]),B=foreign('PerceptionB',[targetB,parentB,actorB]);await begin(A.runtime);tick(A.runtime);const firstA=copy(board(A.runtime,actorA));await begin(B.runtime);tick(B.runtime);const beforeRevisionA=copy(board(A.runtime,actorA));actorB.getComponent('BehaviorTree2D').blackboardOverrides={score:3};tick(B.runtime);const revisedB=copy(board(B.runtime,actorB));api.updateTextAsset(doc.record.uuid,JSON.stringify({...value,blackboard:{score:99,sourceRevision:1}}));tick(B.runtime);const liveSourceB=copy(board(B.runtime,actorB))
  observations.push({stage:'actual-perception-and-source-revision',firstA,beforeRevisionA,revisedB,liveSourceB,Aafter:copy(board(A.runtime,actorA)),targets:{A:targetA.uuid,B:targetB.uuid}})
  assert.equal(firstA['sight.count'],1);assert.equal(firstA['sight.uuid'],targetA.uuid);assert.equal(firstA['sight.distance'],3);assert.deepEqual(beforeRevisionA,firstA);assert.equal(revisedB.score,3);assert.equal(revisedB['sight.uuid'],targetB.uuid);assert.equal(liveSourceB.sourceRevision,1);assert.deepEqual(board(A.runtime,actorA),firstA);await stopAllSince(start)
 })

 await check('AI07-legacy-Vue-diagnostics-same-raw-and-foreign-state-are-independent',async()=>{
  const start=runtimes.length,tree=asset('diagnostics.behavior','behaviorTree',JSON.stringify(longTree)),rootActor=behavior('RootDiag',tree.reference,uuid(13));resetRoot([rootActor]);const legacy=core(rootWorld,'RootDiag',true);await begin(legacy);const view=api.legacyAi.aiDebugState,raw=api.toRaw(view);let watched=0;const unwatch=api.watch(()=>view.activeAgents,()=>watched++,{flush:'sync'});tick(legacy);const rootDiagnostic=copy(view)
  const actors=[14,15,16].map(n=>behavior('ForeignDiag'+n,tree.reference,uuid(n))),B=foreign('ForeignDiag',actors);await begin(B.runtime);tick(B.runtime);const foreignDiagnostic=copy(diag(B.runtime)),rootAfter=copy(view);unwatch()
  observations.push({stage:'actual-root-Vue-foreign-diagnostics',watched,sameRaw:api.toRaw(api.legacyAi.aiDebugState)===raw,rootDiagnostic,rootAfter,foreignDiagnostic,foreignReactive:api.isReactive(diag(B.runtime))})
  assert(watched>0);assert.equal(api.toRaw(api.legacyAi.aiDebugState),raw);assert.deepEqual(rootAfter,rootDiagnostic);assert.equal(api.isReactive(diag(B.runtime)),false);assert.equal(foreignDiagnostic.activeAgents,3)
  await afterOnly('new-AiOwner-foreign-same-UUID-array-guard-is-before-side-effects',()=>{const own=aiOf(B.runtime),old=copy(own.diagnostics),foreignSame=make('Wrong-member',actors[0].uuid);assert.throws(()=>own.updateAi([foreignSame],1/60,9),/AI_.*WORLD|AI_.*ENTIT/);assert.deepEqual(own.diagnostics,old)})
  await afterOnly('new-AiOwner-valid-subset-reordered-input-preserves-original-input-scope',()=>{const own=aiOf(B.runtime);own.updateAi([actors[2],actors[0]],1/60,10);assert.equal(own.diagnostics.activeAgents,2)})
  await afterOnly('new-WGO-rejects-actual-wrong-World-AiOwner-through-original-load-error-channel',async()=>{const bad=foreign('WrongAiOwner',[behavior('WrongAiActor',tree.reference,uuid(18))]),ports=bad.runtime.worldGameplayOwner.ports,actual=ports.loadAi;ports.loadAi=()=>Promise.resolve(aiOf(B.runtime));restorers.push(()=>{ports.loadAi=actual;cleanup.instrumentation.push({label:'WrongAiOwner',method:'loadAi',restored:ports.loadAi===actual})});bad.runtime.beginSession();await bad.runtime.actualAiBeginPromise;tick(bad.runtime);observations.push({stage:'actual-wrong-World-loaded-owner',error:bad.runtime.worldGameplayOwner.state.lastError,moduleRejected:bad.runtime.worldGameplayOwner.aiModule===null,active:bad.runtime.isActive});assert.equal(bad.runtime.worldGameplayOwner.aiModule,null);assert.match(bad.runtime.worldGameplayOwner.state.lastError,/AI.*WORLD|WORLD.*AI/);assert.equal(bad.runtime.isActive,true)})
  await stopAllSince(start)
 })

 await check('AI08-delayed-actual-import-old-begin-stop-restart-and-nonempty-Root-native-cleanup',async()=>{
  const start=runtimes.length;resetRoot();const tree=asset('async.behavior','behaviorTree',JSON.stringify(waitTree(0))),actor=behavior('DelayedA',tree.reference,uuid(17)),A=foreign('DelayedA',[actor]),nativeBefore=native(),rootBefore=inventory(rootWorld),clearBefore=nativeCalls.filter(x=>x.label==='Editor-root').length,wgo=A.runtime.worldGameplayOwner,ports=wgo.ports,actual=ports.loadAi;let release
  const gate=new Promise(resolve=>release=resolve);let loads=0;ports.loadAi=function(){loads++;return actual.call(this).then(module=>gate.then(()=>module))};restorers.push(()=>{ports.loadAi=actual;cleanup.instrumentation.push({label:'DelayedA',method:'loadAi',restored:ports.loadAi===actual})})
  A.runtime.beginSession();const oldBegin=A.runtime.actualAiBeginPromise;A.runtime.stopSession(false);A.runtime.beginSession();const newBegin=A.runtime.actualAiBeginPromise;release();await Promise.all([oldBegin,newBegin]);tick(A.runtime);const outputCalls=actor.script2D.properties.calls
  observations.push({stage:'actual-delayed-import-stop-restart',loads,outputCalls,source:actor.script2D.properties.last_source,nativeBefore,nativeAfter:native(),rootPreserved:JSON.stringify(rootBefore)===JSON.stringify(inventory(rootWorld)),rootClearDelta:nativeCalls.filter(x=>x.label==='Editor-root').length-clearBefore,active:A.runtime.isActive})
  assert.equal(loads,1);assert.equal(outputCalls,1);assert.equal(actor.script2D.properties.last_source,'ai');assert.equal(actor.script2D.lastError,null);assert.equal(nativeBefore.stateLen,56);assert.deepEqual(native(),nativeBefore);assert.deepEqual(inventory(rootWorld),rootBefore);assert.equal(nativeCalls.filter(x=>x.label==='Editor-root').length,clearBefore);await stopAllSince(start)
 },'positive-control')
 finished=true
 observations.push({stage:'actual-config',settings:copy(api.physicsState.globalSettings),packages:copy(api.packageState.installed),cohort:before?'Full frozen209575 manifest589':'Frozen qualified current AI composition',functionalOnly:true,remaining:'Other global animation/graph/profiler/nav/stream/particle service Owners and lifetime-generation allocation remain outside this AI slice.'})
}catch(error){failure=error.stack??String(error)}
finally{
 for(const [index,runtime]of runtimes.entries()){try{runtime.stopSession(false);cleanup.runtimes.push({index,active:runtime.isActive,inputAttached:runtime.input.attached,vmReleased:runtime.scriptRuntime===null})}catch(error){cleanup.runtimes.push({index,error:String(error)})}}
 for(const restore of restorers.reverse()){try{restore()}catch(error){cleanup.instrumentation.push({error:String(error)})}}
 for(const {world,label}of worlds){try{world.runtime?.free();world.runtime=null;world.wasmLoaded=false;cleanup.worlds.push({label,released:true})}catch(error){cleanup.worlds.push({label,error:String(error)})}}
 const sourceChangesDuringRun=[];for(const [path,hash]of currentHashes)if(sha(await readFile(path))!==hash)sourceChangesDuringRun.push(norm(relative(root,path)))
 if(sourceChangesDuringRun.length)failure=`${failure??''}\nProduction source changed during validation: ${sourceChangesDuringRun.join(', ')}`
 const ownershipFailed=checks.filter(item=>item.scope==='ai-ownership'&&item.status==='FAILED').length,controlsFailed=checks.filter(item=>item.scope==='positive-control'&&item.status==='FAILED').length,afterOnlyFailed=afterOnlyChecks.filter(item=>item.status==='FAILED').length
 const status=failure||!finished||controlsFailed?'FAILED':ownershipFailed||afterOnlyFailed?(before?'BASELINE_AI_OWNERSHIP_NOT_PASSED':'AI_OWNERSHIP_NOT_PASSED'):'AI_OWNERSHIP_VERIFIED'
 sourceHashes['scripts/verify-engine-ai-core.mjs']={sha256:sha(await readFile(fileURLToPath(import.meta.url))),loadedInSsr:false};sourceHashes['nova_core/pkg/nova_core_bg.wasm']={sha256:baseline.files.find(item=>item.path.endsWith('_bg.wasm')).sha256,executed:true}
 const retirement=observations.find(item=>item.stage==='actual-B-update-retire-stop'),remainingChecks=retirement?[{name:'inherited-Editor-deleteEntity-removes-foreign-World-array-member',status:retirement.Bremoved?'PASSED':'NOT_PASSED',scope:'remaining-host-service-boundary',actual:{removed:retirement.Bremoved,onDestroy:retirement.Bdestroyed,lifetimeRetired:retirement.BlifetimeRetired},reason:'Core calls actual on_destroy/clearEntityRuntimeState/retireEntityLifetime, then inherited physics.deleteEntity remains bound to original Editor Root. This is retained before/after and not replaced by a stub or temporary Root switch.'}]:[]
 const report={schema:'nova-ai-actual-core-verification-v1',generatedAt:new Date().toISOString(),mode,status,checks,afterOnlyChecks,remainingChecks,observations,nativeCalls,sourceHashes,loadedSources:[...reached].sort().map(path=>norm(relative(root,path))),sourceChangesDuringRun,bundleEvidence,baseline:{sourceRecordSha256:sha(baselineBytes),files:baseline.files.length,sourceHash:baseline.sourceHash,manifestSha256:baseline.manifestSha256,explicitOverrides:[]},cleanup,environment:{node:process.version,platform:process.platform,architecture:process.arch,execution:'Actual Node SSR Core/Rhai and ordinary WASM with actual Editor services, AssetDatabase/profiler/graph/importer',browser:null,graphicsBackend:null,performanceComparison:false},limitations:['No native AI implementation, collision fixture, GPU, GUI, Worker, independent Player or performance/release qualification.','AI uses original TypeScript behavior algorithms; native nonempty control checks unchanged Root state, not AI Rust migration.','Explicit notifyAiSignal input is existing API-level; AI output uses actual Core signal dispatcher and Rhai on_signal.','Only delayed actual importer is gated, delegating the real importer/Owner; no empty AI/assets/profiler/graph substitute.','Historical Evidence AI blackboard failure raw is preserved; this new comparison has its own fixed input and denominator.','After-only identity/subset guard assertions are reported separately; the old module has no fixed-owner guard.','Foreign array removal remains separately NOT_PASSED through the unchanged inherited Editor deleteEntity; an AI ownership pass is not a complete World Host or M1 pass.'],failure}
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({mode,status,checks:checks.length,passed:checks.filter(x=>x.status==='PASSED').length,ownershipFailed,controlsFailed,afterOnly:afterOnlyChecks.length,afterOnlyFailed,failure,report:join(output,'report.json')}))
 if(failure||!finished||controlsFailed||!before&&(ownershipFailed||afterOnlyFailed))process.exitCode=1
}
