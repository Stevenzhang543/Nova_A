/** One finite Reduced Preview diagnostic with the profiling same-Owner snapshot. Never replaces the original strict3s FAIL. */
import assert from 'node:assert/strict'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {performance as nodePerformance} from 'node:perf_hooks'
import {join,resolve,relative} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const arg=name=>{const v=process.argv.find(s=>s.startsWith(`--${name}=`))?.slice(name.length+3);assert.ok(v,`Explicit --${name} is required`);return v}
const root=resolve(process.cwd()),dist=resolve(root,arg('dist')),output=resolve(root,arg('output')),sha=b=>createHash('sha256').update(b).digest('hex')
assert.ok(relative(root,dist)&&!relative(root,dist).startsWith('..'));assert.ok(relative(root,output)&&!relative(root,output).startsWith('..'))
const mb=await readFile(join(dist,'engine-build-manifest.json')),manifest=JSON.parse(mb)
assert.equal(sha(mb),arg('manifest-sha'));assert.equal(manifest.buildId,arg('build-id'));assert.equal(manifest.sourceHash,arg('source-hash'));assert.equal(manifest.mode,'optimized-profiling');assert.equal(manifest.profilingApiEnabled,true)
for(const f of manifest.artifacts)assert.equal(sha(await readFile(join(dist,f.path))),f.sha256)
const fixture=join(root,'reference-projects/projects/physics-v2617-platformer/project.nova'),fb=await readFile(fixture)
assert.equal(sha(fb),'9b070ae2eb8cff968f0735eec07aae99807df32b864a5090b737c55a360530ba')
const historical='.cache/engine-overhaul/input-ui-smoke-paint-diagnostic/engine-observability-ui-raw.json',hb=await readFile(join(root,historical))
assert.equal(sha(hb),'50f49e9b1d0b6bad53f16a80b1a3ddbdb22793bf24a5f5c794074dd185d121a4')
await mkdir(output);await writeFile(join(output,'profile-build-manifest.json'),mb);await writeFile(join(output,'driver-source.mjs'),await readFile(new URL(import.meta.url)))
process.env.NOVA_AUDIT_DIST_DIRECTORY=relative(root,dist);process.env.NOVA_AUDIT_REPORT_DIRECTORY=relative(root,output)
const raw={scope:'ONE_FINITE_MANUAL_REDUCED_PREVIEW_OWNER_DIAGNOSIS',buildId:manifest.buildId,artifactSourceHash:manifest.sourceHash,manifestSha256:sha(mb),fixtureSha256:sha(fb),counts:{entities:11,serializedComponents:59,runtimeNotRemovedComponents:41},viewport:{width:1600,height:900,dpr:1},historicalFailure:{path:historical,sha256:sha(hb),status:'STRICT_3S_FAIL_PRESERVED',deadlineMs:3000},limits:{intervalMs:50,samples:80,durationMs:4000,animationsPerRow:128,identities:128,estimatedByteQueue:1048576},nodePolls:[],checks:[],caveats:['Headless Edge/SwiftShader only; no hardware, native or physical foreground/display claim.','Full metadata() reading can perturb this diagnostic; row readDurationMs is retained. No screenshots/debugger/rAF/animation assignment/cancel/finish during monitoring.','The metadata exposes same-Owner counts, not private active Map entries. Counts cannot prove object identity or full cleanup coverage.','The strict3s threshold is unchanged; late zero/gaps/unknown physical paint deadline cannot certify timely PASS. This is not formal performance.']}
const arm=`(()=>{
 if(window.__novaMotionOwnerAuditV1)throw Error('Monitor already exists');
 const limits={interval:50,samples:80,duration:4000,animations:128,identities:128,bytes:1048576};
 const result={label:'manual-reduced-preview',event:null,samples:[],done:false,overflow:false,conservativeQueueBytes:0};
 const ids=new WeakMap();let nextId=0,timer=null,disposed=false;
 const number=v=>typeof v==='number'&&Number.isFinite(v)?v:null,text=v=>String(v??'').slice(0,160);
 const detach=()=>{document.removeEventListener('pointerup',event,true);document.removeEventListener('keyup',event,true);if(timer!==null){clearTimeout(timer);timer=null}};
 const finish=reason=>{if(result.done)return;detach();result.done=true;result.endReason=reason;result.finishedAtMs=performance.now()};
 const sample=()=>{timer=null;if(result.done||disposed)return;const at=performance.now(),elapsed=at-result.event.receivedAtMs,all=document.getAnimations(),active=all.filter(a=>a.playState==='running'||a.pending);
  const owner=window.novaPerformanceDiagnosticsV1.metadata().environment.uiMotion;
  const row={atMs:at,relativeMs:elapsed,timelineMs:number(document.timeline.currentTime),visibility:document.visibilityState,documentFocused:document.hasFocus(),
   focus:{tag:document.activeElement?.tagName,className:text(document.activeElement?.className),ariaLabel:document.activeElement?.getAttribute('aria-label')??null},
   motion:{manualReduced:document.documentElement.dataset.reduceMotion,effective:document.documentElement.dataset.uiMotion,systemReduced:matchMedia('(prefers-reduced-motion:reduce)').matches},
   ownerSnapshot:owner,strictRunningCount:all.filter(a=>a.playState==='running').length,pendingCount:all.filter(a=>a.pending).length,totalCount:all.length,
   animations:active.slice(0,limits.animations).map(a=>{if(!ids.has(a)){if(nextId<limits.identities)ids.set(a,++nextId);else result.overflow=true}const target=a.effect?.target,t=a.effect?.getTiming();return {identity:ids.get(a)??null,kind:a.constructor.name,animationName:text(a.animationName),id:text(a.id),pending:a.pending,playState:a.playState,startTimeMs:number(a.startTime),currentTimeMs:number(a.currentTime),target:{tag:target?.tagName,className:text(target?.className),text:text(target?.textContent),isConnected:target?.isConnected??null},timing:{duration:typeof t?.duration==='number'?number(t.duration):text(t?.duration),delayMs:number(t?.delay),iterations:number(t?.iterations),fill:t?.fill}}}),readDurationMs:0};
  row.readDurationMs=performance.now()-at;const bytes=JSON.stringify(row).length*2;
  if(active.length>limits.animations||result.conservativeQueueBytes+bytes>limits.bytes){result.overflow=true;finish('bounded-overflow');return}
  result.samples.push(row);result.conservativeQueueBytes+=bytes;if(elapsed>=limits.duration||result.samples.length>=limits.samples){finish('duration-or-count-limit');return}timer=setTimeout(sample,limits.interval);
 };
 function event(e){const b=e.target?.closest?.('.production-panel>.ui-tabs button');if(!b||b.textContent.trim()!=='Jobs'||(e.type==='keyup'&&!['Enter',' ','Space'].includes(e.key)))return;detach();result.event={type:e.type,isTrusted:e.isTrusted,receivedAtMs:performance.now(),timelineMs:number(document.timeline.currentTime),target:{tag:b.tagName,text:b.textContent.trim(),className:text(b.className)},key:e.key??null};sample()}
 document.addEventListener('pointerup',event,true);document.addEventListener('keyup',event,true);timer=setTimeout(()=>finish('no-target-event'),8000);
 window.__novaMotionOwnerAuditV1={peek:()=>({done:result.done,eventReceived:!!result.event,samples:result.samples.length}),take:()=>{if(!result.done)throw Error('Unfinished');return result},dispose:()=>{if(disposed)return;disposed=true;detach();delete window.__novaMotionOwnerAuditV1}};return true
})()`
function interpret(run){
 const rows=run.samples,before=rows.filter(r=>r.relativeMs<=3000).at(-1),after=rows.find(r=>r.relativeMs>=3000),firstZero=rows.find(r=>r.relativeMs>0&&r.strictRunningCount===0&&r.pendingCount===0&&r.ownerSnapshot.activeJobs===0)
 const gaps=rows.slice(1).map((r,i)=>r.atMs-rows[i].atMs),timelineSteps=rows.slice(1).map((r,i)=>r.timelineMs!==null&&rows[i].timelineMs!==null?r.timelineMs-rows[i].timelineMs:null).filter(x=>x!==null)
 const nodeGaps=raw.nodePolls.slice(1).map((r,i)=>r.startedAtMs-raw.nodePolls[i].startedAtMs)
 const sample=r=>r?{relativeMs:r.relativeMs,owner:r.ownerSnapshot,running:r.strictRunningCount,pending:r.pendingCount,timelineMs:r.timelineMs,animations:r.animations}:null
 return {strictDeadlineMs:3000,lastAtOrBeforeDeadline:sample(before),firstAtOrAfterDeadline:sample(after),firstAllZeroMs:firstZero?.relativeMs??null,
  longestPageSamplingGapMs:gaps.length?Math.max(...gaps):null,longestTimelineStepMs:timelineSteps.length?Math.max(...timelineSteps):null,longestNodePollGapMs:nodeGaps.length?Math.max(...nodeGaps):null,
  ownerJobsObservedWhileCssPending:rows.some(r=>r.ownerSnapshot.activeJobs>0&&r.animations.some(a=>a.kind==='CSSTransition'&&a.pending)),
  zeroOwnerJobsObservedWhileCssPending:rows.some(r=>r.ownerSnapshot.activeJobs===0&&r.animations.some(a=>a.kind==='CSSTransition'&&a.pending)),
  formalTimelyPass:'NOT_CERTIFIED',historicalStrictFail:'UNCHANGED',reason:'Same-Owner counts and CSS identities distinguish observed categories; physical paint/deadline and private Map entries remain unmeasured. Late zeros do not revise the original3s result.'}
}
await withBrowserAudit({root,release:'26.37',name:'engine-motion-owner',width:1600,height:900,development:true,expectedRelease:'26.37',qualifyRelease:false},async a=>{
 const ui=worldUserControls17(a)
 try{
  await ui.open(fixture);raw.metadata=await a.evaluate('window.novaPerformanceDiagnosticsV1.metadata()');assert.equal(raw.metadata.buildId,manifest.buildId);assert.ok(Number.isInteger(raw.metadata.environment.uiMotion.activeJobs))
  raw.actualContext=await a.evaluate(`(()=>{const c=document.querySelector('canvas.render-canvas'),g=c.getContext('webgl2'),e=g.getExtension('WEBGL_debug_renderer_info');return {backend:'WebGL2',renderer:g.getParameter(e?e.UNMASKED_RENDERER_WEBGL:g.RENDERER),lost:g.isContextLost(),dpr:devicePixelRatio,physicalMonitorDpi:null}})()`);assert.ok(raw.actualContext.renderer.includes('SwiftShader'))
  await ui.workspace('Manage');await a.click('.manage-body>nav button',1);const sw='.settings-page input[role="switch"][aria-label="Reduce motion"]';await a.until(`!!document.querySelector(${JSON.stringify(sw)})`);if(!await a.evaluate(`document.querySelector(${JSON.stringify(sw)}).checked`))await a.click(sw)
  await a.until("document.documentElement.dataset.reduceMotion==='true'&&document.documentElement.dataset.uiMotion==='reduced'");await ui.workspace('Debug');await ui.bottom('profiler','Profiler');await a.clickText('.production-panel>.ui-tabs button','Memory & lifetimes',true)
  assert.equal(await a.evaluate("window.novaPerformanceDiagnosticsV1.metadata().environment.uiMotion.policy"),'reduced');assert.equal(await a.evaluate("document.querySelector('.actionbar button').getAttribute('aria-pressed')"),'false')
  await a.evaluate(arm)
  try{
   await a.clickText('.production-panel>.ui-tabs button','Jobs',true);const deadline=nodePerformance.now()+12000
   while(nodePerformance.now()<deadline){const startedAtMs=nodePerformance.now(),peek=await a.evaluate('window.__novaMotionOwnerAuditV1.peek()');raw.nodePolls.push({startedAtMs,returnedAtMs:nodePerformance.now(),peek});if(peek.done)break;await wait(125)}
   raw.run=await a.evaluate('window.__novaMotionOwnerAuditV1.take()');assert.ok(raw.run.event?.isTrusted);assert.ok(raw.run.samples.length<=80);assert.ok(raw.run.conservativeQueueBytes<=1048576)
   for(const row of raw.run.samples){assert.ok(Number.isInteger(row.ownerSnapshot.activeJobs)&&row.ownerSnapshot.activeJobs>=0);assert.equal(row.ownerSnapshot.policy,'reduced')}
   raw.interpretation=interpret(raw.run)
  }finally{await a.evaluate('window.__novaMotionOwnerAuditV1?.dispose()')}
  await a.check('one finite same-Owner Reduced Preview monitor uses an actual event and cleans only its own endpoint',async()=>{assert.equal(await a.evaluate('!!window.__novaMotionOwnerAuditV1'),false);assert.equal(raw.run.done,true)})
  raw.browser=await a.client.send('Browser.getVersion');raw.completedAt=new Date().toISOString()
 }finally{await a.evaluate('window.__novaMotionOwnerAuditV1?.dispose()').catch(error=>{raw.cleanupError=String(error)});raw.checks=a.checks;await writeFile(join(output,'motion-owner-raw.json'),JSON.stringify(raw,null,2)+'\n')}
})
assert.equal(sha(await readFile(join(root,historical))),raw.historicalFailure.sha256);assert.equal(sha(await readFile(fixture)),raw.fixtureSha256);assert.equal(sha(await readFile(join(dist,'engine-build-manifest.json'))),raw.manifestSha256)
console.log(JSON.stringify({scope:raw.scope,buildId:raw.buildId,output,status:process.exitCode?'failed':'diagnosis-completed-no-formal-timely-pass'}))
