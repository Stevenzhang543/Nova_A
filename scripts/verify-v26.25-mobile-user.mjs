/** 26.25 真实 Chromium 移动审核：静态子目录、方向保护、未保存草稿、菜单及双指画布。 */
import assert from 'node:assert/strict'
import {createServer} from 'node:http'
import {readFile} from 'node:fs/promises'
import {resolve,extname,sep} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const root=resolve('dist'),prefix='/apps/nova/',requests=[]
const server=createServer(/** 仅在子目录提供完整产物，不使用 SPA 回退或应用后端。 */ async(req,res)=>{
 try{const pathname=new URL(req.url,'http://localhost').pathname;assert.ok(pathname.startsWith(prefix));const file=resolve(root,decodeURIComponent(pathname.slice(prefix.length))||'index.html');assert.ok(file.startsWith(root+sep));const bytes=await readFile(file);requests.push(pathname);res.writeHead(200,{'Content-Type':{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'}[extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes)}catch{res.writeHead(404);res.end('Not found')}
})
await new Promise(/** 分配本机临时端口。 */ done=>server.listen(0,'127.0.0.1',done))
const origin='http://127.0.0.1:'+server.address().port
try{await withBrowserAudit({release:'26.25',name:'mobile-user'},/** 使用真实输入，并只读 DOM 状态和截图作为结果。 */ async a=>{
 const u=worldUserControls17(a)
 /** 通过浏览器设备模拟发送真实旋转事件，保留页面实例。 */
 async function rotate(portrait){await a.client.send('Emulation.setDeviceMetricsOverride',{width:portrait?390:844,height:portrait?844:390,deviceScaleFactor:1,mobile:true,screenOrientation:{type:portrait?'portraitPrimary':'landscapePrimary',angle:portrait?0:90}});await wait(250)}
 await a.check('Nested static entry and online-only PWA URLs resolve within the deployed directory',/** 检查实际 HTTP 启动、清单、图标和无应用缓存控制器。 */ async()=>{
  await a.client.send('Page.navigate',{url:origin+prefix+'index.html'});await a.until("!!document.querySelector('.project-manager')")
  assert.equal(await a.evaluate('window.novaBrowserSupported'),true)
  const result=await a.evaluate('(async()=>{const link=document.querySelector("link[rel=manifest]");const m=await (await fetch(link.href)).json();return {href:link.href,start:new URL(m.start_url,link.href).href,scope:new URL(m.scope,link.href).href,icons:await Promise.all(m.icons.map(async i=>(await fetch(new URL(i.src,link.href))).status)),controller:!!navigator.serviceWorker?.controller}})()')
  assert.equal(result.start,origin+prefix+'index.html');assert.equal(result.scope,origin+prefix);assert.deepEqual(result.icons,[200,200]);assert.equal(result.controller,false)
 })
 await a.client.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});await rotate(false)
 await a.until("document.documentElement.dataset.mobileEditor==='true'")
 await a.check('Portrait guard preserves the mounted launcher and unsaved creation field',/** 输入未保存字段并旋转两次，确认同一元素和值仍在。 */ async()=>{
  await a.click('.quick-actions .new-project');await a.until("!!document.querySelector('.creation-card header input')")
  await a.fill('.creation-card header input','Unsaved mobile draft 26.25')
  await a.evaluate("window.__mobileDraftElement=document.querySelector('.creation-card header input');true")
  await rotate(true);await a.until("!!document.querySelector('[data-testid=mobile-rotate]')")
  assert.equal(await a.evaluate("document.getElementById('app').inert"),true);await a.capture('portrait-preserved-draft')
  await rotate(false);await a.until("!document.querySelector('[data-testid=mobile-rotate]')")
  assert.equal(await a.evaluate("document.querySelector('.creation-card header input')===window.__mobileDraftElement"),true)
  assert.equal(await a.evaluate("document.querySelector('.creation-card header input').value"),'Unsaved mobile draft 26.25')
  await a.press('Escape');await a.until("!document.querySelector('.creation-card')")
 })
 await u.open(resolve('reference-projects/projects/creator-v2624-code-game/project.nova'))
 await a.check('Rotation safely dismisses an open File menu and permits reopening without remounting editor or canvas',/** 打开菜单并确认旋转前后节点身份与展开状态。 */ async()=>{
  await a.click('.menu-item>button',0);await a.until("!!document.querySelector('.menu-item .dropdown')")
  await a.evaluate("window.__mobileEditor=document.querySelector('.editor-root');window.__mobileCanvas=document.querySelector('.overlay-canvas');true")
  await rotate(true);await a.until("!!document.querySelector('[data-testid=mobile-rotate]')");await rotate(false);await a.until("!document.querySelector('[data-testid=mobile-rotate]')")
  assert.equal(await a.evaluate("document.querySelector('.editor-root')===window.__mobileEditor && document.querySelector('.overlay-canvas')===window.__mobileCanvas"),true)
  assert.equal(await a.evaluate("!!document.querySelector('.menu-item .dropdown')"),false)
  await a.click('.menu-item>button',0);await a.until("!!document.querySelector('.menu-item .dropdown')")
  await a.press('Escape')
 })
 await a.check('Actual two-finger touch pan and pinch change the scene view without a fatal error',/** 使用 CDP 触摸输入，比较真实画布像素，不注入业务状态。 */ async()=>{
  while(await a.evaluate("!!document.querySelector('.toast-stack article button:last-child')")) await a.click('.toast-stack article button:last-child')
  const at=await a.point('.overlay-canvas');assert.equal(await a.evaluate('document.elementFromPoint('+at.x+','+at.y+').classList.contains("overlay-canvas")'),true,'Touch target must be unobstructed');const before=await a.evaluate("document.querySelector('.overlay-canvas').toDataURL()")
  await a.client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:at.x-20,y:at.y,id:1},{x:at.x+20,y:at.y,id:2}]})
  await a.client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:at.x-30,y:at.y+12,id:1},{x:at.x+55,y:at.y+12,id:2}]})
  await a.client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(300)
  assert.ok(await a.evaluate("document.querySelector('.overlay-canvas').toDataURL()")!==before,'Touch gesture changes scene pixels')
  assert.equal(await a.evaluate("!!document.querySelector('.fault-overlay')"),false)
  await a.capture('landscape-touch')
 })
 a.observations.push({name:'browser-device-matrix',chromium:'Actual Windows Edge with CDP touch/orientation emulation; see browser metadata',firefox:'unavailable; not executed',webkit:'unavailable; not executed',iphone12:'not connected; physical keyboard, safe-area, download and installation pending',hosting:'Plain loopback HTTP subdirectory; secure-context behavior, not public HTTPS certificate qualification',requests})
})}finally{server.closeAllConnections();await new Promise(/** 关闭本次审核创建的静态服务。 */ done=>server.close(done))}


