import assert from 'node:assert/strict'
import {readFile,mkdir,writeFile} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {createHash} from 'node:crypto'
import {withBrowserAudit} from '../../scripts/lib/browserUserAudit.mjs'
import {worldUserControls17} from '../../scripts/lib/worldAudit17.mjs'
const buildRoot=resolve('.cache/branding26.36/build2'),out=resolve('.cache/comfortable26.37/baseline/performance')
await mkdir(out,{recursive:true});process.env.NOVA_AUDIT_REPORT_DIRECTORY=out
const fixture=join(buildRoot,'reference-projects/projects/creator-v2636-mixed-game/project.nova'),sha=b=>createHash('sha256').update(b).digest('hex')
const report={format:'nova-comfortable-dynamic-before',version:1,status:'running',engineVersion:'26.36.0',sourceInputDigest:'d4d78307f673398e2437441e7af64e23e95e00b6439851e919b786d981ebb465',buildRoot,fixtureSha256:sha(await readFile(fixture)),distIndexSha256:sha(await readFile(join(buildRoot,'dist/index.html'))),generatedAt:new Date().toISOString(),timings:[],counterWindows:[],limits:['Headless Edge software renderer; physical DPI/GPU/display latency unmeasured.','Finite observational instrumentation overhead is included.','DOM event-to-observed-state is not physical input-to-display.','CSS/WAAPI jobs observed; private production jobs unmeasured.']}
const save=()=>writeFile(join(out,'dynamic-before.json'),JSON.stringify(report,null,2)+String.fromCharCode(10))
const visible=s=>`!!document.querySelector(${JSON.stringify(s)})&&!document.querySelector(${JSON.stringify(s)}).closest('[inert]')`
const counters=async a=>Object.fromEntries((await a.client.send('Performance.getMetrics')).metrics.map(x=>[x.name,x.value]))
async function sample(a,name){
 const before=await counters(a)
 const raw=await a.evaluate(`new Promise(resolve=>{const start=performance.now(),frames=[];let last=start;const step=now=>{frames.push({ms:now-start,dt:now-last,running:document.getAnimations().filter(a=>a.playState==='running').length});last=now;if(now-start>=900)resolve({frames,elapsed:now-start,finalAnimations:document.getAnimations().filter(a=>a.playState==='running').length});else requestAnimationFrame(step)};requestAnimationFrame(step)})`)
 const after=await counters(a),delta=Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize','Nodes','JSEventListeners'].map(k=>[k,k in before&&k in after?after[k]-before[k]:null]))
 report.counterWindows.push({name,raw,before,after,delta});await save()
}
async function timing(a,name,predicate,action){
 await a.evaluate(`(()=>{const test=()=>Boolean(${predicate});if(test())throw Error('Target already true');const start=performance.now(),d={name:${JSON.stringify(name)},frames:[],events:[],observedMs:null,done:false};let frame,last=start,quiet=0;const types=['pointerdown','pointerup','click','input','keydown','wheel'];const on=e=>d.events.push({type:e.type,ms:performance.now()-start,trusted:e.isTrusted});for(const t of types)document.addEventListener(t,on,true);const finish=reason=>{cancelAnimationFrame(frame);for(const t of types)document.removeEventListener(t,on,true);d.done=true;d.reason=reason;d.finalExpected=test()};const step=now=>{const running=document.getAnimations().filter(a=>a.playState==='running').length;d.frames.push({ms:now-start,dt:now-last,running});last=now;if(d.observedMs===null&&test())d.observedMs=now-start;quiet=d.observedMs!==null&&running===0?quiet+1:0;if(now-start>5000)finish('deadline');else if(now-start>=180&&quiet>=4)finish('settled');else frame=requestAnimationFrame(step)};window.__novaDynamicBefore={d,cancel:()=>finish('cancelled')};frame=requestAnimationFrame(step)})()`)
 await action();await a.until('window.__novaDynamicBefore.d.done',6500)
 const raw=await a.evaluate('(()=>{const d=window.__novaDynamicBefore.d;delete window.__novaDynamicBefore;return d})()'),first=raw.events[0]
 report.timings.push({name,raw,eventObservedToStateMs:first&&raw.observedMs!==null?raw.observedMs-first.ms:null});await save()
 assert.equal(raw.finalExpected,true,name);assert.equal(raw.reason,'settled',name);assert.ok(raw.events.some(e=>e.trusted),name+' real input')
}
try{await withBrowserAudit({release:'26.36',name:'comfortable-dynamic-before',root:buildRoot,width:1600,height:900,expectedRelease:'26.36',development:false,qualifyRelease:false},async a=>{
 const u=worldUserControls17(a);await a.client.send('Performance.enable')
 report.conditions=await a.evaluate(`({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,uiScale:Number(getComputedStyle(document.documentElement).getPropertyValue('--ui-scale').trim()||1),systemReducedMotion:matchMedia('(prefers-reduced-motion:reduce)').matches,userAgent:navigator.userAgent})`)
 assert.deepEqual([report.conditions.width,report.conditions.height,report.conditions.dpr,report.conditions.uiScale],[1600,900,1,1])
 await a.until(`document.getAnimations().every(a=>a.playState!=='running')`);await sample(a,'launcher-idle')
 await timing(a,'launcher-dialog-open',visible('.creation-dialog .ui-dialog'),()=>a.click('.new-project'))
 await a.press('Escape');await a.until(`!document.querySelector('.creation-dialog')`)
 await u.open(fixture);await u.entity('Player');await u.expandInspector();await a.until(`document.getAnimations().every(a=>a.playState!=='running')`);await sample(a,'editor-idle')
 await timing(a,'file-menu-open',visible('.menu-item .dropdown'),()=>a.click('.menu-item>button',0))
 await a.press('Escape');await a.until(`!document.querySelector('.menu-item .dropdown')`)
 await a.press('p',2);await a.until(visible('.command-palette'))
 await timing(a,'palette-typing',`document.querySelector('.command-palette input')?.value==='select'`,()=>a.client.send('Input.insertText',{text:'select'}))
 await sample(a,'palette-open-idle');await a.press('Escape');await a.until(`!document.querySelector('.command-palette')`)
 for(const i of [1,0,2,0])await timing(a,'workspace-switch-'+i,`document.querySelectorAll('.workspace-list button')[${i}]?.getAttribute('aria-pressed')==='true'`,()=>a.click('.workspace-list button',i))
 await sample(a,'after-workspace-switches')
 const before=await a.evaluate(`document.querySelector('.sidebar-container').getBoundingClientRect().width`),p=await a.point('.sidebar-container .panel-resize-handle.vertical')
 await timing(a,'sidebar-direct-resize',`Math.abs(document.querySelector('.sidebar-container').getBoundingClientRect().width-${before})>=40`,async()=>{report.resizeHit=await a.evaluate('(()=>{const e=document.elementFromPoint('+p.x+','+p.y+');return{element:e?.outerHTML?.slice(0,600),matches:!!e?.closest(".panel-resize-handle")}})()');assert.equal(report.resizeHit.matches,true,'Visible separator is the actual hit target');await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...p,button:'none',buttons:0});await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...p,button:'left',buttons:1,clickCount:1});await a.until("!!document.querySelector('.sidebar-container .panel-resize-handle.dragging')",3000);await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:p.x+48,y:p.y,button:'left',buttons:1})})
 await a.press('Escape');await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:p.x+48,y:p.y,button:'left',buttons:0,clickCount:1});const after=await a.evaluate(`document.querySelector('.sidebar-container').getBoundingClientRect().width`);report.resizeCancellation={before,after};assert.ok(Math.abs(after-before)<1)
 await u.entity('Player');await u.expandInspector()
 const scroll=await a.evaluate(`(()=>{const e=[...document.querySelectorAll('.config-panel,.config-wrapper')].find(e=>e.scrollHeight>e.clientHeight+20);if(!e)throw Error('Inspector must scroll');const r=e.getBoundingClientRect();return{selector:e.classList.contains('config-panel')?'.config-panel':'.config-wrapper',before:e.scrollTop,x:r.left+r.width/2,y:r.top+r.height/2,direction:e.scrollTop>100?-1:1}})()`)
 await timing(a,'inspector-wheel',`(document.querySelector(${JSON.stringify(scroll.selector)}).scrollTop-${scroll.before})*${scroll.direction}>0`,()=>a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:scroll.x,y:scroll.y,deltaY:220*scroll.direction,deltaX:0}))
 assert.equal(report.timings.length,9);assert.equal(report.counterWindows.length,4);report.status='passed'
})}catch(e){report.status='failed';report.error={message:e.message,stack:e.stack};throw e}finally{report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,timings:report.timings.length,counterWindows:report.counterWindows.length,path:join(out,'dynamic-before.json')}))}