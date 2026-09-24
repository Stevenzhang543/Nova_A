/** 功能回归脚本：执行 verify-v26.21-foundations-user.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.21',name:'foundations-user',development:process.argv.includes('--development'),expectedRelease:'26.21',height:1000},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、u.open、join、process.cwd、settings 等；等待异步结果。 */ async a=>{
 const u=worldUserControls17(a)
 await u.open(join(process.cwd(),'reference-projects/projects/creator-v2620-code-game/project.nova'))
 const settings=/** 结构说明（自动提取）：settings；无显式参数；直接调用 u.workspace、a.click、a.until；等待异步结果。 */ async()=>{await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=form-label-layout]')");await a.click('.settings-search nav button',0)}
 await settings()
 await a.check('Full selected values and both label layouts work in all palettes and languages',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.select、assert.equal、a.evaluate、a.press、assert.ok 等；包含循环处理；等待异步结果。 */ async()=>{
  for(const locale of ['en','de','zh'])for(const palette of ['cloud-blue','meadow-cream','blush-berry','midnight-blue','night-garden']){
   await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=color-palette]',palette);
   for(const mode of ['stacked','auto']){await a.select('[data-audit=form-label-layout]',mode);assert.equal(await a.evaluate('document.documentElement.dataset.formLabelLayout'),mode)}
   for(let tab=0;tab<30&&!(await a.evaluate("document.activeElement===document.querySelector('[data-audit=form-label-layout]')"));tab++)await a.press('Tab');assert.ok(await a.evaluate("document.activeElement===document.querySelector('[data-audit=form-label-layout]')"),'Keyboard must reach the label-layout select');await a.until("!document.querySelector('[data-nova-select-detail]').hidden");
   const detail=await a.evaluate("(()=>{const e=document.activeElement,h=document.querySelector('[data-nova-select-detail]'),r=h.getBoundingClientRect();return{text:h.textContent,expected:e.selectedOptions[0].textContent.trim(),described:e.getAttribute('aria-describedby')?.includes(h.id),contained:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight&&h.scrollWidth<=h.clientWidth+1}})()");assert.equal(detail.text,detail.expected);assert.ok(detail.described&&detail.contained);await a.press('Escape');assert.equal(await a.evaluate("document.querySelector('[data-nova-select-detail]').hidden"),true);
   await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1,y:1});const at=await a.point('[data-audit=form-label-layout]');await a.client.send('Input.dispatchMouseEvent',{type:'mouseMoved',...at});await a.until("!document.querySelector('[data-nova-select-detail]').hidden");await a.press('Escape');a.observations.push({locale,palette,selectedValue:detail});console.log('DETAIL '+locale+' '+palette);
  }
  await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])','en')
 })
 await a.check('Save from a focused field succeeds; layout preference persists without dirtying the saved project',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.client.send、a.press、a.until、assert.equal、a.evaluate 等；等待异步结果。 */ async()=>{
  await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:a.profile});await a.press('s',2);await a.until("!document.querySelector('.dirty-pill')");
  assert.equal(await a.evaluate("!!document.querySelector('.dirty-pill')"),false);
  await a.select('[data-audit=form-label-layout]','stacked');assert.equal(await a.evaluate('document.documentElement.dataset.formLabelLayout'),'stacked')
  assert.equal(await a.evaluate("!!document.querySelector('.dirty-pill')"),false);
  assert.equal(await a.evaluate("getComputedStyle(document.querySelector('[data-audit=form-label-layout]').closest('.setting-row')).flexDirection"),'column')
  await a.client.send('Page.reload');await a.until("!!document.querySelector('.project-manager')");assert.equal(await a.evaluate('document.documentElement.dataset.formLabelLayout'),'stacked');await u.open(join(process.cwd(),'reference-projects/projects/creator-v2620-code-game/project.nova'));await settings()
 })
 await a.check('Independent inspector fields undo separately without a timed pause',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 u.entity、u.position、u.field、a.click、a.press 等；等待异步结果。 */ async()=>{
  await u.entity('Player');const before=await u.position();await u.field('[data-property-path="Transform.position"] input',before[0]+11,0);await u.field('[data-property-path="Transform.position"] input',before[1]+13,1)
  await a.click('[data-property-path="Transform.position"] > span');await a.press('z',2);await a.until("Number(document.querySelectorAll('[data-property-path=\"Transform.position\"] input')[1].value)==="+before[1]);assert.deepEqual(await u.position(),[before[0]+11,before[1]]);await a.press('z',2);assert.deepEqual(await u.position(),before);await settings()
 })
 await a.check('Localized settings remain usable with large text in narrow windows',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.viewport、a.select、a.click、a.press、Math.round 等；包含循环处理；等待异步结果。 */ async()=>{
  for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
   await a.viewport(1440,1000);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=form-label-layout]','auto')
   await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(720,1000)
   const metrics=await a.evaluate(`(()=>{const e=document.querySelector('[data-audit=form-label-layout]');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect(),s=getComputedStyle(e),row=e.closest('.setting-row');return{width:r.width,contentWidth:r.width-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight),fontSize:parseFloat(s.fontSize),direction:getComputedStyle(row).flexDirection,containerWidth:row.closest('.settings-card').clientWidth-parseFloat(getComputedStyle(row.closest('.settings-card')).paddingLeft)-parseFloat(getComputedStyle(row.closest('.settings-card')).paddingRight),hintFont:parseFloat(getComputedStyle(row.closest('.settings-card').querySelector('p')).fontSize),containerFont:parseFloat(getComputedStyle(row.closest('.settings-card')).fontSize),overflow:row.scrollWidth-row.clientWidth,scale:document.documentElement.style.getPropertyValue('--ui-scale')}})()`)
   assert.equal(Number(metrics.scale),scale);assert.ok(metrics.hintFont>=12*scale);if(metrics.containerWidth<=32*metrics.containerFont)assert.equal(metrics.direction,'column');assert.ok(metrics.contentWidth>=metrics.fontSize*8,JSON.stringify(metrics));assert.ok(metrics.overflow<=3,JSON.stringify(metrics));a.observations.push({locale,scale,...metrics});if(scale===2)await a.capture('settings-'+locale)
  }
 })
 await a.check('Inspector numeric fields retain readable content at 200% text scale',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.viewport、a.select、u.workspace、assert.ok、a.evaluate 等；包含循环处理；等待异步结果。 */ async()=>{
  await a.viewport(1440,1000);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])','en');await u.workspace('Design');await a.viewport(1024,640);assert.ok(await a.evaluate("document.querySelector('.entity-list').clientHeight>=60"),'Entity list must retain usable height at 200%');await u.entity('Player')
  const metrics=await a.evaluate(`(()=>{const row=document.querySelector('[data-property-path="Transform.position"]');row.scrollIntoView({block:'center'});return [...row.querySelectorAll('input')].map(e=>{const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.fontStyle+' '+s.fontWeight+' '+s.fontSize+' '+s.fontFamily;const usable=e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-16;return{width:e.clientWidth,usable,characters:usable/c.measureText('0').width,overflow:row.scrollWidth-row.clientWidth,direction:getComputedStyle(row).flexDirection}})})()`)
  assert.equal(metrics.length,2);for(const m of metrics){assert.ok(m.characters>=6,JSON.stringify(m));assert.ok(m.overflow<=3);assert.equal(m.direction,'column')}a.observations.push({name:'inspector-200-percent',metrics});await a.capture('inspector-200-percent')
 })

})

