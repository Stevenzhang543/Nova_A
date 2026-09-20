import {blockedStudioSave22} from './lib/userFixtures22.mjs'
import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {openMediaAuditModules} from './lib/mediaAudit16.mjs'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const fixture=join(process.cwd(),'.cache/v2622-particle-drafts.nova'),ids=[];
const opened=await openMediaAuditModules({repository:process.cwd(),bases:[process.cwd()]},{physics:'store/physics',templates:'projects/templates',assets:'assets/AssetDatabase',graph:'renderer/particleGraph'});
try{const {physics:p,templates,assets,graph:g}=opened.modules,wasm=await opened.wasm();assert.ok(p.loadProject(wasm.module.migrate_project_json(templates.createTemplateProjectJson('empty','Particle drafts'))));for(const name of ['A','B'])ids.push(assets.createTextAsset('Particle '+name,'particleSystem',JSON.stringify({format:'nova-particle-system',version:2,graph:g.defaultParticleGraph(),values:{}}),'Assets/Particles').uuid);await writeFile(fixture,p.getSceneJSON())}finally{await opened.close()}
await withBrowserAudit({release:'26.22',name:'particle-draft-user',development:process.argv.includes('--development'),expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1366,height:900},async a=>{
 const u=worldUserControls17(a),field='input[data-resource-key$=":spawn:rate"]';
 async function panel(){await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',5);await a.until("!!document.querySelector('.rendering-studio')");await a.click('.rendering-studio>.studio-header nav button',4);await a.until("!!document.querySelector('.particle-graph-editor')");await a.select('.particle-section>.studio-grid>article:nth-child(2) select',ids[0])}
 const rate=doc=>{const asset=doc.assets.find(x=>x.uuid===ids[0]);return JSON.parse(decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1))).graph.modules.find(x=>x.kind==='Spawn').values.rate};
 await u.open(fixture);await panel();
 await a.check('Particle numeric drafts retain malformed input and block asset Save',async()=>{
  const before=await u.save('particle-before-22');await u.field(field,'10+15');await u.field(field,'1/0');assert.equal(await a.evaluate(`document.querySelector('${field}').getAttribute('aria-invalid')`),'true');await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);assert.equal(await a.evaluate(`document.querySelector('${field}').value`),'1/0');await a.evaluate(`document.querySelector('${field}').focus()`);await a.press('Escape');await blockedStudioSave22(a);assert.equal(rate(before.document),rate(JSON.parse(await readFile(fixture,'utf8'))));await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);const saved=await u.save('particle-saved-22');assert.equal(rate(saved.document),25);await u.open(saved.file);await panel();assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),25);await a.capture('particle-expression-retained');
 });
 await a.check('Particle assets with matching module IDs isolate invalid field drafts',async()=>{await u.field(field,'1/0');await a.select('.particle-section>.studio-grid>article:nth-child(2) select',ids[1]);assert.equal(await a.evaluate(`document.querySelector('${field}').getAttribute('aria-invalid')`),null);await a.select('.particle-section>.studio-grid>article:nth-child(2) select',ids[0]);assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),25)});
 await a.check('Saved particle graph fields follow asset Undo and Redo in the open panel',async()=>{await u.field(field,'30');await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);await a.evaluate('document.activeElement.blur()');await a.press('z',2);await a.until(`Number(document.querySelector('${field}').value)===25`);await a.press('y',2);await a.until(`Number(document.querySelector('${field}').value)===30`)});

 await a.check('Dirty particle graphs cannot overwrite an asset restored by Undo',async()=>{await u.field(field,'35');await a.evaluate('document.activeElement.blur()');await a.press('z',2);await a.until("!!document.querySelector('[data-audit=particle-source-conflict]')");await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);await blockedStudioSave22(a);assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),35);await a.capture('particle-source-conflict');await u.activate('[data-audit=particle-source-conflict] button');assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),25);const saved=await u.save('particle-conflict-restored-22');assert.equal(rate(saved.document),25)});

 await a.check('Unsaved particle graph edits survive asset switches and panel replacement',async()=>{
  await u.field(field,'40');const select='.particle-section>.studio-grid>article:nth-child(2) select';await a.select(select,ids[1]);await a.select(select,ids[0]);
  assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),40);
  await a.click('.manage-body>nav button',1);await panel();assert.equal(await a.evaluate(`Number(document.querySelector('${field}').value)`),40);
  await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);
 });

 await a.check('Particle vectors keep malformed components and persist independent X and Y expressions',async()=>{
  await a.clickText('.particle-graph-editor .module-row button','Velocity');const x='input[data-resource-key$=":velocity:minimum:0"]',y='input[data-resource-key$=":velocity:minimum:1"]';await u.field(x,'2+3');await u.field(y,'3*3');await u.field(x,'invalid');await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);assert.equal(await a.evaluate(`document.querySelector('${x}').getAttribute('aria-invalid')`),'true');await a.evaluate(`document.querySelector('${x}').focus()`);await a.press('Escape');await u.activate('.particle-section>.studio-grid>article:nth-child(2) .capture-compare button',1);const saved=await u.save('particle-vector-saved-22'),asset=saved.document.assets.find(x=>x.uuid===ids[0]),graph=JSON.parse(decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1))).graph;assert.deepEqual(graph.modules.find(x=>x.kind==='Velocity').values.minimum,[5,9]);await u.open(saved.file);await panel();await a.clickText('.particle-graph-editor .module-row button','Velocity');assert.equal(await a.evaluate(`Number(document.querySelector('${x}').value)`),5);assert.equal(await a.evaluate(`Number(document.querySelector('${y}').value)`),9);await a.capture('particle-vector-components');
 });

 await a.check('All fourteen particle numbers remain readable and reachable across 27 language scale and viewport combinations',async()=>{
  const failures=[];
  for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
   await a.viewport(1440,900);await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page select:has(option[value=de]):has(option[value=zh])')");await a.select('.settings-page select:has(option[value=de]):has(option[value=zh])',locale);await a.evaluate(`document.querySelector('.settings-page input[type=range][min="1"][max="2"]').focus()`);await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await panel();
   for(const width of [1024,1366,1920]){await a.viewport(width,768);let fields=0;for(const index of [0,2,3,5,10]){
    await u.activate('.particle-graph-editor .module-row button',index);
    const metrics=await a.evaluate(`(()=>{const c=document.createElement('canvas').getContext('2d');return [...document.querySelectorAll('.particle-graph-editor input[data-numeric-expression]')].map(e=>{e.scrollIntoView({block:'center',inline:'nearest'});const r=e.getBoundingClientRect(),s=getComputedStyle(e);c.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily;return{field:e.dataset.resourceKey,digits:(e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight))/c.measureText('0').width,reachable:document.elementFromPoint((r.left+r.right)/2,(r.top+r.bottom)/2)===e}})})()`);
    fields+=metrics.length;for(const metric of metrics)if(metric.digits+.1<6||!metric.reachable)failures.push({locale,scale,width,...metric});
   }assert.equal(fields,14);a.observations.push({name:'particle-numeric-layout',locale,scale,width,fields});if(scale===2&&width===1024)await a.capture(locale+'-large-particle-controls');}
  }assert.deepEqual(failures,[]);
 });

})
