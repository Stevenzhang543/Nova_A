/** 功能回归脚本：执行 verify-v26.22-layout-user.mjs 对应场景，保留断言和证据输出。 */
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.22',name:'layout-user',development:process.argv.includes('--development'),expectedRelease:process.argv.includes('--development')?JSON.parse(await readFile('package.json','utf8')).version.split('.').slice(0,2).join('.'):'26.22',width:1366,height:768},/** 结构说明（自动提取）：withBrowserAudit 回调；输入 a；直接调用 worldUserControls17、u.open、join、process.cwd、u.entity 等；等待异步结果。 */ async a=>{
 const u=worldUserControls17(a);await u.open(join(process.cwd(),'reference-projects/projects/creator-v2622-code-game/project.nova'));await u.entity('Player')
 await a.check('Focused numeric draft survives resize, saves its exact value, and survives maximize/restore',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 u.position、a.evaluate、wait、a.click、assert.ok 等；写入 saved；包含循环处理；等待异步结果。 */ async()=>{
  const before=await u.position(),value=before[0]+3;await a.evaluate(`document.querySelector('[data-property-path="Transform.position"] input').scrollIntoView({block:'center'})`);await wait(250);await a.click('[data-property-path="Transform.position"] input');assert.ok(await a.evaluate(`document.activeElement.matches('[data-property-path="Transform.position"] input')`),'Numeric field must receive the actual click before resize');await a.press('a',2);await a.client.send('Input.insertText',{text:String(value)});await a.viewport(1024,640)
  assert.ok(await a.evaluate("document.activeElement.matches('[data-property-path=\"Transform.position\"] input')"));assert.equal((await u.position())[0],value)
  await a.client.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:a.profile});await a.press('s',2);await a.until("!document.querySelector('.dirty-pill')")
  let saved;for(let n=0;n<100&&!saved;n++){try{saved=JSON.parse(await readFile(join(a.profile,'project.nova'),'utf8'))}catch{await wait(100)}}assert.ok(saved,'Actual saved file');const player=saved.scenes.flatMap(/* 返回 s.entities 的当前值。 */ s=>s.entities).find(/* 比较 e.name 与 'Player'，返回严格相等的判断结果。 */ e=>e.name==='Player');assert.equal(player.components.find(/* 比较 c.kind 与 'Transform2D'，返回严格相等的判断结果。 */ c=>c.kind==='Transform2D').data.position.x,value)
  await a.click('[data-panel-maximize=inspector]');await a.until("document.querySelector('.editor-main').dataset.maximizedPanel==='inspector'");assert.equal((await u.position())[0],value);await a.click('[data-panel-maximize=inspector]');await a.until("!document.querySelector('.editor-main').dataset.maximizedPanel");assert.equal((await u.position())[0],value);await a.capture('resized-restored-draft')
 })
 await a.check('Hierarchy and Inspector float and redock through visible workspace controls',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 a.press、a.until、a.click、a.evaluate、assert.ok 等；包含循环处理；等待异步结果。 */ async()=>{
  for(const [panel,index] of [['hierarchy',0],['inspector',1]]){
   await a.press('w',3);await a.until("!!document.querySelector('.dock-grid')");await a.click('.dock-grid fieldset:nth-of-type('+(index+1)+') button',2);await a.press('Escape');await a.until(`!!document.querySelector('.${panel}-float')`)
   const box=await a.evaluate(`(()=>{const r=document.querySelector('.${panel}-float').getBoundingClientRect(),rail=document.querySelector('.sidebar').getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,railRight:rail.right,width:innerWidth,height:innerHeight}})()`);assert.ok(box.right>box.left&&box.bottom>box.top&&box.left>=0&&box.right<=box.width+1&&box.top>=0&&box.bottom<=box.height+1,JSON.stringify({panel,...box}));if(panel==='hierarchy')assert.ok(box.left>=box.railRight-1);a.observations.push({panel,...box});await a.capture(panel+'-floating');await a.click('.'+panel+'-float>header>button');await a.until(`!document.querySelector('.${panel}-float')`)
  }
 })
 await a.check('Navigation names and paired profiler budgets remain readable in all locales at 100/150/200 percent',/** 结构说明（自动提取）：a.check 回调；无显式参数；直接调用 u.workspace、a.until、a.click、a.viewport、a.select 等；包含循环处理；等待异步结果。 */ async()=>{
  await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>nav button')");await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=form-label-layout]')");await a.click('.settings-search nav button',0)
  for(const locale of ['en','de','zh'])for(const scale of [1,1.5,2]){
   await a.viewport(1366,768);await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('Home');for(let n=0;n<Math.round((scale-1)/0.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(1366,768)
   const labels=await a.evaluate("[...document.querySelectorAll('.sidebar button strong')].filter(e=>getComputedStyle(e).clipPath==='none').map(e=>{const s=getComputedStyle(e);return{text:e.textContent,width:e.clientWidth,scrollWidth:e.scrollWidth,height:e.clientHeight,scrollHeight:e.scrollHeight,wrap:s.overflowWrap,break:s.wordBreak,lineHeight:s.lineHeight,font:s.font}})");for(const label of labels){assert.ok(label.scrollWidth<=label.width+1&&label.scrollHeight<=label.height+1,JSON.stringify(label));assert.notEqual(label.wrap,'anywhere');assert.notEqual(label.break,'break-word')}a.observations.push({locale,scale,labels});if(scale===2)await a.capture('navigation-'+locale)
   await u.workspace('Design');if(await a.evaluate(`document.querySelector('.compact-tab-select')?.getBoundingClientRect().width>0`))await a.select('.compact-tab-select','profiler');else await a.click('.panel-tabs .panel-tab',7);await a.until("!!document.querySelector('.production-panel .settings-card')");
   const budgets=await a.evaluate(`[...document.querySelectorAll('.production-panel .settings-card > label > div > input[type="number"]')].map(e=>{const s=getComputedStyle(e),c=document.createElement('canvas').getContext('2d');c.font=s.fontWeight+' '+s.fontSize+' '+s.fontFamily;return{width:e.clientWidth,characters:(e.clientWidth-parseFloat(s.paddingLeft)-parseFloat(s.paddingRight)-16)/c.measureText('0').width}})`);assert.equal(budgets.length,4);for(const b of budgets)assert.ok(b.characters>=6,JSON.stringify({locale,scale,...b}));a.observations.push({locale,scale,budgets});
   await u.workspace('Manage');await a.click('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=form-label-layout]')");await a.click('.settings-search nav button',0)

  }
 })
})


