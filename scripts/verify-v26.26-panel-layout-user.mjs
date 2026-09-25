/** 26.26 定向面板用户检查：只覆盖本版容器折叠与单页滚动改动。 */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.26',name:'panel-layout-user',width:900,height:600},/** 在实际页面操作世界工具及物理设置，保留截图和计算尺寸。 */ async a=>{
 const u=worldUserControls17(a)
 await u.open(join(process.cwd(),'reference-projects/projects/physics-v2617-platformer/project.nova'))
 await a.check('World form and status use the page scroll while controls remain keyboard reachable',/** 通过真实导航打开角色面板，检查状态及左右表单不再建立嵌套滚动区。 */ async()=>{
  await u.entity('Player');await u.bottom('worldProduction','World Studio');await u.world('Character');await u.activate('[data-panel-maximize="bottom"]')
  const metrics=await a.evaluate(`(()=>{const root=document.querySelector('.world-tools');return {root:getComputedStyle(root).overflowY,status:getComputedStyle(root.querySelector('.simulation-status17')).overflowY,children:[...root.querySelectorAll('.workspace>aside,.workspace>main')].map(e=>({overflow:getComputedStyle(e).overflowY,width:e.clientWidth,scroll:e.scrollWidth})),tabs:[...root.querySelectorAll('nav button')].map(e=>({width:e.clientWidth,scroll:e.scrollWidth}))}})()`)
  assert.equal(metrics.root,'auto');assert.equal(metrics.status,'visible');assert.ok(metrics.children.every(/** 表单列必须随整页展开，且无不可达横向内容。 */ row=>row.overflow==='visible'&&row.scroll<=row.width+2));assert.ok(metrics.tabs.every(/** 工具页签文字应在按钮内部完整排布。 */ row=>row.scroll<=row.width+2))
  await u.labeled('.world-tools main','Floor snap',.3);await a.press('Tab');assert.ok(await a.evaluate("!!document.activeElement.closest('.world-tools')"))
  a.observations.push({name:'world-scroll-owners',metrics});await a.capture('world-single-page')
  await u.activate('[data-panel-maximize="bottom"]')
 })
 await a.check('Physics materials and conformance respond to narrow host with empty and populated cards',/** 使用真实页签和添加按钮覆盖空材料与有数据材料编辑，再检查容器响应布局。 */ async()=>{
  await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',1)
  await a.until("!!document.querySelector('.settings-search input')");await u.field('.settings-search input','physics')
  await a.until("!!document.querySelector('.physics-workspace')?.getBoundingClientRect().width")
  await u.activate('.physics-heading nav button',2);await a.until("!!document.querySelector('.material-workspace')")
  assert.ok(await a.evaluate("!!document.querySelector('.material-workspace>p')"),'Empty material prompt')
  await u.activate('.material-workspace aside button.primary');await a.until("!!document.querySelector('.material-editor')")
  await u.field('.material-editor>label input','A long material name for narrow panel readability')
  const material=await a.evaluate(`(()=>{const root=document.querySelector('.material-workspace');return {width:root.clientWidth,scroll:root.scrollWidth,columns:getComputedStyle(root).gridTemplateColumns,children:[...root.children].map(e=>({left:e.getBoundingClientRect().left,width:e.getBoundingClientRect().width}))}})()`)
  assert.ok(material.width<640);assert.ok(material.scroll<=material.width+2);assert.ok(Math.abs(material.children[0].left-material.children[1].left)<2,'Material columns stack inside narrow host')
  await a.capture('physics-material-stacked');await u.activate('.physics-heading nav button',3)
  const conformance=await a.evaluate(`(()=>{const e=document.querySelector('.conformance-workspace');return {width:e.clientWidth,scroll:e.scrollWidth,columns:getComputedStyle(e).gridTemplateColumns}})()`)
  assert.ok(conformance.scroll<=conformance.width+2);assert.equal(conformance.columns.split(' ').length,1)
  a.observations.push({name:'physics-narrow-layout',material,conformance});await a.capture('physics-conformance-stacked')
 })
 await a.check('Hierarchy selection, scene close and local change selection work with native keyboard activation',/** 使用 Enter 激活三个新增原生入口；不通过页面脚本调用业务函数。 */ async()=>{
  await u.workspace('Design');await a.until("!!document.querySelector('.entity-item button.name')")
  await u.activate('.entity-item button.name');assert.equal(await a.evaluate("document.querySelector('.entity-item button.name').getAttribute('aria-pressed')"),'true')
  await u.activate('.scene-menu>summary');await a.until("document.querySelector('.scene-menu').open");await u.activate('.scene-menu>div>button')
  await a.until("!!document.querySelector('.scene-tab-close')")
  const before=await a.evaluate("document.querySelectorAll('.scene-tab-entry').length")
  await u.activate('.scene-tab-close');assert.equal(await a.evaluate("document.querySelectorAll('.scene-tab-entry').length"),before-1)
  assert.equal(await a.evaluate("document.querySelectorAll('.scene-tab button').length"),0,'No nested buttons')
  await u.workspace('Manage');await a.click('.manage-body>nav button',6);await a.until("!!document.querySelector('.build-header nav button')");await u.activate('.build-header nav button',4)
  await a.until("!!document.querySelector('.workflow-toggle input')")
  if(!await a.evaluate("document.querySelector('.workflow-toggle input').checked"))await a.click('.workflow-toggle input')
  await u.activate('.changes-card .card-title button');await a.until("!!document.querySelector('.change-select')")
  await u.activate('.change-select');assert.equal(await a.evaluate("document.querySelector('.change-select').getAttribute('aria-pressed')"),'true')
  await a.capture('keyboard-change-selection')
 })

})
