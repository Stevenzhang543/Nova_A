/** Actual renderGraph state/Owner and actual WorldCanvas scope body. Controlled submission timestamps, not a GPU/display benchmark. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import ts from 'typescript'
import { parse, compileTemplate } from 'vue/compiler-sfc'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const root=process.cwd(),output=resolve(process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'.cache/engine-overhaul/render-request-diagnostics/state-verification.json')
await mkdir(resolve(output,'..'),{recursive:true})
const checks=[],sources=[],test=async(name,action)=>{await action();checks.push({name,status:'passed'})}
// Existing per-slice CSS baselines; no ignored cache fixture is required for a clean rerun.
const styleBaselines={ 'ProfilerPanel.vue':'e3a45e7690e5f0878364d1b0e39960ee77f058ac414174fa63f79f4cb72c2baf', 'RenderingPanel.vue':'59c35d095c21d12d3b3362f4c70aaf0d113aec063121120968aa0ad9ec9d2aa6' }
let opened
try{
 opened=await openMediaAuditModules({repository:root,bases:[root]},{graph:'renderer/renderGraph',words:'i18n',preferences:'store/preferences'})
 const g=opened.modules.graph,state=g.renderGraphState,scope={projectGeneration:1,sceneUuid:'scene-a',rendererGeneration:1,runtimeSessionIdentity:1,view:'game'}
 const owner=g.createRenderGraphDiagnosticsOwner();owner.updateScope(scope)
 const request=(who,timestamp,enabled=true,status='submitted')=>{
  const start=g.beginRenderGraph(who)
  for(const name of ['World','Lighting','PostProcess','EditorOverlay','UI'])g.recordRenderPass(name,start-2,enabled,enabled?1:0,who)
  g.completeRenderGraph(start,{drawCalls:enabled?1:0,cpuSubmissionAtMs:timestamp,gpuSubmissionStatus:status},start,start,who)
 }
 await test('Legacy begin/record/complete public calls retain return types and default pass completion without inventing a submission',()=>{
  const start=g.beginRenderGraph();assert.equal(typeof start,'number');assert.equal(typeof g.recordRenderPass('World',start),'number')
  assert.equal(g.completeRenderGraph(start,{drawCalls:3},start,start),undefined);assert.equal(state.passes.length,5);assert.equal(state.request.status,'unmeasured');assert.equal(state.lastWorldSubmission,null)
  for(const name of ['requestRenderCapture','startDeterministicCapture','stopDeterministicCapture','clearDeterministicCapture','captureRenderSurface','compareRenderCaptures','renderGraphAllocatesEffects'])assert.equal(typeof g[name],'function')
 })
 await test('First unsubmitted request has null submission and no previous scope history',()=>{
  request(owner,null,false);assert.equal(state.request.status,'not-submitted');assert.equal(state.request.worldCpuSubmissionAtMs,null);assert.equal(state.lastWorldSubmission,null)
  assert.ok(state.passes.every(pass=>!pass.enabled&&pass.durationMs===0&&pass.drawCalls===0));assert.equal(state.request.reason,'unknown')
 })
 await test('Finite World API submission creates one immutable historical summary with explicit scope',()=>{
  request(owner,12,true);const previous=state.lastWorldSubmission
  assert.equal(state.request.status,'world-cpu-submitted');assert.equal(previous.worldCpuSubmissionAtMs,12);assert.equal(previous.measurementScope,'world-renderer-cpu-api-submission')
  assert.equal(previous.requestFrame,state.request.frame);assert.equal(previous.passes.length,5);assert.ok(Object.isFrozen(previous)&&Object.isFrozen(previous.passes)&&previous.passes.every(Object.isFrozen))
  assert.ok(previous.passes.some(pass=>pass.durationMs>0))
 })
 await test('Unsubmitted requests preserve only historical data; current passes and counters do not acquire old CPU costs',()=>{
  const previous=state.lastWorldSubmission
  g.beginRenderGraph(owner);assert.equal(state.request.status,'pending');assert.equal(state.passes.length,0);assert.equal(state.lastWorldSubmission,previous)
  request(owner,null,false,'suspended')
  assert.equal(state.lastWorldSubmission,previous);assert.ok(state.request.frame>previous.requestFrame);assert.equal(state.request.worldCpuSubmissionAtMs,null);assert.equal(state.request.reason,'unknown')
  assert.ok(state.passes.every(pass=>!pass.enabled&&pass.durationMs===0));assert.equal(state.passes.filter(pass=>pass.enabled).length,0)
 })
 await test('Infinity/NaN/negative/missing timestamps remain unmeasured and never replace measured history with zero',()=>{
  const previous=state.lastWorldSubmission
  for(const value of [Infinity,-Infinity,NaN,-1,undefined]){request(owner,value,true);assert.equal(state.request.status,'unmeasured');assert.equal(state.request.worldCpuSubmissionAtMs,null);assert.equal(state.lastWorldSubmission,previous)}
 })
 await test('A real finite zero is valid and post-draw fence failure stays World CPU submitted',()=>{
  request(owner,0,true,'sync-failed');assert.equal(state.request.status,'world-cpu-submitted');assert.equal(state.lastWorldSubmission.worldCpuSubmissionAtMs,0)
  request(owner,25,true,'sync-failed');assert.equal(state.lastWorldSubmission.worldCpuSubmissionAtMs,25)
 })
 await test('Repeated submissions replace a single summary and cap its pass rows without changing current API data',()=>{
  for(let i=0;i<100;i++)request(owner,i,true)
  const start=g.beginRenderGraph(owner);for(let i=0;i<12;i++)g.recordRenderPass('World',start,true,1,owner)
  g.completeRenderGraph(start,{drawCalls:1,cpuSubmissionAtMs:100},start,start,owner)
  assert.equal(state.lastWorldSubmission.passes.length,5);assert.equal(state.passes.length,16);assert.equal(Array.isArray(state.lastWorldSubmission),false)
 })
 await test('New Owner clears old scope; late old reset/dispose/record/complete cannot erase or overwrite the new observation',()=>{
  const next=g.createRenderGraphDiagnosticsOwner();next.updateScope(scope);request(next,120)
  const current=state.lastWorldSubmission,frame=state.frame
  g.beginRenderGraph(owner);assert.equal(state.lastWorldSubmission,current);assert.equal(state.frame,frame)
  owner.invalidate();owner.updateScope({...scope,projectGeneration:2});owner.dispose();owner.dispose()
  g.recordRenderPass('World',0,true,500,owner);g.completeRenderGraph(0,{drawCalls:500,cpuSubmissionAtMs:500},0,0,owner);g.beginRenderGraph(owner)
  assert.equal(state.lastWorldSubmission,current);assert.equal(state.frame,frame);assert.equal(state.request.worldCpuSubmissionAtMs,120)
  next.dispose();assert.equal(state.lastWorldSubmission,null);assert.equal(state.request.status,'none');assert.equal(state.passes.length,0)
 })
 await test('Each existing project/scene/context/runtime/view scope identity invalidates history; unchanged identity does not',()=>{
  const scoped=g.createRenderGraphDiagnosticsOwner();let current={...scope};scoped.updateScope(current)
  for(const[key,value]of [['projectGeneration',2],['sceneUuid','scene-b'],['rendererGeneration',2],['runtimeSessionIdentity',2],['view','scene']]){
   request(scoped,150);const old=state.lastWorldSubmission;scoped.updateScope({...current});assert.equal(state.lastWorldSubmission,old)
   current={...current,[key]:value};scoped.updateScope(current);assert.equal(state.lastWorldSubmission,null);assert.equal(state.request.status,'none');request(scoped,null,false);assert.equal(state.lastWorldSubmission,null)
  }
  scoped.dispose()
 })
 await test('Actual WorldCanvas scope helper reads existing identities, caches unchanged scope and invalidates the correct Owner',async()=>{
  const file=resolve('src/components/WorldCanvas.vue'),source=await readFile(file,'utf8'),start=source.indexOf('function synchronizeRenderGraphDiagnosticsScope()'),end=source.indexOf('const gameSurfaceRef',start)
  assert.ok(start>=0&&end>start);const body=ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText
  const real=g.createRenderGraphDiagnosticsOwner(),scene={activeSceneUuid:'scene-a'},runtime={sessionIdentity:1},editor={currentPage:'game'}
  const api=new Function('getProjectSessionGeneration','sceneManager','gameplayRuntime','editorState','renderGraphDiagnosticsOwner',`let rendererInitialization=1,renderGraphDiagnosticsScope=null;${body};return {synchronize:synchronizeRenderGraphDiagnosticsScope,scope:()=>renderGraphDiagnosticsScope,context:value=>rendererInitialization=value}`)(()=>7,scene,runtime,editor,real)
  api.synchronize();const cached=api.scope();request(real,170);api.synchronize();assert.equal(api.scope(),cached);assert.ok(state.lastWorldSubmission)
  scene.activeSceneUuid='scene-b';api.synchronize();assert.equal(state.lastWorldSubmission,null);request(real,171)
  api.context(2);api.synchronize();assert.equal(state.lastWorldSubmission,null);request(real,172)
  runtime.sessionIdentity=2;api.synchronize();assert.equal(state.lastWorldSubmission,null);real.dispose()
  assert.ok(source.includes('renderGraphDiagnosticsOwner.dispose()')&&source.includes('renderGraphDiagnosticsOwner.invalidate()'))
  assert.ok(source.includes('gpuPasses: renderGraphState.passes.filter'),'The current pass counter does not read historical summaries')
 })
 await test('Owner lifecycle does not alter existing bounded capture requests/sequence/results',()=>{
  g.requestRenderCapture();g.startDeterministicCapture({maximumFrames:2,frameRate:60,sampleRate:48000,memoryBudgetMb:16,includeUi:false})
  const captureOwner=g.createRenderGraphDiagnosticsOwner();captureOwner.updateScope(scope);request(captureOwner,null,false);captureOwner.dispose()
  assert.equal(state.captureRequested,true);assert.equal(state.sequence.active,true)
  const canvas={width:320,height:180,toDataURL:()=>`data:image/png;base64,${'A'.repeat(64)}`};g.captureRenderSurface(canvas,null);g.captureRenderSurface(canvas,null)
  assert.equal(state.sequence.frames.length,2);assert.equal(state.sequence.active,false);assert.equal(state.sequence.frames[1].timeSeconds,1/60);assert.equal(state.sequence.frames[1].audioSampleStart,800)
  assert.equal(state.sequence.stoppedReason,'Maximum frame count reached');assert.equal(state.captures.length,2)
 })
 await test('Both actual Vue consumers compile and label current versus historical data separately without density/style changes',async()=>{
  for(const file of ['src/components/ProfilerPanel.vue','src/components/RenderingPanel.vue']){
   const source=await readFile(resolve(file),'utf8'),sfc=parse(source,{filename:file});assert.deepEqual(sfc.errors,[])
   const compiled=compileTemplate({source:sfc.descriptor.template.content,filename:file,id:'render-request-verify'});assert.deepEqual(compiled.errors,[])
   assert.ok(source.includes('data-audit="render-request-status"'))
   const styles=sfc.descriptor.styles.map(style=>style.content.replaceAll('\r\n','\n'))
   assert.equal(createHash('sha256').update(JSON.stringify(styles)).digest('hex'),styleBaselines[file.split('/').at(-1)],'Existing CSS and Comfortable geometry declarations stay unchanged')
  }
  const profiler=await readFile(resolve('src/components/ProfilerPanel.vue'),'utf8');assert.ok(profiler.includes('data-audit="render-current-request"')&&profiler.includes('data-audit="render-historical-passes"'))
  const current=profiler.slice(profiler.indexOf('<table data-audit="render-current-request"'),profiler.indexOf('<template v-if="renderGraphState.lastWorldSubmission'))
  assert.ok(current.includes('renderGraphState.passes'));assert.ok(!current.includes('lastWorldSubmission'))
 })
 await test('All three locale messages distinguish unknown admission, historical CPU stages and unmeasured display',()=>{
  const keys=['renderLatestRequest','renderNotSubmitted','renderWorldCpuSubmitted','renderNotSubmittedRetained','renderNotSubmittedNoHistory','renderRequestPending','renderSubmissionUnmeasured','renderNoRequest','renderHistoricalWorldSubmission']
  for(const locale of ['en','de','zh']){opened.modules.preferences.preferencesState.locale=locale;for(const key of keys){const value=opened.modules.words.t(key,{frame:12});assert.ok(value&&value!==key);assert.ok(!value.includes('{frame}'))}}
 })
 for(const path of ['src/renderer/renderGraph.ts','src/components/WorldCanvas.vue','src/components/ProfilerPanel.vue','src/components/RenderingPanel.vue','src/i18n.ts','scripts/verify-engine-render-request-diagnostics.mjs']){
  const bytes=await readFile(resolve(path));sources.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')})
 }
 await writeFile(output,JSON.stringify({status:'passed',checks,scope:'Actual production diagnostic state machine and host scope body in controlled Node browser surfaces; not real GPU admission/display/GUI qualification.',sources,
  notTested:['New integrated artifact GUI; waiting for Root manifest','Native WebView','Physical display latency or performance','Prior f3aa Disabled snapshot and Reduced Motion 3s FAIL retained']},null,2)+'\n')
 console.log(JSON.stringify({status:'passed',checks:checks.length,output}))
}finally{await opened?.close()}
