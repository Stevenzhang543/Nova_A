import {blockedStudioSave22} from './lib/userFixtures22.mjs'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const fixture=join(process.cwd(),'.cache/v2622-event-drafts.nova'),ids=[];
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',events:'runtime/eventSheets'});
try{const {physics:p,templates,assets,events:e}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Event drafts'))));const logic=assets.createTextAsset('Callbacks','script','fn start() {}','Assets');for(const name of ['A','B'])ids.push(e.createEventSheetAsset('Events '+name,'asset://'+logic.uuid).uuid);await writeFile(fixture,p.getSceneJSON())}finally{await opened.close()}
await withBrowserAudit({release:'26.22',name:'event-draft-user',development:process.argv.includes('--development'),expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1366,height:900},async a=>{
 const u=worldUserControls17(a),priority='.event-list .priority input',seed='.event-details .seed input';
 async function panel(){await u.workspace('Script');await a.until("!!document.querySelector('#logic-events-tab')");await a.click('#logic-events-tab');await a.until("!!document.querySelector('.event-studio .priority input')");await a.clickText('.sheet-browser>button','Events A');}
 const sheet=doc=>{const asset=doc.assets.find(x=>x.uuid===ids[0]);return JSON.parse(decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1)))};
 await u.open(fixture);await panel();
 await a.check('Integer event drafts retain invalid text, block Save and block asset transitions',async()=>{
  const before=await u.save('event-draft-before-22');
  for(const text of ['1/0','1.5','1000001']){await u.field(priority,text);assert.equal(await a.evaluate(`document.querySelector('${priority}').getAttribute('aria-invalid')`),'true');await u.activate('.sheet-toolbar button.primary');assert.equal(await a.evaluate(`document.querySelector('${priority}').value`),text);await a.clickText('.sheet-browser>button','Events B');assert.ok((await a.evaluate("document.querySelector('.sheet-toolbar>div>strong').textContent")).includes('Events A'));assert.equal(await a.evaluate(`document.querySelector('${priority}').value`),text);}
  await a.evaluate(`document.querySelector('${priority}').focus()`);await a.press('Escape');const after=await u.save('event-draft-blocked-22');assert.deepEqual(sheet(after.document),sheet(before.document));await a.capture('event-invalid-recovery');
 });
 await a.check('Priority and seed expressions save exact integers and survive actual project reopen',async()=>{
  await u.field(priority,'2+3');await u.field(seed,'7*9');await u.activate('.sheet-toolbar button.primary');const saved=await u.save('event-draft-saved-22');assert.equal(sheet(saved.document).handlers[0].priority,5);assert.equal(sheet(saved.document).deterministicSeed,63);await u.open(saved.file);await panel();assert.equal(await a.evaluate(`Number(document.querySelector('${priority}').value)`),5);assert.equal(await a.evaluate(`Number(document.querySelector('${seed}').value)`),63);
 });
 await a.check('Invalid seed blocks a switch to code until Escape restores the value',async()=>{
  await u.field(seed,'0');await a.click('#logic-code-tab');assert.ok(await a.evaluate("!!document.querySelector('.event-studio')"));assert.equal(await a.evaluate(`document.querySelector('${seed}').value`),'0');await a.evaluate(`document.querySelector('${seed}').focus()`);await a.press('Escape');await a.click('#logic-code-tab');await a.until("!document.querySelector('.event-studio')");await a.click('#logic-events-tab');await a.until("!!document.querySelector('.event-studio')");assert.equal(await a.evaluate(`Number(document.querySelector('${seed}').value)`),63);
 });
 await a.check('A focused expression is included by Save and a clean Save changes no asset data',async()=>{
  await a.evaluate(`(()=>{const e=document.querySelector('${priority}');e.scrollIntoView({block:'center'});e.focus();e.select()})()`);await a.client.send('Input.insertText',{text:'10+2'});await u.activate('.sheet-toolbar button.primary');const first=await u.save('event-focused-saved-22');assert.equal(sheet(first.document).handlers[0].priority,12);await u.activate('.sheet-toolbar button.primary');const second=await u.save('event-clean-saved-22');assert.deepEqual(second.document.assets,first.document.assets);
 });
 await a.check('Clean event-sheet controls follow saved asset Undo and Redo',async()=>{
  await a.evaluate('document.activeElement.blur()');await a.press('z',2);const undone=await u.save('event-undone-22');assert.equal(sheet(undone.document).handlers[0].priority,5);await a.until("Number(document.querySelector('.event-list .priority input').value)===5");await a.press('y',2);await a.until("Number(document.querySelector('.event-list .priority input').value)===12");
 });

 await a.check('Unsaved event edits survive Undo and cannot overwrite its changed source',async()=>{
  await u.field(priority,'17');await a.evaluate('document.activeElement.blur()');await a.press('z',2);await a.until("!!document.querySelector('.event-studio .studio-draft-conflict')");assert.equal(await a.evaluate("Number(document.querySelector('.event-list .priority input').value)"),17);await u.activate('.sheet-toolbar button.primary');await blockedStudioSave22(a);await u.activate('.event-studio .studio-draft-conflict .actions button',1);assert.equal(await a.evaluate("Number(document.querySelector('.event-list .priority input').value)"),5);const recovered=await u.save('event-conflict-recovered-22');assert.equal(sheet(recovered.document).handlers[0].priority,5);await a.capture('event-source-conflict-recovered');
 });
 await a.check('Event priority and seed controls remain readable and reachable across 27 configurations',async()=>{
  const failures=[];
  for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
   await a.viewport(1440,900);await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page select:has(option[value=de]):has(option[value=zh])')");await a.select('.settings-page select:has(option[value=de]):has(option[value=zh])',locale);await a.evaluate(`document.querySelector('.settings-page input[type=range][min="1"][max="2"]').focus()`);await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await panel();
   for(const width of [1024,1366,1920]){await a.viewport(width,768);const metrics=await a.evaluate(`(()=>{const c=document.createElement('canvas').getContext('2d');return [...document.querySelectorAll('.event-studio input[data-numeric-expression]')].map(e=>{e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),s=getComputedStyle(e);c.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily;return{field:e.dataset.resourceKey,digits:(e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight))/c.measureText('0').width,reachable:document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2)===e}})})()`);assert.ok(metrics.length>=2);for(const metric of metrics)if(metric.digits+.1<6||!metric.reachable)failures.push({locale,scale,width,...metric});a.observations.push({name:'event-numeric-layout',locale,scale,width,metrics});if(scale===2&&width===1024)await a.capture(locale+'-large-event-controls');}
  }assert.deepEqual(failures,[]);
 });

});
