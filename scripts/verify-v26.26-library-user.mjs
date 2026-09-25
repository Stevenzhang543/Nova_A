/** 26.26 资源库用户检查：通过真实输入验证卡片键盘选择、完整路径、依赖导航和单一滚动所有者。 */
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {wait} from './lib/browserUserAudit.mjs'
import {userFixture22} from './lib/userFixtures22.mjs'
import {resolveMilestoneAuditContext,runMilestoneBrowserAudit} from './lib/milestoneAuditContext.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const variantOnly=process.argv.includes('--variant-only'),reportName=variantOnly?'library-variant-user':'library-user'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.26',reportName}),fixture=await userFixture22('library26-user','imports')
// 仅在测试项目增加一个含命名变体的真实资源；不修改应用运行时状态。
const fixtureDocument=JSON.parse(await readFile(fixture,'utf8')),variantUuid='00000000-0000-4000-8000-000000002626'
const variantSource=JSON.stringify({format:'nova-resource',version:1,id:'library-variant',name:'Library Variant',kind:'DataTable',parent:null,data:{overrides:{cost:1}},variants:{Combat:{overrides:{cost:2}}},activeVariant:'Default'})
const variantRecord={...fixtureDocument.assets[0],uuid:variantUuid,name:'Library Variant',path:'Assets/Library Variant.nova-resource',assetType:'resource',mimeType:'application/json',source:variantSource,byteLength:Buffer.byteLength(variantSource),width:0,height:0}
delete variantRecord.pipeline;delete variantRecord.interchange;fixtureDocument.assets.push(variantRecord);await writeFile(fixture,JSON.stringify(fixtureDocument))

