/** 功能回归脚本：执行 verify-v26.16-interface-user.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import { resolve, join } from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolveMilestoneAuditContext, runMilestoneBrowserAudit } from './lib/milestoneAuditContext.mjs'
const auditContext=resolveMilestoneAuditContext(import.meta.url,{release:'26.16',reportName:'interface-user'})
const { wait } = await import(pathToFileURL(join(auditContext.repository,'scripts/lib/browserUserAudit.mjs')).href)
await runMilestoneBrowserAudit(auditContext,{name:'interface-user',width:1600,height:1000},/** 结构说明（自动提取）：runMilestoneBrowserAudit 回调；输入 audit；直接调用 until、audit.select、audit.fill、click、wait 等；等待异步结果。 */ async audit=>{
 const {evaluate,until,click,clickText,client,check,observations}=audit
 await until("document.querySelectorAll('[data-template-id]').length===40")
 await audit.select('.manager-header select','en')
 await audit.fill('.creation-card header input','Interface 26.16 User Audit')
 await click('[data-template-id="ui-showcase"]');await click('.create-button')
 await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000)
 await wait(350)
 if(await evaluate("!!document.querySelector('.onboarding-scrim')")){await clickText('button','Skip for now');await until("!document.querySelector('.onboarding-scrim')")}
 await clickText('.workspace-list button','Debug');await until("!!document.querySelector('.game-view .canvas-container')")
 await clickText('.panel-tabs .panel-tab','Console');await until("!!document.querySelector('.console-panel')")
 await check('Select UI starter through launcher, Play, actual game controls and clean runtime Console',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 click、until、wait、assert.deepEqual、evaluate 等；等待异步结果。 */ async()=>{
  await click('.actionbar button',0);await until("document.querySelector('.actionbar button').classList.contains('active')",15000);await wait(1000)
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.console-panel .log-entry.error,.console-panel .log-entry.fatal')].map(e=>e.textContent)"),[])
  observations.push({controls:await evaluate("[...document.querySelectorAll('.game-view [data-ui-uuid]')].map(e=>({role:e.getAttribute('role'),label:e.getAttribute('aria-label'),uuid:e.dataset.uiUuid,rect:JSON.stringify(e.getBoundingClientRect())}))")})
  await audit.capture('started-menu')
 })
 const field='.game-view [data-ui-uuid][role="textbox"]',box='.game-view [data-ui-uuid][role="checkbox"]'
 await check('Actual CDP composition stays native until commit, retains Unicode and does not close on composing Enter',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 click、until、assert.equal、evaluate、client.send 等；等待异步结果。 */ async()=>{
  await click(field);await until("!!document.querySelector('.native-ui-input')&&document.activeElement===document.querySelector('.native-ui-input')")
  assert.equal(await evaluate("document.querySelector('.native-ui-input').placeholder"),'Player name')
  await client.send('Input.imeSetComposition',{text:'中文',selectionStart:2,selectionEnd:2})
  await wait(160);assert.equal(await evaluate("document.querySelector('.native-ui-input').value"),'中文')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(field)}).getAttribute('aria-valuetext')`),null,'Uncommitted composition must not change the scene value')
  await client.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:229});await client.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:229})
  assert.ok(await evaluate("!!document.querySelector('.native-ui-input')"))
  await client.send('Input.insertText',{text:'中文'});await until(`document.querySelector(${JSON.stringify(field)}).getAttribute('aria-valuetext')==='中文'`)
  await client.send('Input.insertText',{text:'🙂'});await until(`document.querySelector(${JSON.stringify(field)}).getAttribute('aria-valuetext')==='中文🙂'`)
  await audit.capture('ime-committed')
 })
 await check('Native selection edits preserve characters; Tab moves to game button once',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 audit.press、client.send、until、assert.equal、evaluate；等待异步结果。 */ async()=>{
  await audit.press('a',2);await client.send('Input.insertText',{text:'a🙂b'});await audit.press('ArrowLeft');await audit.press('Backspace')
  await until("document.querySelector('.native-ui-input').value==='ab'")
  await audit.press('Tab');await until("!document.querySelector('.native-ui-input')")
  assert.equal(await evaluate("document.activeElement.getAttribute('role')"),'button')
 })
 await check('Touch release toggles one checkbox; pointer cancellation leaves it unchanged',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 evaluate、JSON.stringify、audit.point、client.send、wait 等；等待异步结果。 */ async()=>{
  const before=await evaluate(`document.querySelector(${JSON.stringify(box)}).getAttribute('aria-checked')`),at=await audit.point(box)
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1})
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:at.x,y:at.y,id:1}]});await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});await wait(150)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(box)}).getAttribute('aria-checked')`),before)
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:at.x,y:at.y,id:2}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
  await until(`document.querySelector(${JSON.stringify(box)}).getAttribute('aria-checked')!==${JSON.stringify(before)}`)
  await client.send('Emulation.setTouchEmulationEnabled',{enabled:false})
 })
 await check('Editor Pause keyboard activation cannot toggle the internally focused game control',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 click、evaluate、JSON.stringify、assert.equal、audit.press 等；等待异步结果。 */ async()=>{
  await click(box);const before=await evaluate(`document.querySelector(${JSON.stringify(box)}).getAttribute('aria-checked')`)
  await click('.actionbar button',1);assert.equal(await evaluate("document.activeElement.closest('.actionbar')!==null"),true)
  await audit.press('Enter');await wait(250)
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(box)}).getAttribute('aria-checked')`),before)
  await audit.capture('editor-focus-isolation')
 })
 await check('Resized game viewport keeps native text input aligned with the actual control rectangle',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 audit.viewport、click、until、evaluate、JSON.stringify 等；包含循环处理；等待异步结果。 */ async()=>{
  for(const [width,height]of [[900,850],[720,900]]){await audit.viewport(width,height);await click(field);await until("!!document.querySelector('.native-ui-input')");const bounds=await evaluate(`(()=>{const a=document.querySelector(${JSON.stringify(field)}).getBoundingClientRect(),b=document.querySelector('.native-ui-input').getBoundingClientRect();return{control:a.toJSON(),input:b.toJSON(),page:innerWidth}})()`);assert.ok(Math.abs(bounds.control.x-bounds.input.x)<2&&Math.abs(bounds.control.y-bounds.input.y)<2&&Math.abs(bounds.control.width-bounds.input.width)<2,JSON.stringify(bounds));assert.ok(bounds.input.x>=0&&bounds.input.right<=width+1);observations.push({name:'resized-native-input',width,height,bounds});await audit.press('Escape')}
  await audit.capture('resized-native-input');await audit.viewport(1600,1000)
 })
 await check('Stop restores the authored menu and disposes the native input overlay',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 click、until、assert.deepEqual、evaluate；等待异步结果。 */ async()=>{
  await click(field);await until("!!document.querySelector('.native-ui-input')");await click('.actionbar button',3)
  await until("!document.querySelector('.native-ui-input')")
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.console-panel .log-entry.error,.console-panel .log-entry.fatal')].map(e=>e.textContent)"),[])
 })
 await clickText('.workspace-list button','UI');await until("!!document.querySelector('.presentation-panel')")
 const centeredFill=/** 结构说明（自动提取）：centeredFill；输入 selector、value；直接调用 evaluate、JSON.stringify、wait、audit.fill；等待异步结果。 */ async(selector,value)=>{await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center',behavior:'instant'})`);await wait(80);await audit.fill(selector,value)}
 await check('Actual theme edit refuses tab departure on Cancel, then saves before switching',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 evaluate、assert.ok、audit.select、until、centeredFill 等；等待异步结果。 */ async()=>{
  const reference=await evaluate("[...document.querySelector('.theme-editor select').options].find(option=>option.value)?.value");assert.ok(reference);await audit.select('.theme-editor select',reference)
  await until(`!!document.querySelector('.theme-editor input[maxlength="120"]')`)
  await centeredFill('.theme-editor input[maxlength="120"]','Saved Interface Theme')
  await clickText('.presentation-header nav button','Localization');await until("!!document.querySelector('.confirm-card')")
  await click('.confirm-actions .secondary');await until("document.querySelector('.confirm-card')?.textContent.includes('Discard the current')")
  await click('.confirm-actions .secondary');await until("!document.querySelector('.confirm-card')")
  assert.equal(await evaluate(`document.querySelector('.theme-editor input[maxlength="120"]').value`),'Saved Interface Theme')
  await clickText('.presentation-header nav button','Localization');await until("!!document.querySelector('.confirm-card')");await click('.confirm-actions .primary');await until("!!document.querySelector('.localization-workspace')&&!document.querySelector('.confirm-card')")
 })
 await check('Localize the actual menu title, retain draft on canceled switch and refuse duplicate locale creation',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 evaluate、audit.select、assert.ok、centeredFill、clickText 等；等待异步结果。 */ async()=>{
  const reference=await evaluate("[...document.querySelector('.table-editor>header select').options].find(option=>option.value)?.value");await audit.select('.table-editor>header select',reference)
  const index=await evaluate("[...document.querySelectorAll('.locale-rows article')].findIndex(e=>e.querySelector('code').textContent==='menu.title')");assert.ok(index>=0)
  const selector=`.locale-rows article:nth-child(${index+1}) textarea`;await centeredFill(selector,'Interface Saved 中文🙂')
  await clickText('.presentation-header nav button','Responsive UI');await until("!!document.querySelector('.confirm-card')");await click('.confirm-actions .secondary');await until("document.querySelector('.confirm-card')?.textContent.includes('Discard the current')");await click('.confirm-actions .secondary');await until("!document.querySelector('.confirm-card')")
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),'Interface Saved 中文🙂')
  await clickText('.table-editor>header button','Save table')
  await centeredFill('.create-locale input','en');await click('.create-locale button');await until("document.querySelector('.interface-draft-error')?.textContent.includes('already owns')")
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),'Interface Saved 中文🙂');await audit.capture('saved-localization')
 })
 const artifact=join(audit.evidence,'v26.16-interface-saved.nova')
 await check('Save Project delivers actual edited theme and localization assets',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 join、mkdir、client.send、click、clickText 等；写入 bytes；包含循环处理；等待异步结果。 */ async()=>{
  const folder=join(audit.profile,'downloads');await mkdir(folder,{recursive:true});await client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true})
  await click('.menu-item>button',0);await clickText('.menu-item .dropdown button','Save Project')
  let bytes;const end=Date.now()+20000;while(!bytes&&Date.now()<end){try{bytes=await readFile(join(folder,'project.nova'));JSON.parse(bytes.toString())}catch{bytes=null;await wait(80)}}assert.ok(bytes);await writeFile(artifact,bytes)
  const project=JSON.parse(bytes.toString()),decode=/** 结构说明（自动提取）：decode；输入 asset；直接调用 asset.source.startsWith、includes、asset.source.slice、asset.source.indexOf、toString 等；返回表达式求值结果。 */ asset=>!asset.source.startsWith('data:')?asset.source:asset.source.slice(0,asset.source.indexOf(',')).includes(';base64')?Buffer.from(asset.source.slice(asset.source.indexOf(',')+1),'base64').toString():decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1))
  assert.ok(project.assets.some(/* 先计算 asset.assetType==='uiTheme'；仅当其为真值时求右侧 JSON.parse(decode(asset)).name==='Saved Interface Theme'，返回短路求值结果。 */ asset=>asset.assetType==='uiTheme'&&JSON.parse(decode(asset)).name==='Saved Interface Theme'))
  assert.ok(project.assets.some(/* 先计算 asset.assetType==='localization'；仅当其为真值时求右侧 JSON.parse(decode(asset)).entries['menu.title']==='Interface Saved 中文🙂'，返回短路求值结果。 */ asset=>asset.assetType==='localization'&&JSON.parse(decode(asset)).entries['menu.title']==='Interface Saved 中文🙂'))
  observations.push({artifact,bytes:bytes.length,scope:'Actual downloaded project; no application-state injection'})
 })
 await check('Reopen downloaded project through real picker and Play the saved localized menu',/** 结构说明（自动提取）：check 回调；无显式参数；直接调用 client.send、until、client.on、clickText、Date.now 等；包含循环处理；等待异步结果。 */ async()=>{
  await client.send('Page.reload');await until("!!document.querySelector('.project-manager')",30000)
  let chooser;const off=client.on('Page.fileChooserOpened',/** 保存文件选择器打开事件。 */ event=>chooser=event);await client.send('Page.setInterceptFileChooserDialog',{enabled:true});await clickText('.quick-actions button','Open Project');const end=Date.now()+10000;while(!chooser&&Date.now()<end)await wait(50);assert.ok(chooser);await client.send('DOM.setFileInputFiles',{files:[artifact],backendNodeId:chooser.backendNodeId});off()
  await until("!!document.querySelector('.upgrade-dialog')",30000);await click('.upgrade-dialog footer button.primary');await until("!!document.querySelector('.editor-root')&&!document.querySelector('.project-manager')",30000)
  await clickText('.workspace-list button','Debug');await until("!!document.querySelector('.game-view')");await click('.actionbar button',0)
  await until(`!!document.querySelector('.game-view [data-ui-uuid][aria-label="Interface Saved 中文🙂"]')`)
  await audit.capture('reopened-localized-menu');await click('.actionbar button',3)
 })

})
