import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const numericLayoutOnly=process.argv.includes('--numeric-layout-only');assert.ok(!numericLayoutOnly||process.argv.includes('--development'),'Targeted layout mode is development only');
await withBrowserAudit({release:'26.22',name:numericLayoutOnly?'inspector-numeric-layout-user':'foundations-user',development:process.argv.includes('--development'),expectedRelease:process.argv.includes('--development')?JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'):'26.22',height:1000},async a=>{
 const u=worldUserControls17(a)
 await u.open(join(process.cwd(),'reference-projects/projects/creator-v2620-code-game/project.nova'))
 const settings=async()=>{await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=form-label-layout]')");await a.click('.settings-search nav button',0)}
 await settings()
 if(!numericLayoutOnly){
 await a.check('Full selected values and both label layouts work in all palettes and languages',async()=>{
  for(const locale of ['en','de','zh'])for(const palette of ['cloud-blue','meadow-cream','blush-berry','midnight-blue','night-garden']){
   await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=color-palette]',palette);
   for(const mode of ['stacked','auto']){await a.select('[data-audit=form-label-layout]',mode);assert.equal(await a.evaluate('document.documentElement.dataset.formLabelLayout'),mode)}
   for(let tab=0;tab<30&&!(await a.evaluate("document.activeElement===document.querySelector('[data-audit=form-label-layout]')"));tab++)await a.press('Tab');assert.ok(await a.evaluate("document.activeElement===document.querySelector('[data-audit=form-label-layout]')"),'Keyboard must reach the label-layout select');await a.until("!document.querySelector('[data-nova-select-detail]').hidden");
   const detail=await a.evaluate("(()=>{const e=document.activeElement,h=document.querySelector('[data-nova-select-detail]'),r=h.getBoundingClientRect();return{text:h.textContent,expected:e.selectedOptions[0].textContent.trim(),described:e.getAttribute('aria-describedby')?.includes(h.id),contained:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&h.scrollWidth<=h.clientWidth+1}})()");assert.equal(detail.text,detail.expected);assert.ok(detail.described&&detail.contained);await a.press('Escape');assert.equal(await a.evaluate("document.querySelector('[data-nova-select-detail]').hidden"),true);
   await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});const at=await a.point('[data-audit=form-label-layout]');await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...at});await a.until("!document.querySelector('[data-nova-select-detail]').hidden");await a.press('Escape');a.observations.push({locale,palette,selectedValue:detail});console.log('DETAIL '+locale+' '+palette);
  }
  await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])','en')
 })
 await a.check('Save from a focused field succeeds; layout preference persists without dirtying the saved project',async()=>{
  await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:a.profile});await a.press('s',2);await a.until("!document.querySelector('.dirty-pill')");
  assert.equal(await a.evaluate("!!document.querySelector('.dirty-pill')"),false);
  await a.select('[data-audit=form-label-layout]','stacked');assert.equal(await a.evaluate('document.documentElement.dataset.formLabelLayout'),'stacked')
  assert.equal(await a.evaluate("!!document.querySelector('.dirty-pill')"),false);
  assert.equal(await a.evaluate("getComputedStyle(document.querySelector('[data-audit=form-label-layout]').closest('.setting-row')).flexDirection"),'column')
  await a.client.send('Page.reload');await a.until("!!document.querySelector('.project-manager')");assert.equal(await a.evaluate('document.documentElement.dataset.formLabelLayout'),'stacked');await u.open(join(process.cwd(),'reference-projects/projects/creator-v2620-code-game/project.nova'));await settings()
 })
 await a.check('Independent inspector fields undo separately without a timed pause',async()=>{
  await u.entity('Player');const before=await u.position();await u.field('[data-property-path="Transform.position"] input',before[0]+11,0);await u.field('[data-property-path="Transform.position"] input',before[1]+13,1)
  await a.click('[data-property-path="Transform.position"] > span');await a.press('z',2);await a.until("Number(document.querySelectorAll('[data-property-path=\"Transform.position\"] input')[1].value)==="+before[1]);assert.deepEqual(await u.position(),[before[0]+11,before[1]]);await a.press('z',2);assert.deepEqual(await u.position(),before);await settings()
 })
 await a.check('Localized settings remain usable with large text in narrow windows',async()=>{
  for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
   await a.viewport(1440,1000);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=form-label-layout]','auto')
   await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(720,1000)
   const metrics=await a.evaluate(`(()=>{const e=document.querySelector('[data-audit=form-label-layout]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),s=getComputedStyle(e),row=e.closest('.setting-row');return{width:r.width,contentWidth:r.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),fontSize:parseFloat(s.fontSize),direction:getComputedStyle(row).flexDirection,containerWidth:row.closest('.settings-card').clientWidth-parseFloat(getComputedStyle(row.closest('.settings-card')).paddingLeft)-parseFloat(getComputedStyle(row.closest('.settings-card')).paddingRight),hintFont:parseFloat(getComputedStyle(row.closest('.settings-card').querySelector('p')).fontSize),containerFont:parseFloat(getComputedStyle(row.closest('.settings-card')).fontSize),overflow:row.scrollWidth-row.clientWidth,scale:document.documentElement.style.getPropertyValue('--ui-scale')}})()`)
   assert.equal(Number(metrics.scale),scale);assert.ok(metrics.hintFont>=12*scale);if(metrics.containerWidth<=32*metrics.containerFont)assert.equal(metrics.direction,'column');assert.ok(metrics.contentWidth>=metrics.fontSize*8,JSON.stringify(metrics));assert.ok(metrics.overflow<=3,JSON.stringify(metrics));a.observations.push({locale,scale,...metrics});if(scale===2)await a.capture('settings-'+locale)
  }
 })
 }
 await a.check('Inspector numeric fields retain readable content at 200% text scale',async()=>{
  await a.viewport(1440,1000);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])','en');await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('End');await a.press('Tab');assert.equal(await a.evaluate("Number(document.documentElement.style.getPropertyValue('--ui-scale'))"),2);await u.workspace('Design');await a.viewport(1024,640);assert.ok(await a.evaluate("document.querySelector('.entity-list').clientHeight>=60"),'Entity list must retain usable height at 200%');await u.entity('Player')
  const metrics=await a.evaluate(`(()=>{const row=document.querySelector('[data-property-path="Transform.position"]');row.scrollIntoView({block:'center'});return [...row.querySelectorAll('input')].map(e=>{const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily;const usable=e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-16;return{width:e.clientWidth,usable,characters:usable/c.measureText('0').width,overflow:row.scrollWidth-row.clientWidth,direction:getComputedStyle(row).flexDirection}})})()`)
  assert.ok(await a.evaluate("(()=>{const row=document.querySelector('[data-property-path=\"Transform.position\"]'),details=row.querySelector('.property-details').getBoundingClientRect(),inputs=[...row.querySelectorAll('input')].map(e=>e.getBoundingClientRect());return details.top>=Math.max(...inputs.map(r=>r.bottom))-1})()"),'Property details must be below coordinate inputs');assert.equal(metrics.length,2);for(const m of metrics){assert.ok(m.characters>=6,JSON.stringify(m));assert.ok(m.overflow<=3);assert.equal(m.direction,'column')}a.observations.push({name:'inspector-200-percent',metrics});await a.capture('inspector-200-percent')
 })

})

