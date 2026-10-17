/** Fresh representative projects through visible editor controls, actual saves and reloads. */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const release=JSON.parse(await readFile('package.json','utf8')).version.replace(/\.0$/,'')
// Import canonicalizes embedded JSON object key order; compare every value, not textual ordering.
const semanticAssets=assets=>assets.map(asset=>{let source=asset.source;try{source=JSON.parse(source)}catch{}return{...asset,source}})
await withBrowserAudit({release,name:'phase2-workflows',qualifyRelease:false,width:1600,height:1000},async a=>{
 const u=worldUserControls17(a)
 for(const id of ['platformer','top-down','responsive-ui'].filter(id=>!process.env.NOVA_WORKFLOW_ID||id===process.env.NOVA_WORKFLOW_ID)){
  await a.check(id+': create from launcher, save, reload, run and stop',async()=>{
   if(await a.evaluate("!!document.querySelector('.editor-root')")){await a.client.send('Page.reload');await a.until("!!document.querySelector('.project-manager')",30000)}
   await a.click('.quick-actions .new-project');await a.until("!!document.querySelector('.creation-card')")
   await a.fill('.creation-card header input','Phase II '+id);await a.click(`[data-template-id="${id}"]`)
   assert.equal(await a.evaluate(`document.querySelector('[data-template-id="${id}"]').getAttribute('aria-pressed')`),'true')
   await a.click('.create-button');await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000)
   if(await a.evaluate("!!document.querySelector('.onboarding-scrim')")){await a.evaluate("document.querySelector('.onboarding-scrim').focus()");await a.press('Escape');await a.until("!document.querySelector('.onboarding-scrim')")}
   if(id==='top-down'){
    await u.workspace('Script');await u.activate('.logic-tabs button',0);await a.until("!!document.querySelector('.editor-shell textarea')");await a.clickText('.script-list button','TopDownController.rhai')
    const source=await a.evaluate("document.querySelector('.editor-shell textarea').value")
    await a.fill('.editor-shell textarea',source+'\nfn start() { save_set("phase2_score", 42); save_commit("slot2"); save_set("phase2_marker", true); save_commit("slot2"); }\n')
    await u.activate('.toolbar-actions button[title="Save script"]');await a.until("document.querySelector('.toolbar-actions button[title=\"Save script\"]').disabled")
   }
   const saved=await u.save('phase2-'+id);assert.ok(saved.document.scenes.length>0);assert.ok(saved.document.assets.length>0)
   await u.open(saved.file);const reopened=await u.save('phase2-'+id+'-reopened')
   assert.deepEqual(reopened.document.scenes,saved.document.scenes,'Scene authoring survives disk roundtrip')
   assert.deepEqual(semanticAssets(reopened.document.assets),semanticAssets(saved.document.assets),'Asset authoring survives disk roundtrip')
   await u.workspace('Debug');await u.bottom('console','Console');await a.click('.actionbar button',0)
   await a.until("document.querySelector('.actionbar button').classList.contains('active')",15000);await a.click('.actionbar .mode-label');await wait(1300)
   if(id==='top-down'){
    const saveKey=`nova_a.game_save.v2:${saved.document.projectMetadata.id}:slot2`
    await a.until(`!!localStorage.getItem(${JSON.stringify(saveKey)})`)
    const values=await a.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(saveKey)})).values`)
    assert.equal(values.phase2_score,42);assert.equal(values.phase2_marker,true,'Script writes stay in selected secondary slot after its first commit');a.observations.push({id,saveKey,values,scope:'Rhai authored through the editor and executed by actual browser runtime; Web Storage readback only.'})
   }
   assert.deepEqual(await a.evaluate("[...document.querySelectorAll('.console-panel .log-entry.error,.console-panel .log-entry.fatal')].map(e=>e.textContent)"),[])
   const clip=await a.evaluate("(()=>{const r=document.querySelector('.game-view .canvas-container').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()")
   assert.ok(clip.width>200&&clip.height>150)
   const frame=await a.client.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false})
   const pixels=await a.evaluate(`(async()=>{const image=await createImageBitmap(await(await fetch('data:image/png;base64,${frame.data}')).blob()),c=new OffscreenCanvas(image.width,image.height),x=c.getContext('2d');x.drawImage(image,0,0);const d=x.getImageData(0,0,c.width,c.height).data,counts=new Map();let dominant=0;for(let i=0;i<d.length;i+=4){const k=(d[i]<<16)|(d[i+1]<<8)|d[i+2],n=(counts.get(k)||0)+1;counts.set(k,n);dominant=Math.max(dominant,n)}image.close();return{colors:counts.size,nonDominant:c.width*c.height-dominant}})()`)
   assert.ok(pixels.nonDominant>500,'Visible game content must render');await a.capture(id+'-running')
   if(id==='platformer'){
    await u.entity('Player');await a.click('.actionbar .mode-label');const grounded=await u.position()
    async function holdUntil(key,code,keyCode,condition){
     await a.client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,windowsVirtualKeyCode:keyCode})
     try{await a.until(condition,10000)}finally{await a.client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,windowsVirtualKeyCode:keyCode})}
    }
    await holdUntil('d','KeyD',68,`Number(document.querySelectorAll('[data-property-path="Transform.position"] input')[0].value)>${grounded[0]+.3}`)
    const moved=await u.position()
    await holdUntil(' ','Space',32,`Number(document.querySelectorAll('[data-property-path="Transform.position"] input')[1].value)>${moved[1]+.3}`)
    const jumped=await u.position();a.observations.push({id,grounded,moved,jumped,scope:'Bounded actual key hold waits for observed simulation progress; software rendering is not assumed to sustain realtime FPS.'})
   }
   if(id==='responsive-ui'){
    await a.click('.game-ui-a11y-node[role="textbox"]');await a.until("!!document.querySelector('.native-ui-input')");await a.client.send('Input.insertText',{text:'Nova 玩家'});await a.press('Tab');await a.until("document.querySelector('.game-ui-a11y-node[role=\"textbox\"]')?.getAttribute('aria-valuetext')==='Nova 玩家'")
    const checkbox='.game-ui-a11y-node[role="checkbox"]',before=await a.evaluate(`document.querySelector('${checkbox}').getAttribute('aria-checked')`)
    await a.click(checkbox);await a.until(`document.querySelector('${checkbox}').getAttribute('aria-checked')!==${JSON.stringify(before)}`);await a.capture('responsive-ui-interacted')
   }
   if(id==='top-down'){
    await u.entity('Player');await a.click('.actionbar .mode-label');const before=await u.position();await a.press('w',0,300);const after=await u.position();a.observations.push({id,input:'W',before,after,focus:await a.evaluate('document.activeElement.outerHTML.slice(0,500)')});console.log(JSON.stringify({id,before,after}));assert.ok(after[1]>before[1]+.3,'Real W input moves the player');await a.press('s',0,300);assert.ok((await u.position())[1]<after[1]-.3,'Real S input moves down')
   }
   await a.click('.actionbar button',3);await a.until("document.querySelectorAll('.actionbar button')[3].disabled")
   if(id==='top-down'){await a.click('.actionbar .mode-label');await a.press('q');assert.equal(await a.evaluate("document.querySelectorAll('.toolbar-content>button')[1].getAttribute('aria-pressed')"),'true');await a.press('w');assert.equal(await a.evaluate("document.querySelectorAll('.toolbar-content>button')[2].getAttribute('aria-pressed')"),'true')}
   const stopped=await u.save('phase2-'+id+'-stopped');assert.deepEqual(stopped.document.scenes,saved.document.scenes,'Stop restores authored scenes')
   a.observations.push({id,pixels,scenes:saved.document.scenes.length,assets:saved.document.assets.length,scope:'Fresh creation and real save/reload/run/stop; top-down keyboard movement. Does not certify every template mechanic.'})
  })
 }
})
