/** Public Editor controls plus bounded read-only compiled Owner inspection. Functional SHORT_SMOKE, never performance evidence. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const root=resolve(process.env.NOVA_AUDIT_ROOT||process.cwd())
const dist=resolve(root,process.env.NOVA_AUDIT_DIST_DIRECTORY||'.cache/engine-overhaul/profile-dist')
const expectedBuild='engine-profile-0e471944f69801413717'
const expectedSource='0e471944f6980141371767bc0163f0d35dd84632357d17edd50f583cfc4149ec'
const output=resolve(root,process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'.cache/engine-overhaul/render-request-ui-0e471-attempt1')
assert.ok(relative(root,output)&&!relative(root,output).startsWith('..'))
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const manifestBytes=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(manifestBytes)
assert.equal(manifest.buildId,expectedBuild);assert.equal(manifest.sourceHash,expectedSource)
assert.equal(manifest.mode,'optimized-profiling');assert.equal(manifest.profilingApiEnabled,true)
for(const artifact of manifest.artifacts)assert.equal(sha(await readFile(join(dist,artifact.path))),artifact.sha256,artifact.path)
await mkdir(output) // An existing attempt, including failure, must never be overwritten.
await writeFile(join(output,'profile-build-manifest.json'),manifestBytes)
await writeFile(join(output,'profile-module-graph.json'),await readFile(join(dist,'engine-module-graph.json')))
await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
const fixture=resolve(root,'reference-projects/projects/physics-v2617-platformer/project.nova')
const fixtureBytes=await readFile(fixture),doc=JSON.parse(fixtureBytes)
assert.equal(doc.scenes[0].entities.length,11)
const fixtureComponentCount=doc.scenes[0].entities.reduce((n,e)=>n+e.components.length,0)
assert.equal(fixtureComponentCount,59)
assert.equal(doc.projectSettings.rendering.lightingEnabled,true)
const evidence={scope:'SHORT_SMOKE_FUNCTIONAL_UI',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,
 manifestSha256:sha(manifestBytes),fixture,fixtureSha256:sha(fixtureBytes),fixtureEntityCount:11,fixtureComponentCount,previous41ComponentClaim:'Does not match this unchanged reference JSON (59); no project reduction made.',window:{width:1600,height:900,dpr:1},
 graphicsEvidence:'HEADLESS_EDGE_SWIFTSHADER_SOFTWARE',diagnosticInterference:'Bounded read-only V8 pauses at actual admitted Owner; screenshots and DOM polling. No FPS/latency/performance conclusions.',
 budgetReads:[],drawObservations:[],checks:[],notTested:['Native Tauri/WebView','Physical monitor DPI, hardware GPU performance and physical display',
 'Formal B/X/H or QualityLocked/AdaptiveExperience performance sampling','Complete lighting pixel regression',
 'Normal physical foreground motion; prior strict Reduced Motion 3s FAIL remains unchanged']}

// Locate the actual emitted beginFrame statement after budget latch and Off cleanup.
const candidates=[]
for(const artifact of manifest.artifacts.filter(x=>x.path.endsWith('.js'))){
 const code=await readFile(join(dist,artifact.path),'utf8')
 if(!code.includes('gpuTimingBudget'))continue
 const source=ts.createSourceFile(artifact.path,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 const visit=node=>{
  if(ts.isMethodDeclaration(node)&&node.name.getText(source)==='beginFrame'&&node.body){
   const text=node.body.getText(source)
   if(text.includes('this.gpuTimingBudget=')){
    const findCall=child=>{
     if(ts.isCallExpression(child)&&child.getText(source).startsWith('Object.assign(this.stats,{drawCalls:0')){const at=source.getLineAndCharacterOfPosition(child.getStart(source));candidates.push({path:artifact.path,sha256:artifact.sha256,lineNumber:at.line,columnNumber:at.character,callSha256:sha(child.getText(source))})}
     ts.forEachChild(child,findCall)
    }
    findCall(node.body)
   }
  }
  ts.forEachChild(node,visit)
 }
 visit(source)
}
assert.equal(candidates.length,1,'The actual budget latch must be uniquely located')
evidence.compiledBudgetProbe=candidates[0]
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist)
process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
await withBrowserAudit({root,release:'26.37',name:'engine-render-request',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a),probe=evidence.compiledBudgetProbe
 const rows=selector=>`[...document.querySelectorAll(${JSON.stringify(selector+' tbody tr')})].map(e=>({name:e.querySelector('th')?.textContent,cpu:e.querySelector('td')?.textContent,drawCalls:e.querySelector('td:last-child')?.textContent}))`
 const draw=()=>a.evaluate(`({status:document.querySelector('[data-audit=render-request-status]')?.textContent,currentCaption:document.querySelector('[data-audit=render-current-request] caption')?.textContent,current:${rows('[data-audit=render-current-request]')},historicalCopy:document.querySelector('[data-audit=render-historical-submission]')?.textContent??null,historical:${rows('[data-audit=render-historical-passes]')}})`)
 const scriptRows=()=>a.evaluate(`[...document.querySelectorAll('.script-profile-table .profile-row')].map(e=>({function:e.querySelector('strong')?.textContent,script:e.querySelector('small')?.textContent,calls:Number(e.querySelector('output')?.textContent),outputs:[...e.querySelectorAll('output')].map(o=>o.textContent)}))`)
 let breakpoint,offPaused,pending=Promise.resolve(),probeFailure
 const cleanup=async()=>{if(breakpoint){await a.client.send('Debugger.removeBreakpoint',{breakpointId:breakpoint});breakpoint=null}await pending;offPaused?.();offPaused=null;await a.client.send('Debugger.disable')}
 const readBudget=async phase=>{
  await a.client.send('Debugger.enable')
  let observation
  offPaused=a.client.on('Debugger.paused',event=>{pending=(async()=>{
   try{
    assert.ok(event.hitBreakpoints.includes(breakpoint));assert.ok(evidence.budgetReads.length<8)
    const frame=event.callFrames[0]
    const result=await a.client.send('Debugger.evaluateOnCallFrame',{callFrameId:frame.callFrameId,expression:'JSON.stringify({budget:this.gpuTimingBudget,pendingQueries:this.pendingTimers.length,activeQuery:!!this.activeTimer,frameSerial:this.frameSerial,deviceEpoch:this.deviceEpoch,status:this.stats.gpuSubmissionStatus,extensionPresent:!!this.timerExtension})',returnByValue:true})
    assert.equal(result.exceptionDetails,undefined)
    observation={phase,location:frame.location,functionName:frame.functionName,value:JSON.parse(result.result.value)}
    evidence.budgetReads.push(observation)
    await a.client.send('Debugger.removeBreakpoint',{breakpointId:breakpoint});breakpoint=null
   }catch(error){probeFailure=error}
   finally{await a.client.send('Debugger.resume').catch(error=>{probeFailure??=error})}
  })()})
  const escaped=probe.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const bp=await a.client.send('Debugger.setBreakpointByUrl',{urlRegex:escaped+'$',lineNumber:probe.lineNumber,columnNumber:probe.columnNumber})
  breakpoint=bp.breakpointId;assert.equal(bp.locations.length,1)
  const deadline=Date.now()+20000
  while(!observation&&!probeFailure&&Date.now()<deadline)await wait(40)
  await cleanup();if(probeFailure)throw probeFailure
  assert.ok(observation,'An actual admitted frame must latch '+phase)
  return observation.value
 }
 try{
  await ui.open(fixture);await a.until('!!window.novaPerformanceDiagnosticsV1')
  await a.check('new immutable artifact opens the original unchanged 11 entity / 59 component lit platformer',async()=>{
   evidence.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(evidence.metadata.buildId,expectedBuild)
   evidence.actualContext=await a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info'),r=c.getBoundingClientRect();return {backend:'WebGL2',lost:gl.isContextLost(),renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR),cssWidth:r.width,cssHeight:r.height,backingWidth:c.width,backingHeight:c.height,dpr:devicePixelRatio,physicalMonitorDpi:null}})()`)
   assert.equal(evidence.actualContext.lost,false);assert.equal(evidence.actualContext.dpr,1);assert.ok(evidence.actualContext.renderer.includes('SwiftShader'))
   assert.equal(evidence.metadata.executionMode,'single-thread-compat')
  })
  await ui.workspace('Debug');await ui.bottom('profiler','Profiler')
  const modeSelect='.settings-card select'
  const modes=[['Low overhead','sampled',8,4],['Full','full',1,4],['Off','off',null,0]]
  for(const [uiMode,mode,interval,max]of modes)await a.check('public Profiler '+uiMode+' reaches the real admitted WebGL2 GPU diagnostic budget',async()=>{
   await a.select(modeSelect,uiMode)
   const result=await readBudget(uiMode);assert.equal(result.budget.mode,mode);assert.equal(result.budget.sampleIntervalFrames,interval);assert.equal(result.budget.maxPendingQueries,max)
   if(mode==='off'){assert.equal(result.pendingQueries,0);assert.equal(result.activeQuery,false)}
  })
  await a.select(modeSelect,'Full')
  await a.check('Profiler frame samples and current values continue updating through the reactive adapter',async()=>{
   evidence.profilerBefore=await a.evaluate(`({samples:document.querySelector('.metrics-card header>span').textContent,metrics:document.querySelector('.metrics-card .metrics').textContent})`)
   const before=JSON.stringify(evidence.profilerBefore)
   await a.until(`JSON.stringify({samples:document.querySelector('.metrics-card header>span').textContent,metrics:document.querySelector('.metrics-card .metrics').textContent})!==${JSON.stringify(before)}`)
   evidence.profilerAfter=await a.evaluate(`({samples:document.querySelector('.metrics-card header>span').textContent,metrics:document.querySelector('.metrics-card .metrics').textContent})`)
  })
  await a.check('latest submitted request is explicitly CPU scoped and the Lighting path remains active',async()=>{
   await a.until(`document.querySelector('[data-audit=render-request-status]')?.textContent.includes('submitted WorldRenderer graphics API')&&[...document.querySelectorAll('[data-audit=render-current-request] tbody tr')].some(e=>e.querySelector('th')?.textContent==='Lighting'&&e.querySelector('td')?.textContent.includes('ms'))`)
   evidence.submitted=await draw();assert.match(evidence.submitted.status,/GPU.*display.*unmeasured/i);assert.equal(evidence.submitted.historicalCopy,null)
   await a.capture('submitted-lit-platformer')
  })
  // Only naturally occurring not-submitted requests are observed; no renderer/GPU failure is forced.
  const deadline=Date.now()+10000
  for(let i=0;i<120&&Date.now()<deadline;i++){
   const observed=await draw()
   if(observed.status?.startsWith('This draw request was not submitted')){evidence.drawObservations.push(observed);break}
   await wait(65)
  }
  if(evidence.drawObservations.length)await a.check('a natural unsubmitted request keeps separate historical CPU rows without stale current costs',async()=>{
   const observed=evidence.drawObservations[0];assert.match(observed.status,/previously submitted.*retained.*unknown/i)
   assert.ok(observed.current.length);assert.ok(observed.current.every(x=>x.cpu==='Not submitted'))
   assert.ok(observed.historical.length&&observed.historical.length<=5);assert.match(observed.historicalCopy,/historical.*not.*current.*GPU.*display/i)
   evidence.historyScreenshot=await a.capture('retained-world-diagnostic')
   evidence.historyScreenshotScope='Screenshot is a later actual frame; raw snapshot establishes the atomic current/history DOM state. It is not guaranteed to retain the same transient status.'
  })
  else evidence.notTested.push('Natural not-submitted with history did not occur in the bounded 10s DOM observation; no synthetic failure induced')

  await ui.workspace('Script')
  await a.check('Script Debugger add/remove watch renders the same reactive debug state using public controls',async()=>{
   await a.until('!!document.querySelector(".script-studio")')
   if(!await a.evaluate(`!!document.querySelector('.studio-inspector')?.getBoundingClientRect().width`))await a.click('.studio-toolbar .toolbar-actions>button[aria-expanded]',1)
   await a.clickText('.inspector-tabs button','Debug',true);await a.until("!!document.querySelector('.debug-pane .dependency-editor input')")
   evidence.scriptDebuggerBefore=await a.evaluate("document.querySelector('.debug-pane').textContent")
   await ui.field('.debug-pane .dependency-editor input','1 + 1');await a.press('Enter')
   // field commits by Tab, so activate the real adjacent Add control.
   if(!await a.evaluate(`[...document.querySelectorAll('.debug-pane label b')].some(e=>e.textContent==='1 + 1')`))await a.click('.debug-pane .dependency-editor button')
   await a.until(`[...document.querySelectorAll('.debug-pane label b')].some(e=>e.textContent==='1 + 1')`)
   evidence.scriptDebuggerAdded=await a.evaluate("document.querySelector('.debug-pane').textContent");await a.capture('script-debug-reactive-watch')
   const index=await a.evaluate(`[...document.querySelectorAll('.debug-pane label')].findIndex(e=>e.querySelector('b')?.textContent==='1 + 1')`)
   await a.click('.debug-pane label button',await a.evaluate(`[...document.querySelectorAll('.debug-pane label button')].findIndex(e=>e.closest('label').querySelector('b')?.textContent==='1 + 1')`))
   assert.ok(index>=0);await a.until(`![...document.querySelectorAll('.debug-pane label b')].some(e=>e.textContent==='1 + 1')`)
   evidence.scriptDebuggerRemoved=await a.evaluate("document.querySelector('.debug-pane').textContent")
  })
  await ui.workspace('Debug');await ui.bottom('profiler','Profiler');await a.click('.sidebar nav button',0)
  await a.click('.actionbar button',0)
  await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
  await a.clickText('.production-panel>.ui-tabs button','Scripts',true)
  await a.check('actual running Rhai function profile rows and calls refresh in the Profiler Vue view',async()=>{
   await a.until("document.querySelectorAll('.script-profile-table .profile-row').length>0")
   evidence.scriptProfilesBefore=await scriptRows();const before=JSON.stringify(evidence.scriptProfilesBefore)
   await a.until(`[...document.querySelectorAll('.script-profile-table .profile-row')].some(e=>Number(e.querySelector('output')?.textContent)>${Math.max(...evidence.scriptProfilesBefore.map(x=>x.calls))})`)
   evidence.scriptProfilesAfter=await scriptRows();assert.notEqual(JSON.stringify(evidence.scriptProfilesAfter),before);await a.capture('script-profiler-reactive-runtime')
  })
  await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'")
  await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
  await a.check('Comfortable 16/44 and panel spacing/radius remain unchanged; ordinary motion preference stays enabled',async()=>{
   evidence.geometry=await a.evaluate(`(()=>{const p=document.querySelector('[data-performance-policy=v1]'),s=getComputedStyle(p),h=getComputedStyle(p.querySelector('header'));return {font:parseFloat(getComputedStyle(document.body).fontSize),rootZoom:getComputedStyle(document.documentElement).zoom,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],radius:s.borderRadius,margin:[s.marginTop,s.marginRight,s.marginBottom,s.marginLeft],headerGap:h.gap,controls:[...p.querySelectorAll('input,select')].map(e=>({font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height})),motion:{attributes:{...document.documentElement.dataset},systemReduced:matchMedia('(prefers-reduced-motion: reduce)').matches}}})()`)
   const g=evidence.geometry;assert.equal(g.font,16);assert.equal(g.rootZoom,'1');assert.deepEqual(g.padding,Array(4).fill('20px'));assert.equal(g.radius,'16px');assert.deepEqual(g.margin,Array(4).fill('8px'));assert.equal(g.headerGap,'12px')
   assert.equal(g.controls.length,6);for(const c of g.controls){assert.ok(c.font>=16);assert.ok(c.height>=43.9)}
   assert.equal(g.motion.systemReduced,false);assert.equal(g.motion.attributes.uiMotion,'on');assert.equal(g.motion.attributes.reduceMotion,'false')
   await a.evaluate("document.querySelector('[data-performance-policy=v1]').scrollIntoView({block:'center'})");await a.capture('comfortable-production-policy')
  })
  evidence.browser=await a.client.send('Browser.getVersion');evidence.completedAt=new Date().toISOString()
 }finally{
  await cleanup().catch(error=>{evidence.probeCleanupError=String(error)})
  evidence.checks=a.checks;await writeFile(join(output,'render-request-gui-raw.json'),JSON.stringify(evidence,null,2)+'\n')
 }
})
assert.equal(sha(await readFile(join(dist,'engine-build-manifest.json'))),evidence.manifestSha256)
assert.equal(sha(await readFile(fixture)),evidence.fixtureSha256)
console.log(JSON.stringify({status:process.exitCode?'failed':'verified',scope:evidence.scope,buildId:manifest.buildId,output}))
