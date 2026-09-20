import assert from 'node:assert/strict'
import {readFile,writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const profileLoad=process.argv.includes('--profile-load')
const file=join(process.cwd(),'reference-projects/projects/authoring-5000-stress/project.nova'),project=JSON.parse(await readFile(file,'utf8')),lastName=project.scenes[0].entities.at(-1).name
await withBrowserAudit({release:'26.22',name:'hierarchy-user',development:process.argv.includes('--development'),expectedRelease:process.argv.includes('--development')?JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'):'26.22',height:1000,commandTimeoutMs:profileLoad?30000:120000},async a=>{
 const u=worldUserControls17(a),started=performance.now();
 if(profileLoad){await a.client.send('Profiler.enable');await a.client.send('Profiler.start')}
 try{await u.open(file)}catch(error){if(profileLoad){await a.client.send('Runtime.terminateExecution');const result=await a.client.send('Profiler.stop');await writeFile('release-audits/v26.22-editor-load-profile.json',JSON.stringify(result.profile));}throw error}
 if(profileLoad){const result=await a.client.send('Profiler.stop');await writeFile('release-audits/v26.22-editor-load-profile.json',JSON.stringify(result.profile));}
a.observations.push({name:"stress-project-open",milliseconds:performance.now()-started,performanceQualified:false});await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=form-label-layout]')")
 await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('End');await a.press('Tab');await u.workspace('Design');await a.until("!!document.querySelector('.entity-list')");await a.viewport(1024,640)
 await a.check('5,001-entity hierarchy reaches its final row at 200% scale without rendering all rows',async()=>{
  const at=await a.point('.entity-list');await a.client.send('Input.dispatchMouseEvent',{type:'mouseWheel',...at,deltaX:0,deltaY:1000000})
  await a.until(`[...document.querySelectorAll('.entity-list .name')].some(e=>e.getAttribute('title')?.startsWith(${JSON.stringify(lastName+' —')}))`)
  const metrics=await a.evaluate("(()=>{const list=document.querySelector('.entity-list'),rows=[...list.querySelectorAll('.entity-item')];return{height:list.clientHeight,scrollTop:list.scrollTop,scrollHeight:list.scrollHeight,rows:rows.length,heights:rows.map(e=>e.getBoundingClientRect().height),offsets:rows.slice(1).map((e,i)=>e.getBoundingClientRect().top-rows[i].getBoundingClientRect().top)}})()")
  assert.ok(metrics.height>=60);assert.ok(metrics.rows<100);assert.ok(metrics.scrollTop>100000);for(const height of metrics.heights)assert.equal(height,58);for(const offset of metrics.offsets)assert.ok(Math.abs(offset-58)<1)
  await u.entity(lastName);await a.until(`document.querySelector('.inspector-header h3')?.textContent.includes(${JSON.stringify(lastName)})`);a.observations.push({lastName,...metrics});await a.capture('last-row-selected')
 })
})