await runMilestoneBrowserAudit(context,{name:reportName,width:1366,height:900},/** 打开当前真实构建，并且只操作发生改动的资源库界面。 */ async a=>{
 const u=worldUserControls17(a);await u.open(fixture)
 await u.bottom('assets','Assets')
 await a.until("!!document.querySelector('[data-panel-maximize=bottom]')")
 if(await a.evaluate("document.querySelector('[data-panel-maximize=bottom]').getAttribute('aria-pressed')!=='true'"))await a.click('[data-panel-maximize=bottom]')
 while(await a.evaluate("!!document.querySelector('.toast-stack article button:last-child')"))await a.click('.toast-stack article button:last-child')
 if(!variantOnly)await a.check('Assets expose full paths and can be selected with keyboard Enter',/** 键盘激活可聚焦卡片，检查已选状态及完整路径辅助名称。 */ async()=>{
  const path=await a.evaluate("(()=>{const e=[...document.querySelectorAll('.asset-grid article')].find(e=>e.textContent.includes('Import image'));e.focus();return e.getAttribute('aria-label')})()")
  assert.ok(path.startsWith('Assets/'));await a.press('Enter');await a.until("document.querySelector('.asset-inspector header').textContent.includes('Import image')")
  assert.equal(await a.evaluate("document.querySelector('.asset-grid article.selected').getAttribute('title')"),path)
  await a.capture('keyboard-selected-full-path')
 })
 if(!variantOnly)await a.check('Content dependencies keep one inspector scroll owner and readable source paths',/** 显示真实依赖页并检验内部内容不会生成额外纵向滚动陷阱。 */ async()=>{
  await a.click('.asset-detail-toggle');await a.clickText('.content-studio>nav button','Dependencies',true)
  assert.ok(await a.evaluate("document.querySelector('.asset-browser').classList.contains('full-page-details')"))
  const metrics=await a.evaluate("(()=>{const pane=document.querySelector('.content-pane'),s=getComputedStyle(pane),path=document.querySelector('.dependency-node.selected small');return{overflow:s.overflowY,maxHeight:s.maxHeight,path:path.textContent,whiteSpace:getComputedStyle(path).whiteSpace}})()")
  assert.equal(metrics.overflow,'visible');assert.equal(metrics.maxHeight,'none');assert.equal(metrics.whiteSpace,'normal');assert.ok(metrics.path.startsWith('Assets/'))
  a.observations.push({name:'single-scroll-content',...metrics});await a.capture('dependency-full-path')
 })
 if(!variantOnly)await a.check('List mode includes the actual path rather than only type and size',/** 返回浏览后切换列表，核对列表元数据来源为真实路径。 */ async()=>{
  const back=await a.evaluate("(()=>{const e=document.querySelector('.asset-detail-back');return !!e&&!!e.getBoundingClientRect().width})()")
  if(back)await a.click('.asset-detail-back')
  await a.click('.asset-actions-row button[title="List view"]')
  assert.ok(await a.evaluate("[...document.querySelectorAll('.asset-grid article>small')].every(e=>e.textContent.startsWith('Assets/'))"))
  await a.capture('list-source-paths')
 })
 if(!variantOnly)await a.check('Narrow details retain single-page content',/** 仅检查本版修改的资源依赖页在小宽度下的布局，不重复所有主题矩阵。 */ async()=>{
  await a.viewport(1024,768);await a.clickText('.asset-grid article','Import image');await a.clickText('.content-studio>nav button','Dependencies',true)
  const metrics=await a.evaluate("(()=>{const e=document.querySelector('.content-pane');return{width:e.clientWidth,scrollWidth:e.scrollWidth,overflow:getComputedStyle(e).overflowY}})()")
  assert.ok(metrics.scrollWidth<=metrics.width+2,JSON.stringify(metrics));assert.equal(metrics.overflow,'visible');await a.capture('narrow-content-page')
 })
 await a.check('Choose a library variant, save it and reopen the actual downloaded project',/** 通过变体下拉框和保存按钮改变共享资源，并核对磁盘下载与重开后的运行时值。 */ async()=>{
  if(await a.evaluate("!!document.querySelector('.asset-detail-back')?.getBoundingClientRect().width"))await a.click('.asset-detail-back')
  await a.clickText('.asset-grid article','Library Variant');await a.clickText('.content-studio>nav button','Resource',true)
  await a.select('.resource-pane select','Combat',2);await a.clickText('.resource-pane button','Save Resource',true)
  await a.until("document.querySelector('.resolved-resource code')?.textContent.includes('2')")
  const saved=await u.save('library-variant26'),record=saved.document.assets.find(/** 定位选定的稳定资源身份。 */ item=>item.uuid===variantUuid)
  assert.ok(record);let source=record.source
  if(source.startsWith('data:')){const comma=source.indexOf(',');source=source.slice(0,comma).includes(';base64')?Buffer.from(source.slice(comma+1),'base64').toString('utf8'):decodeURIComponent(source.slice(comma+1))}
  const document=JSON.parse(source);assert.equal(document.activeVariant,'Combat');assert.equal(document.variants.Combat.overrides.cost,2);assert.equal(document.data.overrides.cost,1)
  await u.open(saved.file);await u.bottom('assets','Assets');await a.until("!!document.querySelector('[data-panel-maximize=bottom]')")
  if(await a.evaluate("document.querySelector('[data-panel-maximize=bottom]').getAttribute('aria-pressed')!=='true'"))await a.click('[data-panel-maximize=bottom]')
  await a.clickText('.asset-grid article','Library Variant');await a.clickText('.content-studio>nav button','Resource',true)
  assert.equal(await a.evaluate("document.querySelectorAll('.resource-pane select')[2].value"),'Combat');assert.equal(await a.evaluate("JSON.parse(document.querySelector('.resolved-resource code').textContent).overrides.cost"),2)
  await a.capture('variant-reopened')
 })
 if(!variantOnly)await a.check('Malformed imports show actionable localized advice separately from original diagnostics',/** 实际选择损坏图片，验证失败可见且技术诊断没有替代用户操作建议。 */ async()=>{
  if(await a.evaluate("!!document.querySelector('.asset-detail-back')?.getBoundingClientRect().width"))await a.click('.asset-detail-back')
  const file=join(a.profile,'invalid-library-image.png');await writeFile(file,'not a valid PNG')
  let chooser;const off=a.client.on('Page.fileChooserOpened',/** 仅记录真实文件选择器对应节点。 */ event=>chooser=event)
  await a.client.send('Page.setInterceptFileChooserDialog',{enabled:true});await a.click('.asset-actions-row>.primary')
  for(let i=0;!chooser&&i<100;i++)await wait(50)
  assert.ok(chooser,'Actual import file chooser');await a.client.send('DOM.setFileInputFiles',{files:[file],backendNodeId:chooser.backendNodeId});off()
  await a.until("!!document.querySelector('.asset-batch>details')",15000);await a.click('.asset-batch>details>summary')
  const feedback=await a.evaluate("(()=>{const e=document.querySelector('.asset-batch>details');return{summary:e.querySelector('[role=alert]')?.textContent,technical:e.querySelector(':scope>section>details>summary')?.textContent,raw:e.querySelector('code')?.textContent}})()")
  assert.ok(feedback.summary?.length>30,JSON.stringify(feedback));assert.equal(feedback.technical,'Technical details');assert.ok(feedback.raw?.length);assert.notEqual(feedback.summary,feedback.raw)
  a.observations.push({name:'localized-import-failure',...feedback});await a.capture('import-failure-advice')
 })
})
