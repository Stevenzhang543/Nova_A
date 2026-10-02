/** Real input and bounded renderer observations for Phase III; no application-state injection. */
import assert from 'node:assert/strict'
import {copyFile, readFile, readdir, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {createHash, randomUUID} from 'node:crypto'
import {withBrowserAudit, wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'

const root=process.cwd(), baselineDirectory=join(root,'reports/phase3/26.35/baseline')
const baseline=JSON.parse(await readFile(join(baselineDirectory,'baseline-measurements.json'),'utf8'))
assert.equal(baseline.packageVersion,'26.34.0','The before measurements must retain the actual pre-polish build')
assert.ok(baseline.timings.length>=9&&baseline.metrics.length===4,'Measured before evidence is required')
const fixtureSource=join(root,'reference-projects/projects/creator-v2634-mixed-game/project.nova')
const fixtureBytes=await readFile(fixtureSource), fixtureSourceSha256=createHash('sha256').update(fixtureBytes).digest('hex')
const timings=[],metrics=[],comparison=[],evidenceScope='Headless Edge with software rendering. Input event to observed DOM frame, not physical input or pixel scan-out. DevTools renderer task/layout/style counters are measured; device CPU/GPU and raster/compositor cost are unavailable. Native HTML drag uses real dragstart data and DevTools drag interception. No private engine/editor-state injection.'
const qualified=process.argv.includes('--qualification-release=26.35')
const beforeCaptures=[]
let auditReportDirectory

await withBrowserAudit({release:'26.35',name:'motion-user',width:1600,height:900,qualifyRelease:qualified},async a=>{
 const u=worldUserControls17(a),baselineCaptures=beforeCaptures; auditReportDirectory=a.evidence
 for(const name of await readdir(baselineDirectory))if(/^v26\.34-motion-baseline-(launcher|editor|creation-dialog|file-menu|command-palette)\.png$/.test(name)){const dest='v26.35-before-'+name;await copyFile(join(baselineDirectory,name),join(a.evidence,dest));baselineCaptures.push(dest)}
 assert.equal(baselineCaptures.length,5,'Before screenshots are preserved alongside after screenshots')
 a.observations.push({name:'before-evidence',data:baseline,captures:baselineCaptures},{name:'measurement-method',scope:evidenceScope,fixtureSourceSha256})
 await a.client.send('Performance.enable')
 const counters=async()=>Object.fromEntries((await a.client.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]))
 const delta=(before,after)=>Object.fromEntries(['TaskDuration','ScriptDuration','LayoutDuration','RecalcStyleDuration','LayoutCount','RecalcStyleCount','JSHeapUsedSize','Nodes'].map(k=>[k,after[k]-before[k]]))
 const sample=async(name,ms=1500)=>{
  const before=await counters()
  const frames=await a.evaluate(`new Promise(resolve=>{const start=performance.now(),gaps=[],long=[],shell=document.querySelector('.editor-root');let last=start,missing=0,changed=0,maxAnimations=0,observer;try{observer=new PerformanceObserver(l=>long.push(...l.getEntries().map(e=>({start:e.startTime,duration:e.duration}))));observer.observe({type:'longtask',buffered:false})}catch{}const tick=now=>{gaps.push(now-last);last=now;if(shell){if(!document.querySelector('.editor-root'))missing++;else if(document.querySelector('.editor-root')!==shell)changed++}maxAnimations=Math.max(maxAnimations,document.getAnimations().length);if(now-start<${ms})requestAnimationFrame(tick);else{observer?.disconnect();gaps.sort((a,b)=>a-b);resolve({durationMs:now-start,frameCount:gaps.length,p50FrameIntervalMs:gaps[Math.floor(gaps.length*.5)]??null,p95FrameIntervalMs:gaps[Math.floor(gaps.length*.95)]??null,maxFrameIntervalMs:gaps.at(-1)??null,longTasks:long,shellMissingFrames:missing,shellReplacementFrames:changed,activeAnimations:document.getAnimations().length,maxAnimations})}};requestAnimationFrame(tick)})`)
  const after=await counters(),result={name,...frames,counterDelta:delta(before,after),endHeapBytes:after.JSHeapUsedSize};metrics.push(result);a.observations.push({name:'renderer-window',data:result});return result
 }
 const arm=async(name,predicate,eventTypes=['pointerup','input','keydown','wheel'])=>{
  await a.evaluate(`(()=>{const started=performance.now(),state={name:${JSON.stringify(name)},eventAt:null,frameAt:null,timeout:false},handlers=[];globalThis.__novaMotionEvidence=state;for(const type of ${JSON.stringify(eventTypes)}){const handler=()=>{if(state.eventAt===null)state.eventAt=performance.now()};document.addEventListener(type,handler,{capture:true,once:true});handlers.push([type,handler])}const cleanup=()=>handlers.forEach(([type,fn])=>document.removeEventListener(type,fn,true));const tick=now=>{if(state.eventAt!==null&&(${predicate})){state.frameAt=performance.now();state.animationFrameTimestamp=now;state.eventToObservedFrameMs=state.frameAt-state.eventAt;cleanup();return}if(now-started>3000){state.timeout=true;cleanup();return}requestAnimationFrame(tick)};requestAnimationFrame(tick)})()`)
 }
 const take=async()=>{await a.until("globalThis.__novaMotionEvidence?.frameAt!==null||globalThis.__novaMotionEvidence?.timeout",4000);const value=await a.evaluate('globalThis.__novaMotionEvidence');a.observations.push({name:'interaction-timing',data:value});assert.equal(value.timeout,false,'Requested visible state reached: '+value.name);assert.ok(value.eventToObservedFrameMs>=0);timings.push(value);return value}
 const rawClick=async(selector,index=0)=>{const point=await a.point(selector,index);await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,buttons:0});await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',buttons:0,clickCount:1})}
 const observeClosing=async(selector,ancestor,open)=>{
  await a.evaluate(`(()=>{const state={before:null,after:null};globalThis.__novaClosingEvidence=state;const read=()=>{const element=document.querySelector(${JSON.stringify(selector)});if(!element)return{removed:true};const parent=element.closest(${JSON.stringify(ancestor)}),opacity=Number(getComputedStyle(element).opacity),parentOpacity=parent?Number(getComputedStyle(parent).opacity):1;return{opacity,parentOpacity,effectiveOpacity:opacity*parentOpacity,rect:element.getBoundingClientRect().toJSON(),inert:!!element.closest('[inert]'),at:performance.now()}};const observer=new MutationObserver(()=>{if(!state.before||state.after)return;const value=read();if(value.removed||value.inert){state.after=value;observer.disconnect()}});observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['inert']});const handler=event=>{if(event.key!=='Escape')return;document.removeEventListener('keydown',handler,true);state.before=read()};document.addEventListener('keydown',handler,true)})()`)
  await open();await a.until(visible(selector));await a.evaluate(`new Promise((resolve,reject)=>{const started=performance.now();const tick=()=>{const element=document.querySelector(${JSON.stringify(selector)}),opacity=element?Number(getComputedStyle(element).opacity):0;if(opacity>.03&&opacity<.95){resolve();return}if(performance.now()-started>1000){reject(Error('Incomplete entrance was not observed'));return}requestAnimationFrame(tick)};requestAnimationFrame(tick)})`);await a.press('Escape');await a.until("!!globalThis.__novaClosingEvidence.after")
  const value=await a.evaluate('globalThis.__novaClosingEvidence');a.observations.push({name:'close-during-entry-continuity',selector,...value});assert.ok(value.before.opacity<.995,'A genuinely incomplete entrance was observed');assert.ok(value.after.removed||value.after.inert,'Closing surface immediately stops receiving input')
  if(!value.after.removed){assert.ok(value.after.opacity<=value.before.opacity+.08,'Child opacity does not jump to its completed entrance when closing');assert.ok(value.after.effectiveOpacity<=value.before.effectiveOpacity+.08,'Composite opacity remains continuous');assert.ok(Math.abs(value.after.rect.left-value.before.rect.left)<=2&&Math.abs(value.after.rect.top-value.before.rect.top)<=2,'Dialog position remains continuous when direction reverses')}
  await a.until(`!document.querySelector(${JSON.stringify(selector)})`)
 }
 const visible=selector=>`[...document.querySelectorAll(${JSON.stringify(selector)})].some(e=>e.getBoundingClientRect().width&&!e.closest('[inert]'))`
 const noDrag=async()=>a.until("!document.documentElement.hasAttribute('data-ui-dragging')&&!document.querySelector('[data-ui-dragging],.ui-drag-preview,[data-ui-drop]')",5000)
 const entityIndex=async name=>{const n=await a.evaluate(`[...document.querySelectorAll('.entity-list .entity-item .name')].findIndex(e=>[...e.childNodes].filter(n=>n.nodeName!=='SMALL').map(n=>n.textContent).join('').trim()===${JSON.stringify(name)})`);assert.ok(n>=0,'Visible entity '+name);return n}
 const drag=async(sourceSelector,sourceIndex,targetSelector,targetIndex=0,{modifiers=0,cancel=false,dropKind,dockTarget=false}={})=>{
  const start=await a.point(sourceSelector,sourceIndex),end=await a.point(targetSelector,targetIndex);let intercepted,shiftHeld=false
  await a.evaluate(`(()=>{const element=document.querySelectorAll(${JSON.stringify(sourceSelector)})[${sourceIndex}],row=element.closest('.entity-item'),origin=row??element.closest('[draggable=true]')??element,state={element,origin,pointerDown:null,dragStart:null};globalThis.__novaNativeSourceEvidence=state;const read=event=>({target:event.target?.outerHTML?.slice(0,300),connected:element.isConnected,sameSource:event.target===origin||origin.contains(event.target),rect:origin.getBoundingClientRect().toJSON(),transform:getComputedStyle(origin).transform,activeAnimations:origin.getAnimations().length});const down=event=>{if(origin.contains(event.target))state.pointerDown=read(event)},begin=event=>{if(origin.contains(event.target))state.dragStart=read(event)};document.addEventListener('pointerdown',down,true);document.addEventListener('dragstart',begin,true);state.cleanup=()=>{document.removeEventListener('pointerdown',down,true);document.removeEventListener('dragstart',begin,true)}})()`)
  const off=a.client.on('Input.dragIntercepted',event=>intercepted=event)
  await a.client.send('Input.setInterceptDrags',{enabled:true})
  try{
   await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...start,buttons:0})
   await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...start,button:'left',buttons:1,clickCount:1,modifiers:0})
   for(let n=1;n<=12&&!intercepted;n++)await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:start.x+(end.x-start.x)*n/12,y:start.y+(end.y-start.y)*n/12,button:'left',buttons:1,modifiers:0})
   for(let n=0;n<40&&!intercepted;n++)await wait(25)
   const sourceEvidence=await a.evaluate("(()=>{const s=globalThis.__novaNativeSourceEvidence;return{pointerDown:s.pointerDown,dragStart:s.dragStart,connected:s.element.isConnected,rectAfterSelection:s.origin.getBoundingClientRect().toJSON()}})()");a.observations.push({name:'native-drag-source-stability',source:sourceSelector,...sourceEvidence})
   assert.ok(intercepted,'Real native dragstart occurred')
   assert.ok(sourceEvidence.pointerDown?.connected&&sourceEvidence.dragStart?.connected&&sourceEvidence.connected&&sourceEvidence.dragStart.sameSource,'The connected original source starts the native gesture')
   if(sourceSelector.includes('.entity-item'))assert.ok(Math.abs(sourceEvidence.pointerDown.rect.top-sourceEvidence.rectAfterSelection.top)<2,'Selecting a hierarchy drag source does not move it under the pointer')
   // Shift placing changes the drop intent. Shift mouse-down retains range/text selection.
   if(modifiers&8){await a.client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Shift',code:'ShiftLeft',windowsVirtualKeyCode:16,modifiers:8});shiftHeld=true}
   assert.equal(await a.evaluate("document.documentElement.dataset.uiDragging"),'true','Native drag source feedback active')
   for(const type of ['dragEnter','dragOver'])await a.client.send('Input.dispatchDragEvent',{type,...end,data:intercepted.data,modifiers})
   if(dropKind)await a.until(`document.querySelectorAll(${JSON.stringify(targetSelector)})[${targetIndex}]?.getAttribute('data-ui-drop')===${JSON.stringify(dropKind)}`)
   if(dockTarget)await a.until(`document.querySelectorAll(${JSON.stringify(targetSelector)})[${targetIndex}]?.getAttribute('data-drop-target')==='true'`)
   if(!intercepted.data.items.some(item=>item.mimeType==='application/x-nova-panel'))assert.equal(await a.evaluate("document.querySelectorAll('[data-drop-target=true]').length"),0,'Nested hierarchy/asset/tab drag does not activate panel docking')
   a.observations.push({name:'native-drag-target',source:sourceSelector,target:targetSelector,start,end,dropKind,modifiers,cancel,dataTypes:intercepted.data.items.map(item=>item.mimeType)})
   if(cancel){await a.press('Escape');await a.client.send('Input.dispatchDragEvent',{type:'dragCancel',...end,data:intercepted.data,modifiers})}
   else await a.client.send('Input.dispatchDragEvent',{type:'drop',...end,data:intercepted.data,modifiers})
   await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...end,button:'left',buttons:0,clickCount:1,modifiers})
  }finally{if(shiftHeld)await a.client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Shift',code:'ShiftLeft',windowsVirtualKeyCode:16,modifiers:0});off();await a.client.send('Input.setInterceptDrags',{enabled:false});await a.evaluate("globalThis.__novaNativeSourceEvidence?.cleanup()")}
  await noDrag()
 }
 const settings=async()=>{await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=editor-performance-profile]')")}
 const toggle=async label=>{const index=await a.evaluate(`[...document.querySelectorAll('.settings-page input[role=switch]')].findIndex(e=>e.getAttribute('aria-label')===${JSON.stringify(label)})`);assert.ok(index>=0,'Settings switch '+label);await a.click('.settings-page input[role=switch]',index)}

 await a.check('launcher and creation dialog use finite motion with immediate focus',async()=>{
  a.observations.push({name:'actual-browser-capabilities',data:await a.evaluate("({backdropFilter:CSS.supports('backdrop-filter','blur(4px)'),webAnimations:typeof Element.prototype.animate==='function',pointerEvent:typeof PointerEvent==='function',resizeObserver:typeof ResizeObserver==='function',navigation:performance.getEntriesByType('navigation').map(n=>({domContentLoadedMs:n.domContentLoadedEventEnd,loadMs:n.loadEventEnd})),tokens:Object.fromEntries(['--motion-control','--motion-panel','--motion-dialog','--motion-fast','--motion-standard','--motion-emphasized'].map(k=>[k,getComputedStyle(document.documentElement).getPropertyValue(k).trim()]))})")})
  await a.capture('launcher');await sample('launcher-idle')
  await arm('launcher-dialog-open',"!!document.querySelector('.creation-dialog')&&!!document.activeElement?.closest('.creation-dialog')");await rawClick('.new-project');await take()
  await wait(350);await a.capture('creation-dialog');await a.press('Escape')
  assert.ok(await a.evaluate("!document.querySelector('.creation-dialog')||!!document.querySelector('.creation-dialog').closest('[inert]')"),'Closing creation dialog becomes inert immediately')
  await rawClick('.new-project');await a.until(visible('.creation-dialog'));await wait(400)
  assert.equal(await a.evaluate("[...document.querySelectorAll('.creation-dialog')].filter(e=>!e.closest('[inert]')).length"),1)
  assert.ok(await a.evaluate("Number(getComputedStyle(document.querySelector('.creation-dialog')).opacity)>.95&&Number(getComputedStyle(document.querySelector('.creation-dialog .ui-dialog')).opacity)>.95"),'Reopened dialog finishes fully visible')
  assert.ok(await a.evaluate("!!document.activeElement.closest('.creation-dialog')"));await a.press('Escape');await a.until("!document.querySelector('.creation-dialog')")
 })
 await a.check('closing a dialog during entry preserves displayed child opacity',async()=>observeClosing('.creation-dialog .ui-dialog','.ui-dialog-overlay',()=>rawClick('.new-project')))
 await u.open(fixtureSource);await a.capture('editor');await sample('editor-idle')
 await a.check('menu and typing latency measured through actual input',async()=>{
  await arm('file-menu-open',"!!document.querySelector('.menu-item .dropdown')");await rawClick('.menu-item>button',0);await take();await wait(180);await a.capture('file-menu');await a.press('Escape')
  await a.press('p',2);await a.until(visible('.command-palette'));await arm('palette-typing',"document.querySelector('.command-palette input')?.value==='select'",['input']);await a.client.send('Input.insertText',{text:'select'});await take();await wait(240);await a.capture('command-palette');await sample('palette-open-idle',1000)
  const material=await a.evaluate("({palette:getComputedStyle(document.querySelector('.command-palette')).backdropFilter,hierarchy:getComputedStyle(document.querySelector('.sidebar-container')).backdropFilter,inspector:getComputedStyle(document.querySelector('.config-wrapper')).backdropFilter})")
  assert.equal(material.hierarchy,'none');assert.equal(material.inspector,'none');a.observations.push({name:'selective-material',...material});await a.press('Escape');await a.until("!document.querySelector('.command-palette')")
 })
 await a.check('rapid palette reversal keeps the newest state and focus',async()=>{
  for(let i=0;i<3;i++){await a.press('p',2);await a.until(visible('.command-palette'));await a.press('Escape');assert.ok(await a.evaluate("![...document.querySelectorAll('.command-palette')].some(e=>!e.closest('[inert]'))"),'Closing palette does not receive input');await a.press('p',2);await a.until(visible('.command-palette'));assert.ok(await a.evaluate("!!document.activeElement?.closest('.command-palette')"),'Latest palette owns keyboard focus');if(i===2){await wait(350);assert.ok(await a.evaluate("Number(getComputedStyle(document.querySelector('.command-palette')).opacity)>.95&&Number(getComputedStyle(document.querySelector('.palette-scrim')).opacity)>.95"),'Latest reopened palette settles fully visible')}await a.press('Escape')}
  await a.until("!document.querySelector('.command-palette')");await wait(350);assert.equal(await a.evaluate("document.getAnimations().filter(a=>a.effect?.target?.closest?.('.palette-scrim,.ui-dialog-overlay,.ui-menu')).length"),0,'No stale transient animation remains')
 })
 await a.check('closing the palette during entry preserves displayed child opacity',async()=>observeClosing('.command-palette','.palette-scrim',()=>a.press('p',2)))
 await a.check('rapid workspace switching preserves the shell and final selection',async()=>{
  await a.evaluate("(()=>{const shell=document.querySelector('.editor-root'),sample={missing:0,replaced:0,count:0,running:true};globalThis.__novaShellObservation=sample;const tick=()=>{if(!sample.running)return;sample.count++;const now=document.querySelector('.editor-root');if(!now)sample.missing++;else if(now!==shell)sample.replaced++;requestAnimationFrame(tick)};requestAnimationFrame(tick)})()")
  for(const index of [1,0,2,0]){await arm('workspace-'+index,`document.querySelectorAll('.workspace-list button')[${index}]?.getAttribute('aria-pressed')==='true'`);await rawClick('.workspace-list button',index);await take()}
  const shell=await a.evaluate("(()=>{globalThis.__novaShellObservation.running=false;return globalThis.__novaShellObservation})()");assert.ok(shell.count>0);assert.equal(shell.missing,0);assert.equal(shell.replaced,0);a.observations.push({name:'shell-during-navigation',...shell});await sample('after-workspace-switches',750)
 })
 await a.check('resizing follows the pointer, keyboard cancel restores geometry, and dock edge is correct',async()=>{
  const selector='.sidebar-container .panel-resize-handle.vertical',point=await a.point(selector)
  const bounds=await a.evaluate("({panel:document.querySelector('.sidebar-container').getBoundingClientRect().toJSON(),handle:document.querySelector('.sidebar-container .panel-resize-handle').getBoundingClientRect().toJSON()})")
  assert.ok(Math.abs(bounds.handle.right-bounds.panel.right)<3,'Left hierarchy separator is beside viewport')
  await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,buttons:0});await a.client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',buttons:1,clickCount:1});await wait(40)
  await arm('sidebar-direct-resize',`Math.abs(document.querySelector('.sidebar-container').getBoundingClientRect().width-${bounds.panel.width})>20`,['pointermove']);await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+48,y:point.y,button:'left',buttons:1});await take()
  assert.ok(Math.abs(await a.evaluate("document.querySelector('.sidebar-container').getBoundingClientRect().width")-bounds.panel.width-48)<3,'Logical panel follows actual pointer delta')
  await a.press('Escape');await a.until("!document.querySelector('.panel-resize-handle.dragging')");await a.client.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:point.x+48,y:point.y,button:'left',buttons:0,clickCount:1})
  assert.ok(Math.abs(await a.evaluate("document.querySelector('.sidebar-container').getBoundingClientRect().width")-bounds.panel.width)<3,'Escape restores pre-drag width');assert.equal(await a.evaluate("document.body.style.userSelect"),'')
 })
 await a.check('inspector native wheel and disclosure remain immediate',async()=>{
  await a.click('.entity-list .entity-item .name',0);await u.expandInspector()
  const info=await a.evaluate("(()=>{const e=[...document.querySelectorAll('.config-panel,.config-wrapper')].find(e=>e.scrollHeight>e.clientHeight+20);if(!e)return null;const r=e.getBoundingClientRect();return{selector:e.classList.contains('config-panel')?'.config-panel':'.config-wrapper',before:e.scrollTop,x:r.x+r.width/2,y:r.y+r.height/2}})()");assert.ok(info,'Inspector overflow is present')
  await arm('inspector-wheel-scroll',`document.querySelector(${JSON.stringify(info.selector)}).scrollTop>${info.before}`,['wheel']);await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',x:info.x,y:info.y,deltaY:140,deltaX:0});await take()
  const summary='.config-panel details.inspector-section>summary';await a.click(summary,0);const closed=await a.evaluate("!document.querySelector('.config-panel details.inspector-section').open");assert.equal(closed,true);await rawClick(summary,0);await a.until("document.querySelector('.config-panel details.inspector-section').open");await a.capture('inspector')
 })
 await a.check('system reduced motion settles running transitions and retains keyboard operation',async()=>{
  await a.press('p',2);await a.until(visible('.command-palette'));await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await a.until("document.documentElement.dataset.editorMotion==='off'")
  assert.equal(await a.evaluate("document.getAnimations().filter(a=>a.effect?.target?.closest?.('.palette-scrim,.command-palette,.ui-dialog-overlay,.ui-menu')).length"),0)
  await a.press('Escape');await a.until("!document.querySelector('.command-palette')");await a.press('p',2);await a.until(visible('.command-palette'));assert.equal(await a.evaluate("document.getAnimations().filter(a=>a.effect?.target?.closest?.('.palette-scrim,.command-palette')).length"),0);assert.ok(await a.evaluate("!!document.activeElement?.closest('.command-palette')"));await a.press('Escape')
  await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await a.until("document.documentElement.dataset.editorMotion==='on'")
 })
 await a.check('low-end and high-contrast settings provide opaque material fallback',async()=>{
  await settings();await a.select('[data-audit=editor-performance-profile]','low-end');await a.until("document.documentElement.dataset.performanceProfile==='low-end'&&document.documentElement.dataset.editorMotion==='off'")
  await a.press('p',2);await a.until(visible('.command-palette'));assert.equal(await a.evaluate("getComputedStyle(document.querySelector('.command-palette')).backdropFilter"),'none');assert.equal(await a.evaluate("document.getAnimations().filter(a=>a.effect?.target?.closest?.('.command-palette,.palette-scrim')).length"),0);await a.capture('low-end-fallback');await a.press('Escape');await a.until("!document.querySelector('.command-palette')")
  await a.select('[data-audit=editor-performance-profile]','balanced');await toggle('High contrast');await a.until("document.documentElement.dataset.highContrast==='true'");await a.press('p',2);await a.until(visible('.command-palette'));assert.equal(await a.evaluate("getComputedStyle(document.querySelector('.command-palette')).backdropFilter"),'none');await a.capture('high-contrast-fallback');await a.press('Escape');await a.until("!document.querySelector('.command-palette')");await toggle('High contrast');await a.until("document.documentElement.dataset.highContrast==='false'")
  await a.select('[data-audit=editor-motion-override]','off');assert.equal(await a.evaluate("document.documentElement.dataset.editorMotion"),'off');await a.select('[data-audit=editor-motion-override]','auto');await a.until("document.documentElement.dataset.editorMotion==='on'")
 })
 await a.check('shared tab indicator remains inert, keyboard accessible, and correctly aligned',async()=>{
  const rootSelector='.manage-body>nav',buttonSelector=rootSelector+'>button';await a.click(buttonSelector,1);await a.press('ArrowRight');assert.equal(await a.evaluate(`document.querySelectorAll(${JSON.stringify(buttonSelector)})[2]===document.activeElement`),true);await a.press('Enter');await a.until(`document.querySelectorAll(${JSON.stringify(buttonSelector)})[2]?.getAttribute('aria-selected')==='true'`);await wait(350)
  const geometry=await a.evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(rootSelector)}),active=root.querySelector('button.active').getBoundingClientRect(),bar=root.querySelector('.ui-tab-indicator'),rect=bar.getBoundingClientRect();return{leftError:Math.abs(active.left-rect.left),widthError:Math.abs(active.width-rect.width),hidden:bar.getAttribute('aria-hidden'),pointerEvents:getComputedStyle(bar).pointerEvents}})()`);assert.ok(geometry.leftError<3&&geometry.widthError<3);assert.equal(geometry.hidden,'true');assert.equal(geometry.pointerEvents,'none');a.observations.push({name:'tab-indicator',...geometry});await u.workspace('Design')
 })

 // A normal authored project creates representative overflow and isolated drag targets.
 const document=JSON.parse(fixtureBytes),scene=document.scenes[0],template=scene.entities[0],parentId=randomUUID(),childId=randomUUID(),peerId=randomUUID(),descendantId=randomUUID()
 const emptyEntity=(name,uuid,parentUuid=null)=>({uuid,name,enabled:true,editorVisible:true,editorLocked:false,tags:[],groups:[],persistentAcrossScenes:false,prefabAsset:null,prefabInstanceUuid:null,prefabSourceUuid:null,prefabOverrides:{},entityType:'Box',components:[{...structuredClone(template.components[0]),uuid:randomUUID(),data:{parentUuid,position:{x:0,y:0},rotation:0,scale:{x:1,y:1}}}]})
 scene.entities.unshift(emptyEntity('Motion parent',parentId),emptyEntity('Motion child',childId),emptyEntity('Motion peer',peerId),emptyEntity('Motion descendant',descendantId,parentId))
 for(let n=0;n<96;n++)scene.entities.push(emptyEntity('Motion row '+String(n).padStart(3,'0'),randomUUID()))
 const textAsset=document.assets.find(asset=>asset.mimeType==='text/markdown'),movingAssetId=randomUUID(),textSource='# Motion evidence\n',textHash=createHash('sha256').update(textSource).digest('hex')
 for(let n=0;n<96;n++){const name='Motion '+String(n).padStart(3,'0')+'.md';document.assets.push({...structuredClone(textAsset),uuid:n===0?movingAssetId:randomUUID(),name,path:'Assets/Motion/'+name,source:textSource,byteLength:Buffer.byteLength(textSource),dataUrl:'data:text/markdown;base64,'+Buffer.from(textSource).toString('base64'),pipeline:{...structuredClone(textAsset.pipeline),sourceHash:textHash,artifactHash:textHash,contentHash:textHash,cacheKey:textHash,lastValidSource:textSource}})}
 document.assets.push({...structuredClone(textAsset),uuid:randomUUID(),name:'Destination.md',path:'Assets/Drop/Destination.md'})
 document.projectMetadata.id=randomUUID();document.projectMetadata.name='26.35 Motion user acceptance';document.manifest.projectUuid=document.projectMetadata.id;document.manifest.name=document.projectMetadata.name
 const fixture=join(a.evidence,'v26.35-motion-user-fixture.nova');await writeFile(fixture,JSON.stringify(document,null,2)+'\n');a.observations.push({name:'normal-project-fixture',file:fixture,entities:scene.entities.length,assets:document.assets.length});await u.open(fixture)
 await a.check('representative hierarchy and assets scroll without artificial inertia',async()=>{
  const point=await a.point('.entity-list'),before=await a.evaluate("document.querySelector('.entity-list').scrollTop");await arm('hierarchy-wheel-scroll',`document.querySelector('.entity-list').scrollTop>${before}`,['wheel']);await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaY:240,deltaX:0});await take();assert.ok(await a.evaluate("document.querySelector('.entity-list').scrollTop>0"));await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaY:-10000,deltaX:0});await a.until("document.querySelector('.entity-list').scrollTop===0")
  await u.bottom('assets','Assets');await a.clickText('.folder-tree button','Motion',true);const assetPoint=await a.point('.asset-grid'),assetBefore=await a.evaluate("document.querySelector('.asset-grid').scrollTop");await arm('asset-wheel-scroll',`document.querySelector('.asset-grid').scrollTop>${assetBefore}`,['wheel']);await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...assetPoint,deltaY:160,deltaX:0});await take();await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...assetPoint,deltaY:-10000,deltaX:0});await a.until("document.querySelector('.asset-grid').scrollTop===0")
 })
 await a.check('hierarchy native drag reparent and reorder commit their logical result',async()=>{
  const parent=await entityIndex('Motion parent');await drag('.entity-list .entity-item .shape-icon',await entityIndex('Motion peer'),'.entity-list .entity-item',parent,{dropKind:'valid',cancel:true})
  const child=await entityIndex('Motion child');await drag('.entity-list .entity-item .name',child,'.entity-list .entity-item',parent,{dropKind:'valid'});await a.capture('hierarchy-reparent')
  const peer=await entityIndex('Motion peer'),childNow=await entityIndex('Motion child');await drag('.entity-list .entity-item .name',peer,'.entity-list .entity-item',childNow,{modifiers:8,dropKind:'before'})
  const peerOrder=await entityIndex('Motion peer'),childOrder=await entityIndex('Motion child');assert.ok(peerOrder<childOrder,'Reordered peer appears before child')
 })
 await a.check('invalid hierarchy cycle and canceled drag leave no stale feedback',async()=>{
  await drag('.entity-list .entity-item .name',await entityIndex('Motion parent'),'.entity-list .entity-item',await entityIndex('Motion descendant'),{dropKind:'invalid'})
  await drag('.entity-list .entity-item .name',await entityIndex('Motion peer'),'.entity-list .entity-item',await entityIndex('Motion descendant'),{dropKind:'valid',cancel:true});await a.capture('hierarchy-cancel')
 })
 await a.check('native asset drop confirms a stable source UUID and cleanup',async()=>{
  await a.fill('.asset-actions-row input[type=search]','Motion 000.md');await a.until("[...document.querySelectorAll('.asset-grid article')].some(e=>e.textContent.includes('Motion 000.md'))")
  const folder=await a.evaluate("[...document.querySelectorAll('.folder-tree button')].findIndex(e=>e.title==='Assets/Drop')");assert.ok(folder>=0);await drag('.asset-grid article',0,'.folder-tree button',folder,{dropKind:'valid'});await a.until(visible('.confirm-dialog'));await a.capture('asset-move-confirm');await a.click('.confirm-dialog .ui-dialog-footer .ui-button--primary');await a.until("!document.querySelector('.confirm-dialog')")
  const saved=await u.save('motion-user-committed');const savedFile=join(a.evidence,'v26.35-motion-user-committed.nova');await copyFile(saved.file,savedFile)
  const entities=saved.document.scenes.flatMap(scene=>scene.entities),parent=e=>e.components.find(component=>component.kind==='Transform2D').data.parentUuid
  assert.equal(parent(entities.find(entity=>entity.uuid===childId)),parentId);assert.equal(parent(entities.find(entity=>entity.uuid===peerId)),parentId);assert.equal(parent(entities.find(entity=>entity.uuid===parentId)),null);assert.ok(entities.findIndex(entity=>entity.uuid===peerId)<entities.findIndex(entity=>entity.uuid===childId));assert.equal(saved.document.assets.find(asset=>asset.uuid===movingAssetId).path,'Assets/Drop/Motion 000.md');a.observations.push({name:'actual-saved-drag-results',file:savedFile,childId,parentId,peerId,movingAssetId})
 })
 await a.check('bottom native tab reordering keeps interaction and content ownership',async()=>{
  const before=await a.evaluate("[...document.querySelectorAll('.bottom-panel .panel-tab')].map(e=>e.textContent.trim())");await drag('.bottom-panel .panel-tab',0,'.bottom-panel .panel-tab',2,{dropKind:'before'});const after=await a.evaluate("[...document.querySelectorAll('.bottom-panel .panel-tab')].map(e=>e.textContent.trim())");assert.notDeepEqual(after,before);assert.deepEqual([...after].sort(),[...before].sort());await u.bottom('assets','Assets');a.observations.push({name:'bottom-tab-order',before,after})
 })
 await a.check('canceled native tab drag preserves committed order',async()=>{
  const before=await a.evaluate("[...document.querySelectorAll('.bottom-panel .panel-tab')].map(e=>e.textContent.trim())");await drag('.bottom-panel .panel-tab',0,'.bottom-panel .panel-tab',2,{dropKind:'before',cancel:true});assert.deepEqual(await a.evaluate("[...document.querySelectorAll('.bottom-panel .panel-tab')].map(e=>e.textContent.trim())"),before);await noDrag()
 })
 await a.check('native panel docking and floating return preserve hierarchy ownership',async()=>{
  await drag('.sidebar-container .scene-manager .ui-panel-header strong',0,'.right-dock',0,{dockTarget:true});await a.until("!!document.querySelector('.right-dock .sidebar-container')");assert.equal(await a.evaluate("document.querySelectorAll('[data-drop-target=true]').length"),0)
  await drag('.right-dock .sidebar-container .scene-manager .ui-panel-header strong',0,'.editor-workspace',0,{dockTarget:true});await a.until("!!document.querySelector('.floating-dock.hierarchy-float')");await a.capture('native-panel-floating')
  await a.click('.floating-dock.hierarchy-float>header button');await a.until("!!document.querySelector('.left-dock .sidebar-container')&&!document.querySelector('.floating-dock.hierarchy-float')");assert.ok(await entityIndex('Motion parent')>=0);await noDrag()
 })
 await a.check('minimum-window menu and keyboard focus remain usable',async()=>{
  await a.viewport(1024,640);await a.press('p',2);await a.until(visible('.command-palette'));const rect=await a.evaluate("document.querySelector('.command-palette').getBoundingClientRect().toJSON()");assert.ok(rect.left>=0&&rect.top>=0&&rect.right<=1024&&rect.bottom<=640);await a.capture('minimum-command-palette');await a.press('Escape');await a.until("!document.querySelector('.command-palette')");await a.viewport(1600,900)
 })
 await a.check('bounded before-and-after measurements satisfy responsive editor budgets',async()=>{
  const used=new Map()
  for(const current of timings){const index=used.get(current.name)??0,old=baseline.timings.filter(item=>item.name===current.name)[index];used.set(current.name,index+1);if(!old)continue;const limit=Math.max(current.name.startsWith('workspace-')?250:120,old.eventToObservedFrameMs*2+100);const row={kind:'event-to-observed-frame',name:current.name,beforeMs:old.eventToObservedFrameMs,afterMs:current.eventToObservedFrameMs,limitMs:limit,status:current.eventToObservedFrameMs<=limit?'passed':'failed'};comparison.push(row);assert.equal(row.status,'passed',JSON.stringify(row))}
  for(const current of metrics){const old=baseline.metrics.find(item=>item.name===current.name);if(!old)continue;const oldTask=old.counterDelta.TaskDuration*1000/(old.durationMs/1000),newTask=current.counterDelta.TaskDuration*1000/(current.durationMs/1000),taskLimit=Math.max(60,oldTask*1.6+60);const frameLimit=Math.max(80,old.p95FrameIntervalMs*2+20);const row={kind:'renderer-window',name:current.name,beforeTaskMsPerSecond:oldTask,afterTaskMsPerSecond:newTask,taskLimitMsPerSecond:taskLimit,beforeP95IntervalMs:old.p95FrameIntervalMs,afterP95IntervalMs:current.p95FrameIntervalMs,frameLimitMs:frameLimit,beforeLongTasks:old.longTasks.length,afterLongTasks:current.longTasks.length,layoutPasses:current.counterDelta.LayoutCount,status:newTask<=taskLimit&&current.p95FrameIntervalMs<=frameLimit&&current.longTasks.length<=old.longTasks.length+3?'passed':'failed'};comparison.push(row);assert.equal(row.status,'passed',JSON.stringify(row));assert.equal(current.shellMissingFrames,0);assert.equal(current.shellReplacementFrames,0);assert.equal(current.activeAnimations,0,'No persistent idle motion jobs remain')}
  a.observations.push({name:'motion-performance-comparison',baseline,after:{timings,metrics},comparison,scope:evidenceScope})
  await writeFile(join(a.evidence,'v26.35-motion-performance.json'),JSON.stringify({format:'nova-v26.35-motion-performance',version:1,release:'26.35',qualifiedRelease:qualified?'26.35':null,generatedAt:new Date().toISOString(),status:'passed',baseline,after:{timings,metrics},comparison,fixtureSourceSha256,scope:evidenceScope},null,2)+'\n')
 })
})
// The release evidence packager embeds report.captures. Keep the before PNGs
// beside the after captures without changing the generated audit authority.
const reportFile=join(auditReportDirectory,'v26.35-motion-user.json')
const report=JSON.parse(await readFile(reportFile,'utf8'))
assert.equal(report.status,'passed')
report.captures=[...new Set([...report.captures,...beforeCaptures])]
await writeFile(reportFile,JSON.stringify(report,null,2)+'\n')


