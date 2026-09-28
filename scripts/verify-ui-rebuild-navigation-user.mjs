/** UI rebuild regression: real navigation input, rendered-frame observations, persistent drafts and project isolation. */
import assert from 'node:assert/strict'
import {mkdir,writeFile,readFile,copyFile} from 'node:fs/promises'
import {join} from 'node:path'
import {withBrowserAudit,wait} from './lib/browserUserAudit.mjs'
import {worldUserControls17} from './lib/worldAudit17.mjs'
const output=join(process.cwd(),'release-audits/ui-rebuild'),traces=[]
await mkdir(output,{recursive:true})
try {
 await withBrowserAudit({release:'26.32',name:'ui-rebuild-navigation',qualifyRelease:false,width:1366,height:768},async a=>{
  const u=worldUserControls17(a),issues=[]
  await u.open(join(process.cwd(),'reference-projects/projects/creator-v2632-mixed-game/project.nova'))
  await a.evaluate(`(()=>{const ids=new WeakMap();let next=1;window.__novaUiAudit={ids,id:e=>{if(!e)return null;if(!ids.has(e))ids.set(e,next++);return ids.get(e)}}})()`)
  async function measure(label,action,scope='workspace') {
   await a.evaluate(`(()=>{const state=window.__novaUiAudit;state.frames=[];state.running=true;const generation=(state.generation||0)+1;state.generation=generation;const start=performance.now();const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};const visible=e=>{if(!e)return false;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return false;for(let p=e;p;p=p.parentElement){const s=getComputedStyle(p);if(s.visibility==='hidden'||s.display==='none')return false}return true};function frame(){if(!state.running||state.generation!==generation||performance.now()-start>2000)return;const selectors=['.editor-root','.workspace-control-row','.editor-main','.editor-content','.persistent-viewport canvas','.manage-body>main'];const nodes=Object.fromEntries(selectors.map(s=>{const e=document.querySelector(s);return[s,{id:state.id(e),visible:visible(e),rect:rect(e)}]}));const surfaces=[...document.querySelectorAll(${JSON.stringify(scope==='manage'?'.manage-body>main>.ui-workspace-host>:not(.ui-loading-line,.ui-workspace-error)':'.editor-content>.persistent-viewport,.editor-content>.ui-workspace-host>:not(.ui-loading-line,.ui-workspace-error)')})].filter(visible).map(e=>{let opacity=1;for(let p=e;p;p=p.parentElement)opacity*=Number(getComputedStyle(p).opacity);return{class:e.className,id:state.id(e),opacity,children:e.childElementCount}});state.frames.push({at:performance.now()-start,nodes,surfaces});requestAnimationFrame(frame)}requestAnimationFrame(frame)})()`)
   await action();await wait(500)
   const frames=await a.evaluate('window.__novaUiAudit.running=false;window.__novaUiAudit.frames')
   assert.ok(frames.length>=3,'Actual rendered frames must be sampled')
   const summary={label,scope,frames:frames.length,blankFrames:frames.filter(f=>!f.surfaces.length||f.surfaces.every(s=>s.opacity<.1)).length,nodeIdentities:Object.fromEntries(Object.keys(frames[0].nodes).map(s=>[s,[...new Set(frames.map(f=>f.nodes[s].id))]])),geometry:Object.fromEntries(Object.keys(frames[0].nodes).map(s=>[s,[...new Set(frames.map(f=>JSON.stringify(f.nodes[s].rect)))].map(v=>JSON.parse(v))]))}
   traces.push({summary,frames});a.observations.push(summary);console.log(JSON.stringify({label,frames:summary.frames,blankFrames:summary.blankFrames}))
   if(summary.blankFrames)issues.push({label,reason:'rendered content absent or near-transparent',blankFrames:summary.blankFrames})
   for(const selector of ['.editor-root','.workspace-control-row','.editor-main','.editor-content','.persistent-viewport canvas'])if(summary.nodeIdentities[selector].length!==1)issues.push({label,reason:'persistent node remounted',selector,ids:summary.nodeIdentities[selector]})
   if(scope==='manage'&&summary.nodeIdentities['.manage-body>main'].length!==1)issues.push({label,reason:'Manage content host remounted'})
   if(summary.geometry['.workspace-control-row'].length!==1)issues.push({label,reason:'navigation toolbar geometry changed',geometry:summary.geometry['.workspace-control-row']})
   await a.capture(label)
  }
  for(const name of ['Script','Manage','UI','Design','Script','Manage','UI','Design'])await measure('workspace-'+name.toLowerCase()+'-'+traces.length,()=>u.activate('.workspace-list button',['Design','Script','Animation','UI','Debug','Manage'].indexOf(name)))
  await u.workspace('Manage');await a.until("!!document.querySelector('.manage-body>main>.ui-workspace-host>:not(.ui-loading-line)')")
  for(const index of [1,2,3,4,5,6,1])await measure('manage-'+index+'-'+traces.length,()=>u.activate('.manage-body>nav button',index),'manage')
  await writeFile(join(output,'navigation-frames.json'),JSON.stringify({generatedAt:new Date().toISOString(),scope:'rAF observations during real input: content presence/effective opacity and persistent node identity. No physical-display or compositor certification.',traces},null,2))
  a.observations.push({name:'navigation-defects',issues})
  await a.check('Console filter and Profiler annotation survive both tool and workspace roundtrips',async()=>{
   await u.workspace('Design');await u.bottom('profiler','Profiler');await a.fill('.production-panel input[maxlength="500"]','retained profiler annotation');await u.workspace('Script');await u.workspace('Design');await u.bottom('profiler','Profiler');assert.equal(await a.evaluate("document.querySelector('.production-panel input[maxlength=\"500\"]').value"),'retained profiler annotation');await a.capture('profiler-retained')
   await u.bottom('console','Console');await a.fill('.console-panel input[type=search]','retained-console-filter');await u.bottom('profiler','Profiler');await u.bottom('console','Console');assert.equal(await a.evaluate("document.querySelector('.console-panel input[type=search]').value"),'retained-console-filter');await a.capture('console-retained')
  })
  await a.check('Source draft, search and DOM identity survive a workspace roundtrip then save through the real command',async()=>{
   await u.workspace('Script');await u.activate('.logic-tabs button',0);await a.until("!!document.querySelector('.editor-shell textarea')")
   const before=await a.evaluate("document.querySelector('.editor-shell textarea').value"),marker='// ui-rebuild source persistence check'
   await a.fill('.project-scripts input[type=search]','Checkpoint');await a.fill('.editor-shell textarea',before+'\n'+marker+'\n')
   const id=await a.evaluate("window.__novaUiAudit.id(document.querySelector('.script-studio'))")
   await u.workspace('Manage');await u.workspace('Script');assert.equal(await a.evaluate("window.__novaUiAudit.id(document.querySelector('.script-studio'))"),id);assert.equal(await a.evaluate("document.querySelector('.project-scripts input[type=search]').value"),'Checkpoint');assert.ok((await a.evaluate("document.querySelector('.editor-shell textarea').value")).includes(marker));await a.capture('script-draft-retained')
   await u.activate('.toolbar-actions button[title="Save script"]');await a.until("document.querySelector('.toolbar-actions button[title=\"Save script\"]').disabled")
   const saved=await u.save('ui-rebuild-source');assert.ok(saved.document.assets.some(asset=>typeof asset.source==='string'&&(asset.source.startsWith('data:')?decodeURIComponent(asset.source.slice(asset.source.indexOf(',')+1)):asset.source).includes(marker)),'Real downloaded project includes saved source edit')
  })
  await a.check('Graph zoom and local search survive workspace deactivation and remain interactive',async()=>{
   await u.activate('.logic-tabs button',1);if(await a.evaluate("!!document.querySelector('.conversion-review-actions button')"))await u.activate('.conversion-review-actions button')
   await a.until("!!document.querySelector('.graph-editor')");await a.fill('.graph-palette input[type=search]','number');const before=await a.evaluate("Number(document.querySelector('.canvas-controls input[type=range]').value)")
   await a.click('.canvas-controls input[type=range]');await a.press('Home');await a.press('ArrowRight');await a.press('ArrowRight');await a.press('Tab');const zoom=await a.evaluate("Number(document.querySelector('.canvas-controls input[type=range]').value)")
   const id=await a.evaluate("window.__novaUiAudit.id(document.querySelector('.graph-editor'))");await u.workspace('Design');await u.workspace('Script');assert.equal(await a.evaluate("window.__novaUiAudit.id(document.querySelector('.graph-editor'))"),id);assert.equal(await a.evaluate("document.querySelector('.graph-palette input[type=search]').value"),'number');assert.equal(await a.evaluate("Number(document.querySelector('.canvas-controls input[type=range]').value)"),zoom)
   await u.activate('.canvas-controls button[title="Zoom in"]');assert.ok(await a.evaluate(`Number(document.querySelector('.canvas-controls input[type=range]').value)>${zoom}`));await a.capture('graph-reactivated');a.observations.push({name:'graph-zoom-reactivation',before,zoom})
   // Graph view metadata is an authored draft. Commit it through the existing
   // asset save command before the following project-save regression.
   const graphSave='.graph-toolbar .primary-actions>button:nth-child(3)'
   await a.until(`!!document.querySelector(${JSON.stringify(graphSave)})`)
   if(await a.evaluate(`!document.querySelector(${JSON.stringify(graphSave)}).disabled`))await u.activate(graphSave)
   await a.until(`document.querySelector(${JSON.stringify(graphSave)}).disabled`)
  })
  await a.check('Entity property edit undo redo and real save survive navigation',async()=>{
   await u.entity('Player');const before=await u.position();await u.field('[data-property-path="Transform.position"] input',before[0]+2);await a.press('z',2);await wait(160);assert.equal((await u.position())[0],before[0]);await a.press('y',2);await wait(160);assert.equal((await u.position())[0],before[0]+2);await u.workspace('Manage');await u.workspace('Design');const saved=await u.save('ui-rebuild-property');const player=saved.document.scenes.flatMap(s=>s.entities).find(e=>e.name==='Player');assert.equal(player.components.find(c=>c.kind==='Transform2D').data.position.x,before[0]+2)
  })
  for(const width of [1366,1600,1920]){await a.viewport(width,width===1366?768:1080);for(const name of ['Design','Script','UI','Manage']){await u.workspace(name);await a.capture('width-'+width+'-'+name.toLowerCase())}}
  await a.check('Opening another project without reloading invalidates cached component state',async()=>{
   await u.workspace('Design');const old=await a.evaluate("window.__novaUiAudit.id(document.querySelector('.editor-root'))");await a.click('.menu-item>button',0)
   let chooser;const off=a.client.on('Page.fileChooserOpened',event=>chooser=event);await a.client.send('Page.setInterceptFileChooserDialog',{enabled:true});await a.clickText('.menu-item .dropdown button','Import Project');await a.until("!!document.querySelector('input[type=file]')");for(let i=0;i<100&&!chooser;i++)await wait(50);assert.ok(chooser,'Real load-project chooser opened');await a.client.send('DOM.setFileInputFiles',{files:[join(process.cwd(),'reference-projects/projects/creator-v2621-code-game/project.nova')],backendNodeId:chooser.backendNodeId});off();await wait(900)
   if(await a.evaluate("!!document.querySelector('.upgrade-dialog')"))await a.click('.upgrade-dialog footer button.primary');await a.until(`window.__novaUiAudit.id(document.querySelector('.editor-root'))!==${old}&&!!document.querySelector('.editor-root')`,30000)
   await u.workspace('Design');await u.bottom('console','Console');assert.equal(await a.evaluate("document.querySelector('.console-panel input[type=search]').value"),'');await u.bottom('profiler','Profiler');assert.equal(await a.evaluate("document.querySelector('.production-panel input[maxlength=\"500\"]').value"),'');await a.capture('new-project-isolation')
  })
  await a.check('Navigation shows no blank samples or persistent-shell remounts',async()=>assert.deepEqual(issues,[]))
 })
} finally {
 await writeFile(join(output,'navigation-frames.json'),JSON.stringify({generatedAt:new Date().toISOString(),scope:'Read-only rendered-frame observations around real input, including completed transitions from failed runs.',traces},null,2))
 const reportPath=join(process.cwd(),'release-audits/v26.32-ui-rebuild-navigation.json')
 try {const report=JSON.parse(await readFile(reportPath,'utf8'));await copyFile(reportPath,join(output,'navigation.json'));for(const name of report.captures)await copyFile(join(process.cwd(),'release-audits',name),join(output,name))}catch{}
}
