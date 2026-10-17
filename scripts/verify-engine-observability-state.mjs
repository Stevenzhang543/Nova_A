/** Pure module graph and actual Vue adapter contracts. Functional evidence, not performance qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'vite'

const root=process.cwd(), cache=resolve('.cache'), checks=[], graph=[]
await mkdir(cache,{recursive:true});const temporary=await mkdtemp(join(cache,'nova-observability-state-'))
const corePath=resolve('src/runtime/largeWorldPerformance.ts'), adapterPath=resolve('src/editor/performanceStateAdapter.ts')
const test=async(name,action)=>{await action();checks.push({name,status:'passed'})}
try{
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},plugins:[{name:'capture-performance-core-graph',generateBundle(){graph.push(...this.getModuleIds())}}],
    build:{ssr:true,write:false,rollupOptions:{input:corePath,output:{inlineDynamicImports:true}}}})
  await test('compiled pure performance core reaches no Vue, Editor, store or platform service',()=>{
    assert.ok(graph.some(id=>id.replaceAll('\\','/').endsWith('/runtime/performance/observability.ts')))
    for(const id of graph)assert.ok(!/(?:node_modules\/.*(?:vue|pinia)|\/src\/(?:editor|store|components|platform|ui)\/)/.test(id.replaceAll('\\','/')),id)
  })
  const entry=join(temporary,'entry.ts'),normalize=x=>x.replaceAll('\\','/')
  await writeFile(entry,`export * as runtime from '${normalize(corePath)}';\nexport * as editor from '${normalize(adapterPath)}';\nexport {reactive,isReactive,toRaw,watch} from 'vue';\nimport {performanceRuntimeSettings,performanceRuntimeState} from '${normalize(corePath)}';\nexport function livePair(){return [performanceRuntimeSettings,performanceRuntimeState]}`)
  await build({configFile:false,root,logLevel:'error',ssr:{noExternal:true},build:{ssr:true,outDir:temporary,emptyOutDir:false,rollupOptions:{input:entry,output:{entryFileNames:'contract.mjs',inlineDynamicImports:true}}}})
  const m=await import(pathToFileURL(join(temporary,'contract.mjs')).href),r=m.runtime
  const rawSettings=r.performanceRuntimeSettings,rawState=r.performanceRuntimeState,scheduler=r.performanceComponentScheduler,commands=r.performanceCommandQueue
  await test('default Runtime state is plain and all observers use the original single owner',()=>{
    assert.equal(m.isReactive(rawSettings),false);assert.equal(m.isReactive(rawState),false)
    r.performanceRuntimeSettings.reactivePublishInterval=1;r.beginPerformanceFrame(10,10);r.markPerformanceSubmission(11);r.completePerformanceFrame(12)
    assert.equal(rawState.frame,1);assert.equal(rawState.cpuFrameMs,2);assert.equal(rawState.inputToSubmitMs,null)
  })
  await test('Editor adapter wraps the same raw state through live ESM exports',()=>{
    m.editor.installEditorPerformanceState()
    assert.equal(m.isReactive(r.performanceRuntimeSettings),true);assert.equal(m.isReactive(r.performanceRuntimeState),true)
    assert.equal(m.toRaw(r.performanceRuntimeSettings),rawSettings);assert.equal(m.toRaw(r.performanceRuntimeState),rawState)
    assert.deepEqual(m.livePair(),[r.performanceRuntimeSettings,r.performanceRuntimeState])
    assert.equal(r.performanceComponentScheduler,scheduler);assert.equal(r.performanceCommandQueue,commands)
  })
  await test('actual Vue subscription refreshes from existing owner writes without mirror state',()=>{
    const frames=[],settings=[]
    const stopFrame=m.watch(()=>r.performanceRuntimeState.frame,v=>frames.push(v),{flush:'sync'})
    const stopSettings=m.watch(()=>r.performanceRuntimeSettings.targetFrameMs,v=>settings.push(v),{flush:'sync'})
    try{r.beginPerformanceFrame(26,26);r.markPerformanceSubmission(28);r.completePerformanceFrame(30);r.performanceRuntimeSettings.targetFrameMs=20
      assert.deepEqual(frames,[2]);assert.deepEqual(settings,[20]);assert.equal(rawState.frame,2);assert.equal(rawSettings.targetFrameMs,20)
    }finally{stopFrame();stopSettings()}
  })
  await test('repeated installers cannot replace targets, observers, schedulers or settings',()=>{
    const installedState=r.performanceRuntimeState,installedSettings=r.performanceRuntimeSettings
    let attempted=0;r.installPerformanceStateAdapter(value=>{attempted++;return value});m.editor.installEditorPerformanceState()
    assert.equal(attempted,0);assert.equal(r.performanceRuntimeState,installedState);assert.equal(r.performanceRuntimeSettings,installedSettings)
    assert.equal(r.performanceComponentScheduler,scheduler);assert.equal(r.performanceCommandQueue,commands)
  })
  await test('reset preserves proxy identity and existing frame subscriber lifecycle',()=>{
    const state=r.performanceRuntimeState,seen=[],off=r.subscribePerformanceObservations(sample=>seen.push(sample))
    try{r.resetPerformanceRuntime();assert.equal(r.performanceRuntimeState,state);assert.equal(m.toRaw(state),rawState)
      r.beginPerformanceFrame(40,40);const token=r.markPerformanceInput(41);r.markPerformanceSubmission(45,token);r.completePerformanceFrame(47)
      assert.equal(seen.length,1);assert.equal(seen[0].inputToSubmitMs,4);assert.equal(state.inputToPixelMs,null);assert.equal(state.gpuMs,null)
      assert.equal(r.performanceObservationDiagnostics().subscribers,1)
    }finally{off();off()}
    assert.equal(r.performanceObservationDiagnostics().subscribers,0)
  })
  const hashes={};for(const path of [corePath,adapterPath,resolve('scripts/verify-engine-observability-state.mjs')])hashes[path]=createHash('sha256').update(await readFile(path)).digest('hex')
  const report=resolve('.cache/engine-observability-state.json')
  await writeFile(report,JSON.stringify({status:'passed',scope:'SHORT_SMOKE compiled pure performance slice and actual Vue adapter; not whole Runtime/Player M1 or physical performance qualification.',checks,graph,hashes},null,2)+'\n')
  console.log(JSON.stringify({status:'passed',checks:checks.length,report}))
}finally{await rm(temporary,{recursive:true,force:true})}
