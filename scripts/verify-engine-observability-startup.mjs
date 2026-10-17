/** Deterministic production startup/capture/UI contracts; controlled time is not startup or GPU qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { compileTemplate, parse } from 'vue/compiler-sfc'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { transformWithEsbuild } from 'vite'
import { openMediaAuditModules } from './lib/mediaAudit16.mjs'

const root=process.cwd(), output=resolve(process.argv.find(x=>x.startsWith('--report='))?.slice(9) || '.cache/engine-observability-startup.json')
const worldCanvasSource=await readFile(resolve('src/components/WorldCanvas.vue'),'utf8')
const checks=[], test=async(name,run)=>{await run();checks.push({name,status:'passed'})}
let clock=100, opened, temporary
const nowDescriptor=Object.getOwnPropertyDescriptor(performance,'now')
Object.defineProperty(performance,'now',{configurable:true,value:()=>clock})
try {
 opened=await openMediaAuditModules({repository:root,bases:[root]}, {runtime:'runtime/largeWorldPerformance',profiler:'runtime/profiler',tools:'runtime/performanceTools',copy:'editor/profilerMeasurementCopy',production:'runtime/production'})
 const {runtime:r,profiler:p,tools:t,copy:c,production:production}=opened.modules
 await test('Startup and prefetch remain null until an existing owner reports an observation',()=>{
  for(const key of ['coldStartupMs','warmStartupMs','moduleToFirstHostFrameWallMs','workspacePrefetchWallMs'])assert.equal(r.performanceRuntimeState[key],null)
  r.completePerformanceFrame(NaN);r.completePerformanceFrame(Infinity);r.completePerformanceFrame(99)
  assert.equal(r.performanceRuntimeState.moduleToFirstHostFrameWallMs,null)
 })
 await test('Launcher wait belongs only to module-to-first-host wall time, even without a renderer submission',()=>{
  clock=168546.4;r.beginPerformanceFrame(clock);r.completePerformanceFrame(clock)
  assert.equal(r.performanceRuntimeState.moduleToFirstHostFrameWallMs,168446.4)
  assert.equal(r.performanceRuntimeState.coldStartupMs,null);assert.equal(r.performanceRuntimeState.warmStartupMs,null)
  assert.equal(r.currentPerformanceFrameObservation().submissionIntervalMs,null)
  clock+=100;r.beginPerformanceFrame(clock);r.completePerformanceFrame(clock)
  assert.equal(r.performanceRuntimeState.moduleToFirstHostFrameWallMs,168446.4,'first completion latches once')
 })
 await test('Historical recordWarmStartup API records only workspace prefetch wall time, including owner wait',()=>{
  r.recordWarmStartup(1000,16000);assert.equal(r.performanceRuntimeState.workspacePrefetchWallMs,15000)
  assert.equal(r.performanceRuntimeState.warmStartupMs,null)
  r.recordWorkspacePrefetchWall(0,0);assert.equal(r.performanceRuntimeState.workspacePrefetchWallMs,0,'measured zero is valid')
  for(const [start,end] of [[NaN,1],[1,Infinity],[10,9],[-1,0]]) {r.recordWarmStartup(start,end);assert.equal(r.performanceRuntimeState.workspacePrefetchWallMs,null)}
  r.recordWarmStartup(1000,16000)
 })
 await test('Frame reset preserves the original state and lifetime wall observations without restarting module time',()=>{
  const state=r.performanceRuntimeState;r.resetPerformanceRuntime()
  assert.equal(r.performanceRuntimeState,state);assert.equal(state.moduleToFirstHostFrameWallMs,168446.4);assert.equal(state.workspacePrefetchWallMs,15000)
  clock+=500;r.beginPerformanceFrame(clock);r.completePerformanceFrame(clock)
  assert.equal(state.moduleToFirstHostFrameWallMs,168446.4);assert.equal(state.coldStartupMs,null);assert.equal(state.warmStartupMs,null)
 })
 await test('Current sampling scope reports actual mode and publishing settings without changing history or clocks',()=>{
  const state=r.performanceRuntimeState, before=state.frame
  p.profilerState.overheadMode='Low overhead';p.profilerState.enabled=true;p.profilerState.frozen=false
  let scope=p.currentPerformanceSamplingScope(4)
  assert.equal(scope.rafIntervalCapacity,600);assert.equal(scope.profilerIntervalSummaryCapacity,240)
  assert.equal(scope.profilerSampleEveryHostFramesAtCapture,4);assert.equal(scope.runtimePublishEveryHostFramesAtCapture,4)
  p.profilerState.overheadMode='Full';assert.equal(p.currentPerformanceSamplingScope(12).profilerSampleEveryHostFramesAtCapture,1)
  p.profilerState.overheadMode='Off';assert.equal(p.currentPerformanceSamplingScope(12).profilerSampleEveryHostFramesAtCapture,null)
  p.profilerState.overheadMode='Low overhead';p.profilerState.frozen=true;scope=p.currentPerformanceSamplingScope(12)
  assert.equal(scope.profilerFrozenAtCapture,true);assert.equal(scope.historyMaySpanSamplingChangesAndPlayStop,true)
  assert.equal(state.frame,before);p.profilerState.frozen=false
  assert.match(worldCanvasSource,/profilerState\.overheadMode === 'Full' \? 1 : profilerState\.overheadMode === 'Low overhead' \? 4 : Number\.POSITIVE_INFINITY/)
 })
 const sample={frameMs:16,physicsMs:0,renderingMs:2,scriptsMs:0,animationMs:0,audioMs:0,assetsMs:0,otherMs:0,fps:62.5,memoryMb:null,rafIntervalMs:16,cpuFrameMs:3}
 await test('600 observed intervals and sampled Profiler history retain their different denominators; clear only clears Profiler',()=>{
  p.clearProfiler();r.resetPerformanceRuntime();r.performanceRuntimeSettings.reactivePublishInterval=4
  production.productionSettings.performance.traceCapacity=600
  for(let index=0;index<900;index++){const at=1000000+index*16;r.beginPerformanceFrame(at,at);r.completePerformanceFrame(at+3);if(index%4===0)p.recordFrameProfile(sample)}
  assert.equal(p.profilerState.samples.length,225);assert.equal(r.performanceRuntimeState.frame,900)
  assert.equal(r.performanceRuntimeState.worstFrameMs,16);assert.equal(r.performanceRuntimeState.onePercentLowFps,62.5)
  p.clearProfiler();assert.equal(p.profilerState.samples.length,0);assert.equal(r.performanceRuntimeState.worstFrameMs,16)
  assert.equal(r.performanceRuntimeState.onePercentLowFps,62.5)
 })
 const renderer={gpuMs:null,drawCalls:1,textureMemoryBytes:0,renderTargets:0,batchBreakReasons:{}}
 let capture
 await test('Capture v4 adds explicitly scoped nullable startup and sampling metadata without changing frame budget checks',()=>{
  p.recordFrameProfile(sample);capture=t.capturePerformance('startup-scope',renderer)
  assert.equal(capture.version,4);assert.equal(capture.measurementSchema,'nova-frame-observation-v1')
  assert.deepEqual(capture.startup,{schema:'nova-startup-observation-v1',coldStartupMs:null,warmStartupMs:null,moduleToFirstHostFrameWallMs:168446.4,workspacePrefetchWallMs:15000})
  assert.equal(capture.samplingScope.schema,'nova-performance-sampling-scope-v1')
  assert.equal(capture.samplingScope.profilerSampleEveryHostFramesAtCapture,4)
  assert.equal(capture.budget.checks.find(x=>x.id==='frame.average').actual,16)
  assert.deepEqual(capture.budget.checks.map(x=>x.id),['frame.average','render.average','audio.average','gpu.frame','renderer.drawCalls','renderer.textureMemory','particles.update','profiler.overhead'])
  r.recordWarmStartup(0,20000);assert.equal(capture.startup.workspacePrefetchWallMs,15000,'captured values are detached')
  const saved=JSON.parse(t.serializePerformanceCapture(capture));assert.deepEqual(saved.startup,capture.startup);assert.deepEqual(saved.samplingScope,capture.samplingScope)
 })
 await test('Legacy v2/v3 startup aliases remain archived but cannot become corrected cold/warm startup measurements',()=>{
  for(const version of [2,3]){
   const legacy={...capture,version,coldStartupMs:168446.4,warmStartupMs:15000}
   delete legacy.startup;delete legacy.samplingScope
   const saved=JSON.parse(t.serializePerformanceCapture(legacy))
   assert.equal(saved.version,version);assert.equal(saved.coldStartupMs,null);assert.equal(saved.warmStartupMs,null)
   assert.deepEqual(saved.legacyStartupMetrics,{coldStartupMs:168446.4,warmStartupMs:15000})
   assert.equal(saved.startup.moduleToFirstHostFrameWallMs,null);assert.equal(saved.startup.workspacePrefetchWallMs,null)
   assert.equal(saved.startup.coldStartupMs,null);assert.equal(saved.startup.warmStartupMs,null)
  }
  const invalid={...capture,startup:{...capture.startup,coldStartupMs:50,warmStartupMs:60,moduleToFirstHostFrameWallMs:NaN,workspacePrefetchWallMs:-1}}
  const observed=t.performanceCaptureStartupObservation(invalid)
  assert.deepEqual(observed,{schema:'nova-startup-observation-v1',coldStartupMs:null,warmStartupMs:null,moduleToFirstHostFrameWallMs:null,workspacePrefetchWallMs:null})
 })
 await test('Corrected v3/v4 frame comparisons remain compatible, while legacy CPU-only v2 and mixed benchmark modes stay unqualified',()=>{
  const prior={...capture,id:'previous-v3',version:3};delete prior.startup;delete prior.samplingScope
  t.performanceToolsState.captures.push(prior)
  const comparison=t.comparePerformanceCaptures(prior.id,capture.id)
  assert.ok(comparison);assert.equal(comparison.averageFrameDeltaMs,0);assert.equal(comparison.peakFrameDeltaMs,0)
  prior.version=2;assert.equal(t.comparePerformanceCaptures(prior.id,capture.id),null)
  prior.version=3;prior.benchmarkMode='adaptive-experience';assert.equal(t.comparePerformanceCaptures(prior.id,capture.id),null)
 })
 await test('All three locales distinguish unavailable values from a measured zero and explain the current windows',()=>{
  for(const locale of ['en','de','zh']){
   const unavailable=c.profilerMeasurementCopy[locale].unavailable
   for(const value of [null,undefined,NaN,Infinity,-1])assert.equal(c.formatMeasuredValue(value,'ms',unavailable),unavailable)
   assert.equal(c.formatMeasuredValue(0,'ms',unavailable),'0.00 ms')
   const scope=p.currentPerformanceSamplingScope(12),copy=c.profilerSamplingWindowCopy(scope,locale)
   assert.ok(copy.profiler.includes('240')&&copy.runtime.includes('600')&&copy.runtime.includes('12'))
   assert.ok(c.profilerStartupCopy[locale].scope.includes('Ready'))
  }
 })
 await test('Actual Jobs template renders unmeasured startup/input without unit suffix and keeps both wall observations visible',async()=>{
  const descriptor=parse(await readFile(resolve('src/components/ProfilerPanel.vue'),'utf8')).descriptor
  const compiled=compileTemplate({source:descriptor.template.content,filename:'ProfilerPanel.vue',id:'startup-scope-contract',ssr:true})
  assert.deepEqual(compiled.errors,[])
  temporary=await mkdtemp(resolve('.cache/observability-startup-ssr-'))
  const entry=join(temporary,'render.mjs');await writeFile(entry,(await transformWithEsbuild(compiled.code,'ProfilerPanel.template.ts',{loader:'ts',format:'esm'})).code)
  const {ssrRender}=await import(pathToFileURL(entry).href)
  const context={activeTab:'jobs',tabs:[{id:'jobs',label:'Jobs'}],selectTab(){},t:key=>key,
   settings:production.productionSettings,jobs:{workerAvailable:false,queueWaitMs:0,averageMs:0},runtimePerformance:r.performanceRuntimeState,
   formatMeasuredValue:c.formatMeasuredValue,measurementCopy:c.profilerMeasurementCopy.en,startupCopy:c.profilerStartupCopy.en,
   samplingWindowCopy:c.profilerSamplingWindowCopy(p.currentPerformanceSamplingScope(4),'en'),jobResult:'',cancelJob:null}
  const app=createSSRApp({ssrRender,setup:()=>context})
  for(const name of ['UiPanelHeader','UiTabs','UiButton','SaveDataSettings','PerformancePolicyPanel'])app.component(name,{render:()=>null})
  const html=await renderToString(app),unavailable=c.profilerMeasurementCopy.en.unavailable
  assert.ok(html.includes('data-audit="cold-startup">'+unavailable+'</dd>'))
  assert.ok(html.includes('data-audit="warm-startup">'+unavailable+'</dd>'))
  assert.ok(html.includes('data-audit="module-first-host-wall">168446.4 ms</dd>'))
  assert.ok(html.includes('data-audit="workspace-prefetch-wall">20000.0 ms</dd>'))
  assert.ok(!html.includes(unavailable+' ms')&&!html.includes(unavailable+' FPS'))
  assert.ok(html.includes('240')&&html.includes('600')&&html.includes('Ready'))
 })
 const sources=['src/runtime/largeWorldPerformance.ts','src/runtime/performance/observability.ts','src/runtime/profiler.ts','src/runtime/performanceTools.ts','src/editor/profilerMeasurementCopy.ts','src/components/ProfilerPanel.vue','src/i18n.ts','scripts/verify-engine-observability-startup.mjs']
 const hashes={};for(const file of sources)hashes[file]=createHash('sha256').update(await readFile(resolve(file))).digest('hex')
 await mkdir(dirname(output),{recursive:true})
 await writeFile(output,JSON.stringify({format:'nova-engine-startup-observability-verification',version:1,status:'passed',scope:'SHORT_SMOKE functional production modules, controlled owner clock and actual template SSR. No real cold/warm startup, physical rendering, motion or formal performance qualification.',checks,hashes,notTested:['Request-to-Ready cold startup','Request-to-Ready warm startup','New optimized-profile GUI and layout; requires root rebuild','B0–B8/X01–X15/H1/H2 warm10s/sample120s/5runs']},null,2)+'\n')
 console.log(JSON.stringify({status:'passed',checks:checks.length,report:output,scope:'SHORT_SMOKE'}))
}finally{
 if(nowDescriptor)Object.defineProperty(performance,'now',nowDescriptor);else delete performance.now
 if(opened)await opened.close()
 if(temporary){assert.ok(temporary.startsWith(resolve('.cache')+'\\')||temporary.startsWith(resolve('.cache')+'/'));await rm(temporary,{recursive:true,force:true})}
}
