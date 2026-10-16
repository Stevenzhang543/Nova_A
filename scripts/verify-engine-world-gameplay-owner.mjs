/** Actual WorldGameplay algorithms, original services and ordinary WASM. Functional smoke only. */
import assert from 'node:assert/strict'
import { createHash, webcrypto } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { build } from 'vite'
const root=process.cwd(), phase=process.env.NOVA_WORLD_GAMEPLAY_PHASE??'after', directory=resolve(process.env.NOVA_WORLD_GAMEPLAY_REPORT??`.cache/engine-overhaul/world-gameplay/owner/raw-${phase}`)
assert(['before','after'].includes(phase))
const normal=value=>value.replaceAll('\\','/'), hash=value=>createHash('sha256').update(value).digest('hex'), absolute=path=>JSON.stringify(normal(resolve(path)))
const baseline='.cache/engine-overhaul/world-gameplay/core-integration/before-9c0e', frozenBytes=await readFile(resolve(baseline,'source.json')), frozen=JSON.parse(frozenBytes)
const originals=new Map(), checks=[], failures=[], observations={}, artifacts={}, graphs={}, source={}, worlds=[]
await mkdir(directory,{recursive:true}); await assert.rejects(readFile(resolve(directory,'report.json')),{code:'ENOENT'})
await writeFile(resolve(directory,'verifier.mjs'),await readFile(new URL(import.meta.url)))
for(const row of frozen.files){const bytes=await readFile(resolve(baseline,row.path));assert.equal(hash(bytes),row.sha256);originals.set(normal(resolve(row.path)),bytes)}
const check=async(name,action)=>{try{await action();checks.push({name,status:'PASSED'})}catch(error){const row={name,status:'FAILED',error:String(error.stack??error)};checks.push(row);failures.push(row)}}
const savedGlobals=new Map(['window','document','navigator','crypto'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]))
delete globalThis.window;delete globalThis.document
if(!globalThis.crypto)globalThis.crypto=webcrypto
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform:'Win32',hardwareConcurrency:8}})
async function entry(name,lines){
 const input=resolve(directory,`${name}-entry.ts`), output=resolve(directory,name,'actual.mjs'), ids=[]
 await writeFile(input,lines.join('\n'))
 await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:`world-gameplay-${phase}-${name}`,enforce:'pre',load(id){return phase==='before'?originals.get(normal(id))?.toString('utf8')??null:null},generateBundle(){ids.push(...this.getModuleIds())}}],build:{ssr:true,outDir:dirname(output),emptyOutDir:false,rollupOptions:{input,output:{entryFileNames:'actual.mjs',inlineDynamicImports:true}}}})
 graphs[name]=ids.map(id=>normal(id.startsWith(root)?relative(root,id):id))
 for(const id of ids)if(normal(id).startsWith(normal(root)+'/')&&!id.includes('node_modules')&&/\.(?:ts|js|mjs|json)$/.test(id)){source[`${name}:${normal(relative(root,id))}`]=hash(phase==='before'&&originals.has(normal(id))?originals.get(normal(id)):await readFile(id))}
 artifacts[name]={path:normal(relative(root,output)),sha256:hash(await readFile(output)),buildId:`world-gameplay-functional-${phase}-${name}`}
 return import(pathToFileURL(output).href)
}
let api
try{
 api=await entry('editor',[
  `export * from ${absolute('src/runtime/worldGameplay.ts')};`,
  ...(phase==='after'?[`export * from ${absolute('src/editor/worldGameplayAdapter.ts')};`,`export * from ${absolute('src/runtime/worldGameplayOwner.ts')};`]:[]),
  `export { physicsState,sceneManager,createEditorWorld,serializeEntity } from ${absolute('src/store/physics.ts')};`,
  `export { World } from ${absolute('src/world/World.ts')};`, `export { BoxEntity } from ${absolute('src/world/BoxEntity.ts')};`,
  `export { Entity } from ${absolute('src/world/Entity.ts')};`, `export { CharacterBody2D,Area2D,AreaEffector2D,Portal2D } from ${absolute('src/world/components.ts')};`,
  `export { RuntimeSceneStreaming } from ${absolute('src/runtime/runtimeSceneStreaming.ts')};`,
  `export { default as initWasm,WasmRuntimeWorld } from ${absolute('nova_core/pkg/nova_core.js')};`,
  `export { watch,nextTick,reactive,toRaw } from 'vue';`
 ])
 await api.initWasm({module_or_path:await readFile(resolve('nova_core/pkg/nova_core_bg.wasm'))})
 const world=api.physicsState.world;world.runtime=new api.WasmRuntimeWorld();world.wasmLoaded=true;worlds.push(world)
 const entities=(...values)=>{world.entities.splice(0,world.entities.length,...values);world.invalidateRuntime()}
 const box=(id,position={x:0,y:0})=>{const value=new api.BoxEntity(id,position,{x:1,y:1});value.uuid=`world-gameplay-${id}`;return value}
 await check(`${phase}-fifteen-defaults-settings-clamps-and-runtime-reset-preserves-config`,()=>{
  assert.deepEqual(Object.keys(api.worldGameplayState),['navigationDebug','aiDebug','simulationDebug','areaDebug','chunkDebug','streamingEnabled','memoryBudgetMb','originShiftThreshold','originOffset','originShiftCount','lastOriginShift','loadedChunks','usedMemoryMb','pendingStreams','lastError'])
  api.loadWorldGameplaySettings({navigationDebug:true,aiDebug:true,simulationDebug:true,areaDebug:true,chunkDebug:true,streamingEnabled:false,memoryBudgetMb:Infinity,originShiftThreshold:-1})
  assert.deepEqual(api.serializeWorldGameplaySettings(),{navigationDebug:true,aiDebug:true,simulationDebug:true,areaDebug:true,chunkDebug:true,streamingEnabled:false,memoryBudgetMb:256,originShiftThreshold:1})
  api.worldGameplayState.originShiftCount=5;api.worldGameplayState.lastError='prior';api.resetWorldGameplay();assert.equal(api.worldGameplayState.navigationDebug,true);assert.equal(api.worldGameplayState.streamingEnabled,false);assert.equal(api.worldGameplayState.originShiftThreshold,1);assert.equal(api.worldGameplayState.originShiftCount,0);assert.equal(api.worldGameplayState.lastError,'');api.loadWorldGameplaySettings({})
 })
 await check(`${phase}-character-request-consumed-once-by-real-solver-and-coyote-semantics`,()=>{
  const character=box(710);const body=character.addComponent(new api.CharacterBody2D());entities(character)
  assert.equal(api.queueCharacterMotion(character,{x:2,y:0}),true);assert.equal(api.queueCharacterMotion(character,{x:Infinity,y:0}),true)
  const trace=[];api.beforeWorldPhysicsStep(1/60,1,1,(...args)=>trace.push(args))
  assert.deepEqual(body.requestedMotion,{x:0,y:0});assert.equal(character.transform.position.x,2);assert.deepEqual(character.velocity,{x:0,y:0});body.secondsSinceFloor=body.coyoteTime;assert.equal(api.canUseCoyoteTime(character),true);body.secondsSinceFloor+=.001;assert.equal(api.canUseCoyoteTime(character),false)
  observations.character={position:{...character.transform.position},motionVelocity:{...body.motionVelocity},requested:{...body.requestedMotion},signals:trace}
 })
 await check(`${phase}-origin-shift-real-world-hierarchy-camera-signs-and-counters`,()=>{
  api.resetWorldGameplay();const parent=box(711,{x:20,y:-30}),child=box(712,{x:3,y:4});child.parentUuid=parent.uuid;entities(parent,child)
  api.physicsState.camera.scale=2;api.physicsState.camera.offset={x:100,y:200};api.physicsState.camera.targetOffset={x:300,y:400}
  api.shiftWorldOrigin({x:10,y:-5});assert.deepEqual(parent.transform.position,{x:10,y:-25});assert.deepEqual(child.transform.position,{x:3,y:4});assert.deepEqual(api.physicsState.camera.offset,{x:120,y:210});assert.deepEqual(api.physicsState.camera.targetOffset,{x:320,y:410});assert.deepEqual(api.worldGameplayState.originOffset,{x:10,y:-5});assert.equal(api.worldGameplayState.originShiftCount,1)
  observations.origin={parent:{...parent.transform.position},child:{...child.transform.position},offset:{...api.physicsState.camera.offset},targetOffset:{...api.physicsState.camera.targetOffset},origin:{...api.worldGameplayState.originOffset}}
 })
 await check(`${phase}-portal-prefetch-installs-real-scene-and-retains-stale-task-counterexample`,async()=>{
  api.resetWorldGameplay();const portal=box(713,{x:100,y:100});const component=portal.addComponent(new api.Portal2D());component.preload=true;component.targetSceneUuid='world-gameplay-stream';component.targetPortal='exit';entities(portal)
  const authored=box(714,{x:10,y:20});const scene={uuid:component.targetSceneUuid,name:'Owner fixture',loaded:false,data:{entities:[api.serializeEntity(authored)],connections:[]}}
  api.sceneManager.scenes.push(scene);const scheduled=[],executed=[],setOwnerCalls=[],nativeQueue=globalThis.queueMicrotask,originalSetOwner=api.RuntimeSceneStreaming.prototype.setOwner;let active=0,sequence=0
  globalThis.queueMicrotask=callback=>{const id=++sequence;scheduled.push(id);nativeQueue(()=>{active=id;executed.push(id);try{callback()}finally{active=0}})}
  api.RuntimeSceneStreaming.prototype.setOwner=function(...args){setOwnerCalls.push({task:active,args});return originalSetOwner.apply(this,args)}
  try{
   api.beforeWorldPhysicsStep(1/60,2,2,()=>{});api.resetWorldGameplay();api.beforeWorldPhysicsStep(1/60,3,3,()=>{});await new Promise(resolve=>nativeQueue(resolve))
   assert.equal(api.inspectStreamedScenes()[0].entities,1);assert.equal(scene.loaded,true);assert.deepEqual(setOwnerCalls.map(row=>row.task),[scheduled[0]]);assert.equal(executed.length,2)
   observations.staleQueue={status:'CONFIRMED_RETAINED',scheduled,executed,setOwnerCalls,explanation:'Old callback consumes the fresh same-UUID queue value after reset; ownership-only migration preserves this counterexample.'}
   api.finishWorldSceneTransition();assert.deepEqual(api.inspectStreamedScenes(),[]);assert.equal(scene.loaded,false)
  }finally{globalThis.queueMicrotask=nativeQueue;api.RuntimeSceneStreaming.prototype.setOwner=originalSetOwner;api.resetWorldGameplay();api.sceneManager.scenes.splice(api.sceneManager.scenes.indexOf(scene),1)}
 })
 if(phase==='after'){
  await check('same-raw-editor-core-factory-lazy-single-owner-and-deep-watch',async()=>{
   const owner=api.getEditorWorldGameplayOwner(),host={get state(){return api.physicsState},get activeSceneUuid(){return api.sceneManager.activeSceneUuid}}
   assert.equal(api.createEditorWorldGameplayOwner(host,{legacyRoot:true}),owner);assert.equal(owner.state,api.worldGameplayState);assert.equal(api.toRaw(owner.state),api.getLegacyWorldGameplayRawState());let changed=0;const stop=api.watch(()=>api.worldGameplayState.originOffset,()=>changed++,{deep:true})
   try{owner.state.originOffset.x=9;await api.nextTick();assert.equal(changed,1);api.worldGameplayState.originOffset.y=4;await api.nextTick();assert.equal(changed,2)}finally{stop();owner.resetWorldGameplay()}
  })
  await check('explicit-host-cache-world-replacement-and-same-world-different-camera-do-not-retarget',()=>{
   const firstWorld=new api.World(),secondWorld=new api.World(),state={world:firstWorld,camera:{scale:1,offset:{x:0,y:0}}},host={state,activeSceneUuid:'custom'},other={state:{world:firstWorld,camera:{scale:3,offset:{x:7,y:8}}},activeSceneUuid:'other'}
   const first=api.createEditorWorldGameplayOwner(host,{legacyRoot:false}),another=api.createEditorWorldGameplayOwner(other,{legacyRoot:false});assert.equal(api.createEditorWorldGameplayOwner(host,{legacyRoot:false}),first);assert.notEqual(first,another);assert.notEqual(first.state,api.worldGameplayState);assert.notEqual(first.state,another.state)
   state.world=secondWorld;const next=api.createEditorWorldGameplayOwner(host,{legacyRoot:false});assert.notEqual(next,first);assert.equal(first.world,firstWorld);assert.equal(next.world,secondWorld);assert.throws(()=>first.shiftWorldOrigin({x:0,y:0}),/WORLD_GAMEPLAY_HOST_WORLD_CHANGED/)
  })
  const pure=await entry('pure',[`export * from ${absolute('src/runtime/worldGameplayOwner.ts')};`,`export * from ${absolute('src/runtime/worldGameplay.ts')};`,`export { World } from ${absolute('src/world/World.ts')};`,`export { reactive,toRaw } from 'vue';`])
  await check('missing-real-services-and-legacy-port-explicit-one-time-same-raw',()=>{
   assert.throws(()=>new pure.WorldGameplayOwner({world:new pure.World(),camera:{scale:1,offset:{x:0,y:0}},activeSceneUuid:'x'},{}),/WORLD_GAMEPLAY_PORTS_REQUIRED/);assert.throws(()=>pure.resetWorldGameplay(),/WORLD_GAMEPLAY_LEGACY_PORT_REQUIRED/)
   const raw=pure.getLegacyWorldGameplayRawState(),view=pure.reactive(raw),owner=api.getEditorWorldGameplayOwner();let calls=0;const getter=()=>{calls++;return owner};assert.throws(()=>pure.installLegacyWorldGameplayPort({stateView:{...raw},unwrapState:pure.toRaw,getOwner:getter}),/WORLD_GAMEPLAY_SAME_RAW_REQUIRED/)
   const port={stateView:view,unwrapState:pure.toRaw,getOwner:getter};pure.installLegacyWorldGameplayPort(port);pure.installLegacyWorldGameplayPort(port);assert.equal(calls,0);assert.equal(pure.worldGameplayState,view);assert.throws(()=>pure.installLegacyWorldGameplayPort({...port,getOwner:()=>owner}),/WORLD_GAMEPLAY_LEGACY_PORT_ALREADY_INSTALLED/)
  })
  await entry('owner-only',[`export { WorldGameplayOwner,createInitialWorldGameplayState } from ${absolute('src/runtime/worldGameplayOwner.ts')};`])
  await check('pure-source-and-emitted-owner-closure-no-vue-editor-store-dom-clock',async()=>{
   assert.equal(graphs['owner-only'].some(path=>/(?:src\/(?:editor|store)\/|node_modules\/.*(?:vue|pinia))/.test(path)),false)
   for(const path of ['src/runtime/worldGameplayOwner.ts','src/runtime/worldGameplay.ts']){const text=await readFile(path,'utf8');assert.equal(/\b(?:window|document|requestAnimationFrame|setInterval|setTimeout|performance\.now)\b/.test(text),false);assert.equal(/(?:from|import\()\s*['"](?:vue|pinia|.*(?:store|editor)\/)/.test(text),false)}
  })
  await check('all-twenty-three-original-math-order-and-reset-bodies-exact-inverse',async()=>{
   const beforeText=originals.get(normal(resolve('src/runtime/worldGameplay.ts'))).toString('utf8').replaceAll('\r\n','\n'),afterText=(await readFile('src/runtime/worldGameplayOwner.ts','utf8')).replaceAll('\r\n','\n'),contract=JSON.parse(await readFile('.cache/engine-overhaul/world-gameplay/owner/body-migration.json'))
   const beforeTree=ts.createSourceFile('before.ts',beforeText,ts.ScriptTarget.Latest,true),afterTree=ts.createSourceFile('after.ts',afterText,ts.ScriptTarget.Latest,true),beforeBodies=new Map(),afterBodies=new Map()
   for(const statement of beforeTree.statements)if(ts.isFunctionDeclaration(statement)&&statement.name&&statement.body)beforeBodies.set(statement.name.text,statement.body.getText(beforeTree))
   for(const statement of afterTree.statements)if(ts.isClassDeclaration(statement))for(const method of statement.members)if(ts.isMethodDeclaration(method)&&method.body&&ts.isIdentifier(method.name))afterBodies.set(method.name.text,method.body.getText(afterTree).replaceAll('\n  ','\n'))
   observations.inverseBodies=[];assert.equal(beforeBodies.size,23)
   for(const [name,original]of beforeBodies){let restored=afterBodies.get(name).replace(contract.newConstructor,'__SCENE_FACTORY__');for(const local of contract.localCalls)restored=restored.replaceAll('this.'+local+'(',local+'(');for(const [old,current]of [...contract.replacements].reverse())restored=restored.replaceAll(current,old);restored=restored.replace('__SCENE_FACTORY__',contract.originalConstructor);assert.equal(restored,original,name);observations.inverseBodies.push({name,before:hash(original),inverse:hash(restored)})}
  })
  await check('actual-before-after-common-observations-identical',async()=>{const previous=JSON.parse(await readFile(process.env.NOVA_WORLD_GAMEPLAY_BASELINE_REPORT??'.cache/engine-overhaul/world-gameplay/owner/raw-before/report.json'));assert.equal(previous.failures.length,0);for(const key of ['character','origin','staleQueue'])assert.deepEqual(observations[key],previous.observations[key])})
 }
}catch(error){failures.push({name:'module-bootstrap',error:String(error.stack??error)})}
finally{for(const world of worlds){try{api?.resetWorldGameplay();world.runtime?.free();world.runtime=null}catch(error){failures.push({name:'cleanup',error:String(error.stack??error)})}}for(const[key,descriptor]of savedGlobals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
const report={schema:'nova-world-gameplay-owner-functional-v1',phase,status:failures.length?'FAILED':'VERIFIED_FUNCTIONAL_SMOKE',checks,failures,observations,artifacts,graphs,source,frozenBaselineBuildId:frozen.buildId,frozenSourceSha256:hash(frozenBytes),scriptSha256:hash(await readFile(new URL(import.meta.url))),node:process.version,limits:['Original real services and ordinary WASM; Node platform surfaces, no GUI or performance benchmark.','Ownership-only body migration. Unversioned async stream/AI continuations and global service Owners remain unresolved.','Direct world ownership does not qualify independent sessions or whole M1.']}
await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase,status:report.status,passed:checks.filter(row=>row.status==='PASSED').length,failures:failures.length,report:normal(relative(root,resolve(directory,'report.json')))}));if(failures.length)process.exitCode=1
