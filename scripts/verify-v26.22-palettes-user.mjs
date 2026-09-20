// Retained 26.20 regression implementation, executed against actual 26.22 source.
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {readFile} from 'node:fs/promises'
import {resolveMilestoneAuditContext,runMilestoneBrowserAudit} from './lib/milestoneAuditContext.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const layout=process.argv.includes('--layout'),name=layout?'palette-layout':'palette-user',context=resolveMilestoneAuditContext(import.meta.url,{release:'26.22',reportName:name})
const spec=await readFile(join(context.repository,'app_color_palette_system.md'),'utf8'),ids=['cloud-blue','meadow-cream','blush-berry','midnight-blue','night-garden'],roles=['background','surface','primary','secondary','accent','text-primary']
const sections=spec.split(/## \d+\. /).slice(1),expected=sections.map(section=>[...section.matchAll(/`(#[A-Fa-f0-9]{6})`/g)].slice(0,6).map(x=>x[1].toLowerCase()));assert.equal(expected.length,5)
await runMilestoneBrowserAudit(context,{name,height:1000},async a=>{
 const u=worldUserControls17(a);await u.open(join(context.repository,'reference-projects/projects/creator-v2622-code-game/project.nova'))
 const settings=async()=>{await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=color-palette]')");await a.click('.settings-search nav button',0)}
 await settings()
 await a.check('Every supplied palette uses exact semantic colors through visible Settings controls',async()=>{
  for(let i=0;i<ids.length;i++){await a.select('[data-audit=color-palette]',ids[i]);const result=await a.evaluate(`(()=>{const root=document.documentElement,s=getComputedStyle(root);return{palette:root.dataset.palette,theme:root.dataset.theme,colors:${JSON.stringify(roles)}.map(role=>s.getPropertyValue('--color-'+role).trim().toLowerCase()),motion:s.getPropertyValue('--motion-panel').trim(),reduced:root.dataset.reduceMotion}})()`);assert.equal(result.palette,ids[i]);assert.deepEqual(result.colors,expected[i]);assert.equal(result.theme,i<3?'light':'dark');assert.equal(parseFloat(result.motion)*(result.motion.endsWith('ms')?1:1000),220);a.observations.push({name:ids[i],...result});await a.capture(ids[i])}
 })
 if(layout){await a.check('Palette Settings labels controls and colors remain readable across 135 combinations',async()=>{
  const failures=[]
  for(const locale of['en','de','zh'])for(const scale of[1,1.5,2])for(const id of ids)for(const width of[720,1280,1920]){
   await a.viewport(1440,1000);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=color-palette]',id)
   await a.evaluate("document.querySelector('.settings-page input[type=range][min=\"1\"][max=\"2\"]').focus()");await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(width,1000)
   const state=[locale,scale,id,width].join('-'),metrics=await a.evaluate(`(()=>{const select=document.querySelector('[data-audit=color-palette]'),card=select.closest('.settings-card');select.scrollIntoView({block:'center'});select.focus();const r=select.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2),visible=e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height;return{palette:document.documentElement.dataset.palette,reachable:hit===select,clipped:[...card.querySelectorAll('p,h2,.setting-label')].filter(visible).filter(e=>{const s=getComputedStyle(e);return(e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(s.overflowX))||(e.scrollHeight>e.clientHeight+2&&['hidden','clip'].includes(s.overflowY))}).map(e=>e.textContent),width:card.clientWidth,scrollWidth:card.scrollWidth}})()`)
   if(!metrics.reachable||metrics.clipped.length||metrics.scrollWidth>metrics.width+3)failures.push({state,...metrics});a.observations.push({name:'surface-'+state,...metrics});if(scale===2&&width===720)await a.capture(state);console.log('SURFACE '+state)
  }assert.deepEqual(failures,[])
 });return}
 await a.check('Palette text and primary-action color pairs meet the declared contrast budget',async()=>{
  for(const id of ids){await a.select('[data-audit=color-palette]',id);const ratios=await a.evaluate(`(()=>{const style=getComputedStyle(document.documentElement),canvas=document.createElement('canvas');canvas.width=canvas.height=1;const c=canvas.getContext('2d'),rgb=name=>{c.clearRect(0,0,1,1);c.fillStyle=style.getPropertyValue(name).trim();c.fillRect(0,0,1,1);return [...c.getImageData(0,0,1,1).data].slice(0,3)},luminance=rgb=>rgb.map(x=>{x/=255;return x<=.04045?x/12.92:Math.pow((x+.055)/1.055,2.4)}).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0),ratio=(a,b)=>{const x=luminance(rgb(a)),y=luminance(rgb(b));return(Math.max(x,y)+.05)/(Math.min(x,y)+.05)};return{body:ratio('--text-primary','--surface-1'),muted:ratio('--text-muted','--surface-1'),primaryAction:ratio('--accent-contrast','--accent')}})()`);for(const [role,value]of Object.entries(ratios))assert.ok(value>=4.5,id+' '+role+' contrast '+value);a.observations.push({name:'contrast-'+id,...ratios})}
 })
 await a.check('High contrast and reduced motion remain user-selectable without losing palettes',async()=>{
  await a.select('[data-audit=color-palette]','night-garden');await a.click('button[role=switch][aria-label*="contrast" i]');assert.equal(await a.evaluate("document.documentElement.dataset.highContrast"),'true');assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'night-garden');await a.click('button[role=switch][aria-label*="contrast" i]');await a.click('button[role=switch][aria-label*="motion" i]');assert.equal(await a.evaluate("document.documentElement.dataset.reduceMotion"),'true');await a.click('button[role=switch][aria-label*="motion" i]');await a.capture('accessibility-controls')
 })
 await a.check('Each localized context-help button opens its actual bundled lesson',async()=>{
  for(const locale of['en','de','zh']){await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.click('[data-audit=qualification-help]');const anchor=(locale==='zh'?'zh-CN':locale)+'-v'+context.expectedRelease.replace('.','')+'-production';await a.until(`!!document.querySelector('.manual-viewer iframe')?.contentDocument?.getElementById(${JSON.stringify(anchor)})&&document.querySelector('.manual-viewer iframe')?.contentWindow?.location.hash===${JSON.stringify('#'+anchor)}`);await a.capture('help-'+locale);await a.click('.manual-viewer button.close')};await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])','en')
 })
 await a.check('Palette choices persist and light/dark switching remembers each selection',async()=>{
  await a.select('[data-audit=color-palette]','meadow-cream');await a.click('.theme-switch button',0);assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'night-garden');await a.click('.theme-switch button',1);assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'meadow-cream');await a.click('.theme-switch button',0);assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'night-garden');await a.client.send('Page.reload');await a.until("!!document.querySelector('.project-manager')");assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'night-garden');await a.capture('palette-persisted')
 })
 await a.check('Reset Settings restores both palette defaults',async()=>{await u.open(join(context.repository,'reference-projects/projects/creator-v2622-code-game/project.nova'));await settings();
  // Project-open notifications can cover this bottom-right control; dismiss them as a user would.
  for(let n=0;n<10&&await a.evaluate("!!document.querySelector('.toast-stack article button:last-child')");n++)await a.click('.toast-stack article button:last-child');
  await a.until("!document.querySelector('.toast-stack article')");
  await a.point('.settings-page button.danger-action');
  await a.until("(()=>{const e=document.querySelector('.settings-page button.danger-action'),r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()");
  await a.clickText('.settings-page button.danger-action','Reset');
  await a.until("document.documentElement.dataset.palette==='midnight-blue'");assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'midnight-blue');await a.click('.theme-switch button',1);assert.equal(await a.evaluate("document.documentElement.dataset.palette"),'cloud-blue')})
})
