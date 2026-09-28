/** Targeted follow-up to the complete UI rebuild route audit: reviewed text layouts and shared sliders. */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.32',qualifyRelease:false,name:'ui-rebuild-layout-corrections',width:1366,height:768},async a=>{
 const u=worldUserControls17(a)
 await u.open(join(process.cwd(),'reference-projects/projects/creator-v2632-mixed-game/project.nova'))
 for(const [locale,palette,width,height,scale] of [['en','midnight-blue',1366,768,1],['de','cloud-blue',1024,768,1.5],['zh','meadow-cream',900,600,2]]){
  await u.workspace('Manage');await u.activate('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=color-palette]')");await u.activate('.settings-search nav button',0)
  await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=color-palette]',palette)
  await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(width,height);await wait(180);await a.evaluate("document.querySelector('.settings-page input[type=range][min=\"1\"][max=\"2\"]').closest('.ui-property-row').scrollIntoView({block:'center'})")
  await a.check(locale+' shared slider retains its specified track width',async()=>{const r=await a.evaluate(`(()=>{const e=document.querySelector('.settings-page input[type=range][min="1"][max="2"]'),r=e.getBoundingClientRect();return {width:r.width,scale:getComputedStyle(document.documentElement).getPropertyValue('--ui-scale'),value:e.value}})()`);a.observations.push(r);assert.equal(Number(r.value),scale);assert.ok(r.width>=100*scale,JSON.stringify(r))});await a.capture(locale+'-slider')
  await u.activate('.manage-body>nav button',6);await u.activate('.build-panel>.ui-tabs button',2)
  await a.check(locale+' delivery descriptions occupy separate rows',async()=>{const failures=await a.evaluate(`(()=>{return [...document.querySelectorAll('.option-grid>label')].filter(e=>e.getBoundingClientRect().width).flatMap(e=>{const b=e.querySelector('strong').getBoundingClientRect(),s=e.querySelector('small').getBoundingClientRect(),r=e.getBoundingClientRect();return s.top<b.bottom-1||b.right>r.right+1||s.right>r.right+1?[{label:e.textContent,headingBottom:b.bottom,hintTop:s.top}]:[]})})()`);assert.deepEqual(failures,[])});await a.evaluate("document.querySelector('.option-grid').scrollIntoView({block:'start'})");await a.capture(locale+'-delivery')
  await u.activate('.build-panel>.ui-tabs button',3)
  await a.check(locale+' platform badges do not overlap their descriptions',async()=>{const failures=await a.evaluate(`(()=>{return [...document.querySelectorAll('.support-matrix article')].flatMap(e=>{const b=e.querySelector('.support-badge').getBoundingClientRect(),d=e.querySelector('div').getBoundingClientRect();return b.right>d.left+1?[e.textContent]:[]})})()`);assert.deepEqual(failures,[])});await a.evaluate("document.querySelector('.support-matrix').scrollIntoView({block:'start'})");await a.capture(locale+'-platforms')
 }
})
