/** Actual service/scene/WASM regression for the narrow stream-generation repair. */
import assert from 'node:assert/strict'
import { createHash,webcrypto } from 'node:crypto'
import { readFile,writeFile,mkdir } from 'node:fs/promises'
import { resolve,relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import { canonicalWorldGameplayBeforeComponents, canonicalEditorWorldGameplayBeforeComponents } from './lib/gameplayComponentsOwnerContract.mjs'
const root=process.cwd(),before=process.argv.includes('--before'),phase=before?'before':'after',normal=value=>value.replaceAll('\\','/'),hash=value=>createHash('sha256').update(value).digest('hex')
const base='.cache/engine-overhaul/world-gameplay/owner',directory=resolve(process.env.NOVA_WORLD_GAMEPLAY_STREAM_REPORT??`${base}/stream-raw-${phase}`),originals=new Map(),checks=[],observations={},source={},worlds=[]
await mkdir(directory,{recursive:true});await assert.rejects(readFile(resolve(directory,'report.json')),{code:'ENOENT'});await writeFile(resolve(directory,'verifier.mjs'),await readFile(new URL(import.meta.url)))
const paired={'src/runtime/worldGameplayOwner.ts':`${base}/phase2-before/worldGameplayOwner.ts`,'src/editor/worldGameplayAdapter.ts':`${base}/phase2-before/worldGameplayAdapter.ts`}
for(const[path,saved]of Object.entries(paired))originals.set(normal(resolve(path)),await readFile(saved,'utf8'))
const target=async(name,action)=>{try{await action();checks.push({name,status:'PASSED'})}catch(error){checks.push({name,status:'FAILED',error:String(error.stack??error)})}}
const savedGlobals=new Map(['window','document','navigator','crypto'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));delete globalThis.window;delete globalThis.document;if(!globalThis.crypto)globalThis.crypto=webcrypto;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{platform:'Win32',hardwareConcurrency:8}})
const absolute=path=>JSON.stringify(normal(resolve(path))),ids=[],input=resolve(directory,'entry.ts'),output=resolve(directory,'actual.mjs')
let api,artifact
try{
 await writeFile(input,[
  `export * from ${absolute('src/runtime/worldGameplayOwner.ts')};`,`export * from ${absolute('src/runtime/worldGameplay.ts')};`,`export * from ${absolute('src/editor/worldGameplayAdapter.ts')};`,
  `export { physicsState,sceneManager,serializeEntity } from ${absolute('src/store/physics.ts')};`,`export { BoxEntity } from ${absolute('src/world/BoxEntity.ts')};`,
  `export { Portal2D } from ${absolute('src/world/components.ts')};`,`export { RuntimeSceneStreaming } from ${absolute('src/runtime/runtimeSceneStreaming.ts')};`,
  `export { navigationDebugPaths } from ${absolute('src/runtime/navigation2d.ts')};`,`export { tileSceneRuntimeState } from ${absolute('src/runtime/tileSceneRuntime.ts')};`,
  `export { default as initWasm,WasmRuntimeWorld } from ${absolute('nova_core/pkg/nova_core.js')};`,`export { toRaw } from 'vue';`
 ].join('\n'))
 await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'actual-stream-generation-pair',enforce:'pre',load(id){return before?originals.get(normal(id))??null:null},generateBundle(){ids.push(...this.getModuleIds())}}],build:{ssr:true,outDir:directory,emptyOutDir:false,rollupOptions:{input,output:{entryFileNames:'actual.mjs',inlineDynamicImports:true}}}})
 for(const id of ids)if(normal(id).startsWith(normal(root)+'/')&&!id.includes('node_modules')&&/\.(?:ts|js|mjs|json)$/.test(id))source[normal(relative(root,id))]=hash(before&&originals.has(normal(id))?originals.get(normal(id)):await readFile(id))
 artifact={path:normal(relative(root,output)),sha256:hash(await readFile(output)),buildId:`world-gameplay-stream-functional-${phase}`}
 api=await import(pathToFileURL(output).href);await api.initWasm({module_or_path:await readFile(resolve('nova_core/pkg/nova_core_bg.wasm'))})
 const world=api.physicsState.world;world.runtime=new api.WasmRuntimeWorld();world.wasmLoaded=true;worlds.push(world);const owner=api.getEditorWorldGameplayOwner()
 const portal=new api.BoxEntity(721,{x:100,y:100},{x:1,y:1});portal.uuid='stream-generation-portal';const component=portal.addComponent(new api.Portal2D());component.preload=true;component.targetSceneUuid='stream-generation-scene'
 const decoded=new api.BoxEntity(722,{x:10,y:20},{x:1,y:1});decoded.uuid='stream-generation-decoded';const scene={uuid:component.targetSceneUuid,name:'Stream generation fixture',loaded:false,data:{entities:[api.serializeEntity(decoded)],connections:[]}}
 api.sceneManager.scenes.push(scene);world.entities.splice(0,world.entities.length,portal);world.invalidateRuntime();owner.loadWorldGameplaySettings({})
 const nativeQueue=globalThis.queueMicrotask,originalSetOwner=api.RuntimeSceneStreaming.prototype.setOwner
 let active=0,sequence=0,scheduled=[],executed=[],calls=[]
 globalThis.queueMicrotask=callback=>{const task=++sequence;scheduled.push(task);nativeQueue(()=>{active=task;executed.push(task);try{callback()}finally{active=0}})}
 api.RuntimeSceneStreaming.prototype.setOwner=function(...args){calls.push({task:active,args,pendingAtCall:owner.state.pendingStreams});return originalSetOwner.apply(this,args)}
 const drain=()=>new Promise(resolve=>nativeQueue(resolve)),step=()=>owner.beforeWorldPhysicsStep(1/60,1,1,()=>{}),prepare=()=>{owner.resetWorldGameplay();scheduled=[];executed=[];calls=[];component.preload=true;component.targetSceneUuid=scene.uuid;scene.loaded=false}
 try{
  await target('actual-navigation-selector-same-original-map-order-reference-and-tile-view',()=>{
   const previous=[...api.navigationDebugPaths];api.navigationDebugPaths.clear();const a={entityUuid:'a',points:[{x:1,y:2}],status:'Ready'},b={entityUuid:'b',points:[],status:'Unreachable'};api.navigationDebugPaths.set('a',a);api.navigationDebugPaths.set('b',b)
   try{const selected=owner.navigationPaths();assert.deepEqual(selected,[a,b]);assert.equal(selected[0],a);assert.equal(selected[1],b);assert.equal(owner.tileSceneRuntimeSnapshot(),api.tileSceneRuntimeState);observations.selectors={order:selected.map(row=>row.entityUuid),originalReferences:true}}finally{api.navigationDebugPaths.clear();for(const[key,value]of previous)api.navigationDebugPaths.set(key,value)}
  })
  await target('reset-cancels-old-task-without-creating-lease-or-changing-new-error',async()=>{
   prepare();step();assert.equal(owner.state.pendingStreams,1);owner.resetWorldGameplay();owner.state.lastError='current-reset-sentinel';await drain();observations.resetOnly={scheduled,executed,calls,pending:owner.state.pendingStreams,error:owner.state.lastError,inspect:owner.inspectStreamedScenes()};assert.deepEqual(calls,[]);assert.equal(scene.loaded,false);assert.deepEqual(owner.inspectStreamedScenes(),[]);assert.equal(owner.state.pendingStreams,0);assert.equal(owner.state.lastError,'current-reset-sentinel')
  })
  await target('reset-then-same-uuid-fresh-request-only-new-task-installs-real-scene',async()=>{
   prepare();step();owner.resetWorldGameplay();step();const oldTask=scheduled[0],freshTask=scheduled[1];assert.notEqual(oldTask,freshTask);assert.equal(owner.state.pendingStreams,1);await drain();observations.resetFresh={scheduled,executed,calls,pending:owner.state.pendingStreams,inspect:owner.inspectStreamedScenes()};assert.deepEqual(calls.map(row=>row.task),[freshTask]);assert.equal(owner.state.pendingStreams,0);assert.equal(owner.inspectStreamedScenes()[0].entities,1);assert.equal(scene.loaded,true)
  })
  await target('scene-finish-then-same-uuid-fresh-request-stale-task-cannot-delete-new-queue',async()=>{
   prepare();step();owner.finishWorldSceneTransition();step();const freshTask=scheduled[1];await drain();observations.finishFresh={scheduled,executed,calls,pending:owner.state.pendingStreams,inspect:owner.inspectStreamedScenes()};assert.deepEqual(calls.map(row=>row.task),[freshTask]);assert.equal(owner.state.pendingStreams,0);assert.equal(owner.inspectStreamedScenes()[0].entities,1)
  })
  await target('scene-finish-stale-error-cannot-touch-current-state-or-world',async()=>{
   prepare();component.targetSceneUuid='missing-stream-generation';step();owner.finishWorldSceneTransition();owner.state.lastError='current-finish-sentinel';const pendingBefore=owner.state.pendingStreams;await drain();observations.finishOnly={scheduled,executed,calls,pendingBefore,pendingAfter:owner.state.pendingStreams,error:owner.state.lastError};assert.deepEqual(calls,[]);assert.equal(owner.state.lastError,'current-finish-sentinel');assert.equal(pendingBefore,0);assert.equal(owner.state.pendingStreams,0);assert.deepEqual(owner.inspectStreamedScenes(),[])
  })
  await target('same-generation-original-latest-value-coalescing-and-real-unload-retained',async()=>{
   prepare();step();await drain();assert.equal(scene.loaded,true);calls=[];scheduled=[];executed=[]
   component.preload=false;step();component.preload=true;step();const firstTask=scheduled[0];await drain();observations.sameGeneration={scheduled,executed,calls};assert.deepEqual(calls.map(row=>row.task),[firstTask]);assert.equal(calls[0].args[2],true);assert.equal(scene.loaded,true)
   calls=[];component.preload=false;step();await drain();assert.equal(calls[0].args[2],false);assert.equal(scene.loaded,false);assert.deepEqual(owner.inspectStreamedScenes(),[])
  })
  await target('nullable-live-camera-targetOffset-remains-accepted-with-real-origin-shift',()=>{
   prepare();api.physicsState.camera.scale=2;api.physicsState.camera.offset={x:20,y:30};api.physicsState.camera.targetOffset=null;owner.shiftWorldOrigin({x:1,y:2});assert.deepEqual(api.physicsState.camera.offset,{x:22,y:26});assert.equal(api.physicsState.camera.targetOffset,null)
  })
 }finally{await drain();globalThis.queueMicrotask=nativeQueue;api.RuntimeSceneStreaming.prototype.setOwner=originalSetOwner;owner.resetWorldGameplay();api.sceneManager.scenes.splice(api.sceneManager.scenes.indexOf(scene),1)}
 if(!before)await target('whole-owner-and-adapter-inverse-only-exact-approved-type-selector-generation-edits',async()=>{
  const original=originals.get(normal(resolve('src/runtime/worldGameplayOwner.ts'))),actual=await canonicalWorldGameplayBeforeComponents(await readFile('src/runtime/worldGameplayOwner.ts','utf8'))
  const edits=[['targetOffset?: Vec2','targetOffset?: Vec2 | null'],['[...navigationRuntime.navigationDebugPaths.values()]','[...this.ports.navigation.navigationDebugPaths.values()]'],['  private sceneStreamQueue = new Map<string, boolean>()\n','  private sceneStreamQueue = new Map<string, boolean>()\n  private streamGeneration = 0\n'],['    this.sceneStreamQueue.set(uuid, loaded); this.state.pendingStreams = this.sceneStreamQueue.size\n','    this.sceneStreamQueue.set(uuid, loaded); this.state.pendingStreams = this.sceneStreamQueue.size\n    const generation = this.streamGeneration\n'],['      const value = this.sceneStreamQueue.get(uuid);','      if (generation !== this.streamGeneration) return\n      const value = this.sceneStreamQueue.get(uuid);'],['  finishWorldSceneTransition(): void {\n','  finishWorldSceneTransition(): void {\n    this.streamGeneration++\n'],['  resetWorldGameplay(): void {\n','  resetWorldGameplay(): void {\n    this.streamGeneration++\n']]
  edits.push(['this.sceneStreamQueue.clear(); this.prefetchedScenes.clear();','this.sceneStreamQueue.clear(); this.state.pendingStreams = this.sceneStreamQueue.size; this.prefetchedScenes.clear();'])
  let restored=actual.replaceAll('\r\n','\n');for(const[old,current]of [...edits].reverse()){assert.equal(restored.split(current).length-1,1,current);restored=restored.replace(current,old)}assert.equal(restored,original.replaceAll('\r\n','\n'))
  const oldAdapter=originals.get(normal(resolve('src/editor/worldGameplayAdapter.ts'))),newAdapter=await canonicalEditorWorldGameplayBeforeComponents(await readFile('src/editor/worldGameplayAdapter.ts','utf8')),oldExpression='suppliedHost.state !== physicsState',newExpression='(suppliedHost.state as unknown) !== physicsState';assert.equal(newAdapter.replace(newExpression,oldExpression),oldAdapter)
  observations.inverse={ownerOriginalSha256:hash(original),ownerRestoredSha256:hash(restored),exactWholeOwner:true,approvedEdits:edits,adapterOriginalSha256:hash(oldAdapter),exactWholeAdapter:true,all23OriginalBodiesPreservedExceptExplicitGenerationGuardAndSelectorBinding:true}
 })
}catch(error){checks.push({name:'module-bootstrap',status:'FAILED',error:String(error.stack??error)})}
finally{for(const world of worlds){try{world.runtime?.free();world.runtime=null}catch(error){checks.push({name:'cleanup',status:'FAILED',error:String(error.stack??error)})}}for(const[key,descriptor]of savedGlobals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key]}}
const failures=checks.filter(row=>row.status==='FAILED'),report={schema:'nova-world-gameplay-stream-generation-functional-v1',phase,status:failures.length?'FAILED':'VERIFIED_FUNCTIONAL_SMOKE',checks,observations,source,artifact,node:process.version,scriptSha256:hash(await readFile(new URL(import.meta.url))),limits:['Real original services/RuntimeSceneStreaming/World/ordinary WASM; Node platform setup, no GUI/performance claims.','Before overlays exact phase1 Owner+adapter, current Root Core/Host sources are separately recorded, not whole uniform 9c0e.','AI continuation and shared service Owners remain NOT_PASSED.']}
await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({phase,status:report.status,passed:checks.length-failures.length,failed:failures.length,report:normal(relative(root,resolve(directory,'report.json')))}));if(failures.length)process.exitCode=1
