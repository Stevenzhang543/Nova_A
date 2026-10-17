/** 26.30 实际布局用户检查：以有限代表配置遍历真实导航，保留范围及失败证据。 */
import assert from 'node:assert/strict'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
await withBrowserAudit({release:'26.30',name:'layout-user',width:1366,height:768},/** 打开有实体和资源的工程，通过真实控件遍历并测试编辑保持。 */ async a=>{
 const u=worldUserControls17(a),visited=[]
 await u.open(join(process.cwd(),'reference-projects/projects/creator-v2621-code-game/project.nova'))
 /** 记录面板及实际可见控件，检查宿主边界；保留专用列表和画布滚动。 */
 async function inspect(name,rootSelector){
  await a.until(`!!document.querySelector(${JSON.stringify(rootSelector)})?.getBoundingClientRect().width`);await wait(180)
  const result=await a.evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(rootSelector)}),r=root.getBoundingClientRect();const controls=[...root.querySelectorAll('button,input,select,textarea')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&!e.closest('[inert]'));return{name:${JSON.stringify(name)},root:root.className,width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom,viewport:[innerWidth,innerHeight],controls:controls.length,scopes:[...root.querySelectorAll('[data-control-scope]')].map(e=>e.dataset.controlScope),clippedText:controls.filter(e=>e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='hidden').map(e=>({text:e.textContent.trim().slice(0,100),width:e.clientWidth,scroll:e.scrollWidth})),smallFields:controls.filter(e=>['INPUT','TEXTAREA'].includes(e.tagName)&&!['checkbox','radio','color','range','file','hidden'].includes(e.type)&&e.clientWidth<40).map(e=>({type:e.type,width:e.clientWidth,value:e.value.slice(0,50)}))}})()`)
  visited.push(result);a.observations.push(result)
  assert.ok(result.width>50&&result.height>25,name+' has usable area');assert.ok(result.left>=-1&&result.right<=result.viewport[0]+2&&result.bottom<=result.viewport[1]+2,JSON.stringify(result))
  assert.equal(result.clippedText.length,0,name+' clipped action text '+JSON.stringify(result.clippedText));assert.equal(result.smallFields.length,0,name+' collapsed fields '+JSON.stringify(result.smallFields))
 }
 /** 仅遍历明确的导航页签；不自动点击创建、删除、运行等业务动作。 */
 async function tabs(selector,root,name){
  const count=await a.evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`)
  for(let index=0;index<count;index++){if(await a.evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}]?.disabled`))continue;await u.activate(selector,index);await inspect(name+'/'+index,root)}
 }
 await a.check('Pending numeric edit survives resize and focus expansion, then actual downloaded save',/** 编辑真实变换数值，在尺寸变化和全屏恢复后下载保存核对。 */ async()=>{
  await u.entity('Player');const before=await u.position(),value=before[0]+3
  await a.evaluate(`document.querySelector('[data-property-path="Transform.position"] input').scrollIntoView({block:'center'})`);await a.click('[data-property-path="Transform.position"] input');await a.press('a',2);await a.client.send('Input.insertText',{text:String(value)});await a.viewport(1024,640)
  assert.ok(await a.evaluate(`document.activeElement.matches('[data-property-path="Transform.position"] input')`));assert.equal((await u.position())[0],value)
  await u.activate('[data-panel-maximize="inspector"]');await inspect('inspector-focused','.config-wrapper');assert.equal((await u.position())[0],value);await u.activate('[data-panel-maximize="inspector"]');assert.equal((await u.position())[0],value)
  const saved=await u.save('v2630-layout-draft'),player=saved.document.scenes.flatMap(/** 取出所有场景实体以检查实际保存结果。 */ scene=>scene.entities).find(/** 找到本次编辑实体。 */ entity=>entity.name==='Player');assert.equal(player.components.find(/** 选择真实变换组件。 */ component=>component.kind==='Transform2D').data.position.x,value)
 })
 await a.check('Every available workspace and bottom-tool navigation route receives real user activation',/** 按当前DOM清单逐项操作，避免固定旧版本面板数量漏掉新增入口。 */ async()=>{
  await a.viewport(1366,768)
  for(const name of ['Design','Script','Animation','UI','Debug','Manage']){await u.workspace(name);await inspect('workspace/'+name,'.editor-content');if(name==='UI')await tabs('.presentation-header nav button','.editor-content','ui');if(name==='Script')await tabs('.logic-tabs button','.editor-content','script')}
  await u.workspace('Design')
  const routes=await a.evaluate(`[...document.querySelectorAll('.compact-tab-select option')].map(e=>({id:e.value,label:e.textContent}))`);assert.ok(routes.length>=8)
  for(const route of routes){await u.bottom(route.id,route.label);await u.activate('[data-panel-maximize="bottom"]');await inspect('bottom/'+route.id,'.bottom-panel')
   for(const selector of ['.network-studio>.studio-header nav button','.world-tools>header nav button','.presentation-header nav button','.ecosystem-studio>header nav button'])await tabs(selector,'.bottom-panel',route.id)
   await u.activate('[data-panel-maximize="bottom"]')
  }
  a.observations.push({name:'runtime-route-inventory',routes,scope:'Every currently available bottom/workspace route; conditional entity-specific tools require matching fixtures.'});await a.capture('all-bottom-routes')
 })
 await a.check('Every Manage section and its visible settings/build/rendering navigation stays bounded',/** 管理栏目逐个激活，并检查独立导航分支。 */ async()=>{
  await u.workspace('Manage');const count=await a.evaluate("document.querySelectorAll('.manage-body>nav button').length")
  for(let index=0;index<count;index++){await u.activate('.manage-body>nav button',index);await a.until("!!document.querySelector('.manage-body>main')?.children.length");await inspect('manage/'+index,'.manage-body>main')
   for(const selector of ['.settings-search nav button','.build-header nav button','.rendering-studio>.studio-header nav button'])await tabs(selector,'.manage-body>main','manage/'+index)
  }
  await a.capture('manage-routes')
 })
 await a.check('Conditional tilemap, populated world and network panels are reachable with their owning project',/** 以真实项目触发上下文工具，避免把空面板当作已覆盖实体编辑器。 */ async()=>{
  await u.open(join(process.cwd(),'reference-projects/projects/physics-v2617-platformer/project.nova'));await u.entity('World TileMap');await u.bottom('tilemap','Tilemap');await u.activate('[data-panel-maximize="bottom"]');await inspect('conditional/tilemap','.bottom-panel');await u.activate('[data-panel-maximize="bottom"]')
  await u.entity('Player');await u.bottom('worldProduction','World Studio');await u.activate('[data-panel-maximize="bottom"]');await tabs('.world-tools>header nav button','.bottom-panel','populated-world');await u.activate('[data-panel-maximize="bottom"]')
  await u.open(join(process.cwd(),'reference-projects/projects/world-v2629-stream-host/project.nova'));await u.workspace('Design');await u.bottom('networkStudio','Network Studio');await u.activate('[data-panel-maximize="bottom"]');await tabs('.network-studio>.studio-header nav button','.bottom-panel','populated-network');await a.capture('populated-network');await u.activate('[data-panel-maximize="bottom"]')
 })
 await a.check('Representative locales, all palettes, large text and landscape touch retain usable form/focus areas',/** 每套配色一次，轮换中英德及尺寸，避免无关笛卡尔组合。 */ async()=>{
  const profiles=[['en','midnight-blue',1366,768,1],['de','cloud-blue',1024,768,1.5],['zh','meadow-cream',900,600,2],['de','blush-berry',1366,768,2],['en','night-garden',844,390,1]]
  for(let index=0;index<profiles.length;index++){const [locale,palette,width,height,scale]=profiles[index];await u.workspace('Manage');await u.activate('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=color-palette]')");await u.activate('.settings-search nav button',0)
   await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=color-palette]',palette)
   await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(width,height)
   await inspect('profile/'+locale+'/'+palette,'.manage-body>main');await a.capture('profile-'+index)
   if(index===1){await u.workspace('Design');const routes=await a.evaluate("[...document.querySelectorAll('.compact-tab-select option')].map(e=>({id:e.value,label:e.textContent}))");for(const route of routes){await u.bottom(route.id,route.label);await u.activate('[data-panel-maximize="bottom"]');await inspect('large-text/'+route.id,'.bottom-panel');await u.activate('[data-panel-maximize="bottom"]')}await u.workspace('Manage');const count=await a.evaluate("document.querySelectorAll('.manage-body>nav button').length");for(let n=0;n<count;n++){await u.activate('.manage-body>nav button',n);await a.until("!!document.querySelector('.manage-body>main')?.children.length");await inspect('large-text/manage/'+n,'.manage-body>main')}}
   await a.press('Tab');assert.ok(await a.evaluate("!!document.activeElement.closest('.editor-root')"),'Keyboard focus remains in editor')
   if(index===4){const point=await a.evaluate("(()=>{const e=document.querySelector('.manage-body>nav button'),r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()");await a.client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await a.client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(200);assert.equal(await a.evaluate("document.querySelector('.manage-body>nav button').getAttribute('aria-pressed')"),'true')}
  }
 })
 a.observations.push({name:'coverage-boundary',visited:visited.length,scope:'Real reachable navigation + populated project, representative styles and pending save; not every conditional plugin/device/error branch or exhaustive Cartesian matrix.'})
})
