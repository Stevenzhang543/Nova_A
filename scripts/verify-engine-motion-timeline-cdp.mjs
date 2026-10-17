/** Finite non-screenshot Motion timeline diagnosis. Historical A1 strict3s failure is never replaced. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {join,resolve,relative} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const root=resolve(process.cwd()),dist=join(root,'.cache/engine-overhaul/profile-dist-0e471')
const output=resolve(root,process.argv.find(x=>x.startsWith('--output='))?.slice(9)||'.cache/engine-overhaul/motion-timeline-0e471-attempt1')
assert.ok(relative(root,output)&&!relative(root,output).startsWith('..'))
const sha=b=>createHash('sha256').update(b).digest('hex')
const mb=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(mb)
assert.equal(manifest.buildId,'engine-profile-0e471944f69801413717')
assert.equal(manifest.sourceHash,'0e471944f6980141371767bc0163f0d35dd84632357d17edd50f583cfc4149ec')
for(const f of manifest.artifacts)assert.equal(sha(await readFile(join(dist,f.path))),f.sha256)
const fixture=join(root,'reference-projects/projects/physics-v2617-platformer/project.nova'),fb=await readFile(fixture)
assert.equal(sha(fb),'9b070ae2eb8cff968f0735eec07aae99807df32b864a5090b737c55a360530ba')
await mkdir(output);await writeFile(join(output,'profile-build-manifest.json'),mb)
await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
const old='.cache/engine-overhaul/input-ui-smoke-paint-diagnostic/engine-observability-ui-raw.json'
const oldBytes=await readFile(join(root,old));assert.equal(sha(oldBytes),'50f49e9b1d0b6bad53f16a80b1a3ddbdb22793bf24a5f5c794074dd185d121a4')
const raw={scope:'FINITE_NON_SCREENSHOT_SOFTWARE_CDP_TIMELINE_DIAGNOSIS',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(mb),fixtureSha256:sha(fb),
 fixtureCounts:{entities:11,serializedComponents:59,runtimeNotRemovedComponents:41},viewport:{width:1600,height:900,dpr:1},recordingEnabled:false,screenshotsDuringMonitoring:false,
 historicalFailure:{path:old,sha256:sha(oldBytes),status:'FAIL_PRESERVED',originalStrictDeadlineMs:3000},runs:[],checks:[],
 limits:{sampleEveryMs:50,sampleCount:80,durationMs:4000,rowsPerSample:128,identityCount:128,conservativeQueueBytes:1048576,armedEventWaitMs:8000},
 caveats:['Existing helper hardcodes Headless Edge/SwiftShader and exposes no hardware option. No NVIDIA/hardware/native/physical-foreground claim.',
 'Read-only getAnimations/timeline access and finite setTimeout sampling can perturb scheduling. No extra rAF, screenshots, debugger pauses or animation mutation occur during monitoring.',
 'document.timeline progress is a page clock observation, not physical paint/display timing. Motion private active Map is unavailable.',
 'This is diagnosis, not B/X/H, normal-motion coverage or a replacement for the A1 strict3s FAIL. Sampling gaps and unknown paint deadlines cannot certify timely PASS.']}
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist);process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)

// The diagnostic owns only its finite timeout/listeners/plain observations, never animation time/state.
const armExpression=label=>`(()=>{
 if(window.__novaMotionTimelineAuditV1)throw Error('A monitor is already active');
 const limits={interval:50,count:80,duration:4000,animationCount:128,identities:128,bytes:1048576};
 const result={label:${JSON.stringify(label)},armedAtMs:performance.now(),event:null,samples:[],conservativeQueueBytes:0,overflow:false,done:false};
 const ids=new WeakMap();let nextId=0,timer=null,disposed=false;
 const text=v=>String(v??'').slice(0,160);
 const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null;
 const detach=()=>{document.removeEventListener('pointerup',event,true);document.removeEventListener('keyup',event,true);if(timer!==null){clearTimeout(timer);timer=null}};
 const finish=reason=>{if(result.done)return;detach();result.done=true;result.endReason=reason;result.finishedAtMs=performance.now()};
 const sample=()=>{
  timer=null;if(disposed||result.done)return;
  const at=performance.now(),elapsed=at-result.event.receivedAtMs,all=document.getAnimations();
  const active=all.filter(a=>a.playState==='running'||a.pending);
  const row={atMs:at,relativeMs:elapsed,timelineMs:number(document.timeline.currentTime),visibility:document.visibilityState,hidden:document.hidden,documentFocused:document.hasFocus(),
   focus:{tag:document.activeElement?.tagName,className:text(document.activeElement?.className),ariaLabel:document.activeElement?.getAttribute('aria-label')??null},
   motion:{manualReduced:document.documentElement.dataset.reduceMotion,effective:document.documentElement.dataset.uiMotion,systemReduced:matchMedia('(prefers-reduced-motion:reduce)').matches},
   strictRunningCount:all.filter(a=>a.playState==='running').length,pendingCount:all.filter(a=>a.pending).length,totalReturnedCount:all.length,activeCount:active.length,truncated:active.length>limits.animationCount,
   animations:active.slice(0,limits.animationCount).map(a=>{if(!ids.has(a)){if(nextId<limits.identities)ids.set(a,++nextId);else result.overflow=true}
    const target=a.effect?.target,t=a.effect?.getTiming();return{identity:ids.get(a)??null,constructor:a.constructor.name,animationName:text(a.animationName),id:text(a.id),pending:a.pending,playState:a.playState,startTimeMs:number(a.startTime),currentTimeMs:number(a.currentTime),
     target:{tag:target?.tagName,className:text(target?.className),text:text(target?.textContent),isConnected:target?.isConnected??null},
     timing:{durationMs:typeof t?.duration==='number'?number(t.duration):text(t?.duration),delayMs:number(t?.delay),endDelayMs:number(t?.endDelay),iterations:number(t?.iterations),fill:t?.fill}}}),readDurationMs:0};
  row.readDurationMs=performance.now()-at;
  const bytes=JSON.stringify(row).length*2;
  if(row.truncated||result.conservativeQueueBytes+bytes>limits.bytes){result.overflow=true;finish('byte-or-row-limit');return}
  result.samples.push(row);result.conservativeQueueBytes+=bytes;
  if(elapsed>=limits.duration||result.samples.length>=limits.count){finish('duration-or-count-limit');return}
  timer=setTimeout(sample,limits.interval);
 };
 function event(e){const button=e.target?.closest?.('.production-panel>.ui-tabs button');if(!button||button.textContent.trim()!=='Jobs'||(e.type==='keyup'&&!['Enter',' ','Space'].includes(e.key)))return;
  detach();result.event={type:e.type,isTrusted:e.isTrusted,receivedAtMs:performance.now(),timelineMs:number(document.timeline.currentTime),target:{tag:button.tagName,text:button.textContent.trim(),className:text(button.className)},key:e.key??null};sample();}
 document.addEventListener('pointerup',event,true);document.addEventListener('keyup',event,true);
 timer=setTimeout(()=>finish('no-real-target-event'),8000);
 window.__novaMotionTimelineAuditV1={peek:()=>({done:result.done,eventReceived:!!result.event,samples:result.samples.length}),take:()=>{if(!result.done)throw Error('Monitor unfinished');return result},dispose:()=>{if(disposed)return;disposed=true;detach();delete window.__novaMotionTimelineAuditV1}};
 return{armed:true,label:result.label};
})()`

function interpret(run){
 const samples=run.samples,first=run.event?.receivedAtMs,gaps=samples.map((s,i)=>i?s.atMs-samples[i-1].atMs:s.atMs-first),maximumGapMs=gaps.length?Math.max(...gaps):null
 const paintOrigin=run.event?.timelineMs,progress=samples.filter(s=>s.timelineMs!==null&&paintOrigin!==null).map(s=>s.timelineMs-paintOrigin),maximumTimelineProgressMs=progress.length?Math.max(...progress):null
 const observedRunning=samples.find(s=>s.strictRunningCount>0)
 const firstZero=samples.find(s=>s.relativeMs>0&&(!observedRunning||s.atMs>observedRunning.atMs)&&s.strictRunningCount===0)
 const lastBefore=samples.filter(s=>s.relativeMs<=3000).at(-1),firstAfter=samples.find(s=>s.relativeMs>=3000)
 return{originalStrictDeadlineMs:3000,maximumGapMs,firstObservedRunningMs:observedRunning?.relativeMs??null,firstObservedZeroMs:firstZero?.relativeMs??null,
  maximumTimelineProgressMs,lastAtOrBeforeDeadline:lastBefore?{relativeMs:lastBefore.relativeMs,running:lastBefore.strictRunningCount,pending:lastBefore.pendingCount}:null,
  firstAtOrAfterDeadline:firstAfter?{relativeMs:firstAfter.relativeMs,running:firstAfter.strictRunningCount,pending:firstAfter.pendingCount}:null,
  pageObservation:!run.event?'NO_TARGET_EVENT':run.overflow?'INDETERMINATE_BOUNDED_OVERFLOW':firstZero&&firstZero.relativeMs>3000?'ZERO_ONLY_OBSERVED_AFTER_DEADLINE':
   firstAfter?.strictRunningCount>0?'RUNNING_OBSERVED_AT_OR_AFTER_DEADLINE':firstZero?'ZERO_OBSERVED_IN_PAGE_BEFORE_DEADLINE':'NO_ZERO_OBSERVED',
  timingGapObserved:maximumGapMs!==null&&maximumGapMs>100, // >2 expected intervals is diagnosis confidence only; the3s deadline never changes.
  formalTimelyPass:'NOT_CERTIFIED',reason:'No physical paint deadline is measured; any timeline stall/sampling gap is retained. Limited page observations cannot replace historical strict3s failure.'}
}
await withBrowserAudit({root,release:'26.37',name:'engine-motion-timeline',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a)
 const panel=async()=>{await ui.workspace('Debug');await ui.bottom('profiler','Profiler');await a.clickText('.production-panel>.ui-tabs button','Jobs',true)}
 const manual=async enabled=>{await ui.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page input[role=switch][aria-label=\"Reduce motion\"]')");const s='.settings-page input[role="switch"][aria-label="Reduce motion"]';if(await a.evaluate(`document.querySelector(${JSON.stringify(s)}).checked`)!==enabled)await a.click(s);await a.until(`document.documentElement.dataset.reduceMotion==='${enabled}'`);await panel()}
 const monitor=async(label,playing)=>{
  await a.clickText('.production-panel>.ui-tabs button','Memory & lifetimes',true)
  await a.evaluate(armExpression(label))
  try{
   await a.clickText('.production-panel>.ui-tabs button','Jobs',true)
   const deadline=Date.now()+12000
   while(Date.now()<deadline){const p=await a.evaluate('window.__novaMotionTimelineAuditV1.peek()');if(p.done)break;await wait(125)}
   const value=await a.evaluate('window.__novaMotionTimelineAuditV1.take()')
   assert.ok(value.event?.isTrusted,'A real public target pointerup/keyup must establish t0');assert.ok(value.samples.length<=80);assert.ok(value.conservativeQueueBytes<=1048576)
   value.playing=playing;value.interpretation=interpret(value);raw.runs.push(value)
   console.log(JSON.stringify({label,count:value.samples.length,event:value.event.type,interpretation:value.interpretation}))
  }finally{await a.evaluate('window.__novaMotionTimelineAuditV1?.dispose()')}
 }
 try{
  await ui.open(fixture);await a.until('!!window.novaPerformanceDiagnosticsV1');raw.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(raw.metadata.buildId,manifest.buildId)
  raw.actualContext=await a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {backend:'WebGL2',lost:g.isContextLost(),renderer:g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER),dpr:devicePixelRatio,physicalMonitorDpi:null}})()`)
  assert.ok(raw.actualContext.renderer.includes('SwiftShader'));assert.equal(raw.metadata.executionMode,'single-thread-compat')
  await panel()
  for(const mode of ['normal','manual-reduced','system-reduced']){
   if(mode==='manual-reduced')await manual(true)
   if(mode==='system-reduced'){await manual(false);await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await a.until("document.documentElement.dataset.uiMotion==='reduced'")}
   const preference=await a.evaluate('({manual:document.documentElement.dataset.reduceMotion,effective:document.documentElement.dataset.uiMotion,system:matchMedia("(prefers-reduced-motion:reduce)").matches})')
   if(mode==='normal')assert.deepEqual(preference,{manual:'false',effective:'on',system:false})
   if(mode==='manual-reduced')assert.deepEqual(preference,{manual:'true',effective:'reduced',system:false})
   if(mode==='system-reduced')assert.deepEqual(preference,{manual:'false',effective:'reduced',system:true})
   await monitor(mode+'-preview',false)
   await a.click('.sidebar nav button',0);await a.click('.actionbar button',0);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='true'")
   await monitor(mode+'-play',true)
   await a.click('.actionbar button',3);await a.until("document.querySelector('.actionbar button')?.getAttribute('aria-pressed')==='false'")
  }
  await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
  await a.check('all six bounded monitors used real public events and cleaned their diagnostic timeout/listeners',async()=>{assert.equal(raw.runs.length,6);assert.equal(await a.evaluate('!!window.__novaMotionTimelineAuditV1'),false);assert.equal(raw.runs.every(r=>r.done&&r.event.isTrusted),true)})
  raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString()
 }finally{
  await a.evaluate('window.__novaMotionTimelineAuditV1?.dispose()').catch(error=>{raw.cleanupError=String(error)})
  await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]}).catch(error=>{raw.mediaCleanupError=String(error)})
  raw.checks=a.checks;await writeFile(join(output,'motion-timeline-raw.json'),JSON.stringify(raw,null,2)+'\n')
 }
})
assert.equal(sha(await readFile(join(root,old))),raw.historicalFailure.sha256)
assert.equal(sha(await readFile(fixture)),raw.fixtureSha256)
console.log(JSON.stringify({scope:raw.scope,buildId:raw.buildId,output,status:process.exitCode?'failed':'diagnostic-completed-no-formal-timely-pass'}))
