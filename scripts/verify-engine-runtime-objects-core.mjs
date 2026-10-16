/** Actual normal Core/Rhai/ordinary WASM runtime objects audit; functional evidence, not a benchmark. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,mkdtemp} from 'node:fs/promises'
import {dirname,join,relative} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createHash,webcrypto} from 'node:crypto'
import {build} from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),before=process.argv.includes('--before'),mode=before?'before':'after'
const cache=join(root,'.cache/engine-overhaul/runtime-objects/core-integration'),baselineRoot=join(cache,'before-qualified-evidence-EGD4nA')
const sha=x=>createHash('sha256').update(x).digest('hex'),norm=x=>x.replaceAll('\\','/'),copy=x=>JSON.parse(JSON.stringify(x))
const baselineBytes=await readFile(join(baselineRoot,'source.json'));assert.equal(sha(baselineBytes),'fb6cd249dee60421e9004798bb98d22fc881e8bfc0c298908ae9f20ced318712')
const baseline=JSON.parse(baselineBytes),frozen=new Map(),hashes={},currentHashes=new Map(),reached=new Set()
for(const record of baseline.files){const bytes=await readFile(join(baselineRoot,record.path));assert.equal(sha(bytes),record.sha256);if(/\.(ts|js|json)$/.test(record.path))frozen.set(norm(join(root,record.path)),bytes)}
await mkdir(cache,{recursive:true});const output=await mkdtemp(join(cache,`${mode}-`)),snapshot=join(output,'source')
await writeFile(join(output,'verifier.mjs'),await readFile(fileURLToPath(import.meta.url)),{flag:'wx'})
const checks=[],observations=[],nativeCalls=[],hookCalls=[],runtimes=[],worlds=[],restorers=[],cleanup={runtimes:[],worlds:[],instrumentation:[]}
let api,failure=null,finished=false,bundleEvidence=null
const check=(name,operation,scope='runtime-object-ownership')=>{try{operation();checks.push({name,scope,status:'PASSED'})}catch(error){checks.push({name,scope,status:'FAILED',error:error.stack??String(error)})}}
if(!globalThis.crypto)globalThis.crypto=webcrypto
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[],maxTouchPoints:0,platform:'Win32'}})
for(const name of ['HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement'])if(!(name in globalThis))globalThis[name]=class{}
try{
 const entries={
  'src/runtime/GameplayRuntime.ts':'GameplayRuntime,GameplayRuntimeCore',
  'src/editor/gameplayWorldHost.ts':'createEditorGameplayWorldHost',
  'src/editor/gameplayScriptServices.ts':'createEditorGameplayScriptServices',
  'src/store/physics.ts':'physicsState,createEditorWorld,serializeEntity',
  'src/world/BoxEntity.ts':'BoxEntity','src/world/Connection.ts':'createConnection',
  'src/world/hierarchy.ts':'worldTransform',
  'src/world/geometry.ts':'normalizeAngle',
  'src/world/components.ts':'Script2D,Spawner2D,ObjectPool2D',
  'src/assets/AssetDatabase.ts':'assetState,assetReference','src/assets/types.ts':'defaultScriptMetadata',
  'src/runtime/scriptSettings.ts':'scriptProjectSettings',
  'src/runtime/objectPool.ts':'acquirePooled,releasePooled,prepareObjectPools,resetObjectPools,objectPoolDiagnostics,updateObjectPools',
  'src/runtime/entityLifetimes.ts':'entityLifetimeGeneration,entityLifetimeActive',
  'src/runtime/packages.ts':'enableOfficialPackage,OFFICIAL_OBJECT_POOL_PACKAGE_ID,packageState',
  'nova_core/pkg/nova_core.js':'default as initWasm,WasmRuntimeWorld'
 }
 const entry=join(output,'entry.ts');await writeFile(entry,Object.entries(entries).map(([path,names])=>`export {${names}} from '${norm(join(root,path))}';`).join('\n')+"\nexport {toRaw} from 'vue';",{flag:'wx'})
 await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'runtime-objects-exact-source-cohort',enforce:'pre',async load(id){
  const path=norm(id.split('?')[0]);if(!path.startsWith(norm(root)+'/src/')&&!path.startsWith(norm(root)+'/nova_core/pkg/'))return
  const key=norm(relative(root,path));let bytes
  if(before){bytes=frozen.get(path);if(!bytes)throw Error(`Production import absent from immutable qualified-Evidence before175: ${key}`);assert.equal(sha(bytes),baseline.files.find(item=>item.path===key)?.sha256)}
  else{bytes=await readFile(path);currentHashes.set(path,sha(bytes))}
  await mkdir(dirname(join(snapshot,key)),{recursive:true});await writeFile(join(snapshot,key),bytes,{flag:'wx'})
  hashes[key]={sha256:sha(bytes),overlay:before,matchesQualifiedBefore:sha(bytes)===baseline.files.find(item=>item.path===key)?.sha256,snapshotPath:join(snapshot,key)};return bytes.toString('utf8')
 },buildEnd(){for(const id of this.getModuleIds()){const path=norm(id.split('?')[0]);if(hashes[norm(relative(root,path))])reached.add(path)}}}],build:{ssr:true,outDir:output,emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'integration.mjs',inlineDynamicImports:true}}}})
 for(const path of reached)hashes[norm(relative(root,path))].loadedInSsr=true
 bundleEvidence={entrySha256:sha(await readFile(entry)),bundleSha256:sha(await readFile(join(output,'integration.mjs'))),bundlePath:join(output,'integration.mjs')}
 api=await import(pathToFileURL(join(output,'integration.mjs')).href)
 const wasm=await readFile(join(baselineRoot,'nova_core/pkg/nova_core_bg.wasm'));assert.equal(sha(wasm),baseline.files.find(item=>item.path.endsWith('_bg.wasm')).sha256);if(!before)assert.equal(sha(wasm),sha(await readFile(join(root,'nova_core/pkg/nova_core_bg.wasm'))));await api.initWasm({module_or_path:wasm})
 globalThis.window=Object.assign(new EventTarget(),{performance:globalThis.performance});globalThis.document=Object.assign(new EventTarget(),{hidden:false,activeElement:null});globalThis.CustomEvent=class extends Event{constructor(name,options){super(name);this.detail=options?.detail}}
 api.scriptProjectSettings.debuggerEnabled=false;api.scriptProjectSettings.testing.coverageEnabled=false
 assert(api.enableOfficialPackage(api.OFFICIAL_OBJECT_POOL_PACKAGE_ID),'Actual official object-pool package must be enabled in both cohorts')
 const attach=(world,label)=>{world.runtime=new api.WasmRuntimeWorld();world.wasmLoaded=true;worlds.push({world,label});const actual=world.runtime.clear;world.runtime.clear=function(){nativeCalls.push({owner:label,method:'clear'});return actual.call(this)};restorers.push(()=>{world.runtime.clear=actual;cleanup.instrumentation.push({owner:label,method:'clear',restored:world.runtime.clear===actual})});return world}
 const rootWorld=attach(api.physicsState.world,'Editor-root'),editorHost=api.createEditorGameplayWorldHost(),services=api.createEditorGameplayScriptServices()
 Object.assign(api.physicsState.globalSettings,{gravity:0,airFriction:0,timeScale:1,tickRate:10,maxCatchUpSteps:8});api.physicsState.playMode='playing'
 let id=5000,assetId=0
 const make=(name,x=0,uuid)=>{const entity=new api.BoxEntity(id++,{x,y:10},{x:1,y:1},uuid);entity.name=name;entity.isStatic=true;return entity}
 const addAsset=(name,type,source)=>{const record={uuid:`00000000-0000-4000-8000-${String(++assetId).padStart(12,'0')}`,name,path:`Assets/${name}`,assetType:type,source,mimeType:'application/json',width:0,height:0,...(type==='script'?{script:api.defaultScriptMetadata()}:{} )};api.assetState.records.push(record);api.assetState.generation++;return api.assetReference(record.uuid)}
 const parentTemplate=make('Clone parent'),childTemplate=make('Clone child',2);childTemplate.parentUuid=parentTemplate.uuid
 const connection=api.createConnection(7000,[parentTemplate,childTemplate],[parentTemplate.id,childTemplate.id]);connection.enabled=false
 const treeRef=addAsset('Actual tree.prefab','prefab',JSON.stringify({prefabVersion:2,name:'Actual tree',bundle:{entities:[api.serializeEntity(parentTemplate),api.serializeEntity(childTemplate)],connections:[{connection,anchorUuids:[parentTemplate.uuid,childTemplate.uuid]}],rootUuids:[parentTemplate.uuid]},variantOf:null}))
 const pooledTemplate=make('Pooled real script');pooledTemplate.addComponent(new api.Script2D()).scriptAsset=addAsset('Actual pooled.rhai','script','@export let destroyed=0;\nfn on_destroy(){destroyed+=1;}')
 const poolRef=addAsset('Actual pool.prefab','prefab',JSON.stringify({prefabVersion:2,name:'Actual pool',bundle:{entities:[api.serializeEntity(pooledTemplate)],connections:[],rootUuids:[pooledTemplate.uuid]},variantOf:null}))
 const sourceCode=reference=>`@export let calls=0;\nlet saved=(); let latest=();\nfn spawn_now(){let made=spawn_at("${reference}",31.0,17.0,0.4,-2.0,1.5);entity_set_rotation(made,0.6);calls+=1;} fn old_now(){instantiate("${reference}");calls+=1;} fn mutate_now(){let target=find_entity_handle("Target child");entity_set_position(target,40.0,0.0);calls+=1;} fn acquire_now(){saved=spawn_at("${reference}",3.0,10.0,0.0,1.0,1.0);calls+=1;} fn again_now(){latest=spawn_at("${reference}",4.0,10.0,0.0,1.0,1.0);calls+=1;} fn stale_now(){entity_set_position(saved,99.0,0.0);calls+=1;}`
 const scripted=(name,reference,x=20)=>{const entity=make(name,x);entity.addComponent(new api.Script2D()).scriptAsset=addAsset(`${name}.rhai`,'script',sourceCode(reference));return entity}
 const spawner=(name)=>{const entity=make(name,20),component=entity.addComponent(new api.Spawner2D());component.prefabAsset=treeRef;component.interval=100;return entity}
 const poolEntity=(name)=>{const entity=make(name,400),component=entity.addComponent(new api.ObjectPool2D());component.prefabAsset=poolRef;component.prewarm=1;component.capacity=1;component.autoExpand=false;return entity}
 const foreignHost=(world,label)=>({...editorHost,state:{...api.physicsState,world,camera:{scale:1,offset:{x:0,y:0},targetOffset:{x:0,y:0}},globalSettings:{...api.physicsState.globalSettings},engineDiagnostics:{...api.physicsState.engineDiagnostics},playMode:'playing'},get activeSceneUuid(){return label}})
 const core=(world,label,legacy=false)=>{const runtime=legacy?new api.GameplayRuntime():new api.GameplayRuntimeCore(services,foreignHost(world,label));runtimes.push(runtime);const actual=runtime.runDestructionCallbacks;runtime.runDestructionCallbacks=function(entity,...args){hookCalls.push({runtime:label,uuid:entity.uuid});return actual.call(this,entity,...args)};restorers.push(()=>{runtime.runDestructionCallbacks=actual;cleanup.instrumentation.push({owner:label,method:'runDestructionCallbacks',restored:runtime.runDestructionCallbacks===actual})});return runtime}
 const invoke=(runtime,entity,name)=>{runtime.runEntityFunction(entity,name);runtime.flushEntityCommands()}
 const poolApi=runtime=>before?api:runtime.worldGameplayOwner.objectPoolOwner
 const diag=runtime=>copy(poolApi(runtime).objectPoolDiagnostics())
 const activeMembers=world=>world.entities.filter(entity=>entity.prefabAsset===poolRef&&entity.enabled)
 const treeMembers=world=>world.entities.filter(entity=>entity.prefabAsset===treeRef)
 const rootNative=()=>{const view=rootWorld.runtime.state_view();assert(view instanceof Float64Array);return {stateLen:rootWorld.runtime.state_len(),bodyLen:rootWorld.runtime.body_state_len(),state:Array.from(view)}}
 const inventory=world=>world.entities.map(entity=>({id:entity.id,uuid:entity.uuid,position:copy(entity.transform.position),enabled:entity.enabled,parentUuid:entity.parentUuid}))
 const resetRoot=(values=[])=>{api.resetObjectPools();rootWorld.entities.splice(0,rootWorld.entities.length,...values);rootWorld.connections.splice(0);rootWorld.setNextId(10000);rootWorld.invalidateRuntime();rootWorld.update(.11,true,api.physicsState.globalSettings);assert(rootWorld.runtime.state_len()>0,'Root native immutability fixture must contain actual nonempty ordinary WASM state')}
 const rootSentinel=make('Editor untouched',500)

 // Normal Editor compatibility proves actual script compilation and both fixed entry points.
 const legacySpawn=spawner('Legacy spawner'),legacyScript=scripted('Legacy script',treeRef);resetRoot([legacySpawn,legacyScript]);const legacy=core(rootWorld,'Legacy',true)
 legacy.beginSession();legacy.frame(.11);legacy.stepOnce();invoke(legacy,legacyScript,'spawn_now');invoke(legacy,legacyScript,'old_now');legacy.stepOnce()
 check('normal-legacy-Core-frame-step-Rhai-spawnAt-and-old-instantiate-positive-control',()=>{assert.equal(legacyScript.script2D.lastError,null);assert.equal(legacyScript.script2D.properties.calls,2);assert.equal(treeMembers(rootWorld).length,6);assert.equal(legacySpawn.getComponent('Spawner2D').runtimeSpawned.length,1);assert(rootWorld.runtime.state_len()>0)},'positive-control');legacy.stopSession(false)

 for(const entryPoint of ['frame','stepOnce']){
  resetRoot([rootSentinel]);const world=attach(api.createEditorWorld(),`Spawner-${entryPoint}`),source=spawner(`Foreign ${entryPoint}`);world.entities.push(source);const runtime=core(world,`Spawner-${entryPoint}`);runtime.beginSession()
  const rootBefore=inventory(rootWorld),nativeBefore=rootNative(),clearBefore=nativeCalls.filter(item=>item.owner==='Editor-root').length
  if(entryPoint==='frame')runtime.frame(.11);else runtime.stepOnce()
  observations.push({stage:`actual-foreign-Spawner-${entryPoint}`,foreignMembers:treeMembers(world).map(entity=>entity.uuid),rootBefore,rootAfter:inventory(rootWorld),nativeBefore,nativeAfter:rootNative(),rootClearDelta:nativeCalls.filter(item=>item.owner==='Editor-root').length-clearBefore})
  check(`foreign-Spawner-${entryPoint}-clones-only-own-World-and-preserves-Root-native`,()=>{assert.equal(treeMembers(world).length,2);assert.equal(source.getComponent('Spawner2D').runtimeSpawned[0],treeMembers(world).find(entity=>!entity.parentUuid).uuid);assert.deepEqual(inventory(rootWorld),rootBefore);assert.deepEqual(rootNative(),nativeBefore);assert.equal(nativeCalls.filter(item=>item.owner==='Editor-root').length,clearBefore)});runtime.stopSession(false)
 }

 resetRoot([rootSentinel]);const scriptWorld=attach(api.createEditorWorld(),'Foreign-script'),script=scripted('Foreign actual Rhai',treeRef);scriptWorld.entities.push(script);const scriptedCore=core(scriptWorld,'Foreign-script');scriptedCore.beginSession()
 let rootBefore=inventory(rootWorld),nativeBefore=rootNative(),clearBefore=nativeCalls.filter(item=>item.owner==='Editor-root').length
 invoke(scriptedCore,script,'spawn_now');const spawnedTree=treeMembers(scriptWorld),spawnedRoot=spawnedTree.find(entity=>!entity.parentUuid)
 observations.push({stage:'actual-foreign-Rhai-spawnAt',scriptError:script.script2D.lastError,calls:script.script2D.properties.calls,foreignClones:spawnedTree.map(entity=>({uuid:entity.uuid,parent:entity.parentUuid,position:copy(entity.transform.position),rotation:entity.transform.rotation,scale:copy(entity.transform.scale)})),pendingResolutions:[...scriptedCore.pendingHandleResolutions],originalCanonicalRotation:api.normalizeAngle(.6)})
 check('actual-foreign-Rhai-spawnAt-pending-handle-mutation-stays-in-fixed-World',()=>{assert.equal(script.script2D.lastError,null);assert.equal(script.script2D.properties.calls,1);assert.equal(spawnedTree.length,2);assert.deepEqual(api.worldTransform(spawnedRoot,scriptWorld.entities).position,{x:31,y:17});assert.equal(spawnedRoot.transform.rotation,api.normalizeAngle(.6));assert.equal(spawnedRoot.transform.scale.x,-2);assert.equal(spawnedRoot.ownership,'Runtime');assert.equal(spawnedRoot.runtimePersistence,'Transient');assert.deepEqual(inventory(rootWorld),rootBefore);assert.deepEqual(rootNative(),nativeBefore);assert.equal(nativeCalls.filter(item=>item.owner==='Editor-root').length,clearBefore)})
 const treeBefore=treeMembers(scriptWorld).length;invoke(scriptedCore,script,'old_now');const newTree=treeMembers(scriptWorld).slice(treeBefore),newRoot=newTree.find(entity=>!entity.parentUuid),newConnection=scriptWorld.connections.find(value=>value.anchors.some(anchor=>newTree.some(entity=>entity.id===anchor.entityId)))
 observations.push({stage:'actual-foreign-Rhai-old-instantiate',clones:newTree.map(entity=>({id:entity.id,uuid:entity.uuid,parent:entity.parentUuid,owner:entity.ownerUuid,instance:entity.prefabInstanceUuid,source:entity.prefabSourceUuid})),connection:newConnection?{id:newConnection.id,uuid:newConnection.uuid,anchors:copy(newConnection.anchors)}:null})
 check('old-Rhai-instantiate-preserves-parent-connection-remap-and-prefab-metadata-in-own-World',()=>{assert.equal(script.script2D.lastError,null);assert.equal(newTree.length,2);assert(newRoot);assert.equal(newTree.find(entity=>entity!==newRoot).parentUuid,newRoot.uuid);assert(newConnection);assert(newConnection.anchors.every(anchor=>newTree.some(entity=>entity.id===anchor.entityId)));assert(newTree.every(entity=>entity.ownerUuid===newRoot.uuid&&entity.prefabInstanceUuid===newRoot.prefabInstanceUuid));assert.deepEqual(inventory(rootWorld),rootBefore);assert.deepEqual(rootNative(),nativeBefore)})
 const parent=make('Foreign parent',10),child=make('Target child',1);child.parentUuid=parent.uuid;scriptWorld.entities.push(parent,child)
 invoke(scriptedCore,script,'mutate_now');observations.push({stage:'actual-foreign-parent-target-mutation',parent:copy(parent.transform.position),childLocal:copy(child.transform.position),childWorld:api.worldTransform(child,scriptWorld.entities).position,rootUnchanged:JSON.stringify(inventory(rootWorld))===JSON.stringify(rootBefore),nativeRootUnchanged:JSON.stringify(rootNative())===JSON.stringify(nativeBefore)});check('actual-foreign-target-handle-mutation-uses-own-parent-transform-and-native-invalidation',()=>{assert.equal(script.script2D.lastError,null);assert.deepEqual(api.worldTransform(child,scriptWorld.entities).position,{x:40,y:0});assert.equal(child.transform.position.x,30);assert.deepEqual(inventory(rootWorld),rootBefore);assert.deepEqual(rootNative(),nativeBefore)});scriptedCore.stopSession(false)

 // Both Core sessions install real per-session clocks and destruction hooks; no substitute services.
 const editorPool=poolEntity('Root pool control');resetRoot([rootSentinel,editorPool])
 const aWorld=attach(api.createEditorWorld(),'Pool-A'),bWorld=attach(api.createEditorWorld(),'Pool-B'),aPool=poolEntity('Pool owner A'),bPool=poolEntity('Pool owner B'),aScript=scripted('A pool Rhai',poolRef),bScript=scripted('B pool Rhai',poolRef)
 aWorld.entities.push(aPool,aScript);bWorld.entities.push(bPool,bScript);const a=core(aWorld,'Pool-A'),b=core(bWorld,'Pool-B');a.beginSession();a.frame(.11);a.frame(.11);a.frame(.11);b.beginSession()
 invoke(a,aScript,'acquire_now');invoke(b,bScript,'acquire_now');const aLocal=activeMembers(aWorld)[0],bLocal=activeMembers(bWorld)[0],aActual=aLocal??activeMembers(rootWorld)[0],hookStart=hookCalls.length
 let releaseResult=null;if(aActual)releaseResult=poolApi(a).releasePooled(aActual)
 observations.push({stage:'actual-two-Core-pools-and-release-hooks',A:diag(a),B:diag(b),Alocal:aLocal?.uuid??null,Blocal:bLocal?.uuid??null,releaseResult,hooks:hookCalls.slice(hookStart),rootMembers:activeMembers(rootWorld).map(entity=>entity.uuid)})
 check('two-real-Core-pools-own-their-instances-and-release-calls-only-own-Core-hook',()=>{assert(aLocal&&bLocal);assert.notEqual(aLocal,bLocal);assert.equal(releaseResult,true);assert(hookCalls.slice(hookStart).some(item=>item.runtime==='Pool-A'&&item.uuid===aLocal.uuid));assert(!hookCalls.slice(hookStart).some(item=>item.runtime==='Pool-B'));assert.equal(bLocal.enabled,true);assert.equal(activeMembers(rootWorld).length,0)})
 invoke(a,aScript,'again_now');const acquiredForClock=activeMembers(aWorld)[0]??activeMembers(rootWorld)[0];aPool.getComponent('ObjectPool2D').maximumLifetime=.15;editorPool.getComponent('ObjectPool2D').maximumLifetime=.15;a.frame(.11)
 observations.push({stage:'real-Core-different-clock-acquisition',Aelapsed:a.time.value.elapsed,Belapsed:b.time.value.elapsed,memberUuid:acquiredForClock?.uuid??null,memberEnabled:acquiredForClock?.enabled??null,A:diag(a),B:diag(b)})
 check('A-pool-acquisition-uses-A-clock-after-B-begin-and-does-not-expire-before-own-lifetime',()=>{assert(acquiredForClock);assert(aWorld.entities.includes(acquiredForClock));assert.equal(acquiredForClock.enabled,true);assert(a.time.value.elapsed>b.time.value.elapsed);assert.equal(diag(a)[0].active,1)})
 // Establish a live lease in both cohorts after the independent clock failure check.
 // This avoids calling an already-expired before lease evidence of B.stop damage.
 aPool.getComponent('ObjectPool2D').maximumLifetime=0;editorPool.getComponent('ObjectPool2D').maximumLifetime=0
 if(acquiredForClock)poolApi(a).releasePooled(acquiredForClock);invoke(a,aScript,'again_now')
 const aBeforeStop=diag(a),aInventory=inventory(aWorld);b.stopSession(false)
 observations.push({stage:'actual-B-stop-A-pool',Aactive:a.isActive,Abefore:aBeforeStop,Aafter:diag(a),membershipPreserved:JSON.stringify(inventory(aWorld))===JSON.stringify(aInventory)})
 check('actual-B-stop-reset-does-not-clear-A-pool-lease-or-membership',()=>{assert.equal(aBeforeStop[0]?.active,1);assert.deepEqual(diag(a),aBeforeStop);assert.deepEqual(inventory(aWorld),aInventory);assert.equal(a.isActive,true)});a.stopSession(false)

 // A normal legacy Core exercises reuse, stale pending handles and exceptional release cleanup.
 const normalPool=poolEntity('Normal pool'),normalScript=scripted('Normal pool script',poolRef);resetRoot([normalPool,normalScript]);const normal=core(rootWorld,'Normal-pool',true);normal.beginSession();invoke(normal,normalScript,'acquire_now')
 const firstLease=activeMembers(rootWorld)[0];assert(firstLease,'Normal actual pooled lease missing');const oldGeneration=api.entityLifetimeGeneration(firstLease)
 normal.queueEntityRemoval(firstLease,true);normal.flushEntityCommands();invoke(normal,normalScript,'again_now');const secondLease=activeMembers(rootWorld)[0],positionBeforeStale=copy(secondLease?.transform.position);invoke(normal,normalScript,'stale_now')
 observations.push({stage:'normal-Core-Rhai-stale-pending-handle-after-pooled-reuse',sameRawEntity:api.toRaw(firstLease)===api.toRaw(secondLease),oldGeneration,newGeneration:api.entityLifetimeGeneration(secondLease),positionBefore:positionBeforeStale,positionAfter:copy(secondLease.transform.position),scriptError:normalScript.script2D.lastError})
 check('normal-Core-pool-reuses-one-object-and-real-Rhai-old-pending-handle-cannot-mutate-new-lifetime',()=>{assert.equal(api.toRaw(firstLease),api.toRaw(secondLease));assert(api.entityLifetimeGeneration(secondLease)>oldGeneration);assert.deepEqual(secondLease.transform.position,positionBeforeStale);assert.equal(diag(normal)[0].allocated,1);assert.equal(diag(normal)[0].active,1)},'positive-control')
 const actualDestroy=normal.runDestructionCallbacks,marker=new Error('ACTUAL_CORE_RELEASE_CALLBACK_FAILURE'),callsBefore=hookCalls.length;let faultCalls=0
 normal.runDestructionCallbacks=function(entity,...args){faultCalls++;const value=actualDestroy.call(this,entity,...args);throw marker}
 let caught=null;normal.queueEntityRemoval(secondLease,true);try{normal.flushEntityCommands()}catch(error){caught=error}normal.runDestructionCallbacks=actualDestroy;normal.flushEntityCommands()
 observations.push({stage:'actual-Core-pool-callback-failure',exceptionIdentityPreserved:caught===marker,faultCalls,actualHookCalls:hookCalls.length-callsBefore,memberEnabled:secondLease.enabled,lifetimeActive:api.entityLifetimeActive(secondLease),pool:diag(normal)})
 check('real-Core-release-callback-failure-preserves-exception-and-performs-single-pool-cleanup',()=>{assert.equal(caught,marker);assert.equal(faultCalls,1);assert.equal(hookCalls.length-callsBefore,1);assert.equal(secondLease.enabled,false);assert.equal(api.entityLifetimeActive(secondLease),false);assert.equal(diag(normal)[0].active,0);assert.equal(poolApi(normal).releasePooled(secondLease),false)},'positive-control')
 normal.stopSession(false);await Promise.resolve();await Promise.resolve();finished=true
 observations.push({stage:'actual-configuration',settings:copy(api.physicsState.globalSettings),packages:copy(api.packageState.installed),cohort:before?'80d68 + only previously qualified Evidence4 overrides':'current frozen RuntimeObjects integration',remainingOwnership:'Lifetime generation allocation remains process-global; AI/navigation/particles/stream hooks are outside this slice and are not claimed isolated.'})
}catch(error){failure=error.stack??String(error)}
finally{
 for(const [index,runtime]of runtimes.entries()){try{runtime.stopSession(false);cleanup.runtimes.push({index,active:runtime.isActive,inputAttached:runtime.input.attached,vmReleased:runtime.scriptRuntime===null})}catch(error){cleanup.runtimes.push({index,error:String(error)})}}
 for(const restore of restorers.reverse()){try{restore()}catch(error){cleanup.instrumentation.push({error:String(error)})}}
 for(const {world,label}of worlds){try{world.runtime?.free();world.runtime=null;world.wasmLoaded=false;cleanup.worlds.push({label,released:true})}catch(error){cleanup.worlds.push({label,error:String(error)})}}
 const sourceChangesDuringRun=[];for(const [path,hash]of currentHashes)if(sha(await readFile(path))!==hash)sourceChangesDuringRun.push(norm(relative(root,path)))
 if(sourceChangesDuringRun.length)failure=`${failure??''}\nProduction source changed during validation: ${sourceChangesDuringRun.join(', ')}`
 const ownershipFailed=checks.filter(item=>item.scope==='runtime-object-ownership'&&item.status==='FAILED').length,controlsFailed=checks.filter(item=>item.scope==='positive-control'&&item.status==='FAILED').length
 const status=failure||!finished||controlsFailed?'FAILED':ownershipFailed?(before?'BASELINE_RUNTIME_OBJECT_OWNERSHIP_NOT_PASSED':'RUNTIME_OBJECT_OWNERSHIP_NOT_PASSED'):'RUNTIME_OBJECT_OWNERSHIP_VERIFIED'
 hashes['scripts/verify-engine-runtime-objects-core.mjs']={sha256:sha(await readFile(fileURLToPath(import.meta.url))),loadedInSsr:false};hashes['nova_core/pkg/nova_core_bg.wasm']={sha256:baseline.files.find(item=>item.path.endsWith('_bg.wasm')).sha256,executed:true}
 const report={schema:'nova-runtime-objects-core-verification-v1',generatedAt:new Date().toISOString(),mode,status,checks,observations,nativeCalls,hookCalls,sourceHashes:hashes,loadedSources:[...reached].sort().map(path=>norm(relative(root,path))),sourceChangesDuringRun,bundleEvidence,baseline:{sourceRecordSha256:sha(baselineBytes),files:baseline.files.length,originalBuildId:baseline.buildId,originalSourceHash:baseline.sourceHash,manifestSha256:baseline.manifestSha256,qualifiedEvidenceReportSha256:baseline.qualifiedEvidenceReportSha256,explicitOverrides:baseline.overrides},cleanup,environment:{node:process.version,platform:process.platform,architecture:process.arch,execution:'Actual Node SSR Core/Rhai and ordinary WASM, with actual Editor asset/service composition',browser:null,graphicsBackend:null,performanceComparison:false},limitations:['No supplied contact fixture or collision claim; no repeated component physics test.','No GUI/browser/Worker/independent Player/GPU/performance/release qualification.','Global lifetime generations and remaining AI/navigation/particle/stream service ownership are not changed or claimed isolated.','Instrumentation delegates original methods; only release-callback fault deliberately throws the identifiable original marker.','Before executes only the strict immutable175 closure with qualified Evidence4 overrides; it never executes transition workspace production imports.'],failure}
 await writeFile(join(output,'report.json'),JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({mode,status,checks:checks.length,passed:checks.filter(item=>item.status==='PASSED').length,ownershipFailed,controlsFailed,failure,report:join(output,'report.json')}))
 if(failure||!finished||controlsFailed||!before&&ownershipFailed)process.exitCode=1
}
