/** Frozen Editor public settings/save/open/Play smoke. Debugger reads are functional evidence, never performance data. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import ts from 'typescript'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const root=resolve(process.env.NOVA_AUDIT_ROOT||process.cwd())
const dist=resolve(root,process.env.NOVA_AUDIT_DIST_DIRECTORY||'.cache/engine-overhaul/profile-dist-f3aa3')
const expectedBuild='engine-profile-f3aa368fad00b3a26e91'
const expectedSource='f3aa368fad00b3a26e9182f1409fa9bf05022a4a2edf7a2b657a0198bcc1782d'
const output=resolve(root,process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'.cache/engine-overhaul/production-ui-f3aa-attempt1')
assert.ok(relative(root,output)&&!relative(root,output).startsWith('..'),'Evidence stays inside the workspace')
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const manifestBytes=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(manifestBytes)
assert.equal(manifest.buildId,expectedBuild);assert.equal(manifest.sourceHash,expectedSource)
assert.equal(manifest.mode,'optimized-profiling');assert.equal(manifest.profilingApiEnabled,true)
for(const artifact of manifest.artifacts)assert.equal(sha(await readFile(join(dist,artifact.path))),artifact.sha256,artifact.path)
// An existing attempt is evidence, including failures; never reuse it.
await mkdir(output)
await writeFile(join(output,'profile-build-manifest.json'),manifestBytes)
await writeFile(join(output,'profile-module-graph.json'),await readFile(join(dist,'engine-module-graph.json')))
const fixture=resolve(root,'reference-projects/projects/physics-v2617-platformer/project.nova')
const fixtureBytes=await readFile(fixture),fixtureDocument=JSON.parse(fixtureBytes)
const evidence={scope:'SHORT_SMOKE_FUNCTIONAL_UI',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(manifestBytes),
  fixture,fixtureSha256:sha(fixtureBytes),window:{width:1600,height:900,dpr:1},graphicsEvidence:'HEADLESS_EDGE_SWIFTSHADER_SOFTWARE',
  debuggerScope:'Read-only actual compiled configureJobScheduler call arguments. Brief automatic pause/resume perturbs timing; no performance or latency samples are collected.',
  callbacks:[],checks:[],notTested:['Native Tauri/WebView and native OS picker','Physical monitor DPI, hardware GPU performance and physical display latency',
    'Full lighting pixel regression, all lighting materials and loss/recovery','Normal physical foreground motion; prior strict Reduced Motion 3s FAIL retained without retesting',
    'Formal B0–B8/X01–X15/H1/H2 or QualityLocked/AdaptiveExperience performance sampling','New source slices after this immutable f3aa artifact']}

// No source map is required. Locate one actual emitted function by its three clamps and wake call.
const candidates=[]
for(const artifact of manifest.artifacts.filter(x=>x.path.endsWith('.js'))){
 const code=await readFile(join(dist,artifact.path),'utf8')
 if(!code.includes('Job revision key capacity exceeded'))continue
 const source=ts.createSourceFile(artifact.path,code,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS)
 const visit=node=>{
  if(ts.isFunctionDeclaration(node)&&node.name&&node.body){
   const text=node.getText(source)
   if(/maxWorkers:[^,]+\([^,]+\.maxWorkers,[^,]+\.maxWorkers,0,8\)/.test(text)&&text.includes('.maxQueued,8,2048)')&&text.includes('.timeoutMs,100,12e4)')&&text.includes('.wake()')){
    const at=source.getLineAndCharacterOfPosition(node.body.statements[0].getStart(source))
    candidates.push({path:artifact.path,sha256:artifact.sha256,functionName:node.name.text,argumentName:node.parameters[0].name.getText(source),lineNumber:at.line,columnNumber:at.character,functionBytes:text.length,functionSha256:sha(text)})
   }
  }
  ts.forEachChild(node,visit)
 }
 visit(source)
}
assert.equal(candidates.length,1,'Actual compiled configuration function must be uniquely identified')
evidence.compiledConfiguration=candidates[0]
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist)
process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
await withBrowserAudit({root,release:'26.37',name:'engine-production-state',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a),probe=evidence.compiledConfiguration
 const jobsCard=()=>a.evaluate(`(()=>{const c=[...document.querySelectorAll('.production-panel section.card')].find(e=>e.querySelector('header>strong')?.textContent==='Bounded job scheduler');return c?{fields:[...c.querySelectorAll('label')].map(e=>({label:e.querySelector('span').textContent,value:Number(e.querySelector('input').value)})),statistics:[...c.querySelectorAll('dl>div')].map(e=>({label:e.querySelector('dt').textContent,value:e.querySelector('dd').textContent}))}:null})()`)
 const actualContext=()=>a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),gl=c.getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info'),r=c.getBoundingClientRect();return {backend:'WebGL2',lost:gl.isContextLost(),renderer:gl.getParameter(ext?ext.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(ext?ext.UNMASKED_VENDOR_WEBGL:gl.VENDOR),backingWidth:c.width,backingHeight:c.height,cssWidth:r.width,cssHeight:r.height,dpr:devicePixelRatio,physicalMonitorDpi:null,timeOrigin:performance.timeOrigin}})()`)
 const passes=()=>a.evaluate(`[...document.querySelectorAll('.presentation-diagnostics tbody tr')].map(e=>({name:e.querySelector('th').textContent,cpu:e.querySelector('td').textContent,drawCalls:e.querySelector('td:last-child').textContent}))`)
 let breakpoint,offPaused,probeFailure,probePhase='idle',pendingProbe=Promise.resolve()
 const stopProbe=async()=>{if(breakpoint){await a.client.send('Debugger.removeBreakpoint',{breakpointId:breakpoint});breakpoint=null}offPaused?.();offPaused=null;await pendingProbe;await a.client.send('Debugger.disable');if(probeFailure)throw probeFailure}
 const startProbe=async()=>{
  await a.client.send('Debugger.enable')
  offPaused=a.client.on('Debugger.paused',event=>{
   pendingProbe=(async()=>{
    try{
     assert.ok(event.hitBreakpoints.includes(breakpoint),'Only the selected compiled configuration callback may pause')
     assert.ok(evidence.callbacks.length<64,'Bounded callback collection')
     const frame=event.callFrames[0],observed=await a.client.send('Debugger.evaluateOnCallFrame',{callFrameId:frame.callFrameId,expression:`JSON.stringify(${probe.argumentName})`,returnByValue:true})
     assert.equal(observed.exceptionDetails,undefined)
     evidence.callbacks.push({phase:probePhase,functionName:frame.functionName,location:frame.location,value:JSON.parse(observed.result.value),reason:event.reason})
    }catch(error){probeFailure=error}
    finally{await a.client.send('Debugger.resume').catch(error=>{probeFailure??=error})}
   })()
  })
  const escaped=probe.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  const result=await a.client.send('Debugger.setBreakpointByUrl',{urlRegex:escaped+'$',lineNumber:probe.lineNumber,columnNumber:probe.columnNumber})
  breakpoint=result.breakpointId;evidence.breakpoint={requested:{path:probe.path,lineNumber:probe.lineNumber,columnNumber:probe.columnNumber},resolved:result.locations}
  assert.ok(result.locations.length===1,'The exact emitted asset is loaded once')
 }
 try{
  await ui.open(fixture);await a.until('!!window.novaPerformanceDiagnosticsV1')
  await a.check('metadata identifies the immutable f3aa artifact and the original nonblank platformer',async()=>{
   evidence.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(evidence.metadata.buildId,expectedBuild)
   assert.equal(fixtureDocument.scenes[0].entities.length,11);assert.ok(fixtureDocument.scenes[0].entities.some(e=>e.name==='Level Light'))
   assert.equal(fixtureDocument.projectSettings.rendering.lightingEnabled,true)
   evidence.entityNames=await a.evaluate(`[...document.querySelectorAll('.entity-list .entity-item .name')].map(e=>[...e.childNodes].filter(n=>n.nodeName!=='SMALL').map(n=>n.textContent).join('').trim())`)
  })
  await ui.workspace('Debug');await ui.bottom('profiler','Profiler')
  await a.check('the existing canvas has one actual WebGL2 software context and the original CSS/DPR scale',async()=>{
   evidence.actualContext=await actualContext();assert.equal(evidence.actualContext.lost,false);assert.equal(evidence.actualContext.dpr,1)
   assert.ok(evidence.actualContext.renderer.includes('SwiftShader'));assert.equal(evidence.metadata.executionMode,'single-thread-compat')
  })
  await a.check('the actual enabled Lighting pass and surrounding passes render the existing lit scene',async()=>{
   await a.until(`[...document.querySelectorAll('.presentation-diagnostics tbody tr')].some(e=>e.querySelector('th')?.textContent==='Lighting'&&e.querySelector('td')?.textContent.includes('ms'))`)
   evidence.previewPasses=await passes();assert.ok(evidence.previewPasses.some(x=>x.name==='Lighting'&&x.cpu.includes('ms')))
   await a.capture('lit-platformer-preview')
  })
  await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
  await startProbe();evidence.beforeJobs=await jobsCard()
  const edits=[['Maximum workers',1,'maxWorkers'],['Maximum queued jobs',96,'maxQueued'],['Job timeout (ms)',18000,'timeoutMs']]
  await a.check('actual public edits call the same production Jobs configuration watcher with each new value',async()=>{
   for(const [label,value,key]of edits){probePhase='edit-'+key;const before=evidence.callbacks.length;await ui.labeled('.production-panel',label,value);await pendingProbe;if(probeFailure)throw probeFailure;assert.ok(evidence.callbacks.slice(before).some(x=>x.value[key]===value),key+' must reach actual configureJobScheduler');assert.equal(await ui.readLabel('.production-panel',label),value)}
   evidence.editedJobs=await jobsCard()
  })
  await stopProbe()
  await a.check('the public Test JSON job completes and its reactive Jobs statistics update',async()=>{
   const before=Number(evidence.editedJobs.statistics.find(x=>x.label==='Completed').value)
   await a.clickText('.production-panel button','Test JSON job',true)
   await a.until(`[...document.querySelectorAll('.production-panel section.card p')].some(e=>e.textContent==='{"nova":2.8}')`)
   evidence.completedJob=await jobsCard();assert.ok(Number(evidence.completedJob.statistics.find(x=>x.label==='Completed').value)>before)
  })
  await a.check('Comfortable font/control/panel geometry and ordinary motion preference remain unchanged',async()=>{
   evidence.geometry=await a.evaluate(`(()=>{const p=document.querySelector('[data-performance-policy=v1]'),s=getComputedStyle(p),h=getComputedStyle(p.querySelector('header'));return {font:parseFloat(getComputedStyle(document.body).fontSize),rootZoom:getComputedStyle(document.documentElement).zoom,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],radius:s.borderRadius,margin:[s.marginTop,s.marginRight,s.marginBottom,s.marginLeft],headerGap:h.gap,controls:[...p.querySelectorAll('input,select')].map(e=>({label:e.getAttribute('aria-label'),font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height})),motion:{attributes:{...document.documentElement.dataset},systemReduced:matchMedia('(prefers-reduced-motion: reduce)').matches}}})()`)
   const g=evidence.geometry;assert.equal(g.font,16);assert.equal(g.rootZoom,'1');assert.deepEqual(g.padding,Array(4).fill('20px'));assert.equal(g.radius,'16px');assert.deepEqual(g.margin,Array(4).fill('8px'));assert.equal(g.headerGap,'12px');assert.equal(g.controls.length,6)
   for(const c of g.controls){assert.ok(c.font>=16);assert.ok(c.height>=43.9,c.label)}
   await a.evaluate("document.querySelector('[data-performance-policy=v1]').scrollIntoView({block:'center'})");await a.capture('comfortable-production-jobs')
  })
  const saved=await ui.save('f3aa-production-settings');evidence.saved={file:saved.file,sha256:sha(await readFile(saved.file)),jobs:saved.document.projectSettings.production.jobs,sceneNames:saved.document.scenes.map(s=>s.name)}
  await a.check('public Save Project downloads the edited production values with the existing scene and light',async()=>{
   assert.deepEqual(evidence.saved.jobs,{maxWorkers:1,maxQueued:96,timeoutMs:18000})
   assert.equal(saved.document.scenes[0].entities.length,11);assert.ok(saved.document.scenes[0].entities.some(e=>e.name==='Level Light'))
  })
  // Reload creates the existing fresh Editor, not a second test state owner.
  await a.client.send('Debugger.enable')
  offPaused=a.client.on('Debugger.paused',event=>{
   pendingProbe=(async()=>{try{assert.ok(event.hitBreakpoints.includes(breakpoint));assert.ok(evidence.callbacks.length<64);const frame=event.callFrames[0],observed=await a.client.send('Debugger.evaluateOnCallFrame',{callFrameId:frame.callFrameId,expression:`JSON.stringify(${probe.argumentName})`,returnByValue:true});assert.equal(observed.exceptionDetails,undefined);evidence.callbacks.push({phase:'public-reopen',functionName:frame.functionName,location:frame.location,value:JSON.parse(observed.result.value),reason:event.reason})}catch(error){probeFailure=error}finally{await a.client.send('Debugger.resume').catch(error=>{probeFailure??=error})}})()
  })
  const escaped=probe.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')
  breakpoint=(await a.client.send('Debugger.setBreakpointByUrl',{urlRegex:escaped+'$',lineNumber:probe.lineNumber,columnNumber:probe.columnNumber})).breakpointId
  await ui.open(saved.file);await pendingProbe;await stopProbe()
  await ui.workspace('Debug');await ui.bottom('profiler','Profiler');await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
  await a.check('fresh public reopening restores the saved values through the actual configuration watcher',async()=>{
   assert.ok(evidence.callbacks.some(x=>x.phase==='public-reopen'&&x.value.maxWorkers===1&&x.value.maxQueued===96&&x.value.timeoutMs===18000))
   for(const[label,value]of edits)assert.equal(await ui.readLabel('.production-panel',label),value)
   evidence.reopenedJobs=await jobsCard();evidence.reopenedMetadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(evidence.reopenedMetadata.buildId,expectedBuild)
   await a.capture('reopened-production-settings')
  })
  await a.clickText('.production-panel>.ui-tabs button','Frame trace',true)
  await a.click('.sidebar nav button',0);await a.until("document.querySelector('canvas.overlay-canvas[data-game-input-surface]')?.getAttribute('aria-label')==='Game'")
  await a.click('.actionbar button',0)
  await a.check('public Play runs the reopened lit platformer and publishes actual physics/Lighting diagnostics',async()=>{
   await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
   await a.until(`[...document.querySelectorAll('.metrics article')].some(e=>e.querySelector('span')?.textContent==='Runtime bodies'&&Number(e.querySelector('strong')?.textContent)>0)`)
   // A deferred GPU submission leaves the per-frame graph disabled. Observe a real admitted frame,
   // as in Preview; the prior attempt's immediate-read failure remains separate evidence.
   await a.until(`[...document.querySelectorAll('.presentation-diagnostics tbody tr')].some(e=>e.querySelector('th')?.textContent==='Lighting'&&e.querySelector('td')?.textContent.includes('ms'))`)
   evidence.playPasses=await passes();assert.ok(evidence.playPasses.some(x=>x.name==='Lighting'&&x.cpu.includes('ms')))
   evidence.playContext=await actualContext();assert.equal(evidence.playContext.lost,false);assert.equal(evidence.playContext.dpr,1)
   evidence.playMetrics=await a.evaluate(`[...document.querySelectorAll('.metrics article')].filter(e=>['Runtime bodies','Active contacts'].includes(e.querySelector('span')?.textContent)).map(e=>({label:e.querySelector('span').textContent,value:e.querySelector('strong').textContent}))`)
   await a.capture('reopened-lit-platformer-play')
  })
  await a.click('.actionbar button',3)
  await a.check('public Stop ends the session and returns the existing lit authoring scene',async()=>{
   await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'&&document.querySelectorAll('.actionbar button')[1]?.disabled&&document.querySelectorAll('.actionbar button')[3]?.disabled")
   evidence.stoppedContext=await actualContext();assert.equal(evidence.stoppedContext.lost,false)
   evidence.stopPasses=await passes();await a.capture('reopened-lit-platformer-stop')
  })
  evidence.browser=await a.client.send('Browser.getVersion');evidence.completedAt=new Date().toISOString();evidence.checks=a.checks
 }finally{
  if(breakpoint||offPaused)await stopProbe().catch(error=>{evidence.probeCleanupError=String(error)})
  evidence.checks=a.checks;await writeFile(join(a.evidence,'production-state-gui-raw.json'),JSON.stringify(evidence,null,2)+'\n')
 }
})
assert.equal(sha(await readFile(join(dist,'engine-build-manifest.json'))),evidence.manifestSha256)
assert.equal(sha(await readFile(fixture)),evidence.fixtureSha256,'The user/reference project stays unchanged')
console.log(JSON.stringify({status:process.exitCode?'failed':'verified',scope:evidence.scope,buildId:manifest.buildId,output}))
