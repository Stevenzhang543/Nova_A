/** Actual selected-value hint lifetime, trusted input and DOM-owner cleanup. */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {join,resolve} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'

const root=resolve(process.env.NOVA_AUDIT_ROOT||process.cwd())
const release=process.argv.find(arg=>arg.startsWith('--qualification-release='))?.split('=')[1]||'26.37'
assert.equal(release,'26.37')
assert.equal(JSON.parse(await readFile(join(root,'package.json'),'utf8')).version,release+'.0')
const fixture=join(root,'reference-projects/projects/world-v2629-stream-host/project.nova')
const replacement=join(root,'reference-projects/projects/creator-v2637-mixed-game/project.nova')
await readFile(fixture);await readFile(replacement)
const channel='#network-studio-panel-protocol .channel-row select'
const hint='#nova-selected-value-detail',ownerGroup='nova-selected-value-hint-owner-audit'
const stateExpression=`(()=>{const h=document.querySelector(${JSON.stringify(hint)}),s=h?getComputedStyle(h):null,r=h?.getBoundingClientRect();let opacity=1;for(let p=h;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);const owners=[...document.querySelectorAll('[aria-describedby]')].filter(e=>(e.getAttribute('aria-describedby')||'').split(/\\s+/).includes('nova-selected-value-detail')).map(e=>({tag:e.tagName,id:e.id,label:e.getAttribute('aria-label'),value:e.value,selectedText:e.selectedOptions?.[0]?.textContent?.trim(),focused:e===document.activeElement,connected:e.isConnected}));const hit=r&&r.width&&r.height?document.elementFromPoint(Math.max(0,Math.min(innerWidth-1,r.x+r.width/2)),Math.max(0,Math.min(innerHeight-1,r.y+r.height/2))):null;return{at:performance.now(),hint:h?{hidden:h.hidden,inert:h.inert,text:h.textContent,opacity,pointerEvents:s.pointerEvents,visibility:s.visibility,display:s.display,animations:h.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime})),isHitTarget:hit===h}:null,owners,active:{tag:document.activeElement?.tagName,id:document.activeElement?.id},panel:document.querySelector('.network-studio [role=tabpanel]')?.id}})()`
const cleanExpression=`(()=>{const h=document.querySelector(${JSON.stringify(hint)});return !!h&&h.hidden&&!h.getAnimations().some(a=>a.playState==='running'||a.playState==='pending')&&![...document.querySelectorAll('[aria-describedby]')].some(e=>(e.getAttribute('aria-describedby')||'').split(/\\s+/).includes('nova-selected-value-detail'))})()`

