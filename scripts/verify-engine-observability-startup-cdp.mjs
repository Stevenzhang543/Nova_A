/** Public Editor startup/window/capture controls on a frozen artifact. Software SHORT_SMOKE, not startup qualification. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { withBrowserAudit, wait } from './lib/browserUserAudit.mjs'
import { worldUserControls17 } from './lib/worldAudit17.mjs'

const root=resolve(process.env.NOVA_AUDIT_ROOT||process.cwd()),dist=resolve(root,process.env.NOVA_AUDIT_DIST_DIRECTORY||'.cache/engine-overhaul/profile-dist')
const output=process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'.cache/engine-overhaul/startup-window-gui'
const sha=bytes=>createHash('sha256').update(bytes).digest('hex')
const manifestBytes=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(manifestBytes)
assert.equal(manifest.mode,'optimized-profiling');assert.equal(manifest.profilingApiEnabled,true)
for(const item of manifest.artifacts)assert.equal(sha(await readFile(join(dist,item.path))),item.sha256,'Frozen artifact: '+item.path)
await mkdir(resolve(root,output),{recursive:true})
await writeFile(resolve(root,output,'profile-build-manifest.json'),manifestBytes)
await writeFile(resolve(root,output,'profile-module-graph.json'),await readFile(join(dist,'engine-module-graph.json')))
const fixture=resolve(root,'reference-projects/projects/physics-v2617-platformer/project.nova')
const evidence={scope:'SHORT_SMOKE',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(manifestBytes),fixture,fixtureSha256:sha(await readFile(fixture)),
 graphicsEvidence:'HEADLESS_EDGE_SWIFTSHADER_SOFTWARE',recordingEnabled:false,checks:[],notTested:['Request-to-Ready cold/warm startup','Physical monitor DPI, GPU performance and display latency','Normal physical foreground motion','Strict Reduced Motion cleanup remains a prior FAIL; no threshold changes or cleanup retest','B0–B8/X01–X15/H1/H2 formal performance sampling'],downloads:[]}
process.env.NOVA_AUDIT_REPORT_DIRECTORY=output
await withBrowserAudit({root,release:'26.37',name:'engine-startup-window',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a),unavailable='Unavailable / not measured'
 const card=()=>a.evaluate(`(()=>{const c=[...document.querySelectorAll('.production-panel section.card')].find(e=>e.querySelector('[data-audit=cold-startup]'));return c?{fields:[...c.querySelectorAll('dl>div')].map(e=>({label:e.querySelector('dt').textContent,value:e.querySelector('dd').textContent})),cold:c.querySelector('[data-audit=cold-startup]').textContent,warm:c.querySelector('[data-audit=warm-startup]').textContent,module:c.querySelector('[data-audit=module-first-host-wall]').textContent,prefetch:c.querySelector('[data-audit=workspace-prefetch-wall]').textContent,scope:c.querySelector('[data-audit=startup-measurement-scope]').textContent}:null})()`)
 const windows=()=>a.evaluate(`({profiler:document.querySelector('[data-audit=profiler-sampling-window]')?.textContent,runtime:document.querySelector('[data-audit=runtime-sampling-window]')?.textContent})`)
 const geometry=()=>a.evaluate(`(()=>{const p=document.querySelector('[data-performance-policy=v1]'),s=getComputedStyle(p),h=getComputedStyle(p.querySelector('header'));return {font:parseFloat(getComputedStyle(document.body).fontSize),rootZoom:getComputedStyle(document.documentElement).zoom,padding:[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft],radius:s.borderRadius,margin:[s.marginTop,s.marginRight,s.marginBottom,s.marginLeft],headerGap:h.gap,controls:[...p.querySelectorAll('input,select')].map(e=>({label:e.getAttribute('aria-label'),font:parseFloat(getComputedStyle(e).fontSize),height:e.getBoundingClientRect().height}))}})()`)
 try {
  evidence.launcherWaitStartedAtMs=await a.evaluate('performance.now()');await wait(1500)
  evidence.launcherWaitEndedAtMs=await a.evaluate('performance.now()')
  await ui.open(fixture);await a.until('!!window.novaPerformanceDiagnosticsV1')
  await a.check('actual production metadata identifies the frozen profile',async()=>{evidence.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(evidence.metadata.buildId,manifest.buildId);assert.equal(evidence.metadata.actualBenchmarkMode,'off')})
  await ui.workspace('Debug');await ui.bottom('profiler','Profiler')
  await a.check('Trace explains the 240 sampled frames and 600 observed RAF intervals with actual publish policy',async()=>{evidence.traceWindows=await windows();assert.ok(evidence.traceWindows.profiler.includes('240'));assert.ok(evidence.traceWindows.profiler.includes('every 4 host'));assert.ok(evidence.traceWindows.runtime.includes('600'));assert.ok(evidence.traceWindows.runtime.includes('every 4 host'));assert.ok(evidence.traceWindows.runtime.includes('Play/Stop'))})
  await a.check('the existing actual render canvas reports its backend without another graphics owner',async()=>{
   const backend=await a.evaluate(`[...document.querySelectorAll('.presentation-diagnostics dl>div')].find(e=>e.querySelector('dt')?.textContent==='Actual backend')?.querySelector('dd')?.textContent`)
   assert.equal(backend,'WebGL2')
   evidence.actualContext=await a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),gl=c.getContext('webgl2'),x=gl.getExtension('WEBGL_debug_renderer_info'),r=c.getBoundingClientRect();return {backend:'WebGL2',lost:gl.isContextLost(),renderer:gl.getParameter(x?x.UNMASKED_RENDERER_WEBGL:gl.RENDERER),vendor:gl.getParameter(x?x.UNMASKED_VENDOR_WEBGL:gl.VENDOR),backingWidth:c.width,backingHeight:c.height,cssWidth:r.width,cssHeight:r.height,dpr:devicePixelRatio,physicalMonitorDpi:null,timeOrigin:performance.timeOrigin}})()`)
   assert.equal(evidence.actualContext.lost,false)
  })
  await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
  await a.check('Jobs shows unmeasured cold/warm startup and input without an ms suffix',async()=>{evidence.jobs=await card();assert.equal(evidence.jobs.cold,unavailable);assert.equal(evidence.jobs.warm,unavailable);assert.equal(evidence.jobs.fields.find(x=>x.label==='Input to CPU graphics submission')?.value??evidence.jobs.fields.find(x=>x.label.includes('Input to'))?.value,unavailable);assert.ok(!evidence.jobs.fields.some(x=>x.value.includes(unavailable+' ms')))})
  await a.check('module and prefetch wall labels preserve observed facts without a Ready or render claim',async()=>{
   assert.ok(evidence.jobs.fields.some(x=>x.label==='Module load to first host frame'));assert.ok(evidence.jobs.fields.some(x=>x.label==='Workspace prefetch wall time'))
   const moduleWall=Number.parseFloat(evidence.jobs.module);assert.ok(Number.isFinite(moduleWall)&&moduleWall>=evidence.launcherWaitEndedAtMs-evidence.launcherWaitStartedAtMs)
   assert.ok(evidence.jobs.prefetch===unavailable||/^\d+(?:\.\d+)? ms$/.test(evidence.jobs.prefetch));assert.ok(evidence.jobs.scope.includes('Launcher')&&evidence.jobs.scope.includes('Ready'))
   evidence.jobsWindows=await windows();assert.ok(evidence.jobsWindows.profiler.includes('240'));assert.ok(evidence.jobsWindows.runtime.includes('600'))
  })
  await a.check('Comfortable body and policy controls retain their authored geometry',async()=>{
   evidence.geometry=await geometry();const g=evidence.geometry
   assert.equal(g.font,16);assert.equal(g.rootZoom,'1');assert.deepEqual(g.padding,Array(4).fill('20px'));assert.equal(g.radius,'16px');assert.deepEqual(g.margin,Array(4).fill('8px'));assert.equal(g.headerGap,'12px')
   for(const c of g.controls){assert.ok(c.font>=16);assert.ok(c.height>=43.9,c.label)}
   evidence.motionSnapshot=await a.evaluate(`({attributes:{...document.documentElement.dataset},nowMs:performance.now(),timelineMs:document.timeline.currentTime,running:document.getAnimations().filter(a=>a.playState==='running').map(a=>({constructor:a.constructor.name,currentTime:a.currentTime,target:a.effect?.target?.tagName}))})`)
  })
  await a.evaluate("document.querySelector('[data-audit=cold-startup]').scrollIntoView({block:'center'})");await a.capture('startup-wall-and-unavailable')
  await a.viewport(540,900)
  await a.check('narrow startup rows preserve body scale and remain inside their card',async()=>{
   await a.evaluate("document.querySelector('[data-audit=cold-startup]').scrollIntoView({block:'center'})")
   evidence.narrow=await a.evaluate(`(()=>{const dd=document.querySelector('[data-audit=cold-startup]'),c=dd.closest('.card'),r=c.getBoundingClientRect();return {font:parseFloat(getComputedStyle(document.body).fontSize),zoom:getComputedStyle(document.documentElement).zoom,cardWidth:r.width,rows:[...c.querySelectorAll('dl>div')].map(e=>({width:e.getBoundingClientRect().width,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth})),module:document.querySelector('[data-audit=module-first-host-wall]').textContent}})()`)
   assert.equal(evidence.narrow.font,16);assert.equal(evidence.narrow.zoom,'1');for(const row of evidence.narrow.rows)assert.ok(row.scrollWidth<=row.clientWidth+1,'startup row horizontal overflow')
  })
  await a.capture('startup-narrow');await a.viewport(1600,900)
  await a.evaluate("document.querySelector('[data-audit=module-first-host-wall]').scrollIntoView({block:'center'})");await a.capture('startup-named-wall-observations')
  await a.clickText('.production-panel>.ui-tabs button','Frame trace',true)
  await a.check('Freeze retains samples and explains paused recording without resetting the runtime window',async()=>{
   await a.click('.metrics-card .button-row button[aria-label="Freeze"]')
   evidence.frozenWindows=await windows();assert.ok(evidence.frozenWindows.profiler.includes('Recording is paused'));assert.ok(evidence.frozenWindows.runtime.includes('600'))
   await a.click('.metrics-card .button-row button[aria-label="Resume"]')
  })
  await a.check('Full and Off show their actual recording policy while keeping the same window definitions',async()=>{
   await a.select('.settings-card select','Full');evidence.fullWindows=await windows();assert.ok(evidence.fullWindows.profiler.includes('every 1 host'))
   await a.select('.settings-card select','Off');evidence.offWindows=await windows();assert.ok(evidence.offWindows.profiler.includes('Recording is paused'));assert.ok(evidence.offWindows.runtime.includes('600'))
   await a.select('.settings-card select','Low overhead')
  })
  await a.clickText('.production-panel>.ui-tabs button','Memory & lifetimes',true)
  await a.click('.capture-card header button');await a.until("!!document.querySelector('.capture-card select')?.value")
  const captureId=await a.evaluate("document.querySelector('.capture-card select').value"),folder=join(a.profile,'startup-capture-download')
  await mkdir(folder,{recursive:true});await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true})
  await a.check('the real public download exports capture4 with nullable startup and unchanged frame schema',async()=>{
   await a.clickText('.capture-card>button','Export capture + CI result',true)
   let bytes,ciBytes;const end=Date.now()+15000
   while(Date.now()<end&&(!bytes||!ciBytes)){try{bytes=await readFile(join(folder,captureId+'.nova-perf.json'));ciBytes=await readFile(join(folder,captureId+'.ci.json'));JSON.parse(bytes);JSON.parse(ciBytes)}catch{await wait(80)}}
   assert.ok(bytes&&ciBytes,'Actual capture and CI downloads required');const saved=JSON.parse(bytes),ci=JSON.parse(ciBytes)
   assert.equal(saved.format,'nova-performance-capture');assert.equal(saved.version,4);assert.equal(saved.measurementSchema,'nova-frame-observation-v1')
   assert.equal(saved.startup.schema,'nova-startup-observation-v1');assert.equal(saved.startup.coldStartupMs,null);assert.equal(saved.startup.warmStartupMs,null)
   assert.equal(saved.startup.moduleToFirstHostFrameWallMs.toFixed(1)+' ms',evidence.jobs.module)
   assert.equal(saved.samplingScope.rafIntervalCapacity,600);assert.equal(saved.samplingScope.profilerIntervalSummaryCapacity,240);assert.equal(saved.samplingScope.profilerSampleEveryHostFramesAtCapture,4)
   assert.equal(saved.samplingScope.runtimePublishEveryHostFramesAtCapture,4);assert.ok(saved.frames.length>0);assert.ok(saved.frames.every(x=>x.inputToPixelMs===null))
   assert.ok(!ci.checks.some(x=>/startup/i.test(x.id)),'Startup is not a budget or threshold claim')
   for(const [name,data]of[['actual-capture-v4.json',bytes],['actual-capture-ci.json',ciBytes]]){await writeFile(resolve(a.evidence,name),data);evidence.downloads.push({file:name,sha256:sha(data),bytes:data.length})}
   evidence.exported={id:saved.id,version:saved.version,startup:saved.startup,samplingScope:saved.samplingScope,frames:saved.frames.length,budgetStatus:ci.status,rendererBackend:saved.renderer.backend}
  })
  await a.capture('capture4-public-export')
  evidence.browser=await a.client.send('Browser.getVersion');evidence.completedAt=new Date().toISOString();evidence.checks=a.checks
 }finally{await writeFile(resolve(a.evidence,'startup-window-raw.json'),JSON.stringify(evidence,null,2)+'\n')}
})
assert.equal(sha(await readFile(join(dist,'engine-build-manifest.json'))),evidence.manifestSha256)
console.log(JSON.stringify({status:process.exitCode?'failed':'verified',scope:'SHORT_SMOKE',buildId:manifest.buildId,output:resolve(root,output)}))
