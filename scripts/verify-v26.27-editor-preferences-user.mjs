/** 26.27 设置实际输入：只验证新低端预设、独立覆盖、系统减少动效、预览预算及作者数据隔离。 */
import assert from 'node:assert/strict'
import {resolveMilestoneAuditContext,runMilestoneBrowserAudit} from './lib/milestoneAuditContext.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
import {wait} from './lib/browserUserAudit.mjs'
import {userFixture22} from './lib/userFixtures22.mjs'
const resetOnly=process.argv.includes('--reset-only'),reportName=resetOnly?'editor-preferences-reset-user':'editor-preferences-user'
const context=resolveMilestoneAuditContext(import.meta.url,{release:'26.27',reportName}),fixture=await userFixture22('editor-performance27','imports')
await runMilestoneBrowserAudit(context,{name:reportName,width:1440,height:1000},/** 在真实发布页面操作个人设置，保存项目作内容隔离对照。 */ async a=>{
 const u=worldUserControls17(a)
 await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]})
 await u.open(fixture);const baseline=await u.save('preferences27-baseline')
 /** 通过可见管理工作区进入设置，保留真实鼠标和键盘输入。 */
 async function settings(){await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=editor-performance-profile]')")}
 /** 打开所选图片全页详情，读取真实预览 backing 分辨率。 */
 async function preview(){await u.workspace('Design');await u.bottom('assets','Assets');await a.until("!!document.querySelector('[data-panel-maximize=bottom]')");if(await a.evaluate("document.querySelector('[data-panel-maximize=bottom]').getAttribute('aria-pressed')!=='true'"))await a.click('[data-panel-maximize=bottom]');if(await a.evaluate("!!document.querySelector('.asset-detail-back')?.getBoundingClientRect().width"))await a.click('.asset-detail-back');await a.clickText('.asset-grid article','Import image');await a.click('.asset-detail-toggle');await a.until("document.querySelector('.large-preview canvas')?.width>0&&!document.querySelector('.large-preview .preview-placeholder')");return a.evaluate("(()=>{const e=document.querySelector('.large-preview canvas');return{width:e.width,height:e.height}})()")}
 await settings()
 if(!resetOnly)await a.check('Default animations remain enabled; opting into low-end changes only editor budgets',/** 验证默认值与明确低端选择的生效状态及 CSS，不把用户偏好写成项目设置。 */ async()=>{
  assert.equal(await a.evaluate("document.documentElement.dataset.editorMotion"),'on')
  await a.select('[data-audit=editor-performance-profile]','low-end');await a.until("document.documentElement.dataset.editorMotion==='off'")
  assert.equal(await a.evaluate("getComputedStyle(document.querySelector('[data-audit=reset-editor-performance]')).transitionDuration"),'0s')
  const stored=JSON.parse(await a.evaluate("localStorage.getItem('nova_a.preferences.v1')"));assert.equal(stored.performanceProfile,'low-end');assert.equal(stored.reduceMotion,false)
  // 临时样式观测节点不读写项目状态；finally 立即移除，隔离验证播放器和画布的 CSS 边界。
  const scopeProbe=await a.evaluate("(()=>{const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:-10000px';document.querySelector('#app').append(host);try{return ['', 'player-root', 'canvas-container'].map(className=>{const scope=document.createElement('div'),probe=document.createElement('span');scope.className=className;probe.style.cssText='animation:nova-probe 3s linear infinite;transition:opacity 2s linear';scope.append(probe);host.append(scope);const computed=getComputedStyle(probe);return{scope:className||'editor',animation:computed.animationDuration,transition:computed.transitionDuration}})}finally{host.remove()}})()")
  assert.deepEqual(scopeProbe,[{scope:'editor',animation:'0s',transition:'0s'},{scope:'player-root',animation:'3s',transition:'2s'},{scope:'canvas-container',animation:'3s',transition:'2s'}]);a.observations.push({name:'temporary-runtime-css-boundary-probe',scopeProbe})

  await a.capture('low-end-editor-settings')
 })
 if(!resetOnly)await a.check('Bounded preview visibly caps canvas pixels; its independent override restores standard budget',/** 相同图片和显示区域切换预览预算，核对实际画布大小而非只读设置。 */ async()=>{
  const bounded=await preview();assert.ok(bounded.width<=256&&bounded.height<=192,JSON.stringify(bounded))
  assert.equal(await a.evaluate("(()=>{const rule=[...document.styleSheets].flatMap(s=>[...s.cssRules]).find(r=>r.selectorText?.includes('data-editor-motion'));const surface=document.querySelector('.canvas-container');if(!rule||!surface)throw Error('Missing runtime surface or editor motion rule');return surface.matches(rule.selectorText)})()"),false,'Editor motion rule must not match the runtime canvas subtree')
  await settings();await a.select('[data-audit=editor-preview-policy]','full');const full=await preview();assert.ok(full.width>bounded.width,JSON.stringify({bounded,full}));assert.ok(full.width<=1024&&full.height<=768)
  a.observations.push({name:'actual-editor-preview-backing',bounded,full});await settings()
 })
 if(!resetOnly)await a.check('Independent overrides persist after reload and system reduced motion remains independent',/** 保存覆盖并重新打开同一项目，然后通过媒体查询模拟系统偏好变更。 */ async()=>{
  await a.select('[data-audit=editor-motion-override]','on');await a.select('[data-audit=editor-idle-fps]','30');await a.until("document.documentElement.dataset.editorMotion==='on'")
  await u.open(fixture);await settings();assert.equal(await a.evaluate("document.querySelector('[data-audit=editor-idle-fps]').value"),'30');assert.equal(await a.evaluate("document.querySelector('[data-audit=editor-preview-policy]').value"),'full')
  await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await a.until("document.documentElement.dataset.editorMotion==='off'")
  assert.equal(JSON.parse(await a.evaluate("localStorage.getItem('nova_a.preferences.v1')")).reduceMotion,false)
  await a.client.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});await a.until("document.documentElement.dataset.editorMotion==='on'")
 })
 if(resetOnly){await a.select('[data-audit=editor-performance-profile]','low-end');await a.select('[data-audit=editor-motion-override]','on');await a.select('[data-audit=editor-idle-fps]','30');await a.select('[data-audit=editor-preview-policy]','full')}
 await a.check('Performance Reset retains manual accessibility choice and authored project data',/** 手动减少动效与性能重置相互独立，实际下载的场景、资源和项目质量保持一致。 */ async()=>{
  await a.click('.settings-page button[role=switch][aria-label="Reduce motion"]')
  await a.evaluate("document.querySelector('[data-audit=reset-editor-performance]').scrollIntoView({block:'center'})");await wait(200)
  a.observations.push({name:'reset-hit-target',target:await a.evaluate("(()=>{const e=document.querySelector('[data-audit=reset-editor-performance]'),r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{matches:hit===e||e.contains(hit),tag:hit?.tagName,text:hit?.textContent,x:r.x,y:r.y}})()")})
  await a.click('[data-audit=reset-editor-performance]');await a.until("document.querySelector('[data-audit=editor-performance-profile]').value==='balanced'")
  const stored=JSON.parse(await a.evaluate("localStorage.getItem('nova_a.preferences.v1')"));assert.equal(stored.reduceMotion,true);assert.equal(stored.editorDecorativeMotion,'auto');assert.equal(stored.editorIdleFps,0);assert.equal(stored.editorPreviewPolicy,'auto');assert.equal(stored.maxPixelRatio,2)
  assert.equal(await a.evaluate("document.documentElement.dataset.editorMotion"),'off')
  const after=await u.save('preferences27-after');for(const key of ['projectSettings','scenes','assets'])assert.deepEqual(after.document[key],baseline.document[key],`Editor performance must not rewrite ${key}`)
  await a.capture('reset-preserves-accessibility')
 })
})
