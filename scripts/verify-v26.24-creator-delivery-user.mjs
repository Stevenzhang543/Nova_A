/** 本版三种创作方式的交付审计：实际编辑速度、撤销重做、保存重开、下载并运行导出的游戏。 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {fork} from 'node:child_process'
import {fileURLToPath} from 'node:url'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
import {exportDeliveryUser20} from './lib/deliveryExportAudit20.mjs'
const onlyMode=process.argv.find(/** 可选单模式仅用于定位失败，报告名称与完整门禁分开。 */ argument=>argument.startsWith('--mode='))?.slice(7)
assert.ok(onlyMode===undefined||['code','blocks','mixed'].includes(onlyMode),'Unknown creator mode')
/** 根据实际渲染截图定位玩家与目标，并通过真实方向键到达第二个检查点。 */
async function collectVisibleCheckpoint(a){
 const reached="[...document.querySelectorAll('[data-game-ui-control]')].some(e=>e.getAttribute('aria-label')?.includes('Checkpoint 2/6'))",steps=[];
 for(let step=0;step<80;step++){
  if(await a.evaluate(reached)){a.observations.push({name:'screenshot-guided-real-key-input',steps});return}
  const clip=await a.evaluate("(()=>{const r=document.querySelector('.render-canvas').getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height,scale:1}})()"),shot=await a.client.send('Page.captureScreenshot',{format:'png',clip,captureBeyondViewport:false});
  const points=await a.evaluate("(async()=>{const b=Uint8Array.from(atob("+JSON.stringify(shot.data)+"),c=>c.charCodeAt(0)),im=await createImageBitmap(new Blob([b],{type:'image/png'})),c=new OffscreenCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data,p={player:{x:0,y:0,n:0},target:{x:0,y:0,n:0}};for(let y=0;y<c.height;y+=2)for(let x=0;x<c.width;x+=2){const i=(y*c.width+x)*4,r=d[i],g=d[i+1],b=d[i+2];let q;if(Math.abs(r-102)<18&&Math.abs(g-178)<18&&Math.abs(b-255)<18)q=p.player;else if(Math.abs(r-120)<18&&Math.abs(g-221)<18&&Math.abs(b-187)<18)q=p.target;if(q){q.x+=x;q.y+=y;q.n++}}im.close();for(const q of Object.values(p)){q.x/=q.n;q.y/=q.n}return p})()");
  assert.ok(points.player.n>8&&points.target.n>8,'Both actual rendered game markers must be visible: '+JSON.stringify(points));const dx=points.target.x-points.player.x,dy=points.target.y-points.player.y,key=Math.abs(dx)>Math.abs(dy)?(dx>0?'d':'a'):(dy>0?'s':'w');steps.push({step,...points,key});await a.press(key,0,100);
 }
 throw Error('Real screenshot-guided input did not reach the merged checkpoint');
}
await withBrowserAudit({release:'26.24',name:'creator-delivery-user'+(onlyMode?'-'+onlyMode:''),width:1920,height:1080},/** 三份已有同款参考游戏分别执行代码、图和混合编辑，不注入应用状态。 */ async a=>{
 const user=worldUserControls17(a),editorUrl=await a.evaluate("location.href")
 /** 通过实际文本输入替换脚本，失焦沿用编辑器正常诊断流程。 */
 async function enterSource(source){await a.evaluate("(()=>{const e=document.querySelector('.editor-shell textarea');e.focus();e.select()})()");await a.client.send('Input.insertText',{text:source});await a.evaluate("document.querySelector('.editor-shell textarea').blur()");await wait(200)}
 /** 切换至代码模式并打开该游戏真实绑定的控制脚本。 */
 async function codeMode(){await user.workspace('Script');await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')");await a.clickText('.script-list button','CheckpointGame.rhai');await wait(200)}
 /** 等待结构转换与首次布局完成。 */
 async function graphMode(){await a.click('.logic-mode button',1);await a.until("!!document.querySelector('.graph-editor')");await a.until("!document.querySelector('.graph-editor[data-initial-layout=running]')");await wait(300)}
 /** 逐项查看可见的字面量搜索结果，仅通过字段输入修改匹配的速度值。 */
 async function editGraphSpeed(count){
  await graphMode();if(await a.evaluate("!!document.querySelector('.open-details')"))await a.click('.open-details')
  await a.fill('.graph-symbol-search input','Literal');await a.until("document.querySelectorAll('.graph-symbol-search button').length>0")
  const total=await a.evaluate("document.querySelectorAll('.graph-symbol-search button').length");let changed=0
  for(let i=0;i<total&&changed<count;i++){
   await a.click('.graph-symbol-search button',i);await a.until("!!document.querySelector('.syntax-fields>label>input:not([type])')")
   const value=await a.evaluate("document.querySelector('.syntax-fields>label>input:not([type])').value")
   if(value!=='6.0')continue
   await a.fill('.syntax-fields>label>input:not([type])','9.0');await a.evaluate("document.querySelector('.graph-editor').focus()");await a.press('z',2);await wait(150)
   assert.equal(await a.evaluate("document.querySelector('.syntax-fields>label>input:not([type])').value"),'6.0')
   await a.press('y',2);await wait(150);assert.equal(await a.evaluate("document.querySelector('.syntax-fields>label>input:not([type])').value"),'9.0');changed++
  }
  assert.equal(changed,count,'All requested movement literals must be changed through visual controls')
  await a.clickText('.primary-actions button','Save asset',true);await a.until("!document.querySelector('.graph-save-error')")
  await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')")
 }
 for(const mode of (onlyMode?[onlyMode]:['code','blocks','mixed'])){
  await user.open(resolve('reference-projects/projects/creator-v2624-'+mode+'-game/project.nova'));await codeMode()
  await a.check(mode+' edits both movement speeds, then survives mode switching and save/reopen',/** 每种模式均修改相同的两个数值，保存文件是后续验证的唯一输入。 */ async()=>{
   const original=await a.evaluate("document.querySelector('.editor-shell textarea').value")
   assert.equal((original.match(/\* 6\.0 \*/g)||[]).length,2)
   if(mode==='code'){
    await enterSource(original.replaceAll('* 6.0 *','* 9.0 *'));await a.evaluate("document.querySelector('.editor-shell textarea').focus()");await a.press('z',2);await wait(100);assert.equal(await a.evaluate("document.querySelector('.editor-shell textarea').value"),original);await a.press('y',2);await wait(100)
   }else{
    if(mode==='mixed')await enterSource(original.replace('* 6.0 *','* 9.0 *'))
    await editGraphSpeed(mode==='mixed'?1:2)
   }
   await a.press('s',2);await wait(250)
   for(let cycle=0;cycle<2;cycle++){await graphMode();await a.click('.logic-mode button',0);await a.until("!!document.querySelector('.editor-shell textarea')")}
   const authored=await a.evaluate("document.querySelector('.editor-shell textarea').value")
   assert.equal((authored.match(/\b9\.0\b/g)||[]).length,2);assert.equal((authored.match(/\b6\.0\b/g)||[]).length,0)
   const saved=await user.save('creator24-'+mode);await user.open(saved.file);await codeMode();assert.equal(await a.evaluate("document.querySelector('.editor-shell textarea').value"),authored)
   a.observations.push({name:'saved-'+mode,file:saved.file,source:authored})
  })
  await a.check(mode+' downloads its edited Web game and runs real checkpoint and restart input',/** 独立检查下载包字节与保存项目，再只运行下载包中的播放器。 */ async()=>{
   const saved=await user.save('creator24-export-'+mode),exported=await exportDeliveryUser20(a,user,'creator24-'+mode,saved,{downloadZip:true})
   const script=exported.project.assets.find(/** 精确核对游戏控制脚本，而不是仅验证 ZIP 存在。 */ asset=>asset.name==='CheckpointGame.rhai')
   assert.ok(script)
   const packedSource=exported.contents.get(script.path)
   assert.ok(packedSource,'Exported script bytes must exist at the declared asset path')
   const authored=a.observations.find(/** 对照同一创作模式刚刚保存并重开的原稿。 */ observation=>observation.name==='saved-'+mode).source
   assert.equal(packedSource.toString('utf8'),authored,'Packed script is byte-for-byte the saved authored source')
   assert.equal((packedSource.toString('utf8').match(/\b9\.0\b/g)||[]).length,2)
   const server=fork(fileURLToPath(new URL('./lib/worldExportServer17.mjs',import.meta.url)),[exported.output],{stdio:['ignore','ignore','pipe','ipc'],windowsHide:true});let errors='';server.stderr.on('data',/** 收集服务器启动失败原因。 */ data=>errors+=data)
   try{
    const port=await new Promise(/** 等待仅本机临时服务器发布端口，超时明确失败。 */ (done,reject)=>{const timer=setTimeout(/** 服务器未就绪时报告诊断，不放宽游戏启动断言。 */ ()=>reject(Error('Player server timed out '+errors)),15000);server.once('message',/** 收到端口后清除启动超时。 */ message=>{clearTimeout(timer);done(message.port)});server.once('error',reject)})
    await a.client.send('Page.navigate',{url:'http://127.0.0.1:'+port+'/'});await a.until("!!document.querySelector('.player-root .render-canvas')",30000);await a.until("[...document.querySelectorAll('[data-game-ui-control]')].some(e=>e.getAttribute('aria-label')?.includes('Checkpoint 1/6'))",20000)
    await a.click('.overlay-canvas');await collectVisibleCheckpoint(a);await a.capture(mode+'-export-checkpoint');await a.press('r');await a.until("[...document.querySelectorAll('[data-game-ui-control]')].some(e=>e.getAttribute('aria-label')?.includes('Checkpoint 1/6'))",5000)
   }finally{server.disconnect();await new Promise(/** 等待临时服务器退出，避免跨用例遗留进程。 */ done=>server.once('exit',done))}
  })
  // 导出播放器占用当前标签页；下个模式回到实际编辑器地址后再打开项目。
  if(mode!=='mixed'){await a.client.send('Page.navigate',{url:editorUrl});await a.until("!!document.querySelector('.project-manager,.editor-root')")}
 }
})
