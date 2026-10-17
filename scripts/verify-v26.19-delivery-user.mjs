/** 功能回归脚本：执行 verify-v26.19-delivery-user.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {mkdir,readFile,writeFile} from 'node:fs/promises'
import {resolveMilestoneAuditContext,runMilestoneBrowserAudit} from './lib/milestoneAuditContext.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
import {exportDeliveryUser19} from './lib/deliveryExportAudit19.mjs'
import {fork} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {wait} from './lib/browserUserAudit.mjs'
const layout=process.argv.includes('--layout'),name=layout?'delivery-layout':'delivery-user'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.19',reportName:name})
await runMilestoneBrowserAudit(context,{name,height:1000},/** 通过真实编辑器验证语义合并冲突、布局、撤销重做、保存重开和导出后的玩法。 */ async a=>{
 const u=worldUserControls17(a);let saved
 await u.open(join(context.repository,'reference-projects/projects/delivery-v2619-semantic-merge/project.nova'))
 const team=/** 打开管理工作区构建面板的团队协作页，并启用协作流程。 */ async()=>{await u.workspace('Manage');await a.click('.manage-body>nav button',6);await a.until("!!document.querySelector('.build-panel')");await a.click('.build-header nav button',4);await a.until("!!document.querySelector('.team-workflow')");if(!await a.evaluate("document.querySelector('.workflow-toggle input').checked"))await a.click('.workflow-toggle input')}
 await a.check('Make a real local edit and import a conflicting incoming project',/** 制作与本地位置编辑冲突的传入项目，经文件选择器导入并记录冲突预览。 */ async()=>{
  await u.entity('Checkpoint 1');await u.expandInspector();await u.field('[data-property-path="Transform.position"] input',-4)
  const incoming=JSON.parse(await readFile(join(context.repository,'reference-projects/projects/delivery-v2619-semantic-merge/project.nova'),'utf8'));incoming.scenes[0].entities.find(/* 比较 e.name 与 'Checkpoint 1'，返回严格相等的判断结果。 */ e=>e.name==='Checkpoint 1').components.find(/* 比较 c.kind 与 'Transform2D'，返回严格相等的判断结果。 */ c=>c.kind==='Transform2D').data.position.x=-2
  const path=join(a.evidence,'v26.19-incoming-conflict.nova');await writeFile(path,JSON.stringify(incoming));a.observations.push({name:'authored-incoming-conflict-fixture',file:path})
  await team();let chooser;const off=a.client.on('Page.fileChooserOpened',/** 保存文件选择器打开事件，供后续指定实际导入文件。 */ value=>chooser=value);await a.client.send('Page.setInterceptFileChooserDialog',{enabled:true});await u.activate('.incoming-picker button');for(let n=0;n<100&&!chooser;n++)await wait(50);assert.ok(chooser);await a.client.send('DOM.setFileInputFiles',{files:[path],backendNodeId:chooser.backendNodeId});off();await a.until("!!document.querySelector('.merge-conflict19')");console.log(await a.evaluate("JSON.stringify([...document.querySelectorAll('.team-grid,.changes-card,.semantic-merge')].map(e=>({class:e.className,height:e.clientHeight,scroll:e.scrollHeight,style:['height','minHeight','gridTemplateRows','gridAutoRows','overflow','contain'].map(k=>[k,getComputedStyle(e)[k]])})))"));await a.evaluate("document.querySelector('.merge-conflict19').scrollIntoView({block:'center'})");await a.capture('conflict-preview');a.observations.push({name:'actual-conflict-preview',text:await a.evaluate("document.querySelector('.semantic-merge').innerText")})
 })
 if(layout){
  const violations=[]
  await a.check('Team conflict cards remain contained and readable across locales themes scales and widths',/** 遍历语言、缩放、主题和窗口宽度，检查冲突卡片、导航文字以及解决按钮的可见与可点击性。 */ async()=>{
   for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2])for(const theme of [0,1])for(const width of [720,1280,1920]){
    await a.viewport(1440,1000);await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page')");await a.click('.settings-search nav button',0);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.evaluate(`document.querySelector('.settings-page input[type=range][min="1"][max="2"]').focus()`);await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.click('.theme-switch button',theme);await team();await a.viewport(width,1000);await wait(100)
    const state=locale+'-'+String(scale).replace('.','-')+'-'+theme+'-'+width
    const metrics=await a.evaluate(`(()=>{const root=document.querySelector('.team-workflow'),visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;return {navigationOverflow:[...document.querySelectorAll('.build-header nav button')].filter(e=>e.scrollWidth>e.clientWidth+2||e.scrollHeight>e.clientHeight+2).map(e=>e.textContent),width:root.clientWidth,cards:[...root.querySelectorAll('.team-grid>section')].map(e=>({class:e.className,height:e.clientHeight,scroll:e.scrollHeight,width:e.clientWidth,scrollWidth:e.scrollWidth})),clipped:[...root.querySelectorAll('p,strong,label>span,summary')].filter(visible).filter(e=>{const s=getComputedStyle(e);return e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX)||e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY)}).map(e=>e.textContent.trim())}})()`)
    await a.evaluate("document.querySelector('.merge-conflict19').scrollIntoView({block:'center'})");await wait(80)
    const overlap=await a.evaluate(`(()=>{const e=document.querySelector('.conflict-values19 button');e.scrollIntoView({block:'center'});e.focus();const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{reachable:hit===e||e.contains(hit),focused:document.activeElement===e}})()`)
    if(metrics.navigationOverflow.length||metrics.clipped.length||metrics.cards.some(/* 先计算 c.scroll>c.height+3；仅当其为假值时求右侧 c.scrollWidth>c.width+3，返回短路求值结果。 */ c=>c.scroll>c.height+3||c.scrollWidth>c.width+3)||!overlap.reachable||!overlap.focused)violations.push({state,...metrics,overlap})
    a.observations.push({name:state,...metrics,overlap});await a.capture(state);console.log('SURFACE '+state)
   }
   assert.deepEqual(violations,[])
  });return
 }
 await a.check('Choose incoming value, apply, undo and redo through visible editor controls',/** 通过可见按钮选择传入值并应用合并，再验证撤销和重做恢复正确位置。 */ async()=>{
  const count=await a.evaluate("document.querySelectorAll('.merge-conflict19').length");assert.ok(count>0&&count<20)
  for(let i=0;i<count;i++)await u.activate('.merge-conflict19 .conflict-values19>section:nth-child(2) button',i)
  await u.activate('.semantic-merge>.primary');await a.until("!document.querySelector('.semantic-merge')");await u.entity('Checkpoint 1');await u.expandInspector();assert.equal((await u.position())[0],-2)
  await a.evaluate("document.querySelector('.overlay-canvas').focus()");await a.press('z',2);await wait(300);assert.equal((await u.position())[0],-4);await a.press('y',2);await wait(300);assert.equal((await u.position())[0],-2);await a.capture('merge-redone')
 })
 await a.check('Save and reopen the exact merged document',/** 下载实际合并项目并重新打开，验证合并后位置持久化且保存证据内容完整。 */ async()=>{
  const folder=join(a.profile,'delivery-save');await mkdir(folder);await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:folder,eventsEnabled:true});await a.evaluate("document.querySelector('.overlay-canvas').focus()");await a.press('s',2);let bytes;for(let n=0;n<250&&!bytes;n++){try{bytes=await readFile(join(folder,'project.nova'));JSON.parse(bytes)}catch{bytes=null;await wait(80)}}assert.ok(bytes)
  const file=join(a.evidence,'v26.19-merged-authored.nova');await writeFile(file,bytes);a.observations.push({name:'actual-merged-download',file,bytes:bytes.length});saved={file,document:JSON.parse(bytes)};await u.open(file);await u.entity('Checkpoint 1');await u.expandInspector();assert.equal((await u.position())[0],-2);await a.capture('merged-reopened')
 })
 await a.check('Export the merged game and collect the checkpoint at its changed position',/** 导出合并后的游戏并通过键盘收集修改位置的检查点，验证重置后玩法恢复。 */ async()=>{
  const exported=await exportDeliveryUser19(a,u,'merged',saved),server=fork(fileURLToPath(new URL('./lib/worldExportServer17.mjs',import.meta.url)),[exported.output],{stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});let error='';server.stderr.on('data',/** 累积导出服务标准错误，供启动失败诊断使用。 */ data=>error+=data)
  try{const port=await new Promise(/** 等待导出服务返回端口，并设置超时与进程错误处理。 */ (done,reject)=>{const timer=setTimeout(/* 调用 reject(Error('Player server timed out '+error)) 并返回调用结果。 */ ()=>reject(Error('Player server timed out '+error)),15000);server.once('message',/** 收到导出服务端口后清除超时并完成启动等待。 */ value=>{clearTimeout(timer);done(value.port)});server.once('error',reject)});await a.client.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});await a.until("!!document.querySelector('.player-root .render-canvas')",30000);await a.until("[...document.querySelectorAll('[data-game-ui-control]')].some(e=>e.getAttribute('aria-label')?.includes('Checkpoint 1/6'))",20000);await a.click('.overlay-canvas');await a.press('d',0,850);await a.press('w',0,330);await a.until("[...document.querySelectorAll('[data-game-ui-control]')].some(e=>e.getAttribute('aria-label')?.includes('Checkpoint 2/6'))",5000);await a.capture('merged-export-checkpoint-collected');a.observations.push({name:'exported-gameplay-at-edited-position',text:await a.evaluate("[...document.querySelectorAll('[data-game-ui-control]')].map(e=>e.getAttribute('aria-label')).join(' | ')")});await a.press('r');await a.until("[...document.querySelectorAll('[data-game-ui-control]')].some(e=>e.getAttribute('aria-label')?.includes('Checkpoint 1/6'))",5000)}finally{server.disconnect();await new Promise(/* 调用 server.once('exit',done) 并返回调用结果。 */ done=>server.once('exit',done))}
 })

})
