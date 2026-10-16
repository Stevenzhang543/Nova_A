/** Frozen Input state / script collection public GUI smoke; no benchmark or motion sampling. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,resolve,relative} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const root=resolve(process.cwd()),dist=join(root,'.cache/engine-overhaul/profile-dist-a1d6f')
const output=resolve(root,process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'.cache/engine-overhaul/input-collection-ui-a1d6f-attempt1')
assert.ok(relative(root,output)&&!relative(root,output).startsWith('..'))
const sha=b=>createHash('sha256').update(b).digest('hex'),mb=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(mb)
assert.equal(manifest.buildId,'engine-profile-a1d6fe7b3c4ce5db243a')
assert.equal(manifest.sourceHash,'a1d6fe7b3c4ce5db243a2935eed2d69c64d9cb6d3babc9053d7d97e2681ef9dc')
assert.equal(sha(mb),'f7230306e211b4247b7f9fe5e46cf88bd6201de5aa3ae4ef7f448ca6602e3be9')
assert.equal(manifest.mode,'optimized-profiling');assert.equal(manifest.profilingApiEnabled,true)
for(const f of manifest.artifacts)assert.equal(sha(await readFile(join(dist,f.path))),f.sha256)
await mkdir(output);await writeFile(join(output,'profile-build-manifest.json'),mb);await writeFile(join(output,'profile-module-graph.json'),await readFile(join(dist,'engine-module-graph.json')))
await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
const fixture=join(root,'reference-projects/projects/physics-v2617-platformer/project.nova'),fb=await readFile(fixture)
assert.equal(sha(fb),'9b070ae2eb8cff968f0735eec07aae99807df32b864a5090b737c55a360530ba')
const raw={scope:'SHORT_SMOKE_FUNCTIONAL_INPUT_AND_COLLECTION_UI',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(mb),fixtureSha256:sha(fb),fixtureCounts:{entities:11,serializedComponents:59,runtimeNotRemovedComponents:41},viewport:{width:1600,height:900,dpr:1},downloads:[],checks:[],
 notTested:['Historical capture limits unknown via GUI: no public script/performance capture import control exists; no private store assignment used.',
 'Large-set rejection/truncation is not induced by this unchanged small project. Root actual-module tests cover budget limits.',
 'Native Tauri/WebView, physical monitor DPI/hardware GPU, sensors and haptics','Formal performance/QualityLocked/AdaptiveExperience and motion acceptance; A1 strict Reduced3s FAIL preserved']}
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist);process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
await withBrowserAudit({root,release:'26.37',name:'engine-input-collection',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a);let downloadSerial=0
 const collection=value=>{assert.equal(value.schema,'nova-script-profile-collection-v1');assert.equal(value.maxEntries,4096);assert.equal(value.maxEstimatedMetadataBytes,2097152);assert.equal(value.displayLimit,2000);assert.equal(value.rankingScope,'admitted-set');assert.ok(value.admittedEntries>0);assert.ok(value.estimatedMetadataBytes>0);assert.equal(value.rejectedCalls,0);assert.equal(value.collectionTruncated,false)}
 const download=async(slug,action,extensions)=>{
  const folder=join(a.profile,'collection-download-'+downloadSerial++);await mkdir(folder);await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true})
  await action();let files=[]
  for(let i=0;i<200;i++){files=(await readdir(folder)).filter(n=>extensions.some(ext=>n.endsWith(ext)));if(extensions.every(ext=>files.some(n=>n.endsWith(ext))))break;await wait(80)}
  assert.equal(files.length,extensions.length,'Real download count')
  const result=[]
  for(const name of files){const b=await readFile(join(folder,name)),document=JSON.parse(b),target=join(output,slug+'-'+name);await writeFile(target,b);result.push({name,file:target,bytes:b.length,sha256:sha(b),document});raw.downloads.push({name,file:target,bytes:b.length,sha256:sha(b)})}
  return result
 }
 const panel=async()=>{await ui.workspace('Debug');await ui.bottom('profiler','Profiler')}
 const settings=async()=>{await ui.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page')");await a.fill('.settings-search input','deviceInput');await a.until("!!document.querySelector('.device-studio')?.getBoundingClientRect().width")}
 const virtual=async()=>{await a.clickText('.device-studio>.ui-tabs button','Virtual controls',true);await a.until("!!document.querySelector('.device-studio .setting-line input[type=checkbox]')")}
 const inputUi=()=>a.evaluate(`({enabled:document.querySelector('.device-studio .setting-line input[type=checkbox]')?.checked,visibility:document.querySelector('.device-studio .setting-line select')?.value,controls:[...document.querySelectorAll('.device-studio .control-card')].map(e=>({label:e.querySelector('header strong').textContent,inputs:[...e.querySelectorAll('input')].map(i=>i.value)}))})`)
 // UiPropertyRow is the public aria-labelled group; the older helper only handles legacy .property-row.
 const numberSelector=(scope,label)=>`${scope} .ui-property-row[aria-label=${JSON.stringify(label)}] input[data-numeric-expression]`
 const setNumber=(scope,label,value)=>a.fill(numberSelector(scope,label),value)
 const readNumber=(scope,label)=>a.evaluate(`Number(document.querySelector(${JSON.stringify(numberSelector(scope,label))}).value)`)
 try{
  await ui.open(fixture);await a.until('!!window.novaPerformanceDiagnosticsV1')
  await a.check('immutable new artifact uses the actual existing WebGL2 software context and same project',async()=>{
   raw.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(raw.metadata.buildId,manifest.buildId);assert.equal(raw.metadata.executionMode,'single-thread-compat');assert.equal(raw.metadata.wasmVariant,'baseline')
   raw.actualContext=await a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info'),r=c.getBoundingClientRect();return {backend:'WebGL2',lost:g.isContextLost(),renderer:g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER),dpr:devicePixelRatio,cssWidth:r.width,cssHeight:r.height,backingWidth:c.width,backingHeight:c.height,physicalMonitorDpi:null}})()`)
   assert.equal(raw.actualContext.lost,false);assert.ok(raw.actualContext.renderer.includes('SwiftShader'));assert.equal(raw.actualContext.dpr,1)
  })
  await panel();await a.click('.sidebar nav button',0);await a.click('.actionbar button',0);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
  await a.clickText('.production-panel>.ui-tabs button','Scripts',true)
  await a.check('live Scripts collection explains bounds, admission ranking and heuristic allocations without byte suffix',async()=>{
   await a.until("document.querySelectorAll('.script-profile-table .profile-row').length>0")
   raw.scriptCopy=await a.evaluate(`({budget:document.querySelector('[data-audit=script-collection-budget]').textContent,allocation:document.querySelector('[data-audit=script-allocation-estimate-scope]').textContent,rows:[...document.querySelectorAll('.script-profile-table .profile-row')].map(e=>({name:e.querySelector('strong').textContent,allocation:e.querySelector('output:last-child').textContent}))})`)
   assert.match(raw.scriptCopy.budget,/4096.*UTF-16.*2097152 B.*not measured heap.*Rankings cover admitted.*2000/);assert.match(raw.scriptCopy.allocation,/historical source\/JSON length heuristic, not measured allocated bytes/)
   for(const r of raw.scriptCopy.rows)assert.match(r.allocation,/^\d+$/)
  })
  await a.check('two actual script captures show their own A/B collection scope and compare live entries',async()=>{
   await a.clickText('.script-profile-table button','Capture',true)
   await a.until("!!document.querySelector('[data-audit=script-capture-collection-a]')")
   await a.clickText('.script-profile-table button','Capture',true)
   await a.until("!!document.querySelector('[data-audit=script-capture-collection-b]')")
   raw.captureCopy=await a.evaluate(`({a:document.querySelector('[data-audit=script-capture-collection-a]').textContent,b:document.querySelector('[data-audit=script-capture-collection-b]').textContent})`)
   assert.match(raw.captureCopy.a,/A:.*4096.*Rankings cover admitted/);assert.match(raw.captureCopy.b,/B:.*4096.*Rankings cover admitted/)
   await a.clickText('.script-capture-card button','Compare',true);await a.until("document.querySelectorAll('.profile-comparison article').length>0")
   raw.scriptComparison=await a.evaluate("document.querySelector('.profile-comparison').textContent")
   raw.scriptExport=(await download('script',()=>a.clickText('.script-profile-table button','Export JSON',true),['.json']))[0].document;collection(raw.scriptExport.collection)
  })
  await a.clickText('.production-panel>.ui-tabs button','Memory & lifetimes',true)
  await a.check('general performance export contains real scriptCollection and keeps the existing measured CI checks',async()=>{
   await a.click('.capture-card header button');await a.until("!!document.querySelector('[data-audit=performance-capture-script-collection]')")
   raw.performanceCollectionCopy=await a.evaluate("document.querySelector('[data-audit=performance-capture-script-collection]').textContent")
   const files=await download('performance',()=>a.clickText('.capture-card>button','Export capture + CI result',true),['.nova-perf.json','.ci.json'])
   raw.performanceCapture=files.find(f=>f.name.endsWith('.nova-perf.json')).document;raw.ci=files.find(f=>f.name.endsWith('.ci.json')).document
   assert.equal(raw.performanceCapture.version,4);collection(raw.performanceCapture.scriptCollection)
   assert.deepEqual(raw.ci.checks,raw.performanceCapture.budget.checks);assert.equal(raw.ci.status,raw.performanceCapture.budget.status)
   assert.equal(raw.performanceCapture.startup.coldStartupMs,null);assert.equal(raw.performanceCapture.startup.warmStartupMs,null)
   assert.ok(raw.ci.checks.some(c=>c.id==='frame')||raw.ci.checks.some(c=>c.unit==='ms'))
   await a.capture('actual-collection-capture-scope')
  })
  await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'")
  await settings();await virtual()
  await a.check('public virtual controls mutate the existing reactive settings and immediately refresh list labels',async()=>{
   raw.inputBefore=await inputUi()
   if(!raw.inputBefore.enabled)await a.click('.device-studio .setting-line input[type=checkbox]')
   await a.select('.device-studio .setting-line select','always')
   if(!await a.evaluate("document.querySelectorAll('.device-studio .control-card').length"))await a.clickText('.device-studio button','Add control',true)
   await a.fill('.device-studio .control-card .fields input','UI smoke Move',0);await a.until("document.querySelector('.device-studio .control-card header strong')?.textContent==='UI smoke Move'")
   await setNumber('.device-studio .control-card','Size',96)
   raw.inputAfter=await inputUi();assert.equal(raw.inputAfter.enabled,true);assert.equal(raw.inputAfter.visibility,'always');assert.equal(raw.inputAfter.controls[0].label,'UI smoke Move')
   assert.equal(await readNumber('.device-studio .control-card','Size'),96)
   raw.deviceFieldGeometry=await a.evaluate(`({bodyFont:getComputedStyle(document.body).fontSize,fields:[...document.querySelectorAll('.device-studio .control-card .ui-property-row input')].map(e=>({label:e.getAttribute('aria-label'),value:e.value,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,font:getComputedStyle(e).fontSize}))})`)
   await a.capture('actual-reactive-virtual-control')
  })
  await a.clickText('.device-studio>.ui-tabs button','Sensors',true)
  await a.check('public device configuration responds without sensor permissions or hardware simulation',async()=>{
   await a.select('.device-studio .setting-line select','portrait');await setNumber('.device-studio','Sampling frequency (Hz)',72)
   raw.deviceAfter=await a.evaluate(`({orientation:document.querySelector('.device-studio .setting-line select').value,frequency:[...document.querySelectorAll('.device-studio input')].find(e=>e.getAttribute('data-numeric-expression')!==null)?.value,copy:document.querySelector('.device-studio .page').textContent})`)
   assert.equal(raw.deviceAfter.orientation,'portrait');assert.equal(await readNumber('.device-studio','Sampling frequency (Hz)'),72)
  })
  await a.fill('.settings-search input','')
  const saved=await ui.save('a1d6f-input-collection');raw.saved={file:saved.file,sha256:sha(await readFile(saved.file)),deviceInput:saved.document.projectSettings.deviceInput}
  await a.check('real Save Project preserves device settings with original world and scripts',async()=>{
   assert.equal(saved.document.scenes[0].entities.length,11);assert.equal(saved.document.scenes[0].entities.reduce((n,e)=>n+e.components.length,0),59)
   const d=raw.saved.deviceInput;assert.equal(d.virtualControlsEnabled,true);assert.equal(d.showVirtualControls,'always');assert.equal(d.virtualControls[0].label,'UI smoke Move');assert.equal(d.virtualControls[0].size,96);assert.equal(d.orientation,'portrait');assert.equal(d.sensorFrequency,72)
  })
  await ui.open(saved.file);await settings();await virtual()
  await a.check('fresh real file chooser reopen restores the same public virtual/device controls',async()=>{
   raw.reopenedInput=await inputUi();assert.equal(raw.reopenedInput.enabled,true);assert.equal(raw.reopenedInput.visibility,'always');assert.equal(raw.reopenedInput.controls[0].label,'UI smoke Move');assert.equal(await readNumber('.device-studio .control-card','Size'),96)
   await a.clickText('.device-studio>.ui-tabs button','Sensors',true);assert.equal(await a.evaluate("document.querySelector('.device-studio .setting-line select').value"),'portrait');assert.equal(await readNumber('.device-studio','Sampling frequency (Hz)'),72)
   await a.capture('reopened-device-settings')
  })
  await panel();await a.click('.sidebar nav button',0);await a.click('.actionbar button',0);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
  await a.check('reopened Gameplay still runs real bodies and script calls and shows the configured virtual overlay',async()=>{
   await a.until("!!document.querySelector('.virtual-controls')")
   raw.virtualOverlay=await a.evaluate("({labels:[...document.querySelectorAll('.virtual-controls [aria-label]')].map(e=>e.getAttribute('aria-label')),text:document.querySelector('.virtual-controls').textContent})")
   await a.clickText('.production-panel>.ui-tabs button','Frame trace',true)
   await a.until(`[...document.querySelectorAll('.metrics article')].some(e=>e.querySelector('span')?.textContent==='Runtime bodies'&&Number(e.querySelector('strong').textContent)>0)`)
   raw.gameplayMetrics=await a.evaluate(`[...document.querySelectorAll('.metrics article')].filter(e=>['Runtime bodies','Active contacts'].includes(e.querySelector('span')?.textContent)).map(e=>({label:e.querySelector('span').textContent,value:e.querySelector('strong').textContent}))`)
   await a.clickText('.production-panel>.ui-tabs button','Scripts',true);await a.until(`[...document.querySelectorAll('.script-profile-table .profile-row strong')].some(e=>e.textContent==='fixed_update')`)
   raw.reopenedScriptRows=await a.evaluate("document.querySelector('.script-profile-table').textContent");await a.capture('reopened-gameplay-virtual-and-rhai')
  })
  await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'")
  raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString()
 }finally{raw.checks=a.checks;await writeFile(join(output,'input-collection-gui-raw.json'),JSON.stringify(raw,null,2)+'\n')}
})
assert.equal(sha(await readFile(fixture)),raw.fixtureSha256)
assert.equal(sha(await readFile(join(dist,'engine-build-manifest.json'))),raw.manifestSha256)
console.log(JSON.stringify({scope:raw.scope,buildId:raw.buildId,output,status:process.exitCode?'failed':'verified'}))
