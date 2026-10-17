/** 26.25 事件界面定向检查：真实输入、来源卡片、诊断定位及保存重开。 */
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const fixture=join(process.cwd(),'.cache/v2625-event-user.nova')
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',events:'runtime/eventSheets'})
try{
 const {physics:p,templates,assets:a,events:e}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Event provenance'))))
 const logic=a.createTextAsset('Callbacks','script','fn awake() {} fn start() {} fn update(dt) {} fn inherited_score() {}','Assets')
 const base=e.createEventSheetAsset('Base events',a.assetReference(logic.uuid)),root=e.readEventSheet(base.uuid);root.handlers=[{...e.defaultEventHandler('start'),callback:'inherited_score'}];assert.ok(e.saveEventSheetAsset(base.uuid,root))
 const child=e.createEventSheetAsset('Child events',a.assetReference(logic.uuid)),draft=e.readEventSheet(child.uuid);draft.baseSheetAsset=a.assetReference(base.uuid);assert.ok(e.saveEventSheetAsset(child.uuid,draft));await writeFile(fixture,p.getSceneJSON())
}finally{await opened.close()}
await withBrowserAudit({release:'26.25',name:'event-user',width:1366,height:900},/** 用真实浏览器验证继承来源与草稿不丢失。 */ async a=>{
 const u=worldUserControls17(a)
 /** 打开事件工作区并选择派生事件表。 */ async function panel(){await u.workspace('Script');await a.until("!!document.querySelector('#logic-events-tab')");await a.click('#logic-events-tab');await a.until("!!document.querySelector('.sheet-browser>button')");await a.clickText('.sheet-browser>button','Child events');await a.until("document.querySelectorAll('.event-provenance li').length===4")}
 await u.open(fixture);await panel()
 await a.check('Inherited condition/action cards remain readable at compact landscape width',/** 观察真实卡片来源文本与容器边界。 */ async()=>{
  assert.ok((await a.evaluate("document.querySelector('.event-provenance').textContent")).includes('inherited_score'))
  assert.ok((await a.evaluate("document.querySelector('.event-provenance').textContent")).includes('Base events'))
  await a.viewport(1024,768)
  const overflow=await a.evaluate("[...document.querySelectorAll('.event-provenance li')].some(e=>e.scrollWidth>e.clientWidth+2)")
  assert.equal(overflow,false);await a.capture('event-inheritance-cards')
 })
 await a.check('Validation focus preserves unsaved callbacks and saves/reopens corrected draft',/** 实际修改、定位并修复回调，然后下载重开项目。 */ async()=>{
  await u.field('.event-list .callback input','missing_callback')
  await a.until("!!document.querySelector('.event-details p.warning button')")
  await u.activate('.event-details p.warning button')
  assert.ok(await a.evaluate("!!document.activeElement.closest('[data-handler-uuid]')"))
  assert.equal(await a.evaluate("document.querySelector('.event-list .callback input').value"),'missing_callback')
  await u.field('.event-list .callback input','awake');await u.field('.event-list .priority input','23');await u.activate('.sheet-toolbar button.primary')
  const saved=await u.save('event-provenance-25');await u.open(saved.file);await panel()
  assert.equal(await a.evaluate("Number(document.querySelector('.event-list .priority input').value)"),23)
  await a.capture('event-corrected-reopened')
 })
})
