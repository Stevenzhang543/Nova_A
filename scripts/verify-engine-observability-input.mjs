/** Actual WorldCanvas bodies + InputManager/GameplayRuntime/ordinary WASM; controlled graphics replies, not performance qualification. */
import assert from 'node:assert/strict'
import { createHash, webcrypto } from 'node:crypto'
import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'
import ts from 'typescript'

const root=process.cwd(), compiled=await mkdtemp(join(tmpdir(),'nova-observability-input-')), checks=[]
const source=await readFile(resolve('src/components/WorldCanvas.vue'),'utf8')
const setup=source.slice(source.indexOf('>',source.indexOf('<script setup'))+1,source.indexOf('</script>'))
const ast=ts.createSourceFile('WorldCanvas.ts',setup,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS)
const names=['installInputPerformanceObservation','disposeInputPerformanceObservation','runFrame','onFrameVisibilityChange','render']
const body=ts.transpileModule(names.map(name=>{
  const node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name)
  assert.ok(node,'Missing actual production body '+name);return node.getText(ast)
}).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
const test=async(name,action)=>{await action();checks.push({name,status:'passed'})}
const normalize=path=>path.replaceAll('\\','/')
const descriptor=Object.getOwnPropertyDescriptor(globalThis,'performance')
let runtime,native,core,clock=1000,host,reply='submitted',graphicsThrows=false,submissionCount=0,resetCount=0,frameCalls=0,frameDeltas=[]
if(!globalThis.crypto)globalThis.crypto=webcrypto
for(const name of ['HTMLElement','HTMLInputElement','HTMLTextAreaElement','HTMLSelectElement'])if(!(name in globalThis))globalThis[name]=class{}
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{getGamepads:()=>[],maxTouchPoints:0,platform:'Win32',userAgent:'Nova actual WorldCanvas body contract'}})
const key=(code='Space',extra={})=>({target:null,code,key:code==='Space'?' ':code.slice(3).toLowerCase(),repeat:false,ctrlKey:false,shiftKey:false,altKey:false,metaKey:false,...extra})
try{
  const entry=join(compiled,'entry.ts'),exports={
    'src/runtime/GameplayRuntime.ts':'GameplayRuntime','src/runtime/input.ts':'createInputAction, createInputBinding',
    'src/runtime/entityLifetimes.ts':'beginEntityLifetime','src/store/physics.ts':'physicsState, historyState',
    'src/assets/AssetDatabase.ts':'assetState','src/world/BoxEntity.ts':'BoxEntity','src/world/components.ts':'Script2D',
    'src/runtime/scriptSettings.ts':'scriptProjectSettings','src/runtime/profiler.ts':'profilerState',
    'src/runtime/performance/observability.ts':'InputReceiptTokenMap','src/runtime/engineTiming.ts':'normalizeSimulationFrameDelta',
    'src/runtime/largeWorldPerformance.ts':'beginPerformanceFrame, completePerformanceFrame, currentPerformanceFrameObservation, markPerformanceInput, forgetPerformanceInput, markPerformanceSubmission, rebasePerformanceFrameContinuity, resetPerformanceRuntime, performanceRuntimeState',
    'src/runtime/audio.ts':'audioRuntime','nova_core/pkg/nova_core.js':'default as initWasm, WasmScriptRuntime, WasmRuntimeWorld'
  }
  await writeFile(entry,Object.entries(exports).map(([path,names])=>`export {${names}} from '${normalize(resolve(root,path))}';`).join('\n'))
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:compiled,emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'contract.mjs',inlineDynamicImports:true}}}})
  core=await import(pathToFileURL(join(compiled,'contract.mjs')).href)
  await core.initWasm({module_or_path:await readFile(resolve('nova_core/pkg/nova_core_bg.wasm'))})
  Object.defineProperty(globalThis,'performance',{configurable:true,value:{now:()=>clock}})
  core.resetPerformanceRuntime();core.scriptProjectSettings.debuggerEnabled=false;core.scriptProjectSettings.testing.coverageEnabled=false
  runtime=new core.GameplayRuntime();runtime.scriptRuntime=new core.WasmScriptRuntime();runtime.playSessionIdentity=10;runtime.scriptRuntime.clear_instances(10);runtime.active=true
  const entity=new core.BoxEntity(1,{x:0,y:0},{x:1,y:1});entity.isStatic=true;core.beginEntityLifetime(entity)
  const script=entity.addComponent(new core.Script2D()),scriptSource='@export let steps = 0;\n@export let presses = 0;\nfn fixed_update(dt) { steps += 1; if input_pressed("Jump") { presses += 1; } }'
  script.scriptAsset='worldcanvas-observation';core.assetState.records.push({uuid:script.scriptAsset,name:script.scriptAsset,path:'worldcanvas-observation.rhai',assetType:'script',source:scriptSource,script:{apiVersion:2}});core.assetState.generation++
  runtime.compiledSources.set(script.scriptAsset,scriptSource);runtime.scriptRuntime.compile_cached(script.scriptAsset,scriptSource)
  const world=core.physicsState.world;world.entities.splice(0,world.entities.length,entity);world.connections.splice(0)
  core.physicsState.inputMap.splice(0,core.physicsState.inputMap.length,core.createInputAction('Jump','button',[core.createInputBinding('physical-key','Space')]))
  native=new core.WasmRuntimeWorld();world.runtime=native;world.wasmLoaded=true;core.physicsState.playMode='playing';core.physicsState.globalSettings.maxCatchUpSteps=4
  const realFrame=runtime.frame.bind(runtime);runtime.frame=(dt,viewport)=>{frameCalls++;frameDeltas.push(dt);return realFrame(dt,viewport)}
  const realReset=world.resetSimulationClock.bind(world);world.resetSimulationClock=()=>{resetCount++;realReset()}
  core.profilerState.overheadMode='Off'
  const noop=()=>{}, ctx=new Proxy({},{get:()=>noop}), marker=[]
  const createHost=(profiling=true)=>{
    const document={hidden:false},canvas={width:100,height:100,getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})}
    const sceneRendererEnvironment=Object.freeze({owner:'controlled-scene-owner'})
    const env={
      profileInputObservations:profiling,inputReceiptTokens:null,inputObservationWorldEpoch:null,lastConsumedInputFrameSequence:0,disposePerformanceInputObservation:null,
      gameplayRuntime:runtime,InputReceiptTokenMap:core.InputReceiptTokenMap,markPerformanceInput:core.markPerformanceInput,forgetPerformanceInput:core.forgetPerformanceInput,
      beginPerformanceFrame:core.beginPerformanceFrame,completePerformanceFrame:core.completePerformanceFrame,currentPerformanceFrameObservation:core.currentPerformanceFrameObservation,
      rebasePerformanceFrameContinuity:core.rebasePerformanceFrameContinuity,normalizeSimulationFrameDelta:core.normalizeSimulationFrameDelta,
      markPerformanceSubmission(at,token){submissionCount++;marker.push({at,token});core.markPerformanceSubmission(at,token)},
      document,performance:globalThis.performance,canvasDisposed:false,lastTime:clock,flushPendingMouseMove:noop,
      camera:{scale:1,offset:{x:0,y:0},targetScale:null,targetOffset:null},editorPerformancePreferences:{value:{decorativeMotion:true}},state:core.physicsState,
      editorState:{currentPage:'game',activeWorkspace:'design',rendererStats:{},activeLayer:1,renderLayer:1},gameUiRuntime:{sampleInput:noop,render:noop,accessibilityNodes:()=>[]},
      synchronizeNativeInput:noop,syncEditableConnections:noop,world,prepareHierarchyIndex:noop,knownBrokenConnections:new WeakSet(),t:x=>x,addEditorLog:noop,
      canvasRef:{value:canvas},canvasLogicalWidth:100,canvasLogicalHeight:100,canvasPixelRatio:1,ctx,
      desiredCanvasPixelRatio:()=>1,resize:noop,resetCameraSmoothing:noop,renderer:{},beginRenderGraph:()=>1,recordRenderPass:(_n,t)=>t+1,completeRenderGraph:noop,
      sceneRendererEnvironment,renderWorld(_renderer,_entities,_options,services){assert.equal(services,sceneRendererEnvironment);if(graphicsThrows)throw Error('controlled graphics failure');return{cpuSubmissionAtMs:reply==='submitted'||reply==='post-fence-failure'?clock+.5:null,gpuSubmissionStatus:reply==='post-fence-failure'?'sync-failed':reply,drawCalls:1,renderTargets:0}},
      palette:{},authoringState:{performanceMode:'off'},prefs:{performanceProfile:'balanced'},renderLighting2D:noop,renderPostProcessOverlay:noop,renderDebugView2D:noop,
      renderingSettings:{lightingEnabled:false,postProcessing:{enabled:false},debugView:'None'},renderTransformGizmo:noop,renderPointGizmo:noop,drawPhysicsDebug:noop,drawWorldGameplayDebug:noop,
      renderScreenRulers:noop,accessibilitySignature:'',accessibilityNodes:{value:[]},renderCanvasRef:{value:{}},captureRenderSurface:noop,worldPostProcessFilter:()=>'',activeGameCameras:()=>[],
      renderGraphState:{frame:1,passes:[]},captureRenderTexture:noop,runtimeCaptions:[],captionTick:{value:0},profilerState:core.profilerState,performanceRuntimeState:core.performanceRuntimeState,
      performanceSampleCounter:1,cachedPerformanceSample:{allocations:0,assetJobs:0},samplePerformanceTools:()=>({allocations:0,assetJobs:0}),profileFrameCounter:0,recordFrameProfile:noop,wakeFrameLoop:noop
    }
    const functions=new Function(...Object.keys(env),body+`\nreturn{runFrame,render,onFrameVisibilityChange,installInputPerformanceObservation,disposeInputPerformanceObservation,
      tokenCount:()=>inputReceiptTokens?.retainedReceipts??0,lastTime:()=>lastTime,ownerDispose:()=>disposePerformanceInputObservation};`)(...Object.values(env))
    return{...functions,document}
  }
  host=createHost();host.installInputPerformanceObservation()
  const frame=(ms=25)=>{clock+=ms;host.runFrame(clock)}
  const pulse=(extra={})=>{runtime.input.onKeyDown(key('Space',extra));clock+=1;runtime.input.onKeyUp(key('Space',extra))}
  await test('actual successful Runtime frame supplies its latest consumed physical input to finite CPU submit',()=>{
    pulse();frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,25.5);assert.equal(script.lastError,null);assert.equal(script.properties.presses,1)
    assert(marker.at(-1).token!==undefined);assert.equal(host.tokenCount(),0)
  })
  await test('repeat draw of the same Gameplay frame has no input token',()=>{
    const last=runtime.lastFrameConsumedInput;clock+=1;host.render();assert.equal(runtime.lastFrameConsumedInput,last)
    assert.equal(marker.at(-1).token,undefined);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    frame();assert.equal(runtime.lastFrameConsumedInput,null);assert.equal(marker.at(-1).token,undefined)
  })
  await test('unsampled, unmatched, text, IME and repeat paths remain unavailable',()=>{
    pulse();clock+=1;host.render();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null);frame()
    const typing=Object.assign(new HTMLElement(),{closest:()=>({})})
    for(const extra of [{target:typing},{isComposing:true},{keyCode:229},{repeat:true},{defaultPrevented:true}]){pulse(extra);frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null,'Excluded raw input: '+Object.keys(extra).join(','))}
    runtime.input.onKeyDown(key('KeyQ'));runtime.input.onKeyUp(key('KeyQ'));frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    runtime.input.setVirtualAction('Jump',1);frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null);runtime.input.releaseAllInputs();frame()
  })
  await test('paused, blur and explicit input reset invalidate receipts before submission',()=>{
    pulse();runtime.input.onBlur();frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    pulse();runtime.input.releaseAllInputs();frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    core.physicsState.playMode='paused';pulse();frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    pulse();core.physicsState.playMode='playing';frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
  })
  await test('deferred, suspended and pre-submit fence failure discard candidates; next manual draw cannot reuse them',()=>{
    for(const status of ['deferred','suspended','sync-failed']){
      reply=status;const before=submissionCount;pulse();frame();assert.equal(submissionCount,before);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null);assert.equal(host.tokenCount(),0)
      reply='submitted';clock+=1;host.render();assert.equal(marker.at(-1).token,undefined);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    }
  })
  await test('draw completed before fence failure still measures its actual CPU submission',()=>{
    reply='post-fence-failure';pulse();frame();assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,25.5);reply='submitted'
  })
  await test('failed Gameplay caller never renders; failed render releases its candidate in finally',()=>{
    const currentFrame=runtime.frame,before=submissionCount;runtime.frame=()=>{throw Error('controlled Gameplay failure')};pulse()
    assert.throws(()=>frame(),/controlled Gameplay failure/);assert.equal(submissionCount,before);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null);runtime.frame=currentFrame
    graphicsThrows=true;assert.throws(()=>frame(),/controlled graphics failure/);assert.equal(host.tokenCount(),0);graphicsThrows=false
    clock+=1;host.render();assert.equal(marker.at(-1).token,undefined);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
  })
  await test('actual caller forwards25ms/250ms and caps long stalls at250ms with4 Rust fixed catch-up steps',()=>{
    host.onFrameVisibilityChange();frame(25);assert.equal(frameDeltas.at(-1),.025)
    world.resetSimulationClock();const before=script.properties.steps;frame(250);assert.equal(frameDeltas.at(-1),.25);assert.equal(script.properties.steps-before,4)
    world.resetSimulationClock();const longBefore=script.properties.steps;frame(1000);assert.equal(frameDeltas.at(-1),.25);assert.equal(script.properties.steps-longBefore,4)
  })
  await test('hidden body does not sample or advance; visible rebase preserves elapsed, handles, scripts and Undo',()=>{
    const timeBefore=JSON.parse(native.time_json()),transform=JSON.stringify(entity.transform),history=JSON.stringify(core.historyState),session=runtime.sessionIdentity,scriptBefore={...script.properties}
    assert.ok(Number.isFinite(timeBefore.elapsed)&&Number.isSafeInteger(timeBefore.frame),'Actual WASM clock fields: '+JSON.stringify(timeBefore))
    const checksum=world.stateChecksum(),calls=frameCalls,resets=resetCount
    host.document.hidden=true;host.onFrameVisibilityChange();clock+=60000;pulse();host.runFrame(clock)
    assert.equal(frameCalls,calls);assert.equal(resetCount,resets+1);assert.equal(world.stateChecksum(),checksum);assert.equal(JSON.stringify(entity.transform),transform);assert.deepEqual(script.properties,scriptBefore)
    const hiddenTime=JSON.parse(native.time_json());assert.equal(hiddenTime.elapsed,timeBefore.elapsed);assert.equal(hiddenTime.frame,timeBefore.frame);assert.equal(runtime.sessionIdentity,session);assert.equal(JSON.stringify(core.historyState),history)
    assert.equal(core.audioRuntime.diagnostics.clock.playing,false)
    host.document.hidden=false;host.onFrameVisibilityChange();assert.equal(host.lastTime(),clock);host.runFrame(clock)
    assert.equal(frameDeltas.at(-1),0);assert.equal(core.currentPerformanceFrameObservation().rafIntervalMs,null);assert.equal(core.currentPerformanceFrameObservation().submissionIntervalMs,null);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,null)
    frame(16);assert.equal(core.currentPerformanceFrameObservation().rafIntervalMs,16);assert.equal(core.currentPerformanceFrameObservation().submissionIntervalMs,16);assert.equal(core.audioRuntime.diagnostics.clock.playing,true)
  })
  await test('old viewport disposal is idempotent and cannot clear new profiling owner callbacks or tokens',()=>{
    const old=host.ownerDispose(),replacement=createHost();replacement.installInputPerformanceObservation();old();old();host.disposeInputPerformanceObservation()
    pulse();assert.ok(replacement.tokenCount()>0);clock+=25;replacement.runFrame(clock);assert.equal(core.currentPerformanceFrameObservation().inputToSubmitMs,25.5);assert.equal(replacement.tokenCount(),0)
    replacement.disposeInputPerformanceObservation();replacement.disposeInputPerformanceObservation();assert.equal(runtime.input.observationEpoch,null)
    const normal=createHost(false);normal.installInputPerformanceObservation();assert.equal(runtime.input.observationEpoch,null);assert.equal(normal.tokenCount(),0)
  })
  const files=['src/components/WorldCanvas.vue','src/runtime/performance/observability.ts','src/runtime/largeWorldPerformance.ts','src/runtime/GameplayRuntime.ts','src/runtime/input.ts','src/runtime/engineTiming.ts','src/world/World.ts','nova_core/pkg/nova_core_bg.wasm','scripts/verify-engine-observability-input.mjs']
  const hashes=Object.fromEntries(await Promise.all(files.map(async file=>[file,createHash('sha256').update(await readFile(resolve(file))).digest('hex')])))
  await mkdir(resolve('.cache'),{recursive:true});const report=resolve('.cache/engine-observability-input.json')
  await writeFile(report,JSON.stringify({status:'passed',scope:'SHORT_SMOKE production body + actual InputManager/GameplayRuntime and ordinary WASM functional contracts, controlled graphics replies/timestamps. Not GPU/input-to-photon or formal benchmark.',checks,hashes},null,2)+'\n')
  console.log(JSON.stringify({status:'passed',checks:checks.length,scope:'SHORT_SMOKE',report}))
}finally{
  host?.disposeInputPerformanceObservation();runtime?.stopSession(false);native?.free()
  if(descriptor)Object.defineProperty(globalThis,'performance',descriptor)
  await rm(compiled,{recursive:true,force:true})
}
