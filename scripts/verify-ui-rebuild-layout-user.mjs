/** 26.37 visual audit: actual navigation, field containment, screenshots and edit/save regression. */
import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
import {auditComfortableGeometry} from './lib/comfortableGeometryAudit.mjs'
await withBrowserAudit({release:'26.37',qualifyRelease:false,name:process.argv.includes('--final')?'ui-rebuild-layout-final':'ui-rebuild-layout',width:1366,height:768},/** 打开有实体和资源的工程，通过真实控件遍历并测试编辑保持。 */ async a=>{
 const u=worldUserControls17(a),visited=[],layoutFailures=[]
 const legacyWorkspace=u.workspace;u.workspace=async name=>{if(name!=='UI')return legacyWorkspace(name);await a.click('.workspace-list button',3);await a.until("document.querySelectorAll('.workspace-list button')[3]?.getAttribute('aria-pressed')==='true'&&!!document.querySelector('.presentation-panel')?.getBoundingClientRect().width");await wait(350)}
 const legacyBottom=u.bottom;u.bottom=async(id,label)=>{await legacyBottom(id,label);if(await a.evaluate("!!document.querySelector('.bottom-panel.collapsed')"))await u.activate('.bottom-panel .panel-controls > button:last-child');await a.until("!!document.querySelector('.bottom-panel .panel-content')?.getBoundingClientRect().height")}
 await a.check('Launcher and new-project template navigation open and cancel without creating a project',async()=>{
  await inspect('launcher','.project-manager');await a.click('.quick-actions .new-project');await a.until("!!document.querySelector('.creation-card')");await inspect('launcher/new-project','.creation-dialog .ui-dialog')
  await tabs('.template-categories button','.creation-dialog .ui-dialog','launcher/templates');await a.viewport(900,600);await inspect('launcher/new-project-narrow','.creation-dialog .ui-dialog');await a.click('.creation-dialog .ui-dialog-header button');await a.until("!document.querySelector('.creation-card')");await a.viewport(1366,768)
 })
 await u.open(join(process.cwd(),'reference-projects/projects/creator-v2621-code-game/project.nova'))
 /** 记录面板及实际可见控件，检查宿主边界；保留专用列表和画布滚动。 */
 async function inspect(name,rootSelector){
  await a.until(`!!document.querySelector(${JSON.stringify(rootSelector)})?.getBoundingClientRect().width`);await wait(180)
  const comfortable=await auditComfortableGeometry(a,name,{rootSelector,strict:false,settle:true})
  const result=await a.evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(rootSelector)}),r=root.getBoundingClientRect();const controls=[...root.querySelectorAll('button,input,select,textarea')].filter(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&!e.closest('[inert]'));return{name:${JSON.stringify(name)},root:root.className,width:r.width,height:r.height,left:r.left,right:r.right,bottom:r.bottom,viewport:[innerWidth,innerHeight],controls:controls.length,scopes:[...root.querySelectorAll('[data-control-scope]')].map(e=>e.dataset.controlScope),clippedText:controls.filter(e=>e.tagName==='BUTTON'&&e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX==='hidden').map(e=>({text:e.textContent.trim().slice(0,100),width:e.clientWidth,scroll:e.scrollWidth})),smallFields:controls.filter(e=>['INPUT','TEXTAREA'].includes(e.tagName)&&!['checkbox','radio','color','range','file','hidden'].includes(e.type)&&e.clientWidth<40).map(e=>({type:e.type,width:e.clientWidth,value:e.value.slice(0,50)}))}})()`)
  // Read layout geometry only. Do not change model state or inline styles to make tests pass.
  const fields=await a.evaluate(`(()=>{const root=document.querySelector(${JSON.stringify(rootSelector)}),rr=root.getBoundingClientRect();return [...root.querySelectorAll('input,select,textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&!e.closest('[inert]')&&getComputedStyle(e).visibility!=='hidden'&&!['hidden','file'].includes(e.type)}).map(e=>{const r=e.getBoundingClientRect(),numeric=e.matches('[data-numeric-expression],input[type=number]'),range=e.type==='range';let host=e.closest('.studio-card,.property-row,.settings-row,fieldset,article')||root;for(let p=e.parentElement;p&&p!==root&&p!==host;p=p.parentElement){const s=getComputedStyle(p);if(['auto','scroll'].includes(s.overflowX)){host=p;break}}const h=host.getBoundingClientRect(),s=getComputedStyle(host),scrollable=['auto','scroll'].includes(s.overflowX);return{tag:e.tagName,type:e.type,numeric,range,label:e.getAttribute('aria-label')||e.getAttribute('placeholder')||e.closest('label')?.textContent.trim().slice(0,90)||e.getAttribute('data-resource-key'),width:r.width,height:r.height,tooTall:(e.tagName==='SELECT'||e.tagName==='INPUT'&&!['checkbox','radio','color','range','file','hidden'].includes(e.type))&&r.height>Math.max(50,3*parseFloat(getComputedStyle(e).fontSize)),left:r.left,right:r.right,host:host.className,hostWidth:h.width,hostLeft:h.left,hostRight:h.right,scrollable,overflow:!scrollable&&(r.left<h.left-3||r.right>h.right+3),overlong:(numeric||range)&&r.width>Math.min(Math.max(360,26*parseFloat(getComputedStyle(e).fontSize)),h.width)+3}})})()`)
  result.comfortableGeometry={scope:comfortable.scope,conditions:comfortable.conditions,units:comfortable.units,counts:{inputs:comfortable.inputs.length,buttons:comfortable.buttons.length,properties:comfortable.properties.length,panels:comfortable.panels.length,rows:comfortable.rows.length,exceptions:comfortable.exceptions.length},failures:comfortable.failures};result.fields=fields;result.fieldOverflow=fields.filter(e=>e.overflow);result.overlongScalarFields=fields.filter(e=>e.overlong);result.tallSingleLineFields=fields.filter(e=>e.tooTall)
  result.clippedToolbarControls=await a.evaluate(`(()=>{return [...document.querySelectorAll('.actionbar button,.workspace-bar .workspace-menu>summary')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&getComputedStyle(e).visibility!=='hidden'}).map(e=>{const r=e.getBoundingClientRect();return{label:e.getAttribute('aria-label')||e.getAttribute('title')||e.textContent.trim(),left:r.left,right:r.right,top:r.top,bottom:r.bottom}}).filter(r=>r.left< -1||r.right>innerWidth+1||r.top< -1||r.bottom>innerHeight+1)})()`)
  result.capture=await a.capture('route-'+String(visited.length+1).padStart(3,'0')+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-$/,''))
  visited.push(result);a.observations.push(result)
  // Collect geometry defects so one traversal diagnoses all affected routes. The
  // final independent check fails the run; no measured failure is suppressed.
  try {
   assert.ok(result.width>50&&result.height>25,name+' has usable area');assert.ok(result.left>=-1&&result.right<=result.viewport[0]+2&&result.bottom<=result.viewport[1]+2,JSON.stringify(result))
   assert.equal(result.comfortableGeometry.failures.length,0,name+' normalized comfortable defects: '+result.comfortableGeometry.failures.length+'; full measurements are recorded in observations');
   assert.equal(result.clippedText.length,0,name+' clipped action text '+JSON.stringify(result.clippedText));assert.equal(result.smallFields.length,0,name+' collapsed fields '+JSON.stringify(result.smallFields))
   assert.equal(result.fieldOverflow.length,0,name+' fields cross their containing panel/card '+JSON.stringify(result.fieldOverflow))
   assert.equal(result.overlongScalarFields.length,0,name+' scalar fields are unnecessarily stretched '+JSON.stringify(result.overlongScalarFields));assert.equal(result.tallSingleLineFields.length,0,name+' single-line fields are unnecessarily tall '+JSON.stringify(result.tallSingleLineFields))
   assert.equal(result.clippedToolbarControls.length,0,name+' persistent playback/layout/command controls cross viewport '+JSON.stringify(result.clippedToolbarControls))
  } catch(error) { layoutFailures.push({route:name,capture:result.capture,error:error.message});console.error('LAYOUT '+error.message) }
 }
 /** Expand disclosure-only sections through actual keyboard input, exposing conditional field rows. */
 async function disclosures(root,name){
  const selector=root+' details:not([open]):not([data-ui-motion-popover]):not(.asset-overflow):not(.workspace-menu)>summary';let opened=0
  for(;opened<80;opened++){const index=await a.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].findIndex(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height)`);if(index<0)break;await u.activate(selector,index)}
  assert.ok(opened<80,name+' disclosure traversal terminates');if(opened)await inspect(name+'/disclosures',root)
 }
 /** 仅遍历明确的导航页签；不自动点击创建、删除、运行等业务动作。 */
 async function tabs(selector,root,name){
  const count=await a.evaluate(`document.querySelectorAll(${JSON.stringify(selector)}).length`)
  for(let index=0;index<count;index++){if(await a.evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(selector)})[${index}];return !e||e.disabled||!e.getBoundingClientRect().width||!e.getBoundingClientRect().height})()`))continue;await u.activate(selector,index);await inspect(name+'/'+index,root);if(selector==='.settings-search nav button'){await tabs('.physics-workspace>.ui-tabs button',root,name+'/'+index+'/physics');await tabs('.device-studio>.ui-tabs button',root,name+'/'+index+'/device')}if(selector==='.logic-tabs button'){await tabs('.production-tabs button',root,name+'/'+index+'/graph');await tabs('.inspector-tabs button',root,name+'/'+index+'/script-inspector')}}
 }
 await a.check('Pending numeric edit survives resize and focus expansion, then actual downloaded save',/** 编辑真实变换数值，在尺寸变化和全屏恢复后下载保存核对。 */ async()=>{
  await u.entity('Player');const before=await u.position(),value=before[0]+3
  await a.evaluate(`document.querySelector('[data-property-path="Transform.position"] input').scrollIntoView({block:'center'})`);await a.click('[data-property-path="Transform.position"] input');await a.press('a',2);await a.client.send('Input.insertText',{text:String(value)});await a.viewport(1024,640)
  assert.ok(await a.evaluate(`document.activeElement.matches('[data-property-path="Transform.position"] input')`));assert.equal((await u.position())[0],value)
  await u.activate('[data-panel-maximize="inspector"]');await inspect('inspector-focused','.config-wrapper');assert.equal((await u.position())[0],value);await u.activate('[data-panel-maximize="inspector"]');assert.equal((await u.position())[0],value)
  await a.press('Tab');await a.press('z',2);await wait(160);assert.equal((await u.position())[0],before[0],'Undo restores the committed property after resizing')
  await a.press('y',2);await wait(160);assert.equal((await u.position())[0],value,'Redo restores the edited property')
  const saved=await u.save('ui-rebuild-layout-draft'),player=saved.document.scenes.flatMap(/** 取出所有场景实体以检查实际保存结果。 */ scene=>scene.entities).find(/** 找到本次编辑实体。 */ entity=>entity.name==='Player');assert.equal(player.components.find(/** 选择真实变换组件。 */ component=>component.kind==='Transform2D').data.position.x,value)
 })
 await a.check('Every available workspace and bottom-tool navigation route receives real user activation',/** 按当前DOM清单逐项操作，避免固定旧版本面板数量漏掉新增入口。 */ async()=>{
  await a.viewport(1366,768)
  for(const name of ['Design','Script','Animation','UI','Debug','Manage']){await u.workspace(name);await inspect('workspace/'+name,'.editor-content');if(name==='UI')await tabs('.presentation-panel>.ui-tabs button','.editor-content','ui');if(name==='Script')await tabs('.logic-tabs button','.editor-content','script')}
  await u.workspace('Design')
  const routes=await a.evaluate(`[...document.querySelectorAll('.compact-tab-select option')].map(e=>({id:e.value,label:e.textContent}))`);assert.ok(routes.length>=8)
  for(const route of routes){await u.bottom(route.id,route.label);await inspect('docked/'+route.id,'.bottom-panel');await u.activate('[data-panel-maximize="bottom"]');await inspect('bottom/'+route.id,'.bottom-panel')
   for(const selector of ['.network-studio>.ui-tabs button','.world-tools>.ui-tabs button','.presentation-panel>.ui-tabs button','.ecosystem-studio>.ui-tabs button','.production-panel>.ui-tabs:not(.production-tabs) button','.production-tabs button','.physics-runtime-panel nav button'])await tabs(selector,'.bottom-panel',route.id)
   await disclosures('.bottom-panel',route.id);await u.activate('[data-panel-maximize="bottom"]')
  }
  a.observations.push({name:'runtime-route-inventory',routes,scope:'Every currently available bottom/workspace route; conditional entity-specific tools require matching fixtures.'});await a.capture('all-bottom-routes')
 })
 await a.check('Every Manage section and its visible settings/build/rendering navigation is activated',/** 管理栏目逐个激活，并检查独立导航分支。 */ async()=>{
  await u.workspace('Manage');const count=await a.evaluate("document.querySelectorAll('.manage-body>nav button').length")
  for(let index=0;index<count;index++){await u.activate('.manage-body>nav button',index);await a.until("!!document.querySelector('.manage-body>main')?.children.length");await inspect('manage/'+index,'.manage-body>main')
   for(const selector of ['.settings-search nav button','.build-panel>.ui-tabs button','.rendering-studio>.ui-tabs button','.learning-center>.ui-tabs button','.package-manager>.ui-tabs button','.project-health>.ui-tabs button','.automation-results>.ui-tabs button'])await tabs(selector,'.manage-body>main','manage/'+index)
   await disclosures('.manage-body>main','manage/'+index)
  }
  await a.capture('manage-routes')
 })
 await a.check('Standard desktop widths retain every workspace and Manage destination',async()=>{
  for(const [width,height] of [[1600,900],[1920,1080]]){await a.viewport(width,height);for(const name of ['Design','Script','Animation','UI','Debug','Manage']){await u.workspace(name);await inspect('desktop/'+width+'/workspace/'+name,'.editor-content')};const count=await a.evaluate("document.querySelectorAll('.manage-body>nav button').length");for(let index=0;index<count;index++){await u.activate('.manage-body>nav button',index);await inspect('desktop/'+width+'/manage/'+index,'.manage-body>main')}}
  await a.viewport(1366,768)
 })
 await a.check('Workspace, shortcut and command dialogs open and dismiss safely',async()=>{
  await u.workspace('Design');await a.viewport(1024,768)
  for(const [name,key,modifiers,selector] of [['workspaces','w',3,'.ui-dialog'],['shortcuts','k',3,'.ui-dialog'],['commands','p',10,'.command-palette']]){
   await a.press(key,modifiers);await a.until(`!!document.querySelector(${JSON.stringify(selector)})`);await inspect('dialog/'+name,selector);await a.press('Escape');await a.until(`!document.querySelector(${JSON.stringify(selector)})`)
  }
 })
 await a.check('Conditional tilemap, populated world and network panels are reachable with their owning project',/** 以真实项目触发上下文工具，避免把空面板当作已覆盖实体编辑器。 */ async()=>{
  await u.open(join(process.cwd(),'reference-projects/projects/physics-v2617-platformer/project.nova'));await u.entity('World TileMap');await u.bottom('tilemap','Tilemap');await u.activate('[data-panel-maximize="bottom"]')
  await u.activate('.palette-grid button[title="Ground"]')
  await a.until("document.querySelector('.tile-definition-fields input')?.value==='Ground'&&document.querySelector('.tile-definition-fields')?.getBoundingClientRect().height>80")
  await a.evaluate("document.querySelector('.tile-properties').scrollTop=0;document.querySelector('.tilemap-workspace aside').scrollTop=0")
  await inspect('conditional/tilemap','.bottom-panel')
  const tileFields=await a.evaluate("[...document.querySelectorAll('.tile-definition-fields .ui-property-row')].slice(0,2).map(row=>{const e=row.querySelector('input,select'),r=e?.getBoundingClientRect(),p=document.querySelector('.tile-properties').getBoundingClientRect();return{label:row.getAttribute('aria-label'),value:e?.value,height:r?.height,contained:!!r&&r.top>=p.top&&r.bottom<=p.bottom}})")
  assert.equal(tileFields.length,2);assert.ok(tileFields.every(field=>field.contained&&field.height>=43.9),'Actual selected Tile name and collision fields must be rendered within the visible property pane')
  a.observations.push({name:'actual-selected-tilemap-fields',selection:'Public Ground palette button',fields:tileFields})
  for(const [name,selector] of [['atlas','.region-settings'],['layers','.layers'],['baking','.baking']]){await a.evaluate(`document.querySelector(${JSON.stringify('.tile-properties '+selector)}).scrollIntoView({block:'start'})`);await inspect('conditional/tilemap/'+name,'.bottom-panel')}
  await u.activate('[data-panel-maximize="bottom"]')
  await u.entity('Player');await u.bottom('worldProduction','World Studio');await u.activate('[data-panel-maximize="bottom"]');await tabs('.world-tools>.ui-tabs button','.bottom-panel','populated-world');await u.activate('[data-panel-maximize="bottom"]')
  await u.open(join(process.cwd(),'reference-projects/projects/world-v2629-stream-host/project.nova'));await u.workspace('Design');await u.bottom('networkStudio','Network Studio');await u.activate('[data-panel-maximize="bottom"]');await tabs('.network-studio>.ui-tabs button','.bottom-panel','populated-network');await a.capture('populated-network');await u.activate('[data-panel-maximize="bottom"]')
 })
 await a.check('Representative locales, all palettes, large text and landscape touch receive navigation and keyboard checks',/** 每套配色一次，轮换中英德及尺寸，避免无关笛卡尔组合。 */ async()=>{
  const profiles=[['en','midnight-blue',1366,768,1],['de','cloud-blue',1024,768,1.5],['zh','meadow-cream',1600,900,2],['de','blush-berry',1366,768,2],['en','night-garden',1024,640,1]]
  for(let index=0;index<profiles.length;index++){const [locale,palette,width,height,scale]=profiles[index];await u.workspace('Manage');await u.activate('.manage-body>nav button',1);await a.until("!!document.querySelector('[data-audit=color-palette]')");await u.activate('.settings-search nav button',0)
   await a.select('.settings-page select:has(option[value="de"]):has(option[value="zh"])',locale);await a.select('[data-audit=color-palette]',palette)
   await a.click('.settings-page input[type=range][min="1"][max="2"]');await a.press('Home');for(let n=0;n<Math.round((scale-1)/.05);n++)await a.press('ArrowRight');await a.press('Tab');await a.viewport(width,height)
   if(scale>=2&&await a.evaluate("!!document.querySelector('.bottom-panel:not(.collapsed)')")){await u.activate('.bottom-panel .panel-controls>button:last-child');await a.until("!!document.querySelector('.bottom-panel.collapsed')");a.observations.push({name:'high-scale-recoverable-dock-collapse',locale,palette,width,height,scale,method:'Actual collapse command preserves tools and readable Manage content; no private state or font reduction.'})}
   await inspect('profile/'+locale+'/'+palette,'.manage-body>main');await a.capture('profile-'+index)
   if(index===1){await u.workspace('Design');const routes=await a.evaluate("[...document.querySelectorAll('.compact-tab-select option')].map(e=>({id:e.value,label:e.textContent}))");for(const route of routes){await u.bottom(route.id,route.label);await u.activate('[data-panel-maximize="bottom"]');await inspect('large-text/'+route.id,'.bottom-panel');await u.activate('[data-panel-maximize="bottom"]')}await u.workspace('Manage');const count=await a.evaluate("document.querySelectorAll('.manage-body>nav button').length");for(let n=0;n<count;n++){await u.activate('.manage-body>nav button',n);await a.until("!!document.querySelector('.manage-body>main')?.children.length");await inspect('large-text/manage/'+n,'.manage-body>main')}}
   await a.press('Tab');assert.ok(await a.evaluate("!!document.activeElement.closest('.editor-root')"),'Keyboard focus remains in editor')
   if(index===4){const point=await a.evaluate("(()=>{const e=document.querySelector('.manage-body>nav button'),r=e.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2}})()");await a.client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...point,id:1}]});await a.client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait(200);assert.equal(await a.evaluate("document.querySelector('.manage-body>nav button').getAttribute('aria-selected')"),'true')}
  }
 })
 await a.check('Collapsed dock contains its complete header and SVG controls retain accessible names', async()=>{
  await a.viewport(1024,768);await u.workspace('Design');await u.bottom('console','Console')
  await a.click('.panel-controls > button:last-child')
  await a.until("!!document.querySelector('.bottom-panel.collapsed')")
  const result=await a.evaluate(`(()=>{const panel=document.querySelector('.bottom-panel'),p=panel.getBoundingClientRect(),h=panel.querySelector('header').getBoundingClientRect();return{panelHeight:p.height,headerHeight:h.height,contained:h.bottom<=p.bottom+1,unnamed:[...document.querySelectorAll('button:has(svg.editor-icon)')].filter(e=>!e.getAttribute('aria-label')&&!e.textContent.trim()).length}})()`)
  a.observations.push(result);assert.ok(result.contained,JSON.stringify(result));assert.equal(result.unnamed,0)
  await a.capture('collapsed-dock');await a.click('.panel-controls > button:last-child')
 })
 const escape=value=>String(value).replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))
 const gallery=process.argv.includes('--final')?'v26.37-ui-rebuild-layout-final-gallery.html':'v26.37-ui-rebuild-layout-gallery.html'
 await writeFile(join(a.evidence,gallery),'<!doctype html><html lang="en"><meta charset="utf-8"><title>Nova_A 26.37 visual route evidence</title><style>body{font:16px system-ui;background:#161a21;color:#eef2f7;margin:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px}figure{margin:0;background:#242b36;padding:12px}img{width:100%;height:auto}figcaption{padding:8px 0}a{color:#a9d8ff}</style><h1>Nova_A 26.37 — actual route screenshots</h1><p>Every recorded route below was opened through real input. Screenshots show the viewport at that state; a route is not proof of every conditional or offscreen branch.</p><main>'+visited.map(r=>'<figure><a href="'+escape(r.capture)+'"><img loading="lazy" src="'+escape(r.capture)+'" alt="'+escape(r.name)+'"></a><figcaption>'+escape(r.name)+' · '+r.fields.length+' fields · '+r.width+' × '+r.height+'</figcaption></figure>').join('')+'</main></html>')
 a.observations.push({name:'visual-gallery',file:gallery,routeScreenshots:visited.length})
 a.observations.push({name:'layout-geometry-failures',failures:layoutFailures})
 a.observations.push({name:'coverage-boundary',visited:visited.length,scope:'Real docked and maximized navigation + populated project, mounted disclosure sections, representative styles, common dialogs, every-route PNGs, field/card containment, collapsed-header containment and pending edit/undo/redo/save. Not every conditional plugin/device/error branch or exhaustive Cartesian matrix; screenshot review is distinct from geometry assertions.'})
 await a.check('All visited panel and field geometry is readable and contained',async()=>assert.equal(layoutFailures.length,0,'Recorded geometry defects must be fixed; see route screenshots and field measurements'))
})
