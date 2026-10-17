/** 功能回归脚本：执行 verify-v26.23-shell-user.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {readFile,readdir} from 'node:fs/promises'
import {resolve,join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const version=JSON.parse(await readFile('package.json','utf8')).version, expected=version.replace(/\.0$/,'')
// 仅显式的同版本资格目标可复用旧版场景；版本不同且未指定目标时仍保留开发模式。
const qualificationTarget=process.argv.find(/* 查找显式的发布资格目标参数。 */ value=>value.startsWith('--qualification-release='))?.slice('--qualification-release='.length)
if(qualificationTarget)assert.equal(qualificationTarget,expected,'Shell regression qualification must match the integrated source version')
const registry=join(process.env.CARGO_HOME||join(process.env.USERPROFILE,'.cargo'),'registry/src');let interception
for(const index of await readdir(registry)) {const entries=await readdir(join(registry,index));const opener=entries.find(/* 比较 name 与 'tauri-plugin-opener-2.5.3'，返回严格相等的判断结果。 */ name=>name==='tauri-plugin-opener-2.5.3');if(opener){interception=await readFile(join(registry,index,opener,'src/init-iife.js'),'utf8');break}}
assert.ok(interception,'The installed native opener interceptor is required for this regression.')
await withBrowserAudit({release:'26.23',name:'shell-user',development:expected!=='26.23'&&!qualificationTarget,expectedRelease:expected},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、a.check、u.open、resolve、install 等；包含循环处理；等待异步结果。 */ async a=>{
 const u=worldUserControls17(a)
 await a.check('Launcher opens the complete library only on New and retains cancelled drafts',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 assert.equal、a.evaluate、a.click、a.until、a.fill 等；等待异步结果。 */ async()=>{
  assert.equal(await a.evaluate("document.querySelectorAll('.creation-card').length"),0)
  await a.click('.quick-actions .new-project');await a.until("!!document.querySelector('.creation-card')")
  assert.equal(await a.evaluate("document.querySelectorAll('[data-template-id]').length"),40)
  await a.fill('.creation-card header input','Inventory draft');await a.press('Escape');await a.until("!document.querySelector('.creation-card')")
  assert.equal(await a.evaluate("document.activeElement?.classList.contains('new-project')"),true)
  await a.click('.quick-actions .new-project');await a.until("!!document.querySelector('.creation-card')");assert.equal(await a.evaluate("document.querySelector('.creation-card header input').value"),'Inventory draft');assert.equal(await a.evaluate("getComputedStyle(document.querySelector('.template-grid')).maxHeight"),'none');await a.capture('new-project-library');await a.press('Escape');await a.until("!document.querySelector('.creation-card')")
  await a.click('.more-project-actions summary');assert.equal(await a.evaluate("document.querySelector('.more-project-actions').open"),true)
 })
 const install=/** 结构说明（自动提取）：install；无显式参数；直接调用 a.evaluate；等待异步结果。 */ async()=>{await a.evaluate(interception+';true');await a.evaluate(`(()=>{window.__novaOpenCalls=[];window.__novaOpenDeny=false;window.__TAURI_INTERNALS__={invoke:(command,args)=>{window.__novaOpenCalls.push({command,url:args?.url});return window.__novaOpenDeny&&command==='plugin:opener|open_url'?Promise.reject(new Error('Permission denied by test host')):Promise.resolve(null)}};return true})()`)}
 for(const[label,selector]of[['launcher','.project-manager .identity'],['editor','.top-bar .brand']]){
  if(label==='editor')await u.open(resolve('reference-projects/projects/creator-v2622-code-game/project.nova'));await install()
  await a.check(label+' native brand link invokes once and a denial remains recoverable',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.click、wait、a.evaluate、assert.equal、a.capture 等；包含循环处理；等待异步结果。 */ async()=>{
   await a.click(selector);await wait(250);let calls=await a.evaluate('window.__novaOpenCalls.filter(c=>c.command==="plugin:opener|open_url")');assert.equal(calls.length,1);assert.equal(calls[0].url,'https://whitelists.top/')
   await a.evaluate('window.__novaOpenDeny=true;true');await a.click(selector);await wait(350);assert.equal(await a.evaluate("!!document.querySelector('.fault-overlay')"),false);assert.equal(await a.evaluate('window.__novaOpenCalls.filter(c=>c.command==="plugin:opener|open_url").length'),2);await a.capture(label+'-recoverable-link')
   await a.evaluate('window.__novaOpenDeny=false;true');await a.evaluate('document.querySelector('+JSON.stringify(selector)+').focus()');await a.press('Enter');await wait(250);assert.equal(await a.evaluate('window.__novaOpenCalls.filter(c=>c.command==="plugin:opener|open_url").length'),3)
   const original=await a.evaluate('document.querySelector('+JSON.stringify(selector)+').href')
   for(const denied of ['https://example.com/','https://whitelists.top.evil.invalid/','http://whitelists.top/','javascript:window.__novaUnsafeExecuted=true','file:///C:/Windows/notepad.exe','mailto:someone@example.com']){
    await a.evaluate('document.querySelector('+JSON.stringify(selector)+').href='+JSON.stringify(denied));await a.click(selector);await wait(100)
    assert.equal(await a.evaluate('window.__novaOpenCalls.filter(c=>c.command==="plugin:opener|open_url").length'),3);assert.equal(await a.evaluate('window.__novaUnsafeExecuted===true'),false);assert.equal(await a.evaluate("!!document.querySelector('.fault-overlay')"),false)
   }
   await a.evaluate('document.querySelector('+JSON.stringify(selector)+').href='+JSON.stringify(original))
  });await a.evaluate('delete window.__TAURI_INTERNALS__;true')
 }
 await a.check('Rapid top-menu switching retains at most one interactive dropdown and dismisses safely',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 points.push、a.point、a.client.send、wait、assert.ok 等；包含循环处理；等待异步结果。 */ async()=>{
  const points=[];for(let i=0;i<6;i++)points.push(await a.point('.menu-item>button',i))
  for(const i of[0,1,2,3,4,5]){for(const type of['mousePressed','mouseReleased'])await a.client.send('Input.dispatchMouseEvent',{type,...points[i],button:'left',clickCount:1});await wait(20);assert.ok(await a.evaluate("document.querySelectorAll('.dropdown:not([inert])').length<=1"))}
  await wait(400);await a.until("!!document.querySelector('.dropdown:not([inert])')")
  await a.press('Escape');await a.until("!document.querySelector('.dropdown')");assert.equal(await a.evaluate("document.activeElement?.closest('.menu-item')!==null"),true)
  await a.click('.menu-item>button',0);await wait(250);const rect=await a.evaluate("(()=>{const r=document.querySelector('.dropdown').getBoundingClientRect();return{x:r.left+20,y:r.bottom+6}})()")
  await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await wait(450);assert.equal(await a.evaluate("!!document.querySelector('.dropdown:not([inert])')"),true)
  await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1400,y:850});await wait(150);await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...rect});await wait(450);assert.equal(await a.evaluate("!!document.querySelector('.dropdown:not([inert])')"),true)
  await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1400,y:850});await a.until("!document.querySelector('.dropdown')",3000)
 })
 await a.check('Shared workspace popover supports keyboard retention, Escape and touch outside dismissal',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.click、a.until、a.press、a.client.send、wait 等；等待异步结果。 */ async()=>{
  await a.click('.layout-menu>summary');await a.until("document.querySelector('.layout-menu').open");await a.press('Tab');await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1400,y:850});await wait(450);assert.equal(await a.evaluate("document.querySelector('.layout-menu').open"),true);await a.press('Escape');assert.equal(await a.evaluate("document.querySelector('.layout-menu').open"),false);assert.equal(await a.evaluate("document.activeElement.matches('.layout-menu>summary')"),true)
  const tap=/** 结构说明（自动提取）：tap；输入 point；直接调用 a.client.send、wait；等待异步结果。 */ async point=>{await a.client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:0,radiusX:2,radiusY:2,force:1}]});await a.client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(150)};await tap(await a.point('.layout-menu>summary'));await a.until("document.querySelector('.layout-menu').open");await wait(450);assert.equal(await a.evaluate("document.querySelector('.layout-menu').open"),true);await tap({x:700,y:800});await a.until("!document.querySelector('.layout-menu').open")
 })

})
