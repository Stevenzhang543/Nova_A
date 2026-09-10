import assert from 'node:assert/strict'
import {join} from 'node:path'
import {resolveMilestoneAuditContext,runMilestoneBrowserAudit} from './lib/milestoneAuditContext.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
import {wait} from './lib/browserUserAudit.mjs'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.18',reportName:'network-layout'}),smoke=process.argv.includes('--smoke');assert.ok(!smoke||context.development,'Smoke cannot qualify release');
await runMilestoneBrowserAudit(context,{name:'network-layout'},async a=>{
 const u=worldUserControls17(a),{evaluate,click,select,press,viewport,until,observations,capture}=a;
 await u.open(join(context.repository,'scripts/fixtures/v26.17-world-panels.nova'));
 const network=async()=>{await u.workspace('Design');await u.activate('.bottom-panel .panel-tab',5);await until("!!document.querySelector('.network-studio')");if(await evaluate("document.querySelector('[data-panel-maximize=bottom]')?.getAttribute('aria-pressed')!=='true'"))await u.activate('[data-panel-maximize=bottom]');};
 await u.entity('RigidBody2D');await network();if(await evaluate("!!document.querySelector('.network-studio .empty-state button')")){await u.activate('.network-studio .empty-state button');await until("!!document.querySelector('#network-studio-panel-session.studio-grid')")}
 await u.activate('[data-panel-maximize=bottom]');await u.entity('RigidBody2D');await network();await u.activate('#network-studio-tab-replication');await u.activate('#network-studio-panel-replication .card:nth-child(2) button.primary');await select('.replication-row select','owner');await a.fill('.replication-row input[spellcheck=false]','owner-readable-example');await u.activate('#network-studio-tab-orchestration');await select('select:has(option[value="hook"]):has(option[value="none"])','hook');
 await u.activate('#network-studio-tab-protocol');await u.activate('#network-studio-panel-protocol .card:first-child>header button');await u.activate('#network-studio-panel-protocol .card:nth-child(3)>header button');
 await a.check('Invalid numeric drafts preserve authored values and valid values remain editable',async()=>{
  const selector='.channel-row:last-child input[type=number]',before=await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`);await a.fill(selector,'999999999');assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),before);assert.ok(await evaluate("!!document.querySelector('.network-draft-error')"));await a.fill(selector,'4096');assert.equal(await evaluate(`document.querySelector(${JSON.stringify(selector)}).value`),'4096');assert.equal(await evaluate("!!document.querySelector('.network-draft-error')"),false);
 });
 await a.check('Interest coordinates accept fractional world positions',async()=>{await u.activate('#network-studio-tab-orchestration');await a.fill('.coordinate-row input','1.25');assert.equal(await evaluate("document.querySelector('.coordinate-row input').value"),'1.25')});
 const violations=[];
 await a.check('All six Network Studio tabs remain readable across locale/theme/scale/width',async()=>{
 for(const locale of(smoke?['en']:['en','de','zh']))for(const scale of(smoke?[1]:[1,1.5,2]))for(const theme of(smoke?[0]:[0,1]))for(const width of(smoke?[720]:[720,1280,1920])){
  await viewport(1440,1000);await u.workspace('Manage');await click('.manage-body>nav button',1);await until("!!document.querySelector('.settings-page')");await click('.settings-search nav button',0);
  await select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await evaluate("document.querySelector('.settings-page input[type=range][min=\"1\"][max=\"2\"]').focus()");await press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await press('ArrowRight');await press('Tab');await click('.theme-switch button',theme);await network();await viewport(width,1000);
  for(const variant of['session-host','session-client','session-server','protocol','replication','orchestration','simulation','diagnostics']){
   const [tab,role]=variant.split('-');
   await u.activate('#network-studio-tab-'+tab);if(role)await select('#network-studio-panel-session select:has(option[value=host])',role);await wait(100);const name=locale+'-'+String(scale).replace('.','-')+'-'+theme+'-'+width+'-'+variant;
   const metrics=await evaluate(`(()=>{const root=document.querySelector('.network-studio'),visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0;return{width:root.clientWidth,fields:[...root.querySelectorAll('input,select,textarea')].filter(visible).filter(e=>!['checkbox','radio','range','color','hidden'].includes(e.type)).map(e=>({width:e.clientWidth,label:e.getAttribute('aria-label')||e.labels?.[0]?.textContent.trim()||e.title||e.placeholder})),clipped:[...root.querySelectorAll('p,strong,label>span,summary')].filter(visible).filter(e=>{const s=getComputedStyle(e);return e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX)||e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY)}).map(e=>e.textContent.trim())}})()`);
   const reach=await evaluate(`(()=>{const e=[...document.querySelectorAll('.network-studio main input,.network-studio main select,.network-studio main button')].filter(e=>!e.disabled&&e.getBoundingClientRect().width&&e.getBoundingClientRect().height).at(-1);if(!e)return null;e.scrollIntoView({block:'center',inline:'nearest'});e.focus();const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return{focused:document.activeElement===e,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,reachable:hit===e||e.contains(hit)}})()`);
   if(metrics.clipped.length||metrics.fields.some(f=>f.width<80||!f.label)||reach&&(!reach.focused||!reach.visible||!reach.reachable))violations.push({name,...metrics,reach});observations.push({name,...metrics,reach});await capture(name);console.log('SURFACE '+name);
  }
 }
 assert.deepEqual(violations,[]);
 });
});
