import {userFixture22} from './lib/userFixtures22.mjs'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const fixture=await userFixture22('presentation-numeric-layout','imports')
await withBrowserAudit({release:'26.22',name:'presentation-numeric-layout',development:process.argv.includes('--development'),expectedRelease:JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'),width:1366,height:900},async a=>{
 const u=worldUserControls17(a);await u.open(fixture);const failures=[]
 const measure=async name=>{const metrics=await a.evaluate(`(()=>{const canvas=document.createElement('canvas'),c=canvas.getContext('2d');return [...document.querySelectorAll('.presentation-panel input[data-numeric-expression]')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height).map(e=>{const s=getComputedStyle(e);c.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily;return{field:e.dataset.resourceKey,width:e.clientWidth,digits:(e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight))/c.measureText('0').width}})})()`);assert.ok(metrics.length,name+' has numeric controls');for(const m of metrics)if(m.digits+.1<6)failures.push({name,...m});a.observations.push({name,metrics});console.log('CHECK '+name)}
 for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
  await a.viewport(1440,900);await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-page select:has(option[value=de]):has(option[value=zh])')");await a.select('.settings-page select:has(option[value=de]):has(option[value=zh])',locale);await a.evaluate("document.querySelector('.settings-page input[type=range][min=\"1\"][max=\"2\"]').focus()");await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab')
  for(const width of [1024,1366,1920]){await a.viewport(width,768);await u.workspace('UI');await a.until("!!document.querySelector('.ui-workspace .presentation-header nav button')");await a.click('.ui-workspace .presentation-header nav button',1);await wait(100);await measure(locale+'-'+scale+'-'+width+'-localization');await a.click('.ui-workspace .presentation-header nav button',2);await wait(100);await measure(locale+'-'+scale+'-'+width+'-accessibility');if(await a.evaluate("!!document.querySelector('.bottom-panel .compact-tab-select')?.getBoundingClientRect().width"))await a.select('.bottom-panel .compact-tab-select','audio');else await a.click('.bottom-panel .panel-tab',3);await a.until("!!document.querySelector('.audio-workspace')");await wait(100);await measure(locale+'-'+scale+'-'+width+'-audio');if(scale===2&&width===1024)await a.capture(locale+'-large-audio')}
 }
 await a.check('Numeric presentation fields keep six digit positions across three languages, scales and widths',async()=>assert.deepEqual(failures,[]))
})
