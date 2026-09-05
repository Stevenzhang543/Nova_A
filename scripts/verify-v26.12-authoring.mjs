import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { preview } from 'vite'

const root=dirname(dirname(fileURLToPath(import.meta.url))),evidence=join(root,'release-audits'),checks=[],errors=[],captures=[],layout=[]
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))
let client,edge,server,profile,failure
async function evaluate(expression){const result=await client.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
async function until(expression,timeout=20000){const deadline=Date.now()+timeout;while(Date.now()<deadline){if(await evaluate(expression))return;await wait(100)}throw new Error('Timed out: '+expression)}
async function click(selector,index=0){const point=await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)throw Error('Missing '+${JSON.stringify(selector)});if(el.disabled)throw Error('Disabled '+el.textContent);el.scrollIntoView({block:'nearest',inline:'nearest'});const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,text:el.textContent}})()`);await client.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await client.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await wait(100)}
async function clickText(selector,text){const index=await evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(el=>el.textContent.toLowerCase().includes(${JSON.stringify(text.toLowerCase())}))`);assert.ok(index>=0,`Missing ${selector} text ${text}`);await click(selector,index)}
async function fill(selector,value,index=0){await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)throw Error('Missing input');el.focus();el.select();})()`);await client.send('Input.insertText',{text:value});await evaluate("document.activeElement.blur()");await wait(180)}
async function press(key,modifiers=0){const windowsVirtualKeyCode={Home:36,End:35,ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40,Enter:13,Escape:27}[key];await client.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,modifiers,windowsVirtualKeyCode});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,modifiers,windowsVirtualKeyCode})}
async function selectCodeWord(name,occurrence=0){await click('.editor-shell textarea');await press('Home',2);const index=await evaluate(`(()=>{const value=document.querySelector('.editor-shell textarea').value;let at=-1;for(let i=0;i<=${occurrence};i++)at=value.indexOf(${JSON.stringify(name)},at+1);return at})()`);assert.ok(index>=0);for(let i=0;i<index;i++)await press('ArrowRight');for(let i=0;i<name.length;i++)await press('ArrowRight',8);assert.equal(await evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');return e.value.slice(e.selectionStart,e.selectionEnd)})()"),name)}
async function capture(name){const result=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});const file='v26.12-authoring-'+name+'.png';await writeFile(join(evidence,file),Buffer.from(result.data,'base64'));captures.push(file)}
async function check(name,action){await action();checks.push({name,status:'passed'});console.log('PASS '+name)}
async function freePort(){const s=createServer();await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));const port=s.address().port;await new Promise(resolve=>s.close(resolve));return port}
async function connect(url){const socket=new WebSocket(url),pending=new Map(),listeners=new Map();let id=0;await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.id){const item=pending.get(message.id);if(!item)return;pending.delete(message.id);message.error?item.reject(Error(message.error.message)):item.resolve(message.result)}else for(const handler of listeners.get(message.method)??[])handler(message.params)});return{send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});socket.send(JSON.stringify({id:key,method,params}))})},on(method,handler){listeners.set(method,[...(listeners.get(method)??[]),handler])}}}

try{
  await mkdir(evidence,{recursive:true});profile=await mkdtemp(join(tmpdir(),'nova-v2612-authoring-'))
  const port=await freePort(),debug=await freePort();server=await preview({root,logLevel:'silent',preview:{host:'127.0.0.1',port,strictPort:true}})
  let executable='';for(const file of ['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe'])try{await readFile(file);executable=file;break}catch{}
  if(!executable)throw Error('Microsoft Edge is unavailable')
  edge=spawn(executable,['--headless=new','--no-first-run','--disable-extensions','--use-angle=swiftshader',`--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,`http://127.0.0.1:${port}/`],{stdio:'ignore',windowsHide:true})
  let target;const deadline=Date.now()+20000;while(Date.now()<deadline&&!target){try{target=(await fetch(`http://127.0.0.1:${debug}/json/list`).then(r=>r.json())).find(item=>item.type==='page')}catch{}if(!target)await wait(100)}
  if(!target)throw Error('Edge DevTools did not start')
  client=await connect(target.webSocketDebuggerUrl);client.on('Runtime.exceptionThrown',event=>errors.push(event.exceptionDetails?.exception?.description??event.exceptionDetails?.text));await client.send('Runtime.enable');await client.send('Page.enable')
  await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
  await until("!!document.querySelector('.project-manager')")
  await check('Create a disposable blank project and open its source editor',async()=>{
    await fill('.creation-card header input','26.12 Authoring Audit');await click('[data-template-id="empty"]');await click('.create-button');await until("!!document.querySelector('.editor-root')",30000);await wait(300)
    if(await evaluate("[...document.querySelectorAll('button')].some(el=>el.textContent==='Skip for now')")){await clickText('button','Skip for now');await until("!document.querySelector('.onboarding-scrim')")}
    await clickText('.workspace-list button','Script');await until("!!document.querySelector('.script-studio')");await clickText('.studio-toolbar button','New Script');await until("!!document.querySelector('.editor-shell textarea')")
  })
  const source='// Unicode café 中文 and a preserved comment.\nfn twice(value) { return value * 2; }\nfn start() { let values = [1, 2]; log_info("Result: " + twice(values[1])); }\n'
  await check('Edit Rhai and convert functions, calls, arrays and returns to actual typed nodes',async()=>{
    await fill('.editor-shell textarea',source);await click('.logic-mode button',1);await until("document.querySelectorAll('[data-node-type^=\"rhai.\"]').length>10")
    for(const kind of ['FunctionDeclaration','Call','Array','Return'])assert.ok(await evaluate(`!!document.querySelector('[data-node-type="rhai.${kind}"]')`),kind)
    assert.equal(await evaluate("!!document.querySelector('.variables')"),false)
    await capture('typed-graph-wide')
  })
  await check('Edit a typed literal and save audited generated Rhai back into the code editor',async()=>{
    await click('.graph-conversion summary');await click('.graph-conversion .conversion-panel summary')
    const literalButton=await evaluate("[...document.querySelectorAll('.graph-conversion .conversion-actions button')].findIndex(button=>button.textContent.includes('Select graph node')&&button.closest('article').querySelector('strong')?.textContent.startsWith('Literal')&&button.closest('article').querySelector('pre')?.textContent==='2')")
    assert.ok(literalButton>=0,'The source-mapped literal must have a graph action');await click('.graph-conversion .conversion-actions button',literalButton);await until("!!document.querySelector('.syntax-fields input')");assert.equal(await evaluate("document.querySelector('.syntax-fields input').value"),'2')
    await fill('.syntax-fields input','3');await clickText('.primary-actions button','Save');await until("!document.querySelector('.graph-save-error') && [...document.querySelectorAll('.primary-actions button')].some(button=>button.textContent.includes('Save')&&button.disabled)")
    await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')")
    const generated=await evaluate("document.querySelector('.editor-shell textarea').value");assert.match(generated,/value\s*\*\s*\(?3\)?/);assert.ok(generated.includes('café 中文'))
  })
  await check('Repeated mode switching preserves edited source and comments',async()=>{
    const before=await evaluate("document.querySelector('.editor-shell textarea').value")
    for(let i=0;i<2;i++){await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')")}
    assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"),before)
  })
  await check('Malformed source conversion stays in the editor; cancel and repair preserve the draft',async()=>{
    await fill('.editor-shell textarea','fn start( {');await click('.logic-mode button',1);await until("!!document.querySelector('.conversion-review .conversion-state.blocked')");assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"),'fn start( {')
    await clickText('.conversion-review-actions button','Keep editing');assert.equal(await evaluate("!!document.querySelector('.conversion-review')"),false)
    await fill('.editor-shell textarea',source);await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')")
  })
  await check('Invalid visual edits block saving and switching; actual Undo restores a valid graph',async()=>{
    await click('[data-node-uuid="'+await evaluate("[...document.querySelectorAll('[data-node-type=\"rhai.Identifier\"]')].find(el=>el.querySelector('strong')?.textContent.includes('log_info')).dataset.nodeUuid")+'"]');await until("!!document.querySelector('.syntax-fields input')");await fill('.syntax-fields input','broken name');await clickText('.primary-actions button','Save');await until("!!document.querySelector('.graph-save-error')")
    await click('.logic-mode button',0);await until("!!document.querySelector('.conversion-review .conversion-state.blocked')");assert.ok(await evaluate("!!document.querySelector('.graph-editor')"));await clickText('.conversion-review-actions button','Keep editing')
    await click('.primary-actions button[title="Undo"]');await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')");assert.ok(!(await evaluate("document.querySelector('.editor-shell textarea').value")).includes('broken name'))
  })
  await check('Coverage buttons select exact source and the mapped graph node',async()=>{
    await clickText('.inspector-tabs button','Code ↔ graph coverage');await click('.conversion-panel summary');await until("!!document.querySelector('.conversion-region[data-conversion-region]')")
    const expected=await evaluate("document.querySelector('.conversion-region[data-conversion-region] pre').textContent")
    await clickText('.conversion-region[data-conversion-region] .conversion-actions button','Select code');assert.equal(await evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');return e.value.slice(e.selectionStart,e.selectionEnd)})()"),expected)
    await clickText('.conversion-region[data-conversion-region] .conversion-actions button','Select graph node');await until("!!document.querySelector('.graph-node.selected')")
  })
  await check('A numeric literal beyond the VM integer range cannot replace the saved graph',async()=>{
    await click('[data-node-type="rhai.Literal"]');await until("!!document.querySelector('.syntax-fields input')");await fill('.syntax-fields input','0x'+'F'.repeat(80))
    await clickText('.primary-actions button','Save');await until("!!document.querySelector('.graph-save-error')");assert.ok(await evaluate("[...document.querySelectorAll('.primary-actions button')].some(button=>button.textContent.includes('Save')&&!button.disabled)"))
    await click('.primary-actions button[title="Undo"]');await clickText('.primary-actions button','Save');await until("!document.querySelector('.graph-save-error')")
  })
  await check('Ordered child controls add, reorder and remove actual ports',async()=>{
    await click('[data-node-type="rhai.Array"]');await until("!!document.querySelector('.syntax-child-list')");const before=await evaluate("document.querySelectorAll('[data-syntax-slot]').length")
    await clickText('.syntax-child-list>button','Add child slot');assert.equal(await evaluate("document.querySelectorAll('[data-syntax-slot]').length"),before+1)
    await click('.syntax-child-list article:last-of-type button',0);await click('.syntax-child-list article:last-of-type button',2);assert.equal(await evaluate("document.querySelectorAll('[data-syntax-slot]').length"),before)
    await clickText('.primary-actions button','Save');await until("!document.querySelector('.graph-save-error')")
  })
  await check('Shared project use dependencies save and convert through the real module resolver',async()=>{
    await click('.logic-mode button',0);await until("!!document.querySelector('.script-studio')");await clickText('.studio-toolbar button','New Script');await fill('.editor-shell textarea','fn shared_value() { 7 }\n');const module=await evaluate("document.querySelector('.project-scripts .script-list button.active small').textContent");await clickText('.studio-toolbar button','Save Script')
    await clickText('.studio-toolbar button','New Script');await fill('.editor-shell textarea',`use "${module}";\nfn start() { log_info(shared_value()); }\n`);await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')");assert.ok((await evaluate("document.querySelector('.editor-shell textarea').value")).includes('use "'+module+'"'))
    await clickText('.inspector-tabs button','Problems');await until("document.querySelector('.editor-status>span:first-child')?.classList.contains('status-ok')")
    assert.ok(!(await evaluate("document.querySelector('.studio-inspector').textContent")).includes('NOVA-SEM-003'))
  })
  await check('Module-aware diagnostics retain unknown-call and missing-import errors, then clear after repair',async()=>{
    const valid=await evaluate("document.querySelector('.editor-shell textarea').value")
    await fill('.editor-shell textarea',valid.replace('log_info(shared_value())','log_info(shared_value()); unknown_typo()'))
    await until("[...document.querySelectorAll('.problem')].some(el=>el.textContent.includes('NOVA-SEM-003')&&el.textContent.includes('unknown_typo'))")
    assert.equal(await evaluate("document.querySelector('.editor-status>span:first-child').classList.contains('status-error')"),true)
    assert.equal(await evaluate("[...document.querySelectorAll('.problem')].some(el=>el.textContent.includes('NOVA-SEM-003')&&el.textContent.includes('shared_value'))"),false)
    await fill('.editor-shell textarea','use "Assets/Scripts/missing-audit-module.rhai";\nfn start() {}\n')
    await until("[...document.querySelectorAll('.problem')].some(el=>el.textContent.includes('NOVA-MODULE-RESOLUTION'))")
    await clickText('.problem','NOVA-MODULE-RESOLUTION');assert.equal(await evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');return e.value.slice(e.selectionStart,e.selectionEnd)})()"),'use "Assets/Scripts/missing-audit-module.rhai";')
    await fill('.editor-shell textarea',valid);await until("document.querySelector('.editor-status>span:first-child')?.classList.contains('status-ok')");await clickText('.studio-toolbar button','Save Script')
  })
  await check('Search and insert the typed set_position float API overload from the real palette',async()=>{
    await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await fill('.graph-palette>input','set_position')
    const index=await evaluate("[...document.querySelectorAll('.palette-list button')].findIndex(button=>button.querySelector('strong')?.textContent.includes('set_position(float, float)'))");assert.ok(index>=0,'Float set_position overload must be discoverable');await click('.palette-list button',index)
    await until("!!document.querySelector('.graph-node.selected')");assert.ok((await evaluate("document.querySelector('.graph-node.selected').textContent")).includes('set_position'))
    assert.equal(await evaluate("document.querySelectorAll('.graph-node.selected .node-pin input').length"),0)
    assert.ok((await evaluate("[...document.querySelectorAll('.graph-node.selected [data-syntax-default]')].map(el=>el.textContent)")).includes('0.0'))
    await click('.primary-actions button[title="Undo"]');await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')")
  })
  for(const [width,height] of [[1440,900],[1024,640]]){
    await client.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await wait(250)
    for(const [mode,index] of [['code',0],['graph',1]]){await click('.logic-mode button',index);await wait(300);layout.push(await evaluate(`(()=>{const el=document.querySelector('.script-workspace');return{mode:${JSON.stringify(mode)},width:${width},height:${height},scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,horizontalOverflow:el.scrollWidth>el.clientWidth+1}})()`));await capture(`${mode}-${width}x${height}`)}
  }
  await client.send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false})
  await check('New Rhai structure creates linked source and saves dirty code before entering Event Sheets',async()=>{
    await clickText('.primary-actions button','New Rhai structure');await until("!!document.querySelector('[data-node-type=\"rhai.FunctionDeclaration\"]')")
    await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')");assert.match(await evaluate("document.querySelector('.editor-shell textarea').value"),/fn start\(\)/)
    await fill('.editor-shell textarea','// Event Sheet source transition\nfn start() { let saved_value = 2; log_info(saved_value); }\n')
    await click('.logic-mode button',2);await until("!!document.querySelector('.event-studio')");await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')")
    assert.ok((await evaluate("document.querySelector('.editor-shell textarea').value")).includes('Event Sheet source transition'))
    await fill('.editor-shell textarea','fn start( {');await click('.logic-mode button',2);await until("!!document.querySelector('.source-save-error')");assert.ok(await evaluate("!!document.querySelector('.script-studio')"))
    await fill('.editor-shell textarea','fn start() { let saved_value = 2; log_info(saved_value); }\n');await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')")
  })
  await check('Dirty graph Event Sheet transitions block invalid edits and preserve validated edits',async()=>{
    await click('[data-node-uuid="'+await evaluate("[...document.querySelectorAll('[data-node-type=\"rhai.Identifier\"]')].find(el=>el.querySelector('strong')?.textContent.includes('log_info')).dataset.nodeUuid")+'"]');await until("!!document.querySelector('.syntax-fields input')");await fill('.syntax-fields input','broken name');await click('.logic-mode button',2)
    await until("!!document.querySelector('.graph-save-error')");assert.ok(await evaluate("!!document.querySelector('.graph-editor')"));assert.equal(await evaluate("!!document.querySelector('.event-studio')"),false)
    await click('.primary-actions button[title="Undo"]');await click('[data-node-type="rhai.Literal"]');await until("!!document.querySelector('.syntax-fields input')");await fill('.syntax-fields input','3')
    await click('.logic-mode button',2);await until("!!document.querySelector('.event-studio')");await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')")
    assert.match(await evaluate("document.querySelector('.editor-shell textarea').value"),/saved_value\s*=\s*3/)
  })
  await check('Legacy source-backed conversion supports cancellation, rejects stale review and continues after renewed review',async()=>{
    await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await click('.primary-actions button',0);await until("!!document.querySelector('[data-node-type=\"event.start\"]')")
    await fill('.graph-palette>input','Execute Rhai Module');await clickText('.palette-list button','Execute Rhai Module');await clickText('.editing-actions button','Frame all');await until("!!document.querySelector('[data-node-type=\"code.module\"] .node-source textarea')")
    await fill('[data-node-type="code.module"] .node-source textarea','fn preserved_helper() { 7 }\n');await clickText('.primary-actions button','Save');await until("!document.querySelector('.graph-save-error')")
    await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')");assert.ok((await evaluate("document.querySelector('.editor-shell textarea').value")).includes('preserved_helper'))
    await click('.logic-mode button',1);await until("!!document.querySelector('.conversion-review .conversion-state.review')");assert.ok(Number(await evaluate("document.querySelector('.conversion-review [data-coverage=\"source-backed\"]').textContent"))>0)
    await clickText('.conversion-review-actions button','Keep editing');assert.equal(await evaluate("!!document.querySelector('.conversion-review')"),false)
    await click('.logic-mode button',1);await until("!!document.querySelector('.conversion-review')");const changed=await evaluate("document.querySelector('.editor-shell textarea').value+'\\n// Changed after conversion review.\\n'");await fill('.editor-shell textarea',changed)
    await clickText('.conversion-review-actions button','Continue with source-backed ranges');assert.ok(await evaluate("!!document.querySelector('.script-studio')&&!!document.querySelector('.conversion-review')"));assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"),changed)
    await clickText('.conversion-review-actions button','Continue with source-backed ranges');await until("!!document.querySelector('.graph-editor')");assert.ok(await evaluate("!!document.querySelector('[data-node-type=\"code.module\"]')"))
  })
  await check('Selected-binding rename preserves shadowed variables, comments and strings; cancellation leaves source unchanged',async()=>{
    await click('.logic-mode button',0);await until("!!document.querySelector('.script-studio')");await clickText('.studio-toolbar button','New Script')
    const before='fn start() {\n  let value = 1;\n  { let value = 2; log_info(value); }\n  log_info(value);\n  log_info("value"); // value stays\n}\n'
    await fill('.editor-shell textarea',before);await selectCodeWord('value');await clickText('.inspector-tabs button','Symbols');await clickText('.pane-heading button','F2');await until("!!document.querySelector('.rename-card input')");await fill('.rename-card input','outer_value');await click('.rename-card button[type="submit"]');await until("!!document.querySelector('.confirm-card')")
    assert.ok((await evaluate("document.querySelector('.confirm-copy').textContent")).includes('selected binding'));await click('.confirm-actions .secondary');await until("!document.querySelector('.confirm-scrim')");assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"),before)
    await selectCodeWord('value');await clickText('.pane-heading button','F2');await fill('.rename-card input','outer_value');await click('.rename-card button[type="submit"]');await until("!!document.querySelector('.confirm-card')");await click('.confirm-actions .primary');await until("!document.querySelector('.confirm-scrim')&&!document.querySelector('.source-save-error')&&document.querySelector('.editor-shell textarea').value.includes('let outer_value')")
    const renamed=await evaluate("document.querySelector('.editor-shell textarea').value");assert.ok(renamed.includes('let outer_value = 1'));assert.ok(renamed.includes('{ let value = 2; log_info(value); }'));assert.ok(renamed.includes('log_info(outer_value)'));assert.ok(renamed.includes('log_info("value"); // value stays'))
    await click('.logic-mode button',1);await until("!!document.querySelector('.graph-editor')");await click('.logic-mode button',0);await until("!!document.querySelector('.editor-shell textarea')");assert.ok((await evaluate("document.querySelector('.editor-shell textarea').value")).includes('log_info(outer_value)'))
  })
  await check('Format preserves multiline string contents and invalid-source refusal keeps the draft visible',async()=>{
    await clickText('.studio-toolbar button','New Script');const literal='`first line\n// this is string content\n  final line`',before='fn start() {\nlet message = '+literal+';\nlog_info(message);\n}\n'
    await fill('.editor-shell textarea',before);await clickText('.studio-toolbar button','Format');assert.ok((await evaluate("document.querySelector('.editor-shell textarea').value")).includes(literal));await clickText('.studio-toolbar button','Save Script');await until("!document.querySelector('.source-save-error')")
    await fill('.editor-shell textarea','fn start( {');await clickText('.studio-toolbar button','Format');await clickText('.inspector-tabs button','Problems');await until("!!document.querySelector('.problem i.error')");assert.equal(await evaluate("document.querySelector('.editor-shell textarea').value"),'fn start( {')
    await fill('.editor-shell textarea',before);await clickText('.studio-toolbar button','Save Script');await until("!document.querySelector('.source-save-error')")
  })
  await check('Inspector tabs keep their full text height in short and narrow workspaces',async()=>{
    for(const [width,height] of [[800,720],[1024,640],[1600,900]]){
      await client.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});await client.send('Emulation.setVisibleSize',{width,height});await wait(500)
      const clipped=await evaluate("[...document.querySelectorAll('.inspector-tabs button')].filter(button=>button.getBoundingClientRect().width>0&&(button.scrollHeight>button.clientHeight+2||button.scrollWidth>button.clientWidth+2)).map(button=>({text:button.textContent,client:[button.clientWidth,button.clientHeight],scroll:[button.scrollWidth,button.scrollHeight]}))")
      assert.deepEqual(clipped,[],`${width}x${height} inspector tab labels`)
    }
    await capture('tab-text-height')
  })
  assert.deepEqual(errors,[])
}catch(error){failure=error;process.exitCode=1;console.error(error);if(client)try{await capture('failure');console.error(await evaluate("JSON.stringify({source:document.querySelector('.editor-shell textarea')?.value,saveError:document.querySelector('.source-save-error,.graph-save-error')?.textContent,text:document.body.innerText.slice(-5000)})"))}catch{}}
finally{
  await mkdir(evidence,{recursive:true});await writeFile(join(evidence,'v26.12-authoring.json'),JSON.stringify({status:failure?'failed':'passed',generatedAt:new Date().toISOString(),checks,layout,captures,consoleErrors:errors,error:failure?.stack,scope:'Actual headless Edge mouse/keyboard authoring in a fresh disposable profile against local dist. Runtime equivalence corpus and exhaustive layout qualification are separate reports.'},null,2)+'\n')
  try{await client?.send('Browser.close')}catch{}if(edge&&!edge.killed)edge.kill();if(server)await new Promise(resolve=>server.httpServer.close(resolve));if(profile){await wait(200);await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
}