await withBrowserAudit({release,expectedRelease:release,name:'select-tooltip-user',root,qualifyRelease:false,width:1366,height:768},async a=>{
  const u=worldUserControls17(a)
  async function snapshot(name){const state=await a.evaluate(stateExpression);a.observations.push({name,...state});return state}
  async function owner(selector,index=0){const result=await a.client.send('Runtime.evaluate',{expression:`document.querySelectorAll(${JSON.stringify(selector)})[${index}]`,objectGroup:ownerGroup,returnByValue:false});assert.ok(result.result.objectId,'Existing public select DOM owner');return result.result.objectId}
  async function readOwner(objectId){const result=await a.client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:`function(){return{connected:this.isConnected,describedBy:this.getAttribute('aria-describedby'),selectedText:this.selectedOptions?.[0]?.textContent?.trim(),value:this.value,focused:document.activeElement===this}}`,returnByValue:true});assert.ok(!result.exceptionDetails,'DOM-owner observation must succeed');return result.result.value}
  async function hover(selector,index=0){const point=await a.point(selector,index);await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point,button:'none',buttons:0})}
  async function shown(expected){await a.until(`(()=>{const h=document.querySelector(${JSON.stringify(hint)});return !!h&&!h.hidden&&h.textContent===${JSON.stringify(expected)}&&Number(getComputedStyle(h).opacity)>.1})()`,2000)}
  async function clean(name,objectId){await a.until(cleanExpression,2000);const state=await snapshot(name);assert.equal(state.hint.hidden,true);assert.equal(state.owners.length,0);assert.equal(state.hint.isHitTarget,false);if(objectId){const old=await readOwner(objectId);assert.ok(!(old.describedBy||'').split(/\s+/).includes('nova-selected-value-detail'),'Previous DOM owner must lose only this hint ARIA token');a.observations.push({name:name+'-previous-owner',...old})}}
  async function network(){await u.open(fixture);await u.workspace('Design');await u.bottom('networkStudio','Network Studio');await u.activate('[data-panel-maximize="bottom"]');await a.until("!!document.querySelector('#network-studio-tab-protocol')");await u.activate('#network-studio-tab-protocol');await a.until(`!!document.querySelector(${JSON.stringify(channel)})`)}
  async function channelHover(){await a.until(`!!document.querySelector(${JSON.stringify(channel)})`);const objectId=await owner(channel),old=await readOwner(objectId);await hover(channel);await shown(old.selectedText);return{objectId,selectedText:old.selectedText}}
  try{
    await a.check('Hovered Channels select closes finitely with cleared ARIA after keyboard Replication navigation',async()=>{
      await network();const old=await channelHover();const before=await snapshot('channels-hover-before-replication');assert.equal(before.owners.length,1);assert.equal(before.owners[0].focused,false);assert.equal(before.hint.pointerEvents,'none');
      await u.activate('#network-studio-tab-replication');await a.until("!!document.querySelector('#network-studio-panel-replication')");await clean('replication-settled',old.objectId);assert.equal((await readOwner(old.objectId)).connected,false);await a.capture('replication-owner-cleanup')
    })
    await a.check('Focused selected-value hint loses ownership after an actual workspace change',async()=>{
      await u.activate('#network-studio-tab-protocol');await a.until(`!!document.querySelector(${JSON.stringify(channel)})`);const objectId=await owner(channel);await a.evaluate(`document.querySelector(${JSON.stringify(channel)}).focus()`);await shown((await readOwner(objectId)).selectedText);assert.equal((await readOwner(objectId)).focused,true);await snapshot('focused-select-before-workspace');
      await u.activate('.workspace-list button',1);await a.until("document.querySelectorAll('.workspace-list button')[1].getAttribute('aria-pressed')==='true'");await clean('workspace-select-cleanup',objectId);await a.capture('workspace-select-cleanup')
    })
    await a.check('A merely hovered owner is removed by public project input and its hint finishes cleanup',async()=>{
      await u.workspace('Design');await u.bottom('networkStudio','Network Studio');await a.until("!!document.querySelector('#network-studio-tab-protocol')");await u.activate('#network-studio-tab-protocol');await a.until(`!!document.querySelector(${JSON.stringify(channel)})`);
      await a.click('.menu-item>button',0);let chooser;const off=a.client.on('Page.fileChooserOpened',event=>chooser=event);
      try{
        await a.client.send('Page.setInterceptFileChooserDialog',{enabled:true});await a.clickText('.menu-item .dropdown button','Import Project');const deadline=Date.now()+10000;while(!chooser&&Date.now()<deadline)await wait(50);assert.ok(chooser,'Actual Import Project chooser must open');
        // The established headless chooser fallback holds real file delivery while public pointer input shows the previous owner.
        const old=await channelHover();assert.equal((await readOwner(old.objectId)).focused,false);await snapshot('hovered-owner-before-file-delivery');
        await a.client.send('DOM.setFileInputFiles',{files:[replacement],backendNodeId:chooser.backendNodeId});
        const end=Date.now()+10000;let detached=false;while(!detached&&Date.now()<end){detached=!(await readOwner(old.objectId)).connected;if(!detached)await wait(50)}assert.ok(detached,'Real project replacement must detach the previous select owner');
        await clean('detached-project-owner-cleanup',old.objectId)
        // Ownership cleanup is asserted before any next focus/click. Complete the existing public import review separately.
        await a.until("!!document.querySelector('.upgrade-dialog,.editor-root')",30000)
        if(await a.evaluate("!!document.querySelector('.upgrade-dialog')"))await a.click('.upgrade-dialog footer button.primary')
        await a.until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000);await a.capture('detached-project-owner-cleanup')
      }finally{off()}
    })
    await a.check('Rapid trusted hover, exit and reentry settle on only the latest select text and ARIA owner',async()=>{
      await network();const selector='#network-studio-panel-protocol select',texts=await a.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].map(e=>e.selectedOptions[0]?.textContent?.trim())`),first=0,second=texts.findIndex((text,index)=>index!==first&&!!text&&text!==texts[first]);assert.ok(second>=0,'Populated protocol has two actual distinct selected labels');
      const old=await owner(selector,first),latest=await owner(selector,second);await hover(selector,first);await shown(texts[first]);
      await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:10,button:'none',buttons:0});await hover(selector,second);await hover(selector,first);await hover(selector,second);
      await shown(texts[second]);await a.until(`(()=>{const h=document.querySelector(${JSON.stringify(hint)});return !!h&&!h.hidden&&!h.getAnimations().some(a=>a.playState==='running'||a.playState==='pending')})()`,2000);
      const state=await snapshot('rapid-reentry-latest-owner');assert.equal(state.hint.text,texts[second]);assert.equal(state.owners.length,1);assert.equal(state.owners[0].selectedText,texts[second]);assert.equal(state.hint.isHitTarget,false);assert.ok(!(await readOwner(old)).describedBy?.split(/\s+/).includes('nova-selected-value-detail'));assert.ok((await readOwner(latest)).describedBy?.split(/\s+/).includes('nova-selected-value-detail'));await a.capture('rapid-reentry-latest-owner');
      await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:10,button:'none',buttons:0});await clean('rapid-reentry-final-exit',latest)
    })
    a.observations.push({name:'selected-value-hint-regression-scope',fixture,replacement,conditions:{width:1366,height:768},scope:'Four actual public keyboard, hover, file-input and reentry paths. DOM object handles observe detached owner attributes and are released. Only hint-local WAAPI cleanup is certified; no private application state or global motion diagnostics are injected. Headless intercepted chooser fallback does not certify native OS picker input.'})
  }finally{await a.client.send('Runtime.releaseObjectGroup',{objectGroup:ownerGroup})}
})
