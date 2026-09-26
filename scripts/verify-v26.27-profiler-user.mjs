/** 26.27 诊断用户检查：读取真实 Profiler 数据并用高DPI验证编辑器偏好不限制游戏画质。 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.27',name:'profiler-user',width:1400,height:900},/** 只通过可见设置和工作区按钮操作，页面求值仅观察DOM与画布。 */ async a=>{
 const u=worldUserControls17(a);await u.open(resolve('reference-projects/projects/creator-v2624-output-quality/project.nova'))
 await a.client.send('Emulation.setDeviceMetricsOverride',{width:1400,height:900,deviceScaleFactor:2,mobile:false})
 /** 打开个人画布设置并选择实际最大像素比控件。 */ async function ratio(value){await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('.settings-search input')");await u.field('.settings-search input','canvas');const index=await a.evaluate("[...document.querySelectorAll('.settings-page select')].findIndex(e=>e.options.length===4&&[...e.options].map(o=>o.value).join(',')==='1,1.5,2,3')");assert.ok(index>=0);await a.select('.settings-page select',String(value),index)}
 /** 在相同停播场景读取实际画布，不用配置值代替有效结果。 */ async function readCanvas(){await wait(650);return a.evaluate("(()=>{const c=document.querySelector('.render-canvas'),r=c.getBoundingClientRect();return{width:c.width,height:c.height,cssWidth:r.width,cssHeight:r.height,dpr:devicePixelRatio}})()")}
 /** 真实进入调试工作区，再通过侧栏打开游戏视图。 */ async function game(){await u.workspace('Debug');await a.click('.sidebar nav button',0);await a.until("document.querySelector('.sidebar nav button')?.getAttribute('aria-pressed')==='true'");return readCanvas()}
 await a.check('Editor DPR preference changes scene presentation while Game backing remains authored quality',/** 比较两个个人DPR设置下相同游戏视图尺寸，防止用低画质伪装性能提升。 */ async()=>{
  await ratio(2);await u.workspace('Design');const scene2=await readCanvas(),game2=await game();await ratio(1);await u.workspace('Design');const scene1=await readCanvas(),game1=await game()
  assert.ok(scene2.width>scene1.width,'High DPI scene reacts to editor preference');assert.deepEqual(game1,game2,'Game dimensions remain invariant to editor pixel-ratio preference');assert.equal(game1.dpr,2);assert.ok(game1.width>game1.cssWidth*1.1,'Fixture author quality uses high DPI')
  a.observations.push({name:'actual-dpr-isolation',scene2,scene1,game2,game1});await a.capture('game-dpr-isolation')
 })
 await a.check('Profiler exposes actual resolution, GPU query availability and readable pass CPU costs',/** 播放真实场景后读取面板字段和表格，检查未发生横向裁切。 */ async()=>{
  await a.click('.actionbar button',0);await wait(1200);await u.bottom('profiler','Profiler');await a.until("!!document.querySelector('[data-audit=profiler-measurement]')");await u.activate('[data-panel-maximize=bottom]');await wait(500)
  const info=await a.evaluate("(()=>{const p=document.querySelector('[data-audit=profiler-measurement]');return{text:p.textContent,fields:[...p.querySelectorAll('dd')].map(e=>e.textContent),rows:[...p.querySelectorAll('tbody tr')].map(e=>e.textContent),width:p.clientWidth,scroll:p.scrollWidth}})()")
  assert.match(info.text,/median.*p95.*p99/);assert.match(info.fields[1],/\d+ × \d+/);assert.match(info.fields[4],/^(?:[0-9]+\.[0-9]+ ms|.*(?:not measured|unavailable).*)$/i);assert.ok(info.rows.length>0);assert.ok(info.scroll<=info.width+2);a.observations.push({name:'profiler-visible-diagnostics',info});await a.capture('profiler-diagnostics');await a.click('.actionbar button',3)
 })
})
