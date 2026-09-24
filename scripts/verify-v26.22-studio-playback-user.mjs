/** 功能回归脚本：执行 verify-v26.22-studio-playback-user.mjs 对应场景，保留断言和证据输出。 */
import {blockedStudioSave22} from './lib/userFixtures22.mjs'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const fixture=join(process.cwd(),'.cache/v2622-studio-playback.nova'),ids=[];
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',events:'runtime/eventSheets'});
try{const {physics:p,templates,assets,events:e}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Event drafts'))));const logic=assets.createTextAsset('Callbacks','script','fn start() {}','Assets');for(const name of ['A','B'])ids.push(e.createEventSheetAsset('Events '+name,'asset://'+logic.uuid).uuid);await writeFile(fixture,p.getSceneJSON())}finally{await opened.close()}
await withBrowserAudit({release:'26.22',name:'studio-playback-user',development:process.argv.includes('--development'),expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1366,height:900},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、u.open、panel、a.check；等待异步结果。 */ async a=>{
 const u=worldUserControls17(a),priority='.event-list .priority input',seed='.event-details .seed input';
 /** 结构说明（自动提取）：panel；无显式参数；直接调用 u.workspace、a.until、a.click、a.clickText；等待异步结果。 */ async function panel(){await u.workspace('Script');await a.until("!!document.querySelector('#logic-events-tab')");await a.click('#logic-events-tab');await a.until("!!document.querySelector('.event-studio .priority input')");await a.clickText('.sheet-browser>button','Events A');}
 const sheet=/** 结构说明（自动提取）：sheet；输入 doc；直接调用 doc.assets.find、JSON.parse、decodeURIComponent、asset.source.slice、asset.source.indexOf。 */ doc=>{const asset=doc.assets.find(/* 比较 x.uuid 与 ids[0]，返回严格相等的判断结果。 */ x=>x.uuid===ids[0]);return JSON.parse(decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1)))};
 await u.open(fixture);await panel();

 await a.check('Toolbar Play and Step reject an unsaved event draft with retained source and visible feedback',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 u.field、u.activate、a.until、assert.equal、a.evaluate 等；包含循环处理；等待异步结果。 */ async()=>{
  await u.field(priority,'17');
  for(const selector of ['.actionbar>button:first-child','.actionbar>button:nth-child(3)']){
   await u.activate(selector);await a.until("document.querySelector('.toast-stack article.error')?.textContent.includes('Save or discard')");
   assert.equal(await a.evaluate("!!document.querySelector('.actionbar>button.active')"),false);
   assert.equal(await a.evaluate("document.querySelector('.event-list .priority input').value"),'17');
   await a.click('.toast-stack article.error button');
  }
  await blockedStudioSave22(a);await a.capture('studio-playback-retained');
 });
 await a.check('Saving the asset allows actual Play and Stop without changing its authored priority',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 u.activate、u.save、assert.equal、sheet、a.until 等；等待异步结果。 */ async()=>{
  await u.activate('.sheet-toolbar button.primary');const before=await u.save('studio-playback-committed');assert.equal(sheet(before.document).handlers[0].priority,17);
  await u.activate('.actionbar>button:first-child');await a.until("!!document.querySelector('.actionbar>button:first-child.active')");
  await u.activate('.actionbar>button:nth-child(4)');await a.until("!document.querySelector('.actionbar>button.active')");
  const after=await u.save('studio-playback-stopped');assert.deepEqual(after.document,before.document);
 });
 await a.check('Malformed numeric drafts stop toolbar Play and Step before source or input is lost',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.until、u.field、u.activate、assert.equal、a.evaluate 等；包含循环处理；等待异步结果。 */ async()=>{
  await a.until("!!document.querySelector('.event-list .priority input')");await u.field(priority,'1/0');
  for(const selector of ['.actionbar>button:first-child','.actionbar>button:nth-child(3)']){await u.activate(selector);assert.equal(await a.evaluate("!!document.querySelector('.actionbar>button.active')"),false);assert.equal(await a.evaluate("document.querySelector('.event-list .priority input').value"),'1/0');}
  await a.evaluate("document.querySelector('.event-list .priority input').focus()");await a.press('Escape');assert.equal(await a.evaluate("document.querySelector('.event-list .priority input').value"),'17');await a.capture('numeric-playback-recovered');
 });
});
