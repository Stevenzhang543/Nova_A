import assert from 'node:assert/strict'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {existsSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {decodeAuditPng,auditPixel} from './lib/renderingUserPixels.mjs'
const home=dirname(dirname(fileURLToPath(import.meta.url))),repository=existsSync(join(home,'package.json'))?home:resolve(home,'../..')
const {withBrowserAudit,wait}=await import(pathToFileURL(join(repository,'scripts/lib/browserUserAudit.mjs')))
await withBrowserAudit({release:'26.15',name:'template-ui-user',width:1600,height:1000},async audit=>{
 const {evaluate,until,click,clickText,fill,client,check,capture,observations,evidence}=audit
 const selectEntity=async name=>{await click('.workspace-list button',0);await until("!!document.querySelector('.hierarchy-header input[type=search]')");await fill('.hierarchy-header input[type=search]',name);const index=await evaluate("[...document.querySelectorAll('.entity-item .name')].findIndex(e=>{const c=e.cloneNode(true);c.querySelector('small')?.remove();return c.textContent.trim()==="+JSON.stringify(name)+"})");assert.ok(index>=0,'Visible hierarchy object '+name);await click('.entity-item .name',index);await until("document.querySelector('.inspector-header')?.textContent.includes("+JSON.stringify(name)+")")}
 for(const id of['ui-showcase','responsive-ui','audio-lab']){
  await check(id+': actual launcher, Text caption,68/100 progress and None panel layout are visible in Inspector',async()=>{
   await until("!!document.querySelector('.project-manager')");await fill('.creation-card header input','UI Template '+id);await click('[data-template-id="'+id+'"]');await click('.create-button');await until("!!document.querySelector('.editor-root')",30000)
   if(await evaluate("!!document.querySelector('.onboarding-scrim')")){await evaluate("document.querySelector('.onboarding-scrim').focus()");await audit.press('Escape');await until("!document.querySelector('.onboarding-scrim')")}
   await selectEntity('Play Button');await until("!!document.querySelector('.runtime-component textarea')");const caption=await evaluate("(()=>{const textarea=document.querySelector('.runtime-component textarea'),section=textarea.closest('section');return{text:textarea.value,key:[...section.querySelectorAll('label')].find(label=>label.querySelector('span')?.textContent.toLowerCase().includes('localization'))?.querySelector('input')?.value}})()");assert.deepEqual(caption,{text:'{menu.play}',key:'menu.play'});await evaluate("document.querySelector('.runtime-component textarea').scrollIntoView({block:'center'})");await capture(id+'-caption-inspector')
   await selectEntity('Player Name');const placeholder=await evaluate("[...document.querySelectorAll('.runtime-component label')].find(label=>label.querySelector('span')?.textContent.trim()==='Placeholder')?.querySelector('input')?.value");assert.equal(placeholder,'Player name')
   await selectEntity('Options Toggle');const checkbox=await evaluate("(()=>{const labels=[...document.querySelectorAll('.runtime-component label')];return{label:labels.find(label=>label.querySelector('span')?.textContent.trim()==='Label')?.querySelector('input')?.value,key:labels.find(label=>label.querySelector('span')?.textContent.toLowerCase().includes('localization'))?.querySelector('input')?.value}})()");assert.deepEqual(checkbox,{label:'Sound enabled',key:'menu.sound'});await capture(id+'-label-inspector')
   await selectEntity('Loading Progress');await until("document.querySelectorAll('.range-values input').length===3");const progress=await evaluate("[...document.querySelectorAll('.range-values input')].map(input=>Number(input.value))");assert.deepEqual(progress,[0,100,68]);await evaluate("document.querySelector('.range-values').scrollIntoView({block:'center'})");await capture(id+'-progress-inspector')
   await selectEntity('Menu Panel');const layout=await evaluate("[...document.querySelectorAll('.runtime-component select')].find(select=>[...select.options].some(option=>option.value==='Column'))?.value");assert.equal(layout,'None');observations.push({id,phase:'actual-inspector',caption,placeholder,checkbox,progress,layout})
  })
  await check(id+': actual Play draws a localized caption and68% progress at the authored positions',async()=>{
   await click('.workspace-list button',4);await until("!!document.querySelector('.game-view .canvas-container')");await clickText('.panel-tabs .panel-tab','Console');await until("!!document.querySelector('.console-panel')");await click('.actionbar button',0);await until("document.querySelector('.actionbar button').classList.contains('active')");await click('.actionbar .mode-label');await until("!!document.querySelector('.game-ui-a11y-node[aria-label=\"Start game\"]')")
   assert.equal(await evaluate("document.querySelector('.game-ui-a11y-node[role=checkbox]')?.getAttribute('aria-label')"),'Sound enabled')
   const clip=await evaluate("(()=>{const r=document.querySelector('.game-view .canvas-container').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()"),button=await evaluate("(()=>{const r=document.querySelector('.game-ui-a11y-node[aria-label=\"Start game\"]').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height}})()"),scale=button.width/560
   assert.ok(Math.abs((button.y+button.height/2)-(clip.y+clip.height/2-20*scale))<2,'None layout preserves authored button Y');assert.ok(Math.abs(button.height-62*scale)<2,'None layout preserves authored button height')
   let frame,image,metrics
   for(let attempt=0;attempt<60;attempt++){
    frame=await client.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false});image=decodeAuditPng(Buffer.from(frame.data,'base64'));const cx=button.x-clip.x+button.width/2,cy=button.y-clip.y+button.height/2,positions=[]
    for(let y=Math.floor(cy-16*scale);y<=Math.ceil(cy+16*scale);y++)for(let x=Math.floor(cx-95*scale);x<=Math.ceil(cx+95*scale);x++){const pixel=auditPixel(image,x,y);if(pixel[0]>220&&pixel[1]>220&&pixel[2]>220)positions.push([x,y])}
    const barY=cy+180*scale,barX=button.x-clip.x,start=Math.ceil(barX),end=Math.floor(barX+button.width),blue=[]
    for(let x=start;x<end;x++){const p=auditPixel(image,x,barY);if(p[2]>150&&p[2]-p[0]>70&&p[1]>80)blue.push(x)}
    const ratio=blue.length/(end-start);metrics={captionPixels:positions.length,captionWidth:positions.length?Math.max(...positions.map(p=>p[0]))-Math.min(...positions.map(p=>p[0]))+1:0,progressRatio:ratio,fillPixel:auditPixel(image,barX+button.width*.25,barY),emptyPixel:auditPixel(image,barX+button.width*.85,barY),scale}
    if(metrics.captionPixels>20&&Math.abs(ratio-.68)<.025)break;await wait(100)
   }
   assert.ok(metrics.captionPixels>20,'Actual white caption glyphs must render');assert.ok(metrics.captionWidth<70*scale,'Caption must resolve to the short localized Play label, not the literal localization placeholder');assert.ok(Math.abs(metrics.progressRatio-.68)<.025,'Actual progress pixels must show68%, not a full bar: '+JSON.stringify(metrics));assert.ok(metrics.emptyPixel[2]<100);assert.ok(metrics.fillPixel[2]>150)
   const errors=await evaluate("[...document.querySelectorAll('.console-panel .log-entry.error,.console-panel .log-entry.fatal')].map(e=>e.textContent)");assert.deepEqual(errors,[])
   const directory=join(evidence,'template-ui-previews');await mkdir(directory,{recursive:true});const preview=join(directory,id+'.png'),bytes=Buffer.from(frame.data,'base64');await writeFile(preview,bytes);await capture(id+'-running');observations.push({id,phase:'actual-game-pixels',preview,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),clip,button,metrics,scope:'Actual visible running Game screenshot; geometry read only from its rendered accessibility node. No application-state injection or synthesized preview.'})
   await click('.actionbar button',3);await until("document.querySelectorAll('.actionbar button')[3].disabled");await clickText('.menu-container>.menu-item>button','File',true);await clickText('.dropdown button','Project Manager',true)
  })
 }
})
