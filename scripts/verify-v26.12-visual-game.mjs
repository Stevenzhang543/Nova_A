import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),evidence=join(root,'release-audits'),checks=[],errors=[],captures=[],layout=[],observations=[]
const positionSelector='[data-property-path="Transform.position"] input'
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let client,edge,server,profile,failure
async function evaluate(expression){const result=await client.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
async function until(expression,timeout=20000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await wait(100)}throw new Error('Timed out: '+expression)}
async function click(selector,index=0){const point=await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)throw Error('Missing '+${JSON.stringify(selector)});if(el.disabled)throw Error('Disabled '+el.textContent);el.scrollIntoView({block:'center',inline:'nearest'});const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,text:el.textContent}})()`);await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await wait(100)}
async function clickText(selector,text){const index=await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(el=>el.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`);assert.ok(index>=0,`Missing ${selector} text ${text}`);await click(selector,index)}
async function fill(selector,value,index=0){await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)throw Error('Missing input');el.focus();el.select();})()`);await client.send('Input.insertText',{text:value});await evaluate("document.activeElement.blur()");await wait(180)}
async function press(code,modifiers=0,hold=0){const key=code==='Space'?' ':code,windowsVirtualKeyCode={Home:36,End:35,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27,Space:32,Tab:9}[code];await client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code,modifiers,windowsVirtualKeyCode});if(hold)await wait(hold);await client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code,modifiers,windowsVirtualKeyCode})}
async function position(label){const value=await evaluate(`[...document.querySelectorAll(${JSON.stringify(positionSelector)})].map(el=>Number(el.value))`);observations.push({label,position:value});return value}
async function selectCodeWord(name,occurrence=0){await click('.editor-shell textarea');await press('Home',2);const index=await evaluate(`(()=>{const value=document.querySelector('.editor-shell textarea').value;let at=-1;for(let i=0;i<=${occurrence};i++)at=value.indexOf(${JSON.stringify(name)},at+1);return at})()`);assert.ok(index>=0);for(let i=0;i<index;i++)await press('ArrowRight');for(let i=0;i<name.length;i++)await press('ArrowRight',8);assert.equal(await evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');return e.value.slice(e.selectionStart,e.selectionEnd)})()"),name)}
async function capture(name){const result=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file='v26.12-visual-game-'+name+'.png';await writeFile(join(evidence,file),Buffer.from(result.data,'base64'));captures.push(file)}
async function check(name,action){await action();checks.push({name,status:'passed'});console.log('PASS '+name)}
async function freePort(){const s=createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port}
async function connect(url){const socket=new WebSocket(url),pending=new Map(),listeners=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const item=pending.get(message.id);if(!item)return;pending.delete(message.id);message.error?item.reject(Error(message.error.message)):item.resolve(message.result)}else for(const handler of listeners.get(message.method)??[])handler(message.params)});return{send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}))})},on(method,handler){listeners.set(method,[...(listeners.get(method)??[]),handler])}}}

try{
  await mkdir(evidence,{recursive:true});profile=await mkdtemp(join(tmpdir(),'nova-v2612-visual-game-'))
  const port=await freePort(),debug=await freePort();server=await preview({root,logLevel:'silent',preview:{host:'127.0.0.1',port,strictPort:true}})
  let executable='';for(const file of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'])try{await readFile(file);executable=file;break}catch{}
  if(!executable)throw Error('Microsoft Edge is unavailable')
  edge=spawn(executable,['--headless=new','--no-first-run','--disable-extensions','--disable-blink-features=FileSystemAccessLocal','--use-angle=swiftshader',`--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/`],{stdio:'ignore',windowsHide:true})
  let target;const deadline=Date.now()+20000;while(Date.now()<deadline&&!target){try{target=(await fetch(`http://127.0.0.1:${debug}/json/list`).then(r=>r.json())).find(item=>item.type==='page')}catch{}if(!target)await wait(100)}
  if(!target)throw Error('Edge DevTools did not start')
  client=await connect(target.webSocketDebuggerUrl);client.on('Runtime.exceptionThrown',event=>errors.push(event.exceptionDetails?.exception?.description??event.exceptionDetails?.text));await client.send('Runtime.enable');await client.send('Page.enable')
  await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
  await until("!!document.querySelector('.project-manager')")
  await check('Create a blank project and a new empty Rhai structure using editor controls',async()=>{
    await fill('.creation-card header input','26.12 Visual Game Audit');await click('[data-template-id="empty"]');await click('.create-button');await until("!!document.querySelector('.editor-root')",30000);await wait(300)
    if(await evaluate("[...document.querySelectorAll('button')].some(el=>el.textContent==='Skip for now')")){await clickText('button','Skip for now');await until("!document.querySelector('.onboarding-scrim')")}
    await clickText('.workspace-list button','Script');await until("!!document.querySelector('.script-studio')");await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await clickText('.primary-actions button','New Rhai structure');await until("!!document.querySelector('[data-node-type=\"rhai.FunctionDeclaration\"]')");await click('.authoring-switch button',1)
  })
  const nodeSelector=uuid=>'[data-node-uuid="'+uuid+'"]'
  async function nodeUuid(kind){return await evaluate(`document.querySelector('[data-node-type="rhai.${kind}"]').dataset.nodeUuid`)}
  async function choose(uuid){await clickText('.editing-actions button','Frame all');await click(nodeSelector(uuid));await until("!!document.querySelector('.graph-node.selected')")}
  async function editField(uuid,value){await choose(uuid);await fill('.syntax-fields>label input:not([type="checkbox"])',value)}
  async function add(title,field){await fill('.graph-palette>input',title);const index=await evaluate(`[...document.querySelectorAll('.palette-list button')].findIndex(el=>el.querySelector('strong')?.textContent===${JSON.stringify(title)})`);assert.ok(index>=0,'Missing palette entry '+title);await click('.palette-list button',index);const uuid=await evaluate("document.querySelector('.graph-node.selected').dataset.nodeUuid");if(field!==undefined)await editField(uuid,field);return uuid}
  async function connectWire(from,to,inputName){await clickText('.editing-actions button','Frame all');await click(nodeSelector(from)+' .node-pin.output .pin-dot');const selector=nodeSelector(to)+' .node-pin.input .pin-dot',index=await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(el=>el.closest('.node-pin').querySelector('[data-syntax-default]')?.dataset.syntaxDefault===${JSON.stringify(inputName.replaceAll(' ','_'))}||el.closest('.node-pin').querySelector('span')?.textContent===${JSON.stringify(inputName)})`);assert.ok(index>=0,`Missing input ${inputName}`);await click(selector,index);await until("!document.querySelector('.graph-canvas.connecting')")}
  let generated='',visualAssetPath=''
  await check('Assemble the input-triggered marker game from typed palette nodes, fields and pin connections',async()=>{
    const fn=await nodeUuid('FunctionDeclaration'),body=await nodeUuid('Block');await editField(fn,'update')
    const parameter=await add('Parameter','dt');await choose(fn);const list=await evaluate("[...document.querySelectorAll('.syntax-child-list>button')].findIndex(el=>el.parentElement.querySelector('strong')?.textContent.includes('parameters'))");assert.ok(list>=0);await click('.syntax-child-list>button',list);await connectWire(parameter,fn,'parameters 0')
    const conditional=await add('If'),consequent=await add('Block'),statement=await add('Expression Statement')
    await fill('.graph-palette>input','input_pressed');const inputTitle=await evaluate("[...document.querySelectorAll('.palette-list button strong')].map(el=>el.textContent).find(text=>text.startsWith('input_pressed('))");assert.ok(inputTitle);const pressed=await add(inputTitle),action=await add('Literal','"Jump"')
    const position=await add('set_position(float, float)'),x=await add('Literal','2.0')
    await connectWire(action,pressed,'arguments 0');await connectWire(pressed,conditional,'condition');await connectWire(x,position,'arguments 0');await connectWire(position,statement,'expression');await connectWire(statement,consequent,'body 0');await connectWire(consequent,conditional,'consequent');await connectWire(conditional,body,'body 0')
    await clickText('.primary-actions button','Save');await until("!document.querySelector('.graph-save-error')&&[...document.querySelectorAll('.primary-actions button')].some(el=>el.textContent.includes('Save')&&el.disabled)")
    visualAssetPath=await evaluate("document.querySelector('.asset-list button.active small').textContent");await capture('assembled-graph')
    await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')");generated=await evaluate("document.querySelector('.editor-shell textarea').value")
    assert.match(generated,/fn update\(dt\)/);assert.match(generated,/input_pressed\("Jump"\)/);assert.match(generated,/set_position\(2\.0,\s*0\.0\)/);await capture('generated-code')
  })
  await writeFile(join(evidence,'v26.12-visual-game-program.json'),JSON.stringify({generated,visualAssetPath,authoring:'Every game node was added through the palette; values through typed fields; children through pin clicks. No source-to-graph import or project state injection.'},null,2)+'\n')
  await check('Create a marker entity and attach the manually authored visual asset through Script2D',async()=>{
    await click('.workspace-list button[aria-label^="Design"]');await until("!!document.querySelector('.toolbar .create-object')")
    await click('.toolbar .create-object');await until("!!document.querySelector('.authoring-palette')");await fill('.authoring-palette .palette-search input','Rectangle');await clickText('.authoring-palette .type-card','Rectangle');await click('.authoring-palette footer .primary');await until("!!document.querySelector('.inspector-header h3')")
    await fill(positionSelector,'0',0);await fill(positionSelector,'0',1)
    const bodyType='.config-panel select:has(option[value="Kinematic"])';await evaluate(`document.querySelector(${JSON.stringify(bodyType)}).focus()`);await press('Home');await press('ArrowDown');await press('Enter');await press('Tab');assert.equal(await evaluate(`document.querySelector(${JSON.stringify(bodyType)}).value`),'Kinematic')
    await click('.add-component-trigger');await fill('.component-picker>input','Script');await clickText('.component-main','Script');await until("!document.querySelector('.component-picker')")
    const sectionIndex=await evaluate("[...document.querySelectorAll('.inspector-section')].findIndex(el=>el.querySelector('summary')?.textContent.includes('Script'))");assert.ok(sectionIndex>=0);if(!await evaluate(`document.querySelectorAll('.inspector-section')[${sectionIndex}].open`))await click('.inspector-section>summary',sectionIndex)
    const selector='.config-panel select[aria-label="Script asset"]';await until(`!!document.querySelector(${JSON.stringify(selector)})`);const index=await evaluate(`[...document.querySelector(${JSON.stringify(selector)}).options].findIndex(option=>option.textContent.includes('Visual Graph'))`);assert.ok(index>0)
    await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);await press('Home');for(let i=0;i<index;i++)await press('ArrowDown');await press('Enter');await press('Tab');assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).selectedIndex`),index)
    assert.deepEqual(await position('authored'),[0,0]);await capture('attached')
  })
  await check('Play the visual game: Space moves the marker to the same target as the code game',async()=>{
    await click('.actionbar button',0);await until("document.querySelector('.actionbar button')?.classList.contains('active')");await wait(350);assert.deepEqual(await position('playing-before-input'),[0,0]);await click('.actionbar .mode-label');await press('Space',0,180)
    await until(`Number(document.querySelector(${JSON.stringify(positionSelector)}).value)===2`);assert.deepEqual(await position('playing-after-space'),[2,0]);assert.equal(await evaluate("!!document.querySelector('.script-error')"),false);await capture('moved')
    await click('.actionbar button',3);await until("document.querySelectorAll('.actionbar button')[3].disabled");assert.deepEqual(await position('stopped-restored'),[0,0]);await capture('restored')
  })
  await check('Save Project downloads the actual authored visual game and its linked assets',async()=>{
    assert.equal(await evaluate("typeof window.showSaveFilePicker"),'undefined');const downloads=join(profile,'downloads');await mkdir(downloads,{recursive:true});await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads})
    await clickText('.menu-container>.menu-item>button','File');await clickText('.dropdown button','Save Project')
    let downloaded;const deadline=Date.now()+20000;while(Date.now()<deadline&&!downloaded){try{const candidate=await readFile(join(downloads,'project.nova'));JSON.parse(candidate.toString());downloaded=candidate}catch{}if(!downloaded)await wait(100)}
    assert.ok(downloaded,'Project download must complete');const artifact='v26.12-visual-game.nova';await writeFile(join(evidence,artifact),downloaded)
    const document=JSON.parse(downloaded.toString()),asset=document.assets.find(item=>item.assetType==='visualScript'&&item.path===visualAssetPath);assert.ok(asset?.source?.startsWith('data:'))
    const graph=JSON.parse(decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1)));assert.equal(graph.format,'nova-graph');assert.ok(graph.language);assert.ok(graph.nodes.some(node=>node.type==='rhai.Literal'&&node.config.fields.raw==='2.0'))
    observations.push({label:'downloaded-project',artifact,bytes:downloaded.length,sha256:createHash('sha256').update(downloaded).digest('hex')});await until("!document.querySelector('.top-bar .dirty-pill')")
  })
  await check('Reopen the downloaded .nova through Open Project and play its preserved visual graph',async()=>{
    await client.send('Page.reload',{ignoreCache:true});await until("!!document.querySelector('.project-manager')",30000);let chooser;client.on('Page.fileChooserOpened',event=>{chooser=event});await client.send('Page.setInterceptFileChooserDialog',{enabled:true});await clickText('.project-manager .quick-actions button','Open Project')
    const deadline=Date.now()+5000;while(!chooser&&Date.now()<deadline)await wait(50);assert.ok(chooser?.backendNodeId);await client.send('DOM.setFileInputFiles',{files:[join(evidence,'v26.12-visual-game.nova')],backendNodeId:chooser.backendNodeId})
    await until("!!document.querySelector('.upgrade-dialog') || (!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager'))",30000)
    if(await evaluate("!!document.querySelector('.upgrade-dialog')")){assert.equal(await evaluate("!!document.querySelector('.upgrade-dialog .lock-warning')"),false);await clickText('.upgrade-dialog footer button','Open Project')}
    await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000);await click('.workspace-list button[aria-label^="Design"]');await clickText('.entity-list .entity-item .name','Rectangle');assert.deepEqual(await position('reopened-before-play'),[0,0])
    assert.equal(await evaluate("document.querySelector('.config-panel select:has(option[value=\"Kinematic\"])').value"),'Kinematic');assert.ok(await evaluate("document.querySelector('.config-panel select[aria-label=\"Script asset\"]').selectedOptions[0].textContent.includes('Visual Graph')"))
    await click('.actionbar button',0);await click('.actionbar .mode-label');await wait(250);assert.deepEqual(await position('reopened-playing-before-input'),[0,0]);await press('Space',0,180);await until(`Number(document.querySelector(${JSON.stringify(positionSelector)}).value)===2`);assert.deepEqual(await position('reopened-playing-after-space'),[2,0]);assert.equal(await evaluate("!!document.querySelector('.script-error')"),false);await capture('reopened-moved')
    await click('.actionbar button',3);await until("document.querySelectorAll('.actionbar button')[3].disabled");assert.deepEqual(await position('reopened-stopped-restored'),[0,0])
  })
  assert.deepEqual(errors,[])
}catch(error){failure=error;process.exitCode=1;console.error(error);if(client)try{await capture('failure');console.error(await evaluate("JSON.stringify({source:document.querySelector('.editor-shell textarea')?.value,saveError:document.querySelector('.source-save-error,.graph-save-error')?.textContent,text:document.body.innerText.slice(-5000)})"))}catch{}}
finally{
  await mkdir(evidence,{recursive:true});await writeFile(join(evidence,'v26.12-visual-game.json'),JSON.stringify({status:failure?'failed':'passed',generatedAt:new Date().toISOString(),checks,observations,layout,captures,consoleErrors:errors,error:failure?.stack,scope:'Actual headless Edge blank visual game authoring through palette/field/pin controls, entity and Script2D attachment, Play, Space input, live Inspector coordinates, Stop restoration, real fallback .nova download and file-input reopen/replay. FileSystemAccessLocal is disabled by browser flag; OPFS remains available. Native OS picker automation is separate. No application or VM state injection.'},null,2)+'\n')
  try{await client?.send('Browser.close')}catch{}if(edge&&!edge.killed)edge.kill();if(server)await new Promise(resolve=>server.httpServer.close(resolve));if(profile){await wait(200);await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
}
